import { describe, expect, test } from 'bun:test';
import {
  formatINR,
  lineEstimatePaise,
  paiseToRupees,
  parseRupeeInput,
  rupees,
} from './money';

describe('rupees() — the input boundary', () => {
  test('converts whole rupees exactly', () => {
    expect(rupees(1)).toBe(100);
    expect(rupees(25_00_000)).toBe(25_00_000_00);
  });

  /** The reason rupees() rounds rather than truncates: the multiply itself
   *  is floating point, and 19.99 * 100 is 1998.9999999999998. Truncation
   *  would quietly shave a paisa off a large share of real invoices. */
  test('survives the float multiply that would otherwise lose a paisa', () => {
    expect(19.99 * 100).not.toBe(1999);      // the trap
    expect(rupees(19.99)).toBe(1999);        // handled
    expect(rupees(0.07)).toBe(7);
    expect(rupees(1234.56)).toBe(123456);
  });

  test('always yields an integer', () => {
    for (const r of [0.01, 0.1, 1.005, 99.999, 12345.678]) {
      expect(Number.isInteger(rupees(r))).toBe(true);
    }
  });
});

describe('parseRupeeInput() — form text to paise', () => {
  test('accepts plain and decimal amounts', () => {
    expect(parseRupeeInput('100')).toBe(10000);
    expect(parseRupeeInput('  250.75 ')).toBe(25075);
    expect(parseRupeeInput('0')).toBe(0);
  });

  test('rejects anything that is not a usable amount', () => {
    for (const bad of ['', '   ', 'abc', '12abc', '-5', 'NaN', 'Infinity']) {
      expect(parseRupeeInput(bad)).toBeNull();
    }
  });
});

describe('lineEstimatePaise() — decimal quantity × paise rate', () => {
  test('rounds the product back to whole paise', () => {
    // 200.5 m³ at ₹2,500.00 → ₹5,01,250 exactly
    expect(lineEstimatePaise(200.5, rupees(2500))).toBe(rupees(5_01_250));
  });

  test('never carries a fraction of a paisa into a total', () => {
    const est = lineEstimatePaise(3.333, rupees(99.99));
    expect(Number.isInteger(est)).toBe(true);
  });

  test('a sum of line estimates stays an exact integer', () => {
    const lines: Array<[number, number]> = [
      [1.5, rupees(10.01)],
      [2.25, rupees(33.33)],
      [7.125, rupees(0.07)],
    ];
    const total = lines.reduce((s, [q, r]) => s + lineEstimatePaise(q, r), 0);
    expect(Number.isInteger(total)).toBe(true);
  });
});

describe('formatINR() — reads paise, prints rupees', () => {
  test('uses Indian units', () => {
    expect(formatINR(rupees(12_500))).toBe('₹12,500');
    expect(formatINR(rupees(8_50_000))).toBe('₹8.5L');
    expect(formatINR(rupees(1_20_00_000))).toBe('₹1.2Cr');
  });

  test('shows paise only when they exist', () => {
    expect(formatINR(rupees(100))).toBe('₹100');
    expect(formatINR(10050)).toBe('₹100.50');
    expect(formatINR(10005)).toBe('₹100.05');
  });

  test('handles zero and negatives', () => {
    expect(formatINR(0)).toBe('₹0');
    expect(formatINR(rupees(-12_500))).toBe('-₹12,500');
  });

  /** Guards the migration itself: a rupee value left unconverted would
   *  render as 1/100th of its true worth. ₹25L stored raw shows as ₹25,000. */
  test('an unconverted rupee value is visibly wrong, not subtly wrong', () => {
    expect(formatINR(25_00_000)).toBe('₹25,000');        // the bug, if it happened
    expect(formatINR(rupees(25_00_000))).toBe('₹25L');   // correct
  });
});

describe('paiseToRupees() — display only', () => {
  test('inverts rupees() for round-trip through a form field', () => {
    for (const r of [1, 250.75, 25_00_000]) {
      expect(paiseToRupees(rupees(r))).toBeCloseTo(r, 10);
    }
  });
});
