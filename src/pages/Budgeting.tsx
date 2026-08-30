import { useState, type FormEvent } from 'react';
import { IndianRupee, Pencil, Plus, Trash2 } from 'lucide-react';
import type { BudgetItem } from '../types';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
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
  SyncBadge,
  inputCls,
} from '../components/ui';
import { suggestBudget } from '../utils/ai-suggestions';
import { formatINR, uid } from '../utils/format';
import { useRouteAction } from '../hooks/useRouteAction';
import { useBulkSelect } from '../hooks/useBulkSelect';
import { useBulkDelete } from '../hooks/useBulkDelete';

const UNITS = ['LS', 'm³', 'sqft', 'MT', 'bags', 'pcs', 'days'];

export default function Budgeting() {
  const { state, upsert, remove } = useApp();
  const { can, canReachProject } = useAuth();
  const manage = can('budgeting:manage');
  // Layer 3 — only assigned projects are selectable or visible here.
  const reachableProjects = state.projects.filter((p) => canReachProject(p.id));
  const [projectId, setProjectId] = useState(reachableProjects[0]?.id ?? '');
  const [editing, setEditing] = useState<BudgetItem | 'new' | null>(null);
  const [deleting, setDeleting] = useState<BudgetItem | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [aiDismissed, setAiDismissed] = useState(false);
  const { selected, toggle, clear, setAll } = useBulkSelect();
  const bulkDelete = useBulkDelete<BudgetItem>('budgetItem', 'BOQ item');

  useRouteAction({ openNew: () => { if (manage) setEditing('new'); } });

  const project = state.projects.find((p) => p.id === projectId);
  const items = state.budgetItems.filter((b) => b.projectId === projectId);
  const totalEstimate = items.reduce((s, b) => s + b.quantity * b.unitRate, 0);
  const totalActual = items.reduce((s, b) => s + b.actualSpend, 0);
  const totalVariance = totalActual - totalEstimate;
  const ai = suggestBudget(projectId, state.budgetItems);

  return (
    <div>
      <PageHeader
        title="Budgeting"
        subtitle="BOQ estimates vs. actual spend"
        action={
          manage ? (
            <button
              type="button"
              onClick={() => setEditing('new')}
              className="btn-primary flex items-center gap-1.5"
            >
              <Plus size={16} aria-hidden="true" /> New BOQ item
            </button>
          ) : undefined
        }
      />

      <div className="mb-4">
        <label htmlFor="bq-project" className="mr-2 text-sm text-ink/60">Project</label>
        <select
          id="bq-project"
          className="rounded-xl border border-ink/15 bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          value={projectId}
          onChange={(e) => {
            setProjectId(e.target.value);
            clear();
          }}
        >
          {reachableProjects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-3">
        <Summary label="BOQ estimate" value={formatINR(totalEstimate)} />
        <Summary label="Actual spend" value={formatINR(totalActual)} />
        <div className="panel panel-hover p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink/55">Variance</p>
          <p className={`mt-1 text-lg font-bold sm:text-xl ${totalVariance > 0 ? 'text-red-600' : 'text-green-700'}`}>
            {totalVariance > 0 ? '+' : ''}{formatINR(totalVariance)}
          </p>
        </div>
      </div>

      {ai && !aiDismissed && <AICard suggestion={ai} onDismiss={() => setAiDismissed(true)} />}

      <BulkBar count={selected.size} itemLabel="BOQ item" onClear={clear}>
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

      {items.length === 0 ? (
        <EmptyState
          icon={IndianRupee}
          title="No BOQ items yet"
          message={`Add a bill-of-quantities line for ${project?.name ?? 'this project'} to track estimate against actual spend.`}
          action={manage ? { label: 'New BOQ item', onClick: () => setEditing('new') } : undefined}
        />
      ) : (
        <div className="overflow-x-auto panel">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-ink/10 bg-paper-soft text-left text-[11px] font-bold uppercase tracking-wider text-ink/60">
                <th scope="col" className="w-10 px-4 py-2.5">
                  {manage && (
                  <BulkCheckbox
                    checked={items.length > 0 && items.every((b) => selected.has(b.id))}
                    onChange={() =>
                      setAll(items.every((b) => selected.has(b.id)) ? [] : items.map((b) => b.id))
                    }
                    ariaLabel="Select all BOQ items"
                  />
                  )}
                </th>
                <th scope="col" className="px-4 py-2.5">Item</th>
                <th scope="col" className="px-4 py-2.5 text-right">Qty</th>
                <th scope="col" className="px-4 py-2.5 text-right">Rate</th>
                <th scope="col" className="px-4 py-2.5 text-right">Estimate</th>
                <th scope="col" className="px-4 py-2.5 text-right">Actual</th>
                <th scope="col" className="px-4 py-2.5 text-right">Variance</th>
                <th scope="col" className="px-4 py-2.5"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {items.map((b) => {
                const estimate = b.quantity * b.unitRate;
                const variance = b.actualSpend - estimate;
                const pct = estimate > 0 ? (variance / estimate) * 100 : 0;
                const overrun = estimate > 0 && variance > 0.1 * estimate;
                return (
                  <tr
                    key={b.id}
                    className={`border-b border-ink/10 transition-colors last:border-0 hover:bg-paper-soft ${selected.has(b.id) ? 'bg-amber-50' : ''}`}
                  >
                    <td className="px-4 py-2.5">
                      {manage && (
                        <BulkCheckbox
                          checked={selected.has(b.id)}
                          onChange={() => toggle(b.id)}
                          ariaLabel={`Select ${b.description} for bulk actions`}
                        />
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-ink">{b.description}</p>
                      <SyncBadge entity="budgetItem" id={b.id} />
                    </td>
                    <td className="num px-4 py-2.5 text-right text-ink/60">{b.quantity} {b.unit}</td>
                    <td className="num px-4 py-2.5 text-right text-ink/60">₹{b.unitRate.toLocaleString('en-IN')}</td>
                    <td className="num px-4 py-2.5 text-right text-ink">{formatINR(estimate)}</td>
                    <td className="num px-4 py-2.5 text-right text-ink">{formatINR(b.actualSpend)}</td>
                    <td className="px-4 py-2.5 text-right">
                      {b.actualSpend === 0 ? (
                        <Badge tone="gray">not started</Badge>
                      ) : overrun ? (
                        <Badge tone="red">+{pct.toFixed(0)}% overrun</Badge>
                      ) : variance > 0 ? (
                        <Badge tone="yellow">+{pct.toFixed(0)}%</Badge>
                      ) : (
                        <Badge tone="green">{pct.toFixed(0)}%</Badge>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {manage && (
                      <div className="flex gap-1">
                        <button type="button" onClick={() => setEditing(b)} aria-label={`Edit ${b.description}`} className="rounded p-1.5 text-ink/55 hover:bg-paper-soft hover:text-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500">
                          <Pencil size={15} />
                        </button>
                        <button type="button" onClick={() => setDeleting(b)} aria-label={`Delete ${b.description}`} className="rounded p-1.5 text-ink/55 hover:bg-paper-soft hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-amber-500">
                          <Trash2 size={15} />
                        </button>
                      </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <BudgetForm
          item={editing === 'new' ? null : editing}
          projectId={projectId}
          onClose={() => setEditing(null)}
          onSave={(b) => {
            upsert('budgetItem', b, `BOQ item "${b.description}" ${editing === 'new' ? 'created' : 'updated'}`);
            setEditing(null);
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Delete BOQ item?"
          message={`"${deleting.description}" will be removed from the BOQ.`}
          confirmLabel="Delete"
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            remove('budgetItem', deleting.id, `BOQ item "${deleting.description}" deleted`);
            setDeleting(null);
          }}
        />
      )}

      {bulkDeleting && (
        <ConfirmDialog
          title={`Delete ${selected.size} BOQ item${selected.size === 1 ? '' : 's'}?`}
          message="They'll be removed from this project's BOQ. This can be undone from the confirmation toast."
          confirmLabel={`Delete ${selected.size}`}
          onCancel={() => setBulkDeleting(false)}
          onConfirm={() => {
            const toRemove = items.filter((b) => selected.has(b.id));
            bulkDelete(toRemove, (b) => `BOQ item "${b.description}" deleted`);
            setBulkDeleting(false);
            clear();
          }}
        />
      )}
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel panel-hover p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-ink/55">{label}</p>
      <p className="mt-1 text-lg font-bold text-ink sm:text-xl">{value}</p>
    </div>
  );
}

function BudgetForm({
  item,
  projectId,
  onClose,
  onSave,
}: {
  item: BudgetItem | null;
  projectId: string;
  onClose: () => void;
  onSave: (b: BudgetItem) => void;
}) {
  const [description, setDescription] = useState(item?.description ?? '');
  const [quantity, setQuantity] = useState(item ? String(item.quantity) : '1');
  const [unit, setUnit] = useState(item?.unit ?? 'LS');
  const [unitRate, setUnitRate] = useState(item ? String(item.unitRate) : '');
  const [actualSpend, setActualSpend] = useState(item ? String(item.actualSpend) : '0');
  const [error, setError] = useState('');

  const qty = Number(quantity) || 0;
  const rate = Number(unitRate) || 0;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return setError('Description is required.');
    if (qty <= 0 || rate <= 0) return setError('Quantity and rate must be greater than 0.');
    onSave({
      id: item?.id ?? uid('b'),
      projectId: item?.projectId ?? projectId,
      description: description.trim(),
      quantity: qty,
      unit,
      unitRate: rate,
      actualSpend: Math.max(Number(actualSpend) || 0, 0),
    });
  };

  return (
    <Modal title={item ? 'Edit BOQ item' : 'New BOQ item'} onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <FormError message={error} />
        <Field label="Item description" htmlFor="bq-desc" required>
          <input id="bq-desc" className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} required />
        </Field>
        <div className="grid grid-cols-2 gap-x-3">
          <Field label="Quantity" htmlFor="bq-qty" required>
            <input id="bq-qty" type="number" min="0.1" step="any" className={inputCls} value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
          </Field>
          <Field label="Unit" htmlFor="bq-unit">
            <select id="bq-unit" className={inputCls} value={unit} onChange={(e) => setUnit(e.target.value)}>
              {UNITS.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </Field>
          <Field label="Unit rate (₹)" htmlFor="bq-rate" required>
            <input id="bq-rate" type="number" min="1" className={inputCls} value={unitRate} onChange={(e) => setUnitRate(e.target.value)} required />
          </Field>
          <Field label="Actual spend so far (₹)" htmlFor="bq-actual">
            <input id="bq-actual" type="number" min="0" className={inputCls} value={actualSpend} onChange={(e) => setActualSpend(e.target.value)} />
          </Field>
        </div>
        <p className="mb-2 text-sm text-ink/60">
          Total estimate: <strong>{formatINR(qty * rate)}</strong>
        </p>
        <div className="mt-2 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button type="submit" className="btn-primary">
            Save item
          </button>
        </div>
      </form>
    </Modal>
  );
}
