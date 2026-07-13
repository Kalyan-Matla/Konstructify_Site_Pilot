import { X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
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
    green: 'bg-green-100 text-green-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    orange: 'bg-orange-100 text-orange-800',
    red: 'bg-red-100 text-red-800',
    blue: 'bg-blue-100 text-blue-800',
    gray: 'bg-gray-100 text-gray-700',
  };
  return (
    <span className={clsx('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold', tones[tone])}>
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
      className={clsx('text-xs font-medium', pending ? 'text-amber-600' : 'text-green-600')}
    >
      {pending ? '⏳ Sync pending' : '✓ Synced'}
    </span>
  );
}

export function ProgressBar({ percent, tone }: { percent: number; tone?: string }) {
  const clamped = Math.min(Math.max(percent, 0), 100);
  const color =
    tone ??
    (clamped > 90 ? 'bg-red-500' : clamped > 80 ? 'bg-yellow-500' : 'bg-green-500');
  return (
    <div
      className="h-2 w-full rounded-full bg-gray-200"
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className={clsx('h-2 rounded-full transition-all', color)} style={{ width: `${clamped}%` }} />
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
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-4 shadow-xl sm:max-w-lg sm:rounded-2xl sm:p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
      <p className="text-sm text-gray-700">{message}</p>
      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
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
      <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-600">*</span>}
      </label>
      {children}
    </div>
  );
}

export const inputCls =
  'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

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
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <div>
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">{title}</h1>
        {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
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
    <div className="mb-4 rounded border-l-4 border-blue-400 bg-blue-50 p-4" role="note">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-blue-900">💡 {suggestion.title}</h3>
          <p className="mt-1 text-sm text-blue-800">{suggestion.message}</p>
          <p className="mt-2 text-sm font-medium text-blue-700">{suggestion.suggestion}</p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label={`Dismiss suggestion: ${suggestion.title}`}
          className="rounded p-1 text-blue-400 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <X size={16} />
        </button>
      </div>
      {onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-3 text-sm font-semibold text-blue-600 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {suggestion.action} →
        </button>
      )}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
      {message}
    </div>
  );
}
