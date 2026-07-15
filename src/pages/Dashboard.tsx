import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowUpRight, X } from 'lucide-react';
import clsx from 'clsx';
import { useApp } from '../contexts/AppContext';
import { AICard, Badge, PageHeader, ProgressBar } from '../components/ui';
import { useCountUp, useTilt } from '../hooks/useFx';
import { suggestDashboard } from '../utils/ai-suggestions';
import {
  agingBuckets,
  creditHealth,
  creditUsagePercent,
  creditUsed,
  projectSpend,
  totalPayablesDueWithin,
  vendorHasOverdue,
} from '../utils/derive';
import { daysSince, daysUntil, formatINR } from '../utils/format';

const CASH_ON_HAND = 20_00_000; // mock treasury balance

interface Alert {
  id: string;
  tone: 'red' | 'orange' | 'yellow';
  message: string;
}

export default function Dashboard() {
  const { state, pendingCount, isSyncing } = useApp();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [aiDismissed, setAiDismissed] = useState(false);

  const payables30 = totalPayablesDueWithin(30, state.invoices);
  const payables7 = totalPayablesDueWithin(7, state.invoices);
  const overrunProjects = state.projects.filter(
    (p) => projectSpend(p.id, state) > p.budget,
  ).length;
  const activeProjects = state.projects.filter((p) => p.status === 'in-progress').length;

  const alerts = useMemo<Alert[]>(() => {
    const out: Alert[] = [];
    for (const i of state.invoices) {
      if (i.status === 'unpaid' && daysSince(i.dueDate) > 0) {
        const v = state.vendors.find((x) => x.id === i.vendorId);
        out.push({
          id: `overdue-${i.id}`,
          tone: 'red',
          message: `Invoice ${i.invoiceNumber} (${v?.name ?? 'vendor'}, ${formatINR(i.amount)}) is ${daysSince(i.dueDate)} days overdue`,
        });
      }
    }
    for (const v of state.vendors) {
      const health = creditHealth(v, state.invoices);
      if (health === 'maxed' || health === 'high') {
        out.push({
          id: `credit-${v.id}`,
          tone: health === 'maxed' ? 'red' : 'orange',
          message: `${v.name} credit ${(creditUsagePercent(v, state.invoices) * 100).toFixed(0)}% used${health === 'maxed' ? ' — MAXED OUT' : ''}`,
        });
      }
    }
    for (const i of state.invoices) {
      const d = daysUntil(i.dueDate);
      if (i.status === 'unpaid' && d >= 0 && d <= 2) {
        const v = state.vendors.find((x) => x.id === i.vendorId);
        out.push({
          id: `due-${i.id}`,
          tone: 'orange',
          message: `Payment of ${formatINR(i.amount)} to ${v?.name ?? 'vendor'} due ${d === 0 ? 'today' : `in ${d} day${d === 1 ? '' : 's'}`}`,
        });
      }
    }
    if (pendingCount > 0) {
      out.push({ id: 'sync', tone: 'yellow', message: `${pendingCount} change${pendingCount === 1 ? '' : 's'} waiting to sync` });
    }
    return out.filter((a) => !dismissed.has(a.id)).slice(0, 5);
  }, [state, pendingCount, dismissed]);

  const ai = useMemo(() => suggestDashboard(state), [state]);

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Every site, every rupee — one ledger" />

      {/* Quick stats — 3D tilt cards with counting numerals */}
      <div className="stagger mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Active projects"
          rupees={null}
          plain={String(activeProjects)}
          sub={overrunProjects > 0 ? `${overrunProjects} over budget` : 'all on budget'}
          subTone={overrunProjects > 0 ? 'text-red-600' : 'text-emerald-700'}
        />
        <StatCard
          label="Payables <30 days"
          rupees={payables30}
          sub={`${formatINR(payables7)} due this week`}
          subTone="text-orange-600"
        />
        <StatCard
          label="Available cash"
          rupees={Math.max(CASH_ON_HAND - payables7, 0)}
          sub="after this week's dues"
          subTone="text-ink/50"
        />
        <StatCard
          label="Sync status"
          rupees={null}
          plain={isSyncing ? 'Syncing…' : pendingCount > 0 ? `${pendingCount} pending` : 'Synced ✓'}
          sub={pendingCount > 0 ? 'will sync when online' : 'all changes saved'}
          subTone="text-ink/50"
        />
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="stagger mb-6 space-y-2" aria-label="Alerts">
          {alerts.map((a) => (
            <div
              key={a.id}
              className={clsx(
                'flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2.5 text-sm shadow-raise ring-1 ring-inset',
                a.tone === 'red' && 'ring-red-600/15',
                a.tone === 'orange' && 'ring-orange-500/20',
                a.tone === 'yellow' && 'ring-amber-500/25',
              )}
            >
              <span className="flex items-center gap-2.5 font-medium text-ink">
                <span
                  className={clsx(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-lg',
                    a.tone === 'red' && 'bg-red-100 text-red-600',
                    a.tone === 'orange' && 'bg-orange-100 text-orange-600',
                    a.tone === 'yellow' && 'bg-amber-100 text-amber-700',
                  )}
                >
                  <AlertTriangle size={14} aria-hidden="true" />
                </span>
                {a.message}
              </span>
              <button
                type="button"
                aria-label={`Dismiss alert: ${a.message}`}
                onClick={() => setDismissed((s) => new Set(s).add(a.id))}
                className="cursor-pointer rounded-full p-1 text-ink/40 transition-colors hover:bg-ink/5 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                <X size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      {ai && !aiDismissed && (
        <AICard suggestion={ai} onDismiss={() => setAiDismissed(true)} onAction={() => navigate('/credits')} />
      )}

      {/* Project cards */}
      <SectionTitle title="Projects" to="/projects" />
      <div className="stagger mb-8 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {state.projects.map((p) => {
          const spent = projectSpend(p.id, state);
          const pct = p.budget > 0 ? (spent / p.budget) * 100 : 0;
          const over = spent > p.budget;
          const remaining = daysUntil(p.endDate);
          return (
            <Link
              key={p.id}
              to="/projects"
              className="panel panel-hover group block cursor-pointer p-5 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-display text-lg leading-snug text-ink group-hover:text-amber-700">
                  {p.name}
                </h3>
                <Badge tone={p.status === 'in-progress' ? (over ? 'red' : 'green') : p.status === 'on-hold' ? 'yellow' : 'blue'}>
                  {over ? 'overrun' : p.status}
                </Badge>
              </div>
              <p className="num mt-2 text-sm text-ink/60">
                {formatINR(spent)} <span className="text-ink/35">of</span> {formatINR(p.budget)}
              </p>
              <div className="mt-2.5">
                <ProgressBar percent={pct} />
              </div>
              <p className="mt-2.5 text-xs font-semibold uppercase tracking-wide text-ink/40">
                {remaining >= 0 ? `${remaining} days remaining` : `${-remaining} days past end date`}
              </p>
            </Link>
          );
        })}
      </div>

      {/* Vendor health */}
      <SectionTitle title="Vendor health" to="/credits" />
      <div className="panel mb-8 animate-fade-up overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-ink/10 text-left text-[11px] font-bold uppercase tracking-wider text-ink/45">
              <th scope="col" className="px-4 py-3">Vendor</th>
              <th scope="col" className="px-4 py-3">Category</th>
              <th scope="col" className="px-4 py-3">Credit used</th>
              <th scope="col" className="px-4 py-3">&lt;30d</th>
              <th scope="col" className="px-4 py-3">30–60d</th>
              <th scope="col" className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {state.vendors.map((v) => {
              const used = creditUsed(v.id, state.invoices);
              const aging = agingBuckets(v.id, state.invoices);
              const health = creditHealth(v, state.invoices);
              const overdue = vendorHasOverdue(v.id, state.invoices);
              return (
                <tr key={v.id} className="border-b border-ink/5 transition-colors last:border-0 hover:bg-paper-soft">
                  <td className="px-4 py-3 font-semibold text-ink">
                    <Link to="/vendors" className="cursor-pointer hover:text-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500">
                      {v.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 capitalize text-ink/55">{v.category}</td>
                  <td className="num px-4 py-3 text-ink">
                    {formatINR(used)} / {formatINR(v.creditLimit)}
                  </td>
                  <td className="num px-4 py-3 text-ink/55">{formatINR(aging.b0to30)}</td>
                  <td className="num px-4 py-3 text-ink/55">{formatINR(aging.b30to60)}</td>
                  <td className="px-4 py-3">
                    {overdue ? (
                      <Badge tone="red">overdue</Badge>
                    ) : health === 'maxed' ? (
                      <Badge tone="red">maxed</Badge>
                    ) : health === 'high' ? (
                      <Badge tone="orange">&gt;80% used</Badge>
                    ) : health === 'warning' ? (
                      <Badge tone="yellow">&gt;50% used</Badge>
                    ) : (
                      <Badge tone="green">healthy</Badge>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Recent activity */}
      <SectionTitle title="Recent activity" />
      <ul className="panel stagger animate-fade-up space-y-2.5 p-5 text-sm text-ink/75">
        {state.activity.slice(0, 5).map((a) => (
          <li key={a.id} className="flex items-center gap-2.5">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-glow shadow-glow" aria-hidden="true" />
            {a.message}
          </li>
        ))}
        {state.activity.length === 0 && <li className="text-ink/45">No activity yet.</li>}
      </ul>
    </div>
  );
}

function SectionTitle({ title, to }: { title: string; to?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="font-display text-xl text-ink">{title}</h2>
      {to && (
        <Link
          to={to}
          className="flex cursor-pointer items-center gap-0.5 text-xs font-bold uppercase tracking-wide text-amber-700 transition-transform hover:translate-x-0.5 focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          View all <ArrowUpRight size={14} aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

function StatCard({
  label,
  rupees,
  plain,
  sub,
  subTone,
}: {
  label: string;
  rupees: number | null;
  plain?: string;
  sub: string;
  subTone: string;
}) {
  const tiltRef = useTilt(6);
  const animated = useCountUp(rupees ?? 0);
  return (
    <div ref={tiltRef} className="tilt panel p-4 sm:p-5">
      <div className="tilt-inner">
        <p className="text-[11px] font-bold uppercase tracking-wider text-ink/45">{label}</p>
        <p className="num mt-1.5 text-2xl font-bold text-ink sm:text-3xl">
          {rupees !== null ? formatINR(Math.round(animated)) : plain}
        </p>
        <p className={clsx('mt-1 text-xs font-semibold', subTone)}>{sub}</p>
      </div>
    </div>
  );
}
