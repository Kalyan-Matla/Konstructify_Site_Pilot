import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Account, AuthUser, AuthzContext, ResourceRef } from '../auth/can';
import { can as canCheck, canReachProject as reachCheck } from '../auth/can';
import type { Capability } from '../auth/capabilities';
import { DEMO_PASSWORD, USERS, findAccount, findUserByEmail } from '../auth/seed';

export { DEMO_PASSWORD };

const STORAGE_KEY = 'konstructify-auth-v2';

interface StoredSession {
  userId: string;
}

function loadSession(): { user: AuthUser; account: Account } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const { userId } = JSON.parse(raw) as StoredSession;
    const user = USERS.find((u) => u.id === userId);
    if (!user) return null;
    const account = findAccount(user.accountId);
    if (!account) return null;
    return { user, account };
  } catch {
    return null; // corrupted — treat as logged out
  }
}

interface AuthContextValue {
  user: AuthUser | null;
  account: Account | null;
  /** Assembled authorization context, or null when signed out. */
  ctx: AuthzContext | null;
  /**
   * Gate 4 — a USABILITY check that runs on the user's own device.
   * It decides whether to render a control. It is not a security boundary:
   * sync rules, the mutation API and row-level security all re-check
   * everything it says. See `src/auth/can.ts`.
   */
  can: (capability: Capability, resource?: ResourceRef) => boolean;
  canReachProject: (projectId: string) => boolean;
  /** Returns an error message on failure, or null on success. */
  login: (email: string, password: string) => string | null;
  /** Demo affordance — re-sign-in as any seeded user without a password. */
  switchUser: (userId: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState(loadSession);

  const persist = useCallback((user: AuthUser, account: Account) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ userId: user.id } satisfies StoredSession));
    } catch {
      // storage unavailable — keep the in-memory session anyway
    }
    setSession({ user, account });
  }, []);

  const login = useCallback(
    (email: string, password: string): string | null => {
      const user = findUserByEmail(email);
      if (!user) return 'No account found for that email. Try a demo account below.';
      if (password !== DEMO_PASSWORD) return 'Incorrect password. The demo password is shown below.';
      const account = findAccount(user.accountId);
      if (!account) return 'That user is not attached to an account. Contact your administrator.';
      if (account.status === 'pending-approval') {
        return `${account.name} is awaiting Super Admin approval. You cannot sign in yet.`;
      }
      if (account.status === 'suspended') {
        return `${account.name} has been suspended. Contact your administrator.`;
      }
      persist(user, account);
      return null;
    },
    [persist],
  );

  const switchUser = useCallback(
    (userId: string) => {
      const user = USERS.find((u) => u.id === userId);
      if (!user) return;
      const account = findAccount(user.accountId);
      if (!account || account.status !== 'active') return;
      persist(user, account);
    },
    [persist],
  );

  const logout = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    setSession(null);
  }, []);

  const ctx = useMemo<AuthzContext | null>(
    () => (session ? { user: session.user, account: session.account } : null),
    [session],
  );

  const can = useCallback(
    (capability: Capability, resource?: ResourceRef) => canCheck(ctx, capability, resource),
    [ctx],
  );

  const canReachProject = useCallback((projectId: string) => reachCheck(ctx, projectId), [ctx]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      account: session?.account ?? null,
      ctx,
      can,
      canReachProject,
      login,
      switchUser,
      logout,
    }),
    [session, ctx, can, canReachProject, login, switchUser, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

/** Convenience hook for the common single-capability check. */
export function useCan(capability: Capability, resource?: ResourceRef): boolean {
  return useAuth().can(capability, resource);
}
