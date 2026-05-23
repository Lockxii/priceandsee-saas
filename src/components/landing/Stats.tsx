"use client";

import { motion } from "framer-motion";

const stats = [
  { value: "5M+", label: "PRIX TRACKÉS" },
  { value: "10k+", label: "E-COMMERÇANTS" },
  { value: "99%", label: "PRÉCISION" },
];

export function Stats() {
  return (
    <section className="w-full bg-[#fff2e8] border-b border-[#ebebeb] py-8 flex justify-center items-center">
      <div className="max-w-[1180px] w-full px-6 flex flex-col md:flex-row justify-center items-center gap-16 md:gap-32">
        {stats.map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className="flex flex-col items-center justify-center text-center"
          >
            <span className="text-[48px] md:text-[64px] font-[800] text-[#ff690c] tracking-tighter leading-none mb-2">
              {stat.value}
            </span>
            <span className="text-[13px] font-bold text-[#ff690c] tracking-widest uppercase opacity-80">
              {stat.label}
            </span>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
