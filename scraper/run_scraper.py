import html
import json
import os
import re
import sys
import time
from datetime import datetime, timezone
from typing import Any
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen

try:
    from adapters import adapter_summary, detect_adapter_platform, extract_with_adapters
except Exception:  # pragma: no cover - keeps the CLI importable during partial installs
    try:
        from scraper.adapters import adapter_summary, detect_adapter_platform, extract_with_adapters
    except Exception:
        adapter_summary = None
        detect_adapter_platform = None
        extract_with_adapters = None

try:
    from providers import (
        append_sources,
        html_page_from_text,
        merge_missing as provider_merge_missing,
        provider_status,
        run_external_providers,
        run_public_endpoint_providers,
        should_run_external_always,
    )
except Exception:  # pragma: no cover
    try:
        from scraper.providers import (
            append_sources,
            html_page_from_text,
            merge_missing as provider_merge_missing,
            provider_status,
            run_external_providers,
            run_public_endpoint_providers,
            should_run_external_always,
        )
    except Exception:
        append_sources = None
        html_page_from_text = None
        provider_merge_missing = None
        provider_status = None
        run_external_providers = None
        run_public_endpoint_providers = None
        should_run_external_always = None


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
    if "<" in text and ">" in text:
        text = re.sub(r"<script\b[^>]*>[\s\S]*?</script>", " ", text, flags=re.I)
        text = re.sub(r"<style\b[^>]*>[\s\S]*?</style>", " ", text, flags=re.I)
        text = re.sub(r"<[^>]+>", " ", text)
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


def parse_rating(value: Any) -> float | None:
    if value is None:
        return None
    match = re.search(r"\d+(?:[\.,]\d+)?", str(value))
    if not match:
        return None
    try:
        rating = float(match.group(0).replace(",", "."))
    except ValueError:
        return None
    if 0 <= rating <= 5:
        return round(rating, 2)
    if 5 < rating <= 100 and "%" in str(value):
        return round(rating / 20, 2)
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

    reviews = node.get("review")
    if isinstance(reviews, dict):
        reviews = [reviews]
    if isinstance(reviews, list):
        review_items = []
        for review in reviews[:20]:
            if not isinstance(review, dict):
                continue
            author = review.get("author")
            if isinstance(author, dict):
                author = author.get("name")
            review_rating = review.get("reviewRating")
            rating_value = review_rating.get("ratingValue") if isinstance(review_rating, dict) else None
            review_items.append(compact({
                "author": clean_text(author),
                "title": clean_text(review.get("name") or review.get("headline")),
                "body": clean_text(review.get("reviewBody") or review.get("description")),
                "rating": parse_rating(rating_value),
                "date": clean_text(review.get("datePublished")),
                "source": "json-ld",
            }))
        if review_items:
            data["productReviews"] = unique(review_items)[:20]

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


