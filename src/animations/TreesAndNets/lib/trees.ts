// Unrooted binary tree topologies on n leaves, the splits they display, and the
// four-point / energy machinery that scores them against a distance matrix.
//
// REPRESENTATION CONVENTION:
//   - Leaves are 0-based indices `0..n-1`; the matrix carries display labels.
//   - A "split" is an unordered bipartition of the leaves. Its canonical KEY is a
//     label string "smallSide|bigSide" (each side's labels in index order; the
//     smaller side first, ties broken lexicographically) — this matches
//     quantum-tree's `canonicalSplitKey` so split sets compare by string.
//   - A tree's adjacency is kept over both leaf nodes (string labels) and
//     interior nodes ("u0","u1",…), enough to draw the tree later.
//
// Faithful port of quantum-tree docs/map.js:
//   supportMap, softMinEnergyMap, tourEnergy, canonicalSplitKey,
//   inducedResolution (+ inducedResolutionFromSplits), generateUnrootedBinary-
//   TreeGraphs (+ insertLeafOnEdge), treeGraphSplitSides (+ treeGraphSplitSide),
//   treeCompatibleWithOrder.
// Tie-break rules, the [2 .. n-2] interior-split size window, and the DFS
// flood-fill that defines a split side are preserved.

import type { DistanceMatrix } from './metric';
import { dist, leafCount } from './metric';

// --------------------------------------------------------------------------
// Pair helpers (map.js sortedMapLeaves / mapPairKey / mapDistance, on indices).
// --------------------------------------------------------------------------

/** Leaf indices sorted ascending (map.js `sortedMapLeaves`, in index order). */
function sortedLeaves(items: number[]): number[] {
  return [...items].sort((a, b) => a - b);
}

// --------------------------------------------------------------------------
// Four-point isolation index, soft-min energy, tour energy.
// --------------------------------------------------------------------------

/** Mean of an array. */
function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

/**
 * Four-point support (isolation index) of the quartet split {a,b}|{c,d}:
 *   0.5·(d_ac + d_ad + d_bc + d_bd) − d_ab − d_cd.
 * Positive iff the metric prefers the resolution {a,b}|{c,d}. Faithful port of
 * map.js `supportMap` (pairs are first index-sorted, exactly as there).
 */
export function supportMap(m: DistanceMatrix, pairA: number[], pairB: number[]): number {
  const [a, b] = sortedLeaves(pairA);
  const [c, d] = sortedLeaves(pairB);
  const cross = dist(m, a, c) + dist(m, a, d) + dist(m, b, c) + dist(m, b, d);
  return 0.5 * cross - dist(m, a, b) - dist(m, c, d);
}

/**
 * Soft-min (log-sum-exp) of `values` at inverse temperature `beta`. As beta→0
 * it is the mean; as beta→∞ it approaches the minimum. Faithful port of map.js
 * `softMinEnergyMap` (same minValue shift and `log(len)` normalization).
 */
export function softMinEnergyMap(values: number[], beta: number): number {
  if (values.length === 0) return 0;
  if (beta < 1e-9) return mean(values);
  const minValue = Math.min(...values);
  const sum = values.reduce((total, value) => total + Math.exp(-beta * (value - minValue)), 0);
  return minValue - (Math.log(sum) - Math.log(values.length)) / beta;
}

/** The energy quantum-tree uses for tree topologies (negative mean support). */
export const MAP_BETA = 1.1;

/**
 * Tour (Hamiltonian cycle) length of a circular order: the sum of distances
 * between consecutive leaves around the cycle. Faithful port of map.js
 * `tourEnergy`.
 */
export function tourEnergy(m: DistanceMatrix, order: number[]): number {
  return order.reduce((sum, leaf, index) => sum + dist(m, leaf, order[(index + 1) % order.length]), 0);
}

// --------------------------------------------------------------------------
// Splits.
// --------------------------------------------------------------------------

