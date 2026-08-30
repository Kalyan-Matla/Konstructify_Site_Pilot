import { PGlite } from '@electric-sql/pglite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const MIGRATIONS = join(import.meta.dir, 'migrations');

/**
 * A real Postgres, in-process.
 *
 * PGlite is Postgres compiled to WebAssembly, so row-level security
 * behaves exactly as it does in production rather than being simulated.
 * That is the point: an RLS policy that is only reasoned about is a policy
 * nobody has tested, and tenant isolation is not something to take on
 * trust.
 */
export async function freshDatabase(): Promise<PGlite> {
  const db = new PGlite();
  for (const file of readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort()) {
    try {
      await db.exec(readFileSync(join(MIGRATIONS, file), 'utf8'));
    } catch (e) {
      throw new Error(`migration ${file} failed: ${(e as Error).message}`);
    }
  }
  return db;
}

/**
 * Run a query the way the application does: as the unprivileged role, with
 * the tenant set transaction-scoped.
 *
 * Both halves matter. Connecting as a superuser or the table owner would
 * bypass RLS entirely and make every test below pass for the wrong reason.
 * And `set_config(..., true)` is transaction-scoped, which is what stops a
 * pooled connection carrying one tenant's context into the next tenant's
 * request.
 */
export async function asAccount<T>(
  db: PGlite,
  accountId: string | null,
  userId: string | null,
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const rows = await db.transaction(async (tx) => {
    await tx.exec('SET LOCAL ROLE konstructify_app');
    await tx.query(`SELECT set_config('app.account_id', $1, true)`, [accountId ?? '']);
    await tx.query(`SELECT set_config('app.user_id', $1, true)`, [userId ?? '']);
    const r = await tx.query<T>(sql, params);
    return r.rows;
  });
  return rows ?? [];
}

/** Privileged setup, bypassing RLS — for arranging fixtures only. */
export async function seed(db: PGlite, sql: string, params: unknown[] = []) {
  return db.query(sql, params);
}
