"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader, ProgressBar } from "@/components/ui";
import { IMAGE_PRESETS } from "@/lib/imagePresets";
import { OPTIN_SEED, formatNumber, formatPct, type OptInData } from "@/lib/data";

// ---------------------------------------------------------------------------
// Collection coverage map — which collections should have a popup
// ---------------------------------------------------------------------------

const COLLECTIONS: { name: string; match: RegExp }[] = [
  { name: "General (sitewide)", match: /general/i },
  { name: "Saunas", match: /sauna(?!\s*heater)/i },
  { name: "Sauna Heaters", match: /heater/i },
  { name: "Cold Plunge", match: /cold|plunge|chiller/i },
  { name: "Red Light", match: /red light|kineon/i },
  { name: "Hyperbaric", match: /hyperbaric/i },
  { name: "Hydrogen Water", match: /echo|hydrogen|water/i },
  { name: "Fitness / Recovery", match: /stepr|fitness|gym|recovery/i },
];

const AB_MIN_VIEWS = 500;

const inputCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20";
const labelCls = "mb-1 block text-xs font-semibold uppercase tracking-wide text-muted";

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="rounded-lg bg-navy px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
    >
      {copied ? "Copied ✓" : label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Scoreboard
// ---------------------------------------------------------------------------

function Scoreboard({ optin }: { optin: OptInData }) {
  const grouped = useMemo(() => {
    return COLLECTIONS.map((c) => {
      const forms = optin.popups.filter((p) => c.match.test(p.name));
      const views = forms.reduce((s, f) => s + f.views, 0);
      const submits = forms.reduce((s, f) => s + f.submits, 0);
      const rate = views > 0 ? submits / views : 0;
      // A/B: 2+ forms with enough views each → flag the leader
      const eligible = forms.filter((f) => f.views >= AB_MIN_VIEWS);
      const leader =
        eligible.length >= 2
          ? eligible.reduce((a, b) => (a.rate >= b.rate ? a : b))
          : null;
      return { ...c, forms, views, submits, rate, leader };
    });
  }, [optin]);

  return (
    <div className="card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-navy">Collection → popup map</h2>
        <span className="text-xs text-muted">
          Target {formatPct(optin.targetRate)} · data: {optin.source === "live" ? "live (12 mo)" : "seed"}
        </span>
      </div>
      <div className="space-y-4">
        {grouped.map((g) => (
          <div key={g.name} className="rounded-xl ring-1 ring-inset ring-slate-100 p-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-ink">{g.name}</span>
                {g.forms.length === 0 && (
                  <span className="pill bg-red-50 text-red-600 ring-1 ring-inset ring-red-100">No popup</span>
                )}
                {g.forms.length > 0 && g.rate < optin.targetRate / 2 && (
                  <span className="pill bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-100">Leaking</span>
                )}
                {g.rate >= optin.targetRate && (
                  <span className="pill bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-100">On target</span>
                )}
              </div>
              {g.forms.length > 0 && (
                <span className="text-sm text-muted">
                  {formatNumber(g.views)} views · {formatNumber(g.submits)} signups ·{" "}
                  <span className="font-bold text-ink">{formatPct(g.rate, 2)}</span>
                </span>
              )}
            </div>
            {g.forms.length > 0 && (
              <>
                <ProgressBar
                  value={g.rate / optin.targetRate}
                  tone={g.rate >= optin.targetRate ? "green" : g.rate >= optin.targetRate / 2 ? "amber" : "red"}
                />
                <div className="mt-3 space-y-1.5">
                  {g.forms.map((f) => (
                    <div key={f.name} className="flex items-center justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate text-muted">
                        {f.name}
                        {g.leader?.name === f.name && (
                          <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-100">
                            A/B leader
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 tabular-nums text-ink">
                        {formatPct(f.rate, 2)} <span className="text-muted">({formatNumber(f.views)} views)</span>
                      </span>
                    </div>
                  ))}
                </div>
                {g.forms.length >= 2 && !g.leader && (
                  <p className="mt-2 text-xs text-muted">
                    A/B: waiting for {AB_MIN_VIEWS}+ views per variant before calling a winner.
                  </p>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Popup copy generator
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

const BUILD_CHECKLIST = [
  "Klaviyo → Signup Forms → Create Form → Popup (one responsive form, not separate desktop/mobile)",
  "Style: navy #001A5C button (8px radius), blue #0A86CB accents, Poppins, PPW logo — no green",
  "Timing: show at 35% scroll OR 20 seconds; add exit-intent on desktop",
  "Don't re-show for 30 days after dismissal; hide from existing subscribers",
  "Target: this collection's URLs only (General = sitewide minus covered collections)",
  "On submit: subscribe to the collection's welcome list so the welcome flow fires",
  "A/B: run variant A vs B 50/50; call a winner at ~500 views each (~30 days)",
];

function PopupGenerator() {
  const [collection, setCollection] = useState("");
  const [discount, setDiscount] = useState("");
  const [leadMagnet, setLeadMagnet] = useState("");
  const [extraContext, setExtraContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [variants, setVariants] = useState<PopupVariant[] | null>(null);

  async function generate() {
    if (!collection.trim()) {
      setError("Enter a collection first.");
      return;
    }
    setLoading(true);
    setError("");
    setVariants(null);
    try {
      const res = await fetch("/api/generate-popup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          collection,
          discount: discount.trim() || undefined,
          leadMagnet: leadMagnet.trim() || undefined,
          extraContext: extraContext.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      setVariants(data.variants);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card p-6">
      <h2 className="mb-1 text-lg font-bold text-navy">Popup offer copy</h2>
      <p className="mb-4 text-sm text-muted">
        Generates A/B/C variants (combo · discount-only · content-only) in the approved Sauna-popup format.
        Build the form natively in Klaviyo — Shopify&apos;s CSP blocks custom popup code.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Collection</label>
          <input value={collection} onChange={(e) => setCollection(e.target.value)} placeholder="e.g. Cold Plunge" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Discount</label>
          <input value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="e.g. $250 off" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Lead magnet / content offer</label>
          <input value={leadMagnet} onChange={(e) => setLeadMagnet(e.target.value)} placeholder="e.g. Cold Plunge Buyer's Guide (PDF)" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Extra context (optional)</label>
          <input value={extraContext} onChange={(e) => setExtraContext(e.target.value)} placeholder="Anything specific…" className={inputCls} />
        </div>
      </div>
      <button
        onClick={generate}
        disabled={loading}
        className="mt-4 rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "Writing variants…" : "Generate popup copy"}
      </button>
      {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 ring-1 ring-inset ring-red-100">{error}</p>}

      {variants && (
        <div className="mt-5 space-y-4">
          {variants.map((v) => (
            <div key={v.variant} className="rounded-xl p-4 ring-1 ring-inset ring-slate-100">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="font-bold text-navy">Variant {v.variant}</span>
                <div className="flex items-center gap-2">
                  <span className="hidden text-xs text-muted sm:block">{v.role}</span>
                  <CopyButton text={variantToText(v)} label="Copy variant" />
                </div>
              </div>
              <dl className="space-y-1.5 text-sm">
                <div><dt className="inline font-semibold text-ink">Headline: </dt><dd className="inline text-ink">{v.headline}</dd></div>
                <div><dt className="inline font-semibold text-ink">Subhead: </dt><dd className="inline text-muted">{v.subhead}</dd></div>
                <div><dt className="inline font-semibold text-ink">Button: </dt><dd className="inline text-ink">{v.buttonText}</dd></div>
                <div><dt className="inline font-semibold text-ink">Fine print: </dt><dd className="inline text-muted">{v.finePrint}</dd></div>
                <div><dt className="inline font-semibold text-ink">Success: </dt><dd className="inline text-muted">{v.successMessage}</dd></div>
              </dl>
            </div>
          ))}
          <details className="rounded-xl bg-slate-50 p-4 ring-1 ring-inset ring-slate-100">
            <summary className="cursor-pointer text-sm font-semibold text-navy">Klaviyo build checklist</summary>
            <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-ink">
              {BUILD_CHECKLIST.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          </details>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Image studio
// ---------------------------------------------------------------------------

interface ImageResult {
  mode: "image" | "prompt-only";
  imageB64?: string;
  prompt: string;
  size?: string;
  recommendedSize?: string;
  usage?: string;
  note?: string;
}

function ImageStudio() {
  const [preset, setPreset] = useState("hero");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ImageResult | null>(null);
  const [uploading, setUploading] = useState(false);
  const [hostedUrl, setHostedUrl] = useState("");

  async function generate() {
    if (!prompt.trim()) {
      setError("Describe the image first.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    setHostedUrl("");
    try {
      const res = await fetch("/api/image", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt, preset }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function uploadToKlaviyo() {
    if (!result?.imageB64) return;
    setUploading(true);
    setError("");
    try {
      const res = await fetch("/api/klaviyo/upload-image", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ imageB64: result.imageB64, name: prompt.slice(0, 50) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Upload failed (${res.status})`);
      setHostedUrl(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="card p-6">
      <h2 className="mb-1 text-lg font-bold text-navy">Image studio</h2>
      <p className="mb-4 text-sm text-muted">
        On-brand images for emails and popups. Every prompt gets the PPW style treatment (navy/blue, premium, no text overlay).
      </p>
      <div className="grid gap-3 sm:grid-cols-[220px,1fr]">
        <div>
          <label className={labelCls}>Preset</label>
          <select value={preset} onChange={(e) => setPreset(e.target.value)} className={inputCls}>
            {Object.entries(IMAGE_PRESETS).map(([id, p]) => (
              <option key={id} value={id}>{p.label}</option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-muted">{IMAGE_PRESETS[preset].usage} · {IMAGE_PRESETS[preset].size}</p>
        </div>
        <div>
          <label className={labelCls}>Describe the image</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={2}
            placeholder="e.g. A barrel sauna on a modern home's back deck at golden hour, steam rising"
            className={inputCls}
          />
        </div>
      </div>
      <button
        onClick={generate}
        disabled={loading}
        className="mt-4 rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "Generating…" : "Generate image"}
      </button>
      {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 ring-1 ring-inset ring-red-100">{error}</p>}

      {result?.mode === "prompt-only" && (
        <div className="mt-5 rounded-xl bg-slate-50 p-4 ring-1 ring-inset ring-slate-100">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-ink">Ready-to-paste prompt ({result.recommendedSize})</p>
            <CopyButton text={result.prompt} label="Copy prompt" />
          </div>
          <p className="text-sm leading-relaxed text-muted">{result.prompt}</p>
          {result.note && <p className="mt-2 text-xs text-amber-700">{result.note}</p>}
        </div>
      )}

      {result?.mode === "image" && result.imageB64 && (
        <div className="mt-5 space-y-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`data:image/png;base64,${result.imageB64}`}
            alt={prompt}
            className="w-full rounded-xl ring-1 ring-slate-200"
          />
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={`data:image/png;base64,${result.imageB64}`}
              download="ppw-image.png"
              className="rounded-lg bg-navy px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
            >
              Download PNG
            </a>
            <button
              onClick={uploadToKlaviyo}
              disabled={uploading}
              className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {uploading ? "Uploading…" : "Upload to Klaviyo"}
            </button>
            {hostedUrl && <CopyButton text={hostedUrl} label="Copy hosted URL" />}
          </div>
          {hostedUrl && (
            <p className="break-all rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700 ring-1 ring-inset ring-emerald-100">
              Hosted: {hostedUrl}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function PopupsPage() {
  const [optin, setOptin] = useState<OptInData>(OPTIN_SEED);

  useEffect(() => {
    fetch("/api/klaviyo/optin")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setOptin(d))
      .catch(() => {});
  }, []);

  return (
    <>
      <PageHeader
        eyebrow="Popups & Images"
        title="Popup builder & image studio."
        subtitle="Live opt-in scoreboard by collection, A/B-ready offer copy, and on-brand image generation with one-click Klaviyo hosting."
      />
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-6">
          <Scoreboard optin={optin} />
        </div>
        <div className="space-y-6">
          <PopupGenerator />
          <ImageStudio />
        </div>
      </div>
    </>
  );
}
