"use client";

import { useEffect, useState } from "react";
import { X, ExternalLink, Bell, Settings2, LineChart, Package, Tag, Hash, Star, AlignLeft, Lock, ArrowUpRight, Activity, TrendingUp, Users } from "lucide-react";
import PriceChart from "./PriceChart";

export function ProductDetailsModal({ productId, onClose }: { productId: string, onClose: () => void }) {
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Overview");

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
            {/* Header Area */}
            <div className="bg-white p-8 flex flex-col justify-end relative overflow-hidden flex-shrink-0 border-b border-[#f1ded1]">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <Package className="w-64 h-64 text-[#ff690c]" />
              </div>
              <div className="relative z-10 flex items-center gap-6">
                <div className="w-20 h-20 rounded-2xl bg-[#fffaf6] border border-[#f1ded1] flex items-center justify-center p-2">
                  {product.image ? (
                    <img src={product.image} alt={product.title} className="w-full h-full object-contain rounded-xl" />
                  ) : (
                    <Package className="w-8 h-8 text-[#ff690c]" />
                  )}
                </div>
                <div>
                  <h2 className="text-3xl font-black text-[#24170f] tracking-tight leading-tight max-w-2xl truncate">{product.title || "Product Details"}</h2>
                  <a href={product.url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-[#8a7668] hover:text-[#ff690c] transition-colors text-sm font-medium mt-2 w-max bg-[#fffaf6] border border-[#f1ded1] px-3 py-1 rounded-full">
                    <ExternalLink className="w-4 h-4" />
                    Visit Source Website
                  </a>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="bg-[#fffaf6] px-8 flex gap-8 border-b border-[#f1ded1] flex-shrink-0">
              {['Overview', 'Variants', 'Competitors', 'Activity'].map((tab) => (
                <button 
                  key={tab} 
                  onClick={() => setActiveTab(tab)}
                  className={`py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === tab ? 'border-[#ff690c] text-[#ff690c]' : 'border-transparent text-[#8a7668] hover:text-[#24170f]'}`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="p-8 overflow-auto flex-1 bg-[#fffaf6] text-[#24170f]">
              <div className="max-w-7xl mx-auto">
                
                {activeTab === 'Overview' && (
                  <div className="space-y-6">
                    {/* Top Metrics Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="bg-white p-5 rounded-2xl border border-[#f1ded1] shadow-sm flex flex-col justify-between">
                        <p className="text-xs font-bold text-[#8a7668] uppercase tracking-wider mb-2">Current Price</p>
                        <div className="flex items-end gap-2">
                          <p className="text-4xl font-black text-[#24170f]">
                            {product.currentPrice ? `${product.currentPrice}` : "—"}
                          </p>
                          <p className="text-xl font-bold text-[#ff690c] mb-1">{product.currency || '€'}</p>
                        </div>
                      </div>
                      
                      <div className="bg-white p-5 rounded-2xl border border-[#f1ded1] shadow-sm flex flex-col justify-between">
                        <p className="text-xs font-bold text-[#8a7668] uppercase tracking-wider mb-2">Stock Status</p>
                        <div>
                          {product.stockStatus ? (
                            <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold ${product.stockStatus === 'In Stock' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                              <div className={`w-2 h-2 rounded-full ${product.stockStatus === 'In Stock' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                              {product.stockStatus}
                            </span>
                          ) : (
                            <span className="text-[#a99485] font-medium">Unknown</span>
                          )}
                        </div>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border border-[#f1ded1] shadow-sm flex flex-col justify-between relative overflow-hidden">
                        <div className="flex justify-between items-start mb-2">
                          <p className="text-xs font-bold text-[#8a7668] uppercase tracking-wider">Est. Monthly Visits</p>
                        </div>
                        <p className="text-3xl font-black text-[#24170f]">
                          {product.brandMetrics?.monthly_visits ? new Intl.NumberFormat('en-US').format(product.brandMetrics.monthly_visits) : "—"}
                        </p>
                        <p className="text-xs text-[#a99485] mt-2 truncate">Source: BrandSearch API</p>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border border-[#f1ded1] shadow-sm flex flex-col justify-between relative overflow-hidden">
                        <div className="flex justify-between items-start mb-2">
                          <p className="text-xs font-bold text-[#8a7668] uppercase tracking-wider">Niche / Category</p>
                        </div>
                        <p className="text-2xl font-black text-[#24170f] truncate">
                          {product.brandMetrics?.niche || "—"}
                        </p>
                        <p className="text-xs text-[#a99485] mt-2 truncate">Targeting: {product.brandMetrics?.target_persona || "Unknown"}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Left Column: Charts */}
                      <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white p-6 rounded-2xl border border-[#f1ded1] shadow-sm">
                          <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                              <TrendingUp className="w-5 h-5 text-[#ff690c]" />
                              <h3 className="text-sm font-bold text-[#24170f] uppercase tracking-wider">Price History</h3>
                            </div>
                          </div>
                          
                          <div className="bg-[#fffaf6] rounded-xl border border-[#f1ded1] p-4">
                            {product.priceHistory?.length > 0 ? (
                              <PriceChart data={product.priceHistory} />
                            ) : (
                              <div className="h-[280px] flex flex-col items-center justify-center text-[#8a7668] border border-[#f1ded1] border-dashed rounded-lg">
                                <LineChart className="w-8 h-8 mb-2 opacity-50" />
                                <span className="font-medium">Waiting for enough data points...</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-[#f1ded1] shadow-sm">
                          <h3 className="text-sm font-bold text-[#24170f] uppercase tracking-wider flex items-center gap-3 mb-4">
                            <AlignLeft className="w-5 h-5 text-[#ff690c]" />
                            Description
                          </h3>
                          <div className="text-[#5b4638] text-sm leading-relaxed whitespace-pre-wrap p-4 bg-[#fffaf6] rounded-xl border border-[#f1ded1]">
                            {product.description || "No description available for this product."}
                          </div>
                        </div>
                      </div>

                      {/* Right Column */}
                      <div className="space-y-6">
                        <div className="bg-white p-6 rounded-2xl border border-[#f1ded1] shadow-sm">
                          <h3 className="text-sm font-bold text-[#24170f] uppercase tracking-wider mb-4">Product Info</h3>
                          <div className="space-y-4">
                            <div className="flex justify-between items-center pb-3 border-b border-[#f1ded1]">
                              <span className="text-[#8a7668] text-sm font-medium flex items-center gap-2"><Tag className="w-4 h-4" /> Brand</span>
                              <span className="font-bold text-[#24170f]">{product.brand || "N/A"}</span>
                            </div>
                            <div className="flex justify-between items-center pb-3 border-b border-[#f1ded1]">
                              <span className="text-[#8a7668] text-sm font-medium flex items-center gap-2"><Hash className="w-4 h-4" /> SKU/MPN</span>
                              <span className="font-bold text-[#24170f] truncate max-w-[150px] text-right">{product.sku || "N/A"}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-[#8a7668] text-sm font-medium flex items-center gap-2"><Star className="w-4 h-4" /> Rating</span>
                              {product.rating ? (
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-[#ff690c]">{product.rating}</span>
                                  <span className="text-xs text-[#8a7668]">({product.reviewsCount})</span>
                                </div>
                              ) : (
                                <span className="text-[#a99485] text-sm font-medium">No rating</span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="bg-[#ff690c]/5 border border-[#ff690c]/20 p-5 rounded-2xl relative overflow-hidden group shadow-sm">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-[#ff690c] rounded-lg">
                              <Users className="w-4 h-4 text-white" />
                            </div>
                            <h3 className="text-sm font-bold text-[#24170f] uppercase tracking-wider">Target Audience</h3>
                          </div>
                          <p className="text-sm text-[#8a7668] mb-4">Discover the exact audience targeting this product in ads.</p>
                          <button className="w-full py-2 bg-[#ff690c] text-white text-sm font-bold rounded-lg hover:bg-[#e55e0b] shadow-[0_0_15px_rgba(255,105,12,0.3)] transition-all">
                            Unlock Analytics
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'Variants' && (
                  <div className="bg-white p-6 rounded-2xl border border-[#f1ded1] shadow-sm">
                    <h3 className="text-sm font-bold text-[#24170f] uppercase tracking-wider mb-6">Variants & Bundles</h3>
                    {product.bundlePrices && product.bundlePrices.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {product.bundlePrices.map((bundle: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between p-4 bg-[#fffaf6] rounded-xl border border-[#f1ded1]">
                            <span className="font-bold text-[#5b4638]">{bundle.name}</span>
                            <span className="font-black text-[#24170f] bg-white px-3 py-1 rounded border border-[#f1ded1] shadow-sm">{bundle.price} {product.currency || '€'}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-12 text-center text-[#8a7668] bg-[#fffaf6] rounded-xl border border-[#f1ded1] border-dashed">
                        No variants or bundles detected for this product.
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'Competitors' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-white p-6 rounded-2xl border border-[#f1ded1] shadow-sm">
                        <h3 className="text-sm font-bold text-[#24170f] uppercase tracking-wider mb-4">Competitor Stack</h3>
                        <p className="text-sm text-[#8a7668] mb-4">Technologies used by this brand.</p>
                        <div className="flex flex-wrap gap-2">
                          {product.brandMetrics?.technologies ? (
                            product.brandMetrics.technologies.slice(0, 10).map((tech: string, i: number) => (
                              <span key={i} className="px-2.5 py-1 bg-[#fffaf6] border border-[#f1ded1] rounded-md text-xs font-semibold text-[#5b4638]">{tech}</span>
                            ))
                          ) : (
                            <span className="text-xs text-[#a99485]">No tech stack data available.</span>
                          )}
                        </div>
                      </div>

                      <div className="bg-white p-6 rounded-2xl border border-[#f1ded1] shadow-sm flex flex-col justify-between relative overflow-hidden group">
                        <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Lock className="w-5 h-5 text-[#ff690c]" />
                          <button className="px-4 py-1.5 bg-[#ff690c] text-white text-xs font-bold rounded-lg shadow-sm">Upgrade to Unlock</button>
                        </div>
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="text-sm font-bold text-[#24170f] uppercase tracking-wider">Competitor Overlap</h3>
                            <Lock className="w-4 h-4 text-[#ff690c]" />
                          </div>
                          <p className="text-sm text-[#8a7668] mb-4">Other stores selling similar products.</p>
                        </div>
                        <p className="text-4xl font-black text-[#24170f]/20 blur-[4px]">14 Stores</p>
                      </div>
                      
                      <div className="bg-white p-6 rounded-2xl border border-[#f1ded1] shadow-sm flex flex-col justify-between relative overflow-hidden group">
                        <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Lock className="w-5 h-5 text-[#ff690c]" />
                          <button className="px-4 py-1.5 bg-[#ff690c] text-white text-xs font-bold rounded-lg shadow-sm">Upgrade to Unlock</button>
                        </div>
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="text-sm font-bold text-[#24170f] uppercase tracking-wider">Est. Revenue</h3>
                            <Lock className="w-4 h-4 text-[#ff690c]" />
                          </div>
                          <p className="text-sm text-[#8a7668] mb-4">Monthly estimated revenue of this store.</p>
                        </div>
                        <p className="text-4xl font-black text-[#24170f]/20 blur-[4px]">45,000 €</p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'Activity' && (
                  <div className="bg-white p-6 rounded-2xl border border-[#f1ded1] shadow-sm">
                    <h3 className="text-sm font-bold text-[#24170f] uppercase tracking-wider mb-6">Scraping History</h3>
                    <div className="space-y-3 max-h-[500px] overflow-auto pr-2 custom-scrollbar">
                      {product.scrapingJobs?.length > 0 ? product.scrapingJobs.map((job: any) => (
                        <div key={job.id} className="px-5 py-4 flex items-center justify-between bg-[#fffaf6] rounded-xl border border-[#f1ded1]">
                          <p className="text-sm font-semibold text-[#5b4638]">
                            {new Date(job.createdAt).toLocaleDateString()} at {new Date(job.createdAt).toLocaleTimeString()}
                          </p>
                          <span className={`inline-flex px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${job.status === 'SUCCESS' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {job.status}
                          </span>
                        </div>
                      )) : (
                        <div className="py-12 text-center text-[#8a7668] bg-[#fffaf6] rounded-xl border border-[#f1ded1] border-dashed">
                          No scraping history yet.
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}