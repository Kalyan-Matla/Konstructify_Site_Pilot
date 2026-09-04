import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Camera, CheckCircle2, HardHat, Pencil, Plus, Trash2 } from 'lucide-react';
import type { TaskStatus, WorkTask } from '../types';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import {
  AICard,
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
import { suggestWorkStatus } from '../utils/ai-suggestions';
import { daysUntil, formatDate, isoDaysFromNow, todayISO, uid } from '../utils/format';
import { useRouteAction } from '../hooks/useRouteAction';
import { usePhotoUpload } from '../hooks/usePhotoUpload';
import { useBulkSelect } from '../hooks/useBulkSelect';
import { useBulkDelete } from '../hooks/useBulkDelete';

type Filter = 'all' | TaskStatus;

function progressTone(pct: number): string {
  if (pct >= 75) return 'bg-green-500';
  if (pct >= 50) return 'bg-yellow-500';
  if (pct >= 25) return 'bg-orange-500';
  return 'bg-red-500';
}

export default function WorkStatus() {
  const { state, upsert, remove } = useApp();
  const { can, canReachProject } = useAuth();
  const { toast } = useToast();
  const manage = can('work-status:manage');
  const mayUpdate = can('work-status:update');
  const [filter, setFilter] = useState<Filter>('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [editing, setEditing] = useState<WorkTask | 'new' | null>(null);
  const [viewing, setViewing] = useState<string | null>(null); // task id (live lookup)
  const [deleting, setDeleting] = useState<WorkTask | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const { selected, toggle, clear, setAll } = useBulkSelect();
  const bulkDelete = useBulkDelete<WorkTask>('task', 'task');

  useRouteAction({ openNew: () => { if (manage) setEditing('new'); }, openView: (id) => setViewing(id) });

  // Layer 3 — only tasks on assigned projects.
  const tasks = state.tasks.filter(
    (t) =>
      canReachProject(t.projectId) &&
      (filter === 'all' || t.status === filter) &&
      (projectFilter === 'all' || t.projectId === projectFilter),
  );
  const viewingTask = viewing
    ? state.tasks.find((t) => t.id === viewing && canReachProject(t.projectId)) ?? null
    : null;

  /** Photos now live on the project, tagged with a taskId — so the same
   *  photo appears in the task and in the project gallery (Block B). */
  const photoCountFor = (taskId: string) =>
    state.photos.filter((ph) => ph.taskId === taskId).length;

  const bulkMarkComplete = () => {
    const items = state.tasks.filter((t) => selected.has(t.id) && t.status !== 'complete');
    if (items.length === 0) return;
    for (const t of items) {
      upsert('task', { ...t, status: 'complete', percentComplete: 100 }, `Task "${t.name}" completed`, { silent: true });
    }
    toast(`${items.length} task${items.length === 1 ? '' : 's'} marked complete`, { tone: 'success' });
    clear();
  };

  return (
    <div>
      <PageHeader
        title="Work Status"
        subtitle="On-site progress, photos and completion tracking"
        action={
          manage ? (
            <button
              type="button"
              onClick={() => setEditing('new')}
              className="btn-primary flex items-center gap-1.5"
            >
              <Plus size={16} aria-hidden="true" /> New task
            </button>
          ) : undefined
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(['all', 'pending', 'in-progress', 'complete'] as const).map((f) => (
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
        <select
          aria-label="Filter by project"
          className="ml-auto rounded-xl border border-ink/15 bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
        >
          <option value="all">All projects</option>
          {state.projects.filter((p) => canReachProject(p.id)).map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {(manage || mayUpdate) && tasks.length > 0 && (
        <div className="mb-4 flex justify-end">
          <SelectAllToggle
            checked={tasks.every((t) => selected.has(t.id))}
            onChange={() => setAll(tasks.every((t) => selected.has(t.id)) ? [] : tasks.map((t) => t.id))}
            label="Select all"
          />
        </div>
      )}

      <BulkBar count={selected.size} itemLabel="task" onClear={clear}>
        {mayUpdate && (
          <button type="button" onClick={bulkMarkComplete} className="btn-success btn-sm flex items-center gap-1.5">
            <CheckCircle2 size={14} aria-hidden="true" /> Mark complete
          </button>
        )}
        {manage && (
          <button
            type="button"
            onClick={() => setBulkDeleting(true)}
            className="flex items-center gap-1.5 rounded-xl bg-red-600 px-3 py-1.5 text-xs font-bold text-white transition-[transform,background-color] duration-200 ease-out hover:bg-red-500 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >
            <Trash2 size={14} aria-hidden="true" /> Delete
          </button>
        )}
      </BulkBar>

      {tasks.length === 0 ? (
        <EmptyState
          icon={HardHat}
          title="No tasks yet"
          message="Add a site task to track progress, capture photos and flag delays before they slip."
          action={manage ? { label: 'New task', onClick: () => setEditing('new') } : undefined}
        />
      ) : (
        <div className="stagger grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {tasks.map((t) => {
            const overdue = t.status !== 'complete' && daysUntil(t.dueDate) < 0;
            return (
              <div
                key={t.id}
                className={`panel panel-hover p-4 ${selected.has(t.id) ? 'ring-2 ring-amber-500' : ''}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-start gap-2">
                    {(manage || mayUpdate) && (
                      <BulkCheckbox
                        checked={selected.has(t.id)}
                        onChange={() => toggle(t.id)}
                        ariaLabel={`Select ${t.name} for bulk actions`}
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => setViewing(t.id)}
                      className="text-left font-semibold text-ink hover:text-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      {t.name}
                    </button>
                  </div>
                  {t.status === 'complete' ? (
                    <Badge tone="green">done</Badge>
                  ) : overdue ? (
                    <Badge tone="red">overdue</Badge>
                  ) : (
                    <Badge tone={t.status === 'in-progress' ? 'blue' : 'gray'}>{t.status}</Badge>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-ink/55">
                  {t.phase} · {t.assignedTo} · {photoCountFor(t.id)} photo{photoCountFor(t.id) === 1 ? '' : 's'}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1">
                    <ProgressBar percent={t.percentComplete} tone={progressTone(t.percentComplete)} />
                  </div>
                  <span className="text-xs font-semibold text-ink/80">{t.percentComplete}%</span>
                </div>
                <p className="mt-1.5 text-xs text-ink/55">Due {formatDate(t.dueDate)}</p>
                <div className="mt-2 flex items-center justify-between">
                  <SyncBadge entity="task" id={t.id} />
                  <div className="flex gap-1">
                    {manage && (
                      <>
                        <button type="button" onClick={() => setEditing(t)} aria-label={`Edit ${t.name}`} className="rounded p-1.5 text-ink/55 hover:bg-paper-soft hover:text-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500">
                          <Pencil size={16} />
                        </button>
                        <button type="button" onClick={() => setDeleting(t)} aria-label={`Delete ${t.name}`} className="rounded p-1.5 text-ink/55 hover:bg-paper-soft hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-amber-500">
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <TaskForm
          task={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSave={(t) => {
            upsert('task', t, `Task "${t.name}" ${editing === 'new' ? 'created' : 'updated'}`);
            setEditing(null);
          }}
        />
      )}
      {viewingTask && <TaskDetail task={viewingTask} onClose={() => setViewing(null)} />}
      {deleting && (
        <ConfirmDialog
          title="Delete task?"
          message={`"${deleting.name}" will be removed. Its ${photoCountFor(deleting.id)} photo(s) stay in the project gallery.`}
          confirmLabel="Delete"
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            remove('task', deleting.id, `Task "${deleting.name}" deleted`);
            setDeleting(null);
          }}
        />
      )}

      {bulkDeleting && (
        <ConfirmDialog
          title={`Delete ${selected.size} task${selected.size === 1 ? '' : 's'}?`}
          message="Their photos will be removed too. This can be undone from the confirmation toast."
          confirmLabel={`Delete ${selected.size}`}
          onCancel={() => setBulkDeleting(false)}
          onConfirm={() => {
            const items = state.tasks.filter((t) => selected.has(t.id));
            bulkDelete(items, (t) => `Task "${t.name}" deleted`);
            setBulkDeleting(false);
            clear();
          }}
        />
      )}
    </div>
  );
}

function TaskForm({
  task,
  onClose,
  onSave,
}: {
  task: WorkTask | null;
  onClose: () => void;
  onSave: (t: WorkTask) => void;
}) {
  const { state } = useApp();
  const { canReachProject } = useAuth();
  const projects = state.projects.filter((p) => canReachProject(p.id));
  const [name, setName] = useState(task?.name ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [assignedTo, setAssignedTo] = useState(task?.assignedTo ?? '');
  const [phase, setPhase] = useState(task?.phase ?? 'Foundation');
  const [projectId, setProjectId] = useState(task?.projectId ?? projects[0]?.id ?? '');
  const [dueDate, setDueDate] = useState(task?.dueDate ?? isoDaysFromNow(14));
  const [zoneId, setZoneId] = useState(task?.zoneId ?? '');
  const [budgetItemId, setBudgetItemId] = useState(task?.budgetItemId ?? '');
  const [error, setError] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !assignedTo.trim()) return setError('Task name and assignee are required.');
    onSave({
      id: task?.id ?? uid('t'),
      projectId,
      name: name.trim(),
      description: description.trim(),
      phase,
      assignedTo: assignedTo.trim(),
      status: task?.status ?? 'pending',
      dueDate,
      percentComplete: task?.percentComplete ?? 0,
      budgetItemId: budgetItemId || null,
      zoneId: zoneId || null,
      createdAt: task?.createdAt ?? todayISO(),
    });
  };

  return (
    <Modal title={task ? 'Edit task' : 'New task'} onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <FormError message={error} />
        <Field label="Task name" htmlFor="tk-name" required>
          <input id="tk-name" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field label="Description" htmlFor="tk-desc">
          <input id="tk-desc" className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <div className="grid grid-cols-1 gap-x-3 sm:grid-cols-2">
          <Field label="Assigned to" htmlFor="tk-assignee" required>
            <input id="tk-assignee" className={inputCls} value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} required />
          </Field>
          <Field label="Phase" htmlFor="tk-phase">
            <select id="tk-phase" className={inputCls} value={phase} onChange={(e) => setPhase(e.target.value)}>
              {['Foundation', 'Structure', 'MEP', 'Finishing'].map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </Field>
          <Field label="Project" htmlFor="tk-project">
            <select id="tk-project" className={inputCls} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Due date" htmlFor="tk-due">
            <input id="tk-due" type="date" className={inputCls} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </Field>
          <Field label="BOQ line" htmlFor="tk-boq">
            <select id="tk-boq" className={inputCls} value={budgetItemId} onChange={(e) => setBudgetItemId(e.target.value)}>
              <option value="">Not linked — excluded from weighted progress</option>
              {state.budgetItems.filter((b) => b.projectId === projectId).map((b) => (
                <option key={b.id} value={b.id}>{b.description}</option>
              ))}
            </select>
          </Field>
          <Field label="Zone" htmlFor="tk-zone">
            <select id="tk-zone" className={inputCls} value={zoneId} onChange={(e) => setZoneId(e.target.value)}>
              <option value="">Not mapped to a zone</option>
              {state.zones.filter((z) => z.projectId === projectId).map((z) => (
                <option key={z.id} value={z.id}>{z.name}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button type="submit" className="btn-primary">
            Save task
          </button>
        </div>
      </form>
    </Modal>
  );
}

function TaskDetail({ task, onClose }: { task: WorkTask; onClose: () => void }) {
  const { state, upsert, remove } = useApp();
  const { can } = useAuth();
  const mayUpdate = can('work-status:update');
  const mayAddPhoto = can('project-photos:add');
  const mayDeletePhoto = can('project-photos:delete');
  const photos = state.photos.filter((ph) => ph.taskId === task.id);
  const { upload, error: uploadError } = usePhotoUpload({
    projectId: task.projectId,
    taskId: task.id,
    zoneId: task.zoneId,
    label: `"${task.name}"`,
  });
  const fileRef = useRef<HTMLInputElement>(null);
  const [aiDismissed, setAiDismissed] = useState(false);
  const project = state.projects.find((p) => p.id === task.projectId);
  const ai = suggestWorkStatus(task, photos.length);
  const overdue = task.status !== 'complete' && daysUntil(task.dueDate) < 0;

  const setPercent = (pct: number) => {
    upsert(
      'task',
      {
        ...task,
        percentComplete: pct,
        status: pct >= 100 ? 'complete' : pct > 0 ? 'in-progress' : task.status,
      },
      `Task "${task.name}" marked ${pct}%`,
      { silent: true },
    );
  };

  const addPhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await upload(file);
    if (fileRef.current) fileRef.current.value = '';
  };

  const removePhoto = (photoId: string) => {
    remove('photo', photoId, `Photo removed from "${task.name}"`);
  };

  return (
    <Modal title={task.name} onClose={onClose}>
      <p className="text-sm text-ink/60">
        {project?.name ?? 'No project'} · {task.phase} · {task.assignedTo}
      </p>
      <p className="mt-0.5 text-sm text-ink/60">{task.description || 'No description.'}</p>
      <p className="mt-1 text-sm">
        Due {formatDate(task.dueDate)}{' '}
        {overdue ? <Badge tone="red">{-daysUntil(task.dueDate)}d overdue</Badge> : task.status !== 'complete' && <Badge tone="green">on track</Badge>}
      </p>

      <div className="mt-4">
        <label htmlFor="tk-pct" className="mb-1 block text-sm font-medium text-ink/80">
          Progress: {task.percentComplete}%
        </label>
        <input
          id="tk-pct"
          type="range"
          min={0}
          max={100}
          step={5}
          value={task.percentComplete}
          onChange={(e) => setPercent(Number(e.target.value))}
          disabled={!mayUpdate}
          className="w-full accent-amber-500 disabled:cursor-not-allowed disabled:opacity-40"
        />
        <ProgressBar percent={task.percentComplete} tone={progressTone(task.percentComplete)} />
      </div>

      {ai && !aiDismissed && (
        <div className="mt-4">
          <AICard suggestion={ai} onDismiss={() => setAiDismissed(true)} />
        </div>
      )}

      <div className="mt-4 flex items-center justify-between">
        <h3 className="text-sm font-bold text-ink">Photos ({photos.length})</h3>
        {mayAddPhoto && (
          <div>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={addPhoto} aria-label="Upload site photo" />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="btn-ghost btn-sm flex items-center gap-1.5"
            >
              <Camera size={14} aria-hidden="true" /> Add photo
            </button>
          </div>
        )}
      </div>
      {uploadError && <p role="alert" className="mt-1 text-xs text-red-600">{uploadError}</p>}
      {photos.length === 0 ? (
        <p className="mt-2 text-sm text-ink/55">No photos yet — capture progress from the site.</p>
      ) : (
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {photos.map((p) => (
            <figure key={p.id} className="relative">
              <img src={p.src} alt={p.caption || 'Site photo'} className="h-24 w-full rounded object-cover" />
              <figcaption className="mt-0.5 truncate text-[10px] text-ink/55">
                {formatDate(p.timestamp)}
              </figcaption>
              {mayDeletePhoto && (
                <button
                  type="button"
                  onClick={() => removePhoto(p.id)}
                  aria-label="Delete photo"
                  className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </figure>
          ))}
        </div>
      )}

      {mayUpdate && task.status !== 'complete' && (
        <button
          type="button"
          onClick={() => {
            upsert('task', { ...task, status: 'complete', percentComplete: 100 }, `Task "${task.name}" completed`);
            onClose();
          }}
          className="btn-success mt-4 flex w-full items-center justify-center gap-2"
        >
          <CheckCircle2 size={16} aria-hidden="true" /> Mark complete
        </button>
      )}
    </Modal>
  );
}
