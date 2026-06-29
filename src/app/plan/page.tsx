import { PageHeader, PriorityPill } from "@/components/ui";
import { TASKS, PHASES } from "@/lib/tasks";

export default function PlanPage() {
  return (
    <>
      <PageHeader
        eyebrow="Plan"
        title="The full phased roadmap."
        subtitle="Every task across all phases, with the why, priority, and estimate. The Home tab pulls the next actions from this same list."
      />

      <div className="mb-6 rounded-xl bg-accent/5 px-4 py-3 text-sm text-muted ring-1 ring-inset ring-accent/10">
        Read-only for now — editing coming soon. Check tasks off on the{" "}
        <span className="font-semibold text-navy">Home</span> tab.
      </div>

      <div className="space-y-10">
        {PHASES.map((phase) => {
          const tasks = TASKS.filter((t) => t.phase === phase);
          return (
            <section key={phase}>
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
                {phase}
              </h2>
              <div className="space-y-3">
                {tasks.map((t) => (
                  <div key={t.id} className="card p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-ink">{t.title}</span>
                      <PriorityPill priority={t.priority} />
                      <span className="text-xs text-muted">⏱ {t.est}</span>
                    </div>
                    <p className="mt-1.5 text-sm text-muted">{t.why}</p>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
