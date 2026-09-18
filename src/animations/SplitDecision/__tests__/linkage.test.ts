import { describe, it, expect } from 'vitest';
import { mulberry32 } from '@/lib/rng';
import { linkage } from '../linkage';
import type { Genome, Individual } from '../evolve';

const ind = (p: number[], q: number[]): Individual => ({ p, q, sex: 'row', fit: 0, cut: { z: [], w: [] } });
/** A reference far from every genome, so canonicalization leaves them all alone. */
const REF: Genome = { p: [0.5, 0.5, 0.5], q: [0.5, 0.5] };

/** Pearson correlation, written independently of the implementation. */
function pearson(x: number[], y: number[]): number {
  const n = x.length;
  const mx = x.reduce((a, b) => a + b, 0) / n, my = y.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) { const a = x[i] - mx, b = y[i] - my; sxy += a * b; sxx += a * a; syy += b * b; }
  return sxy / Math.sqrt(sxx * syy);
}

describe('linkage', () => {
  it('agrees with an independent Pearson correlation on random populations', () => {
    const rng = mulberry32(5);
    for (let t = 0; t < 40; t++) {
      const m = 2 + Math.floor(rng() * 3), n = 2 + Math.floor(rng() * 3), N = 12 + Math.floor(rng() * 20);
      const pop = Array.from({ length: N }, () => ind(
        Array.from({ length: m }, () => rng()), Array.from({ length: n }, () => rng())));
      // a reference of all-½ keeps every individual in its own labeling (both
      // orientations are equidistant, and the implementation keeps the identity)
      const ref: Genome = { p: new Array(m).fill(0.5), q: new Array(n).fill(0.5) };
      const lk = linkage(pop, ref, false, m, n);
      const L = m + n;
      const col = (a: number) => pop.map(p => (a < m ? p.p[a] : p.q[a - m]));
      for (let a = 0; a < L; a++) for (let b = 0; b < L; b++) {
        expect(lk.r[a * L + b]).toBeCloseTo(a === b ? 1 : pearson(col(a), col(b)), 9);
      }
    }
  });

  it('is symmetric, has a unit diagonal, and stays within [-1, 1]', () => {
    const rng = mulberry32(9);
    const pop = Array.from({ length: 30 }, () => ind([rng(), rng(), rng()], [rng(), rng()]));
    const lk = linkage(pop, REF, false, 3, 2);
    for (let a = 0; a < 5; a++) {
      expect(lk.r[a * 5 + a]).toBeCloseTo(1, 12);
      for (let b = 0; b < 5; b++) {
        expect(lk.r[a * 5 + b]).toBeCloseTo(lk.r[b * 5 + a], 12);
        expect(Math.abs(lk.r[a * 5 + b])).toBeLessThanOrEqual(1 + 1e-12);
      }
    }
  });

  it('reads a perfectly coupled pair as 1 and an opposed pair as -1', () => {
    const pop = [0.1, 0.3, 0.6, 0.9].map(v => ind([v, v, 1 - v], [v, 0.5]));
    const lk = linkage(pop, REF, false, 3, 2);
    expect(lk.r[0 * 5 + 1]).toBeCloseTo(1, 9);    // p0 tracks p1
    expect(lk.r[0 * 5 + 2]).toBeCloseTo(-1, 9);   // p2 is its complement
    expect(lk.r[0 * 5 + 3]).toBeCloseTo(1, 9);    // q0 tracks p0 — a cross-half association
  });

  it('treats a fixed locus as correlating with nothing, and counts what still varies', () => {
    const rng = mulberry32(3);
    const pop = Array.from({ length: 20 }, () => ind([rng(), 0.25, rng()], [rng(), 0.75]));
    const lk = linkage(pop, REF, false, 3, 2);
    for (let b = 0; b < 5; b++) expect(lk.r[1 * 5 + b]).toBe(0);   // the fixed row locus
    for (let b = 0; b < 5; b++) expect(lk.r[4 * 5 + b]).toBe(0);   // the fixed column locus
    expect(lk.varying).toBe(3);
    // a fully converged population has nothing left to correlate
    const fixed = Array.from({ length: 20 }, () => ind([1, 0, 1], [0, 1]));
    const lf = linkage(fixed, REF, false, 3, 2);
    expect(lf.varying).toBe(0);
    expect(lf.meanAbsPP).toBe(0);
    expect(lf.r.every(v => v === 0)).toBe(true);
  });

  it('is invariant to which labeling each individual arrived in', () => {
    const rng = mulberry32(11);
    const base = Array.from({ length: 24 }, () => ind([rng(), rng(), rng()], [rng(), rng()]));
    const ref = base[0];
    const plain = linkage(base, ref, false, 3, 2);
    // flip half the population into the complementary labeling of the same split
    const mixed = base.map((b, i) => (i % 2 ? ind(b.p.map(v => 1 - v), b.q.map(v => 1 - v)) : b));
    const canon = linkage(mixed, ref, false, 3, 2);
    for (let k = 0; k < 25; k++) expect(canon.r[k]).toBeCloseTo(plain.r[k], 9);
  });

  it('reports both baselines, and the mean-|r| null matches independent loci', () => {
    const rng = mulberry32(77);
    const N = 400;
    const pop = Array.from({ length: N }, () => ind([rng(), rng(), rng()], [rng(), rng()]));
    const lk = linkage(pop, REF, false, 3, 2);
    expect(lk.cellNoise).toBeCloseTo(2 / Math.sqrt(N), 9);
    expect(lk.meanAbsNull).toBeCloseTo(Math.sqrt(2 / Math.PI) / Math.sqrt(N), 9);
    // independent loci: the observed mean |r| should sit near meanAbsNull, and well
    // under the single-cell threshold — the distinction the two baselines exist for
    expect(lk.meanAbsPP).toBeLessThan(lk.cellNoise);
    expect(Math.abs(lk.meanAbsPP - lk.meanAbsNull)).toBeLessThan(2.5 * lk.meanAbsNull);
  });
});
