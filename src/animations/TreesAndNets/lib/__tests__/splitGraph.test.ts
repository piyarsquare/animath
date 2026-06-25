// Correctness tests for the circular split-graph builder (port of quantum-tree
// docs/map.js `buildCircularSplitGraph` + the equal-angle layout). These assert
// real structural facts about the planar split network:
//   - a tree-additive metric in a compatible circular order produces a *tree*
//     (a connected, acyclic graph: edges === nodes - 1), and every leaf is placed;
//   - a conflicted metric produces a *net* with at least one box (a cycle:
//     edges > nodes - 1), the visual signature of incompatible splits;
//   - all coordinates are finite and all edge endpoints are valid node indices.

import { describe, expect, it } from 'vitest';

import { type WeightedSplit, metricFromSplits, preset } from '../metric';
// computeLevyPachterOrdering lives in splitWeights (the Levy–Pachter ordering).
import { computeLevyPachterOrdering, solveSplitWeights } from '../splitWeights';
import { buildSplitGraph, type SplitGraph } from '../splitGraph';

const lpOrdering = computeLevyPachterOrdering;

/** Number of connected components of a split graph (over its non-deleted edges). */
function componentCount(graph: SplitGraph): number {
  const parent = graph.nodes.map((_, i) => i);
  const find = (x: number): number => {
    let r = x;
    while (parent[r] !== r) r = parent[r];
    while (parent[x] !== r) {
      const next = parent[x];
      parent[x] = r;
      x = next;
    }
    return r;
  };
  const union = (a: number, b: number): void => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  };
  graph.edges.forEach((edge) => union(edge.a, edge.b));
  return new Set(graph.nodes.map((_, i) => find(i))).size;
}

function isConnected(graph: SplitGraph): boolean {
  return graph.nodes.length === 0 || componentCount(graph) === 1;
}

/** The cyclomatic number E - V + C: the count of independent cycles ("boxes"). */
function cycleRank(graph: SplitGraph): number {
  return graph.edges.length - graph.nodes.length + componentCount(graph);
}

/** Every leaf index 0..n-1 appears on exactly one node. */
function leavesPlaced(graph: SplitGraph, n: number): boolean {
  const seen = new Set<number>();
  graph.nodes.forEach((node) => node.leaves.forEach((leaf) => seen.add(leaf)));
  if (seen.size !== n) return false;
  for (let i = 0; i < n; i += 1) if (!seen.has(i)) return false;
  return true;
}

function assertSane(graph: SplitGraph): void {
  graph.nodes.forEach((node) => {
    expect(Number.isFinite(node.x)).toBe(true);
    expect(Number.isFinite(node.y)).toBe(true);
  });
  graph.edges.forEach((edge) => {
    expect(edge.a).toBeGreaterThanOrEqual(0);
    expect(edge.a).toBeLessThan(graph.nodes.length);
    expect(edge.b).toBeGreaterThanOrEqual(0);
    expect(edge.b).toBeLessThan(graph.nodes.length);
    expect(Number.isFinite(edge.weight)).toBe(true);
  });
}

describe('buildSplitGraph — tree-additive metric is a tree', () => {
  it('an additive 5-leaf tree metric yields a tree (E === V - 1, connected, all leaves placed)', () => {
    // Tree topology ((a,b),c,(d,e)) with pendant + two interior splits.
    const n = 5;
    const splits: WeightedSplit[] = [
      { side: [0], weight: 1.0 },
      { side: [1], weight: 1.1 },
      { side: [2], weight: 1.2 },
      { side: [3], weight: 1.3 },
      { side: [4], weight: 1.4 },
      { side: [0, 1], weight: 0.7 }, // ab | cde
      { side: [3, 4], weight: 0.9 }, // de | abc
    ];
    const m = metricFromSplits(n, splits);
    const order = lpOrdering(m);
    const weighted = solveSplitWeights(m, order);
    const graph = buildSplitGraph(weighted, order, n);

    assertSane(graph);
    expect(isConnected(graph)).toBe(true);
    expect(graph.edges.length).toBe(graph.nodes.length - 1); // acyclic <=> tree
    expect(cycleRank(graph)).toBe(0); // no boxes
    expect(leavesPlaced(graph, n)).toBe(true);
  });

  it('the 6-leaf "tree" preset also yields a tree (no boxes)', () => {
    const n = 6;
    const m = preset(n, 'tree');
    const order = lpOrdering(m);
    const weighted = solveSplitWeights(m, order);
    const graph = buildSplitGraph(weighted, order, n);

    assertSane(graph);
    expect(isConnected(graph)).toBe(true);
    expect(cycleRank(graph)).toBe(0);
    expect(graph.edges.length).toBe(graph.nodes.length - 1);
    expect(leavesPlaced(graph, n)).toBe(true);
  });
});

describe('buildSplitGraph — conflicted metric opens boxes', () => {
  it('the 6-leaf "conflict" preset yields a net with at least one cycle (box)', () => {
    const n = 6;
    const m = preset(n, 'conflict');
    const order = lpOrdering(m);
    const weighted = solveSplitWeights(m, order);
    const graph = buildSplitGraph(weighted, order, n);

    assertSane(graph);
    // A conflicted (incompatible) split system must produce at least one box:
    // more edges than a tree would have, i.e. a positive cyclomatic number.
    expect(graph.edges.length).toBeGreaterThan(graph.nodes.length - 1);
    expect(cycleRank(graph)).toBeGreaterThan(0);
    expect(leavesPlaced(graph, n)).toBe(true);
  });
});

describe('buildSplitGraph — degenerate inputs', () => {
  it('a star metric (no interior splits with weight) still places every leaf', () => {
    const n = 5;
    const m = preset(n, 'star');
    const order = lpOrdering(m);
    const weighted = solveSplitWeights(m, order);
    const graph = buildSplitGraph(weighted, order, n);

    assertSane(graph);
    expect(graph.nodes.length).toBeGreaterThan(0);
    expect(leavesPlaced(graph, n)).toBe(true);
  });
});
