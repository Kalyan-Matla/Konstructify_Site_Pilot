import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, X } from 'lucide-react';
import clsx from 'clsx';
import { useApp } from '../contexts/AppContext';
import { AICard, Badge, PageHeader, ProgressBar } from '../components/ui';
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
      <PageHeader title="Dashboard" subtitle="Everything across your sites, at a glance" />

      {/* Quick stats */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Active projects"
          value={String(state.projects.filter((p) => p.status === 'in-progress').length)}
          sub={overrunProjects > 0 ? `${overrunProjects} over budget` : 'all on budget'}
          subTone={overrunProjects > 0 ? 'text-red-600' : 'text-green-600'}
        />
        <StatCard label="Payables due <30 days" value={formatINR(payables30)} sub={`${formatINR(payables7)} due this week`} subTone="text-orange-600" />
        <StatCard
          label="Available cash"
          value={formatINR(Math.max(CASH_ON_HAND - payables7, 0))}
          sub={`after this week's dues`}
          subTone="text-gray-500"
        />
        <StatCard
          label="Sync status"
          value={isSyncing ? 'Syncing…' : pendingCount > 0 ? `${pendingCount} pending` : 'Synced ✓'}
          sub={pendingCount > 0 ? 'will sync when online' : 'all changes saved'}
          subTone="text-gray-500"
        />
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="mb-5 space-y-2" aria-label="Alerts">
          {alerts.map((a) => (
            <div
              key={a.id}
              className={clsx(
                'flex items-center justify-between gap-2 rounded-md border-l-4 px-3 py-2 text-sm',
                a.tone === 'red' && 'border-red-500 bg-red-50 text-red-800',
                a.tone === 'orange' && 'border-orange-500 bg-orange-50 text-orange-800',
                a.tone === 'yellow' && 'border-yellow-500 bg-yellow-50 text-yellow-800',
              )}
            >
              <span className="flex items-center gap-2">
                <AlertTriangle size={16} aria-hidden="true" />
                {a.message}
              </span>
              <button
                type="button"
                aria-label={`Dismiss alert: ${a.message}`}
                onClick={() => setDismissed((s) => new Set(s).add(a.id))}
                className="rounded p-0.5 hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {ai && !aiDismissed && (
        <AICard suggestion={ai} onDismiss={() => setAiDismissed(true)} onAction={() => navigate('/credits')} />
      )}

      {/* Project cards */}
      <h2 className="mb-2 text-base font-bold text-gray-900">Projects</h2>
      <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {state.projects.map((p) => {
          const spent = projectSpend(p.id, state);
          const pct = p.budget > 0 ? (spent / p.budget) * 100 : 0;
          const over = spent > p.budget;
          const remaining = daysUntil(p.endDate);
          return (
            <Link
              key={p.id}
              to="/projects"
              className="block rounded-lg border border-gray-200 bg-white p-4 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-gray-900">{p.name}</h3>
                <Badge tone={p.status === 'in-progress' ? (over ? 'red' : 'green') : p.status === 'on-hold' ? 'yellow' : 'blue'}>
                  {over ? 'overrun' : p.status}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-gray-600">
                {formatINR(spent)} of {formatINR(p.budget)} used
              </p>
              <div className="mt-2">
                <ProgressBar percent={pct} />
              </div>
              <p className="mt-2 text-xs text-gray-500">
                {remaining >= 0 ? `${remaining} days remaining` : `${-remaining} days past end date`}
              </p>
            </Link>
          );
        })}
      </div>

      {/* Vendor health */}
      <h2 className="mb-2 text-base font-bold text-gray-900">Vendor health</h2>
      <div className="mb-6 overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
              <th scope="col" className="px-3 py-2">Vendor</th>
              <th scope="col" className="px-3 py-2">Category</th>
              <th scope="col" className="px-3 py-2">Credit used</th>
              <th scope="col" className="px-3 py-2">&lt;30d</th>
              <th scope="col" className="px-3 py-2">30–60d</th>
              <th scope="col" className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {state.vendors.map((v) => {
              const used = creditUsed(v.id, state.invoices);
              const aging = agingBuckets(v.id, state.invoices);
              const health = creditHealth(v, state.invoices);
              const overdue = vendorHasOverdue(v.id, state.invoices);
              return (
                <tr key={v.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-3 py-2 font-medium text-gray-900">
                    <Link to="/vendors" className="hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                      {v.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2 capitalize text-gray-600">{v.category}</td>
                  <td className="px-3 py-2 text-gray-900">
                    {formatINR(used)} / {formatINR(v.creditLimit)}
                  </td>
                  <td className="px-3 py-2 text-gray-600">{formatINR(aging.b0to30)}</td>
                  <td className="px-3 py-2 text-gray-600">{formatINR(aging.b30to60)}</td>
                  <td className="px-3 py-2">
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
      <h2 className="mb-2 text-base font-bold text-gray-900">Recent activity</h2>
      <ul className="space-y-1 rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-700">
        {state.activity.slice(0, 5).map((a) => (
          <li key={a.id} className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" aria-hidden="true" />
            {a.message}
          </li>
        ))}
        {state.activity.length === 0 && <li className="text-gray-500">No activity yet.</li>}
      </ul>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  subTone,
}: {
  label: string;
  value: string;
  sub: string;
  subTone: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-gray-900">{value}</p>
      <p className={clsx('mt-0.5 text-xs font-medium', subTone)}>{sub}</p>
    </div>
  );
}
