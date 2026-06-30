/**
 * PPW Command — phased roadmap / task backlog.
 * Single source of truth for the Home (This Week) and Plan tabs.
 *
 * Each task carries a STABLE slug `id` (derived from its title) so localStorage
 * completion is keyed off identity, not array position — re-ordering or adding
 * tasks never resets the user's checkmarks. Each task also carries an explicit,
 * Klaviyo-specific `steps` checklist (written so a non-expert can follow it) and
 * an optional `ref` pointing at a companion doc with the full build detail.
 */

export type Priority = "high" | "med" | "low";

export interface Task {
  /** Stable slug derived from the title — the localStorage completion key. */
  id: string;
  phase: string;
  title: string;
  why: string;
  priority: Priority;
  est: string;
  /** Numbered, explicit, do-this-then-that build steps. */
  steps: string[];
  /** Optional companion doc that carries the full copy / build detail. */
  ref?: string;
}

/** title -> url-safe slug. */
function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

type Row = {
  title: string;
  why: string;
  priority: Priority;
  est: string;
  steps: string[];
  ref?: string;
};

const make = (phase: string, rows: Row[]): Task[] =>
  rows.map((r) => ({
    id: slug(r.title),
    phase,
    title: r.title,
    why: r.why,
    priority: r.priority,
    est: r.est,
    steps: r.steps,
    ...(r.ref ? { ref: r.ref } : {}),
  }));

// Reusable note for the three "built but never switched Live" abandonment flows.
const NEVER_LIVE_NOTE =
  "Note: these emails were fully built long ago — they were just never switched Live, which is why nothing has sent. Activating them is pure upside.";

