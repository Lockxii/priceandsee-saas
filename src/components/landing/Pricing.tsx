"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import Link from "next/link";

const plans = [
  {
    name: "Starter",
    price: "19",
    description: "Parfait pour les petites boutiques et les niches.",
    features: [
      "Suivi de 10 URLs",
      "Actualisation quotidienne",
      "Alertes par Email",
      "Historique sur 30 jours",
      "Support standard"
    ]
  },
  {
    name: "Growth",
    price: "49",
    popular: true,
    description: "Pour les e-commerçants qui scalent agressivement.",
    features: [
      "Suivi de 100 URLs",
      "Actualisation toutes les 4 heures",
      "Alertes Email & Slack",
      "Historique illimité",
      "Export CSV/API",
      "Support prioritaire"
    ]
  },
  {
    name: "Pro",
    price: "99",
    description: "La puissance maximale pour les leaders du marché.",
    features: [
      "Suivi de 500 URLs",
      "Actualisation horaire",
      "Toutes les alertes",
      "Historique illimité",
      "Accès API illimité",
      "Gestionnaire de compte dédié"
    ]
  }
];

export function Pricing() {
  return (
    <section id="pricing" className="py-32 bg-[#fafafa]">
      <div className="max-w-[1180px] mx-auto px-6">
        <div className="text-center mb-20">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-[36px] md:text-[48px] font-bold text-black tracking-tight mb-6"
          >
            Une tarification simple, <br className="hidden sm:block" />
            sans mauvaises surprises
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-[18px] text-[#474747] max-w-[600px] mx-auto leading-relaxed"
          >
            Rentabilisez votre abonnement dès la première vente sauvée grâce à l'ajustement de vos prix.
          </motion.p>
        </div>
        
        <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, i) => (
            <motion.div 
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={`relative rounded-[24px] p-8 flex flex-col ${
                plan.popular 
                  ? 'bg-white border-2 border-[#ff690c] shadow-[0_20px_40px_-15px_rgba(255,105,12,0.15)] scale-105 z-10' 
                  : 'bg-white border border-[#ebebeb] shadow-sm'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#ff690c] text-white px-4 py-1 rounded-full text-[13px] font-bold tracking-wide uppercase shadow-sm">
                  Le plus choisi
                </div>
              )}
              
              <div className="mb-8">
                <h3 className="text-[20px] font-bold text-black mb-2">{plan.name}</h3>
                <p className="text-[15px] text-[#474747] h-10">{plan.description}</p>
              </div>
              
              <div className="mb-8">
                <span className="text-[48px] font-[800] text-black tracking-tight">{plan.price}€</span>
                <span className="text-[16px] font-medium text-[#888]">/mois</span>
              </div>
              
              <ul className="space-y-4 mb-10 flex-1">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-[#fff8f5] flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-[#ff690c] stroke-[3]" />
                    </div>
                    <span className="text-[15px] font-medium text-[#474747]">{f}</span>
                  </li>
                ))}
              </ul>
              
              <Link href="/register" className="mt-auto">
                <button className={`w-full h-[52px] rounded-[14px] font-semibold text-[15px] transition-all ${
                  plan.popular 
                    ? 'bg-[#ff690c] text-white hover:bg-[#e55e0b] shadow-[0_8px_20px_-8px_rgb(255,105,12,0.5)]' 
                    : 'bg-[#fafafa] text-black border border-[#ebebeb] hover:bg-slate-50'
                }`}>
                  Commencer avec {plan.name}
                </button>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
