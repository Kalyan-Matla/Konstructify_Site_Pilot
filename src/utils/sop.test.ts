import { describe, expect, test } from 'bun:test';
import type { Project } from '../types';
import { buildMockState } from './mock-data';
import { rupees } from './money';
import {
  INSTANT_LIMIT_HEIGHT_M,
  INSTANT_LIMIT_SQM,
  REGISTRATION_LIMIT_SQM,
  resolveTier,
  sopProgress,
  templateByTier,
  templateFor,
} from './sop';

const proj = (over: Partial<Project> = {}): Project => ({
  id: 'p', name: 'Test', location: 'Hyderabad', clientName: 'C',
  budgetPaise: rupees(10_00_000), startDate: '2026-01-01', endDate: '2026-12-31',
  status: 'in-progress', type: 'private', jurisdiction: 'telangana',
  plotAreaSqm: 300, buildingHeightM: 8, ...over,
});

describe('resolveTier — the TS-bPASS decision', () => {
  /** Block C's acceptance gate, stated as the plan stated it. */
  test('a 400 m² house gets instant approval, not single window', () => {
    expect(resolveTier(proj({ plotAreaSqm: 400, buildingHeightM: 9 }))).toBe('instant-approval');
  });

  test('a plot at or under 75 sq yd needs registration only', () => {
    expect(resolveTier(proj({ plotAreaSqm: 50 }))).toBe('registration');
    expect(resolveTier(proj({ plotAreaSqm: REGISTRATION_LIMIT_SQM }))).toBe('registration');
  });

  test('height alone pushes an otherwise-small plot to single window', () => {
    // Same 400 m², but above the 10 m ceiling.
    expect(resolveTier(proj({ plotAreaSqm: 400, buildingHeightM: 14 }))).toBe('single-window');
  });

  test('area alone pushes a low building to single window', () => {
    expect(resolveTier(proj({ plotAreaSqm: 900, buildingHeightM: 6 }))).toBe('single-window');
  });

  test('the boundaries themselves stay on the permissive side', () => {
    expect(resolveTier(proj({ plotAreaSqm: INSTANT_LIMIT_SQM, buildingHeightM: INSTANT_LIMIT_HEIGHT_M })))
      .toBe('instant-approval');
    expect(resolveTier(proj({ plotAreaSqm: INSTANT_LIMIT_SQM + 0.1, buildingHeightM: 9 })))
      .toBe('single-window');
  });

  /** An unmeasured project is not evidence of a small one. Falling to the
   *  strictest route is the safe direction to be wrong in — over-applying
   *  costs paperwork, under-applying builds on the wrong permission. */
  test('a missing plot area falls to the strictest route', () => {
    expect(resolveTier(proj({ plotAreaSqm: null }))).toBe('single-window');
  });

  test('a missing height cannot sneak into instant approval', () => {
    expect(resolveTier(proj({ plotAreaSqm: 300, buildingHeightM: null }))).toBe('single-window');
  });

  test('government work follows CPWD regardless of size', () => {
    expect(resolveTier(proj({ type: 'government', plotAreaSqm: 30 }))).toBe('cpwd');
    expect(resolveTier(proj({ type: 'government', plotAreaSqm: null }))).toBe('cpwd');
  });
});

describe('templateFor — jurisdiction is refused, never defaulted', () => {
  test('Telangana private work resolves to a real route', () => {
    const t = templateFor(proj({ plotAreaSqm: 400, buildingHeightM: 9 }));
    expect(t?.tier).toBe('instant-approval');
    expect(t?.jurisdiction).toBe('telangana');
  });

  test('government work resolves to the CPWD chain', () => {
    expect(templateFor(proj({ type: 'government', jurisdiction: 'cpwd' }))?.tier).toBe('cpwd');
  });

  /** A Karnataka owner following a Telangana checklist is worse off than one
   *  following none, so an unauthored jurisdiction returns nothing. */
  test('a jurisdiction with no authored route returns null', () => {
    const t = templateFor(proj({ jurisdiction: 'cpwd', type: 'private', plotAreaSqm: 400, buildingHeightM: 9 }));
    expect(t).toBeNull();
  });
});

describe('route content', () => {
  test('every route carries a review date and a source', () => {
    for (const tier of ['registration', 'instant-approval', 'single-window', 'cpwd'] as const) {
      const t = templateByTier(tier)!;
      expect(t.lastReviewed).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(t.sourceUrl).toStartWith('https://');
      expect(t.steps.length).toBeGreaterThan(0);
    }
  });

  test('step keys are unique within a route, so state cannot collide', () => {
    for (const tier of ['registration', 'instant-approval', 'single-window', 'cpwd'] as const) {
      const keys = templateByTier(tier)!.steps.map((s) => s.key);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  test('every step names the authority that grants it', () => {
    for (const tier of ['registration', 'instant-approval', 'single-window', 'cpwd'] as const) {
      for (const step of templateByTier(tier)!.steps) {
        expect(step.authority.length).toBeGreaterThan(0);
      }
    }
  });

  test('stricter routes carry more steps than lighter ones', () => {
    const reg = templateByTier('registration')!.steps.length;
    const inst = templateByTier('instant-approval')!.steps.length;
    const sw = templateByTier('single-window')!.steps.length;
    expect(inst).toBeGreaterThan(reg);
    expect(sw).toBeGreaterThan(inst);
  });

  test('the CPWD chain runs sanction before tender before billing', () => {
    const keys = templateByTier('cpwd')!.steps.map((s) => s.key);
    expect(keys.indexOf('admin-approval')).toBeLessThan(keys.indexOf('technical-sanction'));
    expect(keys.indexOf('technical-sanction')).toBeLessThan(keys.indexOf('tender'));
    expect(keys.indexOf('tender')).toBeLessThan(keys.indexOf('ra-bills'));
  });
});

describe('sopProgress', () => {
  const template = templateByTier('registration')!;

  test('an untouched route reads zero', () => {
    const p = sopProgress(template, []);
    expect(p.settled).toBe(0);
    expect(p.percent).toBe(0);
  });

  /** Not-applicable is settled, not pending. A project with no borewell has
   *  genuinely dealt with that step and should be able to say so. */
  test('not-applicable counts as settled', () => {
    const p = sopProgress(template, [
      { stepKey: 'title-landuse', status: 'done' },
      { stepKey: 'borewell-walta', status: 'not-applicable' },
    ]);
    expect(p.settled).toBe(2);
  });

  test('in-progress does not count as settled', () => {
    expect(sopProgress(template, [{ stepKey: 'title-landuse', status: 'in-progress' }]).settled).toBe(0);
  });

  test('a fully settled route reads 100', () => {
    const all = template.steps.map((s) => ({ stepKey: s.key, status: 'done' }));
    expect(sopProgress(template, all).percent).toBe(100);
  });
});

describe('seeded projects exercise every route', () => {
  test('the three demo projects cover instant, single window and CPWD', () => {
    const s = buildMockState();
    const tiers = s.projects.map(resolveTier).sort();
    expect(tiers).toEqual(['cpwd', 'instant-approval', 'single-window']);
  });

  test('each seeded project resolves to a real template', () => {
    for (const p of buildMockState().projects) {
      expect(templateFor(p)).not.toBeNull();
    }
  });
});
