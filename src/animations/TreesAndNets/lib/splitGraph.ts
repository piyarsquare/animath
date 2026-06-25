// The circular split graph (a SplitsTree-style planar split network), built by
// the small convex-hull / circle-insertion construction. This is the visual
// signature of the split system: a tree-like (compatible) split system collapses
// to a tree, while a conflicted one opens "boxes" (parallelogram bands) — each
// band is a bundle of parallel edges that all represent the same split, and the
// band's separation encodes that split's weight.
//
// REPRESENTATION CONVENTION (shared across this engine):
//   - Leaves are 0-based indices `0..n-1`; `split.side` is a list of indices.
//   - The full leaf set ("activeLeaves" in the source) is just `[0..n-1]`.
//   - A circular order is a leaf-index array (see orders.ts).
//
// Faithful port of quantum-tree docs/map.js:
//   buildCircularSplitGraph (the convex-hull band-duplication builder, comment:
//   "Small convex-hull split-graph builder, following the Splitstree construction
//   at a compact scale"), positionSplitGraph, splitGraphVectors (the equal-angle
//   method), classifyGraphNodesBySplit, and normalizeGraphPositions — plus the
//   `splitDrawWeightEpsilon = 1e-6` drawable-weight filter that map.js applies in
//   `drawableSplitWeights` before handing the splits to the builder.
//
// The original operated on label strings and read `activeLeaves` from a global;
// here everything is indices and the leaf set is passed in as `n`. Every other
// detail is preserved: the split insertion order (by side size, then key), the
// 0/1/2 hull marking, the intersection band duplication and edge rerouting, the
// equal-angle vectors with their `maxWeight * 0.07` display floor, the
// summed-vector node positions, and the margin-42 normalization box.

import type { WeightedDisplayedSplit } from './splitWeights';

// --------------------------------------------------------------------------
// Public output shape (a plain planar graph ready to draw as SVG segments).
// --------------------------------------------------------------------------

/** A node of the split graph at its laid-out position. */
export interface SplitGraphNode {
  /** Laid-out x coordinate (in the normalization box). */
  x: number;
  /** Laid-out y coordinate (in the normalization box). */
  y: number;
  /** Which leaf indices land on this node (usually 1 for a leaf node, else 0). */
  leaves: number[];
}

/** An edge of the split graph: a segment between node `a` and node `b`. */
export interface SplitGraphEdge {
  /** Index into `nodes` of one endpoint. */
  a: number;
  /** Index into `nodes` of the other endpoint. */
  b: number;
  /** Canonical key of the split this edge represents (parallel edges share it). */
  splitKey: string;
  /** Weight of that split (the band separation / branch length it encodes). */
  weight: number;
}

/** A planar split graph: positioned nodes + the split edges between them. */
export interface SplitGraph {
  nodes: SplitGraphNode[];
  edges: SplitGraphEdge[];
}

/** Drawable-weight epsilon (map.js `splitDrawWeightEpsilon`). */
export const SPLIT_DRAW_WEIGHT_EPSILON = 1e-6;

// --------------------------------------------------------------------------
// Internal mutable graph (faithful to map.js: nodes carry a taxa set + their
// incident edge ids; edges carry their split and a soft-delete flag).
// --------------------------------------------------------------------------

interface InternalNode {
  id: number;
  taxa: Set<number>;
  edgeIds: number[];
}

interface InternalEdge {
  id: number;
  left: number;
  right: number;
  split: WeightedDisplayedSplit;
  weight: number;
  deleted: boolean;
}

interface InternalGraph {
  nodes: InternalNode[];
  edges: InternalEdge[];
}

/**
 * The convex-hull split-graph builder. Start from a single node holding every
 * leaf, then introduce each split in turn (smallest side first, ties by key):
 * grow the two convex hulls the split separates, find the band of nodes shared
 * by both hulls, duplicate that band and reconnect across it with the new split's
 * parallel edges. Faithful port of map.js `buildCircularSplitGraph`.
 */
