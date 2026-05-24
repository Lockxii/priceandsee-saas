from __future__ import annotations

import asyncio
import json
import os
import re
import time
from dataclasses import dataclass
from typing import Any
from urllib.parse import quote, urlparse
from urllib.request import Request, urlopen

try:
    from parsel import Selector
except Exception:  # pragma: no cover - optional dependency in local dev
    Selector = None  # type: ignore

try:
    from adapters.base import (
        absolutize_url,
        clean_price,
        clean_text,
        compact,
        normalize_currency,
        parse_rating,
        stock_status,
        to_int,
        unique,
    )
except Exception:  # pragma: no cover
    from scraper.adapters.base import (  # type: ignore
        absolutize_url,
        clean_price,
        clean_text,
        compact,
        normalize_currency,
        parse_rating,
        stock_status,
        to_int,
        unique,
    )

EMPTY_VALUES = (None, "", [], {})
USER_AGENT = os.getenv("SCRAPER_USER_AGENT", "Mozilla/5.0 PriceAndSee Scraper (+https://priceandsee.com)")
PUBLIC_PROVIDER_TIMEOUT = int(os.getenv("SCRAPER_PUBLIC_PROVIDER_TIMEOUT", "10"))
EXTERNAL_PROVIDER_TIMEOUT_MS = int(os.getenv("SCRAPER_EXTERNAL_PROVIDER_TIMEOUT_MS", "45000"))

PRODUCT_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "title": {"type": "string"},
        "price": {"type": ["number", "string", "null"]},
        "currency": {"type": ["string", "null"]},
        "stockStatus": {"type": ["string", "null"]},
        "description": {"type": ["string", "null"]},
        "brand": {"type": ["string", "null"]},
        "sku": {"type": ["string", "null"]},
        "rating": {"type": ["number", "string", "null"]},
        "reviewsCount": {"type": ["integer", "string", "null"]},
        "image": {"type": ["string", "null"]},
        "images": {"type": "array", "items": {"type": "string"}},
        "reviews": {"type": "array", "items": {"type": "object"}},
    },
}

PRODUCT_PROMPT = (
    "Extract only real product/ecommerce data from this URL. Return strict JSON with: "
    "title, price, currency, stockStatus, description, brand, sku, rating, reviewsCount, "
    "image, images, reviews. Do not infer or invent missing values."
)


@dataclass
class ProviderResult:
    name: str
    data: dict[str, Any]
    html: str | None = None
    markdown: str | None = None
    error: str | None = None
    duration_ms: int | None = None


class HtmlPage:
    """Tiny Scrapling-like page wrapper backed by parsel for provider HTML fallbacks."""

    def __init__(self, body: str, url: str):
        if Selector is None:
            raise RuntimeError("parsel is not installed; cannot parse provider HTML")
        self.url = url
        self.body = body.encode("utf-8", "ignore")
        self.encoding = "utf-8"
        self._selector = Selector(text=body, type="html")

    def css(self, selector: str):
        return self._selector.css(selector)


class ProviderError(RuntimeError):
    pass


def html_page_from_text(markup: str, url: str) -> HtmlPage | None:
    if not markup or Selector is None:
        return None
    try:
        return HtmlPage(markup, url)
    except Exception:
        return None


def provider_list_from_env() -> list[str]:
    raw = os.getenv("SCRAPER_EXTERNAL_PROVIDERS", "firecrawl,scrapegraph,crawl4ai,camoufox,browser_use")
    return [item.strip().lower() for item in raw.split(",") if item.strip()]


def provider_is_enabled(name: str) -> bool:
    name = name.lower()
    flag = os.getenv(f"{name.upper()}_ENABLED") or os.getenv(f"SCRAPER_{name.upper()}_ENABLED")
    if flag is not None and flag.lower() in {"0", "false", "no", "off"}:
        return False
    return name in provider_list_from_env()


def should_run_external_always() -> bool:
    return os.getenv("SCRAPER_EXTERNAL_PROVIDERS_ALWAYS", "false").lower() in {"1", "true", "yes", "on"}


