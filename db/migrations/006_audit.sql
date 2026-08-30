-- ═══════════════════════════════════════════════════════════════════
-- 006 · Append-only audit, written by triggers (AD-07).
--
-- Application-level audit logging is audit logging with a bypass. This
-- record is credible precisely because no code path could have chosen
-- not to write it — which is what makes it worth anything in a billing
-- dispute or a government audit.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE audit_log (
  id          bigserial PRIMARY KEY,
  at          timestamptz NOT NULL DEFAULT now(),
  actor_id    uuid,
  account_id  uuid,
  table_name  text NOT NULL,
  row_id      uuid NOT NULL,
  action      text NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  before      jsonb,
  after       jsonb
);

CREATE INDEX audit_row_idx     ON audit_log (table_name, row_id, at DESC);
CREATE INDEX audit_account_idx ON audit_log (account_id, at DESC);

-- Append-only, enforced. Nobody edits history to win an argument.
REVOKE UPDATE, DELETE ON audit_log FROM PUBLIC;
GRANT SELECT, INSERT ON audit_log TO konstructify_app;
GRANT USAGE ON SEQUENCE audit_log_id_seq TO konstructify_app;

CREATE OR REPLACE FUNCTION write_audit() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_row   jsonb;
  v_before jsonb;
  v_after  jsonb;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_before := to_jsonb(OLD); v_after := NULL; v_row := to_jsonb(OLD);
  ELSIF TG_OP = 'UPDATE' THEN
    v_before := to_jsonb(OLD); v_after := to_jsonb(NEW); v_row := to_jsonb(NEW);
  ELSE
    v_before := NULL; v_after := to_jsonb(NEW); v_row := to_jsonb(NEW);
  END IF;

  INSERT INTO audit_log (actor_id, account_id, table_name, row_id, action, before, after)
  VALUES (
    app_user_id(),
    NULLIF(v_row ->> 'account_id', '')::uuid,
    TG_TABLE_NAME,
    (v_row ->> 'id')::uuid,
    TG_OP,
    v_before,
    v_after
  );
  RETURN NULL; -- AFTER trigger
END $$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'project', 'vendor', 'invoice', 'budget_item', 'work_task', 'work_order',
    'zone', 'drawing', 'project_photo', 'project_document', 'sop_step_state'
  ] LOOP
    EXECUTE format($f$
      CREATE TRIGGER %1$I_audit
        AFTER INSERT OR UPDATE OR DELETE ON %1$I
        FOR EACH ROW EXECUTE FUNCTION write_audit()
    $f$, t);
    EXECUTE format($f$
      CREATE TRIGGER %1$I_touch
        BEFORE UPDATE ON %1$I
        FOR EACH ROW EXECUTE FUNCTION touch_updated_at()
    $f$, t);
  END LOOP;
END $$;
