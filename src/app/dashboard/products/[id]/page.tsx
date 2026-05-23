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
        <Link href="/dashboard/products" className="inline-flex items-center gap-2 text-sm text-[#8a7668] hover:text-[#24170f] mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Products
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-[#24170f] mb-2">{product.title || "Product details pending"}</h1>
            <a href={product.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[#ff690c] hover:underline text-sm break-all">
              <ExternalLink className="w-4 h-4 flex-shrink-0" />
              {product.url}
            </a>
          </div>
          <div className="flex gap-3">
            <Link href={`/dashboard/products/${product.id}/settings`} className="p-2 border border-[#f1ded1] rounded-lg text-[#6f5a4d] hover:bg-[#fffaf6]">
              <Settings2 className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-[#f1ded1] shadow-[0_10px_30px_-24px_rgba(53,37,28,0.45)]">
          <p className="text-sm font-medium text-[#8a7668] mb-1">Current Price</p>
          <p className="text-3xl font-bold text-[#24170f]">{product.currentPrice ? `$${product.currentPrice}` : "N/A"}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-[#f1ded1] shadow-[0_10px_30px_-24px_rgba(53,37,28,0.45)]">
          <p className="text-sm font-medium text-[#8a7668] mb-1">Stock Status</p>
          <div className="mt-2">
            {product.stockStatus ? (
               <span className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${product.stockStatus === 'In Stock' ? 'bg-[#f2f8ec] text-[#4f761d]' : 'bg-red-100 text-red-700'}`}>
                 {product.stockStatus}
               </span>
            ) : (
               <span className="text-[#a99485]">Unknown</span>
            )}
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-[#f1ded1] shadow-[0_10px_30px_-24px_rgba(53,37,28,0.45)]">
          <p className="text-sm font-medium text-[#8a7668] mb-1">Alerts</p>
          <div className="flex items-center gap-2 mt-2">
            <Bell className={`w-5 h-5 ${product.alertSetting?.emailEnabled ? 'text-[#ff690c]' : 'text-slate-300'}`} />
            <span className="font-medium text-[#5b4638]">
              {product.alertSetting?.emailEnabled ? "Active" : "Disabled"}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-[#f1ded1] shadow-[0_10px_30px_-24px_rgba(53,37,28,0.45)]">
        <h2 className="text-lg font-semibold text-[#24170f] mb-6">Price History</h2>
        {product.priceHistory.length > 0 ? (
          <PriceChart data={product.priceHistory} />
        ) : (
          <div className="h-64 flex items-center justify-center text-[#8a7668] bg-[#fffaf6] rounded-xl border border-[#f6e8de] border-dashed">
            Not enough data to display chart.
          </div>
        )}
      </div>
      
      <div className="bg-white rounded-2xl border border-[#f1ded1] shadow-[0_10px_30px_-24px_rgba(53,37,28,0.45)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#f1ded1]">
          <h2 className="text-lg font-semibold text-[#35251c]">Recent Checks</h2>
        </div>
        <div className="divide-y divide-[#f6e8de]">
          {product.scrapingJobs.map((job: any) => (
            <div key={job.id} className="px-6 py-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-[#24170f]">{new Date(job.createdAt).toLocaleString()}</p>
                {job.errorMessage && <p className="text-sm text-red-500 mt-1">{job.errorMessage}</p>}
              </div>
              <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${job.status === 'SUCCESS' ? 'bg-[#f2f8ec] text-[#4f761d]' : 'bg-red-50 text-red-700'}`}>
                {job.status}
              </span>
            </div>
          ))}
          {product.scrapingJobs.length === 0 && (
            <div className="px-6 py-8 text-center text-[#8a7668]">No checks performed yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
