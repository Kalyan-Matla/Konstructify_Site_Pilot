import { useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Phone, Plus, Star, Trash2, Users } from 'lucide-react';
import type { PaymentTerms, Vendor, VendorCategory } from '../types';
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
import {
  agingBuckets,
  creditAvailable,
  creditHealth,
  creditUsagePercent,
  creditUsed,
  vendorHasOverdue,
  type CreditHealth,
} from '../utils/derive';
import { suggestVendor } from '../utils/ai-suggestions';
import { formatDate, formatINR, uid } from '../utils/format';
import { useRouteAction } from '../hooks/useRouteAction';

type CategoryFilter = 'all' | VendorCategory;
type HealthFilter = 'all' | CreditHealth;

export function healthBadge(health: CreditHealth, overdue: boolean) {
  if (overdue) return <Badge tone="red" title="Has an unpaid invoice past its due date">overdue</Badge>;
  switch (health) {
    case 'maxed':
      return <Badge tone="red" title="Over 95% of the credit line is used">maxed out</Badge>;
    case 'high':
      return <Badge tone="orange" title="80–95% of the credit line is used">almost full</Badge>;
    case 'warning':
      return <Badge tone="yellow" title="50–80% of the credit line is used">getting full</Badge>;
    default:
      return <Badge tone="green" title="Under 50% of the credit line is used">healthy</Badge>;
  }
}

export default function Vendors() {
  const { state, upsert, remove } = useApp();
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [health, setHealth] = useState<HealthFilter>('all');
  const [editing, setEditing] = useState<Vendor | 'new' | null>(null);
  const [viewing, setViewing] = useState<Vendor | null>(null);
  const [deleting, setDeleting] = useState<Vendor | null>(null);

  useRouteAction({
    openNew: () => setEditing('new'),
    openView: (id) => {
      const v = state.vendors.find((x) => x.id === id);
      if (v) setViewing(v);
    },
  });

  const vendors = state.vendors.filter(
    (v) =>
      (category === 'all' || v.category === category) &&
      (health === 'all' || creditHealth(v, state.invoices) === health),
  );

  return (
    <div>
      <PageHeader
        title="Vendors"
        subtitle={`${state.vendors.length} vendors · credit tracked in real time`}
        action={
          <button
            type="button"
            onClick={() => setEditing('new')}
            className="btn-primary flex items-center gap-1.5"
          >
            <Plus size={16} aria-hidden="true" /> Add vendor
          </button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <label htmlFor="vf-cat" className="text-sm text-ink/60">Category</label>
        <select id="vf-cat" className="rounded-xl border border-ink/15 bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" value={category} onChange={(e) => setCategory(e.target.value as CategoryFilter)}>
          <option value="all">All</option>
          <option value="material">Material</option>
          <option value="service">Service</option>
          <option value="labor">Labor</option>
          <option value="equipment">Equipment</option>
        </select>
        <label htmlFor="vf-health" className="ml-2 text-sm text-ink/60">Credit</label>
        <select id="vf-health" className="rounded-xl border border-ink/15 bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" value={health} onChange={(e) => setHealth(e.target.value as HealthFilter)}>
          <option value="all">All</option>
          <option value="healthy">Healthy (&lt;50%)</option>
          <option value="warning">50–80%</option>
          <option value="high">80–95%</option>
          <option value="maxed">&gt;95%</option>
        </select>
      </div>

      {vendors.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No vendors here"
          message="Add a supplier with their credit line and payment terms to start tracking exposure."
          action={{ label: 'Add vendor', onClick: () => setEditing('new') }}
        />
      ) : (
        <div className="stagger grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {vendors.map((v) => {
            const used = creditUsed(v.id, state.invoices);
            const pct = creditUsagePercent(v, state.invoices) * 100;
            const h = creditHealth(v, state.invoices);
            const overdue = vendorHasOverdue(v.id, state.invoices);
            return (
              <div key={v.id} className="panel panel-hover p-4">
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setViewing(v)}
                    className="text-left text-base font-semibold text-ink hover:text-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {v.name}
                  </button>
                  {healthBadge(h, overdue)}
                </div>
                <p className="text-sm capitalize text-ink/55">{v.category} · {v.paymentTerms} terms</p>
                <div className="mt-3 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-ink/60">Credit used</span>
                    <span className="font-semibold text-ink">
                      {formatINR(used)} / {formatINR(v.creditLimit)}
                    </span>
                  </div>
                  <ProgressBar percent={pct} />
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <SyncBadge entity="vendor" id={v.id} />
                  <div className="flex gap-1">
                    <a
                      href={`tel:${v.phone}`}
                      aria-label={`Call ${v.name}`}
                      className="rounded p-1.5 text-ink/55 hover:bg-paper-soft hover:text-green-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <Phone size={16} />
                    </a>
                    <button
                      type="button"
                      onClick={() => setEditing(v)}
                      aria-label={`Edit ${v.name}`}
                      className="rounded p-1.5 text-ink/55 hover:bg-paper-soft hover:text-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleting(v)}
                      aria-label={`Delete ${v.name}`}
                      className="rounded p-1.5 text-ink/55 hover:bg-paper-soft hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
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
        <VendorForm
          vendor={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSave={(v) => {
            upsert('vendor', v, `Vendor "${v.name}" ${editing === 'new' ? 'added' : 'updated'}`);
            setEditing(null);
          }}
        />
      )}

      {viewing && <VendorDetail vendor={viewing} onClose={() => setViewing(null)} />}

      {deleting && (
        <ConfirmDialog
          title="Delete vendor?"
          message={`"${deleting.name}" will be removed from the vendor master. Their invoices stay in Payments.`}
          confirmLabel="Delete"
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            remove('vendor', deleting.id, `Vendor "${deleting.name}" deleted`);
            setDeleting(null);
          }}
        />
      )}
    </div>
  );
}

