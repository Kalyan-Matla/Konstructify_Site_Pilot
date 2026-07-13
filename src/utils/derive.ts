import type { AppState, Invoice, Vendor } from '../types';
import { daysSince } from './format';

/** Credit used = every invoice not yet fully settled (unpaid + payment-sent). */
export function creditUsed(vendorId: string, invoices: Invoice[]): number {
  return invoices
    .filter((i) => i.vendorId === vendorId && i.status !== 'paid')
    .reduce((sum, i) => sum + i.amount, 0);
}

export function creditAvailable(vendor: Vendor, invoices: Invoice[]): number {
  return vendor.creditLimit - creditUsed(vendor.id, invoices);
}

export function creditUsagePercent(vendor: Vendor, invoices: Invoice[]): number {
  if (vendor.creditLimit <= 0) return 0;
  return creditUsed(vendor.id, invoices) / vendor.creditLimit;
}

export type CreditHealth = 'healthy' | 'warning' | 'high' | 'maxed';

export function creditHealth(vendor: Vendor, invoices: Invoice[]): CreditHealth {
  const pct = creditUsagePercent(vendor, invoices);
  if (pct > 0.95) return 'maxed';
  if (pct > 0.8) return 'high';
  if (pct > 0.5) return 'warning';
  return 'healthy';
}

export interface AgingBuckets {
  b0to30: number;
  b30to60: number;
  b60to90: number;
  b90plus: number;
}

/** Aging of outstanding (non-paid) invoices by invoice date. */
export function agingBuckets(vendorId: string, invoices: Invoice[]): AgingBuckets {
  const buckets: AgingBuckets = { b0to30: 0, b30to60: 0, b60to90: 0, b90plus: 0 };
  for (const i of invoices) {
    if (i.vendorId !== vendorId || i.status === 'paid') continue;
    const age = daysSince(i.invoiceDate);
    if (age < 30) buckets.b0to30 += i.amount;
    else if (age < 60) buckets.b30to60 += i.amount;
    else if (age < 90) buckets.b60to90 += i.amount;
    else buckets.b90plus += i.amount;
  }
  return buckets;
}

export function projectSpend(projectId: string, state: AppState): number {
  return state.budgetItems
    .filter((b) => b.projectId === projectId)
    .reduce((sum, b) => sum + b.actualSpend, 0);
}

export function projectEstimate(projectId: string, state: AppState): number {
  return state.budgetItems
    .filter((b) => b.projectId === projectId)
    .reduce((sum, b) => sum + b.quantity * b.unitRate, 0);
}

export function vendorHasOverdue(vendorId: string, invoices: Invoice[]): boolean {
  return invoices.some(
    (i) => i.vendorId === vendorId && i.status === 'unpaid' && daysSince(i.dueDate) > 0,
  );
}

export function totalPayablesDueWithin(days: number, invoices: Invoice[]): number {
  return invoices
    .filter((i) => i.status === 'unpaid')
    .filter((i) => {
      const until = -daysSince(i.dueDate);
      return until <= days;
    })
    .reduce((sum, i) => sum + i.amount, 0);
}
