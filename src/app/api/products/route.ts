import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: "URL is required" }, { status: 400 });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { _count: { select: { products: true } } }
    });

    if (user?.plan === "FREE" && user._count.products >= 10) {
      return NextResponse.json({ error: "Plan limit reached. Please upgrade to add more products." }, { status: 403 });
    }

    const product = await prisma.product.create({
      data: {
        url,
        userId,
        alertSetting: {
          create: {
            emailEnabled: true
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
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const products = await prisma.product.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json({ products });
}
