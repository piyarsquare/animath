/* Stable Matching — the solution-space engine (rotations & the lattice).
 *
 * The set of stable matchings of an instance is a DISTRIBUTIVE LATTICE
 * (Conway): the A-proposing Gale–Shapley result is the top (best for A), the
 * B-proposing result the bottom. Every other stable matching is reached from the
 * top by eliminating "rotations" — small cycles that slide a group of A-members
 * each to their next stable partner.
 *
 * We enumerate the whole lattice by breadth-first rotation elimination from the
 * A-optimal matching. For our correlated instances the lattice is small (and
 * collapses to a single point at full consensus); a `cap` guards the #P-hard
 * worst case. `allStableBrute` is a reference implementation (all n! matchings)
 * used only to cross-check the fast path in tests.
 */
import type { Instance } from './model';
import { oneSided, blockingPairs, type Matching } from './galeShapley';

const sig = (m: Matching) => m.a.join(',');
const clone = (m: Matching): Matching => ({ a: m.a.slice(), b: m.b.slice() });

export interface MatchingScore {
  aTot: number; bTot: number; total: number;   // summed partner ranks (1 = best)
  maxRank: number;                              // the worst-off person's rank (for min-regret)
  diff: number;                                 // |A total − B total| (for sex-equal)
}

export function score(inst: Instance, M: Matching): MatchingScore {
  let aTot = 0, bTot = 0, maxRank = 0;
  for (let m = 0; m < inst.n; m++) if (M.a[m] !== -1) { const r = inst.rankA[m][M.a[m]] + 1; aTot += r; if (r > maxRank) maxRank = r; }
  for (let w = 0; w < inst.n; w++) if (M.b[w] !== -1) { const r = inst.rankB[w][M.b[w]] + 1; bTot += r; if (r > maxRank) maxRank = r; }
  return { aTot, bTot, total: aTot + bTot, maxRank, diff: Math.abs(aTot - bTot) };
}

/** next_M(m): the most-preferred woman strictly below M(m) on m's list who would
 *  rather have m than her current partner. −1 if none. */
function nextWoman(inst: Instance, M: Matching, m: number): number {
  const cur = M.a[m];
  if (cur === -1) return -1;
  const curRank = inst.rankA[m][cur];
  const prefs = inst.prefsA[m];
  for (let k = curRank + 1; k < inst.n; k++) {
    const w = prefs[k];
    const wp = M.b[w];
    if (wp === -1 || inst.rankB[w][m] < inst.rankB[w][wp]) return w;
  }
  return -1;
}

/** A rotation is a cycle of A-members; eliminating it moves each to next_M. */
export type Rotation = number[];

/** All rotations exposed in M = the cycles of f(m) = M(next_M(m)). */
export function exposedRotations(inst: Instance, M: Matching): Rotation[] {
  const n = inst.n;
  const f = new Array(n).fill(-1);
  for (let m = 0; m < n; m++) { const w = nextWoman(inst, M, m); f[m] = w === -1 ? -1 : M.b[w]; }
  const rots: Rotation[] = [];
  const state = new Array(n).fill(0); // 0 unvisited · 1 on current path · 2 settled
  for (let s = 0; s < n; s++) {
    if (state[s] !== 0 || f[s] === -1) continue;
    const path: number[] = [];
    const pos = new Map<number, number>();
    let m = s;
    while (m !== -1 && f[m] !== -1 && state[m] === 0) { state[m] = 1; pos.set(m, path.length); path.push(m); m = f[m]; }
    if (m !== -1 && state[m] === 1 && pos.has(m)) rots.push(path.slice(pos.get(m)!));
    for (const x of path) state[x] = 2;
  }
  return rots;
}

/** Eliminate a rotation exposed in M → the stable matching one step down. */
export function eliminateRotation(inst: Instance, M: Matching, rot: Rotation): Matching {
  const N = clone(M);
  const targets = rot.map(m => nextWoman(inst, M, m));   // computed on the ORIGINAL M
  for (let i = 0; i < rot.length; i++) { const m = rot[i], w = targets[i]; if (w !== -1) { N.a[m] = w; N.b[w] = m; } }
  return N;
}

