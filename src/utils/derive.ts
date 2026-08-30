import type { AppState, Invoice, Vendor } from '../types';
import { daysSince } from './format';
import { lineEstimatePaise } from './money';

/** Credit used = every invoice not yet fully settled (unpaid + payment-sent). */
export function creditUsed(vendorId: string, invoices: Invoice[]): number {
  return invoices
    .filter((i) => i.vendorId === vendorId && i.status !== 'paid')
    .reduce((sum, i) => sum + i.amountPaise, 0);
}

export function creditAvailable(vendor: Vendor, invoices: Invoice[]): number {
  return vendor.creditLimitPaise - creditUsed(vendor.id, invoices);
}

export function creditUsagePercent(vendor: Vendor, invoices: Invoice[]): number {
  if (vendor.creditLimitPaise <= 0) return 0;
  return creditUsed(vendor.id, invoices) / vendor.creditLimitPaise;
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
    if (age < 30) buckets.b0to30 += i.amountPaise;
    else if (age < 60) buckets.b30to60 += i.amountPaise;
    else if (age < 90) buckets.b60to90 += i.amountPaise;
    else buckets.b90plus += i.amountPaise;
  }
  return buckets;
}

export function projectSpend(projectId: string, state: AppState): number {
  return state.budgetItems
    .filter((b) => b.projectId === projectId)
    .reduce((sum, b) => sum + b.actualSpendPaise, 0);
}

export function projectEstimate(projectId: string, state: AppState): number {
  return state.budgetItems
    .filter((b) => b.projectId === projectId)
    .reduce((sum, b) => sum + lineEstimatePaise(b.quantity, b.unitRatePaise), 0);
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
    .reduce((sum, i) => sum + i.amountPaise, 0);
}

// ─────────────────────────────────────────────────────────────────────
// Progress
// ─────────────────────────────────────────────────────────────────────

export interface ProjectProgress {
  /** 0–100, weighted by BOQ line value. */
  percentComplete: number;
  /** BOQ value that actually carried the calculation. */
  weightedValuePaise: number;
  /** Tasks with no BOQ line. Excluded from the number and reported, never
   *  folded in silently — an invisible exclusion is how a project reads 80%
   *  complete while the expensive half hasn't started. */
  unlinkedTaskCount: number;
}

/**
 * Physical progress weighted by BOQ value, not a flat average of task
 * percentages.
 *
 * A flat average lets eight cheap tasks finishing outweigh two expensive
 * ones that haven't started. Weighting by the value of the line each task
 * delivers is how the trade separates physical progress from financial
 * progress, and it is what a client is actually asking when they ask how
 * far along the build is.
 *
 * A BOQ line with no tasks counts as 0% at its full weight — an unstarted
 * line should drag the number down, because it has not been built.
 */
export function projectProgress(projectId: string, state: AppState): ProjectProgress {
  const lines = state.budgetItems.filter((b) => b.projectId === projectId);
  const tasks = state.tasks.filter((t) => t.projectId === projectId);

  let weightedSum = 0;
  let totalValue = 0;

  for (const line of lines) {
    const value = lineEstimatePaise(line.quantity, line.unitRatePaise);
    if (value <= 0) continue;
    const lineTasks = tasks.filter((t) => t.budgetItemId === line.id);
    const linePct = lineTasks.length
      ? lineTasks.reduce((s, t) => s + t.percentComplete, 0) / lineTasks.length
      : 0;
    weightedSum += value * linePct;
    totalValue += value;
  }

  return {
    percentComplete: totalValue > 0 ? weightedSum / totalValue : 0,
    weightedValuePaise: totalValue,
    unlinkedTaskCount: tasks.filter((t) => t.budgetItemId === null).length,
  };
}

// ─────────────────────────────────────────────────────────────────────
// Zones
// ─────────────────────────────────────────────────────────────────────

export type ZoneStatus = 'not-started' | 'in-progress' | 'complete';

export interface ZoneProgress {
  percentComplete: number;
  status: ZoneStatus;
  /** How many tasks fed this figure, at any depth below the zone. */
  taskCount: number;
}

/**
 * A zone's progress, rolled UP from the tasks beneath it.
 *
 * An element takes its percentage from the tasks that build it; a room from
 * its elements; a floor from its rooms. Nothing is stored — the colour on a
 * drawing is always a projection of task state, so the two can never drift
 * apart and show a room as finished when its work is not.
 */
export function zoneProgress(zoneId: string, state: AppState): ZoneProgress {
  const children = state.zones.filter((z) => z.parentId === zoneId);
  const ownTasks = state.tasks.filter((t) => t.zoneId === zoneId);

  const parts: Array<{ percent: number; count: number }> = [
    ...ownTasks.map((t) => ({ percent: t.percentComplete, count: 1 })),
    ...children.map((c) => {
      const p = zoneProgress(c.id, state);
      return { percent: p.percentComplete, count: p.taskCount };
    }),
  ].filter((p) => p.count > 0);

  const taskCount = parts.reduce((s, p) => s + p.count, 0);
  if (taskCount === 0) return { percentComplete: 0, status: 'not-started', taskCount: 0 };

  // Weight each contribution by how many tasks sit under it, so a room with
  // ten elements is not outvoted by a sibling with one.
  const percent = parts.reduce((s, p) => s + p.percent * p.count, 0) / taskCount;
  const status: ZoneStatus = percent >= 100 ? 'complete' : percent > 0 ? 'in-progress' : 'not-started';
  return { percentComplete: percent, status, taskCount };
}

/** Palette for the coloured drawing overlay (Block D). Semantic, and kept
 *  separate from the brand accent so status never reads as decoration. */
export const ZONE_STATUS_COLOR: Record<ZoneStatus, string> = {
  'not-started': '#A8A29E',
  'in-progress': '#D97706',
  complete: '#046C50',
};