MARKETPLACE_PROFILES: dict[str, dict[str, Any]] = {
    "amazon": {
        "domains": ["amazon."],
        "platform": "Amazon",
        "title": ["#productTitle::text", "#title::text", 'meta[name="title"]::attr(content)'],
        "price": ["#corePrice_feature_div .a-offscreen::text", ".a-price .a-offscreen::text", "#priceblock_ourprice::text", "#priceblock_dealprice::text", "#price_inside_buybox::text"],
        "image": ["#landingImage::attr(src)", "#imgTagWrapperId img::attr(src)", 'meta[property="og:image"]::attr(content)'],
        "brand": ["#bylineInfo::text", "tr.po-brand .po-break-word::text", 'a#bylineInfo::text'],
        "sku": ["#ASIN::attr(value)", '[name="ASIN"]::attr(value)', '[data-asin]::attr(data-asin)'],
        "rating": ["#acrPopover::attr(title)", "span[data-hook='rating-out-of-text']::text", ".reviewCountTextLinkedHistogram::attr(title)"],
        "reviews": ["#acrCustomerReviewText::text", "span[data-hook='total-review-count']::text"],
        "stock": ["#availability ::text", "#outOfStock ::text"],
    },
    "etsy": {
        "domains": ["etsy.com"],
        "platform": "Etsy",
        "title": ['h1[data-buy-box-listing-title]::text', "h1::text", 'meta[property="og:title"]::attr(content)'],
        "price": ['p[data-buy-box-region="price"]::text', '[data-buy-box-region="price"] .currency-value::text', '.wt-text-title-03::text'],
        "image": ['meta[property="og:image"]::attr(content)', '.listing-page-image img::attr(src)', '[data-carousel-first-image] img::attr(src)'],
        "brand": ['meta[property="og:site_name"]::attr(content)', '[data-region="shop-info"] a::text', '.shop-name-and-title-container a::text'],
        "rating": ['input[name="initial-rating"]::attr(value)', '[aria-label*="star"]::attr(aria-label)'],
        "reviews": ['a[href*="reviews"]::text', '[data-reviews-pagination]::text'],
        "stock": ['[data-buy-box-region="stock-indicator"]::text', '[data-selector="listing-page-cart"] ::text'],
    },
    "ebay": {
        "domains": ["ebay."],
        "platform": "eBay",
        "title": ["h1.x-item-title__mainTitle span::text", "#itemTitle::text", "h1::text"],
        "price": [".x-price-primary span::text", "#prcIsum::text", "#mm-saleDscPrc::text", '[itemprop="price"]::attr(content)'],
        "image": ['meta[property="og:image"]::attr(content)', '#icImg::attr(src)', '.ux-image-carousel-item img::attr(src)'],
        "brand": ['[itemprop="brand"]::text', '.ux-labels-values__values ::text'],
        "sku": ['[itemprop="sku"]::attr(content)', '[data-testid="x-item-condition-value"]::text'],
        "rating": ['[aria-label*="stars"]::attr(aria-label)'],
        "reviews": ['[aria-label*="reviews"]::text'],
        "stock": ['#qtySubTxt::text', '.d-quantity__availability ::text'],
    },
    "walmart": {
        "domains": ["walmart."],
        "platform": "Walmart",
        "title": ['h1[itemprop="name"]::text', "h1::text", 'meta[property="og:title"]::attr(content)'],
        "price": ['[itemprop="price"]::attr(content)', '[data-testid="price-wrap"] ::text', 'span[itemprop="price"]::text'],
        "image": ['meta[property="og:image"]::attr(content)', '[data-testid="hero-image"]::attr(src)', 'img.db::attr(src)'],
        "brand": ['[itemprop="brand"]::text', '[data-testid="product-brand"]::text'],
        "sku": ['[itemprop="sku"]::attr(content)', '[data-testid="product-sku"]::text'],
        "rating": ['[itemprop="ratingValue"]::attr(content)', '[data-testid="reviews-and-ratings"]::text'],
        "reviews": ['[itemprop="reviewCount"]::attr(content)', '[data-testid="reviews-and-ratings"]::text'],
        "stock": ['[data-testid="fulfillment-cta"] ::text', '[data-testid="add-to-cart-section"] ::text'],
    },
    "aliexpress": {
        "domains": ["aliexpress."],
        "platform": "AliExpress",
        "title": ['h1[data-pl="product-title"]::text', "h1::text", 'meta[property="og:title"]::attr(content)'],
        "price": ['[class*="price"]::text', 'meta[property="product:price:amount"]::attr(content)'],
        "image": ['meta[property="og:image"]::attr(content)', '[class*="slider"] img::attr(src)'],
        "brand": ['[class*="store"] a::text', 'meta[property="og:site_name"]::attr(content)'],
        "rating": ['[class*="rating"]::text'],
        "reviews": ['[class*="review"]::text'],
        "stock": ['[class*="quantity"]::text', '[class*="shipping"]::text'],
    },
    "temu": {
        "domains": ["temu.com"],
        "platform": "Temu",
        "title": ["h1::text", 'meta[property="og:title"]::attr(content)'],
        "price": ['[class*="price"]::text', 'meta[property="product:price:amount"]::attr(content)'],
        "image": ['meta[property="og:image"]::attr(content)', 'img[src*="img.kwcdn"]::attr(src)'],
        "brand": ['meta[property="og:site_name"]::attr(content)'],
        "rating": ['[class*="rating"]::text'],
        "reviews": ['[class*="review"]::text'],
        "stock": ['[class*="stock"]::text', '[class*="quantity"]::text'],
    },
    "shein": {
        "domains": ["shein.com"],
        "platform": "SHEIN",
        "title": [".product-intro__head-name::text", "h1::text", 'meta[property="og:title"]::attr(content)'],
        "price": [".from::text", ".original::text", ".product-intro__head-mainprice::text", '[class*="price"]::text'],
        "image": ['meta[property="og:image"]::attr(content)', '.product-intro__thumbs-inner img::attr(src)', '.crop-image-container img::attr(src)'],
        "brand": ['.product-intro__head-brand::text', 'meta[property="og:site_name"]::attr(content)'],
        "sku": ['.product-intro__head-sku::text'],
        "rating": ['[class*="rate"]::text'],
        "reviews": ['[class*="review"]::text'],
        "stock": ['[class*="stock"]::text', '[class*="sold-out"]::text'],
    },
    "woocommerce": {
        "domains": [],
        "platform": "WooCommerce",
        "title": ["h1.product_title::text", "h1.entry-title::text", "h1::text"],
        "price": [".woocommerce-Price-amount::text", "p.price::text", ".price ins .amount::text", ".price .amount::text"],
        "image": ['.woocommerce-product-gallery__image img::attr(src)', 'meta[property="og:image"]::attr(content)'],
        "brand": ['.posted_in a::text', '[rel="tag"]::text', 'meta[property="og:site_name"]::attr(content)'],
        "sku": [".sku::text"],
        "rating": ['.woocommerce-product-rating .star-rating::attr(aria-label)', '.woocommerce-review-link::text'],
        "reviews": ['.woocommerce-review-link::text'],
        "stock": ['.stock::text', '.single_add_to_cart_button::text'],
    },
    "magento": {
        "domains": [],
        "platform": "Magento",
        "title": ['h1.page-title span::text', 'h1::text'],
        "price": ['[data-price-type="finalPrice"]::attr(data-price-amount)', '[data-price-type="finalPrice"] .price::text', '.price-final_price .price::text'],
        "image": ['meta[property="og:image"]::attr(content)', '.fotorama__img::attr(src)', '.gallery-placeholder img::attr(src)'],
        "brand": ['[data-th="Brand"]::text', '.product.attribute.brand ::text'],
        "sku": ['.product.attribute.sku .value::text', '[itemprop="sku"]::text'],
        "rating": ['.rating-result::attr(title)', '[itemprop="ratingValue"]::attr(content)'],
        "reviews": ['.reviews-actions .view::text', '[itemprop="reviewCount"]::attr(content)'],
        "stock": ['.stock::text', '.box-tocart ::text'],
    },
    "prestashop": {
        "domains": [],
        "platform": "PrestaShop",
        "title": ['h1[itemprop="name"]::text', 'h1::text'],
        "price": ['.current-price span::attr(content)', '.current-price span::text', '[itemprop="price"]::attr(content)'],
        "image": ['meta[property="og:image"]::attr(content)', '.product-cover img::attr(src)'],
        "brand": ['.product-manufacturer a::text', '[itemprop="brand"]::text'],
        "sku": ['[itemprop="sku"]::text'],
        "rating": ['[itemprop="ratingValue"]::attr(content)'],
        "reviews": ['[itemprop="reviewCount"]::attr(content)'],
        "stock": ['#product-availability::text', '.add-to-cart::text'],
    },
    "bigcommerce": {
        "domains": [],
        "platform": "BigCommerce",
        "title": ['h1.productView-title::text', 'h1::text'],
        "price": ['.price--withoutTax::text', '.price--withTax::text', '[data-product-price-without-tax]::text'],
        "image": ['meta[property="og:image"]::attr(content)', '.productView-image img::attr(src)'],
        "brand": ['.productView-brand a::text', '[itemprop="brand"]::text'],
        "sku": ['[data-product-sku]::text', '[itemprop="sku"]::text'],
        "rating": ['[aria-label*="Rating"]::attr(aria-label)', '.rating--small::attr(title)'],
        "reviews": ['.productView-reviewLink::text'],
        "stock": ['[data-product-stock]::text', '.form-action .button::text'],
    },
}

