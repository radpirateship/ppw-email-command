// ============================================================================
// PPW Command — upload a generated image to Klaviyo's image hosting
// POST /api/klaviyo/upload-image  { imageB64, name }
// Returns the hosted CDN URL, ready to paste into any Klaviyo template.
// Requires KLAVIYO_PRIVATE_API_KEY (images:write scope).
// ============================================================================

import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const { imageB64, name } = (await request.json()) as { imageB64?: string; name?: string };
    if (!imageB64) {
      return NextResponse.json({ error: "imageB64 is required" }, { status: 400 });
    }
    const key = process.env.KLAVIYO_PRIVATE_API_KEY;
    if (!key) {
      return NextResponse.json({ error: "KLAVIYO_PRIVATE_API_KEY is not set" }, { status: 500 });
    }

    const bytes = Buffer.from(imageB64, "base64");
    const fileName = `${(name || "ppw-generated").replace(/[^a-z0-9-_]/gi, "-").slice(0, 60)}.png`;

    const form = new FormData();
    form.append("file", new Blob([new Uint8Array(bytes)], { type: "image/png" }), fileName);
    form.append("name", fileName.replace(/\.png$/, ""));

    const res = await fetch("https://a.klaviyo.com/api/image-upload/", {
      method: "POST",
      headers: {
        Authorization: `Klaviyo-API-Key ${key}`,
        revision: "2025-04-15",
        accept: "application/json",
      },
      body: form,
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `Klaviyo upload failed (${res.status}): ${(await res.text()).slice(0, 300)}` },
        { status: 500 }
      );
    }
    const data = await res.json();
    const url = data?.data?.attributes?.image_url;
    if (!url) return NextResponse.json({ error: "Upload succeeded but no image_url returned" }, { status: 500 });

    return NextResponse.json({ url, name: data?.data?.attributes?.name ?? fileName });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
