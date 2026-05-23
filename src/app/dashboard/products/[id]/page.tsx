import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ArrowLeft, ExternalLink, Bell, Settings2 } from "lucide-react";
import Link from "next/link";
import PriceChart from "./PriceChart";

export default async function ProductDetails({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const product = await prisma.product.findUnique({
    where: { id: params.id, userId: session.user.id },
    include: {
      priceHistory: { orderBy: { createdAt: 'asc' } },
      alertSetting: true,
      scrapingJobs: { orderBy: { createdAt: 'desc' }, take: 5 }
    }
  });

  if (!product) redirect("/dashboard/products");

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <Link href="/dashboard/products" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Products
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">{product.title || "Product details pending"}</h1>
            <a href={product.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-indigo-600 hover:underline text-sm break-all">
              <ExternalLink className="w-4 h-4 flex-shrink-0" />
              {product.url}
            </a>
          </div>
          <div className="flex gap-3">
            <Link href={`/dashboard/products/${product.id}/settings`} className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">
              <Settings2 className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500 mb-1">Current Price</p>
          <p className="text-3xl font-bold text-slate-900">{product.currentPrice ? `$${product.currentPrice}` : "N/A"}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500 mb-1">Stock Status</p>
          <div className="mt-2">
            {product.stockStatus ? (
               <span className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${product.stockStatus === 'In Stock' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                 {product.stockStatus}
               </span>
            ) : (
               <span className="text-slate-400">Unknown</span>
            )}
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500 mb-1">Alerts</p>
          <div className="flex items-center gap-2 mt-2">
            <Bell className={`w-5 h-5 ${product.alertSetting?.emailEnabled ? 'text-indigo-600' : 'text-slate-300'}`} />
            <span className="font-medium text-slate-700">
              {product.alertSetting?.emailEnabled ? "Active" : "Disabled"}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-6">Price History</h2>
        {product.priceHistory.length > 0 ? (
          <PriceChart data={product.priceHistory} />
        ) : (
          <div className="h-64 flex items-center justify-center text-slate-500 bg-slate-50 rounded-xl border border-slate-100 border-dashed">
            Not enough data to display chart.
          </div>
        )}
      </div>
      
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">Recent Checks</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {product.scrapingJobs.map((job: any) => (
            <div key={job.id} className="px-6 py-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-900">{new Date(job.createdAt).toLocaleString()}</p>
                {job.errorMessage && <p className="text-sm text-red-500 mt-1">{job.errorMessage}</p>}
              </div>
              <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${job.status === 'SUCCESS' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                {job.status}
              </span>
            </div>
          ))}
          {product.scrapingJobs.length === 0 && (
            <div className="px-6 py-8 text-center text-slate-500">No checks performed yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
