import html
import json
import os
import re
import sys
import time
from datetime import datetime, timezone
from typing import Any
from urllib.parse import urljoin, urlparse

try:
    from scrapling.fetchers import DynamicFetcher, Fetcher, StealthyFetcher
    SCRAPLING_IMPORT_ERROR = None
except Exception as exc:  # pragma: no cover - used only when the dependency is missing/misinstalled
    DynamicFetcher = Fetcher = StealthyFetcher = None
    SCRAPLING_IMPORT_ERROR = str(exc)

DEFAULT_MODE = os.getenv("SCRAPER_MODE", "auto").lower()
DEFAULT_TIMEOUT_MS = int(os.getenv("SCRAPER_TIMEOUT_MS", "45000"))
DEFAULT_WAIT_MS = int(os.getenv("SCRAPER_WAIT_MS", "1200"))
MAX_TEXT_CHARS = 350_000


def clean_text(value: Any) -> str | None:
    if value is None:
        return None
    try:
        if hasattr(value, "clean"):
            value = value.clean()
    except Exception:
        pass
    text = html.unescape(str(value)).replace("\xa0", " ")
    text = re.sub(r"\s+", " ", text).strip()
    return text or None


def compact(value: Any) -> Any:
    if isinstance(value, dict):
        cleaned = {key: compact(val) for key, val in value.items()}
        return {key: val for key, val in cleaned.items() if val not in (None, "", [], {})}
    if isinstance(value, list):
        cleaned = [compact(item) for item in value]
        return [item for item in cleaned if item not in (None, "", [], {})]
    return value


def unique(values: list[Any]) -> list[Any]:
    seen = set()
    result = []
    for value in values:
        marker = json.dumps(value, sort_keys=True, ensure_ascii=False) if isinstance(value, (dict, list)) else str(value)
        if marker not in seen:
            seen.add(marker)
            result.append(value)
    return result


def first_css(page: Any, selectors: list[str]) -> str | None:
    for selector in selectors:
        try:
            value = page.css(selector).get()
            value = clean_text(value)
            if value:
                return value
        except Exception:
            continue
    return None


def all_css(page: Any, selector: str, limit: int = 100) -> list[str]:
    try:
        values = page.css(selector).getall()
    except Exception:
        return []

    cleaned: list[str] = []
    for value in values[:limit]:
        text = clean_text(value)
        if text:
            cleaned.append(text)
    return unique(cleaned)


def clean_price(price_str: Any) -> float | None:
    if price_str is None:
        return None

    raw = html.unescape(str(price_str)).replace("\xa0", " ")
    match = re.search(r"-?\d[\d\s.,]*", raw)
    if not match:
        return None

    clean = re.sub(r"\s+", "", match.group(0))
    clean = re.sub(r"[^0-9,.-]", "", clean)
    if not re.search(r"\d", clean):
        return None

    if "," in clean and "." in clean:
        if clean.rfind(",") > clean.rfind("."):
            clean = clean.replace(".", "").replace(",", ".")
        else:
            clean = clean.replace(",", "")
    elif "," in clean:
        parts = clean.split(",")
        if len(parts[-1]) in (1, 2):
            clean = "".join(parts[:-1]) + "." + parts[-1]
        else:
            clean = clean.replace(",", "")
    elif clean.count(".") > 1:
        parts = clean.split(".")
        if len(parts[-1]) in (1, 2):
            clean = "".join(parts[:-1]) + "." + parts[-1]
        else:
            clean = "".join(parts)

    try:
        price = float(clean)
    except ValueError:
        return None

    if price < 0:
        return None
    return round(price, 2)


def to_number(value: Any) -> float | None:
    if value is None:
        return None
    try:
        number = float(str(value).replace(",", "."))
        return number if number == number else None
    except (TypeError, ValueError):
        return None


def to_int(value: Any) -> int | None:
    if value is None:
        return None
    match = re.search(r"\d[\d\s,.]*", str(value))
    if not match:
        return None
    try:
        return int(re.sub(r"[^0-9]", "", match.group(0)))
    except ValueError:
        return None


