// Circular split systems and their non-negative weights (the "split network"),
// plus the Levy–Pachter circular ordering that picks a canonical tile.
//
// REPRESENTATION CONVENTION:
//   - Leaves are 0-based indices `0..n-1`; the matrix carries display labels.
//   - A circular order is an index array (see orders.ts). `computeLevyPachter-
//     Ordering` returns a canonical circular order as a LEAF-INDEX ARRAY.
//   - Tie-break strings in the Levy–Pachter selection are built from the
//     matrix's display labels, faithfully reproducing quantum-tree's lexical
//     comparisons (e.g. component label "ab", endpoint pair "a|b").
//
// Faithful port of quantum-tree docs/map.js:
//   circularDisplayedSplits, splitSeparates, solveSplitWeights (+ solveWeights-
//   ForSplits), nonnegativeLeastSquares, solveLeastSquares, solveLinearSystem,
//   computeLevyPachterOrdering (+ selectLevyPachterComponentPair, selectLevy-
//   PachterEndpointPair, componentDistance, endpointComponentDistance,
//   weightedComponentLeaves, componentEndpoints, orientComponentAtEndpoint).
// The active-set NNLS loop, the 1e-9 / 1e-10 tolerances, the normal-equation
// 1e-9 ridge, and every lexical tie-break are preserved.

import type { DistanceMatrix } from './metric';
import { dist, leafCount } from './metric';
import { canonicalCircularOrder } from './orders';
import { canonicalSplitKey } from './trees';

// --------------------------------------------------------------------------
// Circular displayed splits + the linear-algebra trio.
// --------------------------------------------------------------------------

/** A split displayed as a circular interval of an order. */
export interface DisplayedSplit {
  /** Canonical split key (label string "small|big"). */
  key: string;
  /** Leaf indices on the interval side. */
  side: number[];
  /** True for singleton (trivial / pendant) splits. */
  trivial: boolean;
  /** Start position of the interval in the order. */
  start: number;
  /** Interval length (= side.length). */
  length: number;
}

/** k-combinations of `items`. */
function combinations<T>(items: T[], size: number): T[][] {
  if (size === 0) return [[]];
  if (items.length < size) return [];
  const [head, ...tail] = items;
  return [
    ...combinations(tail, size - 1).map((combo) => [head, ...combo]),
    ...combinations(tail, size),
  ];
}

/**
 * The circular split system displayed by an order: all n singletons, then every
 * contiguous arc of length 2 .. ⌊n/2⌋ (deduped by canonical key). Faithful port
 * of map.js `circularDisplayedSplits`.
 */
export function circularDisplayedSplits(m: DistanceMatrix, order: number[]): DisplayedSplit[] {
  const n = leafCount(m);
  const splits: DisplayedSplit[] = [];
  for (let i = 0; i < n; i += 1) {
    const leaf = i;
    splits.push({
      key: canonicalSplitKey(m, [leaf]),
      side: [leaf],
      trivial: true,
      start: order.indexOf(leaf),
      length: 1,
    });
  }
  const seen = new Set(splits.map((s) => s.key));
  const maxLength = Math.floor(n / 2);
  for (let length = 2; length <= maxLength; length += 1) {
    for (let start = 0; start < order.length; start += 1) {
      const side = Array.from({ length }, (_, offset) => order[(start + offset) % order.length]);
      const key = canonicalSplitKey(m, side);
      if (seen.has(key)) continue;
      seen.add(key);
      splits.push({ key, side, trivial: false, start, length });
    }
  }
  return splits;
}

/** Does `split` separate leaves `left` and `right`? (map.js `splitSeparates`.) */
export function splitSeparates(split: { side: number[] }, left: number, right: number): boolean {
  const side = new Set(split.side);
  return side.has(left) !== side.has(right);
}

/**
 * Solve a least-squares system (normal equations) restricted to `activeColumns`,
 * with a 1e-9 ridge on the diagonal. Faithful port of map.js `solveLeastSquares`.
 */
export function solveLeastSquares(matrix: number[][], target: number[], activeColumns: number[]): number[] {
  const p = activeColumns.length;
  const normal = Array.from({ length: p }, () => Array(p).fill(0));
  const rhs = Array(p).fill(0);
  matrix.forEach((row, rowIndex) => {
    activeColumns.forEach((colA, a) => {
      rhs[a] += row[colA] * target[rowIndex];
      activeColumns.forEach((colB, b) => {
        normal[a][b] += row[colA] * row[colB];
      });
    });
  });
  for (let i = 0; i < p; i += 1) normal[i][i] += 1e-9;
  return solveLinearSystem(normal, rhs);
}

