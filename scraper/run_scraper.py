import sys
import json
from scrapling import Fetcher

import re

def clean_price(price_str):
    if not price_str:
        return None
    
    clean_str = ''.join(c for c in price_str if c.isdigit() or c in '.,')
    if not clean_str: return None

    if ',' in clean_str and '.' in clean_str:
        if clean_str.rfind(',') > clean_str.rfind('.'):
            clean_str = clean_str.replace('.', '').replace(',', '.')
        else:
            clean_str = clean_str.replace(',', '')
    elif ',' in clean_str:
        if len(clean_str.split(',')[-1]) == 2:
            clean_str = clean_str.replace(',', '.')
        else:
            clean_str = clean_str.replace(',', '')

    try:
        return float(clean_str)
    except ValueError:
        return None

def extract_from_json_ld(page):
    try:
        scripts = page.css('script[type="application/ld+json"]::text').getall()
        for script in scripts:
            try:
                data = json.loads(script)
                items = data if isinstance(data, list) else [data]
                if isinstance(data, dict) and '@graph' in data:
                    items.extend(data['@graph'])
                
                for item in items:
                    if not isinstance(item, dict): continue
                    if item.get('@type') in ['Product', 'ProductGroup']:
                        title = item.get('name')
                        offers = item.get('offers', {})
                        if isinstance(offers, list) and len(offers) > 0:
                            offers = offers[0]
                        price = offers.get('price')
                        if price is None and 'highPrice' in offers:
                            price = offers.get('lowPrice') or offers.get('highPrice')
                        
                        availability = offers.get('availability', '')
                        stock_status = "In Stock"
                        if "OutOfStock" in availability or "SoldOut" in availability:
                            stock_status = "Out of Stock"
                            
                        if title and price is not None:
                            try:
                                return title, float(price), stock_status
                            except (ValueError, TypeError):
                                pass
            except (json.JSONDecodeError, TypeError):
                continue
    except Exception:
        pass
    return None, None, None

def extract_from_meta_tags(page):
    try:
        title = page.css('meta[property="og:title"]::attr(content)').get()
        price_str = page.css('meta[property="product:price:amount"]::attr(content)').get()
        if not price_str:
            price_str = page.css('meta[property="og:price:amount"]::attr(content)').get()
        price = clean_price(price_str) if price_str else None
        return title, price, None
    except Exception:
        return None, None, None

def scrape_url(url):
    try:
        fetcher = Fetcher(stealth=True, headless=True)
        page = fetcher.get(url)
        
        # 1. Try Structured Data (JSON-LD)
        title, price, stock_status = extract_from_json_ld(page)
        
        # 2. Try Meta Tags
        if not title or price is None:
            m_title, m_price, m_stock = extract_from_meta_tags(page)
            if not title: title = m_title
            if price is None: price = m_price

        # 3. Fallback to common CSS selectors (Amazon, Shopify, general)
        if not title:
            for sel in [
                '#productTitle::text', 'h1.product-title::text', 'h1.product_title::text',
                'h1.title::text', '.product-details h1::text', 'h1::text'
            ]:
                t = page.css(sel).get()
                if t and t.strip():
                    title = t.strip()
                    break

        if price is None:
            for sel in [
                'span.a-price span.a-offscreen::text', '#priceblock_ourprice::text', 
                '.price::text', '.product-price::text', '[data-price]::attr(data-price)',
                '[itemprop="price"]::attr(content)', '[itemprop="price"]::text',
                '.price-item--regular::text', '.price-item--sale::text', 
                '.current-price::text'
            ]:
                p_str = page.css(sel).get()
                if p_str:
                    p = clean_price(p_str)
                    if p is not None:
                        price = p
                        break

        if not stock_status:
            stock_status = "In Stock"
            stock_text = page.css('.stock::text, #availability::text, [itemprop="availability"]::attr(href)').get()
            if stock_text:
                text_lower = stock_text.lower()
                if "out of stock" in text_lower or "unavailable" in text_lower or "outofstock" in text_lower or "épuisé" in text_lower:
                    stock_status = "Out of Stock"

        return {
            "success": True,
            "data": {
                "title": title.strip() if title else "Unknown Title",
                "price": price,
                "stockStatus": stock_status
            }
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "No URL provided"}))
        sys.exit(1)
        
    url = sys.argv[1]
    result = scrape_url(url)
    print(json.dumps(result))
