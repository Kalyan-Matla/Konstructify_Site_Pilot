# Konstructify

Mobile-first construction management for Indian SME contractors (₹5L–₹5Cr projects). Offline-first, vendor-credit-centric.

## Modules

Dashboard · Projects · Vendors · Vendor Credits · Work Status (photos) · Work Orders · Budgeting (BOQ) · Payments (NEFT/RTGS) · Reports (project summary, vendor performance, 30-day cash flow)

## Key features

- **Vendor credit management** — per-vendor limits, real-time usage derived from unpaid invoices, aging buckets, alerts at >80% usage, alternative-vendor suggestions.
- **Offline mode** — all state persisted to localStorage; mutations made offline queue with "⏳ Sync pending" badges and auto-sync on reconnect.
- **AI suggestion cards** — rule-based (mock) budget overrun, credit opportunity, early-payment, and progress-estimate suggestions embedded inline.
- **Responsive** — bottom tab bar on mobile (320px+), sidebar on desktop.

## Stack

React 18 · TypeScript (strict) · Tailwind CSS v3 · React Router v6 · Lucide icons · date-fns · Vite

## Run locally

```bash
npm install   # or: bun install
npm run dev   # http://localhost:5173
npm run build
npm run preview
```

## Deploy

One-click on Vercel: import the repo, framework preset "Vite", build `npm run build`, output `dist`. `vercel.json` handles SPA rewrites. The GitHub Action in `.github/workflows/deploy.yml` auto-deploys `main` when a `VERCEL_TOKEN` secret is configured.

## Data

Mock data only (no backend). All entities live in localStorage under `konstructify-state-v1`. Use "Reset demo data" in the sidebar to reseed.
