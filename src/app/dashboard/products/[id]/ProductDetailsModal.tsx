"use client";

import { useEffect, useState } from "react";
import { ExternalLink, LineChart, Package, Tag, Hash, Star, AlignLeft, Lock, TrendingUp } from "lucide-react";
import PriceChart from "./PriceChart";

type BrandMetricPoint = {
  createdAt?: string | number | Date;
  price?: number;
  [key: string]: unknown;
};

type BrandMetrics = {
  niche?: string;
  target_persona?: string;
  monthly_visits_history?: BrandMetricPoint[];
  technologies?: string[];
  [key: string]: unknown;
};

type BundlePrice = {
  name: string;
  price: number | string;
};

type ScrapingJob = {
  id: string;
  createdAt: string;
  status: string;
};

type ProductDetails = {
  title?: string | null;
  url: string;
  image?: string | null;
  currentPrice?: number | null;
  currency?: string | null;
  stockStatus?: string | null;
  brandMetrics?: BrandMetrics | null;
  description?: string | null;
  brand?: string | null;
  sku?: string | null;
  rating?: number | null;
  reviewsCount?: number | null;
  bundlePrices?: BundlePrice[] | null;
  scrapingJobs?: ScrapingJob[];
  error?: string;
};

export function ProductDetailsModal({ productId, onClose }: { productId: string, onClose: () => void }) {
  const [product, setProduct] = useState<ProductDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Overview");

  useEffect(() => {
    fetch(`/api/products/${productId}`)
      .then(res => res.json())
      .then((data: ProductDetails) => {
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
        className="bg-[#fffaf6] w-[100vw] sm:w-[calc(100vw-32px)] h-[calc(100vh-12px)] sm:h-[calc(100vh-28px)] rounded-t-[24px] sm:rounded-t-[32px] shadow-[0_-10px_50px_rgba(0,0,0,0.2)] overflow-hidden flex flex-col z-20 animate-in slide-in-from-bottom duration-200 ease-out transition-transform peer-hover:translate-y-4"
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
            <div className="bg-white px-5 py-4 sm:px-8 sm:py-5 flex flex-col justify-end relative overflow-hidden flex-shrink-0 border-b border-[#f1ded1]">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <Package className="w-64 h-64 text-[#ff690c]" />
              </div>
              <div className="relative z-10 flex items-center gap-4 sm:gap-6">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#fffaf6] border border-[#f1ded1] flex items-center justify-center p-2">
                  {product.image ? (
                    <img src={product.image} alt={product.title || "Product"} className="w-full h-full object-contain rounded-xl" />
                  ) : (
                    <Package className="w-8 h-8 text-[#ff690c]" />
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="text-xl sm:text-3xl font-black text-[#24170f] tracking-tight leading-tight max-w-2xl truncate">{product.title || "Product Details"}</h2>
                  <a href={product.url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-[#8a7668] hover:text-[#ff690c] transition-colors text-sm font-medium mt-2 w-max bg-[#fffaf6] border border-[#f1ded1] px-3 py-1 rounded-full">
                    <ExternalLink className="w-4 h-4" />
                    Visit Source Website
                  </a>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="bg-[#fffaf6] px-5 sm:px-8 flex gap-4 sm:gap-8 border-b border-[#f1ded1] flex-shrink-0">
              {['Overview', 'Variants', 'Competitors', 'Activity'].map((tab) => (
                <button 
                  key={tab} 
                  onClick={() => setActiveTab(tab)}
                  className={`py-3 sm:py-4 text-xs sm:text-sm font-bold border-b-2 transition-colors ${activeTab === tab ? 'border-[#ff690c] text-[#ff690c]' : 'border-transparent text-[#8a7668] hover:text-[#24170f]'}`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="p-4 sm:p-6 flex-1 bg-[#fffaf6] text-[#24170f] overflow-hidden flex flex-col">
              <div className="w-full h-full flex flex-col">
                
                {activeTab === 'Overview' && (
                  <div className="flex-1 flex flex-col gap-4 sm:gap-5 overflow-hidden">
                    {/* Top Row: 3 Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 flex-shrink-0">
                      <div className="bg-white p-4 rounded-2xl border border-[#f1ded1] shadow-sm flex flex-col justify-between">
                        <p className="text-xs font-bold text-[#8a7668] uppercase tracking-wider mb-2">Current Price</p>
                        <div className="flex items-end gap-2">
                          <p className="text-3xl font-black text-[#24170f]">
                            {product.currentPrice ? `${product.currentPrice}` : "—"}
                          </p>
                          <p className="text-xl font-bold text-[#ff690c] mb-1">{product.currency || '€'}</p>
                        </div>
                      </div>
                      
                      <div className="bg-white p-4 rounded-2xl border border-[#f1ded1] shadow-sm flex flex-col justify-between">
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

                      <div className="bg-white p-4 rounded-2xl border border-[#f1ded1] shadow-sm flex flex-col justify-between relative overflow-hidden">
                        <div className="flex justify-between items-start mb-2">
                          <p className="text-xs font-bold text-[#8a7668] uppercase tracking-wider">Niche / Category</p>
                        </div>
                        <p className="text-2xl font-black text-[#24170f] truncate">
                          {product.brandMetrics?.niche || "—"}
                        </p>
                        <p className="text-xs text-[#a99485] mt-2 truncate">Targeting: {product.brandMetrics?.target_persona || "Unknown"}</p>
                      </div>
                    </div>

                    {/* Main Content Row: Chart (Left) + Description/Info (Right) */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 flex-1 min-h-0 overflow-hidden">
                      {/* Left: Chart */}
                      <div className="lg:col-span-2 bg-white rounded-2xl border border-[#f1ded1] shadow-sm h-full flex flex-col p-4 sm:p-5">
                        <div className="flex items-center justify-between mb-4 flex-shrink-0">
                          <div className="flex items-center gap-3">
                            <TrendingUp className="w-5 h-5 text-[#ff690c]" />
                            <h3 className="text-sm font-bold text-[#24170f] uppercase tracking-wider">Visit History</h3>
                          </div>
                        </div>
                        <div className="bg-[#fffaf6] rounded-xl border border-[#f1ded1] p-3 sm:p-4 flex-1 flex flex-col overflow-hidden min-h-[220px]">
                          {product.brandMetrics?.monthly_visits_history ? (
                            <PriceChart data={product.brandMetrics.monthly_visits_history} />
                          ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-[#8a7668] border border-[#f1ded1] border-dashed rounded-lg">
                              <LineChart className="w-8 h-8 mb-2 opacity-50" />
                              <span className="font-medium">Waiting for enough data points...</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Description & Info */}
                      <div className="lg:col-span-1 h-full flex flex-col gap-4 sm:gap-5 overflow-hidden">
                        {/* Description */}
                        <div className="bg-white rounded-2xl border border-[#f1ded1] shadow-sm flex-1 flex flex-col p-4 sm:p-5 overflow-hidden">
                          <h3 className="text-sm font-bold text-[#24170f] uppercase tracking-wider flex items-center gap-3 mb-3 flex-shrink-0">
                            <AlignLeft className="w-5 h-5 text-[#ff690c]" />
                            Description
                          </h3>
                          <p className="text-[#5b4638] text-sm leading-relaxed p-4 bg-[#fffaf6] rounded-xl border border-[#f1ded1] flex-1 overflow-hidden line-clamp-[8]">
                            {product.description || "No description available for this product."}
                          </p>
                        </div>

                        {/* Product Info */}
                        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#f1ded1] shadow-sm flex-shrink-0">
                          <h3 className="text-sm font-bold text-[#24170f] uppercase tracking-wider mb-4">Product Info</h3>
                          <div className="space-y-3">
                            <div className="flex justify-between items-center pb-2 border-b border-[#f1ded1]">
                              <span className="text-[#8a7668] text-sm font-medium flex items-center gap-2"><Tag className="w-4 h-4" /> Brand</span>
                              <span className="font-bold text-[#24170f]">{product.brand || "N/A"}</span>
                            </div>
                            <div className="flex justify-between items-center pb-2 border-b border-[#f1ded1]">
                              <span className="text-[#8a7668] text-sm font-medium flex items-center gap-2"><Hash className="w-4 h-4" /> SKU</span>
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
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'Variants' && (
                  <div className="bg-white p-5 rounded-2xl border border-[#f1ded1] shadow-sm h-full overflow-hidden">
                    <h3 className="text-sm font-bold text-[#24170f] uppercase tracking-wider mb-6">Variants & Bundles</h3>
                    {product.bundlePrices && product.bundlePrices.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {product.bundlePrices.map((bundle: BundlePrice, idx: number) => (
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
                      <div className="bg-white p-5 rounded-2xl border border-[#f1ded1] shadow-sm h-full overflow-hidden">
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

                      <div className="bg-white p-5 rounded-2xl border border-[#f1ded1] shadow-sm flex flex-col justify-between relative overflow-hidden group">
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
                      
                      <div className="bg-white p-5 rounded-2xl border border-[#f1ded1] shadow-sm flex flex-col justify-between relative overflow-hidden group">
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
                  <div className="bg-white p-5 rounded-2xl border border-[#f1ded1] shadow-sm h-full overflow-hidden">
                    <h3 className="text-sm font-bold text-[#24170f] uppercase tracking-wider mb-6">Scraping History</h3>
                    <div className="space-y-3 pr-1">
                       {(product.scrapingJobs?.length || 0) > 0 ? product.scrapingJobs!.map((job: ScrapingJob) => (
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