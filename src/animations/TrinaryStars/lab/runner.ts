/** Headless single-run integrator: build the system, launch the planet, step it
 *  to a terminal outcome (or the time budget), and return a compact RunResult.
 *  Pure and deterministic — the same engine that powers the live Observatory,
 *  so ensemble statistics agree with what you see in the single-run view. */

import {
  step, lyapunovRenorm, getScenario, buildStars, launchPlanet, orbitFrame, Analyzer,
  type SimState, type Planet, type Star, type Outcome, type RunResult,
} from '@/lib/nbody';
import type { EnsembleConfig, RunParams } from './rng';

const LYAP_D0 = 1e-9, LYAP_RENORM = 0.5;

/** Coarser than the live view (0.05) — fine enough for statistics, ~2× faster. */
export const SAMPLE_DT_BATCH = 0.1;
const DEG = Math.PI / 180;

/** Mass governing circular speed for the ensemble's orbit target. */
export function targetMassOf(cfg: EnsembleConfig): number {
  const stars = buildStars(getScenario(cfg.presetId), cfg.massMul);
  return orbitFrame(stars, cfg.target).mass;
}

export interface StarPathPoint { x: number; y: number; }

/** The stars' trajectories over the simulation budget. The planet is a test
 *  mass, so these are identical for every run — which lets the Destiny Map's
 *  position plane overlay them once for spatial context. One polyline per star,
 *  in world coordinates, sampled to ~`maxPts` points. */
export function starPaths(cfg: EnsembleConfig, maxPts = 700): StarPathPoint[][] {
  const preset = getScenario(cfg.presetId);
  const stars = buildStars(preset, cfg.massMul);
  const dt = preset.system.dt;
  const sim: SimState = { stars, planets: [], t: 0, dtBase: dt, G: 1, starSoft: cfg.starSoft, planetSoft: 0.05 };
  const steps = Math.max(1, Math.round(cfg.tMax / dt));
  const stride = Math.max(1, Math.floor(steps / maxPts));
  const paths: StarPathPoint[][] = stars.map(() => []);
  for (let n = 0; n <= steps; n++) {
    if (n % stride === 0) for (let k = 0; k < stars.length; k++) paths[k].push({ x: stars[k].x, y: stars[k].y });
    step(sim, dt);
  }
  return paths;
}

/** Integrate one world to a terminal outcome (or the time budget). */
function simulate(cfg: EnsembleConfig, stars: Star[], planet: Planet) {
  const dt = getScenario(cfg.presetId).system.dt;
  const sim: SimState = {
    stars, planets: [planet], t: 0, dtBase: dt, G: 1,
    starSoft: cfg.starSoft, planetSoft: 0.05,
  };
  const an = new Analyzer(cfg.classify, stars, planet);
  const maxSteps = Math.round(cfg.tMax / dt);
  let nextSample = SAMPLE_DT_BATCH;
  let blowup = false;

  for (let n = 0; n < maxSteps; n++) {
    step(sim, dt);
    if (!Number.isFinite(planet.x) || Math.abs(planet.x) > 1e4 || Math.abs(planet.y) > 1e4) {
      blowup = true;
      break;
    }
    if (sim.t >= nextSample) {
      an.push(sim.t, stars, planet);
      nextSample = sim.t + SAMPLE_DT_BATCH;
      if (an.fateNow() !== 'bound') break;
    }
  }
  return { s: an.snapshot(), blowup };
}

function outcomeOf(s: ReturnType<Analyzer['snapshot']>, blowup: boolean): Outcome {
  return blowup ? 'blowup'
    : s.planetFate === 'destroyed' ? 'planet-destroyed'
    : s.planetFate === 'ejected' ? 'planet-ejected'
    : s.ejectedStar >= 0 ? 'happy'
    : 'survived';
}

