"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, ExternalLink, RefreshCw } from "lucide-react";
import Link from "next/link";

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const res = await fetch("/api/products");
    const data = await res.json();
    if (data.products) setProducts(data.products);
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url })
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error);
    } else {
      setUrl("");
      fetchProducts();
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-[#24170f]">Tracked URLs</h1>
      </div>

      <form onSubmit={handleAddProduct} className="flex gap-4">
        <input
          type="url"
          required
          placeholder="https://competitor-store.com/product/..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="flex-1 px-4 py-3 rounded-xl border border-[#e7cdbb] focus:ring-2 focus:ring-[#ff690c] outline-none shadow-[0_10px_30px_-24px_rgba(53,37,28,0.45)]"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 bg-[#ff690c] text-white rounded-xl font-medium hover:bg-[#e55e0b] transition-colors flex items-center gap-2 shadow-[0_10px_30px_-24px_rgba(53,37,28,0.45)] disabled:opacity-70"
        >
          {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
          Add URL
        </button>
      </form>

      {error && <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium">{error}</div>}

      <div className="bg-white rounded-2xl border border-[#f1ded1] shadow-[0_10px_30px_-24px_rgba(53,37,28,0.45)] overflow-hidden">
        <div className="divide-y divide-[#f1ded1]">
          {products.length === 0 ? (
            <div className="p-10 text-center text-[#8a7668]">
              You are not tracking any products yet. Add your first competitor URL above.
            </div>
          ) : (
            products.map((p) => (
              <div key={p.id} className="p-6 flex items-center justify-between hover:bg-[#fffaf6] transition-colors">
                <div className="flex-1 min-w-0 pr-4">
                  <h3 className="font-semibold text-[#24170f] truncate">
                    {p.title || "Pending Extraction..."}
                  </h3>
                  <div className="flex items-center gap-3 mt-1">
                    <a href={p.url} target="_blank" rel="noreferrer" className="text-sm text-[#ff690c] hover:underline flex items-center gap-1 truncate max-w-sm">
                      <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                      {p.url}
                    </a>
                    {p.stockStatus && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.stockStatus === 'In Stock' ? 'bg-[#f2f8ec] text-[#4f761d]' : 'bg-red-100 text-red-700'}`}>
                        {p.stockStatus}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-sm text-[#8a7668]">Current Price</p>
                    <p className="font-bold text-[#24170f] text-lg">
                      {p.currentPrice ? `$${p.currentPrice}` : "—"}
                    </p>
                  </div>
                  <Link href={`/dashboard/products/${p.id}`} className="px-4 py-2 border border-[#f1ded1] rounded-lg text-sm font-medium hover:bg-[#fffaf6] transition-colors">
                    Details
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
