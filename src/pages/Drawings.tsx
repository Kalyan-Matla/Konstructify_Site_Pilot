import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { History, Layers, Plus, Ruler, Upload } from 'lucide-react';
import clsx from 'clsx';
import type { Drawing, Zone, ZoneLevel } from '../types';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { Badge, EmptyState, Field, Modal, PageHeader, inputCls } from '../components/ui';
import ZoneOverlay, { ZONE_LEVEL_LABEL } from '../components/ZoneOverlay';
import ZoneDetail from '../components/ZoneDetail';
import { zoneProgress, ZONE_STATUS_COLOR, type ZoneStatus } from '../utils/derive';
import { formatZoneMeasurement, measureZone } from '../utils/drawings';
import { formatDate, uid } from '../utils/format';
import { approxBytesOf, formatBytes } from '../utils/photos';

const MAX_DRAWING_BYTES = 1_500_000;

const STATUS_LABEL: Record<ZoneStatus, string> = {
  'not-started': 'Not started',
  'in-progress': 'In progress',
  complete: 'Complete',
};

export default function Drawings() {
  const { state, upsert } = useApp();
  const { can, canReachProject, user } = useAuth();

  const projects = state.projects.filter((p) => canReachProject(p.id));
  const [projectId, setProjectId] = useState(projects[0]?.id ?? '');
  const mayManage = can('drawings:manage', { projectId });
  const mayZone = can('zones:manage', { projectId });

  const drawings = useMemo(
    () => state.drawings.filter((d) => d.projectId === projectId),
    [state.drawings, projectId],
  );
  const zones = useMemo(
    () => state.zones.filter((z) => z.projectId === projectId),
    [state.zones, projectId],
  );

  /** Site builds to the current revision. Superseded sheets stay reachable
   *  for audit, but never lead. */
  const currentSheets = drawings.filter((d) => d.isCurrent);
  const [sheetId, setSheetId] = useState<string | null>(null);
  const sheet = currentSheets.find((d) => d.id === sheetId) ?? currentSheets[0] ?? null;

  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [drawingZone, setDrawingZone] = useState<{ level: ZoneLevel; parentId: string | null; name: string } | null>(null);
  const [newZoneOpen, setNewZoneOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  const selectedZone = zones.find((z) => z.id === selectedZoneId) ?? null;

  const commitZone = (outline: Array<{ x: number; y: number }>) => {
    if (!drawingZone || !sheet) return;
    const zone: Zone = {
      id: uid('z'),
      projectId,
      parentId: drawingZone.parentId,
      level: drawingZone.level,
      name: drawingZone.name,
      drawingId: sheet.id,
      outline,
    };
    upsert('zone', zone, `Zone "${zone.name}" marked on ${sheet.sheetNumber}`);
    setDrawingZone(null);
  };

  if (projects.length === 0) {
    return (
      <div>
        <PageHeader title="Drawings" subtitle="Current revisions and work status on the sheet" />
        <EmptyState icon={Ruler} title="No projects to show" message="You have no projects assigned yet." />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Drawings"
        subtitle="Current revisions and work status on the sheet"
        action={
          <div className="flex items-center gap-2">
            <select
              aria-label="Choose project"
              className="rounded-xl border border-ink/15 bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              value={projectId}
              onChange={(e) => {
                setProjectId(e.target.value);
                setSheetId(null);
                setSelectedZoneId(null);
              }}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            {mayManage && (
              <button type="button" onClick={() => setUploadOpen(true)} className="btn-primary flex items-center gap-1.5">
                <Upload size={16} aria-hidden="true" /> Issue drawing
              </button>
            )}
          </div>
        }
      />

      {!sheet ? (
        <EmptyState
          icon={Ruler}
          title="No drawings issued yet"
          message={
            mayManage
              ? 'Issue a sheet to start marking zones and showing work status on it.'
              : 'Your project manager has not issued a drawing for this project yet.'
          }
          action={mayManage ? { label: 'Issue drawing', onClick: () => setUploadOpen(true) } : undefined}
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
          {/* The sheet */}
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <select
                  aria-label="Choose sheet"
                  className="rounded-xl border border-ink/15 bg-white px-2.5 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  value={sheet.id}
                  onChange={(e) => {
                    setSheetId(e.target.value);
                    setSelectedZoneId(null);
                  }}
                >
                  {currentSheets.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.sheetNumber} — {d.title}
                    </option>
                  ))}
                </select>
                <Badge tone="green">current · {sheet.revision}</Badge>
              </div>
              <button
                type="button"
                onClick={() => setShowHistory(true)}
                className="btn-ghost btn-sm flex items-center gap-1.5"
              >
                <History size={14} aria-hidden="true" /> Revisions
              </button>
            </div>

            <ZoneOverlay
              drawing={sheet}
              zones={zones}
              selectedZoneId={selectedZoneId}
              onSelect={setSelectedZoneId}
              onDraw={commitZone}
              drawing_mode={drawingZone !== null}
            />

            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
              {(Object.keys(STATUS_LABEL) as ZoneStatus[]).map((s) => (
                <span key={s} className="flex items-center gap-1.5 text-ink/60">
                  <span
                    className="h-2.5 w-2.5 rounded-sm"
                    style={{ backgroundColor: ZONE_STATUS_COLOR[s] }}
                    aria-hidden="true"
                  />
                  {STATUS_LABEL[s]}
                </span>
              ))}
              <span className="text-ink/40">Colour comes from the tasks underneath, never set by hand.</span>
            </div>

            {sheet.notes && (
              <p className="mt-3 rounded-xl bg-ink/[0.04] px-3.5 py-2.5 text-xs text-ink/65">
                <strong className="font-bold text-ink/80">{sheet.revision} — what changed:</strong>{' '}
                {sheet.notes}
              </p>
            )}
          </div>

          {/* Zones */}
          <div className="min-w-0">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="font-display text-lg text-ink">
                Zones <span className="num text-sm font-normal text-ink/40">({zones.length})</span>
              </h2>
              {mayZone && (
                <button type="button" onClick={() => setNewZoneOpen(true)} className="btn-ghost btn-sm flex items-center gap-1.5">
                  <Plus size={14} aria-hidden="true" /> Add zone
                </button>
              )}
            </div>

            {zones.length === 0 ? (
              <EmptyState
                icon={Layers}
                message="No zones marked yet. A zone links an area of the sheet to the tasks that build it, so status can be shown in place."
              />
            ) : (
              <ZoneTree
                zones={zones}
                selectedZoneId={selectedZoneId}
                onSelect={(id) => setSelectedZoneId(id === selectedZoneId ? null : id)}
              />
            )}

            {selectedZone && (
              <ZoneDetail
                zone={selectedZone}
                zones={zones}
                drawing={sheet ?? null}
                onClose={() => setSelectedZoneId(null)}
              />
            )}
          </div>
        </div>
      )}

      {newZoneOpen && sheet && (
        <NewZoneForm
          zones={zones}
          onClose={() => setNewZoneOpen(false)}
          onStart={(cfg) => {
            setDrawingZone(cfg);
            setNewZoneOpen(false);
          }}
        />
      )}

      {showHistory && sheet && (
        <RevisionHistory
          sheetNumber={sheet.sheetNumber}
          revisions={drawings
            .filter((d) => d.sheetNumber === sheet.sheetNumber)
            .sort((a, b) => b.timestamp.localeCompare(a.timestamp))}
          onClose={() => setShowHistory(false)}
        />
      )}

      {uploadOpen && (
        <IssueDrawingForm
          projectId={projectId}
          existing={drawings}
          userName={user?.name ?? 'Unknown'}
          userId={user?.id ?? 'unknown'}
          onClose={() => setUploadOpen(false)}
        />
      )}
    </div>
  );
}

