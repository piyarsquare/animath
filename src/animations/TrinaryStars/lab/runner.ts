/** Headless single-run integrator: build the system, launch the planet, step it
 *  to a terminal outcome (or the time budget), and return a compact RunResult.
 *  Pure and deterministic — the same engine that powers the live Observatory,
 *  so ensemble statistics agree with what you see in the single-run view. */

import {
  step, lyapunovRenorm, getPreset, buildStars, launchPlanet, orbitFrame, Analyzer,
  type SimState, type Planet, type Star, type Outcome, type RunResult,
} from '@/lib/nbody';
import type { EnsembleConfig, RunParams } from './rng';

const LYAP_D0 = 1e-9, LYAP_RENORM = 0.5;

/** Coarser than the live view (0.05) — fine enough for statistics, ~2× faster. */
export const SAMPLE_DT_BATCH = 0.1;
const DEG = Math.PI / 180;

/** Mass governing circular speed for the ensemble's orbit target. */
export function targetMassOf(cfg: EnsembleConfig): number {
  const stars = buildStars(getPreset(cfg.presetId), cfg.massMul);
  return orbitFrame(stars, cfg.target).mass;
}

/** Integrate one world to a terminal outcome (or the time budget). */
function simulate(cfg: EnsembleConfig, stars: Star[], planet: Planet) {
  const dt = getPreset(cfg.presetId).dt;
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

function resultOf(s: ReturnType<Analyzer['snapshot']>, blowup: boolean, params: RunParams): RunResult {
  return {
    tSim: s.t,
    outcome: outcomeOf(s, blowup),
    habitableFraction: s.habitableFraction,
    bothFraction: s.bothFraction,
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
  const stars = buildStars(getPreset(cfg.presetId), cfg.massMul);
  const planet = launchPlanet(stars, cfg.target, params.radius, params.speed, params.angleDeg * DEG, params.retro);
  const { s, blowup } = simulate(cfg, stars, planet);
  return resultOf(s, blowup, params);
}

/** Run a single explicit planet IC against a given star configuration — used by
 *  the basin map's position-plane mode, where launches don't fit the
 *  radius/speed/angle parameterisation. */
export function runPlanet(cfg: EnsembleConfig, stars: Star[], planet: Planet): RunResult {
  const { s, blowup } = simulate(cfg, stars, planet);
  return resultOf(s, blowup, { radius: 0, speed: 0, angleDeg: 0, retro: false, seed: 0 });
}

/** Finite-time largest Lyapunov exponent for one explicit planet IC (Benettin
 *  shadow), plus its outcome — used by the basin "chaos map". */
export function runPlanetLyap(cfg: EnsembleConfig, stars: Star[], planet: Planet): { lambda: number; outcome: Outcome } {
  const dt = getPreset(cfg.presetId).dt;
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
