export type MediaAsset = {
  url: string;
  type: "image" | "video" | "font" | "css" | "other";
  source: string;
  alt?: string;
};

export type PlatformSignal = {
  name: string;
  confidence: "high" | "medium" | "low";
  evidence: string[];
};

export type ProductUrlItem = {
  url: string;
  title?: string;
  image?: string;
  price?: number | null;
  currency?: string | null;
  source: string;
};

export type ProductSnapshot = {
  url: string;
  finalUrl: string;
  canonical?: string;
  title?: string;
  description?: string;
  price?: number | null;
  currency?: string | null;
  availability?: string;
  brand?: string;
  sku?: string;
  image?: string;
  rating?: number | null;
  reviewsCount?: number | null;
  platforms: PlatformSignal[];
  jsonLdTypes: string[];
  media: MediaAsset[];
  productUrls: ProductUrlItem[];
  sources: string[];
};

type FetchTextResult = { text: string; finalUrl: string; contentType: string };
type JsonRecord = Record<string, unknown>;

type ShopifyProduct = {
  title?: string;
  handle?: string;
  url?: string;
  image?: string;
  price?: number | null;
  currency?: string | null;
  available?: boolean | null;
  vendor?: string;
  sku?: string;
};

const USER_AGENT = "Mozilla/5.0 (compatible; PriceAndSee Tools/1.0; +https://priceandsee.app)";