/** Floor → room → element, indented, each showing its rolled-up status. */
function ZoneTree({
  zones,
  selectedZoneId,
  onSelect,
}: {
  zones: Zone[];
  selectedZoneId: string | null;
  onSelect: (id: string) => void;
}) {
  const { state } = useApp();

  /** Real size from the outline and the sheet's scale — null on an
   *  unscaled sheet, where a figure would be invention. */
  const measurementFor = (z: Zone): string | null => {
    const sheet = z.drawingId ? state.drawings.find((d) => d.id === z.drawingId) : null;
    return sheet ? formatZoneMeasurement(measureZone(z, sheet)) : null;
  };

  const render = (parentId: string | null, depth: number): JSX.Element[] =>
    zones
      .filter((z) => z.parentId === parentId)
      .flatMap((z) => {
        const p = zoneProgress(z.id, state);
        return [
          <li key={z.id}>
            <button
              type="button"
              onClick={() => onSelect(z.id)}
              aria-current={z.id === selectedZoneId}
              className={clsx(
                'flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500',
                z.id === selectedZoneId ? 'bg-amber-50 ring-1 ring-amber-500/30' : 'hover:bg-ink/[0.04]',
              )}
              style={{ paddingLeft: `${10 + depth * 16}px` }}
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: ZONE_STATUS_COLOR[p.status] }}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-ink">{z.name}</span>
                <span className="num text-[10px] font-bold text-ink/40">
                  {/* Only the level label is uppercased. SI symbols are
                      case-sensitive — `MM` is megametres, and `M²` is not a
                      unit at all. Not pedantry on a construction drawing. */}
                  <span className="uppercase tracking-wide">{ZONE_LEVEL_LABEL[z.level]}</span>
                  {measurementFor(z) && <span> · {measurementFor(z)}</span>}
                </span>
              </span>
              <span className="num shrink-0 text-xs font-bold text-ink/70">
                {p.percentComplete.toFixed(0)}%
              </span>
            </button>
          </li>,
          ...render(z.id, depth + 1),
        ];
      });

  return <ul className="panel space-y-0.5 p-2">{render(null, 0)}</ul>;
}