function buildInternalGraph(splits: WeightedDisplayedSplit[], activeLeaves: number[]): InternalGraph {
  const graph: InternalGraph = { nodes: [], edges: [] };

  const addNode = (taxa: number[] = []): number => {
    const node: InternalNode = { id: graph.nodes.length, taxa: new Set(taxa), edgeIds: [] };
    graph.nodes.push(node);
    return node.id;
  };

  const addEdge = (left: number, right: number, split: WeightedDisplayedSplit): number => {
    const edge: InternalEdge = {
      id: graph.edges.length,
      left,
      right,
      split,
      weight: split.weight,
      deleted: false,
    };
    graph.edges.push(edge);
    graph.nodes[left].edgeIds.push(edge.id);
    graph.nodes[right].edgeIds.push(edge.id);
    return edge.id;
  };

  const deleteEdge = (edgeId: number): void => {
    const edge = graph.edges[edgeId];
    if (!edge || edge.deleted) return;
    edge.deleted = true;
    graph.nodes[edge.left].edgeIds = graph.nodes[edge.left].edgeIds.filter((id) => id !== edgeId);
    graph.nodes[edge.right].edgeIds = graph.nodes[edge.right].edgeIds.filter((id) => id !== edgeId);
  };

  const activeEdges = (nodeId: number): InternalEdge[] =>
    graph.nodes[nodeId].edgeIds.map((edgeId) => graph.edges[edgeId]).filter((edge) => edge && !edge.deleted);

  const otherNode = (edge: InternalEdge, nodeId: number): number => (edge.left === nodeId ? edge.right : edge.left);

  const taxonNode = (taxon: number): number | null =>
    graph.nodes.find((node) => node.taxa.has(taxon))?.id ?? null;

  const hasActiveEdgeBetween = (left: number, right: number): boolean =>
    graph.edges.some(
      (edge) =>
        !edge.deleted &&
        ((edge.left === left && edge.right === right) || (edge.left === right && edge.right === left)),
    );

  const splitDividesTaxa = (taxa: Set<number>, split: WeightedDisplayedSplit): boolean => {
    const side = new Set(split.side);
    let inSide = false;
    let outSide = false;
    taxa.forEach((taxon) => {
      if (side.has(taxon)) inSide = true;
      else outSide = true;
    });
    return inSide && outSide;
  };

  // Flood-fill a convex hull across the splits that divide one side's taxa.
  // `hulls`: nodeId -> 0 (side-zero) | 1 (side-one) | 2 (both, the band).
  const convexHullPath = (
    startNode: number,
    allowedSplits: Set<string>,
    hulls: Map<number, number>,
    intersections: Set<number>,
    side: number,
  ): void => {
    const stack = [startNode];
    const visitedEdges = new Set<number>();
    while (stack.length > 0) {
      const nodeId = stack.pop() as number;
      activeEdges(nodeId).forEach((edge) => {
        if (visitedEdges.has(edge.id) || !allowedSplits.has(edge.split.key)) return;
        visitedEdges.add(edge.id);
        const next = otherNode(edge, nodeId);
        const current = hulls.get(next);
        if (current === undefined) {
          hulls.set(next, side);
          stack.push(next);
        } else if (current === 1 - side) {
          hulls.set(next, 2);
          intersections.add(next);
          stack.push(next);
        }
      });
    }
  };

  addNode(activeLeaves);
  const usedSplits: WeightedDisplayedSplit[] = [];
  [...splits]
    .sort((a, b) => a.side.length - b.side.length || a.key.localeCompare(b.key))
    .forEach((split) => {
      const sideSet = new Set(split.side);
      const sideOneTaxa = new Set(split.side);
      const sideZeroTaxa = new Set(activeLeaves.filter((taxon) => !sideSet.has(taxon)));
      let startZero: number | null = null;
      let startOne: number | null = null;
      activeLeaves.forEach((taxon) => {
        const nodeId = taxonNode(taxon);
        if (sideSet.has(taxon)) {
          if (startOne === null) startOne = nodeId;
        } else if (startZero === null) {
          startZero = nodeId;
        }
      });
      if (startZero === null || startOne === null) return;

      const hulls = new Map<number, number>([[startZero, 0]]);
      const intersections = new Set<number>();
      if (startZero === startOne) {
        hulls.set(startOne, 2);
        intersections.add(startOne);
      } else {
        hulls.set(startOne, 1);
      }

      const splitsZero = new Set(
        usedSplits.filter((used) => splitDividesTaxa(sideZeroTaxa, used)).map((used) => used.key),
      );
      const splitsOne = new Set(
        usedSplits.filter((used) => splitDividesTaxa(sideOneTaxa, used)).map((used) => used.key),
      );

      convexHullPath(startZero, splitsZero, hulls, intersections, 0);
      convexHullPath(startOne, splitsOne, hulls, intersections, 1);

      // Duplicate the band of intersection nodes; the new split's edge connects
      // each original to its duplicate, and the side-one taxa move to the dupe.
      const duplicateFor = new Map<number, number>();
      [...intersections].forEach((nodeId) => {
        const duplicate = addNode();
        duplicateFor.set(nodeId, duplicate);
        addEdge(duplicate, nodeId, split);
        const originalTaxa = [...graph.nodes[nodeId].taxa];
        graph.nodes[nodeId].taxa.clear();
        originalTaxa.forEach((taxon) => {
          if (sideSet.has(taxon)) graph.nodes[duplicate].taxa.add(taxon);
          else graph.nodes[nodeId].taxa.add(taxon);
        });
      });

      // Reroute incident edges across the band: edges into the side-one hull move
      // to the duplicate; edges between two band nodes link the two duplicates.
      [...intersections].forEach((nodeId) => {
        const duplicate = duplicateFor.get(nodeId) as number;
        activeEdges(nodeId).forEach((edge) => {
          if (edge.split.key === split.key) return;
          const next = otherNode(edge, nodeId);
          const nextHull = hulls.get(next);
          if (nextHull === 1) {
            addEdge(duplicate, next, edge.split);
            deleteEdge(edge.id);
          } else if (nextHull === 2) {
            const nextDuplicate = duplicateFor.get(next);
            if (nextDuplicate !== undefined && !hasActiveEdgeBetween(duplicate, nextDuplicate)) {
              addEdge(duplicate, nextDuplicate, edge.split);
            }
          }
        });
      });

      usedSplits.push(split);
    });

  return graph;
}

