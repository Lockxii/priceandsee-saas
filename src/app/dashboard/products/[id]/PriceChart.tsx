"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

type ChartDatum = Record<string, unknown>;

type PriceChartProps = {
  data: ChartDatum[];
  valueKey?: string;
  dateKey?: string;
  stroke?: string;
  valuePrefix?: string;
  valueSuffix?: string;
  heightClassName?: string;
  valueFormatter?: (value: number) => string;
};

function readNumber(item: ChartDatum, key: string) {
  const value = item[key];
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : 0;
}

function readDateLabel(item: ChartDatum, key: string) {
  const raw = item[key] ?? item.date ?? item.month ?? item.period ?? item.createdAt;
  if (!raw) return "—";

  const date = new Date(String(raw));
  if (Number.isNaN(date.getTime())) return String(raw);
  return date.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
}

export default function PriceChart({
  data,
  valueKey = "price",
  dateKey = "createdAt",
  stroke = "#4f46e5",
  valuePrefix = "$",
  valueSuffix = "",
  heightClassName = "h-72",
  valueFormatter,
}: PriceChartProps) {
  const chartData = data.map((item) => ({
    date: readDateLabel(item, dateKey),
    value: readNumber(item, valueKey),
  }));

  const formatValue = (value: number) => valueFormatter ? valueFormatter(value) : `${valuePrefix}${value}${valueSuffix}`;

  return (
    <div className={`${heightClassName} w-full`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1ded1" vertical={false} />
          <XAxis dataKey="date" stroke="#a99485" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="#a99485" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => formatValue(Number(value))} />
          <Tooltip
            formatter={(value) => formatValue(Number(value))}
            contentStyle={{ borderRadius: "12px", border: "1px solid #f1ded1", boxShadow: "0 4px 12px -6px rgb(53 37 28 / 0.25)" }}
            itemStyle={{ color: stroke, fontWeight: 700 }}
          />
          <Line type="monotone" dataKey="value" stroke={stroke} strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
