import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

function safeFilename(value: string) {
  return value.replace(/[^a-z0-9._-]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 90) || "product-image";
}

function extensionFor(contentType: string, pathname: string) {
  const fromPath = pathname.match(/\.([a-z0-9]{2,5})$/i)?.[1];
  if (fromPath && ["jpg", "jpeg", "png", "webp", "gif", "avif", "svg"].includes(fromPath.toLowerCase())) return fromPath.toLowerCase();
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("gif")) return "gif";
  if (contentType.includes("avif")) return "avif";
  if (contentType.includes("svg")) return "svg";
  return "jpg";
}

function parseAssetRequest(req: NextRequest) {
  const target = req.nextUrl.searchParams.get("url");
  const name = safeFilename(req.nextUrl.searchParams.get("name") || "product-image");
  const inline = req.nextUrl.searchParams.get("inline") === "1";
  if (!target) return { error: NextResponse.json({ error: "Missing url" }, { status: 400 }) };

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return { error: NextResponse.json({ error: "Invalid url" }, { status: 400 }) };
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return { error: NextResponse.json({ error: "Unsupported protocol" }, { status: 400 }) };
  }

  return { parsed, name, inline };
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const asset = parseAssetRequest(req);
  if (asset.error) return asset.error;
  const { parsed, name, inline } = asset;

  try {
    const response = await fetch(parsed.toString(), {
      headers: {
        "User-Agent": "Mozilla/5.0 PriceAndSee Asset Downloader",
        Accept: "image/avif,image/webp,image/png,image/jpeg,image/gif,image/svg+xml,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(20000),
    });

    if (!response.ok) {
      return NextResponse.json({ error: `Asset returned HTTP ${response.status}` }, { status: 502 });
    }

    const contentType = response.headers.get("content-type") || "application/octet-stream";
    const extension = extensionFor(contentType, parsed.pathname);
    const body = await response.arrayBuffer();

    return new NextResponse(body, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${name}.${extension}"`,
        "Cache-Control": inline ? "private, max-age=3600" : "private, max-age=300",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Asset download failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