def stock_status(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).lower()
    if any(token in text for token in ["outofstock", "out of stock", "soldout", "sold out", "rupture", "épuisé", "indisponible", "unavailable", "discontinued"]):
        return "Out of Stock"
    if any(token in text for token in ["instock", "in stock", "available", "disponible", "en stock", "add to cart", "ajouter au panier", "limitedavailability", "preorder", "backorder"]):
        return "In Stock"
    return None


def normalize_currency(value: Any, fallback_text: str = "") -> str | None:
    if value:
        text = clean_text(value)
        if text:
            text = text.upper()
            symbols = {"€": "EUR", "$": "USD", "£": "GBP"}
            return symbols.get(text, text[:3] if len(text) > 3 else text)
    if "€" in fallback_text:
        return "EUR"
    if "$" in fallback_text:
        return "USD"
    if "£" in fallback_text:
        return "GBP"
    return None


def json_loads_loose(raw: str) -> Any:
    raw = html.unescape(raw).strip()
    raw = re.sub(r"^<!--|-->$", "", raw).strip()
    return json.loads(raw)


def iter_json_nodes(value: Any):
    if isinstance(value, list):
        for item in value:
            yield from iter_json_nodes(item)
    elif isinstance(value, dict):
        yield value
        for key in ("@graph", "mainEntity", "itemListElement", "hasVariant", "isVariantOf"):
            if key in value:
                yield from iter_json_nodes(value[key])
        if isinstance(value.get("item"), dict):
            yield from iter_json_nodes(value["item"])


def has_type(node: dict[str, Any], *names: str) -> bool:
    node_type = node.get("@type")
    values = node_type if isinstance(node_type, list) else [node_type]
    lowered = {str(value).lower() for value in values if value}
    return any(name.lower() in lowered for name in names)


def parse_offers(offers: Any) -> list[dict[str, Any]]:
    if not offers:
        return []
    if isinstance(offers, list):
        result: list[dict[str, Any]] = []
        for offer in offers:
            result.extend(parse_offers(offer))
        return result
    if isinstance(offers, dict):
        nested = offers.get("offers") or offers.get("itemOffered")
        if nested and nested is not offers:
            nested_offers = parse_offers(nested)
            if nested_offers:
                return nested_offers
        return [offers]
    return []


def extract_product_from_node(node: dict[str, Any]) -> dict[str, Any]:
    data: dict[str, Any] = {}

    data["title"] = clean_text(node.get("name"))
    data["description"] = clean_text(node.get("description"))
    data["sku"] = clean_text(node.get("sku") or node.get("mpn") or node.get("gtin13") or node.get("gtin"))

    image = node.get("image")
    if isinstance(image, list) and image:
        data["image"] = clean_text(image[0].get("url") if isinstance(image[0], dict) else image[0])
    elif isinstance(image, dict):
        data["image"] = clean_text(image.get("url"))
    else:
        data["image"] = clean_text(image)

    brand = node.get("brand") or node.get("manufacturer")
    if isinstance(brand, dict):
        data["brand"] = clean_text(brand.get("name"))
    else:
        data["brand"] = clean_text(brand)

    offers = parse_offers(node.get("offers") or node.get("aggregateOffer"))
    offer_prices: list[dict[str, Any]] = []
    for offer in offers:
        price = clean_price(offer.get("price") or offer.get("lowPrice") or offer.get("highPrice"))
        if price is None:
            continue
        name = clean_text(offer.get("name") or offer.get("sku") or offer.get("description") or offer.get("url")) or "Variant"
        offer_prices.append({"name": name[:90], "price": price})

    if offers:
        main_offer = next((offer for offer in offers if clean_price(offer.get("price") or offer.get("lowPrice")) is not None), offers[0])
        data["price"] = clean_price(main_offer.get("price") or main_offer.get("lowPrice") or main_offer.get("highPrice"))
        data["currency"] = normalize_currency(main_offer.get("priceCurrency"))
        data["stockStatus"] = stock_status(main_offer.get("availability") or main_offer.get("itemCondition"))

    if len(offer_prices) > 1:
        data["bundlePrices"] = unique(offer_prices)[:30]

    variants = node.get("hasVariant")
    if isinstance(variants, list):
        variant_prices = []
        for variant in variants:
            if not isinstance(variant, dict):
                continue
            variant_data = extract_product_from_node(variant)
            if variant_data.get("price") is not None:
                variant_prices.append({
                    "name": variant_data.get("title") or variant_data.get("sku") or "Variant",
                    "price": variant_data["price"],
                    "sku": variant_data.get("sku"),
                })
        if variant_prices and not data.get("bundlePrices"):
            data["bundlePrices"] = unique(variant_prices)[:30]

    rating = node.get("aggregateRating")
    if isinstance(rating, dict):
        data["rating"] = to_number(rating.get("ratingValue"))
        data["reviewsCount"] = to_int(rating.get("reviewCount") or rating.get("ratingCount"))

    return compact(data)


