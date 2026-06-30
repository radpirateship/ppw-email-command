"use client";

import { useEffect, useState } from "react";
import {
  OPTIN_SEED,
  REVENUE_SEED,
  FLOW_STATUS,
  MONTHLY_OPTIN_SEED,
  type OptInData,
  type RevenueData,
  type MonthlyOptInData,
  formatCurrency,
  formatPct,
  formatNumber,
} from "@/lib/data";
import { ProgressBar } from "@/components/ui";
import Sparkline from "@/components/Sparkline";
import MonthlyOptInChart from "@/components/MonthlyOptInChart";

interface Recommendation {
  title: string;
  detail: string;
  severity: "high" | "med" | "low";
}

function buildRecommendations(optin: OptInData, revenue: RevenueData): Recommendation[] {
  const recs: Recommendation[] = [];

  if (FLOW_STATUS.builtButOff.length > 0) {
    recs.push({
      title: `${FLOW_STATUS.builtButOff.length} abandonment flows are built but switched OFF`,
      detail: `Activate them now: ${FLOW_STATUS.builtButOff.join(", ")}. These recover high-intent shoppers and are pure upside.`,
      severity: "high",
    });
  }

  if (FLOW_STATUS.missing.length > 0) {
    recs.push({
      title: "No post-purchase, review, win-back or sunset flows exist",
      detail: `Missing: ${FLOW_STATUS.missing.join(", ")}. These are the backbone of retention and deliverability.`,
      severity: "high",
    });
  }

  if (optin.blendedRate < optin.targetRate) {
    const worst = [...optin.popups].sort((a, b) => a.rate - b.rate)[0];
    recs.push({
      title: `Opt-in ${formatPct(optin.blendedRate)} is below the ${formatPct(
        optin.targetRate
      )} target — fix the General Desktop popup first`,
      detail: `Worst performer: "${worst.name}" at ${formatPct(
        worst.rate
      )} on ${formatNumber(worst.views)} views/yr. It's the single biggest leak.`,
      severity: "high",
    });
  }

  recs.push({
    title:
      "Klaviyo attribution counts opens — switch to click-based attribution and recompute the true email revenue share before trusting this goal",
    detail:
      "The current email-revenue figure uses Klaviyo's default open+click model, which credits anyone who merely opened an email. Recompute with click-only attribution to get the real share before treating this goal as met.",
    severity: "high",
  });

  recs.push({
    title: "783 SMS subscribers are unused — add SMS to checkout abandonment",
    detail:
      "You're paying to collect SMS consent but not messaging them. Layer SMS onto the abandoned checkout flow for fast lift.",
    severity: "med",
  });

  return recs;
}

const SEV_STYLES: Record<Recommendation["severity"], { ring: string; dot: string; label: string }> =
  {
    high: { ring: "border-l-red-500", dot: "bg-red-500", label: "High priority" },
    med: { ring: "border-l-amber-500", dot: "bg-amber-500", label: "Medium" },
    low: { ring: "border-l-slate-400", dot: "bg-slate-400", label: "Low" },
  };

