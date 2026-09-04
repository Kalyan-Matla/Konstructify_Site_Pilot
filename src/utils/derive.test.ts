import { describe, expect, test } from 'bun:test';
import type { AppState } from '../types';
import { buildMockState } from './mock-data';
import { projectProgress, zoneProgress } from './derive';
import { rupees } from './money';

function base(): AppState {
  return { ...buildMockState(), projects: [], tasks: [], budgetItems: [], zones: [] };
}

const project = (id: string) => ({
  id, name: id, location: 'x', clientName: 'x',
  budgetPaise: rupees(10_00_000), startDate: '2026-01-01', endDate: '2026-12-31',
  status: 'in-progress' as const,
});

const boq = (id: string, projectId: string, rateRupees: number) => ({
  id, projectId, description: id, quantity: 1, unit: 'LS',
  unitRatePaise: rupees(rateRupees), actualSpendPaise: 0,
});

const task = (id: string, projectId: string, pct: number, budgetItemId: string | null, zoneId: string | null = null) => ({
  id, projectId, name: id, description: '', phase: 'Structure', assignedTo: 'x',
  status: 'in-progress' as const, dueDate: '2026-06-01', percentComplete: pct,
  budgetItemId, zoneId, createdAt: '2026-01-01',
});

describe('projectProgress — weighted by BOQ value', () => {
  /** The whole reason for the weighting. A flat average of task percentages
   *  would call this project 80% done; by value it is 8%. */
  test('cheap finished tasks cannot outvote an expensive unstarted one', () => {
    const s = base();
    s.projects = [project('p')];
    s.budgetItems = [
      boq('cheap1', 'p', 10_000), boq('cheap2', 'p', 10_000),
      boq('cheap3', 'p', 10_000), boq('cheap4', 'p', 10_000),
      boq('expensive', 'p', 10_00_000),
    ];
    s.tasks = [
      task('t1', 'p', 100, 'cheap1'), task('t2', 'p', 100, 'cheap2'),
      task('t3', 'p', 100, 'cheap3'), task('t4', 'p', 100, 'cheap4'),
      task('t5', 'p', 0, 'expensive'),
    ];

    const flatAverage = s.tasks.reduce((a, t) => a + t.percentComplete, 0) / s.tasks.length;
    expect(flatAverage).toBe(80);                                  // the lie

    const { percentComplete } = projectProgress('p', s);
    expect(Math.round(percentComplete)).toBe(4);                   // the truth
  });

  test('an unstarted BOQ line drags the number down at full weight', () => {
    const s = base();
    s.projects = [project('p')];
    s.budgetItems = [boq('a', 'p', 1000), boq('b', 'p', 1000)];
    s.tasks = [task('t1', 'p', 100, 'a')]; // line b has no tasks at all
    expect(projectProgress('p', s).percentComplete).toBe(50);
  });

  test('tasks with no BOQ line are excluded and counted, never averaged in', () => {
    const s = base();
    s.projects = [project('p')];
    s.budgetItems = [boq('a', 'p', 1000)];
    s.tasks = [task('t1', 'p', 100, 'a'), task('t2', 'p', 0, null), task('t3', 'p', 0, null)];

    const r = projectProgress('p', s);
    expect(r.percentComplete).toBe(100);   // the two unlinked tasks do not dilute it
    expect(r.unlinkedTaskCount).toBe(2);   // but they are reported
  });

  test('a project with no BOQ reads 0, not NaN', () => {
    const s = base();
    s.projects = [project('p')];
    const r = projectProgress('p', s);
    expect(r.percentComplete).toBe(0);
    expect(Number.isNaN(r.percentComplete)).toBe(false);
  });

  test('the seeded demo project computes a sane figure', () => {
    const r = projectProgress('p1', buildMockState());
    expect(r.percentComplete).toBeGreaterThan(0);
    expect(r.percentComplete).toBeLessThanOrEqual(100);
    expect(r.weightedValuePaise).toBeGreaterThan(0);
  });
});

