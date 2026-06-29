import { NextResponse } from "next/server";
import { REVENUE_SEED } from "@/lib/data";

export const dynamic = "force-dynamic";

/**
 * TODO (Shopify integration): total order revenue, trailing 12 months.
 *
 * When SHOPIFY_STORE_DOMAIN and SHOPIFY_ADMIN_API_TOKEN are set, this route WILL
 * call the Shopify Admin API to sum total order revenue, then feed totalRevenue
 * back into the revenue-share calculation on the Goals tab.
 *
 * Implementation sketch:
 *   const domain = process.env.SHOPIFY_STORE_DOMAIN;        // e.g. peak-primal.myshopify.com
 *   const token  = process.env.SHOPIFY_ADMIN_API_TOKEN;     // Admin API access token (shpat_...)
 *   const res = await fetch(
 *     `https://${domain}/admin/api/2024-10/orders.json?status=any&created_at_min=<ISO>`,
 *     { headers: { "X-Shopify-Access-Token": token! } }
 *   );
 *   // sum order.total_price across paginated results -> totalRevenue
 *
 * The token goes in SHOPIFY_ADMIN_API_TOKEN (see .env.example). Never expose it
 * client-side — this route runs server-side only.
 *
 * For v1 we return the seed totalRevenue so the dashboard renders without keys.
 */
export async function GET() {
  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  const token = process.env.SHOPIFY_ADMIN_API_TOKEN;

  if (!domain || !token) {
    return NextResponse.json({
      totalRevenue: REVENUE_SEED.totalRevenue,
      source: "seed",
    });
  }

  // TODO: live Shopify call goes here. Until implemented, return seed safely.
  try {
    return NextResponse.json({
      totalRevenue: REVENUE_SEED.totalRevenue,
      source: "seed",
    });
  } catch {
    return NextResponse.json({
      totalRevenue: REVENUE_SEED.totalRevenue,
      source: "seed",
    });
  }
}
