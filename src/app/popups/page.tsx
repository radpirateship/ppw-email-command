"use client";

// Popup Studio — guided workflow:
// 1. Pick a collection  2. Choose the test setup (trigger/format)
// 3. Generate offer copy  4. Generate the popup image  5. Build spec + log the test

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui";
import ImageWorkbench from "@/components/ImageWorkbench";
import { OPTIN_SEED, formatNumber, formatPct, type OptInData } from "@/lib/data";
import {
  COLLECTIONS,
  TRIGGERS,
  FORMATS,
  findCollection,
  type CollectionDef,
} from "@/lib/collections";
import {
  loadTests,
  saveTests,
  loadHistory,
  saveHistory,
  newId,
  type TestRecord,
} from "@/lib/testing";

const inputCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20";
const labelCls = "mb-1 block text-xs font-semibold uppercase tracking-wide text-muted";
const btnPrimary =
  "rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50";
const btnSmall =
  "rounded-lg bg-navy px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90";

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className={btnSmall}
    >
      {copied ? "Copied ✓" : label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Step header
// ---------------------------------------------------------------------------

function StepTitle({ n, title, done }: { n: number; title: string; done?: boolean }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span
        className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold text-white ${
          done ? "bg-emerald-500" : "bg-navy"
        }`}
      >
        {done ? "✓" : n}
      </span>
      <h2 className="text-lg font-bold text-navy">{title}</h2>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Popup copy types
// ---------------------------------------------------------------------------

interface PopupVariant {
  variant: string;
  role: string;
  headline: string;
  subhead: string;
  buttonText: string;
  finePrint: string;
  successMessage: string;
}

function variantToText(v: PopupVariant): string {
  return `Headline: ${v.headline}\nSubhead: ${v.subhead}\nButton: ${v.buttonText}\nFine print: ${v.finePrint}\nSuccess screen: ${v.successMessage}`;
}

// ---------------------------------------------------------------------------
// Main studio
// ---------------------------------------------------------------------------

function PopupStudio() {
  const params = useSearchParams();
  const [optin, setOptin] = useState<OptInData>(OPTIN_SEED);
  const [collectionId, setCollectionId] = useState<string>(params.get("collection") ?? "");
  const [triggerId, setTriggerId] = useState<string>(params.get("trigger") ?? "");
  const [formatId, setFormatId] = useState<string>(params.get("format") ?? "");
  const [variants, setVariants] = useState<PopupVariant[] | null>(null);
  const [copyLoading, setCopyLoading] = useState(false);
  const [copyError, setCopyError] = useState("");
  const [extraContext, setExtraContext] = useState("");
  // Log-a-test state
  const [formNameA, setFormNameA] = useState("");
  const [formNameB, setFormNameB] = useState("");
  const [hypothesis, setHypothesis] = useState("");
  const [logMsg, setLogMsg] = useState("");
  const [logging, setLogging] = useState(false);

  useEffect(() => {
    fetch("/api/klaviyo/optin")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setOptin(d))
      .catch(() => {});
  }, []);

  const collection: CollectionDef | undefined = findCollection(collectionId);
  const trigger = TRIGGERS.find((t) => t.id === triggerId);
  const format = FORMATS.find((f) => f.id === formatId);

  const collectionStats = useMemo(() => {
    return COLLECTIONS.map((c) => {
      const forms = optin.popups.filter((p) => c.match.test(p.name));
      const views = forms.reduce((s, f) => s + f.views, 0);
      const submits = forms.reduce((s, f) => s + f.submits, 0);
      return { def: c, forms, views, submits, rate: views > 0 ? submits / views : 0 };
    });
  }, [optin]);

  async function generateCopy() {
    if (!collection) return;
    setCopyLoading(true);
    setCopyError("");
    setVariants(null);
    try {
      const res = await fetch("/api/generate-popup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          collection: collection.name,
          discount: collection.discount,
          leadMagnet: collection.resource,
          extraContext:
            [
              format ? `Popup format: ${format.label} — keep copy length appropriate (bottom bars need one short line; fullscreen can carry 2-3 lines).` : "",
              trigger ? `Trigger: ${trigger.label}.` : "",
              extraContext.trim(),
            ]
              .filter(Boolean)
              .join(" ") || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      setVariants(data.variants);
      if (!hypothesis) {
        setHypothesis(
          trigger && format
            ? `${collection.name}: ${trigger.label} + ${format.label} vs current baseline`
            : `${collection.name}: combo offer vs discount-only`
        );
      }
    } catch (e) {
      setCopyError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setCopyLoading(false);
    }
  }

  const buildSpec = useMemo(() => {
    if (!collection) return "";
    return [
      `POPUP BUILD SPEC — ${collection.name}`,
      ``,
      `Offer: ${collection.discount} + ${collection.resource}`,
      `Format: ${format ? `${format.label} (${format.bestFit})` : "— pick in step 2"}`,
      `Trigger: ${trigger ? `${trigger.label} (${trigger.bestFit})` : "— pick in step 2"}`,
      ``,
      `Klaviyo steps:`,
      `1. Signup Forms → Create Form → Popup${format ? ` → ${format.label}` : ""} (ONE responsive form)`,
      `2. Style: navy #001A5C button (8px radius), blue #0A86CB accents, Poppins, PPW logo, no green`,
      `3. Behavior: ${trigger ? trigger.label : "set trigger"}; exit-intent as secondary on desktop; don't re-show for 30 days; hide from existing subscribers`,
      `4. Targeting: ${collection.id === "general" ? "sitewide minus collections with their own popup" : `${collection.name} collection + product URLs only`}`,
      `5. On submit: subscribe to the ${collection.name} welcome list (welcome flow delivers the code + guide)`,
      `6. Name the form clearly, e.g. "${collection.name} — ${format?.label ?? "Popup"} — ${trigger?.label ?? "trigger"} (A)"`,
      `7. Clone for variant B, set 50/50 A/B in Klaviyo, then log the test below`,
    ].join("\n");
  }, [collection, trigger, format]);

  async function logTest() {
    if (!collection || !formNameA.trim() || !formNameB.trim() || !hypothesis.trim()) {
      setLogMsg("Fill hypothesis + both Klaviyo form names first.");
      return;
    }
    setLogging(true);
    setLogMsg("");
    try {
      const { value: tests } = await loadTests();
      const record: TestRecord = {
        id: newId(),
        collectionId: collection.id,
        lever: trigger ? "trigger" : format ? "format" : "content",
        hypothesis: hypothesis.trim(),
        variants: [
          { formName: formNameA.trim(), label: `A — ${formNameA.trim()}` },
          { formName: formNameB.trim(), label: `B — ${formNameB.trim()}` },
        ],
        status: "running",
        startedAt: new Date().toISOString(),
      };
      const backend = await saveTests([...tests, record]);
      const { value: history } = await loadHistory();
      await saveHistory([
        {
          id: newId(),
          at: new Date().toISOString(),
          type: "test-started",
          collectionId: collection.id,
          summary: `Started: ${record.hypothesis}`,
        },
        ...history,
      ]);
      setLogMsg(
        `Test logged (${backend === "kv" ? "saved to KV" : "saved in this browser — add the KV store in Vercel for cross-device history"}). Track it on the Testing tab.`
      );
      setFormNameA("");
      setFormNameB("");
    } catch (e) {
      setLogMsg(e instanceof Error ? e.message : "Failed to log test");
    } finally {
      setLogging(false);
    }
  }

  const liveFormNames = optin.popups.map((p) => p.name);

  return (
    <>
      <PageHeader
        eyebrow="Popup Studio"
        title="Build the next popup test."
        subtitle="Pick a collection, choose the trigger and format, generate the copy and image, then log the test so the Testing tab can track it."
      />

      {/* ---- Step 1: collection ---- */}
      <div className="card mb-6 p-6">
        <StepTitle n={1} title="Pick a collection" done={Boolean(collection)} />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {collectionStats.map(({ def, forms, views, rate }) => {
            const active = collectionId === def.id;
            return (
              <button
                key={def.id}
                onClick={() => setCollectionId(def.id)}
                className={`rounded-xl p-4 text-left ring-1 ring-inset transition ${
                  active ? "bg-accent/5 ring-accent" : "ring-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="font-semibold text-ink">{def.name}</span>
                  {forms.length === 0 ? (
                    <span className="pill bg-red-50 text-red-600 ring-1 ring-inset ring-red-100">No popup</span>
                  ) : (
                    <span className={`text-sm font-bold ${rate >= optin.targetRate ? "text-emerald-600" : "text-ink"}`}>
                      {formatPct(rate, 2)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted">
                  {forms.length > 0 ? `${formatNumber(views)} views · target ${formatPct(optin.targetRate)}` : "Not capturing this traffic yet"}
                </p>
                <p className="mt-2 text-xs text-muted">
                  {def.aov ? `AOV ${def.aov.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}${def.aovNote ? ` (${def.aovNote})` : ""} · ` : ""}
                  <span className="font-semibold text-ink">{def.discount}</span>
                </p>
                <p className="mt-1 text-xs italic text-muted">{def.resource}</p>
              </button>
            );
          })}
        </div>
      </div>

      {collection && (
        <>
          {/* ---- Step 2: test setup ---- */}
          <div className="card mb-6 p-6">
            <StepTitle n={2} title="Choose the test setup" done={Boolean(trigger && format)} />
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <label className={labelCls}>Trigger (when it appears)</label>
                <div className="space-y-2">
                  {TRIGGERS.map((t) => (
                    <label
                      key={t.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5 ring-1 ring-inset transition ${
                        triggerId === t.id ? "bg-accent/5 ring-accent/40" : "ring-slate-100 hover:bg-slate-50"
                      }`}
                    >
                      <input type="radio" checked={triggerId === t.id} onChange={() => setTriggerId(t.id)} className="mt-1 accent-[#001A5C]" />
                      <span>
                        <span className="block text-sm font-semibold text-ink">{t.label}</span>
                        <span className="block text-xs text-muted">{t.bestFit}{t.note ? ` — ${t.note}` : ""}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelCls}>Size & format (how it looks)</label>
                <div className="space-y-2">
                  {FORMATS.map((f) => (
                    <label
                      key={f.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5 ring-1 ring-inset transition ${
                        formatId === f.id ? "bg-accent/5 ring-accent/40" : "ring-slate-100 hover:bg-slate-50"
                      }`}
                    >
                      <input type="radio" checked={formatId === f.id} onChange={() => setFormatId(f.id)} className="mt-1 accent-[#001A5C]" />
                      <span>
                        <span className="block text-sm font-semibold text-ink">{f.label}</span>
                        <span className="block text-xs text-muted">{f.bestFit}{f.note ? ` — ${f.note}` : ""}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ---- Step 3: offer copy ---- */}
          <div className="card mb-6 p-6">
            <StepTitle n={3} title="Generate the offer copy" done={Boolean(variants)} />
            <p className="mb-3 text-sm text-muted">
              Uses this collection&apos;s locked inputs — <span className="font-semibold text-ink">{collection.discount}</span> +{" "}
              <span className="font-semibold text-ink">{collection.resource}</span> — and writes A (combo), B (discount-only) and C (content-only) variants.
            </p>
            <div className="mb-3">
              <label className={labelCls}>Extra context (optional)</label>
              <input value={extraContext} onChange={(e) => setExtraContext(e.target.value)} placeholder="Anything specific to this test…" className={inputCls} />
            </div>
            <button onClick={generateCopy} disabled={copyLoading} className={btnPrimary}>
              {copyLoading ? "Writing variants…" : "Generate copy"}
            </button>
            {copyError && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 ring-1 ring-inset ring-red-100">{copyError}</p>}
            {variants && (
              <div className="mt-5 grid gap-4 xl:grid-cols-3">
                {variants.map((v) => (
                  <div key={v.variant} className="rounded-xl p-4 ring-1 ring-inset ring-slate-100">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="font-bold text-navy">Variant {v.variant}</span>
                      <CopyButton text={variantToText(v)} label="Copy" />
                    </div>
                    <p className="mb-2 text-xs text-muted">{v.role}</p>
                    <dl className="space-y-1.5 text-sm">
                      <div><dt className="inline font-semibold text-ink">Headline: </dt><dd className="inline text-ink">{v.headline}</dd></div>
                      <div><dt className="inline font-semibold text-ink">Subhead: </dt><dd className="inline text-muted">{v.subhead}</dd></div>
                      <div><dt className="inline font-semibold text-ink">Button: </dt><dd className="inline text-ink">{v.buttonText}</dd></div>
                      <div><dt className="inline font-semibold text-ink">Fine print: </dt><dd className="inline text-muted">{v.finePrint}</dd></div>
                      <div><dt className="inline font-semibold text-ink">Success: </dt><dd className="inline text-muted">{v.successMessage}</dd></div>
                    </dl>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ---- Step 4: image ---- */}
          <div className="card mb-6 p-6">
            <StepTitle n={4} title="Generate the popup image (optional)" />
            <ImageWorkbench
              defaultPreset="banner"
              presetChoices={["banner", "lifestyle", "background"]}
              context={`Popup image for the ${collection.name} collection${format ? `, ${format.label} format` : ""}`}
            />
          </div>

          {/* ---- Step 5: build + log ---- */}
          <div className="card mb-6 p-6">
            <StepTitle n={5} title="Build in Klaviyo, then log the test" />
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-sm text-muted">
                Klaviyo forms can&apos;t be created via API — build takes ~2 minutes with this spec, then log the
                test here so the Testing tab tracks it against the 1,000-impression threshold.
              </p>
              <CopyButton text={buildSpec} label="Copy build spec" />
            </div>
            <pre className="mb-5 max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-xs leading-relaxed text-ink ring-1 ring-inset ring-slate-100">
              {buildSpec}
            </pre>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelCls}>Hypothesis / test name</label>
                <input value={hypothesis} onChange={(e) => setHypothesis(e.target.value)} placeholder="e.g. Sauna: exit intent beats 5-8s delay" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Variant A — Klaviyo form name (exact)</label>
                <input value={formNameA} onChange={(e) => setFormNameA(e.target.value)} list="live-forms" placeholder="Paste the exact form name" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Variant B — Klaviyo form name (exact)</label>
                <input value={formNameB} onChange={(e) => setFormNameB(e.target.value)} list="live-forms" placeholder="Paste the exact form name" className={inputCls} />
              </div>
              <datalist id="live-forms">
                {liveFormNames.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
            </div>
            <button onClick={logTest} disabled={logging} className={`${btnPrimary} mt-4`}>
              {logging ? "Logging…" : "Log this test"}
            </button>
            {logMsg && <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-ink ring-1 ring-inset ring-slate-100">{logMsg}</p>}
          </div>
        </>
      )}
    </>
  );
}

export default function PopupsPage() {
  return (
    <Suspense fallback={<div className="text-muted">Loading…</div>}>
      <PopupStudio />
    </Suspense>
  );
}
