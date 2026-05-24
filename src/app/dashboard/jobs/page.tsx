import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import {
  DashboardCard,
  EmptyState,
  PageHeader,
  StatusBadge,
} from "@/components/dashboard/ui";

function hostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export default async function ScrapeJobsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const userId = session.user.id;

  const jobs = await prisma.scrapingJob.findMany({
    where: { product: { userId } },
    orderBy: { createdAt: "desc" },
    include: { product: { select: { url: true, title: true } } },
    take: 50,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Journal d'activité"
        hideTitle
        description="Historique des extractions lancées sur tes URLs suivies."
      />

      <DashboardCard padding={false}>
        <div className="divide-y divide-[#f6e8de]">
          {jobs.length === 0 ? (
            <EmptyState title="No jobs recorded yet" description="Run a check on a tracked URL to see jobs appear here." />
          ) : (
            jobs.map((job) => (
              <div key={job.id} className="p-5 sm:p-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between hover:bg-[#fffdfb] transition-colors">
                <div className="min-w-0">
                  <p className="font-semibold text-[var(--dash-ink)] truncate">
                    {job.product.title || hostname(job.product.url)}
                  </p>
                  <p className="text-sm text-[var(--dash-muted)] truncate">{hostname(job.product.url)}</p>
                  <p className="text-sm text-[var(--dash-muted)] mt-1">{new Date(job.createdAt).toLocaleString()}</p>
                  {job.errorMessage ? (
                    <div className="mt-3 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100 font-mono max-w-2xl overflow-x-auto">
                      {job.errorMessage}
                    </div>
                  ) : null}
                </div>
                <div className="shrink-0">
                  {job.status === "SUCCESS" ? (
                    <StatusBadge tone="success">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Success
                    </StatusBadge>
                  ) : job.status === "FAILED" ? (
                    <StatusBadge tone="error">
                      <AlertTriangle className="w-3.5 h-3.5" /> Failed
                    </StatusBadge>
                  ) : (
                    <StatusBadge tone="warning">
                      <Clock className="w-3.5 h-3.5" /> Pending
                    </StatusBadge>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </DashboardCard>
    </div>
  );
}
