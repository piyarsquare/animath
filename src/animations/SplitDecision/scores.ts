/**
 * Split Decision — the selection scores (the Judges).
 *
 * Every score is a function of the cut's block table {N, K} and the matrix's degrees
 * {r, c, e}: count once (`blockTable`), score in O(1). Ids are plain and greppable;
 * the character names are display metadata.
 *
 * Sign convention: x = 2z − 1, y = 2w − 1 ∈ {±1}. Cross blocks are R₁×C₂ and R₂×C₁.
 * Every score is invariant under the complement (1−z, 1−w). The four
 * `orientationBlind` scores are also invariant under (z, 1−w); the three edge-signed
 * ones (edgeCount, hamming, modularity) are not — (z, 1−w) is the opposite cut for them.
 *
 * The guard: a degenerate cut (an empty class on either side) scores 0 for every
 * judge. Four judges give 0 there by construction; Occam is defined relative to the
 * no-split code so it does too; only the two edge-count scores need the rule.
 */

import { blockTable, isDegenerate, type BinaryMatrix, type BlockTable, type Cut, type Degrees } from './matrix';

export type ScoreId = 'edgeCount' | 'hamming' | 'pearson' | 'mutualInfo' | 'bernoulli' | 'modularity' | 'mdl';

export interface ScoreSpec {
  id: ScoreId;
  /** The character name (UI voice). */
  name: string;
  /** The historical name and its attribution. */
  history: string;
  /** Short formula, for the panel Note. */
  formula: string;
  /** What this judge cannot see. */
  blindSpot: string;
  /** Units, for readouts. */
  units: string;
  /** True when (z, 1−w) scores the same as (z, w). */
  orientationBlind: boolean;
  score(t: BlockTable, d: Degrees, dims: { m: number; n: number }): number;
}

/* ── helpers ── */

const LOG2 = Math.log2;

/** Binary entropy in bits, with 0·log 0 = 0. */
export function H(theta: number): number {
  if (theta <= 0 || theta >= 1) return 0;
  return -(theta * LOG2(theta) + (1 - theta) * LOG2(1 - theta));
}

/** log₂ of the factorial, from a lazily grown table (exact sums of logs). */
const LOG2_FACT: number[] = [0];
export function log2Factorial(n: number): number {
  for (let k = LOG2_FACT.length; k <= n; k++) LOG2_FACT[k] = LOG2_FACT[k - 1] + LOG2(k);
  return LOG2_FACT[n];
}

/** log₂ C(n, k). */
export function log2Choose(n: number, k: number): number {
  if (k < 0 || k > n) return -Infinity;
  return log2Factorial(n) - log2Factorial(k) - log2Factorial(n - k);
}

function margins(t: BlockTable) {
  const [[n11, n12], [n21, n22]] = t.N;
  return { n11, n12, n21, n22, r1: n11 + n12, r2: n21 + n22, c1: n11 + n21, c2: n12 + n22 };
}

/* ── the two-part code behind Occam's Invoice ── */

/** Code length in bits of describing M through a cut: first the cut (its class sizes
 *  and which rows/columns), then each block's count and the positions within it. The
 *  −1 credits the (R₁,C₁) ≡ (R₂,C₂) redundancy. */
export function codeLength(t: BlockTable, m: number, n: number): number {
  const lCut = LOG2(m + 1) + log2Choose(m, t.nR1) + LOG2(n + 1) + log2Choose(n, t.nC1) - 1;
  let lBlk = 0;
  for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) {
    const K = t.K[a][b], N = t.N[a][b];
    if (K > 0) lBlk += LOG2(K + 1) + log2Choose(K, N);
  }
  return lCut + lBlk;
}

/** The same code applied to the no-split (degenerate) cut: the baseline. */
export function noSplitCodeLength(m: number, n: number, e: number): number {
  return LOG2(m + 1) + LOG2(n + 1) - 1 + LOG2(m * n + 1) + log2Choose(m * n, e);
}

/* ── the registry ── */