/**
 * Canonical key of the split whose one side is `side` (the complement is the
 * rest of the leaves). Smaller side first; if sides are equal in size, the two
 * label strings are sorted. Faithful port of map.js `canonicalSplitKey`.
 */
export function canonicalSplitKey(m: DistanceMatrix, side: number[]): string {
  const n = leafCount(m);
  const leftSet = new Set(side);
  const leftLeaves = sortedLeaves(side);
  const rightLeaves: number[] = [];
  for (let i = 0; i < n; i += 1) if (!leftSet.has(i)) rightLeaves.push(i);
  const left = leftLeaves.map((i) => m.leaves[i]).join('');
  const right = rightLeaves.map((i) => m.leaves[i]).join('');
  if (leftLeaves.length < rightLeaves.length) return `${left}|${right}`;
  if (rightLeaves.length < leftLeaves.length) return `${right}|${left}`;
  return [left, right].sort().join('|');
}

// --------------------------------------------------------------------------
// Tree graph enumeration (Map<node, Set<neighbor>>; nodes are labels or "u#").
// --------------------------------------------------------------------------

/** A tree graph: node label -> set of neighbor labels. Leaves are display labels. */
export type TreeGraph = Map<string, Set<string>>;

interface GrowingTree {
  graph: TreeGraph;
  nextInternal: number;
}

/** Undirected edges of a graph as [a,b] with a<b (lexicographically). */
function graphEdges(graph: TreeGraph): [string, string][] {
  const edges: [string, string][] = [];
  graph.forEach((neighbors, left) => {
    neighbors.forEach((right) => {
      if (String(left) < String(right)) edges.push([left, right]);
    });
  });
  return edges;
}

function cloneTreeGraph(graph: TreeGraph): TreeGraph {
  return new Map([...graph].map(([node, neighbors]) => [node, new Set(neighbors)]));
}

/**
 * Subdivide edge (left,right) with a fresh interior node and hang `leaf` off it.
 * Faithful port of map.js `insertLeafOnEdge`.
 */
export function insertLeafOnEdge(
  tree: GrowingTree,
  left: string,
  right: string,
  leaf: string,
): GrowingTree {
  const graph = cloneTreeGraph(tree.graph);
  const internal = `u${tree.nextInternal}`;
  graph.get(left)!.delete(right);
  graph.get(right)!.delete(left);
  graph.set(internal, new Set([left, right, leaf]));
  graph.set(leaf, new Set([internal]));
  graph.get(left)!.add(internal);
  graph.get(right)!.add(internal);
  return { graph, nextInternal: tree.nextInternal + 1 };
}

/**
 * Every unrooted binary tree on `leafLabels`: start from the 3-leaf star and
 * insert each remaining leaf on every existing edge. Produces (2n-5)!! graphs.
 * Faithful port of map.js `generateUnrootedBinaryTreeGraphs`.
 */
export function generateUnrootedBinaryTreeGraphs(leafLabels: string[]): TreeGraph[] {
  const center = 'u0';
  let trees: GrowingTree[] = [
    {
      nextInternal: 1,
      graph: new Map<string, Set<string>>([
        [center, new Set(leafLabels.slice(0, 3))],
        [leafLabels[0], new Set([center])],
        [leafLabels[1], new Set([center])],
        [leafLabels[2], new Set([center])],
      ]),
    },
  ];

  leafLabels.slice(3).forEach((leaf) => {
    trees = trees.flatMap((tree) => {
      const edges = graphEdges(tree.graph);
      return edges.map(([left, right]) => insertLeafOnEdge(tree, left, right, leaf));
    });
  });

  return trees.map((tree) => tree.graph);
}

/**
 * Leaves reachable from `start` without crossing into `blocked` — one side of
 * the split induced by removing the edge (start, blocked). Faithful port of
 * map.js `treeGraphSplitSide` (DFS flood-fill; leaf nodes are the labels in
 * `leafSet`).
 */
