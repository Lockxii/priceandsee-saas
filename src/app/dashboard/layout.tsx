import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LayoutDashboard, Link as LinkIcon, Settings, LogOut, Activity } from "lucide-react";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-[#fffaf6] flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-[#f1ded1] flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-[#f1ded1]">
          <Link href="/" className="font-bold text-xl text-[#ff690c]">PriceAndSee</Link>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2 rounded-lg text-[#5b4638] hover:bg-[#fff2e8] hover:text-[#24170f] transition-colors">
            <LayoutDashboard className="w-5 h-5" />
            <span className="font-medium">Overview</span>
          </Link>
          <Link href="/dashboard/products" className="flex items-center gap-3 px-3 py-2 rounded-lg text-[#5b4638] hover:bg-[#fff2e8] hover:text-[#24170f] transition-colors">
            <LinkIcon className="w-5 h-5" />
            <span className="font-medium">Tracked URLs</span>
          </Link>
          <Link href="/dashboard/jobs" className="flex items-center gap-3 px-3 py-2 rounded-lg text-[#5b4638] hover:bg-[#fff2e8] hover:text-[#24170f] transition-colors">
            <Activity className="w-5 h-5" />
            <span className="font-medium">Scrape Jobs</span>
          </Link>
          <Link href="/dashboard/settings" className="flex items-center gap-3 px-3 py-2 rounded-lg text-[#5b4638] hover:bg-[#fff2e8] hover:text-[#24170f] transition-colors">
            <Settings className="w-5 h-5" />
            <span className="font-medium">Settings</span>
          </Link>
        </nav>
        <div className="p-4 border-t border-[#f1ded1]">
          <Link href="/api/auth/signout" className="flex items-center gap-3 px-3 py-2 rounded-lg text-[#6f5a4d] hover:bg-[#fff2e8] transition-colors">
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Log out</span>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        <header className="h-16 flex items-center justify-between px-8 bg-white border-b border-[#f1ded1]">
          <h1 className="text-xl font-semibold text-[#35251c]">Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-[#6f5a4d]">{session.user?.email}</span>
            <div className="w-8 h-8 rounded-full bg-[#fff2e8] text-[#ff690c] flex items-center justify-center font-bold">
              {session.user?.email?.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>
        <div className="p-8 flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
