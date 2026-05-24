"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ExternalLink, Package, Tag, Hash, Star, AlignLeft, BarChart3, Globe2, Users, DollarSign, Activity as ActivityIcon, Download, Images, FileDown } from "lucide-react";
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

type ProductCatalogItem = {
  title?: string;
  handle?: string;
  url?: string;
  image?: string;
  price?: number | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  compareAtPrice?: number | null;
  currency?: string | null;
  available?: boolean | null;
  vendor?: string | null;
  productType?: string | null;
  variantsCount?: number | null;
  variantsAvailable?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  publishedAt?: string | null;
  source?: string;
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
  productCatalog?: ProductCatalogItem[] | null;
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

function productCatalogToCsv(products: ProductCatalogItem[]) {
  const rows = [["title", "price", "compare_at_price", "currency", "available", "vendor", "type", "variants", "url", "image", "source"]];
  products.forEach((item) => rows.push([
    item.title || "",
    item.price?.toString() || "",
    item.compareAtPrice?.toString() || "",
    item.currency || "",
    item.available === null || item.available === undefined ? "" : item.available ? "true" : "false",
    item.vendor || "",
    item.productType || "",
    item.variantsCount?.toString() || "",
    item.url || "",
    item.image || "",
    item.source || "",
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

async function downloadAllAssets(media: ProductMedia[], title?: string | null) {
  const safeTitle = (title || "product").replace(/[^a-z0-9._-]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 42) || "product";
  for (const [index, item] of media.entries()) {
    const anchor = document.createElement("a");
    anchor.href = downloadAssetUrl(item.url, `${safeTitle}-${String(index + 1).padStart(2, "0")}`);
    anchor.download = "";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    await new Promise((resolve) => window.setTimeout(resolve, 160));
  }
}

function sourceLabel(value?: string) {
  if (!value || value === "primary") return "image";
  return value.replace(/^shopify-/, "shopify ").replace(/-/g, " ");
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
  const raw = product.productMedia?.length ? product.productMedia : product.image ? [{ url: product.image, alt: product.title || "Product image", source: "image", type: "image" }] : [];
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
  const [brokenUrls, setBrokenUrls] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setBrokenUrls(new Set());
  }, [product.url]);

  const markBroken = (url?: string) => {
    if (!url) return;
    setBrokenUrls((current) => {
      if (current.has(url)) return current;
      const next = new Set(current);
      next.add(url);
      return next;
    });
  };
  const media = productMediaItems(product).filter((item) => !brokenUrls.has(item.url));
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
            <img src={previewAssetUrl(item.url, `${product.title || "product"}-overview-${index + 1}`)} alt={item.alt || product.title || `Product ${index + 1}`} onError={() => markBroken(item.url)} className="h-full w-full object-cover" />
            {index === visibleThumbs.length - 1 && extraCount > 0 && <span className="absolute inset-0 bg-[#24170f]/55 text-white text-xs font-black flex items-center justify-center">+{extraCount}</span>}
          </div>
        )) : (
          <div className="col-span-4 text-center text-[#8a7668] self-center">
            <Package className="w-9 h-9 mx-auto mb-2 text-[#ff690c] opacity-60" />
            <p className="text-sm font-bold text-[#24170f]">No product image</p>
          </div>
        )}
      </button>
    </div>
  );
}

function CatalogThumbnail({ item, index }: { item: ProductCatalogItem; index: number }) {
  const [broken, setBroken] = useState(false);

  if (!item.image || broken) {
    return <span className="h-8 w-8 rounded-lg border border-[#f1ded1] bg-white flex-shrink-0" />;
  }

  return (
    <img
      src={previewAssetUrl(item.image, `${item.title || "catalog"}-${index}`)}
      alt=""
      onError={() => setBroken(true)}
      className="h-8 w-8 rounded-lg object-cover border border-[#f1ded1] bg-white flex-shrink-0"
    />
  );
}

