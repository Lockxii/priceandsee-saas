import type { WorkflowStep } from "@/components/dashboard/WorkflowBanner";

export function buildTrackingWorkflow(input: {
  productsCount: number;
  uncheckedCount: number;
}) {
  const { productsCount, uncheckedCount } = input;
  const hasProducts = productsCount > 0;
  const needsFirstCheck = hasProducts && uncheckedCount > 0;

  const steps: WorkflowStep[] = [
    {
      id: "add-url",
      label: "Ajouter une URL",
      description: "Colle la page produit d'un concurrent Shopify ou e-commerce.",
      href: "/dashboard/products",
      done: hasProducts,
      active: !hasProducts,
    },
    {
      id: "first-check",
      label: "Lancer un Check",
      description: "Extrais prix, stock, titre et signaux promo en un clic.",
      href: "/dashboard/products",
      done: hasProducts && !needsFirstCheck,
      active: hasProducts && needsFirstCheck,
    },
    {
      id: "tools",
      label: "Explorer les outils",
      description: "Trouve des produits, médias, promos, reviews et technologies à analyser.",
      href: "/dashboard/tools",
      done: hasProducts && !needsFirstCheck,
      active: hasProducts && !needsFirstCheck,
    },
  ];

  return steps;
}
