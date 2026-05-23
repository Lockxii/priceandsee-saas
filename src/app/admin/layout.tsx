import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { Activity, BarChart3, LayoutDashboard, Link as LinkIcon, Settings, Shield } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AccountMenu } from "@/app/dashboard/AccountMenu";

const ADMIN_EMAIL = "contact.arthur.mouton@gmail.com";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
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

  return (
    <div className="h-screen overflow-hidden bg-[#fffaf6] flex text-[#17120f]">
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
          <Link href="/admin/analytics" className="flex items-center gap-3 px-3 py-2 rounded-lg text-[#5b4638] hover:bg-[#fff2e8] hover:text-[#24170f] transition-colors">
            <BarChart3 className="w-5 h-5" /> <span className="font-medium">Analytics</span>
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
        {children}
      </main>
    </div>
  );
}
