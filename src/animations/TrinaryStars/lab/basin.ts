/** Pure basin-map computation, shared by the main thread and basin workers.
 *  One pixel = one exact, deterministic world integrated to its fate. */

import { getPreset, buildStars, launchPlanet, orbitFrame, type Planet, type Star, type Outcome } from '@/lib/nbody';
import { runPlanet, runPlanetLyap } from './runner';
import type { EnsembleConfig } from './rng';

const DEG = Math.PI / 180;

export type BasinMode = 'pos' | 'radspeed' | 'anglespeed';
export type BasinMetric = 'fate' | 'chaos';
export interface Domain { a0: number; a1: number; b0: number; b1: number; }
export interface BasinConfig {
  mode: BasinMode;
  metric: BasinMetric;      // colour by outcome, or by Lyapunov exponent
  domain: Domain;
  res: number;
  samples: number;          // S → S² subsamples
  posRule: 'rest' | 'tangential';
  posSpeedFrac: number;
  fixedAngle: number;
  fixedRadius: number;
  fixedRetro: boolean;
}

export const OUTCOME_RGB: Record<Outcome, [number, number, number]> = {
  happy: [70, 217, 138], survived: [120, 170, 255], 'planet-ejected': [120, 95, 232],
  'planet-destroyed': [255, 110, 60], blowup: [80, 80, 80],
};
export const OUTCOME_CODE: Outcome[] = ['happy', 'survived', 'planet-ejected', 'planet-destroyed', 'blowup'];

/** Lyapunov λ → colour: regular (deep blue) through green/amber to chaotic
 *  (red). Saturates around λ ≈ 0.4. */
export const CHAOS_LAMBDA_MAX = 0.4;
export function chaosColor(lambda: number): [number, number, number] {
  const x = Math.min(1, Math.max(0, lambda / CHAOS_LAMBDA_MAX));
  const stops: [number, [number, number, number]][] = [
    [0, [18, 30, 90]], [0.5, [90, 200, 130]], [0.78, [240, 210, 90]], [1, [240, 70, 50]],
  ];
  for (let i = 1; i < stops.length; i++) {
    if (x <= stops[i][0]) {
      const [x0, c0] = stops[i - 1], [x1, c1] = stops[i];
      const f = (x - x0) / (x1 - x0 || 1);
      return [c0[0] + (c1[0] - c0[0]) * f, c0[1] + (c1[1] - c0[1]) * f, c0[2] + (c1[2] - c0[2]) * f];
    }
  }
  return stops[stops.length - 1][1];
}

interface Ctx {
  cfg: EnsembleConfig; bc: BasinConfig;
  preset: ReturnType<typeof getPreset>;
  targetMass: number; Mtot: number;
}

export function basinContext(cfg: EnsembleConfig, bc: BasinConfig): Ctx {
  const preset = getPreset(cfg.presetId);
  const refStars = buildStars(preset, cfg.massMul);
  return {
    cfg, bc, preset,
    targetMass: orbitFrame(refStars, cfg.target).mass,
    Mtot: refStars.reduce((m, s) => m + s.mass, 0),
  };
}

function makePlanet(ctx: Ctx, stars: Star[], ax: number, by: number): Planet {
  const { bc, cfg, targetMass, Mtot } = ctx;
  if (bc.mode === 'pos') {
    if (bc.posRule === 'rest') return { x: ax, y: by, vx: 0, vy: 0, ax: 0, ay: 0 };
    const r = Math.hypot(ax, by) || 1e-6;
    const v = bc.posSpeedFrac * Math.sqrt(Mtot / r);
    return { x: ax, y: by, vx: v * (-by / r), vy: v * (ax / r), ax: 0, ay: 0 };
  }
  if (bc.mode === 'radspeed') {
    const v = by * Math.sqrt(targetMass / Math.max(0.05, ax));
    return launchPlanet(stars, cfg.target, ax, v, bc.fixedAngle * DEG, bc.fixedRetro);
  }
  const v = by * Math.sqrt(targetMass / Math.max(0.05, bc.fixedRadius));
  return launchPlanet(stars, cfg.target, bc.fixedRadius, v, ax * DEG, bc.fixedRetro);
}

/** Compute one pixel: averaged RGB over S² subsamples, plus the centre
 *  subsample's outcome code and resolution time (for hover + box-counting). */
export function computeBasinPixel(ctx: Ctx, p: number): { r: number; g: number; b: number; out: number; t: number } {
  const { cfg, bc, preset } = ctx;
  const N = bc.res, S = bc.samples;
  const { a0, a1, b0, b1 } = bc.domain;
  const i = p % N, j = Math.floor(p / N);
  const chaos = bc.metric === 'chaos';
  let cr = 0, cg = 0, cb = 0, centerOut = 0, centerT = 0;
  for (let sj = 0; sj < S; sj++) for (let si = 0; si < S; si++) {
    const ax = a0 + (a1 - a0) * ((i + (si + 0.5) / S) / N);
    const by = b1 - (b1 - b0) * ((j + (sj + 0.5) / S) / N);
    const stars = buildStars(preset, cfg.massMul);
    const planet = makePlanet(ctx, stars, ax, by);
    if (chaos) {
      const { lambda } = runPlanetLyap(cfg, stars, planet);
      const [r, g, b] = chaosColor(lambda);
      cr += r; cg += g; cb += b;
      // out: chaotic(1)/regular(0) for box-counting; t: λ for hover.
      if (si === 0 && sj === 0) { centerOut = lambda > 0.05 ? 1 : 0; centerT = lambda; }
    } else {
      const res = runPlanet(cfg, stars, planet);
      const base = OUTCOME_RGB[res.outcome];
      const tb = 0.28 + 0.72 * Math.min(1, res.tSim / cfg.tMax);
      cr += base[0] * tb; cg += base[1] * tb; cb += base[2] * tb;
      if (si === 0 && sj === 0) { centerOut = OUTCOME_CODE.indexOf(res.outcome); centerT = res.tSim; }
    }
  }
  const sub = S * S;
  return { r: cr / sub, g: cg / sub, b: cb / sub, out: centerOut, t: centerT };
}

export interface BasinBlock { rgb: Uint8Array; out: Uint8Array; t: Float32Array; }

export function computeBasinRange(cfg: EnsembleConfig, bc: BasinConfig, start: number, count: number): BasinBlock {
  const ctx = basinContext(cfg, bc);
  const rgb = new Uint8Array(count * 3);
  const out = new Uint8Array(count);
  const t = new Float32Array(count);
  for (let k = 0; k < count; k++) {
    const px = computeBasinPixel(ctx, start + k);
    rgb[k * 3] = px.r; rgb[k * 3 + 1] = px.g; rgb[k * 3 + 2] = px.b;
    out[k] = px.out; t[k] = px.t;
  }
  return { rgb, out, t };
}

/** The exact planet initial condition at an (ax, by) point of the chosen plane —
 *  used to hand a clicked basin pixel to the single-run Observatory. */
export function basinPlanetAt(cfg: EnsembleConfig, bc: BasinConfig, ax: number, by: number): Planet {
  const ctx = basinContext(cfg, bc);
  const stars = buildStars(getPreset(cfg.presetId), cfg.massMul);
  return makePlanet(ctx, stars, ax, by);
}
