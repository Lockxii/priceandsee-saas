import Link from "next/link";
import { Check, ChevronRight } from "lucide-react";

export type WorkflowStep = {
  id: string;
  label: string;
  description: string;
  href: string;
  done: boolean;
  active: boolean;
};

export function WorkflowBanner({ steps, title = "Prochaine étape" }: { steps: WorkflowStep[]; title?: string }) {
  const activeStep = steps.find((step) => step.active) ?? steps.find((step) => !step.done);
  const completed = steps.filter((step) => step.done).length;

  if (completed === steps.length) {
    return (
      <div className="rounded-2xl border border-[#d8e8c8] bg-[#f2f8ec] p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black text-[#4f761d]">Parcours terminé</p>
          <p className="text-sm text-[#5b4638] mt-1">Tes URLs sont suivies. Consulte le Monitoring pour les mouvements de prix.</p>
        </div>
        <Link
          href="/dashboard/monitoring"
          className="inline-flex items-center gap-2 rounded-xl bg-white border border-[#d8e8c8] px-4 py-2 text-sm font-bold text-[#4f761d] hover:bg-[#fffaf6]"
        >
          Ouvrir le Monitoring <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--dash-border)] bg-white p-5 shadow-[var(--dash-shadow)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--dash-accent)]">{title}</p>
          {activeStep ? (
            <>
              <p className="mt-1 text-lg font-black text-[var(--dash-ink)]">{activeStep.label}</p>
              <p className="mt-1 text-sm text-[var(--dash-muted-strong)]">{activeStep.description}</p>
            </>
          ) : null}
        </div>
        {activeStep ? (
          <Link
            href={activeStep.href}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[var(--dash-accent)] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#e55e0b] transition-colors"
          >
            Continuer <ChevronRight className="h-4 w-4" />
          </Link>
        ) : null}
      </div>

      <ol className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {steps.map((step, index) => (
          <li
            key={step.id}
            className={`rounded-xl border px-3 py-3 ${
              step.active
                ? "border-[#ffd7bd] bg-[#fff8f2]"
                : step.done
                  ? "border-[#d8e8c8] bg-[#f2f8ec]"
                  : "border-[var(--dash-border)] bg-[var(--dash-bg)]"
            }`}
          >
            <div className="flex items-start gap-2.5">
              <span
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-black ${
                  step.done
                    ? "bg-[#5d8b22] text-white"
                    : step.active
                      ? "bg-[var(--dash-accent)] text-white"
                      : "bg-white border border-[var(--dash-border)] text-[var(--dash-muted)]"
                }`}
              >
                {step.done ? <Check className="h-3.5 w-3.5" /> : index + 1}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[var(--dash-ink)] leading-snug">{step.label}</p>
                <p className="text-xs text-[var(--dash-muted)] mt-0.5 line-clamp-2">{step.description}</p>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
