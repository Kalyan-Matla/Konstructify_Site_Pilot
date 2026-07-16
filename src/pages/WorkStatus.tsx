import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Camera, CheckCircle2, HardHat, Pencil, Plus, Trash2 } from 'lucide-react';
import type { TaskPhoto, TaskStatus, WorkTask } from '../types';
import { useApp } from '../contexts/AppContext';
import {
  AICard,
  Badge,
  ConfirmDialog,
  EmptyState,
  Field,
  FormError,
  Modal,
  PageHeader,
  ProgressBar,
  SyncBadge,
  inputCls,
} from '../components/ui';
import { suggestWorkStatus } from '../utils/ai-suggestions';
import { daysUntil, formatDate, isoDaysFromNow, todayISO, uid } from '../utils/format';

type Filter = 'all' | TaskStatus;

function progressTone(pct: number): string {
  if (pct >= 75) return 'bg-green-500';
  if (pct >= 50) return 'bg-yellow-500';
  if (pct >= 25) return 'bg-orange-500';
  return 'bg-red-500';
}

/** Resize an image file to ≤800px wide JPEG data URL (keeps localStorage small). */
function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(800 / img.width, 1);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('canvas unsupported'));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = () => reject(new Error('bad image'));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error('read failed'));
    reader.readAsDataURL(file);
  });
}

export default function WorkStatus() {
  const { state, upsert, remove } = useApp();
  const [filter, setFilter] = useState<Filter>('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [editing, setEditing] = useState<WorkTask | 'new' | null>(null);
  const [viewing, setViewing] = useState<string | null>(null); // task id (live lookup)
  const [deleting, setDeleting] = useState<WorkTask | null>(null);

  const tasks = state.tasks.filter(
    (t) =>
      (filter === 'all' || t.status === filter) &&
      (projectFilter === 'all' || t.projectId === projectFilter),
  );
  const viewingTask = viewing ? state.tasks.find((t) => t.id === viewing) ?? null : null;

  return (
    <div>
      <PageHeader
        title="Work Status"
        subtitle="On-site progress, photos and completion tracking"
        action={
          <button
            type="button"
            onClick={() => setEditing('new')}
            className="btn-primary flex items-center gap-1.5"
          >
            <Plus size={16} aria-hidden="true" /> New task
          </button>
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
          {state.projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {tasks.length === 0 ? (
        <EmptyState
          icon={HardHat}
          title="No tasks yet"
          message="Add a site task to track progress, capture photos and flag delays before they slip."
          action={{ label: 'New task', onClick: () => setEditing('new') }}
        />
      ) : (
        <div className="stagger grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {tasks.map((t) => {
            const overdue = t.status !== 'complete' && daysUntil(t.dueDate) < 0;
            return (
              <div key={t.id} className="panel panel-hover p-4">
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setViewing(t.id)}
                    className="text-left font-semibold text-ink hover:text-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {t.name}
                  </button>
                  {t.status === 'complete' ? (
                    <Badge tone="green">done</Badge>
                  ) : overdue ? (
                    <Badge tone="red">overdue</Badge>
                  ) : (
                    <Badge tone={t.status === 'in-progress' ? 'blue' : 'gray'}>{t.status}</Badge>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-ink/55">
                  {t.phase} · {t.assignedTo} · {t.photos.length} photo{t.photos.length === 1 ? '' : 's'}
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
                    <button type="button" onClick={() => setEditing(t)} aria-label={`Edit ${t.name}`} className="rounded p-1.5 text-ink/55 hover:bg-paper-soft hover:text-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500">
                      <Pencil size={16} />
                    </button>
                    <button type="button" onClick={() => setDeleting(t)} aria-label={`Delete ${t.name}`} className="rounded p-1.5 text-ink/55 hover:bg-paper-soft hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-amber-500">
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
          message={`"${deleting.name}" and its ${deleting.photos.length} photo(s) will be removed.`}
          confirmLabel="Delete"
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            remove('task', deleting.id, `Task "${deleting.name}" deleted`);
            setDeleting(null);
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
  const [name, setName] = useState(task?.name ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [assignedTo, setAssignedTo] = useState(task?.assignedTo ?? '');
  const [phase, setPhase] = useState(task?.phase ?? 'Foundation');
  const [projectId, setProjectId] = useState(task?.projectId ?? state.projects[0]?.id ?? '');
  const [dueDate, setDueDate] = useState(task?.dueDate ?? isoDaysFromNow(14));
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
      photos: task?.photos ?? [],
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
              {state.projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Due date" htmlFor="tk-due">
            <input id="tk-due" type="date" className={inputCls} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
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
  const { state, upsert } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);
  const [aiDismissed, setAiDismissed] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const project = state.projects.find((p) => p.id === task.projectId);
  const ai = suggestWorkStatus(task);
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
    );
  };

  const addPhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await resizeImage(file);
      const photo: TaskPhoto = {
        id: uid('ph'),
        dataUrl,
        caption: file.name,
        timestamp: new Date().toISOString(),
      };
      upsert('task', { ...task, photos: [...task.photos, photo] }, `Photo added to "${task.name}"`);
      setUploadError('');
    } catch {
      setUploadError('Could not read that image. Try a different file.');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const removePhoto = (photoId: string) => {
    upsert(
      'task',
      { ...task, photos: task.photos.filter((p) => p.id !== photoId) },
      `Photo removed from "${task.name}"`,
    );
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
          className="w-full accent-amber-500"
        />
        <ProgressBar percent={task.percentComplete} tone={progressTone(task.percentComplete)} />
      </div>

      {ai && !aiDismissed && (
        <div className="mt-4">
          <AICard suggestion={ai} onDismiss={() => setAiDismissed(true)} />
        </div>
      )}

      <div className="mt-4 flex items-center justify-between">
        <h3 className="text-sm font-bold text-ink">Photos ({task.photos.length})</h3>
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
      </div>
      {uploadError && <p role="alert" className="mt-1 text-xs text-red-600">{uploadError}</p>}
      {task.photos.length === 0 ? (
        <p className="mt-2 text-sm text-ink/55">No photos yet — capture progress from the site.</p>
      ) : (
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {task.photos.map((p) => (
            <figure key={p.id} className="relative">
              <img src={p.dataUrl} alt={p.caption || 'Site photo'} className="h-24 w-full rounded object-cover" />
              <figcaption className="mt-0.5 truncate text-[10px] text-ink/55">
                {formatDate(p.timestamp)}
              </figcaption>
              <button
                type="button"
                onClick={() => removePhoto(p.id)}
                aria-label="Delete photo"
                className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <Trash2 size={12} />
              </button>
            </figure>
          ))}
        </div>
      )}

      {task.status !== 'complete' && (
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
