import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ExternalLink,
  FileText,
  Info,
  Paperclip,
  Trash2,
  Upload,
} from 'lucide-react';
import clsx from 'clsx';
import type { ProjectDocument, SopStepState, SopStepStatus } from '../types';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { Badge, EmptyState, PageHeader, ProgressBar } from '../components/ui';
import { sopProgress, templateFor, type SopStepTemplate } from '../utils/sop';
import { formatDate, uid } from '../utils/format';
import { approxBytesOf, formatBytes } from '../utils/photos';

const STATUS_LABEL: Record<SopStepStatus, string> = {
  'not-started': 'Not started',
  'in-progress': 'In progress',
  done: 'Done',
  'not-applicable': 'Not applicable',
};

const STATUS_TONE: Record<SopStepStatus, string> = {
  'not-started': 'bg-ink/[0.06] text-ink/60',
  'in-progress': 'bg-amber-100 text-amber-900',
  done: 'bg-emerald-100 text-emerald-900',
  'not-applicable': 'bg-ink/[0.06] text-ink/45',
};

/** Documents are usually a permit PDF or a photo of one. 1.5 MB after the
 *  browser-storage reality of Block B — generous for a scan, small enough
 *  that a full permit set still fits. */
const MAX_DOC_BYTES = 1_500_000;

