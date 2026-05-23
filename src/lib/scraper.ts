import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { effectiveUserLimits, nextMonthlyResetDate } from "@/lib/plans";
import { execFile } from "child_process";
import { promisify } from "util";

const execAsync = promisify(execFile);

type JsonRecord = Record<string, unknown>;

type JsonLdOffer = JsonRecord & {
  price?: string | number | null;
  lowPrice?: string | number | null;
  highPrice?: string | number | null;
  availability?: string;
  priceCurrency?: string;
};

type JsonLdProduct = JsonRecord & {
  name?: string;
  offers?: JsonLdOffer | JsonLdOffer[];
  description?: string;
  sku?: string;
  mpn?: string;
  image?: string | string[];
  brand?: string | { name?: string };
  aggregateRating?: { ratingValue?: string | number; reviewCount?: string | number };
};

type BundlePrice = {
  name: string;
  price: number;
};

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
  bundlePrices?: BundlePrice[];
  brandSignals?: JsonRecord;
  scrapedAt?: string;
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

function parsePrice(value?: string | number | null) {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
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
      const parsed = JSON.parse(raw) as JsonRecord | JsonRecord[];
      const parsedGraph = !Array.isArray(parsed) && Array.isArray(parsed["@graph"]) ? parsed["@graph"] as JsonRecord[] : [];
      const nodes = Array.isArray(parsed) ? parsed : [parsed, ...parsedGraph];
      const product = nodes.find((node) => {
        const type = node?.["@type"];
        return type === "Product" || (Array.isArray(type) && type.includes("Product"));
      });

      if (!product) continue;
      const productData = product as JsonLdProduct;
      const offers = Array.isArray(productData.offers) ? productData.offers[0] : productData.offers;
      const availability = String(offers?.availability || "").toLowerCase();

      let bundlePrices: BundlePrice[] | undefined;
      if (Array.isArray(productData.offers) && productData.offers.length > 1) {
        bundlePrices = productData.offers
          .map((o) => ({
            name: String(o.name || o.sku || "Variant"),
            price: parsePrice(o.price),
          }))
          .filter((o): o is BundlePrice => o.price !== undefined);
      }

      return {
        title: productData.name ? decodeHtml(String(productData.name)) : undefined,
        price: parsePrice(offers?.price || offers?.lowPrice || offers?.highPrice),
        currency: offers?.priceCurrency,
        stockStatus: availability.includes("instock")
          ? "In Stock"
          : availability.includes("outofstock") || availability.includes("soldout")
            ? "Out of Stock"
            : undefined,
        description: productData.description ? decodeHtml(String(productData.description)) : undefined,
        sku: productData.sku || productData.mpn,
        image: Array.isArray(productData.image) ? productData.image[0] : (typeof productData.image === "string" ? productData.image : undefined),
        brand: typeof productData.brand === "object" ? productData.brand?.name : productData.brand,
        rating: productData.aggregateRating?.ratingValue ? Number(productData.aggregateRating.ratingValue) : undefined,
        reviewsCount: productData.aggregateRating?.reviewCount ? Number(productData.aggregateRating.reviewCount) : undefined,
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

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

function asBundlePrices(value: unknown): BundlePrice[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const bundles = value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as JsonRecord;
      const price = parsePrice(record.price as string | number | null | undefined);
      return price === undefined ? null : { name: asString(record.name) || "Variant", price };
    })
    .filter((item): item is BundlePrice => item !== null);
  return bundles.length ? bundles : undefined;
}

function normalizeScraperData(data: JsonRecord): ExtractedProduct {
  if (!data || typeof data !== "object") return {};

  const price = typeof data.price === "number" ? data.price : parsePrice(data.price as string | number | null | undefined);
  const rating = data.rating !== undefined ? Number(data.rating) : undefined;
  const reviewsCount = data.reviewsCount ?? data.reviews_count;

  return {
    title: asString(data.title),
    price,
    stockStatus: asString(data.stockStatus) || asString(data.stock_status),
    promoText: asString(data.promoText) || asString(data.promo_text),
    description: asString(data.description),
    image: asString(data.image),
    brand: asString(data.brand),
    sku: asString(data.sku) || asString(data.mpn),
    rating: Number.isFinite(rating) ? rating : undefined,
    reviewsCount: reviewsCount !== undefined && Number.isFinite(Number(reviewsCount)) ? Number(reviewsCount) : undefined,
    currency: asString(data.currency),
    bundlePrices: asBundlePrices(data.bundlePrices || data.bundle_prices),
    brandSignals: typeof data.brandSignals === "object" && data.brandSignals ? data.brandSignals as JsonRecord : (typeof data.brand_signals === "object" && data.brand_signals ? data.brand_signals as JsonRecord : undefined),
    scrapedAt: asString(data.scrapedAt) || asString(data.scraped_at),
  };
}

