import { describe, it, expect } from 'vitest';
import {
  SCENARIOS, buildStars, launchPlanet, orbitFrame, recenter, getScenario,
  circularSpeed, findStableLaunch, migrateLegacyLaunch,
  step, minStarDist, planetEnergy,
  type SimState, type Planet, type Star, type TargetId,
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
  // sees — so hold it to a stricter, two-sided bar. The launch is tuned to the
  // EDGE of stability: (a) the planet survives the whole realistic viewing
  // window, and (b) the ghost swarm visibly branches early — the app's headline
  // demo must not require minutes of watching.
  it('the default scenario (Figure-Eight) survives the viewing window', () => {
    expect(SCENARIOS[0].id).toBe('figure8');
    const { fate, tEnd } = flyDefault('figure8', 300);
    expect(fate).toBe('bound');
    expect(tEnd).toBeGreaterThanOrEqual(300);
  });

  it('the default launch sits near the edge: a 1e-3 ghost diverges by t=150', () => {
    const sc = getScenario('figure8');
    const stars = buildStars(sc, [1, 1, 1]);
    const { target, radius, speed } = sc.launch;
    const ref: Planet = { ...launchPlanet(stars, target, radius, speed), alive: true };
    // Same offset the Observatory's default ghost spread uses (ε = 10^-3).
    const ghost: Planet = { ...ref, x: ref.x + 1e-3 };
    const sim: SimState = {
      stars, planets: [ref, ghost], t: 0,
      dtBase: sc.system.dt, G: 1, starSoft: sc.system.softening, planetSoft: 0.05,
    };
    let divT: number | null = null;
    const steps = Math.round(150 / sc.system.dt);
    for (let i = 0; i < steps; i++) {
      step(sim, sc.system.dt);
      if (Math.hypot(ghost.x - ref.x, ghost.y - ref.y) > 0.5) { divT = sim.t; break; }
    }
    expect(divT).not.toBeNull();
    expect(divT!).toBeLessThan(150);
  });
});

describe('migrateLegacyLaunch', () => {
  // Returning visitors persist launches from before the safe-default fixes;
  // without migration their stored settings resurrect the planet-into-star
  // opening no matter what the scenario defaults say.
  it('maps each known-fatal legacy default to the current safe launch', () => {
    for (const [presetId, r, v] of [
      ['figure8', 1.8, 1.1], ['figure8', 3.2, 1.0],
      ['moth', 2.2, 1.1], ['pythagorean', 4.0, 1.6],
    ] as const) {
      const m = migrateLegacyLaunch(presetId, r, v);
      expect(m).not.toBeNull();
      const { launch } = getScenario(presetId);
      expect(m).toEqual({ radius: launch.radius, speed: launch.speed });
    }
  });

  it('never touches hand-tuned or already-current values', () => {
    expect(migrateLegacyLaunch('figure8', 2.71, 0.83)).toBeNull();      // user's own
    const { launch } = getScenario('figure8');
    expect(migrateLegacyLaunch('figure8', launch.radius, launch.speed)).toBeNull(); // current
    expect(migrateLegacyLaunch('binary', 1.8, 1.1)).toBeNull();          // preset without legacy entries
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

  it('circularSpeed is √(M/r) about the target', () => {
    const stars = buildStars(getScenario('figure8'), [1, 1, 1]);
    const f = orbitFrame(stars, 'bary');
    expect(circularSpeed(stars, 'bary', 3)).toBeCloseTo(Math.sqrt(f.mass / 3), 10);
  });
});

describe('findStableLaunch', () => {
  // The empirical safe-orbit finder (backs the "Find a stable orbit" button and
  // the fell-into-a-star recovery hint). Its contract: whatever it returns must
  // actually survive — with clearance, not a chaotic knife-edge.
  it.each(SCENARIOS.map(s => s.id))('returns a genuinely surviving orbit for %s', id => {
    const sc = getScenario(id);
    const stars = buildStars(sc, [1, 1, 1]);
    const target: TargetId = sc.launch.target;
    const found = findStableLaunch(stars, target, { starSoft: sc.system.softening, dt: sc.system.dt });
    expect(found).not.toBeNull();
    // Re-fly the returned launch independently and confirm it stays clear.
    const s: Star[] = buildStars(sc, [1, 1, 1]);
    const planet: Planet = { ...launchPlanet(s, target, found!.radius, found!.speed), alive: true };
    const sim: SimState = { stars: s, planets: [planet], t: 0, dtBase: sc.system.dt, G: 1, starSoft: sc.system.softening, planetSoft: 0.05 };
    let minDist = Infinity;
    const steps = Math.round(120 / sc.system.dt);
    for (let i = 0; i < steps; i++) { step(sim, sc.system.dt); minDist = Math.min(minDist, minStarDist(planet, s)); }
    expect(minDist).toBeGreaterThan(0.3);
  });

  it('returns values on the UI controls’ 0.05 grid (representable + preserved by the sliders)', () => {
    const sc = getScenario('figure8');
    const stars = buildStars(sc, [1, 1, 1]);
    const found = findStableLaunch(stars, 'bary', { starSoft: sc.system.softening, dt: sc.system.dt });
    expect(found).not.toBeNull();
    const onGrid = (x: number) => Math.abs(x / 0.05 - Math.round(x / 0.05)) < 1e-9;
    expect(onGrid(found!.radius)).toBe(true);
    expect(onGrid(found!.speed)).toBe(true);
  });

  it('never returns a radius beyond largestRadius (must stay in the UI control range)', () => {
    // The recovery UI caps Start radius at 8; a result past it would clamp on the
    // next slider drag, back toward an unsafe orbit. The finder must respect the
    // bound and return null (→ caller falls back to the safe scenario default)
    // rather than an out-of-range orbit. Pythagorean around Star 3 is the case
    // the reviewer flagged (unconstrained search wanted r≈11.5).
    const sc = getScenario('pythagorean');
    const stars = buildStars(sc, [1, 1, 1]);
    const found = findStableLaunch(stars, 's2', { starSoft: sc.system.softening, dt: sc.system.dt, largestRadius: 8 });
    if (found) expect(found.radius).toBeLessThanOrEqual(8);
  });
});