def headers(accept: str = "application/json,text/plain,*/*;q=0.8") -> dict[str, str]:
    return {
        "User-Agent": USER_AGENT,
        "Accept": accept,
        "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
        "Cache-Control": "no-cache",
    }


def http_json(url: str, timeout: int = PUBLIC_PROVIDER_TIMEOUT, method: str = "GET", payload: dict[str, Any] | None = None, extra_headers: dict[str, str] | None = None) -> Any:
    body = json.dumps(payload).encode("utf-8") if payload is not None else None
    request_headers = headers()
    if payload is not None:
        request_headers["Content-Type"] = "application/json"
    if extra_headers:
        request_headers.update(extra_headers)
    request = Request(url, data=body, method=method, headers=request_headers)
    with urlopen(request, timeout=timeout) as response:
        raw = response.read(4_000_000).decode("utf-8", "ignore")
    return json.loads(raw)


def http_text(url: str, timeout: int = PUBLIC_PROVIDER_TIMEOUT, method: str = "GET", payload: dict[str, Any] | None = None, extra_headers: dict[str, str] | None = None) -> str:
    body = json.dumps(payload).encode("utf-8") if payload is not None else None
    request_headers = headers("text/html,application/xhtml+xml,application/json,text/plain,*/*;q=0.8")
    if payload is not None:
        request_headers["Content-Type"] = "application/json"
    if extra_headers:
        request_headers.update(extra_headers)
    request = Request(url, data=body, method=method, headers=request_headers)
    with urlopen(request, timeout=timeout) as response:
        return response.read(6_000_000).decode("utf-8", "ignore")


def merge_missing(base: dict[str, Any], *sources: dict[str, Any]) -> dict[str, Any]:
    merged = dict(base)
    for source in sources:
        for key, value in source.items():
            if value in EMPTY_VALUES:
                continue
            if merged.get(key) in EMPTY_VALUES:
                merged[key] = value
    return compact(merged)


def append_sources(data: dict[str, Any], providers: list[str], errors: list[str] | None = None) -> dict[str, Any]:
    if not data:
        return data
    signals = data.get("brandSignals") if isinstance(data.get("brandSignals"), dict) else {}
    existing = signals.get("providers") if isinstance(signals.get("providers"), list) else []
    signals["providers"] = unique([*existing, *providers])
    if errors and os.getenv("SCRAPER_PROVIDER_DEBUG", "false").lower() in {"1", "true", "yes"}:
        signals["providerErrors"] = unique([*(signals.get("providerErrors") or []), *errors])[:20]
    data["brandSignals"] = compact(signals)
    return data


def normalize_image_items(values: Any, base_url: str, source: str) -> list[dict[str, Any]]:
    images: list[dict[str, Any]] = []
    if isinstance(values, str):
        values = [values]
    if not isinstance(values, list):
        return []
    for item in values[:40]:
        alt = None
        value = item
        if isinstance(item, dict):
            value = item.get("src") or item.get("url") or item.get("image") or item.get("thumbnail")
            alt = clean_text(item.get("alt") or item.get("name"))
        if not value:
            continue
        url = absolutize_url(str(value), base_url)
        if not url or url.startswith(("data:", "blob:", "javascript:")):
            continue
        images.append(compact({"url": url, "alt": alt, "source": source, "type": "image"}))
    return unique(images)


def normalize_review_items(values: Any, source: str) -> list[dict[str, Any]]:
    if isinstance(values, dict):
        values = [values]
    if not isinstance(values, list):
        return []
    reviews: list[dict[str, Any]] = []
    for item in values[:20]:
        if isinstance(item, str):
            reviews.append(compact({"body": clean_text(item), "source": source}))
            continue
        if not isinstance(item, dict):
            continue
        rating = item.get("rating") or item.get("ratingValue") or item.get("reviewRating")
        if isinstance(rating, dict):
            rating = rating.get("ratingValue")
        author = item.get("author")
        if isinstance(author, dict):
            author = author.get("name")
        reviews.append(compact({
            "author": clean_text(author),
            "title": clean_text(item.get("title") or item.get("headline") or item.get("name")),
            "body": clean_text(item.get("body") or item.get("reviewBody") or item.get("description") or item.get("text")),
            "rating": parse_rating(rating),
            "date": clean_text(item.get("date") or item.get("datePublished") or item.get("createdAt")),
            "source": source,
            "count": to_int(item.get("count")),
        }))
    return unique(reviews)


