import { useState, type ReactNode } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ShieldOff } from 'lucide-react';
import { AppProvider } from './contexts/AppContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { PERSONA_LABELS, type Capability } from './auth/capabilities';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import Vendors from './pages/Vendors';
import Credits from './pages/Credits';
import WorkStatus from './pages/WorkStatus';
import WorkOrders from './pages/WorkOrders';
import Budgeting from './pages/Budgeting';
import Payments from './pages/Payments';
import Reports from './pages/Reports';

/** Public entry: a marketing landing page that leads into the login screen. */
function PublicShell() {
  const [view, setView] = useState<'landing' | 'login'>('landing');
  if (view === 'login') return <Login onBack={() => setView('landing')} />;
  return <Landing onEnter={() => setView('login')} />;
}

/** Shown in place of a page the current persona cannot open. Honest and
 *  specific beats a silent redirect — the user learns why, and who to ask. */
function NoAccess() {
  const { user } = useAuth();
  return (
    <div className="flex animate-fade-up flex-col items-center rounded-2xl border border-dashed border-ink/20 bg-white/60 px-6 py-16 text-center">
      <span className="mb-3.5 flex h-12 w-12 items-center justify-center rounded-2xl bg-ink text-amber-glow shadow-raise">
        <ShieldOff size={22} aria-hidden="true" />
      </span>
      <p className="font-display text-lg text-ink">This page isn't part of your role</p>
      <p className="mt-1 max-w-sm text-sm text-ink/55">
        {user
          ? `Your ${PERSONA_LABELS[user.persona]} persona doesn't include this module. If you need it, ask your account owner to adjust your access.`
          : 'Sign in to continue.'}
      </p>
    </div>
  );
}

/**
 * Route-level gate. The sidebar already hides pages a persona cannot open,
 * but hiding a link is not gating the destination — a typed URL, an old
 * bookmark, or a shared deep link lands here directly. Same Gate 4 caveat
 * as everywhere: this is coherent UX, not a security boundary; sync rules
 * will keep the data itself off the device in Phase 2.
 */
function Guarded({ capability, children }: { capability: Capability; children: ReactNode }) {
  const { can } = useAuth();
  if (!can(capability)) return <NoAccess />;
  return <>{children}</>;
}

/** Auth gate: unauthenticated users see the landing/login flow. */
function Shell() {
  const { user } = useAuth();
  if (!user) return <PublicShell />;
  return (
    <AppProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Guarded capability="dashboard:view"><Dashboard /></Guarded>} />
            <Route path="/projects" element={<Guarded capability="projects:view"><Projects /></Guarded>} />
            <Route path="/vendors" element={<Guarded capability="vendors:view"><Vendors /></Guarded>} />
            <Route path="/credits" element={<Guarded capability="credits:view"><Credits /></Guarded>} />
            <Route path="/work-status" element={<Guarded capability="work-status:view"><WorkStatus /></Guarded>} />
            <Route path="/work-orders" element={<Guarded capability="work-orders:view"><WorkOrders /></Guarded>} />
            <Route path="/budgeting" element={<Guarded capability="budgeting:view"><Budgeting /></Guarded>} />
            <Route path="/payments" element={<Guarded capability="payments:view"><Payments /></Guarded>} />
            <Route path="/reports" element={<Guarded capability="reports:view"><Reports /></Guarded>} />
            <Route path="*" element={<Guarded capability="dashboard:view"><Dashboard /></Guarded>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Shell />
      </AuthProvider>
    </ToastProvider>
  );
}
