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

// Monthly email-attributed revenue series (May 2025 -> May 2026)
export const MONTHLY_EMAIL_REVENUE: number[] = [
  0, 0, 218.9, 997, 969.99, 0, 10743, 4441.63, 34273.77, 19393.2, 4010.51, 29210.39, 22907.93,
];

export const MONTHLY_LABELS: string[] = [
  "May '25",
  "Jun '25",
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
];

// NOTE: emailAttributedRevenue below is Klaviyo's DEFAULT open+click attribution,
// which counts anyone who merely OPENED an email. That OVERSTATES true email impact.
// A click-only recompute is PENDING; until then treat sharePct as overstated, not an
// achievement. Target stays at 10%.
export const REVENUE_SEED: RevenueData = {
  emailAttributedRevenue: 127166,
  totalRevenue: 1030875,
  sharePct: 12.3,
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
