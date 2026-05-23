"use client";

import { useEffect, useState } from "react";
import { X, ExternalLink, Bell, Settings2, LineChart, Package, Tag, Hash, Star, AlignLeft, Lock, ArrowUpRight, Activity, TrendingUp, Users } from "lucide-react";
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
            {/* Header Area with Brand Color */}
            <div className="bg-gradient-to-r from-[#ff690c] to-[#ff8c42] p-8 flex flex-col justify-end relative overflow-hidden flex-shrink-0 border-b border-[#e55e0b]">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <Package className="w-64 h-64" />
              </div>
              <div className="relative z-10 flex items-center gap-6">
                <div className="w-20 h-20 rounded-2xl bg-white shadow-xl flex items-center justify-center p-2">
                  {product.image ? (
                    <img src={product.image} alt={product.title} className="w-full h-full object-contain rounded-xl" />
                  ) : (
                    <Package className="w-8 h-8 text-[#ff690c]" />
                  )}
                </div>
                <div>
                  <h2 className="text-3xl font-black text-white tracking-tight leading-tight max-w-2xl truncate">{product.title || "Product Details"}</h2>
                  <a href={product.url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-white/80 hover:text-white transition-colors text-sm font-medium mt-2 w-max bg-black/10 px-3 py-1 rounded-full backdrop-blur-sm">
                    <ExternalLink className="w-4 h-4" />
                    Visit Source Website
                  </a>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="bg-[#1a1412] px-8 flex gap-8 border-b border-[#2a221f] flex-shrink-0">
              {['Overview', 'Variants', 'Competitors', 'Activity'].map((tab, i) => (
                <button key={tab} className={`py-4 text-sm font-semibold border-b-2 transition-colors ${i === 0 ? 'border-[#ff690c] text-[#ff690c]' : 'border-transparent text-white/50 hover:text-white'}`}>
                  {tab}
                </button>
              ))}
            </div>

            <div className="p-8 overflow-auto flex-1 bg-[#1a1412] text-white">
              <div className="max-w-7xl mx-auto space-y-8">
                
                {/* Top Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-[#221a18] p-5 rounded-2xl border border-[#2a221f] shadow-lg flex flex-col justify-between hover:border-[#ff690c]/50 transition-colors">
                    <p className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Current Price</p>
                    <div className="flex items-end gap-2">
                      <p className="text-4xl font-black text-white">
                        {product.currentPrice ? `${product.currentPrice}` : "—"}
                      </p>
                      <p className="text-xl font-bold text-[#ff690c] mb-1">{product.currency || '€'}</p>
                    </div>
                  </div>
                  
                  <div className="bg-[#221a18] p-5 rounded-2xl border border-[#2a221f] shadow-lg flex flex-col justify-between hover:border-[#ff690c]/50 transition-colors">
                    <p className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Stock Status</p>
                    <div>
                      {product.stockStatus ? (
                        <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold ${product.stockStatus === 'In Stock' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                          <div className={`w-2 h-2 rounded-full ${product.stockStatus === 'In Stock' ? 'bg-green-400' : 'bg-red-400'}`}></div>
                          {product.stockStatus}
                        </span>
                      ) : (
                        <span className="text-white/30 font-medium">Unknown</span>
                      )}
                    </div>
                  </div>

                  {/* Locked Pro Metric 1 */}
                  <div className="bg-[#221a18] p-5 rounded-2xl border border-[#2a221f] shadow-lg flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Lock className="w-5 h-5 text-[#ff690c]" />
                      <button className="px-3 py-1 bg-[#ff690c] text-white text-xs font-bold rounded hover:bg-[#e55e0b]">Upgrade</button>
                    </div>
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-xs font-bold text-white/40 uppercase tracking-wider">Est. Monthly Sales</p>
                      <div className="p-1.5 bg-[#ff690c]/10 rounded-md">
                        <Lock className="w-3.5 h-3.5 text-[#ff690c]" />
                      </div>
                    </div>
                    <p className="text-3xl font-black text-white/20 blur-[4px]">24,500 €</p>
                    <p className="text-xs text-white/30 mt-2">Upgrade to unlock</p>
                  </div>

                  {/* Locked Pro Metric 2 */}
                  <div className="bg-[#221a18] p-5 rounded-2xl border border-[#2a221f] shadow-lg flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Lock className="w-5 h-5 text-[#ff690c]" />
                      <button className="px-3 py-1 bg-[#ff690c] text-white text-xs font-bold rounded hover:bg-[#e55e0b]">Upgrade</button>
                    </div>
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-xs font-bold text-white/40 uppercase tracking-wider">Competitor Overlap</p>
                      <div className="p-1.5 bg-[#ff690c]/10 rounded-md">
                        <Lock className="w-3.5 h-3.5 text-[#ff690c]" />
                      </div>
                    </div>
                    <p className="text-3xl font-black text-white/20 blur-[4px]">14 Stores</p>
                    <p className="text-xs text-white/30 mt-2">Upgrade to unlock</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column: Charts and Details */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Dark Chart */}
                    <div className="bg-[#221a18] p-6 rounded-2xl border border-[#2a221f] shadow-lg">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <TrendingUp className="w-5 h-5 text-[#ff690c]" />
                          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Price History</h3>
                        </div>
                        <div className="flex gap-2">
                          <span className="flex items-center gap-1.5 text-xs font-medium text-white/50"><div className="w-2 h-2 rounded bg-[#ff690c]"></div> Detected Price</span>
                        </div>
                      </div>
                      
                      <div className="bg-[#1a1412] rounded-xl border border-[#2a221f] p-4">
                        {product.priceHistory?.length > 0 ? (
                          <div className="filter invert hue-rotate-180 brightness-150 contrast-125">
                            <PriceChart data={product.priceHistory} />
                          </div>
                        ) : (
                          <div className="h-[280px] flex flex-col items-center justify-center text-white/30 border border-white/5 border-dashed rounded-lg">
                            <LineChart className="w-8 h-8 mb-2 opacity-50" />
                            <span className="font-medium">Waiting for enough data points...</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Description */}
                    <div className="bg-[#221a18] p-6 rounded-2xl border border-[#2a221f] shadow-lg">
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-3 mb-4">
                        <AlignLeft className="w-5 h-5 text-[#ff690c]" />
                        Description
                      </h3>
                      <div className="text-white/60 text-sm leading-relaxed whitespace-pre-wrap p-4 bg-[#1a1412] rounded-xl border border-[#2a221f]">
                        {product.description || "No description available for this product."}
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-6">
                    {/* Details Card */}
                    <div className="bg-[#221a18] p-6 rounded-2xl border border-[#2a221f] shadow-lg">
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Product Info</h3>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center pb-3 border-b border-[#2a221f]">
                          <span className="text-white/50 text-sm font-medium flex items-center gap-2"><Tag className="w-4 h-4" /> Brand</span>
                          <span className="font-bold text-white">{product.brand || "N/A"}</span>
                        </div>
                        <div className="flex justify-between items-center pb-3 border-b border-[#2a221f]">
                          <span className="text-white/50 text-sm font-medium flex items-center gap-2"><Hash className="w-4 h-4" /> SKU/MPN</span>
                          <span className="font-bold text-white">{product.sku || "N/A"}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-white/50 text-sm font-medium flex items-center gap-2"><Star className="w-4 h-4" /> Rating</span>
                          {product.rating ? (
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[#ff690c]">{product.rating}</span>
                              <span className="text-xs text-white/30">({product.reviewsCount})</span>
                            </div>
                          ) : (
                            <span className="text-white/30 text-sm font-medium">No rating</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bundle Prices */}
                    {product.bundlePrices && product.bundlePrices.length > 0 && (
                      <div className="bg-[#221a18] p-6 rounded-2xl border border-[#2a221f] shadow-lg">
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Variants & Bundles</h3>
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                          {product.bundlePrices.map((bundle: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-[#1a1412] rounded-lg border border-[#2a221f] hover:border-[#ff690c]/30 transition-colors">
                              <span className="font-medium text-white/70 text-sm truncate pr-4">{bundle.name}</span>
                              <span className="font-bold text-white whitespace-nowrap">{bundle.price} {product.currency || '€'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Scraping Jobs */}
                    <div className="bg-[#221a18] rounded-2xl border border-[#2a221f] shadow-lg overflow-hidden">
                      <div className="px-6 py-4 border-b border-[#2a221f]">
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Activity Log</h3>
                      </div>
                      <div className="divide-y divide-[#2a221f] max-h-48 overflow-y-auto custom-scrollbar">
                        {product.scrapingJobs?.map((job: any) => (
                          <div key={job.id} className="px-6 py-3 flex items-center justify-between bg-[#221a18] hover:bg-[#1a1412] transition-colors">
                            <p className="text-xs font-medium text-white/50">
                              {new Date(job.createdAt).toLocaleDateString()} {new Date(job.createdAt).toLocaleTimeString()}
                            </p>
                            <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${job.status === 'SUCCESS' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                              {job.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Locked Audience feature */}
                    <div className="bg-[#ff690c]/5 border border-[#ff690c]/20 p-5 rounded-2xl relative overflow-hidden group shadow-lg">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-[#ff690c] rounded-lg">
                          <Users className="w-4 h-4 text-white" />
                        </div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Target Audience</h3>
                      </div>
                      <p className="text-sm text-white/50 mb-4">Discover the exact audience targeting this product in ads.</p>
                      <button className="w-full py-2 bg-[#ff690c] text-white text-sm font-bold rounded-lg hover:bg-[#e55e0b] shadow-[0_0_15px_rgba(255,105,12,0.3)] transition-all">
                        Unlock Analytics
                      </button>
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