export const TASKS: Task[] = [
  ...make("Phase 0 — Quick wins (Week 1)", [
    {
      title: "QA + activate Saunas Browse Abandonment",
      why: "Built but sitting in Draft — free money turned off.",
      priority: "high",
      est: "30 min",
      steps: [
        'Klaviyo → Flows → open the flow "SAUNAS - Browse Abandonment".',
        "Click into each email; in the editor hit Preview — check links work, images load, brand styling is right (navy buttons, blue greeting bar), and any dynamic product block renders.",
        "Preview & Test → send yourself a test email; open it on desktop AND mobile.",
        "In each email's status control, switch it from Draft → Live (it asks Manual? — choose Live, not Manual).",
        "Re-check the flow trigger and filters: exclude recent purchasers (Has NOT placed order since starting flow) and confirm Smart Sending is ON.",
        "Set the whole flow status (top-right) from Draft → Live.",
        "After a few days, open the flow's Analytics tab to confirm sends / opens / conversions.",
        NEVER_LIVE_NOTE,
      ],
    },
    {
      title: "QA + activate Saunas Abandoned Cart",
      why: "Built, in Draft. Recovers high-intent sauna shoppers.",
      priority: "high",
      est: "30 min",
      steps: [
        'Klaviyo → Flows → open the flow "SAUNAS - Abandoned Cart".',
        "Click into each email; Preview it — verify links, images, brand styling, and the cart/product block render correctly.",
        "Preview & Test → send yourself a test; open it on desktop and mobile.",
        "In each email's status control, switch Draft → Live (Manual? — No, choose Live).",
        "Re-check trigger and filters: exclude recent purchasers; Smart Sending ON.",
        "Set the whole flow status (top-right) from Draft → Live.",
        "After a few days, check the Analytics tab for sends / opens / conversions.",
        NEVER_LIVE_NOTE,
      ],
    },
    {
      title: "QA + activate Echo Water Abandoned Checkout",
      why: "Built, in Draft.",
      priority: "high",
      est: "20 min",
      steps: [
        'Klaviyo → Flows → open the flow "Echo Water - Abandoned Checkout".',
        "Click into each email; Preview it — verify links, images, brand styling, and the checkout/product block render.",
        "Preview & Test → send yourself a test; open it on desktop and mobile.",
        "In each email's status control, switch Draft → Live (Manual? — No, choose Live).",
        "Re-check trigger and filters: exclude recent purchasers; Smart Sending ON.",
        "Set the whole flow status (top-right) from Draft → Live.",
        "After a few days, check the Analytics tab for sends / opens / conversions.",
        NEVER_LIVE_NOTE,
      ],
    },
    {
      title: "Archive the two empty 'Essential Flow Recommendation_' drafts",
      why: "Junk Klaviyo defaults.",
      priority: "low",
      est: "5 min",
      steps: [
        "Klaviyo → Flows.",
        "Locate each flow whose name begins with 'Essential Flow Recommendation_'.",
        "Open each one and confirm it is empty / unused (no live emails, no meaningful config).",
        'Use the "⋯" (more) menu on the flow → Archive.',
        "Repeat for the second draft. Archiving keeps your flow list clean without deleting history.",
      ],
    },
    {
      title: "Audit & consolidate stray lists",
      why: "Merge toward one master + segments.",
      priority: "med",
      est: "45 min",
      steps: [
        "Klaviyo → Audience → Lists & Segments. Export or screenshot the full list inventory.",
        "Identify ONE master email list (e.g. L-ALL-Master-Email) that everyone should live on; flag the rest as duplicates or one-off imports.",
        "For each stray list, decide: fold into master, convert to a segment (definition-based), or archive.",
        "Bulk-add members of kept stray lists into the master list (Manage members → Add to list), then archive the now-redundant list.",
        "Replace any flow/campaign that targeted a stray list with the master list + a segment filter instead.",
        "Re-point popup/form 'submit to list' settings at the master list so new signups consolidate going forward.",
        "Document the final structure (1 master + a handful of behavioral segments) so it stays clean.",
      ],
    },
  ]),
  ...make("Phase 0B — Popups & opt-in (co-first focus)", [
    {
      title: "Rebuild the General Desktop popup — your #1 leak",
      why: "62,436 views/yr at 0.67%. Lifting to ~2.5% ≈ 4x signups from your biggest source.",
      priority: "high",
      est: "2 hrs",
      ref: "Sauna_Popup_Package.md",
      steps: [
        "Follow Sauna_Popup_Package.md — the General popup uses the same template as the Sauna one.",
        "Klaviyo → Signup Forms → Create Form → Popup. Name it 'General Popup — Combo (A)'.",
        "Build ONE responsive form (let Klaviyo handle desktop + mobile — stop maintaining separate popups).",
        "Offer = keep the $100 cash discount AND add a value hook (buyer's guide); headline pairs both.",
        "Brand styling: navy #001A5C button, blue #0A86CB header bar, Poppins, PPW logo, no green.",
        "Behavior → trigger on 35% scroll OR 20s (whichever first) + desktop exit-intent; don't re-show for 30 days; hide from existing subscribers.",
        "Targeting: sitewide MINUS sauna pages (so it doesn't double up with the Sauna popup).",
        "Set the form to submit to your master/general signup list, then Publish.",
      ],
    },
    {
      title: "Fix popup timing — stop firing on arrival",
      why: "Use ~30–40% scroll, exit-intent, or 15–20s delay.",
      priority: "high",
      est: "30 min",
      ref: "Sauna_Popup_Package.md",
      steps: [
        "Follow the timing-fix section of Sauna_Popup_Package.md.",
        "Klaviyo → Signup Forms → open each active popup → Behavior tab.",
        "Change the trigger from 'on page load' to: show on 35% scroll OR after 20 seconds (whichever first).",
        "Add desktop exit-intent as a second trigger.",
        "Set 'Don't show again for' to 30 days after dismissal.",
        "Enable 'Hide from existing subscribers' and anyone who already submitted.",
        "Save and Publish; repeat for every live popup.",
      ],
    },
    {
      title: "Test discount + content offer (buyer's guide)",
      why: "Keep the cash discount AND add a value hook; A/B vs discount-only.",
      priority: "high",
      est: "1.5 hrs",
      ref: "Sauna_Popup_Package.md",
      steps: [
        "Follow the A/B plan in Sauna_Popup_Package.md.",
        "In Klaviyo Signup Forms, build Variant A = '$X off + free Buyer's Guide' (combo) and Variant B = '$X off only' (control).",
        "Open the form → Targeting & Behavior → enable A/B test, split traffic 50/50.",
        "Wire the guide delivery: on submit, tag the profile and trigger the welcome email that links the PDF.",
        "Publish both variants on the relevant collection/product URLs.",
        "Call a winner after ~30 days or once each variant has ~500 views; roll the winner's format to the General popup.",
      ],
    },
    {
      title: "Redesign + consolidate the 16 popups",
      why: "Specific+mobile already convert best (3–4.6%). Standardize one template.",
      priority: "med",
      est: "1.5 hrs",
      ref: "Sauna_Popup_Package.md",
      steps: [
        "Follow the styling + consolidation guidance in Sauna_Popup_Package.md.",
        "List all current popups (Klaviyo → Signup Forms) and note each one's offer, targeting, and conversion rate.",
        "Build ONE on-brand responsive template (navy button, blue header bar, Poppins, logo, no green) to standardize on.",
        "Collapse desktop/mobile pairs into single responsive forms; keep category-specific offers (sauna, echo water) since specific + mobile convert best.",
        "Re-point each kept form to the right URL targeting and the master list.",
        "Archive the redundant / underperforming popups so only a tidy set remains.",
      ],
    },
  ]),
  ...make("Phase 1 — Fundamentals (Weeks 2–4)", [
    {
      title: "Rebuild the General Welcome flow",
      why:
        "The current 'Standard – Welcome Series' is weak. Rebuild it modeled on the strong Sauna flow, plus the missing lifecycle elements.",
      priority: "high",
      est: "2.5 hrs",
      ref: "General_Welcome_Flow.md",
      steps: [
        "Follow General_Welcome_Flow.md for full copy — 6 emails over ~14 days.",
        "Klaviyo → Flows → Create Flow → Build from Scratch. Name it 'F-ALL-General-Welcome'.",
        "Trigger: 'Added to List' → your master/general signup list (the sitewide popup list).",
        "Clone the 'PPW Flow Template (Old)' for styling rather than rebuilding emails from scratch.",
        "Add the 6 emails with the day delays from the doc: E1 immediate, E2 day 2, E3 day 4, E4 day 7, E5 day 10, E6 day 14.",
        "E1 delivers the $100 code ({% coupon_code 'WELCOME100' %}) and includes the self-segmentation category buttons (tag profile on click).",
        "Add a flow filter / conditional split to EXIT on Placed Order so buyers stop receiving it.",
        "Preview & test every email on desktop + mobile, then set the flow status to Live.",
      ],
    },
    {
      title: "Round out the Sauna welcome with missing elements",
      why:
        "Sauna flow is good; add the few missing pieces (review ask, consult invite, an SMS touch).",
      priority: "med",
      est: "1 hr",
      ref: "General_Welcome_Flow.md",
      steps: [
        "Klaviyo → Flows → open the existing Sauna welcome/TSL flow.",
        "Add a free-consultation invite email (book-a-call CTA) in the Trust/Close phase if not already present.",
        "Add a review-request step after the expected delivery window for anyone who has purchased.",
        "Add one SMS touch (testimonial nudge or offer reminder) — SMS action composed inline, gated to SMS-consented profiles.",
        "Confirm the exit-on-Placed-Order split is in place so buyers stop the nurture.",
        "Preview + test the new steps, then re-publish the flow Live.",
      ],
    },
    {
      title: "Build the Post-Purchase flow",
      why: "Confirmation → shipping → setup → check-in → review request → accessory upsell.",
      priority: "high",
      est: "3 hrs",
      steps: [
        "Klaviyo → Flows → Create Flow → Build from Scratch. Name it 'F-ALL-Post-Purchase'.",
        "Trigger: Metric → 'Placed Order'.",
        "Email 1 (immediate): order confirmation + what-happens-next reassurance.",
        "Delay 1–2 days → Email 2: shipping / delivery expectations and how to prepare the space.",
        "Delay to ~delivery → Email 3: setup & first-use guide for the product category.",
        "Delay ~7 days → Email 4: check-in ('how's it going?', support + reply CTA).",
        "Delay ~14 days → Email 5: review request (link to the review form).",
        "Delay ~30 days → Email 6: relevant accessory / replenishment upsell.",
        "Add a flow filter so only actual purchasers enter; preview/test each email; set Live.",
      ],
    },
    {
      title: "Add SMS to abandoned checkout",
      why: "783 SMS subscribers sitting unused.",
      priority: "high",
      est: "1 hr",
      steps: [
        "Klaviyo → Flows → open your Abandoned Checkout flow (or the Echo Water one as the pattern).",
        "Add an SMS action ~30–60 min after the checkout-started trigger.",
        "Gate it with a conditional split: only continue if the profile has SMS consent (Can Receive SMS).",
        "Compose the SMS inline: short, friendly, one link back to the cart; include {{ first_name }}.",
        "Add the required STOP/HELP compliance language per Klaviyo SMS settings.",
        "Confirm Smart Sending + quiet hours, preview/test to your own number, then set Live.",
      ],
    },
    {
      title: "Build Win-Back flow",
      why: "90–120 days no purchase; segment already exists.",
      priority: "med",
      est: "1.5 hrs",
      steps: [
        "Klaviyo → Flows → Create Flow. Name it 'F-ALL-Win-Back'.",
        "Trigger: 'Added to Segment' → your existing 90–120-day-lapsed-buyer segment.",
        "Email 1 (immediate): 'we miss you' + remind them what they bought / category interest.",
        "Delay ~4 days → Email 2: social proof + best-sellers or what's new since they left.",
        "Delay ~4 days → Email 3: a time-limited win-back incentive (code).",
        "Add exit-on-Placed-Order split so re-purchasers stop receiving it.",
        "Preview/test, then set Live.",
      ],
    },
    {
      title: "Build Sunset / hygiene flow",
      why: "No opens in 90 days; protects deliverability.",
      priority: "med",
      est: "1 hr",
      steps: [
        "Klaviyo → Audience → create a segment 'Unengaged 90d' (no open/click in 90+ days, still subscribed).",
        "Klaviyo → Flows → Create Flow. Name it 'F-ALL-Sunset'. Trigger: 'Added to Segment' → Unengaged 90d.",
        "Email 1: 'still want to hear from us?' re-engagement ask with a clear CTA.",
        "Delay ~5 days → Conditional split on 'Opened/Clicked since flow start'.",
        "Engaged path: tag re-engaged and exit. Unengaged path → final 'last chance' email.",
        "Delay ~3 days → if still unengaged, add an action to unsubscribe/suppress (or move to a do-not-send list).",
        "Set Live — this protects sender reputation and deliverability.",
      ],
    },
  ]),
  ...make("SMS track (parallel to email)", [
    {
      title: "Grow SMS consent (checkout checkbox + SMS popup)",
      why: "Only 783 SMS subs — capture more at checkout and on popups.",
      priority: "high",
      est: "1 hr",
      steps: [
        "Shopify checkout: enable the SMS marketing consent checkbox so opt-ins flow into Klaviyo.",
        "Klaviyo → Signup Forms: add a phone field (with explicit SMS consent language) to your highest-traffic popups.",
        "Confirm the consent text meets TCPA requirements (you can edit the legal copy in the form).",
        "Verify new phone opt-ins land on L-ALL-Master-SMS (or your SMS list) in Klaviyo.",
        "Make sure SMS sending is enabled and a sending number is provisioned in Klaviyo → Settings → SMS.",
        "Spot-check a test signup end-to-end to confirm consent is captured correctly.",
      ],
    },
    {
      title: "SMS on abandoned checkout & cart",
      why: "One text 30–60 min after, for high-intent carts.",
      priority: "high",
      est: "1 hr",
      steps: [
        "Klaviyo → Flows → open Abandoned Checkout and Abandoned Cart flows.",
        "Add an SMS action 30–60 min after the trigger, behind a 'has SMS consent' conditional split.",
        "Compose a short text with the product name + a single link back to the cart.",
        "Include STOP/HELP compliance language and respect quiet hours.",
        "Smart Sending ON to avoid stacking with the email; preview/test to your number.",
        "Set Live for high-intent carts only (consider a minimum cart value filter).",
      ],
    },
    {
      title: "SMS on browse abandonment (high-ticket)",
      why: "Single text for repeat viewers of $2K+ items.",
      priority: "med",
      est: "45 min",
      steps: [
        "Klaviyo → Flows → open (or clone) the Browse Abandonment flow.",
        "Add a trigger/flow filter: viewed a product priced $2K+ at least twice (repeat high-intent).",
        "Add a single SMS action a few hours after the last view, behind a 'has SMS consent' split.",
        "Compose one concise text referencing the category + a link back; include STOP/HELP language.",
        "Keep it to ONE text only (high-ticket browsers, not a sequence).",
        "Preview/test, respect quiet hours, then set Live.",
      ],
    },
    {
      title: "Post-purchase SMS: shipping & delivery updates",
      why: "Transactional-style texts build trust on big orders.",
      priority: "med",
      est: "1 hr",
      steps: [
        "Klaviyo → Flows → open the Post-Purchase flow.",
        "Add SMS actions tied to fulfillment events: 'order shipped' and 'out for delivery' (Shopify fulfillment metrics).",
        "Gate each behind a 'has SMS consent' conditional split.",
        "Compose short, transactional-tone texts with tracking link + order reference.",
        "These build trust on big-ticket orders; keep them informational, not promotional.",
        "Preview/test to your number, then set Live.",
      ],
    },
    {
      title: "SMS win-back nudge",
      why: "One text to lapsed buyers alongside the email win-back.",
      priority: "med",
      est: "30 min",
      steps: [
        "Klaviyo → Flows → open the Win-Back flow.",
        "Add a single SMS action alongside Email 2 or 3, behind a 'has SMS consent' split.",
        "Compose one friendly 'we miss you' text with the incentive code + a link.",
        "Include STOP/HELP language and respect quiet hours.",
        "Smart Sending ON so it doesn't fire on the same day as the email.",
        "Preview/test, then set Live.",
      ],
    },
    {
      title: "Monthly SMS campaign (1–2/mo max)",
      why: "Pair with your biggest email sends; keep it rare so it stays high-signal.",
      priority: "low",
      est: "ongoing",
      steps: [
        "Klaviyo → Campaigns → Create Campaign → SMS.",
        "Audience: your SMS-consented list, excluding recent purchasers if relevant.",
        "Pair the send with your biggest email campaign of the month (same promo/theme).",
        "Keep the text short with one clear link; include STOP/HELP language.",
        "Schedule inside quiet-hours-safe windows; cap at 1–2 per month so it stays high-signal.",
        "Review SMS campaign analytics (clicks, opt-outs) and adjust cadence.",
      ],
    },
  ]),
  ...make("Phase 2 — Product lines + accessory engine (Weeks 5–10)", [
    {
      title: "Build Sauna Accessory Replenishment flow",
      why: "Stones/elements/sensors are top sellers — your repeat engine.",
      priority: "high",
      est: "2 hrs",
      steps: [
        "Klaviyo → Flows → Create Flow. Name it 'F-SAU-Accessory-Replenishment'.",
        "Trigger: Metric → 'Placed Order' filtered to a sauna product (or sauna category).",
        "Add a Time Delay sized to the consumable's lifecycle (e.g. ~60–90 days for stones/elements/sensors).",
        "Email 1: 'time to refresh your stones/elements/sensors' with a direct add-to-cart link to the accessory.",
        "Delay ~14 days → Email 2: reminder + a small bundle/replenishment incentive.",
        "Add exit-on-Placed-Order (of the accessory) split so buyers stop receiving it.",
        "Preview/test, then set Live — this is the repeat-purchase engine.",
      ],
    },
    {
      title: "Hyperbaric nurture",
      why: "Very high AOV; segment from master.",
      priority: "med",
      est: "1.5 hrs",
      steps: [
        "Klaviyo → Audience → build a segment of hyperbaric-interested profiles (viewed hyperbaric collection / tagged interest).",
        "Klaviyo → Flows → Create Flow. Name it 'F-HYP-Nurture'. Trigger: 'Added to Segment' → that segment.",
        "Given the very high AOV, lead with education and trust, not discounts.",
        "Email 1: intro to hyperbaric benefits + why-buy-from-PPW. Delay ~2 days.",
        "Email 2: model comparison / sizing + financing reassurance. Delay ~3 days.",
        "Email 3: social proof + free expert consultation CTA (book a call).",
        "Add exit-on-Placed-Order; preview/test; set Live.",
      ],
    },
  ]),
  ...make("Phase 3 — Weekly campaigns", [
    {
      title: "Build repeatable weekly campaign template",
      why: "Navy/blue brand.",
      priority: "high",
      est: "1 hr",
      steps: [
        "Klaviyo → Email Templates → Create Template (or clone the PPW flow template).",
        "Lay out reusable blocks: hero, one feature/education block, one product block, footer.",
        "Apply brand styling: navy #001A5C buttons, blue #0A86CB header bar, Poppins, PPW logo + full footer, no green.",
        "Save it as a Saved Template named 'PPW Weekly Campaign' so it can be cloned each week.",
        "Confirm the footer has {% unsubscribe %} and correct contact info.",
        "Send yourself a test to confirm it renders on desktop + mobile.",
      ],
    },
    {
      title: "Build 8-week campaign calendar from existing content",
      why: "Reuse topical-authority library.",
      priority: "med",
      est: "2 hrs",
      steps: [
        "List your existing topical-authority / blog content you can repurpose into emails.",
        "Map 8 weeks: assign one theme + primary product focus to each week (rotate categories).",
        "For each week note subject line, hero angle, the reused content, and the CTA/product.",
        "Build each as a campaign in Klaviyo from the 'PPW Weekly Campaign' template; schedule the sends.",
        "Set audience = master list minus recent purchasers / suppressed; add segment targeting where a week is category-specific.",
        "Keep the calendar in one doc so the cadence is repeatable beyond the first 8 weeks.",
      ],
    },
  ]),
];

/** Ordered list of phases (preserves declaration order). */
export const PHASES: string[] = Array.from(new Set(TASKS.map((t) => t.phase)));

/** Priority sort weight (high first). */
export const PRIORITY_WEIGHT: Record<Priority, number> = { high: 0, med: 1, low: 2 };
