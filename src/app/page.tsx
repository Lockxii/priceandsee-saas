import Link from "next/link";
import { Zap } from "lucide-react";
import { Hero } from "@/components/landing/Hero";
import { Stats } from "@/components/landing/Stats";
import { Testimonials } from "@/components/landing/Testimonials";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Features } from "@/components/landing/Features";
import { Faq } from "@/components/landing/Faq";
import { Cta } from "@/components/landing/Cta";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col font-sans selection:bg-[#ff690c] selection:text-white overflow-x-hidden">
      {/* Header */}
      <header className="fixed top-0 left-0 z-50 flex h-[76px] w-full items-center border-b border-[#ebebeb] bg-white/95 backdrop-blur-[16px] supports-[backdrop-filter]:bg-white/80">
        <div className="w-full max-w-[1180px] mx-auto px-6 flex justify-between items-center relative">
          
          <Link href="/" className="font-bold text-[22px] text-black tracking-tight flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-[8px] bg-[#ff690c] flex items-center justify-center text-white shadow-[0_2px_8px_rgba(255,105,12,0.3)]">
              <Zap className="w-[18px] h-[18px] fill-white stroke-none" />
            </div>
            PriceAndSee
          </Link>
          
          <nav className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center justify-center rounded-full border border-[#ebebeb] bg-white p-1.5 shadow-[0_2px_15px_rgba(0,0,0,0.04)]">
            <Link href="#how-it-works" className="text-[#474747] hover:bg-[#fafafa] hover:text-black relative flex h-9 items-center rounded-full px-6 text-[14px] font-medium transition-colors">Comment ça marche</Link>
            <Link href="#features" className="text-[#474747] hover:bg-[#fafafa] hover:text-black relative flex h-9 items-center rounded-full px-6 text-[14px] font-medium transition-colors">Fonctionnalités</Link>
            <Link href="/tarifs" className="text-[#474747] hover:bg-[#fafafa] hover:text-black relative flex h-9 items-center rounded-full px-6 text-[14px] font-medium transition-colors">Tarifs</Link>
          </nav>

          <div className="flex gap-6 items-center">
            <Link href="/login" className="hidden sm:block text-[15px] font-medium text-[#474747] hover:text-black transition-colors">Connexion</Link>
            <Link href="/register" className="flex items-center justify-center h-[40px] px-6 rounded-[8px] bg-[#ff690c] text-white text-[14px] font-semibold whitespace-nowrap shadow-[0_2px_12px_rgb(255,105,12,0.35)] hover:bg-[#e55e0b] transition-colors">
              Essai gratuit
            </Link>
          </div>
          
        </div>
      </header>

      <main className="flex-1 pt-[76px]">
        <Hero />
        <Stats />
        <Testimonials />
        <div id="how-it-works"><HowItWorks /></div>
        <Features />
        <Faq />
        <Cta />
      </main>

      {/* Massive Brand Wordmark Section */}
      <div className="w-full bg-white overflow-hidden flex justify-center items-end pt-10 relative select-none pointer-events-none">
        <svg
          aria-hidden="true"
          viewBox="0 0 1500 235"
          className="relative z-0 w-[138vw] max-w-none h-auto -mb-7"
        >
          <defs>
            <linearGradient id="footer-wordmark-gradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#ff690c" stopOpacity="0.12" />
              <stop offset="58%" stopColor="#ff690c" stopOpacity="0.24" />
              <stop offset="100%" stopColor="#ff690c" stopOpacity="0.42" />
            </linearGradient>
            <filter id="footer-wordmark-outer-line">
              <feMorphology in="SourceGraphic" operator="dilate" radius="1.35" result="expanded" />
            </filter>
          </defs>

          <text
            x="50%"
            y="76%"
            textAnchor="middle"
            dominantBaseline="middle"
            fill="url(#footer-wordmark-gradient)"
            filter="url(#footer-wordmark-outer-line)"
            fontSize="228"
            fontWeight="900"
            letterSpacing="-12"
            fontFamily="var(--font-montserrat), sans-serif"
          >
            PRICEANDSEE
          </text>

          <text
            x="50%"
            y="76%"
            textAnchor="middle"
            dominantBaseline="middle"
            fill="white"
            fontSize="228"
            fontWeight="900"
            letterSpacing="-12"
            fontFamily="var(--font-montserrat), sans-serif"
          >
            PRICEANDSEE
          </text>
        </svg>
      </div>

      <footer className="bg-white border-t border-[#ebebeb] py-16 px-6 relative z-20">
        <div className="max-w-[1180px] mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="font-bold text-[20px] text-black flex items-center gap-2">
            <div className="w-7 h-7 rounded-[7px] bg-[#ff690c] flex items-center justify-center text-white">
              <Zap className="w-3 h-3 fill-current" />
            </div>
            PriceAndSee
          </div>
          <div className="flex gap-6 text-[14px] text-[#888] font-medium">
            <Link href="#" className="hover:text-black transition-colors">Mentions légales</Link>
            <Link href="#" className="hover:text-black transition-colors">Confidentialité</Link>
            <Link href="#" className="hover:text-black transition-colors">Contact</Link>
          </div>
          <p className="text-[14px] text-[#888] font-medium">&copy; {new Date().getFullYear()} PriceAndSee. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
}
