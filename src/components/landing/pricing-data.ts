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
    description: "Pour une petite marque ou un seller qui veut surveiller ses 10 URLs les plus importantes.",
    features: [
      { label: "URLs concurrentes", value: "10", included: true, highlight: true },
      { label: "Fréquence de suivi", value: "1x / jour", included: true },
      { label: "Historique prix", value: "30 jours", included: true },
      { label: "Alertes Email", value: "Inclus", included: true },
      { label: "Alertes Slack", value: "Non inclus", included: false },
    ],
  },
  {
    name: "Growth",
    monthlyPrice: "39",
    yearlyPrice: "31",
    popular: true,
    description: "Le meilleur choix pour suivre plus de concurrents et réagir plus vite aux changements.",
    features: [
      { label: "URLs concurrentes", value: "100", included: true, highlight: true },
      { label: "Fréquence de suivi", value: "Toutes les 4h", included: true, highlight: true },
      { label: "Historique prix", value: "Illimité", included: true },
      { label: "Alertes Email", value: "Inclus", included: true },
      { label: "Alertes Slack", value: "Inclus", included: true },
    ],
  },
  {
    name: "Scale",
    monthlyPrice: "79",
    yearlyPrice: "63",
    description: "Pour les équipes qui veulent monitorer un catalogue plus large avec des checks rapides.",
    features: [
      { label: "URLs concurrentes", value: "500", included: true, highlight: true },
      { label: "Fréquence de suivi", value: "Toutes les 1h", included: true, highlight: true },
      { label: "Historique prix", value: "Illimité", included: true },
      { label: "Alertes Slack", value: "Inclus", included: true },
      { label: "Export CSV", value: "Inclus", included: true },
    ],
  },
];
