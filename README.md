# PriceAndSee SaaS

A production-ready SaaS for e-commerce competitor monitoring.
Helps Shopify brands and Amazon sellers track competitor product pages automatically.

## Tech Stack
- **Framework:** Next.js (App Router, Tailwind CSS)
- **Database:** Neon PostgreSQL + Prisma
- **Auth:** NextAuth (Credentials)
- **Scraper:** Python + [Scrapling](https://github.com/D4Vinci/Scrapling)

## Setup Instructions

### 1. Database Configuration
We use **Neon Postgres**. In the root of the `saas-app` directory, create a `.env` file:
```env
DATABASE_URL="postgresql://user:password@ep-cool-db.us-east-2.aws.neon.tech/neondb?sslmode=require"
NEXTAUTH_SECRET="your-super-secret-key-for-jwt"
NEXTAUTH_URL="http://localhost:3005"
```

Apply the database schema:
```bash
npx prisma db push
# or npx prisma migrate dev
```

### 2. Install Dependencies & Run
```bash
npm install
npm run dev
```

### 3. Running the Scraper Worker
The scraper requires Python to be installed. We use the powerful `Scrapling` library for anti-bot scraping.

First, set up a Python environment and install Scrapling:
```bash
pip install scrapling
```

Then, you can run the Node scraper worker, which fetches URLs from the DB and feeds them to the Python scraper:
```bash
npx ts-node scraper/worker.ts
```
*(In production, you would run this via a Cron job (e.g., using GitHub Actions, Vercel Cron, or a background worker container) every few hours).*

## Vercel Deployment
1. Import the `saas-app` folder to Vercel.
2. Link your **Neon Postgres** database using the Vercel CLI or Dashboard.
3. Add `NEXTAUTH_SECRET` in the Environment Variables.
4. Deploy!
