// Associahedron geometry for Trees and Nets.
//
// Fix a circular order of `n` leaves on the boundary of a convex n-gon. The
// unrooted binary trees compatible with that order are in bijection with the
// triangulations of the n-gon (diagonals = internal edges/splits, flips =
// diagonal flips). That set, with flips as edges, is the 1-skeleton of the
// associahedron K_{n-1} of dimension n-3.
//
// This module enumerates the triangulations, builds the flip graph, and realizes
// the polytope. Loday's integer vector (canonical but *rooted* and asymmetric) is
// kept for reference, but the rendered coordinates come from the SYMMETRIC
// secondary-polytope (GKZ) realization on the regular n-gon — which inherits the
// polygon's dihedral symmetry — reduced isometrically to its intrinsic R^{n-3}
// (3D at n=6, 4D at n=7, ...). Verified counts: Catalan(n-2) vertices, (n-3)-regular.

export interface Triangulation {
  /** Canonical id: sorted diagonal keys joined by "|" (empty for n<4). */
  id: string;
  /** Internal diagonals as [lo, hi] vertex pairs (n-3 of them). */
  diagonals: [number, number][];
  /** The n-2 triangles as [a, b, c] vertex triples. */
  triangles: [number, number, number][];
  /** Loday coordinates in R^{n-2}, on the hyperplane sum = C(n-1, 2) (reference). */
  loday: number[];
  /** Intrinsic R^{n-3} render coordinates — symmetric secondary-polytope realization. */
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
  /**
   * Facets (codimension-1 faces), one per diagonal of the n-gon: the diagonal
   * and the indices of all vertices (triangulations) that contain it. A facet is
   * the product K_p × K_q of the two sub-polygons the diagonal cuts off; there
   * are n(n-3)/2 of them. For a 3-D associahedron (n=6) these are the polygonal
   * 2-faces (the 6 pentagons + 3 squares).
   */
  facets: { diagonal: [number, number]; vertices: number[] }[];
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
 * Symmetric secondary-polytope (GKZ) realization on the regular n-gon: each
 * coordinate of a triangulation is the total area of its triangles meeting that
 * polygon vertex. Because the regular n-gon carries the dihedral group, this
 * realization is symmetric (unlike Loday's rooted one). The vectors lie on an
 * (n-3)-dimensional affine subspace; we reduce them isometrically to R^{n-3} via a
 * Gram–Schmidt basis of their centered span, preserving distances and the symmetry.
 */
function secondaryPoints(n: number, triangleSets: [number, number, number][][]): number[][] {
  const dim = Math.max(n - 3, 0);
  if (dim === 0) return triangleSets.map(() => []);
  const px = Array.from({ length: n }, (_, k) => Math.cos((2 * Math.PI * k) / n));
  const py = Array.from({ length: n }, (_, k) => Math.sin((2 * Math.PI * k) / n));
  const area = (a: number, b: number, c: number) =>
    Math.abs((px[b] - px[a]) * (py[c] - py[a]) - (px[c] - px[a]) * (py[b] - py[a])) / 2;
  const gkz = triangleSets.map((tris) => {
    const phi = new Array<number>(n).fill(0);
    for (const [x, y, z] of tris) {
      const ar = area(x, y, z);
      phi[x] += ar; phi[y] += ar; phi[z] += ar;
    }
    return phi;
  });
  const mean = new Array<number>(n).fill(0);
  for (const v of gkz) for (let i = 0; i < n; i++) mean[i] += v[i];
  for (let i = 0; i < n; i++) mean[i] /= gkz.length;
  const centered = gkz.map((v) => v.map((x, i) => x - mean[i]));
  const dot = (u: number[], w: number[]) => u.reduce((s, ui, i) => s + ui * w[i], 0);
  const basis: number[][] = [];
  for (const v of centered) {
    if (basis.length >= dim) break;
    const w = v.slice();
    for (const b of basis) { const d = dot(w, b); for (let i = 0; i < n; i++) w[i] -= d * b[i]; }
    const nrm = Math.sqrt(dot(w, w));
    if (nrm > 1e-7) { for (let i = 0; i < n; i++) w[i] /= nrm; basis.push(w); }
  }
  return centered.map((v) => basis.map((b) => dot(v, b)));
}

/** Build the associahedron for `n` leaves (n >= 3). */
export function buildAssociahedron(n: number): Associahedron {
  const dim = Math.max(n - 3, 0);
  const triangleSets = triangulateArc(Array.from({ length: n }, (_, i) => i));
  const points = secondaryPoints(n, triangleSets);

  const vertices: Triangulation[] = triangleSets.map((triangles, i) => {
    const diagonals = diagonalsOf(triangles, n);
    const loday = lodayCoords(triangles, n);
    return {
      id: diagonals.map(([a, b]) => `${a},${b}`).join("|"),
      diagonals,
      triangles,
      loday,
      point: points[i],
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

  // Facets: group vertices by each diagonal they contain (facet ↔ diagonal).
  const facetMap = new Map<string, number[]>();
  vertices.forEach((v, vi) => {
    for (const [a, b] of v.diagonals) {
      const key = `${a},${b}`;
      const list = facetMap.get(key);
      if (list) list.push(vi);
      else facetMap.set(key, [vi]);
    }
  });
  const facets = [...facetMap.entries()].map(([key, vs]) => {
    const [a, b] = key.split(',').map(Number);
    return { diagonal: [a, b] as [number, number], vertices: vs };
  });

  return { n, dim, vertices, edges, facets };
}
