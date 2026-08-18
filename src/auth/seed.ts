import type { Account, AuthUser } from './can';

/** Shared demo password. Client-side gate only — there is no backend to
 *  authenticate against until Phase 1. */
export const DEMO_PASSWORD = 'build@2026';

/**
 * Seed accounts modelling the brief's own example: different accounts are
 * entitled to different numbers of personas, and Super Admin controls that
 * list (layer 1).
 *
 * Project ids reference the existing mock projects (p1/p2/p3). In Phase 0
 * all accounts share one local dataset — genuine per-account data
 * partitioning arrives in Phase 1 when `account_id` lands in Postgres and
 * row-level security enforces it.
 */
export const ACCOUNTS: Account[] = [
  {
    id: 'acc-platform',
    name: 'Konstructify Platform',
    type: 'platform',
    status: 'active',
    enabledPersonas: ['super-admin'],
  },
  {
    id: 'acc-1',
    name: 'Kothari Constructions',
    type: 'developer',
    status: 'active',
    // Five personas — the brief's "User Account 1"
    enabledPersonas: ['owner', 'project-manager', 'site-engineer', 'accountant', 'supervisor'],
  },
  {
    id: 'acc-2',
    name: 'Deshmukh Builders',
    type: 'developer',
    status: 'active',
    // Four — no Project Manager
    enabledPersonas: ['owner', 'site-engineer', 'accountant', 'supervisor'],
  },
  {
    id: 'acc-3',
    name: 'Verma Infra',
    type: 'developer',
    status: 'active',
    // Three — no Project Manager, no Site Engineer
    enabledPersonas: ['owner', 'accountant', 'supervisor'],
  },
  {
    id: 'acc-4',
    name: 'Priya Verma (Property Owner)',
    type: 'landlord',
    status: 'active',
    enabledPersonas: ['owner'],
  },
  {
    id: 'acc-5',
    name: 'Qureshi Contractors',
    type: 'contractor',
    status: 'active',
    enabledPersonas: ['owner', 'project-manager', 'site-engineer', 'supervisor'],
  },
  {
    id: 'acc-6',
    name: 'Nair Developers',
    type: 'developer',
    status: 'pending-approval',
    enabledPersonas: ['owner'],
  },
];

export const USERS: AuthUser[] = [
  {
    id: 'u-sa',
    accountId: 'acc-platform',
    email: 'admin@konstructify.in',
    name: 'Platform Admin',
    persona: 'super-admin',
    projectIds: [],
  },

  // ── Account 1 — all five personas, varying project scope ───────────
  {
    id: 'u-1-owner',
    accountId: 'acc-1',
    email: 'owner@konstructify.in',
    name: 'Rajesh Kothari',
    persona: 'owner',
    projectIds: ['p1', 'p2', 'p3'],
  },
  {
    id: 'u-1-pm',
    accountId: 'acc-1',
    email: 'pm@konstructify.in',
    name: 'Anita Deshmukh',
    persona: 'project-manager',
    // Deliberately NOT p3 — proves layer 3 restricts an assigned persona
    projectIds: ['p1', 'p2'],
  },
  {
    id: 'u-1-eng',
    accountId: 'acc-1',
    email: 'engineer@konstructify.in',
    name: 'Vikram Rao',
    persona: 'site-engineer',
    projectIds: ['p1'],
  },
  {
    id: 'u-1-sup',
    accountId: 'acc-1',
    email: 'supervisor@konstructify.in',
    name: 'Suresh Patil',
    persona: 'supervisor',
    projectIds: ['p1'],
  },
  {
    id: 'u-1-acct',
    accountId: 'acc-1',
    email: 'accounts@konstructify.in',
    name: 'Farhan Qureshi',
    persona: 'accountant',
    projectIds: ['p1', 'p2', 'p3'],
  },

  // ── Smaller accounts — fewer personas entitled ─────────────────────
  {
    id: 'u-2-owner',
    accountId: 'acc-2',
    email: 'owner@deshmukh.in',
    name: 'Meera Deshmukh',
    persona: 'owner',
    projectIds: ['p1', 'p2', 'p3'],
  },
  {
    id: 'u-3-owner',
    accountId: 'acc-3',
    email: 'owner@vermainfra.in',
    name: 'Arjun Verma',
    persona: 'owner',
    projectIds: ['p1', 'p2', 'p3'],
  },

  // ── Landlord — Owner persona, masked down to a watching client ─────
  {
    id: 'u-4-owner',
    accountId: 'acc-4',
    email: 'priya@landlord.in',
    name: 'Priya Verma',
    persona: 'owner',
    projectIds: ['p3'],
  },

  // ── Contractor account — its own Owner and staff ───────────────────
  {
    id: 'u-5-owner',
    accountId: 'acc-5',
    email: 'owner@qureshi.in',
    name: 'Imran Qureshi',
    persona: 'owner',
    projectIds: ['p1', 'p2', 'p3'],
  },
  {
    id: 'u-5-eng',
    accountId: 'acc-5',
    email: 'engineer@qureshi.in',
    name: 'Kavita Nair',
    persona: 'site-engineer',
    projectIds: ['p3'],
  },

  // ── Blocked by layer 0 — account awaiting Super Admin approval ─────
  {
    id: 'u-6-owner',
    accountId: 'acc-6',
    email: 'owner@nairdev.in',
    name: 'Sanjay Nair',
    persona: 'owner',
    projectIds: ['p1'],
  },
];

export function findAccount(id: string): Account | undefined {
  return ACCOUNTS.find((a) => a.id === id);
}

export function findUserByEmail(email: string): AuthUser | undefined {
  const needle = email.trim().toLowerCase();
  return USERS.find((u) => u.email.toLowerCase() === needle);
}
