import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bell,
  CheckCircle2,
  Clock3,
  ExternalLink,
  ImageDown,
  Link as LinkIcon,
  MessageSquareText,
  PackageSearch,
  Plus,
  SearchCode,
  ShieldAlert,
  TrendingDown,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import {
  DashboardCard,
  DashboardCardHeader,
  EmptyState,
  StatCard,
  StatusBadge,
  TextLink,
} from "@/components/dashboard/ui";
import { PlanUsageStrip } from "@/components/dashboard/PlanUsageStrip";
import { WorkflowBanner } from "@/components/dashboard/WorkflowBanner";
import { buildTrackingWorkflow } from "@/lib/dashboard-workflow";

type AttentionProduct = {
  id: string;
  url: string;
  title: string | null;
  currentPrice: number | null;
  currency: string | null;
  stockStatus: string | null;
  lastCheckedAt: Date | null;
  lastError: string | null;
};

type PriceMover = {
  id: string;
  title: string | null;
  url: string;
  currency: string | null;
  current: number;
  previous: number;
  delta: number;
  percent: number;
};

function greetingName(name?: string | null, email?: string | null) {
  if (name?.trim()) return name.split(" ")[0];
  if (email) return email.split("@")[0];
  return "toi";
}

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

export default async function DashboardOverview() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const userId = session.user.id;

  const [user, productsCount, recentJobs, productsWithHistory, activeAlerts, productStates, attentionProducts] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        plan: true,
        maxUrls: true,
        monthlyCheckLimit: true,
        monthlyChecksUsed: true,
      },
    }),
    prisma.product.count({ where: { userId } }),
    prisma.scrapingJob.findMany({
      where: { product: { userId } },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { product: { select: { url: true, title: true } } },
    }),
    prisma.product.findMany({
      where: { userId },
      orderBy: [{ lastChangedAt: "desc" }, { updatedAt: "desc" }],
      select: {
        id: true,
        title: true,
        url: true,
        currentPrice: true,
        currency: true,
        stockStatus: true,
        lastChangedAt: true,
        priceHistory: { orderBy: { createdAt: "desc" }, take: 2, select: { price: true, createdAt: true } },
      },
    }),
    prisma.alertSetting.count({
      where: {
        emailEnabled: true,
        product: { userId },
      },
    }),
    prisma.product.findMany({
      where: { userId },
      select: { lastCheckedAt: true, lastError: true },
    }),
    prisma.product.findMany({
      where: {
        userId,
        OR: [{ lastError: { not: null } }, { lastCheckedAt: null }, { stockStatus: { contains: "Out" } }],
      },
      orderBy: [{ lastCheckedAt: "asc" }, { updatedAt: "desc" }],
      take: 6,
      select: {
        id: true,
        url: true,
        title: true,
        currentPrice: true,
        currency: true,
        stockStatus: true,
        lastCheckedAt: true,
        lastError: true,
      },
    }),
  ]);

  const priceMovers: PriceMover[] = productsWithHistory
    .map((product) => {
      const [latest, previous] = product.priceHistory;
      const current = product.currentPrice ?? latest?.price ?? null;
      const previousPrice = previous?.price ?? null;
      if (!current || !previousPrice || current === previousPrice) return null;
      const delta = current - previousPrice;
      return {
        id: product.id,
        title: product.title,
        url: product.url,
        currency: product.currency,
        current,
        previous: previousPrice,
        delta,
        percent: (delta / previousPrice) * 100,
      };
    })
    .filter((item): item is PriceMover => item !== null)
    .sort((a, b) => Math.abs(b.percent) - Math.abs(a.percent));

  const priceDrops = priceMovers.filter((product) => product.delta < 0).length;
  const uncheckedCount = productStates.filter((product) => !product.lastCheckedAt).length;
  const failedProductsCount = productStates.filter((product) => product.lastError).length;
  const checkedCount = Math.max(0, productsCount - uncheckedCount);
  const healthPct = productsCount ? Math.max(0, Math.round(((productsCount - uncheckedCount - failedProductsCount) / productsCount) * 100)) : 0;
  const checksUsed = user?.monthlyChecksUsed ?? 0;
  const checksLimit = user?.monthlyCheckLimit ?? 0;
  const checksPct = checksLimit ? Math.min(100, Math.round((checksUsed / checksLimit) * 100)) : 0;
  const urlsLeft = Math.max(0, (user?.maxUrls ?? 0) - productsCount);
  const attentionCount = uncheckedCount + failedProductsCount;
  const workflowSteps = buildTrackingWorkflow({ productsCount, uncheckedCount });
  const displayName = greetingName(user?.name, user?.email);

  const quickActions = [
    {
      href: "/dashboard/products",
      title: "Ajouter / checker une URL",
      description: "Sauvegarde un produit concurrent puis lance une extraction.",
      icon: Plus,
      badge: `${urlsLeft} slot${urlsLeft > 1 ? "s" : ""}`,
    },
    {
      href: "/dashboard/product-finder",
      title: "Trouver des produits",
      description: "Explore des catalogues réels puis ajoute les produits utiles au tracking.",
      icon: PackageSearch,
      badge: "catalogues",
    },
    {
      href: "/dashboard/tools/media-downloader",
      title: "Télécharger les assets",
      description: "Images, vidéos et médias détectés sur une page e-commerce.",
      icon: ImageDown,
      badge: "media",
    },
    {
      href: "/dashboard/tools/review-exporter",
      title: "Exporter les reviews",
      description: "Récupère les avis visibles/structurés en CSV.",
      icon: MessageSquareText,
      badge: "CSV",
    },
    {
      href: "/dashboard/tools/product-snapshot",
      title: "Snapshot produit",
      description: "Lis JSON-LD, prix, stock, marque, media et signaux d'une URL.",
      icon: SearchCode,
      badge: "JSON",
    },
    {
      href: "/dashboard/tools",
      title: "Tous les outils",
      description: "Promo detector, tech detector, discovery et autres workflows.",
      icon: Wrench,
      badge: "hub",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="dashboard-surface-transition dashboard-resize-transition rounded-2xl border border-[var(--dash-border)] bg-white p-6 sm:p-7 shadow-[var(--dash-shadow)]">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)] xl:items-end">
          <div>
            <p className="text-sm font-medium text-[var(--dash-muted)]">Bon retour</p>
            <h2 className="mt-1 text-2xl sm:text-3xl font-black tracking-tight text-[var(--dash-ink)]">
              Salut {displayName}, voici ton tableau de bord
            </h2>
            <p className="mt-2 max-w-2xl text-[var(--dash-muted-strong)] leading-relaxed">
              Suis les prix concurrents, lance des checks et réagis aux baisses — sans quitter l&apos;app.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href="/dashboard/products"
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--dash-accent)] px-4 py-2.5 text-sm font-bold text-white shadow-[0_8px_18px_rgba(255,105,12,0.15)] hover:bg-[#e55e0b] transition-colors dashboard-surface-transition dashboard-lift-hover"
              >
                <Plus className="h-4 w-4" /> Ajouter une URL
              </Link>
              {priceDrops > 0 ? (
                <Link
                  href="/dashboard/products"
                  className="inline-flex items-center gap-2 rounded-xl border border-[#d8e8c8] bg-[#f2f8ec] px-4 py-2.5 text-sm font-bold text-[#4f761d] hover:bg-[#e8f4dc] transition-colors dashboard-surface-transition dashboard-lift-hover"
                >
                  <TrendingDown className="h-4 w-4" /> {priceDrops} baisse{priceDrops > 1 ? "s" : ""} détectée{priceDrops > 1 ? "s" : ""}
                </Link>
              ) : (
                <Link
                  href="/dashboard/tools"
                  className="inline-flex items-center gap-2 rounded-xl border border-[var(--dash-border)] px-4 py-2.5 text-sm font-bold text-[var(--dash-muted-strong)] hover:bg-[var(--dash-bg)] transition-colors dashboard-surface-transition"
                >
                  Explorer les outils <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--dash-border)] bg-[var(--dash-bg)] p-3 dashboard-resize-transition">
            <p className="px-2 pt-1 text-[10px] font-black uppercase tracking-[0.16em] text-[var(--dash-muted)]">Ops snapshot</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <HeroMetric label="Santé" value={`${healthPct}%`} hint={`${checkedCount}/${productsCount} OK`} />
              <HeroMetric label="Checks" value={`${checksPct}%`} hint={`${checksUsed}/${checksLimit || "∞"}`} />
              <HeroMetric label="À traiter" value={attentionCount.toString()} hint={`${failedProductsCount} erreurs`} tone={attentionCount > 0 ? "orange" : "green"} />
            </div>
          </div>
        </div>
      </section>

      <PlanUsageStrip
        plan={user?.plan}
        productsCount={productsCount}
        monthlyChecksUsed={user?.monthlyChecksUsed}
        maxUrls={user?.maxUrls}
        monthlyCheckLimit={user?.monthlyCheckLimit}
        compact
      />

      <WorkflowBanner steps={workflowSteps} />

      <div data-tour="dashboard-stats" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="URLs suivies" value={productsCount} hint="Pages concurrentes enregistrées" icon={LinkIcon} />
        <StatCard label="Produits checkés" value={checkedCount} hint={`${uncheckedCount} sans premier check`} icon={CheckCircle2} tone={uncheckedCount ? "orange" : "green"} />
        <StatCard
          label="Baisses de prix"
          value={priceDrops}
          hint="par rapport au check précédent"
          icon={TrendingDown}
          tone={priceDrops > 0 ? "green" : "default"}
        />
        <StatCard
          label="Alertes actives"
          value={activeAlerts}
          hint="emails activés par produit"
          icon={Bell}
          tone={activeAlerts > 0 ? "orange" : "default"}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <DashboardCard padding={false} className="xl:col-span-2">
          <DashboardCardHeader title="Actions rapides" description="Les workflows les plus utiles, branchés sur de vraies extractions." />
          <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {quickActions.map((action) => <QuickAction key={action.href} {...action} />)}
          </div>
        </DashboardCard>

        <DashboardCard padding={false}>
          <DashboardCardHeader title="À traiter" description="Erreurs, URLs jamais checkées ou produits out of stock." />
          <AttentionList products={attentionProducts} />
        </DashboardCard>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <DashboardCard padding={false} className="xl:col-span-2">
          <DashboardCardHeader
            title="Derniers scrape jobs"
            description="Les dernières extractions lancées sur tes produits."
            action={<TextLink href="/dashboard/jobs">Tout voir</TextLink>}
          />
          <div className="divide-y divide-[#f6e8de]">
            {recentJobs.length === 0 ? (
              <EmptyState
                title="Aucun job pour l'instant"
                description="Ajoute une URL concurrente puis clique sur Check pour lancer ta première extraction."
                action={
                  <Link
                    href="/dashboard/products"
                    className="inline-flex items-center gap-2 rounded-xl bg-[var(--dash-accent)] px-4 py-2 text-sm font-bold text-white hover:bg-[#e55e0b] dashboard-surface-transition dashboard-lift-hover"
                  >
                    <Plus className="h-4 w-4" /> Ajouter ma première URL
                  </Link>
                }
              />
            ) : (
              recentJobs.map((job) => (
                <div
                  key={job.id}
                  className="px-5 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between hover:bg-[var(--dash-bg)] dashboard-list-row"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-[var(--dash-ink)] truncate">
                      {job.product.title || hostname(job.product.url)}
                    </p>
                    <p className="text-sm text-[var(--dash-muted)] truncate">{hostname(job.product.url)}</p>
                    <p className="text-xs text-[var(--dash-muted)] mt-1">{new Date(job.createdAt).toLocaleString("fr-FR")}</p>
                  </div>
                  <div className="shrink-0">
                    {job.status === "SUCCESS" ? (
                      <StatusBadge tone="success">Succès</StatusBadge>
                    ) : job.status === "FAILED" ? (
                      <StatusBadge tone="error">
                        <AlertTriangle className="w-3.5 h-3.5" /> Échec
                      </StatusBadge>
                    ) : (
                      <StatusBadge tone="warning">En attente</StatusBadge>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </DashboardCard>

        <DashboardCard padding={false}>
          <DashboardCardHeader title="Mouvements prix" description="Top variations détectées dans l'historique." />
          <PriceMoversList movers={priceMovers.slice(0, 6)} />
        </DashboardCard>
      </div>
    </div>
  );
}

function HeroMetric({ label, value, hint, tone = "default" }: { label: string; value: string; hint: string; tone?: "default" | "green" | "orange" }) {
  const valueTone = tone === "green" ? "text-[#4f761d]" : tone === "orange" ? "text-[#ff690c]" : "text-[var(--dash-ink)]";
  return (
    <div className="rounded-xl border border-[var(--dash-border)] bg-white p-3 dashboard-surface-transition">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--dash-muted)]">{label}</p>
      <p className={`mt-1 text-xl font-black tabular-nums ${valueTone}`}>{value}</p>
      <p className="mt-0.5 truncate text-[11px] font-semibold text-[var(--dash-muted)]">{hint}</p>
    </div>
  );
}

function QuickAction({ href, title, description, icon: Icon, badge }: { href: string; title: string; description: string; icon: LucideIcon; badge: string }) {
  return (
    <Link href={href} className="group dashboard-surface-transition dashboard-lift-hover rounded-2xl border border-[var(--dash-border)] bg-[var(--dash-bg)] p-4 hover:bg-white">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff2e8] text-[var(--dash-accent)]">
          <Icon className="h-5 w-5" />
        </div>
        <span className="rounded-full border border-[var(--dash-border)] bg-white px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--dash-muted)]">{badge}</span>
      </div>
      <p className="mt-4 font-black text-[var(--dash-ink)]">{title}</p>
      <p className="mt-1 text-sm font-medium leading-relaxed text-[var(--dash-muted-strong)]">{description}</p>
      <p className="mt-4 inline-flex items-center gap-1 text-sm font-black text-[var(--dash-accent)]">
        Ouvrir <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </p>
    </Link>
  );
}

function attentionReason(product: AttentionProduct) {
  if (product.lastError) return { label: "Erreur extraction", detail: product.lastError, tone: "error" as const, icon: ShieldAlert };
  if (!product.lastCheckedAt) return { label: "Premier check", detail: "Aucun scrape lancé", tone: "warning" as const, icon: Clock3 };
  if (product.stockStatus?.toLowerCase().includes("out")) return { label: "Stock", detail: product.stockStatus, tone: "neutral" as const, icon: AlertTriangle };
  return { label: "À revoir", detail: "Signal détecté", tone: "neutral" as const, icon: AlertTriangle };
}

function AttentionList({ products }: { products: AttentionProduct[] }) {
  if (!products.length) {
    return (
      <EmptyState
        title="Rien d'urgent"
        description="Aucune erreur ou URL sans check dans les produits suivis."
        action={<TextLink href="/dashboard/tools">Explorer les outils</TextLink>}
      />
    );
  }

  return (
    <div className="divide-y divide-[#f6e8de]">
      {products.map((product) => {
        const reason = attentionReason(product);
        const Icon = reason.icon;
        return (
          <div key={product.id} className="dashboard-list-row p-4 hover:bg-[var(--dash-bg)]">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#fff2e8] text-[var(--dash-accent)]">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate font-bold text-[var(--dash-ink)]">{product.title || hostname(product.url)}</p>
                  <span className="shrink-0 text-xs font-black text-[var(--dash-muted)]">{formatMoney(product.currentPrice, product.currency || "USD")}</span>
                </div>
                <p className="mt-0.5 truncate text-xs font-semibold text-[var(--dash-muted)]">{reason.label} · {reason.detail}</p>
                <div className="mt-3 flex items-center gap-2">
                  <Link href={`/dashboard/products?product=${product.id}`} className="text-xs font-black text-[var(--dash-accent)] hover:underline">Détails</Link>
                  <a href={product.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-[var(--dash-muted)] hover:text-[var(--dash-ink)]">
                    Ouvrir <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PriceMoversList({ movers }: { movers: PriceMover[] }) {
  if (!movers.length) {
    return (
      <EmptyState
        title="Pas encore assez d'historique"
        description="Ajoute puis check plusieurs fois tes URLs pour voir les variations réelles."
        action={<TextLink href="/dashboard/products">Voir les URLs</TextLink>}
      />
    );
  }

  return (
    <div className="divide-y divide-[#f6e8de]">
      {movers.map((mover) => {
        const isDrop = mover.delta < 0;
        const barWidth = Math.min(100, Math.max(8, Math.abs(mover.percent) * 2));
        return (
          <Link key={mover.id} href={`/dashboard/products?product=${mover.id}`} className="dashboard-list-row block p-4 hover:bg-[var(--dash-bg)]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-bold text-[var(--dash-ink)]">{mover.title || hostname(mover.url)}</p>
                <p className="mt-0.5 truncate text-xs font-semibold text-[var(--dash-muted)]">{formatMoney(mover.previous, mover.currency || "USD")} → {formatMoney(mover.current, mover.currency || "USD")}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-black ${isDrop ? "bg-[#f2f8ec] text-[#4f761d]" : "bg-[#fff2e8] text-[#c84f00]"}`}>
                {isDrop ? "-" : "+"}{Math.abs(mover.percent).toFixed(1)}%
              </span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--dash-bg)]">
              <div className={`h-full rounded-full ${isDrop ? "bg-[#5d8b22]" : "bg-[var(--dash-accent)]"}`} style={{ width: `${barWidth}%` }} />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