async function runPythonScraper(url: string): Promise<ExtractedProduct | null> {
  try {
    const scraperApiUrl = process.env.SCRAPER_API_URL;
    const scraperApiKey = process.env.SCRAPER_API_KEY || "secret_key_to_change";

    if (scraperApiUrl) {
      const res = await fetch(scraperApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${scraperApiKey}`
        },
        body: JSON.stringify({
          url,
          mode: process.env.SCRAPER_MODE || "auto",
          timeout_ms: Number(process.env.SCRAPER_TIMEOUT_MS || 45000),
          wait_ms: Number(process.env.SCRAPER_WAIT_MS || 1200),
        }),
        signal: AbortSignal.timeout(Number(process.env.SCRAPER_REQUEST_TIMEOUT_MS || 60000))
      });

      const result = await res.json().catch(() => null);
      if (res.ok && result?.success && result.data) {
        return normalizeScraperData(result.data);
      }

      const detail = typeof result?.detail === "string" ? result.detail : result?.detail?.message || result?.error;
      throw new Error(detail || `Scraper API returned HTTP ${res.status}`);
    } else {
      // Fallback for local development or VPS where python3 is available.
      const { stdout } = await execAsync("python3", ["scraper/run_scraper.py", url, process.env.SCRAPER_MODE || "auto"], { timeout: 60000 });
      const result = JSON.parse(stdout);
      if (result.success && result.data) {
        return normalizeScraperData(result.data);
      }
      throw new Error(result.error || "Local scraper failed");
    }
  } catch (e) {
    console.error("Python scraper error:", e);
  }
  return null;
}

async function fetchBrandMetrics(url: string, scrapedSignals?: JsonRecord) {
  const apiKey = process.env.BRANDSEARCH_API_KEY;
  if (!apiKey) return scrapedSignals || null;

  try {
    const domain = new URL(url).hostname.replace(/^www\./, '');
    const res = await fetch(`https://api.brandsearch.co/v1/brands/by-url/${domain}`, {
      headers: { "X-API-Key": apiKey },
      signal: AbortSignal.timeout(10000)
    });
    if (res.ok) {
      return { ...(scrapedSignals || {}), ...(await res.json()) };
    }
  } catch (e) {
    console.error("Brandsearch API error:", e);
  }
  return scrapedSignals || null;
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

function toPrismaJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) return undefined;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function mergeBrandMetrics(existing: unknown, incoming: unknown) {
  if (!existing && !incoming) return undefined;
  if (!existing) return incoming;
  if (!incoming) return existing;
  if (isRecord(existing) && isRecord(incoming)) {
    return { ...existing, ...incoming };
  }
  return incoming || existing;
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
    let extracted = await runPythonScraper(product.url);

    if (!extracted || (!extracted.title && extracted.price === undefined)) {
      const html = await fetchHtml(product.url);
      extracted = extractProductData(html);
    }

    if (!extracted || (!extracted.title && extracted.price === undefined && !extracted.stockStatus)) {
      throw new Error("No product data could be extracted from this page");
    }

    const brandMetrics = await fetchBrandMetrics(product.url, extracted.brandSignals);

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
          rating: extracted.rating ?? product.rating,
          reviewsCount: extracted.reviewsCount ?? product.reviewsCount,
          currency: extracted.currency || product.currency,
          bundlePrices: toPrismaJson(extracted.bundlePrices || product.bundlePrices),
          brandMetrics: toPrismaJson(mergeBrandMetrics(product.brandMetrics, brandMetrics)),
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
