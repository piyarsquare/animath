// Circular orders of n leaves — the tiles of the mosaic M̄_{0,n}(ℝ).
//
// REPRESENTATION CONVENTION (shared across this engine):
//   - Leaves are 0-based indices `0..n-1` internally; a `DistanceMatrix`
//     carries the display labels separately (`leaves: string[]`).
//   - A "circular order" is an array of `n` distinct leaf indices read around a
//     circle (the boundary of a convex n-gon). Two orders are the SAME tile iff
//     they differ by a rotation and/or a reflection (the dihedral group D_n),
//     so there are (n-1)!/2 distinct orders.
//   - The canonical representative anchors leaf 0 first and picks the
//     lexicographically smaller of {forward, reversed} on the remaining suffix.
//     This matches quantum-tree's `canonicalCircularOrder` exactly (it anchored
//     on the first *label*, which under index ordering is leaf 0).
//
// Ported faithfully from quantum-tree docs/map.js:
//   `canonicalOrders` / `canonicalOrderTemplates` / `canonicalCircularOrder`.
// The originals operated on label strings; here we operate on indices, and the
// tie-break (smaller suffix wins) is preserved by comparing index arrays
// lexicographically — identical orderings because labels were assigned in index
// order.

/** All permutations of `items` (used only for small n; n! growth). */
function permutations<T>(items: T[]): T[][] {
  if (items.length === 0) return [[]];
  return items.flatMap((item, index) => {
    const rest = [...items.slice(0, index), ...items.slice(index + 1)];
    return permutations(rest).map((permutation) => [item, ...permutation]);
  });
}

/** Lexicographic comparison of two equal-length index arrays. */
function lexLess(a: number[], b: number[]): boolean {
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return a[i] < b[i];
  }
  return false;
}

/**
 * Canonical representative of a circular order under rotation + reflection.
 *
 * Anchors leaf 0 to the front, then keeps whichever of {forward, reversed} has
 * the lexicographically smaller suffix (everything after the anchor). Faithful
 * port of map.js `canonicalCircularOrder` (anchor = first leaf, compare suffix
 * strings) translated to the index representation.
 */
export function canonicalCircularOrder(order: number[]): number[] {
  const anchor = 0;
  const rotateToAnchor = (items: number[]): number[] => {
    const index = items.indexOf(anchor);
    return [...items.slice(index), ...items.slice(0, index)];
  };
  const forward = rotateToAnchor(order);
  const reverse = rotateToAnchor([...order].reverse());
  return lexLess(forward.slice(1), reverse.slice(1)) ? forward : reverse;
}

export interface CircularOrder {
  /** Canonical id (e.g. "0,1,2,3"). */
  id: string;
  /** Display label, e.g. "(0,1,2,3)". */
  label: string;
  /** The canonical leaf-index sequence around the circle. */
  order: number[];
}

/**
 * All distinct circular orders of `n` leaves (dihedral classes): (n-1)!/2.
 *
 * Faithful port of map.js `canonicalOrderTemplates`: fix leaf 0 first, permute
 * the rest, keep one of each {forward, reversed} pair by requiring the forward
 * suffix to be strictly smaller than the reversed suffix.
 */
export function canonicalOrders(n: number): CircularOrder[] {
  if (n < 3) {
    const order = Array.from({ length: n }, (_, i) => i);
    return [{ id: order.join(','), label: `(${order.join(',')})`, order }];
  }
  const rest = Array.from({ length: n - 1 }, (_, i) => i + 1);
  return permutations(rest)
    .map((tail) => [0, ...tail])
    .filter((order) => lexLess(order.slice(1), [...order].slice(1).reverse()))
    .map((order) => ({
      id: order.join(','),
      label: `(${order.join(',')})`,
      order,
    }));
}
