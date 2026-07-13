import { useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Eye, EyeOff, HardHat, Wifi } from 'lucide-react';
import { DEMO_ACCOUNTS, DEMO_PASSWORD, useAuth } from '../contexts/AuthContext';
import { inputCls } from '../components/ui';

/** Hand-authored blueprint site scene — no external assets. */
export function SiteScene() {
  return (
    <svg viewBox="0 0 900 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true" className="h-full w-full">
      <defs>
        <linearGradient id="tower" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1A2230" />
          <stop offset="1" stopColor="#10151F" />
        </linearGradient>
      </defs>
      {/* drifting moon + specks */}
      <circle cx="720" cy="96" r="30" fill="#FFB020" opacity="0.28" className="anim-float-slow" />
      <circle cx="160" cy="130" r="3" fill="#FFB020" opacity="0.5" className="anim-float" />
      <circle cx="300" cy="80" r="2" fill="#ffffff" opacity="0.35" className="anim-float-slow" />
      <circle cx="600" cy="150" r="2.5" fill="#ffffff" opacity="0.3" className="anim-float" />

      {/* tower crane */}
      <g stroke="#FFB020" strokeWidth="3" fill="none" opacity="0.9">
        <path d="M200 590 V200 M182 590 V200 M182 250 h18 M182 320 h18 M182 390 h18 M182 460 h18 M182 530 h18
                 M182 200 l18 35 M200 250 l-18 35 M182 320 l18 35 M200 390 l-18 35 M182 460 l18 35" />
        <path d="M70 200 H470 M70 200 l112 -36 M470 200 l-288 -36 M182 164 v36" />
        <path d="M380 200 v80" />
      </g>
      <rect x="368" y="280" width="24" height="22" rx="3" fill="#FFB020" opacity="0.85" className="anim-hook" />
      <rect x="72" y="220" width="34" height="24" rx="3" fill="#33405A" />

      {/* building under construction */}
      <g>
        <rect x="270" y="360" width="200" height="240" fill="url(#tower)" />
        <g stroke="#33405A" strokeWidth="3">
          <path d="M270 420 h200 M270 480 h200 M270 540 h200" />
          <path d="M320 360 v240 M370 360 v240 M420 360 v240" />
        </g>
        <g fill="#FFB020">
          <rect x="278" y="428" width="30" height="14" rx="2" opacity="0.85" className="anim-window-a" />
          <rect x="378" y="488" width="30" height="14" rx="2" opacity="0.6" className="anim-window-b" />
          <rect x="328" y="548" width="30" height="14" rx="2" opacity="0.8" className="anim-window-a" />
        </g>
        <path d="M270 360 h200" stroke="#FFB020" strokeWidth="3" opacity="0.7" />
      </g>

      {/* finished tower with lit windows */}
      <g>
        <rect x="530" y="270" width="160" height="330" fill="url(#tower)" />
        <g fill="#FFB020">
          {Array.from({ length: 6 }, (_, r) =>
            Array.from({ length: 4 }, (_, c) => (
              <rect
                key={`${r}-${c}`}
                x={548 + c * 32}
                y={294 + r * 50}
                width="18"
                height="26"
                rx="2"
                opacity={(r * 4 + c) % 3 === 0 ? 0.8 : 0.18}
              />
            )),
          )}
        </g>
      </g>

      {/* ground line */}
      <rect x="0" y="592" width="900" height="8" fill="#000000" opacity="0.4" />
    </svg>
  );
}

export default function Login({ onBack }: { onBack?: () => void }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const fill = (accEmail: string) => {
    setEmail(accEmail);
    setPassword(DEMO_PASSWORD);
    setError('');
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    // Small delay so the button state reads as a real sign-in.
    setTimeout(() => {
      const err = login(email, password);
      if (err) {
        setError(err);
        setBusy(false);
      }
      // On success, AuthProvider flips `user` and App swaps to the app shell.
    }, 220);
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left — the form */}
      <div className="flex flex-col justify-center px-6 py-10 sm:px-12 lg:px-16">
        <div className="mx-auto w-full max-w-sm animate-fade-up">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="mb-6 flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-ink/50 transition-colors hover:text-ink focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <ArrowLeft size={15} aria-hidden="true" /> Back to home
            </button>
          )}
          <div className="mb-8 flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink text-amber-glow shadow-raise">
              <HardHat size={22} aria-hidden="true" />
            </span>
            <span className="font-display text-2xl tracking-tight text-ink">Konstructify</span>
          </div>

          <h1 className="font-display text-3xl leading-tight text-ink sm:text-4xl">
            Every site, every rupee.
          </h1>
          <p className="mt-2 text-sm text-ink/55">
            Sign in to your ledger. Offline-first — your data lives on this device.
          </p>

          <form onSubmit={submit} noValidate className="mt-7">
            {error && (
              <p role="alert" className="mb-4 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700 ring-1 ring-inset ring-red-600/15">
                {error}
              </p>
            )}
            <div className="mb-3">
              <label htmlFor="lg-email" className="mb-1 block text-xs font-bold uppercase tracking-wide text-ink/60">
                Email
              </label>
              <input
                id="lg-email"
                type="email"
                autoComplete="username"
                autoFocus
                className={inputCls}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@konstructify.in"
              />
            </div>
            <div className="mb-4">
              <label htmlFor="lg-pw" className="mb-1 block text-xs font-bold uppercase tracking-wide text-ink/60">
                Password
              </label>
              <div className="relative">
                <input
                  id="lg-pw"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  className={`${inputCls} pr-11`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded-lg p-1.5 text-ink/45 transition-colors hover:bg-ink/5 hover:text-ink focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={busy}
              className="btn-primary flex w-full items-center justify-center gap-2 py-2.5 disabled:cursor-wait disabled:opacity-70"
            >
              {busy ? 'Signing in…' : 'Sign in'}
              {!busy && <ArrowRight size={16} aria-hidden="true" />}
            </button>
          </form>

          {/* Demo accounts */}
          <div className="mt-7">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink/45">
              Demo accounts · password{' '}
              <code className="num rounded bg-ink/[0.06] px-1.5 py-0.5 text-ink/70">{DEMO_PASSWORD}</code>
            </p>
            <div className="space-y-2">
              {DEMO_ACCOUNTS.map((a) => (
                <button
                  key={a.email}
                  type="button"
                  onClick={() => fill(a.email)}
                  className="panel panel-hover group flex w-full cursor-pointer items-center justify-between gap-3 p-3 text-left focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <span className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ink text-xs font-bold text-amber-glow">
                      {a.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-ink">{a.role}</span>
                      <span className="block text-xs text-ink/50">{a.blurb}</span>
                    </span>
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wide text-amber-700 opacity-0 transition-opacity group-hover:opacity-100">
                    Fill →
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right — blueprint hero (desktop only) */}
      <div className="blueprint relative hidden overflow-hidden lg:block">
        <div className="absolute inset-0">
          <SiteScene />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-12">
          <p className="font-display text-3xl leading-tight text-white">
            Concrete cures overnight.<br />
            <span className="text-amber-glow">Your numbers shouldn't have to.</span>
          </p>
          <p className="mt-3 max-w-md text-sm text-white/60">
            Vendor credit, payments, work status and cash-flow forecasts — live, on every
            device, even when the site has no signal.
          </p>
          <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white/70 backdrop-blur">
            <Wifi size={13} aria-hidden="true" /> Works offline
          </p>
        </div>
      </div>
    </div>
  );
}