export default function Approvals() {
  const { state, upsert, remove } = useApp();
  const { can, canReachProject, user } = useAuth();

  const projects = state.projects.filter((p) => canReachProject(p.id));
  const [projectId, setProjectId] = useState(projects[0]?.id ?? '');
  const project = state.projects.find((p) => p.id === projectId);

  const mayUpdate = can('sop:update', { projectId });
  const mayManageDocs = can('documents:manage', { projectId });

  const template = project ? templateFor(project) : null;
  const steps = useMemo(
    () => state.sopSteps.filter((s) => s.projectId === projectId),
    [state.sopSteps, projectId],
  );
  const documents = useMemo(
    () => state.documents.filter((d) => d.projectId === projectId),
    [state.documents, projectId],
  );

  const stateFor = (key: string) => steps.find((s) => s.stepKey === key) ?? null;

  const setStatus = (step: SopStepTemplate, status: SopStepStatus) => {
    const existing = stateFor(step.key);
    const next: SopStepState = {
      id: existing?.id ?? uid('sop'),
      projectId,
      stepKey: step.key,
      status,
      documentId: existing?.documentId ?? null,
      note: existing?.note ?? '',
      updatedAt: new Date().toISOString(),
      updatedByName: user?.name ?? 'Unknown',
    };
    upsert('sopStep', next, `${step.title} — ${STATUS_LABEL[status].toLowerCase()}`, { silent: true });
  };

  const attachDocument = (step: SopStepTemplate, documentId: string) => {
    const existing = stateFor(step.key);
    const next: SopStepState = {
      id: existing?.id ?? uid('sop'),
      projectId,
      stepKey: step.key,
      // Attaching the proof is what marks a step done — the two should not
      // be able to disagree.
      status: existing?.status === 'not-applicable' ? existing.status : 'done',
      documentId,
      note: existing?.note ?? '',
      updatedAt: new Date().toISOString(),
      updatedByName: user?.name ?? 'Unknown',
    };
    upsert('sopStep', next, `Document attached to ${step.title}`, { silent: true });
  };

  if (projects.length === 0 || !project) {
    return (
      <div>
        <PageHeader title="Approvals" subtitle="Permits, sanctions and the paperwork behind them" />
        <EmptyState icon={FileText} title="No projects to show" message="You have no projects assigned yet." />
      </div>
    );
  }

  const progress = template ? sopProgress(template, steps) : null;

  return (
    <div>
      <PageHeader
        title="Approvals"
        subtitle="Permits, sanctions and the paperwork behind them"
        action={
          <select
            aria-label="Choose project"
            className="rounded-xl border border-ink/15 bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        }
      />

      {!template ? (
        <EmptyState
          icon={Building2}
          title="This jurisdiction hasn't been authored yet"
          message="Approval routes are state-specific, and following another state's checklist is worse than following none. Only Telangana and central government works are covered so far."
        />
      ) : (
        <>
          {/* Route header — tier, why, and how current the content is */}
          <section className="panel mb-5 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-xl text-ink">{template.label}</h2>
                  <Badge tone={project.type === 'government' ? 'blue' : 'yellow'}>
                    {project.type}
                  </Badge>
                </div>
                <p className="mt-1 max-w-2xl text-sm text-ink/60">{template.summary}</p>
                {project.type === 'private' && project.plotAreaSqm !== null && (
                  <p className="num mt-1.5 text-xs text-ink/45">
                    Route decided by {project.plotAreaSqm} m²
                    {project.buildingHeightM !== null && ` · ${project.buildingHeightM} m height`}
                  </p>
                )}
              </div>
              {progress && (
                <div className="w-full max-w-[220px]">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-ink/55">Settled</span>
                    <span className="num text-sm font-bold text-ink">
                      {progress.settled} of {progress.total}
                    </span>
                  </div>
                  <div className="mt-1.5">
                    <ProgressBar percent={progress.percent} tone="bg-emerald-500" />
                  </div>
                </div>
              )}
            </div>

            {/* Content this consequential must not look timeless. */}
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-ink/10 pt-3 text-xs text-ink/55">
              <span className="flex items-center gap-1.5">
                <Info size={13} className="text-ink/35" aria-hidden="true" />
                Reviewed {formatDate(template.lastReviewed)}
              </span>
              <a
                href={template.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 font-semibold text-amber-700 hover:underline"
              >
                {template.sourceLabel} <ExternalLink size={11} aria-hidden="true" />
              </a>
              <span className="flex items-center gap-1.5 font-semibold text-orange-800">
                <AlertTriangle size={13} aria-hidden="true" />
                Confirm every step with your local authority before you rely on it
              </span>
            </div>
          </section>

          {/* The checklist */}
          <ol className="stagger space-y-2">
            {template.steps.map((step, i) => {
              const st = stateFor(step.key);
              const status = st?.status ?? 'not-started';
              const doc = st?.documentId ? documents.find((d) => d.id === st.documentId) ?? null : null;
              return (
                <li
                  key={step.key}
                  className={clsx('panel p-4', status === 'done' && 'ring-1 ring-emerald-600/20')}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 gap-3">
                      <span
                        className={clsx(
                          'num mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                          status === 'done'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-ink text-amber-glow',
                        )}
                      >
                        {status === 'done' ? <CheckCircle2 size={15} aria-hidden="true" /> : i + 1}
                      </span>
                      <div className="min-w-0">
                        <h3 className="text-[15px] font-bold text-ink">{step.title}</h3>
                        <p className="mt-0.5 text-sm text-ink/60">{step.detail}</p>
                        <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink/40">
                          {step.authority}
                          {step.documentLabel && ` · ${step.documentLabel}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      {mayUpdate ? (
                        <select
                          aria-label={`Status of ${step.title}`}
                          value={status}
                          onChange={(e) => setStatus(step, e.target.value as SopStepStatus)}
                          className={clsx(
                            'cursor-pointer rounded-lg border-0 px-2.5 py-1.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500',
                            STATUS_TONE[status],
                          )}
                        >
                          {(Object.keys(STATUS_LABEL) as SopStepStatus[]).map((k) => (
                            <option key={k} value={k}>{STATUS_LABEL[k]}</option>
                          ))}
                        </select>
                      ) : (
                        <span className={clsx('rounded-lg px-2.5 py-1.5 text-xs font-bold', STATUS_TONE[status])}>
                          {STATUS_LABEL[status]}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Document slot — the proof lives with the step it proves */}
                  {step.documentLabel && (
                    <div className="mt-3 border-t border-ink/10 pt-3">
                      {doc ? (
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <a
                            href={doc.src}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex min-w-0 items-center gap-2 text-sm font-semibold text-amber-700 hover:underline"
                          >
                            <Paperclip size={14} aria-hidden="true" />
                            <span className="truncate">{doc.name}</span>
                          </a>
                          <span className="num text-[11px] text-ink/40">
                            {doc.uploadedByName} · {formatDate(doc.timestamp)} · {formatBytes(doc.sizeBytes)}
                          </span>
                        </div>
                      ) : (
                        <DocumentUpload
                          projectId={projectId}
                          label={step.documentLabel}
                          disabled={!mayManageDocs}
                          onUploaded={(id) => attachDocument(step, id)}
                        />
                      )}
                    </div>
                  )}

                  {st && st.status !== 'not-started' && (
                    <p className="num mt-2 text-[11px] text-ink/40">
                      Updated by {st.updatedByName} · {formatDate(st.updatedAt)}
                    </p>
                  )}
                </li>
              );
            })}
          </ol>

          {/* Everything filed against this project, in one place */}
          <section className="mt-8">
            <h2 className="font-display mb-3 text-xl text-ink">
              Document vault{' '}
              <span className="num text-base font-normal text-ink/40">({documents.length})</span>
            </h2>
            {documents.length === 0 ? (
              <EmptyState
                icon={FileText}
                message="Permits, NOCs and sanctions attached above appear here — reachable whenever anyone needs to produce them."
              />
            ) : (
              <ul className="panel divide-y divide-ink/10">
                {documents.map((d) => (
                  <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                    <a
                      href={d.src}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex min-w-0 items-center gap-2 text-sm font-semibold text-ink hover:text-amber-700"
                    >
                      <FileText size={15} className="shrink-0 text-ink/40" aria-hidden="true" />
                      <span className="truncate">{d.name}</span>
                    </a>
                    <span className="flex items-center gap-3">
                      <span className="num text-[11px] text-ink/45">
                        {d.uploadedByName} · {formatDate(d.timestamp)} · {formatBytes(d.sizeBytes)}
                      </span>
                      {mayManageDocs && (
                        <button
                          type="button"
                          onClick={() => remove('document', d.id, `Document "${d.name}" removed`)}
                          aria-label={`Delete ${d.name}`}
                          className="cursor-pointer rounded p-1.5 text-ink/45 hover:bg-paper-soft hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

/** Attach a permit scan or PDF to the step it proves. */
function DocumentUpload({
  projectId,
  label,
  disabled,
  onUploaded,
}: {
  projectId: string;
  label: string;
  disabled: boolean;
  onUploaded: (documentId: string) => void;
}) {
  const { upsert } = useApp();
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');

  const onPick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > MAX_DOC_BYTES) {
        setError(`That file is ${formatBytes(file.size)} — the limit is ${formatBytes(MAX_DOC_BYTES)} until documents move to file storage.`);
        return;
      }
      const src = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = () => reject(new Error('Could not read that file.'));
        r.readAsDataURL(file);
      });
      const doc: ProjectDocument = {
        id: uid('doc'),
        projectId,
        name: file.name,
        kind: 'permit',
        src,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: approxBytesOf(src),
        uploadedByUserId: user?.id ?? 'unknown',
        uploadedByName: user?.name ?? 'Unknown',
        timestamp: new Date().toISOString(),
        expiresOn: null,
      };
      upsert('document', doc, `${label} attached`);
      setError('');
      onUploaded(doc.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That file could not be attached.');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  if (disabled) {
    return <p className="text-xs text-ink/40">No {label.toLowerCase()} attached yet.</p>;
  }

  return (
    <div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={onPick}
        aria-label={`Attach ${label}`}
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="btn-ghost btn-sm flex items-center gap-1.5"
      >
        <Upload size={13} aria-hidden="true" /> Attach {label.toLowerCase()}
      </button>
      {error && (
        <p role="alert" className="mt-1.5 text-xs font-medium text-red-700">{error}</p>
      )}
    </div>
  );
}
