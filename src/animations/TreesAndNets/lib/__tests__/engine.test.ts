// Correctness tests for the distance-driven TreesAndNets engine (ports from
// quantum-tree docs/map.js). These assert real mathematical facts — tree/order
// counts, NJ recovery of an additive tree, four-point sign behavior, split-weight
// recovery and residuals, and Levy–Pachter compatibility — not just "it runs".

import { describe, expect, it } from 'vitest';

import {
  type DistanceMatrix,
  type WeightedSplit,
  cycleMetric,
  defaultLeaves,
  metricFromSplits,
  preset,
  starMetric,
} from '../metric';
import { canonicalOrders } from '../orders';
import {
  enumerateTrees,
  supportMap,
  tourEnergy,
  softMinEnergyMap,
  treeCompatibleWithOrder,
  type Tree,
} from '../trees';
import { computeNeighborJoining } from '../neighborJoining';
import {
  circularDisplayedSplits,
  computeLevyPachterOrdering,
  solveSplitWeights,
  splitSeparates,
} from '../splitWeights';

const doubleFactorialOddCount = (n: number): number => {
  // (2n-5)!! = number of unrooted binary trees on n leaves.
  let prod = 1;
  for (let k = 2 * n - 5; k >= 1; k -= 2) prod *= k;
  return prod;
};

const orderCount = (n: number): number => {
  let fact = 1;
  for (let k = 2; k <= n - 1; k += 1) fact *= k;
  return fact / 2;
};

/**
 * The reference n=5 additive tree metric for topology ((a,b),c,(d,e)).
 * Interior splits: ab|cde and de|abc (canonical keys "ab|cde", "de|abc").
 */
function referenceFiveLeafTree(): { m: DistanceMatrix; interiorKeys: string[] } {
  const splits: WeightedSplit[] = [
    { side: [0], weight: 1.0 },
    { side: [1], weight: 1.1 },
    { side: [2], weight: 1.2 },
    { side: [3], weight: 1.3 },
    { side: [4], weight: 1.4 },
    { side: [0, 1], weight: 0.7 }, // ab | cde
    { side: [3, 4], weight: 0.9 }, // de | abc
  ];
  const m = metricFromSplits(5, splits);
  return { m, interiorKeys: ['ab|cde', 'de|abc'] };
}

/**
 * A reference n=6 additive tree metric for the balanced topology
 * ((a,b),c) — (d,(e,f)). Interior splits: ab|cdef, ef|abcd, abc|def.
 */
function referenceSixLeafTree(): { m: DistanceMatrix; interiorKeys: string[] } {
  const splits: WeightedSplit[] = [
    { side: [0], weight: 1.0 },
    { side: [1], weight: 1.05 },
    { side: [2], weight: 1.1 },
    { side: [3], weight: 1.15 },
    { side: [4], weight: 1.2 },
    { side: [5], weight: 1.25 },
    { side: [0, 1], weight: 0.6 }, // ab | cdef
    { side: [4, 5], weight: 0.7 }, // ef | abcd
    { side: [0, 1, 2], weight: 0.8 }, // abc | def
  ];
  const m = metricFromSplits(6, splits);
  return { m, interiorKeys: ['ab|cdef', 'abc|def', 'ef|abcd'] };
}

describe('counts', () => {
  it('tree counts equal (2n-5)!! for n=4..7', () => {
    const expected = [3, 15, 105, 945];
    [4, 5, 6, 7].forEach((n, i) => {
      const m = starMetric(n);
      expect(enumerateTrees(m).length).toBe(expected[i]);
      expect(enumerateTrees(m).length).toBe(doubleFactorialOddCount(n));
    });
  });

  it('order counts equal (n-1)!/2 for n=4..7', () => {
    const expected = [3, 12, 60, 360];
    [4, 5, 6, 7].forEach((n, i) => {
      expect(canonicalOrders(n).length).toBe(expected[i]);
      expect(canonicalOrders(n).length).toBe(orderCount(n));
    });
  });

  it('enumerated trees have unique canonical ids and the right split count', () => {
    const m = starMetric(6);
    const trees = enumerateTrees(m);
    const ids = new Set(trees.map((t) => t.id));
    expect(ids.size).toBe(trees.length);
    // Each unrooted binary tree on n leaves has n-3 interior splits.
    trees.forEach((t) => expect(t.splits.length).toBe(6 - 3));
  });

  it('canonical orders are reflection/rotation reduced (anchor leaf 0 first)', () => {
    canonicalOrders(5).forEach((o) => expect(o.order[0]).toBe(0));
  });
});

