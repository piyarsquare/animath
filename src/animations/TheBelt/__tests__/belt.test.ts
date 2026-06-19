import { describe, it, expect } from 'vitest';
import { beltReadout, formatW } from '../belt';

describe('beltReadout — the double-cover invariants', () => {
  it('is home (w = +1) at 0°', () => {
    const r = beltReadout(0);
    expect(r.w).toBeCloseTo(1, 6);
    expect(r.atHome).toBe(true);
    expect(r.sign).toBe(1);
  });

  it('hits the antipode (w = −1) at 360° — the −q sheet', () => {
    const r = beltReadout(360);
    expect(r.w).toBeCloseTo(-1, 6);
    expect(r.atAntipode).toBe(true);
    expect(r.sign).toBe(-1);
  });

  it('returns home (w = +1) only at 720°, not 360° — the whole lesson', () => {
    const r = beltReadout(720);
    expect(r.w).toBeCloseTo(1, 6);
    expect(r.atHome).toBe(true);
    expect(r.sign).toBe(1);
    // …and is decidedly NOT home at 360.
    expect(beltReadout(360).atHome).toBe(false);
  });

  it('advances the quaternion at exactly half the block rate (2:1 gearing)', () => {
    expect(beltReadout(180).halfDeg).toBe(90); // w = cos90 = 0
    expect(beltReadout(180).w).toBeCloseTo(0, 6);
    expect(beltReadout(90).halfDeg).toBe(45);
  });

  it('reports signed full turns', () => {
    expect(beltReadout(720).turns).toBe(2);
    expect(beltReadout(-360).turns).toBe(-1);
    expect(beltReadout(-360).sign).toBe(-1); // antipode either way around
  });
});

describe('formatW', () => {
  it('uses a real minus sign and 3 decimals', () => {
    expect(formatW(-1)).toBe('−1.000');
    expect(formatW(1)).toBe('1.000');
  });
  it('never prints negative zero', () => {
    expect(formatW(-1e-9)).toBe('0.000');
  });
});
