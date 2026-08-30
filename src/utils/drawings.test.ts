import { describe, expect, test } from 'bun:test';
import type { AppState } from '../types';
import { buildMockState } from './mock-data';
import { zoneProgress, ZONE_STATUS_COLOR } from './derive';

describe('drawing register — one current revision per sheet', () => {
  const state = buildMockState();

  /** The invariant the whole register exists to hold. Two "current" sheets
   *  is worse than no register: it makes an old print look authoritative. */
  test('each sheet has exactly one current revision', () => {
    const bySheet = new Map<string, number>();
    for (const d of state.drawings.filter((x) => x.isCurrent)) {
      bySheet.set(d.sheetNumber, (bySheet.get(d.sheetNumber) ?? 0) + 1);
    }
    for (const [, count] of bySheet) expect(count).toBe(1);
  });

  test('a superseded revision is not current and is still retrievable', () => {
    const r0 = state.drawings.find((d) => d.revision === 'R0')!;
    expect(r0.isCurrent).toBe(false);
    expect(r0.supersedesId).toBeNull();
  });

  test('the current revision points back at what it replaced', () => {
    const r1 = state.drawings.find((d) => d.revision === 'R1')!;
    expect(r1.isCurrent).toBe(true);
    expect(r1.supersedesId).toBe('dwg-a101-r0');
  });

  test('every revision of a sheet shares its sheet number', () => {
    const a101 = state.drawings.filter((d) => d.sheetNumber === 'A-101');
    expect(a101.length).toBeGreaterThan(1);
    expect(new Set(a101.map((d) => d.title)).size).toBe(1);
  });

  test('a revision explains what changed', () => {
    expect(state.drawings.find((d) => d.revision === 'R1')!.notes.length).toBeGreaterThan(0);
  });
});

describe('zone outlines', () => {
  const state = buildMockState();

  /** Fractions, not pixels — a sheet re-exported at another resolution must
   *  keep its zones where they were drawn. */
  test('outlines are stored as fractions of the sheet', () => {
    for (const z of state.zones.filter((x) => x.outline)) {
      for (const p of z.outline!) {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThanOrEqual(1);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeLessThanOrEqual(1);
      }
    }
  });

  test('an outlined zone points at a real drawing', () => {
    const ids = new Set(state.drawings.map((d) => d.id));
    for (const z of state.zones.filter((x) => x.outline)) {
      expect(ids.has(z.drawingId!)).toBe(true);
    }
  });

  test('outlined zones sit on the current revision, not a superseded one', () => {
    const current = new Set(state.drawings.filter((d) => d.isCurrent).map((d) => d.id));
    for (const z of state.zones.filter((x) => x.drawingId)) {
      expect(current.has(z.drawingId!)).toBe(true);
    }
  });
});

