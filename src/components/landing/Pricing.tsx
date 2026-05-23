"use client";

import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import Link from "next/link";
import { pricingPlans } from "@/components/landing/pricing-data";

export function Pricing() {
  return (
    <section id="pricing" className="py-24 bg-[#fafafa]">
      <div className="max-w-[1000px] mx-auto px-6">
        <div className="text-center mb-14">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[#ff690c] font-bold text-[14px] uppercase tracking-wider mb-4 block"
          >
            Tarif
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-[32px] md:text-[44px] font-bold text-[#35251c] tracking-tight mb-4"
          >
            Une offre simple pour démarrer,
            <br className="hidden sm:block" />
            des plans plus complets sur page dédiée
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-[16px] text-[#474747] max-w-[680px] mx-auto"
          >
            Commencez en quelques minutes, puis comparez tous les détails, limites et fréquences de rafraîchissement sur la page tarifs.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="max-w-[520px] mx-auto"
        >
          <div className="relative bg-white rounded-[24px] p-8 border-2 border-[#ff690c] shadow-[0_10px_35px_rgba(255,105,12,0.12)]">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#ff690c] text-white px-4 py-1 rounded-full text-[12px] font-bold tracking-wide shadow-sm whitespace-nowrap">
              Recommandé pour commencer
            </div>

            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h3 className="text-[24px] font-bold text-black mb-2">Growth</h3>
                <p className="text-[16px] text-[#474747] max-w-[280px]">
                  Pour les e-commerçants qui veulent des alertes utiles sans complexité.
                </p>
              </div>
              <div className="text-right">
                <div className="text-[48px] font-[800] text-[#ff690c] tracking-tighter leading-none">49€</div>
                <div className="text-[13px] font-medium text-[#888] mt-1">/mois</div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              {pricingPlans[1].features.map((f) => (
                <div key={f.label} className="flex items-center gap-3 rounded-[14px] border border-[#ebebeb] bg-[#fffdfa] px-4 py-3">
                  {f.included ? (
                    <Check className="w-[16px] h-[16px] text-[#ff690c] flex-shrink-0" strokeWidth={3} />
                  ) : (
                    <X className="w-[16px] h-[16px] text-[#888] flex-shrink-0" strokeWidth={2} />
                  )}
                  <div className="min-w-0">
                    <div className="text-[13px] text-[#666]">{f.label}</div>
                    <div className={`text-[14px] font-semibold ${f.highlight ? "text-[#ff690c]" : "text-black"}`}>
                      {f.value}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/register" className="flex-1">
                <button className="w-full h-[48px] rounded-[12px] bg-[#ff690c] text-white font-semibold text-[15px] hover:bg-[#e55e0b] transition-colors shadow-[0_4px_12px_rgba(255,105,12,0.25)]">
                  Commencer gratuitement
                </button>
              </Link>
              <Link href="/tarifs" className="flex-1">
                <button className="w-full h-[48px] rounded-[12px] bg-white text-black font-semibold text-[15px] border border-[#ebebeb] hover:bg-slate-50 transition-colors">
                  Voir tous les tarifs
                </button>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
