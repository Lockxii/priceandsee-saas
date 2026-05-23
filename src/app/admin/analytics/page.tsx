import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { Activity, ArrowLeft, BarChart3, Link as LinkIcon, ShieldAlert, Users } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ADMIN_EMAIL = "contact.arthur.mouton@gmail.com";

function monthKey(date: Date) {
  return date.toLocaleString("en-US", { month: "short" });
}

export default async function AdminAnalyticsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.email !== ADMIN_EMAIL) redirect("/dashboard");

  const since = new Date();
  since.setMonth(since.getMonth() - 5);
  since.setDate(1);
  since.setHours(0, 0, 0, 0);

  const [users, products, jobs, failedJobs, planGroups, recentJobs] = await Promise.all([
    prisma.user.findMany({ select: { createdAt: true, plan: true, monthlyChecksUsed: true } }),
    prisma.product.findMany({ select: { createdAt: true, lastCheckedAt: true, lastError: true } }),
    prisma.scrapingJob.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true, status: true } }),
    prisma.scrapingJob.count({ where: { status: "FAILED" } }),
    prisma.user.groupBy({ by: ["plan"], _count: { _all: true } }),
    prisma.scrapingJob.findMany({ orderBy: { createdAt: "desc" }, take: 6, include: { product: { include: { user: true } } } }),
  ]);

  const monthStarts = Array.from({ length: 6 }).map((_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - index));
    date.setDate(1);
    date.setHours(0, 0, 0, 0);
    return date;
  });

  const growth = monthStarts.map((date) => {
    const next = new Date(date);
    next.setMonth(next.getMonth() + 1);
    return {
      month: monthKey(date),
      users: users.filter((u) => u.createdAt >= date && u.createdAt < next).length,
      products: products.filter((p) => p.createdAt >= date && p.createdAt < next).length,
      jobs: jobs.filter((j) => j.createdAt >= date && j.createdAt < next).length,
    };
  });

  const maxGrowth = Math.max(1, ...growth.flatMap((g) => [g.users, g.products, g.jobs]));
  const totalChecksUsed = users.reduce((sum, user) => sum + user.monthlyChecksUsed, 0);
  const checkedProducts = products.filter((product) => product.lastCheckedAt).length;
  const extractionErrors = products.filter((product) => product.lastError).length;

  const cards = [
    { label: "Users", value: users.length, sub: "Total accounts", icon: Users },
    { label: "Tracked URLs", value: products.length, sub: `${checkedProducts} checked at least once`, icon: LinkIcon },
    { label: "Scrape jobs", value: jobs.length, sub: "Last six months", icon: Activity },
    { label: "Failures", value: failedJobs + extractionErrors, sub: `${extractionErrors} product extraction errors`, icon: ShieldAlert },
  ];

  return (
    <>
      <header className="h-16 flex items-center justify-between px-8 bg-white border-b border-[#f1ded1]">
        <div className="flex items-center gap-3 font-bold text-[#35251c]"><BarChart3 className="h-4 w-4" /> Admin Analytics</div>
        <Link href="/admin" className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#e8ded6] bg-white px-4 text-sm font-bold shadow-sm hover:bg-[#fff8f2]">
          <ArrowLeft className="h-4 w-4" /> Admin
        </Link>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-5">
          <div>
            <p className="text-sm text-[#6f5a4d]">Platform overview</p>
            <h1 className="text-2xl font-[800] tracking-tight">Analytics</h1>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            {cards.map((card) => (
              <div key={card.label} className="rounded-[16px] border border-[#e8ded6] bg-white p-5">
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e8ded6] bg-white"><card.icon className="h-4 w-4" /></div>
                  <span className="rounded-full border border-[#e8ded6] bg-white px-3 py-1 text-xs">Live</span>
                </div>
                <p className="text-sm text-[#6f5a4d]">{card.label}</p>
                <p className="text-2xl font-bold">{card.value}</p>
                <p className="text-sm text-[#6f5a4d]">{card.sub}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
            <section className="rounded-[16px] border border-[#e0e0e0] bg-white p-5">
              <h2 className="font-bold">Growth</h2>
              <p className="text-sm text-[#6f5a4d]">New users, tracked URLs, and scrape jobs over the last six months</p>
              <div className="mt-5 h-[280px] rounded-xl border border-[#e8ded6] bg-white p-4 flex items-end gap-4">
                {growth.map((entry) => (
                  <div key={entry.month} className="flex-1 h-full flex flex-col justify-end gap-1">
                    <div className="flex items-end justify-center gap-1 h-full">
                      <div className="w-4 rounded-t bg-[#ff690c]" style={{ height: `${Math.max(4, (entry.users / maxGrowth) * 100)}%` }} title={`Users ${entry.users}`} />
                      <div className="w-4 rounded-t bg-[#24170f]" style={{ height: `${Math.max(4, (entry.products / maxGrowth) * 100)}%` }} title={`URLs ${entry.products}`} />
                      <div className="w-4 rounded-t bg-[#f1b48e]" style={{ height: `${Math.max(4, (entry.jobs / maxGrowth) * 100)}%` }} title={`Jobs ${entry.jobs}`} />
                    </div>
                    <p className="text-center text-xs text-[#6f5a4d]">{entry.month}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex gap-4 text-xs text-[#6f5a4d]"><span className="font-bold text-[#ff690c]">Users</span><span className="font-bold text-[#24170f]">URLs</span><span className="font-bold text-[#d48652]">Jobs</span></div>
            </section>

            <section className="rounded-[16px] border border-[#e0e0e0] bg-white p-5">
              <h2 className="font-bold">Plans</h2>
              <p className="text-sm text-[#6f5a4d]">Users grouped by current plan</p>
              <div className="mt-5 space-y-3">
                {planGroups.map((group) => {
                  const width = Math.max(6, (group._count._all / Math.max(1, users.length)) * 100);
                  return (
                    <div key={group.plan}>
                      <div className="mb-1 flex justify-between text-sm"><span>{group.plan}</span><b>{group._count._all}</b></div>
                      <div className="h-3 rounded-full bg-[#fff2e8] overflow-hidden"><div className="h-full rounded-full bg-[#24170f]" style={{ width: `${width}%` }} /></div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          <div className="grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
            <section className="rounded-[16px] border border-[#e0e0e0] bg-white p-5">
              <h2 className="font-bold">Usage</h2>
              <p className="mt-4 text-sm text-[#6f5a4d]">Monthly checks used</p>
              <p className="text-3xl font-bold">{totalChecksUsed}</p>
              <p className="mt-4 text-sm text-[#6f5a4d]">Products with extraction errors</p>
              <p className="text-3xl font-bold">{extractionErrors}</p>
            </section>

            <section className="rounded-[16px] border border-[#e0e0e0] bg-white p-5">
              <h2 className="font-bold">Recent scraping jobs</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {recentJobs.map((job) => (
                  <div key={job.id} className="rounded-lg bg-[#f7f8fa] p-3 text-xs">
                    <div className="mb-1 flex justify-between gap-2"><b>{job.status}</b><span>{job.durationMs ? `${job.durationMs}ms` : "—"}</span></div>
                    <p className="truncate text-[#555]">{job.product.user.email}</p>
                    <p className="truncate text-[#777]">{job.product.url}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