export function normalizeHttpUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const raw = value.trim();
  try {
    const parsed = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (!["http:", "https:"].includes(parsed.protocol) || !parsed.hostname.includes(".")) return null;
    parsed.hash = "";
    return parsed;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cleanText(value: unknown) {
  if (typeof value !== "string") return undefined;
  const cleaned = decodeHtml(value).replace(/\s+/g, " ").trim();
  return cleaned || undefined;
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function numberFromValue(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const match = String(value).replace(/\s/g, "").replace(/,/g, ".").match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function typeForUrl(url: string): MediaAsset["type"] {
  const lower = url.toLowerCase().split("?")[0];
  if (/\.(png|jpe?g|webp|gif|avif|svg)$/.test(lower)) return "image";
  if (/\.(mp4|webm|mov|m4v|ogv)$/.test(lower)) return "video";
  if (/\.(woff2?|ttf|otf|eot)$/.test(lower)) return "font";
  if (/\.css$/.test(lower)) return "css";
  return "other";
}

function absoluteUrl(value: unknown, baseUrl: string) {
  if (typeof value !== "string") return undefined;
  const cleaned = decodeHtml(value).trim().replace(/^["']|["');,]+$/g, "");
  if (!cleaned || /^(data|blob|mailto|tel|javascript):/i.test(cleaned)) return undefined;
  try {
    const parsed = cleaned.startsWith("//") ? new URL(`https:${cleaned}`) : new URL(cleaned, baseUrl);
    if (!["http:", "https:"].includes(parsed.protocol)) return undefined;
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return undefined;
  }
}

function rootUrl(url: string) {
  const parsed = new URL(url);
  return `${parsed.protocol}//${parsed.host}`;
}

async function fetchText(url: string, accept = "text/html,application/xhtml+xml,application/xml,text/plain,*/*;q=0.8", timeoutMs = 15000): Promise<FetchTextResult> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: accept,
      "Accept-Language": "en-US,en;q=0.8,fr;q=0.6",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    },
    cache: "no-store",
    redirect: "follow",
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const text = await response.text();
  return { text, finalUrl: response.url || url, contentType: response.headers.get("content-type") || "" };
}

async function fetchJson(url: string, timeoutMs = 12000) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json,text/plain,*/*;q=0.8",
    },
    cache: "no-store",
    redirect: "follow",
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) return null;
  return response.json().catch(() => null) as Promise<unknown>;
}

function readAttribute(tag: string, attr: string) {
  const match = tag.match(new RegExp(`${attr}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return cleanText(match?.[2] || match?.[3] || match?.[4]);
}

function tags(html: string, tag: string) {
  return html.match(new RegExp(`<${tag}\\b[^>]*>`, "gi")) || [];
}

function parseSrcset(value: unknown) {
  if (typeof value !== "string") return [] as string[];
  return value
    .split(",")
    .map((part) => part.trim().split(/\s+/)[0])
    .filter(Boolean);
}

function addMedia(target: MediaAsset[], seen: Set<string>, url: string | undefined, source: string, alt?: string) {
  if (!url || seen.has(url)) return;
  const type = typeForUrl(url);
  if (type === "other" && !/(cdn|image|img|media|asset|upload|files|products?|video|poster)/i.test(url)) return;
  seen.add(url);
  target.push({ url, type, source, alt });
}

function jsonLdScripts(html: string) {
  const scripts = html.match(/<script\b[^>]*type=["'][^"']*ld\+json[^"']*["'][^>]*>[\s\S]*?<\/script>/gi) || [];
  return scripts
    .map((script) => script.replace(/^<script\b[^>]*>/i, "").replace(/<\/script>$/i, "").trim())
    .filter(Boolean);
}

function parseJsonLd(html: string) {
  const parsed: unknown[] = [];
  for (const script of jsonLdScripts(html)) {
    const candidates = [script, decodeHtml(script)];
    for (const candidate of candidates) {
      try {
        parsed.push(JSON.parse(candidate));
        break;
      } catch {
        // Keep trying decoded variants.
      }
    }
  }
  return parsed;
}

function walkJson(value: unknown, visit: (record: JsonRecord) => void) {
  if (Array.isArray(value)) {
    value.forEach((item) => walkJson(item, visit));
    return;
  }
  if (!isRecord(value)) return;
  visit(value);
  Object.values(value).forEach((item) => {
    if (Array.isArray(item) || isRecord(item)) walkJson(item, visit);
  });
}

function typeNames(value: unknown) {
  const raw = isRecord(value) ? value["@type"] || value.type : value;
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return list.map((item) => cleanText(item)).filter((item): item is string => Boolean(item));
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    const cleaned = cleanText(value);
    if (cleaned) return cleaned;
  }
  return undefined;
}

function firstUrlFromValue(value: unknown, baseUrl: string): string | undefined {
  if (typeof value === "string") return absoluteUrl(value, baseUrl);
  if (Array.isArray(value)) {
    for (const item of value) {
      const url = firstUrlFromValue(item, baseUrl);
      if (url) return url;
    }
  }
  if (isRecord(value)) return firstUrlFromValue(value.url || value.contentUrl || value.src, baseUrl);
  return undefined;
}

function collectJsonLdTypes(values: unknown[]) {
  const set = new Set<string>();
  values.forEach((value) => walkJson(value, (record) => typeNames(record).forEach((type) => set.add(type))));
  return [...set].slice(0, 20);
}

function productFromJsonLd(values: unknown[], baseUrl: string) {
  let product: JsonRecord | undefined;
  values.forEach((value) => {
    if (product) return;
    walkJson(value, (record) => {
      if (product) return;
      if (typeNames(record).some((type) => /product/i.test(type))) product = record;
    });
  });
  if (!product) return {};

  const offersRaw = Array.isArray(product.offers) ? product.offers[0] : product.offers;
  const offer = isRecord(offersRaw) ? offersRaw : undefined;
  const brandRaw = product.brand;
  const ratingRaw = product.aggregateRating;
  const rating = isRecord(ratingRaw) ? ratingRaw : undefined;

  return {
    title: firstString(product.name, product.title),
    description: firstString(product.description),
    price: numberFromValue(offer?.price || offer?.lowPrice || offer?.highPrice || product.price),
    currency: firstString(offer?.priceCurrency, product.priceCurrency),
    availability: firstString(offer?.availability),
    brand: isRecord(brandRaw) ? firstString(brandRaw.name) : firstString(brandRaw),
    sku: firstString(product.sku, product.mpn, product.gtin, product.gtin13),
    image: firstUrlFromValue(product.image, baseUrl),
    rating: numberFromValue(rating?.ratingValue),
    reviewsCount: numberFromValue(rating?.reviewCount || rating?.ratingCount),
  };
}

function metaContent(html: string, keys: string[]) {
  for (const tag of tags(html, "meta")) {
    const property = (readAttribute(tag, "property") || readAttribute(tag, "name") || readAttribute(tag, "itemprop") || "").toLowerCase();
    if (!keys.some((key) => property === key.toLowerCase())) continue;
    const content = readAttribute(tag, "content");
    if (content) return content;
  }
  return undefined;
}

function titleTag(html: string) {
  return cleanText(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]);
}

function canonicalUrl(html: string, baseUrl: string) {
  for (const tag of tags(html, "link")) {
    const rel = (readAttribute(tag, "rel") || "").toLowerCase();
    if (rel !== "canonical") continue;
    const href = absoluteUrl(readAttribute(tag, "href"), baseUrl);
    if (href) return href;
  }
  return undefined;
}

export function detectPlatforms(html: string, url: string): PlatformSignal[] {
  const lower = `${html.slice(0, 500000)} ${url}`.toLowerCase();
  const checks: Array<{ name: string; high: RegExp[]; medium: RegExp[] }> = [
    { name: "Shopify", high: [/cdn\.shopify\.com/, /shopify\.theme/, /\/products\.json/, /myshopify\.com/], medium: [/shopify-section/, /shopify-payment-button/] },
    { name: "WooCommerce", high: [/woocommerce/, /wp-content\/plugins\/woocommerce/, /wc-ajax/], medium: [/wp-json\/wc\/store/, /add_to_cart_button/] },
    { name: "Magento", high: [/magento_/, /x-magento/, /\/static\/frontend\//], medium: [/mage\//, /catalog\/product/] },
    { name: "BigCommerce", high: [/cdn\d+\.bigcommerce\.com/, /bigcommerce/], medium: [/stencil-utils/, /bc-sf-filter/] },
    { name: "Salesforce Commerce Cloud", high: [/demandware/, /\/on\/demandware\.store/], medium: [/sfcc/, /salesforce commerce cloud/] },
    { name: "PrestaShop", high: [/prestashop/, /\/modules\/ps_/], medium: [/content_only=1/, /blockcart/] },
    { name: "Shopware", high: [/shopware/], medium: [/sw-.*?component/, /store-api/] },
    { name: "Wix Stores", high: [/wixstatic\.com/, /wixstores/], medium: [/wix-code/, /wix-thunderbolt/] },
  ];

  const platforms: PlatformSignal[] = [];
  checks.forEach((check) => {
    const high = check.high.filter((regex) => regex.test(lower)).map((regex) => regex.source);
    const medium = check.medium.filter((regex) => regex.test(lower)).map((regex) => regex.source);
    if (high.length) platforms.push({ name: check.name, confidence: "high", evidence: high.slice(0, 3) });
    else if (medium.length) platforms.push({ name: check.name, confidence: "medium", evidence: medium.slice(0, 3) });
  });
  return platforms;
}

export function extractMediaFromHtml(html: string, baseUrl: string) {
  const media: MediaAsset[] = [];
  const seen = new Set<string>();

  for (const tag of tags(html, "img")) {
    const alt = readAttribute(tag, "alt");
    ["src", "data-src", "data-original", "data-lazy-src", "data-zoom-image"].forEach((attr) => addMedia(media, seen, absoluteUrl(readAttribute(tag, attr), baseUrl), `img:${attr}`, alt));
    ["srcset", "data-srcset"].forEach((attr) => parseSrcset(readAttribute(tag, attr)).forEach((url) => addMedia(media, seen, absoluteUrl(url, baseUrl), `img:${attr}`, alt)));
  }

  for (const tag of tags(html, "source")) {
    ["src", "data-src"].forEach((attr) => addMedia(media, seen, absoluteUrl(readAttribute(tag, attr), baseUrl), `source:${attr}`));
    parseSrcset(readAttribute(tag, "srcset")).forEach((url) => addMedia(media, seen, absoluteUrl(url, baseUrl), "source:srcset"));
  }

  for (const tag of tags(html, "video")) {
    addMedia(media, seen, absoluteUrl(readAttribute(tag, "poster"), baseUrl), "video:poster");
    addMedia(media, seen, absoluteUrl(readAttribute(tag, "src"), baseUrl), "video:src");
  }

  for (const tag of tags(html, "meta")) {
    const key = (readAttribute(tag, "property") || readAttribute(tag, "name") || readAttribute(tag, "itemprop") || "").toLowerCase();
    if (!/(image|thumbnail|poster)/.test(key)) continue;
    addMedia(media, seen, absoluteUrl(readAttribute(tag, "content"), baseUrl), `meta:${key}`);
  }

  for (const tag of tags(html, "link")) {
    const rel = (readAttribute(tag, "rel") || "").toLowerCase();
    const as = (readAttribute(tag, "as") || "").toLowerCase();
    if (!/(image_src|icon|apple-touch-icon|preload)/.test(rel) && as !== "image") continue;
    addMedia(media, seen, absoluteUrl(readAttribute(tag, "href"), baseUrl), `link:${rel || as}`);
  }

  const jsonLd = parseJsonLd(html);
  jsonLd.forEach((value) => walkJson(value, (record) => {
    [record.image, record.thumbnailUrl, record.contentUrl, record.logo].forEach((entry) => {
      const url = firstUrlFromValue(entry, baseUrl);
      addMedia(media, seen, url, "json-ld", firstString(record.name, record.alt));
    });
  }));

  const cssUrls = html.match(/url\(([^)]+)\)/gi) || [];
  cssUrls.forEach((item) => addMedia(media, seen, absoluteUrl(item.replace(/^url\(/i, "").replace(/\)$/i, ""), baseUrl), "css:url"));

  const directUrls = html.match(/https?:\/\/[^\s"'<>]+?\.(?:png|jpe?g|webp|gif|avif|svg|mp4|webm)(?:\?[^\s"'<>]*)?/gi) || [];
  directUrls.forEach((url) => addMedia(media, seen, absoluteUrl(url, baseUrl), "html:url"));

  return media.slice(0, 220);
}

function normalizeShopifyProduct(raw: JsonRecord, baseUrl: string): ShopifyProduct | null {
  const variants = Array.isArray(raw.variants) ? raw.variants.filter(isRecord) : [];
  const firstVariant = variants[0];
  const images = Array.isArray(raw.images) ? raw.images : [];
  const image = firstUrlFromValue(raw.image || raw.featured_image || images[0], baseUrl);
  const handle = cleanText(raw.handle);
  const title = firstString(raw.title, raw.name);
  const prices = variants.map((variant) => numberFromValue(variant.price)).filter((price): price is number => price !== null);
  const price = prices[0] ?? numberFromValue(raw.price || raw.price_min);
  if (!title && !handle) return null;
  return {
    title,
    handle,
    url: handle ? `${rootUrl(baseUrl)}/products/${handle}` : absoluteUrl(raw.url, baseUrl),
    image,
    price,
    currency: firstString(firstVariant?.currency, raw.currency),
    available: variants.length ? variants.some((variant) => variant.available === true) : typeof raw.available === "boolean" ? raw.available : null,
    vendor: firstString(raw.vendor),
    sku: firstString(firstVariant?.sku, raw.sku),
  };
}

async function fetchShopifyProduct(url: string) {
  const parsed = new URL(url);
  const match = parsed.pathname.match(/\/products\/([^/?#]+)/);
  if (!match) return null;
  const base = `${parsed.protocol}//${parsed.host}/products/${match[1]}`;
  const endpoints = [`${base}.js`, `${base}.json`];
  for (const endpoint of endpoints) {
    const json = await fetchJson(endpoint).catch(() => null);
    const product = isRecord(json) && isRecord(json.product) ? json.product : json;
    if (isRecord(product)) {
      const normalized = normalizeShopifyProduct(product, url);
      if (normalized) return normalized;
    }
  }
  return null;
}

async function fetchShopifyCatalog(url: string, limit = 80) {
  const endpoint = `${rootUrl(url)}/products.json?limit=${Math.min(Math.max(limit, 1), 250)}`;
  const json = await fetchJson(endpoint).catch(() => null);
  const products = isRecord(json) && Array.isArray(json.products) ? json.products : [];
  return products
    .filter(isRecord)
    .map((item) => normalizeShopifyProduct(item, url))
    .filter((item): item is ShopifyProduct => item !== null);
}

async function fetchWooProducts(url: string, slug?: string, limit = 40) {
  const endpoint = new URL("/wp-json/wc/store/products", rootUrl(url));
  endpoint.searchParams.set("per_page", String(Math.min(Math.max(limit, 1), 100)));
  if (slug) endpoint.searchParams.set("slug", slug);
  const json = await fetchJson(endpoint.toString()).catch(() => null);
  if (!Array.isArray(json)) return [] as ProductUrlItem[];
  return json.filter(isRecord).map((item): ProductUrlItem | null => {
    const images = Array.isArray(item.images) ? item.images.filter(isRecord) : [];
    const firstImage = images[0];
    const title = firstString(item.name, item.title);
    const permalink = absoluteUrl(item.permalink || item.url, url);
    if (!permalink && !title) return null;
    const prices = isRecord(item.prices) ? item.prices : undefined;
    const rawPrice = prices?.price || prices?.regular_price || item.price;
    const divisor = prices?.currency_minor_unit === 2 && typeof rawPrice === "string" && /^\d+$/.test(rawPrice) ? 100 : 1;
    const price = numberFromValue(rawPrice);
    return {
      url: permalink || url,
      title,
      image: absoluteUrl(firstImage?.src || firstImage?.thumbnail || item.images, url),
      price: price === null ? null : price / divisor,
      currency: firstString(prices?.currency_code, item.currency),
      source: "woocommerce-store-api",
    };
  }).filter((item): item is ProductUrlItem => item !== null);
}

export async function buildMediaReport(inputUrl: URL) {
  const fetched = await fetchText(inputUrl.toString());
  const baseUrl = fetched.finalUrl;
  const htmlMedia = extractMediaFromHtml(fetched.text, baseUrl);
  const media = [...htmlMedia];
  const seen = new Set(media.map((item) => item.url));
  const sources = new Set<string>(["html"]);

  const shopifyProduct = await fetchShopifyProduct(baseUrl).catch(() => null);
  if (shopifyProduct?.image) {
    addMedia(media, seen, shopifyProduct.image, "shopify-product-json", shopifyProduct.title);
    sources.add("shopify-product-json");
  }
  const shopifyCatalog = await fetchShopifyCatalog(baseUrl, 80).catch(() => []);
  if (shopifyCatalog.length) {
    sources.add("shopify-products-json");
    shopifyCatalog.forEach((product) => addMedia(media, seen, product.image, "shopify-products-json", product.title));
  }

  const wooProducts = await fetchWooProducts(baseUrl, undefined, 40).catch(() => []);
  if (wooProducts.length) {
    sources.add("woocommerce-store-api");
    wooProducts.forEach((product) => addMedia(media, seen, product.image, "woocommerce-store-api", product.title));
  }

  return {
    url: inputUrl.toString(),
    finalUrl: baseUrl,
    platforms: detectPlatforms(fetched.text, baseUrl),
    media: media.slice(0, 240),
    sources: [...sources],
  };
}

function pageSlug(url: string) {
  try {
    const pathname = new URL(url).pathname.split("/").filter(Boolean);
    return pathname[pathname.length - 1]?.replace(/\.[a-z0-9]+$/i, "");
  } catch {
    return undefined;
  }
}

export async function buildProductSnapshot(inputUrl: URL): Promise<ProductSnapshot> {
  const fetched = await fetchText(inputUrl.toString());
  const baseUrl = fetched.finalUrl;
  const jsonLd = parseJsonLd(fetched.text);
  const fromJsonLd = productFromJsonLd(jsonLd, baseUrl);
  const canonical = canonicalUrl(fetched.text, baseUrl);
  const media = extractMediaFromHtml(fetched.text, baseUrl);
  const sources = new Set<string>(["html", ...(jsonLd.length ? ["json-ld"] : [])]);

  const shopifyProduct = await fetchShopifyProduct(baseUrl).catch(() => null);
  if (shopifyProduct) sources.add("shopify-product-json");
  const wooProducts = await fetchWooProducts(baseUrl, pageSlug(baseUrl), 8).catch(() => []);
  if (wooProducts.length) sources.add("woocommerce-store-api");
  const wooProduct = wooProducts[0];

  const metaTitle = firstString(metaContent(fetched.text, ["og:title", "twitter:title"]), titleTag(fetched.text));
  const metaDescription = firstString(metaContent(fetched.text, ["og:description", "twitter:description", "description"]));
  const metaImage = absoluteUrl(metaContent(fetched.text, ["og:image", "twitter:image", "image"]), baseUrl);

  const productUrls: ProductUrlItem[] = [];
  if (shopifyProduct?.url) productUrls.push({ url: shopifyProduct.url, title: shopifyProduct.title, image: shopifyProduct.image, price: shopifyProduct.price, currency: shopifyProduct.currency, source: "shopify-product-json" });
  wooProducts.forEach((item) => productUrls.push(item));

  return {
    url: inputUrl.toString(),
    finalUrl: baseUrl,
    canonical,
    title: fromJsonLd.title || shopifyProduct?.title || wooProduct?.title || metaTitle,
    description: fromJsonLd.description || metaDescription,
    price: fromJsonLd.price ?? shopifyProduct?.price ?? wooProduct?.price ?? null,
    currency: fromJsonLd.currency || shopifyProduct?.currency || wooProduct?.currency || null,
    availability: fromJsonLd.availability || (shopifyProduct?.available === true ? "InStock" : shopifyProduct?.available === false ? "OutOfStock" : undefined),
    brand: fromJsonLd.brand || shopifyProduct?.vendor,
    sku: fromJsonLd.sku || shopifyProduct?.sku,
    image: fromJsonLd.image || shopifyProduct?.image || wooProduct?.image || metaImage || media[0]?.url,
    rating: fromJsonLd.rating ?? null,
    reviewsCount: fromJsonLd.reviewsCount ?? null,
    platforms: detectPlatforms(fetched.text, baseUrl),
    jsonLdTypes: collectJsonLdTypes(jsonLd),
    media: media.slice(0, 40),
    productUrls,
    sources: [...sources],
  };
}

function isProductLikeUrl(value: string) {
  try {
    const parsed = new URL(value);
    const path = parsed.pathname.toLowerCase();
    if (/\/(products?|product|collections\/[^/]+\/products|catalog\/product|p|item|itm|listing|ip|dp|gp\/product)\//.test(path)) return true;
    if (/\/(goods|product)\.html/.test(path)) return true;
    if (parsed.searchParams.has("product_id") || parsed.searchParams.has("productId") || parsed.searchParams.has("itemId")) return true;
    return false;
  } catch {
    return false;
  }
}

function pageLinks(html: string, baseUrl: string) {
  const links: ProductUrlItem[] = [];
  const seen = new Set<string>();
  for (const tag of tags(html, "a")) {
    const href = absoluteUrl(readAttribute(tag, "href"), baseUrl);
    if (!href || seen.has(href) || !isProductLikeUrl(href)) continue;
    seen.add(href);
    const text = cleanText(tag.replace(/<[^>]+>/g, " "));
    links.push({ url: href, title: text, source: "page-links" });
  }
  return links.slice(0, 100);
}

function sitemapLocs(xml: string) {
  return [...xml.matchAll(/<loc>([\s\S]*?)<\/loc>/gi)].map((match) => cleanText(match[1])).filter((item): item is string => Boolean(item));
}

async function fetchSitemapProducts(url: string) {
  const root = rootUrl(url);
  const queue = ["/sitemap.xml", "/sitemap_index.xml", "/product-sitemap.xml", "/wp-sitemap-posts-product-1.xml", "/sitemap_products_1.xml"].map((path) => `${root}${path}`);
  const visited = new Set<string>();
  const products: ProductUrlItem[] = [];
  const seenProducts = new Set<string>();

  while (queue.length && visited.size < 10 && products.length < 180) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);
    const fetched = await fetchText(current, "application/xml,text/xml,text/plain,*/*;q=0.8", 9000).catch(() => null);
    if (!fetched) continue;
    const locs = sitemapLocs(fetched.text);
    for (const loc of locs) {
      const absolute = absoluteUrl(loc, root);
      if (!absolute) continue;
      if (/sitemap/i.test(absolute) && queue.length < 18) queue.push(absolute);
      if (isProductLikeUrl(absolute) && !seenProducts.has(absolute)) {
        seenProducts.add(absolute);
        products.push({ url: absolute, source: "sitemap" });
      }
    }
  }

  return products;
}

export async function discoverProductUrls(inputUrl: URL) {
  const fetched = await fetchText(inputUrl.toString()).catch(() => null);
  const baseUrl = fetched?.finalUrl || inputUrl.toString();
  const found: ProductUrlItem[] = [];
  const seen = new Set<string>();
  const sources = new Set<string>();

  function add(items: ProductUrlItem[], source: string) {
    if (items.length) sources.add(source);
    for (const item of items) {
      if (!item.url || seen.has(item.url)) continue;
      seen.add(item.url);
      found.push({ ...item, source: item.source || source });
    }
  }

  add((await fetchShopifyCatalog(baseUrl, 250).catch(() => [])).map((item) => ({ url: item.url || baseUrl, title: item.title, image: item.image, price: item.price, currency: item.currency, source: "shopify-products-json" })).filter((item) => item.url), "shopify-products-json");
  add(await fetchWooProducts(baseUrl, undefined, 100).catch(() => []), "woocommerce-store-api");
  if (fetched) add(pageLinks(fetched.text, baseUrl), "page-links");
  add(await fetchSitemapProducts(baseUrl).catch(() => []), "sitemap");

  return {
    url: inputUrl.toString(),
    finalUrl: baseUrl,
    platforms: fetched ? detectPlatforms(fetched.text, baseUrl) : [],
    products: found.slice(0, 250),
    sources: [...sources],
  };
}
