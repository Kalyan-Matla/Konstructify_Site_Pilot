import { describe, expect, test } from 'bun:test';
import { can, canReachProject, decide, type AuthUser, type AuthzContext } from './can';
import { PERSONA_CAPABILITIES, resolveCapabilities } from './capabilities';
import { ACCOUNTS, USERS, findAccount, findUserByEmail } from './seed';

function ctxFor(email: string): AuthzContext {
  const user = findUserByEmail(email);
  if (!user) throw new Error(`no seed user ${email}`);
  const account = findAccount(user.accountId);
  if (!account) throw new Error(`no seed account ${user.accountId}`);
  return { user, account };
}

describe('layer 0 — account status', () => {
  test('a pending-approval account can do nothing', () => {
    const ctx = ctxFor('owner@nairdev.in');
    expect(ctx.account.status).toBe('pending-approval');
    expect(decide(ctx, 'dashboard:view').reason).toBe('account-suspended');
    expect(can(ctx, 'projects:view')).toBe(false);
  });

  test('a null context is denied', () => {
    expect(can(null, 'dashboard:view')).toBe(false);
  });
});

describe('layer 1 — account entitlement', () => {
  test('personas are entitled per account, per the brief', () => {
    expect(findAccount('acc-1')!.enabledPersonas).toHaveLength(5);
    expect(findAccount('acc-2')!.enabledPersonas).toHaveLength(4);
    expect(findAccount('acc-3')!.enabledPersonas).toHaveLength(3);
  });

  test('a persona not entitled to the account is refused even if capable', () => {
    const account = findAccount('acc-3')!; // no project-manager entitled
    const smuggled: AuthUser = {
      id: 'x', accountId: 'acc-3', email: 'x@x.in', name: 'X',
      persona: 'project-manager', projectIds: ['p1'],
    };
    // The persona itself carries this capability...
    expect(PERSONA_CAPABILITIES['project-manager'].has('budgeting:manage')).toBe(true);
    // ...but the account was never entitled to the persona.
    expect(decide({ user: smuggled, account }, 'budgeting:manage').reason)
      .toBe('persona-not-entitled');
  });
});

describe('layer 2 — persona capabilities', () => {
  test('site engineer is denied financial reports and payments', () => {
    const ctx = ctxFor('engineer@konstructify.in');
    expect(can(ctx, 'reports:view')).toBe(false);
    expect(can(ctx, 'payments:view')).toBe(false);
    expect(can(ctx, 'payments:execute')).toBe(false);
  });

  test('site engineer still authors DPRs — "reports" meant financial reports', () => {
    const ctx = ctxFor('engineer@konstructify.in');
    expect(can(ctx, 'dpr:create')).toBe(true);
    expect(can(ctx, 'work-status:manage')).toBe(true);
  });

  test('PM plans payments but cannot release money', () => {
    const ctx = ctxFor('pm@konstructify.in');
    expect(can(ctx, 'payments:view')).toBe(true);
    expect(can(ctx, 'payments:execute')).toBe(false);
    expect(can(ctx, 'budgeting:manage')).toBe(true);
  });

  test('accountant releases money but does no site execution', () => {
    const ctx = ctxFor('accounts@konstructify.in');
    expect(can(ctx, 'payments:execute')).toBe(true);
    expect(can(ctx, 'reports:view')).toBe(true);
    expect(can(ctx, 'work-status:manage')).toBe(false);
    expect(can(ctx, 'drawings:manage')).toBe(false);
  });

  test('site engineer is a strict superset of supervisor', () => {
    const sup = PERSONA_CAPABILITIES.supervisor;
    const eng = PERSONA_CAPABILITIES['site-engineer'];
    for (const c of sup) expect(eng.has(c)).toBe(true);
    expect(eng.size).toBeGreaterThan(sup.size);
  });

  test('PM is a strict superset of site engineer', () => {
    const eng = PERSONA_CAPABILITIES['site-engineer'];
    const pm = PERSONA_CAPABILITIES['project-manager'];
    for (const c of eng) expect(pm.has(c)).toBe(true);
    expect(pm.size).toBeGreaterThan(eng.size);
  });

  test('super admin holds no business capability at all', () => {
    const ctx = ctxFor('admin@konstructify.in');
    expect(can(ctx, 'admin:platform')).toBe(true);
    expect(can(ctx, 'payments:view')).toBe(false);
    expect(can(ctx, 'vendors:view')).toBe(false);
    expect(can(ctx, 'reports:view')).toBe(false);
  });
});

describe('layer 3 — project assignment', () => {
  test('PM assigned p1/p2 is refused p3', () => {
    const ctx = ctxFor('pm@konstructify.in');
    expect(can(ctx, 'work-status:manage', { projectId: 'p1' })).toBe(true);
    expect(can(ctx, 'work-status:manage', { projectId: 'p3' })).toBe(false);
    expect(decide(ctx, 'work-status:manage', { projectId: 'p3' }).reason)
      .toBe('project-not-assigned');
  });

  test('owner is account-scoped, so project assignment never blocks them', () => {
    const ctx = ctxFor('owner@konstructify.in');
    expect(canReachProject(ctx, 'p3')).toBe(true);
    expect(canReachProject(ctx, 'project-that-does-not-exist')).toBe(true);
  });

  test('site engineer reaches only their assigned project', () => {
    const ctx = ctxFor('engineer@konstructify.in');
    expect(canReachProject(ctx, 'p1')).toBe(true);
    expect(canReachProject(ctx, 'p2')).toBe(false);
  });
});

