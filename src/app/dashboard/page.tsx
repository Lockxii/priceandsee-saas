import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bell,
  Link as LinkIcon,
  Plus,
  TrendingDown,
} from "lucide-react";
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

export default async function DashboardOverview() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const userId = session.user.id;

  const [user, productsCount, recentJobs, productsWithHistory, activeAlerts, productStates] = await Promise.all([
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
      take: 5,
      include: { product: { select: { url: true, title: true } } },
    }),
    prisma.product.findMany({
      where: { userId },
      select: {
        priceHistory: { orderBy: { createdAt: "desc" }, take: 2 },
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
      select: { lastCheckedAt: true },
    }),
  ]);

  const priceDrops = productsWithHistory.filter((product) => {
    const [latest, previous] = product.priceHistory;
    if (!latest?.price || !previous?.price) return false;
    return latest.price < previous.price;
  }).length;

  const uncheckedCount = productStates.filter((product) => !product.lastCheckedAt).length;
  const workflowSteps = buildTrackingWorkflow({ productsCount, uncheckedCount });
  const displayName = greetingName(user?.name, user?.email);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[var(--dash-border)] bg-white p-6 sm:p-7 shadow-[var(--dash-shadow)]">
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
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--dash-accent)] px-4 py-2.5 text-sm font-bold text-white shadow-[0_8px_18px_rgba(255,105,12,0.15)] hover:bg-[#e55e0b] transition-colors"
          >
            <Plus className="h-4 w-4" /> Ajouter une URL
          </Link>
          {priceDrops > 0 ? (
            <Link
              href="/dashboard/products"
              className="inline-flex items-center gap-2 rounded-xl border border-[#d8e8c8] bg-[#f2f8ec] px-4 py-2.5 text-sm font-bold text-[#4f761d] hover:bg-[#e8f4dc] transition-colors"
            >
              <TrendingDown className="h-4 w-4" /> {priceDrops} baisse{priceDrops > 1 ? "s" : ""} détectée{priceDrops > 1 ? "s" : ""}
            </Link>
          ) : (
            <Link
              href="/dashboard/tools"
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--dash-border)] px-4 py-2.5 text-sm font-bold text-[var(--dash-muted-strong)] hover:bg-[var(--dash-bg)] transition-colors"
            >
              Explorer les outils <ArrowRight className="h-4 w-4" />
            </Link>
          )}
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
        <StatCard label="Jobs récents" value={recentJobs.length} hint="5 derniers scrapes" icon={Activity} />
      </div>

      <DashboardCard padding={false}>
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
                  className="inline-flex items-center gap-2 rounded-xl bg-[var(--dash-accent)] px-4 py-2 text-sm font-bold text-white hover:bg-[#e55e0b]"
                >
                  <Plus className="h-4 w-4" /> Ajouter ma première URL
                </Link>
              }
            />
          ) : (
            recentJobs.map((job) => (
              <div
                key={job.id}
                className="px-5 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between hover:bg-[var(--dash-bg)] transition-colors"
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
    </div>
  );
}
