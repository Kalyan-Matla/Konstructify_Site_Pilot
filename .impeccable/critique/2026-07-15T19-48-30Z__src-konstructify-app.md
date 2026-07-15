---
target: src (Konstructify app)
total_score: 32
p0_count: 0
p1_count: 1
timestamp: 2026-07-15T19-48-30Z
slug: src-konstructify-app
---
⚠️ DEGRADED: single-context (sub-agent spawning restricted by harness policy — not explicitly requested by user)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Sync badges, online/offline, activity feed, alerts all strong; no explicit success toast on save (relies on modal close + activity feed) |
| 2 | Match System / Real World | 4 | Fluent domain language — BOQ, NEFT/RTGS, aging buckets, credit terms, ₹ Indian formatting |
| 3 | User Control and Freedom | 3 | Cancel/Esc/X on modals, confirm-before-delete, clearable filters; but no undo after a destructive delete |
| 4 | Consistency and Standards | 3 | Shared primitives after recent passes; but only Budgeting right-aligns numeric columns, and pop-in bounce diverges from the ease-out motion elsewhere |
| 5 | Error Prevention | 4 | Format validation, confirm dialogs, auto due-dates, and the proactive credit-exceeds warning with an alternative-vendor suggestion |
| 6 | Recognition Rather Than Recall | 4 | Icon+text nav, visible filters, teaching empty states; nothing icon-only |
| 7 | Flexibility and Efficiency | 2 | No keyboard shortcuts, no command palette, no global search, no bulk actions — caps daily-use throughput |
| 8 | Aesthetic and Minimalist Design | 4 | Cohesive warm-stone identity, clear hierarchy, no clutter or slop after the polish passes |
| 9 | Error Recovery | 3 | Clear, specific inline messages; but errors summarize at the form top rather than per-field, and focus isn't moved to the first invalid field |
| 10 | Help and Documentation | 2 | Empty states teach; otherwise no tooltips/contextual help for domain concepts (aging buckets, credit thresholds) |
| **Total** | | **32/40** | **Good — solid foundation; address weak areas (efficiency, help)** |

## Anti-Patterns Verdict

**Does this look AI-generated? — No.** After the emil + impeccable passes it reads art-directed: warm-stone editorial identity, hand-drawn SVG scenes, photography-driven landing, considered interaction states. No gradient text, no per-section eyebrows, side-stripes removed, cool-gray clashes gone.

**Deterministic scan (detect.mjs on `src`):** 1 finding — `bounce-easing` at `src/index.css:11` (`cubic-bezier(0.34, 1.56, 0.64, 1)`, the `--ease-spring` used by `.animate-pop-in` on modals + the account menu). Valid: overshoot bounce reads dated for a professional tool; both emil ("avoid bounce in most UI") and impeccable ("no bounce, no elastic — exponential ease-out") agree. This is also the one motion-personality inconsistency (everything else uses a clean ease-out). The detector is HTML/CSS-oriented, so it only meaningfully scanned index.css; TSX class usage wasn't deeply inspected.

**Visual overlay:** not injected — single-context run, no browser overlay produced. Findings are from source review + live inspection across Dashboard, Vendors, Credits, Payments, Budgeting, Reports, Landing, and Login this session.

## Overall Impression

This is a genuinely good product interface with a distinctive, cohesive identity — rare for a dashboard. The visual craft (typography, warm palette, data tables, empty states, motion) is now strong. The biggest remaining opportunity isn't visual at all: it's **power-user efficiency**. A contractor using this daily will feel the absence of keyboard shortcuts, search, and bulk actions before they notice any pixel. The single clear visual defect is the bounce easing on modals.

## What's Working

1. **Domain fluency (heuristic 2, 4★).** The language, units, and workflows are built for the actual user — NEFT/RTGS modes, credit aging buckets, BOQ variance, ₹ lakh/crore formatting. It speaks the trade.
2. **Proactive error prevention (heuristic 5, 4★).** The credit-exceeds warning that names an alternative vendor with available credit is a standout — it prevents a real cash-flow mistake before it happens, not after.
3. **Cohesive art-directed identity.** Warm-stone + bronze-gold, Calistoga display, tabular numerals, and the blueprint accent bands make it feel designed, not generated.

