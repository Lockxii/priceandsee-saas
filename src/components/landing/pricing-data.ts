export type PricingFeature = {
  label: string;
  value: string;
  included: boolean;
  highlight?: boolean;
};

export type PricingPlan = {
  name: string;
  monthlyPrice: string;
  yearlyPrice: string;
  popular?: boolean;
  description: string;
  features: PricingFeature[];
};

export const pricingPlans: PricingPlan[] = [
  {
    name: "Starter",
    monthlyPrice: "19",
    yearlyPrice: "15",
    description: "Parfait pour les petites boutiques et les niches.",
    features: [
      { label: "URLs trackées", value: "10", included: true },
      { label: "Actualisation", value: "Toutes les 24h", included: true },
      { label: "Historique", value: "30 jours", included: true },
      { label: "Alertes Slack", value: "Non inclus", included: false },
      { label: "Export CSV/API", value: "Non inclus", included: false },
    ],
  },
  {
    name: "Growth",
    monthlyPrice: "49",
    yearlyPrice: "39",
    popular: true,
    description: "Pour les e-commerçants qui scalent agressivement.",
    features: [
      { label: "URLs trackées", value: "100", included: true },
      { label: "Actualisation", value: "Toutes les 4h", included: true, highlight: true },
      { label: "Historique", value: "Illimité", included: true, highlight: true },
      { label: "Alertes Slack", value: "Inclus", included: true },
      { label: "Export CSV/API", value: "Non inclus", included: false },
    ],
  },
  {
    name: "Pro",
    monthlyPrice: "99",
    yearlyPrice: "79",
    description: "La puissance maximale pour les leaders du marché.",
    features: [
      { label: "URLs trackées", value: "500", included: true },
      { label: "Actualisation", value: "Toutes les 1h", included: true, highlight: true },
      { label: "Historique", value: "Illimité", included: true, highlight: true },
      { label: "Alertes Slack", value: "Inclus", included: true },
      { label: "Export CSV/API", value: "Inclus", included: true },
    ],
  },
];