/**
 * Gaussian elimination with partial pivoting. Singular pivots (|p|<1e-10) are
 * skipped, leaving that variable at 0. Faithful port of map.js
 * `solveLinearSystem`.
 */
export function solveLinearSystem(matrix: number[][], rhs: number[]): number[] {
  const n = rhs.length;
  const a = matrix.map((row, index) => [...row, rhs[index]]);
  for (let col = 0; col < n; col += 1) {
    let pivot = col;
    for (let row = col + 1; row < n; row += 1) {
      if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) pivot = row;
    }
    if (Math.abs(a[pivot][col]) < 1e-10) continue;
    [a[col], a[pivot]] = [a[pivot], a[col]];
    const divisor = a[col][col];
    for (let j = col; j <= n; j += 1) a[col][j] /= divisor;
    for (let row = 0; row < n; row += 1) {
      if (row === col) continue;
      const factor = a[row][col];
      for (let j = col; j <= n; j += 1) a[row][j] -= factor * a[col][j];
    }
  }
  return a.map((row) => row[n] || 0);
}

/**
 * Non-negative least squares via the Lawson–Hanson active-set strategy used by
 * quantum-tree: drop the most-negative column and re-solve until the active
 * solution is non-negative. Faithful port of map.js `nonnegativeLeastSquares`.
 */
export function nonnegativeLeastSquares(matrix: number[][], target: number[]): number[] {
  const active = matrix[0].map((_, index) => index);
  const weights = Array(matrix[0].length).fill(0);
  while (active.length > 0) {
    const solution = solveLeastSquares(matrix, target, active);
    let mostNegative = -1;
    let mostNegativeValue = -1e-9;
    solution.forEach((value, index) => {
      if (value < mostNegativeValue) {
        mostNegativeValue = value;
        mostNegative = index;
      }
    });
    if (mostNegative === -1) {
      active.forEach((column, index) => {
        weights[column] = Math.max(0, solution[index]);
      });
      return weights;
    }
    active.splice(mostNegative, 1);
  }
  return weights;
}

/** A weighted circular split: the displayed split plus its fitted weight. */
export interface WeightedDisplayedSplit extends DisplayedSplit {
  weight: number;
}

function solveWeightsForSplits(m: DistanceMatrix, splits: DisplayedSplit[]): WeightedDisplayedSplit[] {
  const n = leafCount(m);
  const pairs = combinations(
    Array.from({ length: n }, (_, i) => i),
    2,
  );
  const matrix = pairs.map(([left, right]) => splits.map((split) => (splitSeparates(split, left, right) ? 1 : 0)));
  const target = pairs.map(([left, right]) => dist(m, left, right));
  const weights = nonnegativeLeastSquares(matrix, target);
  return splits.map((split, index) => ({ ...split, weight: weights[index] }));
}

/**
 * Non-negative split weights for the circular order: fit the displayed split
 * system to the metric (one row per leaf pair). Faithful port of map.js
 * `solveSplitWeights` (+ `solveWeightsForSplits`).
 */
export function solveSplitWeights(m: DistanceMatrix, order: number[]): WeightedDisplayedSplit[] {
  return solveWeightsForSplits(m, circularDisplayedSplits(m, order));
}

// --------------------------------------------------------------------------
// Levy–Pachter circular ordering.
// --------------------------------------------------------------------------

interface LPComponent {
  /** Ordered leaf indices making up this component (a path). */
  order: number[];
}

/** The endpoints of a component path (1 for a singleton, else both ends). */
function componentEndpoints(order: number[]): number[] {
  return order.length === 1 ? [order[0]] : [order[0], order[order.length - 1]];
}

/** Endpoints with weights: 1 for a singleton, 0.5 each for a path's two ends. */
function weightedComponentLeaves(component: LPComponent): { leaf: number; weight: number }[] {
  const endpoints = componentEndpoints(component.order);
  const weight = endpoints.length === 1 ? 1 : 0.5;
  return endpoints.map((leaf) => ({ leaf, weight }));
}

/** Endpoint-weighted distance between two components. (map.js `componentDistance`.) */
function componentDistance(m: DistanceMatrix, left: LPComponent, right: LPComponent): number {
  return weightedComponentLeaves(left).reduce(
    (sum, leftLeaf) =>
      sum +
      weightedComponentLeaves(right).reduce(
        (inner, rightLeaf) => inner + leftLeaf.weight * rightLeaf.weight * dist(m, leftLeaf.leaf, rightLeaf.leaf),
        0,
      ),
    0,
  );
}

/** Endpoint-weighted distance from a single leaf to a component. */
function endpointComponentDistance(m: DistanceMatrix, leaf: number, component: LPComponent): number {
  return weightedComponentLeaves(component).reduce((sum, item) => sum + item.weight * dist(m, leaf, item.leaf), 0);
}

