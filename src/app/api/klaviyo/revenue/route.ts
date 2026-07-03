import { NextResponse } from "next/server";
import { REVENUE_SEED, type RevenueData } from "@/lib/data";

export const dynamic = "force-dynamic";

const PLACED_ORDER_METRIC_ID = "Xirk9q";
const REVISIONS = ["2024-10-15", "2025-04-15", "2024-07-15"];

/**
 * ATTRIBUTION CUTOVER — READ THIS BEFORE TOUCHING THE NUMBERS.
 *
 * The Klaviyo account was switched to CLICK-ONLY attribution ~Jul 1, 2026.
 * Klaviyo does NOT re-attribute historical events: everything before the
 * switch keeps its old open+click attribution, which overstates email revenue
 * ~4.5x (open+click showed ~$127K–166K vs verified click-only $28,057 for the
 * trailing 12 months — see Email_Revenue_Baseline.xlsx).
 *
 * So this route is a HYBRID:
 *  - Months BEFORE the cutover come from BASELINE_MONTHLY below — the old
 *    open+click monthly shape scaled to the verified $28,057 click-only total
 *    (factor 0.2206). Jun '26 is the same ratio applied to its $1,093
 *    open+click figure (estimate).
 *  - From the cutover FORWARD, the Reporting API data is genuinely click-only,
 *    so we pull it live.
 * Baseline months roll out of the trailing-12-month window naturally; by
 * ~Jul 2027 this route is 100% live.
 */
const CUTOVER = new Date("2026-07-02T00:00:00-04:00");

/** Verified/estimated click-only email revenue per pre-cutover month. */
const BASELINE_MONTHLY: { key: string; label: string; value: number }[] = [
  { key: "2025-07", label: "Jul '25", value: 48 },
  { key: "2025-08", label: "Aug '25", value: 220 },
  { key: "2025-09", label: "Sep '25", value: 214 },
  { key: "2025-10", label: "Oct '25", value: 0 },
  { key: "2025-11", label: "Nov '25", value: 2370 },
  { key: "2025-12", label: "Dec '25", value: 980 },
  { key: "2026-01", label: "Jan '26", value: 7562 },
  { key: "2026-02", label: "Feb '26", value: 4279 },
  { key: "2026-03", label: "Mar '26", value: 885 },
  { key: "2026-04", label: "Apr '26", value: 6445 },
  { key: "2026-05", label: "May '26", value: 5054 },
  { key: "2026-06", label: "Jun '26", value: 241 }, // estimate (ratio-scaled)
];

function authHeaders(key: string, revision: string) {
  return {
    Authorization: `Klaviyo-API-Key ${key}`,
    revision,
    "content-type": "application/json",
    accept: "application/json",
  };
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${names[m - 1]} '${String(y).slice(2)}`;
}

/**
 * POST a *-values-report body, retrying across revisions on 400/406.
 * Returns summed conversion_value across results, or null if all failed.
 */
async function fetchConversionValueSum(
  url: string,
  body: unknown,
  key: string
): Promise<number | null> {
  for (const revision of REVISIONS) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: authHeaders(key, revision),
        body: JSON.stringify(body),
        cache: "no-store",
      });
      if (res.status === 400 || res.status === 406) continue;
      if (!res.ok) return null;
      const json = await res.json();
      const results = json?.data?.attributes?.results;
      if (!Array.isArray(results)) return null;
      let sum = 0;
      for (const r of results) sum += Number(r?.statistics?.conversion_value ?? 0);
      return sum;
    } catch {
      continue;
    }
  }
  return null;
}

const valuesReportBody = (
  type: "campaign-values-report" | "flow-values-report",
  start: Date,
  end: Date
) => ({
  data: {
    type,
    attributes: {
      statistics: ["conversions"],
      conversion_metric_id: PLACED_ORDER_METRIC_ID,
      timeframe: { start: start.toISOString(), end: end.toISOString() },
      filter: "equals(send_channel,'email')",
      value_statistics: ["conversion_value"],
    },
  },
});

/** Click-only email revenue for one window (flows + campaigns). Null if both endpoints failed. */
async function fetchEmailRevenue(
  key: string,
  start: Date,
  end: Date
): Promise<number | null> {
  const [campaigns, flows] = await Promise.all([
    fetchConversionValueSum(
      "https://a.klaviyo.com/api/campaign-values-reports/",
      valuesReportBody("campaign-values-report", start, end),
      key
    ),
    fetchConversionValueSum(
      "https://a.klaviyo.com/api/flow-values-reports/",
      valuesReportBody("flow-values-report", start, end),
      key
    ),
  ]);
  if (campaigns === null && flows === null) return null;
  return (campaigns ?? 0) + (flows ?? 0);
}

/** Total revenue (Placed Order, sum_value) over a rolling trailing-12-month window. */
async function fetchTotalRevenue(key: string, start: Date, end: Date): Promise<number | null> {
  try {
    const res = await fetch("https://a.klaviyo.com/api/metric-aggregates/", {
  