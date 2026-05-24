import Link from "next/link";
import { Archive, ArrowRight, BadgePercent, Boxes, Cpu, Download, ImageDown, MessageSquareText, PackageSearch, Radar, SearchCode } from "lucide-react";

const tools = [
  {
    title: "Product Finder",
    href: "/dashboard/product-finder",
    icon: PackageSearch,
    description: "Paste Shopify stores and pull real catalogs, prices, stock and launch dates.",
    status: "Live",
  },
  {
    title: "Media Downloader",
    href: "/dashboard/tools/media-downloader",
    icon: ImageDown,
    description: "Extract product images, CDN assets, videos and OpenGraph media from any commerce page.",
    status: "Generic",
  },
  {
    title: "Product Snapshot",
    href: "/dashboard/tools/product-snapshot",
    icon: SearchCode,
    description: "Read JSON-LD, meta tags, platform APIs and page signals for one product URL.",
    status: "Generic",
  },
  {
    title: "Product URL Discovery",
    href: "/dashboard/tools/product-discovery",
    icon: Boxes,
    description: "Discover product URLs from Shopify/WooCommerce APIs, page links and sitemaps.",
    status: "Generic",
  },
  {
    title: "Promo Detector",
    href: "/dashboard/tools/promo-detector",
    icon: BadgePercent,
    description: "Extract discount, shipping, urgency, bundle and promo-code messages from commerce pages.",
    status: "Generic",
  },
  {
    title: "Review Exporter",
    href: "/dashboard/tools/review-exporter",
    icon: MessageSquareText,
    description: "Pull visible or structured product reviews into searchable rows and export CSV.",
    status: "Generic",
  },
  {
    title: "Tech Detector",
    href: "/dashboard/tools/tech-detector",
    icon: Cpu,
    description: "Detect platform, analytics, ad pixels, review apps, payments, email/SMS and support tools.",
    status: "Generic",
  },
  {
    title: "Tracked URLs",
    href: "/dashboard/products",
    icon: Archive,
    description: "Keep product monitoring where it belongs: saved URLs, checks, details and downloads.",
    status: "Core",
  },
  {
    title: "Monitoring Center",
    href: "/dashboard/monitoring",
    icon: Radar,
    description: "Bulk check stale or failing tracked products and spot real price movements.",
    status: "Core",
  },
];

const ideas = [
  "Competitor product feed diff",
  "Price screenshot capture",
  "Ad/landing-page asset ripper",
  "Checkout shipping estimator",
  "Marketplace listing comparator",
  "Theme/component cloner",
];

export default function ToolsPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[var(--dash-border)] bg-white p-6 shadow-[var(--dash-shadow)]">
        <p className="text-sm text-[var(--dash-muted)]">Commerce toolbox</p>
        <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mt-2 max-w-3xl text-[var(--dash-muted-strong)] leading-relaxed">
              One place for small scraping workflows. Every tool fetches the target site and extracts real signals.
            </p>
          </div>
          <Link href="/dashboard/products" className="inline-flex items-center gap-2 rounded-xl bg-[#ff690c] px-4 py-2 text-sm font-black text-white shadow-[0_8px_18px_rgba(255,105,12,0.18)] hover:bg-[#e85f0a]">
            Go to tracked URLs <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <Link key={tool.href} href={tool.href} className="group rounded-2xl border border-[#f1ded1] bg-white p-5 shadow-[0_10px_30px_-24px_rgba(53,37,28,0.45)] transition-colors hover:bg-[#fffaf6]">
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff2e8] text-[#ff690c]"><Icon className="h-6 w-6" /></div>
                <span className="rounded-full border border-[#f1ded1] bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#8a7668]">{tool.status}</span>
              </div>
              <h2 className="mt-5 text-xl font-black text-[#24170f]">{tool.title}</h2>
              <p className="mt-2 min-h-[44px] text-sm font-medium text-[#6f5a4d]">{tool.description}</p>
              <div className="mt-5 inline-flex items-center gap-2 text-sm font-black text-[#ff690c]">Open tool <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></div>
            </Link>
          );
        })}
      </div>

      <section className="rounded-2xl border border-[#f1ded1] bg-white p-5 shadow-[0_10px_30px_-24px_rgba(53,37,28,0.45)]">
        <div className="flex items-center gap-2">
          <Download className="h-5 w-5 text-[#ff690c]" />
          <h2 className="font-black text-[#24170f]">Next useful tools to add</h2>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
          {ideas.map((idea) => <div key={idea} className="rounded-xl border border-[#f1ded1] bg-[#fffaf6] px-3 py-2 text-sm font-bold text-[#5b4638]">{idea}</div>)}
        </div>
      </section>
    </div>
  );
}
