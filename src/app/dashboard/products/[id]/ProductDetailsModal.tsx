"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Package, Tag, Hash, Star, AlignLeft, BarChart3, Code2, Layers3, Globe2, Users, DollarSign, Activity as ActivityIcon, CheckCircle2, Copy, Check, Download, Images, MessageSquareText, FileDown } from "lucide-react";
import VisitHistoryChart, { type TrafficCountry } from "./VisitHistoryChart";
import CompetitorRevenueChart, { type CompetitorRevenueSeries } from "./CompetitorRevenueChart";

type JsonRecord = Record<string, unknown>;

type BrandMetricPoint = {
  createdAt?: string | number | Date;
  date?: string;
  month?: string;
  period?: string;
  price?: number;
  visits?: number;
  monthly_visits?: number;
  value?: number;
  [key: string]: unknown;
};

type BrandMetrics = JsonRecord & {
  niche?: string;
  target_persona?: string;
  monthly_visits?: number;
  monthlyVisits?: number;
  visits?: number;
  traffic?: number;
  monthly_revenue?: number;
  monthlyRevenue?: number;
  revenue?: number;
  min_revenue?: number;
  max_revenue?: number;
  rank?: number;
  bounce_rate?: number;
  pages_per_visit?: number;
  visit_duration?: number;
  product_count?: number;
  last_meta_active_count?: number;
  growth_30d?: number;
  brandsearch_note?: string;
  competitors?: JsonRecord[];
  similar_brands?: JsonRecord[];
  technologies?: unknown[];
  tech_stack?: unknown[];
  techStack?: unknown[];
  monthly_visits_history?: BrandMetricPoint[];
  monthlyVisitsHistory?: BrandMetricPoint[];
  visits_history?: BrandMetricPoint[];
  traffic_history?: BrandMetricPoint[];
  visitCountries?: TrafficCountry[];
  traffic_countries?: TrafficCountry[];
  top_countries?: TrafficCountry[];
  countries?: TrafficCountry[];
};

type ProductMedia = {
  url: string;
  alt?: string;
  source?: string;
  type?: string;
};

type ProductReview = {
  author?: string;
  title?: string;
  body?: string;
  rating?: number;
  date?: string;
  source?: string;
  count?: number;
};

type BundlePrice = {
  name: string;
  price: number | string;
  sku?: string;
  id?: string | number;
  url?: string;
  available?: boolean;
  image?: string;
  options?: Record<string, unknown>;
};

type BundleWidgetAsset = {
  type?: string;
  url: string;
  source?: string;
};

type BundleWidget = {
  html: string;
  css?: string[];
  assets?: BundleWidgetAsset[];
  source?: string;
  detectedBy?: string;
  score?: number;
  text?: string;
};

type ScrapingJob = {
  id: string;
  createdAt: string;
  status: string;
  errorMessage?: string | null;
  durationMs?: number | null;
  source?: string | null;
};

type ProductDetails = {
  title?: string | null;
  url: string;
  image?: string | null;
  currentPrice?: number | null;
  currency?: string | null;
  stockStatus?: string | null;
  brandMetrics?: BrandMetrics | null;
  description?: string | null;
  brand?: string | null;
  sku?: string | null;
  rating?: number | null;
  reviewsCount?: number | null;
  productMedia?: ProductMedia[] | null;
  productReviews?: ProductReview[] | null;
  bundlePrices?: BundlePrice[] | null;
  bundleWidget?: BundleWidget | null;
  scrapingJobs?: ScrapingJob[];
  lastCheckedAt?: string | null;
  error?: string;
};

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readNumberFromKeys(record: JsonRecord, keys: string[]): number | undefined {
  const wanted = new Set(keys.map(normalizeMetricKey));
  for (const [key, value] of Object.entries(record)) {
    if (!wanted.has(normalizeMetricKey(key))) continue;
    const number = typeof value === "number" ? value : Number(value);
    if (Number.isFinite(number)) return number;
  }
  return undefined;
}

function normalizeMetricKey(value: string) {
  return value.replace(/[^a-z0-9]/gi, "").toLowerCase();
}

function walkMetricValues(value: unknown, visitor: (value: unknown, key: string, depth: number) => void, depth = 0, key = "") {
  if (depth > 5 || value === null || value === undefined) return;
  visitor(value, key, depth);
  if (Array.isArray(value)) {
    value.slice(0, 80).forEach((item, index) => walkMetricValues(item, visitor, depth + 1, key ? `${key}.${index}` : String(index)));
    return;
  }
  if (isRecord(value)) {
    Object.entries(value).slice(0, 120).forEach(([childKey, child]) => walkMetricValues(child, visitor, depth + 1, key ? `${key}.${childKey}` : childKey));
  }
}

function findNestedNumber(record: JsonRecord, keys: string[]) {
  const wanted = keys.map(normalizeMetricKey);
  let found: number | undefined;
  walkMetricValues(record, (value, key) => {
    if (found !== undefined) return;
    const normalizedKey = normalizeMetricKey(key);
    if (!wanted.some((item) => normalizedKey === item || normalizedKey.endsWith(item) || normalizedKey.includes(item))) return;
    const number = typeof value === "number" ? value : Number(value);
    if (Number.isFinite(number)) found = number;
  });
  return found;
}

function nestedArrays(record: JsonRecord, predicate: (key: string) => boolean) {
  const arrays: unknown[][] = [];
  walkMetricValues(record, (value, key) => {
    if (Array.isArray(value) && predicate(normalizeMetricKey(key))) arrays.push(value);
  });
  return arrays;
}

function formatCompact(value?: number | null, suffix = "") {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return `${Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(value)}${suffix}`;
}

function formatMoney(value?: number | null, currency = "USD") {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  try {
    return Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
  } catch {
    return `${Math.round(value).toLocaleString()} ${currency}`;
  }
}

function formatMoneyRange(min?: number, max?: number, currency = "USD") {
  if (min !== undefined && max !== undefined) return `${formatMoney(min, currency)}–${formatMoney(max, currency)}`;
  return formatMoney(max ?? min, currency);
}

function metricText(metrics: BrandMetrics | null | undefined, keys: string[], fallback = "—") {
  if (!metrics) return fallback;
  for (const key of keys) {
    const value = metrics[key];
    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number" && Number.isFinite(value)) return formatCompact(value);
  }
  return fallback;
}

function getMonthlyVisits(metrics?: BrandMetrics | null) {
  if (!metrics) return undefined;
  return readNumberFromKeys(metrics, ["monthly_visits", "monthlyVisits", "visits", "traffic", "estimated_monthly_visits", "monthlyTraffic"]) ??
    findNestedNumber(metrics, ["monthly_visits", "monthlyVisits", "estimated_monthly_visits", "monthlyTraffic", "visits", "traffic"]);
}

function getRevenueMetric(metrics?: BrandMetrics | null) {
  if (!metrics) return undefined;
  const minRevenue = readNumberFromKeys(metrics, ["min_revenue", "minRevenue"]);
  const maxRevenue = readNumberFromKeys(metrics, ["max_revenue", "maxRevenue"]);
  if (minRevenue !== undefined && maxRevenue !== undefined) return (minRevenue + maxRevenue) / 2;
  return maxRevenue ?? minRevenue ??
    readNumberFromKeys(metrics, ["monthly_revenue", "monthlyRevenue", "revenue", "estimated_monthly_revenue"]) ??
    findNestedNumber(metrics, ["monthly_revenue", "monthlyRevenue", "estimated_monthly_revenue", "revenue"]);
}

function getRevenueRange(metrics?: BrandMetrics | null) {
  if (!metrics) return { min: undefined as number | undefined, max: undefined as number | undefined };
  return {
    min: readNumberFromKeys(metrics, ["min_revenue", "minRevenue"]),
    max: readNumberFromKeys(metrics, ["max_revenue", "maxRevenue"]),
  };
}

function normalizeVisitHistory(metrics?: BrandMetrics | null) {
  if (!metrics) return undefined;
  const directCandidates = [metrics.monthly_visits_history, metrics.monthlyVisitsHistory, metrics.visits_history, metrics.traffic_history, metrics.history];
  const recursiveCandidates = nestedArrays(metrics, (key) =>
    key.includes("history") && (key.includes("visit") || key.includes("traffic") || key.includes("monthly")) ||
    key.includes("monthlyvisit") ||
    key.includes("traffichistory") ||
    key.includes("visitshistory")
  );
  const candidates = [...directCandidates, ...recursiveCandidates];

  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) continue;
    const points = candidate
      .map(normalizeVisitPoint)
      .filter((item): item is { month: string; visits: number } => item !== null)
      .slice(-12);
    if (points.length > 1) return points;
  }

  return undefined;
}

