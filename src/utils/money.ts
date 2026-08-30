/**
 * Money is integer paise. Never floating point, anywhere (AD-06).
 *
 * Retention at 5%, GST TDS at 2%, income-tax TDS at 1–2% and BOCW cess at 1%
 * all compound across successive running-account bills. In float, the drift
 * those percentages accumulate becomes a reconciliation dispute with a
 * government department — the kind that is argued with a Measurement Book,
 * not a changelog. Integers make the arithmetic exact.
 *
 * The unit is carried in the NAME, not in a comment: every stored field is
 * `somethingPaise`, and every helper here converts at a boundary. A bare
 * `amount: number` is a landmine, because nothing at the call site says
 * which unit it holds.
 *
 * `Paise` is a documentation alias rather than a branded type. Branding was
 * considered and rejected: it forces a cast on every `reduce` and every sum,
 * which buys type-level purity at the cost of noise in the places money is
 * most often handled. The naming convention plus rounding at the boundaries
 * is the proportionate control at this stage.
 */

/** An integer count of paise. 100 paise = ₹1. */
export type Paise = number;

/** Rupees → paise, at an input boundary (forms, seed data).
 *
 *  Rounds because the multiply itself is floating point: `19.99 * 100` is
 *  1998.9999999999998, and truncating there would quietly lose a paisa on
 *  a huge share of real inputs. */
export function rupees(amount: number): Paise {
  return Math.round(amount * 100);
}

/** Paise → rupees, for DISPLAY or for an input field's value only.
 *  Never store or accumulate the result — it is a float again. */
export function paiseToRupees(p: Paise): number {
  return p / 100;
}

/** A BOQ line's estimate. Quantity is a measured decimal (200.5 m³), so the
 *  product needs rounding back to whole paise rather than carrying a
 *  fraction of a paisa into every downstream total. */
export function lineEstimatePaise(quantity: number, unitRatePaise: Paise): Paise {
  return Math.round(quantity * unitRatePaise);
}

/** Parse a user-typed rupee amount into paise.
 *  Returns null for anything that is not a finite, non-negative number, so
 *  callers can show a validation message rather than storing NaN. */
export function parseRupeeInput(text: string): Paise | null {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return null;
  return rupees(n);
}

/**
 * Format paise using Indian units: ₹8.5L, ₹1.2Cr, ₹12,500.
 *
 * Sub-rupee precision is shown only when it exists, so ordinary whole-rupee
 * amounts stay clean while a figure carrying real paise is never silently
 * rounded away on screen.
 */
export function formatINR(p: Paise): string {
  const abs = Math.abs(p);
  const sign = p < 0 ? '-' : '';
  if (abs >= 1_00_00_000_00) {
    return `${sign}₹${(abs / 1_00_00_000_00).toFixed(2).replace(/\.?0+$/, '')}Cr`;
  }
  if (abs >= 1_00_000_00) {
    return `${sign}₹${(abs / 1_00_000_00).toFixed(2).replace(/\.?0+$/, '')}L`;
  }
  const wholeRupees = Math.floor(abs / 100);
  const remainder = abs % 100;
  const base = wholeRupees.toLocaleString('en-IN');
  return remainder === 0
    ? `${sign}₹${base}`
    : `${sign}₹${base}.${String(remainder).padStart(2, '0')}`;
}
