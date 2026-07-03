"use client";

// Testing — the feedback loop: live scoreboard, engine recommendations
// (approve / dismiss), running tests, and the history log.

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader, ProgressBar } from "@/components/ui";
import { OPTIN_SEED, formatNumber, formatPct, type OptInData } from "@/lib/data";
import { COLLECTIONS } from "@/lib/collections";
import {
  computeRecommendations,
  loadTests,
  saveTests,
  loadHistory,
  saveHistory,
  newId,
  MIN_IMPRESSIONS,
  type TestRecord,
  type HistoryEntry,
  type Recommendation,
} from "@/lib/testing";

const btnSmall =
  "rounded-lg bg-navy px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-50";
const btnGhost =
  "rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-slate-200";

const ACTION_STYLE: Record<Recommendation["action"], { label: string; cls: string }> = {
  "call-winner": { label: "Call the winner", cls: "bg-emerald-50 text-emerald-700 ring-emerald-100" },
  "extend-or-wash": { label: "Too close", cls: "bg-amber-50 text-amber-700 ring-amber-100" },
  "start-test": { label: "Start a test", cls: "bg-accent/10 text-accent ring-accent/20" },
  "transfer-test": { label: "Transfer a win", cls: "bg-indigo-50 text-indigo-700 ring-indigo-100" },
  "keep-running": { label: "Keep running", cls: "bg-slate-100 text-slate-600 ring-slate-200" },
  "shift-focus": { label: "At target", cls: "bg-emerald-50 text-emerald-700 ring-emerald-100" },
};