function normalizeVisitPoint(item: unknown, index: number) {
  if (typeof item === "number" && Number.isFinite(item)) {
    return { month: MONTH_NAMES[index % 12], visits: item };
  }
  if (Array.isArray(item)) {
    const numberValue = item.find((value) => Number.isFinite(Number(value)) && !String(value).match(/^\d{4}[-/]/));
    const labelValue = item.find((value) => typeof value === "string" && value.trim() && value !== numberValue);
    const visits = numberValue !== undefined ? Number(numberValue) : undefined;
    if (visits === undefined || !Number.isFinite(visits)) return null;
    return { month: asString(labelValue) || MONTH_NAMES[index % 12], visits };
  }
  if (!isRecord(item)) return null;
  const visits = readNumberFromKeys(item, ["visits", "monthly_visits", "monthlyVisits", "value", "traffic", "count", "estimated_visits", "monthlyTraffic"]);
  if (visits === undefined) return null;
  return {
    month: asString(item.month) || asString(item.date) || asString(item.period) || asString(item.label) || asString(item.name) || MONTH_NAMES[index % 12],
    visits,
  };
}

function normalizeTrafficCountries(metrics?: BrandMetrics | null) {
  if (!metrics) return [] as TrafficCountry[];
  const directCandidates = [metrics.visitCountries, metrics.traffic_countries, metrics.top_countries, metrics.countries, metrics.country_breakdown, metrics.traffic_by_country];
  const recursiveCandidates = nestedArrays(metrics, (key) => key.includes("countr") || key.includes("geo") || key.includes("market"));
  const candidates = [...directCandidates, ...recursiveCandidates];

  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) continue;
    const countries = candidate
      .map((item): TrafficCountry | null => {
        if (!isRecord(item)) return null;
        const label = asString(item.label) || asString(item.country) || asString(item.name) || asString(item.code);
        const share = readNumberFromKeys(item, ["share", "percent", "percentage", "value", "traffic_share"]);
        if (!label || share === undefined) return null;
        const code = asString(item.code);
        const flag = asString(item.flag);
        return {
          label,
          share: share <= 1 ? share * 100 : share,
          ...(code ? { code } : {}),
          ...(flag ? { flag } : {}),
        };
      })
      .filter((item): item is TrafficCountry => item !== null)
      .slice(0, 4);

    if (countries.length) return countries;
  }

  return [] as TrafficCountry[];
}

function normalizeCompetitors(metrics?: BrandMetrics | null) {
  if (!metrics) return [] as JsonRecord[];
  const directCandidates = [metrics.competitors, metrics.similar_brands, metrics.similarBrands, metrics.competitor_overlap, metrics.alternatives, metrics.similar_sites, metrics.similarSites];
  const recursiveCandidates = nestedArrays(metrics, (key) => key.includes("competitor") || key.includes("similar") || key.includes("alternative"));
  for (const candidate of [...directCandidates, ...recursiveCandidates]) {
    if (Array.isArray(candidate)) return candidate.filter(isRecord).slice(0, 6);
  }
  return [] as JsonRecord[];
}

function normalizeTechnologies(metrics?: BrandMetrics | null) {
  if (!metrics) return [];
  const tech = metrics.technologies || metrics.tech_stack || metrics.techStack || nestedArrays(metrics, (key) => key.includes("technolog") || key.includes("techstack"))[0];
  if (Array.isArray(tech)) return tech.map(String).filter(Boolean).slice(0, 12);
  return [];
}

function competitorName(item: JsonRecord) {
  return asString(item.name) || asString(item.brand) || asString(item.domain) || asString(item.url) || "Similar store";
}

function competitorDomain(item: JsonRecord) {
  const raw = asString(item.domain) || asString(item.url) || asString(item.website);
  if (!raw) return "—";
  try { return new URL(raw.startsWith("http") ? raw : `https://${raw}`).hostname.replace(/^www\./, ""); } catch { return raw; }
}

function competitorRevenue(item: JsonRecord) {
  return readNumberFromKeys(item, ["revenue", "monthly_revenue", "monthlyRevenue", "estimated_monthly_revenue"]);
}

function competitorKey(item: JsonRecord, index: number) {
  return `${competitorDomain(item)}-${index}`.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "") || `competitor_${index}`;
}

function competitorHistory(item: JsonRecord) {
  const directCandidates = [item.revenue_history, item.revenueHistory, item.monthly_revenue_history, item.monthlyRevenueHistory, item.history];
  const recursiveCandidates = nestedArrays(item, (key) => key.includes("history") && (key.includes("revenue") || key.includes("sales")) || key.includes("revenuehistory"));
  const candidates = [...directCandidates, ...recursiveCandidates];
  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) continue;
    const points = candidate
      .map((point, pointIndex) => {
        if (!isRecord(point)) return null;
        const revenue = readNumberFromKeys(point, ["revenue", "monthly_revenue", "monthlyRevenue", "value", "sales", "estimated_monthly_revenue"]);
        if (revenue === undefined) return null;
        return {
          month: asString(point.month) || asString(point.date) || asString(point.period) || MONTH_NAMES[pointIndex % 12],
          revenue,
        };
      })
      .filter((point): point is { month: string; revenue: number } => point !== null)
      .slice(-6);
    if (points.length >= 2) return points;
  }

  return [];
}

function buildCompetitorSeries(competitors: JsonRecord[]) {
  return competitors.slice(0, 6).map((item, index): CompetitorRevenueSeries | null => {
    const revenue = competitorRevenue(item);
    const data = competitorHistory(item);
    if (data.length < 2) return null;
    const currentRevenue = revenue ?? data[data.length - 1]?.revenue;
    if (currentRevenue === undefined) return null;
    return {
      key: competitorKey(item, index),
      name: competitorName(item),
      domain: competitorDomain(item),
      revenue: currentRevenue,
      data,
    };
  }).filter((item): item is CompetitorRevenueSeries => item !== null);
}

function bundleLabel(bundle: BundlePrice) {
  return bundle.name.replace(/\s+/g, " ").trim();
}

function bundlePriceNumber(bundle: BundlePrice) {
  if (typeof bundle.price === "number") return Number.isFinite(bundle.price) ? bundle.price : undefined;
  const match = String(bundle.price).replace(/\s/g, "").match(/\d+(?:[.,]\d+)?/);
  if (!match) return undefined;
  const price = Number(match[0].replace(",", "."));
  return Number.isFinite(price) ? price : undefined;
}

function inferBundleQuantity(bundle: BundlePrice) {
  const optionText = bundle.options ? Object.values(bundle.options).map(String).join(" ") : "";
  const text = `${bundle.name} ${optionText}`.toLowerCase();
  const packMatch = text.match(/(?:^|\b)(\d+(?:[.,]\d+)?)\s*(?:x|pack|packs|pc|pcs|piece|pieces|unit|units|bottle|bottles|set|sets|lot|lots)\b/i);
  const leadingMatch = text.match(/^\s*(\d+(?:[.,]\d+)?)(?:\s|-)/);
  const raw = packMatch?.[1] || leadingMatch?.[1];
  if (!raw) return undefined;
  const quantity = Number(raw.replace(",", "."));
  return Number.isFinite(quantity) && quantity > 0 ? quantity : undefined;
}

function bundleOptionsText(bundle: BundlePrice) {
  if (!bundle.options) return undefined;
  const parts = Object.entries(bundle.options)
    .map(([key, value]) => `${key.replace(/^option/i, "Option ")}: ${String(value)}`)
    .slice(0, 3);
  return parts.length ? parts.join(" · ") : undefined;
}

function formatBundleAmount(value: number | undefined, currency = "USD") {
  if (value === undefined || !Number.isFinite(value)) return "—";
  const amount = Number.isInteger(value) ? String(value) : value.toFixed(2);
  return `${amount} ${currency}`;
}

