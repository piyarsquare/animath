/** Pure scalar measurements of the planet's situation in the star field. */

import type { Planet, Star } from '../integrator';
import type { ClimateState } from './types';

/** Total starlight reaching the planet: Σ L_i / (d_i² + soft²). */
export function insolation(p: Planet, stars: Star[], lumExp: number, soft2: number): number {
  let S = 0;
  for (const s of stars) {
    const dx = s.x - p.x, dy = s.y - p.y;
    const d2 = dx * dx + dy * dy + soft2;
    const L = lumExp === 1 ? s.mass : Math.pow(s.mass, lumExp);
    S += L / d2;
  }
  return S;
}

/** Specific orbital energy of the planet in the (instantaneous) star field;
 *  negative ⇒ bound. Treats the stars as fixed for this instant — an adequate
 *  bound/unbound proxy. */
export function planetEnergy(p: Planet, stars: Star[], soft2: number): number {
  let pot = 0;
  for (const s of stars) {
    const dx = s.x - p.x, dy = s.y - p.y;
    const d = Math.sqrt(dx * dx + dy * dy + soft2);
    pot -= s.mass / d;
  }
  return 0.5 * (p.vx * p.vx + p.vy * p.vy) + pot;
}

export function minStarDist(p: Planet, stars: Star[]): number {
  let m = Infinity;
  for (const s of stars) {
    const d = Math.hypot(s.x - p.x, s.y - p.y);
    if (d < m) m = d;
  }
  return m;
}

export function climateOf(S: number, Slo: number, Shi: number): ClimateState {
  if (S > Shi) return 'hot';
  if (S < Slo) return 'cold';
  return 'habitable';
}