def pick(record: dict[str, Any], *keys: str) -> Any:
    lowered = {str(key).lower(): key for key in record.keys()}
    for key in keys:
        actual = lowered.get(key.lower())
        if actual is not None:
            return record.get(actual)
    return None


def normalize_structured_product(record: Any, base_url: str, source: str) -> dict[str, Any]:
    if isinstance(record, list):
        record = next((item for item in record if isinstance(item, dict)), {})
    if not isinstance(record, dict):
        return {}

    data = record.get("data") if isinstance(record.get("data"), dict) else record
    if isinstance(data.get("product"), dict):
        data = data["product"]

    price_value = pick(data, "price", "currentPrice", "salePrice", "finalPrice", "amount", "lowPrice")
    if isinstance(price_value, dict):
        price_value = pick(price_value, "value", "amount", "price")
    image_value = pick(data, "image", "imageUrl", "imageURL", "thumbnail", "thumbnailUrl")
    images_value = pick(data, "images", "productMedia", "media", "gallery")
    if images_value in EMPTY_VALUES and image_value not in EMPTY_VALUES:
        images_value = [image_value]

    brand = pick(data, "brand", "brandName", "manufacturer", "vendor", "seller", "sellerName", "shopName")
    if isinstance(brand, dict):
        brand = pick(brand, "name", "brandName", "title")

    availability = pick(data, "stockStatus", "stock", "availability", "available", "isAvailable", "inStock")
    media = normalize_image_items(images_value, base_url, source)
    reviews = normalize_review_items(pick(data, "reviews", "productReviews", "review"), source)
    first_image = media[0]["url"] if media else clean_text(image_value)
    if first_image:
        first_image = absolutize_url(first_image, base_url)

    return compact({
        "title": clean_text(pick(data, "title", "name", "productName", "displayName")),
        "price": clean_price(price_value),
        "currency": normalize_currency(pick(data, "currency", "priceCurrency", "currencyCode"), str(price_value or data)[:2000]),
        "stockStatus": stock_status(availability) or ("In Stock" if availability is True else "Out of Stock" if availability is False else None),
        "description": clean_text(pick(data, "description", "shortDescription", "summary")),
        "brand": clean_text(brand),
        "sku": clean_text(pick(data, "sku", "asin", "productId", "productID", "id", "mpn")),
        "rating": parse_rating(pick(data, "rating", "ratingValue", "averageRating", "stars")),
        "reviewsCount": to_int(pick(data, "reviewsCount", "reviewCount", "ratingCount", "totalReviews")),
        "image": first_image,
        "productMedia": media,
        "productReviews": reviews,
    })


def markdown_to_product(markdown: str | None, base_url: str, source: str) -> dict[str, Any]:
    if not markdown:
        return {}
    text = clean_text(markdown) or ""
    if not text:
        return {}
    title = None
    heading = re.search(r"^#\s+(.+)$", markdown, flags=re.M)
    if heading:
        title = clean_text(heading.group(1))
    price_match = re.search(r"(?:€|EUR|USD|\$|£|GBP|R\$|MX\$)\s?\d[\d\s.,]*|\d[\d\s.,]*\s?(?:€|EUR|USD|\$|£|GBP|R\$|MX\$)", text, flags=re.I)
    image_urls = re.findall(r"!\[[^\]]*\]\(([^)]+)\)", markdown)[:20]
    media = normalize_image_items(image_urls, base_url, source)
    return compact({
        "title": title,
        "price": clean_price(price_match.group(0)) if price_match else None,
        "currency": normalize_currency(None, price_match.group(0) if price_match else text[:1000]),
        "description": text[:700] if len(text) > 80 else None,
        "image": media[0]["url"] if media else None,
        "productMedia": media,
    })


def shopify_product_json_urls(url: str) -> list[str]:
    parsed = urlparse(url)
    path = parsed.path.split("?", 1)[0].rstrip("/")
    match = re.search(r"/products/([^/?#]+)", path)
    if not match:
        return []
    base = f"{parsed.scheme or 'https'}://{parsed.netloc}/products/{match.group(1)}"
    return [f"{base}.js", f"{base}.json"]


