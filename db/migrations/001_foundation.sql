-- ═══════════════════════════════════════════════════════════════════
-- 001 · Foundation: roles, helpers, and the conventions every table
--      in this schema follows.
-- ═══════════════════════════════════════════════════════════════════

-- No pgcrypto: gen_random_uuid() has been in Postgres core since 13, and
-- depending on an extension that some managed platforms restrict would be a
-- needless deployment constraint.

-- The role the application connects as.
--
-- CRITICAL: it is NOT a superuser and NOT the table owner. Postgres
-- exempts both from row-level security, so an app connecting as either
-- would silently bypass every policy in migration 005 while all the
-- policies still appear to be in place. Tenant isolation would look
-- correct in the schema and not exist in production.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'konstructify_app') THEN
    CREATE ROLE konstructify_app NOLOGIN;
  END IF;
END $$;

-- ── Tenant context ──────────────────────────────────────────────────
--
-- Every request sets this before it touches data. It is read by every
-- RLS policy, and it must be set with `set_config(..., true)` — the
-- `true` makes it TRANSACTION-scoped.
--
-- That third argument is the whole ballgame under a transaction-mode
-- pooler like PgBouncer: a session-scoped setting outlives the request
-- that set it and is inherited by whichever tenant reuses the pooled
-- connection next. Transaction scope cannot leak that way.
CREATE OR REPLACE FUNCTION app_account_id() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.account_id', true), '')::uuid
$$;

CREATE OR REPLACE FUNCTION app_user_id() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.user_id', true), '')::uuid
$$;

-- ── Shared column conventions (AD-08) ───────────────────────────────
-- Every business table carries: id, account_id, created_at/by,
-- updated_at/by, deleted_at. They cost nothing now; retrofitting any
-- one of them across a populated schema with live sync clients costs
-- weeks.

CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  NEW.updated_by := COALESCE(app_user_id(), NEW.updated_by);
  RETURN NEW;
END $$;
