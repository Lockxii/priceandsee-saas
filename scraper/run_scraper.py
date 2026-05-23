import sys
import json
from scrapling import Fetcher

def scrape_url(url):
    try:
        # Fetcher uses stealth settings by default
        fetcher = Fetcher()
        page = fetcher.get(url)
        
        # This is a very generic extraction logic.
        # In a real scenario, you'd use LLM or specific selectors per domain.
        # Here we try some common e-commerce selectors.
        
        title = page.css('h1::text').get() or page.css('.product-title::text').get()
        
        # Try to find price
        price_str = page.css('.price::text').get() or page.css('[data-price]::text').get() or page.css('#price::text').get()
        
        # Clean price
        price = None
        if price_str:
            clean_str = ''.join([c for c in price_str if c.isdigit() or c == '.'])
            if clean_str:
                try:
                    price = float(clean_str)
                except ValueError:
                    price = None

        # Try to find stock status
        stock_text = page.css('.stock::text').get() or page.css('#availability::text').get()
        stock_status = "In Stock"
        if stock_text and ("out of stock" in stock_text.lower() or "currently unavailable" in stock_text.lower()):
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
