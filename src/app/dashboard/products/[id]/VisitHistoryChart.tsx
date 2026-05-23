"use client";

import { useId, useMemo } from "react";
import { TrendingUp } from "lucide-react";
import { Area, AreaChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type TrafficCountry = {
  label: string;
  share: number;
  code?: string;
  flag?: string;
};

type VisitPoint = {
  month: string;
  visits: number;
  [key: string]: unknown;
};

type VisitHistoryChartProps = {
  data: VisitPoint[];
  totalVisits?: number;
  countries?: TrafficCountry[];
  className?: string;
};

function formatCompact(value?: number | null) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function formatPercent(value?: number | null) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return `${Math.abs(Math.round(value))}%`;
}

function growthFor(data: VisitPoint[], pointsBack: number) {
  if (data.length < 2) return undefined;
  const current = data[data.length - 1]?.visits;
  const previousIndex = Math.max(0, data.length - 1 - pointsBack);
  const previous = data[previousIndex]?.visits;
  if (!current || !previous) return undefined;
  return ((current - previous) / previous) * 100;
}

function GrowthPill({ label, value }: { label: string; value?: number }) {
  const positive = (value ?? 0) >= 0;
  return (
    <div className="inline-flex items-center gap-1 rounded-md border border-[#f1ded1] bg-[#fffaf6] px-2 py-1 text-xs font-semibold text-[#8a7668] shadow-[0_1px_0_rgba(36,23,15,0.03)]">
      <span>{label}</span>
      {value !== undefined && (
        <span className={positive ? "text-emerald-600" : "text-red-500"}>
          {positive ? "▲" : "▼"} {formatPercent(value)}
        </span>
      )}
    </div>
  );
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value?: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-[#f1ded1] bg-white/95 px-3 py-2 text-sm shadow-lg backdrop-blur">
      <p className="text-xs font-semibold text-[#8a7668]">{label}</p>
      <p className="font-black text-[#24170f]">{formatCompact(Number(payload[0].value))} visits</p>
    </div>
  );
}

export default function VisitHistoryChart({ data, totalVisits, countries = [], className = "" }: VisitHistoryChartProps) {
  const gradientId = useId().replace(/:/g, "");
  const currentVisits = totalVisits || data[data.length - 1]?.visits;
  const currentMonth = data[data.length - 1]?.month || "—";

  const labelIndexes = useMemo(() => {
    const indexes = new Set<number>();
    if (!data.length) return indexes;

    let minIndex = 0;
    let maxIndex = 0;
    data.forEach((item, index) => {
      if (item.visits < data[minIndex].visits) minIndex = index;
      if (item.visits > data[maxIndex].visits) maxIndex = index;
    });

    indexes.add(data.length - 1);
    indexes.add(maxIndex);
    indexes.add(minIndex);

    if (data.length <= 7) {
      data.forEach((_, index) => indexes.add(index));
    } else {
      indexes.add(0);
      indexes.add(Math.floor(data.length / 2));
    }

    return indexes;
  }, [data]);

  const chartData = useMemo(() => data.map((item, index) => ({
    ...item,
    visitLabel: labelIndexes.has(index) ? formatCompact(item.visits) : "",
  })), [data, labelIndexes]);

  return (
    <div className={`flex flex-col rounded-2xl border border-[#f1ded1] bg-white p-4 shadow-sm sm:p-5 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-baseline gap-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[#24170f]" />
              <span className="text-lg font-black tracking-tight text-[#24170f]">{formatCompact(currentVisits)}</span>
            </div>
            <span className="text-sm font-medium text-[#6f7b8a]">monthly visits · {currentMonth}</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <GrowthPill label="1M" value={growthFor(data, 1)} />
            <GrowthPill label="3M" value={growthFor(data, 3)} />
            <GrowthPill label="6M" value={growthFor(data, 6)} />
          </div>
        </div>
        <span className="rounded-full border border-[#f1ded1] bg-[#fffaf6] px-3 py-1 text-xs font-semibold text-[#8a7668]">
          BrandSearch
        </span>
      </div>

      <div className="mt-3 min-h-[240px] flex-1 overflow-visible">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 38, right: 32, bottom: 0, left: 8 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#ff690c" stopOpacity={0.2} />
                <stop offset="75%" stopColor="#ff690c" stopOpacity={0.03} />
                <stop offset="100%" stopColor="#ff690c" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#efe6de" strokeDasharray="0" />
            <XAxis dataKey="month" axisLine={false} tickLine={false} tickMargin={12} stroke="#8f9aaa" fontSize={12} />
            <YAxis axisLine={false} tickLine={false} width={42} stroke="#8f9aaa" fontSize={12} tickFormatter={(value) => formatCompact(Number(value))} />
            <Tooltip cursor={{ stroke: "#ff690c", strokeOpacity: 0.16 }} content={<ChartTooltip />} />
            <Area
              type="monotone"
              dataKey="visits"
              stroke="#ff690c"
              strokeWidth={2.25}
              fill={`url(#${gradientId})`}
              dot={{ r: 2.5, fill: "#ff690c", stroke: "#fffaf6", strokeWidth: 1.5 }}
              activeDot={{ r: 5, fill: "#ff690c", stroke: "#ffffff", strokeWidth: 2 }}
              isAnimationActive={false}
            >
              <LabelList dataKey="visitLabel" position="top" offset={12} className="fill-[#24170f] text-[12px] font-black" />
            </Area>
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-7 gap-y-2 border-t border-[#f1ded1] pt-3">
        {countries.length > 0 ? (
          countries.slice(0, 4).map((country) => (
            <div key={`${country.label}-${country.share}`} className="flex items-center gap-2 text-sm font-semibold text-[#24170f]">
              <span className="text-base leading-none">{country.flag || "🌐"}</span>
              <span>{Number(country.share).toFixed(country.share % 1 ? 1 : 0)}%</span>
            </div>
          ))
        ) : (
          <span className="text-xs font-medium text-[#8a7668]">
            Traffic history pulled from BrandSearch.
          </span>
        )}
      </div>
    </div>
  );
}
