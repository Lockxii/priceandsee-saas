import { prisma } from "@/lib/prisma";
import { effectiveUserLimits, nextMonthlyResetDate } from "@/lib/plans";

type ExtractedProduct = {
  title?: string;
  price?: number;
  stockStatus?: string;
  promoText?: string;
  description?: string;
  image?: string;
  brand?: string;
  sku?: string;
  rating?: number;
  reviewsCount?: number;
  currency?: string;
  bundlePrices?: any;
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

      let bundlePrices = undefined;
      if (Array.isArray(product.offers) && product.offers.length > 1) {
        bundlePrices = product.offers.map((o: any) => ({
          name: o.name || o.sku || "Variant",
          price: parsePrice(o.price)
        })).filter((o: any) => o.price !== undefined);
      }

      return {
        title: product.name ? decodeHtml(String(product.name)) : undefined,
        price: parsePrice(offers?.price || offers?.lowPrice || offers?.highPrice),
        currency: offers?.priceCurrency,
        stockStatus: availability.includes("instock")
          ? "In Stock"
          : availability.includes("outofstock") || availability.includes("soldout")
            ? "Out of Stock"
            : undefined,
        description: product.description ? decodeHtml(String(product.description)) : undefined,
        sku: product.sku || product.mpn,
        image: Array.isArray(product.image) ? product.image[0] : (typeof product.image === "string" ? product.image : undefined),
        brand: product.brand?.name || (typeof product.brand === "string" ? product.brand : undefined),
        rating: product.aggregateRating?.ratingValue ? Number(product.aggregateRating.ratingValue) : undefined,
        reviewsCount: product.aggregateRating?.reviewCount ? Number(product.aggregateRating.reviewCount) : undefined,
        bundlePrices: bundlePrices?.length ? bundlePrices : undefined
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
    description: jsonLd.description || promoText,
    image: jsonLd.image || matchContent(html, /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i),
    brand: jsonLd.brand || matchContent(html, /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i),
    sku: jsonLd.sku,
    rating: jsonLd.rating,
    reviewsCount: jsonLd.reviewsCount,
    currency: jsonLd.currency || matchContent(html, /<meta[^>]+property=["']product:price:currency["'][^>]+content=["']([^"']+)["']/i),
    bundlePrices: jsonLd.bundlePrices
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

  const product = await prisma.product.findUnique({ where: { id: productId }, include: { user: true } });
  if (!product) throw new Error("Product not found");

  const now = new Date();
  const resetDate = product.user.monthlyChecksReset || now;
  const needsReset = resetDate <= now;
  const monthlyChecksUsed = needsReset ? 0 : product.user.monthlyChecksUsed;
  const limits = effectiveUserLimits(product.user);

  if (monthlyChecksUsed >= limits.monthlyCheckLimit) {
    throw new Error(`Monthly scraping quota reached (${limits.monthlyCheckLimit})`);
  }

  if (needsReset) {
    await prisma.user.update({
      where: { id: product.userId },
      data: { monthlyChecksUsed: 0, monthlyChecksReset: nextMonthlyResetDate(now) },
    });
  }

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
          description: extracted.description || product.description,
          image: extracted.image || product.image,
          brand: extracted.brand || product.brand,
          sku: extracted.sku || product.sku,
          rating: extracted.rating || product.rating,
          reviewsCount: extracted.reviewsCount || product.reviewsCount,
          currency: extracted.currency || product.currency,
          bundlePrices: extracted.bundlePrices || product.bundlePrices || undefined,
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

      await tx.user.update({
        where: { id: product.userId },
        data: { monthlyChecksUsed: { increment: 1 } },
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
      prisma.user.update({
        where: { id: product.userId },
        data: { monthlyChecksUsed: { increment: 1 } },
      }),
    ]);

    return { ok: false, productId, jobId: job.id, error: message };
  }
}

export async function scrapeDueProducts(limit = 10) {
  const now = new Date();
  const products = await prisma.product.findMany({
    where: {
      OR: [
        { lastCheckedAt: null },
        { lastCheckedAt: { lt: new Date(now.getTime() - 60 * 60 * 1000) } },
      ],
    },
    orderBy: [{ lastCheckedAt: "asc" }, { createdAt: "asc" }],
    take: limit * 3,
    include: { user: true },
  });

  const due = products.filter((product) => {
    const limits = effectiveUserLimits(product.user);
    if (product.user.monthlyChecksUsed >= limits.monthlyCheckLimit && product.user.monthlyChecksReset > now) return false;
    if (!product.lastCheckedAt) return true;
    const nextCheckAt = new Date(product.lastCheckedAt.getTime() + limits.checkIntervalHours * 60 * 60 * 1000);
    return nextCheckAt <= now;
  }).slice(0, limit);

  const results = [];
  for (const product of due) {
    results.push(await scrapeProduct(product.id, { source: "cron" }));
  }

  return results;
}
