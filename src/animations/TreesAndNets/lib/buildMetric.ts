// The metric builder — "build a tree or CDM by edges". You pick a source (a tree
// topology or a circular order), get its candidate splits (the edges), set each
// one's weight, and the distance matrix is generated as the sum of separating
// weights (d(i,j) = Σ weight of splits that separate i, j). This is the inverse
// of the rest of the app: instead of metric → tree/net, you build the
// tree/net (by weighting edges) → metric.
//
// "Fit to current" seeds the weights from the current matrix by the same
// non-negative least squares the split-weights solver uses, so you start from a
// faithful reconstruction and then sculpt it. (Round-trip exactness for these
// split systems is covered by recovery.test.ts.)

import { type DistanceMatrix, leafCount, metricFromSplits } from './metric';
import { canonicalSplitKey } from './trees';
import { type NJEdge, splitForEdge, computeNeighborJoining } from './neighborJoining';
import {
  circularDisplayedSplits,
  computeLevyPachterOrdering,
  nonnegativeLeastSquares,
  splitSeparates,
} from './splitWeights';

/** Which family of "edges" you build from. */
export type BuildSource = 'tree' | 'circular';

/** One editable edge (split) in the builder. */
export interface BuildItem {
  /** Canonical split key. */
  key: string;
  /** Leaf indices on one side. */
  side: number[];
  /** A pendant (single-leaf) edge — i.e. a leaf branch length. */
  trivial: boolean;
  /** Display label (the key, or "a (leaf)" for a pendant). */
  label: string;
}

/**
 * The candidate edges you can weight, for a given source:
 *  - `'circular'`: the circular split system of the Levy–Pachter order (the net's
 *    possible chords — singletons + arcs). Weighting them builds a
 *    circular-decomposable metric (CDM).
 *  - `'tree'`: the Neighbor-Joining tree's interior splits + the pendant
 *    singletons. Weighting them builds an additive tree metric.
 */
export function candidateSplits(m: DistanceMatrix, source: BuildSource): BuildItem[] {
  const n = leafCount(m);
  if (source === 'circular') {
    const order = computeLevyPachterOrdering(m);
    return circularDisplayedSplits(m, order).map((s) => ({
      key: s.key,
      side: s.side,
      trivial: s.trivial,
      label: s.trivial ? `${m.leaves[s.side[0]]} (leaf)` : s.key,
    }));
  }
  // tree: NJ interior splits (via flood-fill) + singleton pendants.
  const nj = computeNeighborJoining(m);
  const graph = new Map<string, Map<string, NJEdge>>();
  const add = (id: string): void => { if (!graph.has(id)) graph.set(id, new Map()); };
  nj.edges.forEach((e) => { add(e.left); add(e.right); graph.get(e.left)!.set(e.right, e); graph.get(e.right)!.set(e.left, e); });
  const leafSet = new Set(m.leaves);
  const idx = new Map(m.leaves.map((l, i) => [l, i]));
  const seen = new Set<string>();
  const items: BuildItem[] = [];
  nj.edges.forEach((e) => {
    const sideLabels = splitForEdge(graph, e.left, e.right, leafSet);
    if (sideLabels.length >= 2 && sideLabels.length <= n - 2) {
      const side = sideLabels.map((l) => idx.get(l)!).sort((a, b) => a - b);
      const key = canonicalSplitKey(m, side);
      if (!seen.has(key)) { seen.add(key); items.push({ key, side, trivial: false, label: key }); }
    }
  });
  for (let i = 0; i < n; i += 1) {
    const key = canonicalSplitKey(m, [i]);
    if (!seen.has(key)) { seen.add(key); items.push({ key, side: [i], trivial: true, label: `${m.leaves[i]} (leaf)` }); }
  }
  return items;
}

/**
 * Non-negative least-squares fit of the items' weights to best reproduce `m`'s
 * distances. Returns an array parallel to `items`.
 */
export function fitWeights(m: DistanceMatrix, items: BuildItem[]): number[] {
  const n = leafCount(m);
  const pairs: [number, number][] = [];
  for (let i = 0; i < n; i += 1) for (let j = i + 1; j < n; j += 1) pairs.push([i, j]);
  const a = pairs.map(([i, j]) => items.map((it) => (splitSeparates(it, i, j) ? 1 : 0)));
  const b = pairs.map(([i, j]) => m.d[i][j]);
  return nonnegativeLeastSquares(a, b);
}

/** Build a distance matrix from the items at the given (parallel) weights. */
export function metricFromItems(n: number, items: BuildItem[], weights: number[], leaves: string[]): DistanceMatrix {
  return metricFromSplits(
    n,
    items.map((it, k) => ({ side: it.side, weight: Math.max(0, weights[k] ?? 0) })),
    leaves,
  );
}
