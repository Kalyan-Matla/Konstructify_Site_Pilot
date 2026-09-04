import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';

/** Money lives in ./money — it is integer paise, and that module owns every
 *  conversion. Re-exported here because `formatINR` is a formatter and this
 *  is where call sites already look for one. */
export { formatINR, rupees, paiseToRupees, lineEstimatePaise, parseRupeeInput } from './money';
export type { Paise } from './money';

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
