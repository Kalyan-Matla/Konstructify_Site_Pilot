import { NavLink, Outlet } from 'react-router-dom';
import {
  BarChart3,
  ClipboardList,
  CreditCard,
  FileText,
  FolderOpen,
  HardHat,
  IndianRupee,
  LayoutDashboard,
  Menu,
  Users,
  Wallet,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';
import { useApp } from '../contexts/AppContext';

const NAV = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Projects', path: '/projects', icon: FolderOpen },
  { name: 'Vendors', path: '/vendors', icon: Users },
  { name: 'Vendor Credits', path: '/credits', icon: Wallet },
  { name: 'Work Status', path: '/work-status', icon: HardHat },
  { name: 'Work Orders', path: '/work-orders', icon: ClipboardList },
  { name: 'Budgeting', path: '/budgeting', icon: IndianRupee },
  { name: 'Payments', path: '/payments', icon: CreditCard },
  { name: 'Reports', path: '/reports', icon: BarChart3 },
] as const;

const MOBILE_TABS = NAV.filter((n) =>
  ['Dashboard', 'Projects', 'Vendors', 'Payments'].includes(n.name),
);
const MORE_TABS = NAV.filter(
  (n) => !['Dashboard', 'Projects', 'Vendors', 'Payments'].includes(n.name),
);

export default function Layout() {
  const { isOnline, isSyncing, pendingCount, simulateOffline, setSimulateOffline, resetData } =
    useApp();
  const [moreOpen, setMoreOpen] = useState(false);

  const syncLabel = isSyncing
    ? `⏳ Syncing (${pendingCount})`
    : pendingCount > 0
      ? `⏳ ${pendingCount} pending`
      : '✓ Synced';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-3">
          <div className="flex items-center gap-2">
            <HardHat className="text-blue-700" size={24} aria-hidden="true" />
            <span className="text-lg font-bold text-gray-900">Konstructify</span>
          </div>
          <div className="flex items-center gap-3">
            <span aria-live="polite" className="hidden text-sm text-gray-600 sm:inline">
              {syncLabel}
            </span>
            <button
              type="button"
              onClick={() => setSimulateOffline(!simulateOffline)}
              aria-pressed={simulateOffline}
              aria-label={isOnline ? 'Online — click to simulate offline' : 'Offline — click to go back online'}
              title={isOnline ? 'Online — click to simulate offline' : 'Offline — click to reconnect'}
              className={clsx(
                'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500',
                isOnline ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800',
              )}
            >
              {isOnline ? <Wifi size={14} aria-hidden="true" /> : <WifiOff size={14} aria-hidden="true" />}
              {isOnline ? 'Online' : 'Offline'}
            </button>
          </div>
        </div>
        {!isOnline && (
          <div className="bg-amber-50 px-4 py-1.5 text-center text-xs font-medium text-amber-800">
            Working offline — changes are saved locally and will sync when you reconnect.
          </div>
        )}
      </header>

      <div className="mx-auto flex max-w-7xl">
        {/* Desktop sidebar */}
        <nav aria-label="Main navigation" className="hidden w-56 shrink-0 border-r border-gray-200 bg-white md:block">
          <ul className="sticky top-14 space-y-1 p-3">
            {NAV.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500',
                      isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100',
                    )
                  }
                >
                  <item.icon size={18} aria-hidden="true" />
                  {item.name}
                </NavLink>
              </li>
            ))}
            <li className="pt-3">
              <button
                type="button"
                onClick={resetData}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <FileText size={18} aria-hidden="true" />
                Reset demo data
              </button>
            </li>
          </ul>
        </nav>

        {/* Main content */}
        <main className="min-w-0 flex-1 px-4 py-5 pb-24 md:pb-8">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav
        aria-label="Primary"
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white md:hidden"
      >
        <div className="flex justify-around">
          {MOBILE_TABS.map((tab) => (
            <NavLink
              key={tab.path}
              to={tab.path}
              end={tab.path === '/'}
              className={({ isActive }) =>
                clsx(
                  'flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500',
                  isActive ? 'border-t-2 border-blue-600 text-blue-700' : 'text-gray-600',
                )
              }
            >
              <tab.icon size={22} aria-hidden="true" />
              {tab.name}
            </NavLink>
          ))}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-haspopup="dialog"
            className="flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium text-gray-600 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
          >
            <Menu size={22} aria-hidden="true" />
            More
          </button>
        </div>
      </nav>

      {/* Mobile "More" sheet */}
      {moreOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 md:hidden" onClick={() => setMoreOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="More navigation"
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-0 left-0 right-0 rounded-t-2xl bg-white p-4"
          >
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900">More</h2>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                aria-label="Close menu"
                className="rounded p-1 text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <X size={20} />
              </button>
            </div>
            <ul className="space-y-1">
              {MORE_TABS.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    onClick={() => setMoreOpen(false)}
                    className={({ isActive }) =>
                      clsx(
                        'flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500',
                        isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100',
                      )
                    }
                  >
                    <item.icon size={18} aria-hidden="true" />
                    {item.name}
                  </NavLink>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onClick={() => {
                    resetData();
                    setMoreOpen(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-3 text-sm font-medium text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <FileText size={18} aria-hidden="true" />
                  Reset demo data
                </button>
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
