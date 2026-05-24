"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Cpu, Loader2, Search } from "lucide-react";

type Tech = { name: string; category: string; confidence: "high" | "medium" | "low"; evidence: string[] };
type TechReport = { finalUrl: string; technologies: Tech[]; platforms: Array<{ name: string; confidence: string }>; categories: Record<string, number>; sources: string[] };

const categories = ["all", "platform", "analytics", "ads", "reviews", "payments", "email", "support", "optimization", "other"] as const;

export default function TechDetectorPage() {
  const [url, setUrl] = useState("https://bleame.com");
  const [report, setReport] = useState<TechReport | null>(null);
  const [category, setCategory] = useState<(typeof categories)[number]>("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const techs = useMemo(() => {
    const items = report?.technologies || [];
    return category === "all" ? items : items.filter((item) => item.category === category);
  }, [report, category]);

  const run = async () => {
    setLoading(true);
    setError("");
    setReport(null);
    try {
      const res = await fetch("/api/tools/tech-detector", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Technology detection failed");
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Technology detection failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <Link href="/dashboard/tools" className="inline-flex items-center gap-2 text-sm font-black text-[#8a7668] hover:text-[#ff690c]"><ArrowLeft className="h-4 w-4" /> Tools</Link>
        <h1 className="text-3xl font-black text-[#24170f] tracking-tight flex items-center gap-3"><Cpu className="w-8 h-8 text-[#ff690c]" />Tech Detector</h1>
        <p className="text-[#6f5a4d] max-w-3xl">Detect commerce platform, analytics, ads pixels, review apps, payment widgets, email/SMS and support tools from real page scripts/HTML.</p>
      </div>

      <section className="rounded-2xl border border-[#f1ded1] bg-white p-5 shadow-[0_10px_30px_-24px_rgba(53,37,28,0.45)]">
        <div className="flex flex-col gap-3 md:flex-row"><input value={url} onChange={(event) => setUrl(event.target.value)} className="flex-1 rounded-2xl border border-[#f1ded1] bg-[#fffaf6] px-4 py-3 text-sm font-bold text-[#24170f] outline-none focus:border-[#ff690c]" /><button onClick={run} disabled={loading} className="rounded-xl bg-[#ff690c] px-5 py-3 text-sm font-black text-white inline-flex items-center justify-center gap-2 disabled:opacity-60">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}{loading ? "Detecting..." : "Detect tech"}</button></div>
        {error && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-600">{error}</p>}
      </section>

      {report && <div className="grid grid-cols-2 gap-3 md:grid-cols-5">{categories.filter((item) => item !== "all").map((item) => <button key={item} onClick={() => setCategory(item)} className={`rounded-2xl border p-4 text-left ${category === item ? "border-[#ff690c] bg-[#fff2e8]" : "border-[#f1ded1] bg-white"}`}><p className="text-[10px] uppercase tracking-[0.14em] font-black text-[#a99485]">{item}</p><p className="mt-2 text-2xl font-black text-[#24170f]">{report.categories[item] || 0}</p></button>)}</div>}

      <section className="rounded-2xl border border-[#f1ded1] bg-white shadow-[0_10px_30px_-24px_rgba(53,37,28,0.45)] overflow-hidden">
        <div className="border-b border-[#f1ded1] p-4 flex flex-wrap gap-2"><button onClick={() => setCategory("all")} className={`rounded-xl px-3 py-2 text-sm font-black ${category === "all" ? "bg-[#ff690c] text-white" : "bg-[#fffaf6] text-[#5b4638]"}`}>All</button>{report?.platforms.map((platform) => <span key={platform.name} className="rounded-xl border border-[#f1ded1] px-3 py-2 text-sm font-black text-[#5b4638]">{platform.name} · {platform.confidence}</span>)}</div>
        <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
          {!report ? <div className="col-span-full p-10 text-center text-[#8a7668]">Run detection to see real technologies.</div> : techs.length === 0 ? <div className="col-span-full p-10 text-center text-[#8a7668]">No technology found for this filter.</div> : techs.map((tech) => <div key={`${tech.name}-${tech.category}`} className="rounded-2xl border border-[#f1ded1] bg-[#fffaf6] p-4"><div className="flex items-start justify-between gap-3"><div><h2 className="font-black text-[#24170f]">{tech.name}</h2><p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-[#a99485]">{tech.category}</p></div><span className={`rounded-full px-2 py-1 text-xs font-black ${tech.confidence === "high" ? "bg-[#f2f8ec] text-[#4f761d]" : "bg-white text-[#8a7668]"}`}>{tech.confidence}</span></div><div className="mt-3 flex flex-wrap gap-2">{tech.evidence.map((item) => <span key={item} className="rounded-lg bg-white px-2 py-1 text-[11px] font-bold text-[#6f5a4d]">{item}</span>)}</div></div>)}
        </div>
      </section>
    </div>
  );
}
