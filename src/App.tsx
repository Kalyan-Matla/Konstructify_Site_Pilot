import { useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppProvider } from './contexts/AppContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
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

/** Auth gate: unauthenticated users see the landing/login flow. */
function Shell() {
  const { user } = useAuth();
  if (!user) return <PublicShell />;
  return (
    <AppProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/vendors" element={<Vendors />} />
            <Route path="/credits" element={<Credits />} />
            <Route path="/work-status" element={<WorkStatus />} />
            <Route path="/work-orders" element={<WorkOrders />} />
            <Route path="/budgeting" element={<Budgeting />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="*" element={<Dashboard />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}