GENERIC_SELECTORS: dict[str, list[str]] = {
    "title": [
        'meta[property="og:title"]::attr(content)', 'meta[name="twitter:title"]::attr(content)',
        '[itemprop="name"]::attr(content)', '[itemprop="name"]::text', '[data-testid*="title"]::text',
        '[data-test*="title"]::text', '.product-title::text', '.product_title::text', '.product-name::text',
        '.pdp-title::text', '.productView-title::text', 'h1::text', 'title::text',
    ],
    "price": [
        'meta[property="product:price:amount"]::attr(content)', 'meta[itemprop="price"]::attr(content)',
        '[itemprop="price"]::attr(content)', '[data-price]::attr(data-price)', '[data-product-price]::attr(data-product-price)',
        '[data-testid*="price"]::text', '[data-test*="price"]::text', '[class*="price"]::text',
        '.a-price .a-offscreen::text', '.woocommerce-Price-amount::text', '.price-item--sale::text',
        '.price-item--regular::text', '.current-price::text', '.sale-price::text', '.regular-price::text', '.price::text',
    ],
    "description": [
        'meta[property="og:description"]::attr(content)', 'meta[name="description"]::attr(content)',
        '[itemprop="description"]::text', '#productDescription ::text', '.product-description ::text',
        '.description ::text', '[data-testid*="description"]::text',
    ],
    "image": [
        'meta[property="og:image"]::attr(content)', 'meta[name="twitter:image"]::attr(content)',
        '[itemprop="image"]::attr(content)', '[itemprop="image"]::attr(src)',
        '.product img::attr(src)', '.product-media img::attr(src)', '.product-gallery img::attr(src)',
        '[data-testid*="image"] img::attr(src)', 'main img::attr(src)',
    ],
    "brand": [
        'meta[property="product:brand"]::attr(content)', '[itemprop="brand"]::attr(content)', '[itemprop="brand"]::text',
        '[data-brand]::attr(data-brand)', '[data-testid*="brand"]::text', '.brand::text', '.vendor::text',
        '.product-vendor::text', 'meta[property="og:site_name"]::attr(content)',
    ],
    "sku": [
        '[itemprop="sku"]::attr(content)', '[itemprop="sku"]::text', '[data-sku]::attr(data-sku)',
        '.sku::text', '[class*="sku"]::text', '[id*="sku"]::text',
    ],
    "rating": [
        '[itemprop="ratingValue"]::attr(content)', '[aria-label*="star"]::attr(aria-label)',
        '[aria-label*="étoile"]::attr(aria-label)', '[class*="rating"]::attr(title)', '[class*="rating"]::text',
    ],
    "reviews": [
        '[itemprop="reviewCount"]::attr(content)', '[class*="review"]::text', '[data-testid*="review"]::text',
        '[aria-label*="review"]::attr(aria-label)', '[aria-label*="avis"]::attr(aria-label)',
    ],
    "stock": [
        'link[itemprop="availability"]::attr(href)', '[itemprop="availability"]::attr(content)',
        '#availability ::text', '.stock::text', '[data-availability]::attr(data-availability)',
        '[data-testid*="stock"]::text', '[class*="availability"]::text', '[class*="sold-out"]::text',
        'button[name="add"]::text', '[type="submit"]::text',
    ],
}

MARKETPLACE_HINTS = {
    "amazon.": "Amazon",
    "etsy.com": "Etsy",
    "ebay.": "eBay",
    "walmart.": "Walmart",
    "aliexpress.": "AliExpress",
    "temu.com": "Temu",
    "shein.com": "SHEIN",
    "dhgate.com": "DHgate",
    "wish.com": "Wish",
    "shopee.": "Shopee",
    "lazada.": "Lazada",
    "mercadolibre.": "MercadoLibre",
    "rakuten.": "Rakuten",
    "target.com": "Target",
    "bestbuy.com": "Best Buy",
    "shop.app": "Shop App",
}


