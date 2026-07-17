/**
 * Scenarios: named star configurations for the gravitational sandbox.
 *
 * A `Scenario` separates three concerns that used to be fused together, so a
 * configuration can be reused independently of how any one app presents or
 * seeds it:
 *   - `system`: the pure dynamical configuration (how to build the stars, the
 *     recommended timestep, star–star softening) — no planet, no UI.
 *   - `launch`: default planet-launch parameters (which body, radius, speed).
 *   - presentation: `id`, `name`, `blurb` for the UI.
 *
 * All scenarios use G = 1 and normalized units. Each `makeStars()` returns a
 * fresh array so the simulation can be re-seeded deterministically on reset.
 */

import { step, type Planet, type SimState, type Star } from './integrator';
import { planetEnergy } from './analysis/classify';

/** What the planet is launched into orbit around:
 *  the system barycenter, one specific star, or the inner two-star binary. */
export type TargetId = 'bary' | 's0' | 's1' | 's2' | 'binary';

/** The pure dynamical configuration of a star system — no planet, no UI. */
export interface SystemSpec {
  /** Build a fresh set of stars (already centered with zero net momentum). */
  makeStars: () => Star[];
  /** Recommended integrator step for this configuration. */
  dt: number;
  /** Softening length for star–star interactions. */
  softening: number;
  /** Whether this system has a meaningful inner binary (enables that target). */
  hasBinary?: boolean;
}

/** Default planet launch for a scenario, measured relative to its target body. */
export interface LaunchDefaults {
  target: TargetId;
  radius: number;
  speed: number;
}

