# PriceAndSee SaaS

A production-ready SaaS for e-commerce competitor monitoring.
Helps Shopify brands and Amazon sellers track competitor product pages automatically.

## Tech Stack
- **Framework:** Next.js (App Router, Tailwind CSS)
- **Database:** Neon PostgreSQL + Prisma
- **Auth:** NextAuth (Credentials)
- **Scraper:** FastAPI + [Scrapling](https://github.com/D4Vinci/Scrapling)

## Setup Instructions

### 1. Database Configuration
We use **Neon Postgres**. In the root of the `saas-app` directory, create a `.env` file:
```env
DATABASE_URL="postgresql://user:password@ep-cool-db.us-east-2.aws.neon.tech/neondb?sslmode=require"
NEXTAUTH_SECRET="your-super-secret-key-for-jwt"
NEXTAUTH_URL="http://localhost:3005"
SCRAPER_API_URL="http://localhost:8000/scrape"
SCRAPER_API_KEY="change-me"
CRON_SECRET="change-me-too"
# Optional BrandSearch enrichment. Do not commit real API keys.
BRANDSEARCH_API_KEY=""
```

Apply the database schema:
```bash
npx prisma db push
# or npx prisma migrate dev
```

### 2. Install Dependencies & Run the Next.js App
```bash
npm install
npm run dev
```

### 3. Run the Scraper API locally
The Next.js app calls a dedicated FastAPI scraper service. This keeps Scrapling/browser dependencies out of the web runtime.

```bash
cd scraper
python -m venv .venv
source .venv/bin/activate
pip install "scrapling[fetchers]" -r requirements.txt
scrapling install
SCRAPER_API_KEY="change-me" uvicorn api:app --host 0.0.0.0 --port 8000
```

Test it:
```bash
curl -X POST http://localhost:8000/scrape \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer change-me" \
  -d '{"url":"https://example.com","mode":"auto"}'
```

### 4. Railway scraper deployment
Deploy the `scraper/` folder as its own Railway service using `scraper/Dockerfile`.

Important environment variables:
```env
SCRAPER_API_KEY="same-value-as-next-app"
SCRAPER_MODE="auto" # auto | fast | dynamic | stealth
SCRAPER_TIMEOUT_MS="45000"
SCRAPER_WAIT_MS="1200"

# External fallback providers. Public Shopify/WooCommerce endpoints run automatically.
SCRAPER_EXTERNAL_PROVIDERS="firecrawl,scrapegraph,crawl4ai,camoufox,browser_use"
SCRAPER_EXTERNAL_PROVIDERS_ALWAYS="false" # false = providers run on fallback/thin data; true = always enrich
FIRECRAWL_API_KEY="" # Firecrawl v2 scrape API
FIRECRAWL_API_URL="https://api.firecrawl.dev/v2/scrape" # override if self-hosted
SGAI_API_KEY="" # ScrapeGraphAI API / scrapegraph-py, SCRAPEGRAPH_API_KEY also works
CRAWL4AI_API_URL="" # Optional self-hosted Crawl4AI Docker API, ex: http://crawl4ai:11235
CAMOUFOX_ENABLED="false" # true only if Railway image has Camoufox browsers ready
BROWSER_USE_ENABLED="false" # requires OPENAI_API_KEY or compatible LangChain OpenAI config
BROWSER_USE_MODEL="gpt-4o-mini"
```

Then set the Next.js service variable:
```env
SCRAPER_API_URL="https://your-railway-scraper.up.railway.app/scrape"
SCRAPER_API_KEY="same-value-as-scraper-service"
```

The Dockerfile intentionally resets the official Scrapling image entrypoint. Without that, Railway passes `uvicorn ...` to the `scrapling` CLI and the container fails with `Try 'scrapling --help' for help.`

The scraper now layers multiple providers: Scrapling first, public e-commerce endpoints (Shopify `/products/*.js`, WooCommerce Store API), marketplace/platform adapters, then optional Firecrawl, ScrapeGraphAI, Crawl4AI, Camoufox and browser-use fallbacks when configured.