function treeGraphSplitSide(graph: TreeGraph, start: string, blocked: string, leafSet: Set<string>): string[] {
  const seen = new Set<string>([blocked]);
  const stack: string[] = [start];
  const leaves: string[] = [];
  while (stack.length > 0) {
    const node = stack.pop()!;
    if (seen.has(node)) continue;
    seen.add(node);
    if (leafSet.has(node)) leaves.push(node);
    graph.get(node)!.forEach((next) => {
      if (!seen.has(next)) stack.push(next);
    });
  }
  return leaves;
}

/** A displayed split of a tree: one side (leaf indices) + its canonical key. */
export interface TreeSplitSide {
  side: number[];
  key: string;
}

/**
 * The interior splits a tree displays: for each edge, the leaf set on one side,
 * keeping only proper splits (size in [2, n-2]). Faithful port of map.js
 * `treeGraphSplitSides`.
 */
export function treeGraphSplitSides(m: DistanceMatrix, graph: TreeGraph): TreeSplitSide[] {
  const n = leafCount(m);
  const labelToIndex = new Map(m.leaves.map((l, i) => [l, i]));
  const leafSet = new Set(m.leaves);
  return graphEdges(graph)
    .map(([left, right]) => treeGraphSplitSide(graph, left, right, leafSet))
    .filter((side) => side.length >= 2 && side.length <= n - 2)
    .map((sideLabels) => {
      const side = sortedLeaves(sideLabels.map((l) => labelToIndex.get(l)!));
      return { side, key: canonicalSplitKey(m, side) };
    });
}

// --------------------------------------------------------------------------
// Tree objects + induced quartet resolution.
// --------------------------------------------------------------------------

export interface Tree {
  /** Canonical id: the sorted interior split keys joined by ";". */
  id: string;
  /** Human label, e.g. "ab / cd". */
  label: string;
  /** Canonical keys of this tree's interior splits, sorted. */
  splits: string[];
  /** One side (leaf indices) per interior split, parallel to richer drawing. */
  splitSides: TreeSplitSide[];
  /** The graph (node label -> neighbor labels); leaves are display labels. */
  graph: TreeGraph;
}

/** k-combinations of `items` (map.js `combinationsMap`). */
function combinations<T>(items: T[], size: number): T[][] {
  if (size === 0) return [[]];
  if (items.length < size) return [];
  const [head, ...tail] = items;
  return [
    ...combinations(tail, size - 1).map((combo) => [head, ...combo]),
    ...combinations(tail, size),
  ];
}

/** The three pairings of four items into two pairs (map.js `pairingsForFour`). */
function pairingsForFour<T>(items: T[]): [[T, T], [T, T]][] {
  const [a, b, c, d] = items;
  return [
    [[a, b], [c, d]],
    [[a, c], [b, d]],
    [[a, d], [b, c]],
  ];
}

function sameSet(left: number[], right: number[]): boolean {
  if (left.length !== right.length) return false;
  const r = new Set(right);
  return left.every((x) => r.has(x));
}

/**
 * Which of the three quartet resolutions a tree (given by its split sides)
 * induces on `quartetLeaves`. Faithful port of map.js
 * `inducedResolutionFromSplits`: a resolution is induced iff some split's
 * restriction to the quartet (or its complement) equals one of the two pairs.
 */
