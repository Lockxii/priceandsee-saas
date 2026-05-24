"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, ExternalLink, ImageDown, Loader2, Search, Video } from "lucide-react";

type MediaAsset = { url: string; type: "image" | "video" | "font" | "css" | "other"; source: string; alt?: string };
type MediaReport = { url: string; finalUrl: string; media: MediaAsset[]; platforms: Array<{ name: string; confidence: string }>; sources: string[] };

function filenameFromUrl(url: string, fallback: string) {
  try {
    const pathname = new URL(url).pathname.split("/").filter(Boolean).pop() || fallback;
    return pathname.replace(/[^a-z0-9._-]+/gi, "-").slice(0, 80) || fallback;
  } catch {
    return fallback;
  }
}

function downloadAsset(url: string, name: string) {
  const href = `/api/assets/download?url=${encodeURIComponent(url)}&name=${encodeURIComponent(name)}`;
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export default function MediaDownloaderPage() {
  const [url, setUrl] = useState("https://bleame.com");
  const [report, setReport] = useState<MediaReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | MediaAsset["type"]>("image");

  const filtered = useMemo(() => {
    const items = report?.media || [];
    return filter === "all" ? items : items.filter((item) => item.type === filter);
  }, [report, filter]);

  const run = async () => {
    setLoading(true);
    setError("");
    setReport(null);
    try {
      const res = await fetch("/api/tools/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Media extraction failed");
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Media extraction failed");
    } finally {
      setLoading(false);
    }
  };

  const downloadVisible = () => {
    filtered.slice(0, 80).forEach((item, index) => {
      setTimeout(() => downloadAsset(item.url, filenameFromUrl(item.url, `asset-${index + 1}`)), index * 160);
    });
  };

  return (
    <div className="h-full overflow-hidden flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link href="/dashboard/tools" className="inline-flex items-center gap-2 text-sm font-black text-[#8a7668] hover:text-[#ff690c]"><ArrowLeft className="h-4 w-4" /> Tools</Link>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-black text-[#24170f] tracking-tight flex items-center gap-3"><ImageDown className="w-8 h-8 text-[#ff690c]" />Media Downloader</h1>
            <p className="mt-2 text-[#6f5a4d] max-w-3xl">Extract real images/videos/assets from commerce pages using HTML, JSON-LD, Shopify products JSON and WooCommerce Store API when available.</p>
          </div>
          {filtered.length > 0 && <button onClick={downloadVisible} className="inline-flex items-center gap-2 rounded-xl bg-[#24170f] px-4 py-2 text-sm font-black text-[#fffaf6] hover:bg-[#3a281d]"><Download className="h-4 w-4" />Download visible</button>}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5 min-h-0 flex-1">
        <section className="xl:col-span-2 bg-white rounded-2xl border border-[#f1ded1] shadow-[0_10px_30px_-24px_rgba(53,37,28,0.45)] p-5 flex flex-col min-h-0">
          <label className="text-sm font-black uppercase tracking-[0.12em] text-[#a99485]">Website or product URL</label>
          <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://store.com/products/product" className="mt-3 rounded-2xl border border-[#f1ded1] bg-[#fffaf6] px-4 py-3 text-sm font-bold text-[#24170f] outline-none focus:border-[#ff690c]" />
          <button onClick={run} disabled={loading} className="mt-4 rounded-xl bg-[#ff690c] px-4 py-3 text-sm font-black text-white shadow-[0_8px_18px_rgba(255,105,12,0.22)] hover:bg-[#e85f0a] disabled:opacity-60 inline-flex items-center justify-center gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}{loading ? "Extracting..." : "Extract media"}
          </button>
          {error && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-600">{error}</p>}
          {report && (
            <div className="mt-4 space-y-3 text-sm">
              <div className="rounded-xl border border-[#f1ded1] bg-[#fffaf6] p-3"><p className="font-black text-[#24170f]">{report.media.length} assets found</p><p className="text-xs font-bold text-[#8a7668] truncate">{report.finalUrl}</p></div>
              <div className="flex flex-wrap gap-2">{report.platforms.map((item) => <span key={item.name} className="rounded-full border border-[#f1ded1] px-2 py-1 text-xs font-black text-[#5b4638]">{item.name}</span>)}</div>
              <div className="flex flex-wrap gap-2">{report.sources.map((item) => <span key={item} className="rounded-full bg-[#fff2e8] px-2 py-1 text-xs font-black text-[#c84f00]">{item}</span>)}</div>
            </div>
          )}
        </section>

        <section className="xl:col-span-3 bg-white rounded-2xl border border-[#f1ded1] shadow-[0_10px_30px_-24px_rgba(53,37,28,0.45)] flex flex-col min-h-0 overflow-hidden">
          <div className="p-4 border-b border-[#f1ded1] flex flex-wrap items-center gap-2 flex-shrink-0">
            {(["all", "image", "video", "font", "css"] as const).map((item) => <button key={item} onClick={() => setFilter(item)} className={`rounded-xl px-3 py-2 text-sm font-black border ${filter === item ? "bg-[#ff690c] text-white border-[#ff690c]" : "bg-[#fffaf6] text-[#5b4638] border-[#f1ded1]"}`}>{item}</button>)}
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-4">
            {!report ? <div className="h-full flex items-center justify-center text-center text-[#8a7668]">Run extraction to see real downloadable assets.</div> : filtered.length === 0 ? <div className="h-full flex items-center justify-center text-center text-[#8a7668]">No assets for this filter.</div> : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered.map((asset, index) => (
                  <div key={`${asset.url}-${index}`} className="rounded-2xl border border-[#f1ded1] overflow-hidden bg-[#fffaf6]">
                    <div className="aspect-square bg-white flex items-center justify-center overflow-hidden">
                      {asset.type === "image" ? <img src={`/api/assets/download?inline=1&url=${encodeURIComponent(asset.url)}`} alt={asset.alt || ""} className="h-full w-full object-cover" /> : <Video className="h-10 w-10 text-[#a99485]" />}
                    </div>
                    <div className="p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2"><span className="rounded-full bg-white px-2 py-1 text-[10px] font-black uppercase text-[#8a7668]">{asset.type}</span><span className="truncate text-[10px] font-bold text-[#8a7668]">{asset.source}</span></div>
                      <p className="truncate text-xs font-bold text-[#5b4638]" title={asset.url}>{filenameFromUrl(asset.url, `asset-${index + 1}`)}</p>
                      <div className="flex gap-2">
                        <button onClick={() => downloadAsset(asset.url, filenameFromUrl(asset.url, `asset-${index + 1}`))} className="flex-1 rounded-lg bg-[#ff690c] px-3 py-2 text-xs font-black text-white">Download</button>
                        <a href={asset.url} target="_blank" rel="noreferrer" className="rounded-lg border border-[#f1ded1] bg-white px-3 py-2 text-xs font-black text-[#5b4638]"><ExternalLink className="h-4 w-4" /></a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
