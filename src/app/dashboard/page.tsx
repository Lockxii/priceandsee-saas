import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { Activity, AlertTriangle, Link as LinkIcon, TrendingDown } from "lucide-react";
import Link from "next/link";

export default async function DashboardOverview() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  const userId = (session.user as any).id;

  const productsCount = await prisma.product.count({ where: { userId } });
  const recentJobs = await prisma.scrapingJob.findMany({
    where: { product: { userId } },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { product: true }
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <LinkIcon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Tracked URLs</p>
            <p className="text-2xl font-bold text-slate-900">{productsCount}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <TrendingDown className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Recent Price Drops</p>
            <p className="text-2xl font-bold text-slate-900">0</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Active Alerts</p>
            <p className="text-2xl font-bold text-slate-900">0</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-slate-800">Recent Scrape Jobs</h2>
          <Link href="/dashboard/jobs" className="text-sm text-indigo-600 hover:underline">View all</Link>
        </div>
        <div className="divide-y divide-slate-100">
          {recentJobs.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No scrape jobs yet. Add a product to start monitoring.
            </div>
          ) : (
            recentJobs.map(job => (
              <div key={job.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">{job.product.url}</p>
                  <p className="text-sm text-slate-500">{new Date(job.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  {job.status === 'SUCCESS' ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                      Success
                    </span>
                  ) : job.status === 'FAILED' ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700">
                      <AlertTriangle className="w-3.5 h-3.5" /> Failed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
                      Pending
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
