import { useCallback, useState } from 'react';
import type { ProjectPhoto } from '../types';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { capturePhoto, formatBytes, wouldExceedBudget } from '../utils/photos';
import { uid } from '../utils/format';

interface UploadTarget {
  projectId: string;
  /** Set when the photo is captured against a specific task. */
  taskId?: string | null;
  zoneId?: string | null;
  /** Used in the confirmation toast — "Photo added to <label>". */
  label: string;
}

/**
 * The single path a photo takes into the app.
 *
 * Both the task detail and the project gallery upload through here, so
 * compression, the storage-budget check and attribution can never drift
 * apart between the two. Attribution matters: a client's photo of a defect
 * has to stay traceable to who took it.
 */
export function usePhotoUpload(target: UploadTarget) {
  const { state, upsert } = useApp();
  const { user } = useAuth();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const upload = useCallback(
    async (file: File) => {
      setBusy(true);
      try {
        const { src, approxBytes } = await capturePhoto(file);

        // Refuse before storing rather than letting the write throw — losing
        // a progress photo at the moment it is taken is the worst failure
        // this feature has.
        if (wouldExceedBudget(state.photos.map((p) => p.src), approxBytes)) {
          setError(
            `Not enough space for this photo (${formatBytes(approxBytes)}). ` +
              'Delete some photos, or ask your owner to.',
          );
          return false;
        }

        const photo: ProjectPhoto = {
          id: uid('ph'),
          projectId: target.projectId,
          taskId: target.taskId ?? null,
          zoneId: target.zoneId ?? null,
          src,
          caption: file.name.replace(/\.[^.]+$/, ''),
          uploadedByUserId: user?.id ?? 'unknown',
          uploadedByName: user?.name ?? 'Unknown',
          timestamp: new Date().toISOString(),
        };
        upsert('photo', photo, `Photo added to ${target.label}`);
        setError('');
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'That image could not be added.');
        return false;
      } finally {
        setBusy(false);
      }
    },
    [state.photos, target.projectId, target.taskId, target.zoneId, target.label, upsert, user],
  );

  return { upload, error, busy, clearError: () => setError('') };
}
