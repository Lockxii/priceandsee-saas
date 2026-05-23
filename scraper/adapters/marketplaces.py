from __future__ import annotations

import re
from typing import Any

from .base import (
    BaseAdapter,
    clean_price,
    compact,
    first_css,
    merge_missing,
    raw_css_values,
)
from .generic import GENERIC_PRODUCT_SELECTORS


class MarketplaceAdapter(BaseAdapter):
    """Selector-heavy adapter for marketplace product pages."""

    selectors = GENERIC_PRODUCT_SELECTORS


class AmazonAdapter(MarketplaceAdapter):
    name = "AmazonAdapter"
    platform = "Amazon"
    domains = ["amazon."]
    priority = 100
    selectors = merge_missing({
        "title": ["#productTitle::text", "#title::text", 'meta[name="title"]::attr(content)'],
        "price": [
            "#corePrice_feature_div .a-offscreen::text",
            ".a-price .a-offscreen::text",
            "#priceblock_ourprice::text",
            "#priceblock_dealprice::text",
            "#price_inside_buybox::text",
            '#tp_price_block_total_price_ww .a-offscreen::text',
        ],
        "image": ["#landingImage::attr(src)", "#imgTagWrapperId img::attr(src)", 'meta[property="og:image"]::attr(content)'],
        "brand": ["#bylineInfo::text", "tr.po-brand .po-break-word::text", 'a#bylineInfo::text', '#brand::text'],
        "sku": ["#ASIN::attr(value)", '[name="ASIN"]::attr(value)', '[data-asin]::attr(data-asin)'],
        "rating": ["#acrPopover::attr(title)", "span[data-hook='rating-out-of-text']::text", ".reviewCountTextLinkedHistogram::attr(title)"],
        "reviews": ["#acrCustomerReviewText::text", "span[data-hook='total-review-count']::text"],
        "stock": ["#availability ::text", "#outOfStock ::text", "#add-to-cart-button::attr(value)"],
    }, GENERIC_PRODUCT_SELECTORS)

    def extract_extra(self, page: Any, url: str, raw: str = "") -> dict[str, Any]:
        asin = first_css(page, self.selectors["sku"])
        if not asin:
            match = re.search(r"/(?:dp|gp/product)/([A-Z0-9]{10})(?:[/?]|$)", url, flags=re.I)
            asin = match.group(1).upper() if match else None
        brand = first_css(page, ["tr.po-brand .po-break-word::text", "#bylineInfo::text"])
        if brand:
            brand = re.sub(r"^(?:visit the|brand:)\s+", "", brand, flags=re.I).strip()
            brand = re.sub(r"\s+store$", "", brand, flags=re.I).strip()
        return compact({"sku": asin, "brand": brand})


class EtsyAdapter(MarketplaceAdapter):
    name = "EtsyAdapter"
    platform = "Etsy"
    domains = ["etsy.com"]
    priority = 96
    selectors = merge_missing({
        "title": ['h1[data-buy-box-listing-title]::text', "h1::text", 'meta[property="og:title"]::attr(content)'],
        "price": ['p[data-buy-box-region="price"]::text', '[data-buy-box-region="price"] .currency-value::text', '.wt-text-title-03::text', '[data-selector="price-only"]::text'],
        "image": ['meta[property="og:image"]::attr(content)', '.listing-page-image img::attr(src)', '[data-carousel-first-image] img::attr(src)'],
        "brand": ['meta[property="og:site_name"]::attr(content)', '[data-region="shop-info"] a::text', '.shop-name-and-title-container a::text'],
        "rating": ['input[name="initial-rating"]::attr(value)', '[aria-label*="star"]::attr(aria-label)'],
        "reviews": ['a[href*="reviews"]::text', '[data-reviews-pagination]::text'],
        "stock": ['[data-buy-box-region="stock-indicator"]::text', '[data-selector="listing-page-cart"] ::text'],
    }, GENERIC_PRODUCT_SELECTORS)

    def extract_extra(self, page: Any, url: str, raw: str = "") -> dict[str, Any]:
        shop = first_css(page, ['a[href*="/shop/"]::text', '[data-region="shop-info"] a::text'])
        return compact({"brand": shop})


