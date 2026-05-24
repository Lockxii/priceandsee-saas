import os
from typing import Literal
from urllib.parse import urlparse

from fastapi import FastAPI, Header, HTTPException
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, Field, field_validator

from run_scraper import provider_status, scrape_url

app = FastAPI(title="PriceAndSee Scraper API", version="2.0.0")

API_KEY = os.environ.get("SCRAPER_API_KEY", "secret_key_to_change")
PUBLIC_ORIGIN = os.environ.get("PUBLIC_ORIGIN")


class ScrapeRequest(BaseModel):
    url: str = Field(..., min_length=8, max_length=4000)
    mode: Literal["auto", "fast", "dynamic", "stealth"] = "auto"
    timeout_ms: int | None = Field(default=None, ge=5000, le=120000)
    wait_ms: int | None = Field(default=None, ge=0, le=10000)

    @field_validator("url")
    @classmethod
    def validate_url(cls, value: str) -> str:
        parsed = urlparse(value.strip())
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise ValueError("URL must be a valid http(s) URL")
        return value.strip()


def require_api_key(authorization: str | None) -> None:
    if API_KEY and authorization != f"Bearer {API_KEY}":
        raise HTTPException(status_code=401, detail="Unauthorized: invalid scraper API key")


@app.get("/")
def root():
    return {
        "service": "PriceAndSee Scraper API",
        "status": "ok",
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health")
def health():
    return {"status": "ok", "providers": provider_status() if provider_status else {}}


@app.post("/scrape")
async def scrape(req: ScrapeRequest, authorization: str | None = Header(default=None)):
    require_api_key(authorization)

    result = await run_in_threadpool(
        scrape_url,
        req.url,
        req.mode,
        req.timeout_ms,
        req.wait_ms,
    )

    if not result.get("success"):
        raise HTTPException(status_code=502, detail=result.get("error", "Scraping failed"))

    return result
