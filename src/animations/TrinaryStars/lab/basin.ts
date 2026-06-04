/** Pure basin-map computation, shared by the main thread and basin workers.
 *  One pixel = one exact, deterministic world integrated to its fate. */

import { getScenario, buildStars, launchPlanet, orbitFrame, type Planet, type Star, type Outcome } from '@/lib/nbody';
import { runPlanet, runPlanetLyap, runBatchFate, runBatchLyap } from './runner';
import { mulberry32, type EnsembleConfig, type RunParams } from './rng';

const DEG = Math.PI / 180;

export type BasinMode = 'pos' | 'radspeed' | 'anglespeed';
export type BasinMetric = 'fate' | 'chaos';
/** How a pixel is evaluated: one exact world, or a mini-ensemble of worlds that
 *  randomises the launch dimensions the plane does *not* pin to its axes. */
export type BasinLens = 'exact' | 'stat';
/** Which outcome fraction the statistical lens paints. */
export type StatMetric = 'happy' | 'hab' | 'destroyed' | 'survived';
export interface Domain { a0: number; a1: number; b0: number; b1: number; }
export interface BasinConfig {
  mode: BasinMode;
  metric: BasinMetric;      // colour by outcome, or by Lyapunov exponent
  lens: BasinLens;          // exact world per pixel, or per-pixel mini-ensemble
  statRuns: number;         // worlds averaged per pixel when lens === 'stat'
  statMetric: StatMetric;   // outcome fraction painted when lens === 'stat'
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
/** Generic stop-interpolated ramp on x ∈ [0,1]. */
function ramp(stops: [number, [number, number, number]][], x: number): [number, number, number] {
  x = Math.min(1, Math.max(0, x));
  for (let i = 1; i < stops.length; i++) {
    if (x <= stops[i][0]) {
      const [x0, c0] = stops[i - 1], [x1, c1] = stops[i];
      const f = (x - x0) / (x1 - x0 || 1);
      return [c0[0] + (c1[0] - c0[0]) * f, c0[1] + (c1[1] - c0[1]) * f, c0[2] + (c1[2] - c0[2]) * f];
    }
  }
  return stops[stops.length - 1][1];
}
const CHAOS_STOPS: [number, [number, number, number]][] = [
  [0, [18, 30, 90]], [0.5, [90, 200, 130]], [0.78, [240, 210, 90]], [1, [240, 70, 50]],
];
/** Lyapunov colour ramp on a normalised x ∈ [0,1] — used directly when the map
 *  auto-fits its colour range to the data. */
export function chaosRamp(x: number): [number, number, number] { return ramp(CHAOS_STOPS, x); }
export function chaosColor(lambda: number): [number, number, number] { return chaosRamp(lambda / CHAOS_LAMBDA_MAX); }

export const STAT_LABEL: Record<StatMetric, string> = {
  happy: 'happy %', hab: 'mean habitable', destroyed: 'destroyed %', survived: 'survived %',
};

/** Magma-style ramp for the statistical lens. Crucially, 0 maps to a *visible*
 *  deep indigo — not the near-black panel background (10,14,22) — so a map of a
 *  rare outcome (e.g. happy endings) reads as structure rather than a blank
 *  square. The mild gamma lifts small fractions into the visible part of the
 *  ramp; the metric only sets the legend, not the hue. */
const MAGMA: [number, [number, number, number]][] = [
  [0.0, [24, 16, 58]], [0.25, [92, 30, 116]], [0.5, [186, 54, 98]], [0.75, [242, 124, 62]], [1.0, [252, 236, 162]],
];
/** Magma ramp on a normalised x ∈ [0,1] — used directly when the map auto-fits. */
export function statRamp(x: number): [number, number, number] { return ramp(MAGMA, x); }
/** Absolute stat colour: a mild gamma lifts small fractions into the visible part
 *  of the ramp (the metric only sets the legend, not the hue). */
export function statColor(_metric: StatMetric, v: number): [number, number, number] {
  return statRamp(Math.pow(Math.min(1, Math.max(0, v)), 0.6));
}

interface Ctx {
  cfg: EnsembleConfig; bc: BasinConfig;
  preset: ReturnType<typeof getScenario>;
  targetMass: number; Mtot: number;
}

/** Mass governing circular speed for the orbit target, and the total system
 *  mass (governs the position plane's tangential launches). Shared by the CPU
 *  context and the map's GPU path, which builds launch params on the main
 *  thread before dispatching. */
export function basinTargets(cfg: EnsembleConfig): { targetMass: number; Mtot: number } {
  const refStars = buildStars(getScenario(cfg.presetId), cfg.massMul);
  return {
    targetMass: orbitFrame(refStars, cfg.target).mass,
    Mtot: refStars.reduce((m, s) => m + s.mass, 0),
  };
}

export function basinContext(cfg: EnsembleConfig, bc: BasinConfig): Ctx {
  const preset = getScenario(cfg.presetId);
  const { targetMass, Mtot } = basinTargets(cfg);
  return { cfg, bc, preset, targetMass, Mtot };
}

/** The (ax, by) plane coordinate at the centre of pixel (i, j). */
export function basinAxByCenter(bc: BasinConfig, i: number, j: number): [number, number] {
  const { a0, a1, b0, b1 } = bc.domain, N = bc.res;
  return [a0 + (a1 - a0) * ((i + 0.5) / N), b1 - (b1 - b0) * ((j + 0.5) / N)];
}

/** Launch params (radius/speed/angle/retro) for an exact pixel, in the
 *  radius×speed and angle×speed planes — these match the CPU `makePlanet`
 *  exactly, so the GPU runner reproduces the same worlds. Returns null for the
 *  position plane (its ICs aren't a radius/speed/angle launch). */
export function exactRunParams(cfg: EnsembleConfig, bc: BasinConfig, targetMass: number, i: number, j: number): RunParams | null {
  const [ax, by] = basinAxByCenter(bc, i, j);
  if (bc.mode === 'radspeed') {
    return { radius: ax, speed: by * Math.sqrt(targetMass / Math.max(0.05, ax)), angleDeg: bc.fixedAngle, retro: bc.fixedRetro, seed: 0 };
  }
  if (bc.mode === 'anglespeed') {
    return { radius: bc.fixedRadius, speed: by * Math.sqrt(targetMass / Math.max(0.05, bc.fixedRadius)), angleDeg: ax, retro: bc.fixedRetro, seed: 0 };
  }
  return null;
}

/** Launch params for one statistical-lens sample (complementary dims drawn from
 *  `rng`), matching `makeStatPlanet`. Returns null for the position plane. */
export function statRunParams(cfg: EnsembleConfig, bc: BasinConfig, targetMass: number, i: number, j: number, rng: () => number): RunParams | null {
  const [ax, by] = basinAxByCenter(bc, i, j);
  const retro = cfg.allowRetro ? rng() < 0.5 : false;
  if (bc.mode === 'radspeed') {
    return { radius: ax, speed: by * Math.sqrt(targetMass / Math.max(0.05, ax)), angleDeg: 360 * rng(), retro, seed: 0 };
  }
  if (bc.mode === 'anglespeed') {
    const radius = cfg.rMin + (cfg.rMax - cfg.rMin) * rng();
    return { radius, speed: by * Math.sqrt(targetMass / Math.max(0.05, radius)), angleDeg: ax, retro, seed: 0 };
  }
  return null;
}

/** Seed for a pixel's statistical mini-ensemble — identical on the CPU and GPU
 *  paths so the two agree pixel-for-pixel. */
export function statPixelSeed(cfg: EnsembleConfig, p: number): number {
  return (cfg.baseSeed ^ Math.imul(p + 1, 0x9e3779b9)) >>> 0;
}

/** Raw planet IC for an exact position-plane pixel (mirrors `makePlanet`'s pos
 *  branch). The position plane's worlds are starting *places*, not radius/speed/
 *  angle launches, so the GPU path uploads these states directly. */
export function exactPosPlanet(cfg: EnsembleConfig, bc: BasinConfig, Mtot: number, i: number, j: number): Planet {
  const [ax, by] = basinAxByCenter(bc, i, j);
  return bc.posRule === 'rest' ? posRestIC(ax, by) : posTangentialIC(Mtot, ax, by, bc.posSpeedFrac, false);
}

/** Raw planet IC for one statistical-lens sample on the position plane (mirrors
 *  `makeStatPlanet`'s pos branch, including the retro-then-speed draw order). */
export function statPosPlanet(cfg: EnsembleConfig, bc: BasinConfig, Mtot: number, i: number, j: number, rng: () => number): Planet {
  const [ax, by] = basinAxByCenter(bc, i, j);
  const retro = cfg.allowRetro ? rng() < 0.5 : false;
  const f = cfg.fMin + (cfg.fMax - cfg.fMin) * rng();
  return posTangentialIC(Mtot, ax, by, f, retro);
}

/** Position-plane initial conditions. A planet placed at (ax, by) either at rest
 *  or launched tangentially (perpendicular to its radius from the origin) at
 *  `speedFrac` × the local circular speed √(Mtot/r); `retro` flips the sense.
 *  Shared by the CPU pixel and the map's GPU raw-IC path so the two agree. */
export function posRestIC(ax: number, by: number): Planet {
  return { x: ax, y: by, vx: 0, vy: 0, ax: 0, ay: 0 };
}
export function posTangentialIC(Mtot: number, ax: number, by: number, speedFrac: number, retro: boolean): Planet {
  const r = Math.hypot(ax, by) || 1e-6;
  const v = speedFrac * Math.sqrt(Mtot / r) * (retro ? -1 : 1);
  return { x: ax, y: by, vx: v * (-by / r), vy: v * (ax / r), ax: 0, ay: 0 };
}

function makePlanet(ctx: Ctx, stars: Star[], ax: number, by: number): Planet {
  const { bc, cfg, targetMass, Mtot } = ctx;
  if (bc.mode === 'pos') {
    return bc.posRule === 'rest' ? posRestIC(ax, by) : posTangentialIC(Mtot, ax, by, bc.posSpeedFrac, false);
  }
  if (bc.mode === 'radspeed') {
    const v = by * Math.sqrt(targetMass / Math.max(0.05, ax));
    return launchPlanet(stars, cfg.target, ax, v, bc.fixedAngle * DEG, bc.fixedRetro);
  }
  const v = by * Math.sqrt(targetMass / Math.max(0.05, bc.fixedRadius));
  return launchPlanet(stars, cfg.target, bc.fixedRadius, v, ax * DEG, bc.fixedRetro);
}

/** A statistical-lens world: the axes pin two launch dimensions, and `rng`
 *  samples the remaining (complementary) ones — angle/direction in the
 *  radius×speed plane, speed/direction in the position plane, radius/direction
 *  in the angle×speed plane — so a pixel summarises a neighbourhood of worlds. */
function makeStatPlanet(ctx: Ctx, stars: Star[], ax: number, by: number, rng: () => number): Planet {
  const { bc, cfg, targetMass, Mtot } = ctx;
  const retro = cfg.allowRetro ? rng() < 0.5 : false;
  if (bc.mode === 'pos') {
    const f = cfg.fMin + (cfg.fMax - cfg.fMin) * rng();
    return posTangentialIC(Mtot, ax, by, f, retro);
  }
  if (bc.mode === 'radspeed') {
    const v = by * Math.sqrt(targetMass / Math.max(0.05, ax));
    return launchPlanet(stars, cfg.target, ax, v, 360 * rng() * DEG, retro);
  }
  const radius = cfg.rMin + (cfg.rMax - cfg.rMin) * rng();
  const v = by * Math.sqrt(targetMass / Math.max(0.05, radius));
  return launchPlanet(stars, cfg.target, radius, v, ax * DEG, retro);
}

/** A computed pixel: display colour, the centre world's outcome code + time
 *  (hover/box-counting), and — for the statistical lens — all four outcome
 *  fractions, kept so the map can recolour between them without recomputing. */
export interface BasinPixel {
  r: number; g: number; b: number; out: number; t: number;
  stat: [number, number, number, number]; // happy, hab, destroyed, survived
}

export const STAT_ORDER: StatMetric[] = ['happy', 'hab', 'destroyed', 'survived'];

/** Compute one statistical pixel: average `statRuns` worlds (complementary
 *  launch dims randomised from a per-pixel seeded stream) into the four outcome
 *  fractions; colour by the chosen one (the other three ride along for recolour). */
function computeStatPixel(ctx: Ctx, p: number): BasinPixel {
  const { cfg, bc, preset } = ctx;
  const N = bc.res;
  const { a0, a1, b0, b1 } = bc.domain;
  const i = p % N, j = Math.floor(p / N);
  const ax = a0 + (a1 - a0) * ((i + 0.5) / N);
  const by = b1 - (b1 - b0) * ((j + 0.5) / N);
  const K = Math.max(1, Math.round(bc.statRuns));
  const rng = mulberry32(statPixelSeed(cfg, p));
  let happy = 0, destroyed = 0, survived = 0, habSum = 0;
  for (let k = 0; k < K; k++) {
    const stars = buildStars(preset, cfg.massMul);
    const r = runPlanet(cfg, stars, makeStatPlanet(ctx, stars, ax, by, rng));
    if (r.outcome === 'happy') happy++;
    else if (r.outcome === 'planet-destroyed') destroyed++;
    else if (r.outcome === 'survived') survived++;
    habSum += r.habitableFraction;
  }
  const stat: [number, number, number, number] = [happy / K, habSum / K, destroyed / K, survived / K];
  const v = stat[STAT_ORDER.indexOf(bc.statMetric)];
  const [r, g, b] = statColor(bc.statMetric, v);
  return { r, g, b, out: 0, t: v, stat };
}

const NO_STAT: [number, number, number, number] = [0, 0, 0, 0];

/** Compute one pixel: averaged RGB over S² subsamples, plus the centre
 *  subsample's outcome code and resolution time (for hover + box-counting). */
export function computeBasinPixel(ctx: Ctx, p: number): BasinPixel {
  const { cfg, bc, preset } = ctx;
  if (bc.lens === 'stat') return computeStatPixel(ctx, p);
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
  return { r: cr / sub, g: cg / sub, b: cb / sub, out: centerOut, t: centerT, stat: NO_STAT };
}

export interface BasinBlock { rgb: Uint8Array; out: Uint8Array; t: Float32Array; stat: Float32Array; }

/** Cap on planets integrated together in one shared star integration, to bound
 *  per-batch Analyzer memory. The star work is shared within each chunk; a job is
 *  only a few hundred pixels, so this rarely splits except for big stat runs. */
const MAX_BATCH = 4096;

/** Run a flat list of planet ICs against the shared star field in memory-bounded
 *  chunks (each chunk gets its own fresh, identically-built stars, since `step`
 *  integrates the stars in place). Bit-identical to running each planet alone. */
function runFateBatched(cfg: EnsembleConfig, preset: ReturnType<typeof getScenario>, planets: Planet[]) {
  const res: ReturnType<typeof runBatchFate> = [];
  for (let off = 0; off < planets.length; off += MAX_BATCH) {
    const chunk = planets.slice(off, off + MAX_BATCH);
    const part = runBatchFate(cfg, buildStars(preset, cfg.massMul), chunk);
    for (const r of part) res.push(r);
  }
  return res;
}
function runLyapBatched(cfg: EnsembleConfig, preset: ReturnType<typeof getScenario>, planets: Planet[]) {
  const res: ReturnType<typeof runBatchLyap> = [];
  for (let off = 0; off < planets.length; off += MAX_BATCH) {
    const chunk = planets.slice(off, off + MAX_BATCH);
    const part = runBatchLyap(cfg, buildStars(preset, cfg.massMul), chunk);
    for (const r of part) res.push(r);
  }
  return res;
}

/** Compute a contiguous pixel range. Within the range, every world shares the
 *  *same* star field (the planet is a test mass), so we integrate the stars once
 *  per batch and step all the worlds alongside them — bit-identical to the
 *  per-pixel path (`computeBasinPixel`), but far faster because the dominant star
 *  work is amortised over the whole block instead of repeated per pixel. */
export function computeBasinRange(cfg: EnsembleConfig, bc: BasinConfig, start: number, count: number): BasinBlock {
  const ctx = basinContext(cfg, bc);
  const { preset } = ctx;
  const rgb = new Uint8Array(count * 3);
  const out = new Uint8Array(count);
  const t = new Float32Array(count);
  const stat = new Float32Array(count * 4);
  const N = bc.res;
  const { a0, a1, b0, b1 } = bc.domain;
  const icStars = buildStars(preset, cfg.massMul); // initial stars for building launch ICs

  if (bc.lens === 'stat') {
    const K = Math.max(1, Math.round(bc.statRuns));
    const planets: Planet[] = [];
    for (let k = 0; k < count; k++) {
      const p = start + k, i = p % N, j = Math.floor(p / N);
      const ax = a0 + (a1 - a0) * ((i + 0.5) / N);
      const by = b1 - (b1 - b0) * ((j + 0.5) / N);
      const rng = mulberry32(statPixelSeed(cfg, p));
      for (let r = 0; r < K; r++) planets.push(makeStatPlanet(ctx, icStars, ax, by, rng));
    }
    const results = runFateBatched(cfg, preset, planets);
    for (let k = 0; k < count; k++) {
      let happy = 0, destroyed = 0, survived = 0, habSum = 0;
      for (let r = 0; r < K; r++) {
        const res = results[k * K + r];
        if (res.outcome === 'happy') happy++;
        else if (res.outcome === 'planet-destroyed') destroyed++;
        else if (res.outcome === 'survived') survived++;
        habSum += res.habitableFraction;
      }
      const sv: [number, number, number, number] = [happy / K, habSum / K, destroyed / K, survived / K];
      const v = sv[STAT_ORDER.indexOf(bc.statMetric)];
      const [r, g, b] = statColor(bc.statMetric, v);
      rgb[k * 3] = r; rgb[k * 3 + 1] = g; rgb[k * 3 + 2] = b; out[k] = 0; t[k] = v;
      stat[k * 4] = sv[0]; stat[k * 4 + 1] = sv[1]; stat[k * 4 + 2] = sv[2]; stat[k * 4 + 3] = sv[3];
    }
    return { rgb, out, t, stat };
  }

  // Exact lens (fate or chaos): S² subsamples per pixel, all sharing the stars.
  const S = bc.samples, sub = S * S, chaos = bc.metric === 'chaos';
  const planets: Planet[] = [];
  for (let k = 0; k < count; k++) {
    const p = start + k, i = p % N, j = Math.floor(p / N);
    for (let sj = 0; sj < S; sj++) for (let si = 0; si < S; si++) {
      const ax = a0 + (a1 - a0) * ((i + (si + 0.5) / S) / N);
      const by = b1 - (b1 - b0) * ((j + (sj + 0.5) / S) / N);
      planets.push(makePlanet(ctx, icStars, ax, by));
    }
  }
  if (chaos) {
    const results = runLyapBatched(cfg, preset, planets);
    for (let k = 0; k < count; k++) {
      let cr = 0, cg = 0, cb = 0;
      for (let m = 0; m < sub; m++) {
        const { lambda } = results[k * sub + m];
        const [r, g, b] = chaosColor(lambda);
        cr += r; cg += g; cb += b;
        if (m === 0) { out[k] = lambda > 0.05 ? 1 : 0; t[k] = lambda; }
      }
      rgb[k * 3] = cr / sub; rgb[k * 3 + 1] = cg / sub; rgb[k * 3 + 2] = cb / sub;
    }
  } else {
    const results = runFateBatched(cfg, preset, planets);
    for (let k = 0; k < count; k++) {
      let cr = 0, cg = 0, cb = 0;
      for (let m = 0; m < sub; m++) {
        const res = results[k * sub + m];
        const base = OUTCOME_RGB[res.outcome];
        const tb = 0.28 + 0.72 * Math.min(1, res.tSim / cfg.tMax);
        cr += base[0] * tb; cg += base[1] * tb; cb += base[2] * tb;
        if (m === 0) { out[k] = OUTCOME_CODE.indexOf(res.outcome); t[k] = res.tSim; }
      }
      rgb[k * 3] = cr / sub; rgb[k * 3 + 1] = cg / sub; rgb[k * 3 + 2] = cb / sub;
    }
  }
  return { rgb, out, t, stat };
}

/** The exact planet initial condition at an (ax, by) point of the chosen plane —
 *  used to hand a clicked basin pixel to the single-run Observatory. */
export function basinPlanetAt(cfg: EnsembleConfig, bc: BasinConfig, ax: number, by: number): Planet {
  const ctx = basinContext(cfg, bc);
  const stars = buildStars(getScenario(cfg.presetId), cfg.massMul);
  return makePlanet(ctx, stars, ax, by);
}
