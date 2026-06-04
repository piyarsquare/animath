import { Quaternion as Q } from 'three';

/* plane is 'XY' .. 'UV'; θ positive = clockwise relative to the plane's first
 * quadrant. Consumers apply these as the 4D rotation p ↦ L · p · conj(R), under
 * which each entry rotates exactly the named plane (fixing the other two axes),
 * and a positive θ sends the first axis toward the negative second axis
 * (+A → −B) — i.e. clockwise — uniformly across all six planes, so the floater's
 * ↻ / ↺ buttons mean the same thing everywhere. Imaginary–imaginary planes (XY,
 * XU, YU) use L = R; planes that include the v (scalar) axis (XV, YV, UV) use
 * R = conj(L). */
export function quarterQuat(plane: string, θ: number) {
  const s = Math.sin(θ / 2), c = Math.cos(θ / 2);
  switch (plane) {
    case 'XY': return { L: new Q(0, 0, -s, c), R: new Q(0, 0, -s, c) };
    case 'XU': return { L: new Q(0, s, 0, c), R: new Q(0, s, 0, c) };
    case 'XV': return { L: new Q(s, 0, 0, c), R: new Q(-s, 0, 0, c) };
    case 'YU': return { L: new Q(-s, 0, 0, c), R: new Q(-s, 0, 0, c) };
    case 'YV': return { L: new Q(0, s, 0, c), R: new Q(0, -s, 0, c) };
    case 'UV': return { L: new Q(0, 0, s, c), R: new Q(0, 0, -s, c) };
  }
  throw new Error('bad plane');
}
