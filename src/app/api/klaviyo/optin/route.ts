import { NextResponse } from "next/server";
import { OPTIN_SEED, type OptInData } from "@/lib/data";

export const dynamic = "force-dynamic";

/**
 * Opt-in / form-values report.
 *
 * If KLAVIYO_PRIVATE_API_KEY is set, query Klaviyo's Form Values Reports endpoint
 * for viewed_form_uniques, submits and submit_rate grouped by form_id over the
 * last 12 months, then compute a blended rate. On any error (or no key) we return
 * the seed snapshot so the UI never breaks.
 */
export async function GET() {
  const key = process.env.KLAVIYO_PRIVATE_API_KEY;
  if (!key) {
    return NextResponse.json(OPTIN_SEED);
  }

  try {
    const res = await fetch("https://a.klaviyo.com/api/form-values-reports/", {
      method: "POST",
      headers: {
        Authorization: `Klaviyo-API-Key ${key}`,
        revision: "2024-10-15",
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        data: {
          type: "form-values-report",
          attributes: {
            statistics: ["viewed_form_uniques", "submits", "submit_rate"],
            timeframe: { key: "last_12_months" },
            group_by: ["form_id"],
          },
        },
      }),
      cache: "no-store",
    });

    if (!res.ok) throw new Error(`Klaviyo ${res.status}`);
    const json = await res.json();

    // Defensive parse — Klaviyo's report shape can vary. If we can't confidently
    // read results, fall back to seed rather than render bad numbers.
    const results = json?.data?.attributes?.results;
    if (!Array.isArray(results) || results.length === 0) {
      return NextResponse.json(OPTIN_SEED);
    }

    let views = 0;
    let submits = 0;
    for (const row of results) {
      const stats = row?.statistics ?? row ?? {};
      views += Number(stats.viewed_form_uniques ?? 0);
      submits += Number(stats.submits ?? 0);
    }

    if (views === 0) return NextResponse.json(OPTIN_SEED);

    const live: OptInData = {
      ...OPTIN_SEED,
      popupViews: views,
      popupSubmits: submits,
      blendedRate: submits / views,
      source: "live",
    };
    return NextResponse.json(live);
  } catch {
    return NextResponse.json(OPTIN_SEED);
  }
}
