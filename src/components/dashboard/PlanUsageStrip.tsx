"use client";

import Link from "next/link";
import { effectiveUserLimits } from "@/lib/plans";

type PlanUsageStripProps = {
  plan?: string | null;
  productsCount: number;
  monthlyChecksUsed?: number | null;
  maxUrls?: number | null;
  monthlyCheckLimit?: number | null;
  compact?: boolean;
};

export function PlanUsageStrip({
  plan,
  productsCount,
  monthlyChecksUsed = 0,
  maxUrls,
  monthlyCheckLimit,
  compact = false,
}: PlanUsageStripProps) {
  const limits = effectiveUserLimits({
    plan,
    maxUrls,
    monthlyCheckLimit,
  });
  const checksUsed = monthlyChecksUsed ?? 0;
  const checksLeft = Math.max(0, limits.monthlyCheckLimit - checksUsed);
  const urlsLeft = Math.max(0, limits.maxUrls - productsCount);
  const isFree = !plan || plan === "FREE";
  const urlPct = limits.maxUrls ? Math.min(100, Math.round((productsCount / limits.maxUrls) * 100)) : 0;
  const checkPct = limits.monthlyCheckLimit ? Math.min(100, Math.round((checksUsed / limits.monthlyCheckLimit) * 100)) : 0;

  return (
    <div
      className={`rounded-2xl border border-[var(--dash-border)] bg-white ${compact ? "p-4" : "p-5"} shadow-[var(--dash-shadow)]`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--dash-muted)]">
            Plan {plan || "FREE"}
          </p>
          <p className="mt-1 text-sm font-semibold text-[var(--dash-ink)]">
            {urlsLeft > 0
              ? `${urlsLeft} URL${urlsLeft > 1 ? "s" : ""} restante${urlsLeft > 1 ? "s" : ""} · ${checksLeft} checks ce mois`
              : "Quota URLs atteint · pense à upgrader"}
          </p>
        </div>
        {isFree ? (
          <Link
            href="/tarifs"
            className="inline-flex shrink-0 items-center justify-center rounded-xl bg-[var(--dash-accent)] px-4 py-2 text-sm font-bold text-white hover:bg-[#e55e0b] transition-colors"
          >
            Passer au plan supérieur
          </Link>
        ) : null}
      </div>

      <div className={`mt-4 grid gap-3 ${compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>
        <UsageMeter label="URLs suivies" value={productsCount} max={limits.maxUrls} percent={urlPct} />
        <UsageMeter label="Checks mensuels" value={checksUsed} max={limits.monthlyCheckLimit} percent={checkPct} />
      </div>
    </div>
  );
}

function UsageMeter({
  label,
  value,
  max,
  percent,
}: {
  label: string;
  value: number;
  max: number;
  percent: number;
}) {
  const tone = percent >= 90 ? "bg-red-500" : percent >= 70 ? "bg-[#ff690c]" : "bg-[#5d8b22]";

  return (
    <div>
      <div className="flex items-center justify-between text-xs font-semibold text-[var(--dash-muted)]">
        <span>{label}</span>
        <span className="tabular-nums text-[var(--dash-ink)]">
          {value}/{max}
        </span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-[var(--dash-bg)] overflow-hidden">
        <div className={`h-full rounded-full transition-all ${tone}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
