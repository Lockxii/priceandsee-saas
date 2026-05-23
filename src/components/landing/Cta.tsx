"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function Cta() {
  return (
    <section className="relative overflow-hidden py-32 bg-white flex flex-col items-center justify-center border-t border-[#ebebeb]/60">
      {/* Concentric Circles Background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[1400px] h-[1400px] pointer-events-none z-0 flex items-center justify-center">
        <div className="absolute w-[300px] h-[300px] rounded-full border border-[#ff690c]/5" />
        <div className="absolute w-[500px] h-[500px] rounded-full border border-[#ff690c]/5" />
        <div className="absolute w-[700px] h-[700px] rounded-full border border-[#ff690c]/5" />
        <div className="absolute w-[900px] h-[900px] rounded-full border border-[#ff690c]/5" />
        <div className="absolute w-[1100px] h-[1100px] rounded-full border border-[#ff690c]/5" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#ff690c]/[0.02] rounded-full blur-[80px]" />
      </div>

      <div className="relative z-10 text-center max-w-[800px] px-6 mx-auto flex flex-col items-center">
        <motion.span 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-[#ff690c] font-bold text-[14px] uppercase tracking-wider mb-6 block"
        >
          Commencez gratuitement
        </motion.span>
        
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-[36px] md:text-[52px] font-bold text-[#35251c] tracking-tight leading-[1.1] mb-6"
        >
          Prêt à voir exactement <br className="hidden sm:block" />
          ce qui fonctionne ?
        </motion.h2>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="text-[17px] md:text-[19px] text-[#474747] mb-10 max-w-[500px] mx-auto leading-relaxed"
        >
          Chaque jour sans PriceAndSee, c'est un jour où vos concurrents ont une longueur d'avance.
        </motion.p>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          <Link href="/register">
            <button className="flex items-center justify-center gap-2 bg-[#ff690c] text-white px-8 h-[52px] rounded-full font-bold text-[15px] hover:bg-[#e55e0b] transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_8px_24px_-8px_rgb(255,105,12,0.6)]">
              Commencer gratuitement
              <ArrowRight className="w-5 h-5" />
            </button>
          </Link>
          <Link href="/tarifs">
            <button className="flex items-center justify-center bg-white text-[#35251c] border border-[#ebebeb] shadow-sm px-8 h-[52px] rounded-full font-bold text-[15px] hover:bg-slate-50 transition-colors">
              Voir les tarifs
            </button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
