import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchBrandSearchMetricsForUrl } from "@/lib/brandsearch";

type ProductMedia = {
  url: string;
  alt?: string;
  source?: string;
  type?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cleanText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.replace(/\s+/g, " ").trim() : undefined;
}

function absoluteImageUrl(value: string, baseUrl: string) {
  const trimmed = value.trim().replace(/[);,'"]+$/g, "");
  if (!trimmed || trimmed.startsWith("data:") || trimmed.startsWith("blob:")) return undefined;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  try {
    const parsed = new URL(trimmed, baseUrl);
    if (parsed.protocol === "http:") parsed.protocol = "https:";
    return parsed.toString();
  } catch {
    return undefined;
  }
}

function mediaItem(value: unknown, baseUrl: string, source: string, alt?: string): ProductMedia | null {
  const url = typeof value === "string" ? absoluteImageUrl(value, baseUrl) : undefined;
  if (!url) return null;
  const lower = url.toLowerCase();
  if (!/(cdn\.shopify\.com|\/cdn\/shop\/|\.(png|jpe?g|webp|gif|avif)(\?|$))/i.test(lower)) return null;
  return { url, alt, source, type: "image" };
}

function mergeMedia(...groups: Array<ProductMedia[] | undefined | null>) {
  const seen = new Set<string>();
  const merged: ProductMedia[] = [];
  for (const group of groups) {
    for (const item of group || []) {
      const url = item.url;
      if (!url || seen.has(url)) continue;
      seen.add(url);
      merged.push({ ...item, type: item.type || "image" });
    }
  }
  return merged.slice(0, 30);
}

function shopifyProductEndpoints(url: string) {
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/\/products\/([^/?#]+)/);
    if (!match) return [];
    const base = `${parsed.protocol}//${parsed.host}/products/${match[1]}`;
    return [`${base}.js`, `${base}.json`];
  } catch {
    return [];
  }
}

async function fetchShopifyProductMedia(url: string) {
  const endpoints = shopifyProductEndpoints(url);
  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        headers: {
          "User-Agent": "Mozilla/5.0 PriceAndSee Product Media",
          Accept: "application/json,text/plain,*/*;q=0.8",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;
      const parsed = await res.json().catch(() => null);
      const product = isRecord(parsed) && isRecord(parsed.product) ? parsed.product : parsed;
      if (!isRecord(product)) continue;

      const media: ProductMedia[] = [];
      const featured = product.featured_image;
      if (typeof featured === "string") {
        const item = mediaItem(featured, url, "shopify-featured", "Featured product image");
        if (item) media.push(item);
      } else if (isRecord(featured)) {
        const item = mediaItem(featured.src || featured.url, url, "shopify-featured", cleanText(featured.alt) || "Featured product image");
        if (item) media.push(item);
      }

      if (Array.isArray(product.images)) {
        for (const image of product.images) {
          if (typeof image === "string") {
            const item = mediaItem(image, url, "shopify-product-json");
            if (item) media.push(item);
          } else if (isRecord(image)) {
            const item = mediaItem(image.src || image.url || image.original_src, url, "shopify-product-json", cleanText(image.alt));
            if (item) media.push(item);
          }
        }
      }

      if (Array.isArray(product.media)) {
        for (const entry of product.media) {
          if (!isRecord(entry)) continue;
          const preview = isRecord(entry.preview_image) ? entry.preview_image : undefined;
          const item = mediaItem(preview?.src || preview?.url || entry.src || entry.url, url, "shopify-product-media", cleanText(entry.alt));
          if (item) media.push(item);
        }
      }

      const merged = mergeMedia(media);
      if (merged.length) return merged;
    } catch {
      // Ignore Shopify side-channel failures and keep the saved scrape payload.
    }
  }
  return [] as ProductMedia[];
}

function savedProductMedia(product: { productMedia?: unknown; image?: string | null; title?: string | null; url: string }) {
  const items: ProductMedia[] = [];
  if (Array.isArray(product.productMedia)) {
    for (const item of product.productMedia) {
      if (!isRecord(item) || typeof item.url !== "string") continue;
      const url = absoluteImageUrl(item.url, product.url);
      if (!url) continue;
      items.push({
        url,
        alt: cleanText(item.alt),
        source: cleanText(item.source) || "saved",
        type: cleanText(item.type) || "image",
      });
    }
  }
  if (product.image) {
    const url = absoluteImageUrl(product.image, product.url);
    if (url) items.push({ url, alt: product.title || "Product image", source: "primary", type: "image" });
  }
  return mergeMedia(items);
}

async function fetchFreshBrandMetrics(url: string, existing: unknown) {
  return fetchBrandSearchMetricsForUrl(url, existing);
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const product = await prisma.product.findUnique({
    where: { id, userId: session.user.id },
    include: {
      priceHistory: { orderBy: { createdAt: "asc" } },
      alertSetting: true,
      scrapingJobs: { orderBy: { createdAt: "desc" }, take: 10 }
    }
  });

  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const savedMedia = savedProductMedia(product);
  const shopifyMedia = shopifyProductEndpoints(product.url).length ? await fetchShopifyProductMedia(product.url) : [];
  const brandMetrics = await fetchFreshBrandMetrics(product.url, product.brandMetrics);
  const productMedia = mergeMedia(shopifyMedia, savedMedia);
  const image = productMedia[0]?.url || product.image;
  const responseProduct = { ...product, image, productMedia, brandMetrics };

  const shouldPersistMedia = productMedia.length && (JSON.stringify(savedMedia) !== JSON.stringify(productMedia) || image !== product.image);
  const shouldPersistBrandMetrics = JSON.stringify(brandMetrics || null) !== JSON.stringify(product.brandMetrics || null);
  if (shouldPersistMedia || shouldPersistBrandMetrics) {
    await prisma.product.update({
      where: { id: product.id },
      data: {
        ...(shouldPersistMedia ? {
          image,
          productMedia: JSON.parse(JSON.stringify(productMedia)) as Prisma.InputJsonValue,
        } : {}),
        ...(shouldPersistBrandMetrics && brandMetrics ? {
          brandMetrics: JSON.parse(JSON.stringify(brandMetrics)) as Prisma.InputJsonValue,
        } : {}),
      },
    }).catch(() => null);
  }

  return NextResponse.json(responseProduct);
}
