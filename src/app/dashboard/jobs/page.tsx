import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";

export default async function ScrapeJobsPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  const userId = (session.user as any).id;

  const jobs = await prisma.scrapingJob.findMany({
    where: { product: { userId } },
    orderBy: { createdAt: "desc" },
    include: { product: true },
    take: 50
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Scrape Jobs Log</h1>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="divide-y divide-slate-100">
          {jobs.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No jobs recorded yet.</div>
          ) : (
            jobs.map((job) => (
              <div key={job.id} className="p-6 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-medium text-slate-900">{job.product.url}</span>
                  </div>
                  <p className="text-sm text-slate-500">
                    {new Date(job.createdAt).toLocaleString()}
                  </p>
                  {job.errorMessage && (
                    <div className="mt-3 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100 font-mono">
                      {job.errorMessage}
                    </div>
                  )}
                </div>
                <div className="flex-shrink-0 ml-4">
                  {job.status === "SUCCESS" && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="w-4 h-4" /> Success
                    </span>
                  )}
                  {job.status === "FAILED" && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                      <AlertTriangle className="w-4 h-4" /> Failed
                    </span>
                  )}
                  {job.status === "PENDING" && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                      <Clock className="w-4 h-4" /> Pending
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