function resultOf(s: ReturnType<Analyzer['snapshot']>, blowup: boolean, params: RunParams, tMax: number): RunResult {
  // Fractions are measured over the ensemble's TIME BUDGET, not the planet's
  // survived lifetime. The analyzer's own fractions are per-lifetime — fine for
  // a live view, but poison for averaging: a world destroyed at t≈2 that was
  // habitable right up to the end would report ~100% habitable and a census of
  // early-killed planets would read absurdly rosy. Over the budget, that world
  // reports 2/tMax — dead time is not habitable time.
  const scale = s.total / Math.max(tMax, 1e-9);
  return {
    tSim: s.t,
    outcome: outcomeOf(s, blowup),
    habitableFraction: Math.min(1, s.habitableFraction * scale),
    bothFraction: Math.min(1, s.bothFraction * scale),
    longestHabitable: s.longestHabitable,
    minStarDist: s.minStarDist,
    ejectedStar: s.ejectedStar,
    tEject: s.events.find(e => e.kind === 'star-ejected')?.t ?? -1,
    planetFate: s.planetFate,
    radius: params.radius,
    speed: params.speed,
    angleDeg: params.angleDeg,
    retro: params.retro,
    seed: params.seed,
  };
}

export function runOne(cfg: EnsembleConfig, params: RunParams): RunResult {
  const stars = buildStars(getScenario(cfg.presetId), cfg.massMul);
  const planet = launchPlanet(stars, cfg.target, params.radius, params.speed, params.angleDeg * DEG, params.retro);
  const { s, blowup } = simulate(cfg, stars, planet);
  return resultOf(s, blowup, params, cfg.tMax);
}

/** Run a single explicit planet IC against a given star configuration — used by
 *  the basin map's position-plane mode, where launches don't fit the
 *  radius/speed/angle parameterization. */
export function runPlanet(cfg: EnsembleConfig, stars: Star[], planet: Planet): RunResult {
  const { s, blowup } = simulate(cfg, stars, planet);
  return resultOf(s, blowup, { radius: 0, speed: 0, angleDeg: 0, retro: false, seed: 0 }, cfg.tMax);
}

/** Finite-time largest Lyapunov exponent for one explicit planet IC (Benettin
 *  shadow), plus its outcome — used by the basin "chaos map". */
export function runPlanetLyap(cfg: EnsembleConfig, stars: Star[], planet: Planet): { lambda: number; outcome: Outcome } {
  const dt = getScenario(cfg.presetId).system.dt;
  const shadow: Planet = { ...planet, x: planet.x + LYAP_D0 };
  const sim: SimState = {
    stars, planets: [planet, shadow], t: 0, dtBase: dt, G: 1,
    starSoft: cfg.starSoft, planetSoft: 0.05,
  };
  const an = new Analyzer(cfg.classify, stars, planet);
  const maxSteps = Math.round(cfg.tMax / dt);
  let nextSample = SAMPLE_DT_BATCH, nextRenorm = LYAP_RENORM, sum = 0, blowup = false;
  for (let n = 0; n < maxSteps; n++) {
    step(sim, dt);
    if (!Number.isFinite(planet.x) || Math.abs(planet.x) > 1e4 || Math.abs(planet.y) > 1e4) { blowup = true; break; }
    if (sim.t >= nextRenorm) { sum += lyapunovRenorm(planet, shadow, LYAP_D0); nextRenorm = sim.t + LYAP_RENORM; }
    if (sim.t >= nextSample) {
      an.push(sim.t, stars, planet);
      nextSample = sim.t + SAMPLE_DT_BATCH;
      if (an.fateNow() !== 'bound') break;
    }
  }
  const s = an.snapshot();
  return { lambda: sum / Math.max(s.t, 1e-6), outcome: outcomeOf(s, blowup) };
}

const BATCH_PARAMS: RunParams = { radius: 0, speed: 0, angleDeg: 0, retro: false, seed: 0 };

/** Batched fate runner: integrate many planets against ONE shared star
 *  integration. The planets are test masses, so the stars' trajectory is
 *  independent of them — which makes this *bit-identical* to running each planet
 *  alone, while the (dominant) star work is paid once for the whole batch rather
 *  than once per planet. Planets resolve and freeze independently (`alive=false`,
 *  which `step` then skips), so each keeps the exact outcome/timing it would have
 *  had solo. Star integration stops as soon as every planet has resolved. */
