import { describe, expect, test } from 'bun:test';
import {
  approxBytesOf,
  formatBytes,
  photoBudget,
  PHOTO_BUDGET_BYTES,
  wouldExceedBudget,
} from './photos';

/** A data URI of roughly `bytes` payload. */
const uriOf = (bytes: number) =>
  `data:image/jpeg;base64,${'A'.repeat(Math.ceil(bytes / 0.75))}`;

describe('approxBytesOf', () => {
  test('measures the base64 payload, not the header', () => {
    // 4 base64 chars carry 3 bytes.
    expect(approxBytesOf('data:image/jpeg;base64,AAAA')).toBe(3);
  });

  test('scales roughly linearly', () => {
    expect(approxBytesOf(uriOf(100_000))).toBeGreaterThan(99_000);
    expect(approxBytesOf(uriOf(100_000))).toBeLessThan(101_000);
  });

  test('handles a string with no comma without throwing', () => {
    expect(approxBytesOf('notadatauri')).toBeGreaterThan(0);
  });
});

describe('photoBudget', () => {
  test('an empty project reports nothing used', () => {
    const b = photoBudget([]);
    expect(b.usedBytes).toBe(0);
    expect(b.percentUsed).toBe(0);
    expect(b.nearlyFull).toBe(false);
  });

  test('flags nearly-full past 85% so the ceiling is seen, not hit', () => {
    expect(photoBudget([uriOf(PHOTO_BUDGET_BYTES * 0.5)]).nearlyFull).toBe(false);
    expect(photoBudget([uriOf(PHOTO_BUDGET_BYTES * 0.9)]).nearlyFull).toBe(true);
  });

  test('percentUsed never exceeds 100, even when over budget', () => {
    expect(photoBudget([uriOf(PHOTO_BUDGET_BYTES * 3)]).percentUsed).toBe(100);
  });
});

describe('wouldExceedBudget — refuse before storing', () => {
  /** The failure this prevents: a site engineer taking a progress photo and
   *  losing it because the write threw after the shutter. */
  test('rejects the photo that would push past the ceiling', () => {
    const existing = [uriOf(PHOTO_BUDGET_BYTES * 0.95)];
    expect(wouldExceedBudget(existing, 500_000)).toBe(true);
  });

  test('accepts a photo that still fits', () => {
    expect(wouldExceedBudget([uriOf(1_000_000)], 500_000)).toBe(false);
  });

  test('a first photo on an empty project always fits', () => {
    expect(wouldExceedBudget([], 800_000)).toBe(false);
  });
});

describe('formatBytes', () => {
  test('reads in the unit a person expects', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(3_500_000)).toBe('3.3 MB');
  });
});
