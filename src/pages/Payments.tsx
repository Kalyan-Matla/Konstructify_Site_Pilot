import { useMemo, useState, type FormEvent } from 'react';
import { addDays, format, parseISO } from 'date-fns';
import { AlertTriangle, CheckCircle2, FileText, Plus, Send, Trash2 } from 'lucide-react';
import type { Invoice, InvoiceStatus, PaymentMode, Vendor } from '../types';
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
  SyncBadge,
  inputCls,
} from '../components/ui';
import { creditAvailable, creditUsagePercent } from '../utils/derive';
import { suggestPayment } from '../utils/ai-suggestions';
import { daysSince, daysUntil, formatDate, formatINR, todayISO, uid } from '../utils/format';

type Filter = 'all' | InvoiceStatus | 'overdue';

function termsDays(vendor: Vendor): number {
  switch (vendor.paymentTerms) {
    case 'COD': return 0;
    case '7-day': return 7;
    case '14-day': return 14;
    case '30-day': return 30;
  }
}

function statusBadge(i: Invoice) {
  if (i.status === 'paid') return <Badge tone="green">settled</Badge>;
  if (i.status === 'payment-sent') return <Badge tone="yellow">awaiting confirm</Badge>;
  if (daysSince(i.dueDate) > 0) return <Badge tone="red">overdue {daysSince(i.dueDate)}d</Badge>;
  return <Badge tone="orange">due in {Math.max(daysUntil(i.dueDate), 0)}d</Badge>;
}

