from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel
import os

from run_scraper import scrape_url

app = FastAPI(title="PriceAndSee Scraper API")

API_KEY = os.environ.get("SCRAPER_API_KEY", "secret_key_to_change")

class ScrapeRequest(BaseModel):
    url: str

@app.post("/scrape")
def scrape(req: ScrapeRequest, authorization: str = Header(None)):
    # Basic API Key protection
    if authorization != f"Bearer {API_KEY}":
        raise HTTPException(status_code=401, detail="Unauthorized: Invalid API Key")
        
    if not req.url:
        raise HTTPException(status_code=400, detail="URL is required")
    
    result = scrape_url(req.url)
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error", "Scraping failed"))
    
    return result

@app.get("/health")
def health():
    return {"status": "ok"}
