import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { effectiveUserLimits } from "@/lib/plans";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: "URL is required" }, { status: 400 });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { _count: { select: { products: true } } }
    });

    const limits = user ? effectiveUserLimits(user) : effectiveUserLimits({ plan: "FREE" });

    if (!user || user._count.products >= limits.maxUrls) {
      return NextResponse.json({ error: `URL limit reached (${limits.maxUrls}). Please upgrade or ask admin for a higher quota.` }, { status: 403 });
    }

    const product = await prisma.product.create({
      data: {
        url,
        userId,
        alertSetting: {
          create: {
            emailEnabled: limits.emailAlertsEnabled,
            slackEnabled: limits.slackAlertsEnabled
          }
        }
      }
    });

    return NextResponse.json({ product });
  } catch (error) {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const products = await prisma.product.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json({ products });
}
