// ============================================================================
// PPW Command — Generator config: brand voice, flow types, email template.
// Ported (and simplified) from ppw-email-engine's ppw-brand.ts +
// email-styles.ts. This is the single source of truth for generated copy.
// ============================================================================

// ---------------------------------------------------------------------------
// Brand identity
// ---------------------------------------------------------------------------

export const SENDER = {
  companyName: "Peak Primal Wellness",
  senderName: "James Ruhle",
  senderTitle: "Founder, Peak Primal Wellness",
  senderSignOff: "Here for your journey,",
  replyToEmail: "James@PeakPrimalWellness.com",
};

const BRAND_VOICE = {
  tone: [
    "Direct and confident — we don't hedge or use filler",
    "Educational without being clinical — explain the science accessibly",
    "Primal, performance-driven, but never bro-culture",
    "Warm authority — like a trusted advisor who's done the research",
    "Aspirational but grounded — real results, not hype",
  ],
  use: [
    "recovery", "performance", "ritual", "primal", "discipline", "wellness",
    "longevity", "optimize", "invest", "transform", "protocol", "journey",
  ],
  avoid: [
    "cheap", "deal", "just", "honestly", "game-changer", "hack", "guru",
    "crushing it", "no-brainer",
  ],
  pov: "Written as the founder sharing genuine experience and knowledge — first person singular when signing off, first person plural ('we') when speaking about the company and team",
  rules: [
    "Never use rhetorical questions as email openers",
    "Never reference competitors by name",
    "Avoid emojis in subject lines",
    "Never fabricate testimonials or customer quotes",
    "Never invent product names — only reference real PPW inventory",
    "Do not use 'In today's world', 'As you may know', or similar filler openers",
    "Do not use multiple exclamation marks",
  ],
};

const BRAND_STORY = `Peak Primal Wellness was founded by James Ruhle, a lifelong fitness enthusiast who realized that peak performance demands more than just time in the gym — it demands mastering recovery and longevity. After hosting a podcast for three years on longevity and life extension, interviewing the world's foremost experts, James channeled everything he learned into building Peak Primal Wellness: a destination for the best fitness and recovery products for people who are serious about their health. We're not here to sell trends — we're here to deliver the science-backed tools that help you perform, recover, and live at your peak.`;

const CUSTOMER = {
  audience:
    "Health-conscious adults 30-55 investing in long-term wellness and recovery — they research before they buy and value expertise over hype",
  painPoints: [
    "Recovery time after workouts or physical stress",
    "Poor sleep quality and inconsistent energy",
    "Stress management and mental clarity",
    "Analysis paralysis from too many product options",
  ],
  aspirations: [
    "Peak physical and mental performance",
    "A daily wellness ritual they look forward to",
    "Longevity and long-term health optimization",
    "Informed, confident purchase decisions",
  ],
};

export function getBrandVoicePromptBlock(): string {
  return `
═══════════════════════════════════════════════════════════════
MANDATORY BRAND IDENTITY — DO NOT DEVIATE
═══════════════════════════════════════════════════════════════

SENDER IDENTITY (LOCKED — never invent or change these):
- Company: ${SENDER.companyName}
- Sender Name: ${SENDER.senderName}
- Sender Title: ${SENDER.senderTitle}
- Sign-off: "${SENDER.senderSignOff}"
  ${SENDER.senderName}
  ${SENDER.senderTitle}
- Reply-to: ${SENDER.replyToEmail}

CRITICAL: Every email MUST end with exactly this sign-off block. Do NOT use any other name, title, or sign-off style.

BRAND VOICE:
${BRAND_VOICE.tone.map((t) => `- ${t}`).join("\n")}

POINT OF VIEW: ${BRAND_VOICE.pov}

VOCABULARY:
- USE these words/phrases: ${BRAND_VOICE.use.join(", ")}
- AVOID these words/phrases: ${BRAND_VOICE.avoid.join(", ")}

WRITING RULES (MANDATORY):
${BRAND_VOICE.rules.map((p) => `- ${p}`).join("\n")}

BRAND STORY CONTEXT:
${BRAND_STORY}

TARGET CUSTOMER:
${CUSTOMER.audience}
- Pain points: ${CUSTOMER.painPoints.join("; ")}
- Aspirations: ${CUSTOMER.aspirations.join("; ")}

═══════════════════════════════════════════════════════════════
`;
}

// ---------------------------------------------------------------------------
// Flow types (simplified set for the Command app)
// ---------------------------------------------------------------------------

export interface FlowTypeDef {
  id: string;
  name: string;
  channel: "email" | "sms";
  context: string;
}

