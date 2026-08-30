-- ═══════════════════════════════════════════════════════════════════
-- 002 · Identity: the four authorization layers, as tables.
-- ═══════════════════════════════════════════════════════════════════

CREATE TYPE account_type AS ENUM ('developer', 'landlord', 'contractor', 'platform');
CREATE TYPE account_status AS ENUM ('pending-approval', 'active', 'suspended');
CREATE TYPE persona AS ENUM (
  'super-admin', 'owner', 'project-manager', 'site-engineer', 'supervisor', 'accountant'
);

CREATE TABLE account (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  type        account_type NOT NULL,
  status      account_status NOT NULL DEFAULT 'pending-approval',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz
);

-- Layer 1 — which personas Super Admin has switched on for this account.
-- A row here IS the entitlement: a user cannot hold a persona the account
-- was never granted, which is enforced by app_user's composite FK below.
CREATE TABLE account_persona (
  account_id  uuid NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  persona     persona NOT NULL,
  granted_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, persona)
);

CREATE TABLE app_user (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  uuid NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  email       text NOT NULL,
  name        text NOT NULL,
  persona     persona NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz,

  -- Layer 1, enforced by the database rather than by remembering to check.
  -- Assigning a persona the account is not entitled to is now impossible,
  -- not merely discouraged.
  FOREIGN KEY (account_id, persona)
    REFERENCES account_persona (account_id, persona)
);

-- Case-insensitive uniqueness without needing the citext extension.
CREATE UNIQUE INDEX app_user_email_key ON app_user (lower(email)) WHERE deleted_at IS NULL;
CREATE INDEX app_user_account_idx ON app_user (account_id) WHERE deleted_at IS NULL;

-- Layer 3 — which projects a project-scoped persona may reach. Granting or
-- revoking is an insert or a delete, and the sync layer reacts in seconds.
CREATE TABLE project_assignment (
  user_id     uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  project_id  uuid NOT NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by uuid REFERENCES app_user(id),
  PRIMARY KEY (user_id, project_id)
);

CREATE INDEX project_assignment_project_idx ON project_assignment (project_id);