function getVariantInsights(product: ProductDetails) {
  const currency = product.currency || "USD";
  const items = (product.bundlePrices || []).map((bundle) => {
    const price = bundlePriceNumber(bundle);
    const quantity = inferBundleQuantity(bundle);
    return {
      bundle,
      price,
      quantity,
      unitPrice: price !== undefined && quantity ? price / quantity : price,
      optionsText: bundleOptionsText(bundle),
    };
  });

  const priced = items.filter((item) => item.price !== undefined);
  const cheapest = priced.reduce<typeof priced[number] | undefined>((best, item) => !best || (item.price ?? Infinity) < (best.price ?? Infinity) ? item : best, undefined);
  const bestValue = priced.reduce<typeof priced[number] | undefined>((best, item) => !best || (item.unitPrice ?? Infinity) < (best.unitPrice ?? Infinity) ? item : best, undefined);
  const maxPrice = priced.reduce((max, item) => Math.max(max, item.price || 0), 0);
  const minPrice = priced.reduce((min, item) => Math.min(min, item.price || Infinity), Infinity);
  const spread = priced.length > 1 && Number.isFinite(minPrice) ? maxPrice - minPrice : undefined;
  const availableCount = items.filter((item) => item.bundle.available !== false).length;
  const optionKeys = Array.from(new Set(items.flatMap((item) => item.bundle.options ? Object.keys(item.bundle.options) : []))).slice(0, 5);
  const singleUnit = priced.find((item) => item.quantity === 1);
  const savings = singleUnit && bestValue?.unitPrice !== undefined ? ((singleUnit.unitPrice || 0) - bestValue.unitPrice) / (singleUnit.unitPrice || 1) * 100 : undefined;

  return {
    currency,
    items: items.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity)),
    priced,
    cheapest,
    bestValue,
    maxPrice,
    spread,
    availableCount,
    optionKeys,
    savings: savings !== undefined && Number.isFinite(savings) ? savings : undefined,
  };
}

