/**
 * Initial conditions for the three stars. All presets use G = 1 and normalized
 * units. Each `make()` returns a fresh array so the simulation can be re-seeded
 * deterministically on reset.
 */

import type { Star } from './physics';

export interface Preset {
  id: string;
  name: string;
  /** Short tagline shown under the controls. */
  blurb: string;
  /** Build a fresh set of stars (already centred with zero net momentum). */
  make: () => Star[];
  /** Recommended integrator step for this configuration. */
  dt: number;
  /** Softening length for star–star interactions. */
  starSoft: number;
  /** Default planet launch radius and tangential speed for this preset. */
  planetRadius: number;
  planetSpeed: number;
}

function star(x: number, y: number, vx: number, vy: number, mass: number): Star {
  return { x, y, vx, vy, ax: 0, ay: 0, mass };
}

/** Shift to the centre-of-mass frame: zero net position and net momentum so
 *  the system stays framed instead of drifting off screen. */
function normalize(stars: Star[]): Star[] {
  let M = 0, cx = 0, cy = 0, px = 0, py = 0;
  for (const s of stars) {
    M += s.mass;
    cx += s.mass * s.x; cy += s.mass * s.y;
    px += s.mass * s.vx; py += s.mass * s.vy;
  }
  cx /= M; cy /= M; px /= M; py /= M;
  for (const s of stars) {
    s.x -= cx; s.y -= cy;
    s.vx -= px; s.vy -= py;
  }
  return stars;
}

export const PRESETS: Preset[] = [
  {
    id: 'figure8',
    name: 'Figure-Eight',
    blurb: 'Three equal stars chase each other along one perfectly repeating loop — yet the planet they cradle is still chaotic.',
    // Chenciner–Montgomery choreography (equal masses, G = 1).
    make: () => normalize([
      star(-0.97000436, 0.24308753, 0.4662036850, 0.4323657300, 1),
      star(0.97000436, -0.24308753, 0.4662036850, 0.4323657300, 1),
      star(0, 0, -0.93240737, -0.86473146, 1),
    ]),
    dt: 0.0022,
    starSoft: 0.01,
    planetRadius: 2.4,
    planetSpeed: 1.0,
  },
  {
    id: 'pythagorean',
    name: 'Pythagorean',
    blurb: "Burrau's problem: stars of mass 3, 4 and 5 fall together from rest, swing through violent close passes, and eject one of their own.",
    // Masses 3,4,5 at the vertices of a 3-4-5 right triangle, starting at rest.
    make: () => normalize([
      star(1, 3, 0, 0, 3),
      star(-2, -1, 0, 0, 4),
      star(1, -1, 0, 0, 5),
    ]),
    dt: 0.0016,
    starSoft: 0.04,
    planetRadius: 5.5,
    planetSpeed: 1.25,
  },
  {
    id: 'binary',
    name: 'Binary + Star',
    blurb: 'A tight equal-mass binary near the centre with a heavier star wheeling around outside — a hierarchical trio.',
    make: () => normalize([
      // Tight binary (each mass 1, separation 0.5, circular).
      star(0.25, 0, 0, 1.0, 1),
      star(-0.25, 0, 0, -1.0, 1),
      // Distant third star.
      star(2.6, 0, 0, 1.05, 1.4),
    ]),
    dt: 0.0020,
    starSoft: 0.03,
    planetRadius: 3.6,
    planetSpeed: 0.95,
  },
];

export function getPreset(id: string): Preset {
  return PRESETS.find(p => p.id === id) ?? PRESETS[0];
}
