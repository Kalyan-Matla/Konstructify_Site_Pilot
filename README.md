# Konstructify

Mobile-first construction management for Indian SME contractors (₹5L–₹5Cr projects). Offline-first, vendor-credit-centric, and built to feel like a premium product — not a generic dashboard template.

**Live in 30 seconds:** clone it, `npm install && npm run dev`, sign in with any demo account below. No backend, no signup, no API keys.

## Demo accounts

Password for all: `build@2026`

| Role | Email |
|---|---|
| Owner | `owner@konstructify.in` |
| Site Manager | `sitemanager@konstructify.in` |
| Accountant | `accounts@konstructify.in` |

These are a client-side demo gate only (credentials matched in the browser, nothing sent anywhere) — there's no backend to authenticate against.

## Modules

Dashboard · Projects · Vendors · Vendor Credits · Work Status (photos) · Work Orders · Budgeting (BOQ) · Payments (NEFT/RTGS) · Reports (project summary, vendor performance, 30-day cash flow)

## Key features

- **Vendor credit management** — per-vendor limits, real-time usage derived from unpaid invoices, aging buckets, alerts at >80% usage, alternative-vendor suggestions when a line maxes out.
- **Command palette (⌘K / Ctrl+K)** — global search across vendors, invoices, projects, tasks and work orders; quick actions for every "New X" flow; a "Recent" section that learns what you actually use.
- **Bulk actions** — multi-select and bulk delete/mark-complete/pay across every list page, with one consolidated toast (not N) and a single "Undo" that restores everything.
- **Offline mode** — all state persisted to localStorage; mutations made offline queue with "⏳ Sync pending" badges and auto-sync on reconnect.
- **Toasts with undo** — every save confirms itself; every delete offers a time-boxed Undo (hover to pause the countdown).
- **AI suggestion cards** — rule-based (mock) budget overrun, credit opportunity, early-payment, and progress-estimate suggestions embedded inline.
- **Responsive** — bottom tab bar + command dock on mobile (320px+), sidebar on desktop, WCAG AA contrast throughout.

## Design

A warm-stone, bronze-gold "Site Ledger" identity (Calistoga display serif + Inter + JetBrains Mono tabular numerals) — built with the [Emil Kowalski design-engineering](https://animations.dev) motion principles and audited against AI-slop anti-patterns (no gradient text, no side-stripe cards, no generic hero-metric templates). A landing page with real construction photography leads into the app.

## Stack

React 18 · TypeScript (strict, no `any`) · Tailwind CSS v3 · React Router v6 · Lucide icons · date-fns · Vite

## Run locally

```bash
npm install   # or: bun install
npm run dev   # http://localhost:5173
npm run build
npm run preview
```

## Deploy

**Vercel (recommended, one click):**
1. Push this repo to GitHub (see below).
2. [vercel.com/new](https://vercel.com/new) → import the repo. Framework preset auto-detects as **Vite** from `vercel.json` — accept the defaults (`npm run build`, output `dist`) and deploy.
3. `vercel.json` already handles SPA rewrites, so deep links (e.g. `/reports`) work on refresh, and long-caches hashed assets.

**Any static host** (Netlify, Cloudflare Pages, GitHub Pages, S3): run `npm run build`, upload the `dist/` folder. It's a fully static SPA — just make sure your host rewrites all routes to `index.html`.

**GitHub Actions auto-deploy:** `.github/workflows/deploy.yml` deploys to Vercel on every push to `main`, if you add a `VERCEL_TOKEN` repo secret ([vercel.com/account/tokens](https://vercel.com/account/tokens)). Not required if you use Vercel's native Git integration instead (step 2 above) — pick one, not both.

## Push this to GitHub

```bash
cd konstructify
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```

The repo already has git history and a clean working tree — this is the only step needed.

## Data

Mock data only (no backend, no database). All entities live in localStorage under `konstructify-state-v1`; the demo session lives under `konstructify-auth-v1`. Use "Reset demo data" in the sidebar (or the "More" menu on mobile) to reseed.

## Project structure

```
src/
  components/   Layout, CommandPalette, and shared UI primitives (Modal, Badge, BulkBar, ...)
  contexts/     AppContext (data + offline sync), AuthContext (demo login), ToastContext
  hooks/        useBulkSelect, useBulkDelete, useRouteAction, useFx (motion helpers)
  pages/        One file per module (Dashboard, Vendors, Payments, ...) + Landing/Login
  utils/        format.ts, derive.ts (credit/aging math), ai-suggestions.ts, mock-data.ts
```
