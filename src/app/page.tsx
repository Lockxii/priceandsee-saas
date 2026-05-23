import Link from "next/link";
import { ArrowRight, BarChart3, Bell, Shield, Zap } from "lucide-react";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { PricingWidget } from "@/components/ui/pricing-widget";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col font-sans selection:bg-[#ff690c] selection:text-white">
      {/* Blurred Header */}
      <header className="fixed top-0 left-0 z-50 flex h-[65px] w-full items-center border-b border-[#ebebeb]/85 bg-white/70 backdrop-blur-[14px] supports-[backdrop-filter]:bg-white/60">
        <div className="w-full max-w-[1180px] mx-auto px-6 flex justify-between items-center">
          <Link href="/" className="font-bold text-[22px] text-black tracking-tight flex items-center gap-2">
            <div className="w-7 h-7 rounded-[7px] bg-[#ff690c] flex items-center justify-center text-white">
              <Zap className="w-4 h-4 fill-current" />
            </div>
            PriceAndSee
          </Link>
          <nav className="hidden md:flex items-center justify-center rounded-full border border-[#ebebeb] bg-white/70 p-1 shadow-[0_1px_10px_rgba(43,23,11,0.04)]">
            <Link href="#features" className="text-[#474747] hover:bg-[#fff8f5] hover:text-black relative flex h-8 items-center rounded-full px-5 text-[13px] font-medium transition-colors">Features</Link>
            <Link href="#pricing" className="text-[#474747] hover:bg-[#fff8f5] hover:text-black relative flex h-8 items-center rounded-full px-5 text-[13px] font-medium transition-colors">Pricing</Link>
          </nav>
          <div className="flex gap-3 items-center">
            <Link href="/login" className="hidden sm:block text-[13px] font-medium text-[#474747] hover:text-black transition-colors px-2">Log in</Link>
            <Link href="/register" className="flex items-center gap-1.5 h-[32px] px-4 rounded-[7px] bg-[#ff690c] text-white text-[13px] font-medium whitespace-nowrap shadow-sm hover:opacity-90 transition-opacity">
              Start for free
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 pt-[65px]">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-24 md:py-32 px-6 text-center max-w-[1180px] mx-auto flex flex-col items-center">
          {/* Subtle Glow Background */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-[#ff690c]/[0.06] rounded-full blur-[100px] pointer-events-none -z-10" />
          
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#ebebeb] bg-white text-[#474747] text-[13px] font-medium mb-8 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#ff690c] animate-pulse" />
            V2 is now live
          </div>
          
          <h1 className="text-[42px] md:text-[68px] font-[800] text-black tracking-tight leading-[1.05] mb-6 max-w-4xl">
            Never lose a sale to <br className="hidden md:block"/>
            <span className="text-[#ff690c]">competitor pricing</span> again.
          </h1>
          
          <p className="text-[17px] md:text-[19px] text-[#474747] mb-10 max-w-[640px] mx-auto leading-relaxed">
            Automatically monitor competitor prices, stock levels, and promotions. Built for founders who want to scale faster without the enterprise bloat.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/register">
              <ShimmerButton className="!h-[52px] !px-8 !rounded-[12px] !text-[15px] font-semibold flex items-center gap-2 bg-[#ff690c] hover:bg-[#e55e0b]">
                Start Monitoring Now
                <ArrowRight className="w-4 h-4" />
              </ShimmerButton>
            </Link>
            <Link href="/login" className="flex items-center justify-center bg-white text-black border border-[#ebebeb] shadow-sm px-8 h-[52px] rounded-[12px] font-medium text-[15px] hover:bg-slate-50 transition-colors">
              View Dashboard
            </Link>
          </div>
          <p className="mt-6 text-[13px] text-[#888]">No credit card required &bull; Setup in 2 minutes</p>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 bg-white border-y border-[#ebebeb]/60">
          <div className="max-w-[1180px] mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-[32px] md:text-[40px] font-bold text-black tracking-tight mb-4">Everything you need to win</h2>
              <p className="text-[17px] text-[#474747] max-w-[600px] mx-auto leading-relaxed">A hyper-focused toolset designed to give you the upper hand in your market.</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-[#fafafa] p-8 rounded-[20px] border border-[#ebebeb] hover:border-[#ff690c]/30 transition-colors group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#ff690c]/5 rounded-bl-[100px] -z-0" />
                <div className="relative z-10">
                  <div className="w-12 h-12 bg-white border border-[#ebebeb] shadow-sm text-black rounded-[12px] flex items-center justify-center mb-6 group-hover:scale-105 transition-transform duration-300">
                    <BarChart3 className="w-5 h-5 text-[#ff690c]" />
                  </div>
                  <h3 className="text-[19px] font-bold text-black mb-3 tracking-tight">Automated Tracking</h3>
                  <p className="text-[15px] text-[#474747] leading-relaxed">Track price movements over time. Spot trends, map out competitor strategies, and adjust your own pricing instantly.</p>
                </div>
              </div>
              <div className="bg-[#fafafa] p-8 rounded-[20px] border border-[#ebebeb] hover:border-[#ff690c]/30 transition-colors group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#ff690c]/5 rounded-bl-[100px] -z-0" />
                <div className="relative z-10">
                  <div className="w-12 h-12 bg-white border border-[#ebebeb] shadow-sm text-black rounded-[12px] flex items-center justify-center mb-6 group-hover:scale-105 transition-transform duration-300">
                    <Bell className="w-5 h-5 text-[#ff690c]" />
                  </div>
                  <h3 className="text-[19px] font-bold text-black mb-3 tracking-tight">Instant Alerts</h3>
                  <p className="text-[15px] text-[#474747] leading-relaxed">Get notified via Email or Slack the exact moment a competitor drops their price or runs out of stock.</p>
                </div>
              </div>
              <div className="bg-[#fafafa] p-8 rounded-[20px] border border-[#ebebeb] hover:border-[#ff690c]/30 transition-colors group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#ff690c]/5 rounded-bl-[100px] -z-0" />
                <div className="relative z-10">
                  <div className="w-12 h-12 bg-white border border-[#ebebeb] shadow-sm text-black rounded-[12px] flex items-center justify-center mb-6 group-hover:scale-105 transition-transform duration-300">
                    <Shield className="w-5 h-5 text-[#ff690c]" />
                  </div>
                  <h3 className="text-[19px] font-bold text-black mb-3 tracking-tight">Anti-Bot Scraping</h3>
                  <p className="text-[15px] text-[#474747] leading-relaxed">Our stealth engines bypass sophisticated bot protection so your data is always fresh, accurate, and reliable.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-24 bg-[#fafafa]">
          <div className="max-w-[1180px] mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-[32px] md:text-[40px] font-bold text-black tracking-tight mb-4">Simple pricing, no surprises</h2>
              <p className="text-[17px] text-[#474747] max-w-[600px] mx-auto leading-relaxed">Start for free, upgrade when you need more power.</p>
            </div>
            
            <div className="flex justify-center w-full max-w-4xl mx-auto">
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

      <footer className="bg-white border-t border-[#ebebeb] py-12 px-6">
        <div className="max-w-[1180px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="font-bold text-lg text-black flex items-center gap-2">
            <div className="w-6 h-6 rounded-[5px] bg-[#ff690c] flex items-center justify-center text-white">
              <Zap className="w-3 h-3 fill-current" />
            </div>
            PriceAndSee
          </div>
          <p className="text-[14px] text-[#888] font-medium">&copy; {new Date().getFullYear()} PriceAndSee. Built for scale.</p>
        </div>
      </footer>
    </div>
  );
}
