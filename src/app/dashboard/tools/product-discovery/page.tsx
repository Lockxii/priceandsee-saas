"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Boxes, Download, ExternalLink, Loader2, Search } from "lucide-react";

type ProductItem = { url: string; title?: string; image?: string; price?: number | null; currency?: string | null; source: string };
type Discovery = { url: string; finalUrl: string; products: ProductItem[]; platforms: Array<{ name: string; confidence: string }>; sources: string[] };

function csvEscape(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function downloadCsv(products: ProductItem[]) {
  const rows = [["title", "url", "price", "currency", "image", "source"], ...products.map((item) => [item.title || "", item.url, item.price ?? "", item.currency || "", item.image || "", item.source])];
  const blob = new Blob([rows.map((row) => row.map(csvEscape).join(",")).join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "product-discovery.csv";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function money(value?: number | null, currency = "USD") {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: value % 1 ? 2 : 0 }).format(value);
}

export default function ProductDiscoveryPage() {
  const [url, setUrl] = useState("https://bleame.com");
  const [query, setQuery] = useState("");
  const [discovery, setDiscovery] = useState<Discovery | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const products = useMemo(() => {
    const q = query.trim().toLowerCase();
    const items = discovery?.products || [];
    if (!q) return items;
    return items.filter((item) => [item.title, item.url, item.source].some((value) => value?.toLowerCase().includes(q)));
  }, [discovery, query]);

  const run = async () => {
    setLoading(true);
    setError("");
    setDiscovery(null);
    try {
      const res = await fetch("/api/tools/product-discovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Discovery failed");
      setDiscovery(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Discovery failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full overflow-hidden flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link href="/dashboard/tools" className="inline-flex items-center gap-2 text-sm font-black text-[#8a7668] hover:text-[#ff690c]"><ArrowLeft className="h-4 w-4" /> Tools</Link>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-black text-[#24170f] tracking-tight flex items-center gap-3"><Boxes className="w-8 h-8 text-[#ff690c]" />Product URL Discovery</h1>
            <p className="mt-2 text-[#6f5a4d] max-w-3xl">Find product URLs from generic commerce signals: Shopify products JSON, WooCommerce Store API, product-like links and sitemaps.</p>
          </div>
          {products.length > 0 && <button onClick={() => downloadCsv(products)} className="inline-flex items-center gap-2 rounded-xl bg-[#24170f] px-4 py-2 text-sm font-black text-[#fffaf6] hover:bg-[#3a281d]"><Download className="h-4 w-4" />Export CSV</button>}
        </div>
      </div>

      <section className="rounded-2xl border border-[#f1ded1] bg-white p-5 shadow-[0_10px_30px_-24px_rgba(53,37,28,0.45)] flex-shrink-0">
        <div className="flex flex-col gap-3 md:flex-row">
          <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://store.com" className="flex-1 rounded-2xl border border-[#f1ded1] bg-[#fffaf6] px-4 py-3 text-sm font-bold text-[#24170f] outline-none focus:border-[#ff690c]" />
          <button onClick={run} disabled={loading} className="rounded-xl bg-[#ff690c] px-5 py-3 text-sm font-black text-white shadow-[0_8px_18px_rgba(255,105,12,0.22)] hover:bg-[#e85f0a] disabled:opacity-60 inline-flex items-center justify-center gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}{loading ? "Discovering..." : "Discover products"}
          </button>
        </div>
        {error && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-600">{error}</p>}
        {discovery && <div className="mt-3 flex flex-wrap gap-2 text-xs font-black"><span className="rounded-full bg-[#fffaf6] border border-[#f1ded1] px-2 py-1 text-[#5b4638]">{discovery.products.length} URLs</span>{discovery.sources.map((source) => <span key={source} className="rounded-full bg-[#fff2e8] px-2 py-1 text-[#c84f00]">{source}</span>)}{discovery.platforms.map((platform) => <span key={platform.name} className="rounded-full border border-[#f1ded1] px-2 py-1 text-[#5b4638]">{platform.name}</span>)}</div>}
      </section>

      <section className="bg-white rounded-2xl border border-[#f1ded1] shadow-[0_10px_30px_-24px_rgba(53,37,28,0.45)] flex flex-col min-h-0 overflow-hidden">
        <div className="p-4 border-b border-[#f1ded1] flex-shrink-0">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search found products..." className="w-full rounded-xl border border-[#f1ded1] bg-[#fffaf6] px-4 py-2 text-sm font-bold outline-none focus:border-[#ff690c]" />
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto">
          {!discovery ? <div className="h-full flex items-center justify-center p-10 text-center text-[#8a7668]">Run discovery to list real product URLs.</div> : products.length === 0 ? <div className="h-full flex items-center justify-center p-10 text-center text-[#8a7668]">No products match.</div> : (
            <div className="divide-y divide-[#f1ded1] min-w-[760px]">
              {products.map((item, index) => (
                <a key={`${item.url}-${index}`} href={item.url} target="_blank" rel="noreferrer" className="grid grid-cols-[minmax(0,1.5fr)_130px_160px_40px] gap-4 p-4 hover:bg-[#fffaf6] transition-colors">
                  <div className="min-w-0 flex items-center gap-3">
                    {item.image ? <img src={`/api/assets/download?inline=1&url=${encodeURIComponent(item.image)}`} alt="" className="h-12 w-12 rounded-xl border border-[#f1ded1] object-cover bg-[#fffaf6]" /> : <div className="h-12 w-12 rounded-xl border border-[#f1ded1] bg-[#fffaf6]" />}
                    <div className="min-w-0"><p className="truncate font-black text-[#24170f]">{item.title || item.url}</p><p className="truncate text-xs font-bold text-[#8a7668]">{item.url}</p></div>
                  </div>
                  <div className="self-center font-black text-[#24170f]">{money(item.price, item.currency || "USD")}</div>
                  <div className="self-center text-xs font-black text-[#8a7668]">{item.source}</div>
                  <ExternalLink className="self-center h-4 w-4 text-[#a99485]" />
                </a>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
