import sys
import json
import re
from scrapling import Fetcher

def clean_price(price_str):
    if not price_str: return None
    clean_str = ''.join(c for c in str(price_str) if c.isdigit() or c in '.,')
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

def parse_offers(offers):
    if not offers: return []
    if isinstance(offers, dict):
        if 'offers' in offers and isinstance(offers['offers'], list):
            return offers['offers']
        return [offers]
    if isinstance(offers, list):
        return offers
    return []

def extract_from_json_ld(page):
    results = {}
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
                        if item.get('name'): results['title'] = item.get('name')
                        if item.get('description'): results['description'] = item.get('description')
                        if item.get('sku'): results['sku'] = item.get('sku')
                        if item.get('mpn'): results['mpn'] = item.get('mpn')
                        
                        image = item.get('image')
                        if isinstance(image, list) and image: results['image'] = image[0]
                        elif isinstance(image, str): results['image'] = image

                        brand = item.get('brand')
                        if isinstance(brand, dict): results['brand'] = brand.get('name')
                        elif isinstance(brand, str): results['brand'] = brand

                        offers = parse_offers(item.get('offers'))
                        if offers:
                            main_offer = offers[0]
                            price = main_offer.get('price')
                            if not price and 'lowPrice' in main_offer:
                                price = main_offer.get('lowPrice')
                            if price: results['price'] = clean_price(price)
                            
                            results['currency'] = main_offer.get('priceCurrency')
                            
                            avail = main_offer.get('availability', '')
                            results['stockStatus'] = "Out of Stock" if ("OutOfStock" in avail or "SoldOut" in avail) else "In Stock"

                            if len(offers) > 1:
                                results['bundle_prices'] = []
                                for off in offers:
                                    off_price = clean_price(off.get('price'))
                                    off_name = off.get('name') or off.get('sku') or "Variant"
                                    if off_price:
                                        results['bundle_prices'].append({"name": off_name, "price": off_price})
                        
                        rating = item.get('aggregateRating')
                        if isinstance(rating, dict):
                            results['rating'] = rating.get('ratingValue')
                            results['reviews_count'] = rating.get('reviewCount')
                            
                        # If we got at least a title and price, return this JSON-LD
                        if 'title' in results and 'price' in results:
                            return results
            except (json.JSONDecodeError, TypeError):
                continue
    except Exception:
        pass
    return results

def scrape_url(url):
    try:
        fetcher = Fetcher(stealth=True, headless=True)
        page = fetcher.get(url)
        
        # Base structured data
        data = extract_from_json_ld(page)
        
        # Fallbacks for missing fields
        if not data.get('title'):
            t = page.css('meta[property="og:title"]::attr(content)').get()
            if not t:
                for sel in ['#productTitle::text', 'h1.product-title::text', 'h1.product_title::text', 'h1.title::text', 'h1::text']:
                    t = page.css(sel).get()
                    if t: break
            if t: data['title'] = t.strip()

        if not data.get('price'):
            p_str = page.css('meta[property="product:price:amount"]::attr(content)').get()
            if not p_str:
                for sel in ['span.a-price span.a-offscreen::text', '#priceblock_ourprice::text', '.price::text', '[data-price]::attr(data-price)', '[itemprop="price"]::attr(content)', '.price-item--regular::text', '.current-price::text']:
                    p_str = page.css(sel).get()
                    if p_str: break
            if p_str: data['price'] = clean_price(p_str)

        if not data.get('currency'):
            data['currency'] = page.css('meta[property="product:price:currency"]::attr(content)').get()

        if not data.get('description'):
            desc = page.css('meta[property="og:description"]::attr(content)').get() or page.css('meta[name="description"]::attr(content)').get()
            if desc: data['description'] = desc.strip()

        if not data.get('image'):
            img = page.css('meta[property="og:image"]::attr(content)').get()
            if img: data['image'] = img

        if not data.get('brand'):
            brand = page.css('meta[property="og:site_name"]::attr(content)').get()
            if brand: data['brand'] = brand.strip()

        if not data.get('stockStatus'):
            stock_text = page.css('.stock::text, #availability::text, [itemprop="availability"]::attr(href)').get()
            data['stockStatus'] = "In Stock"
            if stock_text:
                text_lower = stock_text.lower()
                if "out of stock" in text_lower or "unavailable" in text_lower or "outofstock" in text_lower or "épuisé" in text_lower:
                    data['stockStatus'] = "Out of Stock"

        # Formatting defaults
        final_data = {
            "title": data.get('title', "Unknown Title"),
            "price": data.get('price'),
            "currency": data.get('currency', "USD"),
            "stockStatus": data.get('stockStatus', "In Stock"),
            "description": data.get('description'),
            "brand": data.get('brand'),
            "sku": data.get('sku') or data.get('mpn'),
            "image": data.get('image'),
            "rating": data.get('rating'),
            "reviews_count": data.get('reviews_count'),
            "bundle_prices": data.get('bundle_prices', [])
        }

        final_data = {k: v for k, v in final_data.items() if v is not None}

        return {
            "success": True,
            "data": final_data
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