function VendorForm({
  vendor,
  onClose,
  onSave,
}: {
  vendor: Vendor | null;
  onClose: () => void;
  onSave: (v: Vendor) => void;
}) {
  const [name, setName] = useState(vendor?.name ?? '');
  const [phone, setPhone] = useState(vendor?.phone ?? '');
  const [email, setEmail] = useState(vendor?.email ?? '');
  const [category, setCategory] = useState<VendorCategory>(vendor?.category ?? 'material');
  const [gstId, setGstId] = useState(vendor?.gstId ?? '');
  const [bankAccount, setBankAccount] = useState(vendor?.bankAccount ?? '');
  const [bankIfsc, setBankIfsc] = useState(vendor?.bankIfsc ?? '');
  const [creditLimit, setCreditLimit] = useState(vendor ? String(vendor.creditLimit) : '');
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerms>(vendor?.paymentTerms ?? '14-day');
  const [error, setError] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const limit = Number(creditLimit);
    if (!name.trim()) return setError('Vendor name is required.');
    if (!/^\d{10}$/.test(phone)) return setError('Phone must be a 10-digit number.');
    if (!Number.isFinite(limit) || limit <= 0) return setError('Credit limit must be greater than 0.');
    if (gstId && !/^[0-9]{2}[A-Z0-9]{13}$/.test(gstId)) return setError('GST ID must be 15 characters (e.g. 27AABCT1234H1Z0).');
    onSave({
      id: vendor?.id ?? uid('v'),
      name: name.trim(),
      phone,
      email: email.trim(),
      category,
      gstId: gstId.trim(),
      bankAccount: bankAccount.trim(),
      bankIfsc: bankIfsc.trim(),
      creditLimit: limit,
      paymentTerms,
      ratingQuality: vendor?.ratingQuality ?? 4.0,
      ratingDelivery: vendor?.ratingDelivery ?? 4.0,
    });
  };

  return (
    <Modal title={vendor ? 'Edit vendor' : 'Add vendor'} onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <FormError message={error} />
        <Field label="Vendor name" htmlFor="vn-name" required>
          <input id="vn-name" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <div className="grid grid-cols-1 gap-x-3 sm:grid-cols-2">
          <Field label="Phone (10 digits)" htmlFor="vn-phone" required>
            <input id="vn-phone" type="tel" inputMode="numeric" className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} required />
          </Field>
          <Field label="Email" htmlFor="vn-email">
            <input id="vn-email" type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Category" htmlFor="vn-cat">
            <select id="vn-cat" className={inputCls} value={category} onChange={(e) => setCategory(e.target.value as VendorCategory)}>
              <option value="material">Material</option>
              <option value="service">Service</option>
              <option value="labor">Labor</option>
              <option value="equipment">Equipment</option>
            </select>
          </Field>
          <Field label="GST ID" htmlFor="vn-gst">
            <input id="vn-gst" className={inputCls} value={gstId} onChange={(e) => setGstId(e.target.value.toUpperCase())} placeholder="27AABCT1234H1Z0" />
          </Field>
          <Field label="Bank account" htmlFor="vn-bank">
            <input id="vn-bank" className={inputCls} value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} />
          </Field>
          <Field label="IFSC" htmlFor="vn-ifsc">
            <input id="vn-ifsc" className={inputCls} value={bankIfsc} onChange={(e) => setBankIfsc(e.target.value.toUpperCase())} />
          </Field>
          <Field label="Credit limit (₹)" htmlFor="vn-limit" required>
            <input id="vn-limit" type="number" min="1" className={inputCls} value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)} required />
          </Field>
          <Field label="Payment terms" htmlFor="vn-terms">
            <select id="vn-terms" className={inputCls} value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value as PaymentTerms)}>
              <option value="COD">COD</option>
              <option value="7-day">7-day net</option>
              <option value="14-day">14-day net</option>
              <option value="30-day">30-day net</option>
            </select>
          </Field>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button type="submit" className="btn-primary">
            Save vendor
          </button>
        </div>
      </form>
    </Modal>
  );
}