/** Label string of a component's leaf path (for tie-breaks). */
function componentLabel(m: DistanceMatrix, component: LPComponent): string {
  return component.order.map((i) => m.leaves[i]).join('');
}

/** Reorient a component so `endpoint` is at the requested end. (map.js.) */
function orientComponentAtEndpoint(order: number[], endpoint: number, position: 'start' | 'end'): number[] {
  const endpointIsStart = order[0] === endpoint;
  const endpointIsEnd = order[order.length - 1] === endpoint;
  if (!endpointIsStart && !endpointIsEnd) return [...order];
  if (position === 'start') return endpointIsStart ? [...order] : [...order].reverse();
  return endpointIsEnd ? [...order] : [...order].reverse();
}

/** Pick the component pair to merge by the NJ-style Q-criterion. (map.js.) */
function selectLevyPachterComponentPair(
  m: DistanceMatrix,
  components: LPComponent[],
): { left: number; right: number } {
  const totals = components.map((component, index) =>
    components.reduce(
      (sum, other, otherIndex) => (index === otherIndex ? sum : sum + componentDistance(m, component, other)),
      0,
    ),
  );
  let best: { left: number; right: number; value: number; label: string } | null = null;
  for (let left = 0; left < components.length; left += 1) {
    for (let right = left + 1; right < components.length; right += 1) {
      const value =
        (components.length - 2) * componentDistance(m, components[left], components[right]) -
        totals[left] -
        totals[right];
      const label = `${componentLabel(m, components[left])}|${componentLabel(m, components[right])}`;
      if (
        !best ||
        value < best.value - 1e-9 ||
        (Math.abs(value - best.value) < 1e-9 && label < best.label)
      ) {
        best = { left, right, value, label };
      }
    }
  }
  return { left: best!.left, right: best!.right };
}

/** Pick which endpoints of the chosen pair to splice together. (map.js.) */
function selectLevyPachterEndpointPair(
  m: DistanceMatrix,
  components: LPComponent[],
  leftIndex: number,
  rightIndex: number,
): { left: number; right: number } {
  const leftComponent = components[leftIndex];
  const rightComponent = components[rightIndex];
  const leftEndpoints = componentEndpoints(leftComponent.order);
  const rightEndpoints = componentEndpoints(rightComponent.order);
  const outside = components.filter((_, index) => index !== leftIndex && index !== rightIndex);
  const mergedLeaves = [...leftComponent.order, ...rightComponent.order];
  const factor = components.length - 4 + leftEndpoints.length + rightEndpoints.length;
  let best: { left: number; right: number; value: number; label: string } | null = null;

  leftEndpoints.forEach((left) => {
    rightEndpoints.forEach((right) => {
      const outsideDistance = outside.reduce(
        (sum, component) =>
          sum + endpointComponentDistance(m, left, component) + endpointComponentDistance(m, right, component),
        0,
      );
      const leftInternal = mergedLeaves.reduce((sum, leaf) => (leaf === left ? sum : sum + dist(m, left, leaf)), 0);
      const rightInternal = mergedLeaves.reduce(
        (sum, leaf) => (leaf === right ? sum : sum + dist(m, right, leaf)),
        0,
      );
      const value = factor * dist(m, left, right) - outsideDistance - leftInternal - rightInternal;
      const label = `${m.leaves[left]}|${m.leaves[right]}`;
      if (
        !best ||
        value < best.value - 1e-9 ||
        (Math.abs(value - best.value) < 1e-9 && label < best.label)
      ) {
        best = { left, right, value, label };
      }
    });
  });

  return { left: best!.left, right: best!.right };
}

/**
 * The Levy–Pachter circular ordering of the leaves: a neighbor-joining-style
 * agglomeration over path components, splicing endpoints, until one cycle
 * remains. Returns the canonical circular order as a leaf-index array. Faithful
 * port of map.js `computeLevyPachterOrdering`.
 */
export function computeLevyPachterOrdering(m: DistanceMatrix): number[] {
  const n = leafCount(m);
  let components: LPComponent[] = Array.from({ length: n }, (_, i) => ({ order: [i] }));

  while (components.length > 1) {
    const pair = selectLevyPachterComponentPair(m, components);
    const endpoints = selectLevyPachterEndpointPair(m, components, pair.left, pair.right);
    const left = orientComponentAtEndpoint(components[pair.left].order, endpoints.left, 'end');
    const right = orientComponentAtEndpoint(components[pair.right].order, endpoints.right, 'start');
    const merged: LPComponent = { order: [...left, ...right] };
    components = components
      .filter((_, index) => index !== pair.left && index !== pair.right)
      .concat(merged);
  }

  return canonicalCircularOrder(components[0].order);
}
