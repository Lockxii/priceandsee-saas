from __future__ import annotations

import json
import re
from typing import Any

from .base import (
    BaseAdapter,
    clean_price,
    clean_text,
    compact,
    merge_missing,
    raw_css_values,
    stock_status,
    unique,
)
from .generic import GENERIC_PRODUCT_SELECTORS


class ShopPlatformAdapter(BaseAdapter):
    selectors = GENERIC_PRODUCT_SELECTORS


class ShopifyAdapter(ShopPlatformAdapter):
    name = "ShopifyAdapter"
    platform = "Shopify"
    raw_signals = ["cdn.shopify.com", "Shopify.theme", "ShopifyAnalytics", "myshopify.com", "shopify-section"]
    page_signals = ['form[action*="/cart/add"]', 'script[src*="cdn.shopify.com"]', 'link[href*="cdn.shopify.com"]']
    priority = 80
    selectors = merge_missing({
        "title": ['h1.product__title::text', '.product__title h1::text', '.product-single__title::text', '.product-title::text', 'h1::text'],
        "price": ['.price-item--sale::text', '.price-item--regular::text', '[data-product-price]::text', '[data-price]::attr(data-price)', '.product__price::text', '.price::text'],
        "image": ['meta[property="og:image"]::attr(content)', '.product__media img::attr(src)', '.product-single__media img::attr(src)', '.product-gallery img::attr(src)'],
        "brand": ['.product__vendor::text', '.product-vendor::text', '.vendor::text', 'meta[property="og:site_name"]::attr(content)'],
        "sku": ['[data-sku]::attr(data-sku)', '.variant-sku::text', '.sku::text'],
        "rating": ['.jdgm-prev-badge__stars::attr(aria-label)', '[class*="rating"]::attr(aria-label)', '[class*="rating"]::text'],
        "reviews": ['.jdgm-prev-badge__text::text', '[class*="review"]::text'],
        "stock": ['.product-form__submit::text', 'button[name="add"]::text', '[class*="sold-out"]::text', '[class*="stock"]::text'],
    }, GENERIC_PRODUCT_SELECTORS)

    def extract_extra(self, page: Any, url: str, raw: str = "") -> dict[str, Any]:
        variants = extract_shopify_variants(page)
        product_json = extract_shopify_product_json(page)
        data: dict[str, Any] = {}
        if product_json:
            data = product_json
        if variants:
            data["bundlePrices"] = variants
            available = [variant for variant in variants if variant.get("available") is True]
            if available and not data.get("stockStatus"):
                data["stockStatus"] = "In Stock"
            elif variants and not available and not data.get("stockStatus"):
                data["stockStatus"] = "Out of Stock"
        return compact(data)


class WooCommerceAdapter(ShopPlatformAdapter):
    name = "WooCommerceAdapter"
    platform = "WooCommerce"
    raw_signals = ["woocommerce", "wp-content/plugins/woocommerce", "wc-add-to-cart"]
    page_signals = ['body[class*="woocommerce"]', '.woocommerce-product-gallery', 'form.cart']
    priority = 70
    selectors = merge_missing({
        "title": ["h1.product_title::text", "h1.entry-title::text", "h1::text"],
        "price": [".woocommerce-Price-amount::text", "p.price::text", ".price ins .amount::text", ".price .amount::text"],
        "image": ['.woocommerce-product-gallery__image img::attr(src)', 'meta[property="og:image"]::attr(content)'],
        "brand": ['.posted_in a::text', '[rel="tag"]::text', 'meta[property="og:site_name"]::attr(content)'],
        "sku": [".sku::text"],
        "rating": ['.woocommerce-product-rating .star-rating::attr(aria-label)', '.woocommerce-review-link::text'],
        "reviews": ['.woocommerce-review-link::text'],
        "stock": ['.stock::text', '.single_add_to_cart_button::text'],
    }, GENERIC_PRODUCT_SELECTORS)


class MagentoAdapter(ShopPlatformAdapter):
    name = "MagentoAdapter"
    platform = "Magento"
    raw_signals = ["Magento", "mage/", "/static/version", "x-magento", "Magento_Theme"]
    page_signals = ['body[class*="catalog-product-view"]', '[data-role="priceBox"]', '[data-price-type="finalPrice"]']
    priority = 70
    selectors = merge_missing({
        "title": ['h1.page-title span::text', 'h1::text'],
        "price": ['[data-price-type="finalPrice"]::attr(data-price-amount)', '[data-price-type="finalPrice"] .price::text', '.price-final_price .price::text'],
        "image": ['meta[property="og:image"]::attr(content)', '.fotorama__img::attr(src)', '.gallery-placeholder img::attr(src)'],
        "brand": ['[data-th="Brand"]::text', '.product.attribute.brand ::text'],
        "sku": ['.product.attribute.sku .value::text', '[itemprop="sku"]::text'],
        "rating": ['.rating-result::attr(title)', '[itemprop="ratingValue"]::attr(content)'],
        "reviews": ['.reviews-actions .view::text', '[itemprop="reviewCount"]::attr(content)'],
        "stock": ['.stock::text', '.box-tocart ::text'],
    }, GENERIC_PRODUCT_SELECTORS)


