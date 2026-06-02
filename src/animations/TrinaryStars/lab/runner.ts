/** Headless single-run integrator: build the system, launch the planet, step it
 *  to a terminal outcome (or the time budget), and return a compact RunResult.
 *  Pure and deterministic — the same engine that powers the live Observatory,
 *  so ensemble statistics agree with what you see in the single-run view. */

import { step, type SimState } from '../physics';
import { getPreset, buildStars, launchPlanet, orbitFrame } from '../presets';
import { Analyzer } from '../analysis/analyzer';
import type { Outcome, RunResult } from '../analysis/types';
import type { EnsembleConfig, RunParams } from './rng';

/** Coarser than the live view (0.05) — fine enough for statistics, ~2× faster. */
export const SAMPLE_DT_BATCH = 0.1;
const DEG = Math.PI / 180;

/** Mass governing circular speed for the ensemble's orbit target. */
export function targetMassOf(cfg: EnsembleConfig): number {
  const stars = buildStars(getPreset(cfg.presetId), cfg.massMul);
  return orbitFrame(stars, cfg.target).mass;
}

export function runOne(cfg: EnsembleConfig, params: RunParams): RunResult {
  const preset = getPreset(cfg.presetId);
  const stars = buildStars(preset, cfg.massMul);
  const planet = launchPlanet(stars, cfg.target, params.radius, params.speed, params.angleDeg * DEG, params.retro);

  const sim: SimState = {
    stars, planets: [planet], t: 0, dtBase: preset.dt, G: 1,
    starSoft: cfg.starSoft, planetSoft: 0.05,
  };
  const an = new Analyzer(cfg.classify, stars, planet);

  const dt = preset.dt;
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
      if (an.fateNow() !== 'bound') break; // planet destroyed or ejected — resolved
    }
  }

  const s = an.snapshot();
  const outcome: Outcome = blowup ? 'blowup'
    : s.planetFate === 'destroyed' ? 'planet-destroyed'
    : s.planetFate === 'ejected' ? 'planet-ejected'
    : s.ejectedStar >= 0 ? 'happy'
    : 'survived';
  const tEject = s.events.find(e => e.kind === 'star-ejected')?.t ?? -1;

  return {
    tSim: s.t,
    outcome,
    habitableFraction: s.habitableFraction,
    bothFraction: s.bothFraction,
    longestHabitable: s.longestHabitable,
    minStarDist: s.minStarDist,
    ejectedStar: s.ejectedStar,
    tEject,
    planetFate: s.planetFate,
    radius: params.radius,
    speed: params.speed,
    angleDeg: params.angleDeg,
    retro: params.retro,
    seed: params.seed,
  };
}
