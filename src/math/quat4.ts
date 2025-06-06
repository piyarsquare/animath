import { Quaternion as Q } from 'three';

/* plane is 'XY' .. 'UV'; θ positive = +90° */
export function quarterQuat(plane: string, θ: number) {
  const s = Math.sin(θ / 2), c = Math.cos(θ / 2);
  switch (plane) {
    case 'XY': return { L: new Q(0, 0, s, c), R: new Q(0, 0, s, c) };
    case 'XU': return { L: new Q(0, s, 0, c), R: new Q(0, -s, 0, c) };
    case 'XV': return { L: new Q(s, 0, 0, c), R: new Q(-s, 0, 0, c) };
    case 'YU': return { L: new Q(s, 0, 0, c), R: new Q(s, 0, 0, c) };
    case 'YV': return { L: new Q(0, s, 0, c), R: new Q(0, s, 0, c) };
    case 'UV': return { L: new Q(0, 0, s, c), R: new Q(0, 0, -s, c) };
  }
  throw new Error('bad plane');
}
