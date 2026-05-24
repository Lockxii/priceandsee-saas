import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, CheckCircle2, Clock3, ExternalLink, Radar, RefreshCw, ShieldAlert, TrendingDown, Zap } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { effectiveUserLimits } from "@/lib/plans";
import { BulkCheckButton } from "./BulkCheckButton";

type ProductWithSignals = Awaited<ReturnType<typeof getMonitoringData>>["products"][number];

function hostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function formatMoney(value?: number | null, currency = "USD") {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: value % 1 ? 2 : 0 }).format(value);
}

function timeAgo(value?: Date | null) {
  if (!value) return "Never checked";
  const diff = Date.now() - value.getTime();
  const minutes = Math.max(1, Math.floor(diff / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function percentChange(from?: number | null, to?: number | null) {
  if (!from || !to || !Number.isFinite(from) || !Number.isFinite(to)) return null;
  return ((to - from) / from) * 100;
}

function productName(product: Pick<ProductWithSignals, "title" | "url">) {
  return product.title || hostname(product.url);
}

async function getMonitoringData(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      plan: true,
      maxUrls: true,
      checkIntervalHours: true,
      monthlyCheckLimit: true,
      monthlyChecksUsed: true,
      monthlyChecksReset: true,
      emailAlertsEnabled: true,
      slackAlertsEnabled: true,
    },
  });

  const products = await prisma.product.findMany({
    where: { userId },
    orderBy: [{ lastChangedAt: "desc" }, { lastCheckedAt: "asc" }, { createdAt: "desc" }],
    include: {
      priceHistory: { orderBy: { createdAt: "desc" }, take: 8 },
      scrapingJobs: { orderBy: { createdAt: "desc" }, take: 3 },
      alertSetting: true,
    },
  });

  return { user, products };
}

function productHealth(product: ProductWithSignals, checkIntervalHours: number) {
  const staleAfterMs = checkIntervalHours * 60 * 60 * 1000;
  const isNeverChecked = !product.lastCheckedAt;
  const isStale = !isNeverChecked && Date.now() - product.lastCheckedAt!.getTime() > staleAfterMs;
  const failed = Boolean(product.lastError || product.scrapingJobs[0]?.status === "FAILED");
  if (failed) return { label: "Fix needed", tone: "red", icon: ShieldAlert };
  if (isNeverChecked) return { label: "Needs first check", tone: "orange", icon: Radar };
  if (isStale) return { label: "Stale", tone: "orange", icon: Clock3 };
  return { label: "Healthy", tone: "green", icon: CheckCircle2 };
}

function healthClass(tone: string) {
  if (tone === "red") return "bg-red-50 text-red-700 border-red-200";
  if (tone === "green") return "bg-[#f2f8ec] text-[#4f761d] border-[#d8e8c8]";
  return "bg-[#fff2e8] text-[#c84f00] border-[#ffd7bd]";
}

