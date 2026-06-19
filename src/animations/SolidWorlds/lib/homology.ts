/**
 * Solid Worlds — H₁ and the Euler characteristic from the cellular chain complex
 * of the glued cube (pure integer linear algebra, Three.js-free).
 *
 * The cube gives a CW structure on the quotient 3-manifold: one 3-cell, three
 * 2-cells (the glued face pairs), and the edge/vertex classes the face-pairings
 * identify. We build the integer boundary maps ∂₂ (faces → edges) and ∂₁ (edges
 * → vertices) and read homology off their Smith normal forms:
 *
 *     rank H₁ = (#edge-classes) − rank ∂₁ − rank ∂₂
 *     torsion H₁ = the invariant factors > 1 of ∂₂
 *
 * This turns the catalog's H₁ values from asserted facts into *computed,
 * cross-checked* invariants (see the unit tests). χ = V − E + F − 1 must be 0 for
 * a closed 3-manifold — a necessary manifold sanity check (the full vertex-link =
 * S² certificate is a later step).
 */

import { M3, Pairing, SolidWorldSpec, axisIndex } from '../solidSchema';

type V3 = [number, number, number];

// Cube on [−1, 1]³; vertex i packs the sign bits (x: bit0, y: bit1, z: bit2).
const EDGE_LEN = 2;
const vCoord = (i: number): V3 => [(i & 1) ? 1 : -1, (i & 2) ? 1 : -1, (i & 4) ? 1 : -1];
const vIndex = (c: V3): number => (c[0] > 0 ? 1 : 0) | (c[1] > 0 ? 2 : 0) | (c[2] > 0 ? 4 : 0);

const applyM3 = (m: M3, v: V3): V3 => [
  m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
  m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
  m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
];

/** g(v) = M·v + t, with t the edge-length step along the pairing's axis plus the
 *  optional off-axis `offset` (also in edge-length units — a screw component). */
function pairingMap(p: Pairing, v: V3): V3 {
  const w = applyM3(p.linear, v);
  const i = axisIndex(p.axis);
  w[i] += EDGE_LEN;
  if (p.offset) { w[0] += p.offset[0] * EDGE_LEN; w[1] += p.offset[1] * EDGE_LEN; w[2] += p.offset[2] * EDGE_LEN; }
  return w;
}

// The 12 cube edges as canonical [lo, hi] vertex-index pairs (lo < hi).
const EDGES: [number, number][] = (() => {
  const out: [number, number][] = [];
  for (let a = 0; a < 8; a++) for (let b = a + 1; b < 8; b++) {
    const d = a ^ b;
    if (d === 1 || d === 2 || d === 4) out.push([a, b]); // differ in one axis
  }
  return out;
})();
const edgeKey = (a: number, b: number) => (a < b ? a * 8 + b : b * 8 + a);
const EDGE_INDEX = new Map(EDGES.map(([a, b], i) => [edgeKey(a, b), i]));

// The 4 boundary vertices of a face (axis, sign=±1), as a proper 4-cycle.
function faceCycle(axis: 0 | 1 | 2, sign: number): number[] {
  const others = [0, 1, 2].filter((x) => x !== axis);
  const corner = (bv: number, cv: number): number => {
    const c: V3 = [0, 0, 0];
    c[axis] = sign; c[others[0]] = bv ? 1 : -1; c[others[1]] = cv ? 1 : -1;
    return vIndex(c);
  };
  return [corner(0, 0), corner(1, 0), corner(1, 1), corner(0, 1)];
}

// ── signed union-find (edges identify up to orientation) ────────────────────
class SignedUF {
  parent: number[]; sign: number[];
  constructor(n: number) { this.parent = [...Array(n).keys()]; this.sign = new Array(n).fill(1); }
  find(i: number): { root: number; sign: number } {
    if (this.parent[i] === i) return { root: i, sign: 1 };
    const r = this.find(this.parent[i]);
    this.parent[i] = r.root; this.sign[i] = this.sign[i] * r.sign;
    return { root: r.root, sign: this.sign[i] };
  }
  union(i: number, j: number, rel: number) { // item i = rel · item j
    const a = this.find(i), b = this.find(j);
    if (a.root === b.root) return;
    this.parent[a.root] = b.root;
    this.sign[a.root] = a.sign * rel * b.sign;
  }
}

class UF {
  parent: number[];
  constructor(n: number) { this.parent = [...Array(n).keys()]; }
  find(i: number): number { return this.parent[i] === i ? i : (this.parent[i] = this.find(this.parent[i])); }
  union(i: number, j: number) { this.parent[this.find(i)] = this.find(j); }
}

const gcd = (a: number, b: number): number => { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a; };

/** Smith normal form (diagonalize by integer row/col ops); returns the nonzero
 *  diagonal entries as canonical invariant factors (d₁ | d₂ | …). */
