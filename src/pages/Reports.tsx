import { useMemo, useState } from 'react';
import { Printer, Star, TrendingDown, TrendingUp } from 'lucide-react';
import clsx from 'clsx';
import { useApp } from '../contexts/AppContext';
import { Badge, PageHeader, ProgressBar, Ring } from '../components/ui';
import { useCountUp } from '../hooks/useFx';
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
            className="btn-ghost no-print flex items-center gap-1.5"
          >
            <Printer size={16} aria-hidden="true" /> Print / PDF
          </button>
        }
      />

      <div className="no-print mb-5 flex flex-wrap gap-2" role="tablist" aria-label="Report type">
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
            className={clsx('chip px-4 text-sm', tab === key ? 'chip-active' : 'chip-idle')}
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
    <div className="stagger space-y-4">
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
        const maxVendorSpend = vendorSpend[0]?.spend ?? 1;
        const overrunItems = state.budgetItems.filter((b) => {
          if (b.projectId !== p.id) return false;
          const est = b.quantity * b.unitRate;
          return est > 0 && b.actualSpend - est > 0.1 * est;
        });
        const scheduleRisk = timePct > completion + 15;
        return (
          <section key={p.id} className="panel overflow-hidden">
            {/* Ink header band */}
            <div className="blueprint flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div>
                <h2 className="font-display text-xl text-white">{p.name}</h2>
                <p className="text-xs font-semibold uppercase tracking-wider text-white/55">
                  {p.clientName} · {p.location}
                </p>
              </div>
              <Badge tone={p.status === 'in-progress' ? 'green' : p.status === 'on-hold' ? 'yellow' : 'blue'}>
                {p.status}
              </Badge>
            </div>

            <div className="grid grid-cols-1 gap-6 p-5 lg:grid-cols-[1fr_auto]">
              <div>
                {/* Twin progress meters */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Meter label="Budget used" pct={budgetPct} detail={`${formatINR(spent)} of ${formatINR(p.budget)}`} />
                  <Meter label="Timeline elapsed" pct={timePct} detail={`BOQ estimate ${formatINR(estimate)}`} tone="bg-sky-500" />
                </div>

                {/* Top vendors — mini bar chart */}
                <h3 className="mt-5 text-[11px] font-bold uppercase tracking-wider text-ink/60">Top vendors</h3>
                {vendorSpend.length === 0 ? (
                  <p className="mt-1 text-sm text-ink/60">No spend yet.</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {vendorSpend.map(({ vendor, spend }) => (
                      <li key={vendor.id} className="flex items-center gap-3 text-sm">
                        <span className="w-40 truncate font-semibold text-ink/80">{vendor.name}</span>
                        <span className="h-3 flex-1 overflow-hidden rounded-full bg-ink/[0.06]">
                          <span
                            className="fill-animate block h-full rounded-full bg-gradient-to-r from-ink-600 to-ink"
                            style={{ width: `${(spend / maxVendorSpend) * 100}%` }}
                          />
                        </span>
                        <span className="num w-16 text-right font-bold text-ink">{formatINR(spend)}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Risks */}
                <h3 className="mt-5 text-[11px] font-bold uppercase tracking-wider text-ink/60">Key risks</h3>
                {overrunItems.length === 0 && !scheduleRisk ? (
                  <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
                    <TrendingUp size={15} aria-hidden="true" /> No major risks detected
                  </p>
                ) : (
                  <ul className="mt-1.5 space-y-1.5 text-sm">
                    {overrunItems.map((b) => {
                      const est = b.quantity * b.unitRate;
                      return (
                        <li key={b.id} className="flex items-center gap-1.5 font-semibold text-red-700">
                          <TrendingDown size={15} aria-hidden="true" />
                          {b.description} +{formatINR(b.actualSpend - est)} over estimate
                        </li>
                      );
                    })}
                    {scheduleRisk && (
                      <li className="flex items-center gap-1.5 font-semibold text-orange-700">
                        <TrendingDown size={15} aria-hidden="true" />
                        Schedule risk: {timePct.toFixed(0)}% of time used, only {completion.toFixed(0)}% complete
                      </li>
                    )}
                  </ul>
                )}
              </div>

              {/* Completion ring */}
              <div className="flex items-center justify-center lg:pr-2">
                <Ring percent={completion} size={116} stroke={10} label={`${completion.toFixed(0)}%`} sublabel="complete" />
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}

function Meter({ label, pct, detail, tone }: { label: string; pct: number; detail: string; tone?: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-ink/60">{label}</span>
        <span className="num text-sm font-bold text-ink">{pct.toFixed(0)}%</span>
      </div>
      <div className="mt-1.5">
        <ProgressBar percent={pct} tone={tone} />
      </div>
      <p className="num mt-1 text-xs text-ink/50">{detail}</p>
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
  const best = [...rows].sort((a, b) => b.overall - a.overall)[0];
  const biggest = [...rows].sort((a, b) => b.totalSpend - a.totalSpend)[0];

  return (
    <div className="animate-fade-up">
      {/* Highlights band */}
      <div className="stagger mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {best && (
          <Highlight
            label="Top rated partner"
            value={best.vendor.name}
            detail={`${best.overall.toFixed(1)}★ overall · ${best.vendor.ratingQuality.toFixed(1)} quality`}
          />
        )}
        {biggest && (
          <Highlight
            label="Largest spend"
            value={biggest.vendor.name}
            detail={`${formatINR(biggest.totalSpend)} across ${biggest.invoices.length} invoices`}
          />
        )}
      </div>

      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-ink/10 bg-paper-soft text-left text-[11px] font-bold uppercase tracking-wider text-ink/60">
              <th scope="col" className="px-4 py-3">Vendor</th>
              <th scope="col" className="px-4 py-3 text-right">Invoices</th>
              <th scope="col" className="px-4 py-3 text-right">Total spend</th>
              <th scope="col" className="px-4 py-3 text-right">Paid on time</th>
              <th scope="col" className="px-4 py-3">Credit usage</th>
              <th scope="col" className="px-4 py-3 text-right">Quality</th>
              <th scope="col" className="px-4 py-3 text-right">Overall</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ vendor, invoices, paid, onTime, totalSpend, usage, overall }) => (
              <tr key={vendor.id} className="border-b border-ink/5 transition-colors last:border-0 hover:bg-paper-soft">
                <td className="px-4 py-3 font-semibold text-ink">{vendor.name}</td>
                <td className="num px-4 py-3 text-right text-ink/60">{invoices.length}</td>
                <td className="num px-4 py-3 text-right font-semibold text-ink">{formatINR(totalSpend)}</td>
                <td className="num px-4 py-3 text-right text-ink/60">
                  {paid.length > 0 ? `${Math.round((onTime.length / paid.length) * 100)}%` : '—'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-16 overflow-hidden rounded-full bg-ink/10">
                      <span
                        className={clsx(
                          'fill-animate block h-full rounded-full',
                          usage > 95 ? 'bg-red-500' : usage > 80 ? 'bg-orange-500' : usage > 50 ? 'bg-amber-500' : 'bg-emerald-500',
                        )}
                        style={{ width: `${Math.min(usage, 100)}%` }}
                      />
                    </span>
                    <span className="num text-xs font-bold text-ink/70">{usage.toFixed(0)}%</span>
                  </div>
                </td>
                <td className="num px-4 py-3 text-right text-ink/60">{vendor.ratingQuality.toFixed(1)}★</td>
                <td className="px-4 py-3">
                  <span className="num flex items-center justify-end gap-1 font-bold text-ink">
                    <Star size={13} className="fill-amber-400 text-amber-400" aria-hidden="true" />
                    {overall.toFixed(1)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Highlight({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="blueprint relative overflow-hidden rounded-2xl p-4 text-white shadow-lift">
      <div aria-hidden="true" className="pointer-events-none absolute -right-8 -top-12 h-32 w-32 rounded-full bg-amber-glow/15 blur-2xl" />
      <p className="text-[10px] font-bold uppercase tracking-wider text-white/55">{label}</p>
      <p className="font-display mt-1 text-lg text-amber-glow">{value}</p>
      <p className="num mt-0.5 text-xs text-white/60">{detail}</p>
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
        return w === 0 ? d < to : d >= from && d < to;
      });
      const byVendor = new Map<string, number>();
      for (const i of due) {
        const name = state.vendors.find((v) => v.id === i.vendorId)?.name ?? 'Unknown';
        byVendor.set(name, (byVendor.get(name) ?? 0) + i.amount);
      }
      out.push({
        label: `Week ${w + 1}`,
        total: due.reduce((s, i) => s + i.amount, 0),
        parts: [...byVendor.entries()].map(([n, a]) => `${n} ${formatINR(a)}`),
      });
    }
    return out;
  }, [state]);

  const totalDue = weeks.reduce((s, w) => s + w.total, 0);
  const maxWeek = Math.max(...weeks.map((w) => w.total), 1);
  const cash = 20_00_000;
  const overrunPrediction = state.budgetItems.reduce((s, b) => {
    const est = b.quantity * b.unitRate;
    const variance = b.actualSpend - est;
    return est > 0 && variance > 0.1 * est ? s + variance * 2.5 : s;
  }, 0);
  const totalUsed = state.vendors.reduce((s, v) => s + creditUsed(v.id, state.invoices), 0);
  const animatedDue = useCountUp(totalDue);

  return (
    <div className="animate-fade-up space-y-4">
      {/* Headline metrics */}
      <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricTile label="Payables (30 days)" value={formatINR(Math.round(animatedDue))} warn={totalDue > cash} />
        <MetricTile label="Cash on hand" value={formatINR(cash)} />
        <MetricTile label="Cash after payables" value={formatINR(cash - totalDue)} warn={cash - totalDue < 0} />
        <MetricTile
          label="Predicted overrun"
          value={overrunPrediction > 0 ? `+${formatINR(overrunPrediction)}` : '—'}
          warn={overrunPrediction > 0}
        />
      </div>

      {/* Animated weekly bar chart */}
      <div className="panel p-5 sm:p-6">
        <h2 className="font-display text-xl text-ink">Payables by week</h2>
        <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-ink/40">
          Week 1 includes overdue invoices
        </p>
        <div className="mt-6 grid grid-cols-4 items-end gap-3 sm:gap-6" style={{ height: 180 }} role="img" aria-label={`Weekly payables: ${weeks.map((w) => `${w.label} ${formatINR(w.total)}`).join(', ')}`}>
          {weeks.map((w, idx) => (
            <div key={w.label} className="flex h-full flex-col items-center justify-end gap-2">
              <span className="num text-sm font-bold text-ink">{formatINR(w.total)}</span>
              <div
                className={clsx(
                  'w-full max-w-[72px] origin-bottom animate-bar-grow rounded-t-xl',
                  w.total > cash
                    ? 'bg-gradient-to-t from-red-600 to-red-400'
                    : 'bg-gradient-to-t from-ink to-ink-600',
                )}
                style={{
                  height: `${Math.max((w.total / maxWeek) * 100, w.total > 0 ? 6 : 2)}%`,
                  animationDelay: `${idx * 90}ms`,
                }}
              />
              <span className="text-[11px] font-bold uppercase tracking-wide text-ink/60">{w.label}</span>
            </div>
          ))}
        </div>
        <ul className="mt-5 space-y-1.5 border-t border-ink/10 pt-4 text-xs text-ink/60">
          {weeks.map((w) => (
            <li key={w.label}>
              <span className="font-bold text-ink">{w.label}:</span>{' '}
              {w.parts.length > 0 ? w.parts.join(' · ') : 'Nothing due'}
            </li>
          ))}
        </ul>
        <p className="mt-4 flex flex-wrap items-center gap-2 text-sm text-ink/70">
          Total outstanding vendor credit: <span className="num font-bold text-ink">{formatINR(totalUsed)}</span>
          <Badge tone={overrunPrediction > 0 ? 'yellow' : 'green'}>
            Confidence: {overrunPrediction > 0 ? 'Medium — costs trending up' : 'High'}
          </Badge>
        </p>
      </div>
    </div>
  );
}

function MetricTile({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="panel panel-hover p-4">
      <p className="text-[11px] font-bold uppercase tracking-wider text-ink/60">{label}</p>
      <p className={clsx('num mt-1.5 text-xl font-bold sm:text-2xl', warn ? 'text-red-600' : 'text-ink')}>{value}</p>
    </div>
  );
}
