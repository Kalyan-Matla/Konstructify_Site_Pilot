import { Check, ShieldCheck } from 'lucide-react';
import clsx from 'clsx';
import { Modal } from './ui';
import { useAuth } from '../contexts/AuthContext';
import { PERSONA_LABELS, PROJECT_SCOPED_PERSONAS, type AccountType } from '../auth/capabilities';
import { ACCOUNTS, USERS } from '../auth/seed';

const TYPE_LABEL: Record<AccountType, string> = {
  developer: 'Developer',
  landlord: 'Landlord',
  contractor: 'Contractor',
  platform: 'Platform',
};

const TYPE_TONE: Record<AccountType, string> = {
  developer: 'bg-ink/[0.06] text-ink/70',
  landlord: 'bg-sky-100 text-sky-900',
  contractor: 'bg-amber-100 text-amber-900',
  platform: 'bg-emerald-100 text-emerald-900',
};

/**
 * Demo affordance for reviewing the access model — sign in as any seeded
 * user without a password.
 *
 * This exists because the permission model is the thing under review, and
 * clicking through six personas is the only honest way to check it. It is
 * NOT a product feature: it disappears in Phase 1, when real sessions come
 * from the identity provider and switching user means signing in.
 */
export default function PersonaSwitcher({ onClose }: { onClose: () => void }) {
  const { user, switchUser } = useAuth();

  const visible = ACCOUNTS.filter((a) => a.status === 'active');

  return (
    <Modal title="Switch persona" onClose={onClose}>
      <p className="-mt-1 mb-4 text-sm text-ink/60">
        Every account below is entitled to a different set of personas — exactly the layer-1
        control a Super Admin operates. Pick anyone to see the app through their permissions.
      </p>

      <div className="space-y-4">
        {visible.map((account) => {
          const members = USERS.filter((u) => u.accountId === account.id);
          if (members.length === 0) return null;
          return (
            <section key={account.id}>
              <header className="mb-1.5 flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold text-ink">{account.name}</h3>
                <span
                  className={clsx(
                    'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                    TYPE_TONE[account.type],
                  )}
                >
                  {TYPE_LABEL[account.type]}
                </span>
                <span className="num text-[11px] text-ink/45">
                  {account.enabledPersonas.length} persona
                  {account.enabledPersonas.length === 1 ? '' : 's'} entitled
                </span>
              </header>

              <ul className="space-y-1.5">
                {members.map((m) => {
                  const active = m.id === user?.id;
                  return (
                    <li key={m.id}>
                      <button
                        type="button"
                        onClick={() => {
                          switchUser(m.id);
                          onClose();
                        }}
                        aria-current={active}
                        className={clsx(
                          'flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500',
                          active
                            ? 'border-amber-500/50 bg-amber-50'
                            : 'border-ink/10 bg-white hover:border-ink/25 hover:bg-paper-soft',
                        )}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-ink">
                            {m.name}
                            <span className="ml-2 font-normal text-ink/50">
                              {PERSONA_LABELS[m.persona]}
                            </span>
                          </span>
                          <span className="num block truncate text-[11px] text-ink/45">
                            {PROJECT_SCOPED_PERSONAS.has(m.persona)
                              ? `${m.projectIds.length} project${m.projectIds.length === 1 ? '' : 's'} assigned · ${m.projectIds.join(', ')}`
                              : 'all projects in account'}
                          </span>
                        </span>
                        {active ? (
                          <Check size={16} className="shrink-0 text-amber-700" aria-hidden="true" />
                        ) : (
                          <ShieldCheck size={15} className="shrink-0 text-ink/25" aria-hidden="true" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      <p className="mt-5 rounded-xl bg-ink/[0.04] px-3.5 py-2.5 text-xs leading-relaxed text-ink/60">
        <strong className="font-bold text-ink/75">Nair Developers is absent</strong> — that account
        is still awaiting Super Admin approval, so nobody in it can sign in at all. That is layer 0
        refusing before any permission is even considered.
      </p>
    </Modal>
  );
}
