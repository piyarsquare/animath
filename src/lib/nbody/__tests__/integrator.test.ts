import { describe, it, expect } from 'vitest';
import {
  buildStars, getScenario, launchPlanet, step, Analyzer, DEFAULT_CLASSIFY,
  type SimState, type Star,
} from '../index';

/** Total mechanical energy of the (softened) three-star system — the quantity a
 *  symplectic leapfrog is supposed to keep bounded. */
function systemEnergy(stars: Star[], soft: number): number {
  const s2 = soft * soft;
  let ke = 0;
  for (const s of stars) ke += 0.5 * s.mass * (s.vx * s.vx + s.vy * s.vy);
  let pe = 0;
  for (let i = 0; i < stars.length; i++) {
    for (let j = i + 1; j < stars.length; j++) {
      const dx = stars[j].x - stars[i].x, dy = stars[j].y - stars[i].y;
      pe -= stars[i].mass * stars[j].mass / Math.sqrt(dx * dx + dy * dy + s2);
    }
  }
  return ke + pe;
}

function totalMomentum(stars: Star[]): { px: number; py: number } {
  let px = 0, py = 0;
  for (const s of stars) { px += s.mass * s.vx; py += s.mass * s.vy; }
  return { px, py };
}

describe('leapfrog integrator', () => {
  it('keeps total energy bounded over a long figure-eight run (symplectic)', () => {
    const sc = getScenario('figure8');
    const stars = buildStars(sc, [1, 1, 1]);
    const sim: SimState = { stars, planets: [], t: 0, dtBase: sc.system.dt, G: 1, starSoft: sc.system.softening, planetSoft: 0.05 };
    const E0 = systemEnergy(stars, sc.system.softening);
    let maxDrift = 0;
    const steps = Math.round(50 / sc.system.dt);
    for (let i = 0; i < steps; i++) {
      step(sim, sc.system.dt);
      maxDrift = Math.max(maxDrift, Math.abs((systemEnergy(stars, sc.system.softening) - E0) / E0));
    }
    // A symplectic scheme oscillates energy but does not drift secularly; a few
    // parts in 10³ over thousands of steps is the expected bound (not < eps).
    expect(maxDrift).toBeLessThan(0.02);
  });

  it('conserves total momentum (recentered systems stay put)', () => {
    const sc = getScenario('pythagorean');
    const stars = buildStars(sc, [1, 1, 1]);
    const sim: SimState = { stars, planets: [], t: 0, dtBase: sc.system.dt, G: 1, starSoft: sc.system.softening, planetSoft: 0.05 };
    for (let i = 0; i < 5000; i++) step(sim, sc.system.dt);
    const { px, py } = totalMomentum(stars);
    expect(Math.hypot(px, py)).toBeLessThan(1e-9);
  });

  it('leaves a frozen (alive:false) planet untouched', () => {
    const sc = getScenario('figure8');
    const stars = buildStars(sc, [1, 1, 1]);
    const frozen = { ...launchPlanet(stars, 'bary', 3.2, 1.0), alive: false as const };
    const before = { x: frozen.x, y: frozen.y, vx: frozen.vx, vy: frozen.vy };
    const sim: SimState = { stars, planets: [frozen], t: 0, dtBase: sc.system.dt, G: 1, starSoft: sc.system.softening, planetSoft: 0.05 };
    for (let i = 0; i < 500; i++) step(sim, sc.system.dt);
    expect(frozen.x).toBe(before.x);
    expect(frozen.vy).toBe(before.vy);
  });
});

describe('Analyzer classification', () => {
  it('reports the planet destroyed after it is driven into a star', () => {
    const sc = getScenario('figure8');
    const stars = buildStars(sc, [1, 1, 1]);
    // Launch straight at the central star with no tangential speed → it plunges in.
    const planet = { ...launchPlanet(stars, 'bary', 1.2, 0), alive: true };
    const analyzer = new Analyzer({ ...DEFAULT_CLASSIFY, rKill: 0.12 }, stars, planet);
    const sim: SimState = { stars, planets: [planet], t: 0, dtBase: sc.system.dt, G: 1, starSoft: sc.system.softening, planetSoft: 0.05 };
    let sampleT = 0;
    for (let i = 0; i < Math.round(30 / sc.system.dt); i++) {
      step(sim, sc.system.dt);
      if (sim.t >= sampleT) { analyzer.push(sim.t, stars, planet); sampleT = sim.t + 0.05; }
    }
    const snap = analyzer.snapshot();
    expect(snap.planetFate).toBe('destroyed');
    expect(snap.events.some(e => e.kind === 'planet-destroyed')).toBe(true);
  });

  it('accumulates habitable time for a planet launched at the reference insolation', () => {
    const sc = getScenario('figure8');
    const stars = buildStars(sc, [1, 1, 1]);
    // A safe wide circular orbit: insolation stays near S_ref ⇒ habitable band.
    const planet = { ...launchPlanet(stars, 'bary', 3.2, 1.0), alive: true };
    const analyzer = new Analyzer(DEFAULT_CLASSIFY, stars, planet);
    const sim: SimState = { stars, planets: [planet], t: 0, dtBase: sc.system.dt, G: 1, starSoft: sc.system.softening, planetSoft: 0.05 };
    let sampleT = 0;
    for (let i = 0; i < Math.round(60 / sc.system.dt); i++) {
      step(sim, sc.system.dt);
      if (sim.t >= sampleT) { analyzer.push(sim.t, stars, planet); sampleT = sim.t + 0.05; }
    }
    const snap = analyzer.snapshot();
    expect(snap.planetFate).toBe('bound');
    expect(snap.habitableFraction).toBeGreaterThan(0.5);
  });
});