function VariantsBundlesPanel({ product }: { product: ProductDetails }) {
  const insights = getVariantInsights(product);
  const visibleItems = insights.items.slice(0, 6);
  const hiddenCount = Math.max(0, insights.items.length - visibleItems.length);
  const bestLabel = insights.bestValue ? bundleLabel(insights.bestValue.bundle) : "—";

  return (
    <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-[#f1ded1] shadow-sm h-full overflow-hidden flex flex-col">
      <div className="flex items-center justify-between gap-3 mb-4 flex-shrink-0">
        <h3 className="text-sm font-bold text-[#24170f] uppercase tracking-wider flex items-center gap-2"><Layers3 className="w-4 h-4 text-[#ff690c]" />Variants & Bundles</h3>
        <span className="text-xs font-black text-[#ff690c] bg-[#fffaf6] border border-[#f1ded1] rounded-full px-3 py-1">{insights.items.length} detected</span>
      </div>

      {insights.items.length > 0 ? (
        <>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 flex-shrink-0">
            <div className="rounded-xl border border-[#f1ded1] bg-[#fffaf6] p-3">
              <p className="text-[10px] uppercase tracking-wider font-black text-[#a99485]">Cheapest</p>
              <p className="mt-1 text-lg font-black text-[#24170f]">{formatBundleAmount(insights.cheapest?.price, insights.currency)}</p>
              <p className="text-xs text-[#8a7668] truncate">{insights.cheapest ? bundleLabel(insights.cheapest.bundle) : "No price"}</p>
            </div>
            <div className="rounded-xl border border-[#f1ded1] bg-[#fffaf6] p-3">
              <p className="text-[10px] uppercase tracking-wider font-black text-[#a99485]">Best value</p>
              <p className="mt-1 text-lg font-black text-[#24170f]">{formatBundleAmount(insights.bestValue?.unitPrice, insights.currency)}</p>
              <p className="text-xs text-[#8a7668] truncate">per unit · {bestLabel}</p>
            </div>
            <div className="rounded-xl border border-[#f1ded1] bg-[#fffaf6] p-3">
              <p className="text-[10px] uppercase tracking-wider font-black text-[#a99485]">Spread</p>
              <p className="mt-1 text-lg font-black text-[#24170f]">{formatBundleAmount(insights.spread, insights.currency)}</p>
              <p className="text-xs text-[#8a7668] truncate">highest vs lowest</p>
            </div>
            <div className="rounded-xl border border-[#f1ded1] bg-[#fffaf6] p-3">
              <p className="text-[10px] uppercase tracking-wider font-black text-[#a99485]">Availability</p>
              <p className="mt-1 text-lg font-black text-[#24170f]">{insights.availableCount}/{insights.items.length}</p>
              <p className="text-xs text-[#8a7668] truncate">sellable options</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 xl:grid-cols-5 gap-4 flex-1 min-h-0">
            <div className="xl:col-span-3 rounded-xl border border-[#f1ded1] bg-[#fffaf6] p-4 flex flex-col min-h-0 overflow-hidden">
              <div className="flex items-center justify-between mb-3 flex-shrink-0">
                <p className="text-xs font-black uppercase tracking-wider text-[#24170f]">Price ladder</p>
                {hiddenCount > 0 && <span className="text-xs font-bold text-[#8a7668]">+{hiddenCount} more</span>}
              </div>
              <div className="flex-1 min-h-0 flex flex-col justify-center gap-3">
                {visibleItems.map((item, index) => {
                  const width = item.price && insights.maxPrice ? Math.max(24, Math.round((item.price / insights.maxPrice) * 100)) : 18;
                  return (
                    <div key={`${bundleLabel(item.bundle)}-${index}`} className="rounded-xl border border-[#f1ded1] bg-white p-3 shadow-[0_1px_0_rgba(36,23,15,0.03)]">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-black text-[#5b4638] truncate">{bundleLabel(item.bundle)}</p>
                          <p className="text-xs text-[#a99485] truncate">{item.optionsText || (item.quantity ? `${item.quantity} unit${item.quantity > 1 ? "s" : ""}` : item.bundle.sku ? `SKU ${item.bundle.sku}` : "Variant option")}</p>
                        </div>
                        <span className="font-black text-[#24170f] bg-[#fffaf6] px-3 py-1 rounded-lg border border-[#f1ded1] shadow-sm whitespace-nowrap">{formatBundleAmount(item.price, insights.currency)}</span>
                      </div>
                      <div className="mt-3 h-2 rounded-full bg-[#fffaf6] border border-[#f1ded1] overflow-hidden">
                        <div className="h-full rounded-full bg-[#ff690c]" style={{ width: `${width}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="xl:col-span-2 grid grid-rows-2 gap-4 min-h-0">
              <div className="rounded-xl border border-[#f1ded1] bg-[#fffaf6] p-4 overflow-hidden flex flex-col justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-[#24170f]">Value signal</p>
                  <p className="mt-2 text-2xl font-black text-[#ff690c] truncate">{bestLabel}</p>
                  <p className="mt-1 text-sm text-[#8a7668]">{insights.savings && insights.savings > 0 ? `${Math.round(insights.savings)}% cheaper per unit than single pack.` : "No clear multi-pack discount detected."}</p>
                </div>
                <div className="mt-3 inline-flex w-max items-center gap-2 rounded-full border border-[#f1ded1] bg-white px-3 py-1 text-xs font-bold text-[#5b4638]"><CheckCircle2 className="w-3.5 h-3.5 text-[#ff690c]" />Best pick</div>
              </div>

              <div className="rounded-xl border border-[#f1ded1] bg-[#fffaf6] p-4 overflow-hidden">
                <p className="text-xs font-black uppercase tracking-wider text-[#24170f]">Detected options</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(insights.optionKeys.length ? insights.optionKeys : ["Pack size", "Price", "Availability"]).map((option) => (
                    <span key={option} className="rounded-full border border-[#f1ded1] bg-white px-3 py-1 text-xs font-bold text-[#5b4638]">{option}</span>
                  ))}
                </div>
                <p className="mt-3 text-xs text-[#8a7668] line-clamp-2">Captured from variants, bundle buttons, JSON offers or product widget data.</p>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center text-[#8a7668] bg-[#fffaf6] rounded-xl border border-[#f1ded1] border-dashed p-6">
          <Layers3 className="w-8 h-8 mb-2 opacity-50 text-[#ff690c]" />
          <p className="font-bold text-[#24170f]">No variants or bundles detected yet.</p>
          <p className="text-sm mt-1 max-w-md">Run a fresh scrape with the Railway backend healthy to capture variants, marketplace offers and bundle widgets.</p>
        </div>
      )}
    </div>
  );
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function bundlePreviewCss() {
  return `.pas-bundles{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#24170f;background:#fffaf6;border:1px solid #f1ded1;border-radius:18px;padding:16px;box-shadow:0 12px 30px rgba(36,23,15,.08)}
.pas-bundles__header{margin-bottom:12px}.pas-bundles__eyebrow{margin:0 0 4px;color:#ff690c;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.12em}.pas-bundles h3{margin:0;font-size:16px;line-height:1.2}.pas-bundle{width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:10px;border:1px solid #f1ded1;border-radius:14px;background:white;padding:13px 14px;color:#5b4638;font-weight:800;cursor:pointer}.pas-bundle.is-selected,.pas-bundle:hover{border-color:#ff690c;box-shadow:0 0 0 2px rgba(255,105,12,.12)}.pas-bundle strong{color:#24170f;background:#fffaf6;border:1px solid #f1ded1;border-radius:10px;padding:5px 8px;white-space:nowrap}`;
}

function bundlePreviewDocument(html: string, css: string[] = []) {
  return `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><style>html,body{margin:0;background:#fffaf6}body{padding:14px}.pas-preview-root *{box-sizing:border-box}${bundlePreviewCss()}${css.join("\n")}</style></head><body><div class="pas-preview-root">${html}</div></body></html>`;
}

function bundleExportHtml(html: string, css: string[] = [], assets: BundleWidgetAsset[] = []) {
  const stylesheets = assets
    .filter((asset) => asset.type === "stylesheet")
    .map((asset) => `<link rel="stylesheet" href="${escapeHtml(asset.url)}">`)
    .join("\n");
  const scripts = assets
    .filter((asset) => asset.type === "script")
    .map((asset) => `<script src="${escapeHtml(asset.url)}" defer></script>`)
    .join("\n");
  const inlineCss = css.length ? `<style>\n${css.join("\n")}\n</style>` : "";
  return [stylesheets, inlineCss, html, scripts].filter(Boolean).join("\n");
}

function htmlToPlainText(markup: string) {
  if (typeof window === "undefined") return markup.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const div = document.createElement("div");
  div.innerHTML = markup;
  return div.textContent?.replace(/\s+/g, " ").trim() || "";
}

function assetProxyUrl(url: string, name: string, inline = false) {
  const params = new URLSearchParams({ url, name });
  if (inline) params.set("inline", "1");
  return `/api/assets/download?${params.toString()}`;
}

function downloadAssetUrl(url: string, name: string) {
  return assetProxyUrl(url, name);
}

function previewAssetUrl(url: string, name: string) {
  return assetProxyUrl(url, name, true);
}

function reviewsToCsv(reviews: ProductReview[]) {
  const rows = [["rating", "author", "title", "body", "date", "source", "count"]];
  reviews.forEach((review) => rows.push([
    review.rating?.toString() || "",
    review.author || "",
    review.title || "",
    review.body || "",
    review.date || "",
    review.source || "",
    review.count?.toString() || "",
  ]));
  return rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
}

function downloadTextFile(filename: string, content: string, type = "text/plain") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function absoluteAssetUrl(value: string, baseUrl: string) {
  if (value.startsWith("//")) return `https:${value}`;
  try {
    return new URL(value).toString();
  } catch {
    try {
      return new URL(value, baseUrl).toString();
    } catch {
      return value;
    }
  }
}

function productMediaItems(product: ProductDetails): ProductMedia[] {
  const raw = product.productMedia?.length ? product.productMedia : product.image ? [{ url: product.image, alt: product.title || "Product image", source: "primary", type: "image" }] : [];
  const seen = new Set<string>();
  return raw
    .map((item) => ({ ...item, url: absoluteAssetUrl(item.url, product.url) }))
    .filter((item) => {
      if (!item.url || seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    });
}

function ProductPhotoCard({ product, onOpenAssets }: { product: ProductDetails; onOpenAssets?: () => void }) {
  const media = productMediaItems(product);
  const visibleThumbs = media.slice(0, 4);
  const extraCount = Math.max(0, media.length - visibleThumbs.length);
  return (
    <div className="bg-white rounded-2xl border border-[#f1ded1] shadow-sm flex-[0.85] flex flex-col p-4 sm:p-5 overflow-hidden min-h-[190px] max-h-[224px]">
      <div className="flex items-center justify-between gap-3 mb-3 flex-shrink-0">
        <h3 className="text-sm font-bold text-[#24170f] uppercase tracking-wider flex items-center gap-3"><Images className="w-5 h-5 text-[#ff690c]" />Product photo</h3>
        {media.length > 0 && <button type="button" onClick={onOpenAssets} className="text-xs font-black text-[#ff690c] bg-[#fffaf6] border border-[#f1ded1] rounded-full px-2.5 py-1 hover:bg-white transition-colors">Open assets</button>}
      </div>
      <button type="button" onClick={onOpenAssets} className="flex-1 min-h-0 rounded-xl border border-[#f1ded1] bg-[#fffaf6] overflow-hidden grid grid-cols-4 gap-2 p-2 text-left disabled:cursor-default" disabled={!media.length}>
        {visibleThumbs.length ? visibleThumbs.map((item, index) => (
          <div key={`${item.url}-${index}`} className="relative rounded-lg bg-white border border-[#f1ded1] overflow-hidden flex items-center justify-center">
            <img src={previewAssetUrl(item.url, `${product.title || "product"}-overview-${index + 1}`)} alt={item.alt || product.title || `Product ${index + 1}`} className="h-full w-full object-cover" />
            {index === visibleThumbs.length - 1 && extraCount > 0 && <span className="absolute inset-0 bg-[#24170f]/55 text-white text-xs font-black flex items-center justify-center">+{extraCount}</span>}
          </div>
        )) : (
          <div className="text-center text-[#8a7668]">
            <Package className="w-9 h-9 mx-auto mb-2 text-[#ff690c] opacity-60" />
            <p className="text-sm font-bold text-[#24170f]">No product image</p>
          </div>
        )}
      </button>
    </div>
  );
}

function ProductAssetsPanel({ product }: { product: ProductDetails }) {
  const [copiedReviews, setCopiedReviews] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const media = productMediaItems(product);
  const focusedMedia = media[Math.min(focusedIndex, Math.max(media.length - 1, 0))];
  const visibleMedia = media.slice(0, 12);
  const hiddenMediaCount = Math.max(0, media.length - visibleMedia.length);
  const reviews = product.productReviews || [];
  const reviewsCsv = reviewsToCsv(reviews);

  const copyReviews = async () => {
    await navigator.clipboard.writeText(reviewsCsv);
    setCopiedReviews(true);
    window.setTimeout(() => setCopiedReviews(false), 1400);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-5 h-full overflow-hidden">
      <div className="lg:col-span-3 bg-white p-5 rounded-2xl border border-[#f1ded1] shadow-sm h-full overflow-hidden flex flex-col">
        <div className="flex items-start justify-between gap-3 mb-4 flex-shrink-0">
          <div>
            <h3 className="text-sm font-bold text-[#24170f] uppercase tracking-wider flex items-center gap-2"><Images className="w-4 h-4 text-[#ff690c]" />Product images</h3>
            <p className="text-sm text-[#8a7668] mt-2">Download scraped product media. No generated assets.</p>
          </div>
          <span className="text-xs font-black text-[#ff690c] bg-[#fffaf6] border border-[#f1ded1] rounded-full px-3 py-1">{media.length} files</span>
        </div>

        {media.length ? (
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-3 flex-1 min-h-0 overflow-hidden">
            <div className="xl:col-span-3 min-h-0 rounded-xl border border-[#f1ded1] bg-[#fffaf6] p-3 overflow-hidden flex flex-col">
              <button type="button" onClick={() => focusedMedia && window.open(previewAssetUrl(focusedMedia.url, `${product.title || "product"}-preview`), "_blank", "noopener,noreferrer")} className="group relative flex-1 min-h-0 rounded-lg bg-white border border-[#f1ded1] overflow-hidden flex items-center justify-center cursor-zoom-in">
                {focusedMedia ? (
                  <img src={previewAssetUrl(focusedMedia.url, `${product.title || "product"}-preview`)} alt={focusedMedia.alt || "Focused product media"} className="h-full w-full object-contain transition-transform duration-200 group-hover:scale-[1.025]" />
                ) : null}
                <span className="absolute left-3 top-3 rounded-full bg-white/90 border border-[#f1ded1] px-3 py-1 text-[11px] font-black text-[#24170f] shadow-sm">Click to open</span>
              </button>
              <div className="mt-3 flex items-center justify-between gap-3 flex-shrink-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-[#24170f]">{focusedMedia?.alt || product.title || "Product image"}</p>
                  <p className="truncate text-xs font-bold text-[#8a7668]">{focusedMedia?.source || focusedMedia?.type || "image"}</p>
                </div>
                {focusedMedia && (
                  <a href={downloadAssetUrl(focusedMedia.url, `${product.title || "product"}-selected`)} className="inline-flex items-center gap-1.5 rounded-lg bg-[#24170f] px-3 py-2 text-xs font-black text-[#fffaf6] hover:bg-[#3a281d]">
                    <Download className="w-3.5 h-3.5" />Download
                  </a>
                )}
              </div>
            </div>

            <div className="xl:col-span-2 grid grid-cols-3 gap-2 content-start overflow-hidden">
              {visibleMedia.map((item, index) => {
                const active = index === Math.min(focusedIndex, media.length - 1);
                return (
                  <button key={`${item.url}-${index}`} type="button" onClick={() => setFocusedIndex(index)} className={`rounded-xl border p-1.5 overflow-hidden text-left transition-all ${active ? "border-[#ff690c] bg-white shadow-[0_0_0_2px_rgba(255,105,12,0.12)]" : "border-[#f1ded1] bg-[#fffaf6] hover:border-[#ff690c]/70"}`}>
                    <div className="aspect-square rounded-lg bg-white border border-[#f1ded1] overflow-hidden flex items-center justify-center">
                      <img src={previewAssetUrl(item.url, `${product.title || "product"}-${index + 1}`)} alt={item.alt || `Product media ${index + 1}`} className="h-full w-full object-cover" />
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-1">
                      <p className="min-w-0 truncate text-[10px] font-bold text-[#8a7668]">{item.source || item.type || "image"}</p>
                      <span className="text-[10px] font-black text-[#ff690c]">Focus</span>
                    </div>
                  </button>
                );
              })}
              {hiddenMediaCount > 0 && (
                <div className="rounded-xl border border-[#f1ded1] bg-[#fffaf6] p-3 text-xs font-black text-[#8a7668] flex items-center justify-center">+{hiddenMediaCount} more</div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-[#8a7668] bg-[#fffaf6] rounded-xl border border-[#f1ded1] border-dashed p-6">
            <Images className="w-8 h-8 mb-2 opacity-50 text-[#ff690c]" />
            <p className="font-bold text-[#24170f]">No product media captured yet.</p>
            <p className="text-sm mt-1 max-w-md">Run a fresh scrape to collect product gallery images.</p>
          </div>
        )}
      </div>

      <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-[#f1ded1] shadow-sm h-full overflow-hidden flex flex-col">
        <div className="flex items-start justify-between gap-3 mb-4 flex-shrink-0">
          <div>
            <h3 className="text-sm font-bold text-[#24170f] uppercase tracking-wider flex items-center gap-2"><MessageSquareText className="w-4 h-4 text-[#ff690c]" />Reviews export</h3>
            <p className="text-sm text-[#8a7668] mt-2">Export scraped review snippets / aggregate rating.</p>
          </div>
          <span className="text-xs font-black text-[#ff690c] bg-[#fffaf6] border border-[#f1ded1] rounded-full px-3 py-1">{reviews.length}</span>
        </div>

        <div className="flex gap-2 flex-shrink-0 mb-4">
          <button onClick={copyReviews} disabled={!reviews.length} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#24170f] text-[#fffaf6] text-xs font-black hover:bg-[#3a281d] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            {copiedReviews ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}{copiedReviews ? "Copied" : "Copy CSV"}
          </button>
          <button onClick={() => downloadTextFile(`${product.title || "product"}-reviews.csv`, reviewsCsv, "text/csv")} disabled={!reviews.length} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[#f1ded1] bg-[#fffaf6] text-[#24170f] text-xs font-black hover:text-[#ff690c] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            <FileDown className="w-3.5 h-3.5" />Export
          </button>
        </div>

        {reviews.length ? (
          <div className="flex-1 min-h-0 space-y-3 overflow-hidden">
            {reviews.slice(0, 6).map((review, index) => (
              <div key={index} className="rounded-xl border border-[#f1ded1] bg-[#fffaf6] p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-black text-sm text-[#24170f] truncate">{review.title || review.author || `Review ${index + 1}`}</p>
                  <span className="text-xs font-black text-[#ff690c] whitespace-nowrap">{review.rating ? `${review.rating}/5` : review.count ? `${review.count} total` : "—"}</span>
                </div>
                {review.body && <p className="mt-2 text-xs text-[#5b4638] line-clamp-3">{review.body}</p>}
                <p className="mt-2 text-[11px] font-semibold text-[#a99485] truncate">{review.date || review.source || "scraped"}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-[#8a7668] bg-[#fffaf6] rounded-xl border border-[#f1ded1] border-dashed p-6">
            <MessageSquareText className="w-8 h-8 mb-2 opacity-50 text-[#ff690c]" />
            <p className="font-bold text-[#24170f]">No reviews captured yet.</p>
            <p className="text-sm mt-1 max-w-md">Run a fresh scrape to collect reviews when the page exposes them.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function TrafficSnapshotPanel({ visits, revenue, revenueRange, countries, currency, metrics }: { visits?: number; revenue?: number; revenueRange: { min?: number; max?: number }; countries: TrafficCountry[]; currency: string; metrics?: BrandMetrics | null }) {
  const rank = metrics ? readNumberFromKeys(metrics, ["rank"]) : undefined;
  const bounceRate = metrics ? readNumberFromKeys(metrics, ["bounce_rate", "bounceRate"]) : undefined;
  const pagesPerVisit = metrics ? readNumberFromKeys(metrics, ["pages_per_visit", "pagesPerVisit"]) : undefined;
  const visitDuration = metrics ? readNumberFromKeys(metrics, ["visit_duration", "visitDuration"]) : undefined;
  const growth = metrics ? readNumberFromKeys(metrics, ["growth_30d", "growth30d"]) : undefined;
  const productCount = metrics ? readNumberFromKeys(metrics, ["product_count", "productCount"]) : undefined;
  const trafficMetrics = [
    { label: "Monthly visits", value: formatCompact(visits), strong: true },
    { label: "Revenue", value: formatMoneyRange(revenueRange.min, revenueRange.max, currency) },
    { label: "Rank", value: rank ? `#${formatCompact(rank)}` : "—" },
    { label: "30d", value: growth !== undefined ? `${growth > 0 ? "+" : ""}${growth.toFixed(1)}%` : "—" },
    { label: "Bounce", value: bounceRate !== undefined ? `${(bounceRate <= 1 ? bounceRate * 100 : bounceRate).toFixed(0)}%` : "—" },
    { label: "Pages", value: pagesPerVisit !== undefined ? pagesPerVisit.toFixed(1) : "—" },
    { label: "Duration", value: visitDuration !== undefined ? `${Math.round(visitDuration)}s` : "—" },
    { label: "Products", value: formatCompact(productCount) },
  ];
  const hasSignals = visits !== undefined || revenue !== undefined || countries.length > 0 || rank !== undefined || productCount !== undefined;

  if (!hasSignals) {
    return (
      <div className="h-full min-h-[220px] rounded-2xl border border-[#f1ded1] bg-white p-5 shadow-sm overflow-hidden flex flex-col">
        <div className="flex items-start justify-between gap-3 flex-shrink-0">
          <div>
            <h3 className="text-sm font-black text-[#24170f] uppercase tracking-[0.12em] flex items-center gap-2"><BarChart3 className="w-4 h-4 text-[#ff690c]" />Traffic snapshot</h3>
            <p className="mt-1 text-sm text-[#8a7668]">No BrandSearch traffic data yet.</p>
          </div>
          <span className="rounded-full border border-[#f1ded1] bg-[#fffaf6] px-3 py-1 text-xs font-bold text-[#8a7668]">BrandSearch</span>
        </div>
        <div className="mt-5 rounded-2xl border border-dashed border-[#f1ded1] bg-[#fffaf6] p-5 text-sm text-[#8a7668]">
          Run a fresh scrape or wait for BrandSearch to return traffic metrics for this domain.
        </div>
      </div>
    );
  }

  return (
    <div className="h-full min-h-[300px] rounded-2xl border border-[#f1ded1] bg-white p-5 shadow-sm overflow-hidden flex flex-col">
      <div className="flex items-start justify-between gap-3 flex-shrink-0">
        <div>
          <h3 className="text-sm font-black text-[#24170f] uppercase tracking-[0.12em] flex items-center gap-2"><BarChart3 className="w-4 h-4 text-[#ff690c]" />Traffic snapshot</h3>
          <p className="mt-1 text-sm text-[#8a7668]">Latest documented BrandSearch snapshot. Traffic history appears when projected visit fields are returned.</p>
        </div>
        <span className="rounded-full border border-[#f1ded1] bg-[#fffaf6] px-3 py-1 text-xs font-bold text-[#8a7668]">BrandSearch</span>
      </div>

      <div className="mt-4 grid grid-cols-2 xl:grid-cols-4 gap-3 flex-shrink-0">
        {trafficMetrics.map((metric) => (
          <div key={metric.label} className="rounded-2xl border border-[#f1ded1] bg-[#fffaf6] p-3 min-w-0">
            <p className="text-[10px] uppercase tracking-[0.14em] font-black text-[#a99485] truncate">{metric.label}</p>
            <p className={`${metric.strong ? "text-3xl" : "text-xl"} mt-2 font-black leading-none text-[#24170f] truncate`}>{metric.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-[#f1ded1] bg-[#fffaf6] p-4 flex-1 min-h-0 overflow-hidden">
        <p className="text-[10px] uppercase tracking-[0.14em] font-black text-[#a99485] mb-3">Top countries</p>
        {countries.length ? (
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-2">
            {countries.slice(0, 4).map((country) => (
              <div key={`${country.label}-${country.share}`} className="flex items-center justify-between gap-3 rounded-xl border border-[#f1ded1] bg-white px-3 py-2">
                <span className="min-w-0 truncate text-sm font-bold text-[#5b4638]"><span className="mr-2">{country.flag || "🌐"}</span>{country.label}</span>
                <span className="text-sm font-black text-[#ff690c]">{Number(country.share).toFixed(country.share % 1 ? 1 : 0)}%</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[#8a7668]">No country split returned by BrandSearch for this brand.</p>
        )}
      </div>
    </div>
  );
}

function CompetitorSnapshotPanel({ competitors, technologies, revenue, revenueRange, visits, currency }: { competitors: JsonRecord[]; technologies: string[]; revenue?: number; revenueRange: { min?: number; max?: number }; visits?: number; currency: string }) {
  const hasSignals = competitors.length > 0 || technologies.length > 0 || revenue !== undefined || visits !== undefined || revenueRange.min !== undefined || revenueRange.max !== undefined;

  if (!hasSignals) {
    return (
      <div className="h-full min-h-[220px] rounded-2xl border border-[#f1ded1] bg-white p-5 shadow-sm overflow-hidden flex flex-col">
        <div className="flex items-start justify-between gap-3 flex-shrink-0">
          <div>
            <h3 className="text-sm font-black text-[#24170f] uppercase tracking-[0.12em] flex items-center gap-2"><Users className="w-4 h-4 text-[#ff690c]" />Competitor snapshot</h3>
            <p className="mt-1 text-sm text-[#8a7668]">No competitor data from BrandSearch yet.</p>
          </div>
          <span className="rounded-full border border-[#f1ded1] bg-[#fffaf6] px-3 py-1 text-xs font-bold text-[#8a7668]">BrandSearch</span>
        </div>
        <div className="mt-5 rounded-2xl border border-dashed border-[#f1ded1] bg-[#fffaf6] p-5 text-sm text-[#8a7668]">
          Run a fresh scrape or wait for BrandSearch to return similar shops, tech stack, or revenue metrics for this domain.
        </div>
      </div>
    );
  }

  return (
    <div className="h-full min-h-[330px] rounded-2xl border border-[#f1ded1] bg-white p-5 shadow-sm overflow-hidden flex flex-col">
      <div className="flex items-start justify-between gap-3 flex-shrink-0">
        <div>
          <h3 className="text-sm font-black text-[#24170f] uppercase tracking-[0.12em] flex items-center gap-2"><Users className="w-4 h-4 text-[#ff690c]" />Competitor snapshot</h3>
          <p className="mt-1 text-sm text-[#8a7668]">Similar shops found through documented BrandSearch brand filters.</p>
        </div>
        <span className="rounded-full border border-[#f1ded1] bg-[#fffaf6] px-3 py-1 text-xs font-bold text-[#8a7668]">BrandSearch</span>
      </div>

      <div className="mt-5 grid grid-cols-1 xl:grid-cols-4 gap-4 flex-1 min-h-0">
        <div className="rounded-2xl border border-[#f1ded1] bg-[#fffaf6] p-4 flex flex-col justify-between">
          <p className="text-[10px] uppercase tracking-[0.14em] font-black text-[#a99485]">Similar shops</p>
          <p className="mt-3 text-3xl font-black text-[#24170f]">{competitors.length || "—"}</p>
          <p className="mt-2 text-xs font-medium text-[#8a7668]">Returned by BrandSearch.</p>
        </div>
        <div className="rounded-2xl border border-[#f1ded1] bg-[#fffaf6] p-4 flex flex-col justify-between">
          <p className="text-[10px] uppercase tracking-[0.14em] font-black text-[#a99485]">Revenue</p>
          <p className="mt-3 text-3xl font-black text-[#24170f]">{formatMoneyRange(revenueRange.min, revenueRange.max, currency)}</p>
          <p className="mt-2 text-xs font-medium text-[#8a7668]">BrandSearch min/max estimate.</p>
        </div>
        <div className="rounded-2xl border border-[#f1ded1] bg-[#fffaf6] p-4 flex flex-col justify-between">
          <p className="text-[10px] uppercase tracking-[0.14em] font-black text-[#a99485]">Visits</p>
          <p className="mt-3 text-3xl font-black text-[#24170f]">{formatCompact(visits)}</p>
          <p className="mt-2 text-xs font-medium text-[#8a7668]">Traffic signal.</p>
        </div>
        <div className="rounded-2xl border border-[#f1ded1] bg-[#fffaf6] p-4 overflow-hidden">
          <p className="text-[10px] uppercase tracking-[0.14em] font-black text-[#a99485]">Tech stack</p>
          {technologies.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {technologies.slice(0, 8).map((tech) => <span key={tech} className="px-2.5 py-1 bg-white border border-[#f1ded1] rounded-md text-xs font-semibold text-[#5b4638]">{tech}</span>)}
            </div>
          ) : (
            <p className="mt-3 text-sm text-[#8a7668]">No tech stack returned.</p>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-[#f1ded1] bg-[#fffaf6] p-4 flex-shrink-0">
        <p className="text-[10px] uppercase tracking-[0.14em] font-black text-[#a99485] mb-3">Similar shops</p>
        {competitors.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {competitors.slice(0, 4).map((item, index) => (
              <div key={index} className="flex items-center justify-between gap-3 rounded-xl border border-[#f1ded1] bg-white px-3 py-2">
                <div className="min-w-0">
                  <p className="font-bold text-sm text-[#24170f] truncate">{competitorName(item)}</p>
                  <p className="text-xs text-[#8a7668] truncate">{competitorDomain(item)}</p>
                </div>
                <span className="text-xs font-black text-[#ff690c] whitespace-nowrap">{formatMoney(competitorRevenue(item), currency)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[#8a7668]">No similar shops returned.</p>
        )}
      </div>
    </div>
  );
}

function BundleWidgetPreview({ product }: { product: ProductDetails }) {
  const [copied, setCopied] = useState(false);
  const html = product.bundleWidget?.html || "";
  const css = product.bundleWidget?.css || [];
  const assets = product.bundleWidget?.assets || [];
  const exportHtml = html ? bundleExportHtml(html, css, assets) : "";
  const previewDoc = html ? bundlePreviewDocument(html, css) : "";
  const previewText = html ? htmlToPlainText(html).slice(0, 180) : "";

  const handleCopy = async () => {
    if (!exportHtml) return;
    await navigator.clipboard.writeText(exportHtml);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div className="bg-white p-5 rounded-2xl border border-[#f1ded1] shadow-sm h-full overflow-hidden flex flex-col">
      <div className="flex items-start justify-between gap-3 mb-4 flex-shrink-0">
        <div>
          <h3 className="text-sm font-bold text-[#24170f] uppercase tracking-wider flex items-center gap-2"><Code2 className="w-4 h-4 text-[#ff690c]" />Bundle preview</h3>
          <p className="text-sm text-[#8a7668] mt-2">Real widget HTML scraped from the product page.</p>
        </div>
        <button onClick={handleCopy} disabled={!html} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#24170f] text-[#fffaf6] text-xs font-black hover:bg-[#3a281d] disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap">
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Copied" : "Copy HTML"}
        </button>
      </div>

      {html ? (
        <>
          <div className="bg-[#fffaf6] rounded-xl border border-[#f1ded1] p-3 flex-1 min-h-0 overflow-hidden">
            <iframe title="Bundle widget preview" sandbox="" srcDoc={previewDoc} className="w-full h-full min-h-[240px] rounded-lg bg-[#fffaf6] border-0" />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 flex-shrink-0">
            <div className="rounded-xl border border-[#f1ded1] bg-[#fffaf6] p-3 min-w-0">
              <p className="text-[10px] uppercase tracking-wider font-black text-[#a99485] mb-1">Detected</p>
              <p className="text-xs font-bold text-[#24170f] truncate">{product.bundleWidget?.source || "bundle widget"}</p>
            </div>
            <div className="rounded-xl border border-[#f1ded1] bg-[#fffaf6] p-3 min-w-0">
              <p className="text-[10px] uppercase tracking-wider font-black text-[#a99485] mb-1">Assets</p>
              <p className="text-xs font-bold text-[#24170f] truncate">{assets.length ? `${assets.length} linked asset${assets.length > 1 ? "s" : ""}` : css.length ? `${css.length} inline CSS block${css.length > 1 ? "s" : ""}` : "No linked assets"}</p>
            </div>
          </div>
          {assets.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2 flex-shrink-0">
              {assets.slice(0, 4).map((asset) => (
                <a key={asset.url} href={asset.url} target="_blank" rel="noreferrer" className="max-w-full truncate rounded-full border border-[#f1ded1] bg-white px-2.5 py-1 text-[11px] font-bold text-[#8a7668] hover:text-[#ff690c]">
                  {asset.type || "asset"}
                </a>
              ))}
            </div>
          ) : previewText ? (
            <p className="mt-3 text-xs text-[#8a7668] line-clamp-2 flex-shrink-0">{previewText}</p>
          ) : null}
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center text-[#8a7668] bg-[#fffaf6] rounded-xl border border-[#f1ded1] border-dashed p-6">
          <Code2 className="w-8 h-8 mb-2 opacity-50" />
          <p className="font-bold text-[#24170f]">No bundle widget detected yet.</p>
          <p className="text-sm mt-1">Run a new scrape after Railway is healthy to capture widget HTML/CSS/assets.</p>
        </div>
      )}
    </div>
  );
}

export function ProductDetailsModal({ productId, onClose }: { productId: string, onClose: () => void }) {
  const [product, setProduct] = useState<ProductDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Overview");

  useEffect(() => {
    fetch(`/api/products/${productId}`)
      .then(res => res.json())
      .then((data: ProductDetails) => {
        setProduct(data);
        setLoading(false);
      });

    const handleEscape = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [productId, onClose]);

  const derived = useMemo(() => {
    if (!product) return null;
    const metrics = product.brandMetrics;
    const visits = getMonthlyVisits(metrics);
    const revenue = getRevenueMetric(metrics);
    const competitors = normalizeCompetitors(metrics);
    const competitorSeries = buildCompetitorSeries(competitors);

    return {
      visitHistory: normalizeVisitHistory(metrics),
      visitCountries: normalizeTrafficCountries(metrics),
      revenueRange: getRevenueRange(metrics),
      technologies: normalizeTechnologies(metrics),
      competitors,
      competitorSeries,
      revenue,
      visits,
    };
  }, [product]);

  return (
    <div className="fixed inset-0 z-[90] flex flex-col items-center justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200" onClick={onClose} />

      <div 
        className="peer group absolute top-0 inset-x-0 h-16 sm:h-20 z-10 flex items-start pt-3 justify-center cursor-pointer"
        onClick={onClose}
      >
        <div className="text-white/90 text-sm font-medium tracking-wide opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/20 px-4 py-1.5 rounded-full backdrop-blur-md">
          esc to close
        </div>
      </div>

      <div 
        className="bg-[#fffaf6] w-[100vw] sm:w-[calc(100vw-32px)] h-[calc(100vh-56px)] sm:h-[calc(100vh-72px)] rounded-t-[24px] sm:rounded-t-[32px] shadow-[0_-10px_50px_rgba(0,0,0,0.2)] overflow-hidden flex flex-col z-20 animate-in slide-in-from-bottom duration-200 ease-out transition-transform peer-hover:translate-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin w-8 h-8 border-4 border-[#ff690c] border-t-transparent rounded-full"></div>
          </div>
        ) : !product || product.error || !derived ? (
          <div className="flex-1 flex flex-col items-center justify-center text-[#8a7668]">
            <p className="text-xl font-bold text-[#24170f] mb-2">Error</p>
            <p>Could not load product details.</p>
            <button onClick={onClose} className="mt-4 px-6 py-2 bg-[#ff690c] text-white rounded-lg">Close</button>
          </div>
        ) : (
          <>
            <div className="bg-white px-5 py-4 sm:px-8 sm:py-5 flex flex-col justify-end relative overflow-hidden flex-shrink-0 border-b border-[#f1ded1]">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <Package className="w-64 h-64 text-[#ff690c]" />
              </div>
              <div className="relative z-10 flex items-center gap-4 sm:gap-6">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#fffaf6] border border-[#f1ded1] flex items-center justify-center p-2">
                  {product.image ? (
                    <img src={previewAssetUrl(absoluteAssetUrl(product.image, product.url), `${product.title || "product"}-header`)} alt={product.title || "Product"} className="w-full h-full object-contain rounded-xl" />
                  ) : (
                    <Package className="w-8 h-8 text-[#ff690c]" />
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="text-xl sm:text-3xl font-black text-[#24170f] tracking-tight leading-tight max-w-2xl truncate">{product.title || "Product Details"}</h2>
                  <a href={product.url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-[#8a7668] hover:text-[#ff690c] transition-colors text-sm font-medium mt-2 w-max bg-[#fffaf6] border border-[#f1ded1] px-3 py-1 rounded-full">
                    <ExternalLink className="w-4 h-4" />
                    Visit Source Website
                  </a>
                </div>
              </div>
            </div>

            <div className="bg-[#fffaf6] px-5 sm:px-8 flex gap-4 sm:gap-8 border-b border-[#f1ded1] flex-shrink-0">
              {["Overview", "Variants", "Assets", "Competitors", "Activity"].map((tab) => (
                <button 
                  key={tab} 
                  onClick={() => setActiveTab(tab)}
                  className={`py-3 sm:py-4 text-xs sm:text-sm font-bold border-b-2 transition-colors ${activeTab === tab ? "border-[#ff690c] text-[#ff690c]" : "border-transparent text-[#8a7668] hover:text-[#24170f]"}`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="p-4 sm:p-6 flex-1 bg-[#fffaf6] text-[#24170f] overflow-hidden flex flex-col">
              <div className="w-full h-full flex flex-col">
                {activeTab === "Overview" && (
                  <div className="flex-1 flex flex-col gap-4 sm:gap-5 overflow-hidden">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 flex-shrink-0">
                      <div className="bg-white p-4 rounded-2xl border border-[#f1ded1] shadow-sm flex flex-col justify-between">
                        <p className="text-xs font-bold text-[#8a7668] uppercase tracking-wider mb-2">Current Price</p>
                        <div className="flex items-end gap-2">
                          <p className="text-3xl font-black text-[#24170f]">{product.currentPrice ? `${product.currentPrice}` : "—"}</p>
                          <p className="text-xl font-bold text-[#ff690c] mb-1">{product.currency || "€"}</p>
                        </div>
                      </div>
                      <div className="bg-white p-4 rounded-2xl border border-[#f1ded1] shadow-sm flex flex-col justify-between">
                        <p className="text-xs font-bold text-[#8a7668] uppercase tracking-wider mb-2">Stock Status</p>
                        {product.stockStatus ? (
                          <span className={`inline-flex w-max items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold ${product.stockStatus === "In Stock" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                            <div className={`w-2 h-2 rounded-full ${product.stockStatus === "In Stock" ? "bg-green-500" : "bg-red-500"}`}></div>
                            {product.stockStatus}
                          </span>
                        ) : <span className="text-[#a99485] font-medium">Unknown</span>}
                      </div>
                      <div className="bg-white p-4 rounded-2xl border border-[#f1ded1] shadow-sm flex flex-col justify-between relative overflow-hidden">
                        <p className="text-xs font-bold text-[#8a7668] uppercase tracking-wider mb-2">Niche / Category</p>
                        <p className="text-2xl font-black text-[#24170f] truncate">{metricText(product.brandMetrics, ["niche", "category", "industry"], "—")}</p>
                        <p className="text-xs text-[#a99485] mt-2 truncate">Targeting: {metricText(product.brandMetrics, ["target_persona", "targetPersona", "audience"], "Unknown")}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 flex-1 min-h-0 overflow-hidden">
                      <div className="lg:col-span-2 h-full min-h-0">
                        {derived.visitHistory ? (
                          <VisitHistoryChart
                            data={derived.visitHistory}
                            totalVisits={derived.visits}
                            countries={derived.visitCountries}
                            className="h-full min-h-[330px]"
                          />
                        ) : (
                          <TrafficSnapshotPanel
                            visits={derived.visits}
                            revenue={derived.revenue}
                            revenueRange={derived.revenueRange}
                            countries={derived.visitCountries}
                            currency={product.currency || "USD"}
                            metrics={product.brandMetrics}
                          />
                        )}
                      </div>

                      <div className="lg:col-span-1 h-full flex flex-col gap-3 sm:gap-4 overflow-hidden">
                        <ProductPhotoCard product={product} onOpenAssets={() => setActiveTab("Assets")} />
                        <div className="bg-white rounded-2xl border border-[#f1ded1] shadow-sm flex-[0.65] flex flex-col p-4 sm:p-5 overflow-hidden min-h-[128px] max-h-[166px]">
                          <h3 className="text-sm font-bold text-[#24170f] uppercase tracking-wider flex items-center gap-3 mb-3 flex-shrink-0"><AlignLeft className="w-5 h-5 text-[#ff690c]" />Description</h3>
                          <p className="text-[#5b4638] text-sm leading-relaxed p-4 bg-[#fffaf6] rounded-xl border border-[#f1ded1] flex-1 overflow-hidden line-clamp-[3]">{product.description || "No description available for this product."}</p>
                        </div>
                        <div className="bg-white p-4 rounded-2xl border border-[#f1ded1] shadow-sm flex-shrink-0 overflow-hidden">
                          <h3 className="text-sm font-bold text-[#24170f] uppercase tracking-wider mb-3">Product Info</h3>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center pb-2 border-b border-[#f1ded1]"><span className="text-[#8a7668] text-sm font-medium flex items-center gap-2"><Tag className="w-4 h-4" /> Brand</span><span className="font-bold text-[#24170f]">{product.brand || "N/A"}</span></div>
                            <div className="flex justify-between items-center pb-2 border-b border-[#f1ded1]"><span className="text-[#8a7668] text-sm font-medium flex items-center gap-2"><Hash className="w-4 h-4" /> SKU</span><span className="font-bold text-[#24170f] truncate max-w-[150px] text-right">{product.sku || "N/A"}</span></div>
                            <div className="flex justify-between items-center"><span className="text-[#8a7668] text-sm font-medium flex items-center gap-2"><Star className="w-4 h-4" /> Rating</span>{product.rating ? <div className="flex items-center gap-2"><span className="font-bold text-[#ff690c]">{product.rating}</span><span className="text-xs text-[#8a7668]">({product.reviewsCount})</span></div> : <span className="text-[#a99485] text-sm font-medium">No rating</span>}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "Variants" && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 h-full overflow-hidden">
                    <VariantsBundlesPanel product={product} />
                    <BundleWidgetPreview product={product} />
                  </div>
                )}

                {activeTab === "Assets" && (
                  <ProductAssetsPanel product={product} />
                )}

                {activeTab === "Competitors" && (
                  derived.competitorSeries.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 h-full overflow-hidden">
                      <div className="lg:col-span-2 h-full min-h-0">
                        <CompetitorRevenueChart series={derived.competitorSeries} currency={product.currency || "USD"} />
                      </div>
                      <div className="space-y-4 overflow-hidden">
                        <div className="bg-white p-5 rounded-2xl border border-[#f1ded1] shadow-sm">
                          <h3 className="text-sm font-bold text-[#24170f] uppercase tracking-wider mb-3 flex items-center gap-2"><Globe2 className="w-4 h-4 text-[#ff690c]" />Competitor Stack</h3>
                          <div className="flex flex-wrap gap-2">{derived.technologies.length ? derived.technologies.map((tech) => <span key={tech} className="px-2.5 py-1 bg-[#fffaf6] border border-[#f1ded1] rounded-md text-xs font-semibold text-[#5b4638]">{tech}</span>) : <span className="text-xs text-[#a99485]">No tech stack data available.</span>}</div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-[#f1ded1] shadow-sm">
                          <h3 className="text-sm font-bold text-[#24170f] uppercase tracking-wider mb-3 flex items-center gap-2"><Users className="w-4 h-4 text-[#ff690c]" />Similar shops</h3>
                          <div className="space-y-2">
                            {derived.competitors.length ? derived.competitors.slice(0, 4).map((item, index) => (
                              <div key={index} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#fffaf6] border border-[#f1ded1]">
                                <div className="min-w-0">
                                  <p className="font-bold text-sm text-[#24170f] truncate">{competitorName(item)}</p>
                                  <p className="text-xs text-[#8a7668] truncate">{competitorDomain(item)}</p>
                                </div>
                                <span className="text-xs font-black text-[#ff690c] whitespace-nowrap">{formatMoney(competitorRevenue(item), product.currency || "USD")}</span>
                              </div>
                            )) : <span className="text-xs text-[#a99485]">No similar shops from BrandSearch yet.</span>}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-white p-4 rounded-2xl border border-[#f1ded1] shadow-sm"><DollarSign className="w-4 h-4 text-[#ff690c] mb-2" /><p className="text-xs font-bold text-[#8a7668] uppercase">Revenue</p><p className="text-xl font-black text-[#24170f]">{formatMoneyRange(derived.revenueRange.min, derived.revenueRange.max, product.currency || "USD")}</p></div>
                          <div className="bg-white p-4 rounded-2xl border border-[#f1ded1] shadow-sm"><ActivityIcon className="w-4 h-4 text-[#ff690c] mb-2" /><p className="text-xs font-bold text-[#8a7668] uppercase">Visits</p><p className="text-xl font-black text-[#24170f]">{formatCompact(derived.visits)}</p></div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <CompetitorSnapshotPanel
                      competitors={derived.competitors}
                      technologies={derived.technologies}
                      revenue={derived.revenue}
                      revenueRange={derived.revenueRange}
                      visits={derived.visits}
                      currency={product.currency || "USD"}
                    />
                  )
                )}

                {activeTab === "Activity" && (
                  <div className="bg-white p-5 rounded-2xl border border-[#f1ded1] shadow-sm h-full overflow-hidden">
                    <h3 className="text-sm font-bold text-[#24170f] uppercase tracking-wider mb-6">Scraping History</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pr-1">
                      {(product.scrapingJobs?.length || 0) > 0 ? product.scrapingJobs!.map((job) => (
                        <div key={job.id} className="px-5 py-4 flex items-center justify-between bg-[#fffaf6] rounded-xl border border-[#f1ded1]">
                          <div><p className="text-sm font-semibold text-[#5b4638]">{new Date(job.createdAt).toLocaleDateString()} at {new Date(job.createdAt).toLocaleTimeString()}</p><p className="text-xs text-[#a99485]">{job.durationMs ? `${job.durationMs}ms` : job.source || "manual"}</p></div>
                          <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${job.status === "SUCCESS" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}><CheckCircle2 className="w-3 h-3" />{job.status}</span>
                        </div>
                      )) : <div className="py-12 text-center text-[#8a7668] bg-[#fffaf6] rounded-xl border border-[#f1ded1] border-dashed">No scraping history yet.</div>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
