/**
 * Site photo capture and the storage ceiling we are currently under.
 *
 * Photos live as data URIs inside the same localStorage blob as everything
 * else, which is a hard constraint of the pre-backend architecture, not a
 * design choice. Browsers give an origin roughly 5–10 MB, and a single
 * uncompressed phone photo is 3–8 MB — so one upload could end the demo.
 *
 * Two consequences shape this file. Compression is aggressive and
 * non-negotiable. And the quota is measured and surfaced rather than
 * discovered when a write throws, because a site engineer losing a
 * progress photo at the moment they take it is the worst possible failure.
 *
 * Phase 1 moves the bytes to object storage and `ProjectPhoto.src` becomes
 * a signed URL. Nothing above this module needs to change when it does —
 * which is exactly why the field is named `src` and not `dataUrl`.
 */

/** Long edge, in pixels, after resize. Enough to read a crack or a rebar
 *  spacing; small enough that a project's worth of photos fits. */
const MAX_EDGE = 1280;
const JPEG_QUALITY = 0.72;

/** Rough ceiling we hold ourselves to, leaving headroom for the rest of
 *  the app's state. Real quota varies by browser and is not reliably
 *  queryable, so this is deliberately conservative. */
export const PHOTO_BUDGET_BYTES = 4_000_000;

export interface CapturedPhoto {
  src: string;
  approxBytes: number;
}

/**
 * Resize and compress a captured image, preserving aspect ratio.
 *
 * Rejects rather than returning a broken image, so the caller can show a
 * real message instead of storing something that will not render.
 */
export function capturePhoto(file: File): Promise<CapturedPhoto> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('That file is not an image.'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('That image could not be opened.'));
      img.onload = () => {
        const scale = Math.min(MAX_EDGE / Math.max(img.width, img.height), 1);
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(Math.round(img.width * scale), 1);
        canvas.height = Math.max(Math.round(img.height * scale), 1);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('This browser cannot process images.'));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const src = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
        resolve({ src, approxBytes: approxBytesOf(src) });
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

/** Byte cost of a data URI. Base64 carries 3 bytes per 4 characters. */
export function approxBytesOf(dataUri: string): number {
  const comma = dataUri.indexOf(',');
  const payload = comma >= 0 ? dataUri.length - comma - 1 : dataUri.length;
  return Math.round(payload * 0.75);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export interface PhotoBudget {
  usedBytes: number;
  budgetBytes: number;
  percentUsed: number;
  /** True once there is not enough room for a further photo of typical size. */
  nearlyFull: boolean;
}

export function photoBudget(sources: string[]): PhotoBudget {
  const usedBytes = sources.reduce((sum, s) => sum + approxBytesOf(s), 0);
  return {
    usedBytes,
    budgetBytes: PHOTO_BUDGET_BYTES,
    percentUsed: Math.min((usedBytes / PHOTO_BUDGET_BYTES) * 100, 100),
    nearlyFull: usedBytes > PHOTO_BUDGET_BYTES * 0.85,
  };
}

/** True when one more photo of this size would exceed the budget. */
export function wouldExceedBudget(existing: string[], incomingBytes: number): boolean {
  return photoBudget(existing).usedBytes + incomingBytes > PHOTO_BUDGET_BYTES;
}
