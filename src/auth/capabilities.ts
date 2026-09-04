/**
 * Capabilities are DATA, not code (AD-03).
 *
 * Nothing in this app may ever branch on a persona name — no
 * `if (persona === 'owner')`. Screens ask `can(ctx, 'payments:execute')` and
 * this file is the only place that knows which persona carries which power.
 * That is what makes custom roles a later config change rather than a rewrite.
 *
 * Capabilities for modules that don't exist yet (DPR, attendance, drawings,
 * billing) are declared here deliberately. The personas are complete from day
 * one; the screens arrive in Phase 4–5 and find their permissions waiting.
 */

export const CAPABILITIES = [
  // ── The nine modules that exist today ──────────────────────────────
  'dashboard:view',
  'projects:view',
  'projects:manage',
  'vendors:view',
  'vendors:manage',
  'credits:view',
  'credits:manage',
  'work-status:view',
  'work-status:update',
  'work-status:manage',
  'work-orders:view',
  'work-orders:update',
  'work-orders:manage',
  'budgeting:view',
  'budgeting:manage',
  'payments:view',
  'payments:execute',
  'reports:view',

  // ── Phase 4: field modules ─────────────────────────────────────────
  'drawings:view',
  'drawings:manage',
  'dpr:view',
  'dpr:create',
  'dpr:approve',
  'attendance:view',
  'attendance:record',
  'inventory:view',
  'inventory:request',
  'inventory:manage',
  'machinery:view',
  'machinery:record',
  'quality:view',
  'quality:manage',

  // ── Block A: project record — photos, zones, permits ───────────────
  'project-photos:view',
  'project-photos:add',
  'project-photos:delete',
  'zones:view',
  'zones:manage',
  'documents:view',
  'documents:manage',
  'sop:view',
  'sop:update',

  // ── Phase 5: commercial (Measurement Book → RA bill) ───────────────
  'billing:view',
  'billing:manage',

  // ── Administration ─────────────────────────────────────────────────
  'admin:users',
  'admin:projects',
  'admin:platform',
] as const;

export type Capability = (typeof CAPABILITIES)[number];

/** The six personas. Contractor is an ACCOUNT TYPE (AD-05), not a persona —
 *  a contracting firm has its own Owner, PMs and engineers. */
export type Persona =
  | 'super-admin'
  | 'owner'
  | 'project-manager'
  | 'site-engineer'
  | 'supervisor'
  | 'accountant';

export type AccountType = 'developer' | 'landlord' | 'contractor' | 'platform';

export const PERSONA_LABELS: Record<Persona, string> = {
  'super-admin': 'Super Admin',
  owner: 'Owner',
  'project-manager': 'Project Manager',
  'site-engineer': 'Site Engineer',
  supervisor: 'Supervisor',
  accountant: 'Accountant',
};

/** Personas whose reach is limited to explicitly assigned projects (layer 3).
 *  Owner sees every project in their own account, so it is absent here. */
export const PROJECT_SCOPED_PERSONAS: ReadonlySet<Persona> = new Set([
  'project-manager',
  'site-engineer',
  'supervisor',
  'accountant',
]);

const SUPERVISOR: Capability[] = [
  'dashboard:view',
  'projects:view',
  'work-status:view',
  'work-status:update',
  'work-orders:view',
  'drawings:view',
  'dpr:view',
  'attendance:view',
  'attendance:record',
  'inventory:view',
  'inventory:manage',
  'machinery:view',
  'machinery:record',
  'quality:view',
  'project-photos:view',
  'project-photos:add',
  'zones:view',
  'documents:view',
  'sop:view',
];

/** Site Engineer is a strict superset of Supervisor, per the brief — plus
 *  scheduling and DPR authorship, and explicitly WITHOUT financial reports
 *  or payments. Note `dpr:create` here but `dpr:approve` only on PM. */
const SITE_ENGINEER: Capability[] = [
  ...SUPERVISOR,
  'vendors:view',
  'work-status:manage',
  'work-orders:update',
  'dpr:create',
  'inventory:request',
  'quality:manage',
  'billing:view',
  'zones:manage',
];

/** Project Manager / Civil Engineer — everything Site Engineer has, plus
 *  design and commercial authority.
 *
 *  `payments:view` WITHOUT `payments:execute` is deliberate: the brief gives
 *  PM "payment planning", which is proposing a schedule, not releasing money.
 *  Releasing money is the Accountant's `payments:execute`. */
const PROJECT_MANAGER: Capability[] = [
  ...SITE_ENGINEER,
  'projects:manage',
  'credits:view',
  'work-orders:manage',
  'budgeting:view',
  'budgeting:manage',
  'payments:view',
  'reports:view',
  'drawings:manage',
  'dpr:approve',
  'inventory:manage',
  'billing:manage',
  'documents:manage',
  'sop:update',
];