export function runBatchFate(cfg: EnsembleConfig, stars: Star[], planets: Planet[]): RunResult[] {
  const dt = getScenario(cfg.presetId).system.dt;
  const maxSteps = Math.round(cfg.tMax / dt);
  const sim: SimState = { stars, planets, t: 0, dtBase: dt, G: 1, starSoft: cfg.starSoft, planetSoft: 0.05 };
  const an = planets.map(p => new Analyzer(cfg.classify, stars, p));
  const nextSample = new Float64Array(planets.length).fill(SAMPLE_DT_BATCH);
  const blowup = new Uint8Array(planets.length);
  const done = new Uint8Array(planets.length);
  let alive = planets.length;
  for (let n = 0; n < maxSteps && alive > 0; n++) {
    step(sim, dt);
    for (let k = 0; k < planets.length; k++) {
      if (done[k]) continue;
      const p = planets[k];
      if (!Number.isFinite(p.x) || Math.abs(p.x) > 1e4 || Math.abs(p.y) > 1e4) {
        blowup[k] = 1; done[k] = 1; p.alive = false; alive--; continue;
      }
      if (sim.t >= nextSample[k]) {
        an[k].push(sim.t, stars, p);
        nextSample[k] = sim.t + SAMPLE_DT_BATCH;
        if (an[k].fateNow() !== 'bound') { done[k] = 1; p.alive = false; alive--; }
      }
    }
  }
  return planets.map((_, k) => resultOf(an[k].snapshot(), blowup[k] === 1, BATCH_PARAMS, cfg.tMax));
}

/** Batched finite-time Lyapunov runner (chaos lens): the same idea with a
 *  Benettin shadow per planet. Each (planet, shadow) pair renormalizes against
 *  itself, so pairs stay independent and bit-identical to `runPlanetLyap`; the
 *  shared star integration is paid once. */
export function runBatchLyap(cfg: EnsembleConfig, stars: Star[], planets: Planet[]): { lambda: number; outcome: Outcome }[] {
  const dt = getScenario(cfg.presetId).system.dt;
  const maxSteps = Math.round(cfg.tMax / dt);
  const shadows = planets.map(p => ({ ...p, x: p.x + LYAP_D0 }));
  const all: Planet[] = [];
  for (let k = 0; k < planets.length; k++) { all.push(planets[k]); all.push(shadows[k]); }
  const sim: SimState = { stars, planets: all, t: 0, dtBase: dt, G: 1, starSoft: cfg.starSoft, planetSoft: 0.05 };
  const an = planets.map(p => new Analyzer(cfg.classify, stars, p));
  const nextSample = new Float64Array(planets.length).fill(SAMPLE_DT_BATCH);
  const nextRenorm = new Float64Array(planets.length).fill(LYAP_RENORM);
  const sum = new Float64Array(planets.length);
  const blowup = new Uint8Array(planets.length);
  const done = new Uint8Array(planets.length);
  let alive = planets.length;
  for (let n = 0; n < maxSteps && alive > 0; n++) {
    step(sim, dt);
    for (let k = 0; k < planets.length; k++) {
      if (done[k]) continue;
      const p = planets[k], sh = shadows[k];
      if (!Number.isFinite(p.x) || Math.abs(p.x) > 1e4 || Math.abs(p.y) > 1e4) {
        blowup[k] = 1; done[k] = 1; p.alive = false; sh.alive = false; alive--; continue;
      }
      if (sim.t >= nextRenorm[k]) { sum[k] += lyapunovRenorm(p, sh, LYAP_D0); nextRenorm[k] = sim.t + LYAP_RENORM; }
      if (sim.t >= nextSample[k]) {
        an[k].push(sim.t, stars, p);
        nextSample[k] = sim.t + SAMPLE_DT_BATCH;
        if (an[k].fateNow() !== 'bound') { done[k] = 1; p.alive = false; sh.alive = false; alive--; }
      }
    }
  }
  return planets.map((_, k) => {
    const s = an[k].snapshot();
    return { lambda: sum[k] / Math.max(s.t, 1e-6), outcome: outcomeOf(s, blowup[k] === 1) };
  });
}
