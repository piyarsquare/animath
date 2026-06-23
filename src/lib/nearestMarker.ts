// src/lib/nearestMarker.ts
//
// Pure geometry helper for the debug-pose HUD: the distance from the player to
// the nearest landmark/marker in a world. The only diagnostic the harness needs
// that isn't already computed by the walker engines, so it lives here as a small,
// dimension-agnostic, unit-tested function (see __tests__/nearestMarker.test.ts).

/** A 2D or 3D point. A missing `z` is treated as 0 (planar comparison). */
export interface Pt {
  x: number;
  y: number;
  z?: number;
}

/** Euclidean distance between two points (works for 2D and 3D, mixing is fine). */
export function distance(a: Pt, b: Pt): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = (a.z ?? 0) - (b.z ?? 0);
  return Math.hypot(dx, dy, dz);
}

/**
 * The nearest marker to `player`, as `{ index, distance }`, or `null` when there
 * are no markers. On a tie the lowest index wins (deterministic).
 */
export function nearestMarker(
  player: Pt,
  markers: readonly Pt[],
): { index: number; distance: number } | null {
  let best: { index: number; distance: number } | null = null;
  for (let i = 0; i < markers.length; i++) {
    const d = distance(player, markers[i]);
    if (best === null || d < best.distance) best = { index: i, distance: d };
  }
  return best;
}

/** Convenience: just the distance to the nearest marker, or `Infinity` if none. */
export function nearestMarkerDistance(player: Pt, markers: readonly Pt[]): number {
  const n = nearestMarker(player, markers);
  return n === null ? Infinity : n.distance;
}
