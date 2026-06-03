/**
 * Initial conditions for the three stars. All presets use G = 1 and normalized
 * units. Each `make()` returns a fresh array so the simulation can be re-seeded
 * deterministically on reset.
 */

import type { Planet, Star } from './integrator';

/** What the planet is launched into orbit around:
 *  the system barycenter, one specific star, or the inner two-star binary. */
export type TargetId = 'bary' | 's0' | 's1' | 's2' | 'binary';

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
  /** Default body the planet orbits, plus its launch radius and tangential
   *  speed (measured relative to that body) for this preset. */
  target: TargetId;
  planetRadius: number;
  planetSpeed: number;
  /** Whether this preset has a meaningful inner binary (enables that target). */
  hasBinary?: boolean;
}

function star(x: number, y: number, vx: number, vy: number, mass: number): Star {
  return { x, y, vx, vy, ax: 0, ay: 0, mass };
}

/** Šuvakov–Dmitrašinović equal-mass periodic choreography: two stars at ±(1,0)
 *  share velocity (p1,p2); the third sits at the origin moving at -2(p1,p2). */
function choreography(p1: number, p2: number): Star[] {
  return recenter([
    star(-1, 0, p1, p2, 1),
    star(1, 0, p1, p2, 1),
    star(0, 0, -2 * p1, -2 * p2, 1),
  ]);
}

/** Shift to the centre-of-mass frame: zero net position and net momentum so
 *  the system stays framed instead of drifting off screen. */
export function recenter(stars: Star[]): Star[] {
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
    make: () => recenter([
      star(-0.97000436, 0.24308753, 0.4662036850, 0.4323657300, 1),
      star(0.97000436, -0.24308753, 0.4662036850, 0.4323657300, 1),
      star(0, 0, -0.93240737, -0.86473146, 1),
    ]),
    dt: 0.0022,
    starSoft: 0.01,
    target: 'bary',
    planetRadius: 1.8,
    planetSpeed: 1.1,
  },
  {
    id: 'moth',
    name: 'Moth',
    blurb: 'A mesmerizing three-body "ballet" (Šuvakov–Dmitrašinović Moth): three equal stars retracing one periodic figure. Exquisitely delicate — the faintest nudge eventually tips it into chaos.',
    make: () => choreography(0.46444, 0.39606),
    dt: 0.0004,
    starSoft: 0.0025,
    target: 'bary',
    planetRadius: 2.2,
    planetSpeed: 1.1,
  },
  {
    id: 'pythagorean',
    name: 'Pythagorean',
    blurb: "Burrau's problem: stars of mass 3, 4 and 5 fall together from rest, swing through violent close passes, and eject one of their own.",
    // Masses 3,4,5 at the vertices of a 3-4-5 right triangle, starting at rest.
    make: () => recenter([
      star(1, 3, 0, 0, 3),
      star(-2, -1, 0, 0, 4),
      star(1, -1, 0, 0, 5),
    ]),
    dt: 0.0016,
    starSoft: 0.04,
    target: 'bary',
    planetRadius: 4.0,
    planetSpeed: 1.6,
  },
  {
    id: 'binary',
    name: 'Binary + Star',
    blurb: 'A tight equal-mass binary with a lighter star wheeling around outside. Launch the planet around the inner binary for an orbit smaller than the third star’s.',
    make: () => recenter([
      // Tight equal-mass binary (separation 0.6, circular: v = √(1/4·sep)).
      star(0.3, 0, 0, 0.91, 1),
      star(-0.3, 0, 0, -0.91, 1),
      // Lighter third star on a wide, near-circular outer orbit (v = √(M/d)).
      star(5.0, 0, 0, 0.707, 0.5),
    ]),
    dt: 0.0020,
    starSoft: 0.03,
    target: 'binary',
    planetRadius: 1.6,
    planetSpeed: 1.1,
    hasBinary: true,
  },
];

export function getPreset(id: string): Preset {
  return PRESETS.find(p => p.id === id) ?? PRESETS[0];
}

/** Build a preset's stars with per-star mass multipliers applied, re-centred so
 *  net momentum stays zero. A uniform multiplier just rescales time; uneven
 *  ones detune the configuration (e.g. break the figure-eight) — useful for
 *  exploring how sensitive the dynamics are. */
export function buildStars(preset: Preset, massMul: readonly number[]): Star[] {
  const stars = preset.make();
  for (let i = 0; i < stars.length; i++) stars[i].mass *= massMul[i] ?? 1;
  return recenter(stars);
}

/** The body the planet is launched around: its position, velocity and the mass
 *  that governs a circular orbit at a given radius. */
export function orbitFrame(stars: Star[], target: TargetId) {
  if (target === 'bary' || target === 'binary') {
    const idx = target === 'binary' ? [0, 1] : [0, 1, 2];
    let M = 0, cx = 0, cy = 0, cvx = 0, cvy = 0;
    for (const i of idx) {
      const s = stars[i];
      M += s.mass;
      cx += s.mass * s.x; cy += s.mass * s.y;
      cvx += s.mass * s.vx; cvy += s.mass * s.vy;
    }
    return { cx: cx / M, cy: cy / M, cvx: cvx / M, cvy: cvy / M, mass: M };
  }
  const k = target === 's0' ? 0 : target === 's1' ? 1 : 2;
  const s = stars[k];
  return { cx: s.x, cy: s.y, cvx: s.vx, cvy: s.vy, mass: s.mass };
}

/** Place a planet at `radius` from the target body, at `angle` (radians) around
 *  it, moving tangentially at `speed` (prograde, or retrograde if `retro`),
 *  carried along by the target's own velocity. */
export function launchPlanet(
  stars: Star[], target: TargetId, radius: number, speed: number, angle = 0, retro = false,
): Planet {
  const f = orbitFrame(stars, target);
  const ca = Math.cos(angle), sa = Math.sin(angle);
  const dir = retro ? -1 : 1;
  return {
    x: f.cx + radius * ca,
    y: f.cy + radius * sa,
    vx: f.cvx + dir * speed * -sa,
    vy: f.cvy + dir * speed * ca,
    ax: 0, ay: 0,
  };
}