function ProductAssetsPanel({ product }: { product: ProductDetails }) {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [brokenUrls, setBrokenUrls] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setFocusedIndex(0);
    setBrokenUrls(new Set());
  }, [product.url]);

  const media = productMediaItems(product).filter((item) => !brokenUrls.has(item.url));
  const markBroken = (url?: string) => {
    if (!url) return;
    setBrokenUrls((current) => {
      if (current.has(url)) return current;
      const next = new Set(current);
      next.add(url);
      return next;
    });
  };
  const focusedMedia = media[Math.min(focusedIndex, Math.max(media.length - 1, 0))];
  const visibleMedia = media.slice(0, 12);
  const hiddenMediaCount = Math.max(0, media.length - visibleMedia.length);
  const catalog = product.productCatalog || [];
  const catalogCsv = productCatalogToCsv(catalog);
  const hasMedia = media.length > 0;
  const hasCatalog = catalog.length > 0;

  if (!hasMedia && !hasCatalog) {
    return (
      <div className="h-full rounded-2xl border border-dashed border-[#f1ded1] bg-white p-8 text-center shadow-sm flex flex-col items-center justify-center">
        <Images className="w-10 h-10 text-[#ff690c] mb-3" />
        <h3 className="text-lg font-black text-[#24170f]">No assets returned</h3>
        <p className="mt-2 max-w-md text-sm text-[#8a7668]">
          The scraper did not return product media or a Shopify catalog for this URL yet. Run a fresh check to retry extraction.
        </p>
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 ${hasMedia && hasCatalog ? "lg:grid-cols-5" : ""} gap-4 sm:gap-5 h-full overflow-hidden`}>
      {hasMedia && (
        <div className={`${hasCatalog ? "lg:col-span-3" : ""} bg-white p-5 rounded-2xl border border-[#f1ded1] shadow-sm h-full overflow-hidden flex flex-col`.trim()}>
          <div className="flex items-start justify-between gap-3 mb-4 flex-shrink-0">
            <div>
              <h3 className="text-sm font-bold text-[#24170f] uppercase tracking-wider flex items-center gap-2"><Images className="w-4 h-4 text-[#ff690c]" />Product images</h3>
              <p className="text-sm text-[#8a7668] mt-2">Download scraped product media. No generated assets.</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button type="button" onClick={() => downloadAllAssets(media, product.title)} className="inline-flex items-center gap-1.5 rounded-full border border-[#f1ded1] bg-[#fffaf6] px-3 py-1.5 text-xs font-black text-[#24170f] hover:text-[#ff690c] transition-colors">
                <Download className="w-3.5 h-3.5" />Download all
              </button>
              <span className="text-xs font-black text-[#ff690c] bg-[#fffaf6] border border-[#f1ded1] rounded-full px-3 py-1">{media.length} files</span>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-5 gap-3 flex-1 min-h-0 overflow-hidden">
            <div className="xl:col-span-3 min-h-0 rounded-xl border border-[#f1ded1] bg-[#fffaf6] p-3 overflow-hidden flex flex-col">
              <button type="button" onClick={() => focusedMedia && window.open(previewAssetUrl(focusedMedia.url, `${product.title || "product"}-preview`), "_blank", "noopener,noreferrer")} className="group relative flex-1 min-h-0 rounded-lg bg-white border border-[#f1ded1] overflow-hidden flex items-center justify-center cursor-zoom-in">
                {focusedMedia ? (
                  <img src={previewAssetUrl(focusedMedia.url, `${product.title || "product"}-preview`)} alt={focusedMedia.alt || "Focused product media"} onError={() => markBroken(focusedMedia.url)} className="h-full w-full object-contain transition-transform duration-200 group-hover:scale-[1.025]" />
                ) : null}
                <span className="absolute left-3 top-3 rounded-full bg-white/90 border border-[#f1ded1] px-3 py-1 text-[11px] font-black text-[#24170f] shadow-sm">Click to open</span>
              </button>
              <div className="mt-3 flex items-center justify-between gap-3 flex-shrink-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-[#24170f]">{focusedMedia?.alt || product.title || "Product image"}</p>
                  <p className="truncate text-xs font-bold text-[#8a7668]">{sourceLabel(focusedMedia?.source || focusedMedia?.type)}</p>
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
                  <button key={`${item.url}-${index}`} type="button" onClick={() => setFocusedIndex(index)} aria-label={`Preview product image ${index + 1}`} className={`rounded-xl border p-1.5 overflow-hidden text-left transition-all ${active ? "border-[#ff690c] bg-white shadow-[0_0_0_2px_rgba(255,105,12,0.12)]" : "border-[#f1ded1] bg-[#fffaf6] hover:border-[#ff690c]/70"}`}>
                    <div className="aspect-square rounded-lg bg-white border border-[#f1ded1] overflow-hidden flex items-center justify-center">
                      <img src={previewAssetUrl(item.url, `${product.title || "product"}-${index + 1}`)} alt={item.alt || `Product media ${index + 1}`} onError={() => markBroken(item.url)} className="h-full w-full object-cover" />
                    </div>
                    <p className="mt-1 min-w-0 truncate text-[10px] font-bold text-[#8a7668]">{sourceLabel(item.source || item.type)}</p>
                  </button>
                );
              })}
              {hiddenMediaCount > 0 && (
                <div className="rounded-xl border border-[#f1ded1] bg-[#fffaf6] p-3 text-xs font-black text-[#8a7668] flex items-center justify-center">+{hiddenMediaCount} more</div>
              )}
            </div>
          </div>
        </div>
      )}

      {hasCatalog && (
        <div className={`${hasMedia ? "lg:col-span-2" : ""} bg-white p-5 rounded-2xl border border-[#f1ded1] shadow-sm h-full overflow-hidden flex flex-col`.trim()}>
          <div className="flex items-start justify-between gap-3 mb-4 flex-shrink-0">
            <div>
              <h3 className="text-sm font-bold text-[#24170f] uppercase tracking-wider flex items-center gap-2"><Package className="w-4 h-4 text-[#ff690c]" />Products table</h3>
              <p className="text-sm text-[#8a7668] mt-2">Real Shopify catalog from /products.json.</p>
            </div>
            <span className="text-xs font-black text-[#ff690c] bg-[#fffaf6] border border-[#f1ded1] rounded-full px-3 py-1">{catalog.length}</span>
          </div>

          <div className="flex gap-2 flex-shrink-0 mb-4">
            <button onClick={() => downloadTextFile(`${product.title || "shopify"}-products.csv`, catalogCsv, "text/csv")} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[#f1ded1] bg-[#fffaf6] text-[#24170f] text-xs font-black hover:text-[#ff690c] transition-colors">
              <FileDown className="w-3.5 h-3.5" />Export CSV
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-hidden rounded-xl border border-[#f1ded1] bg-[#fffaf6]">
            <div className="grid grid-cols-[minmax(0,1fr)_86px_64px] gap-2 border-b border-[#f1ded1] px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-[#a99485]">
              <span>Product</span><span>Price</span><span>Stock</span>
            </div>
            <div className="divide-y divide-[#f1ded1]">
              {catalog.slice(0, 8).map((item, index) => (
                <a key={`${item.url || item.handle || item.title}-${index}`} href={item.url || undefined} target="_blank" rel="noreferrer" className="grid grid-cols-[minmax(0,1fr)_86px_64px] gap-2 px-3 py-2 hover:bg-white transition-colors">
                  <span className="min-w-0 flex items-center gap-2">
                    <CatalogThumbnail item={item} index={index} />
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-black text-[#24170f]">{item.title || "Untitled product"}</span>
                      <span className="block truncate text-[10px] font-bold text-[#8a7668]">{item.vendor || item.productType || item.handle || "Shopify"}</span>
                    </span>
                  </span>
                  <span className="self-center text-xs font-black text-[#24170f] truncate">{item.price !== null && item.price !== undefined ? formatMoney(item.price, item.currency || product.currency || "USD") : "—"}</span>
                  <span className={`self-center text-[10px] font-black ${item.available === false ? "text-[#8a7668]" : "text-[#ff690c]"}`}>{item.available === false ? "Out" : item.available === true ? "In" : "—"}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
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
  const hasRevenue = revenue !== undefined || revenueRange.min !== undefined || revenueRange.max !== undefined;
  const trafficMetrics = [
    visits !== undefined ? { label: "Monthly visits", value: formatCompact(visits), strong: true } : null,
    hasRevenue ? { label: "Revenue", value: revenueRange.min !== undefined || revenueRange.max !== undefined ? formatMoneyRange(revenueRange.min, revenueRange.max, currency) : formatMoney(revenue, currency) } : null,
    rank !== undefined ? { label: "Rank", value: `#${formatCompact(rank)}` } : null,
    growth !== undefined ? { label: "30d", value: `${growth > 0 ? "+" : ""}${growth.toFixed(1)}%` } : null,
    bounceRate !== undefined ? { label: "Bounce", value: `${(bounceRate <= 1 ? bounceRate * 100 : bounceRate).toFixed(0)}%` } : null,
    pagesPerVisit !== undefined ? { label: "Pages", value: pagesPerVisit.toFixed(1) } : null,
    visitDuration !== undefined ? { label: "Duration", value: `${Math.round(visitDuration)}s` } : null,
    productCount !== undefined ? { label: "Products", value: formatCompact(productCount) } : null,
  ].filter((metric): metric is { label: string; value: string; strong?: boolean } => metric !== null);
  const hasSignals = trafficMetrics.length > 0 || countries.length > 0;

  if (!hasSignals) return null;

  const metricGrid = trafficMetrics.length <= 2 ? "grid-cols-1 sm:grid-cols-2" : trafficMetrics.length <= 4 ? "grid-cols-2" : "grid-cols-2 xl:grid-cols-4";
  const panelHeightClass = countries.length > 0 ? "h-full min-h-[220px]" : "";

  return (
    <div className={`${panelHeightClass} rounded-2xl border border-[#f1ded1] bg-white p-5 shadow-sm overflow-hidden flex flex-col`.trim()}>
      <div className="flex items-start justify-between gap-3 flex-shrink-0">
        <div>
          <h3 className="text-sm font-black text-[#24170f] uppercase tracking-[0.12em] flex items-center gap-2"><BarChart3 className="w-4 h-4 text-[#ff690c]" />Traffic snapshot</h3>
          <p className="mt-1 text-sm text-[#8a7668]">Latest BrandSearch signals returned for this brand.</p>
        </div>
        <span className="rounded-full border border-[#f1ded1] bg-[#fffaf6] px-3 py-1 text-xs font-bold text-[#8a7668]">BrandSearch</span>
      </div>

      {trafficMetrics.length > 0 && (
        <div className={`mt-4 grid ${metricGrid} gap-3 flex-shrink-0`}>
          {trafficMetrics.map((metric) => (
            <div key={metric.label} className="rounded-2xl border border-[#f1ded1] bg-[#fffaf6] p-3 min-w-0">
              <p className="text-[10px] uppercase tracking-[0.14em] font-black text-[#a99485] truncate">{metric.label}</p>
              <p className={`${metric.strong ? "text-3xl" : "text-xl"} mt-2 font-black leading-none text-[#24170f] truncate`}>{metric.value}</p>
            </div>
          ))}
        </div>
      )}

      {countries.length > 0 && (
        <div className="mt-4 rounded-2xl border border-[#f1ded1] bg-[#fffaf6] p-4 flex-shrink-0 overflow-hidden">
          <p className="text-[10px] uppercase tracking-[0.14em] font-black text-[#a99485] mb-3">Top countries</p>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-2">
            {countries.slice(0, 4).map((country) => (
              <div key={`${country.label}-${country.share}`} className="flex items-center justify-between gap-3 rounded-xl border border-[#f1ded1] bg-white px-3 py-2">
                <span className="min-w-0 truncate text-sm font-bold text-[#5b4638]"><span className="mr-2">{country.flag || "🌐"}</span>{country.label}</span>
                <span className="text-sm font-black text-[#ff690c]">{Number(country.share).toFixed(country.share % 1 ? 1 : 0)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
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

export function ProductDetailsModal({ productId, onClose }: { productId: string, onClose: () => void }) {
  const [product, setProduct] = useState<ProductDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Overview");
  const [mounted, setMounted] = useState(false);
  const [headerImageBroken, setHeaderImageBroken] = useState(false);

  useEffect(() => {
    setMounted(true);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    setProduct(null);

    fetch(`/api/products/${productId}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data: ProductDetails) => {
        if (!controller.signal.aborted) setProduct(data);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        console.error("Failed to load product details", error);
        setProduct({ url: "", error: "Could not load product details." });
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [productId]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  useEffect(() => {
    setHeaderImageBroken(false);
  }, [productId, product?.image]);

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

  const hasMarketData = Boolean(derived && (derived.competitors.length > 0 || derived.competitorSeries.length > 0 || derived.technologies.length > 0));
  const overviewNiche = product ? metricText(product.brandMetrics, ["niche", "category", "industry"], "") : "";
  const overviewAudience = product ? metricText(product.brandMetrics, ["target_persona", "targetPersona", "audience"], "") : "";
  const hasPrice = product?.currentPrice !== null && product?.currentPrice !== undefined;
  const hasStock = Boolean(product?.stockStatus);
  const hasTopOverview = Boolean(hasPrice || hasStock || overviewNiche || overviewAudience);
  const hasOverviewMedia = Boolean(product && productMediaItems(product).length > 0);
  const hasOverviewDescription = Boolean(product?.description?.trim());
  const hasProductInfo = Boolean(product?.brand || product?.sku || product?.rating || product?.reviewsCount);
  const hasTrafficData = Boolean(derived && (derived.visitHistory || derived.visits !== undefined || derived.revenue !== undefined || derived.revenueRange.min !== undefined || derived.revenueRange.max !== undefined || derived.visitCountries.length > 0));
  const availableTabs = useMemo(() => [
    "Overview",
    "Assets",
    ...(hasMarketData ? ["Market"] : []),
  ], [hasMarketData]);

  useEffect(() => {
    if (!availableTabs.includes(activeTab)) setActiveTab("Overview");
  }, [activeTab, availableTabs]);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-end isolate">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200" onClick={onClose} />

      <div 
        className="group absolute top-0 inset-x-0 h-20 sm:h-24 z-10 flex items-start pt-3 justify-center cursor-pointer"
        onClick={onClose}
      >
        <div className="text-white/90 text-sm font-medium tracking-wide opacity-80 group-hover:opacity-100 transition-opacity duration-200 bg-black/20 px-4 py-1.5 rounded-full backdrop-blur-md">
          Esc to close
        </div>
      </div>

      <div 
        className="bg-[#fffaf6] w-[100vw] sm:w-[calc(100vw-32px)] h-[calc(100dvh-76px)] sm:h-[calc(100dvh-96px)] max-h-[900px] rounded-t-[24px] sm:rounded-t-[32px] shadow-[0_-10px_50px_rgba(0,0,0,0.2)] overflow-hidden flex flex-col z-20 animate-in slide-in-from-bottom duration-200 ease-out"
        role="dialog"
        aria-modal="true"
        aria-label="Product details"
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
                  {product.image && !headerImageBroken ? (
                    <img src={previewAssetUrl(absoluteAssetUrl(product.image, product.url), `${product.title || "product"}-header`)} alt={product.title || "Product"} onError={() => setHeaderImageBroken(true)} className="w-full h-full object-contain rounded-xl" />
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
              {availableTabs.map((tab) => (
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
                    {hasTopOverview && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 flex-shrink-0">
                        {hasPrice && (
                          <div className="bg-white p-4 rounded-2xl border border-[#f1ded1] shadow-sm flex flex-col justify-between">
                            <p className="text-xs font-bold text-[#8a7668] uppercase tracking-wider mb-2">Current Price</p>
                            <div className="flex items-end gap-2">
                              <p className="text-3xl font-black text-[#24170f]">{product.currentPrice}</p>
                              {product.currency && <p className="text-xl font-bold text-[#ff690c] mb-1">{product.currency}</p>}
                            </div>
                          </div>
                        )}
                        {hasStock && (
                          <div className="bg-white p-4 rounded-2xl border border-[#f1ded1] shadow-sm flex flex-col justify-between">
                            <p className="text-xs font-bold text-[#8a7668] uppercase tracking-wider mb-2">Stock Status</p>
                            <span className={`inline-flex w-max items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold ${product.stockStatus === "In Stock" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                              <div className={`w-2 h-2 rounded-full ${product.stockStatus === "In Stock" ? "bg-green-500" : "bg-red-500"}`}></div>
                              {product.stockStatus}
                            </span>
                          </div>
                        )}
                        {(overviewNiche || overviewAudience) && (
                          <div className="bg-white p-4 rounded-2xl border border-[#f1ded1] shadow-sm flex flex-col justify-between relative overflow-hidden">
                            <p className="text-xs font-bold text-[#8a7668] uppercase tracking-wider mb-2">Niche / Category</p>
                            {overviewNiche && <p className="text-2xl font-black text-[#24170f] truncate">{overviewNiche}</p>}
                            {overviewAudience && <p className="text-xs text-[#a99485] mt-2 truncate">Targeting: {overviewAudience}</p>}
                          </div>
                        )}
                      </div>
                    )}

                    <div className={`grid grid-cols-1 ${hasTrafficData && (hasOverviewMedia || hasOverviewDescription || hasProductInfo) ? "lg:grid-cols-3" : ""} gap-4 sm:gap-5 flex-1 min-h-0 overflow-hidden`}>
                      {hasTrafficData && (
                        <div className={`${hasOverviewMedia || hasOverviewDescription || hasProductInfo ? "lg:col-span-2" : ""} min-h-0`.trim()}>
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
                      )}

                      {(hasOverviewMedia || hasOverviewDescription || hasProductInfo) && (
                        <div className={`${hasTrafficData ? "lg:col-span-1" : ""} h-full flex flex-col gap-3 sm:gap-4 overflow-hidden`.trim()}>
                          {hasOverviewMedia && <ProductPhotoCard product={product} onOpenAssets={() => setActiveTab("Assets")} />}
                          {hasOverviewDescription && (
                            <div className="bg-white rounded-2xl border border-[#f1ded1] shadow-sm flex-[0.65] flex flex-col p-4 sm:p-5 overflow-hidden min-h-[128px] max-h-[166px]">
                              <h3 className="text-sm font-bold text-[#24170f] uppercase tracking-wider flex items-center gap-3 mb-3 flex-shrink-0"><AlignLeft className="w-5 h-5 text-[#ff690c]" />Description</h3>
                              <p className="text-[#5b4638] text-sm leading-relaxed p-4 bg-[#fffaf6] rounded-xl border border-[#f1ded1] flex-1 overflow-hidden line-clamp-[3]">{product.description}</p>
                            </div>
                          )}
                          {hasProductInfo && (
                            <div className="bg-white p-4 rounded-2xl border border-[#f1ded1] shadow-sm flex-shrink-0 overflow-hidden">
                              <h3 className="text-sm font-bold text-[#24170f] uppercase tracking-wider mb-3">Product Info</h3>
                              <div className="space-y-2">
                                {product.brand && <div className="flex justify-between items-center pb-2 border-b border-[#f1ded1]"><span className="text-[#8a7668] text-sm font-medium flex items-center gap-2"><Tag className="w-4 h-4" /> Brand</span><span className="font-bold text-[#24170f]">{product.brand}</span></div>}
                                {product.sku && <div className="flex justify-between items-center pb-2 border-b border-[#f1ded1]"><span className="text-[#8a7668] text-sm font-medium flex items-center gap-2"><Hash className="w-4 h-4" /> SKU</span><span className="font-bold text-[#24170f] truncate max-w-[150px] text-right">{product.sku}</span></div>}
                                {product.rating && <div className="flex justify-between items-center"><span className="text-[#8a7668] text-sm font-medium flex items-center gap-2"><Star className="w-4 h-4" /> Rating</span><div className="flex items-center gap-2"><span className="font-bold text-[#ff690c]">{product.rating}</span>{product.reviewsCount ? <span className="text-xs text-[#8a7668]">({product.reviewsCount})</span> : null}</div></div>}
                                {!product.rating && product.reviewsCount ? <div className="flex justify-between items-center"><span className="text-[#8a7668] text-sm font-medium flex items-center gap-2"><Star className="w-4 h-4" /> Reviews</span><span className="font-bold text-[#ff690c]">{product.reviewsCount}</span></div> : null}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === "Assets" && (
                  <ProductAssetsPanel product={product} />
                )}

                {activeTab === "Market" && (
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

              </div>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