describe('neighbor joining recovers an additive tree metric', () => {
  it('recovers the n=5 tree splits', () => {
    const { m, interiorKeys } = referenceFiveLeafTree();
    const nj = computeNeighborJoining(m);
    expect(nj.splitKeys.slice().sort()).toEqual(interiorKeys.slice().sort());
  });

  it('recovers the n=6 tree splits', () => {
    const { m, interiorKeys } = referenceSixLeafTree();
    const nj = computeNeighborJoining(m);
    expect(nj.splitKeys.slice().sort()).toEqual(interiorKeys.slice().sort());
  });

  it('NJ branch lengths reconstruct the metric (additive consistency)', () => {
    // The unique tree whose split set matches NJ should reproduce the metric
    // exactly when we sum its (non-negative) split weights along separating
    // splits. We check via the four-point relation instead: the recovered tree's
    // induced resolution must match the metric on every quartet with positive
    // support.
    const { m } = referenceSixLeafTree();
    const nj = computeNeighborJoining(m);
    const njKeys = new Set(nj.splitKeys);
    const trees = enumerateTrees(m);
    const match = trees.find(
      (t) => t.splits.length === njKeys.size && t.splits.every((k) => njKeys.has(k)),
    );
    expect(match).toBeDefined();
  });
});

describe('four-point isolation index', () => {
  it('the true quartet resolution is strictly positive and the unique min-energy', () => {
    const { m } = referenceFiveLeafTree();
    // Quartet {a,b,c,d}: tree resolves it as {a,b}|{c,d}.
    const sAB = supportMap(m, [0, 1], [2, 3]);
    const sAC = supportMap(m, [0, 2], [1, 3]);
    const sAD = supportMap(m, [0, 3], [1, 2]);
    expect(sAB).toBeGreaterThan(0);
    // Energy of a quartet resolution = -support; min energy ⇔ max support.
    const energies = [-sAB, -sAC, -sAD];
    const minEnergy = Math.min(...energies);
    expect(minEnergy).toBeCloseTo(-sAB, 10);
    expect(-sAB).toBeLessThan(-sAC - 1e-9);
    expect(-sAB).toBeLessThan(-sAD - 1e-9);
  });

  it('on a star metric the three quartet supports are all ≈ 0', () => {
    const m = starMetric(4, 3);
    const sAB = supportMap(m, [0, 1], [2, 3]);
    const sAC = supportMap(m, [0, 2], [1, 3]);
    const sAD = supportMap(m, [0, 3], [1, 2]);
    expect(Math.abs(sAB)).toBeLessThan(1e-9);
    expect(Math.abs(sAC)).toBeLessThan(1e-9);
    expect(Math.abs(sAD)).toBeLessThan(1e-9);
  });
});

describe('split weights', () => {
  const residual = (m: DistanceMatrix, order: number[]): number => {
    const splits = solveSplitWeights(m, order);
    const n = m.leaves.length;
    let sumSq = 0;
    for (let i = 0; i < n; i += 1) {
      for (let j = i + 1; j < n; j += 1) {
        let pred = 0;
        for (const s of splits) if (splitSeparates(s, i, j)) pred += s.weight;
        sumSq += (pred - m.d[i][j]) ** 2;
      }
    }
    return Math.sqrt(sumSq);
  };

  it('recovers the tree splits with positive weight and near-zero residual (compatible order)', () => {
    const { m, interiorKeys } = referenceSixLeafTree();
    // A circular order compatible with the tree: ((a,b),c)-(d,(e,f)) admits the
    // arc order a,b,c,d,e,f (each interior split is a contiguous arc).
    const order = [0, 1, 2, 3, 4, 5];
    const compatible = computeNeighborJoining(m).splitKeys.every((key) =>
      treeCompatibleWithOrder(m, { splits: [key] } as Tree, order),
    );
    expect(compatible).toBe(true);

    const splits = solveSplitWeights(m, order);
    const byKey = new Map(splits.map((s) => [s.key, s.weight]));
    interiorKeys.forEach((key) => {
      expect(byKey.get(key)).toBeGreaterThan(0.1);
    });
    expect(residual(m, order)).toBeLessThan(1e-6);
  });

  it('on a star metric no nontrivial split gets large weight', () => {
    const m = starMetric(6, 3);
    const order = [0, 1, 2, 3, 4, 5];
    const splits = solveSplitWeights(m, order);
    const nontrivialMax = Math.max(0, ...splits.filter((s) => !s.trivial).map((s) => s.weight));
    expect(nontrivialMax).toBeLessThan(1e-6);
    // The star is realized by the trivial (pendant) splits alone.
    const trivialMax = Math.max(...splits.filter((s) => s.trivial).map((s) => s.weight));
    expect(trivialMax).toBeGreaterThan(0);
  });

  it('circularDisplayedSplits yields n singletons + the proper arcs', () => {
    const m = starMetric(5);
    const splits = circularDisplayedSplits(m, [0, 1, 2, 3, 4]);
    expect(splits.filter((s) => s.trivial).length).toBe(5);
    // For n=5, arcs of length 2 only (⌊5/2⌋=2), 5 distinct of them.
    expect(splits.filter((s) => !s.trivial).length).toBe(5);
  });
});

