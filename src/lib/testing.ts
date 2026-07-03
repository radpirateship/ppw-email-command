// ============================================================================
// PPW Command — popup testing loop: types, client store (KV w/ localStorage
// fallback), and the recommendation engine.
// Logic per the "PPW Popup Testing Loop" spec: threshold-based (no stats model
// needed at this volume), recommendations in priority order, approval-first.
// ============================================================================

import type { OptInData, PopupRow } from "@/lib/data";
import {
  COLLECTIONS,
  findCollection,
  type CollectionDef,
  type Lever,
} from "@/lib/collections";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TestVariant {
  /** Klaviyo form name, exactly as it appears in form analytics */
  formName: string;
  label: string; // e.g. "A — exit intent"
}

export interface TestRecord {
  id: string;
  collectionId: string;
  lever: Lever;
  hypothesis: string;
  variants: TestVariant[];
  status: "running" | "concluded";
  startedAt: string;
  concludedAt?: string;
  winnerFormName?: string;
  learning?: string;
}

export interface HistoryEntry {
  id: string;
  at: string;
  type: "test-started" | "winner-called" | "rec-approved" | "rec-dismissed" | "note";
  collectionId: string;
  summary: string;
}

// Thresholds from the spec
export const MIN_IMPRESSIONS = 1000;
const MIN_RELATIVE_GAP = 0.25; // leader must beat runner-up by 25%+
const MIN_ABSOLUTE_GAP = 0.003; // and by 0.3pp+

// ---------------------------------------------------------------------------
// Client store — /api/store (KV) with localStorage fallback
// ---------------------------------------------------------------------------

async function loadKey<T>(key: string, fallback: T): Promise<{ value: T; backend: "kv" | "local" }> {
  try {
    const res = await fetch(`/api/store?key=${key}`);
    if (res.ok) {
      const data = await res.json();
      return { value: (data.value as T) ?? fallback, backend: "kv" };
    }
  } catch {
    /* fall through */
  }
  try {
    const raw = localStorage.getItem(key);
    return { value: raw ? (JSON.parse(raw) as T) : fallback, backend: "local" };
  } catch {
    return { value: fallback, backend: "local" };
  }
}

