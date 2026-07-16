import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface RouteActionState {
  openNew?: boolean;
  openView?: string;
}

/**
 * Lets the command palette's "New X" and search-result actions drive a
 * page's local modal state by navigating with router state, instead of
 * lifting every page's create/detail state into a global store. The page
 * declares what it can do; the palette just navigates.
 */
export function useRouteAction(handlers: { openNew?: () => void; openView?: (id: string) => void }) {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const state = location.state as RouteActionState | null;
    if (!state) return;
    if (state.openNew) handlers.openNew?.();
    if (state.openView) handlers.openView?.(state.openView);
    if (state.openNew || state.openView) {
      navigate(location.pathname, { replace: true, state: {} });
    }
    // Only re-run when the router state itself changes — the handlers are
    // inline setState calls at the call site and don't need to retrigger this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);
}
