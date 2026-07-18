import { describe, it, expect } from 'vitest';
import {
  buildStars, getScenario, launchPlanet, step, recenter,
  insolation, planetEnergy, minStarDist, climateOf,
  detectEjection, planetEscaped,
  cloudSpread, lyapunovRenorm,
  Analyzer, DEFAULT_CLASSIFY, SCENARIOS,
  type SimState, type Star, type Planet, type Bin,
} from '../index';

function star(x: number, y: number, vx: number, vy: number, mass: number): Star {
  return { x, y, vx, vy, ax: 0, ay: 0, mass };
}

describe('scalar measurements', () => {
  it('insolation is Σ L/(d²+soft²) and respects the luminosity exponent', () => {
    const stars = [star(1, 0, 0, 0, 2), star(-1, 0, 0, 0, 1), star(0, 5, 0, 0, 1)];
    const p: Planet = { x: 0, y: 0, vx: 0, vy: 0, ax: 0, ay: 0 };
    const soft2 = 0;
    // lumExp = 1: L = mass.
    expect(insolation(p, stars, 1, soft2)).toBeCloseTo(2 / 1 + 1 / 1 + 1 / 25, 12);
    // lumExp = 3: the mass-2 star shines 8×.
    expect(insolation(p, stars, 3, soft2)).toBeCloseTo(8 / 1 + 1 / 1 + 1 / 25, 12);
  });

  it('planetEnergy is negative for a slow (bound) planet, positive for a fast one', () => {
    const stars = buildStars(getScenario('figure8'), [1, 1, 1]);
    const slow: Planet = { ...launchPlanet(stars, 'bary', 3, 0.5) };
    const fast: Planet = { ...launchPlanet(stars, 'bary', 3, 5) };
    expect(planetEnergy(slow, stars, 0)).toBeLessThan(0);
    expect(planetEnergy(fast, stars, 0)).toBeGreaterThan(0);
  });

  it('minStarDist returns the distance to the nearest star', () => {
    const stars = [star(3, 0, 0, 0, 1), star(0, 4, 0, 0, 1), star(-10, 0, 0, 0, 1)];
    const p: Planet = { x: 0, y: 0, vx: 0, vy: 0, ax: 0, ay: 0 };
    expect(minStarDist(p, stars)).toBeCloseTo(3, 12);
  });

  it('climateOf: strict band edges — exactly at a bound counts as habitable', () => {
    expect(climateOf(0.5, 1, 2)).toBe('cold');
    expect(climateOf(1, 1, 2)).toBe('habitable');   // S < Slo is cold; S === Slo is not
    expect(climateOf(1.5, 1, 2)).toBe('habitable');
    expect(climateOf(2, 1, 2)).toBe('habitable');   // S > Shi is hot; S === Shi is not
    expect(climateOf(2.5, 1, 2)).toBe('hot');
  });
});

describe('event detection', () => {
  it('detectEjection flags a far, unbound star (and not a bound trio)', () => {
    const bound = buildStars(getScenario('figure8'), [1, 1, 1]);
    expect(detectEjection(bound, 12)).toBe(-1);
    // A tight massive pair + one star far away moving out much faster than escape.
    const trio = recenter([
      star(0.3, 0, 0, 0.9, 1),
      star(-0.3, 0, 0, -0.9, 1),
      star(30, 0, 5, 0, 0.5),
    ]);
    expect(detectEjection(trio, 12)).toBe(2);
  });

  it('planetEscaped needs BOTH positive energy and distance beyond rEsc', () => {
    const stars = buildStars(getScenario('figure8'), [1, 1, 1]);
    const farSlow: Planet = { x: 20, y: 0, vx: 0, vy: 0, ax: 0, ay: 0 };       // far but falling back
    const farFast: Planet = { x: 20, y: 0, vx: 3, vy: 0, ax: 0, ay: 0 };        // far and unbound
    const nearFast: Planet = { x: 2, y: 0, vx: 5, vy: 0, ax: 0, ay: 0 };        // unbound but still inside
    expect(planetEscaped(farSlow, stars, 12, 0)).toBe(false);
    expect(planetEscaped(farFast, stars, 12, 0)).toBe(true);
    expect(planetEscaped(nearFast, stars, 12, 0)).toBe(false);
  });
});

describe('divergence diagnostics', () => {
  it('cloudSpread measures only the first `count` planets (the visible swarm, not the shadow)', () => {
    const ref: Planet = { x: 0, y: 0, vx: 0, vy: 0, ax: 0, ay: 0 };
    const ghost: Planet = { ...ref, x: 0.3 };
    const shadow: Planet = { ...ref, x: 99 }; // appended measurement probe
    expect(cloudSpread([ref, ghost, shadow], 2)).toBeCloseTo(0.3, 12);
    expect(cloudSpread([ref, ghost, shadow])).toBeCloseTo(99, 12);
    expect(cloudSpread([ref], 1)).toBe(0);
  });

  it('lyapunovRenorm returns log(d/d0) and rescales the shadow to exactly d0 in phase space', () => {
    const ref: Planet = { x: 1, y: 2, vx: 0.3, vy: -0.4, ax: 0, ay: 0 };
    const shadow: Planet = { x: 1.3, y: 2.4, vx: 0.3, vy: -0.4, ax: 0, ay: 0 };
    const d0 = 1e-7;
    const d = Math.hypot(0.3, 0.4);
    const out = lyapunovRenorm(ref, shadow, d0);
    expect(out).toBeCloseTo(Math.log(d / d0), 10);
    const after = Math.sqrt(
      (shadow.x - ref.x) ** 2 + (shadow.y - ref.y) ** 2 +
      (shadow.vx - ref.vx) ** 2 + (shadow.vy - ref.vy) ** 2,
    );
    expect(after).toBeCloseTo(d0, 12);
  });
});