describe('zoneProgress — rolls up floor → room → element', () => {
  function nested(): AppState {
    const s = base();
    s.projects = [project('p')];
    s.zones = [
      { id: 'floor', projectId: 'p', parentId: null, level: 'floor', name: 'GF', drawingId: null, outline: null },
      { id: 'roomA', projectId: 'p', parentId: 'floor', level: 'room', name: 'A', drawingId: null, outline: null },
      { id: 'roomB', projectId: 'p', parentId: 'floor', level: 'room', name: 'B', drawingId: null, outline: null },
      { id: 'col', projectId: 'p', parentId: 'roomA', level: 'element', name: 'C4', drawingId: null, outline: null },
      { id: 'beam', projectId: 'p', parentId: 'roomA', level: 'element', name: 'B2', drawingId: null, outline: null },
    ];
    return s;
  }

  test('an element takes its status from its own tasks', () => {
    const s = nested();
    s.tasks = [task('t1', 'p', 100, null, 'col')];
    const r = zoneProgress('col', s);
    expect(r.percentComplete).toBe(100);
    expect(r.status).toBe('complete');
  });

  test('a room averages its elements', () => {
    const s = nested();
    s.tasks = [task('t1', 'p', 100, null, 'col'), task('t2', 'p', 0, null, 'beam')];
    const r = zoneProgress('roomA', s);
    expect(r.percentComplete).toBe(50);
    expect(r.status).toBe('in-progress');
  });

  test('a floor rolls up through its rooms', () => {
    const s = nested();
    s.tasks = [
      task('t1', 'p', 100, null, 'col'),
      task('t2', 'p', 100, null, 'beam'),
      task('t3', 'p', 0, null, 'roomB'),
    ];
    const floor = zoneProgress('floor', s);
    expect(floor.taskCount).toBe(3);
    expect(Math.round(floor.percentComplete)).toBe(67);
  });

  test('a room with many elements is not outvoted by a sibling with one', () => {
    const s = nested();
    s.tasks = [
      task('t1', 'p', 0, null, 'col'),
      task('t2', 'p', 0, null, 'beam'),
      task('t3', 'p', 100, null, 'roomB'),
    ];
    // A naive per-child mean would say 50; weighting by task count says 33.
    expect(Math.round(zoneProgress('floor', s).percentComplete)).toBe(33);
  });

  test('a zone with no work anywhere beneath it is not-started, not NaN', () => {
    const r = zoneProgress('floor', nested());
    expect(r.percentComplete).toBe(0);
    expect(r.status).toBe('not-started');
    expect(r.taskCount).toBe(0);
  });

  test('the seeded zone hierarchy resolves without error', () => {
    const s = buildMockState();
    for (const z of s.zones) {
      const r = zoneProgress(z.id, s);
      expect(Number.isNaN(r.percentComplete)).toBe(false);
    }
  });
});

describe('updating a room updates the sheet', () => {
  /** The property behind clicking a room to change its status: you edit the
   *  work, and the colour follows. If a control ever set colour directly,
   *  the drawing could disagree with the site — which is the one failure
   *  this whole feature exists to prevent. */
  function house(): AppState {
    const s = base();
    s.projects = [project('p')];
    s.zones = [
      { id: 'gf', projectId: 'p', parentId: null, level: 'floor', name: 'GF', drawingId: null, outline: null },
      { id: 'liv', projectId: 'p', parentId: 'gf', level: 'room', name: 'Living', drawingId: null, outline: null },
      { id: 'col', projectId: 'p', parentId: 'liv', level: 'element', name: 'C4', drawingId: null, outline: null },
      { id: 'beam', projectId: 'p', parentId: 'liv', level: 'element', name: 'B2', drawingId: null, outline: null },
    ];
    s.tasks = [
      task('t1', 'p', 0, null, 'col'),
      task('t2', 'p', 0, null, 'beam'),
    ];
    return s;
  }

  test('a room starts grey and its floor with it', () => {
    const s = house();
    expect(zoneProgress('liv', s).status).toBe('not-started');
    expect(zoneProgress('gf', s).status).toBe('not-started');
  });

  test('completing one element turns the room amber, not green', () => {
    const s = house();
    s.tasks[0].percentComplete = 100;
    const liv = zoneProgress('liv', s);
    expect(liv.percentComplete).toBe(50);
    expect(liv.status).toBe('in-progress');
  });

  test('completing every element turns the room green', () => {
    const s = house();
    s.tasks.forEach((t) => (t.percentComplete = 100));
    expect(zoneProgress('liv', s).status).toBe('complete');
  });

  test('the change propagates all the way up to the floor', () => {
    const s = house();
    s.tasks.forEach((t) => (t.percentComplete = 100));
    expect(zoneProgress('gf', s).status).toBe('complete');
  });

  test('a half-done task moves the room without completing it', () => {
    const s = house();
    s.tasks[0].percentComplete = 50;
    expect(zoneProgress('liv', s).percentComplete).toBe(25);
    expect(zoneProgress('liv', s).status).toBe('in-progress');
  });
});
