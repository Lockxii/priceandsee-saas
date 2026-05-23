import Link from "next/link";
import { ArrowRight, BarChart3, Bell, Shield, Zap } from "lucide-react";

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
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register" className="inline-flex items-center justify-center gap-2 bg-indigo-600 text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-indigo-700 transition-transform hover:scale-105">
              Start Monitoring Now
              <ArrowRight className="w-5 h-5" />
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
            <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm relative">
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Starter</h3>
                <p className="text-slate-500 mb-6">Perfect for niche stores.</p>
                <div className="text-4xl font-extrabold text-slate-900 mb-6">$19<span className="text-lg font-normal text-slate-500">/mo</span></div>
                <ul className="space-y-4 mb-8">
                  <li className="flex gap-3 text-slate-600"><Zap className="w-5 h-5 text-indigo-500" /> Track 10 competitor URLs</li>
                  <li className="flex gap-3 text-slate-600"><Zap className="w-5 h-5 text-indigo-500" /> Daily price & stock checks</li>
                  <li className="flex gap-3 text-slate-600"><Zap className="w-5 h-5 text-indigo-500" /> Email alerts</li>
                  <li className="flex gap-3 text-slate-600"><Zap className="w-5 h-5 text-indigo-500" /> 30-day price history</li>
                </ul>
                <Link href="/register" className="block w-full py-3 px-4 bg-indigo-50 text-indigo-700 font-semibold text-center rounded-xl hover:bg-indigo-100 transition-colors">Choose Starter</Link>
              </div>
              <div className="bg-indigo-600 p-8 rounded-3xl border border-indigo-700 shadow-xl relative text-white">
                <div className="absolute top-0 right-8 transform -translate-y-1/2">
                  <span className="bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold uppercase tracking-wider py-1 px-3 rounded-full">Most Popular</span>
                </div>
                <h3 className="text-2xl font-bold mb-2">Growth</h3>
                <p className="text-indigo-200 mb-6">For aggressive monitoring.</p>
                <div className="text-4xl font-extrabold mb-6">$49<span className="text-lg font-normal text-indigo-300">/mo</span></div>
                <ul className="space-y-4 mb-8">
                  <li className="flex gap-3"><Zap className="w-5 h-5 text-indigo-300" /> Track 100 competitor URLs</li>
                  <li className="flex gap-3"><Zap className="w-5 h-5 text-indigo-300" /> Hourly price & stock checks</li>
                  <li className="flex gap-3"><Zap className="w-5 h-5 text-indigo-300" /> Email & Slack alerts</li>
                  <li className="flex gap-3"><Zap className="w-5 h-5 text-indigo-300" /> Unlimited price history</li>
                </ul>
                <Link href="/register" className="block w-full py-3 px-4 bg-white text-indigo-600 font-semibold text-center rounded-xl hover:bg-slate-50 transition-colors">Choose Growth</Link>
              </div>
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
