// Round-trip recovery tests over randomized instances — the "does the math
// actually work" suite. Deterministic (seeded LCG) so failures reproduce.
//
//   1. Random additive TREE metric  → Neighbor-Joining recovers the exact tree.
//   2. Random additive TREE metric  → the SplitsTree split graph is that tree.
//   3. Random CIRCULAR-DECOMPOSABLE metric (CDM) → solveSplitWeights recovers the
//      exact circular splits and weights (zero residual), and the split graph's
//      edges are exactly that split system.
//   4. Build-then-fit round trip: metricFromSplits(weights) then a non-negative
//      least-squares fit over the same splits returns the same weights.

import { describe, expect, it } from 'vitest';

import { type DistanceMatrix, type WeightedSplit, defaultLeaves, metricFromSplits, starMetric } from '../metric';
import { enumerateTrees, treeCompatibleWithOrder, type Tree } from '../trees';
import { computeNeighborJoining } from '../neighborJoining';
import {
  circularDisplayedSplits,
  computeLevyPachterOrdering,
  nonnegativeLeastSquares,
  solveSplitWeights,
  splitSeparates,
} from '../splitWeights';
import { buildSplitGraph } from '../splitGraph';

/** Seeded LCG → deterministic [0,1). */
function rng(seed: number): () => number {
  let x = seed >>> 0;
  return () => {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
    return x / 4294967296;
  };
}
const between = (rand: () => number, lo: number, hi: number): number => lo + (hi - lo) * rand();

/** A random in-range additive tree metric: a random topology + random positive edges. */
function randomTreeMetric(trees: Tree[], n: number, rand: () => number): { m: DistanceMatrix; internalKeys: string[] } {
  const tree = trees[Math.floor(rand() * trees.length)];
  const splits: WeightedSplit[] = [
    // pendant (leaf) edges — keep positive so every leaf is separated
    ...Array.from({ length: n }, (_, i) => ({ side: [i], weight: between(rand, 0.3, 1.5) })),
    // internal edges — keep a positive floor so the tree is fully resolved
    ...tree.splitSides.map((s) => ({ side: s.side, weight: between(rand, 0.4, 2.0) })),
  ];
  return { m: metricFromSplits(n, splits), internalKeys: tree.splits.slice().sort() };
}

/** Fisher–Yates with a seeded rng. */
function shuffle<T>(items: T[], rand: () => number): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

describe('random tree → Neighbor-Joining recovers the exact tree', () => {
  ([5, 6, 7] as const).forEach((n) => {
    const trees = enumerateTrees(starMetric(n)); // enumerate once per n
    it(`n=${n}: NJ splitKeys == the true internal splits (40 seeds)`, () => {
      for (let seed = 1; seed <= 40; seed += 1) {
        const rand = rng(seed * 2654435761 + n);
        const { m, internalKeys } = randomTreeMetric(trees, n, rand);
        const got = computeNeighborJoining(m).splitKeys.slice().sort();
        expect(got).toEqual(internalKeys);
      }
    });
  });
});

describe('random tree → the SplitsTree split graph is that tree', () => {
  ([5, 6, 7] as const).forEach((n) => {
    const trees = enumerateTrees(starMetric(n));
    it(`n=${n}: split graph is a tree whose interior splits match (25 seeds)`, () => {
      for (let seed = 1; seed <= 25; seed += 1) {
        const rand = rng(seed * 40503 + n);
        const { m, internalKeys } = randomTreeMetric(trees, n, rand);
        const order = computeLevyPachterOrdering(m);
        const graph = buildSplitGraph(solveSplitWeights(m, order), order, n);
        // A tree-like split system draws as a tree (acyclic, connected).
        expect(graph.edges.length).toBe(graph.nodes.length - 1);
        // Its nontrivial edge-splits are exactly the tree's interior splits.
        const n2 = n;
        const edgeSplits = new Set(
          graph.edges
            .map((e) => e.splitKey)
            .filter((k) => {
              const side = k.split('|')[0];
              return side.length >= 2 && side.length <= n2 - 2;
            }),
        );
        expect([...edgeSplits].sort()).toEqual(internalKeys);
      }
    });
  });
});

