import {
  ArrowRight,
  BarChart3,
  CreditCard,
  HardHat,
  ShieldCheck,
  Wallet,
  WifiOff,
} from 'lucide-react';
import { useTilt } from '../hooks/useFx';
import { SiteScene } from './Login';

const FEATURES = [
  {
    icon: Wallet,
    title: 'Vendor credit, live',
    body: 'Every vendor’s limit, usage and aging in one view — with alerts before a line maxes out.',
  },
  {
    icon: WifiOff,
    title: 'Offline-first',
    body: 'Log progress, photos and invoices on site with no signal. It syncs the moment you reconnect.',
  },
  {
    icon: CreditCard,
    title: 'Payments that free credit',
    body: 'Schedule NEFT/RTGS, track settlement, and watch a vendor’s credit open back up instantly.',
  },
  {
    icon: BarChart3,
    title: '30-day cash-flow forecast',
    body: 'Week-by-week payables and predicted overruns, so surprises never reach the site.',
  },
];

const STATS = [
  ['9', 'core modules'],
  ['₹5L–5Cr', 'project range'],
  ['3–5', 'sites at once'],
  ['100%', 'on-device data'],
];

export default function Landing({ onEnter }: { onEnter: () => void }) {
  const tiltRef = useTilt(8);

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <header className="glass sticky top-0 z-40">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink text-amber-glow shadow-raise">
              <HardHat size={20} aria-hidden="true" />
            </span>
            <span className="font-display text-xl tracking-tight text-ink">Konstructify</span>
          </div>
          <button type="button" onClick={onEnter} className="btn-primary btn-sm">
            Sign in
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-14 lg:grid-cols-2 lg:py-20">
        <div className="animate-fade-up">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-ink/[0.06] px-3 py-1 text-xs font-bold uppercase tracking-wide text-ink/60">
            <ShieldCheck size={13} aria-hidden="true" /> Built for Indian contractors
          </span>
          <h1 className="mt-4 font-display text-4xl leading-[1.05] tracking-tight text-ink sm:text-5xl lg:text-6xl">
            Every site.<br />
            Every rupee.<br />
            <span className="text-amber-600">One ledger.</span>
          </h1>
          <p className="mt-5 max-w-md text-base text-ink/60">
            Konstructify runs the money spine of your construction business — projects, vendor
            credit, payments and cash flow — so the numbers reach you before the excuses do.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onEnter}
              className="btn-primary flex items-center gap-2 px-5 py-2.5 text-base"
            >
              Enter the live demo <ArrowRight size={18} aria-hidden="true" />
            </button>
            <a href="#features" className="btn-ghost px-5 py-2.5 text-base">
              See what’s inside
            </a>
          </div>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-ink/40">
            No sign-up · seeded demo data · works offline
          </p>
        </div>

        {/* Blueprint visual with a floating tilt preview card */}
        <div className="relative animate-fade-up">
          <div className="blueprint relative aspect-[4/3] overflow-hidden rounded-3xl shadow-lift">
            <SiteScene />
            <div className="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-transparent" />
          </div>
          <div
            ref={tiltRef}
            className="tilt absolute -bottom-6 -left-4 w-56 rounded-2xl bg-paper-soft p-4 shadow-lift sm:-left-6 sm:w-64"
          >
            <div className="tilt-inner">
              <p className="text-[11px] font-bold uppercase tracking-wider text-ink/45">
                Payables &lt;30 days
              </p>
              <p className="num mt-1 text-2xl font-bold text-ink">₹28.5L</p>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-ink/10">
                <span className="block h-full w-3/4 rounded-full bg-gradient-to-r from-amber-glow to-orange-500" />
              </div>
              <p className="mt-1.5 text-xs font-semibold text-emerald-700">₹1.5L credit freed today</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats band */}
      <section className="border-y border-ink/10 bg-white/50">
        <div className="stagger mx-auto grid max-w-6xl grid-cols-2 gap-6 px-5 py-8 sm:grid-cols-4">
          {STATS.map(([big, label]) => (
            <div key={label} className="text-center">
              <p className="num font-display text-3xl text-ink">{big}</p>
              <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-ink/45">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="font-display text-3xl tracking-tight text-ink sm:text-4xl">
          The whole job, on one screen.
        </h2>
        <p className="mt-2 max-w-lg text-base text-ink/55">
          Nine modules that talk to each other — the moment an invoice lands, credit, budgets and
          cash flow all update.
        </p>
        <div className="stagger mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="panel panel-hover p-5">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-ink text-amber-glow shadow-raise">
                <f.icon size={20} aria-hidden="true" />
              </span>
              <h3 className="mt-3.5 font-display text-lg text-ink">{f.title}</h3>
              <p className="mt-1.5 text-sm text-ink/60">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Closing CTA */}
      <section className="mx-auto max-w-6xl px-5 pb-16">
        <div className="blueprint relative overflow-hidden rounded-3xl p-8 text-center shadow-lift sm:p-14">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-amber-glow/15 blur-3xl"
          />
          <h2 className="relative font-display text-3xl text-white sm:text-4xl">
            Run every site from one ledger.
          </h2>
          <p className="relative mx-auto mt-3 max-w-md text-sm text-white/60">
            Jump straight into a fully seeded demo — three projects, eight vendors, live credit and
            payments. Nothing to install.
          </p>
          <button
            type="button"
            onClick={onEnter}
            className="btn-primary relative mx-auto mt-6 flex items-center gap-2 px-6 py-3 text-base"
          >
            Enter the demo <ArrowRight size={18} aria-hidden="true" />
          </button>
        </div>
        <p className="mt-8 text-center text-xs text-ink/40">
          © 2026 Konstructify · Offline-first construction management · Mock demo data
        </p>
      </section>
    </div>
  );
}