function VendorDetail({ vendor, onClose }: { vendor: Vendor; onClose: () => void }) {
  const { state } = useApp();
  const navigate = useNavigate();
  const [aiDismissed, setAiDismissed] = useState(false);

  const used = creditUsed(vendor.id, state.invoices);
  const available = creditAvailable(vendor, state.invoices);
  const pct = creditUsagePercent(vendor, state.invoices) * 100;
  const aging = agingBuckets(vendor.id, state.invoices);
  const invoices = useMemo(
    () =>
      state.invoices
        .filter((i) => i.vendorId === vendor.id)
        .sort((a, b) => b.invoiceDate.localeCompare(a.invoiceDate))
        .slice(0, 10),
    [state.invoices, vendor.id],
  );
  const ai = suggestVendor(vendor, state.vendors, state.invoices);

  return (
    <Modal title={vendor.name} onClose={onClose}>
      <p className="text-sm capitalize text-ink/60">
        {vendor.category} · {vendor.paymentTerms} terms · GST {vendor.gstId || '—'}
      </p>
      <p className="mt-0.5 text-sm text-ink/60">
        📞 {vendor.phone} {vendor.email && `· ✉️ ${vendor.email}`}
      </p>
      <p className="mt-0.5 text-sm text-ink/60">
        Bank {vendor.bankAccount || '—'} · IFSC {vendor.bankIfsc || '—'}
      </p>
      <p className="mt-1 flex items-center gap-1 text-sm text-ink/80">
        <Star size={14} className="text-yellow-500" aria-hidden="true" />
        Quality {vendor.ratingQuality.toFixed(1)} · Delivery {vendor.ratingDelivery.toFixed(1)}
      </p>

      <div className="mt-4 rounded-lg border border-ink/10 p-3">
        <div className="flex justify-between text-sm">
          <span className="text-ink/60">Credit used ({pct.toFixed(0)}%)</span>
          <span className="font-semibold text-ink">
            {formatINR(used)} / {formatINR(vendor.creditLimit)}
          </span>
        </div>
        <div className="mt-1.5">
          <ProgressBar percent={pct} />
        </div>
        <p className="mt-1.5 text-sm font-medium text-green-700">{formatINR(available)} available</p>
        <div className="mt-3 grid grid-cols-4 gap-1 text-center text-xs">
          {[
            ['0–30d', aging.b0to30],
            ['30–60d', aging.b30to60],
            ['60–90d', aging.b60to90],
            ['90d+', aging.b90plus],
          ].map(([label, amt]) => (
            <div key={String(label)} className="rounded bg-paper-soft p-1.5">
              <p className="text-ink/55">{label}</p>
              <p className="font-semibold text-ink">{formatINR(Number(amt))}</p>
            </div>
          ))}
        </div>
      </div>

      {ai && !aiDismissed && (
        <div className="mt-4">
          <AICard suggestion={ai} onDismiss={() => setAiDismissed(true)} onAction={() => navigate('/vendors')} />
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => navigate('/payments')}
          className="btn-primary flex-1"
        >
          Schedule payment
        </button>
        <button
          type="button"
          onClick={() => navigate('/credits')}
          className="btn-ghost flex-1"
        >
          Credit dashboard
        </button>
      </div>

      <h3 className="mt-4 text-sm font-bold text-ink">Invoice history (last 10)</h3>
      <ul className="mt-1 divide-y divide-ink/10 text-sm">
        {invoices.map((i) => (
          <li key={i.id} className="flex items-center justify-between py-1.5">
            <span className="text-ink">
              {i.invoiceNumber} · {formatDate(i.invoiceDate)}
            </span>
            <span className="flex items-center gap-2">
              <span className="font-medium text-ink">{formatINR(i.amount)}</span>
              {i.status === 'paid' ? (
                <Badge tone="green">paid</Badge>
              ) : i.status === 'payment-sent' ? (
                <Badge tone="yellow">payment sent</Badge>
              ) : (
                <Badge tone="red">unpaid</Badge>
              )}
            </span>
          </li>
        ))}
        {invoices.length === 0 && <li className="py-1.5 text-ink/55">No invoices yet.</li>}
      </ul>
    </Modal>
  );
}
