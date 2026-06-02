/**
 * Gravitational dynamics for the Trinary System module.
 *
 * The three stars form a full mutually-gravitating N-body system. The planets
 * are treated as massless *test particles*: they feel the stars' gravity but
 * exert no force on the stars or on one another. This is the classic
 * "restricted" problem, and it is exactly what makes the chaos demo clean —
 * every ghost planet experiences the *same* star field, so any divergence
 * between them comes purely from sensitive dependence on initial conditions,
 * not from the planets perturbing each other.
 *
 * Integration is a velocity-Verlet / leapfrog (kick–drift–kick) scheme, which
 * is symplectic and so keeps the stars' energy bounded over long runs. Gravity
 * is softened (Plummer softening) to keep accelerations finite during close
 * encounters — physically this is like giving each star a finite radius.
 */

export interface Star {
  x: number; y: number;
  vx: number; vy: number;
  ax: number; ay: number;
  mass: number;
}

export interface Planet {
  x: number; y: number;
  vx: number; vy: number;
  ax: number; ay: number;
}

export interface SimState {
  stars: Star[];
  planets: Planet[];
  /** Simulation time elapsed (in normalized units, G = 1). */
  t: number;
  /** Integrator step recommended by the active preset. */
  dtBase: number;
  G: number;
  /** Softening length for star–star interactions. */
  starSoft: number;
  /** Softening length for star–planet interactions. */
  planetSoft: number;
}

function computeStarAccel(stars: Star[], G: number, soft2: number): void {
  for (const s of stars) { s.ax = 0; s.ay = 0; }
  for (let i = 0; i < stars.length; i++) {
    const a = stars[i];
    for (let j = i + 1; j < stars.length; j++) {
      const b = stars[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const r2 = dx * dx + dy * dy + soft2;
      const invR3 = 1 / (r2 * Math.sqrt(r2));
      const f = G * invR3;
      a.ax += f * b.mass * dx;
      a.ay += f * b.mass * dy;
      b.ax -= f * a.mass * dx;
      b.ay -= f * a.mass * dy;
    }
  }
}

function computePlanetAccel(p: Planet, stars: Star[], G: number, soft2: number): void {
  let ax = 0;
  let ay = 0;
  for (const s of stars) {
    const dx = s.x - p.x;
    const dy = s.y - p.y;
    const r2 = dx * dx + dy * dy + soft2;
    const invR3 = 1 / (r2 * Math.sqrt(r2));
    const f = G * s.mass * invR3;
    ax += f * dx;
    ay += f * dy;
  }
  p.ax = ax;
  p.ay = ay;
}

/** Advance the whole system by one leapfrog (kick–drift–kick) step of size dt. */
export function step(state: SimState, dt: number): void {
  const { stars, planets, G } = state;
  const ss2 = state.starSoft * state.starSoft;
  const ps2 = state.planetSoft * state.planetSoft;
  const half = 0.5 * dt;

  // a(x) at the current positions.
  computeStarAccel(stars, G, ss2);
  for (const p of planets) computePlanetAccel(p, stars, G, ps2);

  // Half kick, then full drift.
  for (const s of stars) {
    s.vx += half * s.ax; s.vy += half * s.ay;
    s.x += dt * s.vx; s.y += dt * s.vy;
  }
  for (const p of planets) {
    p.vx += half * p.ax; p.vy += half * p.ay;
    p.x += dt * p.vx; p.y += dt * p.vy;
  }

  // a(x) at the new positions, then the second half kick.
  computeStarAccel(stars, G, ss2);
  for (const p of planets) computePlanetAccel(p, stars, G, ps2);
  for (const s of stars) {
    s.vx += half * s.ax; s.vy += half * s.ay;
  }
  for (const p of planets) {
    p.vx += half * p.ax; p.vy += half * p.ay;
  }

  state.t += dt;
}

/**
 * Spread of the planet cloud: the maximum distance of any ghost from the
 * reference planet (index 0). This is the headline "unpredictability" number —
 * it grows roughly exponentially while the dynamics are chaotic.
 */
export function cloudSpread(planets: Planet[]): number {
  if (planets.length < 2) return 0;
  const ref = planets[0];
  let max = 0;
  for (let i = 1; i < planets.length; i++) {
    const dx = planets[i].x - ref.x;
    const dy = planets[i].y - ref.y;
    const d = Math.hypot(dx, dy);
    if (d > max) max = d;
  }
  return max;
}
