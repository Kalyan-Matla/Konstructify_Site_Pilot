import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ArrowRight,
  BarChart3,
  CreditCard,
  FolderOpen,
  HardHat,
  LayoutDashboard,
  ShieldCheck,
  Users,
  Wallet,
  WifiOff,
} from 'lucide-react';
import clsx from 'clsx';

/** Web-hosted construction photography — the landing needs a connection; the
 *  app itself stays fully offline. Containers fall back to a dark panel if an
 *  image fails to load, so the layout never breaks. */
const IMG = (id: string, w = 1600) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;
const PHOTOS = {
  hero: IMG('1541888946425-d81bb19240f5', 2000), // reinforcement + formwork on an active site
  plans: IMG('1503387762-592deb58ef4e', 1200), // drawings on the drafting table
  crew: IMG('1504307651254-35680f356dfd', 1200), // engineers walking the slab
  steel: IMG('1581094794329-c8112a89af12', 1200), // checks on the steel line
  facade: IMG('1487958449943-2429e8be8625', 1600), // finished concrete facade
};

const FLOW: [string, string][] = [
  ['Onboard the vendor', 'Add a vendor with their credit limit and payment terms — COD to 30-day net.'],
  ['Raise the invoice', 'Log a bill against a project; it draws the vendor’s credit down instantly.'],
  ['Watch the exposure', 'Aging buckets and >80% alerts fire before a credit line ever maxes out.'],
  ['Schedule payment', 'Pay via NEFT or RTGS and track settlement without leaving the app.'],
  ['Credit frees itself', 'The moment it settles, the vendor’s credit opens back up for the next order.'],
];

const ROLES: [string, string][] = [
  ['Owner', 'Budgets, credit exposure and cash flow across every site on one screen.'],
  ['Site Manager', 'Work status, progress photos and orders logged from the slab, not the office.'],
  ['Accountant', 'Payments, aging buckets and vendor credit that actually reconciles.'],
  ['Procurement', 'Vendors, credit lines and invoices — with alternatives when a line is full.'],
  ['Planner', 'BOQ estimates against live actual spend, variance flagged as it happens.'],
  ['The whole crew', 'Offline-first, so the site never waits for a signal to keep moving.'],
];

/** Count-up that triggers when it scrolls into view. */
function CountUp({ to, suffix = '' }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [val, setVal] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVal(to);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        io.disconnect();
        const t0 = performance.now();
        const step = (t: number) => {
          const p = Math.min(1, (t - t0) / 900);
          setVal(Math.round(to * (1 - Math.pow(1 - p, 4))));
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [to]);
  return (
    <span ref={ref}>
      {val}
      {suffix}
    </span>
  );
}

