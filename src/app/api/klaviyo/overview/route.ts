import { NextResponse } from "next/server";
import { SUBSCRIBERS, FLOW_STATUS, type OverviewData } from "@/lib/data";

export const dynamic = "force-dynamic";

/**
 * Account overview for the Home page tiles and the Goals recommendations.
 *
 *  - Subscribers: profile_count of the main Email List and SMS List.
 *  - Flows: every non-archived flow with its status, used to work out which
 *    flows are built but switched off and which core flows are still missing.
 *
 * Each part falls back to the seed snapshot on its own, so one failing call
 * never blanks the whole page.
 */

const REVISION = "2024-10-15";
const EMAIL_LIST_ID = process.env.KLAVIYO_EMAIL_LIST_ID || "SJ2uXJ"; // "Email List"
const SMS_LIST_ID = process.env.KLAVIYO_SMS_LIST_ID || "UdC6wd"; // "SMS List"

/** Core lifecycle flows we expect to exist and be live. */
const CORE_FLOWS: { label: string; match: RegExp }[] = [
  { label: "Post-purchase (beyond order confirmation)", match: /post[\s-]?purchase|thank you|onboarding/i },
  { label: "Review request", match: /review/i },
  { label: "Win-back", match: /win[\s-]?back|lapsed/i },
  { label: "Sunset / list hygiene", match: /sunset|list hygiene|re-?engage/i },
  { label: "Sauna accessory replenishment", match: /replenish|accessor/i },
];

/** Abandonment-type flows: these are the ones worth flagging when off. */
const RECOVERY = /abandon|browse|cart|checkout/i;

function headers(key: string) {
  return {
    Authorization: `Klaviyo-API-Key ${key}`,
    revision: REVISION,
    accept: "application/json",
  };
}

async function listCount(key: string, id: string): Promise<number | null> {
  // profile_count is rate limited hard (about 15/min), so cache for 5 minutes.
  const res = await fetch(
    `https://a.klaviyo.com/api/lists/${id}/?additional-fields[list]=profile_count`,
    { headers: headers(key), next: { revalidate: 300 } }
  );
  if (!res.ok) return null;
  const json = await res.json();
  const n = Number(json?.data?.attributes?.profile_count);
  return Number.isFinite(n) ? n : null;
}

interface FlowRow {
  name: string;
  status: string;
}

async function allFlows(key: string): Promise<FlowRow[] | null> {
  const out: FlowRow[] = [];
  let url: string | null =
    "https://a.klaviyo.com/api/flows/?fields[flow]=name,status,archived&filter=equals(archived,false)&page[size]=50";
  for (let i = 0; url && i < 10; i++) {
    const res: Response = await fetch(url, { headers: headers(key), cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    for (const f of json?.data ?? []) {
      out.push({ name: String(f?.attributes?.name ?? ""), status: String(f?.attributes?.status ?? "") });
    }
    url = json?.links?.next ?? null;
  }
  return out;
}

export async function GET() {
  const fetchedAt = new Date().toISOString();
  const seed: OverviewData = {
    subscribers: { ...SUBSCRIBERS },
    flows: {
      live: null,
      builtButOff: FLOW_STATUS.builtButOff,
      missing: FLOW_STATUS.missing,
      drafts: null,
    },
    source: "seed",
    fetchedAt,
  };

  const key = process.env.KLAVIYO_PRIVATE_API_KEY;
  if (!key) return NextResponse.json(seed);

  const [email, sms, flows] = await Promise.all([
    listCount(key, EMAIL_LIST_ID).catch(() => null),
    listCount(key, SMS_LIST_ID).catch(() => null),
    allFlows(key).catch(() => null),
  ]);

  const data: OverviewData = { ...seed, subscribers: { ...seed.subscribers }, flows: { ...seed.flows } };
  let anyLive = false;

  if (email !== null) {
    data.subscribers.email = email;
    anyLive = true;
  }
  if (sms !== null) {
    data.subscribers.sms = sms;
    anyLive = true;
  }

  if (flows) {
    anyLive = true;
    const live = flows.filter((f) => f.status === "live");
    const recoveryLive = live.filter((f) => RECOVERY.test(f.name));
    // Built but off = recovery flows that are paused (manual) or sitting in draft,
    // unless a live flow already covers the same thing (e.g. an older version
    // left in manual after a "v2" went live).
    const norm = (s: string) =>
      s.toLowerCase().replace(/\bv\d+\b/g, "").replace(/[^a-z]/g, "");
    const liveKeys = new Set(recoveryLive.map((f) => norm(f.name)));
    data.flows.builtButOff = flows
      .filter((f) => f.status !== "live" && RECOVERY.test(f.name))
      .filter((f) => !liveKeys.has(norm(f.name)))
      .map((f) => f.name);
    data.flows.missing = CORE_FLOWS.filter((c) => !live.some((f) => c.match.test(f.name))).map(
      (c) => c.label
    );
    data.flows.live = live.length;
    data.flows.drafts = flows.filter((f) => f.status === "draft").length;
  }

  if (anyLive) data.source = "live";
  return NextResponse.json(data);
}
