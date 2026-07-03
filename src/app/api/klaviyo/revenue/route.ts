import { NextResponse } from "next/server";
import { REVENUE_SEED, type RevenueData } from "@/lib/data";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const PLACED_ORDER_METRIC_ID = "Xirk9q";

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
 *  - From the cutover FORWARD, we pull live monthly series from the Reporting
 *    API. Klaviyo rate-limits report endpoints hard (burst 1/s, steady 2/m),
 *    so calls are sequential with spacing and 429s are retried.
 * Baseline months roll out of the trailing-12-month window naturally; by
 * ~Jul 2027 this route is 100% live.
 *
 * Append ?debug=1 to see per-request detail when something fails.
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

/**
 * Klaviyo moved conversion_value between fields across API revisions, and the
 * exact placement differs per endpoint. Try these variants in order; the first
 * that succeeds wins. (2025-04-15 values-reports use value_statistics; series
 * reports rejected value_statistics on that revision, so older/newer revisions
 * with conversion_value inside statistics are also tried.)
 */
const SERIES_VARIANTS: { revision: string; useValueStatistics: boolean }[] = [
  { revision: "2025-04-15", useValueStatistics: false },
  { revision: "2026-04-15", useValueStatistics: true },
  { revision: "2024-10-15", useValueStatistics: false },
];

function authHeaders(key: string, revision: string) {
  return {
    Authorization: `Klaviyo-API-Key ${key}`,
    revision,
    "content-type": "application/json",
    accept: "application/json",
  };
}

/** Klaviyo datetime: ISO 8601 with explicit offset, no milliseconds. */
function klaviyoDate(d: Date): string {
  return d.toISOString().slice(0, 19) + "+00:00";
}

function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${names[m - 1]} '${String(y).slice(2)}`;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * POST a Klaviyo report request. Retries on 429 up to 3 attempts.
 * Returns { json } on success, { status } on HTTP error, null on network error.
 */
async function postReport(
  url: string,
  body: unknown,
  key: string,
  revision: string,
  debug: string[]
): Promise<{ json?: unknown; status?: number } | null> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: authHeaders(key, revision),
        body: JSON.stringify(body),
        cache: "no-store",
      });
      if (res.status === 429) {
        debug.push(`${url} rev=${revision} attempt ${attempt} -> 429, retrying`);
        await sleep(1500 * attempt);
        continue;
      }
      if (!res.ok) {
        debug.push(`${url} rev=${revision} -> ${res.status}: ${(await res.text()).slice(0, 250)}`);
        return { status: res.status };
      }
      return { json: await res.json() };
    } catch (e) {
      debug.push(`${url} rev=${revision} attempt ${attempt} -> threw ${String(e).slice(0, 150)}`);
      await sleep(1000);
    }
  }
  return null;
}

type SeriesJson = {
  data?: {
    attributes?: {
      date_times?: string[];
      results?: { statistics?: { conversion_value?: number[] } }[];
    };
  };
};

/**
 * Monthly click-attributed conversion value from a series report.
 * Tries schema variants until one succeeds. Returns "YYYY-MM" -> value,
 * "not-found" if the endpoint doesn't exist, or null on failure.
 */
async function fetchMonthlySeries(
  kind: "flow" | "campaign",
  key: string,
  start: Date,
  end: Date,
  debug: string[]
): Promise<Map<string, number> | "not-found" | null> {
  const url = `https://a.klaviyo.com/api/${kind}-series-reports/`;
  for (const variant of SERIES_VARIANTS) {
    const attributes: Record<string, unknown> = {
      statistics: variant.useValueStatistics
        ? ["conversions"]
        : ["conversions", "conversion_value"],
      conversion_metric_id: PLACED_ORDER_METRIC_ID,
      interval: "monthly",
      timeframe: { start: klaviyoDate(start), end: klaviyoDate(end) },
      filter: "equals(send_channel,'email')",
    };
    if (variant.useValueStatistics) attributes.value_statistics = ["conversion_value"];

    const res = await postReport(
      url,
      { data: { type: `${kind}-series-report`, attributes } },
      key,
      variant.revision,
      debug
    );
    await sleep(1100); // burst limit is 1/s
    if (res === null) return null;
    if (res.status === 404) return "not-found";
    if (res.status) continue; // 400 etc — try next variant

    const json = res.json as SeriesJson;
    const dateTimes = json?.data?.attributes?.date_times;
    const results = json?.data?.attributes?.results;
    if (!Array.isArray(dateTimes) || !Array.isArray(results)) {
      debug.push(`${url} rev=${variant.revision} -> ok but unexpected shape: ${JSON.stringify(json)?.slice(0, 250)}`);
      continue;
    }
    const byMonth = new Map<string, number>();
    dateTimes.forEach((dt, i) => {
      const k = monthKey(new Date(dt));
      let sum = byMonth.get(k) ?? 0;
      for (const r of results) sum += Number(r?.statistics?.conversion_value?.[i] ?? 0);
      byMonth.set(k, sum);
    });
    debug.push(`${url} rev=${variant.revision} valueStats=${variant.useValueStatistics} -> OK`);
    return byMonth;
  }
  return null;
}

/**
 * Fallback: total click-attributed conversion value over a window via a
 * values report (known-good shape — the values endpoints accept
 * value_statistics on 2025-04-15). Lumped into the current month.
 */
