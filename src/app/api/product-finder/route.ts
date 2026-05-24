import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

type JsonRecord = Record<string, unknown>;

type FinderProduct = {
  store: string;
  domain: string;
  title?: string;
  handle?: string;
  url?: string;
  image?: string;
  price?: number | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  compareAtPrice?: number | null;
  discountPercent?: number | null;
  available?: boolean | null;
  vendor?: string | null;
  productType?: string | null;
  variantsCount?: number | null;
  variantsAvailable?: number | null;
  publishedAt?: string | null;
  source: "shopify-products-json";
};

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cleanText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.replace(/\s+/g, " ").trim() : undefined;
}

function normalizeStoreUrl(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    if (!["http:", "https:"].includes(parsed.protocol) || !parsed.hostname.includes(".")) return null;
    parsed.hash = "";
    parsed.search = "";
    parsed.pathname = "";
    return parsed;
  } catch {
    return null;
  }
}

function absoluteUrl(value: unknown, base: URL) {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const trimmed = value.trim();
  try {
    if (trimmed.startsWith("//")) return `https:${trimmed}`;
    return new URL(trimmed, base.origin).toString();
  } catch {
    return undefined;
  }
}

function imageUrl(value: unknown, base: URL) {
  if (typeof value === "string") return absoluteUrl(value, base);
  if (!isRecord(value)) return undefined;
  return absoluteUrl(String(value.src || value.url || value.original_src || ""), base);
}

function numberFromValue(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(String(value).replace(/,/g, "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function priceSignals(variants: JsonRecord[], fallback: JsonRecord) {
  const prices = variants.map((variant) => numberFromValue(variant.price)).filter((value): value is number => value !== null);
  const comparePrices = variants.map((variant) => numberFromValue(variant.compare_at_price)).filter((value): value is number => value !== null);
  const fallbackPrice = numberFromValue(fallback.price ?? fallback.price_min);
  const price = prices[0] ?? fallbackPrice;
  const compareAtPrice = comparePrices.length ? Math.max(...comparePrices) : numberFromValue(fallback.compare_at_price);
  const discountPercent = price !== null && compareAtPrice && compareAtPrice > price ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100) : null;
  return {
    price,
    minPrice: prices.length ? Math.min(...prices) : fallbackPrice,
    maxPrice: prices.length ? Math.max(...prices) : fallbackPrice,
    compareAtPrice,
    discountPercent,
    variantsAvailable: variants.filter((variant) => variant.available === true).length,
  };
}

async function fetchShopifyCatalog(store: URL, limit: number) {
  const endpoint = new URL("/products.json", store.origin);
  endpoint.searchParams.set("limit", String(Math.min(Math.max(limit, 1), 250)));

  const res = await fetch(endpoint.toString(), {
    headers: {
      "User-Agent": "Mozilla/5.0 PriceAndSee Product Finder",
      Accept: "application/json,text/plain,*/*;q=0.8",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(12000),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const payload = await res.json().catch(() => null);
  const products = isRecord(payload) && Array.isArray(payload.products) ? payload.products : [];
  const domain = store.hostname.replace(/^www\./, "");

  return products
    .filter(isRecord)
    .map((item): FinderProduct | null => {
      const variants = Array.isArray(item.variants) ? item.variants.filter(isRecord) : [];
      const firstVariant = variants[0];
      const images = Array.isArray(item.images) ? item.images : [];
      const signals = priceSignals(variants, item);
      const handle = cleanText(item.handle);
      const title = cleanText(item.title);
      if (!title && !handle) return null;
      return {
        store: domain,
        domain,
        title,
        handle,
        url: handle ? new URL(`/products/${handle}`, store.origin).toString() : store.origin,
        image: imageUrl(item.image || item.featured_image || images[0], store),
        price: signals.price,
        minPrice: signals.minPrice,
        maxPrice: signals.maxPrice,
        compareAtPrice: signals.compareAtPrice,
        discountPercent: signals.discountPercent,
        available: signals.variantsAvailable > 0 ? true : typeof firstVariant?.available === "boolean" ? firstVariant.available : typeof item.available === "boolean" ? item.available : null,
        vendor: cleanText(item.vendor),
        productType: cleanText(item.product_type || item.type),
        variantsCount: variants.length || null,
        variantsAvailable: variants.length ? signals.variantsAvailable : null,
        publishedAt: cleanText(item.published_at || item.created_at),
        source: "shopify-products-json",
      };
    })
    .filter((item): item is FinderProduct => item !== null);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const rawStores = Array.isArray(body?.stores) ? body.stores : typeof body?.stores === "string" ? body.stores.split(/[\n,]+/) : [];
  const limit = Number(body?.limit || 80);
  const stores: URL[] = rawStores
    .map((value: unknown) => typeof value === "string" ? normalizeStoreUrl(value) : null)
    .filter((value: URL | null): value is URL => Boolean(value))
    .slice(0, 12);

  if (!stores.length) return NextResponse.json({ error: "Add at least one valid store domain." }, { status: 400 });

  const settled = await Promise.allSettled(stores.map((store: URL) => fetchShopifyCatalog(store, limit)));
  const products = settled.flatMap((result) => result.status === "fulfilled" ? result.value : []);
  const errors = settled.flatMap((result, index) => result.status === "rejected" ? [{ store: stores[index].hostname, error: result.reason instanceof Error ? result.reason.message : "Fetch failed" }] : []);

  return NextResponse.json({
    products,
    stores: stores.map((store: URL) => store.hostname.replace(/^www\./, "")),
    errors,
    count: products.length,
    source: "shopify-products-json",
  });
}