## Priority Issues

- **[P1] No power-user efficiency layer.** No keyboard shortcuts, no command palette, no global search, no bulk actions (e.g. multi-select invoices to pay). For a tool opened many times a day, every task is modal-by-modal clicking. *Why it matters:* caps throughput for the primary daily user; the Alex persona will feel patronized. *Fix:* add a command palette (⌘K) for New/navigate, a global search over vendors/invoices/projects, and bulk-pay on the Payments list. *Suggested command:* /impeccable shape (it's a feature, not a restyle).
- **[P2] Bounce easing on modals + menus.** `.animate-pop-in` overshoots (1.56). *Why it matters:* reads dated and is the one motion inconsistency against an otherwise clean ease-out system. *Fix:* swap the spring curve for an exponential ease-out (e.g. `cubic-bezier(0.22, 1, 0.36, 1)`) and keep the subtle scale/opacity entrance. *Suggested command:* /impeccable animate.
- **[P2] Table alignment inconsistency.** Only the Budgeting table right-aligns numeric columns; Dashboard vendor-health and Reports vendor-performance tables still left-align numbers. *Why it matters:* numbers don't scan vertically; breaks the consistency the rest of the app now has. *Fix:* apply the right-aligned tabular treatment to both remaining tables. *Suggested command:* /impeccable layout.
- **[P2] No contextual help for domain concepts.** Aging buckets, credit-health thresholds (>80% / >95%), and status meanings have no tooltips or inline explanation. *Why it matters:* a first-timer (Jordan) or a new site engineer must infer meaning. *Fix:* add tooltips/inline hints on the credit and aging UI; a one-line legend on the aging buckets. *Suggested command:* /impeccable clarify.
- **[P2] No undo after destructive delete; form errors not focus-managed.** Delete is confirm-then-permanent with no undo; form validation summarizes at the top without moving focus to the first invalid field. *Why it matters:* data-loss risk (Riley) and an accessibility gap (Sam). *Fix:* add an "Undo" affordance after delete; on submit error, move focus to and scroll to the first invalid field. *Suggested command:* /impeccable harden.

## Persona Red Flags

**Alex (Power User):** No ⌘K, no shortcuts for "New invoice/vendor/task," no global search, no bulk-select on the Payments list — every payment is open-modal-per-invoice. No way to pay three overdue bills in one action. High friction for the daily user.

**Sam (Accessibility):** Strong foundation — focus-visible rings, aria-labels on icon buttons, semantic tables, Esc-to-close, keyboard nav. Gaps: some muted labels sit near the 3:1 line (`text-ink/45` on ivory); on a form error, focus stays put instead of jumping to the invalid field; the offline/online toggle communicates state partly through color (mitigated by the text label).

**Casey (Mobile):** Strong — bottom dock in the thumb zone, state persists via localStorage across interruptions, 44px+ targets, works offline, camera photo capture. Minor: the primary "New X" action sits top-right (out of the thumb zone) rather than as a bottom FAB.

## Minor Observations

- Dashboard stacks a lot vertically (stats → up to 5 alerts → AI card → projects → vendor table → activity). Organized, but consider capping visible alerts to 3 with a "show N more."
- KPI-tile row ("big number, small label") flirts with the SaaS hero-metric template; it's acceptable as functional dashboard density, but don't let it spread to other surfaces.
- `text-ink/45` micro-labels are the most contrast-marginal element; nudging to `/55` would put them safely past 4.5:1.

## Questions to Consider

- What would a keyboard-first version of the daily "pay the overdue bills" flow look like — could it be a single ⌘K → "pay overdue" → confirm?
- Does the dashboard need to show everything at once, or would a calmer default (collapse the vendor table behind a tab) reduce the visual noise floor?
- Should destructive deletes be undoable rather than confirm-gated — is a 5-second "Undo" toast a better safety model than a confirm dialog?
