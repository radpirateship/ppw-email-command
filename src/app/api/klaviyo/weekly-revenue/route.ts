import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Weekly email revenue for the Home dashboard.
 *
 * Uses Klaviyo metric-aggregates on Placed Order, grouped by $attributed_channel,
 * so it follows the account's attribution settings (click-only since ~Jul 2026).
 * Weeks run Monday to Sunday, US Eastern. Values are by order date (event time),
 * so they can differ slightly from Klaviyo's flow/campaign reports, which group
 * by send date.
 *
 * Two calls total (email-attributed + all orders), cached for 10 minutes.
 */

const PLACED_ORDER_METRIC_ID = "Xirk9q";
const WEEKS = 12; // full weeks shown, plus the current week to date
const TZ = "America/New_York";

export interface WeeklyRevenueData {
  weeks: { start: string; label: string; email: number; total: number; orders: number }[];
  thisWeek: { email: number; total: number; orders: number } | null;
  lastWeek: { email: number; total: number; orders: number } | null;
  avg4: number | null; // average email revenue over the last 4 full weeks
  source: "live" | "unavailable";
  fetchedAt: string;
}

type AggJson = {
  data?: {
    attributes?: {
      dates?: string[];
      data?: { dimensions?: string[]; measurements?: { sum_value?: number[]; count?: number[] } }[];
    };
  };
};

async function aggregate(key: string, start: Date, end: Date, byChannel: boolean): Promise<AggJson | null> {
  const iso = (d: Date) => d.toISOString().slice(0, 19);
  const res = await fetch("https://a.klaviyo.com/api/metric-aggregates/", {
    method: "POST",
    headers: {
      Authorization: `Klaviyo-API-Key ${key}`,
      revision: "2025-04-15",
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      data: {
        type: "metric-aggregate",
        attributes: {
          metric_id: PLACED_ORDER_METRIC_ID,
          measurements: ["sum_value", "count"],
          interval: "week",
          timezone: TZ,
          ...(byChannel ? { by: ["$attributed_channel"] } : {}),
          filter: [`greater-or-equal(datetime,${iso(start)})`, `less-than(datetime,${iso(end)})`],
        },
      },
    }),
    next: { revalidate: 600 },
  });
  if (!res.ok) return null;
  return (await res.json()) as AggJson;
}

function label(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: TZ });
}

export async function GET() {
  const fetchedAt = new Date().toISOString();
  const empty: WeeklyRevenueData = {
    weeks: [],
    thisWeek: null,
    lastWeek: null,
    avg4: null,
    source: "unavailable",
    fetchedAt,
  };
  const key = process.env.KLAVIYO_PRIVATE_API_KEY;
  if (!key) return NextResponse.json(empty);

  try {
    const end = new Date(Date.now() + 24 * 3600 * 1000);
    const start = new Date(Date.now() - (WEEKS + 1) * 7 * 24 * 3600 * 1000);
    const [byChannel, all] = await Promise.all([
      aggregate(key, start, end, true),
      aggregate(key, start, end, false),
    ]);
    const dates = byChannel?.data?.attributes?.dates ?? all?.data?.attributes?.dates;
    if (!byChannel || !Array.isArray(dates)) return NextResponse.json(empty);

    const emailRow = byChannel.data?.attributes?.data?.find((r) =>
      (r.dimensions ?? []).some((d) => /email/i.test(d))
    );
    const totalRow = all?.data?.attributes?.data?.[0];

    let weeks = dates.map((dt, i) => ({
      start: dt,
      label: label(new Date(dt)),
      email: Math.round(Number(emailRow?.measurements?.sum_value?.[i] ?? 0)),
      total: Math.round(Number(totalRow?.measurements?.sum_value?.[i] ?? 0)),
      orders: Number(emailRow?.measurements?.count?.[i] ?? 0),
    }));
    // Drop any bucket that starts in the future, keep the last WEEKS + 1.
    weeks = weeks.filter((w) => new Date(w.start).getTime() <= Date.now()).slice(-(WEEKS + 1));

    const pick = (w?: (typeof weeks)[number]) =>
      w ? { email: w.email, total: w.total, orders: w.orders } : null;
    const current = weeks[weeks.length - 1];
    const previous = weeks[weeks.length - 2];
    const last4 = weeks.slice(-5, -1);
    const avg4 = last4.length ? Math.round(last4.reduce((s, w) => s + w.email, 0) / last4.length) : null;

    const data: WeeklyRevenueData = {
      weeks,
      thisWeek: pick(current),
      lastWeek: pick(previous),
      avg4,
      source: "live",
      fetchedAt,
    };
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(empty);
  }
}