def shopify_price(value: Any) -> float | None:
    price = clean_price(value)
    if price is None:
        return None
    if isinstance(value, int) and value >= 1000:
        return round(price / 100, 2)
    if isinstance(value, str) and re.fullmatch(r"\d{4,}", value.strip()):
        return round(price / 100, 2)
    return price


def shopify_provider(url: str) -> ProviderResult:
    started = time.time()
    for endpoint in shopify_product_json_urls(url):
        try:
            parsed = http_json(endpoint)
        except Exception:
            continue
        product = parsed.get("product") if isinstance(parsed, dict) and isinstance(parsed.get("product"), dict) else parsed
        if not isinstance(product, dict):
            continue
        media = normalize_image_items([*(product.get("images") or []), product.get("featured_image"), *(product.get("media") or [])], url, "shopify-public-json")
        variants: list[dict[str, Any]] = []
        for variant in (product.get("variants") or [])[:40]:
            if not isinstance(variant, dict):
                continue
            item = compact({
                "name": clean_text(variant.get("title") or variant.get("name") or variant.get("sku")) or "Variant",
                "price": shopify_price(variant.get("price")),
                "sku": clean_text(variant.get("sku")),
                "id": variant.get("id"),
                "available": variant.get("available"),
                "url": f"?variant={variant.get('id')}" if variant.get("id") else None,
            })
            if item.get("price") is not None:
                variants.append(item)
        data = compact({
            "title": clean_text(product.get("title")),
            "description": clean_text(product.get("description") or product.get("body_html")),
            "brand": clean_text(product.get("vendor")),
            "price": shopify_price(product.get("price") or product.get("price_min") or (variants[0].get("price") if variants else None)),
            "stockStatus": "In Stock" if product.get("available") is True else "Out of Stock" if product.get("available") is False else None,
            "image": media[0]["url"] if media else None,
            "productMedia": media[:30],
            "bundlePrices": unique(variants)[:40] if len(variants) > 1 else None,
        })
        return ProviderResult("shopify-public-json", data, duration_ms=round((time.time() - started) * 1000))
    return ProviderResult("shopify-public-json", {}, error="no Shopify public product JSON")


def product_slug_from_url(url: str) -> str | None:
    path = urlparse(url).path.strip("/")
    parts = [part for part in path.split("/") if part]
    if not parts:
        return None
    if "product" in parts:
        index = parts.index("product")
        if index + 1 < len(parts):
            return parts[index + 1]
    if "products" in parts:
        index = parts.index("products")
        if index + 1 < len(parts):
            return parts[index + 1]
    return parts[-1]


def woocommerce_price(prices: Any) -> tuple[float | None, str | None]:
    if not isinstance(prices, dict):
        return clean_price(prices), None
    raw_price = prices.get("price") or prices.get("sale_price") or prices.get("regular_price")
    price = clean_price(raw_price)
    minor_unit = prices.get("currency_minor_unit")
    if price is not None and isinstance(raw_price, str) and re.fullmatch(r"\d+", raw_price) and isinstance(minor_unit, int) and minor_unit > 0:
        price = round(price / (10 ** minor_unit), 2)
    currency = normalize_currency(prices.get("currency_code") or prices.get("currency_symbol"))
    return price, currency


