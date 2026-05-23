"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Star, Clock, TrendingUp } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden min-h-[calc(100vh-70px)] pt-20 pb-20 w-full flex flex-col items-center justify-center border-b border-[#ebebeb]/60">
      
      {/* Background Grid Lines (Whoscale style) */}
      <div className="absolute inset-0 w-full h-full pointer-events-none z-0 flex justify-center">
        {/* Horizontal top line */}
        <div className="absolute top-[80px] w-full h-[1px] bg-gradient-to-r from-transparent via-[#ff690c]/30 to-transparent" />
        
        {/* Center column container for vertical lines */}
        <div className="relative w-full max-w-[1180px] h-full border-x border-[#ff690c]/20" />
      </div>

      {/* Background Animated Blurs */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[1000px] h-[600px] pointer-events-none z-0 overflow-hidden">
        <motion.div 
          animate={{ 
            x: [0, 60, 0, -60, 0],
            y: [0, -40, 0, 40, 0],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          className="absolute top-[20%] left-[20%] w-[500px] h-[500px] bg-[#ff690c]/[0.08] rounded-full blur-[100px]" 
        />
        <motion.div 
          animate={{ 
            x: [0, -60, 0, 60, 0],
            y: [0, 40, 0, -40, 0],
          }}
          transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[20%] right-[20%] w-[400px] h-[400px] bg-[#ffeed1]/[0.4] rounded-full blur-[100px]" 
        />
      </div>
      
      <div className="relative z-10 text-center max-w-[1000px] px-6 mx-auto flex flex-col items-center">
        
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-[40px] sm:text-[48px] md:text-[52px] lg:text-[62px] font-[800] tracking-tight leading-[1.05] mb-8 relative z-10"
        >
          <span className="text-black relative inline-block md:whitespace-nowrap">
            Trouvez les prix, stocks &amp; promotions
            
            {/* Badge floating overlapping the end of the text */}
            <motion.span 
              initial={{ opacity: 0, rotate: -15, scale: 0.8 }}
              animate={{ opacity: 1, rotate: -3, scale: 1 }}
              transition={{ delay: 0.8, type: "spring", stiffness: 200 }}
              className="absolute -bottom-1 right-[10%] md:-bottom-2 md:right-[15%] inline-flex items-center justify-center bg-gradient-to-br from-[#ff690c] to-[#e55e0b] text-white px-3 py-1 md:px-4 md:py-1.5 rounded-[8px] text-[10px] md:text-[13px] font-bold tracking-widest uppercase shadow-[0_4px_14px_rgba(255,105,12,0.4)] border border-white/20 pointer-events-none select-none z-20"
              style={{ rotate: '-3deg' }}
            >
              &amp; EN TEMPS-RÉEL
            </motion.span>
          </span>
          <br className="hidden md:block"/>
          
          <span className="text-black mt-2 inline-block">qui scalent </span>
          <span className="italic font-medium text-[#474747] ml-2">en ce moment.</span>
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
