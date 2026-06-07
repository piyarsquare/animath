/* Stable Matching — the pure engine (Gale–Shapley deferred acceptance).
 *
 * One engine, two modes:
 *   - one-sided: a fixed side proposes. This is classical Gale–Shapley; the
 *     result is the proposer-optimal / receiver-pessimal stable matching, and
 *     the theorem holds exactly.
 *   - market: each step a coin (weighted by `bias`) picks which side proposes —
 *     an idealized two-sided market. Still lands on *a* stable matching, but not
 *     a canonical one; framed honestly as emergent, not the theorem.
 *
 * `run` returns the final matching plus a replayable `log` of proposal events,
 * so the visualizer can step/animate without re-deriving the algorithm.
 *
 * The honest "how much does proposing matter" metric is `extremal`: run one-sided
 * from each side and measure the gap between the two extremal stable matchings. It
 * collapses to zero under full common preference (a unique stable matching).
 */
import type { Instance } from './model';
import { mulberry32 } from './model';

export type Side = 'A' | 'B';

/** a[i] = group-A member i's partner in B (or −1); b[j] = B member j's partner in A. */
export interface Matching { a: number[]; b: number[]; }

export interface ProposalEvent {
  proposer: { side: Side; id: number };
  receiver: { side: Side; id: number };
  outcome: 'accept' | 'reject' | 'bump';
  /** proposer-side id displaced on a 'bump'. */
  displaced?: number;
}

export interface RunResult { matching: Matching; log: ProposalEvent[]; }

export type Mode =
  | { kind: 'one-sided'; proposer: Side }
  | { kind: 'market'; bias: number; seed: number };

const empty = (n: number): Matching => ({ a: new Array(n).fill(-1), b: new Array(n).fill(-1) });
const other = (s: Side): Side => (s === 'A' ? 'B' : 'A');

/** One proposal by member `p` of `side`, mutating `m`; pushes the event to `log`. */
function propose(inst: Instance, m: Matching, next: number[], side: Side, p: number, log: ProposalEvent[]): void {
  const propPrefs = side === 'A' ? inst.prefsA : inst.prefsB;
  const recvRank = side === 'A' ? inst.rankB : inst.rankA; // receiver's rank of a proposer
  const propMatch = side === 'A' ? m.a : m.b;
  const recvMatch = side === 'A' ? m.b : m.a;
  const recv = other(side);

  const r = propPrefs[p][next[p]++];
  const cur = recvMatch[r];
  if (cur === -1) {
    recvMatch[r] = p; propMatch[p] = r;
    log.push({ proposer: { side, id: p }, receiver: { side: recv, id: r }, outcome: 'accept' });
  } else if (recvRank[r][p] < recvRank[r][cur]) {
    recvMatch[r] = p; propMatch[p] = r; propMatch[cur] = -1;
    log.push({ proposer: { side, id: p }, receiver: { side: recv, id: r }, outcome: 'bump', displaced: cur });
  } else {
    log.push({ proposer: { side, id: p }, receiver: { side: recv, id: r }, outcome: 'reject' });
  }
}

/** Classical one-sided Gale–Shapley → proposer-optimal stable matching. */
export function oneSided(inst: Instance, proposer: Side): RunResult {
  const n = inst.n;
  const m = empty(n);
  const log: ProposalEvent[] = [];
  const next = new Array(n).fill(0);
  const propMatch = proposer === 'A' ? m.a : m.b;
  const free: number[] = Array.from({ length: n }, (_, i) => i);

  while (free.length) {
    const p = free[0];
    if (next[p] >= n) { free.shift(); continue; }        // exhausted list → stays single
    const before = propMatch[p];
    propose(inst, m, next, proposer, p, log);
    if (propMatch[p] !== before && propMatch[p] !== -1) {
      free.shift();                                       // p got engaged
      const last = log[log.length - 1];
      if (last.outcome === 'bump' && last.displaced !== undefined) free.push(last.displaced);
    }
    // reject → p keeps its slot at the front and tries its next choice
  }
  return { matching: m, log };
}

