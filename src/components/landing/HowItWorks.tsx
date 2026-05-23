"use client";

import { motion } from "framer-motion";
import { Link2, Search, BellRing } from "lucide-react";

export function HowItWorks() {
  return (
    <section className="py-32 bg-white overflow-hidden relative">
      <div className="max-w-[1180px] mx-auto px-6">
        <div className="text-center mb-20">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-[36px] md:text-[48px] font-bold text-black tracking-tight mb-6"
          >
            Comment ça marche ?
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-[18px] text-[#474747] max-w-[600px] mx-auto"
          >
            Trois étapes simples pour ne plus jamais vous faire distancer.
          </motion.p>
        </div>

        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-12 md:gap-0 mt-16 max-w-5xl mx-auto">
          {/* Animated Dashed Line (Desktop) */}
          <div className="hidden md:block absolute top-[40px] left-[15%] right-[15%] h-[2px] z-0 overflow-hidden">
             <motion.div
               animate={{ x: ["-100%", "100%"] }}
               transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
               className="w-full h-full"
               style={{
                 backgroundImage: "linear-gradient(90deg, #ff690c 50%, transparent 50%)",
                 backgroundSize: "20px 2px"
               }}
             />
          </div>

          {/* Animated Dashed Line (Mobile) */}
          <div className="md:hidden absolute left-[40px] top-[15%] bottom-[15%] w-[2px] z-0 overflow-hidden">
             <motion.div
               animate={{ y: ["-100%", "100%"] }}
               transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
               className="w-full h-full"
               style={{
                 backgroundImage: "linear-gradient(180deg, #ff690c 50%, transparent 50%)",
                 backgroundSize: "2px 20px"
               }}
             />
          </div>

          {/* Step 1 */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative z-10 flex flex-col items-center text-center max-w-[280px] w-full"
          >
            <div className="w-20 h-20 rounded-full bg-white border-2 border-[#ebebeb] shadow-lg flex items-center justify-center mb-6 relative">
              <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-[#ff690c] text-white flex items-center justify-center font-bold text-[14px]">1</div>
              <Link2 className="w-8 h-8 text-black" />
            </div>
            <h3 className="text-[20px] font-bold text-black mb-3">Entrez un lien</h3>
            <p className="text-[15px] text-[#474747]">Copiez-collez l'URL d'un produit concurrent ou de toute sa boutique.</p>
          </motion.div>

          {/* Step 2 */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="relative z-10 flex flex-col items-center text-center max-w-[280px] w-full"
          >
            <div className="w-20 h-20 rounded-full bg-white border-2 border-[#ff690c] shadow-[0_0_20px_rgba(255,105,12,0.3)] flex items-center justify-center mb-6 relative scale-110">
              <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-[#ff690c] text-white flex items-center justify-center font-bold text-[14px]">2</div>
              <Search className="w-8 h-8 text-[#ff690c]" />
            </div>
            <h3 className="text-[20px] font-bold text-black mb-3">On tracke le site</h3>
            <p className="text-[15px] text-[#474747]">Nos algorithmes surveillent les prix, ruptures et changements de copy h24.</p>
          </motion.div>

          {/* Step 3 */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="relative z-10 flex flex-col items-center text-center max-w-[280px] w-full"
          >
            <div className="w-20 h-20 rounded-full bg-white border-2 border-[#ebebeb] shadow-lg flex items-center justify-center mb-6 relative">
              <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-[#ff690c] text-white flex items-center justify-center font-bold text-[14px]">3</div>
              <BellRing className="w-8 h-8 text-black" />
            </div>
            <h3 className="text-[20px] font-bold text-black mb-3">Recevez vos alertes</h3>
            <p className="text-[15px] text-[#474747]">Soyez notifié sur Slack ou par Email dès qu'un mouvement est détecté.</p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
