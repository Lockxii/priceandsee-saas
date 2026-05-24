import importlib
import os
from functools import lru_cache
from typing import Any, Literal
from urllib.parse import urlparse

from fastapi import FastAPI, Header, HTTPException, Query
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, Field, field_validator

app = FastAPI(title="PriceAndSee Scraper API", version="2.0.1")

API_KEY = os.environ.get("SCRAPER_API_KEY", "secret_key_to_change")
PUBLIC_ORIGIN = os.environ.get("PUBLIC_ORIGIN")


@lru_cache(maxsize=1)
def scraper_module() -> tuple[Any | None, str | None]:
    try:
        return importlib.import_module("run_scraper"), None
    except Exception as exc:  # Keep /health alive even if Scrapling/providers are broken.
        return None, f"{type(exc).__name__}: {exc}"


def clear_scraper_import_cache() -> None:
    scraper_module.cache_clear()



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
def health(deep: bool = Query(default=False)):
    if not deep:
        return {
            "status": "ok",
            "mode": "shallow",
            "deepCheck": "/health?deep=true",
            "externalProviders": os.getenv("SCRAPER_EXTERNAL_PROVIDERS", "firecrawl,scrapegraph"),
            "firecrawlConfigured": bool(os.getenv("FIRECRAWL_API_KEY")),
            "scrapeGraphConfigured": bool(os.getenv("SGAI_API_KEY") or os.getenv("SCRAPEGRAPH_API_KEY")),
        }

    module, import_error = scraper_module()
    providers = {}
    if module is not None:
        try:
            status_fn = getattr(module, "provider_status", None)
            providers = status_fn() if status_fn else {}
        except Exception as exc:
            providers = {"statusError": f"{type(exc).__name__}: {exc}"}
    return {
        "status": "ok",
        "mode": "deep",
        "scraperImport": "ok" if module is not None else "degraded",
        "scraperImportError": import_error,
        "providers": providers,
    }


@app.post("/scrape")
async def scrape(req: ScrapeRequest, authorization: str | None = Header(default=None)):
    require_api_key(authorization)

    module, import_error = scraper_module()
    if module is None:
        clear_scraper_import_cache()
        raise HTTPException(status_code=503, detail=f"Scraper runtime failed to import: {import_error}")

    result = await run_in_threadpool(
        module.scrape_url,
        req.url,
        req.mode,
        req.timeout_ms,
        req.wait_ms,
    )

    if not result.get("success"):
        raise HTTPException(status_code=502, detail=result.get("error", "Scraping failed"))

    return result
