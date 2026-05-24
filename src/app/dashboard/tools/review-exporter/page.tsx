"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Loader2, MessageSquareText, Search, Star } from "lucide-react";

type Review = { author?: string; rating?: number | null; title?: string; body?: string; date?: string; source: string };
type ReviewReport = { finalUrl: string; reviews: Review[]; averageRating?: number | null; platforms: Array<{ name: string; confidence: string }>; sources: string[] };

function csvEscape(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function exportCsv(reviews: Review[]) {
  const rows = [["rating", "author", "title", "body", "date", "source"], ...reviews.map((review) => [review.rating ?? "", review.author || "", review.title || "", review.body || "", review.date || "", review.source])];
  const blob = new Blob([rows.map((row) => row.map(csvEscape).join(",")).join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "reviews.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function ReviewExporterPage() {
  const [url, setUrl] = useState("https://bleame.com/products/crystal-hair-eraser");
  const [report, setReport] = useState<ReviewReport | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const reviews = useMemo(() => {
    const q = query.trim().toLowerCase();
    const items = report?.reviews || [];
    if (!q) return items;
    return items.filter((review) => [review.author, review.title, review.body, review.source].some((value) => value?.toLowerCase().includes(q)));
  }, [report, query]);

  const run = async () => {
    setLoading(true);
    setError("");
    setReport(null);
    try {
      const res = await fetch("/api/tools/review-exporter", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Review extraction failed");
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Review extraction failed");
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
            <h1 className="text-3xl font-black text-[#24170f] tracking-tight flex items-center gap-3"><MessageSquareText className="w-8 h-8 text-[#ff690c]" />Review Exporter</h1>
            <p className="mt-2 text-[#6f5a4d] max-w-3xl">Extract visible/structured reviews from JSON-LD and review/testimonial HTML blocks. Export real rows to CSV.</p>
          </div>
          {reviews.length > 0 && <button onClick={() => exportCsv(reviews)} className="inline-flex items-center gap-2 rounded-xl bg-[#24170f] px-4 py-2 text-sm font-black text-[#fffaf6]"><Download className="h-4 w-4" />Export CSV</button>}
        </div>
      </div>

      <section className="rounded-2xl border border-[#f1ded1] bg-white p-5 shadow-[0_10px_30px_-24px_rgba(53,37,28,0.45)] flex-shrink-0">
        <div className="flex flex-col gap-3 md:flex-row"><input value={url} onChange={(event) => setUrl(event.target.value)} className="flex-1 rounded-2xl border border-[#f1ded1] bg-[#fffaf6] px-4 py-3 text-sm font-bold text-[#24170f] outline-none focus:border-[#ff690c]" /><button onClick={run} disabled={loading} className="rounded-xl bg-[#ff690c] px-5 py-3 text-sm font-black text-white inline-flex items-center justify-center gap-2 disabled:opacity-60">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}{loading ? "Extracting..." : "Extract reviews"}</button></div>
        {error && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-600">{error}</p>}
        {report && <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4"><Mini label="Reviews" value={report.reviews.length.toString()} /><Mini label="Average" value={report.averageRating ? report.averageRating.toFixed(2) : "—"} /><Mini label="Sources" value={report.sources.length.toString()} /><Mini label="Platforms" value={report.platforms.length.toString()} /></div>}
      </section>

      <section className="bg-white rounded-2xl border border-[#f1ded1] shadow-[0_10px_30px_-24px_rgba(53,37,28,0.45)] flex flex-col min-h-0 overflow-hidden">
        <div className="p-4 border-b border-[#f1ded1] flex-shrink-0"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search reviews..." className="w-full rounded-xl border border-[#f1ded1] bg-[#fffaf6] px-4 py-2 text-sm font-bold outline-none focus:border-[#ff690c]" /></div>
        <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-[#f1ded1]">
          {!report ? <div className="p-10 text-center text-[#8a7668]">Run extraction to list reviews.</div> : reviews.length === 0 ? <div className="p-10 text-center text-[#8a7668]">No reviews found on this page.</div> : reviews.map((review, index) => <div key={`${review.body}-${index}`} className="p-5"><div className="flex flex-wrap items-center gap-2">{review.rating && <span className="inline-flex items-center gap-1 rounded-full bg-[#fff2e8] px-2 py-1 text-xs font-black text-[#c84f00]"><Star className="h-3 w-3 fill-current" />{review.rating}</span>}<span className="text-xs font-bold text-[#8a7668]">{review.source}</span>{review.date && <span className="text-xs font-bold text-[#8a7668]">{review.date}</span>}</div><p className="mt-2 font-black text-[#24170f]">{review.title || review.author || "Review"}</p><p className="mt-1 text-sm font-medium text-[#6f5a4d]">{review.body}</p>{review.author && <p className="mt-2 text-xs font-bold text-[#8a7668]">— {review.author}</p>}</div>)}
        </div>
      </section>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-[#f1ded1] bg-[#fffaf6] p-3"><p className="text-[10px] uppercase tracking-[0.14em] font-black text-[#a99485]">{label}</p><p className="mt-1 truncate text-lg font-black text-[#24170f]">{value}</p></div>;
}
