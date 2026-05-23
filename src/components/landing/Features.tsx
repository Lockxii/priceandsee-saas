"use client";

import { motion } from "framer-motion";
import { BarChart3, Bell, Shield, Zap, RefreshCw, LineChart } from "lucide-react";

const features = [
  {
    icon: <RefreshCw className="w-6 h-6 text-[#ff690c]" />,
    title: "Données en temps réel",
    description: "Actualisation continue des prix de vos concurrents. Vous êtes toujours le premier informé des changements tarifaires sur votre marché."
  },
  {
    icon: <Bell className="w-6 h-6 text-[#ff690c]" />,
    title: "Alertes intelligentes",
    description: "Recevez des notifications instantanées via Email ou Slack dès qu'un concurrent baisse son prix ou tombe en rupture de stock."
  },
  {
    icon: <Shield className="w-6 h-6 text-[#ff690c]" />,
    title: "Contournement antibot",
    description: "Notre moteur de scraping contourne les protections antibot complexes (Cloudflare, Datadome) pour vous garantir des données 100% fiables."
  },
  {
    icon: <LineChart className="w-6 h-6 text-[#ff690c]" />,
    title: "Historique & Tendances",
    description: "Visualisez l'évolution des prix sur 12 mois. Identifiez les stratégies promotionnelles récurrentes de vos adversaires."
  }
];

export function Features() {
  return (
    <section id="features" className="py-32 bg-white border-y border-[#ebebeb]/60 overflow-hidden">
      <div className="max-w-[1180px] mx-auto px-6">
        <div className="text-center mb-20">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-[36px] md:text-[48px] font-bold text-black tracking-tight mb-6"
          >
            L'arsenal complet pour <br className="hidden sm:block" />
            <span className="text-[#ff690c]">dominer votre marché</span>
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-[18px] text-[#474747] max-w-[600px] mx-auto leading-relaxed"
          >
            Une plateforme ultra-rapide et focalisée sur l'essentiel. Pas de fonctionnalités inutiles, juste des données actionnables.
          </motion.p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8">
          {features.map((feature, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="bg-[#fafafa] p-10 rounded-[24px] border border-[#ebebeb] hover:border-[#ff690c]/40 transition-colors group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-[#ff690c]/5 to-transparent rounded-bl-[100px] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10">
                <div className="w-14 h-14 bg-white border border-[#ebebeb] shadow-sm rounded-[14px] flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-[22px] font-bold text-black mb-3 tracking-tight">{feature.title}</h3>
                <p className="text-[16px] text-[#474747] leading-relaxed">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