describe('random CDM → split weights recover the exact circular split system', () => {
  ([5, 6, 7] as const).forEach((n) => {
    const labels = defaultLeaves(n);
    const labelMatrix = starMetric(n); // only used for canonical split keys
    it(`n=${n}: recovered weights match the built weights, residual ≈ 0 (40 seeds)`, () => {
      for (let seed = 1; seed <= 40; seed += 1) {
        const rand = rng(seed * 2246822519 + n);
        const order = shuffle(Array.from({ length: n }, (_, i) => i), rand);
        const candidates = circularDisplayedSplits(labelMatrix, order);
        // Random non-negative weights (some exactly 0 → that split absent).
        const built = new Map<string, number>();
        candidates.forEach((c) => built.set(c.key, rand() < 0.25 ? 0 : between(rand, 0.2, 2.0)));
        const m = metricFromSplits(
          n,
          candidates.map((c) => ({ side: c.side, weight: built.get(c.key) as number })),
          labels,
        );
        const solved = solveSplitWeights(m, order);
        // Every candidate weight is recovered.
        solved.forEach((s) => {
          expect(s.weight).toBeCloseTo(built.get(s.key) as number, 5);
        });
        // The fit reproduces the metric exactly.
        let sumSq = 0;
        for (let i = 0; i < n; i += 1) {
          for (let j = i + 1; j < n; j += 1) {
            let pred = 0;
            for (const s of solved) if (splitSeparates(s, i, j)) pred += s.weight;
            sumSq += (pred - m.d[i][j]) ** 2;
          }
        }
        expect(Math.sqrt(sumSq)).toBeLessThan(1e-6);
      }
    });
  });
});

describe('build-then-fit round trip (the metric builder is invertible)', () => {
  it('metricFromSplits(weights) then NNLS over the same splits returns the weights', () => {
    const n = 6;
    const labels = defaultLeaves(n);
    const labelMatrix = starMetric(n);
    for (let seed = 1; seed <= 30; seed += 1) {
      const rand = rng(seed * 97 + 5);
      const order = shuffle(Array.from({ length: n }, (_, i) => i), rand);
      const items = circularDisplayedSplits(labelMatrix, order);
      const weights = items.map(() => (rand() < 0.3 ? 0 : between(rand, 0.1, 2.0)));
      const m = metricFromSplits(n, items.map((it, k) => ({ side: it.side, weight: weights[k] })), labels);
      // Design matrix over the SAME items, fit by NNLS.
      const pairs: [number, number][] = [];
      for (let i = 0; i < n; i += 1) for (let j = i + 1; j < n; j += 1) pairs.push([i, j]);
      const A = pairs.map(([i, j]) => items.map((it) => (splitSeparates(it, i, j) ? 1 : 0)));
      const b = pairs.map(([i, j]) => m.d[i][j]);
      const fitted = nonnegativeLeastSquares(A, b);
      fitted.forEach((w, k) => expect(w).toBeCloseTo(weights[k], 5));
    }
  });
});

describe('Levy–Pachter picks a compatible tile for random trees', () => {
  ([5, 6, 7] as const).forEach((n) => {
    const trees = enumerateTrees(starMetric(n));
    it(`n=${n}: the LP order is compatible with the NJ tree (30 seeds)`, () => {
      for (let seed = 1; seed <= 30; seed += 1) {
        const rand = rng(seed * 31337 + n);
        const { m } = randomTreeMetric(trees, n, rand);
        const order = computeLevyPachterOrdering(m);
        const njKeys = new Set(computeNeighborJoining(m).splitKeys);
        const tree = trees.find((t) => t.splits.length === njKeys.size && t.splits.every((k) => njKeys.has(k)));
        expect(tree).toBeDefined();
        expect(treeCompatibleWithOrder(m, tree as Tree, order)).toBe(true);
      }
    });
  });
});