def extract_from_json_ld(page: Any) -> dict[str, Any]:
    best: dict[str, Any] = {}
    scripts = all_css(page, 'script[type="application/ld+json"]::text', limit=80)

    for script in scripts:
        try:
            parsed = json_loads_loose(script)
        except Exception:
            continue

        for node in iter_json_nodes(parsed):
            if not isinstance(node, dict) or not has_type(node, "Product", "ProductGroup"):
                continue
            data = extract_product_from_node(node)
            best = {**best, **data}
            if data.get("title") and data.get("price") is not None:
                return best

    return best


def detect_platform(raw: str) -> str | None:
    text = raw.lower()
    if "cdn.shopify.com" in text or "shopify.theme" in text or "shopifyanalytics" in text:
        return "Shopify"
    if "woocommerce" in text or "wp-content/plugins/woocommerce" in text:
        return "WooCommerce"
    if "magento" in text or "mage/" in text or "/static/version" in text:
        return "Magento"
    if "prestashop" in text:
        return "PrestaShop"
    if "bigcommerce" in text or "stencil-utils" in text:
        return "BigCommerce"
    if "salesforce commerce cloud" in text or "demandware" in text:
        return "Salesforce Commerce Cloud"
    return None


def detect_tech_signals(raw: str) -> list[str]:
    checks = {
        "Klaviyo": "klaviyo",
        "Yotpo": "yotpo",
        "Gorgias": "gorgias",
        "Recharge": "rechargeapps",
        "Judge.me": "judge.me",
        "Loox": "loox",
        "Afterpay": "afterpay",
        "Klarna": "klarna",
        "Google Analytics": "google-analytics",
        "Meta Pixel": "connect.facebook.net",
        "TikTok Pixel": "analytics.tiktok.com",
        "Hotjar": "hotjar",
    }
    lowered = raw.lower()
    return [name for name, needle in checks.items() if needle in lowered]


def page_raw_text(page: Any) -> str:
    chunks = all_css(page, "body ::text", limit=3000)
    text = " ".join(chunks)
    if len(text) < 100:
        try:
            body = getattr(page, "body", b"")
            if isinstance(body, bytes):
                text = body.decode(getattr(page, "encoding", "utf-8") or "utf-8", errors="ignore")
            elif body:
                text = str(body)
        except Exception:
            pass
    return text[:MAX_TEXT_CHARS]


def extract_social_links(page: Any, base_url: str) -> dict[str, str]:
    domains = {
        "instagram": "instagram.com",
        "tiktok": "tiktok.com",
        "facebook": "facebook.com",
        "x": "twitter.com",
        "linkedin": "linkedin.com",
        "youtube": "youtube.com",
        "pinterest": "pinterest.",
    }
    links = all_css(page, "a::attr(href)", limit=500)
    social: dict[str, str] = {}
    for href in links:
        absolute = urljoin(base_url, href)
        lowered = absolute.lower()
        for key, domain in domains.items():
            if key not in social and domain in lowered and "share" not in lowered:
                social[key] = absolute
    return social


