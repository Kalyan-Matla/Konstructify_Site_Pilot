---
target: src (Konstructify app)
total_score: 35
p0_count: 0
p1_count: 1
timestamp: 2026-07-16T08-55-33Z
slug: src-konstructify-app
---
⚠️ DEGRADED: single-context (sub-agent spawning restricted by harness policy — not explicitly requested by user)

Re-run after critique batches 1 and 2. Previous run: 32/40.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Sync badges, online/offline, activity feed strong; still no explicit success toast on save |
| 2 | Match System / Real World | 4 | Fluent trade language — BOQ, NEFT/RTGS, aging buckets, ₹ lakh/crore |
| 3 | User Control and Freedom | 3 | Cancel/Esc/confirm-delete; still no undo after a destructive delete |
| 4 | Consistency and Standards | 4 | ▲ All three tables now share the right-aligned tabular treatment; motion personality unified on ease-out; error styling standardized via FormError |
| 5 | Error Prevention | 4 | Format validation, confirm dialogs, auto due-dates, proactive credit-exceeds warning |
| 6 | Recognition Rather Than Recall | 4 | Icon+text nav, visible filters, teaching empty states |
| 7 | Flexibility and Efficiency | 2 | Unchanged — no keyboard shortcuts, command palette, global search, or bulk actions |
| 8 | Aesthetic and Minimalist Design | 4 | Cohesive identity; no slop, detector clean |
| 9 | Error Recovery | 4 | ▲ FormError now announces via role="alert" AND takes focus on failed submit; messages name the specific problem |
| 10 | Help and Documentation | 3 | ▲ Inline aging/threshold legend + health-badge tooltips; still no global help or command discoverability |
| **Total** | | **35/40** | **Good — top of band; the remaining gap is the efficiency layer** |

## Anti-Patterns Verdict

**Does this look AI-generated? — No.** Unchanged verdict, now with cleaner evidence.

**Deterministic scan (detect.mjs on `src`):** **0 findings, exit 0 — clean.** The prior `bounce-easing` hit at index.css:11 is resolved (pop-in is now exponential ease-out). Grep spot-checks confirm zero `border-l-2/4` side-stripes and zero marginal `text-ink/45` labels remain.

**Visual overlay:** not injected — single-context run. Findings from source review + live browser inspection.

## Overall Impression

Three points up, and the gains are structural rather than cosmetic: consistency (4), error recovery (4), and help (3) all improved because the fixes were systemic — a shared FormError component, one table treatment applied everywhere, one motion curve. The interface is now at the top of the "Good" band. The single remaining lever is Flexibility & Efficiency (2/4): everything else is polish, but this is the one a daily contractor would actually feel.

## What's Working

1. **Systemic fixes over patches.** FormError, EmptyState, Badge titles, and the table treatment are shared primitives — the score moved because the vocabulary got more consistent, not because individual screens got prettier.
2. **Error recovery is now genuinely good (4★).** A failed submit announces to a screen reader and moves focus to the message. Verified live: `focusIsAlert: true`.
3. **The domain teaches itself.** The aging legend and threshold tooltips mean a new site engineer can read the credit page without a manual.

## Priority Issues

- **[P1] No power-user efficiency layer.** Still the top issue and now the sole score-limiter. No ⌘K, no global search, no bulk-select/bulk-pay. Every invoice is open-modal-per-item. *Why it matters:* the primary daily user (Alex) pays several bills at once; the UI forces serial modals. *Fix:* command palette for New/navigate, global search across vendors/invoices/projects, multi-select + bulk pay on Payments. *Suggested command:* /impeccable shape (feature work, not restyle).
- **[P2] No undo after destructive delete.** Delete is confirm-then-permanent. *Why it matters:* data-loss risk with no recovery (Riley). *Fix:* an undo affordance after delete; would also need a lightweight toast system, which the app currently lacks. *Suggested command:* /impeccable harden.
- **[P2] No success confirmation on save.** Saves close the modal and append to the activity feed, but there's no direct confirmation. *Why it matters:* the user infers success rather than being told. *Fix:* reuse the same toast system as undo. *Suggested command:* /impeccable harden.
- **[P3] Dashboard verticality.** Stats → up to 5 alerts → AI card → projects → vendor table → activity is a long column. *Fix:* cap alerts at 3 with "show N more". *Suggested command:* /impeccable layout.
- **[P3] Mock-data artifact.** Vendor performance shows "Paid on time: 0%" for every vendor, because seeded paid invoices carry a payment date later than their due date. Cosmetically undermines an otherwise premium report. *Fix:* seed realistic payment dates. Not a design defect.

## Persona Red Flags

**Alex (Power User):** Unchanged and now the dominant gap — no ⌘K, no shortcuts for "New invoice", no bulk-select on Payments, no global search. Cannot clear three overdue bills in one action.

**Sam (Accessibility):** Materially improved. Focus now moves to the error on failed submit; label contrast cleared to ~4.5:1; focus-visible rings are keyboard-only. Remaining: per-field (not just summary) error association would be the next step.

**Casey (Mobile):** Unchanged and strong — bottom dock, state persistence, 44px+ targets, offline. Minor: primary "New X" still top-right rather than a thumb-zone FAB.

## Minor Observations

- The health-badge tooltips use the native `title` attribute — functional and clip-safe, but not styled; a custom tooltip would be more premium if it can escape overflow containers.
- Aging legend is desktop-optimized; the threshold dot row hides under `sm`.

## Questions to Consider

- Is the daily job "pay the overdue bills"? If so, should the dashboard's overdue alerts each carry an inline Pay action, collapsing a 4-click journey to 1?
- Would a toast system (undo + save confirmation) close two P2s at once for one piece of infrastructure?
- Does the vendor table belong on the dashboard at all, or is it a Credits-page concern that's padding the scroll?
