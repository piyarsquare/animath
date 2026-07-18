import { describe, it, expect } from 'vitest';
import { buildStars, getScenario, launchPlanet, step, type SimState, type Planet } from '../index';

/**
 * The leapfrog (kick–drift–kick) scheme is exactly time-reversible: integrate
 * forward, flip every velocity, integrate the same number of steps, and the
 * system must retrace its path back to the start (with velocities negated).
 * This is a sharp whole-integrator invariant — any asymmetry in the kick/drift
 * ordering, a force evaluated at the wrong positions, or state leaking between
 * steps breaks it immediately.
 */
describe('leapfrog time-reversibility', () => {
  it('running forward then backward returns stars AND planet to their start', () => {
    const sc = getScenario('figure8');
    const stars = buildStars(sc, [1, 1, 1]);
    const planet: Planet = { ...launchPlanet(stars, 'bary', 3.2, 0.95), alive: true };
    const start = {
      stars: stars.map(s => ({ x: s.x, y: s.y, vx: s.vx, vy: s.vy })),
      planet: { x: planet.x, y: planet.y, vx: planet.vx, vy: planet.vy },
    };
    const sim: SimState = { stars, planets: [planet], t: 0, dtBase: sc.system.dt, G: 1, starSoft: sc.system.softening, planetSoft: 0.05 };
    const N = 2000; // t ≈ 4.4 — inside the Lyapunov horizon so FP error stays tiny
    for (let i = 0; i < N; i++) step(sim, sc.system.dt);
    for (const s of stars) { s.vx = -s.vx; s.vy = -s.vy; }
    planet.vx = -planet.vx; planet.vy = -planet.vy;
    for (let i = 0; i < N; i++) step(sim, sc.system.dt);

    for (let k = 0; k < 3; k++) {
      expect(stars[k].x).toBeCloseTo(start.stars[k].x, 6);
      expect(stars[k].y).toBeCloseTo(start.stars[k].y, 6);
      expect(-stars[k].vx).toBeCloseTo(start.stars[k].vx, 6);
      expect(-stars[k].vy).toBeCloseTo(start.stars[k].vy, 6);
    }
    expect(planet.x).toBeCloseTo(start.planet.x, 5);
    expect(planet.y).toBeCloseTo(start.planet.y, 5);
    expect(-planet.vx).toBeCloseTo(start.planet.vx, 5);
    expect(-planet.vy).toBeCloseTo(start.planet.vy, 5);
  });
});