export default async function MonitoringPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { user, products } = await getMonitoringData(session.user.id);
  const limits = effectiveUserLimits(user || { plan: "FREE" });
  const quotaUsed = user?.monthlyChecksUsed || 0;
  const quotaLeft = Math.max(0, limits.monthlyCheckLimit - quotaUsed);
  const coverage = products.length ? Math.round((products.filter((product) => product.lastCheckedAt && !product.lastError).length / products.length) * 100) : 0;
  const staleCutoff = new Date(Date.now() - limits.checkIntervalHours * 60 * 60 * 1000);

  const needsCheck = products.filter((product) => !product.lastCheckedAt || product.lastError || product.lastCheckedAt < staleCutoff);
  const failed = products.filter((product) => product.lastError || product.scrapingJobs[0]?.status === "FAILED");
  const changedRecently = products.filter((product) => product.lastChangedAt && product.lastChangedAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));

  const opportunities = products
    .map((product) => {
      const history = [...product.priceHistory].reverse();
      const previous = history.length > 1 ? history[history.length - 2]?.price : null;
      const current = product.currentPrice ?? history[history.length - 1]?.price ?? null;
      const change = percentChange(previous, current);
      return { product, previous, current, change };
    })
    .filter((item) => item.change !== null)
    .sort((a, b) => Math.abs(b.change || 0) - Math.abs(a.change || 0));

  const priceDrops = opportunities.filter((item) => (item.change || 0) < 0);
  const priceIncreases = opportunities.filter((item) => (item.change || 0) > 0);
  const actionIds = needsCheck.slice(0, Math.min(12, quotaLeft)).map((product) => product.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm text-[#8a7668]">Retention workflow</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-[#24170f] flex items-center gap-3">
            <Radar className="h-8 w-8 text-[#ff690c]" /> Monitoring Center
          </h1>
          <p className="mt-2 max-w-3xl text-[#6f5a4d]">Keep tracked products fresh, catch extraction failures, and spot real price moves from saved history. No generated data.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/product-finder" className="rounded-xl border border-[#f1ded1] bg-white px-4 py-2 text-sm font-black text-[#5b4638] hover:bg-[#fffaf6]">Find products</Link>
          <BulkCheckButton productIds={actionIds} disabledReason={!products.length ? "No tracked products yet" : quotaLeft <= 0 ? "Monthly check quota reached" : !actionIds.length ? "Everything is fresh" : undefined} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Tracked" value={products.length.toString()} sub={`${coverage}% healthy coverage`} icon={Radar} />
        <MetricCard label="Need check" value={needsCheck.length.toString()} sub={`${limits.checkIntervalHours}h freshness target`} icon={RefreshCw} tone="orange" />
        <MetricCard label="Failures" value={failed.length.toString()} sub="scraper errors to fix" icon={AlertTriangle} tone="red" />
        <MetricCard label="Changed 7d" value={changedRecently.length.toString()} sub="real saved changes" icon={Zap} />
        <MetricCard label="Quota left" value={quotaLeft.toString()} sub={`${quotaUsed}/${limits.monthlyCheckLimit} used`} icon={Clock3} />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <section className="xl:col-span-2 rounded-2xl border border-[#f1ded1] bg-white shadow-[0_10px_30px_-24px_rgba(53,37,28,0.45)] overflow-hidden">
          <div className="border-b border-[#f1ded1] px-5 py-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="font-black text-[#24170f]">Action queue</h2>
              <p className="text-sm text-[#8a7668]">Products that are stale, never checked, or currently failing.</p>
            </div>
            <span className="rounded-full bg-[#fffaf6] border border-[#f1ded1] px-3 py-1 text-xs font-black text-[#8a7668]">{needsCheck.length} item{needsCheck.length > 1 ? "s" : ""}</span>
          </div>
          <div className="divide-y divide-[#f1ded1]">
            {needsCheck.length === 0 ? (
              <div className="p-10 text-center text-[#8a7668]">Everything is fresh right now.</div>
            ) : (
              needsCheck.slice(0, 12).map((product) => <ActionRow key={product.id} product={product} interval={limits.checkIntervalHours} />)
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-[#f1ded1] bg-white shadow-[0_10px_30px_-24px_rgba(53,37,28,0.45)] overflow-hidden">
          <div className="border-b border-[#f1ded1] px-5 py-4">
            <h2 className="font-black text-[#24170f]">Price opportunities</h2>
            <p className="text-sm text-[#8a7668]">Largest real moves from price history.</p>
          </div>
          <div className="divide-y divide-[#f1ded1]">
            {opportunities.length === 0 ? (
              <div className="p-8 text-sm text-[#8a7668]">Run more checks to build enough history for price movement alerts.</div>
            ) : (
              opportunities.slice(0, 8).map(({ product, previous, current, change }) => (
                <Link key={product.id} href={`/dashboard/products?product=${product.id}`} className="block p-4 hover:bg-[#fffaf6] transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-black text-[#24170f]">{productName(product)}</p>
                      <p className="truncate text-xs font-bold text-[#8a7668]">{hostname(product.url)}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-black ${(change || 0) < 0 ? "bg-[#f2f8ec] text-[#4f761d]" : "bg-[#fff2e8] text-[#c84f00]"}`}>
                      {(change || 0) < 0 ? <ArrowDownRight className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
                      {Math.abs(change || 0).toFixed(1)}%
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-[#8a7668]">{formatMoney(previous, product.currency || "USD")} → <span className="font-black text-[#24170f]">{formatMoney(current, product.currency || "USD")}</span></p>
                </Link>
              ))
            )}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <InsightList title="Price drops" description="Competitor discounts you can react to." items={priceDrops.slice(0, 6)} empty="No price drops detected yet." direction="down" />
        <InsightList title="Price increases" description="Margin opportunities or competitor repositioning." items={priceIncreases.slice(0, 6)} empty="No price increases detected yet." direction="up" />
      </div>
    </div>
  );
}

function MetricCard({ label, value, sub, icon: Icon, tone = "default" }: { label: string; value: string; sub: string; icon: typeof Radar; tone?: "default" | "orange" | "red" }) {
  const color = tone === "red" ? "text-red-600 bg-red-50" : tone === "orange" ? "text-[#ff690c] bg-[#fff2e8]" : "text-[#ff690c] bg-[#fff2e8]";
  return (
    <div className="rounded-2xl border border-[#f1ded1] bg-white p-4 shadow-[0_10px_30px_-24px_rgba(53,37,28,0.45)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] uppercase tracking-[0.14em] font-black text-[#a99485]">{label}</p>
        <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${color}`}><Icon className="h-4 w-4" /></div>
      </div>
      <p className="mt-3 text-3xl font-black text-[#24170f] leading-none">{value}</p>
      <p className="mt-2 text-xs font-bold text-[#8a7668]">{sub}</p>
    </div>
  );
}

function ActionRow({ product, interval }: { product: ProductWithSignals; interval: number }) {
  const health = productHealth(product, interval);
  const Icon = health.icon;
  return (
    <div className="p-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between hover:bg-[#fffaf6] transition-colors">
      <div className="min-w-0 flex items-center gap-4">
        {product.image ? <img src={product.image} alt="" className="h-14 w-14 rounded-2xl border border-[#f1ded1] object-cover bg-[#fffaf6]" /> : <div className="h-14 w-14 rounded-2xl border border-[#f1ded1] bg-[#fffaf6]" />}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate font-black text-[#24170f]">{productName(product)}</p>
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-black ${healthClass(health.tone)}`}><Icon className="h-3 w-3" />{health.label}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold text-[#8a7668]">
            <span>{hostname(product.url)}</span>
            <span>{formatMoney(product.currentPrice, product.currency || "USD")}</span>
            <span>{timeAgo(product.lastCheckedAt)}</span>
            {product.lastError && <span className="text-red-600">{product.lastError.slice(0, 90)}</span>}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 lg:flex-shrink-0">
        <Link href={`/dashboard/products?product=${product.id}`} className="rounded-xl border border-[#f1ded1] bg-white px-3 py-2 text-sm font-black text-[#5b4638] hover:text-[#ff690c]">Details</Link>
        <a href={product.url} target="_blank" rel="noreferrer" className="rounded-xl border border-[#f1ded1] bg-white px-3 py-2 text-sm font-black text-[#5b4638] hover:text-[#ff690c] inline-flex items-center gap-1"><ExternalLink className="h-4 w-4" />Open</a>
      </div>
    </div>
  );
}

function InsightList({ title, description, items, empty, direction }: { title: string; description: string; items: Array<{ product: ProductWithSignals; previous: number | null; current: number | null; change: number | null }>; empty: string; direction: "up" | "down" }) {
  const isDown = direction === "down";
  return (
    <section className="rounded-2xl border border-[#f1ded1] bg-white shadow-[0_10px_30px_-24px_rgba(53,37,28,0.45)] overflow-hidden">
      <div className="border-b border-[#f1ded1] px-5 py-4">
        <h2 className="font-black text-[#24170f] flex items-center gap-2">{isDown ? <TrendingDown className="h-5 w-5 text-[#4f761d]" /> : <ArrowUpRight className="h-5 w-5 text-[#ff690c]" />}{title}</h2>
        <p className="text-sm text-[#8a7668]">{description}</p>
      </div>
      <div className="divide-y divide-[#f1ded1]">
        {items.length === 0 ? <div className="p-8 text-sm text-[#8a7668]">{empty}</div> : items.map(({ product, previous, current, change }) => (
          <div key={product.id} className="p-4 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate font-black text-[#24170f]">{productName(product)}</p>
              <p className="text-xs font-bold text-[#8a7668]">{formatMoney(previous, product.currency || "USD")} → {formatMoney(current, product.currency || "USD")}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-black ${isDown ? "bg-[#f2f8ec] text-[#4f761d]" : "bg-[#fff2e8] text-[#c84f00]"}`}>{change ? Math.abs(change).toFixed(1) : "0.0"}%</span>
          </div>
        ))}
      </div>
    </section>
  );
}