/** Drive a real run through the analyzer at the app's sampling cadence. */
function analyze(scenarioId: string, radius: number, speed: number, T: number) {
  const sc = getScenario(scenarioId);
  const stars = buildStars(sc, [1, 1, 1]);
  const planet: Planet = { ...launchPlanet(stars, sc.launch.target, radius, speed), alive: true };
  const an = new Analyzer(DEFAULT_CLASSIFY, stars, planet);
  const sim: SimState = { stars, planets: [planet], t: 0, dtBase: sc.system.dt, G: 1, starSoft: sc.system.softening, planetSoft: 0.05 };
  let next = 0.05;
  for (let i = 0; i < Math.round(T / sc.system.dt); i++) {
    step(sim, sc.system.dt);
    if (sim.t >= next) { an.push(sim.t, stars, planet); next = sim.t + 0.05; }
  }
  return an.snapshot();
}

describe('Analyzer timeline invariants', () => {
  it('segments are contiguous, monotone, and span [0, now]; fractions are a partition', () => {
    const s = analyze('figure8', 3.2, 0.95, 40);
    expect(s.segments.length).toBeGreaterThan(0);
    expect(s.segments[0].t0).toBe(0);
    for (const seg of s.segments) expect(seg.t1).toBeGreaterThanOrEqual(seg.t0);
    for (let i = 1; i < s.segments.length; i++) {
      expect(s.segments[i].t0).toBeCloseTo(s.segments[i - 1].t1, 10);
    }
    expect(s.segments[s.segments.length - 1].t1).toBeCloseTo(s.t, 10);
    // The four bin fractions partition elapsed time.
    const sum = (Object.keys(s.binFractions) as Bin[]).reduce((a, b) => a + s.binFractions[b], 0);
    expect(sum).toBeCloseTo(1, 6);
    expect(s.habitableFraction).toBeGreaterThanOrEqual(0);
    expect(s.habitableFraction).toBeLessThanOrEqual(1);
    // longest habitable stretch can't exceed total habitable time... but it CAN
    // equal it; and never exceeds the elapsed time.
    expect(s.longestHabitable).toBeLessThanOrEqual(s.t + 1e-9);
  });

  it('each terminal event fires at most once', () => {
    // A plunging launch: destroyed quickly.
    const s = analyze('figure8', 1.2, 0, 30);
    const destroyedEvents = s.events.filter(e => e.kind === 'planet-destroyed');
    expect(destroyedEvents.length).toBe(1);
    expect(s.planetFate).toBe('destroyed');
    // The fate is terminal: minStarDist dipped below the kill radius.
    expect(s.minStarDist).toBeLessThan(DEFAULT_CLASSIFY.rKill);
  });

  it('a calm habitable orbit is eventually classified Paradise (both axes good)', () => {
    // A synthetic hierarchical system: one heavy star + two distant tiny ones,
    // planet on a close circular orbit around the heavy star → steady light,
    // steady energy ⇒ climate AND dynamics both good.
    const stars = recenter([
      star(0, 0, 0, 0, 1),
      star(40, 0, 0, 0.15, 0.001),
      star(-40, 0, 0, -0.15, 0.001),
    ]);
    const planet: Planet = { ...launchPlanet(stars, 's0', 1.0, Math.sqrt(1 / 1.0)), alive: true };
    const an = new Analyzer(DEFAULT_CLASSIFY, stars, planet);
    const dt = 0.002;
    const sim: SimState = { stars, planets: [planet], t: 0, dtBase: dt, G: 1, starSoft: 0.02, planetSoft: 0.05 };
    let next = 0.05;
    for (let i = 0; i < Math.round(20 / dt); i++) {
      step(sim, dt);
      if (sim.t >= next) { an.push(sim.t, stars, planet); next = sim.t + 0.05; }
    }
    const s = an.snapshot();
    expect(s.planetFate).toBe('bound');
    expect(s.climate).toBe('habitable');
    expect(s.calm).toBe(true);
    expect(s.bin).toBe('both');
    // And the timeline should be dominated by the Paradise bin once the calm
    // window fills (~2 time units of 20).
    expect(s.binFractions.both).toBeGreaterThan(0.7);
  });
});

describe('scenario registry', () => {
  it('getScenario falls back to the default for unknown ids', () => {
    expect(getScenario('nope-not-real').id).toBe(SCENARIOS[0].id);
  });

  it('buildStars with uneven mass multipliers still has zero net momentum', () => {
    const stars = buildStars(getScenario('pythagorean'), [2.5, 0.5, 1.3]);
    let px = 0, py = 0, M = 0, cx = 0, cy = 0;
    for (const s of stars) { px += s.mass * s.vx; py += s.mass * s.vy; M += s.mass; cx += s.mass * s.x; cy += s.mass * s.y; }
    expect(Math.hypot(px, py)).toBeLessThan(1e-12);
    expect(Math.hypot(cx / M, cy / M)).toBeLessThan(1e-12);
  });
});
