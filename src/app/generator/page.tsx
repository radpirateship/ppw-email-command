"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui";
import { FLOW_TYPES, TONES } from "@/lib/generator";
import ImageWorkbench from "@/components/ImageWorkbench";

interface EmailResult {
  channel: "email";
  subjectLines: string[];
  previewText: string;
  bodyHtml: string;
  fullHtml: string;
  plainBody: string;
  cta: { label?: string; url?: string } | null;
  validation: { passed: boolean; warnings: string[] };
}

interface SmsResult {
  channel: "sms";
  smsText: string;
  notes: string;
  validation: { passed: boolean; warnings: string[] };
}

type Result = EmailResult | SmsResult;

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

const inputCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20";
const labelCls = "mb-1 block text-xs font-semibold uppercase tracking-wide text-muted";

export default function GeneratorPage() {
  const [flowType, setFlowType] = useState("welcome");
  const [topic, setTopic] = useState("");
  const [emailNumber, setEmailNumber] = useState(1);
  const [totalEmails, setTotalEmails] = useState(3);
  const [tone, setTone] = useState<string>("confident");
  const [offer, setOffer] = useState("");
  const [extraContext, setExtraContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [subjectIdx, setSubjectIdx] = useState(0);
  const [view, setView] = useState<"preview" | "html" | "plain">("preview");

  const flow = FLOW_TYPES.find((f) => f.id === flowType)!;
  const isSms = flow.channel === "sms";

  async function generate() {
    if (!topic.trim()) {
      setError("Enter a topic or product first.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          flowType,
          topic,
          emailNumber: isSms ? undefined : emailNumber,
          totalEmails: isSms ? undefined : totalEmails,
          tone,
          offer: offer.trim() || undefined,
          extraContext: extraContext.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      setResult(data);
      setSubjectIdx(0);
      setView("preview");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Email Studio"
        title="Email & SMS studio."
        subtitle="Klaviyo-ready, on-brand copy and images for any flow or campaign. Pick a flow type, describe the topic, generate, then paste into Klaviyo."
      />

      <div className="grid gap-6 lg:grid-cols-[380px,1fr]">
        {/* ---- Form ---- */}
        <div className="card h-fit space-y-4 p-6">
          <div>
            <label className={labelCls}>Flow type</label>
            <select value={flowType} onChange={(e) => setFlowType(e.target.value)} className={inputCls}>
              {FLOW_TYPES.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs leading-relaxed text-muted">{flow.context.slice(0, 140)}…</p>
          </div>

          <div>
            <label className={labelCls}>Topic / product</label>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Infrared saunas — first email after signup"
              className={inputCls}
            />
          </div>

          {!isSms && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Email #</label>
                <select value={emailNumber} onChange={(e) => setEmailNumber(Number(e.target.value))} className={inputCls}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Of series length</label>
                <select value={totalEmails} onChange={(e) => setTotalEmails(Number(e.target.value))} className={inputCls}>
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div>
            <label className={labelCls}>Tone</label>
            <select value={tone} onChange={(e) => setTone(e.target.value)} className={inputCls}>
              {TONES.map((t) => (
                <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Offer (optional)</label>
            <input
              value={offer}
              onChange={(e) => setOffer(e.target.value)}
              placeholder="e.g. $250 off + free buyer's guide, code SAUNA250"
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Extra context (optional)</label>
            <textarea
              value={extraContext}
              onChange={(e) => setExtraContext(e.target.value)}
              rows={3}
              placeholder="Anything specific: product details, angle, audience segment…"
              className={inputCls}
            />
          </div>

          <button
            onClick={generate}
            disabled={loading}
            className="w-full rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Generating…" : isSms ? "Generate SMS" : "Generate email"}
          </button>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 ring-1 ring-inset ring-red-100">{error}</p>
          )}
        </div>

        {/* ---- Result ---- */}
        <div className="min-w-0">
          {!result && !loading && (
            <div className="card flex h-64 items-center justify-center p-8 text-sm text-muted">
              Generated copy will appear here.
            </div>
          )}
          {loading && (
            <div className="card flex h-64 items-center justify-center p-8 text-sm text-muted">
              Writing on-brand copy…
            </div>
          )}

          {result && !result.validation.passed && (
            <div className="mb-4 rounded-xl bg-amber-50 p-4 ring-1 ring-inset ring-amber-100">
              <p className="mb-1 text-sm font-semibold text-amber-800">Brand check warnings</p>
              <ul className="list-disc pl-5 text-sm text-amber-700">
                {result.validation.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {result?.channel === "sms" && (
            <div className="card space-y-4 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-navy">SMS</h2>
                <CopyButton text={result.smsText} label="Copy SMS" />
              </div>
              <p className="rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-ink ring-1 ring-inset ring-slate-100">
                {result.smsText}
              </p>
              <p className="text-xs text-muted">
                {result.smsText.length} characters{result.notes ? ` · ${result.notes}` : ""}
              </p>
            </div>
          )}

          {result?.channel === "email" && (
            <div className="space-y-4">
              <div className="card p-6">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-navy">Subject lines</h2>
                  <CopyButton text={result.subjectLines[subjectIdx]} label="Copy subject" />
                </div>
                <div className="space-y-2">
                  {result.subjectLines.map((s, i) => (
                    <label
                      key={i}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm ring-1 ring-inset transition ${
                        subjectIdx === i ? "bg-accent/5 ring-accent/30" : "ring-slate-100 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="radio"
                        checked={subjectIdx === i}
                        onChange={() => setSubjectIdx(i)}
                        className="accent-[#001A5C]"
                      />
                      <span className="text-ink">{s}</span>
                    </label>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between gap-4">
                  <p className="min-w-0 truncate text-sm text-muted">
                    <span className="font-semibold text-ink">Preview:</span> {result.previewText}
                  </p>
                  <CopyButton text={result.previewText} label="Copy preview" />
                </div>
              </div>

              <div className="card p-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
                    {(["preview", "html", "plain"] as const).map((v) => (
                      <button
                        key={v}
                        onClick={() => setView(v)}
                        className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                          view === v ? "bg-white text-navy shadow-sm" : "text-muted hover:text-ink"
                        }`}
                      >
                        {v === "preview" ? "Preview" : v === "html" ? "Full HTML" : "Plain text"}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <CopyButton text={result.fullHtml} label="Copy full HTML" />
                    <CopyButton text={result.plainBody} label="Copy plain text" />
                  </div>
                </div>

                {view === "preview" && (
                  <iframe
                    title="Email preview"
                    srcDoc={result.fullHtml}
                    className="h-[720px] w-full rounded-xl ring-1 ring-slate-200"
                    sandbox=""
                  />
                )}
                {view === "html" && (
                  <pre className="max-h-[720px] overflow-auto rounded-xl bg-slate-900 p-4 text-xs leading-relaxed text-slate-100">
                    {result.fullHtml}
                  </pre>
                )}
                {view === "plain" && (
                  <pre className="max-h-[720px] overflow-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-ink ring-1 ring-inset ring-slate-100">
                    {result.plainBody}
                  </pre>
                )}
              </div>

              <div className="card p-5 text-sm text-muted">
                <span className="font-semibold text-ink">Into Klaviyo:</span> create/duplicate a template →
                use the code editor → paste the full HTML → set the chosen subject + preview text on the message.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ---- Email images ---- */}
      <div className="card mt-6 p-6">
        <h2 className="mb-1 text-lg font-bold text-navy">Email images</h2>
        <p className="mb-5 text-sm text-muted">
          Hero shots, lifestyle scenes, and section art for the emails above. Give Claude a one-line idea,
          let it write the full brand-styled prompt, tweak if needed, generate, then upload straight to Klaviyo.
        </p>
        <ImageWorkbench
          defaultPreset="hero"
          presetChoices={["hero", "lifestyle", "background", "social"]}
          context="Image for a PPW marketing email"
        />
      </div>
    </>
  );
}
