// ============================================================================
// PPW Command — tiny key-value store for test history & variant registry,
// backed by Neon Postgres (single jsonb table).
// GET  /api/store?key=ppw_tests    → { value }
// PUT  /api/store  { key, value }  → { ok: true }
// Env: DATABASE_URL (Neon connection string — Vercel's Neon integration sets
// it automatically). Returns 503 when unconfigured — the client falls back to
// localStorage so the app keeps working.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const ALLOWED_KEYS = new Set(["ppw_tests", "ppw_history"]);

function db() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) return null;
  return neon(url);
}

let tableReady = false;
async function ensureTable(sql: ReturnType<typeof neon>) {
  if (tableReady) return;
  await sql`CREATE TABLE IF NOT EXISTS ppw_store (
    key text PRIMARY KEY,
    value jsonb NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
  )`;
  tableReady = true;
}

export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key") ?? "";
  if (!ALLOWED_KEYS.has(key)) {
    return NextResponse.json({ error: "invalid key" }, { status: 400 });
  }
  const sql = db();
  if (!sql) return NextResponse.json({ error: "db-not-configured" }, { status: 503 });
  try {
    await ensureTable(sql);
    const rows = (await sql`SELECT value FROM ppw_store WHERE key = ${key}`) as { value: unknown }[];
    return NextResponse.json({ value: rows[0]?.value ?? null });
  } catch (e) {
    return NextResponse.json({ error: String(e).slice(0, 200) }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const { key, value } = (await request.json()) as { key?: string; value?: unknown };
  if (!key || !ALLOWED_KEYS.has(key)) {
    return NextResponse.json({ error: "invalid key" }, { status: 400 });
  }
  const sql = db();
  if (!sql) return NextResponse.json({ error: "db-not-configured" }, { status: 503 });
  try {
    await ensureTable(sql);
    await sql`INSERT INTO ppw_store (key, value, updated_at)
      VALUES (${key}, ${JSON.stringify(value)}::jsonb, now())
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e).slice(0, 200) }, { status: 500 });
  }
}
