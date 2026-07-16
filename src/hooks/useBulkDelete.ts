import type { EntityKind } from '../types';
import { useApp, type Entity } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';

/** Bulk-delete N items as one consolidated toast (not N individual ones),
 *  with a single "Undo" that restores every item — mirrors the app's
 *  single-item delete/undo convention instead of inventing a new one. */
export function useBulkDelete<T extends Entity>(entity: EntityKind, itemLabel: string) {
  const { remove, upsert } = useApp();
  const { toast } = useToast();

  return (items: T[], labelFor: (item: T) => string) => {
    if (items.length === 0) return;
    for (const item of items) {
      remove(entity, item.id, labelFor(item), { silent: true });
    }
    toast(`${items.length} ${itemLabel}${items.length === 1 ? '' : 's'} deleted`, {
      tone: 'info',
      action: {
        label: 'Undo',
        onClick: () => {
          for (const item of items) {
            const label = labelFor(item);
            const restored = /deleted$/.test(label)
              ? label.replace(/deleted$/, 'restored')
              : `${label.replace(/\.$/, '')} — restored`;
            upsert(entity, item, restored, { silent: true });
          }
          toast(`${items.length} ${itemLabel}${items.length === 1 ? '' : 's'} restored`, { tone: 'success' });
        },
      },
    });
  };
}
