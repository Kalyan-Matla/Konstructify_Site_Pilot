import { useMemo, useState } from 'react';
import { Printer, Star } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { Badge, PageHeader } from '../components/ui';
import {
  creditUsagePercent,
  creditUsed,
  projectEstimate,
  projectSpend,
} from '../utils/derive';
import { daysSince, daysUntil, formatINR } from '../utils/format';

type Tab = 'projects' | 'vendors' | 'cashflow';

export default function Reports() {
  const [tab, setTab] = useState<Tab>('projects');

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Project health, vendor scorecards, cash flow"
        action={
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <Printer size={16} aria-hidden="true" /> Print / PDF
          </button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Report type">
        {(
          [
            ['projects', 'Project summary'],
            ['vendors', 'Vendor performance'],
            ['cashflow', 'Cash flow (30-day)'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              tab === key ? 'bg-blue-600 text-white' : 'border border-gray-300 bg-white text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'projects' && <ProjectSummary />}
      {tab === 'vendors' && <VendorPerformance />}
      {tab === 'cashflow' && <CashFlow />}
    </div>
  );
}

function ProjectSummary() {
  const { state } = useApp();
  return (
    <div className="space-y-4">
      {state.projects.map((p) => {
        const spent = projectSpend(p.id, state);
        const estimate = projectEstimate(p.id, state);
        const budgetPct = p.budget > 0 ? (spent / p.budget) * 100 : 0;
        const elapsed = Math.max(daysSince(p.startDate), 0);
        const total = elapsed + Math.max(daysUntil(p.endDate), 0);
        const timePct = total > 0 ? (elapsed / total) * 100 : 0;
        const tasks = state.tasks.filter((t) => t.projectId === p.id);
        const completion = tasks.length
          ? tasks.reduce((s, t) => s + t.percentComplete, 0) / tasks.length
          : 0;
        const vendorSpend = state.vendors
          .map((v) => ({
            vendor: v,
            spend: state.invoices
              .filter((i) => i.projectId === p.id && i.vendorId === v.id)
              .reduce((s, i) => s + i.amount, 0),
          }))
          .filter((x) => x.spend > 0)
          .sort((a, b) => b.spend - a.spend)
          .slice(0, 3);
        const overrunItems = state.budgetItems.filter((b) => {
          if (b.projectId !== p.id) return false;
          const est = b.quantity * b.unitRate;
          return est > 0 && b.actualSpend - est > 0.1 * est;
        });
        return (
          <section key={p.id} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-bold text-gray-900">{p.name}</h2>
              <Badge tone={p.status === 'in-progress' ? 'green' : p.status === 'on-hold' ? 'yellow' : 'blue'}>
                {p.status}
              </Badge>
            </div>
            <p className="text-sm text-gray-600">{p.clientName} · {p.location}</p>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <Metric label="Budget used" value={`${formatINR(spent)} (${budgetPct.toFixed(0)}%)`} />
              <Metric label="BOQ estimate" value={formatINR(estimate)} />
              <Metric label="Timeline elapsed" value={`${timePct.toFixed(0)}%`} />
              <Metric label="Est. completion" value={`${completion.toFixed(0)}%`} />
            </dl>
            <div className="mt-3 text-sm">
              <p className="font-semibold text-gray-900">Top vendors</p>
              {vendorSpend.length === 0 ? (
                <p className="text-gray-500">No spend yet.</p>
              ) : (
                <ul className="mt-1 space-y-0.5 text-gray-700">
                  {vendorSpend.map(({ vendor, spend }) => (
                    <li key={vendor.id}>
                      {vendor.name} — {formatINR(spend)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="mt-3 text-sm">
              <p className="font-semibold text-gray-900">Key risks</p>
              {overrunItems.length === 0 && timePct <= completion + 15 ? (
                <p className="text-green-700">No major risks detected ✓</p>
              ) : (
                <ul className="mt-1 list-inside list-disc space-y-0.5 text-red-700">
                  {overrunItems.map((b) => {
                    const est = b.quantity * b.unitRate;
                    return (
                      <li key={b.id}>
                        {b.description} +{formatINR(b.actualSpend - est)} over estimate
                      </li>
                    );
                  })}
                  {timePct > completion + 15 && (
                    <li>Schedule risk: {timePct.toFixed(0)}% of time used but only {completion.toFixed(0)}% complete</li>
                  )}
                </ul>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function VendorPerformance() {
  const { state } = useApp();
  const rows = useMemo(
    () =>
      state.vendors.map((v) => {
        const invoices = state.invoices.filter((i) => i.vendorId === v.id);
        const paid = invoices.filter((i) => i.status === 'paid');
        const onTime = paid.filter((i) => i.paymentDate !== null && i.paymentDate <= i.dueDate);
        const totalSpend = invoices.reduce((s, i) => s + i.amount, 0);
        const usage = creditUsagePercent(v, state.invoices) * 100;
        const overall = (v.ratingQuality + v.ratingDelivery) / 2;
        return { vendor: v, invoices, paid, onTime, totalSpend, usage, overall };
      }),
    [state],
  );
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
            <th scope="col" className="px-3 py-2">Vendor</th>
            <th scope="col" className="px-3 py-2">Invoices</th>
            <th scope="col" className="px-3 py-2">Total spend</th>
            <th scope="col" className="px-3 py-2">Paid on time</th>
            <th scope="col" className="px-3 py-2">Credit usage</th>
            <th scope="col" className="px-3 py-2">Quality</th>
            <th scope="col" className="px-3 py-2">Overall</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ vendor, invoices, paid, onTime, totalSpend, usage, overall }) => (
            <tr key={vendor.id} className="border-b border-gray-100 last:border-0">
              <td className="px-3 py-2 font-medium text-gray-900">{vendor.name}</td>
              <td className="px-3 py-2 text-gray-600">{invoices.length}</td>
              <td className="px-3 py-2 text-gray-900">{formatINR(totalSpend)}</td>
              <td className="px-3 py-2 text-gray-600">
                {paid.length > 0 ? `${Math.round((onTime.length / paid.length) * 100)}%` : '—'}
              </td>
              <td className="px-3 py-2">
                <Badge tone={usage > 95 ? 'red' : usage > 80 ? 'orange' : usage > 50 ? 'yellow' : 'green'}>
                  {usage.toFixed(0)}%
                </Badge>
              </td>
              <td className="px-3 py-2 text-gray-600">{vendor.ratingQuality.toFixed(1)}★</td>
              <td className="px-3 py-2">
                <span className="flex items-center gap-1 font-semibold text-gray-900">
                  <Star size={13} className="text-yellow-500" aria-hidden="true" />
                  {overall.toFixed(1)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CashFlow() {
  const { state } = useApp();
  const weeks = useMemo(() => {
    const out: Array<{ label: string; total: number; parts: string[] }> = [];
    for (let w = 0; w < 4; w++) {
      const from = w * 7;
      const to = from + 7;
      const due = state.invoices.filter((i) => {
        if (i.status !== 'unpaid') return false;
        const d = daysUntil(i.dueDate);
        return (w === 0 ? d < to : d >= from && d < to);
      });
      const byVendor = new Map<string, number>();
      for (const i of due) {
        const name = state.vendors.find((v) => v.id === i.vendorId)?.name ?? 'Unknown';
        byVendor.set(name, (byVendor.get(name) ?? 0) + i.amount);
      }
      out.push({
        label: w === 0 ? 'Week 1 (incl. overdue)' : `Week ${w + 1}`,
        total: due.reduce((s, i) => s + i.amount, 0),
        parts: [...byVendor.entries()].map(([n, a]) => `${n} ${formatINR(a)}`),
      });
    }
    return out;
  }, [state]);

  const totalDue = weeks.reduce((s, w) => s + w.total, 0);
  const cash = 20_00_000;
  const overrunPrediction = state.budgetItems.reduce((s, b) => {
    const est = b.quantity * b.unitRate;
    const variance = b.actualSpend - est;
    return est > 0 && variance > 0.1 * est ? s + variance * 2.5 : s;
  }, 0);
  const totalUsed = state.vendors.reduce((s, v) => s + creditUsed(v.id, state.invoices), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Payables (30 days)" value={formatINR(totalDue)} />
        <Metric label="Cash on hand" value={formatINR(cash)} />
        <Metric label="Cash after payables" value={formatINR(cash - totalDue)} />
        <Metric label="Predicted overrun" value={overrunPrediction > 0 ? `+${formatINR(overrunPrediction)}` : '—'} />
      </div>
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-base font-bold text-gray-900">Payables by week</h2>
        <ul className="space-y-3">
          {weeks.map((w) => (
            <li key={w.label}>
              <div className="flex justify-between text-sm font-semibold text-gray-900">
                <span>{w.label}</span>
                <span className={w.total > cash ? 'text-red-600' : ''}>{formatINR(w.total)}</span>
              </div>
              <p className="text-xs text-gray-600">{w.parts.length > 0 ? w.parts.join(' · ') : 'Nothing due'}</p>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-gray-700">
          Total outstanding vendor credit: <strong>{formatINR(totalUsed)}</strong> · Confidence:{' '}
          <Badge tone={overrunPrediction > 0 ? 'yellow' : 'green'}>
            {overrunPrediction > 0 ? 'Medium — costs trending up' : 'High'}
          </Badge>
        </p>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-gray-50 p-2.5">
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="font-semibold text-gray-900">{value}</dd>
    </div>
  );
}
