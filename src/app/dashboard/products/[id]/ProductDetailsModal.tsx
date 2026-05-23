"use client";

import { useEffect, useState } from "react";
import { X, ExternalLink, Bell, Settings2, LineChart, Package, Tag, Hash, Star, AlignLeft } from "lucide-react";
import PriceChart from "./PriceChart";

export function ProductDetailsModal({ productId, onClose }: { productId: string, onClose: () => void }) {
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/products/${productId}`)
      .then(res => res.json())
      .then(data => {
        setProduct(data);
        setLoading(false);
      });

    const handleEscape = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [productId, onClose]);

  return (
    <div className="fixed inset-0 z-[90] flex flex-col items-center justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200" onClick={onClose} />

      {/* Top Hover Zone */}
      <div 
        className="peer group absolute top-0 inset-x-0 h-16 sm:h-20 z-10 flex items-start pt-4 justify-center cursor-pointer"
        onClick={onClose}
      >
        <div className="text-white/90 text-sm font-medium tracking-wide opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/20 px-4 py-1.5 rounded-full backdrop-blur-md">
          esc to close
        </div>
      </div>

      {/* Modal */}
      <div 
        className="bg-[#fffaf6] w-[100vw] sm:w-[calc(100vw-32px)] h-[calc(100vh-24px)] sm:h-[calc(100vh-48px)] rounded-t-[24px] sm:rounded-t-[32px] shadow-[0_-10px_50px_rgba(0,0,0,0.2)] overflow-hidden flex flex-col z-20 animate-in slide-in-from-bottom duration-200 ease-out transition-transform peer-hover:translate-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin w-8 h-8 border-4 border-[#ff690c] border-t-transparent rounded-full"></div>
          </div>
        ) : !product || product.error ? (
          <div className="flex-1 flex flex-col items-center justify-center text-[#8a7668]">
            <p className="text-xl font-bold text-[#24170f] mb-2">Error</p>
            <p>Could not load product details.</p>
            <button onClick={onClose} className="mt-4 px-6 py-2 bg-[#ff690c] text-white rounded-lg">Close</button>
          </div>
        ) : (
          <>
            <div className="px-8 py-5 border-b border-[#f1ded1] flex justify-between items-center bg-white sticky top-0 z-10">
              <div className="flex items-center gap-4">
                {product.image ? (
                  <img src={product.image} alt={product.title} className="w-12 h-12 rounded-lg object-cover border border-[#f1ded1]" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-[#fffaf6] border border-[#f1ded1] flex items-center justify-center">
                    <Package className="w-5 h-5 text-[#8a7668]" />
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-bold text-[#24170f] leading-tight truncate max-w-lg">{product.title || "Product Details"}</h2>
                  <a href={product.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[#ff690c] hover:underline text-sm mt-0.5">
                    <ExternalLink className="w-3.5 h-3.5" />
                    Visit Source
                  </a>
                </div>
              </div>
            </div>

            <div className="p-8 overflow-auto flex-1 bg-[#fffaf6]">
              <div className="max-w-5xl mx-auto space-y-8">
                
                {/* Top Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-white p-6 rounded-2xl border border-[#f1ded1] shadow-sm flex flex-col justify-center">
                    <p className="text-sm font-medium text-[#8a7668] mb-1">Current Price</p>
                    <p className="text-4xl font-bold text-[#24170f]">
                      {product.currentPrice ? `${product.currentPrice} ${product.currency || '€'}` : "—"}
                    </p>
                  </div>
                  
                  <div className="bg-white p-6 rounded-2xl border border-[#f1ded1] shadow-sm flex flex-col justify-center">
                    <p className="text-sm font-medium text-[#8a7668] mb-1">Stock Status</p>
                    <div>
                      {product.stockStatus ? (
                        <span className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${product.stockStatus === 'In Stock' ? 'bg-[#f2f8ec] text-[#4f761d]' : 'bg-red-100 text-red-700'}`}>
                          {product.stockStatus}
                        </span>
                      ) : (
                        <span className="text-[#a99485]">Unknown</span>
                      )}
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-[#f1ded1] shadow-sm flex flex-col justify-center">
                    <p className="text-sm font-medium text-[#8a7668] mb-1">Brand</p>
                    <div className="flex items-center gap-2">
                      <Tag className="w-5 h-5 text-[#ff690c]" />
                      <span className="font-semibold text-[#24170f] text-lg">{product.brand || "Unknown"}</span>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-[#f1ded1] shadow-sm flex flex-col justify-center">
                    <p className="text-sm font-medium text-[#8a7668] mb-1">SKU / MPN</p>
                    <div className="flex items-center gap-2">
                      <Hash className="w-5 h-5 text-[#8a7668]" />
                      <span className="font-medium text-[#5b4638] truncate">{product.sku || "N/A"}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Left Column: Charts and Details */}
                  <div className="lg:col-span-2 space-y-8">
                    {/* Chart */}
                    <div className="bg-white p-6 rounded-2xl border border-[#f1ded1] shadow-sm">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-[#24170f] flex items-center gap-2">
                          <LineChart className="w-5 h-5 text-[#ff690c]" />
                          Price History
                        </h3>
                      </div>
                      {product.priceHistory?.length > 0 ? (
                        <PriceChart data={product.priceHistory} />
                      ) : (
                        <div className="h-64 flex items-center justify-center text-[#8a7668] bg-[#fffaf6] rounded-xl border border-[#f6e8de] border-dashed">
                          Not enough data to display chart.
                        </div>
                      )}
                    </div>

                    {/* Description */}
                    <div className="bg-white p-6 rounded-2xl border border-[#f1ded1] shadow-sm">
                      <h3 className="text-lg font-semibold text-[#24170f] flex items-center gap-2 mb-4">
                        <AlignLeft className="w-5 h-5 text-[#ff690c]" />
                        Description
                      </h3>
                      <p className="text-[#5b4638] text-sm leading-relaxed whitespace-pre-wrap">
                        {product.description || "No description available for this product."}
                      </p>
                    </div>
                  </div>

                  {/* Right Column: Bundles & Reviews */}
                  <div className="space-y-8">
                    {/* Reviews */}
                    <div className="bg-white p-6 rounded-2xl border border-[#f1ded1] shadow-sm">
                      <h3 className="text-lg font-semibold text-[#24170f] flex items-center gap-2 mb-4">
                        <Star className="w-5 h-5 text-[#ff690c]" />
                        Customer Reviews
                      </h3>
                      {product.rating ? (
                        <div className="flex items-center gap-4">
                          <div className="text-3xl font-bold text-[#ff690c]">{product.rating}</div>
                          <div>
                            <div className="flex items-center gap-1 text-yellow-400">
                              <Star className="w-4 h-4 fill-current" />
                              <Star className="w-4 h-4 fill-current" />
                              <Star className="w-4 h-4 fill-current" />
                              <Star className="w-4 h-4 fill-current" />
                              <Star className="w-4 h-4" />
                            </div>
                            <p className="text-sm text-[#8a7668] mt-1">{product.reviewsCount} reviews</p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-[#8a7668]">No ratings found.</p>
                      )}
                    </div>

                    {/* Bundle Prices */}
                    {product.bundlePrices && product.bundlePrices.length > 0 && (
                      <div className="bg-white p-6 rounded-2xl border border-[#f1ded1] shadow-sm">
                        <h3 className="text-lg font-semibold text-[#24170f] mb-4">Variants & Bundles</h3>
                        <div className="space-y-3">
                          {product.bundlePrices.map((bundle: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-[#fffaf6] rounded-xl border border-[#f1ded1]">
                              <span className="font-medium text-[#5b4638] text-sm truncate pr-4">{bundle.name}</span>
                              <span className="font-bold text-[#24170f] whitespace-nowrap">{bundle.price} {product.currency || '€'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Scraping Jobs */}
                    <div className="bg-white rounded-2xl border border-[#f1ded1] shadow-sm overflow-hidden">
                      <div className="px-6 py-4 border-b border-[#f1ded1]">
                        <h3 className="text-base font-semibold text-[#35251c]">Recent Checks</h3>
                      </div>
                      <div className="divide-y divide-[#f6e8de]">
                        {product.scrapingJobs?.map((job: any) => (
                          <div key={job.id} className="px-6 py-3 flex items-center justify-between bg-white hover:bg-[#fffaf6]">
                            <p className="text-xs font-medium text-[#24170f]">
                              {new Date(job.createdAt).toLocaleDateString()} {new Date(job.createdAt).toLocaleTimeString()}
                            </p>
                            <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${job.status === 'SUCCESS' ? 'bg-[#f2f8ec] text-[#4f761d]' : 'bg-red-50 text-red-700'}`}>
                              {job.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}