describe("Block D gate — completing a task changes its element, room and floor", () => {
  function fixture(): AppState {
    const s = buildMockState();
    // Column C4 sits in the Living Room, which sits on the Ground Floor.
    s.tasks = [
      {
        id: 'tz1', projectId: 'p1', name: 'Cast column C4', description: '',
        phase: 'Structure', assignedTo: 'Crew', status: 'in-progress',
        dueDate: '2026-09-01', percentComplete: 0,
        budgetItemId: null, zoneId: 'z-p1-gf-c4', createdAt: '2026-08-01',
      },
    ];
    return s;
  }

  test('all three levels start not-started', () => {
    const s = fixture();
    for (const id of ['z-p1-gf-c4', 'z-p1-gf-liv', 'z-p1-gf']) {
      expect(zoneProgress(id, s).status).toBe('not-started');
    }
  });

  /** The gate: one task completing must visibly change all three levels.
   *  The element goes green; the room and floor move off not-started —
   *  they do not jump to complete, because Beam B2 in the same room is
   *  still unbuilt, and claiming otherwise is what makes a status drawing
   *  untrustworthy. */
  test('completing the task changes element, room and floor', () => {
    const s = fixture();
    s.tasks[0].percentComplete = 100;

    expect(zoneProgress('z-p1-gf-c4', s).status).toBe('complete');      // element
    expect(zoneProgress('z-p1-gf-liv', s).status).toBe('in-progress');  // room
    expect(zoneProgress('z-p1-gf', s).status).toBe('in-progress');      // floor
  });

  test('the room only completes once everything inside it is built', () => {
    const s = fixture();
    s.tasks[0].percentComplete = 100;
    s.tasks.push({
      id: 'tz2', projectId: 'p1', name: 'Cast beam B2', description: '',
      phase: 'Structure', assignedTo: 'Crew', status: 'complete',
      dueDate: '2026-09-01', percentComplete: 100,
      budgetItemId: null, zoneId: 'z-p1-gf-b2', createdAt: '2026-08-01',
    });

    // The room is finished once both its elements are.
    expect(zoneProgress('z-p1-gf-liv', s).status).toBe('complete');
    // The floor is not, and should not claim to be — the Kitchen beside it
    // is still unbuilt. A drawing that goes green while a room is untouched
    // is exactly the kind of reassurance that causes rework.
    expect(zoneProgress('z-p1-gf', s).status).toBe('in-progress');
    expect(zoneProgress('z-p1-gf-kit', s).status).toBe('not-started');
  });

  test('the colour follows the status, so the sheet cannot disagree', () => {
    const s = fixture();
    expect(ZONE_STATUS_COLOR[zoneProgress('z-p1-gf-c4', s).status])
      .toBe(ZONE_STATUS_COLOR['not-started']);

    s.tasks[0].percentComplete = 100;
    expect(ZONE_STATUS_COLOR[zoneProgress('z-p1-gf-c4', s).status])
      .toBe(ZONE_STATUS_COLOR.complete);
  });

  test('partial work reads in-progress all the way up', () => {
    const s = fixture();
    s.tasks[0].percentComplete = 40;
    for (const id of ['z-p1-gf-c4', 'z-p1-gf-liv', 'z-p1-gf']) {
      expect(zoneProgress(id, s).status).toBe('in-progress');
    }
  });

  test('a sibling element still building holds the room back', () => {
    const s = fixture();
    s.tasks[0].percentComplete = 100;
    s.tasks.push({
      id: 'tz2', projectId: 'p1', name: 'Cast beam B2', description: '',
      phase: 'Structure', assignedTo: 'Crew', status: 'in-progress',
      dueDate: '2026-09-01', percentComplete: 0,
      budgetItemId: null, zoneId: 'z-p1-gf-b2', createdAt: '2026-08-01',
    });

    expect(zoneProgress('z-p1-gf-c4', s).status).toBe('complete');
    expect(zoneProgress('z-p1-gf-liv', s).status).toBe('in-progress');
    expect(zoneProgress('z-p1-gf-liv', s).percentComplete).toBe(50);
  });
});

describe('a marked zone counts even before it has tasks', () => {
  /** Regression from the browser: Living Room read 100% complete while Beam
   *  B2 drawn inside it read 0%, because childless zones were dropped from
   *  the average entirely. A zone someone took the trouble to mark is part
   *  of the work whether or not it has been planned yet. */
  test('a sibling with no tasks still holds the room back', () => {
    const s = buildMockState();
    s.tasks = [
      {
        id: 'tz1', projectId: 'p1', name: 'Cast column C4', description: '',
        phase: 'Structure', assignedTo: 'Crew', status: 'complete',
        dueDate: '2026-09-01', percentComplete: 100,
        budgetItemId: null, zoneId: 'z-p1-gf-c4', createdAt: '2026-08-01',
      },
    ];
    // C4 is done; Beam B2 exists in the same room with nothing planned.
    expect(zoneProgress('z-p1-gf-c4', s).percentComplete).toBe(100);
    expect(zoneProgress('z-p1-gf-b2', s).percentComplete).toBe(0);
    expect(zoneProgress('z-p1-gf-liv', s).percentComplete).toBe(50);
    expect(zoneProgress('z-p1-gf-liv', s).status).toBe('in-progress');
  });

  test('a subtree with genuinely no tasks still reports zero, not NaN', () => {
    const s = buildMockState();
    s.tasks = [];
    const r = zoneProgress('z-p1-gf', s);
    expect(r.taskCount).toBe(0);
    expect(r.percentComplete).toBe(0);
    expect(r.status).toBe('not-started');
  });
});