def woocommerce_provider(url: str) -> ProviderResult:
    started = time.time()
    parsed = urlparse(url)
    root = f"{parsed.scheme or 'https'}://{parsed.netloc}"
    slug = product_slug_from_url(url)
    if not slug:
        return ProviderResult("woocommerce-store-api", {}, error="no slug")
    endpoints = [
        f"{root}/wp-json/wc/store/products?slug={quote(slug)}",
        f"{root}/wp-json/wp/v2/product?slug={quote(slug)}",
    ]
    for endpoint in endpoints:
        try:
            payload = http_json(endpoint)
        except Exception:
            continue
        product = payload[0] if isinstance(payload, list) and payload else payload
        if not isinstance(product, dict):
            continue
        price, currency = woocommerce_price(product.get("prices") or product.get("price"))
        title_field = product.get("title")
        content_field = product.get("content")
        yoast = product.get("yoast_head_json") if isinstance(product.get("yoast_head_json"), dict) else {}
        title = product.get("name") or (title_field.get("rendered") if isinstance(title_field, dict) else title_field)
        description = product.get("description") or product.get("short_description") or (content_field.get("rendered") if isinstance(content_field, dict) else content_field)
        media = normalize_image_items(product.get("images") or product.get("image") or yoast.get("og_image") or [], url, "woocommerce-store-api")
        reviews: list[dict[str, Any]] = []
        product_id = product.get("id")
        if product_id:
            try:
                review_payload = http_json(f"{root}/wp-json/wc/store/products/reviews?product_id={product_id}", timeout=6)
                reviews = normalize_review_items(review_payload, "woocommerce-store-api")
            except Exception:
                reviews = []
        data = compact({
            "title": clean_text(title),
            "description": clean_text(description),
            "sku": clean_text(product.get("sku")),
            "price": price,
            "currency": currency,
            "brand": clean_text((product.get("brands") or [{}])[0].get("name") if isinstance(product.get("brands"), list) and product.get("brands") else None),
            "rating": parse_rating(product.get("average_rating")),
            "reviewsCount": to_int(product.get("review_count")),
            "stockStatus": stock_status(product.get("stock_status")) or ("In Stock" if product.get("is_in_stock") is True else "Out of Stock" if product.get("is_in_stock") is False else None),
            "image": media[0]["url"] if media else None,
            "productMedia": media[:30],
            "productReviews": reviews[:20],
        })
        return ProviderResult("woocommerce-store-api", data, duration_ms=round((time.time() - started) * 1000))
    return ProviderResult("woocommerce-store-api", {}, error="no WooCommerce public product endpoint")


def run_public_endpoint_providers(url: str, raw_hint: str = "") -> tuple[dict[str, Any], list[ProviderResult]]:
    hint = raw_hint.lower()
    path = urlparse(url).path
    results: list[ProviderResult] = []
    if "/products/" in path or "shopify" in hint:
        results.append(shopify_provider(url))
    if any(token in hint for token in ["woocommerce", "wp-content/plugins/woocommerce", "wc-add-to-cart"]) or "/product/" in path:
        results.append(woocommerce_provider(url))
    merged: dict[str, Any] = {}
    for result in results:
        if result.data:
            merged = merge_missing(merged, result.data)
    providers = [result.name for result in results if result.data]
    if providers:
        merged = append_sources(merged, providers)
    return merged, results


def firecrawl_provider(url: str, timeout_ms: int | None = None, wait_ms: int | None = None) -> ProviderResult:
    started = time.time()
    api_key = os.getenv("FIRECRAWL_API_KEY")
    if not api_key:
        return ProviderResult("firecrawl", {}, error="FIRECRAWL_API_KEY missing")
    endpoint = os.getenv("FIRECRAWL_API_URL", "https://api.firecrawl.dev/v2/scrape")
    timeout = max(5, int((timeout_ms or EXTERNAL_PROVIDER_TIMEOUT_MS) / 1000))
    payloads = [
        {
            "url": url,
            "formats": [
                "markdown",
                "html",
                {"type": "json", "prompt": PRODUCT_PROMPT, "schema": PRODUCT_SCHEMA},
            ],
            "onlyMainContent": False,
            "waitFor": wait_ms or 1500,
        },
        {"url": url, "formats": ["markdown", "html"], "onlyMainContent": False},
    ]
    last_error = None
    for payload in payloads:
        try:
            response = http_json(endpoint, timeout=timeout, method="POST", payload=payload, extra_headers={"Authorization": f"Bearer {api_key}"})
        except Exception as exc:
            last_error = str(exc)
            continue
        container = response.get("data") if isinstance(response, dict) and isinstance(response.get("data"), dict) else response
        if not isinstance(container, dict):
            continue
        structured = container.get("json") or container.get("extract") or container.get("llm_extraction") or container.get("structured")
        data = normalize_structured_product(structured, url, "firecrawl")
        metadata = container.get("metadata") if isinstance(container.get("metadata"), dict) else {}
        data = merge_missing(data, normalize_structured_product(metadata, url, "firecrawl-metadata"))
        markdown = container.get("markdown") or container.get("content")
        data = merge_missing(data, markdown_to_product(markdown, url, "firecrawl-markdown"))
        html_text = container.get("html") or container.get("rawHtml") or container.get("raw_html")
        return ProviderResult("firecrawl", data, html=html_text if isinstance(html_text, str) else None, markdown=markdown if isinstance(markdown, str) else None, duration_ms=round((time.time() - started) * 1000))
    return ProviderResult("firecrawl", {}, error=last_error or "empty Firecrawl response")


