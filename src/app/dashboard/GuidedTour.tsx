"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type TourStep = {
  selector?: string;
  fallbackSelector?: string;
  title: string;
  body: string;
  path?: string;
  placement?: "bottom" | "right" | "left" | "top" | "center";
};

const steps: TourStep[] = [
  {
    title: "Welcome to PriceAndSee",
    body: "Let’s set up your workspace in under a minute: dashboard, competitor URLs, your first check, and automated monitoring.",
    path: "/dashboard",
    placement: "center",
  },
  {
    selector: "[data-tour='dashboard-stats']",
    title: "Your monitoring cockpit",
    body: "Track monitored URLs, price movements, and active alerts at a glance from this overview.",
    path: "/dashboard",
    placement: "bottom",
  },
  {
    selector: "[data-tour='sidebar-products']",
    title: "Add your competitors",
    body: "The Tracked URLs page is where you paste Shopify, Amazon, or niche store product pages.",
    path: "/dashboard",
    placement: "right",
  },
  {
    selector: "[data-tour='add-url-form']",
    title: "Paste a product URL",
    body: "Add a competitor URL. It will be saved to your workspace and ready for monitoring.",
    path: "/dashboard/products",
    placement: "bottom",
  },
  {
    selector: "[data-tour='check-product']",
    fallbackSelector: "[data-tour='add-url-form']",
    title: "Run the first check",
    body: "The Check button extracts price, stock status, title, and promo signals. If you do not have a product yet, add a URL first.",
    path: "/dashboard/products",
    placement: "left",
  },
];

function getTooltipPosition(rect: DOMRect | null, placement: TourStep["placement"]) {
  const width = 360;
  const safe = 18;

  if (!rect || placement === "center") {
    return {
      top: Math.max(80, window.innerHeight / 2 - 155),
      left: Math.max(safe, window.innerWidth / 2 - width / 2),
      width,
    };
  }

  const gap = 18;
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
    top: Math.max(safe, Math.min(top, window.innerHeight - 260)),
    left: Math.max(safe, Math.min(left, window.innerWidth - width - safe)),
    width,
  };
}

function SpotlightOverlay({ target }: { target: DOMRect | null }) {
  if (!target) {
    return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-[#24170f]/42" />;
  }

  const pad = 12;
  const top = Math.max(0, target.top - pad);
  const left = Math.max(0, target.left - pad);
  const width = target.width + pad * 2;
  const height = target.height + pad * 2;
  const right = Math.max(0, window.innerWidth - left - width);
  const bottom = Math.max(0, window.innerHeight - top - height);
  const shade = "bg-[#24170f]/42";

  return (
    <>
      <div className={`absolute left-0 right-0 top-0 ${shade}`} style={{ height: top }} />
      <div className={`absolute left-0 ${shade}`} style={{ top, width: left, height }} />
      <div className={`absolute ${shade}`} style={{ top, right: 0, width: right, height }} />
      <div className={`absolute bottom-0 left-0 right-0 ${shade}`} style={{ height: bottom }} />
    </>
  );
}

export function GuidedTour({ show }: { show: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [active, setActive] = useState(show);
  const [index, setIndex] = useState(0);
  const [target, setTarget] = useState<DOMRect | null>(null);
  const step = steps[index];

  const tooltip = useMemo(() => getTooltipPosition(target, step.placement), [target, step.placement]);

  useEffect(() => {
    setActive(show);
  }, [show]);

  useEffect(() => {
    if (!active || !step) return;

    if (step.path && pathname !== step.path) {
      setTarget(null);
      router.push(step.path);
      return;
    }

    if (!step.selector) {
      setTarget(null);
      return;
    }

    let frame = 0;
    const update = () => {
      const element = document.querySelector(step.selector!) || (step.fallbackSelector ? document.querySelector(step.fallbackSelector) : null);
      if (!element) {
        setTarget(null);
        return;
      }
      element.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
      window.setTimeout(() => setTarget(element.getBoundingClientRect()), 220);
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
    setTarget(null);
    setActive(false);
    await fetch("/api/onboarding/complete", { method: "POST" });
  };

  const next = async () => {
    if (index >= steps.length - 1) {
      await complete();
      return;
    }
    setTarget(null);
    setIndex((current) => current + 1);
  };

  const previous = () => {
    setTarget(null);
    setIndex((current) => Math.max(0, current - 1));
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[999] pointer-events-none">
        <SpotlightOverlay target={target} />

        {target && (
          <>
            <motion.div
              layout
              transition={{ type: "spring", stiffness: 260, damping: 28 }}
              className="absolute rounded-[22px] border-2 border-[#ff690c] shadow-[0_0_38px_rgba(255,105,12,0.85),inset_0_0_20px_rgba(255,105,12,0.08)]"
              style={{ top: target.top - 12, left: target.left - 12, width: target.width + 24, height: target.height + 24 }}
            />
            <motion.div
              animate={{ opacity: [0.25, 0.75, 0.25], scale: [1, 1.018, 1] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              className="absolute rounded-[24px] border border-white/80"
              style={{ top: target.top - 18, left: target.left - 18, width: target.width + 36, height: target.height + 36 }}
            />
          </>
        )}

        <motion.div
          key={index}
          initial={{ opacity: 0, y: 14, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 24 }}
          className="pointer-events-auto absolute overflow-hidden rounded-[24px] border border-[#ffd7bd] bg-white p-5 shadow-[0_28px_80px_-30px_rgba(36,23,15,0.45)]"
          style={{ top: tooltip.top, left: tooltip.left, width: tooltip.width }}
        >
          <div className="absolute -right-14 -top-14 h-32 w-32 rounded-full bg-[#ff690c]/15 blur-2xl" />
          <button type="button" onClick={complete} className="absolute right-4 top-4 rounded-full p-1.5 text-[#8a7668] hover:bg-[#fff2e8] hover:text-[#24170f]" aria-label="Close tour">
            <X className="h-4 w-4" />
          </button>

          <div className="relative">
            <div className="mb-3 flex items-center gap-2">
              {steps.map((_, dotIndex) => (
                <span key={dotIndex} className={`h-1.5 rounded-full transition-all ${dotIndex === index ? "w-7 bg-[#ff690c]" : "w-1.5 bg-[#f1ded1]"}`} />
              ))}
            </div>
            <p className="text-xs font-[800] uppercase tracking-[0.18em] text-[#ff690c]">{index === 0 ? "Welcome" : `Step ${index}/${steps.length - 1}`}</p>
            <h3 className="mt-2 text-xl font-[800] tracking-tight text-[#24170f]">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-[#6f5a4d]">{step.body}</p>

            <div className="mt-5 flex items-center justify-between gap-3">
              <button type="button" onClick={previous} disabled={index === 0} className="rounded-full px-4 py-2 text-sm font-bold text-[#6f5a4d] hover:bg-[#fff8f2] disabled:opacity-35">
                Back
              </button>
              <button type="button" onClick={next} className="inline-flex items-center gap-2 rounded-full bg-[#ff690c] px-5 py-2.5 text-sm font-bold text-white shadow-[0_10px_28px_-12px_rgba(255,105,12,0.8)] hover:bg-[#e55e0b]">
                {index === steps.length - 1 ? (
                  <>Finish <Check className="h-4 w-4" /></>
                ) : (
                  <>Next <ArrowRight className="h-4 w-4" /></>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