class PrestaShopAdapter(ShopPlatformAdapter):
    name = "PrestaShopAdapter"
    platform = "PrestaShop"
    raw_signals = ["prestashop", "PrestaShop", "prestashop-theme"]
    page_signals = ['.product-prices .current-price', '#product-availability', '[data-product][class*="product"]']
    priority = 70
    selectors = merge_missing({
        "title": ['h1[itemprop="name"]::text', 'h1::text'],
        "price": ['.current-price span::attr(content)', '.current-price span::text', '[itemprop="price"]::attr(content)'],
        "image": ['meta[property="og:image"]::attr(content)', '.product-cover img::attr(src)'],
        "brand": ['.product-manufacturer a::text', '[itemprop="brand"]::text'],
        "sku": ['[itemprop="sku"]::text'],
        "rating": ['[itemprop="ratingValue"]::attr(content)'],
        "reviews": ['[itemprop="reviewCount"]::attr(content)'],
        "stock": ['#product-availability::text', '.add-to-cart::text'],
    }, GENERIC_PRODUCT_SELECTORS)


class BigCommerceAdapter(ShopPlatformAdapter):
    name = "BigCommerceAdapter"
    platform = "BigCommerce"
    raw_signals = ["bigcommerce", "stencil-utils", "BigCommerce", "cdn11.bigcommerce.com"]
    page_signals = ['.productView', '[data-product-id]', '[data-cart-item-add]']
    priority = 70
    selectors = merge_missing({
        "title": ['h1.productView-title::text', 'h1::text'],
        "price": ['.price--withoutTax::text', '.price--withTax::text', '[data-product-price-without-tax]::text'],
        "image": ['meta[property="og:image"]::attr(content)', '.productView-image img::attr(src)'],
        "brand": ['.productView-brand a::text', '[itemprop="brand"]::text'],
        "sku": ['[data-product-sku]::text', '[itemprop="sku"]::text'],
        "rating": ['[aria-label*="Rating"]::attr(aria-label)', '.rating--small::attr(title)'],
        "reviews": ['.productView-reviewLink::text'],
        "stock": ['[data-product-stock]::text', '.form-action .button::text'],
    }, GENERIC_PRODUCT_SELECTORS)


class SalesforceCommerceCloudAdapter(ShopPlatformAdapter):
    name = "SalesforceCommerceCloudAdapter"
    platform = "Salesforce Commerce Cloud"
    raw_signals = ["demandware", "Salesforce Commerce Cloud", "__Analytics-Start", "dw.ac", "dwvar_", "cc-sfcc"]
    page_signals = ['.product-detail [data-pid]', '.prices-add-to-cart-actions', 'input[name="pid"]']
    priority = 70
    selectors = merge_missing({
        "title": ['.product-name::text', '.product-detail h1::text', 'h1::text', 'meta[property="og:title"]::attr(content)'],
        "price": ['.sales .value::attr(content)', '.sales .value::text', '.price .value::text', '[class*="price"]::text', 'meta[property="product:price:amount"]::attr(content)'],
        "image": ['meta[property="og:image"]::attr(content)', '.primary-images img::attr(src)', '.product-carousel img::attr(src)'],
        "brand": ['.product-brand::text', '[class*="brand"]::text', 'meta[property="og:site_name"]::attr(content)'],
        "sku": ['[data-pid]::attr(data-pid)', '.product-id::text', '[itemprop="sku"]::text'],
        "rating": ['[class*="rating"]::attr(title)', '[class*="rating"]::text'],
        "reviews": ['[class*="review"]::text'],
        "stock": ['.availability-msg::text', '[class*="availability"]::text', '.add-to-cart::text'],
    }, GENERIC_PRODUCT_SELECTORS)