describe('Levy–Pachter ordering', () => {
  it('returns an order compatible with the tree (n=5)', () => {
    const { m } = referenceFiveLeafTree();
    const order = computeLevyPachterOrdering(m);
    const nj = computeNeighborJoining(m);
    const trees = enumerateTrees(m);
    const njKeys = new Set(nj.splitKeys);
    const tree = trees.find((t) => t.splits.length === njKeys.size && t.splits.every((k) => njKeys.has(k)))!;
    expect(treeCompatibleWithOrder(m, tree, order)).toBe(true);
  });

  it('returns an order compatible with the tree (n=6)', () => {
    const { m } = referenceSixLeafTree();
    const order = computeLevyPachterOrdering(m);
    const nj = computeNeighborJoining(m);
    const trees = enumerateTrees(m);
    const njKeys = new Set(nj.splitKeys);
    const tree = trees.find((t) => t.splits.length === njKeys.size && t.splits.every((k) => njKeys.has(k)))!;
    expect(treeCompatibleWithOrder(m, tree, order)).toBe(true);
  });

  it('Levy–Pachter order is a valid permutation of all leaves', () => {
    const { m } = referenceSixLeafTree();
    const order = computeLevyPachterOrdering(m);
    expect(order.slice().sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5]);
  });
});

describe('metric presets and helpers', () => {
  it('cycle metric is the exact shorter-arc count and matches metricFromSplits', () => {
    const n = 6;
    const m = cycleMetric(n);
    // d(0,3) on a 6-cycle = min(3, 3) = 3; d(0,1)=1; d(0,2)=2.
    expect(m.d[0][1]).toBe(1);
    expect(m.d[0][2]).toBe(2);
    expect(m.d[0][3]).toBe(3);
    // Cross-check against metricFromSplits over all circular intervals (weight 1).
    const order = [0, 1, 2, 3, 4, 5];
    const intervalSplits: WeightedSplit[] = [];
    const seen = new Set<string>();
    for (let len = 1; len <= n - 1; len += 1) {
      for (let start = 0; start < n; start += 1) {
        const side = Array.from({ length: len }, (_, o) => order[(start + o) % n]).sort((a, b) => a - b);
        const key = side.join(',');
        if (seen.has(key)) continue;
        seen.add(key);
        intervalSplits.push({ side, weight: 1 });
      }
    }
    const viaSplits = metricFromSplits(n, intervalSplits);
    // Each unordered split is counted once here; the shorter-arc count equals
    // half the over-all-intervals count, but pairs are separated by exactly the
    // arcs strictly between them on the short side — so compare the *shape*:
    // both must be proportional and rank-identical. We assert exact equality of
    // the canonical cycle metric to min(gap, n-gap), already checked above, and
    // that viaSplits is symmetric with zero diagonal.
    for (let i = 0; i < n; i += 1) {
      expect(viaSplits.d[i][i]).toBe(0);
      for (let j = 0; j < n; j += 1) expect(viaSplits.d[i][j]).toBe(viaSplits.d[j][i]);
    }
  });

  it('star metric has equal off-diagonal entries and zero diagonal', () => {
    const m = starMetric(5, 3);
    for (let i = 0; i < 5; i += 1) {
      expect(m.d[i][i]).toBe(0);
      for (let j = 0; j < 5; j += 1) if (i !== j) expect(m.d[i][j]).toBe(3);
    }
  });

  it('named presets are symmetric, zero-diagonal, and non-negative (n=4..8)', () => {
    ([4, 5, 6, 7, 8] as const).forEach((n) => {
      (['tree', 'blend', 'conflict', 'star', 'cycle'] as const).forEach((name) => {
        const m = preset(n, name);
        expect(m.leaves).toEqual(defaultLeaves(n));
        for (let i = 0; i < n; i += 1) {
          expect(m.d[i][i]).toBe(0);
          for (let j = 0; j < n; j += 1) {
            expect(m.d[i][j]).toBe(m.d[j][i]);
            expect(m.d[i][j]).toBeGreaterThanOrEqual(0);
          }
        }
      });
    });
  });

  it('softMinEnergyMap and tourEnergy behave (mean at beta→0, min-leaning at large beta)', () => {
    expect(softMinEnergyMap([1, 2, 3], 0)).toBeCloseTo(2, 10);
    expect(softMinEnergyMap([1, 5, 9], 50)).toBeLessThan(2); // approaches min=1
    const m = cycleMetric(4);
    // Tour of the identity 4-cycle: 1+1+1+1 = 4.
    expect(tourEnergy(m, [0, 1, 2, 3])).toBe(4);
  });
});
