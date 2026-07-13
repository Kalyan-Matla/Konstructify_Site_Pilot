import { useMemo, useState, type FormEvent } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import type { Project, ProjectStatus } from '../types';
import { useApp } from '../contexts/AppContext';
import {
  Badge,
  ConfirmDialog,
  EmptyState,
  Field,
  Modal,
  PageHeader,
  ProgressBar,
  SyncBadge,
  inputCls,
} from '../components/ui';
import { creditUsed, projectEstimate, projectSpend } from '../utils/derive';
import { daysUntil, formatDate, formatINR, todayISO, uid, isoDaysFromNow } from '../utils/format';

type Filter = 'all' | ProjectStatus;

const PHASES = ['Foundation', 'Structure', 'MEP', 'Finishing'];

export default function Projects() {
  const { state, upsert, remove } = useApp();
  const [filter, setFilter] = useState<Filter>('all');
  const [editing, setEditing] = useState<Project | 'new' | null>(null);
  const [viewing, setViewing] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState<Project | null>(null);

  const projects = state.projects.filter((p) => filter === 'all' || p.status === filter);

  return (
    <div>
      <PageHeader
        title="Projects"
        subtitle={`${state.projects.length} total`}
        action={
          <button
            type="button"
            onClick={() => setEditing('new')}
            className="flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <Plus size={16} aria-hidden="true" /> New project
          </button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filter projects">
        {(['all', 'in-progress', 'on-hold', 'completed'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              filter === f ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border border-gray-300'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {projects.length === 0 ? (
        <EmptyState message="No projects match this filter. Create one with “New project”." />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => {
            const spent = projectSpend(p.id, state);
            const over = spent > p.budget;
            const remaining = daysUntil(p.endDate);
            return (
              <div key={p.id} className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setViewing(p)}
                    className="text-left font-semibold text-gray-900 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {p.name}
                  </button>
                  <Badge tone={over ? 'red' : p.status === 'in-progress' ? 'green' : p.status === 'on-hold' ? 'yellow' : 'blue'}>
                    {over ? 'overrun' : p.status}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-gray-600">{p.location} · {p.clientName}</p>
                <p className="mt-2 text-sm text-gray-900">
                  {formatINR(spent)} / {formatINR(p.budget)}
                </p>
                <div className="mt-1.5">
                  <ProgressBar percent={p.budget > 0 ? (spent / p.budget) * 100 : 0} />
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  {formatDate(p.startDate)} → {formatDate(p.endDate)} ·{' '}
                  {remaining >= 0 ? `${remaining}d left` : `${-remaining}d over`}
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <SyncBadge entity="project" id={p.id} />
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setEditing(p)}
                      aria-label={`Edit ${p.name}`}
                      className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleting(p)}
                      aria-label={`Delete ${p.name}`}
                      className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <ProjectForm
          project={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSave={(p) => {
            upsert('project', p, `Project "${p.name}" ${editing === 'new' ? 'created' : 'updated'}`);
            setEditing(null);
          }}
        />
      )}

      {viewing && <ProjectDetail project={viewing} onClose={() => setViewing(null)} />}

      {deleting && (
        <ConfirmDialog
          title="Delete project?"
          message={`"${deleting.name}" and its dashboard summaries will be removed. Vendors, invoices and tasks are kept.`}
          confirmLabel="Delete"
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            remove('project', deleting.id, `Project "${deleting.name}" deleted`);
            setDeleting(null);
          }}
        />
      )}
    </div>
  );
}

