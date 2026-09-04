-- ═══════════════════════════════════════════════════════════════════
-- 003 · Projects and the cross-tenant grant.
-- ═══════════════════════════════════════════════════════════════════

CREATE TYPE project_status AS ENUM ('in-progress', 'on-hold', 'completed');
CREATE TYPE project_type   AS ENUM ('government', 'private');
CREATE TYPE jurisdiction   AS ENUM ('telangana', 'cpwd');

CREATE TABLE project (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id    uuid NOT NULL REFERENCES account(id),
  name          text NOT NULL,
  location      text NOT NULL,
  client_name   text NOT NULL,

  -- AD-06: money is integer paise. Retention at 5%, GST TDS at 2% and
  -- cess at 1% compound across running bills; float drift there becomes a
  -- dispute argued with a Measurement Book, not a changelog.
  budget_paise  bigint NOT NULL CHECK (budget_paise >= 0),

  start_date    date NOT NULL,
  end_date      date NOT NULL,
  status        project_status NOT NULL DEFAULT 'in-progress',

  -- Layer 4, and what the approval route branches on.
  type          project_type NOT NULL,
  jurisdiction  jurisdiction NOT NULL,
  plot_area_sqm numeric(10,2),
  height_m      numeric(6,2),

  created_at    timestamptz NOT NULL DEFAULT now(),
  created_by    uuid,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  updated_by    uuid,
  deleted_at    timestamptz,

  CONSTRAINT project_dates_ordered CHECK (end_date > start_date)
);

CREATE INDEX project_account_idx ON project (account_id) WHERE deleted_at IS NULL;

ALTER TABLE project_assignment
  ADD CONSTRAINT project_assignment_project_fk
  FOREIGN KEY (project_id) REFERENCES project(id) ON DELETE CASCADE;

-- ── The only edge that crosses a company boundary (AD-05) ────────────
--
-- A landlord owns the project; a contractor operates it. Ownership never
-- moves — the grant is additive, scoped and revocable, so withdrawing a
-- contractor is one row update rather than a data migration.
CREATE TYPE grant_scope AS ENUM ('operate', 'observe');

CREATE TABLE project_grant (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id         uuid NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  /** The account receiving access. The granting account is project.account_id. */
  grantee_account_id uuid NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  scope              grant_scope NOT NULL DEFAULT 'operate',
  granted_at         timestamptz NOT NULL DEFAULT now(),
  granted_by         uuid REFERENCES app_user(id),
  revoked_at         timestamptz
);

-- A project cannot be granted to the account that already owns it. This
-- needs a trigger rather than a CHECK, because the owning account lives on
-- another table and CHECK constraints cannot see one.
CREATE OR REPLACE FUNCTION reject_self_grant() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM project p
    WHERE p.id = NEW.project_id AND p.account_id = NEW.grantee_account_id
  ) THEN
    RAISE EXCEPTION 'project % is already owned by account %',
      NEW.project_id, NEW.grantee_account_id;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER project_grant_not_self
  BEFORE INSERT OR UPDATE ON project_grant
  FOR EACH ROW EXECUTE FUNCTION reject_self_grant();

CREATE UNIQUE INDEX project_grant_active_key
  ON project_grant (project_id, grantee_account_id)
  WHERE revoked_at IS NULL;

CREATE INDEX project_grant_grantee_idx
  ON project_grant (grantee_account_id) WHERE revoked_at IS NULL;

-- ── Reachability, in one place ───────────────────────────────────────
--
-- Every policy in migration 005 funnels through these. Defining "which
-- projects can this request see" once means a change to the rule cannot be
-- applied to eleven tables and forgotten on the twelfth.
--
-- Both are SECURITY DEFINER, and that is load-bearing rather than
-- convenient. Without it the policies deadlock on each other: project's
-- policy consults project_grant, whose policy consults project, and
-- Postgres raises "infinite recursion detected in policy". The
-- authorization logic cannot itself be subject to the policies it informs.
--
-- SECURITY DEFINER also means a pinned search_path is mandatory — without
-- one, a caller could shadow `project` with their own table and have this
-- function answer from it while running as the owner.
CREATE OR REPLACE FUNCTION project_is_visible(p_project_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM project p
    WHERE p.id = p_project_id
      AND (
        p.account_id = app_account_id()
        OR EXISTS (
          SELECT 1 FROM project_grant g
          WHERE g.project_id = p.id
            AND g.grantee_account_id = app_account_id()
            AND g.revoked_at IS NULL
        )
      )
  )
$$;

/** Ownership only — a granted contractor is NOT an owner. Used where the
 *  distinction matters, such as who may issue or revoke a grant. */
CREATE OR REPLACE FUNCTION account_owns_project(p_project_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM project p
    WHERE p.id = p_project_id AND p.account_id = app_account_id()
  )
$$;
