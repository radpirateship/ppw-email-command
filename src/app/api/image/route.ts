// ============================================================================
// PPW Command — brand image generator
// POST /api/image  { prompt, preset?, size? }
// Uses OpenAI gpt-image-1 when OPENAI_API_KEY is set; otherwise returns the
// fully-composed brand prompt so it can be pasted into any image tool
// (prompt-builder fallback per the handoff).
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { IMAGE_PRESETS } from "@/lib/imagePresets";

export const maxDuration = 60;

interface ImageRequest {
  prompt: string;
  preset?: string;
  size?: string;
}

function composePrompt(userPrompt: string, presetId: string): string {
  const preset = IMAGE_PRESETS[presetId] ?? IMAGE_PRESETS.hero;
  return `${userPrompt.trim()}. Style: ${preset.suffix}.`;
}

export async function POST(request: NextRequest) {
  try {
    const body: ImageRequest = await request.json();
    if (!body.prompt?.trim()) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }
    const presetId = body.preset && IMAGE_PRESETS[body.preset] ? body.preset : "hero";
    const preset = IMAGE_PRESETS[presetId];
    const fullPrompt = composePrompt(body.prompt, presetId);
    const size = body.size && /^\d+x\d+$/.test(body.size) ? body.size : preset.size;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      // Prompt-builder fallback: feature stays usable without a key.
      return NextResponse.json({
        mode: "prompt-only",
        prompt: fullPrompt,
        recommendedSize: size,
        usage: preset.usage,
        note: "OPENAI_API_KEY not set — paste this prompt into any image tool. Add the key in Vercel to generate directly.",
      });
    }

    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt: fullPrompt,
        size,
        quality: "high",
        n: 1,
      }),
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `OpenAI error (${res.status}): ${(await res.text()).slice(0, 300)}` },
        { status: 500 }
      );
    }
    const data = await res.json();
    const b64 = data?.data?.[0]?.b64_json;
    if (!b64) return NextResponse.json({ error: "No image returned" }, { status: 500 });

    return NextResponse.json({
      mode: "image",
      imageB64: b64,
      prompt: fullPrompt,
      size,
      usage: preset.usage,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
