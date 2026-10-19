import { NextResponse } from "next/server";
import { OPTIN_SEED, type OptInData, type PopupRow } from "@/lib/data";

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

    const names = await formNames(key).catch(() => new Map<string, string>());

    let views = 0;
    let submits = 0;
    const popups: PopupRow[] = [];
    for (const row of results) {
      const stats = row?.statistics ?? row ?? {};
      const v = Number(stats.viewed_form_uniques ?? 0);
      const sub = Number(stats.submits ?? 0);
      views += v;
      submits += sub;
      const formId = String(row?.groupings?.form_id ?? "");
      if (v > 0) {
        popups.push({
          name: names.get(formId) ?? (formId ? `Form ${formId}` : "Unnamed form"),
          views: v,
          submits: sub,
          rate: Math.round((sub / v) * 10000) / 10000,
        });
      }
    }

    if (views === 0) return NextResponse.json(OPTIN_SEED);
    popups.sort((x, y) => y.views - x.views);

    const live: OptInData = {
      ...OPTIN_SEED,
      popupViews: views,
      popupSubmits: submits,
      blendedRate: submits / views,
      popups: popups.length ? popups : OPTIN_SEED.popups,
      source: "live",
    };
    return NextResponse.json(live);
  } catch {
    return NextResponse.json(OPTIN_SEED);
  }
}

/** Map Klaviyo form id -> form name so the scoreboard shows real, current forms. */
async function formNames(key: string): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  let url: string | null = "https://a.klaviyo.com/api/forms/?fields[form]=name&page[size]=100";
  for (let i = 0; url && i < 5; i++) {
    const res: Response = await fetch(url, {
      headers: {
        Authorization: `Klaviyo-API-Key ${key}`,
        revision: "2024-10-15",
        accept: "application/json",
      },
      cache: "no-store",
    });
    if (!res.ok) break;
    const json = await res.json();
    for (const f of json?.data ?? []) map.set(String(f.id), String(f?.attributes?.name ?? f.id));
    url = json?.links?.next ?? null;
  }
  return map;
}
