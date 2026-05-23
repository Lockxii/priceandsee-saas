type JsonRecord = Record<string, unknown>;

type SanitizeOptions = {
  dropHistory?: boolean;
};

const BRANDSEARCH_BASE_URL = "https://api.brandsearch.co";
const BRANDSEARCH_BRAND_FIELDS = [
  "id",
  "name",
  "domain",
  "title",
  "description",
  "status",
  "platform",
  "rank",
  "monthly_visits",
  "visit_trends",
  "visit_history",
  "visits_history",
  "traffic_history",
  "monthly_visits_data",
  "traffic_data.monthly_visits_data",
  "traffic_data.engagements",
  "traffic_data.top_country_shares",
  "traffic_data.top2_country_shares",
  "traffic_data.top1_country_shares",
  "traffic_data.country_shares",
  "traffic_data",
  "bounce_rate",
  "pages_per_visit",
  "visit_duration",
  "product_count",
  "variant_count",
  "avg_price_usd",
  "min_price_usd",
  "max_price_usd",
  "currency_code",
  "country_code",
  "ships_to_countries",
  "niche",
  "target_persona",
  "keywords",
  "tags",
  "technologies",
  "apps",
  "theme",
  "theme_style",
  "theme_vendor",
  "shopify_theme",
  "min_revenue",
  "max_revenue",
  "min_revenue_estimate_1p",
  "min_revenue_estimate_1p_corrected",
  "max_revenue_estimate_5p",
  "max_revenue_estimate_5p_corrected",
  "growth_30d",
  "active_growth_percentage",
  "last_meta_active_count",
  "last_meta_total_count",
  "google_ads_total",
  "instagram_follower_count",
  "tiktok_follower_count",
  "trustpilot_avg_rating",
  "trustpilot_review_count",
  "judgeme_avg_rating",
  "judgeme_review_count",
  "loox_avg_rating",
  "loox_review_count",
  "reviews_io_avg_rating",
  "reviews_io_review_count",
  "yotpo_avg_rating",
  "yotpo_review_count",
  "has_screenshot",
  "screenshot_url",
  "screenshot_desktop_url",
  "screenshot_mobile_url",
  "og_image",
  "dashboard_url",
].join(",");

const BRANDSEARCH_COMPETITOR_FIELDS = [
  "id",
  "name",
  "domain",
  "title",
  "platform",
  "rank",
  "monthly_visits",
  "product_count",
  "avg_price_usd",
  "currency_code",
  "country_code",
  "niche",
  "min_revenue",
  "max_revenue",
  "growth_30d",
  "technologies",
  "last_meta_active_count",
  "last_meta_total_count",
  "dashboard_url",
].join(",");

const HISTORY_KEYS = new Set([
  "visit_trends",
  "visit_history",
  "visitHistory",
  "visits_history",
  "visitsHistory",
  "traffic_history",
  "trafficHistory",
  "monthly_visits_data",
  "monthlyVisitsData",
  "monthly_visits_history",
  "monthlyVisitsHistory",
  "history",
]);

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cleanDomainFromUrl(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return url.replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("/")[0].toLowerCase();
  }
}

function stripProtocol(value: string) {
  return value.trim().replace(/^https?:\/\//i, "").replace(/^\/+/, "");
}

function asString(value: unknown) {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
}

function asNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const number = Number(value.replace(/,/g, ""));
    if (Number.isFinite(number)) return number;
  }
  return undefined;
}

function hasUsefulValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (isRecord(value)) return Object.values(value).some(hasUsefulValue);
  return true;
}

export function sanitizeBrandSearchMetrics(value: unknown, options: SanitizeOptions = {}): JsonRecord | null {
  if (!isRecord(value)) return null;
  const result: JsonRecord = {};
  for (const [key, incoming] of Object.entries(value)) {
    if (options.dropHistory && HISTORY_KEYS.has(key)) continue;
    if (!hasUsefulValue(incoming)) continue;
    if (isRecord(incoming)) {
      const cleanedNested = sanitizeBrandSearchMetrics(incoming, options);
      if (cleanedNested) result[key] = cleanedNested;
      continue;
    }
    result[key] = incoming;
  }
  return Object.keys(result).length ? result : null;
}