class EbayAdapter(MarketplaceAdapter):
    name = "EbayAdapter"
    platform = "eBay"
    domains = ["ebay."]
    priority = 96
    selectors = merge_missing({
        "title": ["h1.x-item-title__mainTitle span::text", "#itemTitle::text", "h1::text"],
        "price": [".x-price-primary span::text", "#prcIsum::text", "#mm-saleDscPrc::text", '[itemprop="price"]::attr(content)', '.display-price::text'],
        "image": ['meta[property="og:image"]::attr(content)', '#icImg::attr(src)', '.ux-image-carousel-item img::attr(src)'],
        "brand": ['[itemprop="brand"]::text', '.ux-labels-values__values ::text'],
        "sku": ['[itemprop="sku"]::attr(content)', '[data-testid="x-item-condition-value"]::text'],
        "rating": ['[aria-label*="stars"]::attr(aria-label)'],
        "reviews": ['[aria-label*="reviews"]::text'],
        "stock": ['#qtySubTxt::text', '.d-quantity__availability ::text', '.x-quantity__availability ::text'],
    }, GENERIC_PRODUCT_SELECTORS)


class WalmartAdapter(MarketplaceAdapter):
    name = "WalmartAdapter"
    platform = "Walmart"
    domains = ["walmart."]
    priority = 95
    selectors = merge_missing({
        "title": ['h1[itemprop="name"]::text', "h1::text", 'meta[property="og:title"]::attr(content)'],
        "price": ['[itemprop="price"]::attr(content)', '[data-testid="price-wrap"] ::text', '[data-automation-id="product-price"]::text', 'span[itemprop="price"]::text'],
        "image": ['meta[property="og:image"]::attr(content)', '[data-testid="hero-image"]::attr(src)', 'img.db::attr(src)'],
        "brand": ['[itemprop="brand"]::text', '[data-testid="product-brand"]::text'],
        "sku": ['[itemprop="sku"]::attr(content)', '[data-testid="product-sku"]::text'],
        "rating": ['[itemprop="ratingValue"]::attr(content)', '[data-testid="reviews-and-ratings"]::text'],
        "reviews": ['[itemprop="reviewCount"]::attr(content)', '[data-testid="reviews-and-ratings"]::text'],
        "stock": ['[data-testid="fulfillment-cta"] ::text', '[data-testid="add-to-cart-section"] ::text'],
    }, GENERIC_PRODUCT_SELECTORS)


class AliExpressAdapter(MarketplaceAdapter):
    name = "AliExpressAdapter"
    platform = "AliExpress"
    domains = ["aliexpress."]
    priority = 94
    selectors = merge_missing({
        "title": ['h1[data-pl="product-title"]::text', 'h1[class*="title"]::text', "h1::text", 'meta[property="og:title"]::attr(content)'],
        "price": ['[class*="product-price"]::text', '[class*="price"]::text', 'meta[property="product:price:amount"]::attr(content)'],
        "image": ['meta[property="og:image"]::attr(content)', '[class*="slider"] img::attr(src)', '[class*="gallery"] img::attr(src)'],
        "brand": ['[class*="store"] a::text', '[class*="seller"] a::text', 'meta[property="og:site_name"]::attr(content)'],
        "rating": ['[class*="rating"]::text'],
        "reviews": ['[class*="review"]::text'],
        "stock": ['[class*="quantity"]::text', '[class*="shipping"]::text', '[class*="stock"]::text'],
    }, GENERIC_PRODUCT_SELECTORS)

    def extract_extra(self, page: Any, url: str, raw: str = "") -> dict[str, Any]:
        # AliExpress often hydrates product data in JS variables.
        for script in raw_css_values(page, "script::text", limit=120):
            if "runParams" not in script and "productInfo" not in script:
                continue
            title = None
            price = None
            image = None
            title_match = re.search(r'"(?:subject|title|productTitle)"\s*:\s*"(.*?)"', script)
            price_match = re.search(r'"(?:salePrice|minPrice|maxPrice|formattedPrice)"\s*:\s*"?([^",}]+)', script)
            image_match = re.search(r'"(?:imagePath|imageUrl)"\s*:\s*"(.*?)"', script)
            if title_match:
                title = title_match.group(1)
            if price_match:
                price = price_match.group(1)
            if image_match:
                image = image_match.group(1).replace("\\/", "/")
            data = compact({"title": title, "price": clean_price(price), "image": image})
            if data:
                return data
        return {}


