// ============================================================================
// PPW Command — Claude writes the image prompt (same pattern as copy studio).
// POST /api/image-prompt  { idea, preset, context? }
// Returns { prompt } — a complete, brand-styled image-generation prompt the
// user can edit before generating.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { IMAGE_PRESETS } from "@/lib/imagePresets";

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const { idea, preset, context } = (await request.json()) as {
      idea?: string;
      preset?: string;
      context?: string;
    };
    if (!idea?.trim()) {
      return NextResponse.json({ error: "idea is required" }, { status: 400 });
    }
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY is not set. Add it in Vercel → Settings → Environment Variables, then redeploy." },
        { status: 500 }
      );
    }
    const p = IMAGE_PRESETS[preset ?? ""] ?? IMAGE_PRESETS.hero;

    const system = `You write image-generation prompts for Peak Primal Wellness (PPW), a premium home wellness brand (saunas, cold plunges, red light, hyperbaric, hydrogen water, recovery). House style: premium wellness aesthetic, clean, natural light, aspirational but grounded, minimal composition, subtle navy (#001A5C) and blue (#0A86CB) accent tones, photorealistic, NO text or lettering in the image, no logos, no green tones.

Write ONE complete image-generation prompt (60-120 words) that:
- Describes the scene concretely: subject, setting, lighting, camera angle, mood
- Bakes in the house style above
- Fits the intended usage: ${p.label} (${p.usage})
- Never asks for text, words, or UI elements in the image

Respond with ONLY the prompt text — no preamble, no quotes, no markdown.`;

    const user = `Image idea: ${idea.trim()}${context ? `\nContext: ${context}` : ""}`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.GENERATOR_MODEL || "claude-sonnet-5",
        max_tokens: 500,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `Claude API error (${res.status}): ${(await res.text()).slice(0, 300)}` },
        { status: 500 }
      );
    }
    const data = await res.json();
    const prompt: string = (data?.content?.[0]?.text ?? "").trim();
    if (!prompt) return NextResponse.json({ error: "Empty response" }, { status: 500 });

    return NextResponse.json({ prompt, recommendedSize: p.size, usage: p.usage });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
