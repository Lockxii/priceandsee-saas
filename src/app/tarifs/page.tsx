import Link from "next/link";
import { Zap } from "lucide-react";
import { pricingPlans } from "@/components/landing/pricing-data";

export default function TarifsPage() {
  return (
    <div className="min-h-screen bg-[#fafafa] font-sans text-black">
      <header className="sticky top-0 z-40 h-[76px] border-b border-[#ebebeb] bg-white/95 backdrop-blur-[16px]">
        <div className="max-w-[1180px] mx-auto px-6 h-full flex items-center justify-between">
          <Link href="/" className="font-bold text-[22px] tracking-tight flex items-center gap-2">
            <div className="w-8 h-8 rounded-[8px] bg-[#ff690c] flex items-center justify-center text-white shadow-[0_2px_8px_rgba(255,105,12,0.3)]">
              <Zap className="w-[18px] h-[18px] fill-white stroke-none" />
            </div>
            PriceAndSee
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-[15px] font-medium text-[#474747] hover:text-black transition-colors">
              Retour à l'accueil
            </Link>
            <Link href="/register" className="flex items-center justify-center h-[40px] px-6 rounded-[8px] bg-[#ff690c] text-white text-[14px] font-semibold whitespace-nowrap shadow-[0_2px_12px_rgb(255,105,12,0.35)] hover:bg-[#e55e0b] transition-colors">
              Essai gratuit
            </Link>
          </div>
        </div>
      </header>

      <main className="py-8 md:py-10">
        <section className="max-w-[1180px] mx-auto px-6">
          <div className="text-center mb-10">
            <span className="text-[#ff690c] font-bold text-[13px] uppercase tracking-wider mb-2 block">Tarif</span>
            <h1 className="text-[36px] md:text-[52px] font-bold text-[#35251c] tracking-tight leading-[1.02] mb-4">
              Une tarification simple pour
              <br className="hidden md:block" />
              surveiller vos concurrents
            </h1>
            <p className="text-[16px] text-[#474747] max-w-[720px] mx-auto leading-relaxed">
              Une première offre à 19€/mois pour suivre 10 URLs concurrentes, puis des plans plus rapides quand votre catalogue grandit.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6 max-w-[1060px] mx-auto">
            {pricingPlans.map((plan) => (
              <div
                key={plan.name}
                className={`relative bg-white rounded-[22px] p-6 flex flex-col ${
                  plan.popular
                    ? "border-2 border-[#ff690c] shadow-[0_20px_50px_-15px_rgba(255,105,12,0.15)]"
                    : "border border-[#ebebeb] shadow-sm"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#ff690c] text-white px-4 py-1.5 rounded-full text-[12px] font-bold tracking-wide shadow-sm whitespace-nowrap">
                    Le plus populaire
                  </div>
                )}

                <div className="mb-5">
                  <h2 className="text-[25px] font-bold mb-2">{plan.name}</h2>
                  <p className="text-[15px] text-[#474747] leading-relaxed min-h-[72px]">{plan.description}</p>
                </div>

                <div className="mb-2 flex items-end gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[46px] font-[800] text-[#ff690c] tracking-tighter leading-none">
                      {plan.monthlyPrice}€
                    </span>
                    <span className="rounded-full bg-[#fff2e8] px-2.5 py-1 text-[11px] font-bold text-[#ff690c]">
                      -20% annuel
                    </span>
                  </div>
                  <span className="text-[15px] font-medium text-[#888] pb-2">/mois</span>
                </div>
                <p className="text-[12px] text-[#888] mb-5">
                  Passe à {plan.yearlyPrice}€/mois avec -20% en facturation annuelle.
                </p>

                <Link href="/register" className="w-full mb-5">
                  <button
                    className={`w-full h-[46px] rounded-[12px] font-semibold text-[15px] transition-all ${
                      plan.popular
                        ? "bg-[#ff690c] text-white hover:bg-[#e55e0b] shadow-[0_4px_12px_rgba(255,105,12,0.28)]"
                        : "bg-white text-black border border-[#ebebeb] hover:bg-slate-50"
                    }`}
                  >
                    Commencer gratuitement
                  </button>
                </Link>

                <div className="w-full h-px bg-[#ebebeb] mb-5" />

                <ul className="space-y-3 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature.label} className="flex items-start justify-between gap-4 text-[13px]">
                      <span className="text-[#474747]">{feature.label}</span>
                      <span className={`font-semibold text-right ${feature.highlight ? "text-[#ff690c]" : feature.included ? "text-black" : "text-[#888]"}`}>
                        {feature.value}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Massive Brand Wordmark Section */}
      <div className="w-full bg-white overflow-hidden flex justify-center items-end pt-10 relative select-none pointer-events-none">
        <svg
          aria-hidden="true"
          viewBox="0 0 1500 235"
          className="relative z-0 w-[138vw] max-w-none h-auto -mb-7"
        >
          <defs>
            <linearGradient id="pricing-wordmark-gradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#ff690c" stopOpacity="0.12" />
              <stop offset="58%" stopColor="#ff690c" stopOpacity="0.24" />
              <stop offset="100%" stopColor="#ff690c" stopOpacity="0.42" />
            </linearGradient>
            <filter id="pricing-wordmark-outer-line">
              <feMorphology in="SourceGraphic" operator="dilate" radius="1.35" result="expanded" />
            </filter>
          </defs>

          <text
            x="50%"
            y="76%"
            textAnchor="middle"
            dominantBaseline="middle"
            fill="url(#pricing-wordmark-gradient)"
            filter="url(#pricing-wordmark-outer-line)"
            fontSize="228"
            fontWeight="900"
            letterSpacing="-12"
            fontFamily="var(--font-montserrat), sans-serif"
          >
            PRICEANDSEE
          </text>

          <text
            x="50%"
            y="76%"
            textAnchor="middle"
            dominantBaseline="middle"
            fill="white"
            fontSize="228"
            fontWeight="900"
            letterSpacing="-12"
            fontFamily="var(--font-montserrat), sans-serif"
          >
            PRICEANDSEE
          </text>
        </svg>
      </div>

      <footer className="bg-white border-t border-[#ebebeb] py-16 px-6 relative z-20">
        <div className="max-w-[1180px] mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="font-bold text-[20px] text-black flex items-center gap-2">
            <div className="w-7 h-7 rounded-[7px] bg-[#ff690c] flex items-center justify-center text-white">
              <Zap className="w-3 h-3 fill-current" />
            </div>
            PriceAndSee
          </div>
          <div className="flex gap-6 text-[14px] text-[#888] font-medium">
            <Link href="#" className="hover:text-black transition-colors">Mentions légales</Link>
            <Link href="#" className="hover:text-black transition-colors">Confidentialité</Link>
            <Link href="#" className="hover:text-black transition-colors">Contact</Link>
          </div>
          <p className="text-[14px] text-[#888] font-medium">&copy; {new Date().getFullYear()} PriceAndSee. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
}