class TemuAdapter(MarketplaceAdapter):
    name = "TemuAdapter"
    platform = "Temu"
    domains = ["temu.com"]
    priority = 94
    selectors = merge_missing({
        "title": ['h1[class*="title"]::text', "h1::text", 'meta[property="og:title"]::attr(content)'],
        "price": ['[class*="price"]::text', '[data-testid*="price"]::text', 'meta[property="product:price:amount"]::attr(content)'],
        "image": ['meta[property="og:image"]::attr(content)', 'img[src*="img.kwcdn"]::attr(src)', 'img[src*="temu"]::attr(src)'],
        "brand": ['meta[property="og:site_name"]::attr(content)'],
        "rating": ['[class*="rating"]::text', '[aria-label*="star"]::attr(aria-label)'],
        "reviews": ['[class*="review"]::text'],
        "stock": ['[class*="stock"]::text', '[class*="quantity"]::text'],
    }, GENERIC_PRODUCT_SELECTORS)


class SheinAdapter(MarketplaceAdapter):
    name = "SheinAdapter"
    platform = "SHEIN"
    domains = ["shein.com"]
    priority = 94
    selectors = merge_missing({
        "title": [".product-intro__head-name::text", 'h1[class*="product"]::text', "h1::text", 'meta[property="og:title"]::attr(content)'],
        "price": [".from::text", ".original::text", ".product-intro__head-mainprice::text", '[class*="price"]::text'],
        "image": ['meta[property="og:image"]::attr(content)', '.product-intro__thumbs-inner img::attr(src)', '.crop-image-container img::attr(src)'],
        "brand": ['.product-intro__head-brand::text', 'meta[property="og:site_name"]::attr(content)'],
        "sku": ['.product-intro__head-sku::text', '[class*="sku"]::text'],
        "rating": ['[class*="rate"]::text', '[aria-label*="star"]::attr(aria-label)'],
        "reviews": ['[class*="review"]::text'],
        "stock": ['[class*="stock"]::text', '[class*="sold-out"]::text'],
    }, GENERIC_PRODUCT_SELECTORS)


class DhgateAdapter(MarketplaceAdapter):
    name = "DhgateAdapter"
    platform = "DHgate"
    domains = ["dhgate.com"]
    priority = 92
    selectors = merge_missing({
        "title": ['h1[class*="title"]::text', '.product-title::text', 'meta[property="og:title"]::attr(content)', "h1::text"],
        "price": ['[class*="price"]::text', '.price::text', 'meta[property="product:price:amount"]::attr(content)'],
        "image": ['meta[property="og:image"]::attr(content)', '[class*="gallery"] img::attr(src)', '[class*="thumb"] img::attr(src)'],
        "brand": ['[class*="store"] a::text', '[class*="seller"] a::text', 'meta[property="og:site_name"]::attr(content)'],
        "rating": ['[class*="rating"]::text', '[class*="star"]::attr(title)'],
        "reviews": ['[class*="review"]::text', '[class*="feedback"]::text'],
        "stock": ['[class*="stock"]::text', '[class*="quantity"]::text'],
    }, GENERIC_PRODUCT_SELECTORS)


