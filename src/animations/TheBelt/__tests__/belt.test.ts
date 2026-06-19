import { describe, it, expect } from 'vitest';
import { beltReadout, formatW, twistFrame, untwistFrame, isContractible } from '../belt';

const TAU = Math.PI * 2;
function nearIdentity(q: { x: number; y: number; z: number; w: number }, eps = 1e-6) {
  return Math.abs(q.x) < eps && Math.abs(q.y) < eps && Math.abs(q.z) < eps && Math.abs(Math.abs(q.w) - 1) < eps;
}

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

describe('isContractible — even half-turns shed, odd ones cannot', () => {
  it('0° and 720° are contractible; 360° is not', () => {
    expect(isContractible(0)).toBe(true);
    expect(isContractible(720)).toBe(true);
    expect(isContractible(1440)).toBe(true);
    expect(isContractible(360)).toBe(false);
    expect(isContractible(1080)).toBe(false);
  });
});

describe('untwistFrame — the pinned null-homotopy', () => {
  it('reproduces the pure twist at t=0', () => {
    for (const s of [0, 0.25, 0.5, 0.75, 1]) {
      const a = untwistFrame(s, 0, 2 * TAU);
      const b = twistFrame(s, 2 * TAU);
      expect(a.x).toBeCloseTo(b.x, 6);
      expect(a.y).toBeCloseTo(b.y, 6);
      expect(a.z).toBeCloseTo(b.z, 6);
      expect(a.w).toBeCloseTo(b.w, 6);
    }
  });

  it('pins both endpoints for all t (clamp at 1, block fixed)', () => {
    for (const t of [0, 0.3, 0.6, 1]) {
      expect(nearIdentity(untwistFrame(0, t, 2 * TAU))).toBe(true); // clamp
      expect(nearIdentity(untwistFrame(1, t, 2 * TAU))).toBe(true); // block (720° ⇒ home)
    }
  });

  it('reaches the flat belt at t=1 for a contractible (720°) turn', () => {
    for (const s of [0, 0.25, 0.5, 0.75, 1]) {
      expect(nearIdentity(untwistFrame(s, 1, 2 * TAU))).toBe(true);
    }
  });

  it('never passes through the q=−1 antipode at the midpoint while contracting', () => {
    // The whole point of the transverse bow: at s=0.5 the straight blend would
    // cross zero; the nudge keeps the frame well-defined throughout.
    for (let t = 0.05; t < 1; t += 0.05) {
      const q = untwistFrame(0.5, t, 2 * TAU);
      const n = Math.hypot(q.x, q.y, q.z, q.w);
      expect(n).toBeGreaterThan(0.5); // pre-normalization magnitude stays healthy
    }
  });

  it('strands the block at the antipode for a 360° turn — why refusal happens', () => {
    // The block frame at s=1 for a 360° turn sits at −1: the same 3D rotation as
    // home, but the other sheet. The flat belt ends at +1, so no pinned homotopy
    // reaches it — the refusal can only strain the body, never untwist.
    expect(twistFrame(1, TAU).w).toBeCloseTo(-1, 6);
    expect(twistFrame(1, 2 * TAU).w).toBeCloseTo(1, 6); // 720° is home ⇒ shed-able
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
