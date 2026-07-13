import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { AICard, Badge, PageHeader, ProgressBar } from '../components/ui';
import { healthBadge } from './Vendors';
import {
  agingBuckets,
  creditAvailable,
  creditHealth,
  creditUsagePercent,
  creditUsed,
  vendorHasOverdue,
} from '../utils/derive';
import { suggestPayment, suggestVendor } from '../utils/ai-suggestions';
import { daysUntil, formatINR } from '../utils/format';

export default function Credits() {
  const { state } = useApp();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const totalLimit = state.vendors.reduce((s, v) => s + v.creditLimit, 0);
  const totalUsed = state.vendors.reduce((s, v) => s + creditUsed(v.id, state.invoices), 0);

  const paymentAI = suggestPayment(state.invoices, state.vendors);
  const vendorAIs = state.vendors
    .map((v) => suggestVendor(v, state.vendors, state.invoices))
    .filter((s): s is NonNullable<typeof s> => s !== null);
  const suggestions = [paymentAI, ...vendorAIs].filter(
    (s): s is NonNullable<typeof s> => s !== null && !dismissed.has(s.id),
  );

  return (
    <div>
      <PageHeader title="Vendor Credits" subtitle="Real-time credit exposure across all vendors" />

      <div className="mb-5 grid grid-cols-3 gap-3">
        <Summary label="Total credit limit" value={formatINR(totalLimit)} />
        <Summary label="Used" value={formatINR(totalUsed)} />
        <Summary label="Available" value={formatINR(totalLimit - totalUsed)} />
      </div>

      {suggestions.slice(0, 2).map((s) => (
        <AICard
          key={s.id}
          suggestion={s}
          onDismiss={() => setDismissed((d) => new Set(d).add(s.id))}
          onAction={() => navigate('/payments')}
        />
      ))}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {state.vendors.map((v) => {
          const used = creditUsed(v.id, state.invoices);
          const pct = creditUsagePercent(v, state.invoices) * 100;
          const aging = agingBuckets(v.id, state.invoices);
          const health = creditHealth(v, state.invoices);
          const overdue = vendorHasOverdue(v.id, state.invoices);
          const nextDue = state.invoices
            .filter((i) => i.vendorId === v.id && i.status === 'unpaid')
            .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
          return (
            <div key={v.id} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-gray-900">{v.name}</h3>
                  <p className="text-xs text-gray-500">{v.paymentTerms} terms</p>
                </div>
                {healthBadge(health, overdue)}
              </div>
              <div className="mt-3 flex justify-between text-sm">
                <span className="text-gray-600">
                  {formatINR(used)} used ({pct.toFixed(0)}%)
                </span>
                <span className="font-medium text-green-700">
                  {formatINR(creditAvailable(v, state.invoices))} free
                </span>
              </div>
              <div className="mt-1.5">
                <ProgressBar percent={pct} />
              </div>
              <div className="mt-3 grid grid-cols-4 gap-1 text-center text-xs">
                {[
                  ['<30d', aging.b0to30],
                  ['30–60d', aging.b30to60],
                  ['60–90d', aging.b60to90],
                  ['90d+', aging.b90plus],
                ].map(([label, amt]) => (
                  <div key={String(label)} className="rounded bg-gray-50 p-1.5">
                    <p className="text-gray-500">{label}</p>
                    <p className="font-semibold text-gray-900">{formatINR(Number(amt))}</p>
                  </div>
                ))}
              </div>
              {nextDue && (
                <p className="mt-2 text-xs text-gray-600">
                  Next due: {nextDue.invoiceNumber} ({formatINR(nextDue.amount)}){' '}
                  {daysUntil(nextDue.dueDate) < 0 ? (
                    <Badge tone="red">{-daysUntil(nextDue.dueDate)}d overdue</Badge>
                  ) : (
                    <Badge tone={daysUntil(nextDue.dueDate) <= 2 ? 'orange' : 'gray'}>
                      in {daysUntil(nextDue.dueDate)}d
                    </Badge>
                  )}
                </p>
              )}
              <button
                type="button"
                onClick={() => navigate('/payments')}
                className="mt-3 w-full rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Pay early to free credit
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-gray-900 sm:text-xl">{value}</p>
    </div>
  );
}
