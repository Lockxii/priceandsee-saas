import { NextResponse } from "next/server";
import { scrapeDueProducts } from "@/lib/scraper";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = req.headers.get("authorization")?.replace("Bearer ", "") || url.searchParams.get("secret");
  const expected = process.env.CRON_SECRET;

  if (expected && token !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = Number(url.searchParams.get("limit") || 10);
  const results = await scrapeDueProducts(Math.min(Math.max(limit, 1), 25));

  return NextResponse.json({ ok: true, count: results.length, results });
}