def scrapegraph_provider(url: str, timeout_ms: int | None = None, wait_ms: int | None = None) -> ProviderResult:
    started = time.time()
    api_key = os.getenv("SGAI_API_KEY") or os.getenv("SCRAPEGRAPH_API_KEY")
    if not api_key:
        return ProviderResult("scrapegraph-ai", {}, error="SGAI_API_KEY missing")
    try:
        from scrapegraph_py import FetchConfig, JsonFormatConfig, MarkdownFormatConfig, ScrapeGraphAI
    except Exception as exc:
        return ProviderResult("scrapegraph-ai", {}, error=f"scrapegraph-py unavailable: {exc}")
    try:
        client = ScrapeGraphAI(api_key=api_key)
        result = client.scrape(
            url,
            formats=[
                JsonFormatConfig(prompt=PRODUCT_PROMPT, schema=PRODUCT_SCHEMA),
                MarkdownFormatConfig(mode="reader"),
            ],
            fetch_config=FetchConfig(
                mode="js",
                stealth=True,
                timeout=timeout_ms or EXTERNAL_PROVIDER_TIMEOUT_MS,
                wait=wait_ms or 1500,
                scrolls=int(os.getenv("SGAI_SCROLLS", "2")),
            ),
        )
    except Exception as exc:
        return ProviderResult("scrapegraph-ai", {}, error=str(exc), duration_ms=round((time.time() - started) * 1000))
    if getattr(result, "status", None) != "success":
        return ProviderResult("scrapegraph-ai", {}, error=str(getattr(result, "error", "ScrapeGraphAI failed")), duration_ms=getattr(result, "elapsed_ms", None))
    payload = getattr(result, "data", None) or {}
    container = payload.get("results") if isinstance(payload, dict) and isinstance(payload.get("results"), dict) else payload
    structured = None
    markdown = None
    if isinstance(container, dict):
        json_result = container.get("json") or container.get("extract")
        if isinstance(json_result, dict):
            structured = json_result.get("data") or json_result
        md_result = container.get("markdown")
        markdown = md_result.get("data") if isinstance(md_result, dict) else md_result
    data = merge_missing(
        normalize_structured_product(structured, url, "scrapegraph-ai"),
        markdown_to_product(markdown, url, "scrapegraph-ai-markdown"),
    )
    return ProviderResult("scrapegraph-ai", data, markdown=markdown if isinstance(markdown, str) else None, duration_ms=getattr(result, "elapsed_ms", None) or round((time.time() - started) * 1000))


def crawl4ai_css_schema() -> dict[str, Any]:
    return {
        "name": "Product",
        "baseSelector": "body",
        "fields": [
            {"name": "title", "selector": "h1, [itemprop='name'], meta[property='og:title']", "type": "text"},
            {"name": "price", "selector": "[itemprop='price'], [class*='price'], [data-testid*='price'], meta[property='product:price:amount']", "type": "text"},
            {"name": "description", "selector": "[itemprop='description'], meta[name='description'], meta[property='og:description'], .product-description", "type": "text"},
            {"name": "image", "selector": "meta[property='og:image'], [itemprop='image'], main img", "type": "attribute", "attribute": "content"},
            {"name": "brand", "selector": "[itemprop='brand'], [class*='brand'], .vendor, .product-vendor", "type": "text"},
            {"name": "sku", "selector": "[itemprop='sku'], [data-sku], .sku, [class*='sku']", "type": "text"},
            {"name": "rating", "selector": "[itemprop='ratingValue'], [class*='rating'], [aria-label*='star']", "type": "text"},
            {"name": "reviewsCount", "selector": "[itemprop='reviewCount'], [class*='review'], [data-testid*='review']", "type": "text"},
        ],
    }


