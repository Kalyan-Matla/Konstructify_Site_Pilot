import { beforeAll, describe, expect, test } from 'bun:test';
import type { PGlite } from '@electric-sql/pglite';
import { asAccount, freshDatabase, seed } from './harness';

const LANDLORD = '11111111-1111-1111-1111-111111111111';
const CONTRACTOR = '22222222-2222-2222-2222-222222222222';
const RIVAL = '33333333-3333-3333-3333-333333333333';
const PROJECT = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

let db: PGlite;

beforeAll(async () => {
  db = await freshDatabase();

  for (const [id, name, type] of [
    [LANDLORD, 'Priya Verma', 'landlord'],
    [CONTRACTOR, 'Qureshi Contractors', 'contractor'],
    [RIVAL, 'Unrelated Builders', 'developer'],
  ]) {
    await seed(db, `INSERT INTO account (id, name, type, status) VALUES ($1,$2,$3::account_type,'active')`, [id, name, type]);
    await seed(db, `INSERT INTO account_persona (account_id, persona) VALUES ($1,'owner')`, [id]);
  }

  await seed(db, `
    INSERT INTO project (id, account_id, name, location, client_name, budget_paise,
                         start_date, end_date, type, jurisdiction)
    VALUES ($1, $2, 'Renovation, Gurgaon', 'Gurgaon', 'Priya Verma', 1500000000,
            '2026-01-01', '2026-12-31', 'private', 'telangana')`, [PROJECT, LANDLORD]);

  await seed(db, `
    INSERT INTO vendor (id, account_id, name, phone, category, credit_limit_paise, payment_terms)
    VALUES (gen_random_uuid(), $1, 'ABC Concrete', '9876543210', 'material', 100000000, '14-day')`,
    [CONTRACTOR]);
});

describe('the Phase 1 gate', () => {
  /** The gate as the architecture stated it. A service that forgets its
   *  tenant filter must return nothing, not somebody else's ledger. */
  test('a query with no tenant context returns zero rows', async () => {
    const rows = await asAccount(db, null, null, `SELECT id FROM project`);
    expect(rows).toEqual([]);
  });

  test('the same query with a tenant returns that tenant only', async () => {
    const mine = await asAccount(db, LANDLORD, null, `SELECT id FROM project`);
    expect(mine).toHaveLength(1);

    const theirs = await asAccount(db, RIVAL, null, `SELECT id FROM project`);
    expect(theirs).toEqual([]);
  });

  test('no tenant context hides vendors too', async () => {
    expect(await asAccount(db, null, null, `SELECT id FROM vendor`)).toEqual([]);
    expect(await asAccount(db, CONTRACTOR, null, `SELECT id FROM vendor`)).toHaveLength(1);
  });
});

describe('tenant isolation', () => {
  test('an unrelated account sees no vendors of another', async () => {
    expect(await asAccount(db, RIVAL, null, `SELECT id FROM vendor`)).toEqual([]);
  });

  test('a rival cannot read a project even knowing its id', async () => {
    const rows = await asAccount(db, RIVAL, null, `SELECT id FROM project WHERE id = $1`, [PROJECT]);
    expect(rows).toEqual([]);
  });

  test('a rival cannot write into another account', async () => {
    await expect(
      asAccount(db, RIVAL, null, `
        INSERT INTO project (account_id, name, location, client_name, budget_paise,
                             start_date, end_date, type, jurisdiction)
        VALUES ($1, 'Smuggled', 'X', 'Y', 100, '2026-01-01', '2026-06-01', 'private', 'telangana')`,
        [LANDLORD]),
    ).rejects.toThrow();
  });

  test('a rival cannot reassign a project to itself', async () => {
    await asAccount(db, RIVAL, null, `UPDATE project SET account_id = $1 WHERE id = $2`, [RIVAL, PROJECT]);
    const still = await seed(db, `SELECT account_id FROM project WHERE id = $1`, [PROJECT]);
    expect((still.rows[0] as { account_id: string }).account_id).toBe(LANDLORD);
  });
});