def profile_for_url(url: str, raw: str = "") -> dict[str, Any] | None:
    host = (urlparse(url).hostname or "").lower().replace("www.", "")
    lowered_raw = raw.lower()
    for profile in MARKETPLACE_PROFILES.values():
        if any(domain in host for domain in profile.get("domains", [])):
            return profile
    platform = detect_platform(raw, url)
    if platform:
        for profile in MARKETPLACE_PROFILES.values():
            if profile.get("platform") == platform:
                return profile
    if "woocommerce" in lowered_raw:
        return MARKETPLACE_PROFILES["woocommerce"]
    if "magento" in lowered_raw or "mage/" in lowered_raw:
        return MARKETPLACE_PROFILES["magento"]
    if "prestashop" in lowered_raw:
        return MARKETPLACE_PROFILES["prestashop"]
    if "bigcommerce" in lowered_raw or "stencil-utils" in lowered_raw:
        return MARKETPLACE_PROFILES["bigcommerce"]
    return None


def deep_find_product_json(value: Any, depth: int = 0):
    if depth > 9:
        return
    if isinstance(value, dict):
        keys = {str(key).lower() for key in value.keys()}
        has_price = bool(keys & {"price", "priceamount", "saleprice", "finalprice", "currentprice", "amount", "lowprice", "highprice"})
        has_title = bool(keys & {"title", "name", "productname"})
        has_product_marker = bool(keys & {"product", "productid", "product_id", "sku", "asin", "variants", "offers"})
        if has_price and (has_title or has_product_marker):
            yield value
        for child in value.values():
            yield from deep_find_product_json(child, depth + 1)
    elif isinstance(value, list):
        for child in value[:80]:
            yield from deep_find_product_json(child, depth + 1)


def pick_from_keys(record: dict[str, Any], keys: list[str]) -> Any:
    lowered = {str(key).lower(): key for key in record.keys()}
    for key in keys:
        actual = lowered.get(key.lower())
        if actual is not None:
            return record.get(actual)
    return None


def extract_product_from_embedded_record(record: dict[str, Any]) -> dict[str, Any]:
    title = pick_from_keys(record, ["title", "name", "productName", "displayName"])
    price_value = pick_from_keys(record, ["price", "priceAmount", "salePrice", "finalPrice", "currentPrice", "amount", "lowPrice", "highPrice"])
    if isinstance(price_value, dict):
        price_value = pick_from_keys(price_value, ["value", "amount", "price", "centAmount", "currencyAmount"])
    image = pick_from_keys(record, ["image", "imageUrl", "imageURL", "thumbnail", "thumbnailUrl", "media", "images"])
    if isinstance(image, list) and image:
        image = image[0]
    if isinstance(image, dict):
        image = pick_from_keys(image, ["url", "src", "imageUrl"])
    brand = pick_from_keys(record, ["brand", "brandName", "manufacturer", "sellerName", "shopName", "vendor"])
    if isinstance(brand, dict):
        brand = pick_from_keys(brand, ["name", "brandName"])
    rating = pick_from_keys(record, ["rating", "ratingValue", "averageRating", "stars"])
    reviews = pick_from_keys(record, ["reviewCount", "reviewsCount", "ratingCount", "totalReviews", "reviews"])
    sku = pick_from_keys(record, ["sku", "asin", "productId", "productID", "id", "mpn"])
    currency = pick_from_keys(record, ["currency", "priceCurrency", "currencyCode"])
    availability = pick_from_keys(record, ["availability", "stock", "stockStatus", "isAvailable", "available"])

    data = {
        "title": clean_text(title),
        "price": clean_price(price_value),
        "image": clean_text(image),
        "brand": clean_text(brand),
        "sku": clean_text(sku),
        "currency": normalize_currency(currency),
        "rating": parse_rating(rating),
        "reviewsCount": to_int(reviews),
        "stockStatus": stock_status(availability) or ("In Stock" if availability is True else "Out of Stock" if availability is False else None),
    }
    return compact(data)


def extract_from_embedded_json(page: Any) -> dict[str, Any]:
    best: dict[str, Any] = {}
    scripts = all_css(page, "script::text", limit=160)
    scripts.extend(raw_css_values(page, 'script#__NEXT_DATA__::text', limit=3))
    scripts.extend(raw_css_values(page, 'script[id*="initial" i]::text', limit=10))
    for script in scripts:
        if not any(token in script.lower() for token in ["price", "product", "sku", "asin", "offers"]):
            continue
        candidates: list[str] = []
        stripped = script.strip()
        if stripped.startswith("{") or stripped.startswith("["):
            candidates.append(stripped)
        for pattern in [
            r"(?:self\.__next_f|window\.__INITIAL_STATE__|window\.__PRELOADED_STATE__|window\.__APOLLO_STATE__|window\.__NUXT__)\s*=\s*({[\s\S]*?});?$",
        ]:
            match = re.search(pattern, script, flags=re.I)
            if match:
                candidates.append(match.group(1))
        for candidate in candidates[:3]:
            try:
                parsed = json_loads_loose(candidate)
            except Exception:
                continue
            for record in deep_find_product_json(parsed):
                if not isinstance(record, dict):
                    continue
                data = extract_product_from_embedded_record(record)
                score = sum(1 for key in ["title", "price", "image", "brand", "sku", "rating", "reviewsCount", "stockStatus"] if data.get(key) is not None)
                if score > sum(1 for key in ["title", "price", "image", "brand", "sku", "rating", "reviewsCount", "stockStatus"] if best.get(key) is not None):
                    best = {**best, **data}
                if best.get("title") and best.get("price") is not None and best.get("image"):
                    return best
    return best


