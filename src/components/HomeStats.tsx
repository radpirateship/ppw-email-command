"use client";

import { formatNumber } from "@/lib/data";
import { useOverview, freshnessLabel } from "@/lib/useOverview";

export default function HomeStats() {
  const { data, loading } = useOverview();
  const { subscribers, flows } = data;

  return (
    <div className="mb-10">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Email subscribers" value={formatNumber(subscribers.email)} dim={loading} />
        <Stat label="SMS subscribers" value={formatNumber(subscribers.sms)} dim={loading} />
        <Stat
          label="Recovery flows built but OFF"
          value={String(flows.builtButOff.length)}
          tone={flows.builtButOff.length ? "amber" : "navy"}
          dim={loading}
          title={flows.builtButOff.join(", ")}
        />
        <Stat
          label="Core flows missing"
          value={String(flows.missing.length)}
          tone={flows.missing.length ? "red" : "navy"}
          dim={loading}
          title={flows.missing.join(", ")}
        />
      </div>
      <p className="mt-2 text-xs text-muted">
        {freshnessLabel(data.source, data.fetchedAt, loading)}
        {!loading && flows.live !== null && ` · ${flows.live} flows live, ${flows.drafts ?? 0} in draft`}
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "navy",
  dim,
  title,
}: {
  label: string;
  value: string;
  tone?: "navy" | "amber" | "red";
  dim?: boolean;
  title?: string;
}) {
  const toneClass =
    tone === "amber" ? "text-amber-600" : tone === "red" ? "text-red-600" : "text-navy";
  return (
    <div className="card px-4 py-4" title={title}>
      <div className={`text-2xl font-bold ${toneClass} ${dim ? "opacity-40" : ""}`}>{value}</div>
      <div className="mt-1 text-xs font-medium text-muted">{label}</div>
    </div>
  );
}
