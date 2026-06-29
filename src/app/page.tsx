import { PageHeader } from "@/components/ui";
import TaskBoard from "@/components/TaskBoard";
import { SUBSCRIBERS, FLOW_STATUS, formatNumber } from "@/lib/data";

export default function HomePage() {
  return (
    <>
      <PageHeader
        eyebrow="This week"
        title="Here's what to do this week."
        subtitle="The highest-impact next action, your short list, and the full backlog. Check things off — progress saves automatically on this device."
      />

      <div className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Email subscribers" value={formatNumber(SUBSCRIBERS.email)} />
        <Stat label="SMS subscribers" value={formatNumber(SUBSCRIBERS.sms)} />
        <Stat
          label="Flows built but OFF"
          value={String(FLOW_STATUS.builtButOff.length)}
          tone="amber"
        />
        <Stat
          label="Core flows missing"
          value={String(FLOW_STATUS.missing.length)}
          tone="red"
        />
      </div>

      <TaskBoard />
    </>
  );
}

function Stat({
  label,
  value,
  tone = "navy",
}: {
  label: string;
  value: string;
  tone?: "navy" | "amber" | "red";
}) {
  const toneClass =
    tone === "amber" ? "text-amber-600" : tone === "red" ? "text-red-600" : "text-navy";
  return (
    <div className="card px-4 py-4">
      <div className={`text-2xl font-bold ${toneClass}`}>{value}</div>
      <div className="mt-1 text-xs font-medium text-muted">{label}</div>
    </div>
  );
}