export default function GoalsView() {
  const [optin, setOptin] = useState<OptInData>(OPTIN_SEED);
  const [revenue, setRevenue] = useState<RevenueData>(REVENUE_SEED);
  const [monthly, setMonthly] = useState<MonthlyOptInData>(MONTHLY_OPTIN_SEED);
  const [optinView, setOptinView] = useState<"blended" | "monthly">("blended");

  // Wire the live-or-seed API routes. They always return valid data (seed fallback),
  // so the page renders instantly from seed and upgrades if live data arrives.
  useEffect(() => {
    let alive = true;
    fetch("/api/klaviyo/optin")
      .then((r) => r.json())
      .then((d: OptInData) => alive && d && setOptin(d))
      .catch(() => {});
    fetch("/api/klaviyo/revenue")
      .then((r) => r.json())
      .then((d: RevenueData) => alive && d && setRevenue(d))
      .catch(() => {});
    fetch("/api/klaviyo/optin-monthly")
      .then((r) => r.json())
      .then((d: MonthlyOptInData) => alive && d && Array.isArray(d.points) && d.points.length > 0 && setMonthly(d))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const optinProgress = optin.blendedRate / optin.targetRate;
  const optinBehind = optin.blendedRate < optin.targetRate;

  const sorted = [...optin.popups].sort((a, b) => a.rate - b.rate);
  const worstName = sorted[0]?.name;
  const bestName = sorted[sorted.length - 1]?.name;

  const recs = buildRecommendations(optin, revenue);

  return (
    <div className="space-y-8">
      {/* Two goal cards */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Opt-in rate */}
        <div className="card p-6">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted">
                Goal 1
              </div>
              <h2 className="text-lg font-bold text-navy">Opt-in rate</h2>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex rounded-full bg-slate-100 p-0.5 text-xs font-semibold">
                <button
                  onClick={() => setOptinView("blended")}
                  className={[
                    "rounded-full px-3 py-1 transition-colors",
                    optinView === "blended" ? "bg-navy text-white" : "text-muted hover:text-navy",
                  ].join(" ")}
                >
                  Blended (all-time)
                </button>
                <button
                  onClick={() => setOptinView("monthly")}
                  className={[
                    "rounded-full px-3 py-1 transition-colors",
                    optinView === "monthly" ? "bg-navy text-white" : "text-muted hover:text-navy",
                  ].join(" ")}
                >
                  Monthly
                </button>
              </div>
              <StatusBadge tone={optinBehind ? "red" : "green"}>
                {optinBehind ? "Behind" : "On track"}
              </StatusBadge>
            </div>
          </div>

          {optinView === "monthly" ? (
            <div>
              <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
                Monthly opt-in rate
              </div>
              <MonthlyOptInChart points={monthly.points} targetRate={monthly.targetRate} />
              <p className="mt-3 rounded-xl bg-accent/5 p-3 text-sm text-ink ring-1 ring-inset ring-accent/10">
                Views are growing faster than signups — watch this climb as popup fixes ship.
              </p>
            </div>
          ) : (
          <>
          <div className="mb-2 flex items-end gap-2">
            <span className="text-4xl font-bold text-navy">
              {formatPct(optin.blendedRate)}
            </span>
            <span className="mb-1 text-sm text-muted">
              of {formatPct(optin.targetRate)} target
            </span>
          </div>
          <ProgressBar value={optinProgress} tone={optinBehind ? "red" : "green"} />
          <p className="mt-3 text-sm text-muted">
            Blended across {formatNumber(optin.popupSubmits)} submits on{" "}
            {formatNumber(optin.popupViews)} views.
          </p>

          {/* Scoreboard */}
          <div className="mt-5 overflow-hidden rounded-xl border border-slate-100">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-3 py-2 font-semibold">Popup</th>
                  <th className="px-3 py-2 text-right font-semibold">Views</th>
                  <th className="px-3 py-2 text-right font-semibold">Subs</th>
                  <th className="px-3 py-2 text-right font-semibold">Rate</th>
                </tr>
              </thead>
              <tbody>
                {optin.popups.map((p) => {
                  const isWorst = p.name === worstName;
                  const isBest = p.name === bestName;
                  return (
                    <tr
                      key={p.name}
                      className={[
                        "border-t border-slate-100",
                        isWorst ? "bg-red-50/70" : isBest ? "bg-emerald-50/70" : "",
                      ].join(" ")}
                    >
                      <td className="px-3 py-2 text-ink">{p.name}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted">
                        {formatNumber(p.views)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted">
                        {formatNumber(p.submits)}
                      </td>
                      <td
                        className={[
                          "px-3 py-2 text-right font-semibold tabular-nums",
                          isWorst ? "text-red-600" : isBest ? "text-emerald-600" : "text-ink",
                        ].join(" ")}
                      >
                        {formatPct(p.rate)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs italic text-muted">
            Generic + discount + desktop converts worst; specific + mobile best.
          </p>
          </>
          )}
        </div>

        {/* Email revenue share */}
        <div className="card p-6">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted">
                Goal 2
              </div>
              <h2 className="text-lg font-bold text-navy">
                Email-driven revenue (click-attributed)
              </h2>
            </div>
            <StatusBadge tone="amber">Measurement pending</StatusBadge>
          </div>

          <div className="mb-2 flex items-end gap-2">
            <span className="text-4xl font-bold text-navy">{revenue.sharePct}%</span>
            <span className="mb-1 text-sm text-muted">
              of revenue (target {revenue.targetPct}%)
            </span>
          </div>
          <ProgressBar
            value={Math.min(1, revenue.sharePct / Math.max(revenue.targetPct, 1))}
            tone="amber"
          />
          <p className="mt-3 text-sm text-muted">
            {formatCurrency(revenue.emailAttributedRevenue)} of{" "}
            {formatCurrency(revenue.totalRevenue)} (trailing 12 mo).
          </p>
          <p className="mt-1 text-xs font-semibold text-amber-700">
            Klaviyo open+click attribution — overstated. Switching to click-only.
          </p>

          <div className="mt-5">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
              Email-attributed revenue / month
            </div>
            <Sparkline data={revenue.monthlySeries} labels={revenue.monthlyLabels} />
            <div className="mt-1 flex justify-between text-[10px] text-muted">
              <span>{revenue.monthlyLabels[0]}</span>
              <span>{revenue.monthlyLabels[revenue.monthlyLabels.length - 1]}</span>
            </div>
          </div>

          <div className="mt-5 rounded-xl bg-accent/5 p-4 text-sm text-ink ring-1 ring-inset ring-accent/10">
            <span className="font-semibold text-navy">Read this carefully: </span>
            This number uses Klaviyo&apos;s open+click attribution, which counts anyone
            who merely opened an email — it overstates real impact. We&apos;re switching to
            click-only attribution and will recompute the true email revenue share before
            treating this goal as met.
          </div>
        </div>
      </div>

      {/* Weak points & recommendations */}
      <section>
        <h2 className="mb-4 text-lg font-bold text-navy">Weak points & recommendations</h2>
        <div className="space-y-3">
          {recs.map((r, i) => {
            const s = SEV_STYLES[r.severity];
            return (
              <div
                key={i}
                className={`card border-l-4 ${s.ring} p-5`}
              >
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                    {s.label}
                  </span>
                </div>
                <h3 className="mt-2 font-semibold text-ink">{r.title}</h3>
                <p className="mt-1 text-sm text-muted">{r.detail}</p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function StatusBadge({
  tone,
  children,
}: {
  tone: "red" | "green" | "amber";
  children: React.ReactNode;
}) {
  const styles: Record<string, string> = {
    red: "bg-red-50 text-red-600 ring-red-100",
    green: "bg-emerald-50 text-emerald-600 ring-emerald-100",
    amber: "bg-amber-50 text-amber-700 ring-amber-100",
  };
  return (
    <span className={`pill ring-1 ring-inset ${styles[tone]}`}>{children}</span>
  );
}