/** The commercial counterpart to Site Engineer — holds precisely what that
 *  persona is denied, and none of the site execution. */
const ACCOUNTANT: Capability[] = [
  'dashboard:view',
  'projects:view',
  'vendors:view',
  'vendors:manage',
  'credits:view',
  'credits:manage',
  'work-orders:view',
  'budgeting:view',
  'budgeting:manage',
  'payments:view',
  'payments:execute',
  'reports:view',
  'attendance:view',
  'inventory:view',
  'machinery:view',
  'billing:view',
  'billing:manage',
  'documents:view',
  'sop:view',
];

const OWNER: Capability[] = [
  ...new Set<Capability>([
    ...PROJECT_MANAGER,
    ...ACCOUNTANT,
    'payments:execute',
    'project-photos:delete',
    'documents:manage',
    'sop:update',
    'admin:users',
    'admin:projects',
  ]),
];

/**
 * Super Admin holds PLATFORM capabilities only — deliberately no business
 * data at all.
 *
 * This tightens the published matrix, and the reason is the security model:
 * cross-tenant business access happens through explicit, time-boxed,
 * audited impersonation. A Super Admin who can silently read tenant ledgers
 * is a standing breach; one who must impersonate leaves a record the target
 * account can see.
 */
const SUPER_ADMIN: Capability[] = ['admin:platform', 'admin:users', 'admin:projects'];

export const PERSONA_CAPABILITIES: Record<Persona, ReadonlySet<Capability>> = {
  'super-admin': new Set(SUPER_ADMIN),
  owner: new Set(OWNER),
  'project-manager': new Set(PROJECT_MANAGER),
  'site-engineer': new Set(SITE_ENGINEER),
  supervisor: new Set(SUPERVISOR),
  accountant: new Set(ACCOUNTANT),
};

/**
 * Account-type mask (AD-05).
 *
 * A landlord's Owner is a different job from a developer's Owner: they
 * contracted the work out and watch progress. Rather than inventing a
 * seventh persona, the account type intersects the persona's capabilities
 * down to what a client should see.
 *
 * `payments:view` is included on the resolved reading that a paying client
 * sees their OWN billing with the contractor — never the contractor's
 * vendor costs, which live in the contractor's account and are not granted
 * back (see `project_grant.visibility_scope`, Phase 6).
 *
 * Absent from this map = no mask = the persona's full set.
 */
export const ACCOUNT_TYPE_MASK: Partial<Record<AccountType, ReadonlySet<Capability>>> = {
  landlord: new Set<Capability>([
    'dashboard:view',
    'projects:view',
    'work-status:view',
    'drawings:view',
    'dpr:view',
    'quality:view',
    'payments:view',
    'reports:view',
    'admin:users',
    // A client photographs their own property, and that record should be
    // theirs. Note what is absent: `project-photos:delete`. A landlord can
    // add evidence of a defect and neither they nor the contractor can
    // quietly remove it — only the project's owner can.
    'project-photos:view',
    'project-photos:add',
    'zones:view',
    'documents:view',
    'sop:view',
  ]),
};

/**
 * Capabilities that only apply on a given project type (layer 4).
 *
 * The mechanism ships now and is exercised by tests; the content arrives in
 * Phase 5 with Measurement Book, RA bills, EMD and statutory deductions,
 * which are government-contract machinery. Declaring the hook now means
 * Phase 5 adds rows here rather than threading a new concept through
 * every call site.
 */
export const GOVERNMENT_ONLY: ReadonlySet<Capability> = new Set<Capability>([]);
export const PRIVATE_ONLY: ReadonlySet<Capability> = new Set<Capability>([]);

/**
 * The capability required to see anything about a given kind of record.
 *
 * Used by cross-cutting surfaces — the activity feed today, notifications and
 * the audit trail later — which mix records of every kind and must filter
 * structurally rather than by inspecting message text.
 *
 * Keyed loosely by `EntityKind` from types.ts; kept here so the capability
 * vocabulary stays in one file.
 */
export const ENTITY_VIEW_CAPABILITY: Record<string, Capability> = {
  project: 'projects:view',
  vendor: 'vendors:view',
  invoice: 'payments:view',
  task: 'work-status:view',
  workOrder: 'work-orders:view',
  budgetItem: 'budgeting:view',
  photo: 'project-photos:view',
  zone: 'zones:view',
};

/** Resolve the effective capability set for a persona inside an account type.
 *  Persona grants; account type may only take away. */
export function resolveCapabilities(
  persona: Persona,
  accountType: AccountType,
): ReadonlySet<Capability> {
  const base = PERSONA_CAPABILITIES[persona];
  const mask = ACCOUNT_TYPE_MASK[accountType];
  if (!mask) return base;
  return new Set([...base].filter((c) => mask.has(c)));
}
