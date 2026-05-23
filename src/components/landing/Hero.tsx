"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-32 pb-24 md:pt-48 md:pb-32 px-6 text-center max-w-[1180px] mx-auto flex flex-col items-center">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#ff690c]/[0.08] rounded-full blur-[120px] pointer-events-none -z-10" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#ebebeb] bg-white/50 backdrop-blur-sm text-[#474747] text-[13px] font-medium mb-8 shadow-sm"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff690c] opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ff690c]"></span>
        </span>
        V2 is now live for everyone
      </motion.div>
      
      <motion.h1 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="text-[48px] md:text-[76px] font-[800] text-black tracking-[-0.03em] leading-[1.05] mb-8 max-w-5xl"
      >
        L'intelligence tarifaire, <br className="hidden md:block"/>
        <span className="text-[#ff690c] relative">
          simplifiée à l'extrême.
          <motion.svg className="absolute w-full h-4 -bottom-1 left-0 text-[#ff690c]/20" viewBox="0 0 100 10" preserveAspectRatio="none">
             <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="4" fill="transparent" />
          </motion.svg>
        </span>
      </motion.h1>
      
      <motion.p 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="text-[18px] md:text-[21px] text-[#474747] mb-12 max-w-[680px] mx-auto leading-relaxed"
      >
        Surveillez automatiquement les prix, les stocks et les promotions de vos concurrents. Conçu pour les e-commerçants qui veulent dominer leur marché.
      </motion.p>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="flex flex-col sm:flex-row gap-4 justify-center items-center"
      >
        <Link href="/register">
          <button className="flex items-center justify-center gap-2 bg-[#ff690c] text-white px-8 h-[54px] rounded-[14px] font-semibold text-[16px] hover:bg-[#e55e0b] transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_8px_24px_-8px_rgb(255,105,12,0.6)]">
            Démarrer l'essai gratuit
            <ArrowRight className="w-5 h-5" />
          </button>
        </Link>
        <Link href="#pricing" className="flex items-center justify-center bg-white text-black border border-[#ebebeb] shadow-sm px-8 h-[54px] rounded-[14px] font-semibold text-[16px] hover:bg-slate-50 transition-colors">
          Voir les tarifs
        </Link>
      </motion.div>
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="mt-6 text-[14px] text-[#888] font-medium"
      >
        Aucune carte de crédit requise &bull; Setup en 2 minutes
      </motion.p>

      {/* Dashboard Mockup Showcase */}
      <motion.div 
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.6 }}
        className="w-full max-w-[1000px] mt-24 relative"
      >
        <div className="absolute inset-0 bg-gradient-to-t from-[#fafafa] via-transparent to-transparent z-10" />
        <div className="rounded-[24px] border border-[#ebebeb] bg-white p-2 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] overflow-hidden">
          <div className="rounded-[16px] border border-[#ebebeb]/50 bg-[#fafafa] h-[300px] md:h-[500px] w-full flex items-center justify-center relative overflow-hidden">
            {/* Fake dashboard UI */}
            <div className="absolute top-0 left-0 w-full h-[60px] border-b border-[#ebebeb] bg-white flex items-center px-6 gap-4">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              <div className="w-3 h-3 rounded-full bg-emerald-400" />
            </div>
            <div className="mt-[60px] w-full h-full p-8 flex flex-col gap-6">
              <div className="w-full flex gap-6">
                <div className="h-32 w-1/3 bg-white rounded-xl border border-[#ebebeb] shadow-sm p-5 flex flex-col justify-between">
                  <div className="w-20 h-4 bg-slate-100 rounded-full" />
                  <div className="w-32 h-8 bg-slate-200 rounded-md" />
                </div>
                <div className="h-32 w-1/3 bg-white rounded-xl border border-[#ebebeb] shadow-sm p-5 flex flex-col justify-between">
                  <div className="w-24 h-4 bg-slate-100 rounded-full" />
                  <div className="w-16 h-8 bg-[#ff690c]/20 rounded-md" />
                </div>
                <div className="h-32 w-1/3 bg-white rounded-xl border border-[#ebebeb] shadow-sm p-5 flex flex-col justify-between">
                  <div className="w-16 h-4 bg-slate-100 rounded-full" />
                  <div className="w-24 h-8 bg-slate-200 rounded-md" />
                </div>
              </div>
              <div className="w-full h-full bg-white rounded-xl border border-[#ebebeb] shadow-sm p-6">
                <div className="w-full h-full border-b-2 border-dashed border-slate-100 relative">
                  <svg className="absolute bottom-0 w-full h-[150px]" preserveAspectRatio="none" viewBox="0 0 100 100">
                    <path d="M0,100 C20,80 30,90 50,40 C70,-10 80,60 100,20 L100,100 Z" fill="rgba(255,105,12,0.1)" />
                    <path d="M0,100 C20,80 30,90 50,40 C70,-10 80,60 100,20" fill="none" stroke="#ff690c" strokeWidth="2" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