function smith(mat: number[][]): number[] {
  const A = mat.map((r) => r.slice());
  const rows = A.length, cols = rows ? A[0].length : 0;
  const ds: number[] = [];
  let r = 0, c = 0;
  while (r < rows && c < cols) {
    let pi = -1, pj = -1, best = Infinity;
    for (let i = r; i < rows; i++) for (let j = c; j < cols; j++) {
      const v = Math.abs(A[i][j]); if (v !== 0 && v < best) { best = v; pi = i; pj = j; }
    }
    if (pi === -1) break;
    [A[r], A[pi]] = [A[pi], A[r]];
    for (let i = 0; i < rows; i++) { const tmp = A[i][c]; A[i][c] = A[i][pj]; A[i][pj] = tmp; }
    let done = false;
    while (!done) {
      done = true;
      for (let i = 0; i < rows; i++) {
        if (i === r || A[i][c] === 0) continue;
        const q = Math.round(A[i][c] / A[r][c]);
        for (let j = c; j < cols; j++) A[i][j] -= q * A[r][j];
        if (A[i][c] !== 0) done = false;
      }
      for (let j = 0; j < cols; j++) {
        if (j === c || A[r][j] === 0) continue;
        const q = Math.round(A[r][j] / A[r][c]);
        for (let i = 0; i < rows; i++) A[i][j] -= q * A[i][c];
        if (A[r][j] !== 0) done = false;
      }
    }
    ds.push(Math.abs(A[r][c]));
    r++; c++;
  }
  // enforce the divisibility chain → canonical invariant factors
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < ds.length; i++) for (let j = i + 1; j < ds.length; j++) {
      const g = gcd(ds[i], ds[j]);
      if (g !== ds[i]) { const l = (ds[i] / g) * ds[j]; ds[i] = g; ds[j] = l; changed = true; }
    }
  }
  return ds;
}

export interface Homology {
  /** Free rank of H₁ (the number of ℤ summands). */
  rank: number;
  /** Torsion invariant factors (> 1) of H₁, e.g. [2, 2] for (ℤ/2)². */
  torsion: number[];
  /** Pretty-printed H₁, e.g. "ℤ² ⊕ ℤ/2". */
  h1: string;
  /** Euler characteristic V − E + F − 1; must be 0 for a closed 3-manifold. */
  euler: number;
  vertexClasses: number;
  edgeClasses: number;
}

export function computeHomology(spec: SolidWorldSpec): Homology {
  const vUF = new UF(8);
  const eUF = new SignedUF(12);

  for (const p of spec.pairings) {
    const a = axisIndex(p.axis);
    // vertices on the −axis face glue to their images on the +axis face
    for (let i = 0; i < 8; i++) {
      const v = vCoord(i);
      if (v[a] !== -1) continue;
      vUF.union(i, vIndex(pairingMap(p, v)));
    }
    // the four edges of the −axis face glue to their images (with orientation)
    for (let ei = 0; ei < 12; ei++) {
      const [lo, hi] = EDGES[ei];
      const clo = vCoord(lo), chi = vCoord(hi);
      if (clo[a] !== -1 || chi[a] !== -1) continue; // edge not on the −face
      const ilo = vIndex(pairingMap(p, clo)), ihi = vIndex(pairingMap(p, chi));
      const tj = EDGE_INDEX.get(edgeKey(ilo, ihi))!;
      const [tlo] = EDGES[tj];
      const rel = (ilo === tlo) ? 1 : -1; // image direction vs the target's canonical
      eUF.union(ei, tj, rel);
    }
  }

  // class index maps
  const vClassId = new Map<number, number>();
  for (let i = 0; i < 8; i++) { const r = vUF.find(i); if (!vClassId.has(r)) vClassId.set(r, vClassId.size); }
  const eClassId = new Map<number, number>();
  for (let i = 0; i < 12; i++) { const r = eUF.find(i).root; if (!eClassId.has(r)) eClassId.set(r, eClassId.size); }
  const nV = vClassId.size, nE = eClassId.size, nF = 3;

  const eClassOf = (i: number) => { const f = eUF.find(i); return { id: eClassId.get(f.root)!, sign: f.sign }; };

  // ∂₁: edge-class → vertex-class (rep edge canonical lo→hi gives +hi −lo)
  const d1: number[][] = Array.from({ length: nE }, () => new Array(nV).fill(0));
  for (const [root, id] of eClassId) {
    const [lo, hi] = EDGES[root];
    d1[id][vClassId.get(vUF.find(hi))!] += 1;
    d1[id][vClassId.get(vUF.find(lo))!] -= 1;
  }

  // ∂₂: face-class (the −axis face of each pair) → edge-classes
  const d2: number[][] = Array.from({ length: nF }, () => new Array(nE).fill(0));
  spec.pairings.forEach((p, fi) => {
    const a = axisIndex(p.axis) as 0 | 1 | 2;
    const cyc = faceCycle(a, -1);
    for (let k = 0; k < 4; k++) {
      const u = cyc[k], v = cyc[(k + 1) % 4];
      const ei = EDGE_INDEX.get(edgeKey(u, v))!;
      const [lo] = EDGES[ei];
      const trav = (u === lo) ? 1 : -1; // traversal direction vs canonical
      const ec = eClassOf(ei);
      d2[fi][ec.id] += trav * ec.sign;
    }
  });

  const rank1 = smith(d1).length;
  const inv2 = smith(d2);
  const rank2 = inv2.length;
  const torsion = inv2.filter((d) => d > 1);
  const rank = nE - rank1 - rank2;
  const euler = nV - nE + nF - 1;

  return { rank, torsion, h1: formatH1(rank, torsion), euler, vertexClasses: nV, edgeClasses: nE };
}

function formatH1(rank: number, torsion: number[]): string {
  const parts: string[] = [];
  if (rank === 1) parts.push('ℤ');
  else if (rank > 1) parts.push(`ℤ${superscript(rank)}`);
  for (const d of torsion) parts.push(`ℤ/${d}`);
  return parts.length ? parts.join(' ⊕ ') : '0';
}

function superscript(n: number): string {
  const map: Record<string, string> = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
  return String(n).split('').map((c) => map[c] ?? c).join('');
}
