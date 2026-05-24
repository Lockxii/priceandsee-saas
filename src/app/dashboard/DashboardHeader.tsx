"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings } from "lucide-react";

const routeMeta: Array<{
  match: (pathname: string) => boolean;
  title: string;
  subtitle?: string;
}> = [
  { match: (p) => p === "/dashboard", title: "Vue d'ensemble", subtitle: "Ton cockpit de veille concurrentielle" },
  {
    match: (p) => p === "/dashboard/products" || p.startsWith("/dashboard/products/"),
    title: "URLs suivies",
    subtitle: "Produits concurrents que tu surveilles",
  },
  { match: (p) => p === "/dashboard/tools", title: "Outils", subtitle: "Workflows de scraping e-commerce" },
  { match: (p) => p === "/dashboard/product-finder", title: "Product Finder", subtitle: "Découvre les catalogues Shopify" },
  { match: (p) => p.startsWith("/dashboard/tools/"), title: "Outil", subtitle: "Lance une extraction ciblée" },
  { match: (p) => p === "/dashboard/jobs", title: "Scrape jobs", subtitle: "Activité récente des extractions" },
];

function resolveMeta(pathname: string) {
  return routeMeta.find((entry) => entry.match(pathname)) ?? { title: "Dashboard", subtitle: undefined };
}

function formatPlan(plan?: string | null) {
  if (!plan || plan === "FREE") return "Plan Free";
  return `Plan ${plan}`;
}

export function DashboardHeader({ plan }: { plan?: string | null }) {
  const pathname = usePathname();
  const { title, subtitle } = resolveMeta(pathname);

  return (
    <header className="h-[4.25rem] shrink-0 flex items-center justify-between gap-4 px-6 sm:px-8 bg-white/90 backdrop-blur-sm border-b border-[var(--dash-border)] sticky top-0 z-20">
      <div className="min-w-0">
        <h1 className="text-lg sm:text-xl font-bold text-[var(--dash-ink)] truncate">{title}</h1>
        {subtitle ? <p className="text-xs text-[var(--dash-muted)] truncate hidden sm:block">{subtitle}</p> : null}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="hidden sm:inline rounded-full border border-[var(--dash-border)] bg-[var(--dash-bg)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--dash-accent)]">
          {formatPlan(plan)}
        </span>
        <Link
          href="?settings=true"
          scroll={false}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--dash-border)] text-[#8a7668] hover:bg-[var(--dash-bg)] hover:text-[var(--dash-ink)] transition-colors"
          aria-label="Account settings"
        >
          <Settings className="h-4 w-4" />
        </Link>
      </div>
    </header>
  );
}
