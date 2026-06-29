// Faithfulness + structure tests for the step-by-step traces that drive the
// Neighbor-Joining and NeighborNet (Levy–Pachter) animations.
//
// The traces are produced by a single implementation of each algorithm: the
// historical `computeNeighborJoining` / `computeLevyPachterOrdering` now delegate
// to `computeNeighborJoiningTrace` / `computeNeighborNetTrace` and return only
// the final piece. These tests pin that contract — the trace's `result`/`order`
// must equal the legacy functions exactly — and assert the recorded steps are
// internally consistent (each step's chosen pair is the true argmin of its own
// decision surface, the cluster/component counts march down by one, the created
// nodes/orders cover the result).

import { describe, expect, it } from 'vitest';

import {
  type DistanceMatrix,
  type WeightedSplit,
  defaultLeaves,
  metricFromSplits,
  preset,
} from '../metric';
import { canonicalCircularOrder } from '../orders';
import {
  computeNeighborJoining,
  computeNeighborJoiningTrace,
} from '../neighborJoining';
import {
  computeLevyPachterOrdering,
  computeNeighborNetTrace,
} from '../splitWeights';

// --------------------------------------------------------------------------
// Test metrics: the shipped presets plus a few deterministic "random-ish"
// additive trees (irregular split weights from a small LCG, so they are
// reproducible but not uniform). Every one is a genuine additive metric.
// --------------------------------------------------------------------------