export function inducedResolution(
  splitSides: TreeSplitSide[],
  quartetLeaves: number[],
): { pairA: number[]; pairB: number[] } {
  const quartetSet = new Set(quartetLeaves);
  for (const [rawPairA, rawPairB] of pairingsForFour(quartetLeaves)) {
    const pairA = sortedLeaves(rawPairA);
    const pairB = sortedLeaves(rawPairB);
    const found = splitSides.some((split) => {
      const sideSet = new Set(split.side);
      const intersection = quartetLeaves.filter((leaf) => sideSet.has(leaf));
      const complementIntersection = quartetLeaves.filter(
        (leaf) => !sideSet.has(leaf) && quartetSet.has(leaf),
      );
      return (
        sameSet(intersection, pairA) ||
        sameSet(intersection, pairB) ||
        sameSet(complementIntersection, pairA) ||
        sameSet(complementIntersection, pairB)
      );
    });
    if (found) return { pairA, pairB };
  }
  const [pairA, pairB] = pairingsForFour(quartetLeaves)[0];
  return { pairA: sortedLeaves(pairA), pairB: sortedLeaves(pairB) };
}

/**
 * All unrooted binary trees on the matrix's leaves, as `Tree` objects. Enumerated
 * over the display labels (so graph nodes are labels), then keyed by canonical
 * split sets. Count is (2n-5)!!.
 */
export function enumerateTrees(m: DistanceMatrix): Tree[] {
  const graphs = generateUnrootedBinaryTreeGraphs(m.leaves);
  return graphs
    .map((graph) => {
      const splitSides = treeGraphSplitSides(m, graph);
      const splits = [...new Set(splitSides.map((s) => s.key))].sort();
      return {
        id: splits.join(';'),
        label: splits.map((key) => key.split('|')[0]).join(' / '),
        splits,
        splitSides,
        graph,
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Mean four-point support of a tree over all quartets — the score quantum-tree
 * shows; `energy = -support`. Provided as a convenience for consumers.
 */
export function treeSupport(m: DistanceMatrix, tree: Tree): number {
  const quartets = combinations(
    Array.from({ length: leafCount(m) }, (_, i) => i),
    4,
  );
  const supports = quartets.map((q) => {
    const r = inducedResolution(tree.splitSides, q);
    return supportMap(m, r.pairA, r.pairB);
  });
  return mean(supports);
}

// --------------------------------------------------------------------------
// Tree / circular-order compatibility.
// --------------------------------------------------------------------------

/**
 * Is `side` a contiguous arc in the circular `order`? Returns the placement
 * {start,length} or null. Faithful port of map.js `circularSidePlacement`
 * (only proper sides, size in [2, n-2], are placeable).
 */
function circularSidePlacement(order: number[], side: number[]): { start: number; length: number } | null {
  const length = side.length;
  if (length < 2 || length > order.length - 2) return null;
  const sideSet = new Set(side);
  for (let start = 0; start < order.length; start += 1) {
    const isInterval = Array.from({ length }, (_, offset) => order[(start + offset) % order.length]).every(
      (leaf) => sideSet.has(leaf),
    );
    if (isInterval) return { start, length };
  }
  return null;
}

/**
 * Can the split (given by its canonical key) be drawn as a chord of the circular
 * `order`? True iff one of its two sides is a contiguous arc. Faithful port of
 * map.js `circularSplitPlacement` (works on label keys; we map labels back to
 * indices for the arc test).
 */
export function circularSplitPlacement(m: DistanceMatrix, order: number[], splitKey: string): boolean {
  const labelToIndex = new Map(m.leaves.map((l, i) => [l, i]));
  const toIndices = (s: string): number[] =>
    s.length === 0 ? [] : s.split('').map((ch) => labelToIndex.get(ch)!);
  const [leftStr, rightStr] = splitKey.split('|');
  const left = toIndices(leftStr);
  const right = toIndices(rightStr);
  return circularSidePlacement(order, left) !== null || circularSidePlacement(order, right) !== null;
}

/**
 * Is `tree` compatible with circular `order` (every interior split is a chord of
 * the order)? Faithful port of map.js `treeCompatibleWithOrder`.
 */
export function treeCompatibleWithOrder(m: DistanceMatrix, tree: Tree, order: number[]): boolean {
  return tree.splits.every((splitKey) => circularSplitPlacement(m, order, splitKey));
}
