import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";

export default async function ScrapeJobsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const userId = session.user.id;

  const jobs = await prisma.scrapingJob.findMany({
    where: { product: { userId } },
    orderBy: { createdAt: "desc" },
    include: { product: true },
    take: 50
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-[#24170f]">Scrape Jobs Log</h1>

      <div className="bg-white rounded-2xl border border-[#f1ded1] shadow-[0_10px_30px_-24px_rgba(53,37,28,0.45)] overflow-hidden">
        <div className="divide-y divide-[#f6e8de]">
          {jobs.length === 0 ? (
            <div className="p-8 text-center text-[#8a7668]">No jobs recorded yet.</div>
          ) : (
            jobs.map((job: any) => (
              <div key={job.id} className="p-6 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-medium text-[#24170f]">{job.product.url}</span>
                  </div>
                  <p className="text-sm text-[#8a7668]">
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
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#f2f8ec] text-[#4f761d] border border-[#d8e8c8]">
                      <CheckCircle2 className="w-4 h-4" /> Success
                    </span>
                  )}
                  {job.status === "FAILED" && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                      <AlertTriangle className="w-4 h-4" /> Failed
                    </span>
                  )}
                  {job.status === "PENDING" && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#fff2e8] text-[#c84f00] border border-[#ffd7bd]">
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
