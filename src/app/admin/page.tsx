import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { Activity, BarChart3, LayoutDashboard, Link as LinkIcon, Search, Settings, Shield, Users } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PLAN_LIMITS } from "@/lib/plans";
import { AccountMenu } from "@/app/dashboard/AccountMenu";
import { resetUserMonthlyChecks, updateUserAdminSettings } from "./actions";
import { AdminSelect } from "./AdminSelect";

const ADMIN_EMAIL = "contact.arthur.mouton@gmail.com";

type AdminPageProps = {
  searchParams?: Promise<{ q?: string }>;
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.email !== ADMIN_EMAIL) redirect("/dashboard");

  await prisma.user.updateMany({
    where: { email: ADMIN_EMAIL, role: { not: "ADMIN" } },
    data: { role: "ADMIN" },
  });

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, name: true, role: true, plan: true },
  });

  const params = await searchParams;
  const q = params?.q?.trim() || "";

  const where = q
    ? {
        OR: [
          { email: { contains: q, mode: "insensitive" as const } },
          { name: { contains: q, mode: "insensitive" as const } },
          { id: { contains: q } },
        ],
      }
    : {};

  const [users, totalUsers, totalProducts, totalJobs, failedJobs, recentJobs] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { products: true } },
        products: {
          orderBy: { updatedAt: "desc" },
          take: 4,
          select: { id: true, url: true, title: true, currentPrice: true, stockStatus: true, lastCheckedAt: true, lastError: true },
        },
      },
    }),
    prisma.user.count(),
    prisma.product.count(),
    prisma.scrapingJob.count(),
    prisma.scrapingJob.count({ where: { status: "FAILED" } }),
    prisma.scrapingJob.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { product: { include: { user: true } } } }),
  ]);

  const statCards = [
    { label: "Users", value: totalUsers, icon: Users },
    { label: "Tracked URLs", value: totalProducts, icon: LinkIcon },
    { label: "Scrape jobs", value: totalJobs, icon: Activity },
    { label: "Failures", value: failedJobs, icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-[#fffaf6] flex text-[#17120f]">
      <aside className="w-[280px] bg-white border-r border-[#f1ded1] flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-[#f1ded1]">
          <Link href="/" className="font-bold text-xl text-[#ff690c]">PriceAndSee</Link>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2 rounded-lg text-[#5b4638] hover:bg-[#fff2e8] hover:text-[#24170f] transition-colors">
            <LayoutDashboard className="w-5 h-5" /> <span className="font-medium">Overview</span>
          </Link>
          <Link href="/dashboard/products" className="flex items-center gap-3 px-3 py-2 rounded-lg text-[#5b4638] hover:bg-[#fff2e8] hover:text-[#24170f] transition-colors">
            <LinkIcon className="w-5 h-5" /> <span className="font-medium">Tracked URLs</span>
          </Link>
          <Link href="/dashboard/jobs" className="flex items-center gap-3 px-3 py-2 rounded-lg text-[#5b4638] hover:bg-[#fff2e8] hover:text-[#24170f] transition-colors">
            <Activity className="w-5 h-5" /> <span className="font-medium">Scrape Jobs</span>
          </Link>
          <Link href="/dashboard/settings" className="flex items-center gap-3 px-3 py-2 rounded-lg text-[#5b4638] hover:bg-[#fff2e8] hover:text-[#24170f] transition-colors">
            <Settings className="w-5 h-5" /> <span className="font-medium">Settings</span>
          </Link>
          <Link href="/admin" className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[#fff2e8] text-[#ff690c] transition-colors">
            <Shield className="w-5 h-5" /> <span className="font-medium">Admin</span>
          </Link>
        </nav>
        <div className="p-4 border-t border-[#f1ded1]">
          <AccountMenu
            email={currentUser?.email || session.user.email || ADMIN_EMAIL}
            name={currentUser?.name || session.user.name}
            role={currentUser?.role}
            plan={currentUser?.plan}
          />
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 flex items-center justify-between px-8 bg-white border-b border-[#f1ded1]">
          <div className="flex items-center gap-3 font-bold text-[#35251c]"><Shield className="h-4 w-4" /> Admin Panel</div>
          <div className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#17120f] px-4 text-sm font-bold text-white shadow-[0_12px_26px_-16px_rgba(0,0,0,0.8)]">
            <BarChart3 className="h-4 w-4" /> Analytics
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6">
          <div className="space-y-5">
            <div>
              <p className="text-sm text-[#6f5a4d]">Admin Dashboard</p>
              <h1 className="text-2xl font-[800] tracking-tight">Users, subscriptions, quotas & scraping limits</h1>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              {statCards.map((stat) => (
                <div key={stat.label} className="rounded-[16px] border border-[#e8ded6] bg-white p-5">
                  <div className="mb-6 flex items-center justify-between">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e8ded6] bg-white">
                      <stat.icon className="h-4 w-4" />
                    </div>
                    <span className="rounded-full border border-[#e8ded6] bg-white px-3 py-1 text-xs">Live</span>
                  </div>
                  <p className="text-sm text-[#6f5a4d]">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
              ))}
            </div>

            <section className="rounded-[16px] border border-[#e0e0e0] bg-[#f7f8fa] p-6">
              <div className="mb-4 flex items-center gap-2 text-sm font-medium"><Search className="h-4 w-4" /> User Lookup</div>
              <form className="flex gap-2">
                <input name="q" defaultValue={q} placeholder="Enter user email, name or id..." className="h-11 flex-1 rounded-lg border border-[#cfd4dc] bg-white px-4 text-sm outline-none focus:border-[#17120f] focus:ring-2 focus:ring-[#17120f]/10" />
                <button className="h-11 rounded-lg bg-[#17120f] px-8 text-sm font-bold text-white shadow-sm hover:bg-black">Search</button>
              </form>
            </section>

            <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="space-y-4 min-w-0">
                {users.map((user) => (
                  <div key={user.id} className="rounded-[16px] border border-[#e0e0e0] bg-white p-5 overflow-visible">
                    <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#eef0f4] font-bold text-[#6b7280]">{(user.name || user.email).slice(0, 2).toUpperCase()}</div>
                        <div className="min-w-0">
                          <p className="font-semibold">{user.name || "No name"}</p>
                          <p className="truncate text-sm text-[#4b5563]">{user.email}</p>
                          <p className="mt-3 text-sm"><span className="text-[#666]">User ID:</span> <code>{user.id}</code></p>
                        </div>
                      </div>
                      <div className="grid min-w-[320px] grid-cols-2 gap-x-8 gap-y-2 text-sm">
                        <p><span className="text-[#666]">Role:</span> <b>{user.role}</b></p>
                        <p><span className="text-[#666]">Plan:</span> <b>{user.plan}</b></p>
                        <p><span className="text-[#666]">Admin:</span> <b>{user.role === "ADMIN" ? "Yes" : "No"}</b></p>
                        <p><span className="text-[#666]">Onboarding:</span> <b>{user.onboardingCompleted ? "Done" : "Pending"}</b></p>
                      </div>
                    </div>

                    <div className="mb-5 grid gap-2 md:grid-cols-4">
                      <MiniStat label="URLs" value={`${user._count.products}/${user.maxUrls}`} />
                      <MiniStat label="Checks used" value={`${user.monthlyChecksUsed}/${user.monthlyCheckLimit}`} />
                      <MiniStat label="Frequency" value={`${user.checkIntervalHours}h`} />
                      <MiniStat label="Slack" value={user.slackAlertsEnabled ? "Enabled" : "Disabled"} />
                    </div>

                    <form action={updateUserAdminSettings} className="rounded-[14px] border border-[#e0e0e0] bg-[#f7f8fa] p-4 overflow-visible">
                      <input type="hidden" name="userId" value={user.id} />
                      <div className="grid gap-3 md:grid-cols-4 overflow-visible">
                        <Field label="Role"><AdminSelect name="role" defaultValue={user.role} options={["USER", "ADMIN"]} /></Field>
                        <Field label="Plan"><AdminSelect name="plan" defaultValue={user.plan} options={Object.keys(PLAN_LIMITS)} /></Field>
                        <Field label="Max URLs"><input className="admin-input" name="maxUrls" type="number" defaultValue={user.maxUrls} /></Field>
                        <Field label="Check interval hours"><input className="admin-input" name="checkIntervalHours" type="number" defaultValue={user.checkIntervalHours} /></Field>
                        <Field label="Monthly check limit"><input className="admin-input" name="monthlyCheckLimit" type="number" defaultValue={user.monthlyCheckLimit} /></Field>
                        <Field label="Monthly checks used"><input className="admin-input" name="monthlyChecksUsed" type="number" defaultValue={user.monthlyChecksUsed} /></Field>
                        <label className="flex items-center gap-2 rounded-lg border border-[#d7dce3] bg-white px-3 py-2 text-sm"><input name="emailAlertsEnabled" type="checkbox" defaultChecked={user.emailAlertsEnabled} /> Email alerts</label>
                        <label className="flex items-center gap-2 rounded-lg border border-[#d7dce3] bg-white px-3 py-2 text-sm"><input name="slackAlertsEnabled" type="checkbox" defaultChecked={user.slackAlertsEnabled} /> Slack alerts</label>
                        <label className="flex items-center gap-2 rounded-lg border border-[#d7dce3] bg-white px-3 py-2 text-sm"><input name="onboardingCompleted" type="checkbox" defaultChecked={user.onboardingCompleted} /> Onboarding done</label>
                      </div>
                      <textarea name="adminNotes" defaultValue={user.adminNotes || ""} placeholder="Admin notes..." className="mt-3 min-h-20 w-full rounded-lg border border-[#d7dce3] bg-white p-3 text-sm outline-none focus:border-[#17120f]" />
                      <div className="mt-3 flex gap-2"><button className="rounded-lg bg-[#17120f] px-5 py-2 text-sm font-bold text-white hover:bg-black">Save changes</button></div>
                    </form>

                    <form action={resetUserMonthlyChecks} className="mt-2"><input type="hidden" name="userId" value={user.id} /><button className="text-xs font-bold text-[#ff690c] hover:underline">Reset monthly checks</button></form>

                    <div className="mt-5 space-y-2">
                      {user.products.length === 0 ? <p className="text-sm text-[#777]">No tracked URLs.</p> : user.products.map((product) => (
                        <div key={product.id} className="rounded-lg border border-[#e0e0e0] bg-[#fbfaf9] p-3 text-sm">
                          <div className="flex justify-between gap-4"><div className="min-w-0"><p className="truncate font-medium">{product.title || "Pending extraction"}</p><a href={product.url} target="_blank" rel="noreferrer" className="block truncate text-[#ff690c] hover:underline">{product.url}</a></div><div className="flex shrink-0 gap-3 text-[#555]"><span>{product.currentPrice ? `${product.currentPrice}€` : "—"}</span><span>{product.stockStatus || "—"}</span><span>{product.lastCheckedAt ? new Date(product.lastCheckedAt).toLocaleDateString() : "Never"}</span></div></div>
                          {product.lastError && <p className="mt-1 text-xs text-red-600">{product.lastError}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <aside className="space-y-4">
                <div className="rounded-[16px] border border-[#e0e0e0] bg-white p-5">
                  <h2 className="font-bold">Recent scraping jobs</h2>
                  <div className="mt-4 space-y-3">
                    {recentJobs.map((job) => (
                      <div key={job.id} className="rounded-lg bg-[#f7f8fa] p-3 text-xs"><div className="mb-1 flex justify-between gap-2"><b>{job.status}</b><span>{job.durationMs ? `${job.durationMs}ms` : "—"}</span></div><p className="truncate text-[#555]">{job.product.user.email}</p><p className="truncate text-[#777]">{job.product.url}</p></div>
                    ))}
                  </div>
                </div>
              </aside>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-[#d7dce3] bg-[#f7f8fa] p-3 text-sm"><p className="text-[#555]">{label}</p><p className="font-semibold">{value}</p></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="relative text-xs font-medium text-[#555]"><span className="mb-1 block">{label}</span>{children}</label>;
}
