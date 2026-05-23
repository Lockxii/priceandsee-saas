type JsonRecord = Record<string, unknown>;

const BRANDSEARCH_BASE_URL = "https://api.brandsearch.co";
const BRANDSEARCH_BRAND_FIELDS = [
  "id",
  "name",
  "title",
  "description",
  "status",
  "platform",
  "rank",
  "monthly_visits",
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
  "growth_30d",
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

const STALE_HISTORY_KEYS = new Set([
  "monthly_visits_history",
  "monthlyVisitsHistory",
  "visits_history",
  "visitsHistory",
  "traffic_history",
  "trafficHistory",
  "visit_history",
  "visitHistory",
]);

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cleanDomainFromUrl(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0].toLowerCase();
  }
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

export function sanitizeBrandSearchMetrics(value: unknown): JsonRecord | null {
  if (!isRecord(value)) return null;
  const result: JsonRecord = {};
  for (const [key, incoming] of Object.entries(value)) {
    if (STALE_HISTORY_KEYS.has(key)) continue;
    if (key === "history" && Array.isArray(incoming)) continue;
    if (key === "traffic" && Array.isArray(incoming)) continue;
    if (!hasUsefulValue(incoming)) continue;
    if (isRecord(incoming)) {
      const cleanedNested = sanitizeBrandSearchMetrics(incoming);
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
  const res = await fetch(`${BRANDSEARCH_BASE_URL}${path}`, {
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

async function fetchBrandByDomain(domain: string, apiKey: string) {
  const params = new URLSearchParams({ fields: BRANDSEARCH_BRAND_FIELDS });
  return fetchBrandSearchJson(`/v1/brands/by-url/${encodeURIComponent(domain)}?${params}`, apiKey);
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

  const minRevenue = asNumber(brand?.min_revenue);
  const maxRevenue = asNumber(brand?.max_revenue);
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
      domain: asString(item.id) || asString(item.domain) || asString(item.url),
      revenue: asNumber(item.max_revenue) ?? asNumber(item.min_revenue),
      monthly_revenue: asNumber(item.max_revenue) ?? asNumber(item.min_revenue),
      source: "brandsearch:/v1/brands",
    }));
}

export async function fetchBrandSearchMetricsForUrl(url: string, existing?: unknown, scrapedSignals?: JsonRecord) {
  const apiKey = process.env.BRANDSEARCH_API_KEY;
  if (!apiKey) return mergeBrandSearchMetrics(existing, scrapedSignals);

  try {
    const domain = cleanDomainFromUrl(url);
    const brand = sanitizeBrandSearchMetrics(await fetchBrandByDomain(domain, apiKey));
    const competitors = await fetchSimilarBrands(brand, domain, apiKey).catch(() => [] as JsonRecord[]);

    const officialMetadata = {
      brandsearch_source: "official:/v1/brands/by-url",
      brandsearch_has_history_endpoint: false,
      brandsearch_note: "BrandSearch OpenAPI v1.5 exposes monthly_visits as a latest snapshot; no official visit-history endpoint is documented.",
    };

    return mergeBrandSearchMetrics(
      existing,
      scrapedSignals,
      brand,
      competitors.length ? { competitors, similar_brands: competitors } : null,
      officialMetadata,
    );
  } catch (error) {
    console.error("BrandSearch API error:", error);
    return mergeBrandSearchMetrics(existing, scrapedSignals);
  }
}
