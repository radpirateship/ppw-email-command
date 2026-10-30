"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/data";
import type { WeeklyRevenueData } from "@/app/api/klaviyo/weekly-revenue/route";

export default function WeeklyEmailRevenue() {
  const [data, setData] = useState<WeeklyRevenueData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetch("/api/klaviyo/weekly-revenue", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: WeeklyRevenueData) => alive && setData(d))
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const live = data?.source === "live" && data.weeks.length > 0;
  const weeks = data?.weeks ?? [];
  const max = Math.max(...weeks.map((w) => w.email), 1);
  const last = data?.lastWeek;
  const share = last && last.total > 0 ? (last.email / last.total) * 100 : null;

  return (
    <div className="card mb-10 p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted">Weekly</div>
          <h2 className="text-lg font-bold text-navy">Revenue from email</h2>
        </div>
        <div className="text-xs text-muted">Click-attributed · weeks start Monday (US Eastern)</div>
      </div>

      {loading ? (
        <p className="text-sm text-muted">Loading weekly revenue from Klaviyo…</p>
      ) : !live ? (
        <p className="text-sm text-muted">Couldn&apos;t reach Klaviyo for weekly revenue right now.</p>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Figure
              label="Last full week"
              value={formatCurrency(last?.email ?? 0)}
              sub={
                last
                  ? `${last.orders} order${last.orders === 1 ? "" : "s"}${
                      share !== null ? ` · ${share.toFixed(1)}% of ${formatCurrency(last.total)} total` : ""
                    }`
                  : ""
              }
            />
            <Figure
              label="This week so far"
              value={formatCurrency(data!.thisWeek?.email ?? 0)}
              sub={`${data!.thisWeek?.orders ?? 0} order${data!.thisWeek?.orders === 1 ? "" : "s"}`}
            />
            <Figure label="4-week average" value={formatCurrency(data!.avg4 ?? 0)} sub="per full week" />
          </div>

          <div className="flex items-end gap-1.5" style={{ height: 110 }}>
            {weeks.map((w, i) => {
              const current = i === weeks.length - 1;
              return (
                <div key={w.start} className="group flex h-full flex-1 flex-col items-center justify-end">
                  <div
                    className={`w-full rounded-t transition-colors ${
                      current ? "bg-accent/40 group-hover:bg-accent/60" : "bg-accent/80 group-hover:bg-accent"
                    }`}
                    style={{ height: `${Math.max((w.email / max) * 100, 2)}%` }}
                    title={`Week of ${w.label}${current ? " (to date)" : ""}: ${formatCurrency(w.email)} from email, ${w.orders} order${w.orders === 1 ? "" : "s"}`}
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex justify-between text-xs text-muted">
            <span>Week of {weeks[0].label}</span>
            <span>This week</span>
          </div>
        </>
      )}
    </div>
  );
}

function Figure({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div>
      <div className="text-xs font-medium text-muted">{label}</div>
      <div className="text-2xl font-bold text-navy">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted">{sub}</div>}
    </div>
  );
}
