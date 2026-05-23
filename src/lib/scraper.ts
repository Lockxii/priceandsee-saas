import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { effectiveUserLimits, nextMonthlyResetDate } from "@/lib/plans";
import { fetchBrandSearchMetricsForUrl, mergeBrandSearchMetrics } from "@/lib/brandsearch";
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
  image?: string | string[] | JsonRecord | JsonRecord[];
  brand?: string | { name?: string };
  aggregateRating?: { ratingValue?: string | number; reviewCount?: string | number; ratingCount?: string | number };
  review?: JsonRecord | JsonRecord[];
};

type ProductMedia = {
  url: string;
  alt?: string;
  source?: string;
  type?: string;
};

type ProductReview = {
  author?: string;
  title?: string;
  body?: string;
  rating?: number;
  date?: string;
  source?: string;
  count?: number;
};

type BundlePrice = {
  name: string;
  price: number;
  sku?: string;
  id?: string | number;
  url?: string;
  available?: boolean;
  image?: string;
  options?: Record<string, unknown>;
};

type BundleWidgetAsset = {
  type?: string;
  url: string;
  source?: string;
};

type BundleWidget = {
  html: string;
  css?: string[];
  assets?: BundleWidgetAsset[];
  source?: string;
  detectedBy?: string;
  score?: number;
  text?: string;
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
  productMedia?: ProductMedia[];
  productReviews?: ProductReview[];
  bundlePrices?: BundlePrice[];
  bundleWidget?: BundleWidget;
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

function parseRatingValue(value: unknown) {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  const match = String(value).match(/\d+(?:[.,]\d+)?/);
  if (!match) return undefined;
  const rating = Number(match[0].replace(",", "."));
  if (!Number.isFinite(rating)) return undefined;
  if (rating >= 0 && rating <= 5) return rating;
  if (rating > 5 && rating <= 100 && String(value).includes("%")) return Number((rating / 20).toFixed(2));
  return undefined;
}

function parseIntegerValue(value: unknown) {
  if (value === null || value === undefined) return undefined;
  const match = String(value).match(/\d[\d\s,.]*/);
  if (!match) return undefined;
  const integer = Number.parseInt(match[0].replace(/[^0-9]/g, ""), 10);
  return Number.isFinite(integer) ? integer : undefined;
}

function jsonLdText(value: unknown): string | undefined {
  if (typeof value === "string" || typeof value === "number") return decodeHtml(String(value));
  if (isRecord(value)) {
    return jsonLdText(value.name) || jsonLdText(value.url) || jsonLdText(value.contentUrl) || jsonLdText(value.src);
  }
  return undefined;
}

function jsonLdImageUrls(value: JsonLdProduct["image"]): string[] {
  const values = Array.isArray(value) ? value : [value];
  const urls = values
    .map((item) => jsonLdText(item))
    .filter((item): item is string => Boolean(item));
  return Array.from(new Set(urls)).slice(0, 30);
}

function jsonLdReviews(value: JsonLdProduct["review"], aggregateRating?: JsonLdProduct["aggregateRating"]): ProductReview[] | undefined {
  const rawReviews = value ? (Array.isArray(value) ? value : [value]) : [];
  const reviews = rawReviews
    .map((review): ProductReview | null => {
      if (!isRecord(review)) return null;
      const author = review.author;
      const reviewRating = isRecord(review.reviewRating) ? review.reviewRating : undefined;
      const rating = parseRatingValue(reviewRating?.ratingValue ?? review.ratingValue ?? review.rating);
      const body = jsonLdText(review.reviewBody) || jsonLdText(review.description) || jsonLdText(review.text);
      const title = jsonLdText(review.name) || jsonLdText(review.headline);
      if (!body && !title && rating === undefined) return null;
      return {
        author: jsonLdText(author),
        title,
        body,
        rating,
        date: jsonLdText(review.datePublished) || jsonLdText(review.dateCreated),
        source: "json-ld",
      };
    })
    .filter((review): review is ProductReview => review !== null);

  const aggregateRatingValue = parseRatingValue(aggregateRating?.ratingValue);
  const aggregateCount = parseIntegerValue(aggregateRating?.reviewCount ?? aggregateRating?.ratingCount);
  if (!reviews.length && (aggregateRatingValue !== undefined || aggregateCount !== undefined)) {
    reviews.push({ rating: aggregateRatingValue, count: aggregateCount, source: "aggregate-rating" });
  }

  return reviews.length ? reviews.slice(0, 30) : undefined;
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
      const imageUrls = jsonLdImageUrls(productData.image);
      const image = imageUrls[0];
      const rating = parseRatingValue(productData.aggregateRating?.ratingValue);
      const reviewsCount = parseIntegerValue(productData.aggregateRating?.reviewCount ?? productData.aggregateRating?.ratingCount);
      const productReviews = jsonLdReviews(productData.review, productData.aggregateRating);

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
        image,
        productMedia: asProductMedia(imageUrls, image),
        brand: typeof productData.brand === "object" ? productData.brand?.name : productData.brand,
        rating,
        reviewsCount,
        productReviews,
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

  const image = jsonLd.image || matchContent(html, /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);

  return {
    title: jsonLd.title || metaTitle,
    price: jsonLd.price ?? parsePrice(metaPrice),
    stockStatus,
    promoText: promoText?.slice(0, 240),
    description: jsonLd.description || promoText,
    image,
    productMedia: jsonLd.productMedia || asProductMedia(undefined, image),
    brand: jsonLd.brand || matchContent(html, /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i),
    sku: jsonLd.sku,
    rating: jsonLd.rating,
    reviewsCount: jsonLd.reviewsCount,
    productReviews: jsonLd.productReviews,
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
    .map((item): BundlePrice | null => {
      if (!item || typeof item !== "object") return null;
      const record = item as JsonRecord;
      const price = parsePrice(record.price as string | number | null | undefined);
      if (price === undefined) return null;
      return {
        name: asString(record.name) || "Variant",
        price,
        sku: asString(record.sku),
        id: typeof record.id === "string" || typeof record.id === "number" ? record.id : undefined,
        url: asString(record.url),
        available: typeof record.available === "boolean" ? record.available : undefined,
        image: asString(record.image),
        options: isRecord(record.options) ? record.options : undefined,
      };
    })
    .filter((item): item is BundlePrice => item !== null);
  return bundles.length ? bundles : undefined;
}

function asProductMedia(value: unknown, primaryImage?: string): ProductMedia[] | undefined {
  const items: ProductMedia[] = [];
  if (primaryImage) items.push({ url: primaryImage, alt: "Primary product image", source: "primary", type: "image" });
  if (Array.isArray(value)) {
    value.forEach((item) => {
      if (typeof item === "string") {
        items.push({ url: item, type: "image" });
        return;
      }
      if (!isRecord(item)) return;
      const url = asString(item.url) || asString(item.src) || asString(item.image);
      if (!url) return;
      items.push({
        url,
        alt: asString(item.alt),
        source: asString(item.source),
        type: asString(item.type) || "image",
      });
    });
  }
  const seen = new Set<string>();
  const unique = items.filter((item) => {
    if (!item.url || seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
  return unique.length ? unique.slice(0, 30) : undefined;
}

function asProductReviews(value: unknown): ProductReview[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const reviews = value
    .map((item): ProductReview | null => {
      if (!isRecord(item)) return null;
      const body = asString(item.body) || asString(item.text) || asString(item.reviewBody) || asString(item.description);
      const count = item.count !== undefined && Number.isFinite(Number(item.count)) ? Number(item.count) : undefined;
      const rating = item.rating !== undefined && Number.isFinite(Number(item.rating)) ? Number(item.rating) : undefined;
      if (!body && rating === undefined && count === undefined) return null;
      return {
        author: asString(item.author) || asString(item.name),
        title: asString(item.title) || asString(item.headline),
        body,
        rating,
        date: asString(item.date) || asString(item.datePublished),
        source: asString(item.source),
        count,
      };
    })
    .filter((item): item is ProductReview => item !== null);
  return reviews.length ? reviews.slice(0, 30) : undefined;
}

function asBundleWidget(value: unknown): BundleWidget | undefined {
  if (!isRecord(value)) return undefined;
  const html = asString(value.html);
  if (!html) return undefined;

  const css = Array.isArray(value.css) ? value.css.map(String).filter(Boolean).slice(0, 6) : undefined;
  const assets = Array.isArray(value.assets)
    ? value.assets
        .map((asset): BundleWidgetAsset | null => {
          if (!isRecord(asset)) return null;
          const url = asString(asset.url);
          if (!url) return null;
          return {
            url,
            type: asString(asset.type),
            source: asString(asset.source),
          };
        })
        .filter((asset): asset is BundleWidgetAsset => asset !== null)
        .slice(0, 40)
    : undefined;

  return {
    html,
    css,
    assets,
    source: asString(value.source),
    detectedBy: asString(value.detectedBy) || asString(value.detected_by),
    score: Number.isFinite(Number(value.score)) ? Number(value.score) : undefined,
    text: asString(value.text),
  };
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
    productMedia: asProductMedia(data.productMedia || data.product_media || data.media || data.images, asString(data.image)),
    productReviews: asProductReviews(data.productReviews || data.product_reviews || data.reviews),
    bundlePrices: asBundlePrices(data.bundlePrices || data.bundle_prices),
    bundleWidget: asBundleWidget(data.bundleWidget || data.bundle_widget),
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
  return fetchBrandSearchMetricsForUrl(url, undefined, scrapedSignals);
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
  return mergeBrandSearchMetrics(existing, incoming) || undefined;
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
          productMedia: toPrismaJson(extracted.productMedia || product.productMedia),
          productReviews: toPrismaJson(extracted.productReviews || product.productReviews),
          bundlePrices: toPrismaJson(extracted.bundlePrices || product.bundlePrices),
          bundleWidget: toPrismaJson(extracted.bundleWidget || product.bundleWidget),
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