export function mergeBrandSearchMetrics(...values: unknown[]): JsonRecord | null {
  const result: JsonRecord = {};
  let hasValue = false;

  for (const value of values) {
    const cleaned = sanitizeBrandSearchMetrics(value);
    if (!cleaned) continue;
    hasValue = true;
    for (const [key, incoming] of Object.entries(cleaned)) {
      const existing = result[key];
      result[key] = isRecord(existing) && isRecord(incoming)
        ? (mergeBrandSearchMetrics(existing, incoming) as JsonRecord)
        : incoming;
    }
  }

  return hasValue ? result : null;
}

async function fetchBrandSearchJson(path: string, apiKey: string) {
  const apiBase = process.env.BRANDSEARCH_API_BASE || BRANDSEARCH_BASE_URL;
  const url = new URL(path, apiBase);

  if (!url.searchParams.has("fields") && !url.pathname.includes("/lookup")) {
    url.searchParams.set("fields", BRANDSEARCH_BRAND_FIELDS);
  }

  const res = await fetch(url, {
    headers: {
      "X-API-Key": apiKey,
      Accept: "application/json",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) return null;
  return await res.json().catch(() => null);
}

function selectBrand(payload: unknown): JsonRecord | null {
  if (!isRecord(payload)) return null;

  const direct = payload.data ?? payload.brand ?? payload;
  if (Array.isArray(direct)) return direct.find(isRecord) || null;

  if (isRecord(direct) && (direct.id || direct.domain || direct.monthly_visits)) return direct;

  for (const key of ["found", "matches"]) {
    const list = payload[key];
    if (Array.isArray(list)) {
      const item = list.find(isRecord);
      if (item) return item;
    }
  }

  const results = payload.results;
  if (Array.isArray(results)) {
    for (const result of results) {
      if (!isRecord(result) || !Array.isArray(result.matches)) continue;
      const item = result.matches.find(isRecord);
      if (item) return item;
    }
  }

  return null;
}

async function fetchBrandByDomain(url: string, domain: string, apiKey: string) {
  const normalizedTarget = stripProtocol(url || domain);
  const searchParams = new URLSearchParams({ fields: BRANDSEARCH_BRAND_FIELDS, page_size: "1", q: domain }).toString();
  const lookupParams = new URLSearchParams({ limit: "1", q: domain, type: "auto" }).toString();
  const candidates = [
    `/v1/brands/by-url/${encodeURIComponent(normalizedTarget)}`,
    `/v1/brands/by-url/${encodeURIComponent(domain)}`,
    `/v1/brands/${encodeURIComponent(domain)}`,
    `/v1/brands?${searchParams}`,
    `/v1/lookup?${lookupParams}`,
  ];

  for (const path of candidates) {
    const brand = selectBrand(await fetchBrandSearchJson(path, apiKey));
    if (!brand) continue;

    const brandId = asString(brand.id) || asString(brand.domain);
    const hasProjectedTraffic = Boolean(
      brand.visit_trends ||
      brand.visit_history ||
      brand.visits_history ||
      brand.traffic_history ||
      brand.monthly_visits_data ||
      brand.traffic_data,
    );

    if (brandId && !hasProjectedTraffic && path.includes("/lookup")) {
      return selectBrand(await fetchBrandSearchJson(`/v1/brands/${encodeURIComponent(brandId)}`, apiKey)) || brand;
    }

    return brand;
  }

  return null;
}

function competitorQueryFor(brand: JsonRecord | null, domain: string) {
  const params = new URLSearchParams({
    page: "1",
    page_size: "8",
    fields: BRANDSEARCH_COMPETITOR_FIELDS,
    sort_by: "monthly_visits",
    sort_order: "desc",
  });

  const niche = asString(brand?.niche);
  if (niche) params.set("niche", niche);

  const country = asString(brand?.country_code);
  if (country) params.set("country_code", country);

  const minRevenue = asNumber(brand?.min_revenue) ?? asNumber(brand?.min_revenue_estimate_1p_corrected) ?? asNumber(brand?.min_revenue_estimate_1p);
  const maxRevenue = asNumber(brand?.max_revenue) ?? asNumber(brand?.max_revenue_estimate_5p_corrected) ?? asNumber(brand?.max_revenue_estimate_5p);
  if (minRevenue !== undefined || maxRevenue !== undefined) {
    const low = minRevenue ?? maxRevenue ?? 0;
    const high = maxRevenue ?? minRevenue ?? low;
    params.set("max_revenue_min", String(Math.max(0, Math.floor(low * 0.45))));
    params.set("min_revenue_max", String(Math.ceil(high * 1.75)));
  } else {
    const visits = asNumber(brand?.monthly_visits);
    if (visits !== undefined) {
      params.set("monthly_visits_min", String(Math.max(0, Math.floor(visits * 0.25))));
      params.set("monthly_visits_max", String(Math.ceil(visits * 4)));
    }
  }

  return { domain, params };
}

async function fetchSimilarBrands(brand: JsonRecord | null, domain: string, apiKey: string) {
  if (!brand) return [] as JsonRecord[];
  const { params } = competitorQueryFor(brand, domain);
  const payload = await fetchBrandSearchJson(`/v1/brands?${params}`, apiKey);
  const rows = isRecord(payload) && Array.isArray(payload.data) ? payload.data.filter(isRecord) : [];
  return rows
    .filter((item) => asString(item.id)?.toLowerCase() !== domain)
    .slice(0, 6)
    .map((item) => ({
      ...item,
      domain: asString(item.domain) || asString(item.id) || asString(item.url),
      revenue: asNumber(item.max_revenue) ?? asNumber(item.min_revenue),
      monthly_revenue: asNumber(item.max_revenue) ?? asNumber(item.min_revenue),
      source: "brandsearch:/v1/brands",
    }));
}

function getNested(record: JsonRecord | null | undefined, keys: string[]) {
  return keys.reduce<unknown>((current, key) => isRecord(current) ? current[key] : undefined, record);
}

function shortMonthLabel(label: string) {
  const date = new Date(label);
  if (!Number.isNaN(date.getTime())) return date.toLocaleString("en-US", { month: "short" });
  return label.slice(0, 3) || "—";
}

function chartOrder(label: string, fallback: number) {
  const timestamp = new Date(label).getTime();
  return Number.isNaN(timestamp) ? fallback : timestamp;
}

function normalizeVisitRows(value: unknown): Array<{ month: string; order: number; visits: number }> {
  if (Array.isArray(value)) {
    return value.map((item, index) => {
      const record = isRecord(item) ? item : null;
      const label =
        asString(record?.date) ||
        asString(record?.month) ||
        asString(record?.period) ||
        asString(record?.label) ||
        asString(record?.name) ||
        String(index + 1);
      const visits =
        asNumber(record?.visits) ??
        asNumber(record?.value) ??
        asNumber(record?.traffic) ??
        asNumber(record?.monthly_visits) ??
        asNumber(item);

      return { month: label, order: chartOrder(label, index), visits: visits ?? 0 };
    });
  }

  if (isRecord(value)) {
    return Object.entries(value).map(([label, amount], index) => {
      const record = isRecord(amount) ? amount : null;
      const rowLabel =
        asString(record?.date) ||
        asString(record?.month) ||
        asString(record?.period) ||
        asString(record?.label) ||
        label;
      const visits =
        asNumber(record?.visits) ??
        asNumber(record?.value) ??
        asNumber(record?.traffic) ??
        asNumber(record?.monthly_visits) ??
        asNumber(amount);

      return { month: rowLabel, order: chartOrder(rowLabel, index), visits: visits ?? 0 };
    });
  }

  return [];
}

function extractVisitHistory(brand: JsonRecord | null) {
  const trafficData = isRecord(brand?.traffic_data) ? brand.traffic_data : null;
  const candidates = [
    brand?.visit_trends,
    brand?.visit_history,
    brand?.visits_history,
    brand?.traffic_history,
    brand?.monthly_visits_data,
    trafficData?.monthly_visits_data,
    getNested(brand, ["history", "monthly_visits"]),
  ];

  for (const candidate of candidates) {
    const rows = normalizeVisitRows(candidate)
      .filter((row) => row.visits > 0)
      .sort((first, second) => first.order - second.order)
      .slice(-12)
      .map((row) => ({ month: shortMonthLabel(row.month), visits: Math.round(row.visits) }));

    if (rows.length >= 2) return rows;
  }

  return [] as Array<{ month: string; visits: number }>;
}

function extractCountries(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((row) => {
        const record = isRecord(row) ? row : null;
        const code = asString(record?.country_code) || asString(record?.country) || asString(record?.code) || asString(record?.label);
        const rawShare = asNumber(record?.share) ?? asNumber(record?.percent) ?? asNumber(record?.percentage) ?? asNumber(record?.value);
        if (!code || rawShare === undefined) return null;
        const share = rawShare > 1 ? rawShare : rawShare * 100;
        return { code: code.toUpperCase(), label: code.toUpperCase(), share: Math.round(share) };
      })
      .filter((row): row is { code: string; label: string; share: number } => Boolean(row))
      .sort((first, second) => second.share - first.share)
      .slice(0, 4);
  }

  if (isRecord(value)) {
    return Object.entries(value)
      .map(([code, shareValue]) => {
        const shareNumber = asNumber(shareValue);
        if (!code || shareNumber === undefined) return null;
        const share = shareNumber > 1 ? shareNumber : shareNumber * 100;
        return { code: code.toUpperCase(), label: code.toUpperCase(), share: Math.round(share) };
      })
      .filter((row): row is { code: string; label: string; share: number } => Boolean(row))
      .sort((first, second) => second.share - first.share)
      .slice(0, 4);
  }

  return [] as Array<{ code: string; label: string; share: number }>;
}

function normalizeProjectedTraffic(brand: JsonRecord | null) {
  if (!brand) return null;
  const trafficData = isRecord(brand.traffic_data) ? brand.traffic_data : null;
  const history = extractVisitHistory(brand);
  const countries = extractCountries(
    trafficData?.top_country_shares ||
      trafficData?.top2_country_shares ||
      trafficData?.top1_country_shares ||
      trafficData?.country_shares,
  );
  const monthlyVisits =
    asNumber(brand.monthly_visits) ??
    asNumber(getNested(brand, ["traffic_data", "engagements", "visits"])) ??
    asNumber(trafficData?.estimated_monthly_visits) ??
    history.at(-1)?.visits;
  const minRevenue = asNumber(brand.min_revenue) ?? asNumber(brand.min_revenue_estimate_1p_corrected) ?? asNumber(brand.min_revenue_estimate_1p);
  const maxRevenue = asNumber(brand.max_revenue) ?? asNumber(brand.max_revenue_estimate_5p_corrected) ?? asNumber(brand.max_revenue_estimate_5p);

  const normalized: JsonRecord = {};
  if (history.length >= 2) normalized.monthly_visits_history = history;
  if (countries.length) normalized.traffic_countries = countries;
  if (monthlyVisits !== undefined) normalized.monthly_visits = Math.round(monthlyVisits);
  if (minRevenue !== undefined) normalized.min_revenue = minRevenue;
  if (maxRevenue !== undefined) normalized.max_revenue = maxRevenue;

  return Object.keys(normalized).length ? normalized : null;
}

export async function fetchBrandSearchMetricsForUrl(url: string, existing?: unknown, scrapedSignals?: JsonRecord) {
  const apiKey = process.env.BRANDSEARCH_API_KEY;
  if (!apiKey) return mergeBrandSearchMetrics(sanitizeBrandSearchMetrics(existing, { dropHistory: true }), scrapedSignals);

  try {
    const domain = cleanDomainFromUrl(url);
    const existingWithoutHistory = sanitizeBrandSearchMetrics(existing, { dropHistory: true });
    const brand = sanitizeBrandSearchMetrics(await fetchBrandByDomain(url, domain, apiKey));
    const projectedTraffic = normalizeProjectedTraffic(brand);
    const competitors = await fetchSimilarBrands(brand, domain, apiKey).catch(() => [] as JsonRecord[]);

    const metadata = {
      brandsearch_source: "official:/v1/brands/by-url+projected-fields",
      brandsearch_has_history_projection: Boolean(projectedTraffic?.monthly_visits_history),
      brandsearch_note: "Traffic history is read only when BrandSearch returns projected visit fields on the brand payload; no local estimates are generated.",
    };

    return mergeBrandSearchMetrics(
      existingWithoutHistory,
      scrapedSignals,
      brand,
      projectedTraffic,
      competitors.length ? { competitors, similar_brands: competitors } : null,
      metadata,
    );
  } catch (error) {
    console.error("BrandSearch API error:", error);
    return mergeBrandSearchMetrics(sanitizeBrandSearchMetrics(existing, { dropHistory: true }), scrapedSignals);
  }
}
