import { describe, it, expect } from 'vitest';
import {
  pdf1, Phi, cdf1, mahalanobisPooled1, mahalanobisDirected1,
  kl1, crossings1, overlap1, tv1, bayesError1,
} from '../gaussian1d';

// Independent 1-D numeric integral over a wide window.
function integrate(m1: number, s1: number, m2: number, f: (x: number) => number, grid = 6000): number {
  const smax = Math.max(s1, 1);
  const lo = Math.min(m1, m2) - 9 * smax, hi = Math.max(m1, m2) + 9 * smax;
  const dx = (hi - lo) / grid;
  let s = 0;
  for (let i = 0; i < grid; i++) s += f(lo + (i + 0.5) * dx);
  return s * dx;
}

describe('gaussian1d density', () => {
  it('pdf integrates to ~1', () => {
    for (const [m, s] of [[0, 1], [1.5, 0.7], [-2, 2]] as const) {
      expect(integrate(m, s, m, (x) => pdf1(m, s, x))).toBeCloseTo(1, 4);
    }
  });

  it('CDF matches Φ and is monotone', () => {
    expect(cdf1(0, 1, 0)).toBeCloseTo(0.5, 6);
    expect(cdf1(0, 1, 1)).toBeCloseTo(Phi(1), 6);
    expect(cdf1(1, 2, 5)).toBeGreaterThan(cdf1(1, 2, 3));
  });
});

describe('overlap & Bayes error (the felt lens)', () => {
  it('equal σ: overlap = 2Φ(−δ/2σ), Bayes error = Φ(−δ/2σ)', () => {
    for (const delta of [1, 2, 3]) {
      const ov = overlap1(0, 1, delta, 1);
      const be = bayesError1(0, 1, delta, 1);
      expect(ov).toBeCloseTo(2 * Phi(-delta / 2), 3);
      expect(be).toBeCloseTo(Phi(-delta / 2), 3);
      expect(be).toBeCloseTo(ov / 2, 4); // Bayes error = ½·overlap at equal priors
    }
  });

  it('identical ⇒ overlap 1, Bayes error ½, TV 0', () => {
    expect(overlap1(0.5, 1.2, 0.5, 1.2)).toBeCloseTo(1, 4);
    expect(bayesError1(0.5, 1.2, 0.5, 1.2)).toBeCloseTo(0.5, 4);
    expect(tv1(0.5, 1.2, 0.5, 1.2)).toBeCloseTo(0, 4);
  });

  it('overlap = 1 − TV, and pulling apart shrinks the lens', () => {
    expect(overlap1(0, 1, 1.5, 1.3)).toBeCloseTo(1 - tv1(0, 1, 1.5, 1.3), 6);
    expect(overlap1(0, 1, 4, 1)).toBeLessThan(overlap1(0, 1, 1, 1));
  });

  it('prior shifts Bayes error', () => {
    const even = bayesError1(0, 1, 2, 1, 0.5);
    const skew = bayesError1(0, 1, 2, 1, 0.9); // confident it's P ⇒ fewer mistakes
    expect(skew).toBeLessThan(even);
  });
});

describe('Mahalanobis separation (the σ-ruler)', () => {
  it('pooled: |Δμ|/σ when σ equal', () => {
    expect(mahalanobisPooled1(0, 1, 2.4, 1)).toBeCloseTo(2.4, 9);
    expect(mahalanobisPooled1(-1, 2, 1, 2)).toBeCloseTo(1, 9);
  });
  it('pooled uses √((σ₁²+σ₂²)/2) and is symmetric', () => {
    const d = mahalanobisPooled1(0, 1, 3, 2);
    expect(d).toBeCloseTo(3 / Math.sqrt((1 + 4) / 2), 9);
    expect(d).toBeCloseTo(mahalanobisPooled1(3, 2, 0, 1), 9);
  });
  it('directed uses the reference σ', () => {
    expect(mahalanobisDirected1(0, 2, 0.5)).toBeCloseTo(4, 9);
  });
});

describe('KL in 1-D', () => {
  it('KL(P‖P) = 0 and asymmetric for differing σ', () => {
    expect(kl1(0.3, 1.1, 0.3, 1.1)).toBeCloseTo(0, 9);
    expect(kl1(0, 1, 0.6, 2)).not.toBeCloseTo(kl1(0.6, 2, 0, 1), 3);
  });
  it('closed form matches the numeric ∫ p·ln(p/q)', () => {
    const cases: [number, number, number, number][] = [[0, 1, 2, 1.4], [-1, 0.8, 1, 1.6]];
    for (const [m1, s1, m2, s2] of cases) {
      const numeric = integrate(m1, s1, m2, (x) => {
        const p = pdf1(m1, s1, x);
        return p > 1e-14 ? p * Math.log(p / pdf1(m2, s2, x)) : 0;
      });
      expect(kl1(m1, s1, m2, s2)).toBeCloseTo(numeric, 3);
    }
  });
});

describe('crossings (the decision boundary)', () => {
  it('equal σ ⇒ one crossing at the midpoint', () => {
    const c = crossings1(0, 1, 4, 1);
    expect(c.length).toBe(1);
    expect(c[0]).toBeCloseTo(2, 6);
  });
  it('at a crossing the two densities are equal', () => {
    const c = crossings1(0, 1, 1.5, 2);
    expect(c.length).toBeGreaterThanOrEqual(1);
    for (const x of c) expect(pdf1(0, 1, x)).toBeCloseTo(pdf1(1.5, 2, x), 6);
  });
});
