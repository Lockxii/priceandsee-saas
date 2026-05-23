"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Star, Clock, TrendingUp } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-28 pb-32 md:pt-40 md:pb-40 w-full flex flex-col items-center border-b border-[#ebebeb]/60">
      
      {/* Background Grid Lines (Whoscale style) */}
      <div className="absolute inset-0 w-full h-full pointer-events-none z-0 flex justify-center">
        {/* Horizontal top line */}
        <div className="absolute top-[80px] w-full h-[1px] bg-gradient-to-r from-transparent via-[#ff690c]/30 to-transparent" />
        
        {/* Center column container for vertical lines */}
        <div className="relative w-full max-w-[900px] h-full border-x border-[#ff690c]/20" />
      </div>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] bg-[#ff690c]/[0.05] rounded-full blur-[120px] pointer-events-none z-0" />
      
      <div className="relative z-10 text-center max-w-[1000px] px-6 mx-auto flex flex-col items-center">
        
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-[44px] sm:text-[56px] md:text-[72px] font-[800] text-black tracking-tight leading-[1.05] mb-8"
        >
          Trouvez les <span className="text-[#ff690c]">Prix, Stocks &amp;</span> <br className="hidden md:block"/>
          <span className="text-[#ff690c]">Promotions</span> qui scalent <span className="italic font-serif font-medium text-[#474747]">en ce moment.</span>
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
          className="text-[18px] md:text-[21px] font-medium text-[#474747] mb-12 max-w-[680px] mx-auto leading-relaxed"
        >
          L'outil de veille concurrentielle pour le marché du e-commerce.<br className="hidden md:block"/>
          Suivez exactement ce que font les meilleurs et reproduisez les stratégies qui fonctionnent.
        </motion.p>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8"
        >
          <Link href="/register">
            <button className="flex items-center justify-center gap-2 bg-[#ff690c] text-white px-8 h-[52px] rounded-full font-bold text-[15px] hover:bg-[#e55e0b] transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_8px_24px_-8px_rgb(255,105,12,0.6)]">
              Commencer gratuitement
              <ArrowRight className="w-5 h-5" />
            </button>
          </Link>
          <Link href="#pricing">
            <button className="flex items-center justify-center bg-white text-black border border-[#ebebeb] shadow-sm px-8 h-[52px] rounded-full font-bold text-[15px] hover:bg-slate-50 transition-colors">
              Réserver une démo
            </button>
          </Link>
        </motion.div>

        {/* Trust markers */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex flex-wrap justify-center items-center gap-6 text-[13px] font-semibold text-[#474747]"
        >
          <div className="flex items-center gap-1.5">
            <Star className="w-4 h-4 text-[#ff690c]" /> Top e-commerçants
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-[#ff690c]" /> Mises à jour quotidiennes
          </div>
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-[#ff690c]" /> Stratégies gagnantes
          </div>
        </motion.div>
      </div>
    </section>
  );
}
