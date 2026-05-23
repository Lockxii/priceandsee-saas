import Link from "next/link";
import { Zap } from "lucide-react";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { Pricing } from "@/components/landing/Pricing";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col font-sans selection:bg-[#ff690c] selection:text-white">
      {/* Blurred Header */}
      <header className="fixed top-0 left-0 z-50 flex h-[70px] w-full items-center border-b border-[#ebebeb]/85 bg-white/70 backdrop-blur-[16px] supports-[backdrop-filter]:bg-white/60">
        <div className="w-full max-w-[1180px] mx-auto px-6 flex justify-between items-center">
          <Link href="/" className="font-bold text-[22px] text-black tracking-tight flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-[8px] bg-[#ff690c] flex items-center justify-center text-white shadow-sm">
              <Zap className="w-4 h-4 fill-current" />
            </div>
            PriceAndSee
          </Link>
          <nav className="hidden md:flex items-center justify-center rounded-full border border-[#ebebeb] bg-white/80 p-1 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
            <Link href="#features" className="text-[#474747] hover:bg-[#fff8f5] hover:text-black relative flex h-9 items-center rounded-full px-5 text-[14px] font-medium transition-colors">Fonctionnalités</Link>
            <Link href="#pricing" className="text-[#474747] hover:bg-[#fff8f5] hover:text-black relative flex h-9 items-center rounded-full px-5 text-[14px] font-medium transition-colors">Tarifs</Link>
          </nav>
          <div className="flex gap-3 items-center">
            <Link href="/login" className="hidden sm:block text-[14px] font-medium text-[#474747] hover:text-black transition-colors px-3">Connexion</Link>
            <Link href="/register" className="flex items-center gap-1.5 h-[36px] px-5 rounded-[10px] bg-[#ff690c] text-white text-[14px] font-medium whitespace-nowrap shadow-[0_2px_10px_rgb(255,105,12,0.3)] hover:opacity-90 transition-opacity">
              Essai gratuit
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 pt-[70px]">
        <Hero />
        <Features />
        <Pricing />
      </main>

      <footer className="bg-white border-t border-[#ebebeb] py-16 px-6">
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
