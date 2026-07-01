import { NextResponse } from "next/server";
import { REVENUE_SEED, type RevenueData } from "@/lib/data";

export const dynamic = "force-dynamic";

const PLACED_ORDER_METRIC_ID = "Xirk9q";
// Reporting-API revisions to try in order. These endpoints honor the account's
// click-attribution setting, so the numbers they return are the HONEST,
// click-attributed figures (not Klaviyo's open+click default).
const REVISIONS = ["2024-10-15", "2025-04-15", "2024-07-15"];

function authHeaders(key: string, revision: string) {
  return {
    Authorization: `Klaviyo-API-Key ${key}`,
    revision,
    "content-type": "application/json",
    accept: "application/json",
  };
}

/**
 * POST a *-values-report body, retrying across revisions on 400/406. Returns the
 * summed conversion_value across results, or null if every revision failed.
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
      if (res.status === 400 || res.status === 406) continue; // try next revision
      if (!res.ok) return null;
      const json = await res.json();
      const results = json?.data?.attributes?.results;
      if (!Array.isArray(results)) return null;
      let sum = 0;
      for (const r of results) {
        const v = r?.statistics?.conversion_value;
        sum += Number(v ?? 0);
      }
      return sum;
    } catch {
      // network/parse error — fall through to next revision
      continue;
    }
  }
  return null;
}

/** Total revenue (Placed Order, sum_value) for the trailing 12-month window. */
async function fetchTotalRevenue(key: string): Promise<number | null> {
  try {
    const res = await fetch("https://a.klaviyo.com/api/metric-aggregates/", {
      method: "POST",
      headers: authHeaders(key, REVISIONS[0]),
      body: JSON.stringify({
        data: {
          type: "metric-aggregate",
          attributes: {
            metric_id: PLACED_ORDER_METRIC_ID,
            measurements: ["sum_value"],
            interval: "month",
            timezone: "America/New_York",
            filter: [
              "greater-or-equal(datetime,2025-06-01T00:00:00)",
              "less-than(datetime,2026-06-01T00:00:00)",
            ],
          },
        },
      }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = await res.json();
    const arr = json?.data?.[0]?.measurements?.sum_value;
    if (!Array.isArray(arr)) return null;
    let sum = 0;
    for (const v of arr) sum += Number(v ?? 0);
    return sum;
  } catch {
    return null;
  }
}

const reportBody = (type: "campaign-values-report" | "flow-values-report") => ({
  data: {
    type,
    attributes: {
      statistics: ["conversions"],
      conversion_metric_id: PLACED_ORDER_METRIC_ID,
      timeframe: { key: "last_12_months" },
      filter: "equals(send_channel,'email')",
      value_statistics: ["conversion_value"],
    },
  },
});

/**
 * Email-driven revenue via Klaviyo's Reporting API (campaign + flow values reports),
 * which honor the account's click-attribution setting. Total revenue via
 * metric-aggregates (Placed Order). Recomputes share. Falls back to REVENUE_SEED on
 * any error or missing key. This route never throws.
 */
export async function GET() {
  try {
    const key = process.env.KLAVIYO_PRIVATE_API_KEY;
    if (!key) {
      return NextResponse.json(REVENUE_SEED);
    }

    const campaignSum = await fetchConversionValueSum(
      "https://a.klaviyo.com/api/campaign-values-reports/",
      reportBody("campaign-values-report"),
      key
    );
    const flowSum = await fetchConversionValueSum(
      "https://a.klaviyo.com/api/flow-values-reports/",
      reportBody("flow-values-report"),
      key
    );

    // If both report endpoints failed entirely, we can't trust a live number.
    if (campaignSum === null && flowSum === null) {
      return NextResponse.json(REVENUE_SEED);
    }

    const emailAttributedRevenue = (campaignSum ?? 0) + (flowSum ?? 0);

    const liveTotal = await fetchTotalRevenue(key);
    const totalRevenue =
      liveTotal && liveTotal > 0 ? liveTotal : REVENUE_SEED.totalRevenue;

    const sharePct =
      totalRevenue > 0
        ? Math.round((emailAttributedRevenue / totalRevenue) * 1000) / 10
        : REVENUE_SEED.sharePct;

    const live: RevenueData = {
      emailAttributedRevenue: Math.round(emailAttributedRevenue),
      totalRevenue: Math.round(totalRevenue),
      sharePct,
      targetPct: 10,
      monthlySeries: REVENUE_SEED.monthlySeries,
      monthlyLabels: REVENUE_SEED.monthlyLabels,
      source: "live",
    };
    return NextResponse.json(live);
  } catch {
    return NextResponse.json(REVENUE_SEED);
  }
}
