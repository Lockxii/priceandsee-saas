"use client";

import { useState, useEffect } from "react";
import { Plus, ExternalLink, RefreshCw, Radar } from "lucide-react";
import { ProductDetailsModal } from "./[id]/ProductDetailsModal";
import {
  DashboardCard,
  DashInput,
  EmptyState,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  StatusBadge,
} from "@/components/dashboard/ui";
import { PlanUsageStrip } from "@/components/dashboard/PlanUsageStrip";
import { WorkflowBanner } from "@/components/dashboard/WorkflowBanner";
import { buildTrackingWorkflow } from "@/lib/dashboard-workflow";

type TrackedProduct = {
  id: string;
  title?: string | null;
  url: string;
  stockStatus?: string | null;
  lastCheckedAt?: string | null;
  lastError?: string | null;
  currentPrice?: number | null;
};

type Usage = {
  plan: string;
  productsCount: number;
  maxUrls: number;
  monthlyChecksUsed: number;
  monthlyCheckLimit: number;
};

export default function ProductsPage() {
  const [products, setProducts] = useState<TrackedProduct[]>([]);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [scrapingId, setScrapingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("product");
  });
  const [fetching, setFetching] = useState(true);

  async function fetchProducts() {
    setFetching(true);
    const res = await fetch("/api/products");
    const data = await res.json();
    if (data.products) setProducts(data.products);
    if (data.usage) setUsage(data.usage);
    setFetching(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchProducts();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const atUrlLimit = usage ? usage.productsCount >= usage.maxUrls : false;
  const uncheckedCount = products.filter((product) => !product.lastCheckedAt).length;
  const workflowSteps = buildTrackingWorkflow({
    productsCount: products.length,
    uncheckedCount,
  });

  const scrapeNow = async (id: string, silent = false) => {
    setScrapingId(id);
    if (!silent) setError("");
    const res = await fetch(`/api/products/${id}/scrape`, { method: "POST" });
    const data = await res.json();
    setScrapingId(null);
    if (!res.ok) {
      setError(data.error || "Le check a échoué pour cette URL.");
      return false;
    }
    if (!silent) {
      setSuccess("Check terminé — prix et stock mis à jour.");
    }
    await fetchProducts();
    return true;
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (atUrlLimit) {
      setError(`Limite atteinte (${usage?.maxUrls} URLs). Passe à un plan supérieur pour en ajouter plus.`);
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");
    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Impossible d'ajouter cette URL.");
      return;
    }

    const newId = data.product?.id as string | undefined;
    setUrl("");
    await fetchProducts();

    if (newId) {
      setSuccess("URL ajoutée — premier check en cours…");
      await scrapeNow(newId, true);
      setSuccess("Produit ajouté et premier check lancé. Ouvre Détails pour voir les insights.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Suivi concurrents"
        hideTitle
        description="Colle une URL produit, on lance automatiquement le premier check pour récupérer prix, stock et données marché."
      />

      {usage ? (
        <PlanUsageStrip
          plan={usage.plan}
          productsCount={usage.productsCount}
          monthlyChecksUsed={usage.monthlyChecksUsed}
          maxUrls={usage.maxUrls}
          monthlyCheckLimit={usage.monthlyCheckLimit}
          compact
        />
      ) : null}

      <WorkflowBanner steps={workflowSteps} title="Ton parcours" />

      <form onSubmit={handleAddProduct} data-tour="add-url-form" className="rounded-2xl border border-[var(--dash-border)] bg-white p-4 sm:p-5 shadow-[var(--dash-shadow)] space-y-3">
        <label htmlFor="product-url" className="text-sm font-bold text-[var(--dash-ink)]">
          URL produit concurrent
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <DashInput
            id="product-url"
            type="url"
            required
            placeholder="https://boutique-concurrente.com/products/..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1"
            disabled={atUrlLimit || loading}
          />
          <PrimaryButton type="submit" disabled={loading || atUrlLimit} className="sm:min-w-[160px]">
            {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
            {loading ? "Ajout…" : "Ajouter + Check"}
          </PrimaryButton>
        </div>
        <p className="text-xs text-[var(--dash-muted)]">
          {atUrlLimit
            ? "Quota URLs atteint sur ton plan actuel."
            : "Shopify, WooCommerce et pages produit classiques sont supportés."}
        </p>
      </form>

      {error ? (
        <div className="p-4 bg-red-50 text-red-700 rounded-xl text-sm font-medium border border-red-100">{error}</div>
      ) : null}
      {success ? (
        <div className="p-4 bg-[#f2f8ec] text-[#4f761d] rounded-xl text-sm font-medium border border-[#d8e8c8]">{success}</div>
      ) : null}

      <DashboardCard padding={false}>
        {fetching ? (
          <div className="divide-y divide-[var(--dash-border)]">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="p-5 animate-pulse flex gap-4">
                <div className="h-12 w-12 rounded-xl bg-[#fff2e8]" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 rounded bg-[#fff2e8]" />
                  <div className="h-3 w-2/3 rounded bg-[#fffaf6]" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <EmptyState
            title="Aucune URL suivie"
            description={
              usage
                ? `Plan ${usage.plan} : jusqu'à ${usage.maxUrls} URLs. Colle ta première page produit ci-dessus — le check démarre tout seul.`
                : "Colle une URL produit concurrente pour démarrer le suivi."
            }
          />
        ) : (
          <div className="divide-y divide-[var(--dash-border)]">
            {products.map((p) => (
              <article
                key={p.id}
                className="p-5 sm:p-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between hover:bg-[var(--dash-bg)] transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-[var(--dash-ink)] truncate">{p.title || "Extraction en attente…"}</h3>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-2">
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-[var(--dash-accent)] hover:underline inline-flex items-center gap-1 max-w-full truncate"
                    >
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{p.url}</span>
                    </a>
                    {p.stockStatus ? (
                      <StatusBadge tone={p.stockStatus === "In Stock" ? "success" : "error"}>
                        {p.stockStatus === "In Stock" ? "En stock" : p.stockStatus}
                      </StatusBadge>
                    ) : null}
                    {p.lastCheckedAt ? (
                      <span className="text-xs text-[var(--dash-muted)]">
                        Check {new Date(p.lastCheckedAt).toLocaleDateString("fr-FR")}
                      </span>
                    ) : (
                      <StatusBadge tone="warning">Premier check à faire</StatusBadge>
                    )}
                    {p.lastError ? <span className="text-xs text-red-600 font-medium">Erreur d&apos;extraction</span> : null}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                  <div className="mr-auto lg:mr-3 lg:text-right">
                    <p className="text-xs font-medium text-[var(--dash-muted)] uppercase tracking-wide">Prix actuel</p>
                    <p className="font-black text-[var(--dash-ink)] text-xl tabular-nums">
                      {p.currentPrice ? `${p.currentPrice}€` : "—"}
                    </p>
                  </div>
                  <PrimaryButton
                    onClick={() => void scrapeNow(p.id)}
                    disabled={scrapingId === p.id}
                    data-tour="check-product"
                    className="px-4 py-2 text-sm"
                  >
                    {scrapingId === p.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Radar className="w-4 h-4" />}
                    Check
                  </PrimaryButton>
                  <SecondaryButton onClick={() => setSelectedProductId(p.id)} className="text-sm">
                    Détails
                  </SecondaryButton>
                </div>
              </article>
            ))}
          </div>
        )}
      </DashboardCard>

      {selectedProductId ? (
        <ProductDetailsModal productId={selectedProductId} onClose={() => setSelectedProductId(null)} />
      ) : null}
    </div>
  );
}