def extract_with_selectors(page: Any, selectors: dict[str, list[str]], raw: str, base_url: str) -> dict[str, Any]:
    price_text = first_css(page, selectors.get("price", []))
    image = first_css(page, selectors.get("image", []))
    if image:
        image = absolutize_url(image, base_url)
    data = {
        "title": first_css(page, selectors.get("title", [])),
        "price": clean_price(price_text),
        "description": first_css(page, selectors.get("description", [])),
        "image": image,
        "brand": first_css(page, selectors.get("brand", [])),
        "sku": first_css(page, selectors.get("sku", [])),
        "currency": normalize_currency(first_css(page, ['meta[property="product:price:currency"]::attr(content)', 'meta[itemprop="priceCurrency"]::attr(content)']), price_text or raw[:5000]),
        "rating": parse_rating(first_css(page, selectors.get("rating", []))),
        "reviewsCount": to_int(first_css(page, selectors.get("reviews", []))),
        "stockStatus": stock_status(first_css(page, selectors.get("stock", [])) or raw[:100_000]),
    }
    return compact(data)


def merge_missing(base: dict[str, Any], *sources: dict[str, Any]) -> dict[str, Any]:
    merged = dict(base)
    for source in sources:
        for key, value in source.items():
            if value in (None, "", [], {}):
                continue
            if merged.get(key) in (None, "", [], {}):
                merged[key] = value
    return merged


def detect_platform(raw: str, url: str = "") -> str | None:
    text = raw.lower()
    host = (urlparse(url).hostname or "").lower().replace("www.", "")
    for needle, name in MARKETPLACE_HINTS.items():
        if needle in host:
            return name
    adapter_platform = detect_adapter_platform(url, raw) if detect_adapter_platform else None
    if adapter_platform:
        return adapter_platform
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
        "platform": detect_platform(raw, url),
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


def is_probably_product_image(url: str) -> bool:
    lowered = url.lower()
    if not url or url.startswith(("data:", "blob:", "javascript:", "mailto:", "tel:")):
        return False
    if any(token in lowered for token in ["sprite", "icon", "logo", "avatar", "placeholder", "blank", "loading", "pixel", "tracking", "badge", "payment", "flag"]):
        return False
    if not re.search(r"\.(?:png|jpe?g|webp|gif|avif)(?:\?|$)", lowered) and not any(token in lowered for token in ["cdn.shopify.com", "images", "image", "product", "media"]):
        return False
    return True


def prefer_https_url(value: str) -> str:
    try:
        parsed = urlparse(value)
    except Exception:
        return value
    if parsed.scheme == "http" and parsed.netloc:
        return parsed._replace(scheme="https").geturl()
    return value


def image_item(url: str, base_url: str, source: str, alt: str | None = None) -> dict[str, Any] | None:
    absolute = prefer_https_url(absolutize_url(url.rstrip(");, \"'"), base_url))
    if not is_probably_product_image(absolute):
        return None
    return compact({"url": absolute, "alt": alt, "source": source, "type": "image"})


def extract_product_media(page: Any, base_url: str, primary_image: str | None = None) -> list[dict[str, Any]]:
    media: list[dict[str, Any]] = []
    if primary_image:
        item = image_item(primary_image, base_url, "image", "Product image")
        if item:
            media.append(item)

    selectors = [
        'meta[property="og:image"]::attr(content)', 'meta[name="twitter:image"]::attr(content)',
        '[itemprop="image"]::attr(content)', '[itemprop="image"]::attr(src)',
        '.product img::attr(src)', '.product-media img::attr(src)', '.product-gallery img::attr(src)', '.product__media img::attr(src)',
        '.product-single__media img::attr(src)', '.productView-image img::attr(src)', '.woocommerce-product-gallery__image img::attr(src)',
        '.gallery img::attr(src)', '[class*="gallery"] img::attr(src)', '[class*="carousel"] img::attr(src)', 'main img::attr(src)',
        'img::attr(data-src)', 'img::attr(data-original)', 'img::attr(src)',
    ]
    for selector in selectors:
        for value in all_css(page, selector, limit=80):
            item = image_item(value, base_url, selector)
            if item:
                media.append(item)

    for srcset in all_css(page, "img::attr(srcset)", limit=80):
        candidates = []
        for part in srcset.split(","):
            bits = part.strip().split()
            if bits:
                candidates.append(bits[0])
        if candidates:
            item = image_item(candidates[-1], base_url, "srcset")
            if item:
                media.append(item)

    return unique(media)[:30]


REVIEW_CARD_SELECTORS = [
    '[data-hook="review"]', '[data-review-id]', '[itemprop="review"]', '.review', '.reviews .card', '.jdgm-rev', '.spr-review', '.yotpo-review', '.loox-review', '[class*="review-item"]', '[class*="ReviewItem"]'
]


def extract_product_reviews(page: Any) -> list[dict[str, Any]]:
    reviews: list[dict[str, Any]] = []
    for selector in REVIEW_CARD_SELECTORS:
        for markup in raw_css_values(page, selector, limit=30):
            text = markup_text(markup)
            if not text or len(text) < 18:
                continue
            lowered = text.lower()
            if not any(token in lowered for token in ["review", "star", "stars", "avis", "rated", "rating", "verified", "recommend", "love", "great", "excellent"]):
                continue
            rating = parse_rating(text)
            date_match = re.search(r"\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2},?\s+\d{4})\b", text, flags=re.I)
            reviews.append(compact({"body": text[:700], "rating": rating, "date": date_match.group(0) if date_match else None, "source": selector}))
        if len(reviews) >= 12:
            break
    return unique(reviews)[:20]


