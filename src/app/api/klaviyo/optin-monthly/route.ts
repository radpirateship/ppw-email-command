import { NextResponse } from "next/server";
import { MONTHLY_OPTIN_SEED, type MonthlyOptInData, type MonthlyOptInPoint } from "@/lib/data";

export const dynamic = "force-dynamic";

/**
 * Monthly opt-in trend report.
 *
 * If KLAVIYO_PRIVATE_API_KEY is set, query Klaviyo's Form Series Reports endpoint
 * for viewed_form_uniques + submits, grouped monthly over the last 12 months.
 * We sum views and submits across ALL form groups per month and compute the
 * blended monthly opt-in rate = submits / views. On any error (or no key) we
 * return the seed snapshot so the UI never breaks.
 */
export async function GET() {
  const key = process.env.KLAVIYO_PRIVATE_API_KEY;
  if (!key) {
    return NextResponse.json(MONTHLY_OPTIN_SEED);
  }

  try {
    const res = await fetch("https://a.klaviyo.com/api/form-series-reports/", {
      method: "POST",
      headers: {
        Authorization: `Klaviyo-API-Key ${key}`,
        revision: "2024-10-15",
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        data: {
          type: "form-series-report",
          attributes: {
            statistics: ["viewed_form_uniques", "submits"],
            timeframe: { key: "last_12_months" },
            interval: "monthly",
          },
        },
      }),
      cache: "no-store",
    });

    if (!res.ok) throw new Error(`Klaviyo ${res.status}`);
    const json = await res.json();

    // Klaviyo's series shape can vary. We expect, per form group, a `results`
    // array of period buckets each carrying a date_time + statistics. We sum
    // views and submits across all groups, keyed by month, then compute the rate.
    const results = json?.data?.attributes?.results;
    if (!Array.isArray(results) || results.length === 0) {
      return NextResponse.json(MONTHLY_OPTIN_SEED);
    }

    // month key -> { views, submits }
    const byMonth = new Map<string, { views: number; submits: number }>();
    const order: string[] = [];

    const ingest = (period: any) => {
      const stats = period?.statistics ?? period ?? {};
      const rawDate: string =
        period?.date_time ?? period?.start_date ?? period?.date ?? period?.period ?? "";
      const monthKey = monthKeyFromDate(rawDate);
      if (!monthKey) return;
      if (!byMonth.has(monthKey)) {
        byMonth.set(monthKey, { views: 0, submits: 0 });
        order.push(monthKey);
      }
      const bucket = byMonth.get(monthKey)!;
      bucket.views += Number(stats.viewed_form_uniques ?? 0);
      bucket.submits += Number(stats.submits ?? 0);
    };

    for (const group of results) {
      const periods = group?.results ?? group?.statistics?.results ?? group?.data ?? [];
      if (Array.isArray(periods) && periods.length > 0) {
        for (const period of periods) ingest(period);
      } else {
        // Some shapes return parallel arrays of dates + per-stat value arrays.
        const dates: string[] = group?.date_times ?? json?.data?.attributes?.date_times ?? [];
        const views: number[] = group?.statistics?.viewed_form_uniques ?? [];
        const submits: number[] = group?.statistics?.submits ?? [];
        if (Array.isArray(dates) && dates.length > 0) {
          for (let i = 0; i < dates.length; i++) {
            ingest({
              date_time: dates[i],
              statistics: { viewed_form_uniques: views[i] ?? 0, submits: submits[i] ?? 0 },
            });
          }
        }
      }
    }

    if (order.length === 0) {
      return NextResponse.json(MONTHLY_OPTIN_SEED);
    }

    const points: MonthlyOptInPoint[] = order.map((key) => {
      const { views, submits } = byMonth.get(key)!;
      return { label: monthLabel(key), rate: views > 0 ? submits / views : 0 };
    });

    const live: MonthlyOptInData = {
      points,
      targetRate: MONTHLY_OPTIN_SEED.targetRate,
      source: "live",
    };
    return NextResponse.json(live);
  } catch {
    return NextResponse.json(MONTHLY_OPTIN_SEED);
  }
}

/** Normalize any ISO-ish date string to a "YYYY-MM" key. */
function monthKeyFromDate(raw: string): string | null {
  if (!raw) return null;
  const d = new Date(raw);
  if (isNaN(d.getTime())) {
    // Fall back to a leading YYYY-MM if Date can't parse it.
    const m = /^(\d{4})-(\d{2})/.exec(raw);
    return m ? `${m[1]}-${m[2]}` : null;
  }
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** "2025-12" -> "Dec '25". */
function monthLabel(key: string): string {
  const [y, m] = key.split("-");
  const month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][
    Number(m) - 1
  ];
  return `${month ?? m} '${y.slice(2)}`;
}
