import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function DashboardCard({
  children,
  className = "",
  padding = true,
}: {
  children: ReactNode;
  className?: string;
  padding?: boolean;
}) {
  return (
    <div
      className={`dashboard-surface-transition dashboard-resize-transition rounded-2xl border border-[var(--dash-border)] bg-[var(--dash-surface)] shadow-[var(--dash-shadow)] overflow-hidden ${padding ? "" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

export function DashboardCardHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="border-b border-[var(--dash-border)] px-5 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="font-bold text-[var(--dash-ink)]">{title}</h2>
        {description ? <p className="text-sm text-[var(--dash-muted)] mt-0.5">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  icon: Icon,
  hideTitle = false,
}: {
  eyebrow?: string;
  title?: string;
  description?: string;
  actions?: ReactNode;
  icon?: LucideIcon;
  hideTitle?: boolean;
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        {eyebrow ? <p className="text-sm font-medium text-[var(--dash-muted)]">{eyebrow}</p> : null}
        {!hideTitle && title ? (
          <h1 className="mt-0.5 text-2xl sm:text-3xl font-black tracking-tight text-[var(--dash-ink)] flex items-center gap-3">
            {Icon ? <Icon className="h-7 w-7 sm:h-8 sm:w-8 text-[var(--dash-accent)] shrink-0" /> : null}
            {title}
          </h1>
        ) : null}
        {description ? (
          <p className={`${!hideTitle && title ? "mt-2" : "mt-1"} max-w-3xl text-[var(--dash-muted-strong)] leading-relaxed`}>
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div> : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  tone?: "default" | "green" | "orange" | "red";
}) {
  const iconTone =
    tone === "green"
      ? "bg-[#f2f8ec] text-[#5d8b22]"
      : tone === "red"
        ? "bg-red-50 text-red-600"
        : tone === "orange"
          ? "bg-[#fff2e8] text-[var(--dash-accent)]"
          : "bg-[#fff2e8] text-[var(--dash-accent)]";

  return (
    <div className="dashboard-surface-transition dashboard-lift-hover rounded-2xl border border-[var(--dash-border)] bg-[var(--dash-surface)] p-5 shadow-[var(--dash-shadow)] flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconTone}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-[var(--dash-muted)]">{label}</p>
        <p className="text-2xl font-black text-[var(--dash-ink)] mt-0.5 tabular-nums">{value}</p>
        {hint ? <p className="text-xs font-medium text-[var(--dash-muted)] mt-1">{hint}</p> : null}
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="px-6 py-12 sm:py-14 text-center">
      <p className="font-bold text-[var(--dash-ink)]">{title}</p>
      <p className="text-sm text-[var(--dash-muted)] mt-2 max-w-md mx-auto leading-relaxed">{description}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function StatusBadge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "success" | "warning" | "error" | "neutral";
}) {
  const classes = {
    success: "bg-[#f2f8ec] text-[#4f761d] border-[#d8e8c8]",
    warning: "bg-[#fff2e8] text-[#c84f00] border-[#ffd7bd]",
    error: "bg-red-50 text-red-700 border-red-200",
    neutral: "bg-[#fffaf6] text-[#8a7668] border-[#f1ded1]",
  }[tone];

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border dashboard-surface-transition ${classes}`}>
      {children}
    </span>
  );
}

export function PrimaryButton({
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[var(--dash-accent)] text-white rounded-xl text-sm font-bold hover:bg-[#e55e0b] transition-colors disabled:opacity-60 shadow-[0_8px_18px_rgba(255,105,12,0.15)] dashboard-surface-transition dashboard-lift-hover ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 px-4 py-2 border border-[var(--dash-border)] rounded-xl text-sm font-semibold text-[var(--dash-ink-soft)] hover:bg-[var(--dash-bg)] transition-colors disabled:opacity-60 dashboard-surface-transition ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function TextLink({
  href,
  children,
  className = "",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={`text-sm font-semibold text-[var(--dash-accent)] hover:underline ${className}`}>
      {children}
    </Link>
  );
}

export function DashInput({
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full px-4 py-3 rounded-xl border border-[#e7cdbb] bg-white text-[var(--dash-ink)] placeholder:text-[#a99485] focus:ring-2 focus:ring-[var(--dash-accent)]/25 focus:border-[var(--dash-accent)] outline-none transition-shadow dashboard-surface-transition ${className}`}
      {...props}
    />
  );
}
