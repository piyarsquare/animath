/**
 * Agentic Sorting — pure measurement.
 *
 * These turn the population into the *observables* that make the emergent
 * competencies measurable rather than merely visible: how sorted the array is,
 * how many monotone domains it has split into, and — the key Levin result —
 * whether agents of the same algotype cluster together *more than chance*.
 */

import type { Agent, AgentType } from './engine';

/** Fraction of adjacent pairs already in ascending order, 0..1 (1 = sorted). */
export function sortedness(values: number[]): number {
  if (values.length < 2) return 1;
  let ok = 0;
  for (let i = 0; i < values.length - 1; i++) if (values[i] <= values[i + 1]) ok++;
  return ok / (values.length - 1);
}

/** Number of inversions: pairs i<j with values[i] > values[j]. O(n²) — call on
 *  a throttled cadence, not every frame. 0 ⇒ perfectly ascending-sorted. */
export function inversions(values: number[]): number {
  let c = 0;
  for (let i = 0; i < values.length; i++)
    for (let j = i + 1; j < values.length; j++)
      if (values[i] > values[j]) c++;
  return c;
}

/** Count of maximal monotone runs. A sorted array has 1; an array that has
 *  phase-separated into an ascending block and a descending block trends toward
 *  2 — so this is the natural metric for the divergent-objective mode. */
export function monotoneRuns(values: number[]): number {
  if (values.length === 0) return 0;
  if (values.length < 2) return 1;
  let runs = 1;
  let dir = 0; // -1 down, +1 up, 0 still flat
  for (let i = 1; i < values.length; i++) {
    const d = Math.sign(values[i] - values[i - 1]);
    if (d === 0) continue;
    if (dir === 0) dir = d;
    else if (d !== dir) { runs++; dir = d; }
  }
  return runs;
}

/**
 * Algotype clustering as **excess homophily over chance** (a normalized
 * assortativity), in [-1, 1]. 0 means like-with-like adjacency is exactly what
 * the population mix would give by random shuffling; >0 means agents of the same
 * algotype have clustered beyond chance — the meta-property no rule encodes.
 * Subtracting the chance baseline is what stops it from merely restating the mix.
 */
export function algotypeClustering(types: AgentType[]): number {
  const n = types.length;
  if (n < 2) return 0;

  let same = 0;
  for (let i = 0; i < n - 1; i++) if (types[i] === types[i + 1]) same++;
  const observed = same / (n - 1);

  const counts = new Map<AgentType, number>();
  for (const t of types) counts.set(t, (counts.get(t) ?? 0) + 1);
  let expected = 0;
  for (const c of counts.values()) { const p = c / n; expected += p * p; }

  if (expected >= 1) return 0; // single type — clustering undefined
  return (observed - expected) / (1 - expected);
}

/**
 * Best ascending sortedness still reachable with the frozen cells pinned. Frozen
 * values stay put; the movable values are placed in sorted order into the
 * movable slots (which is optimal for sortedness). The gap between this ceiling
 * and 1.0 is the damage the defects impose — the array can't beat it, and the
 * point is that the agents get *close* to it anyway (robustness).
 */
export function frozenCeiling(values: number[], frozen: boolean[]): number {
  const movable = values.filter((_, i) => !frozen[i]).sort((a, b) => a - b);
  const result = new Array<number>(values.length);
  let k = 0;
  for (let i = 0; i < values.length; i++) result[i] = frozen[i] ? values[i] : movable[k++];
  return sortedness(result);
}

/**
 * The sorted-ascending home index for `value`: how many agents hold a strictly
 * smaller value. Values never change (only positions do), so an agent's target
 * is fixed for the run — its *distance* to that target is what wanders. The
 * delayed-gratification signature is this distance rising before it falls.
 */
export function homeIndex(values: number[], value: number): number {
  let rank = 0;
  for (const v of values) if (v < value) rank++;
  return rank;
}

export interface MetricsView {
  cycles: number;
  wakeups: number;
  swaps: number;
  sortedness: number;   // 0..1
  inversions: number;
  runs: number;
  clustering: number;   // -1..1 (excess homophily)
  ceiling: number;      // 0..1
  hasFrozen: boolean;
  descShareLive: number; // fraction of agents currently sorting descending
}

/** Compute every readout from a population snapshot in one O(n²) pass set. */
export function measure(agents: Agent[], base: { cycles: number; wakeups: number; swaps: number }): MetricsView {
  const values = agents.map(a => a.value);
  const types = agents.map(a => a.type);
  const frozen = agents.map(a => a.frozen);
  const hasFrozen = frozen.some(Boolean);
  const desc = agents.reduce((s, a) => s + (a.objective === -1 ? 1 : 0), 0);
  return {
    cycles: base.cycles,
    wakeups: base.wakeups,
    swaps: base.swaps,
    sortedness: sortedness(values),
    inversions: inversions(values),
    runs: monotoneRuns(values),
    clustering: algotypeClustering(types),
    ceiling: hasFrozen ? frozenCeiling(values, frozen) : 1,
    hasFrozen,
    descShareLive: agents.length ? desc / agents.length : 0,
  };
}
