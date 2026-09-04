import type { Drawing, Zone } from '../types';

/**
 * Turning a zone outline back into a measurement someone can use on site.
 *
 * Outlines are stored as fractions of the sheet so they survive a drawing
 * being re-exported at another resolution. A fraction cannot answer "how
 * big is this room", though — and that is the question anyone on site is
 * actually asking.
 *
 * UNITS. Lengths are stored in millimetres and converted to feet and inches
 * only for display, the same way money is stored in paise and formatted at
 * the edge. Storing feet-and-inches would mean carrying a whole number and
 * a fraction through every calculation, and rounding each time. One
 * canonical unit, converted once, at the boundary.
 *
 * Feet and inches is what the site speaks: masons, owners and contractors
 * in India set work out in feet, and property is sold in square feet. The
 * statutory thresholds are a different matter — TS-bPASS defines its tiers
 * in square metres and square yards, so `resolveTier` stays metric. A
 * project's approval route must never turn on a rounding conversion.
 */

const MM_PER_INCH = 25.4;
const MM_PER_FOOT = 304.8;

export interface ZoneMeasurement {
  /** Canonical, unrounded — the basis for every conversion below. */
  widthMm: number;
  heightMm: number;
  widthLabel: string;
  heightLabel: string;
  areaSqft: number;
}

/**
 * Millimetres as feet and inches: `25'-0"`, `13'-9"`.
 *
 * Rounded to the nearest inch. Sub-inch precision would be false here — it
 * would be reporting a fraction the drawing was never dimensioned to, and
 * nobody sets out a wall to a sixteenth from a screen.
 */
export function formatFeetInches(mm: number): string {
  const totalInches = Math.round(mm / MM_PER_INCH);
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  return `${feet}'-${inches}"`;
}

/**
 * Returns null when the drawing carries no scale.
 *
 * That refusal is deliberate. A made-up measurement on a construction
 * drawing reads as authoritative and somebody orders material against it.
 */
export function measureZone(zone: Zone, drawing: Drawing): ZoneMeasurement | null {
  if (!zone.outline || zone.outline.length < 3) return null;
  if (drawing.sheetWidthMm === null || drawing.sheetHeightMm === null) return null;

  const xs = zone.outline.map((p) => p.x);
  const ys = zone.outline.map((p) => p.y);
  const widthMm = (Math.max(...xs) - Math.min(...xs)) * drawing.sheetWidthMm;
  const heightMm = (Math.max(...ys) - Math.min(...ys)) * drawing.sheetHeightMm;

  return {
    widthMm,
    heightMm,
    widthLabel: formatFeetInches(widthMm),
    heightLabel: formatFeetInches(heightMm),
    // Area from the bounding box: exact for the rectangles the zone tool
    // draws, an over-estimate for any other shape. Whole square feet,
    // because that is the unit Indian property is quoted and sold in.
    areaSqft: Math.round((widthMm / MM_PER_FOOT) * (heightMm / MM_PER_FOOT)),
  };
}

/** e.g. `25'-0" × 19'-0" · 475 sq ft` — null when the sheet has no scale. */
export function formatZoneMeasurement(m: ZoneMeasurement | null): string | null {
  if (!m) return null;
  return `${m.widthLabel} × ${m.heightLabel} · ${m.areaSqft} sq ft`;
}