export const SCORES: Record<ScoreId, ScoreSpec> = {
  edgeCount: {
    id: 'edgeCount', name: 'Cut and Run',
    history: 'min-cut — the cut side of Ford & Fulkerson (1956); as a partition objective, Kernighan & Lin (1970)',
    formula: 'N₁₂ + N₂₁ − N₁₁ − N₂₂', blindSpot: 'Unnormalized: peeling off one low-degree row and column scores almost as well as a real split. Blind to zeros and to empty rows.',
    units: 'edges', orientationBlind: false,
    score(t) { const { n11, n12, n21, n22 } = margins(t); return n12 + n21 - n11 - n22; },
  },
  hamming: {
    id: 'hamming', name: "Hamming's Full Count",
    history: 'Hamming distance (1950) to the complete checkerboard template — the monograph\'s xᵀ(J−2M)y',
    formula: '(N₁₂+N₂₁−N₁₁−N₂₂) + (Z₁₁+Z₂₂−Z₁₂−Z₂₁), Z = K − N', blindSpot: 'Counts zeros as evidence, so on a sparse matrix it prefers peeling one row and one column and calling everything else "zero block".',
    units: 'cells', orientationBlind: false,
    score(t) {
      const { n11, n12, n21, n22 } = margins(t);
      const Z = (a: number, b: number) => t.K[a][b] - t.N[a][b];
      return (n12 + n21 - n11 - n22) + (Z(0, 0) + Z(1, 1) - Z(0, 1) - Z(1, 0));
    },
  },
  pearson: {
    id: 'pearson', name: "Pearson's Squint",
    history: 'Pearson\'s chi-square (1900) on the 2×2 table of ones',
    formula: 'Σ (N_ab − E_ab)² / E_ab,  E_ab = N_a·N_·b / e', blindSpot: 'Sees only the ones (it is e·φ² of the ones table): a sparse checkerboard and a complete one look the same. Blind to orientation.',
    units: 'χ²', orientationBlind: true,
    score(t, d) {
      const { r1, r2, c1, c2 } = margins(t);
      if (d.e === 0 || r1 === 0 || r2 === 0 || c1 === 0 || c2 === 0) return 0;
      const R = [r1, r2], C = [c1, c2];
      let s = 0;
      for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) { const E = R[a] * C[b] / d.e; s += (t.N[a][b] - E) ** 2 / E; }
      return s;
    },
  },
  mutualInfo: {
    id: 'mutualInfo', name: "Shannon's Onesie",
    history: 'information-theoretic co-clustering (Dhillon, Mallela & Modha 2003)',
    formula: 'I₁ = Σ (N_ab/e) log₂[(N_ab/e) / ((N_a·/e)(N_·b/e))]', blindSpot: 'Samples the ones: the row class of a random edge predicts its column class. A sparse checkerboard and a complete one both score 1 bit.',
    units: 'bits', orientationBlind: true,
    score(t, d) {
      const { r1, r2, c1, c2 } = margins(t);
      if (d.e === 0) return 0;
      const R = [r1, r2], C = [c1, c2];
      let s = 0;
      for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) {
        const N = t.N[a][b];
        if (N === 0) continue;
        s += (N / d.e) * LOG2((N / d.e) / ((R[a] / d.e) * (C[b] / d.e)));
      }
      return s;
    },
  },
  bernoulli: {
    id: 'bernoulli', name: 'The Full Bernoulli',
    history: 'block-Bernoulli likelihood ratio — the stochastic block model (Holland, Laskey & Leinhardt 1983), per cell',
    formula: 'I₂ = H(e/mn) − Σ (K_ab/mn) H(N_ab/K_ab)', blindSpot: 'Samples the cells, zeros included, so it sees density — but it treats every unobserved call as a real zero.',
    units: 'bits/cell', orientationBlind: true,
    score(t, d, { m, n }) {
      const mn = m * n;
      let s = H(d.e / mn);
      for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) {
        const K = t.K[a][b];
        if (K > 0) s -= (K / mn) * H(t.N[a][b] / K);
      }
      return s;
    },
  },
  modularity: {
    id: 'modularity', name: "Newman's Leftovers",
    history: 'modularity with a degree-product null (Newman & Girvan 2004); Barber\'s bipartite form (2007)',
    formula: 'Q = −xᵀ(M − rcᵀ/e)y / 2e', blindSpot: 'Its null r_i c_j / e can exceed 1 and matches the degrees only in expectation; it is what zeroes the trivial cut.',
    units: 'Q', orientationBlind: false,
    score(t, d) {
      if (d.e === 0) return 0;
      const { n11, n12, n21, n22, r1, r2, c1, c2 } = margins(t);
      const cut = n12 + n21 - n11 - n22;
      return (cut + (r1 - r2) * (c1 - c2) / d.e) / (2 * d.e);
    },
  },
  mdl: {
    id: 'mdl', name: "Occam's Invoice",
    history: 'minimum description length — two-part codes (Rissanen 1978; Wallace & Boulton 1968)',
    formula: 'bits saved = L(no split) − [L(cut) + Σ L(block)]', blindSpot: 'The most conservative judge: it pays for the cut and for every block\'s count before it saves a bit. Negative means "not worth describing".',
    units: 'bits saved', orientationBlind: true,
    score(t, d, { m, n }) {
      return noSplitCodeLength(m, n, d.e) - codeLength(t, m, n);
    },
  },
};

