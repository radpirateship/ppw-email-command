"use client";

// Shared image workflow: idea → Claude writes the prompt → edit → generate →
// download / upload to Klaviyo. Used by Email Studio and Popup Studio.

import { useState } from "react";
import { IMAGE_PRESETS } from "@/lib/imagePresets";

const inputCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20";
const labelCls = "mb-1 block text-xs font-semibold uppercase tracking-wide text-muted";
const btnPrimary =
  "rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50";
const btnSmall =
  "rounded-lg bg-navy px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-50";

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

interface ImageResult {
  mode: "image" | "prompt-only";
  imageB64?: string;
  prompt: string;
  recommendedSize?: string;
  note?: string;
}

export default function ImageWorkbench({
  defaultPreset = "hero",
  context = "",
  presetChoices,
}: {
  defaultPreset?: string;
  /** Extra context passed to the prompt writer (e.g. "Popup for the Sauna collection, slide-in format") */
  context?: string;
  /** Limit preset options (defaults to all) */
  presetChoices?: string[];
}) {
  const presets = (presetChoices ?? Object.keys(IMAGE_PRESETS)).filter((k) => IMAGE_PRESETS[k]);
  const [preset, setPreset] = useState(presets.includes(defaultPreset) ? defaultPreset : presets[0]);
  const [idea, setIdea] = useState("");
  const [prompt, setPrompt] = useState("");
  const [writing, setWriting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ImageResult | null>(null);
  const [hostedUrl, setHostedUrl] = useState("");

  async function writePrompt() {
    if (!idea.trim()) {
      setError("Describe the idea first — one line is enough.");
      return;
    }
    setWriting(true);
    setError("");
    try {
      const res = await fetch("/api/image-prompt", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ idea, preset, context: context || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      setPrompt(data.prompt);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setWriting(false);
    }
  }

  async function generate() {
    const usePrompt = prompt.trim() || idea.trim();
    if (!usePrompt) {
      setError("Write or generate a prompt first.");
      return;
    }
    setGenerating(true);
    setError("");
    setResult(null);
    setHostedUrl("");
    try {
      const res = await fetch("/api/image", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt: usePrompt, preset, styled: Boolean(prompt.trim()) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setGenerating(false);
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
        body: JSON.stringify({ imageB64: result.imageB64, name: idea.slice(0, 50) || "ppw-image" }),
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
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[minmax(180px,240px),1fr]">
        <div>
          <label className={labelCls}>Format</label>
          <select value={preset} onChange={(e) => setPreset(e.target.value)} className={inputCls}>
            {presets.map((id) => (
              <option key={id} value={id}>{IMAGE_PRESETS[id].label}</option>
            ))}
          </select>
          <p className="mt-1.5 text-xs leading-relaxed text-muted">
            {IMAGE_PRESETS[preset].usage} · {IMAGE_PRESETS[preset].size}
          </p>
        </div>
        <div>
          <label className={labelCls}>Idea (one line)</label>
          <div className="flex gap-2">
            <input
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder="e.g. barrel sauna on a snowy deck at dusk, warm glow from inside"
              className={inputCls}
            />
            <button onClick={writePrompt} disabled={writing} className={`${btnSmall} shrink-0 whitespace-nowrap`}>
              {writing ? "Writing…" : "Write prompt"}
            </button>
          </div>
        </div>
      </div>

      <div>
        <label className={labelCls}>Prompt (Claude-written — edit freely)</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={5}
          placeholder='Click "Write prompt" to have Claude draft this from your idea, or write your own here.'
          className={`${inputCls} leading-relaxed`}
        />
      </div>

      <div className="flex items-center gap-2">
        <button onClick={generate} disabled={generating} className={btnPrimary}>
          {generating ? "Generating…" : "Generate image"}
        </button>
        {prompt && <CopyButton text={prompt} label="Copy prompt" />}
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 ring-1 ring-inset ring-red-100">{error}</p>
      )}

      {result?.mode === "prompt-only" && (
        <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800 ring-1 ring-inset ring-amber-100">
          {result.note} Recommended size: {result.recommendedSize}.
        </div>
      )}

      {result?.mode === "image" && result.imageB64 && (
        <div className="space-y-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`data:image/png;base64,${result.imageB64}`}
            alt={idea || "Generated image"}
            className="w-full rounded-xl ring-1 ring-slate-200"
          />
          <div className="flex flex-wrap items-center gap-2">
            <a href={`data:image/png;base64,${result.imageB64}`} download="ppw-image.png" className={btnSmall}>
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
