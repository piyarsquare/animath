/** Detection of the discrete events that resolve a run: a star ejection, or the
 *  planet escaping the system. (Destruction is a simple distance test handled in
 *  the analyzer.) */

import type { Planet, Star } from '../integrator';
import { planetEnergy } from './classify';

/** Mass-weighted center of position and velocity of a set of stars. */
function com(stars: Star[], idx: number[]) {
  let M = 0, x = 0, y = 0, vx = 0, vy = 0;
  for (const i of idx) {
    const s = stars[i];
    M += s.mass;
    x += s.mass * s.x; y += s.mass * s.y;
    vx += s.mass * s.vx; vy += s.mass * s.vy;
  }
  return { M, x: x / M, y: y / M, vx: vx / M, vy: vy / M };
}

/** Returns the index of a star that has become unbound from the other two and
 *  drifted past rEsc, or -1 if the trio is still bound together. */
export function detectEjection(stars: Star[], rEsc: number): number {
  for (let i = 0; i < stars.length; i++) {
    const rest = com(stars, stars.map((_, j) => j).filter(j => j !== i));
    const s = stars[i];
    const dx = s.x - rest.x, dy = s.y - rest.y;
    const d = Math.hypot(dx, dy);
    const dvx = s.vx - rest.vx, dvy = s.vy - rest.vy;
    const Mtot = s.mass + rest.M;
    const E = 0.5 * (dvx * dvx + dvy * dvy) - Mtot / d;
    if (E > 0 && d > rEsc) return i;
  }
  return -1;
}

/** Whether the planet itself is unbound and has drifted past rEsc. */
export function planetEscaped(p: Planet, stars: Star[], rEsc: number, soft2: number): boolean {
  if (planetEnergy(p, stars, soft2) <= 0) return false;
  const c = com(stars, stars.map((_, j) => j));
  return Math.hypot(p.x - c.x, p.y - c.y) > rEsc;
}
