// ============================================================================
// PPW Command — collection config for the popup testing loop.
// Source: PPW Popup Testing Loop spec (AOVs from order history; discounts set
// with the business partner — treated as FIXED inputs; the engine tests
// everything around them, not the discount itself).
// ============================================================================

export interface CollectionDef {
  id: string;
  name: string;
  /** Matches Klaviyo form names to this collection */
  match: RegExp;
  aov: number | null;
  aovNote?: string;
  discount: string;
  resource: string; // paired lead magnet
  highTicket: boolean; // for transfer-test recommendations
}

export const COLLECTIONS: CollectionDef[] = [
  {
    id: "general",
    name: "General (sitewide)",
    match: /general/i,
    aov: null,
    discount: "$100 off",
    resource: "Wellness starter guide / quiz",
    highTicket: false,
  },
  {
    id: "sauna",
    name: "Sauna",
    match: /sauna(?!\s*heater)/i,
    aov: 2312,
    discount: "$250 off", // priority-collection treatment; standard rule = $150-160 (Ryan to confirm)
    resource: "Sauna sizing and installation guide",
    highTicket: true,
  },
  {
    id: "sauna-heaters",
    name: "Sauna Heaters",
    match: /heater/i,
    aov: null,
    discount: "$100 off",
    resource: "Heater sizing guide",
    highTicket: false,
  },
  {
    id: "cold-plunge",
    name: "Cold Plunge",
    match: /cold|plunge|chiller/i,
    aov: 6085,
    aovNote: "on 2 orders — low confidence",
    discount: "$350 flat (hold pending more data)",
    resource: "Cold plunge placement and setup guide",
    highTicket: true,
  },
  {
    id: "hyperbaric",
    name: "Hyperbaric",
    match: /hyperbaric/i,
    aov: 12915,
    discount: "$350 flat, capped",
    resource: "Hyperbaric buyer's guide + consult booking",
    highTicket: true,
  },
  {
    id: "red-light",
    name: "Red Light Therapy",
    match: /red light|kineon/i,
    aov: 489,
    discount: "$25",
    resource: "Red light protocol and usage guide",
    highTicket: false,
  },
  {
    id: "hydrogen-water",
    name: "Hydrogen Water",
    match: /echo|hydrogen|water/i,
    aov: 677,
    discount: "$40",
    resource: "Hydrogen water usage and benefits guide",
    highTicket: false,
  },
  {
    id: "home-gym",
    name: "Home Gym / Cardio",
    match: /stepr|fitness|gym|cardio/i,
    aov: 1052,
    discount: "$65",
    resource: "Equipment fit and space planning guide",
    highTicket: false,
  },
  {
    id: "recovery",
    name: "Recovery Tools",
    match: /recovery/i,
    aov: 243,
    discount: "$15",
    resource: "Recovery protocol guide",
    highTicket: false,
  },
  {
    id: "steam",
    name: "Steam / Shower",
    match: /steam|shower/i,
    aov: 1236,
    discount: "$70",
    resource: "Steam room setup guide",
    highTicket: false,
  },
];

// ---------------------------------------------------------------------------
// Test variables (the levers, in the order the engine cycles through them —
// trigger/timing moves opt-in most, then format, then content refinements)
// ---------------------------------------------------------------------------

export interface TestVariable {
  id: string;
  label: string;
  bestFit: string;
  note?: string;
}

export const TRIGGERS: TestVariable[] = [
  { id: "delay-5-8", label: "Time delay 5–8s", bestFit: "Product pages, general baseline" },
  { id: "delay-15-20", label: "Time delay 15–20s", bestFit: "Higher-ticket pages — visitors read longer", note: "Test vs the short delay on sauna & hyperbaric" },
  { id: "scroll-35-50", label: "Scroll depth 35–50%", bestFit: "Blog and guide content — catches an engaged reader" },
  { id: "exit-intent", label: "Exit intent", bestFit: "Safety net anywhere; PRIMARY candidate for high-ticket product pages", note: "Past form data showed this beating timed popups on expensive items" },
  { id: "second-page", label: "Second page visited", bestFit: "Any page — signals browsing, not bouncing" },
];

export const FORMATS: TestVariable[] = [
  { id: "modal", label: "Standard centered modal", bestFit: "General baseline — the safe default to test against" },
  { id: "slide-in", label: "Slide-in (corner/side)", bestFit: "Mobile default candidate — lower friction", note: "Most PPW traffic is mobile" },
  { id: "fullscreen", label: "Fullscreen takeover", bestFit: "High-intent pages, use sparingly", note: "Watch close rate, not just opt-in rate" },
  { id: "bottom-bar", label: "Bottom bar", bestFit: "Blog/education pages — least intrusive" },
  { id: "multi-step", label: "Multi-step (question → email)", bestFit: "Paired with a quiz or guide offer — feels earned" },
];

export const CONTENT_LEVERS: TestVariable[] = [
  { id: "headline", label: "Headline: outcome vs curiosity", bestFit: "\"Get your sauna sized right\" vs \"The one sauna sizing mistake most buyers make\"" },
  { id: "copy-length", label: "Body copy: one line vs 2-3 lines", bestFit: "Longer works when a guide needs justifying" },
  { id: "cta-text", label: "CTA: direct vs soft", bestFit: "\"Get my guide\" vs \"Show me how to size mine\"" },
  { id: "resource-framing", label: "Resource framing: generic vs named", bestFit: "\"Free guide\" underperforms \"Sauna Sizing and Installation Guide\"" },
  { id: "social-proof", label: "Social proof line: with vs without", bestFit: "Order count or review snippet" },
  { id: "image", label: "Product image: with vs without", bestFit: "Low priority — public benchmarks show little difference. Run last, if at all" },
];

/** The engine's lever priority order. */
export const LEVER_ORDER = ["trigger", "format", "content"] as const;
export type Lever = (typeof LEVER_ORDER)[number];

export function findCollection(id: string): CollectionDef | undefined {
  return COLLECTIONS.find((c) => c.id === id);
}

export function collectionForFormName(formName: string): CollectionDef | undefined {
  return COLLECTIONS.find((c) => c.match.test(formName));
}
