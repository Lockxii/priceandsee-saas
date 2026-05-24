"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Copy, ExternalLink, ImageIcon, Loader2, Search, SearchCode } from "lucide-react";

type Snapshot = {
  url: string;
  finalUrl: string;
  canonical?: string;
  title?: string;
  description?: string;
  price?: number | null;
  currency?: string | null;
  availability?: string;
  brand?: string;
  sku?: string;
  image?: string;
  rating?: number | null;
  reviewsCount?: number | null;
  platforms: Array<{ name: string; confidence: string }>;
  jsonLdTypes: string[];
  media: Array<{ url: string; type: string; source: string }>;
  productUrls: Array<{ url: string; title?: string; image?: string; price?: number | null; currency?: string | null; source: string }>;
  sources: string[];
};

function money(value?: number | null, currency = "USD") {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: value % 1 ? 2 : 0 }).format(value);
}

export default function ProductSnapshotPage() {
  const [url, setUrl] = useState("https://bleame.com/products/crystal-hair-eraser");
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const run = async () => {
    setLoading(true);
    setError("");
    setSnapshot(null);
    try {
      const res = await fetch("/api/tools/product-snapshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Snapshot failed");
      setSnapshot(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Snapshot failed");
    } finally {
      setLoading(false);
    }
  };

  const copyJson = async () => {
    if (!snapshot) return;
    await navigator.clipboard.writeText(JSON.stringify(snapshot, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <Link href="/dashboard/tools" className="inline-flex items-center gap-2 text-sm font-black text-[#8a7668] hover:text-[#ff690c]"><ArrowLeft className="h-4 w-4" /> Tools</Link>
        <h1 className="text-3xl font-black text-[#24170f] tracking-tight flex items-center gap-3"><SearchCode className="w-8 h-8 text-[#ff690c]" />Product Snapshot</h1>
        <p className="text-[#6f5a4d] max-w-3xl">Extract structured product data from one URL using JSON-LD, meta tags and platform side APIs when available.</p>
      </div>

      <section className="rounded-2xl border border-[#f1ded1] bg-white p-5 shadow-[0_10px_30px_-24px_rgba(53,37,28,0.45)]">
        <div className="flex flex-col gap-3 md:flex-row">
          <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://store.com/products/product" className="flex-1 rounded-2xl border border-[#f1ded1] bg-[#fffaf6] px-4 py-3 text-sm font-bold text-[#24170f] outline-none focus:border-[#ff690c]" />
          <button onClick={run} disabled={loading} className="rounded-xl bg-[#ff690c] px-5 py-3 text-sm font-black text-white shadow-[0_8px_18px_rgba(255,105,12,0.22)] hover:bg-[#e85f0a] disabled:opacity-60 inline-flex items-center justify-center gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}{loading ? "Reading..." : "Read product"}
          </button>
        </div>
        {error && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-600">{error}</p>}
      </section>

      {!snapshot ? <div className="rounded-2xl border border-dashed border-[#f1ded1] bg-white p-12 text-center text-[#8a7668]">Run a snapshot to see product data.</div> : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-5">
          <section className="xl:col-span-2 rounded-2xl border border-[#f1ded1] bg-white shadow-[0_10px_30px_-24px_rgba(53,37,28,0.45)] overflow-hidden">
            <div className="aspect-square bg-[#fffaf6] flex items-center justify-center overflow-hidden">
              {snapshot.image ? <img src={`/api/assets/download?inline=1&url=${encodeURIComponent(snapshot.image)}`} alt="" className="h-full w-full object-cover" /> : <ImageIcon className="h-12 w-12 text-[#a99485]" />}
            </div>
            <div className="p-5 space-y-3">
              <h2 className="text-2xl font-black text-[#24170f]">{snapshot.title || "Untitled product"}</h2>
              <p className="text-sm text-[#6f5a4d] line-clamp-4">{snapshot.description || "No description found."}</p>
              <div className="grid grid-cols-2 gap-3">
                <Mini label="Price" value={money(snapshot.price, snapshot.currency || "USD")} />
                <Mini label="Stock" value={snapshot.availability?.split("/").pop() || "—"} />
                <Mini label="Brand" value={snapshot.brand || "—"} />
                <Mini label="SKU" value={snapshot.sku || "—"} />
              </div>
              <div className="flex flex-wrap gap-2">{snapshot.sources.map((item) => <span key={item} className="rounded-full bg-[#fff2e8] px-2 py-1 text-xs font-black text-[#c84f00]">{item}</span>)}</div>
            </div>
          </section>

          <section className="xl:col-span-3 space-y-5">
            <div className="rounded-2xl border border-[#f1ded1] bg-white p-5 shadow-[0_10px_30px_-24px_rgba(53,37,28,0.45)]">
              <div className="flex items-center justify-between gap-3"><h2 className="font-black text-[#24170f]">Signals</h2><button onClick={copyJson} className="rounded-xl border border-[#f1ded1] bg-[#fffaf6] px-3 py-2 text-xs font-black text-[#5b4638] inline-flex items-center gap-2"><Copy className="h-4 w-4" />{copied ? "Copied" : "Copy JSON"}</button></div>
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                <Mini label="Rating" value={snapshot.rating ? `${snapshot.rating}/5` : "—"} />
                <Mini label="Reviews" value={snapshot.reviewsCount?.toString() || "—"} />
                <Mini label="Media" value={snapshot.media.length.toString()} />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">{snapshot.platforms.map((item) => <span key={item.name} className="rounded-full border border-[#f1ded1] px-2 py-1 text-xs font-black text-[#5b4638]">{item.name} · {item.confidence}</span>)}</div>
              <div className="mt-3 flex flex-wrap gap-2">{snapshot.jsonLdTypes.map((item) => <span key={item} className="rounded-full bg-[#fffaf6] px-2 py-1 text-xs font-bold text-[#8a7668]">{item}</span>)}</div>
            </div>

            <div className="rounded-2xl border border-[#f1ded1] bg-white shadow-[0_10px_30px_-24px_rgba(53,37,28,0.45)] overflow-hidden">
              <div className="border-b border-[#f1ded1] p-4"><h2 className="font-black text-[#24170f]">Related product URLs found</h2></div>
              <div className="divide-y divide-[#f1ded1] max-h-[360px] overflow-y-auto">
                {snapshot.productUrls.length === 0 ? <div className="p-6 text-sm text-[#8a7668]">No platform product URL side-channel found.</div> : snapshot.productUrls.map((item, index) => (
                  <a key={`${item.url}-${index}`} href={item.url} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-3 p-4 hover:bg-[#fffaf6]">
                    <div className="min-w-0"><p className="truncate font-black text-[#24170f]">{item.title || item.url}</p><p className="truncate text-xs font-bold text-[#8a7668]">{item.source} · {money(item.price, item.currency || snapshot.currency || "USD")}</p></div>
                    <ExternalLink className="h-4 w-4 text-[#a99485]" />
                  </a>
                ))}
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-[#f1ded1] bg-[#fffaf6] p-3"><p className="text-[10px] uppercase tracking-[0.14em] font-black text-[#a99485]">{label}</p><p className="mt-1 truncate text-lg font-black text-[#24170f]">{value}</p></div>;
}