def extract_brand_signals(page: Any, url: str, fetcher_used: str, raw: str) -> dict[str, Any]:
    parsed = urlparse(url)
    canonical = first_css(page, ['link[rel="canonical"]::attr(href)', 'meta[property="og:url"]::attr(content)'])
    if canonical:
        canonical = urljoin(url, canonical)

    site_name = first_css(page, [
        'meta[property="og:site_name"]::attr(content)',
        'meta[name="application-name"]::attr(content)',
        'meta[name="apple-mobile-web-app-title"]::attr(content)',
    ])

    emails = unique(re.findall(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", raw, flags=re.I))[:5]
    meta_description = first_css(page, ['meta[property="og:description"]::attr(content)', 'meta[name="description"]::attr(content)'])

    return compact({
        "domain": parsed.hostname,
        "siteName": site_name,
        "canonicalUrl": canonical,
        "locale": first_css(page, ['html::attr(lang)', 'meta[property="og:locale"]::attr(content)']),
        "platform": detect_platform(raw),
        "technologies": detect_tech_signals(raw),
        "socialLinks": extract_social_links(page, url),
        "emails": emails,
        "metaDescription": meta_description[:280] if meta_description else None,
        "metaKeywords": first_css(page, ['meta[name="keywords"]::attr(content)']),
        "fetcher": fetcher_used,
    })


BUNDLE_WIDGET_KEYWORDS = [
    "bundle", "bundles", "bundle-builder", "bundlebuilder", "quantity-break", "quantity_break",
    "volume-discount", "volume discount", "frequently-bought", "frequently bought", "buy more",
    "bndlr", "rebuy", "bold-bundles", "kaching", "widebundle", "pumper", "vitals",
    "upsell", "cross-sell", "pack", "packs", "save", "discount",
]

BUNDLE_WIDGET_SELECTORS = [
    '[data-bundle]', '[data-bundle-id]', '[data-bundle-price]', '[data-bundles]', '[data-bundle-builder]',
    '[class*="bundle"]', '[id*="bundle"]', '[class*="bndlr"]', '[id*="bndlr"]',
    '[class*="rebuy"]', '[id*="rebuy"]', '[class*="bold-bundles"]', '[id*="bold-bundles"]',
    '[class*="kaching"]', '[id*="kaching"]', '[class*="widebundle"]', '[id*="widebundle"]',
    '[class*="pumper"]', '[id*="pumper"]', '[class*="quantity-break"]', '[id*="quantity-break"]',
    '[class*="volume-discount"]', '[id*="volume-discount"]', '[class*="frequently"]', '[id*="frequently"]',
    '[class*="upsell"]', '[id*="upsell"]', '[class*="cross-sell"]', '[id*="cross-sell"]',
]


def raw_css_values(page: Any, selector: str, limit: int = 50) -> list[str]:
    try:
        values = page.css(selector).getall()
    except Exception:
        return []
    return [str(value).strip() for value in values[:limit] if str(value).strip()]


def markup_text(markup: str) -> str:
    text = re.sub(r"<script\b[^>]*>[\s\S]*?</script>", " ", markup, flags=re.I)
    text = re.sub(r"<style\b[^>]*>[\s\S]*?</style>", " ", text, flags=re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    return clean_text(text) or ""


def absolutize_url(value: str, base_url: str) -> str:
    value = html.unescape(value.strip())
    if not value or value.startswith(("#", "data:", "mailto:", "tel:", "javascript:")):
        return value
    if value.startswith("//"):
        parsed = urlparse(base_url)
        return f"{parsed.scheme}:{value}"
    return urljoin(base_url, value)


def absolutize_srcset(value: str, base_url: str) -> str:
    parts = []
    for candidate in value.split(","):
        bits = candidate.strip().split()
        if not bits:
            continue
        bits[0] = absolutize_url(bits[0], base_url)
        parts.append(" ".join(bits))
    return ", ".join(parts)


def absolutize_markup_urls(markup: str, base_url: str) -> str:
    def repl(match: re.Match[str]) -> str:
        attr, quote, value = match.group(1), match.group(2), match.group(3)
        if attr.lower() == "srcset":
            value = absolutize_srcset(value, base_url)
        else:
            value = absolutize_url(value, base_url)
        return f'{attr}={quote}{value}{quote}'

    return re.sub(r"\b(src|href|poster|data-src|data-srcset|srcset)=(['\"])(.*?)\2", repl, markup, flags=re.I)


def sanitize_bundle_markup(markup: str, base_url: str) -> str:
    markup = re.sub(r"<script\b[^>]*>[\s\S]*?</script>", "", markup, flags=re.I)
    markup = re.sub(r"\s+on[a-z]+=(['\"]).*?\1", "", markup, flags=re.I | re.S)
    markup = absolutize_markup_urls(markup, base_url)
    return markup.strip()[:35_000]


def extract_markup_asset_urls(markup: str, base_url: str) -> list[dict[str, str]]:
    assets: list[dict[str, str]] = []
    for _attr, _quote, value in re.findall(r"\b(src|href|poster|data-src)=(['\"])(.*?)\2", markup, flags=re.I):
        url = absolutize_url(value, base_url)
        if not url or url.startswith(("#", "data:", "mailto:", "tel:", "javascript:")):
            continue
        lowered = url.lower()
        asset_type = "image" if re.search(r"\.(png|jpe?g|webp|gif|svg|avif)(\?|$)", lowered) else "asset"
        assets.append({"type": asset_type, "url": url, "source": "widget-html"})
    return assets


def is_bundle_asset(url: str) -> bool:
    lowered = url.lower()
    return any(keyword.replace(" ", "-") in lowered or keyword.replace("-", "") in lowered for keyword in BUNDLE_WIDGET_KEYWORDS)


def extract_bundle_assets(page: Any, base_url: str, widget_markup: str) -> tuple[list[dict[str, str]], list[str]]:
    assets: list[dict[str, str]] = []
    inline_css: list[str] = []

    for href in all_css(page, 'link[rel="stylesheet"]::attr(href)', limit=250):
        url = absolutize_url(href, base_url)
        if is_bundle_asset(url):
            assets.append({"type": "stylesheet", "url": url, "source": "page"})

    for src in all_css(page, "script::attr(src)", limit=250):
        url = absolutize_url(src, base_url)
        if is_bundle_asset(url):
            assets.append({"type": "script", "url": url, "source": "page"})

    assets.extend(extract_markup_asset_urls(widget_markup, base_url))

    total_css = 0
    for style in raw_css_values(page, "style::text", limit=120):
        lowered = style.lower()
        if not any(keyword in lowered for keyword in BUNDLE_WIDGET_KEYWORDS):
            continue
        css = style.strip()
        if not css:
            continue
        css = css[:8_000]
        if total_css + len(css) > 16_000:
            break
        inline_css.append(css)
        total_css += len(css)

    return unique(assets)[:30], unique(inline_css)[:4]


def score_bundle_markup(markup: str) -> int:
    text = markup_text(markup)
    searchable = f"{markup} {text}".lower()
    score = 0
    for keyword in BUNDLE_WIDGET_KEYWORDS:
        if keyword in searchable:
            score += 3 if keyword in {"bundle", "bundles", "quantity-break", "volume-discount", "frequently-bought", "bndlr", "rebuy", "bold-bundles", "kaching", "widebundle", "pumper"} else 1
    score += min(4, len(re.findall(r"(?:€|EUR|USD|\$|£|GBP)\s?\d|\d[\d\s.,]*\s?(?:€|EUR|USD|\$|£|GBP)", text, flags=re.I)))
    score += min(3, len(re.findall(r"\b(?:save|off|discount|pack|packs|bundle|buy)\b", text, flags=re.I)))
    score += min(2, markup.lower().count("<button"))
    score += min(2, markup.lower().count("<input"))
    if len(markup) > 60_000:
        score -= 4
    if len(text) < 8:
        score -= 3
    return score


def extract_bundle_widget(page: Any, base_url: str) -> dict[str, Any] | None:
    candidates: list[dict[str, Any]] = []
    seen = set()

    for selector in BUNDLE_WIDGET_SELECTORS:
        for markup in raw_css_values(page, selector, limit=18):
            if not markup or markup in seen:
                continue
            seen.add(markup)
            score = score_bundle_markup(markup)
            if score < 5:
                continue
            candidates.append({"selector": selector, "markup": markup, "score": score, "length": len(markup)})

    if not candidates:
        return None

    candidates.sort(key=lambda item: (item["score"], -min(item["length"], 45_000)), reverse=True)
    winner = candidates[0]
    markup = sanitize_bundle_markup(winner["markup"], base_url)
    if not markup:
        return None

    assets, inline_css = extract_bundle_assets(page, base_url, markup)
    text = markup_text(markup)
    return compact({
        "html": markup,
        "css": inline_css,
        "assets": assets,
        "source": winner["selector"],
        "detectedBy": "bundle-widget-selector",
        "score": winner["score"],
        "text": text[:500] if text else None,
    })


def extract_shopify_variants(page: Any) -> list[dict[str, Any]]:
    variants: list[dict[str, Any]] = []
    scripts = all_css(page, 'script[type="application/json"]::text', limit=40)

    def walk(value: Any):
        if isinstance(value, dict):
            if isinstance(value.get("variants"), list):
                yield value["variants"]
            for child in value.values():
                yield from walk(child)
        elif isinstance(value, list):
            for child in value:
                yield from walk(child)

    for script in scripts:
        if "variants" not in script.lower():
            continue
        try:
            parsed = json_loads_loose(script)
        except Exception:
            continue
        for variant_list in walk(parsed):
            for variant in variant_list[:30]:
                if not isinstance(variant, dict):
                    continue
                price = clean_price(variant.get("price") or variant.get("compare_at_price"))
                if price and price > 10000 and isinstance(variant.get("price"), int):
                    price = round(price / 100, 2)
                item = {
                    "name": clean_text(variant.get("title") or variant.get("name") or variant.get("sku")) or "Variant",
                    "price": price,
                    "sku": clean_text(variant.get("sku")),
                    "id": variant.get("id"),
                    "available": variant.get("available"),
                    "url": f"?variant={variant.get('id')}" if variant.get("id") else None,
                }
                options = {k: clean_text(v) for k, v in variant.items() if re.match(r"option\d+", str(k)) and clean_text(v)}
                if options:
                    item["options"] = options
                variants.append(item)
            if variants:
                return unique(compact(variants))[:30]
    return []


def extract_product_data(page: Any, url: str, fetcher_used: str) -> dict[str, Any]:
    raw = page_raw_text(page)
    json_ld = extract_from_json_ld(page)

    data: dict[str, Any] = dict(json_ld)

    title = first_css(page, [
        'meta[property="og:title"]::attr(content)',
        'meta[name="twitter:title"]::attr(content)',
        "h1#productTitle::text",
        "h1.product-title::text",
        "h1.product_title::text",
        "h1[itemprop='name']::text",
        "h1::text",
        "title::text",
    ])
    data["title"] = data.get("title") or title

    price_text = first_css(page, [
        'meta[property="product:price:amount"]::attr(content)',
        'meta[itemprop="price"]::attr(content)',
        '[itemprop="price"]::attr(content)',
        '[data-price]::attr(data-price)',
        'span.a-price span.a-offscreen::text',
        '#priceblock_ourprice::text',
        '#price_inside_buybox::text',
        '.woocommerce-Price-amount::text',
        '.price-item--regular::text',
        '.price-item--sale::text',
        '.current-price::text',
        '.price::text',
    ])
    data["price"] = data.get("price") if data.get("price") is not None else clean_price(price_text)
    if data.get("price") is None:
        price_match = re.search(r"(?:€|EUR|USD|\$|£|GBP)\s?\d[\d\s.,]*|\d[\d\s.,]*\s?(?:€|EUR|USD|\$|£|GBP)", raw, flags=re.I)
        data["price"] = clean_price(price_match.group(0)) if price_match else None

    description = first_css(page, ['meta[property="og:description"]::attr(content)', 'meta[name="description"]::attr(content)', '#productDescription ::text'])
    data["description"] = data.get("description") or description
    data["promoText"] = (description or data.get("description") or "")[:240] or None

    data["image"] = data.get("image") or first_css(page, ['meta[property="og:image"]::attr(content)', 'meta[name="twitter:image"]::attr(content)', '[itemprop="image"]::attr(src)'])
    if data.get("image"):
        data["image"] = urljoin(url, data["image"])

    data["brand"] = data.get("brand") or first_css(page, ['meta[property="product:brand"]::attr(content)', '[itemprop="brand"]::attr(content)', '[data-brand]::attr(data-brand)', 'meta[property="og:site_name"]::attr(content)'])
    data["currency"] = data.get("currency") or normalize_currency(first_css(page, ['meta[property="product:price:currency"]::attr(content)']), price_text or raw[:5000])
    data["stockStatus"] = data.get("stockStatus") or stock_status(first_css(page, ['link[itemprop="availability"]::attr(href)', '[itemprop="availability"]::attr(content)', '#availability ::text', '.stock::text', '[data-availability]::attr(data-availability)']) or raw[:100_000])

    if not data.get("bundlePrices"):
        data["bundlePrices"] = extract_shopify_variants(page)

    bundle_widget = extract_bundle_widget(page, url)
    if bundle_widget:
        data["bundleWidget"] = bundle_widget

    data["brandSignals"] = extract_brand_signals(page, url, fetcher_used, raw)
    data["scrapedAt"] = datetime.now(timezone.utc).isoformat()

    return compact(data)


def call_with_fallbacks(func: Any, url: str, attempts: list[dict[str, Any]]) -> Any:
    last_error: Exception | None = None
    for kwargs in attempts:
        try:
            return func(url, **kwargs)
        except TypeError as exc:
            last_error = exc
            continue
    if last_error:
        raise last_error
    raise RuntimeError("No fetch attempt was configured")


def fetch_page(url: str, mode: str, timeout_ms: int, wait_ms: int) -> tuple[Any, str]:
    if SCRAPLING_IMPORT_ERROR:
        raise RuntimeError(f"Scrapling import failed: {SCRAPLING_IMPORT_ERROR}")

    headers = {
        "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
        "Cache-Control": "no-cache",
    }

    if mode == "fast":
        page = call_with_fallbacks(Fetcher.get, url, [
            {"stealthy_headers": True, "impersonate": "chrome", "timeout": timeout_ms, "extra_headers": headers},
            {"stealthy_headers": True, "impersonate": "chrome"},
            {},
        ])
        return page, "fast"

    if mode == "dynamic":
        page = call_with_fallbacks(DynamicFetcher.fetch, url, [
            {"headless": True, "network_idle": True, "wait": wait_ms, "timeout": timeout_ms, "disable_resources": False, "extra_headers": headers},
            {"headless": True, "network_idle": True, "wait": wait_ms, "timeout": timeout_ms},
            {"headless": True},
        ])
        return page, "dynamic"

    if mode == "stealth":
        page = call_with_fallbacks(StealthyFetcher.fetch, url, [
            {"headless": True, "network_idle": True, "wait": wait_ms, "timeout": timeout_ms, "solve_cloudflare": True, "block_webrtc": True, "hide_canvas": True, "google_search": True, "extra_headers": headers},
            {"headless": True, "network_idle": True, "wait": wait_ms, "timeout": timeout_ms, "solve_cloudflare": True},
            {"headless": True, "timeout": timeout_ms},
        ])
        return page, "stealth"

    raise ValueError(f"Unsupported scraper mode: {mode}")


def is_useful(data: dict[str, Any]) -> bool:
    return bool(data.get("title") or data.get("price") is not None or data.get("brand") or data.get("description"))


def scrape_url(url: str, mode: str | None = None, timeout_ms: int | None = None, wait_ms: int | None = None) -> dict[str, Any]:
    start = time.time()
    mode = (mode or DEFAULT_MODE or "auto").lower()
    timeout_ms = timeout_ms or DEFAULT_TIMEOUT_MS
    wait_ms = wait_ms or DEFAULT_WAIT_MS

    modes = ["fast", "stealth"] if mode == "auto" else [mode]
    errors: list[str] = []

    for selected_mode in modes:
        try:
            page, fetcher_used = fetch_page(url, selected_mode, timeout_ms, wait_ms)
            data = extract_product_data(page, url, fetcher_used)
            if is_useful(data):
                return {
                    "success": True,
                    "data": data,
                    "meta": {
                        "fetcher": fetcher_used,
                        "durationMs": round((time.time() - start) * 1000),
                    },
                }
            errors.append(f"{selected_mode}: no useful product or brand data extracted")
        except Exception as exc:
            errors.append(f"{selected_mode}: {exc}")

    return {
        "success": False,
        "error": " | ".join(errors) or "Scraping failed",
        "meta": {"durationMs": round((time.time() - start) * 1000)},
    }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "No URL provided"}, ensure_ascii=False))
        sys.exit(1)

    result = scrape_url(sys.argv[1], mode=sys.argv[2] if len(sys.argv) > 2 else None)
    print(json.dumps(result, ensure_ascii=False))
    sys.exit(0 if result.get("success") else 2)
