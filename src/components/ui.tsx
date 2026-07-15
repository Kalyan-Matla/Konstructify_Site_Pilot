import { Sparkles, X } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import type { AISuggestion, EntityKind } from '../types';
import { useApp } from '../contexts/AppContext';

export function Badge({
  tone,
  children,
}: {
  tone: 'green' | 'yellow' | 'orange' | 'red' | 'blue' | 'gray';
  children: ReactNode;
}) {
  const tones: Record<string, string> = {
    green: 'bg-emerald-100 text-emerald-900 ring-emerald-600/20',
    yellow: 'bg-amber-100 text-amber-900 ring-amber-600/25',
    orange: 'bg-orange-100 text-orange-900 ring-orange-600/25',
    red: 'bg-red-100 text-red-900 ring-red-600/20',
    blue: 'bg-sky-100 text-sky-900 ring-sky-600/20',
    gray: 'bg-ink/5 text-ink/70 ring-ink/10',
  };
  return (
    <span
      className={clsx(
        'inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ring-1 ring-inset',
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

/** Shows sync state for a specific record based on the offline queue. */
export function SyncBadge({ entity, id }: { entity: EntityKind; id: string }) {
  const { isPending } = useApp();
  const pending = isPending(entity, id);
  return (
    <span
      aria-live="polite"
      className={clsx(
        'num text-[11px] font-bold',
        pending ? 'text-amber-600' : 'text-emerald-700',
      )}
    >
      {pending ? '⏳ Sync pending' : '✓ Synced'}
    </span>
  );
}

export function ProgressBar({ percent, tone }: { percent: number; tone?: string }) {
  const clamped = Math.min(Math.max(percent, 0), 100);
  const color =
    tone ?? (clamped > 90 ? 'bg-red-500' : clamped > 80 ? 'bg-amber-500' : 'bg-emerald-500');
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-ink/10"
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={clsx('fill-animate relative h-2 rounded-full', color)}
        style={{ width: `${clamped}%` }}
      >
        <span className="absolute inset-0 animate-sheen bg-gradient-to-r from-transparent via-white/40 to-transparent" />
      </div>
    </div>
  );
}

/** SVG ring gauge with animated draw-in. */
export function Ring({
  percent,
  size = 84,
  stroke = 8,
  label,
  sublabel,
}: {
  percent: number;
  size?: number;
  stroke?: number;
  label: string;
  sublabel?: string;
}) {
  const clamped = Math.min(Math.max(percent, 0), 100);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const [offset, setOffset] = useState(c);
  useEffect(() => {
    const id = requestAnimationFrame(() => setOffset(c - (clamped / 100) * c));
    return () => cancelAnimationFrame(id);
  }, [c, clamped]);
  const color = clamped > 95 ? '#dc2626' : clamped > 80 ? '#ea580c' : clamped > 50 ? '#d97706' : '#059669';
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} role="img" aria-label={`${label} — ${clamped.toFixed(0)}%`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(16,21,31,0.08)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="ring-animate"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="num text-sm font-bold text-ink">{label}</span>
        {sublabel && <span className="text-[9px] font-semibold uppercase tracking-wider text-ink/50">{sublabel}</span>}
      </div>
    </div>
  );
}

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    ref.current?.querySelector<HTMLElement>('input, select, textarea, button')?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full animate-pop-in overflow-y-auto rounded-t-3xl bg-paper-soft p-5 shadow-lift sm:max-w-lg sm:rounded-3xl sm:p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl text-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="cursor-pointer rounded-full p-1.5 text-ink/50 transition-colors hover:bg-ink/5 hover:text-ink focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="text-sm text-ink/70">{message}</p>
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="btn-ghost">
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="cursor-pointer rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white transition-[transform,background-color] duration-200 ease-out hover:bg-red-500 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

export function Field({
  label,
  htmlFor,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="mb-3">
      <label htmlFor={htmlFor} className="mb-1 block text-xs font-bold uppercase tracking-wide text-ink/60">
        {label} {required && <span className="text-red-600">*</span>}
      </label>
      {children}
    </div>
  );
}

export const inputCls =
  'w-full rounded-xl border border-ink/15 bg-white px-3.5 py-2.5 text-sm text-ink shadow-sm transition-colors focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40';

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3 animate-fade-up">
      <div>
        <h1 className="font-display text-3xl tracking-tight text-ink sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink/55">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function AICard({
  suggestion,
  onDismiss,
  onAction,
}: {
  suggestion: AISuggestion;
  onDismiss: () => void;
  onAction?: () => void;
}) {
  return (
    <div
      className="group relative mb-5 animate-fade-up overflow-hidden rounded-2xl bg-ink p-4 text-white shadow-lift sm:p-5"
      role="note"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-14 h-44 w-44 rounded-full bg-amber-glow/20 blur-3xl transition-transform duration-700 group-hover:scale-125"
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-glow text-ink shadow-glow">
            <Sparkles size={17} aria-hidden="true" />
          </span>
          <div>
            <h3 className="font-display text-base text-amber-glow">{suggestion.title}</h3>
            <p className="mt-1 text-sm text-white/85">{suggestion.message}</p>
            <p className="mt-1.5 text-sm font-semibold text-white">{suggestion.suggestion}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label={`Dismiss suggestion: ${suggestion.title}`}
          className="cursor-pointer rounded-full p-1 text-white/50 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <X size={16} />
        </button>
      </div>
      {onAction && (
        <button
          type="button"
          onClick={onAction}
          className="relative ml-12 mt-3 cursor-pointer text-sm font-bold text-amber-glow transition-transform hover:translate-x-1 focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          {suggestion.action} →
        </button>
      )}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="animate-fade-up rounded-2xl border-2 border-dashed border-ink/15 bg-white/50 p-10 text-center text-sm text-ink/50">
      {message}
    </div>
  );
}