def crawl4ai_api_provider(url: str, timeout_ms: int | None = None) -> ProviderResult | None:
    base = os.getenv("CRAWL4AI_API_URL")
    if not base:
        return None
    started = time.time()
    endpoint = base.rstrip("/") + "/crawl"
    try:
        response = http_json(endpoint, timeout=max(5, int((timeout_ms or EXTERNAL_PROVIDER_TIMEOUT_MS) / 1000)), method="POST", payload={"urls": [url], "priority": 10})
    except Exception as exc:
        return ProviderResult("crawl4ai-api", {}, error=str(exc))
    results = response.get("results") if isinstance(response, dict) else None
    first = results[0] if isinstance(results, list) and results else response
    if not isinstance(first, dict):
        return ProviderResult("crawl4ai-api", {}, error="empty Crawl4AI API response")
    html_text = first.get("html") or first.get("cleaned_html") or first.get("raw_html")
    markdown = first.get("markdown") or first.get("fit_markdown")
    data = markdown_to_product(markdown, url, "crawl4ai-api")
    return ProviderResult("crawl4ai-api", data, html=html_text if isinstance(html_text, str) else None, markdown=markdown if isinstance(markdown, str) else None, duration_ms=round((time.time() - started) * 1000))


def crawl4ai_provider(url: str, timeout_ms: int | None = None, wait_ms: int | None = None) -> ProviderResult:
    api_result = crawl4ai_api_provider(url, timeout_ms)
    if api_result is not None:
        return api_result
    started = time.time()
    try:
        from crawl4ai import AsyncWebCrawler, BrowserConfig, CacheMode, CrawlerRunConfig, JsonCssExtractionStrategy
    except Exception as exc:
        return ProviderResult("crawl4ai", {}, error=f"crawl4ai unavailable: {exc}")

    async def run() -> ProviderResult:
        browser_config = BrowserConfig(headless=True, verbose=False)
        strategy = JsonCssExtractionStrategy(crawl4ai_css_schema(), verbose=False)
        run_config = CrawlerRunConfig(
            extraction_strategy=strategy,
            cache_mode=CacheMode.BYPASS,
            wait_for_images=True,
            page_timeout=timeout_ms or EXTERNAL_PROVIDER_TIMEOUT_MS,
            delay_before_return_html=(wait_ms or 1000) / 1000,
            scan_full_page=True,
        )
        async with AsyncWebCrawler(config=browser_config) as crawler:
            result = await crawler.arun(url=url, config=run_config)
        extracted = None
        try:
            extracted = json.loads(result.extracted_content) if result.extracted_content else None
        except Exception:
            extracted = None
        data = merge_missing(
            normalize_structured_product(extracted, url, "crawl4ai-css"),
            markdown_to_product(getattr(result, "markdown", None), url, "crawl4ai-markdown"),
        )
        html_text = getattr(result, "html", None) or getattr(result, "cleaned_html", None)
        return ProviderResult("crawl4ai", data, html=html_text if isinstance(html_text, str) else None, duration_ms=round((time.time() - started) * 1000))

    try:
        return asyncio.run(run())
    except Exception as exc:
        return ProviderResult("crawl4ai", {}, error=str(exc), duration_ms=round((time.time() - started) * 1000))


def camoufox_provider(url: str, timeout_ms: int | None = None, wait_ms: int | None = None) -> ProviderResult:
    started = time.time()
    if os.getenv("CAMOUFOX_ENABLED", "false").lower() not in {"1", "true", "yes", "on"}:
        return ProviderResult("camoufox", {}, error="CAMOUFOX_ENABLED is not true")
    try:
        from camoufox.sync_api import Camoufox
    except Exception as exc:
        return ProviderResult("camoufox", {}, error=f"camoufox unavailable: {exc}")
    try:
        with Camoufox(headless=True) as browser:
            page = browser.new_page()
            page.set_extra_http_headers(headers("text/html,*/*"))
            page.goto(url, wait_until="networkidle", timeout=timeout_ms or EXTERNAL_PROVIDER_TIMEOUT_MS)
            if wait_ms:
                page.wait_for_timeout(wait_ms)
            html_text = page.content()
        return ProviderResult("camoufox", {}, html=html_text, duration_ms=round((time.time() - started) * 1000))
    except Exception as exc:
        return ProviderResult("camoufox", {}, error=str(exc), duration_ms=round((time.time() - started) * 1000))


