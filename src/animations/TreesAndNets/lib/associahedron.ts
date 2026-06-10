// Associahedron geometry for Trees and Nets.
//
// Fix a circular order of `n` leaves on the boundary of a convex n-gon. The
// unrooted binary trees compatible with that order are in bijection with the
// triangulations of the n-gon (diagonals = internal edges/splits, flips =
// diagonal flips). That set, with flips as edges, is the 1-skeleton of the
// associahedron K_{n-1} of dimension n-3.
//
// This module enumerates the triangulations, builds the flip graph, and realizes
// the polytope with Loday's coordinates — which land in R^{n-2} on the hyperplane
// (sum = C(n-1,2)), so the intrinsic geometry is (n-3)-dimensional: a 3D polytope
// for n=6 (14 vertices) and a 4D polytope for n=7 (42 vertices, for the 4D→3D
// projection viewer). Verified counts: Catalan(n-2) vertices, (n-3)-regular.

export interface Triangulation {
  /** Canonical id: sorted diagonal keys joined by "|" (empty for n<4). */
  id: string;
  /** Internal diagonals as [lo, hi] vertex pairs (n-3 of them). */
  diagonals: [number, number][];
  /** The n-2 triangles as [a, b, c] vertex triples. */
  triangles: [number, number, number][];
  /** Loday coordinates in R^{n-2}, on the hyperplane sum = C(n-1, 2). */
  loday: number[];
  /** Intrinsic polytope coordinates in R^{n-3} (orthonormal hyperplane basis). */
  point: number[];
}

export interface Associahedron {
  /** Number of leaves = polygon vertices. */
  n: number;
  /** Intrinsic dimension of the polytope (n-3). */
  dim: number;
  /** One vertex per triangulation (Catalan(n-2) of them). */
  vertices: Triangulation[];
  /** Flip adjacencies as index pairs into `vertices` (the 1-skeleton). */
  edges: [number, number][];
}

const isBoundaryEdge = (a: number, b: number, n: number): boolean => {
  const d = Math.abs(a - b);
  return d === 1 || d === n - 1;
};

const sideKey = (a: number, b: number): string =>
  a < b ? `${a},${b}` : `${b},${a}`;

/** All triangle-sets of the arc `B` whose base edge is (B[0], B[last]). */
function triangulateArc(B: number[]): [number, number, number][][] {
  if (B.length < 3) return [[]];
  const a = B[0];
  const b = B[B.length - 1];
  const out: [number, number, number][][] = [];
  for (let k = 1; k < B.length - 1; k++) {
    const apex = B[k];
    const left = triangulateArc(B.slice(0, k + 1));
    const right = triangulateArc(B.slice(k));
    for (const tl of left) {
      for (const tr of right) {
        out.push([[a, apex, b], ...tl, ...tr]);
      }
    }
  }
  return out;
}

function diagonalsOf(
  triangles: [number, number, number][],
  n: number,
): [number, number][] {
  const seen = new Set<string>();
  const diags: [number, number][] = [];
  for (const [x, y, z] of triangles) {
    for (const [a, b] of [
      [x, y],
      [y, z],
      [x, z],
    ] as [number, number][]) {
      const lo = Math.min(a, b);
      const hi = Math.max(a, b);
      if (isBoundaryEdge(lo, hi, n)) continue;
      const key = `${lo},${hi}`;
      if (!seen.has(key)) {
        seen.add(key);
        diags.push([lo, hi]);
      }
    }
  }
  diags.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  return diags;
}

/**
 * Loday coordinates. Root the triangulation at the base edge (0, n-1); leaves
 * are the boundary edges (i, i+1) for i = 0..n-2 (n-1 leaves). Each internal node
 * (triangle) owns one gap between consecutive leaves; its coordinate is
 * (#leaves in its left subtree) * (#leaves in its right subtree).
 */
function lodayCoords(triangles: [number, number, number][], n: number): number[] {
  const sides = new Set<string>();
  for (const [x, y, z] of triangles) {
    sides.add(sideKey(x, y));
    sides.add(sideKey(y, z));
    sides.add(sideKey(x, z));
  }
  const coords = new Array<number>(Math.max(n - 2, 0)).fill(0);
  const build = (arc: number[]): number => {
    if (arc.length === 2) return 1; // a single boundary edge = one leaf
    const a = arc[0];
    const b = arc[arc.length - 1];
    for (let k = 1; k < arc.length - 1; k++) {
      const m = arc[k];
      if (sides.has(sideKey(a, m)) && sides.has(sideKey(m, b))) {
        const left = build(arc.slice(0, k + 1));
        const right = build(arc.slice(k));
        coords[m - 1] = left * right; // gap left of vertex m → axis index m-1
        return left + right;
      }
    }
    throw new Error(`associahedron: no apex on base (${a}, ${b})`);
  };
  if (n >= 3) build(Array.from({ length: n }, (_, i) => i));
  return coords;
}

/**
 * Orthonormal (Helmert) basis of the sum-zero subspace of R^m: m-1 unit vectors
 * orthogonal to the all-ones direction. Projecting a constant-sum point onto them
 * drops the (constant) hyperplane offset and yields intrinsic R^{m-1} coordinates.
 */
function helmertBasis(m: number): number[][] {
  const basis: number[][] = [];
  for (let k = 1; k <= m - 1; k++) {
    const e = new Array<number>(m).fill(0);
    const norm = Math.sqrt(k * (k + 1));
    for (let i = 0; i < k; i++) e[i] = 1 / norm;
    e[k] = -k / norm;
    basis.push(e);
  }
  return basis;
}

/** Build the associahedron for `n` leaves (n >= 3). */
export function buildAssociahedron(n: number): Associahedron {
  const dim = Math.max(n - 3, 0);
  const triangleSets = triangulateArc(Array.from({ length: n }, (_, i) => i));
  const basis = helmertBasis(Math.max(n - 2, 1));

  const vertices: Triangulation[] = triangleSets.map((triangles) => {
    const diagonals = diagonalsOf(triangles, n);
    const loday = lodayCoords(triangles, n);
    const point = basis.map((e) => e.reduce((sum, ei, i) => sum + ei * loday[i], 0));
    return {
      id: diagonals.map(([a, b]) => `${a},${b}`).join("|"),
      diagonals,
      triangles,
      loday,
      point,
    };
  });

  // Flip graph: two triangulations are adjacent iff their diagonal sets differ by
  // exactly one diagonal (symmetric difference of size 2).
  const edges: [number, number][] = [];
  const diagKeySets = vertices.map((v) => new Set(v.diagonals.map(([a, b]) => `${a},${b}`)));
  for (let i = 0; i < vertices.length; i++) {
    for (let j = i + 1; j < vertices.length; j++) {
      let symDiff = 0;
      for (const d of diagKeySets[i]) if (!diagKeySets[j].has(d)) symDiff++;
      for (const d of diagKeySets[j]) if (!diagKeySets[i].has(d)) symDiff++;
      if (symDiff === 2) edges.push([i, j]);
    }
  }

  return { n, dim, vertices, edges };
}
