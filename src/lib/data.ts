/**
 * PPW Command — typed data layer.
 *
 * Exports a SEEDED SNAPSHOT of real Peak Primal Wellness data so every page
 * renders instantly without API keys. The API routes under /api/* attempt live
 * fetches when env keys are present and gracefully fall back to this snapshot.
 */

export interface PopupRow {
  name: string;
  views: number;
  submits: number;
  rate: number; // submit rate as a decimal (0.0067 = 0.67%)
}

export interface OptInData {
  popupViews: number;
  popupSubmits: number;
  blendedRate: number; // decimal, e.g. 0.011 = 1.1%
  targetRate: number; // decimal, e.g. 0.025 = 2.5%
  popups: PopupRow[];
  source: "seed" | "live";
}

/** One month of blended opt-in performance. */
export interface MonthlyOptInPoint {
  label: string; // e.g. "Dec '25"
  rate: number; // blended submit rate as a decimal (0.0103 = 1.03%)
}

export interface MonthlyOptInData {
  points: MonthlyOptInPoint[];
  targetRate: number; // decimal, e.g. 0.025
  source: "seed" | "live";
}

export interface RevenueData {
  emailAttributedRevenue: number;
  totalRevenue: number;
  sharePct: number; // percentage, e.g. 12.3
  targetPct: number; // percentage, e.g. 10
  /** Monthly email-attributed revenue, May 2025 -> May 2026 */
  monthlySeries: number[];
  monthlyLabels: string[];
  source: "seed" | "live";
}

export interface FlowStatus {
  builtButOff: string[];
  missing: string[];
}

/** Live account overview for Home tiles and Goals recommendations. */
export interface OverviewData {
  subscribers: { email: number; sms: number };
  flows: {
    live: number | null;
    builtButOff: string[];
    missing: string[];
    drafts: number | null;
  };
  source: "seed" | "live";
  fetchedAt: string;
}

// --- Subscribers --------------------------------------------------------------

export const SUBSCRIBERS = {
  email: 2023,
  sms: 783,
};

// --- Opt-in seed --------------------------------------------------------------

export const POPUPS: PopupRow[] = [
  { name: "General — Desktop ($100 off)", views: 62436, submits: 445, rate: 0.0067 },
  { name: "General — Mobile ($100 off)", views: 47451, submits: 753, rate: 0.0149 },
  { name: "Sauna — Mobile ($250 off)", views: 14631, submits: 106, rate: 0.0057 },
  { name: "Sauna — Desktop ($250 off)", views: 9100, submits: 60, rate: 0.005 },
  { name: "Sauna Heater — Desktop ($100 off)", views: 4773, submits: 52, rate: 0.01 },
  { name: "Echo Water — Mobile ($250 off)", views: 1521, submits: 61, rate: 0.0372 },
  { name: "Stepr — Desktop ($500 off)", views: 634, submits: 23, rate: 0.0323 },
  { name: "Kineon ($25 off)", views: 102, submits: 6, rate: 0.0458 },
];

export const OPTIN_SEED: OptInData = {
  popupViews: 150564,
  popupSubmits: 1668,
  blendedRate: 0.011,
  targetRate: 0.025,
  popups: POPUPS,
  source: "seed",
};

// --- Monthly opt-in trend seed (real, last 6 months) --------------------------
// Blended submit rate (submits / views) across all signup forms per month.
export const MONTHLY_OPTIN_SEED: MonthlyOptInData = {
  points: [
    { label: "Dec '25", rate: 0.0103 },
    { label: "Jan '26", rate: 0.0129 },
    { label: "Feb '26", rate: 0.0118 },
    { label: "Mar '26", rate: 0.0076 },
    { label: "Apr '26", rate: 0.0109 },
    { label: "May '26", rate: 0.009 },
  ],
  targetRate: 0.025,
  source: "seed",
};

// --- Revenue seed -------------------------------------------------------------

// Monthly CLICK-ONLY email-attributed revenue (Jul 2025 -> Jun 2026).
// Pre-cutover months = old open+click shape scaled to the verified $28,057
// click-only total (Email_Revenue_Baseline.xlsx, factor ~0.2206). Jun '26 is a
// ratio-scaled estimate. Account switched to click-only attribution ~Jul 1 2026;
// see /api/klaviyo/revenue for the hybrid live logic.
export const MONTHLY_EMAIL_REVENUE: number[] = [
  48, 220, 214, 0, 2370, 980, 7562, 4279, 885, 6445, 5054, 241,
];

export const MONTHLY_LABELS: string[] = [
  "Jul '25",
  "Aug '25",
  "Sep '25",
  "Oct '25",
  "Nov '25",
  "Dec '25",
  "Jan '26",
  "Feb '26",
  "Mar '26",
  "Apr '26",
  "May '26",
  "Jun '26",
];

// Click-attributed (verified via manual pull after the attribution switch).
// Flows $28,057 + campaigns $0 = $28,057 email-driven revenue; total revenue $1,012,386 (trailing 12 mo) => ~2.8% share.
// Target stays at 10%, so status is BEHIND. Do NOT revert to Klaviyo's open+click figures (~$127K-166K) — overstated ~4.5-6x.
export const REVENUE_SEED: RevenueData = {
  emailAttributedRevenue: 28057,
  totalRevenue: 1012386,
  sharePct: 2.8,
  targetPct: 10,
  monthlySeries: MONTHLY_EMAIL_REVENUE,
  monthlyLabels: MONTHLY_LABELS,
  source: "seed",
};

// --- Flow status --------------------------------------------------------------

export const FLOW_STATUS: FlowStatus = {
  builtButOff: [
    "Saunas Browse Abandonment",
    "Saunas Abandoned Cart",
    "Echo Water Abandoned Checkout",
  ],
  missing: [
    "Post-purchase (beyond order confirmation)",
    "Review request",
    "Win-back",
    "Sunset / list hygiene",
    "Sauna accessory replenishment",
  ],
};

// --- Formatting helpers -------------------------------------------------------

export function formatCurrency(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export function formatPct(decimal: number, digits = 1): string {
  return `${(decimal * 100).toFixed(digits)}%`;
}

export function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}
