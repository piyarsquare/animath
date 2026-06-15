/**
 * Polygon Worlds — develop: enumerate the deck-group tiles around the player.
 *
 * "Develop the universal cover" is *not* one operation — the deck group is finite
 * for the sphere, a lattice for the Euclidean plane, and an infinite (exponentially
 * growing) Fuchsian group for the hyperbolic plane. So tiling lives behind a
 * single strategy keyed by {@link Realization.policy}, with a common BFS:
 * breadth-first over the Cayley graph of the side-pairing generators (and their
 * inverses), de-duplicating group elements and culling tiles whose center falls
 * beyond a geodesic horizon. The cap (`maxTiles`) protects the hyperbolic case on
 * a phone; the horizon protects all three.
 */

import { Realization } from './realize';
import {
  Isometry, isometry, Mat3, IDENTITY3, mul, applyMat, ORIGIN, distance, Vec3,
} from './cayleyKlein';

export interface DevelopOptions {
  /** Geodesic radius beyond which a tile center is culled. */
  horizon: number;
  /** Hard cap on tiles enumerated (BFS stops when reached). */
  maxTiles: number;
}

export interface DevelopResult {
  /** Deck elements whose tile should be drawn (includes the identity = home tile). */
  elements: Isometry[];
  /** Tile centers (element · O), parallel to `elements`. */
  centers: Vec3[];
  /** True if BFS hit `maxTiles` before exhausting the horizon (i.e. there are more). */
  truncated: boolean;
  /** How many distinct group elements were visited (for budgeting). */
  visited: number;
}

/** Quantised key for de-duplicating group elements (matrices) up to tolerance. */
function matKey(m: Mat3): string {
  let s = '';
  for (let i = 0; i < 9; i++) s += Math.round(m[i] * 1e5) + ',';
  return s;
}

// Budget (measured, genus-2 octagon, R≈2.45, nearest neighbor at d≈3.06; ℍ²
// tile count grows exponentially with the horizon): h=6 → ~100 tiles (~3ms),
// h=7 → ~265 (~6ms), h=8 → ~800 (~15ms). The default sits where a frame's tile
// enumeration stays a few ms; maxTiles is the hard backstop on a phone.
const DEFAULTS: Record<Realization['policy'], DevelopOptions> = {
  finite: { horizon: Infinity, maxTiles: 64 },
  lattice: { horizon: 40, maxTiles: 400 },
  fuchsian: { horizon: 6.5, maxTiles: 800 },
};

/**
 * Enumerate the tiles to draw around the home polygon. BFS over generators ±1,
 * culling by horizon, capping by maxTiles. Deterministic order (identity first).
 */
export function develop(real: Realization, opts?: Partial<DevelopOptions>): DevelopResult {
  const o = { ...DEFAULTS[real.policy], ...opts };
  const kappa = real.kappa;

  // generator set: each deck generator and its inverse
  const gens: Mat3[] = [];
  for (const g of real.deckGenerators) {
    if (!g) continue;
    gens.push(g.m);
    gens.push(g.inverse().m);
  }

  const elements: Isometry[] = [];
  const centers: Vec3[] = [];
  const seen = new Set<string>();
  let truncated = false;

  const id = IDENTITY3;
  const queue: Mat3[] = [id];
  seen.add(matKey(id));

  while (queue.length) {
    const m = queue.shift()!;
    const center = applyMat(m, ORIGIN);
    elements.push(isometry(kappa, m));
    centers.push(center);
    if (elements.length >= o.maxTiles) { truncated = queue.length > 0; break; }

    for (const g of gens) {
      const next = mul(m, g);
      const key = matKey(next);
      if (seen.has(key)) continue;
      const c = applyMat(next, ORIGIN);
      if (distance(kappa, ORIGIN, c) > o.horizon) continue; // horizon cull
      seen.add(key);
      queue.push(next);
    }
  }

  return { elements, centers, truncated, visited: seen.size };
}
