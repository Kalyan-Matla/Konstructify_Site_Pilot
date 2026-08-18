import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type {
  ActivityItem,
  AppState,
  BudgetItem,
  EntityKind,
  Invoice,
  Project,
  SyncQueueItem,
  Vendor,
  WorkOrder,
  WorkTask,
} from '../types';
import { buildMockState } from '../utils/mock-data';
import { uid } from '../utils/format';
import { useToast } from './ToastContext';

const STORAGE_KEY = 'konstructify-state-v1';

export type Entity = Project | Vendor | Invoice | WorkTask | WorkOrder | BudgetItem;

const collectionOf: Record<EntityKind, keyof AppState> = {
  project: 'projects',
  vendor: 'vendors',
  invoice: 'invoices',
  task: 'tasks',
  workOrder: 'workOrders',
  budgetItem: 'budgetItems',
};

type Action =
  | { type: 'upsert'; entity: EntityKind; item: Entity }
  | { type: 'remove'; entity: EntityKind; id: string }
  | { type: 'activity'; item: ActivityItem }
  | { type: 'enqueue'; item: SyncQueueItem }
  | { type: 'markAllSynced' }
  | { type: 'reset'; state: AppState };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'upsert': {
      const key = collectionOf[action.entity];
      const list = state[key] as Entity[];
      const exists = list.some((e) => e.id === action.item.id);
      const next = exists
        ? list.map((e) => (e.id === action.item.id ? action.item : e))
        : [action.item, ...list];
      return { ...state, [key]: next };
    }
    case 'remove': {
      const key = collectionOf[action.entity];
      const list = state[key] as Entity[];
      return { ...state, [key]: list.filter((e) => e.id !== action.id) };
    }
    case 'activity':
      return { ...state, activity: [action.item, ...state.activity].slice(0, 25) };
    case 'enqueue':
      return { ...state, syncQueue: [action.item, ...state.syncQueue].slice(0, 50) };
    case 'markAllSynced':
      return {
        ...state,
        syncQueue: state.syncQueue.map((q) => ({ ...q, status: 'synced' as const })),
      };
    case 'reset':
      return action.state;
  }
}

function loadInitialState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (parsed.projects && parsed.vendors && parsed.invoices) return parsed;
    }
  } catch {
    // corrupted storage — fall through to mock data
  }
  return buildMockState();
}

interface AppContextValue {
  state: AppState;
  isOnline: boolean;
  isSyncing: boolean;
  simulateOffline: boolean;
  setSimulateOffline: (v: boolean) => void;
  pendingCount: number;
  isPending: (entity: EntityKind, id: string) => boolean;
  upsert: (entity: EntityKind, item: Entity, label: string, opts?: { silent?: boolean }) => void;
  remove: (entity: EntityKind, id: string, label: string, opts?: { silent?: boolean }) => Entity | undefined;
  resetData: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [state, dispatch] = useReducer(reducer, undefined, loadInitialState);
  const [browserOnline, setBrowserOnline] = useState<boolean>(navigator.onLine);
  const [simulateOffline, setSimulateOffline] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncTimer = useRef<number | null>(null);

  const isOnline = browserOnline && !simulateOffline;

  useEffect(() => {
    const on = () => setBrowserOnline(true);
    const off = () => setBrowserOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  // Persist everything on every change.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // storage full (photos) — drop silently; state stays in memory
    }
  }, [state]);

  const hasPending = state.syncQueue.some((q) => q.status === 'pending');

  // Mock cloud sync: when online with pending items, settle them after a short delay.
  useEffect(() => {
    if (isOnline && hasPending && !isSyncing) {
      setIsSyncing(true);
      syncTimer.current = window.setTimeout(() => {
        dispatch({ type: 'markAllSynced' });
        setIsSyncing(false);
      }, 1200);
    }
    if (!isOnline && syncTimer.current !== null) {
      window.clearTimeout(syncTimer.current);
      syncTimer.current = null;
      setIsSyncing(false);
    }
  }, [isOnline, hasPending, isSyncing]);

  // Ref so upsert can check existence without re-creating on every state change.
  const stateRef = useRef(state);
  stateRef.current = state;

  const track = useCallback(
    (action: SyncQueueItem['action'], entity: EntityKind, entityId: string, label: string) => {
      dispatch({
        type: 'enqueue',
        item: {
          id: uid('sync'),
          action,
          entity,
          entityId,
          label,
          timestamp: new Date().toISOString(),
          status: 'pending',
        },
      });
      dispatch({
        type: 'activity',
        item: { id: uid('act'), message: label, timestamp: new Date().toISOString(), entity },
      });
    },
    [],
  );

  const upsert = useCallback(
    (entity: EntityKind, item: Entity, label: string, opts?: { silent?: boolean }) => {
      const key = collectionOf[entity];
      const exists = (stateRef.current[key] as Entity[]).some((e) => e.id === item.id);
      dispatch({ type: 'upsert', entity, item });
      track(exists ? 'update' : 'create', entity, item.id, label);
      if (!opts?.silent) toast(label, { tone: 'success' });
    },
    [track, toast],
  );

  const remove = useCallback(
    (entity: EntityKind, id: string, label: string, opts?: { silent?: boolean }) => {
      const key = collectionOf[entity];
      const removedItem = (stateRef.current[key] as Entity[]).find((e) => e.id === id);
      // Every delete label ends in "... deleted" by convention — swap the verb
      // rather than concatenating, so the restore toast reads as its own sentence.
      const restoredLabel = /deleted$/.test(label) ? label.replace(/deleted$/, 'restored') : `${label.replace(/\.$/, '')} — restored`;
      dispatch({ type: 'remove', entity, id });
      track('delete', entity, id, label);
      if (!opts?.silent) {
        toast(label, {
          tone: 'info',
          action: removedItem
            ? {
                label: 'Undo',
                onClick: () => upsert(entity, removedItem, restoredLabel),
              }
            : undefined,
        });
      }
      return removedItem;
    },
    [track, toast, upsert],
  );

  const resetData = useCallback(() => {
    dispatch({ type: 'reset', state: buildMockState() });
  }, []);

  const pendingCount = state.syncQueue.filter((q) => q.status === 'pending').length;

  const isPending = useCallback(
    (entity: EntityKind, id: string) =>
      state.syncQueue.some((q) => q.entity === entity && q.entityId === id && q.status === 'pending'),
    [state.syncQueue],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      state,
      isOnline,
      isSyncing,
      simulateOffline,
      setSimulateOffline,
      pendingCount,
      isPending,
      upsert,
      remove,
      resetData,
    }),
    [state, isOnline, isSyncing, simulateOffline, pendingCount, isPending, upsert, remove, resetData],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
