/**
 * Split Decision — the matrix, the cut, and the block table.
 *
 * Two separately typed structures, on purpose: `Degrees` {r, c, e} belong to the
 * matrix and never change; `BlockTable` {N, K} belongs to a cut and changes with it.
 * The aggregated table margins N_a· / N_·b are NOT the degree vectors (the
 * monograph's "two margin statements can both be true", page 23).
 */

import { mulberry32, type Rng } from '@/lib/rng';

export interface BinaryMatrix {
  m: number;
  n: number;
  /** Row-major 0/1 cells, length m·n. */
  cells: Uint8Array;
  /** The ones as (i, j) pairs — the only thing the block count iterates. */
  ones: Array<[number, number]>;
}

export interface Degrees {
  r: number[];
  c: number[];
  e: number;
}

/** A labeled cut: z_i = 1 puts row i in R₁, w_j = 1 puts column j in C₁. */
export interface Cut {
  z: number[];
  w: number[];
}

/** Block counts N_ab and capacities K_ab, a,b ∈ {1,2} indexed 0/1 (a = 0 ⇔ R₁). */
export interface BlockTable {
  N: [[number, number], [number, number]];
  K: [[number, number], [number, number]];
  /** |R₁| and |C₁|. */
  nR1: number;
  nC1: number;
}

export function fromRows(rows: Array<string | number[]>): BinaryMatrix {
  const m = rows.length;
  const n = rows[0].length;
  const cells = new Uint8Array(m * n);
  const ones: Array<[number, number]> = [];
  rows.forEach((row, i) => {
    for (let j = 0; j < n; j++) {
      const v = typeof row === 'string' ? (row[j] === '1' ? 1 : 0) : (row[j] ? 1 : 0);
      cells[i * n + j] = v;
      if (v) ones.push([i, j]);
    }
  });
  return { m, n, cells, ones };
}

export function fromCells(m: number, n: number, cells: Uint8Array): BinaryMatrix {
  const ones: Array<[number, number]> = [];
  for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) if (cells[i * n + j]) ones.push([i, j]);
  return { m, n, cells: cells.slice(), ones };
}

export function toggleCell(M: BinaryMatrix, i: number, j: number): BinaryMatrix {
  const cells = M.cells.slice();
  cells[i * M.n + j] ^= 1;
  return fromCells(M.m, M.n, cells);
}

export function transpose(M: BinaryMatrix): BinaryMatrix {
  const cells = new Uint8Array(M.m * M.n);
  for (let i = 0; i < M.m; i++) for (let j = 0; j < M.n; j++) cells[j * M.m + i] = M.cells[i * M.n + j];
  return fromCells(M.n, M.m, cells);
}

export function degrees(M: BinaryMatrix): Degrees {
  const r = new Array<number>(M.m).fill(0);
  const c = new Array<number>(M.n).fill(0);
  for (const [i, j] of M.ones) { r[i]++; c[j]++; }
  return { r, c, e: M.ones.length };
}

/** Count the 2×2 block table of a cut — one pass over the ones, O(e + m + n). */
export function blockTable(M: BinaryMatrix, cut: Cut): BlockTable {
  let nR1 = 0, nC1 = 0;
  for (let i = 0; i < M.m; i++) nR1 += cut.z[i];
  for (let j = 0; j < M.n; j++) nC1 += cut.w[j];
  const N: BlockTable['N'] = [[0, 0], [0, 0]];
  for (const [i, j] of M.ones) N[cut.z[i] ? 0 : 1][cut.w[j] ? 0 : 1]++;
  const nR2 = M.m - nR1, nC2 = M.n - nC1;
  const K: BlockTable['K'] = [[nR1 * nC1, nR1 * nC2], [nR2 * nC1, nR2 * nC2]];
  return { N, K, nR1, nC1 };
}

/** A cut with an empty class on either side. */
export function isDegenerate(t: BlockTable, m: number, n: number): boolean {
  return t.nR1 === 0 || t.nR1 === m || t.nC1 === 0 || t.nC1 === n;
}

export function complementCut(cut: Cut): Cut {
  return { z: cut.z.map(v => 1 - v), w: cut.w.map(v => 1 - v) };
}

/* ── Tarjan's Handshake: does a zero-violation cut with four nonempty classes exist? ── */

/** Exact criterion (monograph p. 12): at least two connected components touch the row
 *  side and at least two touch the column side, counting isolated vertices as
 *  singleton components. O(m + n + e). */
export function handshake(M: BinaryMatrix): boolean {
  const V = M.m + M.n;
  const parent = Array.from({ length: V }, (_, i) => i);
  const find = (x: number): number => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
  for (const [i, j] of M.ones) { const a = find(i), b = find(M.m + j); if (a !== b) parent[a] = b; }
  const touchesRow = new Set<number>(), touchesCol = new Set<number>();
  for (let i = 0; i < M.m; i++) touchesRow.add(find(i));
  for (let j = 0; j < M.n; j++) touchesCol.add(find(M.m + j));
  return touchesRow.size >= 2 && touchesCol.size >= 2;
}