export interface StableSet { matchings: Matching[]; capped: boolean; }

/** Enumerate every stable matching by BFS rotation-elimination from A-optimal. */
export function allStableMatchings(inst: Instance, cap = 2000): StableSet {
  const start = oneSided(inst, 'A').matching;
  const seen = new Map<string, Matching>([[sig(start), start]]);
  const queue: Matching[] = [start];
  let capped = false;
  while (queue.length) {
    const M = queue.shift()!;
    for (const rot of exposedRotations(inst, M)) {
      const N = eliminateRotation(inst, M, rot);
      const s = sig(N);
      if (!seen.has(s)) {
        seen.set(s, N);
        if (seen.size >= cap) { capped = true; queue.length = 0; break; }
        queue.push(N);
      }
    }
  }
  return { matchings: [...seen.values()], capped };
}

export interface Footprint { pairs: Set<string>; count: number; capped: boolean; }

/** Every (A,B) cell matched in SOME stable matching, plus the lattice size. */
export function stablePairs(inst: Instance, cap = 2000): Footprint {
  const { matchings, capped } = allStableMatchings(inst, cap);
  const pairs = new Set<string>();
  for (const M of matchings) for (let m = 0; m < inst.n; m++) if (M.a[m] !== -1) pairs.add(`${m}-${M.a[m]}`);
  return { pairs, count: matchings.length, capped };
}

export type NamedKey = 'aOptimal' | 'bOptimal' | 'egalitarian' | 'median' | 'minRegret' | 'sexEqual' | 'balanced';
export const NAMED_LABELS: Record<NamedKey, string> = {
  aOptimal: 'A-optimal', bOptimal: 'B-optimal', egalitarian: 'Egalitarian',
  median: 'Median', minRegret: 'Min-regret', sexEqual: 'Sex-equal', balanced: 'Balanced',
};

/** The median stable matching (Teo–Sethuraman): each A-member gets the median of
 *  their stable partners ordered by their own preference. Provably stable. */
function medianMatching(inst: Instance, set: Matching[]): Matching {
  const n = inst.n;
  const a = new Array(n).fill(-1), b = new Array(n).fill(-1);
  for (let m = 0; m < n; m++) {
    const partners = set.map(M => M.a[m]).filter(w => w !== -1);
    partners.sort((x, y) => inst.rankA[m][x] - inst.rankA[m][y]); // best→worst for m
    const w = partners.length ? partners[Math.floor((partners.length - 1) / 2)] : -1;
    a[m] = w; if (w !== -1) b[w] = m;
  }
  return { a, b };
}

/** Locate the canonical "named" stable matchings within the enumerated set. */
export function namedSolutions(inst: Instance, set: Matching[]): Record<NamedKey, Matching> {
  const aOptimal = oneSided(inst, 'A').matching;
  const bOptimal = oneSided(inst, 'B').matching;
  const pick = (key: (s: MatchingScore) => number): Matching =>
    set.reduce((best, M) => (key(score(inst, M)) < key(score(inst, best)) ? M : best), set[0]);
  return {
    aOptimal, bOptimal,
    egalitarian: pick(s => s.total),
    minRegret: pick(s => s.maxRank),
    sexEqual: pick(s => s.diff),
    balanced: pick(s => Math.max(s.aTot, s.bTot)),
    median: medianMatching(inst, set),
  };
}

/* ── Lattice order (for the Hasse diagram) ──────────────────────────────────
 * M ≤ M' iff every A-member weakly prefers their partner in M. A covers B when
 * B < A with nothing strictly between — these covering edges are single rotations.
 */
export function leq(inst: Instance, lo: Matching, hi: Matching): boolean {
  for (let m = 0; m < inst.n; m++) {
    const rl = lo.a[m] === -1 ? Infinity : inst.rankA[m][lo.a[m]];
    const rh = hi.a[m] === -1 ? Infinity : inst.rankA[m][hi.a[m]];
    if (rl > rh) return false; // lo must be at least as good for A everywhere
  }
  return true;
}

export interface Lattice { nodes: Matching[]; covers: [number, number][]; rank: number[]; }