export default function Payments() {
  const { state, upsert, remove } = useApp();
  const [filter, setFilter] = useState<Filter>('all');
  const [creating, setCreating] = useState(false);
  const [paying, setPaying] = useState<Invoice | null>(null);
  const [deleting, setDeleting] = useState<Invoice | null>(null);
  const [aiDismissed, setAiDismissed] = useState(false);

  const invoices = useMemo(
    () =>
      state.invoices
        .filter((i) => {
          if (filter === 'all') return true;
          if (filter === 'overdue') return i.status === 'unpaid' && daysSince(i.dueDate) > 0;
          return i.status === filter;
        })
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [state.invoices, filter],
  );

  const ai = suggestPayment(state.invoices, state.vendors);

  const markPaid = (i: Invoice) => {
    const v = state.vendors.find((x) => x.id === i.vendorId);
    upsert(
      'invoice',
      { ...i, status: 'paid', paymentDate: todayISO() },
      `Invoice ${i.invoiceNumber} marked paid — ${formatINR(i.amount)} credit freed for ${v?.name ?? 'vendor'}`,
    );
  };

  return (
    <div>
      <PageHeader
        title="Payments"
        subtitle="Invoices, NEFT/RTGS scheduling and settlement"
        action={
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="btn-primary flex items-center gap-1.5"
          >
            <Plus size={16} aria-hidden="true" /> New invoice
          </button>
        }
      />

      {ai && !aiDismissed && <AICard suggestion={ai} onDismiss={() => setAiDismissed(true)} />}

      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filter invoices">
        {(['all', 'unpaid', 'overdue', 'payment-sent', 'paid'] as const).map((f) => (
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

      {invoices.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No invoices here"
          message="Log a vendor bill against a project — it draws down their credit and schedules the due date."
          action={{ label: 'New invoice', onClick: () => setCreating(true) }}
        />
      ) : (
        <div className="stagger space-y-2">
          {invoices.map((i) => {
            const vendor = state.vendors.find((v) => v.id === i.vendorId);
            const project = state.projects.find((p) => p.id === i.projectId);
            return (
              <div key={i.id} className="panel panel-hover p-3 sm:p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">
                      {i.invoiceNumber} · {vendor?.name ?? 'Unknown vendor'}
                    </p>
                    <p className="truncate text-xs text-ink/55">
                      {project?.name ?? 'No project'} · {i.notes || 'no notes'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-base font-bold text-ink">{formatINR(i.amount)}</span>
                    {statusBadge(i)}
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-ink/60">
                  <span>
                    Invoiced {formatDate(i.invoiceDate)} · Due {formatDate(i.dueDate)}
                    {i.paymentMode && ` · ${i.paymentMode}`}
                  </span>
                  <SyncBadge entity="invoice" id={i.id} />
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {i.status === 'unpaid' && (
                    <button
                      type="button"
                      onClick={() => setPaying(i)}
                      className="btn-primary btn-sm flex items-center gap-1"
                    >
                      <Send size={14} aria-hidden="true" /> Pay
                    </button>
                  )}
                  {i.status === 'payment-sent' && (
                    <button
                      type="button"
                      onClick={() => markPaid(i)}
                      className="btn-success btn-sm flex items-center gap-1"
                    >
                      <CheckCircle2 size={14} aria-hidden="true" /> Mark paid
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setDeleting(i)}
                    aria-label={`Delete invoice ${i.invoiceNumber}`}
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

      {creating && <InvoiceForm onClose={() => setCreating(false)} />}
      {paying && <PaymentModal invoice={paying} onClose={() => setPaying(null)} />}
      {deleting && (
        <ConfirmDialog
          title="Delete invoice?"
          message={`Invoice ${deleting.invoiceNumber} (${formatINR(deleting.amount)}) will be removed and the vendor's credit freed.`}
          confirmLabel="Delete"
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            remove('invoice', deleting.id, `Invoice ${deleting.invoiceNumber} deleted`);
            setDeleting(null);
          }}
        />
      )}
    </div>
  );
}

function InvoiceForm({ onClose }: { onClose: () => void }) {
  const { state, upsert } = useApp();
  const [vendorId, setVendorId] = useState(state.vendors[0]?.id ?? '');
  const [projectId, setProjectId] = useState(state.projects[0]?.id ?? '');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(todayISO());
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const vendor = state.vendors.find((v) => v.id === vendorId);
  const amt = Number(amount) || 0;
  const available = vendor ? creditAvailable(vendor, state.invoices) : 0;
  const exceeds = vendor !== undefined && amt > available;
  const alternative =
    exceeds && vendor
      ? state.vendors.find(
          (v) =>
            v.id !== vendor.id &&
            v.category === vendor.category &&
            creditUsagePercent(v, state.invoices) < 0.5 &&
            creditAvailable(v, state.invoices) >= amt,
        )
      : undefined;

  const dueDate = vendor
    ? format(addDays(parseISO(invoiceDate), termsDays(vendor)), 'yyyy-MM-dd')
    : invoiceDate;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!vendor) return setError('Select a vendor.');
    if (!invoiceNumber.trim()) return setError('Invoice number is required.');
    if (!Number.isFinite(amt) || amt <= 0) return setError('Amount must be greater than 0.');
    const invoice: Invoice = {
      id: uid('i'),
      vendorId,
      projectId,
      invoiceNumber: invoiceNumber.trim(),
      invoiceDate,
      dueDate,
      amount: amt,
      status: 'unpaid',
      paymentMode: null,
      paymentDate: null,
      notes: notes.trim(),
    };
    upsert('invoice', invoice, `Invoice ${invoice.invoiceNumber} (${formatINR(amt)}) created for ${vendor.name}`);
    onClose();
  };

  return (
    <Modal title="New invoice" onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <FormError message={error} />
        <div className="grid grid-cols-1 gap-x-3 sm:grid-cols-2">
          <Field label="Vendor" htmlFor="in-vendor" required>
            <select id="in-vendor" className={inputCls} value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
              {state.vendors.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Project" htmlFor="in-project">
            <select id="in-project" className={inputCls} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              {state.projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Invoice number" htmlFor="in-num" required>
            <input id="in-num" className={inputCls} value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} required />
          </Field>
          <Field label="Amount (₹)" htmlFor="in-amt" required>
            <input id="in-amt" type="number" min="1" className={inputCls} value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </Field>
          <Field label="Invoice date" htmlFor="in-date">
            <input id="in-date" type="date" className={inputCls} value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
          </Field>
          <Field label="Due date (auto from terms)" htmlFor="in-due">
            <input id="in-due" type="date" className={inputCls} value={dueDate} readOnly aria-readonly="true" />
          </Field>
        </div>
        <Field label="Notes" htmlFor="in-notes">
          <input id="in-notes" className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. RMC week 2" />
        </Field>

        {vendor && (
          <p className="mb-2 text-xs text-ink/60">
            {vendor.name}: {formatINR(available)} credit available ({vendor.paymentTerms} terms).
          </p>
        )}
        {exceeds && (
          <div className="mb-3 flex gap-2.5 rounded-xl bg-orange-50 p-3 text-sm text-orange-900 ring-1 ring-inset ring-orange-500/20" role="alert">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
              <AlertTriangle size={14} aria-hidden="true" />
            </span>
            <span>
              This invoice exceeds {vendor?.name}'s available credit by {formatINR(amt - available)}.
              {alternative
                ? ` ${alternative.name} has ${formatINR(creditAvailable(alternative, state.invoices))} available in the same category — consider splitting the order.`
                : ' No same-category vendor has enough free credit — consider paying early to free credit.'}
            </span>
          </div>
        )}

        <div className="mt-2 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button type="submit" className="btn-primary">
            Save invoice
          </button>
        </div>
      </form>
    </Modal>
  );
}

function PaymentModal({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const { state, upsert } = useApp();
  const [mode, setMode] = useState<PaymentMode>('NEFT');
  const [payOn, setPayOn] = useState(todayISO());
  const vendor = state.vendors.find((v) => v.id === invoice.vendorId);

  const schedule = (e: FormEvent) => {
    e.preventDefault();
    upsert(
      'invoice',
      { ...invoice, status: 'payment-sent', paymentMode: mode, paymentDate: payOn },
      `Payment of ${formatINR(invoice.amount)} scheduled to ${vendor?.name ?? 'vendor'} via ${mode}`,
    );
    onClose();
  };

  const modes: Array<{ value: PaymentMode; label: string; hint: string }> = [
    { value: 'NEFT', label: 'NEFT', hint: 'Settles in 2–4 hrs' },
    { value: 'RTGS', label: 'RTGS', hint: '30 mins, any amount, higher fee' },
    { value: 'Cheque', label: 'Cheque', hint: '3–5 days to clear' },
  ];

  return (
    <Modal title={`Pay invoice ${invoice.invoiceNumber}`} onClose={onClose}>
      <form onSubmit={schedule}>
        <p className="text-sm text-ink/80">
          <strong>{vendor?.name}</strong> · {formatINR(invoice.amount)} · due {formatDate(invoice.dueDate)}
        </p>
        <fieldset className="mt-4">
          <legend className="mb-2 text-sm font-medium text-ink/80">Payment mode</legend>
          <div className="stagger space-y-2">
            {modes.map((m) => (
              <label key={m.value} className="flex cursor-pointer items-center gap-3 rounded-md border border-ink/10 p-3 has-[:checked]:border-amber-500 has-[:checked]:bg-amber-50">
                <input
                  type="radio"
                  name="pay-mode"
                  value={m.value}
                  checked={mode === m.value}
                  onChange={() => setMode(m.value)}
                  className="h-4 w-4 accent-amber-500"
                />
                <span className="text-sm font-semibold text-ink">{m.label}</span>
                <span className="text-xs text-ink/55">{m.hint}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <Field label="Pay on" htmlFor="pay-date">
          <input id="pay-date" type="date" className={inputCls} value={payOn} onChange={(e) => setPayOn(e.target.value)} />
        </Field>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button type="submit" className="btn-primary">
            Schedule payment
          </button>
        </div>
      </form>
    </Modal>
  );
}
