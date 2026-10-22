import { describe, expect, it } from 'vitest';
import { boundInput, dualSquare, formatNumber, multiply, slotNumber } from './arithmetic';

describe('multiplication with j² = p', () => {
  it('gives the three guided products with a fixed second coordinate', () => {
    expect(multiply(1, 1, 1, 1, -1)).toEqual([0, 2]);
    expect(multiply(1, 1, 1, 1, 0)).toEqual([1, 2]);
    expect(multiply(1, 1, 1, 1, 1)).toEqual([2, 2]);
  });
  it('uses the full p value between presets, with signed operands', () => {
    expect(multiply(2, -3, -1, 0.5, 0.25)).toEqual([-2.375, 4]);
  });
  it('obeys j² = p and commutativity for wandering operands', () => {
    for (const p of [-1, -0.4, 0, 0.7, 1]) {
      expect(multiply(0, 1, 0, 1, p)).toEqual([p, 0]);
      expect(multiply(-2, 1.5, 0.3, -1, p)).toEqual(multiply(0.3, -1, -2, 1.5, p));
    }
  });
});

describe('the dual square passage', () => {
  it('recovers the derivative only when the direction is one', () => {
    expect(dualSquare(1, 1)).toEqual({ real: 1, slot: 2, slope: 2 });
    expect(dualSquare(2, 1)).toEqual({ real: 4, slot: 4, slope: 4 });
  });
  it('keeps a finite zero slot without dividing by b', () => {
    expect(dualSquare(2, 0)).toEqual({ real: 4, slot: 0, slope: 4 });
    expect(dualSquare(-2, -0.5)).toEqual({ real: 4, slot: 2, slope: -4 });
  });
  it('agrees with multiplication under ε² = 0', () => {
    for (const [a, b] of [[-3, 2], [1.25, 0.3], [0, 0]]) {
      const result = dualSquare(a, b);
      expect([result.real, result.slot]).toEqual(multiply(a, b, a, b, 0));
    }
  });
});

it('bounds operands and formats signed readouts without a negative zero', () => {
  expect(boundInput(-8)).toBe(-3);
  expect(boundInput(8)).toBe(3);
  expect(boundInput(1.2345)).toBe(1.2345);
  expect(formatNumber(-0.00001)).toBe('0');
  expect(slotNumber(2, -3, 'ε')).toBe('2 − 3ε');
});
