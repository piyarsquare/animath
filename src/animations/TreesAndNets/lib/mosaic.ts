// The mosaic of associahedra — the real moduli space M̄_{0,n}(ℝ).
//
// M̄_{0,n}(ℝ) is tessellated by (n-1)!/2 associahedra, one per cyclic ordering of
// the n leaves, glued along facets (Devadoss's mosaic operad). Two tiles share a
// facet iff one is obtained from the other by reversing a contiguous arc — the arc
// cut off by the diagonal of that facet. This module enumerates the tiles (cyclic
// orders up to the dihedral group), builds the gluing graph, and lays it out in 3D.
//
// Verified counts: tiles = (n-1)!/2, each of degree n(n-3)/2
//   n=5 → 12 tiles, 30 edges;  n=6 → 60, 270;  n=7 → 360, 2520.

/** Canonical key of a cyclic order under rotation + reflection (dihedral group). */
export function canonicalKey(order: number[]): string {
  const n = order.length;
  let best: string | null = null;
  for (const seq of [order, [...order].reverse()]) {
    for (let r = 0; r < n; r++) {
      let key = '';
      for (let i = 0; i < n; i++) key += (i ? ',' : '') + seq[(r + i) % n];
      if (best === null || key < best) best = key;
    }
  }
  return best as string;
}

function permute(arr: number[]): number[][] {
  if (arr.length <= 1) return [arr];
  const out: number[][] = [];
  arr.forEach((x, i) => {
    for (const p of permute([...arr.slice(0, i), ...arr.slice(i + 1)])) out.push([x, ...p]);
  });
  return out;
}

/** All distinct cyclic orders of n leaves (dihedral classes): (n-1)!/2 of them. */
export function enumerateOrders(n: number): number[][] {
  const rest = Array.from({ length: n - 1 }, (_, i) => i + 1);
  const seen = new Map<string, number[]>();
  for (const p of permute(rest)) {
    const key = canonicalKey([0, ...p]);
    if (!seen.has(key)) seen.set(key, key.split(',').map(Number));
  }
  return [...seen.values()];
}

/** Diagonals of the n-gon (non-boundary chords): n(n-3)/2 of them. */
export function polygonDiagonals(n: number): [number, number][] {
  const out: [number, number][] = [];
  for (let a = 0; a < n; a++) {
    for (let b = a + 2; b < n; b++) {
      if (a === 0 && b === n - 1) continue;
      out.push([a, b]);
    }
  }
  return out;
}

/** The neighbor order across the facet of diagonal (a,b): reverse leaves a..b-1. */
export function neighborOrder(order: number[], a: number, b: number): number[] {
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  const arr = order.slice();
  const block = arr.slice(lo, hi).reverse();
  for (let i = lo; i < hi; i++) arr[i] = block[i - lo];
  return arr;
}

export interface Mosaic {
  n: number;
  /** Whether this is the full tessellation or a local neighborhood. */
  full: boolean;
  /** Tile cyclic orders (node i). */
  orders: number[][];
  /** Canonical key → node index. */
  index: Map<string, number>;
  /** Gluing edges as node-index pairs. */
  edges: [number, number][];
  /** Neighbor node indices per node. */
  adjacency: number[][];
  /** 3D layout position per node. */
  pos: { x: number; y: number; z: number }[];
}

