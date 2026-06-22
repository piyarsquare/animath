import { describe, it, expect } from 'vitest';
import {
  poissonRange, skellamPmf, skellamRange, besselI, besselBreakdown,
  conditionalRungs, diagTerm, fitMoments, mulberry32, sampleSkellam,
} from '../skellam';

describe('skellam engine', () => {
  it('Poisson pmf sums to ~1', () => {
    for (const mu of [0.5, 3, 8]) {
      const s = poissonRange(mu, 90).reduce((a, b) => a + b, 0);
      expect(s).toBeCloseTo(1, 6);
    }
  });

  it('the diagonal sum equals the Bessel closed form (the core identity)', () => {
    const cases: [number, number][] = [[4, 2.5], [1, 1], [7, 3], [0.5, 6]];
    for (const [m1, m2] of cases) {
      for (let k = -5; k <= 5; k++) {
        const direct = skellamPmf(m1, m2, k);
        const bd = besselBreakdown(m1, m2, k);
        expect(bd.pmf).toBeCloseTo(direct, 9);
        const explicit = Math.exp(-(m1 + m2)) * Math.pow(m1 / m2, k / 2) * besselI(k, 2 * Math.sqrt(m1 * m2));
        expect(explicit).toBeCloseTo(direct, 9);
      }
    }
  });

  it('Skellam pmf sums to ~1 over a wide range', () => {
    const s = skellamRange(4, 2.5, -60, 60).reduce((a, b) => a + b, 0);
    expect(s).toBeCloseTo(1, 6);
  });

  it('the conditional over rungs is a probability distribution (Bessel term ÷ Bessel sum)', () => {
    const c = conditionalRungs(4, 2.5, 2);
    expect(c.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9);
    const pmf = skellamPmf(4, 2.5, 2);
    expect(c[0]).toBeCloseTo(diagTerm(4, 2.5, 2, 0) / pmf, 9);
  });

  it('mean and variance equal μ₁−μ₂ and μ₁+μ₂', () => {
    const m1 = 4, m2 = 2.5, half = 80;
    const ks = skellamRange(m1, m2, -half, half);
    let mean = 0, ex2 = 0;
    for (let i = 0; i < ks.length; i++) { const k = i - half; mean += k * ks[i]; ex2 += k * k * ks[i]; }
    expect(mean).toBeCloseTo(m1 - m2, 5);
    expect(ex2 - mean * mean).toBeCloseTo(m1 + m2, 5);
  });

  it('method-of-moments recovers the rates on a large sample', () => {
    const rng = mulberry32(12345);
    const xs: number[] = [];
    for (let i = 0; i < 40000; i++) xs.push(sampleSkellam(5, 2, rng));
    const f = fitMoments(xs);
    expect(f.mu1).toBeGreaterThan(4.4);
    expect(f.mu1).toBeLessThan(5.6);
    expect(f.mu2).toBeGreaterThan(1.5);
    expect(f.mu2).toBeLessThan(2.5);
  });
});