def enrich_reviews_from_counts(existing: list[dict[str, Any]], rating: float | None, reviews_count: int | None) -> list[dict[str, Any]]:
    if existing:
        return existing
    if rating is None and reviews_count is None:
        return []
    return [compact({"rating": rating, "count": reviews_count, "source": "aggregate-rating"})]


def fetch_json_url(url: str, timeout: int = 12) -> Any:
    request = Request(url, headers={
        "User-Agent": "Mozilla/5.0 PriceAndSee Scraper",
        "Accept": "application/json,text/plain,*/*;q=0.8",
    })
    with urlopen(request, timeout=timeout) as response:
        raw = response.read(2_500_000).decode("utf-8", "ignore")
    return json.loads(raw)


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


def shopify_catalog_json_urls(url: str) -> list[str]:
    parsed = urlparse(url)
    if not parsed.netloc:
        return []
    root = f"{parsed.scheme or 'https'}://{parsed.netloc}"
    return [f"{root}/products.json?limit=250"]


def shopify_product_url(root_url: str, handle: Any) -> str | None:
    handle_text = clean_text(handle)
    return f"{root_url.rstrip('/')}/products/{handle_text}" if handle_text else None


def shopify_catalog_image(value: Any, base_url: str) -> str | None:
    if isinstance(value, str):
        return prefer_https_url(absolutize_url(value, base_url))
    if isinstance(value, dict):
        src = value.get("src") or value.get("url") or value.get("original_src")
        if src:
            return prefer_https_url(absolutize_url(str(src), base_url))
    return None


def extract_shopify_product_catalog(url: str) -> list[dict[str, Any]]:
    root = None
    parsed_url = urlparse(url)
    if parsed_url.netloc:
        root = f"{parsed_url.scheme or 'https'}://{parsed_url.netloc}"
    if not root:
        return []

    for endpoint in shopify_catalog_json_urls(url):
        try:
            parsed = fetch_json_url(endpoint)
        except Exception:
            continue
        products = parsed.get("products") if isinstance(parsed, dict) else None
        if not isinstance(products, list):
            continue
        catalog: list[dict[str, Any]] = []
        for product in products[:80]:
            if not isinstance(product, dict):
                continue
            variants = [variant for variant in (product.get("variants") or []) if isinstance(variant, dict)]
            first_variant = variants[0] if variants else {}
            images = product.get("images") if isinstance(product.get("images"), list) else []
            image = shopify_catalog_image(product.get("image") or product.get("featured_image") or (images[0] if images else None), root)
            catalog.append(compact({
                "title": clean_text(product.get("title")),
                "handle": clean_text(product.get("handle")),
                "url": shopify_product_url(root, product.get("handle")),
                "image": image,
                "price": shopify_price(first_variant.get("price") or product.get("price") or product.get("price_min")),
                "compareAtPrice": shopify_price(first_variant.get("compare_at_price") or product.get("compare_at_price")),
                "available": first_variant.get("available") if isinstance(first_variant.get("available"), bool) else product.get("available") if isinstance(product.get("available"), bool) else None,
                "vendor": clean_text(product.get("vendor")),
                "productType": clean_text(product.get("product_type") or product.get("type")),
                "variantsCount": len(variants) or None,
                "source": "shopify-products-json",
            }))
        if catalog:
            return unique(catalog)[:80]
    return []


