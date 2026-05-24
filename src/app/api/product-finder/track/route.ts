import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { effectiveUserLimits } from "@/lib/plans";

type IncomingProduct = {
  url?: string;
  title?: string;
  image?: string;
  price?: number | null;
  currency?: string | null;
  stockStatus?: string | null;
  store?: string;
};

type TrackCandidate = {
  url: string;
  title?: string;
  image?: string;
  currentPrice?: number;
  currency: string;
  stockStatus?: string;
};

function normalizeUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const parsed = new URL(value.trim());
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return null;
  }
}

function cleanText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.replace(/\s+/g, " ").trim() : undefined;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const rawProducts: unknown[] = Array.isArray(body?.products) ? body.products : [];
  const incoming = rawProducts.filter((item): item is IncomingProduct => typeof item === "object" && item !== null);
  if (!incoming.length) return NextResponse.json({ error: "Select at least one product." }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { _count: { select: { products: true } }, products: { select: { url: true } } },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const limits = effectiveUserLimits(user);
  const existingUrls = new Set(user.products.map((product) => normalizeUrl(product.url) || product.url));
  const seen = new Set<string>();
  const candidates: TrackCandidate[] = incoming
    .map((item): TrackCandidate | null => {
      const url = normalizeUrl(item.url);
      if (!url || seen.has(url)) return null;
      seen.add(url);
      return {
        url,
        title: cleanText(item.title),
        image: cleanText(item.image),
        currentPrice: typeof item.price === "number" && Number.isFinite(item.price) ? item.price : undefined,
        currency: cleanText(item.currency) || "USD",
        stockStatus: cleanText(item.stockStatus),
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .slice(0, 50);

  const duplicates = candidates.filter((item) => existingUrls.has(item.url)).map((item) => item.url);
  const remainingSlots = Math.max(0, limits.maxUrls - user._count.products);
  const creatable = candidates.filter((item) => !existingUrls.has(item.url)).slice(0, remainingSlots);
  const skippedQuota = Math.max(0, candidates.filter((item) => !existingUrls.has(item.url)).length - creatable.length);

  if (!creatable.length) {
    return NextResponse.json({
      added: 0,
      duplicates,
      skippedQuota,
      limit: limits.maxUrls,
      remainingSlots,
      products: [],
      message: duplicates.length ? "Selected products are already tracked or quota is full." : "No valid product URLs to track.",
    }, { status: remainingSlots <= 0 ? 403 : 200 });
  }

  const created = await prisma.$transaction(
    creatable.map((item) => prisma.product.create({
      data: {
        url: item.url,
        title: item.title,
        image: item.image,
        currentPrice: item.currentPrice,
        currency: item.currency,
        stockStatus: item.stockStatus,
        userId: user.id,
        priceHistory: item.currentPrice !== undefined ? {
          create: { price: item.currentPrice },
        } : undefined,
        alertSetting: {
          create: {
            emailEnabled: limits.emailAlertsEnabled,
            slackEnabled: limits.slackAlertsEnabled,
          },
        },
      },
    }))
  );

  return NextResponse.json({
    added: created.length,
    duplicates,
    skippedQuota,
    limit: limits.maxUrls,
    remainingSlots: Math.max(0, remainingSlots - created.length),
    products: created,
    message: `${created.length} product${created.length > 1 ? "s" : ""} added to tracking.`,
  });
}
