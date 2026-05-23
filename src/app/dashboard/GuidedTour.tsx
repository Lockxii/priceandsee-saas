"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type TourStep = {
  selector: string;
  title: string;
  body: string;
  path?: string;
  placement?: "bottom" | "right" | "left" | "top";
};

const steps: TourStep[] = [
  {
    selector: "[data-tour='dashboard-stats']",
    title: "Ton cockpit de veille",
    body: "Ici tu suis en un coup d’œil les URLs monitorées, les mouvements prix et les alertes actives.",
    path: "/dashboard",
    placement: "bottom",
  },
  {
    selector: "[data-tour='sidebar-products']",
    title: "Ajoute tes concurrents",
    body: "La page Tracked URLs sert à coller les pages produits Shopify, Amazon ou boutiques concurrentes.",
    path: "/dashboard",
    placement: "right",
  },
  {
    selector: "[data-tour='add-url-form']",
    title: "Colle une URL produit",
    body: "Ajoute une URL concurrente. Elle sera stockée dans ton espace et prête à être vérifiée.",
    path: "/dashboard/products",
    placement: "bottom",
  },
  {
    selector: "[data-tour='check-product']",
    title: "Lance une première vérification",
    body: "Le bouton Check déclenche l’extraction prix, stock, titre et promo. Si aucun produit n’existe encore, ajoute d’abord une URL.",
    path: "/dashboard/products",
    placement: "left",
  },
];

function getTooltipPosition(rect: DOMRect, placement: TourStep["placement"]) {
  const gap = 18;
  const width = 360;
  const safe = 18;

  let top = rect.bottom + gap;
  let left = rect.left + rect.width / 2 - width / 2;

  if (placement === "right") {
    top = rect.top + rect.height / 2 - 95;
    left = rect.right + gap;
  }

  if (placement === "left") {
    top = rect.top + rect.height / 2 - 95;
    left = rect.left - width - gap;
  }

  if (placement === "top") {
    top = rect.top - 210;
    left = rect.left + rect.width / 2 - width / 2;
  }

  return {
    top: Math.max(safe, Math.min(top, window.innerHeight - 250)),
    left: Math.max(safe, Math.min(left, window.innerWidth - width - safe)),
    width,
  };
}

export function GuidedTour({ show }: { show: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [active, setActive] = useState(show);
  const [index, setIndex] = useState(0);
  const [target, setTarget] = useState<DOMRect | null>(null);
  const step = steps[index];

  const tooltip = useMemo(() => {
    if (!target) return null;
    return getTooltipPosition(target, step.placement);
  }, [target, step.placement]);

  useEffect(() => {
    setActive(show);
  }, [show]);

  useEffect(() => {
    if (!active || !step) return;

    if (step.path && pathname !== step.path) {
      router.push(step.path);
      return;
    }

    let frame = 0;
    const update = () => {
      const element = document.querySelector(step.selector);
      if (!element) {
        setTarget(null);
        return;
      }
      const rect = element.getBoundingClientRect();
      setTarget(rect);
      element.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    };

    const timer = window.setTimeout(update, 180);
    const onResize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
      cancelAnimationFrame(frame);
    };
  }, [active, index, pathname, router, step]);

  if (!active) return null;

  const complete = async () => {
    await fetch("/api/onboarding/complete", { method: "POST" });
    setActive(false);
  };

  const next = async () => {
    if (index >= steps.length - 1) {
      await complete();
      return;
    }
    setIndex((current) => current + 1);
  };

  const previous = () => setIndex((current) => Math.max(0, current - 1));

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[999] pointer-events-none">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-[#24170f]/35 backdrop-blur-[2px]"
        />

        {target && (
          <>
            <motion.div
              layout
              transition={{ type: "spring", stiffness: 260, damping: 28 }}
              className="absolute rounded-[22px] border-2 border-[#ff690c] shadow-[0_0_0_9999px_rgba(36,23,15,0.36),0_0_38px_rgba(255,105,12,0.75),inset_0_0_22px_rgba(255,105,12,0.18)]"
              style={{
                top: target.top - 10,
                left: target.left - 10,
                width: target.width + 20,
                height: target.height + 20,
              }}
            />
            <motion.div
              animate={{ opacity: [0.35, 0.8, 0.35], scale: [1, 1.015, 1] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              className="absolute rounded-[24px] border border-white/70"
              style={{
                top: target.top - 16,
                left: target.left - 16,
                width: target.width + 32,
                height: target.height + 32,
              }}
            />
          </>
        )}

        {tooltip && (
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className="pointer-events-auto absolute overflow-hidden rounded-[24px] border border-[#ffd7bd] bg-white p-5 shadow-[0_28px_80px_-30px_rgba(36,23,15,0.45)]"
            style={{ top: tooltip.top, left: tooltip.left, width: tooltip.width }}
          >
            <div className="absolute -right-14 -top-14 h-32 w-32 rounded-full bg-[#ff690c]/15 blur-2xl" />
            <button
              type="button"
              onClick={complete}
              className="absolute right-4 top-4 rounded-full p-1.5 text-[#8a7668] hover:bg-[#fff2e8] hover:text-[#24170f]"
              aria-label="Fermer le tour"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative">
              <div className="mb-3 flex items-center gap-2">
                {steps.map((_, dotIndex) => (
                  <span
                    key={dotIndex}
                    className={`h-1.5 rounded-full transition-all ${dotIndex === index ? "w-7 bg-[#ff690c]" : "w-1.5 bg-[#f1ded1]"}`}
                  />
                ))}
              </div>
              <p className="text-xs font-[800] uppercase tracking-[0.18em] text-[#ff690c]">Étape {index + 1}/{steps.length}</p>
              <h3 className="mt-2 text-xl font-[800] tracking-tight text-[#24170f]">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#6f5a4d]">{step.body}</p>

              <div className="mt-5 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={previous}
                  disabled={index === 0}
                  className="rounded-full px-4 py-2 text-sm font-bold text-[#6f5a4d] hover:bg-[#fff8f2] disabled:opacity-35"
                >
                  Retour
                </button>
                <button
                  type="button"
                  onClick={next}
                  className="inline-flex items-center gap-2 rounded-full bg-[#ff690c] px-5 py-2.5 text-sm font-bold text-white shadow-[0_10px_28px_-12px_rgba(255,105,12,0.8)] hover:bg-[#e55e0b]"
                >
                  {index === steps.length - 1 ? (
                    <>
                      Terminer <Check className="h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Suivant <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </AnimatePresence>
  );
}