def extract_shopify_product_json(url: str) -> dict[str, Any]:
    for endpoint in shopify_product_json_urls(url):
        try:
            parsed = fetch_json_url(endpoint)
        except Exception:
            continue
        product = parsed.get("product") if isinstance(parsed, dict) and isinstance(parsed.get("product"), dict) else parsed
        if not isinstance(product, dict):
            continue

        media: list[dict[str, Any]] = []
        for image in product.get("images") or []:
            if isinstance(image, dict):
                src = image.get("src") or image.get("url") or image.get("original_src")
                alt = clean_text(image.get("alt"))
            else:
                src = image
                alt = None
            if src:
                item = image_item(str(src), url, "shopify-product-json", alt)
                if item:
                    media.append(item)

        for item in product.get("media") or []:
            if not isinstance(item, dict):
                continue
            preview = item.get("preview_image")
            src = None
            if isinstance(preview, dict):
                src = preview.get("src") or preview.get("url")
            src = src or item.get("src") or item.get("url")
            if src:
                image = image_item(str(src), url, "shopify-product-media", clean_text(item.get("alt")))
                if image:
                    media.append(image)

        featured = product.get("featured_image")
        if isinstance(featured, dict):
            featured = featured.get("src") or featured.get("url")
        featured_item = image_item(str(featured), url, "shopify-featured", "Featured product image") if featured else None
        if featured_item:
            media.insert(0, featured_item)

        variants: list[dict[str, Any]] = []
        for variant in (product.get("variants") or [])[:30]:
            if not isinstance(variant, dict):
                continue
            variant_item = compact({
                "name": clean_text(variant.get("title") or variant.get("name") or variant.get("sku")) or "Variant",
                "price": shopify_price(variant.get("price")),
                "sku": clean_text(variant.get("sku")),
                "id": variant.get("id"),
                "available": variant.get("available"),
                "url": f"?variant={variant.get('id')}" if variant.get("id") else None,
            })
            if variant_item.get("price") is not None:
                variants.append(variant_item)

        return compact({
            "title": clean_text(product.get("title")),
            "description": clean_text(product.get("description") or product.get("body_html")),
            "brand": clean_text(product.get("vendor")),
            "price": shopify_price(product.get("price") or product.get("price_min")),
            "stockStatus": "In Stock" if product.get("available") is True else "Out of Stock" if product.get("available") is False else None,
            "image": media[0]["url"] if media else None,
            "productMedia": unique(media)[:30],
            "bundlePrices": unique(variants)[:30] if len(variants) > 1 else None,
        })
    return {}


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
                raw_variant_price = variant.get("price") or variant.get("compare_at_price")
                if price and isinstance(raw_variant_price, int):
                    price = round(price / 100, 2)
                elif price and re.fullmatch(r"\d{3,}", str(raw_variant_price or "").strip()):
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

    adapter_data: dict[str, Any] = {}
    used_adapters: list[str] = []
    adapter_info: dict[str, Any] = {}
    if extract_with_adapters:
        adapter_data, used_adapters = extract_with_adapters(page, url, raw, include_generic=False)
    if adapter_summary:
        adapter_info = adapter_summary(url, raw, page)

    profile = profile_for_url(url, raw)
    profile_data = extract_with_selectors(page, profile, raw, url) if profile else {}
    generic_data = extract_with_selectors(page, GENERIC_SELECTORS, raw, url)
    embedded_data = extract_from_embedded_json(page)
    shopify_enabled = detect_platform(raw, url) == "Shopify" or "/products/" in urlparse(url).path
    shopify_data = extract_shopify_product_json(url) if shopify_enabled else {}
    shopify_catalog = extract_shopify_product_catalog(url) if shopify_enabled else []
    if embedded_data.get("image"):
        embedded_data["image"] = absolutize_url(str(embedded_data["image"]), url)
    data = merge_missing(data, adapter_data, profile_data, generic_data, embedded_data, shopify_data)

    title = first_css(page, GENERIC_SELECTORS["title"])
    data["title"] = data.get("title") or title

    price_text = first_css(page, GENERIC_SELECTORS["price"])
    data["price"] = data.get("price") if data.get("price") is not None else clean_price(price_text)
    if data.get("price") is None:
        price_match = re.search(r"(?:€|EUR|USD|\$|£|GBP)\s?\d[\d\s.,]*|\d[\d\s.,]*\s?(?:€|EUR|USD|\$|£|GBP)", raw, flags=re.I)
        data["price"] = clean_price(price_match.group(0)) if price_match else None

    description = first_css(page, GENERIC_SELECTORS["description"])
    data["description"] = data.get("description") or description
    data["promoText"] = (description or data.get("description") or "")[:240] or None

    data["image"] = data.get("image") or first_css(page, GENERIC_SELECTORS["image"])
    if data.get("image"):
        data["image"] = urljoin(url, data["image"])

    data["brand"] = data.get("brand") or first_css(page, GENERIC_SELECTORS["brand"])
    data["sku"] = data.get("sku") or first_css(page, GENERIC_SELECTORS["sku"])
    data["rating"] = data.get("rating") if data.get("rating") is not None else parse_rating(first_css(page, GENERIC_SELECTORS["rating"]))
    data["reviewsCount"] = data.get("reviewsCount") if data.get("reviewsCount") is not None else to_int(first_css(page, GENERIC_SELECTORS["reviews"]))
    data["currency"] = data.get("currency") or normalize_currency(first_css(page, ['meta[property="product:price:currency"]::attr(content)', 'meta[itemprop="priceCurrency"]::attr(content)']), price_text or raw[:5000])
    data["stockStatus"] = data.get("stockStatus") or stock_status(first_css(page, GENERIC_SELECTORS["stock"]) or raw[:100_000])

    if not data.get("bundlePrices"):
        data["bundlePrices"] = extract_shopify_variants(page)

    bundle_widget = extract_bundle_widget(page, url)
    if bundle_widget:
        data["bundleWidget"] = bundle_widget

    media = unique((shopify_data.get("productMedia") or []) + extract_product_media(page, url, data.get("image")))
    if media:
        data["productMedia"] = media[:30]
        data["image"] = media[0].get("url") or data.get("image")

    reviews = extract_product_reviews(page)
    reviews = enrich_reviews_from_counts(reviews, data.get("rating"), data.get("reviewsCount"))
    if reviews:
        data["productReviews"] = data.get("productReviews") or reviews
    if shopify_catalog:
        data["productCatalog"] = shopify_catalog

    data["brandSignals"] = extract_brand_signals(page, url, fetcher_used, raw)
    if adapter_info.get("platform") and not data["brandSignals"].get("platform"):
        data["brandSignals"]["platform"] = adapter_info["platform"]
    if used_adapters:
        data["brandSignals"]["adapters"] = used_adapters
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


def provider_result_summary(results: list[Any]) -> dict[str, Any]:
    used = [result.name for result in results if getattr(result, "data", None) or getattr(result, "html", None) or getattr(result, "markdown", None)]
    errors = [f"{result.name}: {result.error}" for result in results if getattr(result, "error", None)]
    durations = {result.name: result.duration_ms for result in results if getattr(result, "duration_ms", None) is not None}
    return compact({"used": used, "errors": errors[:12], "durationsMs": durations})


