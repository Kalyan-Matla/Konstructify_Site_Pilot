-- ═══════════════════════════════════════════════════════════════════
-- 005 · Row-level security. Gate 3 in the architecture.
--
-- This gate exists to catch OUR OWN bugs. A service that forgets its
-- tenant filter should return an empty set, not another company's
-- ledger. It is deliberately the last line, not the first: sync rules
-- keep unauthorised rows off the device entirely, and the mutation API
-- re-authorizes every write. This is what remains true when both of
-- those have a defect.
-- ═══════════════════════════════════════════════════════════════════

-- Tables scoped directly by account.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['account', 'app_user', 'vendor'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %I TO konstructify_app', t);
  END LOOP;
END $$;

CREATE POLICY account_isolation ON account
  USING (id = app_account_id())
  WITH CHECK (id = app_account_id());

CREATE POLICY app_user_isolation ON app_user
  USING (account_id = app_account_id())
  WITH CHECK (account_id = app_account_id());

CREATE POLICY vendor_isolation ON vendor
  USING (account_id = app_account_id())
  WITH CHECK (account_id = app_account_id());

-- Project itself, including the cross-tenant grant (AD-05). A landlord
-- owns it; a contractor reaches it through an unrevoked grant.
ALTER TABLE project ENABLE ROW LEVEL SECURITY;
ALTER TABLE project FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON project TO konstructify_app;

CREATE POLICY project_isolation ON project
  USING (project_is_visible(id))
  -- Writes stay with the owning account: a contractor operating a granted
  -- project cannot re-home it, and cannot create projects for someone else.
  WITH CHECK (account_id = app_account_id());

-- Everything hanging off a project inherits its reachability, funnelled
-- through project_is_visible() so the rule lives in exactly one place.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'budget_item', 'invoice', 'zone', 'work_task', 'work_order',
    'drawing', 'project_photo', 'project_document', 'sop_step_state'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %I TO konstructify_app', t);
    EXECUTE format($f$
      CREATE POLICY %1$I_isolation ON %1$I
        USING (project_is_visible(project_id))
        WITH CHECK (project_is_visible(project_id))
    $f$, t);
  END LOOP;
END $$;

-- Join tables.
ALTER TABLE account_persona ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_persona FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON account_persona TO konstructify_app;
CREATE POLICY account_persona_isolation ON account_persona
  USING (account_id = app_account_id())
  WITH CHECK (account_id = app_account_id());

ALTER TABLE project_assignment ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_assignment FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON project_assignment TO konstructify_app;
CREATE POLICY project_assignment_isolation ON project_assignment
  USING (project_is_visible(project_id))
  WITH CHECK (project_is_visible(project_id));

-- A grant is visible to BOTH sides — the landlord who issued it and the
-- contractor who holds it. Only the granting account may create or revoke.
ALTER TABLE project_grant ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_grant FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON project_grant TO konstructify_app;
CREATE POLICY project_grant_visible ON project_grant
  -- Visible to both sides: the landlord who issued it, the contractor who
  -- holds it. Writable only by the owner, so a contractor cannot extend
  -- their own access or grant it onward.
  USING (grantee_account_id = app_account_id() OR account_owns_project(project_id))
  WITH CHECK (account_owns_project(project_id));

GRANT USAGE ON SCHEMA public TO konstructify_app;