function ProjectForm({
  project,
  onClose,
  onSave,
}: {
  project: Project | null;
  onClose: () => void;
  onSave: (p: Project) => void;
}) {
  const [name, setName] = useState(project?.name ?? '');
  const [location, setLocation] = useState(project?.location ?? '');
  const [clientName, setClientName] = useState(project?.clientName ?? '');
  const [budget, setBudget] = useState(project ? String(project.budget) : '');
  const [startDate, setStartDate] = useState(project?.startDate ?? todayISO());
  const [endDate, setEndDate] = useState(project?.endDate ?? isoDaysFromNow(60));
  const [status, setStatus] = useState<ProjectStatus>(project?.status ?? 'in-progress');
  const [error, setError] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const b = Number(budget);
    if (!name.trim() || !location.trim() || !clientName.trim()) return setError('All fields are required.');
    if (!Number.isFinite(b) || b <= 0) return setError('Budget must be greater than 0.');
    if (startDate >= endDate) return setError('Start date must be before end date.');
    onSave({
      id: project?.id ?? uid('p'),
      name: name.trim(),
      location: location.trim(),
      clientName: clientName.trim(),
      budget: b,
      startDate,
      endDate,
      status,
    });
  };

  return (
    <Modal title={project ? 'Edit project' : 'New project'} onClose={onClose}>
      <form onSubmit={submit} noValidate>
        {error && <p role="alert" className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <Field label="Project name" htmlFor="pj-name" required>
          <input id="pj-name" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field label="Location" htmlFor="pj-loc" required>
          <input id="pj-loc" className={inputCls} value={location} onChange={(e) => setLocation(e.target.value)} required />
        </Field>
        <Field label="Client name" htmlFor="pj-client" required>
          <input id="pj-client" className={inputCls} value={clientName} onChange={(e) => setClientName(e.target.value)} required />
        </Field>
        <div className="grid grid-cols-1 gap-x-3 sm:grid-cols-2">
          <Field label="Total budget (₹)" htmlFor="pj-budget" required>
            <input id="pj-budget" type="number" min="1" className={inputCls} value={budget} onChange={(e) => setBudget(e.target.value)} required />
          </Field>
          <Field label="Status" htmlFor="pj-status">
            <select id="pj-status" className={inputCls} value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)}>
              <option value="in-progress">In progress</option>
              <option value="on-hold">On hold</option>
              <option value="completed">Completed</option>
            </select>
          </Field>
          <Field label="Start date" htmlFor="pj-start" required>
            <input id="pj-start" type="date" className={inputCls} value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
          </Field>
          <Field label="End date" htmlFor="pj-end" required>
            <input id="pj-end" type="date" className={inputCls} value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
          </Field>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500">
            Cancel
          </button>
          <button type="submit" className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
            Save project
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ProjectDetail({ project, onClose }: { project: Project; onClose: () => void }) {
  const { state } = useApp();
  const spent = projectSpend(project.id, state);
  const estimate = projectEstimate(project.id, state);
  const remaining = daysUntil(project.endDate);

  const phases = useMemo(
    () =>
      PHASES.map((phase) => {
        const tasks = state.tasks.filter((t) => t.projectId === project.id && t.phase === phase);
        const pct = tasks.length
          ? tasks.reduce((s, t) => s + t.percentComplete, 0) / tasks.length
          : 0;
        return { phase, tasks, pct };
      }),
    [state.tasks, project.id],
  );

  const vendorRows = useMemo(() => {
    const ids = new Set(state.invoices.filter((i) => i.projectId === project.id).map((i) => i.vendorId));
    return state.vendors
      .filter((v) => ids.has(v.id))
      .map((v) => ({
        vendor: v,
        spend: state.invoices
          .filter((i) => i.projectId === project.id && i.vendorId === v.id)
          .reduce((s, i) => s + i.amount, 0),
        outstanding: creditUsed(v.id, state.invoices.filter((i) => i.projectId === project.id)),
      }));
  }, [state, project.id]);

  return (
    <Modal title={project.name} onClose={onClose}>
      <p className="text-sm text-gray-600">
        {project.location} · {project.clientName}
      </p>
      <p className="mt-1 text-sm text-gray-600">
        {formatDate(project.startDate)} → {formatDate(project.endDate)} ·{' '}
        {remaining >= 0 ? `${remaining} days remaining` : `${-remaining} days past end`}
      </p>

      <h3 className="mt-4 text-sm font-bold text-gray-900">Budget snapshot</h3>
      <div className="mt-1 grid grid-cols-3 gap-2 text-sm">
        <div className="rounded bg-gray-50 p-2">
          <p className="text-xs text-gray-500">BOQ estimate</p>
          <p className="font-semibold">{formatINR(estimate)}</p>
        </div>
        <div className="rounded bg-gray-50 p-2">
          <p className="text-xs text-gray-500">Actual spend</p>
          <p className="font-semibold">{formatINR(spent)}</p>
        </div>
        <div className="rounded bg-gray-50 p-2">
          <p className="text-xs text-gray-500">Sanctioned</p>
          <p className="font-semibold">{formatINR(project.budget)}</p>
        </div>
      </div>

      <h3 className="mt-4 text-sm font-bold text-gray-900">Phases</h3>
      <div className="mt-1 space-y-2">
        {phases.map(({ phase, tasks, pct }) => (
          <div key={phase}>
            <div className="flex justify-between text-sm">
              <span className="text-gray-700">{phase}</span>
              <span className="text-gray-500">
                {tasks.length} task{tasks.length === 1 ? '' : 's'} · {pct.toFixed(0)}%
              </span>
            </div>
            <ProgressBar percent={pct} tone="bg-blue-500" />
          </div>
        ))}
      </div>

      <h3 className="mt-4 text-sm font-bold text-gray-900">Vendors on this project</h3>
      {vendorRows.length === 0 ? (
        <p className="mt-1 text-sm text-gray-500">No invoices yet.</p>
      ) : (
        <ul className="mt-1 divide-y divide-gray-100 text-sm">
          {vendorRows.map(({ vendor, spend, outstanding }) => (
            <li key={vendor.id} className="flex justify-between py-1.5">
              <span className="text-gray-800">{vendor.name}</span>
              <span className="text-gray-600">
                {formatINR(spend)} billed · {formatINR(outstanding)} open
              </span>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