/** Two-sided market: each step, a bias-weighted coin picks the proposing side. */
export function market(inst: Instance, bias: number, seed: number): RunResult {
  const n = inst.n;
  const m = empty(n);
  const log: ProposalEvent[] = [];
  // offset the seed so the proposer randomness is independent of the stream that
  // generated the preferences (which used mulberry32(seed) directly).
  const rnd = mulberry32((seed ^ 0x9e3779b9) >>> 0);
  const nextA = new Array(n).fill(0);
  const nextB = new Array(n).fill(0);
  const maxLoops = n * n * 5;

  for (let loops = 0; loops < maxLoops; loops++) {
    const freeA: number[] = [];
    const freeB: number[] = [];
    for (let i = 0; i < n; i++) {
      if (m.a[i] === -1 && nextA[i] < n) freeA.push(i);
      if (m.b[i] === -1 && nextB[i] < n) freeB.push(i);
    }
    if (!freeA.length && !freeB.length) break;
    let side: Side;
    if (freeA.length && !freeB.length) side = 'A';
    else if (freeB.length && !freeA.length) side = 'B';
    else side = rnd() < bias / 100 ? 'A' : 'B';
    const pool = side === 'A' ? freeA : freeB;
    const p = pool[Math.floor(rnd() * pool.length)];
    propose(inst, m, side === 'A' ? nextA : nextB, side, p, log);
  }
  return { matching: m, log };
}

export function run(inst: Instance, mode: Mode): RunResult {
  return mode.kind === 'one-sided' ? oneSided(inst, mode.proposer) : market(inst, mode.bias, mode.seed);
}

/** Replay the first `upto` events into a matching (for step-through animation). */
export function applyLog(n: number, log: ProposalEvent[], upto: number): Matching {
  const m = empty(n);
  for (let k = 0; k < upto && k < log.length; k++) {
    const e = log[k];
    const prop = e.proposer.side === 'A' ? m.a : m.b;
    const recv = e.receiver.side === 'A' ? m.a : m.b;
    if (e.outcome === 'accept') { prop[e.proposer.id] = e.receiver.id; recv[e.receiver.id] = e.proposer.id; }
    else if (e.outcome === 'bump') {
      if (e.displaced !== undefined) prop[e.displaced] = -1;
      prop[e.proposer.id] = e.receiver.id; recv[e.receiver.id] = e.proposer.id;
    }
  }
  return m;
}

/** Count blocking pairs (a not-matched pair who both prefer each other). 0 ⇒ stable. */
export function blockingPairs(inst: Instance, m: Matching): number {
  const n = inst.n;
  let count = 0;
  for (let i = 0; i < n; i++) {
    const partnerRank = m.a[i] === -1 ? Infinity : inst.rankA[i][m.a[i]];
    for (let j = 0; j < n; j++) {
      if (m.a[i] === j) continue;
      if (inst.rankA[i][j] < partnerRank) {                       // A i prefers B j
        const jPartnerRank = m.b[j] === -1 ? Infinity : inst.rankB[j][m.b[j]];
        if (inst.rankB[j][i] < jPartnerRank) count++;             // …and B j prefers A i
      }
    }
  }
  return count;
}

export interface Stats {
  aAvg: number; bAvg: number;          // average partner rank (1 = best), over matched members
  aRanks: number[]; bRanks: number[];  // rank-frequency histograms (index 0 = rank 1)
  matched: number; unmatched: number;
}

export function stats(inst: Instance, m: Matching): Stats {
  const n = inst.n;
  const aRanks = new Array(n).fill(0);
  const bRanks = new Array(n).fill(0);
  let aSum = 0, bSum = 0, aC = 0, bC = 0;
  for (let i = 0; i < n; i++) {
    if (m.a[i] !== -1) { const r = inst.rankA[i][m.a[i]] + 1; aRanks[r - 1]++; aSum += r; aC++; }
  }
  for (let j = 0; j < n; j++) {
    if (m.b[j] !== -1) { const r = inst.rankB[j][m.b[j]] + 1; bRanks[r - 1]++; bSum += r; bC++; }
  }
  return { aAvg: aC ? aSum / aC : 0, bAvg: bC ? bSum / bC : 0, aRanks, bRanks, matched: aC, unmatched: n - aC };
}

export interface Extremal {
  aOptimal: Matching; bOptimal: Matching;
  /** How much worse A does in the B-optimal matching vs its own A-optimal one (≥0). */
  aGap: number;
  bGap: number;
}

/** The honest "how much does proposing matter" metric: the span of the stable set. */
export function extremal(inst: Instance): Extremal {
  const aOptimal = oneSided(inst, 'A').matching;
  const bOptimal = oneSided(inst, 'B').matching;
  const aBest = stats(inst, aOptimal).aAvg;   // A proposing → A's best
  const aWorst = stats(inst, bOptimal).aAvg;  // B proposing → A's worst
  const bBest = stats(inst, bOptimal).bAvg;
  const bWorst = stats(inst, aOptimal).bAvg;
  return { aOptimal, bOptimal, aGap: aWorst - aBest, bGap: bWorst - bBest };
}
