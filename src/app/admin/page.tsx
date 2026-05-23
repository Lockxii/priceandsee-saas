import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { Shield, Users, Link as LinkIcon, Activity, AlertTriangle } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ADMIN_EMAIL = "contact.arthur.mouton@gmail.com";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.email !== ADMIN_EMAIL) redirect("/dashboard");

  await prisma.user.updateMany({
    where: { email: ADMIN_EMAIL, role: { not: "ADMIN" } },
    data: { role: "ADMIN" },
  });

  const [users, totalProducts, recentJobs, failedJobs] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { products: true } },
        products: {
          orderBy: { updatedAt: "desc" },
          take: 3,
          select: {
            id: true,
            url: true,
            title: true,
            currentPrice: true,
            stockStatus: true,
            lastCheckedAt: true,
            lastError: true,
          },
        },
      },
    }),
    prisma.product.count(),
    prisma.scrapingJob.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
      include: { product: { include: { user: { select: { email: true } } } } },
    }),
    prisma.scrapingJob.count({ where: { status: "FAILED" } }),
  ]);

  const stats = [
    { label: "Users", value: users.length, icon: Users },
    { label: "Tracked URLs", value: totalProducts, icon: LinkIcon },
    { label: "Recent jobs", value: recentJobs.length, icon: Activity },
    { label: "Failures", value: failedJobs, icon: AlertTriangle },
  ];

  return (
    <div className="min-h-screen bg-[#fffaf6] text-[#24170f]">
      <header className="border-b border-[#f1ded1] bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-6">
          <Link href="/dashboard" className="font-[800] text-[#ff690c]">PriceAndSee Admin</Link>
          <div className="flex items-center gap-3 text-sm text-[#6f5a4d]">
            <Shield className="h-4 w-4 text-[#ff690c]" /> {session.user.email}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1280px] space-y-8 px-6 py-8">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#ff690c]">Admin</p>
          <h1 className="mt-2 text-3xl font-[800] tracking-tight">Monitoring SaaS & scraping</h1>
          <p className="mt-2 text-[#6f5a4d]">Vue globale des users, abonnements, URLs suivies et jobs de scraping.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-[#f1ded1] bg-white p-5 shadow-[0_10px_30px_-24px_rgba(53,37,28,0.45)]">
              <stat.icon className="mb-4 h-5 w-5 text-[#ff690c]" />
              <p className="text-sm text-[#8a7668]">{stat.label}</p>
              <p className="text-3xl font-[800]">{stat.value}</p>
            </div>
          ))}
        </div>

        <section className="rounded-3xl border border-[#f1ded1] bg-white shadow-[0_10px_30px_-24px_rgba(53,37,28,0.45)] overflow-hidden">
          <div className="border-b border-[#f1ded1] px-6 py-4">
            <h2 className="text-xl font-bold">Users & abonnements</h2>
          </div>
          <div className="divide-y divide-[#f6e8de]">
            {users.map((user) => (
              <div key={user.id} className="p-6">
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold">{user.email}</p>
                      <span className="rounded-full bg-[#fff2e8] px-2.5 py-1 text-xs font-bold text-[#ff690c]">{user.role}</span>
                      <span className="rounded-full bg-[#fffaf6] px-2.5 py-1 text-xs font-bold text-[#6f5a4d]">Plan {user.plan}</span>
                    </div>
                    <p className="mt-1 text-sm text-[#8a7668]">
                      Créé le {new Date(user.createdAt).toLocaleDateString()} · Onboarding {user.onboardingCompleted ? "terminé" : "non terminé"}
                    </p>
                  </div>
                  <div className="text-sm text-[#6f5a4d]">
                    {user._count.products} URL(s) · Stripe: {user.stripeCustomerId || "—"}
                  </div>
                </div>

                <div className="mt-4 grid gap-3">
                  {user.products.length === 0 ? (
                    <p className="rounded-xl bg-[#fffaf6] p-3 text-sm text-[#8a7668]">Aucune URL suivie.</p>
                  ) : (
                    user.products.map((product) => (
                      <div key={product.id} className="rounded-xl border border-[#f1ded1] bg-[#fffaf6] p-3 text-sm">
                        <div className="flex flex-col justify-between gap-2 md:flex-row md:items-center">
                          <div className="min-w-0">
                            <p className="truncate font-semibold">{product.title || "Pending extraction"}</p>
                            <a href={product.url} target="_blank" rel="noreferrer" className="block truncate text-[#ff690c] hover:underline">{product.url}</a>
                          </div>
                          <div className="flex shrink-0 gap-3 text-[#6f5a4d]">
                            <span>{product.currentPrice ? `${product.currentPrice}€` : "Prix —"}</span>
                            <span>{product.stockStatus || "Stock —"}</span>
                            <span>{product.lastCheckedAt ? new Date(product.lastCheckedAt).toLocaleDateString() : "Jamais check"}</span>
                          </div>
                        </div>
                        {product.lastError && <p className="mt-2 text-xs text-red-600">Erreur: {product.lastError}</p>}
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-[#f1ded1] bg-white shadow-[0_10px_30px_-24px_rgba(53,37,28,0.45)] overflow-hidden">
          <div className="border-b border-[#f1ded1] px-6 py-4">
            <h2 className="text-xl font-bold">Derniers jobs scraping</h2>
          </div>
          <div className="divide-y divide-[#f6e8de]">
            {recentJobs.map((job) => (
              <div key={job.id} className="flex flex-col justify-between gap-2 px-6 py-4 text-sm md:flex-row md:items-center">
                <div className="min-w-0">
                  <p className="font-semibold">{job.product.user.email}</p>
                  <p className="truncate text-[#6f5a4d]">{job.product.url}</p>
                  {job.errorMessage && <p className="mt-1 text-red-600">{job.errorMessage}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${job.status === "SUCCESS" ? "bg-[#f2f8ec] text-[#4f761d]" : job.status === "FAILED" ? "bg-red-50 text-red-700" : "bg-[#fff2e8] text-[#c84f00]"}`}>
                    {job.status}
                  </span>
                  <span className="text-[#8a7668]">{job.source}</span>
                  <span className="text-[#8a7668]">{job.durationMs ? `${job.durationMs}ms` : "—"}</span>
                  <span className="text-[#8a7668]">{new Date(job.createdAt).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