class WishAdapter(MarketplaceAdapter):
    name = "WishAdapter"
    platform = "Wish"
    domains = ["wish.com"]
    priority = 91
    selectors = merge_missing({
        "title": ['h1::text', '[class*="ProductTitle"]::text', 'meta[property="og:title"]::attr(content)'],
        "price": ['[class*="price"]::text', '[class*="Price"]::text', 'meta[property="product:price:amount"]::attr(content)'],
        "image": ['meta[property="og:image"]::attr(content)', '[class*="image"] img::attr(src)', 'main img::attr(src)'],
        "brand": ['[class*="merchant"]::text', '[class*="store"]::text', 'meta[property="og:site_name"]::attr(content)'],
        "rating": ['[class*="rating"]::text', '[aria-label*="star"]::attr(aria-label)'],
        "reviews": ['[class*="review"]::text'],
        "stock": ['[class*="stock"]::text', '[class*="inventory"]::text'],
    }, GENERIC_PRODUCT_SELECTORS)


class ShopeeAdapter(MarketplaceAdapter):
    name = "ShopeeAdapter"
    platform = "Shopee"
    domains = ["shopee."]
    priority = 91
    selectors = merge_missing({
        "title": ['h1::text', '[class*="product-briefing"] h1::text', 'meta[property="og:title"]::attr(content)'],
        "price": ['[class*="price"]::text', 'meta[property="product:price:amount"]::attr(content)'],
        "image": ['meta[property="og:image"]::attr(content)', '[class*="product"] img::attr(src)', 'picture img::attr(src)'],
        "brand": ['[class*="shop"] a::text', '[class*="seller"]::text', 'meta[property="og:site_name"]::attr(content)'],
        "rating": ['[class*="rating"]::text', '[aria-label*="star"]::attr(aria-label)'],
        "reviews": ['[class*="review"]::text', '[class*="rating-count"]::text'],
        "stock": ['[class*="stock"]::text', '[class*="quantity"]::text'],
    }, GENERIC_PRODUCT_SELECTORS)


class LazadaAdapter(MarketplaceAdapter):
    name = "LazadaAdapter"
    platform = "Lazada"
    domains = ["lazada."]
    priority = 91
    selectors = merge_missing({
        "title": ['.pdp-mod-product-badge-title::text', 'h1::text', 'meta[property="og:title"]::attr(content)'],
        "price": ['.pdp-price::text', '[class*="price"]::text', 'meta[property="product:price:amount"]::attr(content)'],
        "image": ['meta[property="og:image"]::attr(content)', '.pdp-mod-common-image::attr(src)', '[class*="gallery"] img::attr(src)'],
        "brand": ['.pdp-product-brand__brand-link::text', '[class*="seller"]::text', 'meta[property="og:site_name"]::attr(content)'],
        "rating": ['.score-average::text', '[class*="rating"]::text'],
        "reviews": ['.pdp-review-summary__link::text', '[class*="review"]::text'],
        "stock": ['[class*="stock"]::text', '[class*="quantity"]::text'],
    }, GENERIC_PRODUCT_SELECTORS)


class MercadoLibreAdapter(MarketplaceAdapter):
    name = "MercadoLibreAdapter"
    platform = "MercadoLibre"
    domains = ["mercadolibre.", "mercadolivre."]
    priority = 91
    selectors = merge_missing({
        "title": ['h1.ui-pdp-title::text', 'h1::text', 'meta[property="og:title"]::attr(content)'],
        "price": ['.andes-money-amount__fraction::text', '[class*="price"]::text', 'meta[property="product:price:amount"]::attr(content)'],
        "currency": ['.andes-money-amount__currency-symbol::text', 'meta[property="product:price:currency"]::attr(content)'],
        "image": ['meta[property="og:image"]::attr(content)', '.ui-pdp-gallery__figure img::attr(src)', '[class*="gallery"] img::attr(src)'],
        "brand": ['[class*="brand"]::text', '[class*="seller"]::text', 'meta[property="og:site_name"]::attr(content)'],
        "rating": ['[class*="rating"]::text', '[aria-label*="estrella"]::attr(aria-label)'],
        "reviews": ['[class*="review"]::text', '[class*="opin"]::text'],
        "stock": ['[class*="stock"]::text', '[class*="available"]::text'],
    }, GENERIC_PRODUCT_SELECTORS)