function NewZoneForm({
  zones,
  onClose,
  onStart,
}: {
  zones: Zone[];
  onClose: () => void;
  onStart: (cfg: { level: ZoneLevel; parentId: string | null; name: string }) => void;
}) {
  const [name, setName] = useState('');
  const [level, setLevel] = useState<ZoneLevel>('room');
  const [parentId, setParentId] = useState<string>('');

  // A room belongs to a floor; an element belongs to a room. Offering the
  // wrong parents is how a hierarchy stops rolling up correctly.
  const parentLevel: ZoneLevel | null = level === 'element' ? 'room' : level === 'room' ? 'floor' : null;
  const candidates = parentLevel ? zones.filter((z) => z.level === parentLevel) : [];

  return (
    <Modal title="Add zone" onClose={onClose}>
      <Field label="Name" htmlFor="z-name" required>
        <input id="z-name" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Kitchen, Column C4, First Floor" />
      </Field>
      <div className="grid grid-cols-1 gap-x-3 sm:grid-cols-2">
        <Field label="Level" htmlFor="z-level">
          <select
            id="z-level"
            className={inputCls}
            value={level}
            onChange={(e) => {
              setLevel(e.target.value as ZoneLevel);
              setParentId('');
            }}
          >
            <option value="floor">Floor</option>
            <option value="room">Room</option>
            <option value="element">Element</option>
          </select>
        </Field>
        {parentLevel && (
          <Field label={`Inside which ${parentLevel}`} htmlFor="z-parent">
            <select id="z-parent" className={inputCls} value={parentId} onChange={(e) => setParentId(e.target.value)}>
              <option value="">—</option>
              {candidates.map((z) => (
                <option key={z.id} value={z.id}>{z.name}</option>
              ))}
            </select>
          </Field>
        )}
      </div>
      <p className="mb-3 text-xs text-ink/55">
        Status is never set here. A zone takes its colour from the tasks beneath it, so the sheet
        and the work cannot disagree.
      </p>
      <div className="mt-2 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
        <button
          type="button"
          disabled={!name.trim()}
          onClick={() => onStart({ level, parentId: parentId || null, name: name.trim() })}
          className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          Mark on drawing
        </button>
      </div>
    </Modal>
  );
}

function RevisionHistory({
  sheetNumber,
  revisions,
  onClose,
}: {
  sheetNumber: string;
  revisions: Drawing[];
  onClose: () => void;
}) {
  return (
    <Modal title={`${sheetNumber} — revisions`} onClose={onClose}>
      <ul className="divide-y divide-ink/10">
        {revisions.map((d) => (
          <li key={d.id} className="py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <span className="num text-sm font-bold text-ink">{d.revision}</span>
                {d.isCurrent ? (
                  <Badge tone="green">current</Badge>
                ) : (
                  <Badge tone="gray">superseded</Badge>
                )}
              </span>
              <span className="num text-[11px] text-ink/45">
                {d.uploadedByName} · {formatDate(d.timestamp)}
              </span>
            </div>
            {d.notes && <p className="mt-1 text-xs text-ink/60">{d.notes}</p>}
          </li>
        ))}
      </ul>
      <p className="mt-3 rounded-xl bg-ink/[0.04] px-3.5 py-2.5 text-xs text-ink/60">
        Only the current revision is shown on site. Superseded sheets stay here so anyone can see
        what changed and when — building to an old print is expensive, and usually nobody notices
        until it is poured.
      </p>
    </Modal>
  );
}

