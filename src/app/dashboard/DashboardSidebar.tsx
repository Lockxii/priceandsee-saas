"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  Activity,
  LayoutDashboard,
  Link as LinkIcon,
  PackageSearch,
  Radar,
  Wrench,
  Zap,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  tourId?: string;
  match?: (pathname: string) => boolean;
};

const mainNav: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, match: (p) => p === "/dashboard" },
  {
    href: "/dashboard/products",
    label: "Tracked URLs",
    icon: LinkIcon,
    tourId: "sidebar-products",
    match: (p) => p === "/dashboard/products" || p.startsWith("/dashboard/products/"),
  },
  {
    href: "/dashboard/monitoring",
    label: "Monitoring",
    icon: Radar,
    match: (p) => p === "/dashboard/monitoring",
  },
];

const exploreNav: NavItem[] = [
  {
    href: "/dashboard/tools",
    label: "Tools",
    icon: Wrench,
    match: (p) => p === "/dashboard/tools" || p.startsWith("/dashboard/tools/"),
  },
  { href: "/dashboard/product-finder", label: "Product Finder", icon: PackageSearch, match: (p) => p === "/dashboard/product-finder" },
];

const systemNav: NavItem[] = [
  { href: "/dashboard/jobs", label: "Scrape Jobs", icon: Activity, match: (p) => p === "/dashboard/jobs" },
];

function NavLink({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const active = item.match ? item.match(pathname) : pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      data-tour={item.tourId}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
        active
          ? "bg-[#fff2e8] text-[#ff690c] font-semibold shadow-[inset_0_0_0_1px_rgba(255,105,12,0.12)]"
          : "text-[#5b4638] font-medium hover:bg-[#fff8f2] hover:text-[#24170f]"
      }`}
    >
      <Icon className={`w-[18px] h-[18px] shrink-0 ${active ? "text-[#ff690c]" : "text-[#8a7668]"}`} />
      <span>{item.label}</span>
    </Link>
  );
}

function NavGroup({ label, items }: { label: string; items: NavItem[] }) {
  return (
    <div>
      <p className="px-3 mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#a99485]">{label}</p>
      <div className="space-y-0.5">
        {items.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
      </div>
    </div>
  );
}

export function DashboardSidebar({ footer }: { footer?: ReactNode }) {
  return (
    <aside className="hidden sm:flex w-[272px] shrink-0 bg-white border-r border-[var(--dash-border)] flex-col">
      <div className="h-16 flex items-center px-5 border-b border-[var(--dash-border)]">
        <Link href="/dashboard" className="font-bold text-lg text-[#24170f] flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#ff690c] flex items-center justify-center text-white shadow-[0_2px_10px_rgba(255,105,12,0.35)] shrink-0">
            <Zap className="w-[17px] h-[17px] fill-white stroke-none" />
          </div>
          <span className="truncate">PriceAndSee</span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-6">
        <NavGroup label="Monitor" items={mainNav} />
        <NavGroup label="Explore" items={exploreNav} />
        <NavGroup label="System" items={systemNav} />
      </nav>

      {footer ? <div className="p-4 border-t border-[var(--dash-border)]">{footer}</div> : null}
    </aside>
  );
}
