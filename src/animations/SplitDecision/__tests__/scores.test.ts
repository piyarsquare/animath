import { describe, it, expect } from 'vitest';
import { mulberry32 } from '@/lib/rng';
import {
  fromRows, fromCells, degrees, blockTable, isDegenerate, complementCut, transpose, handshake,
  FIXTURES, fixtureById, PAGE50_TRAP_CUT, planted, densitiesForSignal, type Cut, type BinaryMatrix,
} from '../matrix';
import {
  SCORES, SCORE_IDS, evaluate, exactOptimum, isStrictLocalOptimum, sameSplit,
  codeLength, noSplitCodeLength, log2Choose, H,
} from '../scores';

const fx = (id: string) => { const f = fixtureById(id)!; return { M: f.matrix, d: degrees(f.matrix), cut: f.planted as Cut }; };
const score = (id: keyof typeof SCORES, M: BinaryMatrix, cut: Cut) => evaluate(M, degrees(M), SCORES[id], cut);

function randomInstance(rng: () => number, m: number, n: number, density = 0.4): { M: BinaryMatrix; cut: Cut } {
  const cells = new Uint8Array(m * n);
  for (let k = 0; k < m * n; k++) cells[k] = rng() < density ? 1 : 0;
  const M = fromCells(m, n, cells);
  const cut: Cut = { z: Array.from({ length: m }, () => (rng() < 0.5 ? 1 : 0)), w: Array.from({ length: n }, () => (rng() < 0.5 ? 1 : 0)) };
  return { M, cut };
}

describe('fixtures are the monograph\'s matrices', () => {
  it('8×10 complete has 40 edges, sparse has 18, both split 4 | 4 rows and 5 | 5 columns', () => {
    const c = fx('complete-8x10'), s = fx('sparse-8x10');
    expect(c.d.e).toBe(40);
    expect(s.d.e).toBe(18);
    const tc = blockTable(c.M, c.cut), ts = blockTable(s.M, s.cut);
    expect(tc.N).toEqual([[0, 20], [20, 0]]);
    expect(ts.N).toEqual([[0, 9], [9, 0]]);
    expect(tc.K).toEqual([[20, 20], [20, 20]]);
  });
  it('the Ninety\'s observed matrix has every degree 2 and table (0,4;4,0) at the balanced cut', () => {
    const { M, d, cut } = fx('ninety-4x4');
    expect(d.r).toEqual([2, 2, 2, 2]);
    expect(d.c).toEqual([2, 2, 2, 2]);
    expect(blockTable(M, cut).N).toEqual([[0, 4], [4, 0]]);
  });
});

describe('acceptance values (verified by enumeration, 2026-09-16)', () => {
  it('Ninety 4×4 at the balanced cut', () => {
    const { M, cut } = fx('ninety-4x4');
    expect(score('pearson', M, cut)).toBeCloseTo(8, 12);
    expect(score('mutualInfo', M, cut)).toBeCloseTo(1, 12);
    expect(score('bernoulli', M, cut)).toBeCloseTo(1, 12);
    expect(score('edgeCount', M, cut)).toBe(8);
    expect(score('hamming', M, cut)).toBe(16);
    expect(score('modularity', M, cut)).toBeCloseTo(0.5, 12); // Barber's ceiling for two equal modules
    expect(score('mdl', M, cut)).toBeCloseTo(3.28, 2);        // relative to the no-split code
  });
  it('8×10 complete vs sparse: the ones-only judges tie, the cell-sampling judge does not', () => {
    const c = fx('complete-8x10'), s = fx('sparse-8x10');
    expect(score('mutualInfo', c.M, c.cut)).toBeCloseTo(1, 12);
    expect(score('mutualInfo', s.M, s.cut)).toBeCloseTo(1, 12);
    expect(score('pearson', c.M, c.cut)).toBeCloseTo(40, 12);
    expect(score('pearson', s.M, s.cut)).toBeCloseTo(18, 12);
    expect(score('bernoulli', c.M, c.cut)).toBeCloseTo(1, 12);
    expect(score('bernoulli', s.M, s.cut)).toBeCloseTo(0.273, 3);
    expect(score('edgeCount', c.M, c.cut)).toBe(40);
    expect(score('edgeCount', s.M, s.cut)).toBe(18);
    expect(score('mdl', c.M, c.cut)).toBeCloseTo(51.17, 1);
    expect(score('mdl', s.M, s.cut)).toBeLessThan(0);        // no split of the sparse pair pays for itself
    expect(handshake(c.M)).toBe(true);
    expect(handshake(s.M)).toBe(true);
  });
  it('page-50 matrix: the stated cut is a strict single-flip local optimum under modularity only, and not the global optimum', () => {
    const { M, d } = fx('page50-4x4');
    const q = SCORES.modularity;
    expect(evaluate(M, d, q, PAGE50_TRAP_CUT)).toBeCloseTo(0.1728, 3);
    expect(isStrictLocalOptimum(M, d, q, PAGE50_TRAP_CUT)).toBe(true);
    const opt = exactOptimum(M, d, q)!;
    expect(opt.score).toBeCloseTo(0.2715, 3);
    expect(sameSplit(opt.cut, PAGE50_TRAP_CUT, false)).toBe(false);
    for (const id of ['edgeCount', 'hamming', 'mutualInfo', 'bernoulli'] as const) {
      expect(isStrictLocalOptimum(M, d, SCORES[id], PAGE50_TRAP_CUT)).toBe(false);
    }
  });
});

