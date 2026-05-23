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

function ChartTooltip({ active, payload, label, currency, focusedKey }: { active?: boolean; payload?: Array<{ dataKey?: string | number; name?: string; value?: number; color?: string }>; label?: string; currency: string; focusedKey?: string | null }) {
  if (!active || !payload?.length) return null;
  const rows = payload
    .filter((item) => !focusedKey || item.dataKey === focusedKey)
    .sort((a, b) => Number(b.value || 0) - Number(a.value || 0));

  return (
    <div className="rounded-xl border border-[#f1ded1] bg-white/95 px-3 py-2 text-sm shadow-lg backdrop-blur">
      <p className="mb-1 text-xs font-black uppercase tracking-wider text-[#8a7668]">{label}</p>
      <div className="space-y-1.5">
        {rows.map((item) => (
          <div key={String(item.dataKey)} className="flex items-center justify-between gap-5">
            <span className="flex items-center gap-2 font-bold text-[#5b4638]"><span className="h-2 w-2 rounded-full" style={{ background: item.color }} />{item.name}</span>
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
      const row: Record<string, string | number> = { month };
      series.forEach((item) => {
        const point = item.data.find((entry) => entry.month === month);
        row[item.key] = point?.revenue ?? 0;
      });
      return row;
    });
  }, [series]);

  const focused = focusedKey ? series.find((item) => item.key === focusedKey) : undefined;
  const totalRevenue = series.reduce((sum, item) => sum + item.revenue, 0);

  return (
    <div className={`flex h-full flex-col rounded-2xl border border-[#f1ded1] bg-white p-5 shadow-sm ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 flex-shrink-0">
        <div>
          <h3 className="text-sm font-bold text-[#24170f] uppercase tracking-wider">Competitor revenue trends</h3>
          <p className="mt-1 text-sm text-[#8a7668]">{focused ? `Focused on ${focused.name}` : `${series.length} competitors on the same revenue chart`}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-black uppercase tracking-wider text-[#a99485]">Combined</p>
          <p className="text-lg font-black text-[#24170f]">{formatMoney(totalRevenue, currency)}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 flex-shrink-0">
        {series.map((item, index) => {
          const color = COLORS[index % COLORS.length];
          const active = !focusedKey || focusedKey === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setFocusedKey(focusedKey === item.key ? null : item.key)}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black transition-all ${active ? "border-[#ff690c] bg-[#fffaf6] text-[#24170f]" : "border-[#f1ded1] bg-white text-[#a99485] opacity-60"}`}
              title="Click to focus / unfocus"
            >
              <span className="h-2 w-2 rounded-full" style={{ background: color }} />
              <span className="max-w-[130px] truncate">{item.name}</span>
              <span className="text-[#ff690c]">{formatMoney(item.revenue, currency)}</span>
            </button>
          );
        })}
        {focusedKey && (
          <button type="button" onClick={() => setFocusedKey(null)} className="rounded-full border border-[#f1ded1] bg-white px-3 py-1.5 text-xs font-bold text-[#8a7668] hover:text-[#ff690c]">
            Show all
          </button>
        )}
      </div>

      <div className="mt-4 min-h-[260px] flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 12, right: 18, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="#efe6de" vertical={false} />
            <XAxis dataKey="month" axisLine={false} tickLine={false} tickMargin={12} stroke="#a99485" fontSize={12} />
            <YAxis axisLine={false} tickLine={false} width={64} stroke="#a99485" fontSize={12} tickFormatter={(value) => formatMoney(Number(value), currency)} />
            <Tooltip content={<ChartTooltip currency={currency} focusedKey={focusedKey} />} cursor={{ stroke: "#ff690c", strokeOpacity: 0.16 }} />
            {series.map((item, index) => {
              const color = COLORS[index % COLORS.length];
              const dimmed = Boolean(focusedKey && focusedKey !== item.key);
              return (
                <Line
                  key={item.key}
                  type="monotone"
                  dataKey={item.key}
                  name={item.name}
                  stroke={color}
                  strokeWidth={focusedKey === item.key ? 3.5 : 2.25}
                  strokeOpacity={dimmed ? 0.16 : 1}
                  dot={{ r: focusedKey === item.key ? 4 : 3, fill: "#fffaf6", stroke: color, strokeWidth: 2, opacity: dimmed ? 0.15 : 1 }}
                  activeDot={{ r: 6, fill: color, stroke: "#fff", strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#f1ded1] pt-3 text-xs text-[#8a7668] flex-shrink-0">
        <span>Revenue history from BrandSearch / scraper data.</span>
        <span className="font-bold text-[#24170f]">Click a competitor to focus</span>
      </div>
    </div>
  );
}
