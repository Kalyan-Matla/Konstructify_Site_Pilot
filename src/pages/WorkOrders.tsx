import { useState, type FormEvent } from 'react';
import { CheckCircle2, ClipboardList, Pencil, Plus, Trash2 } from 'lucide-react';
import type { Priority, TaskStatus, WorkOrder } from '../types';
import { useApp } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';
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
  SelectAllToggle,
  SyncBadge,
  inputCls,
} from '../components/ui';
import { daysUntil, formatDate, isoDaysFromNow, uid } from '../utils/format';
import { useRouteAction } from '../hooks/useRouteAction';
import { useBulkSelect } from '../hooks/useBulkSelect';
import { useBulkDelete } from '../hooks/useBulkDelete';

type Filter = 'all' | TaskStatus | 'overdue';

export default function WorkOrders() {
  const { state, upsert, remove } = useApp();
  const { toast } = useToast();
  const [filter, setFilter] = useState<Filter>('all');
  const [editing, setEditing] = useState<WorkOrder | 'new' | null>(null);
  const [deleting, setDeleting] = useState<WorkOrder | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const { selected, toggle, clear, setAll } = useBulkSelect();
  const bulkDelete = useBulkDelete<WorkOrder>('workOrder', 'work order');

  useRouteAction({ openNew: () => setEditing('new') });

  const orders = state.workOrders.filter((w) => {
    if (filter === 'all') return true;
    if (filter === 'overdue') return w.status !== 'complete' && daysUntil(w.dueDate) < 0;
    return w.status === filter;
  });

  const markComplete = (w: WorkOrder) => {
    upsert('workOrder', { ...w, status: 'complete' }, `Work order ${w.orderNumber} completed`);
  };

  const bulkMarkComplete = () => {
    const items = state.workOrders.filter((w) => selected.has(w.id) && w.status !== 'complete');
    if (items.length === 0) return;
    for (const w of items) {
      upsert('workOrder', { ...w, status: 'complete' }, `Work order ${w.orderNumber} completed`, { silent: true });
    }
    toast(`${items.length} work order${items.length === 1 ? '' : 's'} marked complete`, { tone: 'success' });
    clear();
  };

  return (
    <div>
      <PageHeader
        title="Work Orders"
        subtitle="Create, assign and track handoffs"
        action={
          <button
            type="button"
            onClick={() => setEditing('new')}
            className="btn-primary flex items-center gap-1.5"
          >
            <Plus size={16} aria-hidden="true" /> New work order
          </button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter work orders">
          {(['all', 'pending', 'in-progress', 'complete', 'overdue'] as const).map((f) => (
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
        {orders.length > 0 && (
          <SelectAllToggle
            checked={orders.every((w) => selected.has(w.id))}
            onChange={() => setAll(orders.every((w) => selected.has(w.id)) ? [] : orders.map((w) => w.id))}
            label="Select all"
          />
        )}
      </div>

      <BulkBar count={selected.size} itemLabel="work order" onClear={clear}>
        <button type="button" onClick={bulkMarkComplete} className="btn-success btn-sm flex items-center gap-1.5">
          <CheckCircle2 size={14} aria-hidden="true" /> Mark complete
        </button>
        <button
          type="button"
          onClick={() => setBulkDeleting(true)}
          className="flex items-center gap-1.5 rounded-xl bg-red-600 px-3 py-1.5 text-xs font-bold text-white transition-[transform,background-color] duration-200 ease-out hover:bg-red-500 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
        >
          <Trash2 size={14} aria-hidden="true" /> Delete
        </button>
      </BulkBar>

      {orders.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No work orders"
          message="Create a work order to assign a task, set its priority and track the handoff to completion."
          action={{ label: 'New work order', onClick: () => setEditing('new') }}
        />
      ) : (
        <div className="stagger space-y-2">
          {orders.map((w) => {
            const project = state.projects.find((p) => p.id === w.projectId);
            const overdue = w.status !== 'complete' && daysUntil(w.dueDate) < 0;
            return (
              <div
                key={w.id}
                className={`panel panel-hover p-3 sm:p-4 ${selected.has(w.id) ? 'ring-2 ring-amber-500' : ''}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 items-start gap-2">
                    <BulkCheckbox
                      checked={selected.has(w.id)}
                      onChange={() => toggle(w.id)}
                      ariaLabel={`Select ${w.orderNumber} for bulk actions`}
                    />
                    <div className="min-w-0">
                      <p className="font-semibold text-ink">
                        {w.orderNumber} · {w.taskName}
                      </p>
                      <p className="truncate text-xs text-ink/55">
                        {project?.name ?? 'No project'} · assigned to {w.assignee}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={w.priority === 'High' ? 'red' : w.priority === 'Medium' ? 'yellow' : 'gray'}>
                      {w.priority}
                    </Badge>
                    {w.status === 'complete' ? (
                      <Badge tone="green">complete</Badge>
                    ) : overdue ? (
                      <Badge tone="red">overdue</Badge>
                    ) : (
                      <Badge tone={w.status === 'in-progress' ? 'blue' : 'gray'}>{w.status}</Badge>
                    )}
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-ink/60">
                  <span>Due {formatDate(w.dueDate)}</span>
                  <SyncBadge entity="workOrder" id={w.id} />
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {w.status !== 'complete' && (
                    <button
                      type="button"
                      onClick={() => markComplete(w)}
                      className="btn-success btn-sm flex items-center gap-1"
                    >
                      <CheckCircle2 size={14} aria-hidden="true" /> Mark complete
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setEditing(w)}
                    className="btn-ghost btn-sm flex items-center gap-1"
                  >
                    <Pencil size={14} aria-hidden="true" /> Edit / reassign
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleting(w)}
                    aria-label={`Delete ${w.orderNumber}`}
                    className="btn-ghost btn-sm flex items-center gap-1 hover:text-red-600"
                  >
                    <Trash2 size={14} aria-hidden="true" /> Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <WorkOrderForm
          order={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSave={(w) => {
            upsert('workOrder', w, `Work order ${w.orderNumber} ${editing === 'new' ? 'created' : 'updated'} — assigned to ${w.assignee}`);
            setEditing(null);
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Delete work order?"
          message={`${deleting.orderNumber} "${deleting.taskName}" will be removed.`}
          confirmLabel="Delete"
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            remove('workOrder', deleting.id, `Work order ${deleting.orderNumber} deleted`);
            setDeleting(null);
          }}
        />
      )}

      {bulkDeleting && (
        <ConfirmDialog
          title={`Delete ${selected.size} work order${selected.size === 1 ? '' : 's'}?`}
          message="This can be undone from the confirmation toast."
          confirmLabel={`Delete ${selected.size}`}
          onCancel={() => setBulkDeleting(false)}
          onConfirm={() => {
            const items = state.workOrders.filter((w) => selected.has(w.id));
            bulkDelete(items, (w) => `Work order ${w.orderNumber} deleted`);
            setBulkDeleting(false);
            clear();
          }}
        />
      )}
    </div>
  );
}

function WorkOrderForm({
  order,
  onClose,
  onSave,
}: {
  order: WorkOrder | null;
  onClose: () => void;
  onSave: (w: WorkOrder) => void;
}) {
  const { state } = useApp();
  const [taskName, setTaskName] = useState(order?.taskName ?? '');
  const [description, setDescription] = useState(order?.description ?? '');
  const [assignee, setAssignee] = useState(order?.assignee ?? '');
  const [priority, setPriority] = useState<Priority>(order?.priority ?? 'Medium');
  const [projectId, setProjectId] = useState(order?.projectId ?? state.projects[0]?.id ?? '');
  const [dueDate, setDueDate] = useState(order?.dueDate ?? isoDaysFromNow(7));
  const [status, setStatus] = useState<TaskStatus>(order?.status ?? 'pending');
  const [error, setError] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!taskName.trim() || !assignee.trim()) return setError('Task name and assignee are required.');
    onSave({
      id: order?.id ?? uid('w'),
      orderNumber: order?.orderNumber ?? `WO-${String(state.workOrders.length + 1).padStart(3, '0')}`,
      projectId,
      taskName: taskName.trim(),
      description: description.trim(),
      assignee: assignee.trim(),
      priority,
      dueDate,
      status,
    });
  };

  return (
    <Modal title={order ? `Edit ${order.orderNumber}` : 'New work order'} onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <FormError message={error} />
        <Field label="Task name" htmlFor="wo-name" required>
          <input id="wo-name" className={inputCls} value={taskName} onChange={(e) => setTaskName(e.target.value)} required />
        </Field>
        <Field label="Description" htmlFor="wo-desc">
          <input id="wo-desc" className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <div className="grid grid-cols-1 gap-x-3 sm:grid-cols-2">
          <Field label="Assignee" htmlFor="wo-assignee" required>
            <input id="wo-assignee" className={inputCls} value={assignee} onChange={(e) => setAssignee(e.target.value)} required />
          </Field>
          <Field label="Priority" htmlFor="wo-priority">
            <select id="wo-priority" className={inputCls} value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
          </Field>
          <Field label="Project" htmlFor="wo-project">
            <select id="wo-project" className={inputCls} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              {state.projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Due date" htmlFor="wo-due">
            <input id="wo-due" type="date" className={inputCls} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </Field>
          <Field label="Status" htmlFor="wo-status">
            <select id="wo-status" className={inputCls} value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
              <option value="pending">Pending</option>
              <option value="in-progress">In progress</option>
              <option value="complete">Complete</option>
            </select>
          </Field>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button type="submit" className="btn-primary">
            Save work order
          </button>
        </div>
      </form>
    </Modal>
  );
}
