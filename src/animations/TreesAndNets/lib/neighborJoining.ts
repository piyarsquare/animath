// Neighbor joining (Saitou–Nei) on a distance matrix → an unrooted tree with
// branch lengths, plus the canonical split keys of its interior edges.
//
// REPRESENTATION CONVENTION:
//   - Leaves are 0-based indices `0..n-1`; node ids in the returned graph are
//     display labels for leaves and "u0","u1",… for the joined interior nodes
//     (matching quantum-tree, so the result is directly drawable).
//
// Faithful port of quantum-tree docs/map.js `computeNeighborJoining` and
// `splitForEdge`. The Q-criterion, the (size-2) divergence weighting, the
// branch-length split (0.5·d ± 0.5·δ), the deterministic lexical tie-break on
// the pair key, and the 1e-9 tolerance are all preserved.

import type { DistanceMatrix } from './metric';
import { dist, leafCount } from './metric';
import { canonicalSplitKey } from './trees';

export interface NJEdge {
  /** Node id (label or "u#"). */
  left: string;
  /** Node id (label or "u#"). */
  right: string;
  /** Branch length. */
  length: number;
}

export interface NJResult {
  /** All node ids (leaf labels + interior "u#"), in creation order. */
  nodes: string[];
  /** Tree edges with lengths. */
  edges: NJEdge[];
  /** Canonical split keys of the interior edges (proper splits only). */
  splitKeys: string[];
}

/**
 * Run neighbor joining on `m`. Returns the tree (nodes + weighted edges) and the
 * canonical keys of its interior splits. Faithful port of map.js.
 */
export function computeNeighborJoining(m: DistanceMatrix): NJResult {
  const n = leafCount(m);
  const leaves = m.leaves.slice();

  // graph: node id -> (neighbor id -> edge). distances: keyed pair -> value.
  const graph = new Map<string, Map<string, NJEdge>>();
  const distances = new Map<string, number>();
  const edges: NJEdge[] = [];
  const nodeOrder: string[] = [];
  let clusters: string[] = leaves.slice();
  let internalIndex = 0;

  const distanceKey = (left: string, right: string): string => [left, right].sort().join('|');
  const getDistance = (left: string, right: string): number => distances.get(distanceKey(left, right))!;
  const setDistance = (left: string, right: string, value: number): void => {
    distances.set(distanceKey(left, right), value);
  };
  const addNode = (id: string): void => {
    if (!graph.has(id)) {
      graph.set(id, new Map());
      nodeOrder.push(id);
    }
  };
  const addEdge = (left: string, right: string, length: number): void => {
    addNode(left);
    addNode(right);
    const edge: NJEdge = { left, right, length };
    edges.push(edge);
    graph.get(left)!.set(right, edge);
    graph.get(right)!.set(left, edge);
  };

  leaves.forEach(addNode);
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      setDistance(leaves[i], leaves[j], dist(m, i, j));
    }
  }

  while (clusters.length > 2) {
    const size = clusters.length;
    const totals = new Map<string, number>(
      clusters.map((left) => [
        left,
        clusters.reduce((sum, right) => (left === right ? sum : sum + getDistance(left, right)), 0),
      ]),
    );

    let bestPair: [string, string] | null = null;
    let bestScore = Infinity;
    for (let i = 0; i < clusters.length; i += 1) {
      for (let j = i + 1; j < clusters.length; j += 1) {
        const left = clusters[i];
        const right = clusters[j];
        const score = (size - 2) * getDistance(left, right) - totals.get(left)! - totals.get(right)!;
        const label = distanceKey(left, right);
        const bestLabel = bestPair ? distanceKey(bestPair[0], bestPair[1]) : '';
        if (score < bestScore - 1e-9 || (Math.abs(score - bestScore) < 1e-9 && label < bestLabel)) {
          bestPair = [left, right];
          bestScore = score;
        }
      }
    }

    const [left, right] = bestPair!;
    const pairDistance = getDistance(left, right);
    const delta = (totals.get(left)! - totals.get(right)!) / (size - 2);
    const leftLength = 0.5 * pairDistance + 0.5 * delta;
    const rightLength = pairDistance - leftLength;
    const joined = `u${internalIndex}`;
    internalIndex += 1;
    addEdge(joined, left, leftLength);
    addEdge(joined, right, rightLength);

    clusters
      .filter((id) => id !== left && id !== right)
      .forEach((other) => {
        setDistance(
          joined,
          other,
          0.5 * (getDistance(left, other) + getDistance(right, other) - pairDistance),
        );
      });

    clusters = clusters.filter((id) => id !== left && id !== right);
    clusters.push(joined);
  }

  addEdge(clusters[0], clusters[1], getDistance(clusters[0], clusters[1]));

  const leafSet = new Set(leaves);
  const labelToIndex = new Map(leaves.map((l, i) => [l, i]));
  const splitKeys = edges
    .map(({ left, right }) => splitForEdge(graph, left, right, leafSet))
    .filter((side) => side.length >= 2 && side.length <= n - 2)
    .map((side) => canonicalSplitKey(m, side.map((l) => labelToIndex.get(l)!)));

  return { nodes: nodeOrder, edges, splitKeys };
}

/**
 * Leaves reachable from `start` without crossing into `blocked` — one side of
 * the split induced by edge (start, blocked). Faithful port of map.js
 * `splitForEdge` (DFS flood-fill over the NJ graph).
 */
export function splitForEdge(
  graph: Map<string, Map<string, NJEdge>>,
  start: string,
  blocked: string,
  leafSet: Set<string>,
): string[] {
  const seen = new Set<string>([blocked]);
  const stack: string[] = [start];
  const leaves: string[] = [];
  while (stack.length > 0) {
    const node = stack.pop()!;
    if (seen.has(node)) continue;
    seen.add(node);
    if (leafSet.has(node)) leaves.push(node);
    graph.get(node)!.forEach((_edge, next) => {
      if (!seen.has(next)) stack.push(next);
    });
  }
  return leaves;
}

/** Stable id for the undirected edge between nodes `a` and `b` (sorted). */
export function njEdgeId(a: string, b: string): string {
  return a < b ? `${a}~${b}` : `${b}~${a}`;
}

/**
 * The path in the NJ tree between two leaves: the set of edge ids it traverses
 * and the summed branch length (the tree's distance for that pair). For an
 * additive metric this `dist` reproduces the input distance — which is exactly
 * the "matrix → solution" bridge the UI draws when you pick a pair.
 */
export function njLeafPathInfo(nj: NJResult, a: string, b: string): { edgeIds: Set<string>; dist: number } {
  const adj = new Map<string, { to: string; len: number }[]>();
  nj.nodes.forEach((id) => adj.set(id, []));
  nj.edges.forEach((e) => {
    adj.get(e.left)!.push({ to: e.right, len: e.length });
    adj.get(e.right)!.push({ to: e.left, len: e.length });
  });
  const prev = new Map<string, { node: string; len: number }>();
  const seen = new Set<string>([a]);
  const queue: string[] = [a];
  while (queue.length > 0) {
    const u = queue.shift()!;
    if (u === b) break;
    for (const { to, len } of adj.get(u) ?? []) {
      if (!seen.has(to)) {
        seen.add(to);
        prev.set(to, { node: u, len });
        queue.push(to);
      }
    }
  }
  const edgeIds = new Set<string>();
  let dist = 0;
  let cur = b;
  while (cur !== a) {
    const p = prev.get(cur);
    if (!p) break;
    edgeIds.add(njEdgeId(cur, p.node));
    dist += p.len;
    cur = p.node;
  }
  return { edgeIds, dist };
}