def browser_use_provider(url: str, timeout_ms: int | None = None, wait_ms: int | None = None) -> ProviderResult:
    started = time.time()
    if os.getenv("BROWSER_USE_ENABLED", "false").lower() not in {"1", "true", "yes", "on"}:
        return ProviderResult("browser-use", {}, error="BROWSER_USE_ENABLED is not true")
    try:
        from browser_use import Agent
        from langchain_openai import ChatOpenAI
    except Exception as exc:
        return ProviderResult("browser-use", {}, error=f"browser-use unavailable: {exc}")

    async def run() -> ProviderResult:
        llm = ChatOpenAI(model=os.getenv("BROWSER_USE_MODEL", "gpt-4o-mini"), temperature=0)
        task = f"Open {url} and extract real product data as strict JSON with keys title, price, currency, stockStatus, description, brand, sku, rating, reviewsCount, image, images, reviews. Do not invent missing values."
        agent = Agent(task=task, llm=llm)
        history = await agent.run(max_steps=int(os.getenv("BROWSER_USE_MAX_STEPS", "8")))
        final = history.final_result() if hasattr(history, "final_result") else str(history)
        match = re.search(r"\{[\s\S]*\}", final or "")
        structured = json.loads(match.group(0)) if match else None
        return ProviderResult("browser-use", normalize_structured_product(structured, url, "browser-use"), markdown=final, duration_ms=round((time.time() - started) * 1000))

    try:
        return asyncio.run(run())
    except Exception as exc:
        return ProviderResult("browser-use", {}, error=str(exc), duration_ms=round((time.time() - started) * 1000))


def run_external_providers(url: str, timeout_ms: int | None = None, wait_ms: int | None = None) -> list[ProviderResult]:
    providers = []
    if provider_is_enabled("firecrawl"):
        providers.append(firecrawl_provider)
    if provider_is_enabled("scrapegraph") or provider_is_enabled("scrapegraph-ai"):
        providers.append(scrapegraph_provider)
    if provider_is_enabled("crawl4ai"):
        providers.append(crawl4ai_provider)
    if provider_is_enabled("camoufox"):
        providers.append(camoufox_provider)
    if provider_is_enabled("browser_use") or provider_is_enabled("browser-use"):
        providers.append(browser_use_provider)

    results: list[ProviderResult] = []
    for provider in providers:
        try:
            results.append(provider(url, timeout_ms, wait_ms))
        except Exception as exc:
            results.append(ProviderResult(getattr(provider, "__name__", "provider"), {}, error=str(exc)))
    return results


def provider_status() -> dict[str, Any]:
    optional_imports = {}
    for module in ["parsel", "scrapegraph_py", "crawl4ai", "camoufox", "browser_use"]:
        try:
            __import__(module)
            optional_imports[module] = True
        except Exception:
            optional_imports[module] = False
    return compact({
        "externalProviders": provider_list_from_env(),
        "alwaysRunExternalProviders": should_run_external_always(),
        "firecrawlConfigured": bool(os.getenv("FIRECRAWL_API_KEY")),
        "scrapeGraphConfigured": bool(os.getenv("SGAI_API_KEY") or os.getenv("SCRAPEGRAPH_API_KEY")),
        "crawl4aiApiConfigured": bool(os.getenv("CRAWL4AI_API_URL")),
        "camoufoxEnabled": os.getenv("CAMOUFOX_ENABLED", "false").lower() in {"1", "true", "yes", "on"},
        "browserUseEnabled": os.getenv("BROWSER_USE_ENABLED", "false").lower() in {"1", "true", "yes", "on"},
        "optionalImports": optional_imports,
    })
