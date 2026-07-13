import type { AISuggestion, AppState, BudgetItem, Invoice, Vendor, WorkTask } from '../types';
import { creditAvailable, creditUsagePercent } from './derive';
import { daysSince, daysUntil, formatINR } from './format';

/** Rule: BOQ line item variance > 10% of estimate → budget alert. */
export function suggestBudget(projectId: string, items: BudgetItem[]): AISuggestion | null {
  const overruns = items
    .filter((b) => b.projectId === projectId)
    .map((b) => ({ item: b, estimate: b.quantity * b.unitRate }))
    .filter(({ item, estimate }) => estimate > 0 && item.actualSpend - estimate > 0.1 * estimate);
  if (overruns.length === 0) return null;
  const { item, estimate } = overruns[0];
  const variance = item.actualSpend - estimate;
  const pct = ((variance / estimate) * 100).toFixed(0);
  return {
    id: `ai-budget-${item.id}`,
    title: 'Budget Alert',
    message: `${item.description} overrun: ${formatINR(variance)} over estimate (+${pct}%). If pace continues, predict ~${formatINR(variance * 2.5)} total overrun.`,
    suggestion: 'Negotiate rates with the current supplier, add a contingency buffer, or reduce scope on this line.',
    action: 'Review BOQ line',
  };
}

/** Rule: vendor credit > 90% used → suggest an alternative in the same category. */
export function suggestVendor(vendor: Vendor, allVendors: Vendor[], invoices: Invoice[]): AISuggestion | null {
  const usage = creditUsagePercent(vendor, invoices);
  if (usage <= 0.9) return null;
  const alternatives = allVendors.filter(
    (v) => v.id !== vendor.id && v.category === vendor.category && creditUsagePercent(v, invoices) < 0.5,
  );
  if (alternatives.length === 0) return null;
  const alt = alternatives[0];
  const available = creditAvailable(alt, invoices);
  return {
    id: `ai-vendor-${vendor.id}`,
    title: 'Credit Opportunity',
    message: `${vendor.name} credit is ${(usage * 100).toFixed(0)}% used.`,
    suggestion: `Try ${alt.name} for the next order — ${formatINR(available)} credit available, ${alt.ratingQuality.toFixed(1)}★ quality. Or pay ${vendor.name} early to free credit.`,
    action: 'View alternative',
  };
}

/** Rule: unpaid invoice due within 3 days → suggest early payment. */
export function suggestPayment(invoices: Invoice[], vendors: Vendor[]): AISuggestion | null {
  const soon = invoices.find((i) => {
    if (i.status !== 'unpaid') return false;
    const d = daysUntil(i.dueDate);
    return d >= 0 && d < 3;
  });
  if (!soon) return null;
  const vendor = vendors.find((v) => v.id === soon.vendorId);
  if (!vendor) return null;
  const d = daysUntil(soon.dueDate);
  return {
    id: `ai-payment-${soon.id}`,
    title: 'Payment Opportunity',
    message: `${vendor.name} invoice ${soon.invoiceNumber} (${formatINR(soon.amount)}) is due ${d === 0 ? 'today' : `in ${d} day${d === 1 ? '' : 's'}`}.`,
    suggestion: `Pay ${formatINR(soon.amount)} now via NEFT to free up ${formatINR(soon.amount)} of ${vendor.name}'s credit.`,
    action: 'Schedule payment',
  };
}

/** Rule: photo count drives a mock completion estimate and delay prediction. */
export function suggestWorkStatus(task: WorkTask): AISuggestion | null {
  const photoCount = task.photos.length;
  if (photoCount === 0 || task.status === 'complete') return null;
  const estimatedPercent = Math.min(photoCount * 10, 90);
  const daysUsed = Math.max(daysSince(task.createdAt), 1);
  const totalDaysAtPace = Math.ceil(daysUsed / (estimatedPercent / 100));
  const plannedDays = daysUsed + Math.max(daysUntil(task.dueDate), 0);
  const delay = totalDaysAtPace - plannedDays;
  return {
    id: `ai-task-${task.id}`,
    title: 'Progress Estimate',
    message: `Based on ${photoCount} photo${photoCount === 1 ? '' : 's'} over ${daysUsed} day${daysUsed === 1 ? '' : 's'}, this task is ~${estimatedPercent}% complete.`,
    suggestion: delay > 0 ? `Predicted delay: ~${delay} day${delay === 1 ? '' : 's'} at current pace.` : 'On track at current pace ✓',
    action: 'View timeline',
  };
}

/** Dashboard-level: pick the most urgent suggestion across the app. */
export function suggestDashboard(state: AppState): AISuggestion | null {
  for (const v of state.vendors) {
    const s = suggestVendor(v, state.vendors, state.invoices);
    if (s) return s;
  }
  const pay = suggestPayment(state.invoices, state.vendors);
  if (pay) return pay;
  for (const p of state.projects) {
    const s = suggestBudget(p.id, state.budgetItems);
    if (s) return s;
  }
  return null;
}
