import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { buildPromoReport, normalizeHttpUrl } from "@/lib/ecommerce-tools";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = normalizeHttpUrl(body?.url);
  if (!parsed) return NextResponse.json({ error: "Add a valid website or product URL." }, { status: 400 });

  try {
    return NextResponse.json(await buildPromoReport(parsed));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Promo detection failed" }, { status: 502 });
  }
}