def merge_provider_results(base: dict[str, Any], url: str, results: list[Any]) -> dict[str, Any]:
    merger = provider_merge_missing or merge_missing
    merged = dict(base)
    provider_names: list[str] = []
    provider_errors: list[str] = []

    for result in results:
        name = getattr(result, "name", "provider")
        data = getattr(result, "data", None) or {}
        html_text = getattr(result, "html", None)
        markdown = getattr(result, "markdown", None)
        error = getattr(result, "error", None)
        if error:
            provider_errors.append(f"{name}: {error}")
        if data:
            merged = merger(merged, data)
            provider_names.append(name)
        if html_text and html_page_from_text:
            try:
                provider_page = html_page_from_text(html_text, url)
                if provider_page is not None:
                    provider_data = extract_product_data(provider_page, url, name)
                    if provider_data:
                        merged = merger(merged, provider_data)
                        provider_names.append(f"{name}:html")
            except Exception as exc:
                provider_errors.append(f"{name}:html:{type(exc).__name__}")
        if markdown and not data:
            # Markdown-only providers are normalized in providers.py when possible.
            provider_names.append(f"{name}:markdown")

    if provider_names and append_sources:
        merged = append_sources(merged, provider_names, provider_errors)
    elif provider_names:
        signals = merged.get("brandSignals") if isinstance(merged.get("brandSignals"), dict) else {}
        signals["providers"] = unique([*(signals.get("providers") or []), *provider_names])
        merged["brandSignals"] = compact(signals)
    return compact(merged)


def run_external_provider_fallbacks(url: str, timeout_ms: int, wait_ms: int) -> list[Any]:
    if not run_external_providers:
        return []
    return run_external_providers(url, timeout_ms, wait_ms)


def is_useful(data: dict[str, Any]) -> bool:
    return bool(data.get("title") or data.get("price") is not None or data.get("brand") or data.get("description"))


def is_thin_product_data(data: dict[str, Any]) -> bool:
    """True when Scrapling only found basics and external providers can add value."""
    rich_keys = ["productMedia", "productReviews", "description", "rating", "reviewsCount", "brandSignals"]
    if not is_useful(data):
        return True
    return sum(1 for key in rich_keys if data.get(key) not in (None, "", [], {})) < 2


def scrape_url(url: str, mode: str | None = None, timeout_ms: int | None = None, wait_ms: int | None = None) -> dict[str, Any]:
    start = time.time()
    mode = (mode or DEFAULT_MODE or "auto").lower()
    timeout_ms = timeout_ms or DEFAULT_TIMEOUT_MS
    wait_ms = wait_ms or DEFAULT_WAIT_MS

    modes = ["fast", "dynamic", "stealth"] if mode == "auto" else [mode]
    errors: list[str] = []
    public_provider_data: dict[str, Any] = {}
    public_provider_results: list[Any] = []
    if run_public_endpoint_providers:
        try:
            public_provider_data, public_provider_results = run_public_endpoint_providers(url, "")
        except Exception as exc:
            errors.append(f"public-providers: {exc}")

    for selected_mode in modes:
        try:
            page, fetcher_used = fetch_page(url, selected_mode, timeout_ms, wait_ms)
            data = extract_product_data(page, url, fetcher_used)
            if run_public_endpoint_providers and not public_provider_results:
                raw_hint = page_raw_text(page)[:120_000]
                try:
                    public_provider_data, public_provider_results = run_public_endpoint_providers(url, raw_hint)
                except Exception as exc:
                    errors.append(f"public-providers:{selected_mode}: {exc}")
            if public_provider_data:
                data = (provider_merge_missing or merge_missing)(public_provider_data, data)
            if public_provider_results:
                data = merge_provider_results(data, url, public_provider_results)
            if is_useful(data):
                external_results: list[Any] = []
                should_enrich = (should_run_external_always and should_run_external_always()) or is_thin_product_data(data)
                if should_enrich:
                    external_results = run_external_provider_fallbacks(url, timeout_ms, wait_ms)
                    data = merge_provider_results(data, url, external_results)
                return {
                    "success": True,
                    "data": data,
                    "meta": compact({
                        "fetcher": fetcher_used,
                        "durationMs": round((time.time() - start) * 1000),
                        "publicProviders": provider_result_summary(public_provider_results) if public_provider_results else None,
                        "externalProviders": provider_result_summary(external_results) if external_results else None,
                    }),
                }
            errors.append(f"{selected_mode}: no useful product or brand data extracted")
        except Exception as exc:
            errors.append(f"{selected_mode}: {exc}")

    fallback_data = dict(public_provider_data)
    if public_provider_results:
        fallback_data = merge_provider_results(fallback_data, url, public_provider_results)
    external_results = run_external_provider_fallbacks(url, timeout_ms, wait_ms)
    if external_results:
        fallback_data = merge_provider_results(fallback_data, url, external_results)

    if is_useful(fallback_data):
        return {
            "success": True,
            "data": fallback_data,
            "meta": compact({
                "fetcher": "providers",
                "durationMs": round((time.time() - start) * 1000),
                "publicProviders": provider_result_summary(public_provider_results) if public_provider_results else None,
                "externalProviders": provider_result_summary(external_results) if external_results else None,
            }),
        }

    return {
        "success": False,
        "error": " | ".join(errors + provider_result_summary(public_provider_results + external_results).get("errors", [])) or "Scraping failed",
        "meta": compact({
            "durationMs": round((time.time() - start) * 1000),
            "publicProviders": provider_result_summary(public_provider_results) if public_provider_results else None,
            "externalProviders": provider_result_summary(external_results) if external_results else None,
        }),
    }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "No URL provided"}, ensure_ascii=False))
        sys.exit(1)

    result = scrape_url(sys.argv[1], mode=sys.argv[2] if len(sys.argv) > 2 else None)
    print(json.dumps(result, ensure_ascii=False))
    sys.exit(0 if result.get("success") else 2)
