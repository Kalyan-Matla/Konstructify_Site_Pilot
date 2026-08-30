import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import clsx from 'clsx';
import type { Drawing, Zone, ZoneLevel } from '../types';
import { useApp } from '../contexts/AppContext';
import { zoneProgress, ZONE_STATUS_COLOR, type ZoneStatus } from '../utils/derive';
import { formatZoneMeasurement, measureZone } from '../utils/drawings';

interface Props {
  drawing: Drawing;
  zones: Zone[];
  selectedZoneId: string | null;
  onSelect: (zoneId: string | null) => void;
  /** Supplied only when the viewer may define zones. */
  onDraw?: (outline: Array<{ x: number; y: number }>) => void;
  drawing_mode?: boolean;
}

/**
 * The drawing with work status painted onto it.
 *
 * Colour is never stored — it is projected from `zoneProgress`, which rolls
 * up from the tasks beneath each zone. That is what makes this trustworthy:
 * the sheet cannot claim a room is finished while the work underneath says
 * otherwise, because there is no second copy of the truth to drift.
 *
 * Outlines are fractions of the sheet rather than pixels, so a drawing
 * re-exported at another resolution keeps its zones.
 */
export default function ZoneOverlay({
  drawing,
  zones,
  selectedZoneId,
  onSelect,
  onDraw,
  drawing_mode = false,
}: Props) {
  const { state } = useApp();
  const frameRef = useRef<HTMLDivElement>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragNow, setDragNow] = useState<{ x: number; y: number } | null>(null);

  const painted = useMemo(
    () =>
      zones
        .filter((z) => z.drawingId === drawing.id && z.outline && z.outline.length >= 3)
        .map((z) => ({
          zone: z,
          progress: zoneProgress(z.id, state),
          measure: formatZoneMeasurement(measureZone(z, drawing)),
        })),
    [zones, drawing.id, state],
  );

  const toFraction = (e: ReactPointerEvent) => {
    const r = frameRef.current?.getBoundingClientRect();
    if (!r || r.width === 0) return null;
    return {
      x: Math.min(Math.max((e.clientX - r.left) / r.width, 0), 1),
      y: Math.min(Math.max((e.clientY - r.top) / r.height, 0), 1),
    };
  };

  const onPointerDown = (e: ReactPointerEvent) => {
    if (!drawing_mode || !onDraw) return;
    const p = toFraction(e);
    if (!p) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setDragStart(p);
    setDragNow(p);
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    if (!dragStart) return;
    setDragNow(toFraction(e));
  };

  const onPointerUp = () => {
    if (dragStart && dragNow && onDraw) {
      const x1 = Math.min(dragStart.x, dragNow.x);
      const x2 = Math.max(dragStart.x, dragNow.x);
      const y1 = Math.min(dragStart.y, dragNow.y);
      const y2 = Math.max(dragStart.y, dragNow.y);
      // Ignore an accidental tap — a zone needs real area to be meaningful.
      if (x2 - x1 > 0.02 && y2 - y1 > 0.02) {
        onDraw([
          { x: x1, y: y1 },
          { x: x2, y: y1 },
          { x: x2, y: y2 },
          { x: x1, y: y2 },
        ]);
      }
    }
    setDragStart(null);
    setDragNow(null);
  };

  const preview =
    dragStart && dragNow
      ? {
          x: Math.min(dragStart.x, dragNow.x) * 100,
          y: Math.min(dragStart.y, dragNow.y) * 100,
          w: Math.abs(dragNow.x - dragStart.x) * 100,
          h: Math.abs(dragNow.y - dragStart.y) * 100,
        }
      : null;

  return (
    <div
      ref={frameRef}
      className={clsx(
        'relative w-full overflow-hidden rounded-xl bg-white ring-1 ring-ink/10',
        drawing_mode && 'cursor-crosshair',
      )}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <img
        src={drawing.src}
        alt={`${drawing.sheetNumber} — ${drawing.title}, revision ${drawing.revision}`}
        className="block w-full select-none"
        draggable={false}
      />

      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
        role="img"
        aria-label={`Work status overlay: ${painted.length} zones coloured by completion`}
      >
        {painted.map(({ zone, progress, measure }) => {
          const pts = zone.outline!.map((p) => `${p.x * 100},${p.y * 100}`).join(' ');
          const colour = ZONE_STATUS_COLOR[progress.status as ZoneStatus];
          const selected = zone.id === selectedZoneId;
          return (
            <polygon
              key={zone.id}
              points={pts}
              fill={colour}
              fillOpacity={selected ? 0.42 : 0.24}
              stroke={colour}
              strokeWidth={selected ? 0.6 : 0.3}
              vectorEffect="non-scaling-stroke"
              // An SVG shape is not focusable or operable by default, so it
              // needs the role, the tab stop and the key handler spelled out
              // — otherwise the drawing is mouse-only.
              role="button"
              tabIndex={drawing_mode ? -1 : 0}
              aria-pressed={selected}
              aria-label={`${zone.name}, ${progress.percentComplete.toFixed(0)} percent complete${measure ? `, ${measure}` : ''}`}
              className="cursor-pointer transition-[fill-opacity] duration-200 focus-visible:outline-none"
              style={selected ? undefined : { outline: 'none' }}
              onClick={(e) => {
                e.stopPropagation();
                if (!drawing_mode) onSelect(selected ? null : zone.id);
              }}
              onKeyDown={(e) => {
                if (drawing_mode) return;
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  onSelect(selected ? null : zone.id);
                }
              }}
            >
              <title>
                {zone.name} — {progress.percentComplete.toFixed(0)}% ({progress.status})
                {measure ? ` · ${measure}` : ''}
              </title>
            </polygon>
          );
        })}

        {preview && (
          <rect
            x={preview.x}
            y={preview.y}
            width={preview.w}
            height={preview.h}
            fill="#E0A22B"
            fillOpacity={0.25}
            stroke="#A8741A"
            strokeWidth={0.4}
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>

      {drawing_mode && (
        <p className="pointer-events-none absolute inset-x-0 bottom-0 bg-ink/85 px-3 py-2 text-center text-xs font-semibold text-white">
          Drag a rectangle over the area this zone covers
        </p>
      )}
    </div>
  );
}

export const ZONE_LEVEL_LABEL: Record<ZoneLevel, string> = {
  floor: 'Floor',
  room: 'Room',
  element: 'Element',
};
