import { useCallback, useState } from 'react';

/** Shared multi-select state for list pages that offer bulk actions
 *  (delete, mark complete, ...). Selection is id-based so it survives the
 *  underlying list re-filtering. */
export function useBulkSelect() {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clear = useCallback(() => setSelected(new Set()), []);

  const setAll = useCallback((ids: string[]) => setSelected(new Set(ids)), []);

  return { selected, toggle, clear, setAll };
}
