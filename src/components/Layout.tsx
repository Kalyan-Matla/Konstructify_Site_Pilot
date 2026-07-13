import { NavLink, Outlet } from 'react-router-dom';
import {
  BarChart3,
  ClipboardList,
  CreditCard,
  FolderOpen,
  HardHat,
  IndianRupee,
  LayoutDashboard,
  LogOut,
  Menu,
  RotateCcw,
  Users,
  Wallet,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';

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
  const { user, logout } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userMenu) return;
    const onClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenu(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [userMenu]);

  const initials = user
    ? user.name.split(' ').map((w) => w[0]).join('').slice(0, 2)
    : '';

  const syncLabel = isSyncing
    ? `⏳ Syncing (${pendingCount})`
    : pendingCount > 0
      ? `⏳ ${pendingCount} pending`
      : '✓ Synced';

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="glass no-print sticky top-0 z-40">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink text-amber-glow shadow-raise">
              <HardHat size={20} aria-hidden="true" />
            </span>
            <span className="font-display text-xl tracking-tight text-ink">Konstructify</span>
          </div>
          <div className="flex items-center gap-3">
            <span aria-live="polite" className="num hidden text-xs font-bold text-ink/60 sm:inline">
              {syncLabel}
            </span>
            <button
              type="button"
              onClick={() => setSimulateOffline(!simulateOffline)}
              aria-pressed={simulateOffline}
              aria-label={isOnline ? 'Online — click to simulate offline' : 'Offline — click to go back online'}
              title={isOnline ? 'Online — click to simulate offline' : 'Offline — click to reconnect'}
              className={clsx(
                'flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-amber-500',
                isOnline
                  ? 'bg-emerald-100 text-emerald-900 ring-1 ring-inset ring-emerald-600/25'
                  : 'bg-red-100 text-red-900 ring-1 ring-inset ring-red-600/25',
              )}
            >
              {isOnline ? <Wifi size={14} aria-hidden="true" /> : <WifiOff size={14} aria-hidden="true" />}
              {isOnline ? 'Online' : 'Offline'}
            </button>

            {user && (
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setUserMenu((s) => !s)}
                  aria-haspopup="menu"
                  aria-expanded={userMenu}
                  aria-label={`Account menu for ${user.name}`}
                  className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-ink text-xs font-bold text-amber-glow shadow-raise transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
                >
                  {initials}
                </button>
                {userMenu && (
                  <div
                    role="menu"
                    className="absolute right-0 top-11 z-50 w-56 animate-pop-in overflow-hidden rounded-2xl bg-white shadow-lift ring-1 ring-ink/10"
                  >
                    <div className="border-b border-ink/10 px-4 py-3">
                      <p className="text-sm font-bold text-ink">{user.name}</p>
                      <p className="text-xs text-ink/50">{user.role}</p>
                      <p className="num mt-0.5 truncate text-[11px] text-ink/40">{user.email}</p>
                    </div>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={logout}
                      className="flex w-full cursor-pointer items-center gap-2.5 px-4 py-3 text-sm font-semibold text-ink/75 transition-colors hover:bg-paper-soft hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-amber-500"
                    >
                      <LogOut size={16} aria-hidden="true" />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        {!isOnline && (
          <div className="animate-fade-up bg-amber-glow px-4 py-1.5 text-center text-xs font-bold text-ink">
            Working offline — changes are saved locally and will sync when you reconnect.
          </div>
        )}
      </header>

      <div className="mx-auto flex max-w-7xl">
        {/* Desktop sidebar — dark blueprint shell */}
        <nav
          aria-label="Main navigation"
          className="blueprint no-print my-5 ml-4 hidden w-60 shrink-0 self-start rounded-3xl shadow-lift md:block"
        >
          <ul className="sticky top-20 space-y-0.5 p-3">
            {NAV.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    clsx(
                      'group relative flex items-center gap-3 overflow-hidden rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-amber-500',
                      isActive
                        ? 'bg-white/10 text-amber-glow'
                        : 'text-white/60 hover:bg-white/5 hover:text-white',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <span
                          aria-hidden="true"
                          className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-amber-glow shadow-glow"
                        />
                      )}
                      <item.icon
                        size={18}
                        aria-hidden="true"
                        className="transition-transform duration-200 group-hover:-translate-y-0.5"
                      />
                      {item.name}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
            <li className="pt-3">
              <button
                type="button"
                onClick={resetData}
                className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-white/40 transition-colors hover:bg-white/5 hover:text-white/70 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <RotateCcw size={18} aria-hidden="true" />
                Reset demo data
              </button>
            </li>
          </ul>
        </nav>

        {/* Main content */}
        <main className="min-w-0 flex-1 px-4 py-6 pb-28 md:px-8 md:pb-10">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom dock */}
      <nav
        aria-label="Primary"
        className="no-print fixed bottom-3 left-3 right-3 z-40 rounded-2xl bg-ink/95 shadow-lift backdrop-blur-xl md:hidden"
      >
        <div className="flex justify-around">
          {MOBILE_TABS.map((tab) => (
            <NavLink
              key={tab.path}
              to={tab.path}
              end={tab.path === '/'}
              className={({ isActive }) =>
                clsx(
                  'flex min-h-[54px] flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-2xl py-2 text-[10px] font-bold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-amber-500',
                  isActive ? 'text-amber-glow' : 'text-white/50',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <tab.icon
                    size={21}
                    aria-hidden="true"
                    className={clsx('transition-transform duration-200', isActive && '-translate-y-0.5')}
                  />
                  {tab.name}
                  <span
                    aria-hidden="true"
                    className={clsx(
                      'h-1 w-1 rounded-full bg-amber-glow transition-opacity',
                      isActive ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                </>
              )}
            </NavLink>
          ))}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-haspopup="dialog"
            className="flex min-h-[54px] flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-bold text-white/50 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-amber-500"
          >
            <Menu size={21} aria-hidden="true" />
            More
            <span aria-hidden="true" className="h-1 w-1 rounded-full opacity-0" />
          </button>
        </div>
      </nav>

      {/* Mobile "More" sheet */}
      {moreOpen && (
        <div
          className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-sm md:hidden"
          onClick={() => setMoreOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="More navigation"
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-0 left-0 right-0 animate-pop-in rounded-t-3xl bg-paper-soft p-4 shadow-lift"
          >
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-display text-lg text-ink">More</h2>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                aria-label="Close menu"
                className="cursor-pointer rounded-full p-1.5 text-ink/50 hover:bg-ink/5 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <X size={20} />
              </button>
            </div>
            <ul className="stagger space-y-1">
              {MORE_TABS.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    onClick={() => setMoreOpen(false)}
                    className={({ isActive }) =>
                      clsx(
                        'flex cursor-pointer items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500',
                        isActive ? 'bg-ink text-amber-glow' : 'text-ink/75 hover:bg-ink/5',
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
                  className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold text-ink/45 transition-colors hover:bg-ink/5 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <RotateCcw size={18} aria-hidden="true" />
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
