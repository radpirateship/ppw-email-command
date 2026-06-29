import type { Priority } from "@/lib/tasks";

export function PageHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <header className="mb-8">
      {eyebrow && (
        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-accent">
          {eyebrow}
        </div>
      )}
      <h1 className="text-3xl font-bold tracking-tight text-navy">{title}</h1>
      {subtitle && <p className="mt-2 max-w-2xl text-muted">{subtitle}</p>}
    </header>
  );
}

const PRIORITY_STYLES: Record<Priority, string> = {
  high: "bg-red-50 text-red-600 ring-1 ring-inset ring-red-100",
  med: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-100",
  low: "bg-slate-100 text-slate-500 ring-1 ring-inset ring-slate-200",
};

const PRIORITY_LABEL: Record<Priority, string> = {
  high: "High",
  med: "Medium",
  low: "Low",
};

export function PriorityPill({ priority }: { priority: Priority }) {
  return (
    <span className={`pill ${PRIORITY_STYLES[priority]}`}>
      {PRIORITY_LABEL[priority]}
    </span>
  );
}

export function ProgressBar({
  value,
  className = "",
  tone = "accent",
}: {
  value: number; // 0..1
  className?: string;
  tone?: "accent" | "red" | "amber" | "green";
}) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  const tones: Record<string, string> = {
    accent: "bg-accent",
    red: "bg-red-500",
    amber: "bg-amber-500",
    green: "bg-emerald-500",
  };
  return (
    <div className={`h-2.5 w-full overflow-hidden rounded-full bg-slate-100 ${className}`}>
      <div
        className={`h-full rounded-full ${tones[tone]} transition-all`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function ComingBadge() {
  return (
    <span className="pill bg-accent/10 text-accent ring-1 ring-inset ring-accent/20">
      Coming next
    </span>
  );
}
