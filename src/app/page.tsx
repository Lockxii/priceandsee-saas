import Link from "next/link";
import { ArrowRight, BarChart3, Bell, Shield, Zap } from "lucide-react";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { PricingWidget } from "@/components/ui/pricing-widget";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="px-6 py-4 flex justify-between items-center bg-white border-b border-slate-200">
        <div className="font-bold text-2xl text-indigo-600 tracking-tight">PriceAndSee</div>
        <nav className="hidden md:flex gap-6 text-sm font-medium text-slate-600">
          <Link href="#features" className="hover:text-slate-900 transition-colors">Features</Link>
          <Link href="#pricing" className="hover:text-slate-900 transition-colors">Pricing</Link>
        </nav>
        <div className="flex gap-4">
          <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 px-4 py-2">Log in</Link>
          <Link href="/register" className="text-sm font-medium bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">Start for free</Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 md:py-32 px-6 text-center max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-sm font-medium mb-6">
            <Zap className="w-4 h-4" />
            <span>The smart way to track your competitors</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight mb-8">
            Never lose a sale to <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">competitor pricing</span> again.
          </h1>
          <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto">
            Automatically monitor competitor prices, stock levels, and promotions. Perfect for Shopify brands, Amazon sellers, and niche e-commerce stores.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/register">
              <ShimmerButton className="inline-flex items-center justify-center gap-2 bg-indigo-600 text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-indigo-700 transition-transform hover:scale-105">
                Start Monitoring Now
                <ArrowRight className="w-5 h-5" />
              </ShimmerButton>
            </Link>
            <Link href="/login" className="inline-flex items-center justify-center bg-white text-slate-900 border border-slate-200 shadow-sm px-8 py-4 rounded-full font-semibold text-lg hover:bg-slate-50 transition-colors">
              View Dashboard
            </Link>
          </div>
          <p className="mt-4 text-sm text-slate-500">No credit card required • Setup in 2 minutes</p>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 bg-white">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-slate-900 mb-4">Everything you need to stay ahead</h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">We cut out the enterprise bloat to bring you a lightweight, lightning-fast tracking tool.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-10">
              <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100">
                <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center mb-6">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">Automated Price History</h3>
                <p className="text-slate-600">Track price movements over time. Spot trends, map out competitor strategies, and adjust your own pricing instantly.</p>
              </div>
              <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100">
                <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mb-6">
                  <Bell className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">Instant Alerts</h3>
                <p className="text-slate-600">Get notified via Email or Slack the moment a competitor drops their price or runs out of stock.</p>
              </div>
              <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-6">
                  <Shield className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">Anti-Bot Scraping</h3>
                <p className="text-slate-600">Our engines bypass sophisticated bot protection so your data is always fresh, accurate, and reliable.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-20 bg-slate-50">
          <div className="max-w-4xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-slate-900 mb-4">Simple, transparent pricing</h2>
              <p className="text-lg text-slate-600">Start small and scale as your tracking needs grow.</p>
            </div>
            <div className="flex justify-center max-w-3xl mx-auto">
              <PricingWidget 
                initialBilling="monthly"
                initialActivePlanId="starter"
                plansData={{
                  monthly: [
                    { id: 'starter', title: 'Starter (10 URLs)', price: 19.99, popular: false },
                    { id: 'growth', title: 'Growth (100 URLs)', price: 49.99, popular: true },
                    { id: 'pro', title: 'Enterprise', price: 99.99, popular: false },
                  ],
                  yearly: [
                    { id: 'starter', title: 'Starter (10 URLs)', price: 15.99, popular: false },
                    { id: 'growth', title: 'Growth (100 URLs)', price: 39.99, popular: true },
                    { id: 'pro', title: 'Enterprise', price: 79.99, popular: false },
                  ],
                }}
              />
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-white border-t border-slate-200 py-10 px-6 text-center text-slate-500 text-sm">
        <p>&copy; {new Date().getFullYear()} PriceAndSee SaaS. All rights reserved.</p>
      </footer>
    </div>
  );
}
