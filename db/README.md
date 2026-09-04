# Database — Phase 1

Postgres schema, row-level security and audit for Konstructify.

## What is here

| Migration | Contents |
|---|---|
| `001_foundation` | `konstructify_app` role, tenant-context helpers, shared column conventions |
| `002_identity` | Accounts, persona entitlement (layer 1), users, project assignment (layer 3) |
| `003_projects` | Projects, the cross-tenant `project_grant`, reachability helpers |
| `004_business` | Vendors, invoices, BOQ, tasks, orders, zones, drawings, photos, documents, SOP state |
| `005_rls` | Row-level security policies — Gate 3 |
| `006_audit` | Append-only audit written by triggers |

## Running the tests

```bash
bun test db/
```

These run against **PGlite** — Postgres 18 compiled to WebAssembly — so RLS
behaves exactly as it does in production rather than being simulated. No
server, no Docker, no cloud account. An RLS policy that is only reasoned
about is a policy nobody has tested.

## Three things that will void tenant isolation

**1. Connecting as a superuser or the table owner.** Postgres exempts both
from RLS. Every policy stays visible in the schema, `\dp` still lists them,
and isolation does not exist. The app must connect as `konstructify_app`,
which is `NOLOGIN` here — give it a password and `LOGIN` at deploy time, and
never grant it `BYPASSRLS`. `FORCE ROW LEVEL SECURITY` is set on every table
to close the owner half of this.

**2. Setting the tenant session-scoped.** Always:

```sql
SELECT set_config('app.account_id', $1, true);
```

The third argument makes it transaction-scoped. Under a transaction-mode
pooler such as PgBouncer, a session-scoped setting outlives the request that
set it and is inherited by whichever tenant reuses that connection next.

**3. Adding a table without a policy.** A new table has no RLS until you
enable it, and it will be readable across tenants. The check in
`db/rls.test.ts` fails the build if a business table is missing either
`ENABLE` or `FORCE`.

## Still required, and only you can do it

- Provision a Postgres instance and run these migrations against it.
- Give `konstructify_app` a login and password; store it in a secret manager,
  never in the repo.
- Choose and configure the identity provider. Per **AD-04** its token carries
  identity only — `user_id`, `account_id`, expiry — and never permissions,
  which resolve server-side per request so a revoked assignment takes effect
  immediately rather than at token expiry.
- Provision object storage for photos, drawings and permit scans. The schema
  already stores a `storage_key` rather than bytes, so the application layer
  changes and the schema does not.
