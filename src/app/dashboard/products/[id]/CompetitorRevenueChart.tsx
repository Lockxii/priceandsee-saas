"use client";

import { useMemo, useState } from "react";
import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type CompetitorRevenueSeries = {
  key: string;
  name: string;
  domain: string;
  revenue: number;
  data: Array<{ month: string; revenue: number }>;
};

type CompetitorRevenueChartProps = {
  series: CompetitorRevenueSeries[];
  currency?: string;
  className?: string;
};

const COLORS = ["#ff690c", "#24170f", "#e8a048", "#8a5cf6", "#0f9f6e", "#2f80ed"];

function formatMoney(value?: number | null, currency = "USD") {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  try {
    return Intl.NumberFormat(undefined, { style: "currency", currency, notation: Math.abs(value) >= 100000 ? "compact" : "standard", maximumFractionDigits: 0 }).format(value);
  } catch {
    return `${Math.round(value).toLocaleString()} ${currency}`;
  }
}

function compactName(value: string) {
  return value.replace(/^https?:\/\//, "").replace(/^www\./, "");
}

function ChartTooltip({ active, payload, label, currency, focusedKey }: { active?: boolean; payload?: Array<{ dataKey?: string | number; name?: string; value?: number; color?: string }>; label?: string; currency: string; focusedKey?: string | null }) {
  if (!active || !payload?.length) return null;
  const rows = payload
    .filter((item) => Number.isFinite(Number(item.value)))
    .filter((item) => !focusedKey || item.dataKey === focusedKey)
    .sort((a, b) => Number(b.value ?? Number.NEGATIVE_INFINITY) - Number(a.value ?? Number.NEGATIVE_INFINITY));

  if (!rows.length) return null;

  return (
    <div className="rounded-2xl border border-[#f1ded1] bg-white/95 px-3.5 py-3 text-sm shadow-[0_18px_45px_rgba(36,23,15,0.12)] backdrop-blur">
      <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#a99485]">{label}</p>
      <div className="space-y-2">
        {rows.map((item) => (
          <div key={String(item.dataKey)} className="flex items-center justify-between gap-6">
            <span className="flex min-w-0 items-center gap-2 font-bold text-[#5b4638]">
              <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: item.color }} />
              <span className="max-w-[150px] truncate">{item.name}</span>
            </span>
            <span className="font-black text-[#24170f]">{formatMoney(Number(item.value), currency)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CompetitorRevenueChart({ series, currency = "USD", className = "" }: CompetitorRevenueChartProps) {
  const [focusedKey, setFocusedKey] = useState<string | null>(null);

  const chartData = useMemo(() => {
    const months = Array.from(new Set(series.flatMap((item) => item.data.map((point) => point.month))));
    return months.map((month) => {
      const row: Record<string, string | number | undefined> = { month };
      series.forEach((item) => {
        const point = item.data.find((entry) => entry.month === month);
        row[item.key] = point?.revenue;
      });
      return row;
    });
  }, [series]);

  const values = useMemo(() => series.flatMap((item) => item.data.map((point) => point.revenue)).filter((value) => Number.isFinite(value)), [series]);
  const yDomain = useMemo<[number, number]>(() => {
    if (!values.length) return [0, 1];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const spread = Math.max(1, max - min);
    const padding = Math.max(spread * 0.22, max * 0.025, 1);
    return [Math.max(0, Math.floor(min - padding)), Math.ceil(max + padding)];
  }, [values]);
  const yTicks = useMemo(() => {
    const [low, high] = yDomain;
    const step = (high - low) / 3;
    return [low, low + step, low + step * 2, high].map((value) => Math.round(value));
  }, [yDomain]);

  const focused = focusedKey ? series.find((item) => item.key === focusedKey) : undefined;
  const leader = series.reduce<CompetitorRevenueSeries | undefined>((best, item) => !best || item.revenue > best.revenue ? item : best, undefined);
  const latestRange = values.length ? `${formatMoney(yDomain[0], currency)}–${formatMoney(yDomain[1], currency)}` : "—";

  return (
    <div className={`flex h-full flex-col rounded-2xl border border-[#f1ded1] bg-white p-5 shadow-sm ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-4 flex-shrink-0">
        <div className="min-w-0">
          <h3 className="text-sm font-black text-[#24170f] uppercase tracking-[0.12em]">Competitor revenue trends</h3>
          <p className="mt-1 text-sm text-[#8a7668]">{focused ? `Focused on ${focused.name}` : `${series.length} real revenue histories`}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-right">
          <div className="rounded-xl border border-[#f1ded1] bg-[#fffaf6] px-3 py-2">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#a99485]">Leader</p>
            <p className="mt-0.5 max-w-[130px] truncate text-sm font-black text-[#24170f]">{leader ? compactName(leader.name) : "—"}</p>
          </div>
          <div className="rounded-xl border border-[#f1ded1] bg-[#fffaf6] px-3 py-2">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#a99485]">Range</p>
            <p className="mt-0.5 text-sm font-black text-[#24170f]">{latestRange}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3 flex-shrink-0">
        {series.map((item, index) => {
          const color = COLORS[index % COLORS.length];
          const active = !focusedKey || focusedKey === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setFocusedKey(focusedKey === item.key ? null : item.key)}
              className={`group flex min-w-0 items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left transition-all ${active ? "border-[#f1ded1] bg-[#fffaf6] text-[#24170f] shadow-[0_1px_0_rgba(36,23,15,0.03)]" : "border-[#f1ded1] bg-white text-[#a99485] opacity-45"}`}
              title="Click to focus / unfocus"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full ring-2 ring-white" style={{ background: color }} />
                <span className="min-w-0">
                  <span className="block truncate text-xs font-black">{compactName(item.name)}</span>
                  <span className="block truncate text-[11px] font-semibold text-[#a99485]">{compactName(item.domain)}</span>
                </span>
              </span>
              <span className="flex-shrink-0 rounded-lg bg-white px-2 py-1 text-xs font-black" style={{ color }}>{formatMoney(item.revenue, currency)}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 min-h-[300px] flex-1 rounded-2xl border border-[#f1ded1] bg-[#fffaf6]/60 p-3">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 18, right: 22, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="#eaded5" strokeDasharray="3 8" vertical={false} />
            <XAxis dataKey="month" axisLine={false} tickLine={false} tickMargin={12} stroke="#a99485" fontSize={12} />
            <YAxis axisLine={false} tickLine={false} width={64} stroke="#a99485" fontSize={12} domain={yDomain} ticks={yTicks} tickFormatter={(value) => formatMoney(Number(value), currency)} />
            <Tooltip content={<ChartTooltip currency={currency} focusedKey={focusedKey} />} cursor={{ stroke: "#ff690c", strokeOpacity: 0.16, strokeDasharray: "4 4" }} />
            {series.map((item, index) => {
              const color = COLORS[index % COLORS.length];
              const dimmed = Boolean(focusedKey && focusedKey !== item.key);
              const focusedLine = focusedKey === item.key;
              return (
                <Line
                  key={item.key}
                  type="monotone"
                  dataKey={item.key}
                  name={compactName(item.name)}
                  stroke={color}
                  strokeWidth={focusedLine ? 3.25 : 2.5}
                  strokeOpacity={dimmed ? 0.14 : 1}
                  dot={{ r: focusedLine ? 4 : 3, fill: "#fffaf6", stroke: color, strokeWidth: 2, opacity: dimmed ? 0.16 : 1 }}
                  activeDot={{ r: 6, fill: color, stroke: "#fff", strokeWidth: 2 }}
                  connectNulls={false}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  isAnimationActive={false}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#f1ded1] pt-3 text-xs text-[#8a7668] flex-shrink-0">
        <span>BrandSearch revenue history only.</span>
        <button type="button" onClick={() => setFocusedKey(null)} className="font-black text-[#24170f] hover:text-[#ff690c]">
          {focusedKey ? "Show all competitors" : "Click a competitor to focus"}
        </button>
      </div>
    </div>
  );
}
