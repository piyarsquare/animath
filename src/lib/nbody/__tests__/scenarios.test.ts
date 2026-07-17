import { describe, it, expect } from 'vitest';
import {
  SCENARIOS, buildStars, launchPlanet, orbitFrame, recenter, getScenario,
  step, minStarDist, planetEnergy,
  type SimState, type Planet,
} from '../index';

/**
 * The Observatory's first impression is a planet dropped into a star system.
 * Historically several scenarios shipped launch defaults that dropped the planet
 * *inside* the stars' path, so it fell into a star within a couple of time units
 * ("explodes in the sun") — a broken opening. These tests pin each scenario's
 * default launch to the same collision test the live app uses (rKill = 0.12),
 * integrating with the real engine, so a bad default can't regress unnoticed.
 */

const R_KILL = 0.12; // matches the Observatory's default collision radius.

/** Run a scenario's default launch through the real integrator for `T` sim-time,
 *  reporting the planet's fate the way the live analyzer does. */
function flyDefault(scenarioId: string, T: number) {
  const sc = getScenario(scenarioId);
  const stars = buildStars(sc, [1, 1, 1]);
  const { target, radius, speed } = sc.launch;
  const planet: Planet = { ...launchPlanet(stars, target, radius, speed), alive: true };
  const sim: SimState = {
    stars, planets: [planet], t: 0,
    dtBase: sc.system.dt, G: 1, starSoft: sc.system.softening, planetSoft: 0.05,
  };
  const dt = sc.system.dt;
  const steps = Math.round(T / dt);
  let minDist = Infinity;
  let fate: 'bound' | 'destroyed' | 'ejected' = 'bound';
  for (let i = 0; i < steps; i++) {
    step(sim, dt);
    const d = minStarDist(planet, stars);
    if (d < minDist) minDist = d;
    if (d < R_KILL) { fate = 'destroyed'; break; }
    const rBary = Math.hypot(planet.x, planet.y);
    if (rBary > 16 && planetEnergy(planet, stars, sim.starSoft * sim.starSoft) > 0) {
      fate = 'ejected'; break;
    }
  }
  return { fate, minDist, tEnd: sim.t };
}

describe('scenario launch defaults', () => {
  // The opening act: no scenario should incinerate its planet on the way in.
  // 60 time units is far longer than any realistic first-look viewing window.
  it.each(SCENARIOS.map(s => s.id))('%s default launch is not destroyed early', id => {
    const { fate, minDist } = flyDefault(id, 60);
    expect(fate).not.toBe('destroyed');
    // A comfortable margin over the kill radius, not a knife-edge grazing pass.
    expect(minDist).toBeGreaterThan(R_KILL * 1.5);
  });

  // Figure-Eight is the app's default scenario — the very first thing a visitor
  // sees — so hold it to a stricter bar: bound (not merely un-destroyed) for a
  // long run.
  it('the default scenario (Figure-Eight) keeps the planet bound long-term', () => {
    expect(SCENARIOS[0].id).toBe('figure8');
    const { fate, tEnd } = flyDefault('figure8', 300);
    expect(fate).toBe('bound');
    expect(tEnd).toBeGreaterThanOrEqual(300);
  });
});

describe('recenter', () => {
  it('zeroes net momentum and the center of mass', () => {
    const stars = recenter([
      { x: 1, y: 2, vx: 0.3, vy: -0.1, ax: 0, ay: 0, mass: 2 },
      { x: -1, y: 0, vx: -0.2, vy: 0.4, ax: 0, ay: 0, mass: 1 },
      { x: 0, y: -1, vx: 0.1, vy: 0.5, ax: 0, ay: 0, mass: 3 },
    ]);
    let M = 0, cx = 0, cy = 0, px = 0, py = 0;
    for (const s of stars) { M += s.mass; cx += s.mass * s.x; cy += s.mass * s.y; px += s.mass * s.vx; py += s.mass * s.vy; }
    expect(cx / M).toBeCloseTo(0, 12);
    expect(cy / M).toBeCloseTo(0, 12);
    expect(px / M).toBeCloseTo(0, 12);
    expect(py / M).toBeCloseTo(0, 12);
  });
});

describe('launchPlanet geometry', () => {
  it('places the planet at the requested radius, moving tangentially around the target', () => {
    const stars = buildStars(getScenario('binary'), [1, 1, 1]);
    const f = orbitFrame(stars, 'binary');
    const radius = 1.6, speed = 1.1;
    const p = launchPlanet(stars, 'binary', radius, speed);
    // Offset from the target is `radius` along +x.
    expect(Math.hypot(p.x - f.cx, p.y - f.cy)).toBeCloseTo(radius, 10);
    // Velocity relative to the target has magnitude `speed` and is perpendicular
    // to the radial offset (tangential launch).
    const rvx = p.vx - f.cvx, rvy = p.vy - f.cvy;
    expect(Math.hypot(rvx, rvy)).toBeCloseTo(speed, 10);
    const dot = (p.x - f.cx) * rvx + (p.y - f.cy) * rvy;
    expect(dot).toBeCloseTo(0, 10);
  });
});