class ShopAppAdapter(ShopPlatformAdapter):
    name = "ShopAppAdapter"
    platform = "Shop App"
    domains = ["shop.app"]
    priority = 78
    selectors = merge_missing({
        "title": ['h1::text', 'meta[property="og:title"]::attr(content)'],
        "price": ['[class*="price"]::text', 'meta[property="product:price:amount"]::attr(content)'],
        "image": ['meta[property="og:image"]::attr(content)', 'main img::attr(src)'],
        "brand": ['meta[property="og:site_name"]::attr(content)', 'a[href*="/store/"]::text'],
        "stock": ['button::text', '[class*="availability"]::text'],
    }, GENERIC_PRODUCT_SELECTORS)


def parse_shopify_price(value: Any) -> float | None:
    price = clean_price(value)
    if price is None:
        return None
    if isinstance(value, int):
        return round(price / 100, 2) if price >= 100 else price
    raw = str(value).strip()
    if re.fullmatch(r"\d{3,}", raw):
        return round(price / 100, 2)
    return price


def extract_shopify_variants(page: Any) -> list[dict[str, Any]]:
    variants: list[dict[str, Any]] = []
    scripts = raw_css_values(page, 'script[type="application/json"]::text', limit=60)
    scripts.extend(raw_css_values(page, 'script[data-product-json]::text', limit=20))
    scripts.extend(raw_css_values(page, 'script[id*="ProductJson"]::text', limit=20))

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
            parsed = json.loads(script.strip())
        except Exception:
            continue
        for variant_list in walk(parsed):
            for variant in variant_list[:40]:
                if not isinstance(variant, dict):
                    continue
                price = parse_shopify_price(variant.get("price") or variant.get("compare_at_price"))
                item = {
                    "name": clean_text(variant.get("title") or variant.get("name") or variant.get("sku")) or "Variant",
                    "price": price,
                    "sku": clean_text(variant.get("sku")),
                    "id": variant.get("id"),
                    "available": variant.get("available"),
                    "url": f"?variant={variant.get('id')}" if variant.get("id") else None,
                }
                options = {str(k): clean_text(v) for k, v in variant.items() if re.match(r"option\d+", str(k)) and clean_text(v)}
                if options:
                    item["options"] = options
                variants.append(item)
            if variants:
                return unique(compact(variants))[:40]
    return []


def extract_shopify_product_json(page: Any) -> dict[str, Any]:
    candidates = []
    candidates.extend(raw_css_values(page, 'script[type="application/json"]::text', limit=60))
    candidates.extend(raw_css_values(page, 'script[data-product-json]::text', limit=20))
    candidates.extend(raw_css_values(page, 'script[id*="ProductJson"]::text', limit=20))
    for script in candidates:
        if not any(token in script.lower() for token in ["variants", "product", "price"]):
            continue
        try:
            parsed = json.loads(script.strip())
        except Exception:
            continue
        product = find_shopify_product(parsed)
        if not product:
            continue
        image = product.get("featured_image") or product.get("image") or product.get("featuredImage")
        if isinstance(image, dict):
            image = image.get("src") or image.get("url")
        variants = product.get("variants") if isinstance(product.get("variants"), list) else []
        first_variant = next((variant for variant in variants if isinstance(variant, dict) and variant.get("available") is True), variants[0] if variants else {})
        data = {
            "title": clean_text(product.get("title") or product.get("name")),
            "description": clean_text(product.get("description") or product.get("body_html")),
            "brand": clean_text(product.get("vendor") or product.get("brand")),
            "sku": clean_text(first_variant.get("sku") if isinstance(first_variant, dict) else None),
            "price": parse_shopify_price(first_variant.get("price") if isinstance(first_variant, dict) else product.get("price")),
            "image": clean_text(image),
            "stockStatus": stock_status(first_variant.get("available") if isinstance(first_variant, dict) else None) or ("In Stock" if isinstance(first_variant, dict) and first_variant.get("available") is True else None),
        }
        return compact(data)
    return {}


def find_shopify_product(value: Any, depth: int = 0) -> dict[str, Any] | None:
    if depth > 8:
        return None
    if isinstance(value, dict):
        if isinstance(value.get("variants"), list) and (value.get("title") or value.get("name")):
            return value
        product = value.get("product")
        if isinstance(product, dict):
            found = find_shopify_product(product, depth + 1)
            if found:
                return found
        for child in value.values():
            found = find_shopify_product(child, depth + 1)
            if found:
                return found
    elif isinstance(value, list):
        for child in value[:80]:
            found = find_shopify_product(child, depth + 1)
            if found:
                return found
    return None


ALL_SHOP_PLATFORM_ADAPTERS = [
    ShopifyAdapter,
    WooCommerceAdapter,
    MagentoAdapter,
    PrestaShopAdapter,
    BigCommerceAdapter,
    SalesforceCommerceCloudAdapter,
    ShopAppAdapter,
]
