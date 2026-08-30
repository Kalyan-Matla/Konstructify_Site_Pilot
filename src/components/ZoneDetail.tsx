import { useMemo, useState } from 'react';
import { CheckCircle2, CornerDownRight, Link2, X } from 'lucide-react';
import clsx from 'clsx';
import type { Drawing, WorkTask, Zone } from '../types';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { zoneProgress, ZONE_STATUS_COLOR } from '../utils/derive';
import { formatZoneMeasurement, measureZone } from '../utils/drawings';
import { ZONE_LEVEL_LABEL } from './ZoneOverlay';

/** Every zone at or below this one, so a room shows the work in its
 *  elements rather than looking empty while its beam is half built. */
function subtreeIds(zoneId: string, zones: Zone[]): string[] {
  const kids = zones.filter((z) => z.parentId === zoneId);
  return [zoneId, ...kids.flatMap((k) => subtreeIds(k.id, zones))];
}

/**
 * Review and update the work behind a zone.
 *
 * The status itself is never edited here, and that is the point. Colour is
 * projected from the tasks underneath, so the only honest way to change a
 * room's colour is to change the work — mark a task further along, or
 * complete it. A control that set the colour directly would let the drawing
 * disagree with the site, which is the one thing this feature exists to
 * prevent.
 */
export default function ZoneDetail({
  zone,
  zones,
  drawing,
  onClose,
}: {
  zone: Zone;
  zones: Zone[];
  drawing: Drawing | null;
  onClose: () => void;
}) {
  const { state, upsert } = useApp();
  const { can } = useAuth();
  const [linking, setLinking] = useState(false);

  const mayUpdate = can('work-status:update', { projectId: zone.projectId });
  const mayManage = can('work-status:manage', { projectId: zone.projectId });

  const ids = useMemo(() => subtreeIds(zone.id, zones), [zone.id, zones]);
  const tasks = useMemo(
    () => state.tasks.filter((t) => t.zoneId && ids.includes(t.zoneId)),
    [state.tasks, ids],
  );

  const progress = zoneProgress(zone.id, state);
  const measure = drawing ? formatZoneMeasurement(measureZone(zone, drawing)) : null;

  /** Unassigned tasks on this project, offered when a zone has no work yet. */
  const unlinked = useMemo(
    () => state.tasks.filter((t) => t.projectId === zone.projectId && !t.zoneId),
    [state.tasks, zone.projectId],
  );

  const setPercent = (task: WorkTask, pct: number) => {
    upsert(
      'task',
      {
        ...task,
        percentComplete: pct,
        status: pct >= 100 ? 'complete' : pct > 0 ? 'in-progress' : task.status,
      },
      `${task.name} — ${pct}%`,
      { silent: true },
    );
  };

  const linkTask = (task: WorkTask) => {
    upsert('task', { ...task, zoneId: zone.id }, `"${task.name}" mapped to ${zone.name}`);
    setLinking(false);
  };

  return (
    <section className="panel mt-3 p-4" aria-label={`${zone.name} detail`}>
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-ink">{zone.name}</h3>
          <p className="num text-[11px] text-ink/45">
            <span className="uppercase tracking-wide">{ZONE_LEVEL_LABEL[zone.level]}</span>
            {measure && <span> · {measure}</span>}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={`Close ${zone.name}`}
          className="shrink-0 cursor-pointer rounded-full p-1 text-ink/40 transition-colors hover:bg-ink/5 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        >
          <X size={15} />
        </button>
      </header>

      <div className="mt-3 flex items-center gap-2.5">
        <span
          className="h-3 w-3 shrink-0 rounded-sm"
          style={{ backgroundColor: ZONE_STATUS_COLOR[progress.status] }}
          aria-hidden="true"
        />
        <span className="num text-sm font-bold text-ink">
          {progress.percentComplete.toFixed(0)}%
        </span>
        <span className="text-xs text-ink/50">
          {progress.taskCount} task{progress.taskCount === 1 ? '' : 's'} beneath this zone
        </span>
      </div>

      {tasks.length === 0 ? (
        <div className="mt-3">
          <p className="text-xs text-ink/55">
            No work is mapped here yet, so this zone has nothing to report. Map a task to
            it and its colour follows the work automatically.
          </p>
          {mayManage && unlinked.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => setLinking((v) => !v)}
                className="btn-ghost btn-sm mt-2.5 flex items-center gap-1.5"
              >
                <Link2 size={13} aria-hidden="true" />
                {linking ? 'Cancel' : `Map a task (${unlinked.length} unassigned)`}
              </button>
              {linking && (
                <ul className="mt-2 max-h-44 space-y-1 overflow-y-auto">
                  {unlinked.map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => linkTask(t)}
                        className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-ink/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                      >
                        <span className="min-w-0 truncate text-ink/80">{t.name}</span>
                        <span className="num shrink-0 text-xs text-ink/45">{t.percentComplete}%</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      ) : (
        <ul className="mt-3 space-y-3">
          {tasks.map((t) => {
            const own = t.zoneId === zone.id;
            const via = own ? null : zones.find((z) => z.id === t.zoneId);
            return (
              <li key={t.id}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="min-w-0 text-sm font-medium text-ink">{t.name}</span>
                  <span className="num shrink-0 text-xs font-bold text-ink">
                    {t.percentComplete}%
                  </span>
                </div>
                {via && (
                  <p className="num mt-0.5 flex items-center gap-1 text-[10px] text-ink/40">
                    <CornerDownRight size={10} aria-hidden="true" /> via {via.name}
                  </p>
                )}
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={t.percentComplete}
                  disabled={!mayUpdate}
                  onChange={(e) => setPercent(t, Number(e.target.value))}
                  aria-label={`Progress of ${t.name}`}
                  className="mt-1.5 w-full accent-amber-500 disabled:cursor-not-allowed disabled:opacity-40"
                />
                {mayUpdate && t.percentComplete < 100 && (
                  <button
                    type="button"
                    onClick={() => setPercent(t, 100)}
                    className="mt-1 flex cursor-pointer items-center gap-1 text-[11px] font-bold text-emerald-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                  >
                    <CheckCircle2 size={11} aria-hidden="true" /> Mark complete
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {!mayUpdate && tasks.length > 0 && (
        <p className={clsx('mt-3 text-[11px] text-ink/40')}>
          You can review this work but not update it.
        </p>
      )}
    </section>
  );
}
