// ============================================================================
// PPW Command — popup offer-copy generator
// POST /api/generate-popup  { collection, discount?, leadMagnet?, extraContext? }
// Returns three ready-to-build Klaviyo popup variants (A combo / B discount /
// C content-only), modeled on the approved Sauna_Popup_Package format.
// Requires ANTHROPIC_API_KEY.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { getBrandVoicePromptBlock } from "@/lib/generator";

export const maxDuration = 60;

interface PopupRequest {
  collection: string;
  discount?: string; // e.g. "$250 off"
  leadMagnet?: string; // e.g. "Sauna Buyer's Guide (PDF)"
  extraContext?: string;
}

interface PopupVariant {
  variant: "A" | "B" | "C";
  role: string;
  headline: string;
  subhead: string;
  buttonText: string;
  finePrint: string;
  successMessage: string;
}

const SYSTEM = `You are an expert conversion copywriter for Peak Primal Wellness (PPW), a premium home wellness e-commerce store (saunas, cold plunges, red light, hyperbaric, hydrogen water, recovery). AOVs run $500–$15,000+ — visitors are researching considered purchases, and a flat discount alone converts poorly (~0.7–1%). Value-first offers paired with the discount are the strategy.

${getBrandVoicePromptBlock()}

POPUP RULES:
- Headlines: 8-12 words max, concrete value, no hype, no emojis
- Subheads: one sentence, specific about what they get and why it helps their research
- Button text: action + what they get ("Send My Guide + $250 Code"), 3-6 words
- Fine print: one short line (code limits, delivery expectations)
- Success message: confirm what's coming + immediate next step
- Never use "cheap", "deal", "hack", "no-brainer", "game-changer"
- These are Klaviyo NATIVE forms — copy only, no code`;

export async function POST(request: NextRequest) {
  try {
    const body: PopupRequest = await request.json();
    if (!body.collection?.trim()) {
      return NextResponse.json({ error: "collection is required" }, { status: 400 });
    }
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY is not set. Add it in Vercel → Settings → Environment Variables, then redeploy." },
        { status: 500 }
      );
    }

    const discount = body.discount?.trim() || "$100 off";
    const magnet = body.leadMagnet?.trim() || "a free expert buyer's guide for this category";

    const user = `Write popup copy for the ${body.collection} collection.

DISCOUNT AVAILABLE: ${discount}
LEAD MAGNET / CONTENT OFFER: ${magnet}
${body.extraContext ? `ADDITIONAL CONTEXT:\n${body.extraContext}` : ""}

Produce THREE variants for A/B testing (this exact structure worked for the approved Sauna popup):
- Variant A ("combo", the hypothesis): ${discount} PLUS the content offer — value + discount together
- Variant B ("discount-only", the control): ${discount} alone
- Variant C ("content-only", optional later test): the content offer alone, no discount

Respond in valid JSON only:
{
  "variants": [
    { "variant": "A", "role": "Combo — the hypothesis: value + discount", "headline": "...", "subhead": "...", "buttonText": "...", "finePrint": "...", "successMessage": "..." },
    { "variant": "B", "role": "Discount only — the control", "headline": "...", "subhead": "...", "buttonText": "...", "finePrint": "...", "successMessage": "..." },
    { "variant": "C", "role": "Content only — optional later test", "headline": "...", "subhead": "...", "buttonText": "...", "finePrint": "...", "successMessage": "..." }
  ]
}`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.GENERATOR_MODEL || "claude-sonnet-5",
        max_tokens: 2048,
        system: SYSTEM,
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
    const raw: string = data?.content?.[0]?.text ?? "";
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    const candidate = fenced ? fenced[1].trim() : raw;
    let parsed: { variants?: PopupVariant[] };
    try {
      parsed = JSON.parse(candidate);
    } catch {
      const obj = candidate.match(/\{[\s\S]*\}/);
      if (!obj) throw new Error("Could not parse the model response as JSON");
      parsed = JSON.parse(obj[0]);
    }
    if (!parsed.variants?.length) throw new Error("Model response missing variants");

    return NextResponse.json({
      collection: body.collection,
      variants: parsed.variants,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