describe('AD-05 — the landlord/contractor grant', () => {
  test('before a grant, the contractor sees nothing', async () => {
    expect(await asAccount(db, CONTRACTOR, null, `SELECT id FROM project`)).toEqual([]);
  });

  test('the grant makes exactly one project reachable', async () => {
    await seed(db, `
      INSERT INTO project_grant (project_id, grantee_account_id, scope)
      VALUES ($1, $2, 'operate')`, [PROJECT, CONTRACTOR]);

    const rows = await asAccount(db, CONTRACTOR, null, `SELECT id FROM project`);
    expect(rows).toHaveLength(1);
  });

  test('ownership never moves — the landlord still owns it', async () => {
    const r = await seed(db, `SELECT account_id FROM project WHERE id = $1`, [PROJECT]);
    expect((r.rows[0] as { account_id: string }).account_id).toBe(LANDLORD);
  });

  test('the grant does not leak the contractor other accounts', async () => {
    const rows = await asAccount(db, CONTRACTOR, null, `SELECT id FROM project`);
    expect(rows).toHaveLength(1); // the granted one, and nothing of RIVAL's
  });

  test('a project cannot be granted to the account that owns it', async () => {
    await expect(
      seed(db, `INSERT INTO project_grant (project_id, grantee_account_id) VALUES ($1,$2)`,
        [PROJECT, LANDLORD]),
    ).rejects.toThrow(/already owned/);
  });

  test('revoking the grant removes reach immediately', async () => {
    await seed(db, `UPDATE project_grant SET revoked_at = now() WHERE project_id = $1`, [PROJECT]);
    expect(await asAccount(db, CONTRACTOR, null, `SELECT id FROM project`)).toEqual([]);

    await seed(db, `UPDATE project_grant SET revoked_at = NULL WHERE project_id = $1`, [PROJECT]);
    expect(await asAccount(db, CONTRACTOR, null, `SELECT id FROM project`)).toHaveLength(1);
  });
});

describe('child records inherit project reachability', () => {
  test('a granted contractor reaches the project tasks', async () => {
    await seed(db, `
      INSERT INTO work_task (account_id, project_id, name, phase, assigned_to, due_date)
      VALUES ($1, $2, 'Demolition survey', 'Foundation', 'Site Lead', '2026-03-01')`,
      [LANDLORD, PROJECT]);

    expect(await asAccount(db, CONTRACTOR, null, `SELECT id FROM work_task`)).toHaveLength(1);
    expect(await asAccount(db, RIVAL, null, `SELECT id FROM work_task`)).toEqual([]);
    expect(await asAccount(db, null, null, `SELECT id FROM work_task`)).toEqual([]);
  });
});

describe('database-enforced invariants', () => {
  test('a persona the account is not entitled to cannot be assigned', async () => {
    await expect(
      seed(db, `INSERT INTO app_user (account_id, email, name, persona)
                VALUES ($1, 'x@y.in', 'X', 'site-engineer')`, [LANDLORD]),
    ).rejects.toThrow();
  });

  test('an entitled persona can', async () => {
    await seed(db, `INSERT INTO account_persona (account_id, persona) VALUES ($1,'site-engineer')`, [LANDLORD]);
    await seed(db, `INSERT INTO app_user (account_id, email, name, persona)
                    VALUES ($1, 'eng@y.in', 'Eng', 'site-engineer')`, [LANDLORD]);
    const r = await seed(db, `SELECT count(*)::int AS n FROM app_user WHERE account_id = $1`, [LANDLORD]);
    expect((r.rows[0] as { n: number }).n).toBe(1);
  });

  test('an unpaid invoice cannot carry settlement details', async () => {
    const v = await seed(db, `SELECT id FROM vendor LIMIT 1`);
    const vendorId = (v.rows[0] as { id: string }).id;
    await expect(
      seed(db, `
        INSERT INTO invoice (account_id, vendor_id, project_id, invoice_number,
                             invoice_date, due_date, amount_paise, status, payment_mode)
        VALUES ($1,$2,$3,'INV-1','2026-01-01','2026-02-01',100000,'unpaid','NEFT')`,
        [LANDLORD, vendorId, PROJECT]),
    ).rejects.toThrow();
  });

  test('only one revision of a sheet can be current', async () => {
    await seed(db, `
      INSERT INTO drawing (account_id, project_id, sheet_number, title, revision,
                           is_current, storage_key, mime_type, size_bytes)
      VALUES ($1,$2,'A-101','Ground floor','R0', true, 'k0','image/svg+xml',100)`,
      [LANDLORD, PROJECT]);

    await expect(
      seed(db, `
        INSERT INTO drawing (account_id, project_id, sheet_number, title, revision,
                             is_current, storage_key, mime_type, size_bytes)
        VALUES ($1,$2,'A-101','Ground floor','R1', true, 'k1','image/svg+xml',100)`,
        [LANDLORD, PROJECT]),
    ).rejects.toThrow();
  });

  test('money columns reject negatives', async () => {
    await expect(
      seed(db, `
        INSERT INTO project (account_id, name, location, client_name, budget_paise,
                             start_date, end_date, type, jurisdiction)
        VALUES ($1,'Neg','X','Y',-1,'2026-01-01','2026-06-01','private','telangana')`, [LANDLORD]),
    ).rejects.toThrow();
  });
});