/** Miniature of the real dashboard — the product is the picture. */
function ProductMock() {
  const rows: [string, number][] = [
    ['Residential Complex, Mumbai', 58],
    ['Commercial Building, Bangalore', 32],
    ['Renovation Project, Delhi', 8],
  ];
  const rail = [LayoutDashboard, FolderOpen, Users, Wallet, CreditCard];
  return (
    <div className="w-full overflow-hidden rounded-2xl border border-white/10 bg-paper-soft shadow-lift">
      {/* browser chrome */}
      <div className="flex items-center gap-1.5 border-b border-ink/10 bg-white px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        <span className="num ml-2 text-[10px] font-semibold text-ink/40">konstructify — dashboard</span>
      </div>
      <div className="flex">
        {/* rail */}
        <div className="flex flex-col items-center gap-2 border-r border-ink/10 bg-white px-2 py-3">
          {rail.map((Icon, i) => (
            <span
              key={i}
              className={clsx(
                'flex h-7 w-7 items-center justify-center rounded-lg',
                i === 0 ? 'bg-ink text-amber-glow' : 'text-ink/35',
              )}
            >
              <Icon size={14} aria-hidden="true" />
            </span>
          ))}
        </div>
        {/* main */}
        <div className="min-w-0 flex-1 p-3">
          <div className="grid grid-cols-4 gap-2">
            {[
              ['2 / 3', 'Active'],
              ['₹28.5L', 'Payables'],
              ['₹1.3L', 'Cash'],
              ['1', 'Overdue'],
            ].map(([v, l], i) => (
              <div key={l} className="rounded-lg border border-ink/10 bg-white px-2 py-1.5">
                <p className={clsx('num text-xs font-bold', i === 3 ? 'text-red-600' : 'text-ink')}>{v}</p>
                <p className="text-[8px] font-bold uppercase tracking-wide text-ink/40">{l}</p>
              </div>
            ))}
          </div>
          <div className="mt-2 space-y-1.5">
            {rows.map(([name, pct]) => (
              <div key={name} className="flex items-center gap-2">
                <span className="w-28 truncate text-[9px] font-semibold text-ink/70">{name}</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/10">
                  <span
                    className="block h-full rounded-full bg-gradient-to-r from-ink to-ink-600"
                    style={{ width: `${pct}%` }}
                  />
                </span>
                <span className="num w-7 text-right text-[9px] font-bold text-ink">{pct}%</span>
              </div>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[8px] font-bold text-emerald-800">
              Payment sent · GHI-21
            </span>
            <span className="rounded-full bg-ink/[0.06] px-2 py-0.5 text-[8px] font-bold text-ink/60">
              Synced ✓
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Photo({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return (
    <div className={clsx('overflow-hidden bg-ink', className)}>
      <img src={src} alt={alt} loading="lazy" className="h-full w-full object-cover" />
    </div>
  );
}

export default function Landing({ onEnter }: { onEnter: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  const mockRef = useRef<HTMLDivElement>(null);

  // Scroll reveals + parallax + nav depth.
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const els = document.querySelectorAll('.reveal, .flow-line');
    let revealIo: IntersectionObserver | undefined;
    if (reduced || !('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('in'));
    } else {
      revealIo = new IntersectionObserver(
        (entries) => {
          for (const e of entries)
            if (e.isIntersecting) {
              e.target.classList.add('in');
              revealIo?.unobserve(e.target);
            }
        },
        { threshold: 0.18, rootMargin: '0px 0px -6% 0px' },
      );
      els.forEach((el) => revealIo?.observe(el));
    }

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        setScrolled(y > 24);
        if (!reduced && mockRef.current && y < 900) {
          mockRef.current.style.transform = `translateY(${y * -0.04}px)`;
        }
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      revealIo?.disconnect();
    };
  }, []);

  return (
    <div>
      {/* Nav — transparent over the hero, glass once scrolled */}
      <header
        className={clsx(
          'fixed inset-x-0 top-0 z-50 transition-colors duration-300',
          scrolled ? 'glass' : 'bg-transparent',
        )}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink text-amber-glow shadow-raise">
              <HardHat size={20} aria-hidden="true" />
            </span>
            <span
              className={clsx(
                'font-display text-xl tracking-tight transition-colors',
                scrolled ? 'text-ink' : 'text-white',
              )}
            >
              Konstructify
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onEnter}
              className={clsx(
                'hidden cursor-pointer text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 sm:block',
                scrolled ? 'text-ink/70 hover:text-ink' : 'text-white/80 hover:text-white',
              )}
            >
              Sign in
            </button>
            <button type="button" onClick={onEnter} className="btn-primary btn-sm">
              Enter demo
            </button>
          </div>
        </div>
      </header>

      {/* Hero — full-bleed photo with the product floating over it */}
      <section className="relative min-h-[92vh] overflow-hidden">
        <div className="absolute inset-0 bg-ink">
          <img
            src={PHOTOS.hero}
            alt="Reinforcement and formwork across an active construction site"
            loading="eager"
            className="h-full w-full object-cover opacity-95"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-ink/95 via-ink/70 to-ink/30" />
        </div>
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-5 pb-16 pt-32 lg:grid-cols-[1.05fr_0.95fr] lg:pt-40">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white/80 backdrop-blur">
              <ShieldCheck size={13} aria-hidden="true" /> Built for Indian contractors
            </span>
            <h1 className="mt-4 font-display text-5xl leading-[1.02] tracking-tight text-white sm:text-6xl lg:text-7xl">
              Every site.<br />
              Every rupee.<br />
              <span className="text-amber-glow">One ledger.</span>
            </h1>
            <p className="mt-5 max-w-md text-base text-white/70">
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
              <a
                href="#how"
                className="cursor-pointer rounded-xl border border-white/25 bg-white/5 px-5 py-2.5 text-base font-semibold text-white backdrop-blur transition-colors hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                See how it works
              </a>
            </div>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-white/50">
              No sign-up · seeded demo data · works offline
            </p>
          </div>
          <div ref={mockRef} className="animate-fade-up will-change-transform">
            <ProductMock />
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section id="how" className="mx-auto max-w-6xl px-5 py-20">
        <div className="reveal mb-12 max-w-2xl">
          <h2 className="font-display text-3xl tracking-tight text-ink sm:text-4xl">
            Vendor to paid, without the ledger archaeology
          </h2>
          <p className="mt-3 text-base text-ink/60">
            One chain of custody for every credit line: onboarded, invoiced, tracked, paid — and the
            credit that frees up the moment it settles.
          </p>
        </div>
        <div className="relative">
          <svg
            className="flow-line absolute left-0 top-5 hidden h-3 w-full lg:block"
            viewBox="0 0 1000 12"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              className="flow-path"
              d="M10 6 H990"
              pathLength={1}
              fill="none"
              stroke="#E0A22B"
              strokeWidth={2}
              strokeDasharray={1}
              strokeDashoffset={1}
            />
          </svg>
          <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {FLOW.map(([title, body], i) => (
              <li key={title} className="reveal" style={{ transitionDelay: `${i * 90}ms` }}>
                <span className="num relative z-10 flex h-11 w-11 items-center justify-center rounded-full bg-ink text-base font-bold text-amber-glow shadow-raise">
                  {i + 1}
                </span>
                <h3 className="mt-3.5 font-display text-lg text-ink">{title}</h3>
                <p className="mt-1.5 text-sm text-ink/60">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* In the field — photo collage */}
      <section id="field" className="border-y border-ink/10 bg-white/50">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <div className="reveal mb-10 max-w-2xl">
            <h2 className="font-display text-3xl tracking-tight text-ink sm:text-4xl">
              Built for boots, not just desks
            </h2>
            <p className="mt-3 text-base text-ink/60">
              High contrast for daylight, big targets for dusty gloves, and reports the head office
              can open before the morning pour.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <figure className="reveal panel overflow-hidden">
              <Photo src={PHOTOS.crew} alt="Engineers walking the slab on morning rounds" className="aspect-[4/3]" />
              <figcaption className="p-4 text-sm text-ink/70">
                Morning rounds become the day’s progress log — captured where the work is.
              </figcaption>
            </figure>
            <figure className="reveal panel overflow-hidden" style={{ transitionDelay: '80ms' }}>
              <Photo src={PHOTOS.plans} alt="Working drawings spread on the drafting table" className="aspect-[4/3]" />
              <figcaption className="p-4 text-sm text-ink/70">
                BOQs, budgets and approvals — versioned, never lost in a boot.
              </figcaption>
            </figure>
            <figure className="reveal panel overflow-hidden" style={{ transitionDelay: '160ms' }}>
              <Photo src={PHOTOS.steel} alt="Quality checks on the steel line" className="aspect-[4/3]" />
              <figcaption className="p-4 text-sm text-ink/70">
                Site photos and checks, with the overruns and delays that matter flagged.
              </figcaption>
            </figure>
          </div>
          <div className="reveal blueprint relative mt-4 overflow-hidden rounded-2xl p-6 text-white shadow-lift" style={{ transitionDelay: '240ms' }}>
            <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full bg-amber-glow/15 blur-3xl" />
            <p className="num relative font-display text-4xl text-amber-glow">
              <CountUp to={45} suffix="-day" /> credit alerts
            </p>
            <p className="relative mt-1 max-w-lg text-sm text-white/65">
              fire themselves. Vendors stop calling; you stop apologising — and you always know which
              line to free up next.
            </p>
          </div>
        </div>
      </section>

      {/* Stats band */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {[
            [<CountUp to={9} />, 'modules, one login — projects to payables'],
            [<CountUp to={8} />, 'vendors tracked with live credit lines'],
            [<CountUp to={4} />, 'aging buckets watching every unpaid bill'],
            [<CountUp to={100} suffix="%" />, 'on-device — it keeps working with no signal'],
          ].map(([big, label], i) => (
            <div key={i} className="reveal text-center" style={{ transitionDelay: `${i * 80}ms` }}>
              <p className="num font-display text-4xl text-ink sm:text-5xl">{big as ReactNode}</p>
              <p className="mt-1.5 text-xs font-semibold uppercase tracking-wide text-ink/45">
                {label as ReactNode}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Roles */}
      <section id="roles" className="border-t border-ink/10 bg-white/50">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <div className="reveal mb-8">
            <h2 className="font-display text-3xl tracking-tight text-ink sm:text-4xl">
              Every job. One source of truth.
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ROLES.map(([role, body], i) => (
              <div
                key={role}
                className="reveal panel panel-hover p-5"
                style={{ transitionDelay: `${i * 60}ms` }}
              >
                <h3 className="font-display text-lg text-ink">{role}</h3>
                <p className="mt-1.5 text-sm text-ink/60">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA — facade photo */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-ink">
          <img
            src={PHOTOS.facade}
            alt="Finished concrete facade against the sky"
            loading="lazy"
            className="h-full w-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/80 to-ink/50" />
        </div>
        <div className="reveal relative mx-auto max-w-6xl px-5 py-24 text-center">
          <h2 className="font-display text-3xl text-white sm:text-5xl">
            Concrete cures overnight.<br />
            <span className="text-amber-glow">Your numbers shouldn’t have to.</span>
          </h2>
          <button
            type="button"
            onClick={onEnter}
            className="btn-primary mx-auto mt-7 flex items-center gap-2 px-6 py-3 text-base"
          >
            Enter the demo <ArrowRight size={18} aria-hidden="true" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-8 text-xs text-ink/45 sm:flex-row">
        <span className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-ink text-amber-glow">
            <HardHat size={13} aria-hidden="true" />
          </span>
          <span className="font-display text-sm text-ink/70">Konstructify</span>
        </span>
        <span className="flex items-center gap-1.5">
          <WifiOff size={13} aria-hidden="true" /> Offline-first construction management · mock demo data
        </span>
        <span className="flex items-center gap-1.5">
          <BarChart3 size={13} aria-hidden="true" /> 9 modules · one ledger
        </span>
      </footer>
    </div>
  );
}
