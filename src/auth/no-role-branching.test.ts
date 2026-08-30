import { describe, expect, test } from 'bun:test';
import { Glob } from 'bun';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Phase 0 acceptance gate, made self-enforcing.
 *
 * The single most expensive mistake in a permissions system is branching on
 * the persona's NAME instead of asking what it can do. Every such branch is
 * a place that must be revisited when a persona is added, renamed or made
 * configurable — and they are never all found.
 *
 * `src/auth/can.ts` is the one legitimate exception: the authorization
 * kernel is allowed to know that Super Admin sits outside tenant
 * entitlement, because that is the rule it exists to express.
 */
const ALLOWED = new Set(['src/auth/can.ts']);

const BRANCH = /\b(persona|role)\s*(===|!==)\s*['"`]/;

describe('no role-string branching outside the authz kernel', () => {
  test('every source file asks can(), never who the user is', async () => {
    const root = join(import.meta.dir, '..', '..');
    const glob = new Glob('src/**/*.{ts,tsx}');
    const offenders: string[] = [];

    for await (const rel of glob.scan({ cwd: root })) {
      const path = rel.replaceAll('\\', '/');
      if (ALLOWED.has(path) || path.includes('.test.')) continue;

      const lines = readFileSync(join(root, path), 'utf8').split('\n');
      lines.forEach((line, i) => {
        const code = line.replace(/\/\/.*$/, '').replace(/^\s*\*.*$/, '');
        if (BRANCH.test(code)) offenders.push(`${path}:${i + 1} → ${line.trim()}`);
      });
    }

    expect(offenders).toEqual([]);
  });
});

/**
 * Money is integer paise (AD-06), and the unit lives in the field NAME.
 * A raw `toLocaleString` on a paise value prints it with a rupee sign and
 * no conversion — ₹3L silently renders as ₹3,00,00,000. That exact bug
 * shipped during the migration and was caught in the browser, not by the
 * compiler, because both sides are just `number`. This is the tripwire.
 */
describe('money is never formatted by hand', () => {
  test('paise values go through formatINR, never toLocaleString', async () => {
    const root = join(import.meta.dir, '..', '..');
    const glob = new Glob('src/**/*.{ts,tsx}');
    const offenders: string[] = [];

    for await (const rel of glob.scan({ cwd: root })) {
      const path = rel.replaceAll('\\', '/');
      // money.ts is where the one legitimate call lives — it is the formatter.
      if (path === 'src/utils/money.ts' || path.includes('.test.')) continue;

      readFileSync(join(root, path), 'utf8').split('\n').forEach((line, i) => {
        if (/toLocaleString/.test(line.replace(/\/\/.*$/, ''))) {
          offenders.push(`${path}:${i + 1} → ${line.trim()}`);
        }
      });
    }

    expect(offenders).toEqual([]);
  });
});
