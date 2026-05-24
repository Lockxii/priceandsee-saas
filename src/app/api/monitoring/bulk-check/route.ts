import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { effectiveUserLimits } from "@/lib/plans";
import { scrapeProduct } from "@/lib/scraper";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

function uniqueIds(value: unknown) {
  if (!Array.isArray(value)) return [] as string[];
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const item of value) {
    if (typeof item !== "string" || !item.trim() || seen.has(item)) continue;
    seen.add(item);
    ids.push(item);
  }
  return ids.slice(0, 12);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const requestedIds = uniqueIds(body?.productIds);
  if (!requestedIds.length) return NextResponse.json({ error: "Select at least one product to check." }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      plan: true,
      maxUrls: true,
      checkIntervalHours: true,
      monthlyCheckLimit: true,
      monthlyChecksUsed: true,
      monthlyChecksReset: true,
      emailAlertsEnabled: true,
      slackAlertsEnabled: true,
    },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const limits = effectiveUserLimits(user);
  const now = new Date();
  const monthlyUsed = user.monthlyChecksReset <= now ? 0 : user.monthlyChecksUsed;
  const quotaLeft = Math.max(0, limits.monthlyCheckLimit - monthlyUsed);
  if (quotaLeft <= 0) return NextResponse.json({ error: `Monthly scraping quota reached (${limits.monthlyCheckLimit}).` }, { status: 403 });

  const products = await prisma.product.findMany({
    where: { id: { in: requestedIds }, userId: session.user.id },
    select: { id: true },
  });
  const allowed = products.slice(0, Math.min(12, quotaLeft));
  if (!allowed.length) return NextResponse.json({ error: "No matching tracked products found." }, { status: 404 });

  const results = [] as Array<{ productId: string; ok: boolean; error?: string }>;
  for (const product of allowed) {
    try {
      const result = await scrapeProduct(product.id, { source: "manual" });
      results.push({ productId: product.id, ok: Boolean(result.ok), error: result.ok ? undefined : result.error });
    } catch (error) {
      results.push({ productId: product.id, ok: false, error: error instanceof Error ? error.message : "Unknown scraping error" });
    }
  }

  const success = results.filter((result) => result.ok).length;
  const failed = results.length - success;

  return NextResponse.json({
    checked: results.length,
    success,
    failed,
    skippedQuota: Math.max(0, requestedIds.length - allowed.length),
    quotaLeftBefore: quotaLeft,
    quotaLeftAfter: Math.max(0, quotaLeft - results.length),
    results,
  });
}