describe('AD-07 — audit is written by the database, not the app', () => {
  test('an insert is recorded without the application asking', async () => {
    const before = await seed(db, `SELECT count(*)::int AS n FROM audit_log WHERE table_name='work_order'`);
    await seed(db, `
      INSERT INTO work_order (account_id, project_id, order_number, task_name, assignee, due_date)
      VALUES ($1,$2,'WO-001','Excavation','Crew','2026-04-01')`, [LANDLORD, PROJECT]);
    const after = await seed(db, `SELECT count(*)::int AS n FROM audit_log WHERE table_name='work_order'`);
    expect((after.rows[0] as { n: number }).n).toBe((before.rows[0] as { n: number }).n + 1);
  });

  test('an update records both the before and the after', async () => {
    await seed(db, `UPDATE work_order SET assignee = 'New Crew' WHERE order_number = 'WO-001'`);
    const r = await seed(db, `
      SELECT before ->> 'assignee' AS b, after ->> 'assignee' AS a
      FROM audit_log WHERE table_name='work_order' AND action='UPDATE'
      ORDER BY at DESC LIMIT 1`);
    expect(r.rows[0]).toEqual({ b: 'Crew', a: 'New Crew' });
  });

  test('history cannot be rewritten to win an argument', async () => {
    await expect(
      asAccount(db, LANDLORD, null, `UPDATE audit_log SET after = '{}'::jsonb WHERE id > 0`),
    ).rejects.toThrow();
    await expect(
      asAccount(db, LANDLORD, null, `DELETE FROM audit_log WHERE id > 0`),
    ).rejects.toThrow();
  });
});

describe('the deployment footgun, stated as a test', () => {
  /**
   * Postgres exempts superusers and table owners from RLS. An application
   * that connects as either gets every policy in migration 005 silently
   * ignored — the schema still shows them, `\dp` still lists them, and
   * tenant isolation does not exist.
   *
   * This test demonstrates the difference rather than asserting safety:
   * `seed()` runs privileged and sees everything; `asAccount()` runs as
   * konstructify_app and sees only its tenant. If production ever connects
   * the way `seed()` does, that is the whole breach.
   */
  test('privileged access sees across tenants; the app role does not', async () => {
    const privileged = await seed(db, `SELECT id FROM project`);
    expect(privileged.rows.length).toBeGreaterThan(0);

    const asRival = await asAccount(db, RIVAL, null, `SELECT id FROM project`);
    expect(asRival).toEqual([]);
  });

  /** FORCE ROW LEVEL SECURITY is what closes the owner half of that gap:
   *  without it, the role owning the tables would bypass its own policies
   *  even when it is not a superuser. */
  test('every business table has RLS both enabled and forced', async () => {
    const r = await seed(db, `
      SELECT relname FROM pg_class
      WHERE relnamespace = 'public'::regnamespace
        AND relkind = 'r'
        AND relname IN ('project','vendor','invoice','work_task','work_order',
                        'budget_item','zone','drawing','project_photo',
                        'project_document','sop_step_state','project_grant')
        AND (relrowsecurity = false OR relforcerowsecurity = false)`);
    expect(r.rows).toEqual([]);
  });
});