/** Build the lattice Hasse diagram (A-optimal = rank 0 at top). */
export function buildLattice(inst: Instance, set: Matching[]): Lattice {
  const nodes = set.slice();
  const N = nodes.length;
  // strict-below adjacency: i strictlyBelow j (j better for A than i)
  const below: boolean[][] = Array.from({ length: N }, () => new Array(N).fill(false));
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    if (i !== j && leq(inst, nodes[i], nodes[j]) && sig(nodes[i]) !== sig(nodes[j])) below[i][j] = true;
  }
  // covering: j covers i if below[i][j] and no k strictly between
  const covers: [number, number][] = [];
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    if (!below[i][j]) continue;
    let direct = true;
    for (let k = 0; k < N && direct; k++) if (k !== i && k !== j && below[i][k] && below[k][j]) direct = false;
    if (direct) covers.push([i, j]); // i (lower) ← j (higher / better for A)
  }
  // rank = longest chain length from A-optimal (the unique top: better-for-A than all)
  const aTotOf = (M: Matching) => score(inst, M).aTot;
  const rank = nodes.map(aTotOf); // A-total: A-optimal has the smallest → use as depth proxy
  const minR = Math.min(...rank);
  return { nodes, covers, rank: rank.map(r => r - minR) };
}

export interface LatticeLayout {
  pos: { x: number; y: number }[];   // normalized [0,1] node positions (y: 0 = A-optimal top)
  edges: [number, number][];          // covering edges [lower, upper]
  layers: number;                     // number of distinct levels
}

/** Layered (Hasse) layout: y by longest-path depth from the A-optimal top, x by
 *  parent barycenter to reduce crossings. */
export function layoutLattice(inst: Instance, set: Matching[]): LatticeLayout {
  const { covers } = buildLattice(inst, set);   // each cover is [upper, lower] (upper = better for A)
  const N = set.length;
  const aTot = set.map(M => score(inst, M).aTot);
  const order = Array.from({ length: N }, (_, i) => i).sort((p, q) => aTot[p] - aTot[q]); // top (best for A) first
  const parents: number[][] = Array.from({ length: N }, () => []); // nodes directly above
  for (const [up, lo] of covers) parents[lo].push(up);
  const layer = new Array(N).fill(0);
  for (const node of order) for (const [up, lo] of covers) if (up === node) layer[lo] = Math.max(layer[lo], layer[node] + 1);
  const maxLayer = Math.max(1, ...layer);
  // group by layer, order each layer by mean parent x (computed top-down)
  const byLayer: number[][] = Array.from({ length: maxLayer + 1 }, () => []);
  for (let i = 0; i < N; i++) byLayer[layer[i]].push(i);
  const x = new Array(N).fill(0.5);
  for (let L = 0; L <= maxLayer; L++) {
    const row = byLayer[L];
    if (L > 0) row.sort((p, q) => {
      const bx = (k: number) => parents[k].length ? parents[k].reduce((s, h) => s + x[h], 0) / parents[k].length : 0.5;
      return bx(p) - bx(q);
    });
    row.forEach((i, k) => { x[i] = row.length === 1 ? 0.5 : k / (row.length - 1); });
  }
  const pos = Array.from({ length: N }, (_, i) => ({ x: x[i], y: maxLayer ? layer[i] / maxLayer : 0 }));
  return { pos, edges: covers, layers: maxLayer + 1 };
}

/* ── Brute-force reference (tests only) ─────────────────────────────────────── */
export function allStableBrute(inst: Instance): Matching[] {
  const n = inst.n, res: Matching[] = [];
  const perm = new Array(n).fill(-1), used = new Array(n).fill(false);
  const rec = (i: number) => {
    if (i === n) {
      const a = perm.slice(), b = new Array(n).fill(-1);
      for (let m = 0; m < n; m++) b[a[m]] = m;
      if (blockingPairs(inst, { a, b }) === 0) res.push({ a, b });
      return;
    }
    for (let w = 0; w < n; w++) if (!used[w]) { used[w] = true; perm[i] = w; rec(i + 1); used[w] = false; }
  };
  rec(0);
  return res;
}
