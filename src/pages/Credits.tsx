import { useState } from 'react';
import { Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { AICard, Badge, PageHeader, Ring } from '../components/ui';
import { useCountUp } from '../hooks/useFx';
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
  // Deliberately account-level, not project-scoped: a vendor's credit limit
  // and exposure are properties of the vendor relationship, and splitting
  // them by project would show a number that is simply false. The route is
  // gated on credits:view, which only account-wide money roles hold.
  const { state } = useApp();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const totalLimit = state.vendors.reduce((s, v) => s + v.creditLimitPaise, 0);
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

      {/* Exposure summary — dark hero band */}
      <div className="blueprint relative mb-6 animate-fade-up overflow-hidden rounded-3xl p-5 text-white shadow-lift sm:p-7">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-amber-glow/15 blur-3xl"
        />
        <div className="relative grid grid-cols-3 gap-4">
          <Summary label="Total credit limit" value={totalLimit} />
          <Summary label="Used" value={totalUsed} accent />
          <Summary label="Available" value={totalLimit - totalUsed} positive />
        </div>
        <div className="relative mt-5 h-2.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="fill-animate h-full rounded-full bg-gradient-to-r from-amber-glow to-orange-500"
            style={{ width: `${Math.min((totalUsed / Math.max(totalLimit, 1)) * 100, 100)}%` }}
          />
        </div>
        <p className="relative mt-2 text-xs font-semibold uppercase tracking-wider text-white/55">
          {((totalUsed / Math.max(totalLimit, 1)) * 100).toFixed(0)}% of the network drawn
        </p>
      </div>

      {/* Inline legend — teaches the aging buckets + health thresholds */}
      <div className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-ink/10 bg-white/60 px-4 py-2.5 text-xs text-ink/60">
        <span className="flex items-center gap-1.5">
          <Info size={13} className="text-ink/40" aria-hidden="true" />
          <span className="font-semibold text-ink/75">Aging = days since each unpaid invoice</span>
        </span>
        <span>&lt;30d / 30–60d / 60–90d / 90d+ outstanding</span>
        <span className="hidden items-center gap-1.5 sm:flex">
          <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden="true" /> &gt;50% used
          <span className="ml-2 h-2 w-2 rounded-full bg-orange-500" aria-hidden="true" /> &gt;80%
          <span className="ml-2 h-2 w-2 rounded-full bg-red-500" aria-hidden="true" /> &gt;95% maxed
        </span>
      </div>

      {suggestions.slice(0, 2).map((s) => (
        <AICard
          key={s.id}
          suggestion={s}
          onDismiss={() => setDismissed((d) => new Set(d).add(s.id))}
          onAction={() => navigate('/payments')}
        />
      ))}

      <div className="stagger grid grid-cols-1 gap-3 lg:grid-cols-2">
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
            <div key={v.id} className="panel panel-hover p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-4">
                  <Ring percent={pct} label={`${pct.toFixed(0)}%`} sublabel="used" />
                  <div>
                    <h3 className="font-display text-lg text-ink">{v.name}</h3>
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink/60">
                      {v.paymentTerms} terms
                    </p>
                    <p className="num mt-1.5 text-sm text-ink/70">
                      {formatINR(used)} used ·{' '}
                      <span className="font-bold text-emerald-700">
                        {formatINR(creditAvailable(v, state.invoices))} free
                      </span>
                    </p>
                  </div>
                </div>
                {healthBadge(health, overdue)}
              </div>
              <div className="mt-4 grid grid-cols-4 gap-1.5 text-center text-xs">
                {[
                  ['<30d', aging.b0to30],
                  ['30–60d', aging.b30to60],
                  ['60–90d', aging.b60to90],
                  ['90d+', aging.b90plus],
                ].map(([label, amt]) => (
                  <div key={String(label)} className="rounded-xl bg-ink/[0.04] p-2">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-ink/40">{label}</p>
                    <p className="num font-bold text-ink">{formatINR(Number(amt))}</p>
                  </div>
                ))}
              </div>
              {nextDue && (
                <p className="mt-3 flex items-center gap-2 text-xs text-ink/60">
                  Next due: <span className="num font-bold text-ink">{nextDue.invoiceNumber} ({formatINR(nextDue.amountPaise)})</span>
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
                className="btn-ghost mt-4 w-full font-bold text-amber-700 hover:border-amber-500/50 hover:bg-amber-50"
              >
                Pay early to free credit →
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Summary({
  label,
  value,
  accent,
  positive,
}: {
  label: string;
  value: number;
  accent?: boolean;
  positive?: boolean;
}) {
  const animated = useCountUp(value);
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-white/55 sm:text-[11px]">{label}</p>
      <p
        className={`num mt-1 text-xl font-bold sm:text-3xl ${
          accent ? 'text-amber-glow' : positive ? 'text-emerald-400' : 'text-white'
        }`}
      >
        {formatINR(Math.round(animated))}
      </p>
    </div>
  );
}
