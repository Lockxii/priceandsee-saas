"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, LayoutDashboard, Link as LinkIcon, Radar, Wrench } from "lucide-react";

const items = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard, match: (p: string) => p === "/dashboard" },
  { href: "/dashboard/products", label: "URLs", icon: LinkIcon, match: (p: string) => p.startsWith("/dashboard/products") },
  { href: "/dashboard/monitoring", label: "Monitor", icon: Radar, match: (p: string) => p === "/dashboard/monitoring" },
  { href: "/dashboard/tools", label: "Tools", icon: Wrench, match: (p: string) => p.startsWith("/dashboard/tools") || p === "/dashboard/product-finder" },
  { href: "/dashboard/jobs", label: "Jobs", icon: Activity, match: (p: string) => p === "/dashboard/jobs" },
];

export function DashboardMobileNav() {
  const pathname = usePathname();

  return (
    <div className="sm:hidden fixed bottom-[4.5rem] left-0 right-0 z-30 px-3 pointer-events-none">
      <nav className="pointer-events-auto mx-auto max-w-md flex items-center justify-between gap-1 rounded-2xl border border-[var(--dash-border)] bg-white/95 backdrop-blur-md p-1 shadow-[0_12px_40px_-20px_rgba(36,23,15,0.35)]">
        {items.map((item) => {
          const active = item.match(pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl py-2 text-[10px] font-bold transition-colors ${
                active ? "bg-[#fff2e8] text-[#ff690c]" : "text-[#8a7668]"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