describe('the guard and the trivial cut', () => {
  it('every judge scores exactly 0 on every degenerate cut', () => {
    for (const f of FIXTURES) {
      const M = f.matrix, d = degrees(M);
      const ones = (k: number) => new Array<number>(k).fill(1), zeros = (k: number) => new Array<number>(k).fill(0);
      const degenerate: Cut[] = [
        { z: ones(M.m), w: zeros(M.n) }, { z: zeros(M.m), w: ones(M.n) }, { z: ones(M.m), w: ones(M.n) },
        { z: ones(M.m), w: [1, ...zeros(M.n - 1)] }, { z: [1, ...zeros(M.m - 1)], w: zeros(M.n) },
      ];
      for (const cut of degenerate) for (const id of SCORE_IDS) expect(evaluate(M, d, SCORES[id], cut)).toBe(0);
    }
  });
  it('Occam\'s no-split baseline is the two-part code applied to the degenerate cut (0 by construction, no guard needed)', () => {
    for (const f of FIXTURES) {
      const M = f.matrix, d = degrees(M);
      const t = blockTable(M, { z: new Array<number>(M.m).fill(1), w: new Array<number>(M.n).fill(0) });
      expect(isDegenerate(t, M.m, M.n)).toBe(true);
      expect(codeLength(t, M.m, M.n)).toBeCloseTo(noSplitCodeLength(M.m, M.n, d.e), 9);
    }
  });
  it('the one-row peel is NOT guarded (the edge-count judges\' honest blind spot)', () => {
    const { M } = fx('sparse-8x10');
    const peel: Cut = { z: [1, 1, 1, 1, 1, 1, 1, 0], w: [1, 1, 1, 1, 1, 1, 1, 1, 1, 0] };
    expect(score('hamming', M, peel)).toBeGreaterThan(0);
  });
});

describe('symmetries (property tests over random instances)', () => {
  const rng = mulberry32(2026);
  it('complement (1−z, 1−w) leaves every judge unchanged', () => {
    for (let t = 0; t < 200; t++) {
      const { M, cut } = randomInstance(rng, 2 + Math.floor(rng() * 6), 2 + Math.floor(rng() * 6));
      const d = degrees(M);
      for (const id of SCORE_IDS) expect(evaluate(M, d, SCORES[id], complementCut(cut))).toBeCloseTo(evaluate(M, d, SCORES[id], cut), 9);
    }
  });
  it('orientation twin (z, 1−w): unchanged for the four orientation-blind judges, negated for the three edge-signed ones', () => {
    for (let t = 0; t < 200; t++) {
      const { M, cut } = randomInstance(rng, 2 + Math.floor(rng() * 6), 2 + Math.floor(rng() * 6));
      const d = degrees(M);
      const twin: Cut = { z: cut.z, w: cut.w.map(v => 1 - v) };
      const tb = blockTable(M, cut);
      if (isDegenerate(tb, M.m, M.n)) continue;
      for (const id of SCORE_IDS) {
        const a = evaluate(M, d, SCORES[id], cut), b = evaluate(M, d, SCORES[id], twin);
        if (SCORES[id].orientationBlind) expect(b).toBeCloseTo(a, 9);
        else expect(b).toBeCloseTo(-a, 9);
      }
    }
    const c = fx('complete-8x10');
    expect(score('edgeCount', c.M, { z: c.cut.z, w: c.cut.w.map(v => 1 - v) })).toBe(-40);
  });
  it('transposition: S(M, (z, w)) = S(Mᵀ, (w, z))', () => {
    for (let t = 0; t < 200; t++) {
      const { M, cut } = randomInstance(rng, 2 + Math.floor(rng() * 6), 2 + Math.floor(rng() * 6));
      const MT = transpose(M);
      for (const id of SCORE_IDS) expect(evaluate(MT, degrees(MT), SCORES[id], { z: cut.w, w: cut.z })).toBeCloseTo(evaluate(M, degrees(M), SCORES[id], cut), 9);
    }
  });
  it('block-table invariants and score bounds', () => {
    for (let t = 0; t < 200; t++) {
      const { M, cut } = randomInstance(rng, 2 + Math.floor(rng() * 6), 2 + Math.floor(rng() * 6));
      const d = degrees(M), tb = blockTable(M, cut);
      expect(tb.N.flat().reduce((a, b) => a + b, 0)).toBe(d.e);
      expect(tb.K.flat().reduce((a, b) => a + b, 0)).toBe(M.m * M.n);
      tb.N.flat().forEach((N, k) => { expect(N).toBeGreaterThanOrEqual(0); expect(N).toBeLessThanOrEqual(tb.K.flat()[k]); });
      if (isDegenerate(tb, M.m, M.n)) continue;
      const dims = { m: M.m, n: M.n };
      expect(SCORES.mutualInfo.score(tb, d, dims)).toBeLessThanOrEqual(1 + 1e-12);
      expect(SCORES.mutualInfo.score(tb, d, dims)).toBeGreaterThanOrEqual(-1e-12);
      expect(SCORES.bernoulli.score(tb, d, dims)).toBeGreaterThanOrEqual(-1e-12);
      expect(SCORES.bernoulli.score(tb, d, dims)).toBeLessThanOrEqual(H(d.e / (M.m * M.n)) + 1e-12);
      expect(SCORES.pearson.score(tb, d, dims)).toBeGreaterThanOrEqual(0);
      expect(SCORES.modularity.score(tb, d, dims)).toBeLessThanOrEqual(0.5 + 1e-12);
      const cutScore = SCORES.edgeCount.score(tb, d, dims);
      expect(SCORES.hamming.score(tb, d, dims)).toBe(2 * cutScore + (tb.K[0][0] + tb.K[1][1] - tb.K[0][1] - tb.K[1][0]));
    }
  });
});

