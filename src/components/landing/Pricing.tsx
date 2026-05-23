"use client";

import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import Link from "next/link";

const plans = [
  {
    name: "Starter",
    price: "19",
    popular: false,
    features: [
      { label: "URLs trackées", value: "10", included: true },
      { label: "Actualisation", value: "Toutes les 24h", included: true },
      { label: "Historique", value: "30 jours", included: true },
      { label: "Alertes Slack", value: "Non inclus", included: false },
      { label: "Export CSV/API", value: "Non inclus", included: false }
    ]
  },
  {
    name: "Growth",
    price: "49",
    popular: true,
    features: [
      { label: "URLs trackées", value: "100", included: true },
      { label: "Actualisation", value: "Toutes les 4h", included: true, highlight: true },
      { label: "Historique", value: "Illimité", included: true, highlight: true },
      { label: "Alertes Slack", value: "Inclus", included: true },
      { label: "Export CSV/API", value: "Non inclus", included: false }
    ]
  },
  {
    name: "Pro",
    price: "99",
    popular: false,
    features: [
      { label: "URLs trackées", value: "500", included: true },
      { label: "Actualisation", value: "Toutes les 1h", included: true, highlight: true },
      { label: "Historique", value: "Illimité", included: true, highlight: true },
      { label: "Alertes Slack", value: "Inclus", included: true },
      { label: "Export CSV/API", value: "Inclus", included: true }
    ]
  }
];

export function Pricing() {
  return (
    <section id="pricing" className="py-24 bg-[#fafafa]">
      <div className="max-w-[1000px] mx-auto px-6">
        <div className="text-center mb-16">
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
            L'abonnement ultime pour votre <br className="hidden sm:block" />
            croissance
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-[16px] text-[#474747]"
          >
            Rentabilisez l'outil dès la première vente sauvée.
          </motion.p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6 max-w-[900px] mx-auto">
          {plans.map((plan, i) => (
            <motion.div 
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + (i * 0.1) }}
              className={`relative bg-white rounded-[20px] p-6 flex flex-col ${
                plan.popular 
                  ? 'border-2 border-[#ff690c] shadow-[0_8px_30px_rgba(255,105,12,0.12)] z-10 scale-105' 
                  : 'border border-[#ebebeb] shadow-sm mt-4 mb-4'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#ff690c] text-white px-4 py-1 rounded-full text-[12px] font-bold tracking-wide shadow-sm whitespace-nowrap">
                  Le plus populaire
                </div>
              )}
              
              <h3 className="text-[20px] font-bold text-black mb-4">{plan.name}</h3>
              
              <div className="mb-6 flex items-end gap-1">
                <span className="text-[42px] font-[800] text-[#ff690c] tracking-tighter leading-none">{plan.price}€</span>
                <span className="text-[13px] font-medium text-[#888] pb-1">/mois</span>
              </div>
              
              <Link href="/register" className="w-full mb-6">
                <button className={`w-full h-[44px] rounded-[10px] font-semibold text-[14px] flex items-center justify-center gap-2 transition-all ${
                  plan.popular 
                    ? 'bg-[#ff690c] text-white hover:bg-[#e55e0b] shadow-[0_4px_12px_rgba(255,105,12,0.3)]' 
                    : 'bg-white text-black border border-[#ebebeb] hover:bg-slate-50'
                }`}>
                  Commencer gratuitement
                  <span className="text-[16px] leading-none mb-[2px]">→</span>
                </button>
              </Link>

              <div className="w-full h-[1px] bg-[#ebebeb] mb-6" />
              
              <ul className="space-y-4 flex-1">
                {plan.features.map(f => (
                  <li key={f.label} className="flex justify-between items-center text-[13px]">
                    <div className="flex items-center gap-2">
                      {f.included ? (
                        <Check className="w-[14px] h-[14px] text-[#ff690c]" strokeWidth={3} />
                      ) : (
                        <X className="w-[14px] h-[14px] text-[#888]" strokeWidth={2} />
                      )}
                      <span className="text-[#474747]">{f.label}</span>
                    </div>
                    <span className={`font-semibold text-right ${f.highlight ? 'text-[#ff690c]' : 'text-black'} ${!f.included && 'text-[#888]'}`}>
                      {f.value}
                    </span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