/* ── Fixtures (quoted verbatim from the monograph, September 2026) ── */

export interface Fixture {
  id: string;
  name: string;
  blurb: string;
  matrix: BinaryMatrix;
  /** The structural split, in the app's orientation (R₁×C₂ and R₂×C₁ carry the ones). */
  planted: Cut | null;
}

/** Page 46, "Two moderate-sized valid partitions". Rows 1–4 connect only to columns
 *  6–10, rows 5–8 only to columns 1–5. */
const EIGHT_BY_TEN_COMPLETE = [
  '0000011111', '0000011111', '0000011111', '0000011111',
  '1111100000', '1111100000', '1111100000', '1111100000',
];
const EIGHT_BY_TEN_SPARSE = [
  '0000011000', '0000001100', '0000000110', '0000010011',
  '1000100000', '1100000000', '0110000000', '0011100000',
];
/** Planted cut for both 8×10s: rows 1–4 in R₁; columns 1–5 in C₁ (so R₁×C₂ = rows 1–4 × columns 6–10). */
const EIGHT_BY_TEN_CUT: Cut = { z: [1, 1, 1, 1, 0, 0, 0, 0], w: [1, 1, 1, 1, 1, 0, 0, 0, 0, 0] };

/** Page 47, the observed matrix of the 90-matrix fiber (two complete 2×2 cross-blocks). */
const NINETY_OBSERVED = ['0011', '0011', '1100', '1100'];
const NINETY_CUT: Cut = { z: [1, 1, 0, 0], w: [1, 1, 0, 0] };

/** Page 50, the alternating-best-response counterexample. Under Barber modularity the
 *  cut below is a strict local optimum under every single-locus flip (0.173) but not
 *  the global optimum (0.271). */
const PAGE50 = ['1000', '0011', '1011', '1110'];
export const PAGE50_TRAP_CUT: Cut = { z: [0, 1, 0, 1], w: [1, 0, 0, 1] };

export const FIXTURES: Fixture[] = [
  { id: 'complete-8x10', name: 'Complete 8×10', blurb: 'Two full cross-blocks, 40 edges.', matrix: fromRows(EIGHT_BY_TEN_COMPLETE), planted: EIGHT_BY_TEN_CUT },
  { id: 'sparse-8x10', name: 'Sparse 8×10', blurb: 'The same split, 18 edges — each cross-block a connected chain.', matrix: fromRows(EIGHT_BY_TEN_SPARSE), planted: EIGHT_BY_TEN_CUT },
  { id: 'ninety-4x4', name: 'The Ninety (4×4)', blurb: 'Every row and column has degree 2; 90 matrices share these degrees.', matrix: fromRows(NINETY_OBSERVED), planted: NINETY_CUT },
  { id: 'page50-4x4', name: 'Two-Step trap (4×4)', blurb: 'Where alternating best responses stop too early.', matrix: fromRows(PAGE50), planted: null },
];

export function fixtureById(id: string): Fixture | undefined {
  return FIXTURES.find(f => f.id === id);
}

/* ── Planted checkerboard generator ── */

export interface PlantedSpec {
  m: number;
  n: number;
  /** |R₁| and |C₁| of the planted split. */
  r1: number;
  c1: number;
  /** Cross-block density (R₁×C₂ and R₂×C₁) and diagonal-block density. */
  rhoIn: number;
  rhoOut: number;
}

export interface Planted {
  matrix: BinaryMatrix;
  /** The planted cut in the app's orientation, in the (shuffled) stored order. */
  planted: Cut;
  /** Stored row i is planted row rowPerm[i]; likewise columns. */
  rowPerm: number[];
  colPerm: number[];
}

function shuffled(n: number, rng: Rng): number[] {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/** Draw a planted matrix. Rows and columns are shuffled so the split is not visible in
 *  stored order — the Arena's sort is what reveals it. Deterministic in `seed`.
 *  Draw order: rowPerm, colPerm, then cells row-major. */
export function planted(spec: PlantedSpec, seed: number): Planted {
  const rng = mulberry32(seed);
  const { m, n, r1, c1, rhoIn, rhoOut } = spec;
  const rowPerm = shuffled(m, rng);
  const colPerm = shuffled(n, rng);
  const cells = new Uint8Array(m * n);
  const z = new Array<number>(m).fill(0), w = new Array<number>(n).fill(0);
  for (let i = 0; i < m; i++) z[i] = rowPerm[i] < r1 ? 1 : 0;
  for (let j = 0; j < n; j++) w[j] = colPerm[j] < c1 ? 1 : 0;
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      const cross = z[i] !== w[j];
      cells[i * n + j] = rng() < (cross ? rhoIn : rhoOut) ? 1 : 0;
    }
  }
  return { matrix: fromCells(m, n, cells), planted: { z, w }, rowPerm, colPerm };
}

/** Signal s ∈ [0, 1] ↦ densities: s = 1 is a perfect checkerboard, s = 0 is noise at ½. */
export function densitiesForSignal(s: number): { rhoIn: number; rhoOut: number } {
  return { rhoIn: 0.5 + s / 2, rhoOut: 0.5 - s / 2 };
}