// --------------------------------------------------------------------------
// Equal-angle layout (map.js splitGraphVectors / classifyGraphNodesBySplit /
// positionSplitGraph / normalizeGraphPositions).
// --------------------------------------------------------------------------

interface SplitVector {
  /** The leaf set whose hull side this vector points toward. */
  side: Set<number>;
  x: number;
  y: number;
}

/**
 * The equal-angle method: each split becomes a 2D vector pointing at the angle of
 * its interval's midpoint in the circular order, with length = its (floored)
 * weight. Faithful port of map.js `splitGraphVectors`.
 */
function splitGraphVectors(
  order: number[],
  splits: WeightedDisplayedSplit[],
  maxWeight: number,
  activeLeaves: number[],
): Map<string, SplitVector> {
  const root = order[0];
  const n = order.length;
  const positionOf = new Map(order.map((taxon, index) => [taxon, index]));
  const vectors = new Map<string, SplitVector>();
  splits.forEach((split) => {
    const sideSet = new Set(split.side);
    const axisSide = sideSet.has(root)
      ? activeLeaves.filter((taxon) => !sideSet.has(taxon))
      : [...split.side];
    const positions = axisSide
      .map((taxon) => positionOf.get(taxon) as number)
      .sort((a, b) => a - b);
    const midpoint =
      positions.length === 0 ? 0 : (positions[0] + positions[positions.length - 1]) / 2;
    const angle = -Math.PI / 2 + (midpoint / n) * Math.PI * 2;
    const displayLength = Math.max(split.weight, maxWeight * 0.07, 1e-6);
    vectors.set(split.key, {
      side: new Set(axisSide),
      x: Math.cos(angle) * displayLength,
      y: Math.sin(angle) * displayLength,
    });
  });
  return vectors;
}

/**
 * For one split, decide for every node whether it lies on that split's axis side:
 * remove the split's edges, flood-fill connected components, and a component is
 * "on the axis side" iff any of its nodes carries an axis-side taxon. Faithful
 * port of map.js `classifyGraphNodesBySplit`.
 */
function classifyGraphNodesBySplit(
  graph: InternalGraph,
  split: WeightedDisplayedSplit,
  axisSide: Set<number>,
): Map<number, boolean> {
  const sideByNode = new Map<number, boolean>();
  const visited = new Set<number>();
  graph.nodes.forEach((node) => {
    if (visited.has(node.id)) return;
    const component: number[] = [];
    const stack = [node.id];
    visited.add(node.id);
    while (stack.length > 0) {
      const nodeId = stack.pop() as number;
      component.push(nodeId);
      graph.nodes[nodeId].edgeIds.forEach((edgeId) => {
        const edge = graph.edges[edgeId];
        if (!edge || edge.deleted || edge.split.key === split.key) return;
        const next = edge.left === nodeId ? edge.right : edge.left;
        if (!visited.has(next)) {
          visited.add(next);
          stack.push(next);
        }
      });
    }
    const onAxisSide = component.some((nodeId) =>
      [...graph.nodes[nodeId].taxa].some((taxon) => axisSide.has(taxon)),
    );
    component.forEach((nodeId) => sideByNode.set(nodeId, onAxisSide));
  });
  return sideByNode;
}

/**
 * Node position = the sum of the vectors of every split whose axis side that node
 * lies on. Faithful port of map.js `positionSplitGraph` (the equal-angle layout),
 * returning raw (un-normalized) coordinates keyed by node id.
 */
