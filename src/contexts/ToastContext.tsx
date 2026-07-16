import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { CheckCircle2, Info, AlertTriangle, X, type LucideIcon } from 'lucide-react';
import clsx from 'clsx';
import { uid } from '../utils/format';

export type ToastTone = 'success' | 'info' | 'error';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastOptions {
  tone?: ToastTone;
  action?: ToastAction;
  icon?: LucideIcon;
  /** ms before auto-dismiss; extended automatically when an action is present. */
  duration?: number;
}

interface ToastItem {
  id: string;
  message: string;
  tone: ToastTone;
  action?: ToastAction;
  icon?: LucideIcon;
  leaving: boolean;
}

const MAX_VISIBLE = 4;
const DEFAULT_DURATION = 4000;
const WITH_ACTION_DURATION = 5500;
const EXIT_MS = 180;

interface ToastContextValue {
  toast: (message: string, opts?: ToastOptions) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE_ICON: Record<ToastTone, LucideIcon> = {
  success: CheckCircle2,
  info: Info,
  error: AlertTriangle,
};

const TONE_CHIP: Record<ToastTone, string> = {
  success: 'bg-emerald-500/15 text-emerald-400',
  info: 'bg-white/10 text-white/75',
  error: 'bg-red-500/15 text-red-400',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timers = useRef<Map<string, number>>(new Map());

  const clearTimer = useCallback((id: string) => {
    const t = timers.current.get(id);
    if (t !== undefined) {
      window.clearTimeout(t);
      timers.current.delete(id);
    }
  }, []);

  const dismiss = useCallback(
    (id: string) => {
      clearTimer(id);
      setItems((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
      window.setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== id));
      }, EXIT_MS);
    },
    [clearTimer],
  );

  const scheduleDismiss = useCallback(
    (id: string, duration: number) => {
      clearTimer(id);
      const t = window.setTimeout(() => dismiss(id), duration);
      timers.current.set(id, t);
    },
    [clearTimer, dismiss],
  );

  const toast = useCallback(
    (message: string, opts: ToastOptions = {}) => {
      const id = uid('toast');
      const tone = opts.tone ?? 'success';
      const duration = opts.duration ?? (opts.action ? WITH_ACTION_DURATION : DEFAULT_DURATION);
      setItems((prev) => {
        const next = [...prev, { id, message, tone, action: opts.action, icon: opts.icon, leaving: false }];
        // Cap the visible stack — drop the oldest rather than let it grow unbounded.
        return next.length > MAX_VISIBLE ? next.slice(next.length - MAX_VISIBLE) : next;
      });
      scheduleDismiss(id, duration);
      return id;
    },
    [scheduleDismiss],
  );

  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach((t) => window.clearTimeout(t));
      map.clear();
    };
  }, []);

  const value = useMemo<ToastContextValue>(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toaster items={items} onDismiss={dismiss} onPause={clearTimer} onResume={scheduleDismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

function Toaster({
  items,
  onDismiss,
  onPause,
  onResume,
}: {
  items: ToastItem[];
  onDismiss: (id: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string, duration: number) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div
      role="region"
      aria-live="polite"
      aria-atomic="false"
      aria-label="Notifications"
      className="pointer-events-none fixed inset-x-4 bottom-24 z-[60] flex flex-col gap-2 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-96"
    >
      {items.map((item) => (
        <ToastCard
          key={item.id}
          item={item}
          onDismiss={() => onDismiss(item.id)}
          onMouseEnter={() => onPause(item.id)}
          onMouseLeave={() => onResume(item.id, item.action ? WITH_ACTION_DURATION : DEFAULT_DURATION)}
        />
      ))}
    </div>
  );
}

function ToastCard({
  item,
  onDismiss,
  onMouseEnter,
  onMouseLeave,
}: {
  item: ToastItem;
  onDismiss: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const Icon = item.icon ?? TONE_ICON[item.tone];
  const visible = mounted && !item.leaving;

  return (
    <div
      role="status"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={clsx(
        'pointer-events-auto flex items-start gap-3 rounded-2xl bg-ink px-4 py-3 text-white shadow-lift ring-1 ring-white/10',
        'transition-[transform,opacity] ease-out',
        item.leaving ? 'duration-150' : 'duration-300',
        visible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0',
      )}
    >
      <span className={clsx('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', TONE_CHIP[item.tone])}>
        <Icon size={15} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-sm font-medium leading-snug">{item.message}</p>
        {item.action && (
          <button
            type="button"
            onClick={() => {
              item.action?.onClick();
              onDismiss();
            }}
            className="mt-1 cursor-pointer text-xs font-bold text-amber-glow transition-colors hover:text-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
          >
            {item.action.label}
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="cursor-pointer rounded-full p-1 text-white/40 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
      >
        <X size={14} />
      </button>
    </div>
  );
}