async function saveKey<T>(key: string, value: T): Promise<"kv" | "local"> {
  try {
    const res = await fetch("/api/store", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
    if (res.ok) return "kv";
  } catch {
    /* fall through */
  }
  localStorage.setItem(key, JSON.stringify(value));
  return "local";
}

export const loadTests = () => loadKey<TestRecord[]>("ppw_tests", []);
export const saveTests = (t: TestRecord[]) => saveKey("ppw_tests", t);
export const loadHistory = () => loadKey<HistoryEntry[]>("ppw_history", []);
export const saveHistory = (h: HistoryEntry[]) => saveKey("ppw_history", h);

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

// ---------------------------------------------------------------------------
// Recommendation engine
// ---------------------------------------------------------------------------

export interface Recommendation {
  id: string;
  action: "call-winner" | "keep-running" | "extend-or-wash" | "start-test" | "transfer-test" | "shift-focus";
  collectionId: string;
  collectionName: string;
  title: string;
  reasoning: string[];
  /** For call-winner */
  testId?: string;
  winnerFormName?: string;
  /** For start-test / transfer-test: prefill for the Popup Studio */
  prefill?: { lever: Lever; suggestion: string };
}

interface CollectionStats {
  def: CollectionDef;
  forms: PopupRow[];
  views: number;
  submits: number;
  rate: number;
}

function statsFor(optin: OptInData): CollectionStats[] {
  return COLLECTIONS.map((def) => {
    const forms = optin.popups.filter((p) => def.match.test(p.name));
    const views = forms.reduce((s, f) => s + f.views, 0);
    const submits = forms.reduce((s, f) => s + f.submits, 0);
    return { def, forms, views, submits, rate: views > 0 ? submits / views : 0 };
  });
}

const fmtPct = (r: number) => `${(r * 100).toFixed(2)}%`;

export function computeRecommendations(
  optin: OptInData,
  tests: TestRecord[]
): Recommendation[] {
  const recs: Recommendation[] = [];
  const stats = statsFor(optin);
  const target = optin.targetRate;
  const byForm = new Map(optin.popups.map((p) => [p.name.toLowerCase(), p]));

  // --- 1) Running tests: readable? ---------------------------------------
  for (const test of tests.filter((t) => t.status === "running")) {
    const col = findCollection(test.collectionId);
    const variantStats = test.variants.map((v) => ({
      variant: v,
      row: byForm.get(v.formName.toLowerCase()),
    }));
    const missing = variantStats.filter((v) => !v.row);
    if (missing.length) {
      recs.push({
        id: `datagap-${test.id}`,
        action: "keep-running",
        collectionId: test.collectionId,
        collectionName: col?.name ?? test.collectionId,
        title: `Data gap on "${test.hypothesis}"`,
        reasoning: [
          `No form analytics found for: ${missing.map((m) => m.variant.formName).join(", ")}.`,
          "Check the form name matches Klaviyo exactly (edit the test to fix).",
        ],
        testId: test.id,
      });
      continue;
    }
    const rows = variantStats.map((v) => ({ v: v.variant, row: v.row! }));
    const underVolume = rows.filter((r) => r.row.views < MIN_IMPRESSIONS);
    if (underVolume.length) {
      recs.push({
        id: `running-${test.id}`,
        action: "keep-running",
        collectionId: test.collectionId,
        collectionName: col?.name ?? test.collectionId,
        title: `Keep running: ${test.hypothesis}`,
        reasoning: [
          ...rows.map((r) => `${r.v.label}: ${fmtPct(r.row.rate)} (${r.row.views.toLocaleString()} of ${MIN_IMPRESSIONS.toLocaleString()} impressions)`),
          "Below the volume threshold — a recommendation now would be a guess.",
        ],
        testId: test.id,
      });
      continue;
    }
    const sorted = [...rows].sort((a, b) => b.row.rate - a.row.rate);
    const [leader, runnerUp] = sorted;
    const absGap = leader.row.rate - runnerUp.row.rate;
    const relGap = runnerUp.row.rate > 0 ? absGap / runnerUp.row.rate : 1;
    if (absGap >= MIN_ABSOLUTE_GAP && relGap >= MIN_RELATIVE_GAP) {
      recs.push({
        id: `winner-${test.id}`,
        action: "call-winner",
        collectionId: test.collectionId,
        collectionName: col?.name ?? test.collectionId,
        title: `Call it: "${leader.v.label}" wins ${test.hypothesis}`,
        reasoning: [
          ...sorted.map((r) => `${r.v.label}: ${fmtPct(r.row.rate)} on ${r.row.views.toLocaleString()} impressions`),
          `Gap is ${(relGap * 100).toFixed(0)}% relative / ${(absGap * 100).toFixed(2)}pp absolute — beyond noise at this volume.`,
          "Roll the winner out as the new baseline for this collection, then test the next lever.",
        ],
        testId: test.id,
        winnerFormName: leader.v.formName,
      });
    } else {
      recs.push({
        id: `wash-${test.id}`,
        action: "extend-or-wash",
        collectionId: test.collectionId,
        collectionName: col?.name ?? test.collectionId,
        title: `Too close to call: ${test.hypothesis}`,
        reasoning: [
          ...sorted.map((r) => `${r.v.label}: ${fmtPct(r.row.rate)} on ${r.row.views.toLocaleString()} impressions`),
          "Both variants cleared volume but the gap is inside the noise band.",
          "Either extend for another cycle, or call it a wash — keep the simpler variant and move to the next lever.",
        ],
        testId: test.id,
        winnerFormName: leader.v.formName,
      });
    }
  }

  const runningCollections = new Set(tests.filter((t) => t.status === "running").map((t) => t.collectionId));
  const testedLevers = (colId: string) => new Set(tests.filter((t) => t.collectionId === colId).map((t) => t.lever));

  // --- 2) Below-target collections with no running test ------------------
  const below = stats
    .filter((s) => s.forms.length > 0 && s.rate < target && !runningCollections.has(s.def.id))
    .sort((a, b) => b.views - a.views); // biggest leak first
  for (const s of below) {
    const done = testedLevers(s.def.id);
    const lever: Lever = !done.has("trigger") ? "trigger" : !done.has("format") ? "format" : "content";
    const suggestion =
      lever === "trigger"
        ? s.def.highTicket
          ? "Exit intent vs time delay 15–20s (high-ticket pages: visitors read longer; your past data favored exit intent on expensive items)"
          : "Time delay 5–8s vs scroll depth 35–50%"
        : lever === "format"
          ? "Standard centered modal vs slide-in (slide-in is the likely mobile winner given PPW's mobile-heavy traffic)"
          : "Resource framing: generic \"free guide\" vs the specifically-named guide";
    recs.push({
      id: `start-${s.def.id}`,
      action: "start-test",
      collectionId: s.def.id,
      collectionName: s.def.name,
      title: `Start a ${lever} test on ${s.def.name}`,
      reasoning: [
        `Current opt-in ${fmtPct(s.rate)} vs ${fmtPct(target)} target, on ${s.views.toLocaleString()} impressions — ${s.views >= 20000 ? "high traffic makes this the biggest leak" : "meaningful volume"}.`,
        `No test running, and ${lever} is the highest-leverage untested variable here (trigger moves opt-in most, then format, then content).`,
        `Suggested first matchup: ${suggestion}.`,
      ],
      prefill: { lever, suggestion },
    });
  }

  // --- 3) Transfer wins between similar collections ----------------------
  const concludedWins = tests.filter((t) => t.status === "concluded" && t.winnerFormName);
  for (const win of concludedWins) {
    const winCol = findCollection(win.collectionId);
    if (!winCol?.highTicket) continue;
    for (const s of stats) {
      if (!s.def.highTicket || s.def.id === win.collectionId) continue;
      if (runningCollections.has(s.def.id)) continue;
      if (testedLevers(s.def.id).has(win.lever)) continue;
      if (s.rate >= target) continue;
      recs.push({
        id: `transfer-${win.id}-${s.def.id}`,
        action: "transfer-test",
        collectionId: s.def.id,
        collectionName: s.def.name,
        title: `Transfer ${winCol.name}'s winning ${win.lever} to ${s.def.name}`,
        reasoning: [
          `${winCol.name} concluded "${win.hypothesis}" with a winner — both are high-ticket collections with similar buying behavior.`,
          `${s.def.name} hasn't tested ${win.lever} yet. Trying the proven variant beats inventing a new test from scratch.`,
        ],
        prefill: { lever: win.lever, suggestion: `Apply the winner from ${winCol.name}: ${win.hypothesis}` },
      });
    }
  }

  // --- 4) At-target collections → shift focus (informational) ------------
  for (const s of stats.filter((x) => x.forms.length > 0 && x.rate >= target)) {
    recs.push({
      id: `ontarget-${s.def.id}`,
      action: "shift-focus",
      collectionId: s.def.id,
      collectionName: s.def.name,
      title: `${s.def.name} is at target — leave it alone`,
      reasoning: [
        `${fmtPct(s.rate)} vs ${fmtPct(target)} target. Attention is better spent on collections still leaking.`,
      ],
    });
  }

  const order: Record<Recommendation["action"], number> = {
    "call-winner": 0,
    "extend-or-wash": 1,
    "start-test": 2,
    "transfer-test": 3,
    "keep-running": 4,
    "shift-focus": 5,
  };
  return recs.sort((a, b) => order[a.action] - order[b.action]);
}