function IssueDrawingForm({
  projectId,
  existing,
  userId,
  userName,
  onClose,
}: {
  projectId: string;
  existing: Drawing[];
  userId: string;
  userName: string;
  onClose: () => void;
}) {
  const { upsert } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);
  const sheets = [...new Set(existing.map((d) => d.sheetNumber))];
  const [sheetNumber, setSheetNumber] = useState('');
  const [title, setTitle] = useState('');
  const [revision, setRevision] = useState('R0');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const supersedes = existing.find((d) => d.sheetNumber === sheetNumber.trim() && d.isCurrent) ?? null;

  const onPick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!sheetNumber.trim() || !title.trim()) {
      setError('Give the sheet a number and a title first.');
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    if (file.size > MAX_DRAWING_BYTES) {
      setError(
        `That file is ${formatBytes(file.size)} — the limit is ${formatBytes(MAX_DRAWING_BYTES)} until drawings move to file storage. ` +
          'Native 3D model files will not fit until then; issue a rendered view for now.',
      );
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    try {
      const src = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = () => reject(new Error('Could not read that file.'));
        r.readAsDataURL(file);
      });

      // Issuing a revision supersedes the one it replaces, in one step — a
      // register with two "current" sheets is worse than no register.
      if (supersedes) {
        upsert('drawing', { ...supersedes, isCurrent: false }, `${supersedes.sheetNumber} ${supersedes.revision} superseded`, { silent: true });
      }

      const drawing: Drawing = {
        id: uid('dwg'),
        projectId,
        sheetNumber: sheetNumber.trim(),
        title: title.trim(),
        discipline: 'architectural',
        revision: revision.trim() || 'R0',
        supersedesId: supersedes?.id ?? null,
        isCurrent: true,
        src,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: approxBytesOf(src),
        uploadedByUserId: userId,
        uploadedByName: userName,
        timestamp: new Date().toISOString(),
        notes: notes.trim(),
        // Unknown until someone states the scale. Left null rather than
        // guessed, so measureZone() withholds figures instead of inventing
        // them for a sheet nobody has calibrated.
        sheetWidthMm: null,
        sheetHeightMm: null,
      };
      upsert('drawing', drawing, `${drawing.sheetNumber} ${drawing.revision} issued`);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That drawing could not be issued.');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <Modal title="Issue drawing" onClose={onClose}>
      {error && (
        <p role="alert" className="mb-3 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700 ring-1 ring-inset ring-red-600/15">
          {error}
        </p>
      )}
      <div className="grid grid-cols-1 gap-x-3 sm:grid-cols-2">
        <Field label="Sheet number" htmlFor="d-sheet" required>
          <input
            id="d-sheet"
            className={inputCls}
            list="sheet-numbers"
            value={sheetNumber}
            onChange={(e) => setSheetNumber(e.target.value)}
            placeholder="A-101"
          />
          <datalist id="sheet-numbers">
            {sheets.map((s) => <option key={s} value={s} />)}
          </datalist>
        </Field>
        <Field label="Revision" htmlFor="d-rev" required>
          <input id="d-rev" className={inputCls} value={revision} onChange={(e) => setRevision(e.target.value)} placeholder="R1" />
        </Field>
      </div>
      <Field label="Title" htmlFor="d-title" required>
        <input id="d-title" className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ground floor plan" />
      </Field>
      <Field label="What changed in this revision" htmlFor="d-notes">
        <input id="d-notes" className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Kitchen window relocated" />
      </Field>

      {supersedes && (
        <p className="mb-3 rounded-xl bg-amber-50 px-3.5 py-2.5 text-xs text-amber-900 ring-1 ring-inset ring-amber-600/20">
          This will supersede <strong>{supersedes.sheetNumber} {supersedes.revision}</strong>. Site will
          immediately build to the new revision instead.
        </p>
      )}

      <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={onPick} aria-label="Choose drawing file" />
      <div className="mt-2 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
        <button type="button" onClick={() => fileRef.current?.click()} className="btn-primary flex items-center gap-1.5">
          <Upload size={15} aria-hidden="true" /> Choose file and issue
        </button>
      </div>
    </Modal>
  );
}
