import { prisma } from "@/lib/prisma";

type ExtractedProduct = {
  title?: string;
  price?: number;
  stockStatus?: string;
  promoText?: string;
};

type ScrapeProductOptions = {
  source?: "manual" | "cron";
};

const USER_AGENTS = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
];

function pickUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function stripTags(value: string) {
  return decodeHtml(value.replace(/<[^>]+>/g, " "));
}

function matchContent(html: string, pattern: RegExp) {
  const match = html.match(pattern);
  return match?.[1] ? decodeHtml(match[1]) : undefined;
}

function parsePrice(value?: string | null) {
  if (!value) return undefined;
  const normalized = value
    .replace(/\s/g, "")
    .replace(/[^0-9,.]/g, "")
    .replace(/,(?=\d{1,2}$)/, ".");
  const price = Number.parseFloat(normalized.replace(/,/g, ""));
  return Number.isFinite(price) ? price : undefined;
}

function extractJsonLd(html: string): ExtractedProduct {
  const scripts = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];

  for (const script of scripts) {
    try {
      const raw = decodeHtml(script[1]);
      const parsed = JSON.parse(raw);
      const nodes = Array.isArray(parsed) ? parsed : [parsed, ...(parsed?.["@graph"] || [])];
      const product = nodes.find((node: any) => {
        const type = node?.["@type"];
        return type === "Product" || (Array.isArray(type) && type.includes("Product"));
      });

      if (!product) continue;
      const offers = Array.isArray(product.offers) ? product.offers[0] : product.offers;
      const availability = String(offers?.availability || "").toLowerCase();

      return {
        title: product.name ? decodeHtml(String(product.name)) : undefined,
        price: parsePrice(offers?.price || offers?.lowPrice || offers?.highPrice),
        stockStatus: availability.includes("instock")
          ? "In Stock"
          : availability.includes("outofstock")
            ? "Out of Stock"
            : undefined,
      };
    } catch {
      // Ignore malformed JSON-LD and continue with other extraction strategies.
    }
  }

  return {};
}

export function extractProductData(html: string): ExtractedProduct {
  const jsonLd = extractJsonLd(html);

  const metaTitle =
    matchContent(html, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
    matchContent(html, /<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["']/i) ||
    matchContent(html, /<title[^>]*>([\s\S]*?)<\/title>/i);

  const metaPrice =
    matchContent(html, /<meta[^>]+property=["']product:price:amount["'][^>]+content=["']([^"']+)["']/i) ||
    matchContent(html, /<meta[^>]+itemprop=["']price["'][^>]+content=["']([^"']+)["']/i) ||
    html.match(/(?:€|EUR|USD|\$)\s?([0-9][0-9\s.,]*)/i)?.[0] ||
    html.match(/([0-9][0-9\s.,]*)\s?(?:€|EUR|USD|\$)/i)?.[0];

  const text = stripTags(html).toLowerCase();
  const stockStatus = jsonLd.stockStatus ||
    (/(out of stock|sold out|rupture de stock|épuisé|indisponible)/i.test(text)
      ? "Out of Stock"
      : /(in stock|add to cart|ajouter au panier|en stock|disponible)/i.test(text)
        ? "In Stock"
        : undefined);

  const promoText =
    matchContent(html, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) ||
    matchContent(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);

  return {
    title: jsonLd.title || metaTitle,
    price: jsonLd.price ?? parsePrice(metaPrice),
    stockStatus,
    promoText: promoText?.slice(0, 240),
  };
}

async function fetchHtml(url: string) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": pickUserAgent(),
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      Referer: new URL(url).origin,
    },
    redirect: "follow",
    signal: AbortSignal.timeout(20000),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} while fetching product page`);
  }

  const html = await response.text();
  if (!html || html.length < 500) {
    throw new Error("Fetched page is empty or too small to parse");
  }

  return html;
}

function hasChanged(before: ExtractedProduct, after: ExtractedProduct) {
  return Boolean(
    (after.title && after.title !== before.title) ||
    (after.price !== undefined && after.price !== before.price) ||
    (after.stockStatus && after.stockStatus !== before.stockStatus) ||
    (after.promoText && after.promoText !== before.promoText)
  );
}

export async function scrapeProduct(productId: string, options: ScrapeProductOptions = {}) {
  const startedAt = Date.now();
  const source = options.source || "manual";

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new Error("Product not found");

  const job = await prisma.scrapingJob.create({
    data: { productId, status: "PENDING", source },
  });

  try {
    const html = await fetchHtml(product.url);
    const extracted = extractProductData(html);

    if (!extracted.title && extracted.price === undefined && !extracted.stockStatus) {
      throw new Error("No product data could be extracted from this page");
    }

    const changed = hasChanged(
      {
        title: product.title || undefined,
        price: product.currentPrice || undefined,
        stockStatus: product.stockStatus || undefined,
        promoText: product.promoText || undefined,
      },
      extracted
    );

    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: productId },
        data: {
          title: extracted.title || product.title,
          currentPrice: extracted.price ?? product.currentPrice,
          stockStatus: extracted.stockStatus || product.stockStatus,
          promoText: extracted.promoText || product.promoText,
          lastCheckedAt: new Date(),
          lastChangedAt: changed ? new Date() : product.lastChangedAt,
          lastError: null,
        },
      });

      if (extracted.price !== undefined && extracted.price !== product.currentPrice) {
        await tx.priceHistory.create({
          data: { productId, price: extracted.price },
        });
      }

      await tx.scrapingJob.update({
        where: { id: job.id },
        data: { status: "SUCCESS", durationMs: Date.now() - startedAt },
      });
    });

    return { ok: true, productId, jobId: job.id, extracted, changed };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown scraping error";
    await prisma.$transaction([
      prisma.product.update({
        where: { id: productId },
        data: { lastCheckedAt: new Date(), lastError: message },
      }),
      prisma.scrapingJob.update({
        where: { id: job.id },
        data: { status: "FAILED", errorMessage: message, durationMs: Date.now() - startedAt },
      }),
    ]);

    return { ok: false, productId, jobId: job.id, error: message };
  }
}

export async function scrapeDueProducts(limit = 10) {
  const products = await prisma.product.findMany({
    orderBy: [{ lastCheckedAt: "asc" }, { createdAt: "asc" }],
    take: limit,
  });

  const results = [];
  for (const product of products) {
    results.push(await scrapeProduct(product.id, { source: "cron" }));
  }

  return results;
}
