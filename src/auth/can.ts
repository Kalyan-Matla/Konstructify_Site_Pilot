import {
  GOVERNMENT_ONLY,
  PRIVATE_ONLY,
  PROJECT_SCOPED_PERSONAS,
  resolveCapabilities,
  type AccountType,
  type Capability,
  type Persona,
} from './capabilities';

export type { ProjectType } from '../types';
import type { ProjectType } from '../types';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  /** Layer 1 — which personas Super Admin has switched on for this account.
   *  A persona must be entitled here before anyone can be assigned to it. */
  enabledPersonas: Persona[];
  status: 'active' | 'pending-approval' | 'suspended';
}

export interface AuthUser {
  id: string;
  accountId: string;
  email: string;
  name: string;
  persona: Persona;
  /** Layer 3 — the projects this user may reach. Ignored for personas that
   *  are not project-scoped (Owner sees the whole account). */
  projectIds: string[];
}

/** Everything `can()` needs to answer. Assembled once by AuthContext. */
export interface AuthzContext {
  user: AuthUser;
  account: Account;
}

export interface ResourceRef {
  projectId?: string;
  projectType?: ProjectType;
}

export type DenyReason =
  | 'account-suspended'
  | 'persona-not-entitled'
  | 'capability-not-granted'
  | 'project-not-assigned'
  | 'wrong-project-type';

export interface Decision {
  allowed: boolean;
  reason?: DenyReason;
}

/**
 * The single authorization entry point for the whole application.
 *
 * IMPORTANT — this runs on the user's device, so it is Gate 4 in the
 * architecture: a USABILITY control, not a security boundary. It decides
 * whether to render a button. It never decides whether data is safe to
 * expose. That is settled server-side by sync rules (Gate 1), the mutation
 * API (Gate 2) and row-level security (Gate 3), all of which re-check
 * everything this function says.
 *
 * Assume the user can edit this code. Nothing here is trusted.
 */
export function decide(
  ctx: AuthzContext | null,
  capability: Capability,
  resource?: ResourceRef,
): Decision {
  if (!ctx) return { allowed: false, reason: 'capability-not-granted' };
  const { user, account } = ctx;

  // Layer 0 — a suspended or unapproved account can do nothing at all.
  if (account.status !== 'active') {
    return { allowed: false, reason: 'account-suspended' };
  }

  // Layer 1 — account entitlement. Super Admin lives outside any customer
  // account, so their platform persona is not subject to tenant entitlement.
  if (user.persona !== 'super-admin' && !account.enabledPersonas.includes(user.persona)) {
    return { allowed: false, reason: 'persona-not-entitled' };
  }

  // Layer 2 — does the persona (masked by account type) carry this capability?
  if (!resolveCapabilities(user.persona, account.type).has(capability)) {
    return { allowed: false, reason: 'capability-not-granted' };
  }

  // Layer 3 — project assignment, for project-scoped personas only.
  if (resource?.projectId && PROJECT_SCOPED_PERSONAS.has(user.persona)) {
    if (!user.projectIds.includes(resource.projectId)) {
      return { allowed: false, reason: 'project-not-assigned' };
    }
  }

  // Layer 4 — project type gates whole capabilities (Phase 5 populates these).
  if (resource?.projectType) {
    const govOnly = GOVERNMENT_ONLY.has(capability) && resource.projectType !== 'government';
    const privOnly = PRIVATE_ONLY.has(capability) && resource.projectType !== 'private';
    if (govOnly || privOnly) return { allowed: false, reason: 'wrong-project-type' };
  }

  return { allowed: true };
}

/** Boolean form — what almost every call site wants. */
export function can(
  ctx: AuthzContext | null,
  capability: Capability,
  resource?: ResourceRef,
): boolean {
  return decide(ctx, capability, resource).allowed;
}

/** True when the user may reach this project at all (layer 3 in isolation).
 *  Used to filter lists rather than to guard a single action. */
export function canReachProject(ctx: AuthzContext | null, projectId: string): boolean {
  if (!ctx) return false;
  if (ctx.account.status !== 'active') return false;
  if (!PROJECT_SCOPED_PERSONAS.has(ctx.user.persona)) return true;
  return ctx.user.projectIds.includes(projectId);
}
