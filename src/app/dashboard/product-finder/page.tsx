"use client";

import { useMemo, useState } from "react";
import { Download, ExternalLink, Filter, PackageSearch, Search, Sparkles } from "lucide-react";

type FinderProduct = {
  store: string;
  domain: string;
  title?: string;
  handle?: string;
  url?: string;
  image?: string;
  price?: number | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  compareAtPrice?: number | null;
  discountPercent?: number | null;
  available?: boolean | null;
  vendor?: string | null;
  productType?: string | null;
  variantsCount?: number | null;
  variantsAvailable?: number | null;
  publishedAt?: string | null;
  source: string;
};

type FinderError = { store: string; error: string };

function formatMoney(value?: number | null) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: value % 1 ? 2 : 0 }).format(value);
}

function csvEscape(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function productsToCsv(products: FinderProduct[]) {
  const rows = [["store", "title", "price", "compare_at_price", "discount_percent", "available", "vendor", "type", "variants", "published_at", "url", "image"]];
  products.forEach((item) => rows.push([
    item.store,
    item.title || "",
    item.price?.toString() || "",
    item.compareAtPrice?.toString() || "",
    item.discountPercent?.toString() || "",
    item.available === null || item.available === undefined ? "" : item.available ? "true" : "false",
    item.vendor || "",
    item.productType || "",
    item.variantsCount?.toString() || "",
    item.publishedAt || "",
    item.url || "",
    item.image || "",
  ]));
  return rows.map((row) => row.map(csvEscape).join(",")).join("\n");
}

function downloadCsv(products: FinderProduct[]) {
  const blob = new Blob([productsToCsv(products)], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "product-finder.csv";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function productPrice(item: FinderProduct) {
  return item.price ?? item.minPrice ?? item.maxPrice ?? null;
}

export default function ProductFinderPage() {
  const [stores, setStores] = useState("bleame.com\ntryestrid.com\nmanscaped.com");
  const [products, setProducts] = useState<FinderProduct[]>([]);
  const [errors, setErrors] = useState<FinderError[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "discounted" | "in-stock" | "out-of-stock" | "newest">("all");
  const [sort, setSort] = useState<"discount" | "price-desc" | "price-asc" | "newest">("discount");
  const [error, setError] = useState("");

  const runFinder = async () => {
    setLoading(true);
    setError("");
    setErrors([]);
    try {
      const res = await fetch("/api/product-finder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stores, limit: 120 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Product Finder failed");
      setProducts(data.products || []);
      setErrors(data.errors || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Product Finder failed");
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products
      .filter((item) => {
        if (q && ![item.title, item.store, item.vendor, item.productType].some((value) => value?.toLowerCase().includes(q))) return false;
        if (filter === "discounted") return (item.discountPercent || 0) > 0;
        if (filter === "in-stock") return item.available === true;
        if (filter === "out-of-stock") return item.available === false;
        return true;
      })
      .sort((a, b) => {
        if (filter === "newest" || sort === "newest") return new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime();
        if (sort === "price-desc") return (productPrice(b) || 0) - (productPrice(a) || 0);
        if (sort === "price-asc") return (productPrice(a) || Number.MAX_SAFE_INTEGER) - (productPrice(b) || Number.MAX_SAFE_INTEGER);
        return (b.discountPercent || 0) - (a.discountPercent || 0);
      });
  }, [products, query, filter, sort]);

  const stats = useMemo(() => {
    const storesCount = new Set(products.map((item) => item.store)).size;
    const discounted = products.filter((item) => (item.discountPercent || 0) > 0).length;
    const inStock = products.filter((item) => item.available === true).length;
    const prices = products.map(productPrice).filter((value): value is number => value !== null && Number.isFinite(value));
    return {
      storesCount,
      discounted,
      inStock,
      min: prices.length ? Math.min(...prices) : undefined,
      max: prices.length ? Math.max(...prices) : undefined,
    };
  }, [products]);

  return (
    <div className="h-full overflow-hidden flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-sm text-[#8a7668]">Discovery</p>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-[#24170f] tracking-tight flex items-center gap-3"><PackageSearch className="w-8 h-8 text-[#ff690c]" />Product Finder</h1>
            <p className="mt-2 text-[#6f5a4d] max-w-2xl">Paste Shopify stores, pull their real /products.json catalogs, compare products, discounts, stock and launch dates. No generated data.</p>
          </div>
          {products.length > 0 && (
            <button onClick={() => downloadCsv(filteredProducts)} className="inline-flex items-center gap-2 rounded-xl bg-[#24170f] px-4 py-2 text-sm font-black text-[#fffaf6] hover:bg-[#3a281d]">
              <Download className="w-4 h-4" />Export CSV
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5 min-h-0 flex-1">
        <section className="xl:col-span-2 bg-white rounded-2xl border border-[#f1ded1] shadow-[0_10px_30px_-24px_rgba(53,37,28,0.45)] p-5 flex flex-col min-h-0">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-[#ff690c]" />
            <h2 className="font-black text-[#24170f] uppercase tracking-[0.12em] text-sm">Stores input</h2>
          </div>
          <textarea
            value={stores}
            onChange={(event) => setStores(event.target.value)}
            placeholder="one domain per line:&#10;bleame.com&#10;tryestrid.com"
            className="min-h-[220px] flex-1 resize-none rounded-2xl border border-[#f1ded1] bg-[#fffaf6] p-4 text-sm font-medium text-[#24170f] outline-none focus:border-[#ff690c]"
          />
          <button onClick={runFinder} disabled={loading} className="mt-4 rounded-xl bg-[#ff690c] px-4 py-3 text-sm font-black text-white shadow-[0_8px_18px_rgba(255,105,12,0.22)] hover:bg-[#e85f0a] disabled:opacity-60">
            {loading ? "Scraping catalogs..." : "Find products"}
          </button>
          {error && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-600">{error}</p>}
          {errors.length > 0 && <div className="mt-3 space-y-1 text-xs text-[#8a7668]">{errors.slice(0, 4).map((item) => <p key={item.store}>{item.store}: {item.error}</p>)}</div>}
        </section>

        <section className="xl:col-span-3 flex flex-col gap-5 min-h-0">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 flex-shrink-0">
            <div className="rounded-2xl border border-[#f1ded1] bg-white p-4"><p className="text-[10px] uppercase tracking-[0.14em] font-black text-[#a99485]">Products</p><p className="mt-2 text-2xl font-black text-[#24170f]">{products.length}</p></div>
            <div className="rounded-2xl border border-[#f1ded1] bg-white p-4"><p className="text-[10px] uppercase tracking-[0.14em] font-black text-[#a99485]">Stores</p><p className="mt-2 text-2xl font-black text-[#24170f]">{stats.storesCount}</p></div>
            <div className="rounded-2xl border border-[#f1ded1] bg-white p-4"><p className="text-[10px] uppercase tracking-[0.14em] font-black text-[#a99485]">Discounted</p><p className="mt-2 text-2xl font-black text-[#24170f]">{stats.discounted}</p></div>
            <div className="rounded-2xl border border-[#f1ded1] bg-white p-4"><p className="text-[10px] uppercase tracking-[0.14em] font-black text-[#a99485]">In stock</p><p className="mt-2 text-2xl font-black text-[#24170f]">{stats.inStock}</p></div>
            <div className="rounded-2xl border border-[#f1ded1] bg-white p-4"><p className="text-[10px] uppercase tracking-[0.14em] font-black text-[#a99485]">Range</p><p className="mt-2 text-lg font-black text-[#24170f] truncate">{formatMoney(stats.min)}–{formatMoney(stats.max)}</p></div>
          </div>

          <div className="bg-white rounded-2xl border border-[#f1ded1] shadow-[0_10px_30px_-24px_rgba(53,37,28,0.45)] min-h-0 flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-[#f1ded1] flex flex-wrap items-center gap-3 flex-shrink-0">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a99485]" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search product, store, vendor..." className="w-full rounded-xl border border-[#f1ded1] bg-[#fffaf6] py-2 pl-9 pr-3 text-sm outline-none focus:border-[#ff690c]" />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-[#a99485]" />
                <select value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)} className="rounded-xl border border-[#f1ded1] bg-[#fffaf6] px-3 py-2 text-sm font-bold text-[#5b4638] outline-none">
                  <option value="all">All</option>
                  <option value="discounted">Discounted</option>
                  <option value="in-stock">In stock</option>
                  <option value="out-of-stock">Out of stock</option>
                  <option value="newest">Newest</option>
                </select>
                <select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} className="rounded-xl border border-[#f1ded1] bg-[#fffaf6] px-3 py-2 text-sm font-bold text-[#5b4638] outline-none">
                  <option value="discount">Top discount</option>
                  <option value="price-desc">Price high</option>
                  <option value="price-asc">Price low</option>
                  <option value="newest">Newest</option>
                </select>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
              {filteredProducts.length === 0 ? (
                <div className="h-full flex items-center justify-center p-10 text-center text-[#8a7668]">
                  {products.length ? "No products match the current filters." : "Run Product Finder to load real Shopify catalog data."}
                </div>
              ) : (
                <div className="divide-y divide-[#f1ded1] min-w-[720px]">
                  {filteredProducts.slice(0, 120).map((item, index) => (
                    <a key={`${item.store}-${item.handle || item.title}-${index}`} href={item.url} target="_blank" rel="noreferrer" className="grid grid-cols-[minmax(0,1.5fr)_110px_90px_90px] gap-3 p-4 hover:bg-[#fffaf6] transition-colors">
                      <div className="min-w-0 flex items-center gap-3">
                        {item.image ? <img src={item.image} alt="" className="h-12 w-12 rounded-xl object-cover border border-[#f1ded1] bg-[#fffaf6] flex-shrink-0" /> : <div className="h-12 w-12 rounded-xl border border-[#f1ded1] bg-[#fffaf6] flex-shrink-0" />}
                        <div className="min-w-0">
                          <p className="font-black text-[#24170f] truncate">{item.title || "Untitled product"}</p>
                          <p className="text-xs font-bold text-[#8a7668] truncate">{item.store} · {item.vendor || item.productType || "Shopify"}</p>
                        </div>
                      </div>
                      <div className="self-center font-black text-[#24170f] truncate">{formatMoney(productPrice(item))}</div>
                      <div className="self-center text-sm font-black text-[#ff690c]">{item.discountPercent ? `-${item.discountPercent}%` : "—"}</div>
                      <div className="self-center flex items-center justify-between gap-2 text-xs font-black text-[#8a7668]">
                        <span className={item.available === true ? "text-[#ff690c]" : ""}>{item.available === false ? "Out" : item.available === true ? "In" : "—"}</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
