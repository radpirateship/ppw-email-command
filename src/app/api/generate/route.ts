// ============================================================================
// PPW Command — copy generator
// POST /api/generate  { flowType, topic, emailNumber?, totalEmails?, tone?,
//                       offer?, extraContext? }
// Returns Klaviyo-ready, brand-validated copy (email or SMS).
// Requires ANTHROPIC_API_KEY (Vercel → Settings → Environment Variables).
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import {
  FLOW_TYPES,
  SENDER,
  getBrandVoicePromptBlock,
  getInlineStyleHints,
  validateBrandCompliance,
  wrapEmailHtml,
} from "@/lib/generator";

export const maxDuration = 60;

interface GenerateRequest {
  flowType: string;
  topic: string;
  emailNumber?: number;
  totalEmails?: number;
  tone?: string;
  offer?: string;
  extraContext?: string;
}

const KLAVIYO_VARS = `
KLAVIYO VARIABLES AVAILABLE (use exactly as written, only where relevant):
- {{ person.first_name|default:'friend' }} — subscriber's first name
- {{ cart_items }} / {{ cart_url }} / {{ cart_total }} — abandonment flows
- {{ product_name }} / {{ product_url }} / {{ product_image }} — browse/post-purchase
- {{ order_number }} / {{ tracking_url }} / {{ review_url }} — post-purchase
- {% coupon_code 'CODE' %} — coupon (only if an offer is specified)
- {% unsubscribe %} — unsubscribe link (the template footer already includes it)`;

function buildSystemPrompt(channel: "email" | "sms"): string {
  const emailRules = `
WRITING RULES:
- NO filler phrases ("In today's world", "As you may know", "It goes without saying")
- NO generic wellness platitudes — be specific to the product/topic
- Subject lines: 6-10 words, create curiosity or concrete value; no emojis
- Preview text: complement the subject line, don't repeat it (max 90 chars)
- Every paragraph must earn its place
- ALWAYS sign off with: "${SENDER.senderSignOff}\\n${SENDER.senderName}\\n${SENDER.senderTitle}"

HTML OUTPUT RULES:
- Output ONLY the inner content HTML (the template wrapper adds header/footer/unsubscribe)
- Do NOT include DOCTYPE, html, head, body, or style tags
- Use inline styles; keep HTML email-client compatible
- Personalized greeting is in the template header bar already — do not repeat "Hey {name}" as the first line
- At least one clear CTA using <a class="cta-btn" href="...">
${getInlineStyleHints()}
${KLAVIYO_VARS}`;

  const smsRules = `
SMS RULES:
- Ideal length 160 characters, hard max 306
- One link max; no emojis unless the message is celebratory
- Immediate, concrete value in the first sentence
- Identify as Peak Primal Wellness if this is a first-touch message`;

  return `You are an expert ${channel === "sms" ? "SMS" : "email"} copywriter for Peak Primal Wellness (PPW), a premium home wellness e-commerce store selling saunas, cold plunges, red light therapy, hyperbaric chambers, hydrogen water machines, and recovery equipment. AOVs run $500–$15,000+ — these are considered, researched purchases.

${getBrandVoicePromptBlock()}
${channel === "sms" ? smsRules : emailRules}`;
}

function buildUserPrompt(req: GenerateRequest, flowName: string, flowContext: string, channel: "email" | "sms"): string {
  const positionLine =
    channel === "email" && req.emailNumber
      ? `EMAIL POSITION: ${req.emailNumber} of ${req.totalEmails ?? 3} in the series`
      : "";
  const format =
    channel === "sms"
      ? `Respond in valid JSON only:
{
  "smsText": "the message text",
  "notes": "one sentence on send timing"
}`
      : `Respond in valid JSON only:
{
  "subjectLines": ["option 1", "option 2", "option 3"],
  "previewText": "...",
  "bodyHtml": "inner HTML content only",
  "plainBody": "plain text version",
  "cta": { "label": "...", "url": "https://peakprimalwellness.com/..." }
}`;

  return `Write ${channel === "sms" ? "an SMS" : "an email"} for the ${flowName}.

FLOW CONTEXT: ${flowContext}
${positionLine}
TOPIC / PRODUCT: ${req.topic}
TONE: ${req.tone ?? "confident"}
${req.offer ? `OFFER TO INCLUDE: ${req.offer}` : "NO discount offer in this message — lead with value."}
${req.extraContext ? `ADDITIONAL CONTEXT:\n${req.extraContext}` : ""}

${format}`;
}

async function callClaude(system: string, user: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set. Add it in Vercel → Settings → Environment Variables, then redeploy.");
  }
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.GENERATOR_MODEL || "claude-sonnet-5",
      max_tokens: 4096,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) throw new Error(`Claude API error (${res.status}): ${(await res.text()).slice(0, 400)}`);
  const data = await res.json();
  const text = data?.content?.[0]?.text;
  if (!text) throw new Error("No content returned from Claude API");
  return text;
}

function extractJson(raw: string): unknown {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1].trim() : raw;
  try {
    return JSON.parse(candidate);
  } catch {
    const obj = candidate.match(/\{[\s\S]*\}/);
    if (obj) return JSON.parse(obj[0]);
    throw new Error("Could not parse the model response as JSON");
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json();
    if (!body.flowType || !body.topic?.trim()) {
      return NextResponse.json({ error: "flowType and topic are required" }, { status: 400 });
    }
    const flow = FLOW_TYPES.find((f) => f.id === body.flowType);
    if (!flow) {
      return NextResponse.json(
        { error: `Invalid flowType. Valid: ${FLOW_TYPES.map((f) => f.id).join(", ")}` },
        { status: 400 }
      );
    }

    const raw = await callClaude(
      buildSystemPrompt(flow.channel),
      buildUserPrompt(body, flow.name, flow.context, flow.channel)
    );

    if (flow.channel === "sms") {
      const parsed = extractJson(raw) as { smsText?: string; notes?: string };
      if (!parsed.smsText) throw new Error("Model response missing smsText");
      const validation = validateBrandCompliance("", parsed.smsText, "sms");
      if (parsed.smsText.length > 306) {
        validation.warnings.push(`SMS is ${parsed.smsText.length} chars (max 306)`);
        validation.passed = false;
      }
      return NextResponse.json({
        channel: "sms",
        smsText: parsed.smsText,
        notes: parsed.notes ?? "",
        validation,
        generatedAt: new Date().toISOString(),
      });
    }

    const parsed = extractJson(raw) as {
      subjectLines?: string[];
      previewText?: string;
      bodyHtml?: string;
      plainBody?: string;
      cta?: { label?: string; url?: string };
    };
    if (!parsed.subjectLines?.length || !parsed.bodyHtml) {
      throw new Error("Model response missing subjectLines or bodyHtml");
    }

    const validation = validateBrandCompliance(
      parsed.subjectLines.join(" "),
      parsed.bodyHtml + " " + (parsed.plainBody ?? ""),
      "email"
    );
    const fullHtml = wrapEmailHtml(parsed.bodyHtml, parsed.previewText ?? "");

    return NextResponse.json({
      channel: "email",
      subjectLines: parsed.subjectLines.slice(0, 3),
      previewText: parsed.previewText ?? "",
      bodyHtml: parsed.bodyHtml,
      fullHtml,
      plainBody: parsed.plainBody ?? "",
      cta: parsed.cta ?? null,
      validation,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
