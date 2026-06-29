import { NextResponse } from "next/server";
import { REVENUE_SEED, type RevenueData } from "@/lib/data";

export const dynamic = "force-dynamic";

const PLACED_ORDER_METRIC_ID = "Xirk9q";

/**
 * Email-attributed revenue via Klaviyo metric-aggregates (Placed Order, sum_value),
 * grouped by $attributed_channel over the last 12 months. Total revenue comes from
 * Shopify (see /api/shopify/revenue); here we only update the email-attributed figure
 * and recompute share. Falls back to seed on any error or missing key.
 */
export async function GET() {
  const key = process.env.KLAVIYO_PRIVATE_API_KEY;
  if (!key) {
    return NextResponse.json(REVENUE_SEED);
  }

  try {
    const now = new Date();
    const start = new Date(now);
    start.setMonth(start.getMonth() - 12);

    const res = await fetch("https://a.klaviyo.com/api/metric-aggregates/", {
      method: "POST",
      headers: {
        Authorization: `Klaviyo-API-Key ${key}`,
        revision: "2024-10-15",
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        data: {
          type: "metric-aggregate",
          attributes: {
            metric_id: PLACED_ORDER_METRIC_ID,
            measurements: ["sum_value"],
            interval: "month",
            by: ["$attributed_channel"],
            filter: [
              `greater-or-equal(datetime,${start.toISOString()})`,
              `less-than(datetime,${now.toISOString()})`,
            ],
            timezone: "America/New_York",
          },
        },
      }),
      cache: "no-store",
    });

    if (!res.ok) throw new Error(`Klaviyo ${res.status}`);
    const json = await res.json();

    const results = json?.data?.attributes?.data;
    if (!Array.isArray(results) || results.length === 0) {
      return NextResponse.json(REVENUE_SEED);
    }

    // Sum sum_value across email-attributed dimension groups.
    let emailRevenue = 0;
    for (const group of results) {
      const dims: string[] = group?.dimensions ?? [];
      const isEmail = dims.some((d) =>
        String(d).toLowerCase().includes("email")
      );
      if (!isEmail) continue;
      const measurements = group?.measurements?.sum_value ?? [];
      for (const v of measurements) emailRevenue += Number(v ?? 0);
    }

    if (emailRevenue === 0) return NextResponse.json(REVENUE_SEED);

    const total = REVENUE_SEED.totalRevenue; // from Shopify in production
    const live: RevenueData = {
      ...REVENUE_SEED,
      emailAttributedRevenue: Math.round(emailRevenue),
      sharePct: Number(((emailRevenue / total) * 100).toFixed(1)),
      source: "live",
    };
    return NextResponse.json(live);
  } catch {
    return NextResponse.json(REVENUE_SEED);
  }
}
