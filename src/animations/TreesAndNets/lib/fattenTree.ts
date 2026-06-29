// Build a circular-decomposable metric (a net / CDM) by FATTENING a tree.
//
// With the leaves in a fixed cyclic order, a tree is a NON-CROSSING circular
// split system: every internal edge is an ARC (a contiguous block of leaves) and
// no two arcs cross. A pure tree's split network *is* a tree. "Fattening" an
// internal edge adds weight to the split that CROSSES it — the same arc shifted
// by one leaf — and a pair of crossing splits draws a box. So you sculpt a tree
// into a net by fattening some of its edges.
//
// The distance between two leaves is the sum of the weights of every split that
// separates them, so weighting these edges (plus the leaf branches) generates the
// metric. A pure tree gives an additive metric (Neighbor-Joining recovers it
// exactly); fattening makes it genuinely non-tree (covered in fattenTree.test.ts).

import { type DistanceMatrix, type WeightedSplit, defaultLeaves, metricFromSplits } from './metric';
import { canonicalSplitKey } from './trees';

/** One internal edge of the starting tree, as an arc split. */
export interface TreeEdge {
  /** Canonical split key — matches the views' keys, so selection cross-links. */
  key: string;
  /** Leaf indices on the arc side (contiguous in the cyclic order 0..n-1). */
  side: number[];
}

/** How to weight the tree (globals) plus the per-edge fatten amounts. */
export interface FattenSpec {
  /** Length of every internal tree edge. */
  branchLen: number;
  /** Length of every leaf (pendant) branch. */
  leafLen: number;
  /** Per-edge fatten amount, keyed by TreeEdge.key (0 = crisp tree edge). */
  fatten: Record<string, number>;
}

// Canonical key from leaves + side, without needing a full matrix (the `d` field
// is unused by canonicalSplitKey, which keys off the leaf labels and the side).
const keyOf = (leaves: string[], side: number[]): string =>
  canonicalSplitKey({ leaves, d: [] } as unknown as DistanceMatrix, side);

/**
 * The internal edges of a balanced binary tree on leaves 0..n-1 (in cyclic
 * order), each a proper arc split (2 ≤ |side| ≤ n−2). Complementary halves
 * collapse to one split, so there are exactly n−3 of them — a fully resolved
 * unrooted tree.
 */
export function balancedTreeEdges(n: number): TreeEdge[] {
  const leaves = defaultLeaves(n);
  const out: TreeEdge[] = [];
  const seen = new Set<string>();
  const rec = (lo: number, hi: number): void => {
    const len = hi - lo;
    if (len < 2) return;
    if (len <= n - 2) {
      const side = Array.from({ length: len }, (_, k) => lo + k);
      const key = keyOf(leaves, side);
      if (!seen.has(key)) { seen.add(key); out.push({ key, side }); }
    }
    const mid = lo + Math.floor(len / 2);
    rec(lo, mid);
    rec(mid, hi);
  };
  rec(0, n);
  return out;
}

/**
 * The "fattening" companion of an arc: the same window shifted one step forward
 * in the cyclic order (drop the first leaf, add the next). It always crosses the
 * original arc, so giving it weight opens a box.
 */
export function companionSide(side: number[], n: number): number[] {
  const next = (side[side.length - 1] + 1) % n;
  return [...side.slice(1), next];
}

/** Generate the distance matrix from the tree edges at the given spec. */
export function fattenedMetric(n: number, edges: TreeEdge[], spec: FattenSpec): DistanceMatrix {
  const leaves = defaultLeaves(n);
  const splits: WeightedSplit[] = [];
  const leafLen = Math.max(0, spec.leafLen);
  for (let i = 0; i < n; i += 1) splits.push({ side: [i], weight: leafLen });
  const branchLen = Math.max(0, spec.branchLen);
  edges.forEach((e) => {
    if (branchLen > 0) splits.push({ side: e.side, weight: branchLen });
    const f = Math.max(0, spec.fatten[e.key] ?? 0);
    if (f > 0) splits.push({ side: companionSide(e.side, n), weight: f });
  });
  return metricFromSplits(n, splits, leaves);
}
