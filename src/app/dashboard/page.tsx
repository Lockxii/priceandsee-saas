import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Activity, AlertTriangle, Link as LinkIcon, TrendingDown } from "lucide-react";
import Link from "next/link";

export default async function DashboardOverview() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const userId = session.user.id;

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
        <div className="bg-white p-6 rounded-2xl border border-[#f1ded1] shadow-[0_10px_30px_-24px_rgba(53,37,28,0.45)] flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#fff2e8] flex items-center justify-center text-[#ff690c]">
            <LinkIcon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-[#8a7668]">Tracked URLs</p>
            <p className="text-2xl font-bold text-[#24170f]">{productsCount}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-[#f1ded1] shadow-[0_10px_30px_-24px_rgba(53,37,28,0.45)] flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#f2f8ec] flex items-center justify-center text-[#5d8b22]">
            <TrendingDown className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-[#8a7668]">Recent Price Drops</p>
            <p className="text-2xl font-bold text-[#24170f]">0</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-[#f1ded1] shadow-[0_10px_30px_-24px_rgba(53,37,28,0.45)] flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#fff2e8] flex items-center justify-center text-[#ff690c]">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-[#8a7668]">Active Alerts</p>
            <p className="text-2xl font-bold text-[#24170f]">0</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#f1ded1] shadow-[0_10px_30px_-24px_rgba(53,37,28,0.45)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#f1ded1] flex justify-between items-center">
          <h2 className="text-lg font-semibold text-[#35251c]">Recent Scrape Jobs</h2>
          <Link href="/dashboard/jobs" className="text-sm text-[#ff690c] hover:underline">View all</Link>
        </div>
        <div className="divide-y divide-[#f6e8de]">
          {recentJobs.length === 0 ? (
            <div className="p-8 text-center text-[#8a7668]">
              No scrape jobs yet. Add a product to start monitoring.
            </div>
          ) : (
            recentJobs.map((job: any) => (
              <div key={job.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-[#24170f]">{job.product.url}</p>
                  <p className="text-sm text-[#8a7668]">{new Date(job.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  {job.status === 'SUCCESS' ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#f2f8ec] text-[#4f761d]">
                      Success
                    </span>
                  ) : job.status === 'FAILED' ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700">
                      <AlertTriangle className="w-3.5 h-3.5" /> Failed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#fff2e8] text-[#c84f00]">
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