describe('the Exhaustive Bailiff', () => {
  it('agrees with an independent brute force over all 2^(m+n) labeled cuts', () => {
    const rng = mulberry32(7);
    for (let t = 0; t < 20; t++) {
      const { M } = randomInstance(rng, 4, 4, 0.5);
      const d = degrees(M);
      for (const id of ['edgeCount', 'bernoulli', 'modularity', 'mdl'] as const) {
        let best = -Infinity;
        for (let zb = 0; zb < 16; zb++) for (let wb = 0; wb < 16; wb++) {
          const cut: Cut = { z: [0, 1, 2, 3].map(i => (zb >> i) & 1), w: [0, 1, 2, 3].map(j => (wb >> j) & 1) };
          if (isDegenerate(blockTable(M, cut), 4, 4)) continue;
          best = Math.max(best, evaluate(M, d, SCORES[id], cut));
        }
        const opt = exactOptimum(M, d, SCORES[id]);
        expect(opt).not.toBeNull();
        expect(opt!.score).toBeCloseTo(best, 9);
      }
    }
  });
  it('on a perfect planted 8×10 (shuffled), every judge\'s optimum is the planted split, uniquely up to labeling', () => {
    const inst = planted({ m: 8, n: 10, r1: 4, c1: 5, rhoIn: 1, rhoOut: 0 }, 42);
    const M = inst.matrix, d = degrees(M);
    expect(d.e).toBe(40);
    for (const id of SCORE_IDS) {
      const spec = SCORES[id];
      const opt = exactOptimum(M, d, spec)!;
      expect(sameSplit(opt.cut, inst.planted, spec.orientationBlind)).toBe(true);
      expect(opt.score).toBeCloseTo(evaluate(M, d, spec, inst.planted), 9);
      expect(opt.ties).toBe(spec.orientationBlind ? 2 : 1);
    }
  });
  it('returns null above the enumeration limit', () => {
    const inst = planted({ m: 12, n: 12, r1: 6, c1: 6, rhoIn: 1, rhoOut: 0 }, 1);
    expect(exactOptimum(inst.matrix, degrees(inst.matrix), SCORES.edgeCount)).toBeNull();
  });
});

describe('Tarjan\'s Handshake', () => {
  it('needs two components touching each side, counting isolates', () => {
    expect(handshake(fromRows(['111', '111', '111']))).toBe(false);   // connected
    expect(handshake(fromRows(['00', '00']))).toBe(true);             // four isolates
    expect(handshake(fromRows(['111', '000']))).toBe(false);          // a star + a row isolate: the column side is one component (monograph p. 12)
    expect(handshake(fromRows(['110', '000']))).toBe(true);           // …but with a column isolate too, R₂ = {row 2}, C₁ = {col 3} works
    expect(handshake(fromRows(['1111']))).toBe(false);                // one row
  });
});

describe('planted generator', () => {
  it('shuffles rows and columns and stores the planted cut in the app\'s orientation', () => {
    const inst = planted({ m: 6, n: 6, r1: 3, c1: 3, rhoIn: 1, rhoOut: 0 }, 5);
    const t = blockTable(inst.matrix, inst.planted);
    expect(t.N).toEqual([[0, 9], [9, 0]]);
    expect(inst.rowPerm.slice().sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(planted({ m: 6, n: 6, r1: 3, c1: 3, rhoIn: 1, rhoOut: 0 }, 5).matrix.cells).toEqual(inst.matrix.cells);
  });
  it('signal maps to densities symmetrically about ½', () => {
    expect(densitiesForSignal(1)).toEqual({ rhoIn: 1, rhoOut: 0 });
    expect(densitiesForSignal(0)).toEqual({ rhoIn: 0.5, rhoOut: 0.5 });
  });
});

describe('combinatorics helpers', () => {
  it('log2Choose(16, 8) = log2 12870', () => {
    expect(log2Choose(16, 8)).toBeCloseTo(Math.log2(12870), 9);
    expect(log2Choose(5, 0)).toBe(0);
    expect(log2Choose(5, 6)).toBe(-Infinity);
  });
});