function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic 3D force-directed layout (Fruchterman–Reingold style). */
function forceLayout(count: number, edges: [number, number][], radius = 5): { x: number; y: number; z: number }[] {
  const rng = mulberry32(0x5eed + count);
  const p = Array.from({ length: count }, () => ({
    x: (rng() - 0.5) * radius,
    y: (rng() - 0.5) * radius,
    z: (rng() - 0.5) * radius,
  }));
  if (count <= 1) return p;
  const k = radius / Math.cbrt(count);
  const iters = count > 200 ? 120 : 200;
  let temp = radius * 0.4;
  const disp = Array.from({ length: count }, () => ({ x: 0, y: 0, z: 0 }));
  for (let it = 0; it < iters; it++) {
    for (let i = 0; i < count; i++) { disp[i].x = 0; disp[i].y = 0; disp[i].z = 0; }
    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        let dx = p[i].x - p[j].x, dy = p[i].y - p[j].y, dz = p[i].z - p[j].z;
        let d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < 1e-4) { dx = rng() - 0.5; dy = rng() - 0.5; dz = rng() - 0.5; d2 = 0.01; }
        const d = Math.sqrt(d2);
        const rep = (k * k) / d;
        const ux = dx / d, uy = dy / d, uz = dz / d;
        disp[i].x += ux * rep; disp[i].y += uy * rep; disp[i].z += uz * rep;
        disp[j].x -= ux * rep; disp[j].y -= uy * rep; disp[j].z -= uz * rep;
      }
    }
    for (const [i, j] of edges) {
      const dx = p[i].x - p[j].x, dy = p[i].y - p[j].y, dz = p[i].z - p[j].z;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-3;
      const att = (d * d) / k;
      const ux = dx / d, uy = dy / d, uz = dz / d;
      disp[i].x -= ux * att; disp[i].y -= uy * att; disp[i].z -= uz * att;
      disp[j].x += ux * att; disp[j].y += uy * att; disp[j].z += uz * att;
    }
    for (let i = 0; i < count; i++) {
      const d = Math.sqrt(disp[i].x ** 2 + disp[i].y ** 2 + disp[i].z ** 2) || 1e-3;
      const s = Math.min(d, temp) / d;
      p[i].x += disp[i].x * s; p[i].y += disp[i].y * s; p[i].z += disp[i].z * s;
    }
    temp *= 0.97;
  }
  // center + scale to fit `radius`
  const c = p.reduce((a, q) => ({ x: a.x + q.x, y: a.y + q.y, z: a.z + q.z }), { x: 0, y: 0, z: 0 });
  c.x /= count; c.y /= count; c.z /= count;
  let maxR = 0;
  for (const q of p) { q.x -= c.x; q.y -= c.y; q.z -= c.z; maxR = Math.max(maxR, Math.hypot(q.x, q.y, q.z)); }
  const sc = maxR > 1e-6 ? radius / maxR : 1;
  for (const q of p) { q.x *= sc; q.y *= sc; q.z *= sc; }
  return p;
}

/** Largest full mosaic we render whole; above this we build a local neighborhood. */
export const FULL_TILE_LIMIT = 400;

function fact(m: number): number { let f = 1; for (let i = 2; i <= m; i++) f *= i; return f; }

/** Total number of tiles in M̄_{0,n}(ℝ) without enumerating them. */
export function tileCount(n: number): number { return fact(n - 1) / 2; }

/**
 * Build the mosaic. For small n (≤ FULL_TILE_LIMIT tiles) the whole tessellation;
 * otherwise a local neighborhood (BFS to `depth`) around `seedKey`.
 */
export function buildMosaic(n: number, seedKey?: string, depth = 2): Mosaic {
  const diagonals = polygonDiagonals(n);
  const full = tileCount(n) <= FULL_TILE_LIMIT;

  let orders: number[][];
  if (full) {
    orders = enumerateOrders(n);
  } else {
    // BFS local neighborhood around the seed
    const start = seedKey ?? canonicalKey(Array.from({ length: n }, (_, i) => i));
    const seen = new Map<string, number[]>();
    seen.set(start, start.split(',').map(Number));
    let frontier = [start];
    for (let d = 0; d < depth; d++) {
      const next: string[] = [];
      for (const key of frontier) {
        const order = seen.get(key)!;
        for (const [a, b] of diagonals) {
          const nb = canonicalKey(neighborOrder(order, a, b));
          if (!seen.has(nb)) { seen.set(nb, nb.split(',').map(Number)); next.push(nb); }
        }
      }
      frontier = next;
    }
    orders = [...seen.values()];
  }

  const index = new Map<string, number>();
  orders.forEach((o, i) => index.set(canonicalKey(o), i));

  const edgeSet = new Set<string>();
  const edges: [number, number][] = [];
  const adjacency: number[][] = orders.map(() => []);
  orders.forEach((order, i) => {
    for (const [a, b] of diagonals) {
      const j = index.get(canonicalKey(neighborOrder(order, a, b)));
      if (j === undefined || j === i) continue;
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        edges.push([i, j]);
        adjacency[i].push(j);
        adjacency[j].push(i);
      }
    }
  });

  const pos = forceLayout(orders.length, edges);
  return { n, full, orders, index, edges, adjacency, pos };
}