/** A tiny deterministic generator so the "random-ish" trees are reproducible. */
function lcg(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

/**
 * A caterpillar additive metric on n leaves: every singleton split plus every
 * contiguous interior split {0..k}, each with an irregular positive weight. This
 * is additive (built by `metricFromSplits`) and resolves to a binary tree, so NJ
 * and the ordering both have nontrivial work to do.
 */
function randomishTree(n: number, seed: number): DistanceMatrix {
  const rand = lcg(seed);
  const splits: WeightedSplit[] = [];
  for (let i = 0; i < n; i += 1) {
    splits.push({ side: [i], weight: 0.5 + rand() * 1.5 });
  }
  for (let k = 2; k <= n - 2; k += 1) {
    splits.push({ side: Array.from({ length: k }, (_, i) => i), weight: 0.3 + rand() * 1.2 });
  }
  return metricFromSplits(n, splits);
}

const FAITHFULNESS_METRICS: { name: string; m: DistanceMatrix }[] = [
  { name: 'preset tree n=6', m: preset(6, 'tree') },
  { name: 'preset conflict n=6', m: preset(6, 'conflict') },
  { name: 'preset tree n=5', m: preset(5, 'tree') },
  { name: 'preset conflict n=7', m: preset(7, 'conflict') },
  { name: 'random-ish tree n=5', m: randomishTree(5, 12345) },
  { name: 'random-ish tree n=6', m: randomishTree(6, 67890) },
  { name: 'random-ish tree n=7', m: randomishTree(7, 24680) },
  { name: 'preset tree n=4 (edge case)', m: preset(4, 'tree') },
];

// --------------------------------------------------------------------------
// Faithfulness: trace cores reproduce the legacy public functions exactly.
// --------------------------------------------------------------------------

describe('trace faithfulness (single implementation → identical results)', () => {
  FAITHFULNESS_METRICS.forEach(({ name, m }) => {
    it(`NJ trace result deep-equals computeNeighborJoining (${name})`, () => {
      expect(computeNeighborJoiningTrace(m).result).toEqual(computeNeighborJoining(m));
    });

    it(`NeighborNet trace order equals computeLevyPachterOrdering (${name})`, () => {
      expect(computeNeighborNetTrace(m).order).toEqual(computeLevyPachterOrdering(m));
    });
  });
});

// --------------------------------------------------------------------------
// NJ step structure.
// --------------------------------------------------------------------------

describe('NJ step structure', () => {
  FAITHFULNESS_METRICS.forEach(({ name, m }) => {
    it(`steps are well-formed and decision-faithful (${name})`, () => {
      const n = m.leaves.length;
      const { result, steps } = computeNeighborJoiningTrace(m);

      // The Q-loop runs while >2 clusters remain: n-2 internal joins (n→2),
      // then 1 terminal join → n-1 steps total.
      // (n=4 → 3 steps: two Q-joins + the terminal join.)
      expect(steps.length).toBe(n - 1);
      expect(steps.filter((s) => !s.finalJoin).length).toBe(n - 2);

      // Exactly one final join, and it is the last step.
      const finals = steps.filter((s) => s.finalJoin);
      expect(finals.length).toBe(1);
      expect(steps[steps.length - 1].finalJoin).toBe(true);

      // Each non-final step reduces the cluster count by 1; the final step
      // connects the last two clusters.
      steps.forEach((step, index) => {
        if (step.finalJoin) {
          expect(step.clustersBefore.length).toBe(2);
        } else {
          // Next step (if any) has one fewer cluster than this one.
          const next = steps[index + 1];
          expect(next.clustersBefore.length).toBe(step.clustersBefore.length - 1);
        }
      });

      // Every chosen pair is the argmin of that step's qScores, honoring the
      // lexical tie-break on the sorted pair key. (Final step has empty qScores.)
      const pairKey = (pair: [string, string]): string => [pair[0], pair[1]].sort().join('|');
      steps.forEach((step) => {
        if (step.finalJoin) {
          expect(step.qScores).toEqual([]);
          return;
        }
        expect(step.qScores.length).toBeGreaterThan(0);
        let best = step.qScores[0];
        for (const candidate of step.qScores) {
          if (
            candidate.q < best.q - 1e-9 ||
            (Math.abs(candidate.q - best.q) < 1e-9 && pairKey(candidate.pair) < pairKey(best.pair))
          ) {
            best = candidate;
          }
        }
        expect(pairKey(step.joined)).toBe(pairKey(best.pair));
        // The joined pair is one of the candidates on the surface.
        expect(step.qScores.some((c) => pairKey(c.pair) === pairKey(step.joined))).toBe(true);
        // qScores covers every unordered pair of the clusters present.
        const expectedPairs = (step.clustersBefore.length * (step.clustersBefore.length - 1)) / 2;
        expect(step.qScores.length).toBe(expectedPairs);
      });

      // newNode ids are unique among the joins that create one (non-final).
      const newNodes = steps.filter((s) => !s.finalJoin).map((s) => s.newNode);
      expect(new Set(newNodes).size).toBe(newNodes.length);
      newNodes.forEach((id) => expect(id).not.toBe(''));
      // The terminal join creates no interior node.
      expect(steps[steps.length - 1].newNode).toBe('');

      // The union of all created interior nodes + the leaves equals the result's
      // node set (the terminal join adds an edge, not a node).
      const union = new Set<string>([...m.leaves, ...newNodes]);
      expect(union).toEqual(new Set(result.nodes));
      expect(union.size).toBe(result.nodes.length);
    });
  });
});

// --------------------------------------------------------------------------
// NeighborNet step structure.
// --------------------------------------------------------------------------

describe('NeighborNet step structure', () => {
  FAITHFULNESS_METRICS.forEach(({ name, m }) => {
    it(`steps lock in the order one merge at a time (${name})`, () => {
      const n = m.leaves.length;
      const { order, steps } = computeNeighborNetTrace(m);

      // n-1 merges take n singletons down to a single component.
      expect(steps.length).toBe(n - 1);

      // First step starts from n singletons.
      expect(steps[0].componentsBefore.length).toBe(n);
      steps[0].componentsBefore.forEach((c) => expect(c.length).toBe(1));

      // Each step reduces the component count by 1; the last leaves one.
      steps.forEach((step, index) => {
        expect(step.componentsBefore.length).toBe(n - index);
        // The merged indices are distinct and in range.
        expect(step.leftIndex).not.toBe(step.rightIndex);
        expect(step.leftIndex).toBeGreaterThanOrEqual(0);
        expect(step.rightIndex).toBeGreaterThanOrEqual(0);
        expect(step.leftIndex).toBeLessThan(step.componentsBefore.length);
        expect(step.rightIndex).toBeLessThan(step.componentsBefore.length);
      });
      expect(steps[steps.length - 1].componentsBefore.length).toBe(2);

      // mergedOrder is the (oriented) concatenation of exactly the two merged
      // components and contains exactly their leaves.
      steps.forEach((step) => {
        const leftComp = step.componentsBefore[step.leftIndex];
        const rightComp = step.componentsBefore[step.rightIndex];
        expect(step.mergedOrder.length).toBe(leftComp.length + rightComp.length);
        expect(new Set(step.mergedOrder)).toEqual(new Set([...leftComp, ...rightComp]));
        // The spliced endpoints are the interior junction of the merge.
        expect(step.mergedOrder).toContain(step.endpoints[0]);
        expect(step.mergedOrder).toContain(step.endpoints[1]);
        // Each endpoint is an endpoint of its own component.
        const isEndpoint = (comp: number[], leaf: number): boolean =>
          comp[0] === leaf || comp[comp.length - 1] === leaf;
        expect(isEndpoint(leftComp, step.endpoints[0])).toBe(true);
        expect(isEndpoint(rightComp, step.endpoints[1])).toBe(true);
        // Endpoints meet in the middle: left's endpoint, then right's endpoint.
        const li = step.mergedOrder.indexOf(step.endpoints[0]);
        const ri = step.mergedOrder.indexOf(step.endpoints[1]);
        expect(ri).toBe(li + 1);
      });

      // The last step's mergedOrder, canonicalized, equals the returned order.
      expect(canonicalCircularOrder(steps[steps.length - 1].mergedOrder)).toEqual(order);

      // Every leaf appears exactly once in each step's component snapshot.
      const allLeaves = Array.from({ length: n }, (_, i) => i);
      steps.forEach((step) => {
        const flat = step.componentsBefore.flat();
        expect(flat.slice().sort((a, b) => a - b)).toEqual(allLeaves);
      });
      // The single final component is a permutation of all leaves.
      expect(steps[steps.length - 1].mergedOrder.slice().sort((a, b) => a - b)).toEqual(allLeaves);
      expect(order.slice().sort((a, b) => a - b)).toEqual(allLeaves);
    });
  });

  it('default labels are intact for the random-ish metrics (sanity)', () => {
    expect(randomishTree(5, 1).leaves).toEqual(defaultLeaves(5));
  });
});