export const FLOW_TYPES: FlowTypeDef[] = [
  {
    id: "welcome",
    name: "Welcome Series",
    channel: "email",
    context:
      "A welcome series for new subscribers (usually from a popup signup). Email 1 delivers the promised incentive and sets expectations. Middle emails educate on the category and build trust. The final email converts with a clear offer. Use {{ person.first_name|default:'friend' }}.",
  },
  {
    id: "browse-abandon",
    name: "Browse Abandonment",
    channel: "email",
    context:
      "The subscriber viewed product pages but didn't add to cart. Use {{ product_name }}, {{ product_url }}, {{ product_image }}. Email 1 reminds them what they viewed (2hr delay). Email 2 adds social proof and offers expert help (48hr). Gentle and informative — never pushy.",
  },
  {
    id: "cart-abandon",
    name: "Abandoned Cart",
    channel: "email",
    context:
      "The subscriber added items to cart but didn't check out. Use {{ cart_items }}, {{ cart_url }}, {{ cart_total }}. Email 1 is a soft reminder (1hr). Email 2 adds social proof and benefits (24hr). Email 3 creates urgency with an incentive (72hr). Helpful, not desperate — these are considered purchases.",
  },
  {
    id: "checkout-abandon",
    name: "Abandoned Checkout",
    channel: "email",
    context:
      "The subscriber reached checkout but didn't complete the purchase — they were very close. Use {{ cart_items }}, {{ cart_url }}, {{ cart_total }}. Email 1 offers help completing the order (1hr). Email 2 addresses objections: warranty, financing, shipping (24hr). Email 3 uses a limited-time incentive (72hr).",
  },
  {
    id: "post-purchase",
    name: "Post-Purchase",
    channel: "email",
    context:
      "The subscriber just bought. Build loyalty: order confirmation warmth, setup/usage guidance, a check-in, a review request, and eventually a within-ecosystem cross-sell (accessories/consumables for what they bought — NOT unrelated categories). Use {{ order_number }}, {{ product_name }}, {{ review_url }}. Warm and supportive.",
  },
  {
    id: "winback",
    name: "Win-Back",
    channel: "email",
    context:
      "A lapsed customer hasn't purchased or engaged in months. Re-establish the relationship with what's new (email 1), provide genuinely useful content (email 2), and offer a welcome-back incentive (email 3). Acknowledge the gap without guilt-tripping.",
  },
  {
    id: "campaign",
    name: "One-Off Campaign",
    channel: "email",
    context:
      "A standalone campaign to the main list (or a segment). Could be educational content, a product spotlight, a seasonal promotion, or an announcement. One clear goal, one clear CTA. The list is small and high-value — every send should earn its place in the inbox.",
  },
  {
    id: "sms",
    name: "SMS Message",
    channel: "sms",
    context:
      "A single SMS (160 chars ideal, 306 max). SMS subscribers opted in — respect the channel: immediate value, no fluff, one link max. Identify as Peak Primal Wellness in the first message of any conversation. Include opt-out language ('Text STOP to opt out') only if this is a first-touch message. Use for: cart/checkout reminders, shipping updates, flash offers, back-in-stock.",
  },
];

export const TONES = ["confident", "friendly", "educational", "urgent"] as const;

// ---------------------------------------------------------------------------
// Brand compliance validation (post-generation)
// ---------------------------------------------------------------------------

export interface BrandValidationResult {
  passed: boolean;
  warnings: string[];
}

export function validateBrandCompliance(
  subject: string,
  body: string,
  channel: "email" | "sms"
): BrandValidationResult {
  const warnings: string[] = [];
  const combined = `${subject} ${body}`.toLowerCase();

  // Hallucinated sender name near sign-off
  const fakeNames = ["marcus", "sarah", "mike", "john", "david", "alex", "chris", "jason", "mark", "team at ppw"];
  const signOffRegion = combined.slice(-500);
  for (const fake of fakeNames) {
    if (signOffRegion.includes(fake)) {
      warnings.push(`Possible hallucinated sender name "${fake}" near sign-off (expected: ${SENDER.senderName})`);
    }
  }

  if (channel === "email" && !combined.includes(SENDER.senderName.toLowerCase())) {
    warnings.push(`Sender name "${SENDER.senderName}" not found in the email`);
  }

  // Avoided vocabulary
  for (const word of BRAND_VOICE.avoid) {
    const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
    const matches = combined.match(regex);
    if (matches?.length) warnings.push(`Avoided word "${word}" used ${matches.length} time(s)`);
  }

  // No green (deprecated brand color)
  if (/#(00ff00|008000|22c55e|16a34a|4caf50|10b981)|color:\s*green/i.test(body)) {
    warnings.push("Green color detected — PPW brand is navy/blue only");
  }

  // Personalization + unsubscribe presence (email only; wrapper adds unsubscribe)
  if (channel === "email" && !/person\.first_name|first_name\|default/.test(body)) {
    warnings.push("No first-name personalization tag found");
  }

  // Rhetorical question opener
  if (channel === "email" && /^[^.!<]{0,120}\?/.test(body.replace(/<[^>]+>/g, "").trim())) {
    warnings.push("May open with a rhetorical question (avoid per brand rules)");
  }

  return { passed: warnings.length === 0, warnings };
}