/** A named, presentable scenario: a star system plus a default planet launch. */
export interface Scenario {
  id: string;
  name: string;
  /** Short tagline shown under the controls. */
  blurb: string;
  system: SystemSpec;
  launch: LaunchDefaults;
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

/** Shift to the center-of-mass frame: zero net position and net momentum so
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

export const SCENARIOS: Scenario[] = [
  {
    id: 'figure8',
    name: 'Figure-Eight',
    blurb: 'Three equal stars chase each other along one perfectly repeating loop — yet the planet they cradle is still chaotic.',
    system: {
      // Chenciner–Montgomery choreography (equal masses, G = 1).
      makeStars: () => recenter([
        star(-0.97000436, 0.24308753, 0.4662036850, 0.4323657300, 1),
        star(0.97000436, -0.24308753, 0.4662036850, 0.4323657300, 1),
        star(0, 0, -0.93240737, -0.86473146, 1),
      ]),
      dt: 0.0022,
      softening: 0.01,
    },
    // A wide circumbinary (P-type) orbit that clears the stars' figure-eight loop:
    // survives indefinitely, yet the breathing inner triple still fans the ghost
    // cloud out over time. A closer launch (the old r=1.8) fell into a star in ~2
    // time units — chaos, but a dead planet before you'd seen anything.
    launch: { target: 'bary', radius: 3.2, speed: 1.0 },
  },
  {
    id: 'moth',
    name: 'Moth',
    blurb: 'A mesmerizing three-body "ballet" (Šuvakov–Dmitrašinović Moth): three equal stars retracing one periodic figure. Exquisitely delicate — the faintest nudge eventually tips it into chaos.',
    system: {
      makeStars: () => choreography(0.46444, 0.39606),
      dt: 0.0004,
      softening: 0.0025,
    },
    // The Moth choreography is larger and more delicate than the figure-eight, so
    // the planet needs a wider berth (old r=2.2 fell in almost at once). A gently
    // sub-circular circumbinary orbit rides the whole regular era.
    launch: { target: 'bary', radius: 3.5, speed: 0.95 },
  },
  {
    id: 'pythagorean',
    name: 'Pythagorean',
    blurb: "Burrau's problem: stars of mass 3, 4 and 5 fall together from rest, swing through violent close passes, and eject one of their own. Your planet is a witness, not a resident — it rides a wide orbit through the fireworks and is eventually flung into the dark.",
    system: {
      // Masses 3,4,5 at the vertices of a 3-4-5 right triangle, starting at rest.
      makeStars: () => recenter([
        star(1, 3, 0, 0, 3),
        star(-2, -1, 0, 0, 4),
        star(1, -1, 0, 0, 5),
      ]),
      dt: 0.0016,
      softening: 0.04,
    },
    // Burrau's problem is violently destructive — the stars fall from rest and one
    // is eventually ejected — so no close orbit survives. A wide, slow launch keeps
    // the planet clear of the initial collapse: it witnesses the whole spectacle
    // and is flung into the dark much later, rather than incinerated at once (old
    // r=4/v=1.6 fell in by t≈7).
    launch: { target: 'bary', radius: 5.0, speed: 0.55 },
  },
  {
    id: 'binary',
    name: 'Binary + Star',
    blurb: 'A tight equal-mass binary with a lighter star wheeling around outside. Launch the planet around the inner binary for an orbit smaller than the third star’s.',
    system: {
      makeStars: () => recenter([
        // Tight equal-mass binary (separation 0.6, circular: v = √(1/4·sep)).
        star(0.3, 0, 0, 0.91, 1),
        star(-0.3, 0, 0, -0.91, 1),
        // Lighter third star on a wide, near-circular outer orbit (v = √(M/d)).
        star(5.0, 0, 0, 0.707, 0.5),
      ]),
      dt: 0.0020,
      softening: 0.03,
      hasBinary: true,
    },
    launch: { target: 'binary', radius: 1.6, speed: 1.1 },
  },
];

export function getScenario(id: string): Scenario {
  return SCENARIOS.find(s => s.id === id) ?? SCENARIOS[0];
}

/** Build a scenario's stars with per-star mass multipliers applied, re-centered
 *  so net momentum stays zero. A uniform multiplier just rescales time; uneven
 *  ones detune the configuration (e.g. break the figure-eight) — useful for
 *  exploring how sensitive the dynamics are. */
export function buildStars(scenario: Scenario, massMul: readonly number[]): Star[] {
  const stars = scenario.system.makeStars();
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

/** The local circular-orbit speed √(M/r) around a target body at `radius`. */
export function circularSpeed(stars: Star[], target: TargetId, radius: number): number {
  const f = orbitFrame(stars, target);
  return Math.sqrt(f.mass / Math.max(0.05, radius));
}

export interface StableLaunchOptions {
  /** Softening length for star–star interactions (matches the live sim). */
  starSoft: number;
  /** Integrator step. */
  dt: number;
  /** Collision radius that counts as "destroyed". */
  rKill?: number;
  /** How far a planet must always stay from the nearest star to count as safe
   *  (an absolute clearance — bigger ⇒ rounder, more robustly-bound orbits, and
   *  crucially avoids chaotic knife-edge survivors). */
  minClear?: number;
  /** Sim-time to integrate each candidate. Long enough to reject slow decays. */
  probeTime?: number;
  smallestRadius?: number;
  largestRadius?: number;
  radiusStep?: number;
}

/**
 * Empirically find a launch that survives — the only reliable "safe orbit" in a
 * chaotic star field, where a derived radius fails (a star may be ejected to
 * infinity; a hierarchical system's planet orbits a sub-system) and a single
 * bare-survival probe lands on knife-edge orbits that a rounding-sized nudge
 * destroys. Sweeps the launch radius outward, using the local circular speed at
 * each, and returns the first whose planet stays bound **and** never comes within
 * `minClear` of a star across `probeTime`. Values are rounded to the control
 * steps the UI uses, so the returned orbit behaves exactly as previewed. Returns
 * `null` if nothing in range qualifies. Pure — integrates a private copy.
 */
export function findStableLaunch(
  stars: Star[], target: TargetId, opts: StableLaunchOptions,
): { radius: number; speed: number } | null {
  const {
    starSoft, dt, rKill = 0.12, minClear = 0.5, probeTime = 140,
    smallestRadius = 1.0, largestRadius = 16, radiusStep = 0.25,
  } = opts;
  const round2 = (x: number) => Math.round(x * 100) / 100;
  const ss2 = starSoft * starSoft;
  const steps = Math.round(probeTime / dt);

  for (let r = smallestRadius; r <= largestRadius + 1e-9; r += radiusStep) {
    const radius = round2(r);
    const speed = round2(circularSpeed(stars, target, radius));
    // Fresh star copy per candidate (the stars evolve during the probe).
    const s: Star[] = stars.map(st => ({ ...st }));
    const planet = launchPlanet(s, target, radius, speed);
    const sim: SimState = { stars: s, planets: [planet], t: 0, dtBase: dt, G: 1, starSoft, planetSoft: 0.05 };
    let ok = true;
    for (let i = 0; i < steps; i++) {
      step(sim, dt);
      let dmin = Infinity;
      for (const st of s) { const d = Math.hypot(st.x - planet.x, st.y - planet.y); if (d < dmin) dmin = d; }
      if (dmin < Math.max(rKill, minClear)) { ok = false; break; }
      // Unbound-and-far ⇒ this radius won't settle into an orbit.
      if (Math.hypot(planet.x, planet.y) > largestRadius + 4 && planetEnergy(planet, s, ss2) > 0) { ok = false; break; }
    }
    if (ok) return { radius, speed };
  }
  return null;
}
