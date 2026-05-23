"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { CheckCircle2, Link as LinkIcon, Radar, Bell, ArrowRight, X } from "lucide-react";
import { useState } from "react";

export function OnboardingCard({ show }: { show: boolean }) {
  const [visible, setVisible] = useState(show);
  const [loading, setLoading] = useState(false);

  if (!visible) return null;

  const complete = async () => {
    setLoading(true);
    await fetch("/api/onboarding/complete", { method: "POST" });
    setVisible(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="relative overflow-hidden rounded-[28px] border border-[#ffd7bd] bg-gradient-to-br from-white via-[#fff8f2] to-[#fff2e8] p-7 shadow-[0_24px_70px_-45px_rgba(255,105,12,0.7)]"
    >
      <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#ff690c]/10 blur-3xl" />
      <button
        type="button"
        onClick={complete}
        className="absolute right-5 top-5 rounded-full p-2 text-[#8a7668] hover:bg-white/80 hover:text-[#24170f] transition-colors"
        aria-label="Fermer l'onboarding"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="relative max-w-4xl">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#ffd7bd] bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[#ff690c]">
          <CheckCircle2 className="h-4 w-4" /> Setup rapide
        </div>
        <h2 className="text-2xl md:text-3xl font-[800] tracking-tight text-[#24170f]">
          Bienvenue sur PriceAndSee — ajoute ton premier concurrent.
        </h2>
        <p className="mt-2 max-w-2xl text-sm md:text-base text-[#6f5a4d]">
          Colle une URL produit, lance une première vérification, puis laisse le monitoring suivre les prix, stocks et promos pour toi.
        </p>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {[
            { icon: LinkIcon, title: "1. Ajoute une URL", text: "Un produit concurrent Shopify, Amazon ou boutique niche." },
            { icon: Radar, title: "2. Lance le check", text: "On extrait prix, titre, stock et signaux promo." },
            { icon: Bell, title: "3. Surveille les changements", text: "Historique prix + alertes prêtes à brancher." },
          ].map((step) => (
            <div key={step.title} className="rounded-2xl border border-[#f1ded1] bg-white/80 p-4">
              <step.icon className="mb-3 h-5 w-5 text-[#ff690c]" />
              <p className="font-bold text-[#24170f]">{step.title}</p>
              <p className="mt-1 text-sm text-[#6f5a4d]">{step.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link href="/dashboard/products" className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#ff690c] px-5 text-sm font-bold text-white shadow-[0_10px_28px_-12px_rgba(255,105,12,0.8)] hover:bg-[#e55e0b]">
            Ajouter ma première URL <ArrowRight className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={complete}
            disabled={loading}
            className="inline-flex h-11 items-center justify-center rounded-full border border-[#f1ded1] bg-white px-5 text-sm font-bold text-[#5b4638] hover:bg-[#fff8f2] disabled:opacity-60"
          >
            {loading ? "Validation..." : "J’ai compris"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
