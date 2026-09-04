import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { createPortal } from 'react-dom';
import { Camera, ChevronLeft, ChevronRight, ImageOff, Trash2, X } from 'lucide-react';
import clsx from 'clsx';
import type { ProjectPhoto } from '../types';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { usePhotoUpload } from '../hooks/usePhotoUpload';
import { formatBytes, photoBudget } from '../utils/photos';
import { formatDate } from '../utils/format';
import { ConfirmDialog } from './ui';

/**
 * Full-screen preview.
 *
 * Opened by tap, never by hover — the people who most need this are on a
 * phone, outdoors, often wearing gloves, and hover does not exist for them.
 * Arrow keys and Escape work for everyone on a desktop reviewing the day's
 * photos, and focus returns to the thumbnail on close.
 */
function Lightbox({
  photos,
  index,
  onClose,
  onNavigate,
}: {
  photos: ProjectPhoto[];
  index: number;
  onClose: () => void;
  onNavigate: (next: number) => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const photo = photos[index];

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && index < photos.length - 1) onNavigate(index + 1);
      if (e.key === 'ArrowLeft' && index > 0) onNavigate(index - 1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [index, photos.length, onClose, onNavigate]);

  if (!photo) return null;

  // Portalled to <body> deliberately. The gallery renders inside a modal
  // whose entrance animation sets `transform`, and a transformed ancestor
  // becomes the containing block for `position: fixed` — which quietly
  // traps a "full screen" preview inside the modal's box instead.
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Photo ${index + 1} of ${photos.length}: ${photo.caption || 'site photo'}`}
      className="fixed inset-0 z-[80] flex flex-col bg-ink/95 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="flex items-start justify-between gap-3 px-4 py-3 text-white sm:px-6">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{photo.caption || 'Site photo'}</p>
          <p className="num mt-0.5 text-[11px] text-white/55">
            {photo.uploadedByName} · {formatDate(photo.timestamp)} · {index + 1} of {photos.length}
          </p>
        </div>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close preview"
          className="shrink-0 cursor-pointer rounded-full p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        >
          <X size={20} />
        </button>
      </div>

      <div
        className="flex min-h-0 flex-1 items-center justify-center px-2 pb-4 sm:px-6"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={photo.src}
          alt={photo.caption || 'Site photo'}
          className="max-h-full max-w-full rounded-xl object-contain"
        />
      </div>

      {photos.length > 1 && (
        <div
          className="flex items-center justify-center gap-3 pb-6"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => onNavigate(index - 1)}
            disabled={index === 0}
            aria-label="Previous photo"
            className="cursor-pointer rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            onClick={() => onNavigate(index + 1)}
            disabled={index === photos.length - 1}
            aria-label="Next photo"
            className="cursor-pointer rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}
    </div>,
    document.body,
  );
}

/**
 * The project's photo record — every photo on the project, including those
 * taken against a task, in one scrolling strip.
 *
 * Anyone with `project-photos:add` contributes, including the landlord on
 * their own property. Only `project-photos:delete` removes, which the
 * landlord mask withholds: a client can add evidence of a defect and
 * neither they nor the contractor can quietly take it down.
 */
export default function PhotoGallery({ projectId, projectName }: { projectId: string; projectName: string }) {
  const { state, remove } = useApp();
  const { can } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<ProjectPhoto | null>(null);

  const mayAdd = can('project-photos:add', { projectId });
  const mayDelete = can('project-photos:delete', { projectId });

  const photos = state.photos
    .filter((p) => p.projectId === projectId)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  const { upload, error, busy } = usePhotoUpload({ projectId, label: projectName });
  const budget = photoBudget(state.photos.map((p) => p.src));

  const onPick = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      await upload(file);
      if (fileRef.current) fileRef.current.value = '';
    },
    [upload],
  );

  return (
    <section aria-label={`Photos for ${projectName}`} className="flex min-h-0 flex-col">
      <header className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-ink">
          Photos <span className="num font-normal text-ink/45">({photos.length})</span>
        </h3>
        {mayAdd && (
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={onPick}
              aria-label="Add a site photo"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              className="btn-ghost btn-sm flex items-center gap-1.5 disabled:cursor-wait disabled:opacity-60"
            >
              <Camera size={14} aria-hidden="true" /> {busy ? 'Adding…' : 'Add photo'}
            </button>
          </div>
        )}
      </header>

      {error && (
        <p role="alert" className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/15">
          {error}
        </p>
      )}

      {photos.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-ink/20 bg-white/60 px-4 py-10 text-center">
          <ImageOff size={20} className="mb-2 text-ink/30" aria-hidden="true" />
          <p className="text-sm text-ink/55">
            {mayAdd ? 'No photos yet — capture progress from the site.' : 'No photos yet.'}
          </p>
        </div>
      ) : (
        <ul className="grid max-h-[46vh] grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3">
          {photos.map((p, i) => (
            <li key={p.id} className="relative">
              <button
                type="button"
                onClick={() => setPreviewIndex(i)}
                aria-label={`Open ${p.caption || 'site photo'} by ${p.uploadedByName}`}
                className="group block w-full cursor-pointer overflow-hidden rounded-lg ring-1 ring-ink/10 transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                <img
                  src={p.src}
                  alt={p.caption || 'Site photo'}
                  loading="lazy"
                  className="h-24 w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                />
              </button>
              <p className="num mt-1 truncate text-[10px] text-ink/45">
                {p.uploadedByName} · {formatDate(p.timestamp)}
              </p>
              {mayDelete && (
                <button
                  type="button"
                  onClick={() => setDeleting(p)}
                  aria-label={`Delete ${p.caption || 'site photo'}`}
                  className="absolute right-1 top-1 cursor-pointer rounded-full bg-ink/70 p-1.5 text-white transition-colors hover:bg-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* The storage ceiling is shown rather than hit. Phase 1 moves these
          bytes to object storage and this indicator retires with it. */}
      {(budget.nearlyFull || photos.length > 0) && (
        <p
          className={clsx(
            'num mt-2 text-[10px]',
            budget.nearlyFull ? 'font-bold text-orange-700' : 'text-ink/35',
          )}
        >
          {formatBytes(budget.usedBytes)} of {formatBytes(budget.budgetBytes)} photo storage used
          {budget.nearlyFull && ' — nearly full'}
        </p>
      )}

      {previewIndex !== null && (
        <Lightbox
          photos={photos}
          index={previewIndex}
          onClose={() => setPreviewIndex(null)}
          onNavigate={setPreviewIndex}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete photo?"
          message={`This photo by ${deleting.uploadedByName} will be removed from the project record.`}
          confirmLabel="Delete"
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            remove('photo', deleting.id, `Photo removed from ${projectName}`);
            setDeleting(null);
          }}
        />
      )}
    </section>
  );
}
