import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';

/** Format rupees using Indian units: ₹8.5L, ₹1.2Cr, ₹12,500 */
export function formatINR(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (abs >= 1_00_00_000) return `${sign}₹${(abs / 1_00_00_000).toFixed(2).replace(/\.?0+$/, '')}Cr`;
  if (abs >= 1_00_000) return `${sign}₹${(abs / 1_00_000).toFixed(2).replace(/\.?0+$/, '')}L`;
  return `${sign}₹${abs.toLocaleString('en-IN')}`;
}

export function formatDate(iso: string): string {
  return format(parseISO(iso), 'd MMM yyyy');
}

export function daysUntil(iso: string): number {
  return differenceInCalendarDays(parseISO(iso), new Date());
}

export function daysSince(iso: string): number {
  return differenceInCalendarDays(new Date(), parseISO(iso));
}

/** Local-timezone yyyy-MM-dd — never via toISOString, which shifts the day in non-UTC zones. */
export function isoDaysFromNow(days: number): string {
  return format(addDays(new Date(), days), 'yyyy-MM-dd');
}

export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

let counter = 0;
export function uid(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}