export default function TestingPage() {
  const [optin, setOptin] = useState<OptInData>(OPTIN_SEED);
  const [tests, setTests] = useState<TestRecord[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [backend, setBackend] = useState<"kv" | "local">("local");
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState("");

  const refresh = useCallback(async () => {
    const [t, h] = await Promise.all([loadTests(), loadHistory()]);
    setTests(t.value);
    setHistory(h.value);
    setBackend(t.backend);
  }, []);

  useEffect(() => {
    fetch("/api/klaviyo/optin")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setOptin(d))
      .catch(() => {});
    refresh();
  }, [refresh]);

  const recs = useMemo(
    () => computeRecommendations(optin, tests).filter((r) => !dismissed.has(r.id)),
    [optin, tests, dismissed]
  );

  async function logHistory(entry: Omit<HistoryEntry, "id" | "at">) {
    const next: HistoryEntry[] = [{ ...entry, id: newId(), at: new Date().toISOString() }, ...history];
    setHistory(next);
    await saveHistory(next);
  }

  async function approve(rec: Recommendation) {
    setBusy(rec.id);
    try {
      if (rec.action === "call-winner" && rec.testId) {
        const next = tests.map((t) =>
          t.id === rec.testId
            ? {
                ...t,
                status: "concluded" as const,
                concludedAt: new Date().toISOString(),
                winnerFormName: rec.winnerFormName,
                learning: rec.title,
              }
            : t
        );
        setTests(next);
        await saveTests(next);
        await logHistory({ type: "winner-called", collectionId: rec.collectionId, summary: rec.title });
      } else {
        await logHistory({ type: "rec-approved", collectionId: rec.collectionId, summary: `Approved: ${rec.title}` });
      }
      setDismissed((d) => new Set(d).add(rec.id));
    } finally {
      setBusy("");
    }
  }

  async function dismiss(rec: Recommendation) {
    setBusy(rec.id);
    try {
      await logHistory({ type: "rec-dismissed", collectionId: rec.collectionId, summary: `Dismissed: ${rec.title}` });
      setDismissed((d) => new Set(d).add(rec.id));
    } finally {
      setBusy("");
    }
  }

  const scoreboard = useMemo(() => {
    return COLLECTIONS.map((c) => {
      const forms = optin.popups.filter((p) => c.match.test(p.name));
      const views = forms.reduce((s, f) => s + f.views, 0);
      const submits = forms.reduce((s, f) => s + f.submits, 0);
      return { def: c, forms, views, submits, rate: views > 0 ? submits / views : 0 };
    }).filter((s) => s.forms.length > 0 || s.def.aov);
  }, [optin]);

  const running = tests.filter((t) => t.status === "running");

  return (
    <>
      <PageHeader
        eyebrow="Testing"
        title="The testing loop."
        subtitle={`The engine watches results and recommends the next test — you approve or override. Winners need ${MIN_IMPRESSIONS.toLocaleString()}+ impressions per variant and a gap beyond noise.`}
      />

      {backend === "local" && (
        <p className="mb-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-inset ring-amber-100">
          History is saved in this browser only. Create the KV store in Vercel (Storage → Create Database → Upstash Redis)
          and redeploy for cross-device persistence.
        </p>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr,420px]">
        <div className="space-y-6">
          {/* ---- Recommendations ---- */}
          <div className="card p-6">
            <h2 className="mb-4 text-lg font-bold text-navy">Recommended next moves</h2>
            {recs.length === 0 && <p className="text-sm text-muted">Nothing to recommend right now.</p>}
            <div className="space-y-4">
              {recs.map((rec) => (
                <div key={rec.id} className="rounded-xl p-4 ring-1 ring-inset ring-slate-100">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className={`pill ring-1 ring-inset ${ACTION_STYLE[rec.action].cls}`}>
                      {ACTION_STYLE[rec.action].label}
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted">{rec.collectionName}</span>
                  </div>
                  <p className="mb-2 font-semibold text-ink">{rec.title}</p>
                  <ul className="mb-3 list-disc space-y-1 pl-5 text-sm text-muted">
                    {rec.reasoning.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                  <div className="flex flex-wrap gap-2">
                    {(rec.action === "start-test" || rec.action === "transfer-test") && (
                      <Link
                        href={`/popups?collection=${rec.collectionId}`}
                        className={btnSmall}
                        onClick={() => approve(rec)}
                      >
                        Approve → build it
                      </Link>
                    )}
                    {(rec.action === "call-winner" || rec.action === "extend-or-wash") && (
                      <button disabled={busy === rec.id} onClick={() => approve(rec)} className={btnSmall}>
                        {rec.action === "call-winner" ? "Approve — conclude test" : "Call it a wash — conclude"}
                      </button>
                    )}
                    {rec.action !== "keep-running" && rec.action !== "shift-focus" && (
                      <button disabled={busy === rec.id} onClick={() => dismiss(rec)} className={btnGhost}>
                        Override / dismiss
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ---- Scoreboard ---- */}
          <div className="card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-navy">Collection scoreboard</h2>
              <span className="text-xs text-muted">
                Target {formatPct(optin.targetRate)} · {optin.source === "live" ? "live (12 mo)" : "seed data"}
              </span>
            </div>
            <div className="space-y-4">
              {scoreboard.map((s) => (
                <div key={s.def.id}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                    <span className="font-semibold text-ink">
                      {s.def.name}
                      {s.forms.length === 0 && (
                        <span className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-600 ring-1 ring-inset ring-red-100">
                          No popup
                        </span>
                      )}
                    </span>
                    {s.forms.length > 0 && (
                      <span className="tabular-nums text-muted">
                        <span className="font-bold text-ink">{formatPct(s.rate, 2)}</span> · {formatNumber(s.views)} views
                      </span>
                    )}
                  </div>
                  {s.forms.length > 0 && (
                    <ProgressBar
                      value={s.rate / optin.targetRate}
                      tone={s.rate >= optin.targetRate ? "green" : s.rate >= optin.targetRate / 2 ? "amber" : "red"}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* ---- Running tests ---- */}
          <div className="card p-6">
            <h2 className="mb-4 text-lg font-bold text-navy">Running tests</h2>
            {running.length === 0 && (
              <p className="text-sm text-muted">
                No tests logged yet. Build one in the <Link href="/popups" className="font-semibold text-accent">Popup Studio</Link> and log it there.
              </p>
            )}
            <div className="space-y-3">
              {running.map((t) => {
                const byForm = new Map(optin.popups.map((p) => [p.name.toLowerCase(), p]));
                return (
                  <div key={t.id} className="rounded-xl p-4 ring-1 ring-inset ring-slate-100">
                    <p className="mb-1 text-sm font-semibold text-ink">{t.hypothesis}</p>
                    <p className="mb-2 text-xs text-muted">
                      {COLLECTIONS.find((c) => c.id === t.collectionId)?.name ?? t.collectionId} · {t.lever} · started{" "}
                      {new Date(t.startedAt).toLocaleDateString()}
                    </p>
                    {t.variants.map((v) => {
                      const row = byForm.get(v.formName.toLowerCase());
                      return (
                        <div key={v.formName} className="flex items-center justify-between gap-2 text-sm">
                          <span className="min-w-0 truncate text-muted">{v.label}</span>
                          <span className="shrink-0 tabular-nums text-ink">
                            {row ? `${formatPct(row.rate, 2)} · ${formatNumber(row.views)}/${formatNumber(MIN_IMPRESSIONS)}` : "no data yet"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ---- History ---- */}
          <div className="card p-6">
            <h2 className="mb-4 text-lg font-bold text-navy">History</h2>
            {history.length === 0 && <p className="text-sm text-muted">Decisions and results will be logged here.</p>}
            <ol className="space-y-3">
              {history.slice(0, 30).map((h) => (
                <li key={h.id} className="flex gap-3 text-sm">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" />
                  <span>
                    <span className="block text-ink">{h.summary}</span>
                    <span className="block text-xs text-muted">
                      {COLLECTIONS.find((c) => c.id === h.collectionId)?.name ?? h.collectionId} ·{" "}
                      {new Date(h.at).toLocaleString()}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </>
  );
}