export const SCORE_IDS: ScoreId[] = ['edgeCount', 'hamming', 'pearson', 'mutualInfo', 'bernoulli', 'modularity', 'mdl'];

/** The one place the guard lives: a degenerate cut scores 0 for every judge. */
export function evaluate(M: BinaryMatrix, d: Degrees, spec: ScoreSpec, cut: Cut): number {
  const t = blockTable(M, cut);
  if (isDegenerate(t, M.m, M.n)) return 0;
  return spec.score(t, d, { m: M.m, n: M.n });
}

/* ── the Exhaustive Bailiff ── */

export interface Optimum {
  score: number;
  cut: Cut;
  /** How many distinct cuts (complement pairs counted once) attain the maximum. */
  ties: number;
}

/** Enumerate every nondegenerate cut (z₀ fixed to 1 removes the complement pair) and
 *  return the maximum. Feasible for m + n ≤ 20 (2^19 cuts). */
export function exactOptimum(M: BinaryMatrix, d: Degrees, spec: ScoreSpec, limit = 20): Optimum | null {
  if (M.m + M.n > limit || M.m < 2 || M.n < 2) return null;
  const { m, n } = M;
  let best = -Infinity, bestCut: Cut | null = null, ties = 0;
  const z = new Array<number>(m).fill(0), w = new Array<number>(n).fill(0);
  const zMax = 1 << (m - 1), wMax = 1 << n;
  for (let zb = 0; zb < zMax; zb++) {
    z[0] = 1;
    for (let i = 1; i < m; i++) z[i] = (zb >> (i - 1)) & 1;
    let nR1 = 0; for (let i = 0; i < m; i++) nR1 += z[i];
    if (nR1 === m) continue;
    for (let wb = 0; wb < wMax; wb++) {
      for (let j = 0; j < n; j++) w[j] = (wb >> j) & 1;
      const t = blockTable(M, { z, w });
      if (isDegenerate(t, m, n)) continue;
      const s = spec.score(t, d, { m, n });
      if (s > best + 1e-12) { best = s; bestCut = { z: z.slice(), w: w.slice() }; ties = 1; }
      else if (Math.abs(s - best) <= 1e-12) ties++;
    }
  }
  return bestCut ? { score: best, cut: bestCut, ties } : null;
}

/** A trap: strictly better than every single-locus flip. (Degenerate neighbors score 0.) */
export function isStrictLocalOptimum(M: BinaryMatrix, d: Degrees, spec: ScoreSpec, cut: Cut): boolean {
  const s0 = evaluate(M, d, spec, cut);
  for (let i = 0; i < M.m; i++) {
    const z = cut.z.slice(); z[i] ^= 1;
    if (evaluate(M, d, spec, { z, w: cut.w }) >= s0) return false;
  }
  for (let j = 0; j < M.n; j++) {
    const w = cut.w.slice(); w[j] ^= 1;
    if (evaluate(M, d, spec, { z: cut.z, w }) >= s0) return false;
  }
  return true;
}

/** Is `cut` (or its complement, or for orientation-blind judges its orientation twin)
 *  the same split as `other`? */
export function sameSplit(a: Cut, b: Cut, orientationBlind: boolean): boolean {
  const eq = (u: number[], v: number[]) => u.length === v.length && u.every((x, i) => x === v[i]);
  const neq = (u: number[], v: number[]) => u.length === v.length && u.every((x, i) => x === 1 - v[i]);
  if ((eq(a.z, b.z) && eq(a.w, b.w)) || (neq(a.z, b.z) && neq(a.w, b.w))) return true;
  if (!orientationBlind) return false;
  return (eq(a.z, b.z) && neq(a.w, b.w)) || (neq(a.z, b.z) && eq(a.w, b.w));
}