async function fetchWindowTotal(
  kind: "flow" | "campaign",
  key: string,
  start: Date,
  end: Date,
  debug: string[]
): Promise<number | null> {
  const res = await postReport(
    `https://a.klaviyo.com/api/${kind}-values-reports/`,
    {
      data: {
        type: `${kind}-values-report`,
        attributes: {
          statistics: ["conversions"],
          value_statistics: ["conversion_value"],
          conversion_metric_id: PLACED_ORDER_METRIC_ID,
          timeframe: { start: klaviyoDate(start), end: klaviyoDate(end) },
          filter: "equals(send_channel,'email')",
        },
      },
    },
    key,
    "2025-04-15",
    debug
  );
  await sleep(1100);
  if (!res?.json) return null;
  const results = (res.json as { data?: { attributes?: { results?: { statistics?: { conversion_value?: number } }[] } } })
    ?.data?.attributes?.results;
  if (!Array.isArray(results)) return null;
  let sum = 0;
  for (const r of results) sum += Number(r?.statistics?.conversion_value ?? 0);
  return sum;
}

/** Total revenue (Placed Order, sum_value) over a rolling window. */
async function fetchTotalRevenue(
  key: string,
  start: Date,
  end: Date,
  debug: string[]
): Promise<number | null> {
  const res = await postReport(
    "https://a.klaviyo.com/api/metric-aggregates/",
    {
      data: {
        type: "metric-aggregate",
        attributes: {
          metric_id: PLACED_ORDER_METRIC_ID,
          measurements: ["sum_value"],
          interval: "month",
          timezone: "America/New_York",
          filter: [
            `greater-or-equal(datetime,${klaviyoDate(start)})`,
            `less-than(datetime,${klaviyoDate(end)})`,
          ],
        },
      },
    },
    key,
    "2025-04-15",
    debug
  );
  if (!res?.json) return null;
  const rows = (res.json as { data?: { attributes?: { data?: { measurements?: { sum_value?: number[] } }[] } } })
    ?.data?.attributes?.data;
  if (!Array.isArray(rows)) {
    debug.push("metric-aggregates -> ok but no data rows");
    return null;
  }
  let sum = 0;
  for (const row of rows) {
    for (const v of row?.measurements?.sum_value ?? []) sum += Number(v ?? 0);
  }
  return sum;
}

/**
 * Hybrid click-attributed email revenue:
 * baseline (pre-cutover months) + live series reports (post-cutover).
 * Falls back to REVENUE_SEED on any error or missing key. Never throws.
 */
export async function GET(request: Request) {
  const debug: string[] = [];
  const wantDebug = new URL(request.url).searchParams.has("debug");
  try {
    const key = process.env.KLAVIYO_PRIVATE_API_KEY;
    if (!key) return NextResponse.json(REVENUE_SEED);

    const now = new Date();
    const windowStart = new Date(now);
    windowStart.setMonth(windowStart.getMonth() - 12);
    const windowStartKey = monthKey(windowStart);

    // 1) Baseline months still inside the trailing-12-month window.
    const baselineInWindow = BASELINE_MONTHLY.filter((m) => m.key >= windowStartKey);
    const baselineSum = baselineInWindow.reduce((s, m) => s + m.value, 0);

    // 2) Live click-only monthly series from the cutover forward (sequential).
    const liveStart = CUTOVER > windowStart ? CUTOVER : windowStart;
    const liveByMonth = new Map<string, number>();
    let liveFailed = false;

    for (const kind of ["flow", "campaign"] as const) {
      let series = await fetchMonthlySeries(kind, key, liveStart, now, debug);
      if (series === "not-found" || series === null) {
        // Endpoint missing or all variants failed — fall back to a window
        // total lumped into the current month.
        const total = await fetchWindowTotal(kind, key, liveStart, now, debug);
        if (total === null) {
          liveFailed = true;
          continue;
        }
        series = new Map([[monthKey(now), total]]);
      }
      for (const [k, v] of series) liveByMonth.set(k, (liveByMonth.get(k) ?? 0) + v);
    }

    let liveSum = 0;
    for (const v of liveByMonth.values()) liveSum += v;

    const emailAttributedRevenue = baselineSum + liveSum;

    // 3) Total revenue over the same rolling window (attribution-independent).
    const liveTotal = await fetchTotalRevenue(key, windowStart, now, debug);
    const totalRevenue = liveTotal && liveTotal > 0 ? liveTotal : REVENUE_SEED.totalRevenue;

    const sharePct = Math.round((emailAttributedRevenue / totalRevenue) * 1000) / 10;

    // 4) Chart series: baseline months + live months, in order.
    const liveMonths = [...liveByMonth.entries()]
      .filter(([k]) => !baselineInWindow.some((b) => b.key === k))
      .sort(([a], [b]) => (a < b ? -1 : 1));
    const series = [
      ...baselineInWindow.map((m) => ({ label: m.label, value: m.value })),
      ...liveMonths.map(([k, v]) => ({ label: monthLabel(k), value: Math.round(v) })),
    ];

    const live: RevenueData = {
      emailAttributedRevenue: Math.round(emailAttributedRevenue),
      totalRevenue: Math.round(totalRevenue),
      sharePct,
      targetPct: REVENUE_SEED.targetPct,
      monthlySeries: series.map((m) => m.value),
      monthlyLabels: series.map((m) => m.label),
      source: liveFailed ? "seed" : "live",
    };
    if (wantDebug) return NextResponse.json({ ...live, _debug: debug });
    return NextResponse.json(live);
  } catch (e) {
    if (wantDebug) {
      return NextResponse.json({ ...REVENUE_SEED, _debug: [...debug, `GET threw ${String(e).slice(0, 200)}`] });
    }
    return NextResponse.json(REVENUE_SEED);
  }
}
