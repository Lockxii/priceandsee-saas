"use client";

import { Star } from "lucide-react";
import clsx from "clsx";

const row1 = [
  {
    name: "Thomas L.",
    role: "Fondateur E-commerce",
    text: "Incroyable. J'ai été alerté d'une baisse de prix de mon plus gros concurrent un dimanche. J'ai ajusté mon Shopify direct, j'ai récupéré 3 ventes dans la journée.",
    initials: "TL",
    color: "bg-blue-100 text-blue-600"
  },
  {
    name: "Sarah M.",
    role: "Gérante de boutique",
    text: "Avant, je passais mes lundis matins à vérifier les stocks de mes concurrents à la main. Maintenant, c'est Slack qui me prévient.",
    initials: "SM",
    color: "bg-emerald-100 text-emerald-600"
  },
  {
    name: "Julien P.",
    role: "Dropshipper",
    text: "Très propre. Pas d'usine à gaz, juste les données dont on a besoin en temps réel. Rentabilisé dès le premier mois.",
    initials: "JP",
    color: "bg-purple-100 text-purple-600"
  },
  {
    name: "Alexandre",
    role: "Tech Lead",
    text: "Le bypass antibot est bluffant. J'essayais de scraper un gros site depuis des mois, PriceAndSee le fait sans broncher.",
    initials: "A",
    color: "bg-amber-100 text-amber-600"
  },
  {
    name: "Marine",
    role: "CEO",
    text: "Le pricing est ultra honnête vu la valeur apportée. Ça fait exactement ce qu'on lui demande.",
    initials: "M",
    color: "bg-rose-100 text-rose-600"
  }
];

const row2 = [
  {
    name: "Nicolas D.",
    role: "Seller Amazon",
    text: "Je l'ai branché sur mes 50 top produits. Ça m'a permis d'identifier une tendance de promos récurrentes chez mon concurrent principal.",
    initials: "ND",
    color: "bg-indigo-100 text-indigo-600"
  },
  {
    name: "Emma",
    role: "CMO",
    text: "Support hyper réactif et interface intuitive. On a pu onboarder toute l'équipe marketing en 10 minutes chrono.",
    initials: "E",
    color: "bg-teal-100 text-teal-600"
  },
  {
    name: "Lucas B.",
    role: "Brand Manager",
    text: "Ça marche tout seul. On a connecté l'alerte Slack, et toute la boîte voit en direct quand un concurrent bouge ses prix.",
    initials: "LB",
    color: "bg-orange-100 text-orange-600"
  },
  {
    name: "Antoine",
    role: "Directeur E-commerce",
    text: "Le meilleur investissement de l'année. L'historique des prix est une mine d'or absolue pour nos périodes de soldes.",
    initials: "A",
    color: "bg-cyan-100 text-cyan-600"
  },
  {
    name: "Chloé F.",
    role: "Webmarketeuse",
    text: "Simple, efficace, direct. Les alertes mails m'ont évité de rater des ventes vitales pendant le Black Friday.",
    initials: "CF",
    color: "bg-pink-100 text-pink-600"
  }
];

function ReviewCard({ review }: { review: any }) {
  return (
    <div className="w-[350px] md:w-[400px] bg-white border border-[#ebebeb] rounded-[20px] p-6 shadow-sm flex-shrink-0 mx-3 flex flex-col gap-4">
      <div className="flex items-center gap-1 text-[#ff690c]">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className="w-4 h-4 fill-current" />
        ))}
      </div>
      <p className="text-[15px] text-[#474747] leading-relaxed flex-1">
        "{review.text}"
      </p>
      <div className="flex items-center gap-3 pt-2 border-t border-[#ebebeb]/60">
        <div className={clsx("w-10 h-10 rounded-full flex items-center justify-center font-bold text-[14px]", review.color)}>
          {review.initials}
        </div>
        <div>
          <div className="font-bold text-black text-[14px]">{review.name}</div>
          <div className="text-[13px] text-[#888]">{review.role}</div>
        </div>
      </div>
    </div>
  );
}

export function Testimonials() {
  // We duplicate the arrays to create a seamless infinite loop
  const topMarquee = [...row1, ...row1, ...row1];
  const bottomMarquee = [...row2, ...row2, ...row2];

  return (
    <section className="py-24 bg-[#fafafa] overflow-hidden flex flex-col items-center">
      <div className="text-center mb-16 px-6">
        <h2 className="text-[32px] md:text-[40px] font-bold text-black tracking-tight mb-4">
          Ils ont pris une longueur d'avance
        </h2>
        <p className="text-[17px] text-[#474747]">Découvrez ce que les autres e-commerçants disent de PriceAndSee.</p>
      </div>

      {/* Tilted container for the marquees */}
      <div className="w-full flex flex-col gap-6 relative" style={{ transform: "rotate(-3deg) scale(1.05)" }}>
        
        {/* Row 1: Right to Left */}
        <div className="flex w-[max-content] animate-marquee">
          {topMarquee.map((review, idx) => (
            <ReviewCard key={`top-${idx}`} review={review} />
          ))}
        </div>

        {/* Row 2: Left to Right */}
        <div className="flex w-[max-content] animate-marquee-reverse">
          {bottomMarquee.map((review, idx) => (
            <ReviewCard key={`bottom-${idx}`} review={review} />
          ))}
        </div>

      </div>
    </section>
  );
}
