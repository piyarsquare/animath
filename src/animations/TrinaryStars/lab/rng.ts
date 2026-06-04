/** Seeded RNG and initial-condition sampling for ensembles. Deterministic:
 *  a run is fully reproduced by its (base seed, index), so any interesting
 *  world can be reloaded or shared. */

import type { TargetId, ClassifyParams } from '@/lib/nbody';

/** Fast, decent 32-bit PRNG. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Per-run seed derived from the ensemble base seed and run index. */
export function runSeed(baseSeed: number, index: number): number {
  return (baseSeed + Math.imul(index, 0x9e3779b9)) >>> 0;
}

/** Fixed configuration shared by every run in an ensemble. */
export interface EnsembleConfig {
  presetId: string;
  target: TargetId;
  massMul: number[];
  starSoft: number;
  classify: ClassifyParams;
  /** Sim-time budget per run. */
  tMax: number;
  /** Sampling ranges for the planet's launch. */
  rMin: number;
  rMax: number;
  /** Speed as a fraction of the local circular speed √(M/r). */
  fMin: number;
  fMax: number;
  allowRetro: boolean;
  /** Base seed for the whole ensemble. */
  baseSeed: number;
}

export interface RunParams {
  radius: number;
  speed: number;
  angleDeg: number;
  retro: boolean;
  seed: number;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Sample one run's initial conditions from its own seeded stream. `targetMass`
 *  is the mass governing circular speed for the chosen orbit target. */
export function sampleParams(cfg: EnsembleConfig, index: number, targetMass: number): RunParams {
  const seed = runSeed(cfg.baseSeed, index);
  const rng = mulberry32(seed);
  const radius = lerp(cfg.rMin, cfg.rMax, rng());
  const f = lerp(cfg.fMin, cfg.fMax, rng());
  const vcirc = Math.sqrt(targetMass / Math.max(0.05, radius));
  const angleDeg = 360 * rng();
  const retro = cfg.allowRetro ? rng() < 0.5 : false;
  return { radius, speed: f * vcirc, angleDeg, retro, seed };
}
