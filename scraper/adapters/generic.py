from __future__ import annotations

from .base import BaseAdapter


GENERIC_PRODUCT_SELECTORS = {
    "title": [
        'meta[property="og:title"]::attr(content)',
        'meta[name="twitter:title"]::attr(content)',
        '[itemprop="name"]::attr(content)',
        '[itemprop="name"]::text',
        '[data-testid*="title"]::text',
        '[data-test*="title"]::text',
        '.product-title::text',
        '.product_title::text',
        '.product-name::text',
        '.pdp-title::text',
        '.productView-title::text',
        'h1::text',
        'title::text',
    ],
    "price": [
        'meta[property="product:price:amount"]::attr(content)',
        'meta[property="og:price:amount"]::attr(content)',
        'meta[itemprop="price"]::attr(content)',
        '[itemprop="price"]::attr(content)',
        '[data-price]::attr(data-price)',
        '[data-product-price]::attr(data-product-price)',
        '[data-testid*="price"]::text',
        '[data-test*="price"]::text',
        '[class*="price"]::text',
        '.sale-price::text',
        '.regular-price::text',
        '.price::text',
    ],
    "description": [
        'meta[property="og:description"]::attr(content)',
        'meta[name="description"]::attr(content)',
        '[itemprop="description"]::text',
        '#productDescription ::text',
        '.product-description ::text',
        '.description ::text',
        '[data-testid*="description"]::text',
    ],
    "image": [
        'meta[property="og:image"]::attr(content)',
        'meta[name="twitter:image"]::attr(content)',
        '[itemprop="image"]::attr(content)',
        '[itemprop="image"]::attr(src)',
        '.product img::attr(src)',
        '.product-media img::attr(src)',
        '.product-gallery img::attr(src)',
        '[data-testid*="image"] img::attr(src)',
        'main img::attr(src)',
    ],
    "brand": [
        'meta[property="product:brand"]::attr(content)',
        '[itemprop="brand"]::attr(content)',
        '[itemprop="brand"]::text',
        '[data-brand]::attr(data-brand)',
        '[data-testid*="brand"]::text',
        '.brand::text',
        '.vendor::text',
        '.product-vendor::text',
        'meta[property="og:site_name"]::attr(content)',
    ],
    "sku": [
        '[itemprop="sku"]::attr(content)',
        '[itemprop="sku"]::text',
        '[data-sku]::attr(data-sku)',
        '.sku::text',
        '[class*="sku"]::text',
        '[id*="sku"]::text',
    ],
    "rating": [
        '[itemprop="ratingValue"]::attr(content)',
        '[aria-label*="star"]::attr(aria-label)',
        '[aria-label*="étoile"]::attr(aria-label)',
        '[class*="rating"]::attr(title)',
        '[class*="rating"]::text',
    ],
    "reviews": [
        '[itemprop="reviewCount"]::attr(content)',
        '[class*="review"]::text',
        '[data-testid*="review"]::text',
        '[aria-label*="review"]::attr(aria-label)',
        '[aria-label*="avis"]::attr(aria-label)',
    ],
    "stock": [
        'link[itemprop="availability"]::attr(href)',
        '[itemprop="availability"]::attr(content)',
        '#availability ::text',
        '.stock::text',
        '[data-availability]::attr(data-availability)',
        '[data-testid*="stock"]::text',
        '[class*="availability"]::text',
        '[class*="sold-out"]::text',
        'button[name="add"]::text',
        '[type="submit"]::text',
    ],
}


class GenericAdapter(BaseAdapter):
    name = "GenericAdapter"
    platform = "Generic"
    selectors = GENERIC_PRODUCT_SELECTORS
    priority = -100
    always_match = True
