import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  CreditCard,
  FolderOpen,
  HardHat,
  LogOut,
  Plus,
  Search,
  Users,
  type LucideIcon,
} from 'lucide-react';
import clsx from 'clsx';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { NAV } from './Layout';
import { creditUsed } from '../utils/derive';
import { formatINR } from '../utils/format';

interface PaletteItem {
  id: string;
  group: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
  run: () => void;
}

const DEFAULT_GROUPS = new Set(['Pages', 'Quick actions']);

export default function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state } = useApp();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActiveIndex(0);
    const t = window.setTimeout(() => inputRef.current?.focus(), 20);
    return () => window.clearTimeout(t);
  }, [open]);

  const go = (path: string, routerState?: { openNew?: boolean; openView?: string }) => {
    navigate(path, routerState ? { state: routerState } : undefined);
    onClose();
  };

  const items = useMemo<PaletteItem[]>(() => {
    const pages: PaletteItem[] = NAV.map((n) => ({
      id: `page-${n.path}`,
      group: 'Pages',
      label: n.name,
      icon: n.icon,
      run: () => go(n.path),
    }));

    const quickActions: PaletteItem[] = [
      { id: 'new-project', group: 'Quick actions', label: 'New project', icon: Plus, run: () => go('/projects', { openNew: true }) },
      { id: 'new-vendor', group: 'Quick actions', label: 'New vendor', icon: Plus, run: () => go('/vendors', { openNew: true }) },
      { id: 'new-invoice', group: 'Quick actions', label: 'New invoice', icon: Plus, run: () => go('/payments', { openNew: true }) },
      { id: 'new-work-order', group: 'Quick actions', label: 'New work order', icon: Plus, run: () => go('/work-orders', { openNew: true }) },
      { id: 'new-boq', group: 'Quick actions', label: 'New BOQ item', icon: Plus, run: () => go('/budgeting', { openNew: true }) },
      { id: 'new-task', group: 'Quick actions', label: 'New task', icon: Plus, run: () => go('/work-status', { openNew: true }) },
    ];

    const vendors: PaletteItem[] = state.vendors.map((v) => ({
      id: `vendor-${v.id}`,
      group: 'Vendors',
      label: v.name,
      hint: `${formatINR(creditUsed(v.id, state.invoices))} / ${formatINR(v.creditLimit)} used`,
      icon: Users,
      run: () => go('/vendors', { openView: v.id }),
    }));

    const projects: PaletteItem[] = state.projects.map((p) => ({
      id: `project-${p.id}`,
      group: 'Projects',
      label: p.name,
      hint: p.clientName,
      icon: FolderOpen,
      run: () => go('/projects', { openView: p.id }),
    }));

    const invoices: PaletteItem[] = state.invoices.map((i) => {
      const vendor = state.vendors.find((v) => v.id === i.vendorId);
      return {
        id: `invoice-${i.id}`,
        group: 'Invoices',
        label: `${i.invoiceNumber} — ${vendor?.name ?? 'vendor'}`,
        hint: `${formatINR(i.amount)} · ${i.status}`,
        icon: CreditCard,
        run: () => go('/payments'),
      };
    });

    const tasks: PaletteItem[] = state.tasks.map((t) => ({
      id: `task-${t.id}`,
      group: 'Work status',
      label: t.name,
      hint: `${t.phase} · ${t.percentComplete}%`,
      icon: HardHat,
      run: () => go('/work-status', { openView: t.id }),
    }));

    const workOrders: PaletteItem[] = state.workOrders.map((w) => ({
      id: `wo-${w.id}`,
      group: 'Work orders',
      label: `${w.orderNumber} — ${w.taskName}`,
      hint: w.assignee,
      icon: ClipboardList,
      run: () => go('/work-orders'),
    }));

    const account: PaletteItem[] = [
      { id: 'sign-out', group: 'Account', label: 'Sign out', icon: LogOut, run: () => { onClose(); logout(); } },
    ];

    return [...pages, ...quickActions, ...vendors, ...projects, ...invoices, ...tasks, ...workOrders, ...account];
    // `go`/`onClose`/`logout` are stable closures for our purposes (they call
    // stable setState setters); only `state` should drive a rebuild.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q === '') return items.filter((i) => DEFAULT_GROUPS.has(i.group));
    return items
      .filter(
        (i) =>
          i.label.toLowerCase().includes(q) ||
          i.hint?.toLowerCase().includes(q) ||
          i.group.toLowerCase().includes(q),
      )
      .slice(0, 40);
  }, [items, query]);

  const groups = useMemo(() => {
    const order: string[] = [];
    const map = new Map<string, PaletteItem[]>();
    for (const item of filtered) {
      if (!map.has(item.group)) {
        map.set(item.group, []);
        order.push(item.group);
      }
      map.get(item.group)?.push(item);
    }
    return order.map((g) => ({ group: g, items: map.get(g) ?? [] }));
  }, [filtered]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  if (!open) return null;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      filtered[activeIndex]?.run();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-[70] flex items-start justify-center bg-ink/50 px-4 pt-[10vh] backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg animate-pop-in overflow-hidden rounded-2xl bg-paper-soft shadow-lift ring-1 ring-ink/10"
      >
        <div className="flex items-center gap-2.5 border-b border-ink/10 px-4 py-3">
          <Search size={17} className="shrink-0 text-ink/40" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-listbox"
            aria-autocomplete="list"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search vendors, invoices, projects — or jump to a page"
            className="w-full bg-transparent text-sm text-ink placeholder:text-ink/40 focus:outline-none"
          />
        </div>

        <div id="palette-listbox" role="listbox" ref={listRef} className="max-h-[60vh] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-ink/50">No matches for “{query}”.</p>
          ) : (
            groups.map(({ group, items: groupItems }) => (
              <div key={group} className="mb-1 last:mb-0">
                <p className="px-2.5 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-ink/60">
                  {group}
                </p>
                {groupItems.map((item) => {
                  const index = filtered.indexOf(item);
                  const active = index === activeIndex;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="option"
                      aria-selected={active}
                      data-index={index}
                      onClick={item.run}
                      onMouseEnter={() => setActiveIndex(index)}
                      className={clsx(
                        'flex w-full cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors',
                        active ? 'bg-amber-50 ring-1 ring-amber-500/30' : 'hover:bg-ink/5',
                      )}
                    >
                      <span
                        className={clsx(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                          active ? 'bg-ink text-amber-glow' : 'bg-ink/[0.06] text-ink/60',
                        )}
                      >
                        <item.icon size={15} aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-ink">{item.label}</span>
                        {item.hint && <span className="num block truncate text-xs text-ink/50">{item.hint}</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-ink/10 px-4 py-2 text-[11px] font-semibold text-ink/40">
          <span>↑↓ navigate</span>
          <span>↵ select</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  );
}