// ---------------------------------------------------------------------------
// Email HTML wrapper — the PPW Klaviyo template (navy/blue, Poppins, 600px)
// ---------------------------------------------------------------------------

const C = {
  headerBg: "#0A86CB",
  ctaPrimary: "#001A5C",
  headingColor: "#09195B",
  bodyText: "#000000",
  emailBg: "#FAFAFD",
  contentBg: "#ffffff",
  footerBg: "#15191E",
  footerText: "#ffffff",
  linkColor: "#0015D2",
  accentColor: "#001A5C",
};
const FONT = "Poppins, Helvetica, Arial, sans-serif";
const CDN = "https://d3k81ch9hvuctc.cloudfront.net/company/RbmCvX/images";

export function getInlineStyleHints(): string {
  return `
INLINE STYLE GUIDE (use these exact values):
- Headings: color: ${C.headingColor}; font-family: ${FONT}; font-weight: 600;
- Body text: color: ${C.bodyText}; font-size: 18px; line-height: 1.3; font-family: ${FONT};
- Primary CTA button: <a> with style="display:inline-block;background-color:${C.ctaPrimary};color:#ffffff;padding:18px 32px;text-decoration:none;border-radius:8px;font-weight:600;font-size:18px;font-family:${FONT};"
- Links: color: ${C.linkColor};
- NEVER use green anywhere.`;
}

export function wrapEmailHtml(inner: string, preheader: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Peak Primal Wellness</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
    body { margin: 0; padding: 0; font-family: ${FONT}; background-color: ${C.emailBg}; color: ${C.bodyText}; }
    .preheader { display: none !important; max-height: 0; overflow: hidden; mso-hide: all; }
    .cta-btn { display: inline-block; background-color: ${C.ctaPrimary}; color: #ffffff; padding: 18px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 18px; margin: 16px 0; font-family: ${FONT}; }
  </style>
</head>
<body>
  <div class="preheader">${preheader}</div>
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${C.emailBg};">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color: ${C.contentBg};">
        <tr>
          <td align="center" style="padding: 20px 0;">
            <img src="${CDN}/5280fb0b-a7f1-436b-9e03-bfb782aa83e7.png" alt="Peak Primal Wellness" style="max-width: 200px;">
          </td>
        </tr>
        <tr>
          <td style="background-color: ${C.headerBg}; padding: 16px 32px; text-align: center;">
            <p style="color: #ffffff; font-family: ${FONT}; font-size: 20px; font-weight: 700; margin: 0;">
              Hey {{ person.first_name|default:'friend' }}, welcome!
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding: 32px; font-family: ${FONT};">
${inner}
          </td>
        </tr>
        <tr>
          <td style="padding: 0 32px;">
            <div style="border-top: 3px solid ${C.accentColor};"></div>
          </td>
        </tr>
        <tr>
          <td style="background-color: ${C.ctaPrimary}; padding: 14px 32px; text-align: center;">
            <span style="color: #ffffff; font-family: ${FONT}; font-size: 13px; font-weight: 600; letter-spacing: 0.5px;">FREE SHIPPING</span>
            <span style="color: rgba(255,255,255,0.5); margin: 0 10px;">|</span>
            <span style="color: #ffffff; font-family: ${FONT}; font-size: 13px; font-weight: 600; letter-spacing: 0.5px;">FINANCING AVAILABLE</span>
            <span style="color: rgba(255,255,255,0.5); margin: 0 10px;">|</span>
            <span style="color: #ffffff; font-family: ${FONT}; font-size: 13px; font-weight: 600; letter-spacing: 0.5px;">EXPERT SUPPORT</span>
          </td>
        </tr>
        <tr>
          <td style="background-color: ${C.footerBg}; padding: 24px 32px; text-align: center;">
            <img src="${CDN}/15c904eb-7090-4dfc-918d-90c86d74542c.png" alt="Peak Primal Wellness" style="max-width: 150px; margin-bottom: 12px;">
            <p style="color: ${C.footerText}; font-family: ${FONT}; font-size: 14px; margin: 8px 0;">(877) 689-4898</p>
            <p style="color: ${C.footerText}; font-family: ${FONT}; font-size: 14px; margin: 8px 0;">info@peakprimalwellness.com</p>
            <img src="${CDN}/14e60c51-6404-40b5-916f-71033b10490c.png" alt="Payment Methods" style="max-width: 450px; margin: 12px 0;">
            <p style="margin: 12px 0;">
              <a href="{% unsubscribe %}" style="color: ${C.footerText}; font-size: 12px; text-decoration: underline; font-family: ${FONT};">Unsubscribe</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
