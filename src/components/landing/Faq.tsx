"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    q: "Puis-je tracker des sites comme Amazon ou Cdiscount ?",
    a: "Absolument. Notre moteur de scraping intègre une technologie de contournement antibot (proxies résidentiels, headers rotatifs) qui permet d'extraire les données des plus gros sites e-commerce sans blocage."
  },
  {
    q: "Quelle est la fréquence de mise à jour des prix ?",
    a: "Cela dépend de votre plan. Le plan Starter met à jour les données une fois par jour. Les plans Growth et Pro permettent des actualisations toutes les 4 heures ou même toutes les heures."
  },
  {
    q: "Puis-je être notifié uniquement si le prix baisse ?",
    a: "Oui, vous pouvez configurer des alertes personnalisées pour ne recevoir un email ou un ping Slack que lorsque le concurrent baisse son prix ou tombe en rupture de stock."
  },
  {
    q: "L'outil est-il complexe à configurer ?",
    a: "Pas du tout. Il vous suffit de coller l'URL du produit concurrent. Notre algorithme identifie automatiquement le prix, le titre et l'état du stock sur la page."
  }
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="py-32 bg-white border-t border-[#ebebeb]/60">
      <div className="max-w-[800px] mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-[32px] md:text-[40px] font-bold text-black tracking-tight mb-4">Questions fréquentes</h2>
          <p className="text-[17px] text-[#474747]">Tout ce que vous devez savoir sur PriceAndSee.</p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div key={i} className="border border-[#ebebeb] rounded-[16px] overflow-hidden bg-[#fafafa]">
              <button 
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full px-6 py-5 flex justify-between items-center text-left hover:bg-[#f5f5f5] transition-colors"
              >
                <span className="font-bold text-[16px] text-black">{faq.q}</span>
                <ChevronDown className={`w-5 h-5 text-[#888] transition-transform duration-300 ${open === i ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {open === i && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="px-6 pb-6 text-[#474747] text-[15px] leading-relaxed">
                      {faq.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
