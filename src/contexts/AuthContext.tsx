import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export interface DemoAccount {
  email: string;
  password: string;
  name: string;
  role: string;
  blurb: string;
}

export interface AuthUser {
  email: string;
  name: string;
  role: string;
}

/** Shared demo password across every seeded account. */
export const DEMO_PASSWORD = 'build@2026';

/**
 * Konstructify is a client-only, offline-first app (localStorage, no backend),
 * so these accounts are a local demo gate — credentials are matched in the
 * browser, not sent anywhere. They exist to showcase role framing, not to
 * enforce real security.
 */
export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    email: 'owner@konstructify.in',
    password: DEMO_PASSWORD,
    name: 'Rajesh Kothari',
    role: 'Owner',
    blurb: 'Full access — projects, credit, cash flow',
  },
  {
    email: 'sitemanager@konstructify.in',
    password: DEMO_PASSWORD,
    name: 'Anita Deshmukh',
    role: 'Site Manager',
    blurb: 'Work status, orders, on-site progress',
  },
  {
    email: 'accounts@konstructify.in',
    password: DEMO_PASSWORD,
    name: 'Farhan Qureshi',
    role: 'Accountant',
    blurb: 'Payments, vendor credit, budgeting',
  },
];

const STORAGE_KEY = 'konstructify-auth-v1';

function loadUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthUser;
    if (parsed.email && parsed.name && parsed.role) return parsed;
  } catch {
    // corrupted — treat as logged out
  }
  return null;
}

interface AuthContextValue {
  user: AuthUser | null;
  /** Returns an error message on failure, or null on success. */
  login: (email: string, password: string) => string | null;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(loadUser);

  const login = useCallback((email: string, password: string): string | null => {
    const match = DEMO_ACCOUNTS.find(
      (a) => a.email.toLowerCase() === email.trim().toLowerCase(),
    );
    if (!match) return 'No account found for that email. Try a demo account below.';
    if (match.password !== password) return 'Incorrect password. Demo password is shown below.';
    const next: AuthUser = { email: match.email, name: match.name, role: match.role };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // storage unavailable — keep in-memory session anyway
    }
    setUser(next);
    return null;
  }, []);

  const logout = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({ user, login, logout }), [user, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
