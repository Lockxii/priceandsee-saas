"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BadgePercent, Copy, Download, Loader2, Search } from "lucide-react";

type Promo = { text: string; source: string; category: "discount" | "shipping" | "urgency" | "bundle" | "code" | "generic" };
type PromoReport = { finalUrl: string; promos: Promo[]; counts: Record<string, number>; platforms: Array<{ name: string; confidence: string }>; sources: string[] };

const categories = ["all", "discount", "shipping", "urgency", "bundle", "code", "generic"] as const;

function csvEscape(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function exportCsv(promos: Promo[]) {
  const rows = [["category", "text", "source"], ...promos.map((promo) => [promo.category, promo.text, promo.source])];
  const blob = new Blob([rows.map((row) => row.map(csvEscape).join(",")).join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "promo-signals.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function PromoDetectorPage() {
  const [url, setUrl] = useState("https://bleame.com");
  const [report, setReport] = useState<PromoReport | null>(null);
  const [category, setCategory] = useState<(typeof categories)[number]>("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const promos = useMemo(() => {
    const items = report?.promos || [];
    return category === "all" ? items : items.filter((item) => item.category === category);
  }, [report, category]);

  const run = async () => {
    setLoading(true);
    setError("");
    setReport(null);
    try {
      const res = await fetch("/api/tools/promo-detector", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Promo detection failed");
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Promo detection failed");
    } finally {
      setLoading(false);
    }
  };

  const copyText = async () => {
    await navigator.clipboard.writeText(promos.map((promo) => `[${promo.category}] ${promo.text}`).join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <Link href="/dashboard/tools" className="inline-flex items-center gap-2 text-sm font-black text-[#8a7668] hover:text-[#ff690c]"><ArrowLeft className="h-4 w-4" /> Tools</Link>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-black text-[#24170f] tracking-tight flex items-center gap-3"><BadgePercent className="w-8 h-8 text-[#ff690c]" />Promo Detector</h1>
            <p className="mt-2 text-[#6f5a4d] max-w-3xl">Find real discount, shipping, urgency, bundle and code messages from page HTML/meta/JSON-LD.</p>
          </div>
          {promos.length > 0 && <div className="flex gap-2"><button onClick={copyText} className="inline-flex items-center gap-2 rounded-xl border border-[#f1ded1] bg-white px-4 py-2 text-sm font-black text-[#5b4638]"><Copy className="h-4 w-4" />{copied ? "Copied" : "Copy"}</button><button onClick={() => exportCsv(promos)} className="inline-flex items-center gap-2 rounded-xl bg-[#24170f] px-4 py-2 text-sm font-black text-[#fffaf6]"><Download className="h-4 w-4" />CSV</button></div>}
        </div>
      </div>

      <section className="rounded-2xl border border-[#f1ded1] bg-white p-5 shadow-[0_10px_30px_-24px_rgba(53,37,28,0.45)]">
        <div className="flex flex-col gap-3 md:flex-row"><input value={url} onChange={(event) => setUrl(event.target.value)} className="flex-1 rounded-2xl border border-[#f1ded1] bg-[#fffaf6] px-4 py-3 text-sm font-bold text-[#24170f] outline-none focus:border-[#ff690c]" /><button onClick={run} disabled={loading} className="rounded-xl bg-[#ff690c] px-5 py-3 text-sm font-black text-white inline-flex items-center justify-center gap-2 disabled:opacity-60">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}{loading ? "Scanning..." : "Scan promos"}</button></div>
        {error && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-600">{error}</p>}
      </section>

      {report && <div className="grid grid-cols-2 gap-3 md:grid-cols-6">{categories.filter((item) => item !== "all").map((item) => <button key={item} onClick={() => setCategory(item)} className={`rounded-2xl border p-4 text-left ${category === item ? "border-[#ff690c] bg-[#fff2e8]" : "border-[#f1ded1] bg-white"}`}><p className="text-[10px] uppercase tracking-[0.14em] font-black text-[#a99485]">{item}</p><p className="mt-2 text-2xl font-black text-[#24170f]">{report.counts[item] || 0}</p></button>)}</div>}

      <section className="rounded-2xl border border-[#f1ded1] bg-white shadow-[0_10px_30px_-24px_rgba(53,37,28,0.45)] overflow-hidden">
        <div className="border-b border-[#f1ded1] p-4 flex flex-wrap gap-2"><button onClick={() => setCategory("all")} className={`rounded-xl px-3 py-2 text-sm font-black ${category === "all" ? "bg-[#ff690c] text-white" : "bg-[#fffaf6] text-[#5b4638]"}`}>All</button>{report?.platforms.map((platform) => <span key={platform.name} className="rounded-xl border border-[#f1ded1] px-3 py-2 text-sm font-black text-[#5b4638]">{platform.name}</span>)}</div>
        <div className="divide-y divide-[#f1ded1]">
          {!report ? <div className="p-10 text-center text-[#8a7668]">Run scan to extract real promo messages.</div> : promos.length === 0 ? <div className="p-10 text-center text-[#8a7668]">No promo signals for this filter.</div> : promos.map((promo, index) => <div key={`${promo.text}-${index}`} className="p-4"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#fff2e8] px-2 py-1 text-xs font-black text-[#c84f00]">{promo.category}</span><span className="text-xs font-bold text-[#8a7668]">{promo.source}</span></div><p className="mt-2 font-black text-[#24170f]">{promo.text}</p></div>)}
        </div>
      </section>
    </div>
  );
}