describe('update vs manage — the split the field UI leans on', () => {
  /** Supervisor updates work on site (progress, photos) but never creates,
   *  edits or deletes the tasks and orders themselves. The page-level action
   *  gating renders controls off exactly this split — lock it down. */
  test('supervisor updates work status but does not manage it', () => {
    const ctx = ctxFor('supervisor@konstructify.in');
    expect(can(ctx, 'work-status:update', { projectId: 'p1' })).toBe(true);
    expect(can(ctx, 'work-status:manage', { projectId: 'p1' })).toBe(false);
  });

  test('supervisor views work orders but neither updates nor manages them', () => {
    const ctx = ctxFor('supervisor@konstructify.in');
    expect(can(ctx, 'work-orders:view', { projectId: 'p1' })).toBe(true);
    expect(can(ctx, 'work-orders:update', { projectId: 'p1' })).toBe(false);
    expect(can(ctx, 'work-orders:manage', { projectId: 'p1' })).toBe(false);
  });

  test('site engineer completes work orders but cannot create or delete them', () => {
    const ctx = ctxFor('engineer@konstructify.in');
    expect(can(ctx, 'work-orders:update', { projectId: 'p1' })).toBe(true);
    expect(can(ctx, 'work-orders:manage', { projectId: 'p1' })).toBe(false);
  });
});

describe('AD-05 — landlord mask', () => {
  const landlord = () => ctxFor('priya@landlord.in');

  test('landlord Owner watches progress', () => {
    expect(can(landlord(), 'work-status:view', { projectId: 'p3' })).toBe(true);
    expect(can(landlord(), 'projects:view')).toBe(true);
  });

  test('landlord Owner cannot operate the build or see supply costs', () => {
    expect(can(landlord(), 'work-status:manage', { projectId: 'p3' })).toBe(false);
    expect(can(landlord(), 'vendors:view')).toBe(false);
    expect(can(landlord(), 'credits:view')).toBe(false);
    expect(can(landlord(), 'budgeting:manage')).toBe(false);
    expect(can(landlord(), 'payments:execute')).toBe(false);
  });

  test('landlord sees their own billing — the resolved reading of the brief', () => {
    expect(can(landlord(), 'payments:view')).toBe(true);
  });

  /** Regression: the dashboard leaked "ABC Concrete credit 85% used" and
   *  vendor payables to a landlord. `payments:view` alone is too loose a
   *  gate for supply-chain money — seeing a vendor's bills requires being
   *  able to see vendors at all. */
  test('landlord cannot reach vendor-side money', () => {
    const ctx = landlord();
    const seeVendorMoney = can(ctx, 'payments:view') && can(ctx, 'vendors:view');
    expect(seeVendorMoney).toBe(false);
  });

  test('every persona that handles vendor money can also see vendors', () => {
    for (const email of ['owner@konstructify.in', 'accounts@konstructify.in', 'pm@konstructify.in']) {
      const ctx = ctxFor(email);
      if (can(ctx, 'payments:view')) expect(can(ctx, 'vendors:view')).toBe(true);
    }
  });

  test('a developer Owner keeps everything the landlord Owner loses', () => {
    const dev = ctxFor('owner@konstructify.in');
    expect(can(dev, 'vendors:view')).toBe(true);
    expect(can(dev, 'credits:view')).toBe(true);
    expect(can(dev, 'payments:execute')).toBe(true);
  });

  test('the mask only subtracts, never adds', () => {
    const masked = resolveCapabilities('owner', 'landlord');
    const base = PERSONA_CAPABILITIES.owner;
    for (const c of masked) expect(base.has(c)).toBe(true);
  });
});

describe('AD-05 — contractor is an account type, not a persona', () => {
  test('a contractor account runs a full Owner', () => {
    const ctx = ctxFor('owner@qureshi.in');
    expect(ctx.account.type).toBe('contractor');
    expect(can(ctx, 'vendors:manage')).toBe(true);
    expect(can(ctx, 'payments:execute')).toBe(true);
    expect(can(ctx, 'work-status:manage', { projectId: 'p3' })).toBe(true);
  });

  test('a contractor account has its own site staff', () => {
    const ctx = ctxFor('engineer@qureshi.in');
    expect(ctx.user.persona).toBe('site-engineer');
    expect(can(ctx, 'dpr:create', { projectId: 'p3' })).toBe(true);
  });
});

describe('seed integrity', () => {
  test('every user belongs to a real account', () => {
    for (const u of USERS) expect(findAccount(u.accountId)).toBeDefined();
  });

  test('every user except super-admin holds an entitled persona', () => {
    for (const u of USERS) {
      if (u.persona === 'super-admin') continue;
      const acc = findAccount(u.accountId)!;
      expect(acc.enabledPersonas).toContain(u.persona);
    }
  });

  test('account ids are unique', () => {
    expect(new Set(ACCOUNTS.map((a) => a.id)).size).toBe(ACCOUNTS.length);
  });

  test('emails are unique', () => {
    expect(new Set(USERS.map((u) => u.email)).size).toBe(USERS.length);
  });
});
