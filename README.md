# PPW Command

Marketing command center for **Peak Primal Wellness** — a Next.js 14 (App Router) +
TypeScript + Tailwind app. This is the foundation build: a clean shell with 5 tabs,
where **Home** and **Goals** are fully built and the rest are clean stubs.

## Tabs

- **Home (This Week)** — `/` — the front door. A prominent "Do this next" card, a short
  list of this week's actions, and the full phased backlog. Tasks are checkable and
  completion persists in `localStorage` (`ppw_tasks_v1`).
- **Goals** — `/goals` — opt-in rate vs target (with the popup scoreboard) and email
  revenue share vs target, plus an auto-generated weak-points/recommendations panel.
- **Generator** — `/generator` — stub. (Email/flow HTML generator — coming next.)
- **Popups & Images** — `/popups` — stub. (Popup copy + on-brand images — coming next.)
- **Plan** — `/plan` — read-only view of the full phased roadmap.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

```bash
npm run build   # production build
npm start       # serve the production build
```

## Data layer

All real numbers live in `src/lib/data.ts` (a seeded snapshot) and the roadmap in
`src/lib/tasks.ts`. Every page renders instantly from the seed — **no API keys
required**.

API routes attempt live data and gracefully fall back to the seed on any error or
missing key:

- `GET /api/klaviyo/optin` — Klaviyo Form Values Report (opt-in rate).
- `GET /api/klaviyo/revenue` — Klaviyo metric-aggregates (email-attributed revenue).
- `GET /api/shopify/revenue` — **stubbed**; returns seed total revenue until the
  Shopify Admin API is wired in (see TODO in the route).

## Environment variables

Copy `.env.example` to `.env.local` and fill in when you're ready to go live:

| Variable | Used by | Purpose |
| --- | --- | --- |
| `KLAVIYO_PRIVATE_API_KEY` | `/api/klaviyo/*` | Live opt-in + revenue data |
| `SHOPIFY_STORE_DOMAIN` | `/api/shopify/revenue` | e.g. `your-store.myshopify.com` |
| `SHOPIFY_ADMIN_API_TOKEN` | `/api/shopify/revenue` | Admin API token (`shpat_...`) |

Without these, the app runs entirely on the seeded snapshot.

## Deploy to Vercel

1. Push this folder to a Git repo (GitHub/GitLab/Bitbucket).
2. In Vercel: **New Project → import the repo**. Framework preset auto-detects **Next.js**.
   Build command `next build`, output handled automatically. No config needed.
3. (Optional) Add the env vars above under **Project → Settings → Environment Variables**
   to enable live data.
4. Deploy. The seed snapshot means the first deploy is green with zero secrets.

## Brand

Navy `#001A5C` (primary), blue `#0A86CB` (accent), light gray `#f4f6fb` canvas, white
cards, Poppins. Defined in `tailwind.config.ts` and `src/app/globals.css`.
