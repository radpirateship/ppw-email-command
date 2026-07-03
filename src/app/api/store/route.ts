// ============================================================================
// PPW Command — tiny KV store for test history & variant registry.
// GET  /api/store?key=ppw_tests        → { value }
// PUT  /api/store  { key, value }      → { ok: true }
// Backed by Vercel KV / Upstash Redis REST (create in Vercel → Storage; the
// integration adds the env vars). Returns 503 when unconfigured — the client
// falls back to localStorage so the app keeps working.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";

const ALLOWED_KEYS = new Set(["ppw_tests", "ppw_history"]);

function kvConfig(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url: url.replace(/\/$/, ""), token };
}

export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key") ?? "";
  if (!ALLOWED_KEYS.has(key)) {
    return NextResponse.json({ error: "invalid key" }, { status: 400 });
  }
  const kv = kvConfig();
  if (!kv) return NextResponse.json({ error: "kv-not-configured" }, { status: 503 });
  try {
    const res = await fetch(`${kv.url}/get/${key}`, {
      headers: { Authorization: `Bearer ${kv.token}` },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`KV ${res.status}`);
    const data = await res.json();
    // Upstash returns { result: string | null }
    const value = data?.result ? JSON.parse(data.result) : null;
    return NextResponse.json({ value });
  } catch (e) {
    return NextResponse.json({ error: String(e).slice(0, 200) }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const { key, value } = (await request.json()) as { key?: string; value?: unknown };
  if (!key || !ALLOWED_KEYS.has(key)) {
    return NextResponse.json({ error: "invalid key" }, { status: 400 });
  }
  const kv = kvConfig();
  if (!kv) return NextResponse.json({ error: "kv-not-configured" }, { status: 503 });
  try {
    const res = await fetch(`${kv.url}/set/${key}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${kv.token}`, "content-type": "application/json" },
      body: JSON.stringify(JSON.stringify(value)),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`KV ${res.status}`);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e).slice(0, 200) }, { status: 500 });
  }
}
