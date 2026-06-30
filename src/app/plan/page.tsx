import { PageHeader } from "@/components/ui";
import PlanTaskCard from "@/components/PlanTaskCard";
import { TASKS, PHASES } from "@/lib/tasks";

export default function PlanPage() {
  return (
    <>
      <PageHeader
        eyebrow="Plan"
        title="The full phased roadmap."
        subtitle="Every task across all phases, with the why, priority, and estimate. Click Steps on any task to reveal the explicit, click-by-click Klaviyo build instructions. The Home tab pulls the next actions from this same list."
      />

      <div className="mb-6 rounded-xl bg-accent/5 px-4 py-3 text-sm text-muted ring-1 ring-inset ring-accent/10">
        Read-only for now — editing coming soon. Check tasks off on the{" "}
        <span className="font-semibold text-navy">Home</span> tab, and expand{" "}
        <span className="font-semibold text-navy">Steps</span> on any task to see exactly what to do.
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
                  <PlanTaskCard key={t.id} task={t} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
