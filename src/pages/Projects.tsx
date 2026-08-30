import { useMemo, useState, type FormEvent } from 'react';
import { FolderOpen, Pencil, Plus, Trash2 } from 'lucide-react';
import type { Project, ProjectStatus } from '../types';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { useRouteAction } from '../hooks/useRouteAction';
import { useBulkSelect } from '../hooks/useBulkSelect';
import { useBulkDelete } from '../hooks/useBulkDelete';
import {
  Badge,
  BulkBar,
  BulkCheckbox,
  ConfirmDialog,
  EmptyState,
  Field,
  FormError,
  Modal,
  PageHeader,
  ProgressBar,
  SelectAllToggle,
  SyncBadge,
  inputCls,
} from '../components/ui';
import { creditUsed, projectEstimate, projectSpend } from '../utils/derive';
import { daysUntil, formatDate, formatINR, paiseToRupees, parseRupeeInput, todayISO, uid, isoDaysFromNow } from '../utils/format';

type Filter = 'all' | ProjectStatus;

const PHASES = ['Foundation', 'Structure', 'MEP', 'Finishing'];

export default function Projects() {
  const { state, upsert, remove } = useApp();
  const { can, canReachProject } = useAuth();
  const manage = can('projects:manage');
  const [filter, setFilter] = useState<Filter>('all');
  const [editing, setEditing] = useState<Project | 'new' | null>(null);
  const [viewing, setViewing] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState<Project | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const { selected, toggle, clear, setAll } = useBulkSelect();
  const bulkDelete = useBulkDelete<Project>('project', 'project');

  useRouteAction({
    openNew: () => { if (manage) setEditing('new'); },
    openView: (id) => {
      const p = state.projects.find((x) => x.id === id);
      if (p && canReachProject(p.id)) setViewing(p);
    },
  });

  // Layer 3 — scoped personas see only their assigned projects.
  const projects = state.projects.filter(
    (p) => canReachProject(p.id) && (filter === 'all' || p.status === filter),
  );

  return (
    <div>
      <PageHeader
        title="Projects"
        subtitle={`${state.projects.length} total`}
        action={
          manage ? (
            <button
              type="button"
              onClick={() => setEditing('new')}
              className="btn-primary flex items-center gap-1.5"
            >
              <Plus size={16} aria-hidden="true" /> New project
            </button>
          ) : undefined
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter projects">
          {(['all', 'in-progress', 'on-hold', 'completed'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={`chip capitalize ${
                filter === f ? 'chip-active' : 'chip-idle'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        {manage && projects.length > 0 && (
          <SelectAllToggle
            checked={projects.every((p) => selected.has(p.id))}
            onChange={() =>
              setAll(projects.every((p) => selected.has(p.id)) ? [] : projects.map((p) => p.id))
            }
            label="Select all"
          />
        )}
      </div>

      <BulkBar count={selected.size} itemLabel="project" onClear={clear}>
        <button
          type="button"
          onClick={() => setBulkDeleting(true)}
          className="flex items-center gap-1.5 rounded-xl bg-red-600 px-3 py-1.5 text-xs font-bold text-white transition-[transform,background-color] duration-200 ease-out hover:bg-red-500 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
        >
          <Trash2 size={14} aria-hidden="true" /> Delete
        </button>
      </BulkBar>

      {projects.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No projects to show"
          message="Spin up a project with its budget and timeline to start tracking spend and progress."
          action={manage ? { label: 'New project', onClick: () => setEditing('new') } : undefined}
        />
      ) : (
        <div className="stagger grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => {
            const spent = projectSpend(p.id, state);
            const over = spent > p.budgetPaise;
            const remaining = daysUntil(p.endDate);
            return (
              <div
                key={p.id}
                className={`panel panel-hover p-4 ${selected.has(p.id) ? 'ring-2 ring-amber-500' : ''}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-start gap-2">
                    {manage && (
                      <BulkCheckbox
                        checked={selected.has(p.id)}
                        onChange={() => toggle(p.id)}
                        ariaLabel={`Select ${p.name} for bulk actions`}
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => setViewing(p)}
                      className="text-left font-semibold text-ink hover:text-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      {p.name}
                    </button>
                  </div>
                  <Badge tone={over ? 'red' : p.status === 'in-progress' ? 'green' : p.status === 'on-hold' ? 'yellow' : 'blue'}>
                    {over ? 'overrun' : p.status}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-ink/60">{p.location} · {p.clientName}</p>
                <p className="mt-2 text-sm text-ink">
                  {formatINR(spent)} / {formatINR(p.budgetPaise)}
                </p>
                <div className="mt-1.5">
                  <ProgressBar percent={p.budgetPaise > 0 ? (spent / p.budgetPaise) * 100 : 0} />
                </div>
                <p className="mt-2 text-xs text-ink/55">
                  {formatDate(p.startDate)} → {formatDate(p.endDate)} ·{' '}
                  {remaining >= 0 ? `${remaining}d left` : `${-remaining}d over`}
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <SyncBadge entity="project" id={p.id} />
                  {manage && (
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setEditing(p)}
                      aria-label={`Edit ${p.name}`}
                      className="rounded p-1.5 text-ink/55 hover:bg-paper-soft hover:text-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleting(p)}
                      aria-label={`Delete ${p.name}`}
                      className="rounded p-1.5 text-ink/55 hover:bg-paper-soft hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  )}
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

      {bulkDeleting && (
        <ConfirmDialog
          title={`Delete ${selected.size} project${selected.size === 1 ? '' : 's'}?`}
          message="Their dashboard summaries will be removed. Vendors, invoices and tasks are kept. This can be undone from the confirmation toast."
          confirmLabel={`Delete ${selected.size}`}
          onCancel={() => setBulkDeleting(false)}
          onConfirm={() => {
            const items = state.projects.filter((p) => selected.has(p.id));
            bulkDelete(items, (p) => `Project "${p.name}" deleted`);
            setBulkDeleting(false);
            clear();
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
  const [budget, setBudget] = useState(project ? String(paiseToRupees(project.budgetPaise)) : '');
  const [startDate, setStartDate] = useState(project?.startDate ?? todayISO());
  const [endDate, setEndDate] = useState(project?.endDate ?? isoDaysFromNow(60));
  const [status, setStatus] = useState<ProjectStatus>(project?.status ?? 'in-progress');
  const [error, setError] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    // Rupees in, paise stored — the conversion happens here, at the boundary.
    const budgetPaise = parseRupeeInput(budget);
    if (!name.trim() || !location.trim() || !clientName.trim()) return setError('All fields are required.');
    if (budgetPaise === null || budgetPaise <= 0) return setError('Budget must be greater than 0.');
    if (startDate >= endDate) return setError('Start date must be before end date.');
    onSave({
      id: project?.id ?? uid('p'),
      name: name.trim(),
      location: location.trim(),
      clientName: clientName.trim(),
      budgetPaise,
      startDate,
      endDate,
      status,
    });
  };

  return (
    <Modal title={project ? 'Edit project' : 'New project'} onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <FormError message={error} />
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
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button type="submit" className="btn-primary">
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
          .reduce((s, i) => s + i.amountPaise, 0),
        outstanding: creditUsed(v.id, state.invoices.filter((i) => i.projectId === project.id)),
      }));
  }, [state, project.id]);

  return (
    <Modal title={project.name} onClose={onClose}>
      <p className="text-sm text-ink/60">
        {project.location} · {project.clientName}
      </p>
      <p className="mt-1 text-sm text-ink/60">
        {formatDate(project.startDate)} → {formatDate(project.endDate)} ·{' '}
        {remaining >= 0 ? `${remaining} days remaining` : `${-remaining} days past end`}
      </p>

      <h3 className="mt-4 text-sm font-bold text-ink">Budget snapshot</h3>
      <div className="mt-1 grid grid-cols-3 gap-2 text-sm">
        <div className="rounded bg-paper-soft p-2">
          <p className="text-xs text-ink/55">BOQ estimate</p>
          <p className="font-semibold">{formatINR(estimate)}</p>
        </div>
        <div className="rounded bg-paper-soft p-2">
          <p className="text-xs text-ink/55">Actual spend</p>
          <p className="font-semibold">{formatINR(spent)}</p>
        </div>
        <div className="rounded bg-paper-soft p-2">
          <p className="text-xs text-ink/55">Sanctioned</p>
          <p className="font-semibold">{formatINR(project.budgetPaise)}</p>
        </div>
      </div>

      <h3 className="mt-4 text-sm font-bold text-ink">Phases</h3>
      <div className="mt-1 space-y-2">
        {phases.map(({ phase, tasks, pct }) => (
          <div key={phase}>
            <div className="flex justify-between text-sm">
              <span className="text-ink/80">{phase}</span>
              <span className="text-ink/55">
                {tasks.length} task{tasks.length === 1 ? '' : 's'} · {pct.toFixed(0)}%
              </span>
            </div>
            <ProgressBar percent={pct} tone="bg-blue-500" />
          </div>
        ))}
      </div>

      <h3 className="mt-4 text-sm font-bold text-ink">Vendors on this project</h3>
      {vendorRows.length === 0 ? (
        <p className="mt-1 text-sm text-ink/55">No invoices yet.</p>
      ) : (
        <ul className="mt-1 divide-y divide-ink/10 text-sm">
          {vendorRows.map(({ vendor, spend, outstanding }) => (
            <li key={vendor.id} className="flex justify-between py-1.5">
              <span className="text-ink">{vendor.name}</span>
              <span className="text-ink/60">
                {formatINR(spend)} billed · {formatINR(outstanding)} open
              </span>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