function rawPositions(
  order: number[],
  graph: InternalGraph,
  splits: WeightedDisplayedSplit[],
  maxWeight: number,
  activeLeaves: number[],
): Map<number, { x: number; y: number }> {
  const vectors = splitGraphVectors(order, splits, maxWeight, activeLeaves);
  const nodeSideBySplit = new Map(
    splits.map((split) => [
      split.key,
      classifyGraphNodesBySplit(graph, split, (vectors.get(split.key) as SplitVector).side),
    ]),
  );
  return new Map(
    graph.nodes.map((node) => {
      let x = 0;
      let y = 0;
      splits.forEach((split) => {
        if ((nodeSideBySplit.get(split.key) as Map<number, boolean>).get(node.id)) {
          const vector = vectors.get(split.key) as SplitVector;
          x += vector.x;
          y += vector.y;
        }
      });
      return [node.id, { x, y }];
    }),
  );
}

/**
 * Fit the raw positions into a `width` × `height` box with a 42px margin,
 * preserving aspect ratio and centering. Faithful port of map.js
 * `normalizeGraphPositions`.
 */
function normalizeGraphPositions(
  raw: Map<number, { x: number; y: number }>,
  width: number,
  height: number,
): Map<number, { x: number; y: number }> {
  const points = [...raw.values()];
  const minX = Math.min(...points.map((point) => point.x));
  const maxX = Math.max(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxY = Math.max(...points.map((point) => point.y));
  const rawWidth = Math.max(maxX - minX, 1e-9);
  const rawHeight = Math.max(maxY - minY, 1e-9);
  const margin = 42;
  const scale = Math.min((width - margin * 2) / rawWidth, (height - margin * 2) / rawHeight);
  const offsetX = margin + (width - margin * 2 - rawWidth * scale) / 2;
  const offsetY = margin + (height - margin * 2 - rawHeight * scale) / 2;
  return new Map(
    [...raw].map(([nodeId, point]) => [
      nodeId,
      { x: offsetX + (point.x - minX) * scale, y: offsetY + (point.y - minY) * scale },
    ]),
  );
}

// --------------------------------------------------------------------------
// Public entry.
// --------------------------------------------------------------------------

/** Layout box used by map.js (`renderSplitGraphSvg`: width 420, height 320). */
const LAYOUT_WIDTH = 420;
const LAYOUT_HEIGHT = 320;

/**
 * Build the circular split graph for a weighted split system in a circular order.
 *
 * Mirrors map.js's pipeline (`drawableSplitWeights` → `buildCircularSplitGraph` →
 * `positionSplitGraph`): keep only splits with `weight > SPLIT_DRAW_WEIGHT_EPSILON`
 * (this includes the trivial/pendant singleton splits, which become the leaf
 * edges), run the convex-hull band-duplication builder, lay the nodes out by the
 * equal-angle method, and project to a plain `{nodes, edges}` graph whose edges
 * are line segments between node positions. A compatible (tree-like) split system
 * yields a tree; a conflicted one opens boxes.
 *
 * @param splits weighted circular splits (e.g. from `solveSplitWeights`).
 * @param order  the circular leaf order (leaf-index array; `order[0]` is the root).
 * @param n      total number of leaves (the leaf set is `0..n-1`).
 */
export function buildSplitGraph(
  splits: WeightedDisplayedSplit[],
  order: number[],
  n: number,
): SplitGraph {
  const activeLeaves = Array.from({ length: n }, (_, i) => i);
  const drawable = splits.filter((split) => split.weight > SPLIT_DRAW_WEIGHT_EPSILON);

  // An empty drawable set (e.g. a degenerate metric) still yields the seed node.
  const internal = buildInternalGraph(drawable, activeLeaves);
  const maxWeight = Math.max(1e-9, ...drawable.map((split) => split.weight));
  const positioned = normalizeGraphPositions(
    rawPositions(order, internal, drawable, maxWeight, activeLeaves),
    LAYOUT_WIDTH,
    LAYOUT_HEIGHT,
  );

  // Project to the public shape, compacting node ids to a dense 0..k-1 range
  // (the internal builder never reuses ids, but soft-deletes leave none — every
  // node is real — so this is a straight copy preserving id == array index).
  const nodes: SplitGraphNode[] = internal.nodes.map((node) => {
    const point = positioned.get(node.id) ?? { x: 0, y: 0 };
    return { x: point.x, y: point.y, leaves: [...node.taxa].sort((a, b) => a - b) };
  });

  const edges: SplitGraphEdge[] = internal.edges
    .filter((edge) => !edge.deleted)
    .map((edge) => ({ a: edge.left, b: edge.right, splitKey: edge.split.key, weight: edge.weight }));

  return { nodes, edges };
}
