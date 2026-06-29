/**
 * PPW Command — phased roadmap / task backlog.
 * Single source of truth for the Home (This Week) and Plan tabs.
 */

export type Priority = "high" | "med" | "low";

export interface Task {
  id: string;
  phase: string;
  title: string;
  why: string;
  priority: Priority;
  est: string;
}

const make = (
  phase: string,
  rows: Array<[string, string, Priority, string]>
): Task[] =>
  rows.map(([title, why, priority, est], i) => ({
    // Stable, deterministic id derived from phase + index (used as localStorage key).
    id: `${slug(phase)}-${i}`,
    phase,
    title,
    why,
    priority,
    est,
  }));

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export const TASKS: Task[] = [
  ...make("Phase 0 — Quick wins (Week 1)", [
    [
      "QA + activate Saunas Browse Abandonment",
      "Built but sitting in Draft — free money turned off.",
      "high",
      "30 min",
    ],
    [
      "QA + activate Saunas Abandoned Cart",
      "Built, in Draft. Recovers high-intent sauna shoppers.",
      "high",
      "30 min",
    ],
    ["QA + activate Echo Water Abandoned Checkout", "Built, in Draft.", "high", "20 min"],
    [
      "Archive the two empty 'Essential Flow Recommendation_' drafts",
      "Junk Klaviyo defaults.",
      "low",
      "5 min",
    ],
    [
      "Audit & consolidate stray lists",
      "Merge toward one master + segments.",
      "med",
      "45 min",
    ],
  ]),
  ...make("Phase 0B — Popups & opt-in (co-first focus)", [
    [
      "Rebuild the General Desktop popup — your #1 leak",
      "62,436 views/yr at 0.67%. Lifting to ~2.5% ≈ 4x signups from your biggest source.",
      "high",
      "2 hrs",
    ],
    [
      "Fix popup timing — stop firing on arrival",
      "Use ~30–40% scroll, exit-intent, or 15–20s delay.",
      "high",
      "30 min",
    ],
    [
      "Test discount + content offer (buyer's guide)",
      "Keep the cash discount AND add a value hook; A/B vs discount-only.",
      "high",
      "1.5 hrs",
    ],
    [
      "Redesign + consolidate the 16 popups",
      "Specific+mobile already convert best (3–4.6%). Standardize one template.",
      "med",
      "1.5 hrs",
    ],
  ]),
  ...make("Phase 1 — Fundamentals (Weeks 2–4)", [
    [
      "Rebuild the General Welcome flow",
      "The current 'Standard – Welcome Series' is weak. Rebuild it modeled on the strong Sauna flow, plus the missing lifecycle elements.",
      "high",
      "2.5 hrs",
    ],
    [
      "Round out the Sauna welcome with missing elements",
      "Sauna flow is good; add the few missing pieces (review ask, consult invite, an SMS touch).",
      "med",
      "1 hr",
    ],
    [
      "Build the Post-Purchase flow",
      "Confirmation → shipping → setup → check-in → review request → accessory upsell.",
      "high",
      "3 hrs",
    ],
    ["Add SMS to abandoned checkout", "783 SMS subscribers sitting unused.", "high", "1 hr"],
    [
      "Build Win-Back flow",
      "90–120 days no purchase; segment already exists.",
      "med",
      "1.5 hrs",
    ],
    [
      "Build Sunset / hygiene flow",
      "No opens in 90 days; protects deliverability.",
      "med",
      "1 hr",
    ],
  ]),
  ...make("SMS track (parallel to email)", [
    [
      "Grow SMS consent (checkout checkbox + SMS popup)",
      "Only 783 SMS subs — capture more at checkout and on popups.",
      "high",
      "1 hr",
    ],
    [
      "SMS on abandoned checkout & cart",
      "One text 30–60 min after, for high-intent carts.",
      "high",
      "1 hr",
    ],
    [
      "SMS on browse abandonment (high-ticket)",
      "Single text for repeat viewers of $2K+ items.",
      "med",
      "45 min",
    ],
    [
      "Post-purchase SMS: shipping & delivery updates",
      "Transactional-style texts build trust on big orders.",
      "med",
      "1 hr",
    ],
    [
      "SMS win-back nudge",
      "One text to lapsed buyers alongside the email win-back.",
      "med",
      "30 min",
    ],
    [
      "Monthly SMS campaign (1–2/mo max)",
      "Pair with your biggest email sends; keep it rare so it stays high-signal.",
      "low",
      "ongoing",
    ],
  ]),
  ...make("Phase 2 — Product lines + accessory engine (Weeks 5–10)", [
    [
      "Build Sauna Accessory Replenishment flow",
      "Stones/elements/sensors are top sellers — your repeat engine.",
      "high",
      "2 hrs",
    ],
    ["Hyperbaric nurture", "Very high AOV; segment from master.", "med", "1.5 hrs"],
  ]),
  ...make("Phase 3 — Weekly campaigns", [
    ["Build repeatable weekly campaign template", "Navy/blue brand.", "high", "1 hr"],
    [
      "Build 8-week campaign calendar from existing content",
      "Reuse topical-authority library.",
      "med",
      "2 hrs",
    ],
  ]),
];

/** Ordered list of phases (preserves declaration order). */
export const PHASES: string[] = Array.from(new Set(TASKS.map((t) => t.phase)));

/** Priority sort weight (high first). */
export const PRIORITY_WEIGHT: Record<Priority, number> = { high: 0, med: 1, low: 2 };
