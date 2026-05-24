import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LayoutDashboard, Link as LinkIcon, Settings, Activity, Zap, PackageSearch } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { GuidedTour } from "./GuidedTour";
import { AccountMenu } from "./AccountMenu";
import { SettingsModalRenderer } from "./SettingsModalRenderer";
import { revalidatePath } from "next/cache";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { onboardingCompleted: true, role: true, plan: true, name: true, email: true, createdAt: true },
  });

  async function updateProfileAction(formData: FormData) {
    "use server";
    const session = await getServerSession(authOptions);
    if (!session) return;
    const name = formData.get("name") as string;
    await prisma.user.update({
      where: { id: session.user.id },
      data: { name },
    });
    revalidatePath("/");
  }

  return (
    <div className="h-screen overflow-hidden bg-[#fffaf6] flex">
      {/* Sidebar */}
      <aside className="w-[280px] bg-white border-r border-[#f1ded1] flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-[#f1ded1]">
          <Link href="/" className="font-bold text-xl text-black flex items-center gap-2">
            <div className="w-8 h-8 rounded-[8px] bg-[#ff690c] flex items-center justify-center text-white shadow-[0_2px_8px_rgba(255,105,12,0.3)]">
              <Zap className="w-[18px] h-[18px] fill-white stroke-none" />
            </div>
            PriceAndSee
          </Link>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2 rounded-lg text-[#5b4638] hover:bg-[#fff2e8] hover:text-[#24170f] transition-colors">
            <LayoutDashboard className="w-5 h-5" />
            <span className="font-medium">Overview</span>
          </Link>
          <Link href="/dashboard/products" data-tour="sidebar-products" className="flex items-center gap-3 px-3 py-2 rounded-lg text-[#5b4638] hover:bg-[#fff2e8] hover:text-[#24170f] transition-colors">
            <LinkIcon className="w-5 h-5" />
            <span className="font-medium">Tracked URLs</span>
          </Link>
          <Link href="/dashboard/product-finder" className="flex items-center gap-3 px-3 py-2 rounded-lg text-[#5b4638] hover:bg-[#fff2e8] hover:text-[#24170f] transition-colors">
            <PackageSearch className="w-5 h-5" />
            <span className="font-medium">Product Finder</span>
          </Link>
          <Link href="/dashboard/jobs" className="flex items-center gap-3 px-3 py-2 rounded-lg text-[#5b4638] hover:bg-[#fff2e8] hover:text-[#24170f] transition-colors">
            <Activity className="w-5 h-5" />
            <span className="font-medium">Scrape Jobs</span>
          </Link>
        </nav>
        <div className="p-4 border-t border-[#f1ded1]">
          <AccountMenu
            email={user?.email || session.user.email || "user@priceandsee.com"}
            name={user?.name || session.user.name}
            role={user?.role}
            plan={user?.plan}
          />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        <header className="h-16 flex items-center justify-between px-8 bg-white border-b border-[#f1ded1]">
          <h1 className="text-xl font-semibold text-[#35251c]">Dashboard</h1>
          <div className="rounded-full border border-[#f1ded1] bg-[#fffaf6] px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-[#ff690c]">
            {user?.plan === "FREE" ? "Free plan" : `${user?.plan || "FREE"} plan`}
          </div>
        </header>
        <div className="p-8 flex-1 overflow-auto">
          {children}
        </div>
      </main>
      <GuidedTour show={!user?.onboardingCompleted} />
      <SettingsModalRenderer user={user} updateProfileAction={updateProfileAction} />
    </div>
  );
}