class RakutenAdapter(MarketplaceAdapter):
    name = "RakutenAdapter"
    platform = "Rakuten"
    domains = ["rakuten."]
    priority = 90
    selectors = merge_missing({
        "title": ['h1::text', '[class*="product-title"]::text', 'meta[property="og:title"]::attr(content)'],
        "price": ['[class*="price"]::text', '[data-qa*="price"]::text', 'meta[property="product:price:amount"]::attr(content)'],
        "image": ['meta[property="og:image"]::attr(content)', '[class*="gallery"] img::attr(src)', 'main img::attr(src)'],
        "brand": ['[class*="brand"]::text', '[class*="seller"]::text', 'meta[property="og:site_name"]::attr(content)'],
        "rating": ['[class*="rating"]::text'],
        "reviews": ['[class*="review"]::text', '[class*="avis"]::text'],
        "stock": ['[class*="stock"]::text', '[class*="availability"]::text'],
    }, GENERIC_PRODUCT_SELECTORS)


class TargetAdapter(MarketplaceAdapter):
    name = "TargetAdapter"
    platform = "Target"
    domains = ["target.com"]
    priority = 90
    selectors = merge_missing({
        "title": ['h1[data-test="product-title"]::text', 'h1::text', 'meta[property="og:title"]::attr(content)'],
        "price": ['[data-test="product-price"]::text', '[data-test*="price"]::text', '[class*="price"]::text', 'meta[property="product:price:amount"]::attr(content)'],
        "image": ['meta[property="og:image"]::attr(content)', '[data-test="@web/ProductImage"] img::attr(src)', '[data-test*="product-image"] img::attr(src)'],
        "brand": ['[data-test="product-brand"]::text', '[class*="brand"]::text', 'meta[property="og:site_name"]::attr(content)'],
        "sku": ['[data-test="product-sku"]::text', '[class*="sku"]::text'],
        "rating": ['[data-test*="rating"]::text', '[aria-label*="stars"]::attr(aria-label)'],
        "reviews": ['[data-test*="review"]::text', '[aria-label*="reviews"]::attr(aria-label)'],
        "stock": ['[data-test*="fulfillment"]::text', '[data-test*="availability"]::text', 'button::text'],
    }, GENERIC_PRODUCT_SELECTORS)


class BestBuyAdapter(MarketplaceAdapter):
    name = "BestBuyAdapter"
    platform = "Best Buy"
    domains = ["bestbuy.com", "bestbuy.ca"]
    priority = 90
    selectors = merge_missing({
        "title": ['h1.heading-5::text', '.sku-title h1::text', 'h1::text', 'meta[property="og:title"]::attr(content)'],
        "price": ['.priceView-customer-price span::text', '[data-testid*="price"]::text', '[class*="price"]::text', 'meta[property="product:price:amount"]::attr(content)'],
        "image": ['meta[property="og:image"]::attr(content)', '.primary-image::attr(src)', '.image-gallery img::attr(src)'],
        "brand": ['[itemprop="brand"]::text', '[class*="brand"]::text', 'meta[property="og:site_name"]::attr(content)'],
        "sku": ['.sku.product-data-value::text', '[class*="sku"]::text', '[itemprop="sku"]::text'],
        "rating": ['.ugc-c-review-average::text', '[aria-label*="stars"]::attr(aria-label)'],
        "reviews": ['.c-reviews-v4::text', '[class*="review"]::text'],
        "stock": ['.fulfillment-add-to-cart-button ::text', '[class*="fulfillment"]::text', '[class*="availability"]::text'],
    }, GENERIC_PRODUCT_SELECTORS)


ALL_MARKETPLACE_ADAPTERS = [
    AmazonAdapter,
    EtsyAdapter,
    EbayAdapter,
    WalmartAdapter,
    AliExpressAdapter,
    TemuAdapter,
    SheinAdapter,
    DhgateAdapter,
    WishAdapter,
    ShopeeAdapter,
    LazadaAdapter,
    MercadoLibreAdapter,
    RakutenAdapter,
    TargetAdapter,
    BestBuyAdapter,
]
