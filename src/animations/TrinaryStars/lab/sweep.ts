/** Parameter-sweep cell: fix the launch radius and speed-fraction, average over
 *  `runs` randomly-angled launches, and report the fraction of each outcome.
 *  Used to paint a 2D map of where (and how) planets survive. */

import { runOne } from './runner';
import { mulberry32, type EnsembleConfig } from './rng';

export interface SweepCell { happy: number; hab: number; destroyed: number; survived: number; }

export function sweepCell(
  cfg: EnsembleConfig, radius: number, frac: number, runs: number, targetMass: number, seed: number,
): SweepCell {
  const rng = mulberry32(seed);
  const v = frac * Math.sqrt(targetMass / Math.max(0.05, radius));
  let happy = 0, destroyed = 0, survived = 0, habSum = 0;
  for (let k = 0; k < runs; k++) {
    const angleDeg = 360 * rng();
    const retro = cfg.allowRetro && rng() < 0.5;
    const r = runOne(cfg, { radius, speed: v, angleDeg, retro, seed: (seed + k * 2654435761) >>> 0 });
    if (r.outcome === 'happy') happy++;
    else if (r.outcome === 'planet-destroyed') destroyed++;
    else if (r.outcome === 'survived') survived++;
    habSum += r.habitableFraction;
  }
  return { happy: happy / runs, destroyed: destroyed / runs, survived: survived / runs, hab: habSum / runs };
}
