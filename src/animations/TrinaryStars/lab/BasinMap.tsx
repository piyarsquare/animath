import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Slider, Pills } from '../../../components/ControlPanel';
import { starPaths } from './runner';

import {
  computeBasinRange, basinPlanetAt, CHAOS_LAMBDA_MAX, OUTCOME_RGB, OUTCOME_CODE,
  statColor, STAT_LABEL, STAT_ORDER, basinTargets, exactRunParams, statRunParams, statPixelSeed,
  exactPosPlanet, statPosPlanet,
  type BasinConfig, type BasinMode, type BasinMetric, type BasinLens, type StatMetric, type Domain, type FrameId,
} from './basin';
import { BasinPool } from './basinPool';
import { GpuRunner, gpuAvailable, type PlanetIC } from './gpu';
import { mulberry32, type EnsembleConfig, type RunParams } from './rng';
import { useThemeId } from '../../../chrome/skins';
import { useThemeTokens } from '../../../chrome/useThemeTokens';
import { sampleContinuous, themeMapsFor, hexToRgb } from '../../../lib/colormapRegistry';
import type { Outcome } from '@/lib/nbody';

/** Outcomes ordered by *goodness* for the divergent fate map (blowup = a
 *  numerical error, not an outcome → a neutral gray). Matches the Observatory
 *  timeline's success→danger reading: happy at the good pole, destroyed at the bad. */
const OUTCOME_GOODNESS: Record<Outcome, number> = {
  happy: 1, survived: 0.62, 'planet-ejected': 0.28, 'planet-destroyed': 0, blowup: -1,
};

/** Build the Destiny Map's themed ramps from the active theme (theming v2):
 *  fate → the theme's recommended DIVERGENT map sampled by goodness; chaos & stat
 *  → registry SEQUENTIAL maps. Returns numeric [r,g,b] tuples for ImageData. */
function buildRamps(themeId: string, dimHex: string) {
  const div = themeMapsFor('divergent', themeId)[0] ?? 'rdbu';
  const flip = div === 'coolwarm'; // coolwarm runs cool→warm; flip so good=cool
  const seqStat = themeMapsFor('sequential', themeId)[0] ?? 'viridis';
  const seqChaos = themeMapsFor('sequential', themeId)[1] ?? seqStat;
  const gray = hexToRgb(dimHex || '#808080');
  const outcomeRgb = {} as Record<Outcome, [number, number, number]>;
  for (const o of OUTCOME_CODE) {
    const g = OUTCOME_GOODNESS[o];
    outcomeRgb[o] = g < 0 ? gray : hexToRgb(sampleContinuous(div, flip ? 1 - g : g));
  }
  const clamp = (x: number) => Math.min(1, Math.max(0, x));
  return {
    outcomeRgb,
    stat: (x: number) => hexToRgb(sampleContinuous(seqStat, clamp(x))),
    chaos: (x: number) => hexToRgb(sampleContinuous(seqChaos, clamp(x))),
  };
}

/** The map's GPU lane covers every plane colored by fate (exact) or by the
 *  statistical lens — the position plane uploads raw ICs, the radius×speed and
 *  angle×speed planes use radius/speed/angle launches. Only the chaos/λ metric
 *  (a Lyapunov shadow the shader doesn't compute) stays on Workers/CPU. */
function gpuSupportsMap(metric: BasinMetric, lens: BasinLens): boolean {
  return lens === 'stat' || metric === 'fate';
}

export interface SamplingBox { rMin: number; rMax: number; fMin: number; fMax: number }
export interface BasinSystem {
  /** The ensemble's radius × speed sampling box — shared with the radspeed plane,
   *  so zooming the map re-aims the Census (and vice-versa). */
  box: SamplingBox; onBox: (b: SamplingBox) => void; onRunCensus: () => void;
}

const HAS_WORKERS = typeof Worker !== 'undefined';
const HAS_GPU = gpuAvailable();
type BasinEngine = 'gpu' | 'workers' | 'cpu';

const DEFAULT_DOMAIN: Record<BasinMode, Domain> = {
  pos: { a0: -4, a1: 4, b0: -4, b1: 4 },
  radspeed: { a0: 0.3, a1: 5, b0: 0.3, b1: 1.5 },
  anglespeed: { a0: 0, a1: 360, b0: 0.3, b1: 1.5 },
};
const AXIS_LABELS: Record<BasinMode, [string, string]> = {
  pos: ['start x', 'start y'], radspeed: ['radius', 'speed × circular'], anglespeed: ['angle (°)', 'speed × circular'],
};

interface DimResult { D: number; alpha: number; boundary: number; pts: [number, number][] }

function DimPlot({ dim, w = 104, h = 60 }: { dim: DimResult; w?: number; h?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const themeId = useThemeId();
  useEffect(() => {
    const cv = ref.current; const ctx = cv?.getContext('2d'); if (!cv || !ctx) return;
    const cs = getComputedStyle(cv);
    const tok = (n: string, f: string) => cs.getPropertyValue(n).trim() || f;
    const W = cv.width, H = cv.height, pad = 6;
    ctx.fillStyle = tok('--viz-bg', '#0a0e16'); ctx.fillRect(0, 0, W, H);
    const xs = dim.pts.map(p => p[0]), ys = dim.pts.map(p => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const X = (x: number) => pad + (W - 2 * pad) * (x1 === x0 ? 0.5 : (x - x0) / (x1 - x0));
    const Y = (y: number) => H - pad - (H - 2 * pad) * (y1 === y0 ? 0.5 : (y - y0) / (y1 - y0));
    // fitted line
    ctx.strokeStyle = tok('--accent', '#ffd400'); ctx.beginPath(); ctx.moveTo(X(x0), Y(y0)); ctx.lineTo(X(x1), Y(y1)); ctx.stroke();
    ctx.fillStyle = tok('--accent-2', '#66f0ff');
    for (const [x, y] of dim.pts) { ctx.beginPath(); ctx.arc(X(x), Y(y), 2.5, 0, 7); ctx.fill(); }
  }, [dim, themeId]);
  return <canvas ref={ref} width={w} height={h} style={{ width: w, height: h, borderRadius: 4, display: 'block', flex: 'none' }} />;
}

export interface BasinHandle { render: () => void; setPlane: (m: BasinMode) => void; }

const BasinMap = forwardRef<BasinHandle, { cfg: EnsembleConfig; system?: BasinSystem }>(function BasinMap({ cfg, system }, ref) {
  const [mode, setMode] = useState<BasinMode>('pos');
  const [res, setRes] = useState(128);
  const [samples, setSamples] = useState(1);
  const [metric, setMetric] = useState<BasinMetric>('fate');
  const [lens, setLens] = useState<BasinLens>('exact');
  const [statMetric, setStatMetric] = useState<StatMetric>('hab');
  const [statRuns, setStatRuns] = useState(6);
  const [domain, setDomain] = useState<Domain>(DEFAULT_DOMAIN.pos);
  const [posRule, setPosRule] = useState<'rest' | 'tangential'>('tangential');
  const [posSpeedFrac, setPosSpeedFrac] = useState(0.9);
  const [frame, setFrame] = useState<FrameId>('bary');
  // The frame the on-screen map was actually rendered in, so the star overlay
  // matches the pixels even before the live `frame` selection is re-rendered.
  const [renderedFrame, setRenderedFrame] = useState<FrameId>('bary');
  const [fixedAngle, setFixedAngle] = useState(0);
  const [fixedRadius, setFixedRadius] = useState(2);
  const [fixedRetro, setFixedRetro] = useState(false);
  const [engine, setEngine] = useState<BasinEngine>(HAS_GPU ? 'gpu' : HAS_WORKERS ? 'workers' : 'cpu');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [hover, setHover] = useState('');
  const [dim, setDim] = useState<DimResult | null>(null);
  const [showStars, setShowStars] = useState(true);
  // Continuous maps (chaos λ, statistical fractions) can stretch their color
  // ramp to the data on screen, re-fit on every render/zoom, to expose structure.
  const [autoFit, setAutoFit] = useState(true);
  const [colorRange, setColorRange] = useState<[number, number] | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const rafRef = useRef(0);
  const runIdRef = useRef(0);
  const poolRef = useRef<BasinPool | null>(null);
  const gpuRef = useRef<GpuRunner | null>(null);
  const outGridRef = useRef<Uint8Array>(new Uint8Array(0));
  const tGridRef = useRef<Float32Array>(new Float32Array(0));
  // Per-pixel [happy, hab, destroyed, survived] fractions for the statistical
  // lens, kept so "Show" can recolor the map without recomputing.
  const statGridRef = useRef<Float32Array>(new Float32Array(0));
  const statReadyRef = useRef(false);
  // Resolution currently on the canvas — varies during a progressive render, so
  // hover/click/recolor index the grids by this, not the target `res` state.
  const paintedResRef = useRef(128);
  const autoFitRef = useRef(autoFit); autoFitRef.current = autoFit;
  const statMetricRef = useRef(statMetric); statMetricRef.current = statMetric;
  // Identifies what the value grids currently hold, so an idle recolor only
  // runs when it matches the view: `${res}|${stat | metric}`.
  const gridKeyRef = useRef('');
  const currentGridKey = () => `${paintedResRef.current}|${stateRef.current.lens === 'stat' ? 'stat' : stateRef.current.metric}`;

  const cfgRef = useRef(cfg); cfgRef.current = cfg;
  const boxRef = useRef(system?.box); boxRef.current = system?.box;
  const st = { mode, metric, lens, statMetric, statRuns, domain, res, samples, posRule, posSpeedFrac, fixedAngle, fixedRadius, fixedRetro, frame, engine };
  const stateRef = useRef(st); stateRef.current = st;

  // Theming v2: the map's colors track the theme. The fate map uses the theme's
  // divergent map; chaos/stat use sequential maps; the star overlay uses the same
  // spread --data slots as the Observatory scene (1·4·6). All recoloring happens
  // on the main thread from the stored value grids (workers/GPU only compute), so
  // a skin switch recolors without resimulating.
  const themeId = useThemeId();
  const tk = useThemeTokens(['dim', 'data-1', 'data-4', 'data-6', 'viz-bg', 'accent', 'accent-2']);
  const ramps = useMemo(() => buildRamps(themeId, tk.dim), [themeId, tk.dim]);
  const rampsRef = useRef(ramps); rampsRef.current = ramps;
  const starRgb = useMemo(
    () => [tk['data-1'], tk['data-4'], tk['data-6']].map(h => hexToRgb(h || '#888').join(',')),
    [tk],
  );
  // Holds the latest applyColor so the theme-change effect can recolor without a
  // stale closure (applyColor is redefined each render).
  const applyColorRef = useRef<(() => void) | null>(null);
  // Recolor the current map when the theme changes (no resimulation).
  useEffect(() => { applyColorRef.current?.(); }, [themeId, tk]);

  // The stars' trajectories are identical for every run (the planet is a test
  // mass), so integrate them once and reuse — only their inputs matter.
  const starTracks = useMemo(() => starPaths(cfg), [cfg.presetId, cfg.starSoft, cfg.tMax, cfg.massMul[0], cfg.massMul[1], cfg.massMul[2]]);

  // In the radius×speed plane the map shares the ensemble's sampling box, so
  // zooming the map re-aims the census (and vice-versa).
  const effDomain: Domain = (mode === 'radspeed' && system?.box)
    ? { a0: system.box.rMin, a1: system.box.rMax, b0: system.box.fMin, b1: system.box.fMax }
    : domain;
  const currentBc = (): BasinConfig => ({
    mode, metric, lens, statRuns, statMetric, domain: effDomain, res, samples, posRule, posSpeedFrac, fixedAngle, fixedRadius, fixedRetro, frame,
  });
  const goObservatory = (i: number, j: number) => {
    const d = effDomain, pr = paintedResRef.current;
    const ax = d.a0 + (d.a1 - d.a0) * ((i + 0.5) / pr);
    const by = d.b1 - (d.b1 - d.b0) * ((j + 0.5) / pr);
    const planet = basinPlanetAt(cfg, currentBc(), ax, by);
    const q = new URLSearchParams({
      p: cfg.presetId, tg: cfg.target,
      m0: String(cfg.massMul[0]), m1: String(cfg.massMul[1]), m2: String(cfg.massMul[2]), ss: String(cfg.starSoft),
      px: planet.x.toFixed(5), py: planet.y.toFixed(5), vx: planet.vx.toFixed(5), vy: planet.vy.toFixed(5),
    });
    // Open the run in a new tab so the Lab — and the map you just computed —
    // stays put. Don't pass the 'noopener' feature: it makes window.open return
    // null even on success, which previously tripped the fallback and advanced
    // *this* tab too. Instead clear `opener` by hand, and fall back to in-place
    // navigation only when the window genuinely didn't open (popup blocked).
    const url = `${window.location.origin}${window.location.pathname}#/trinary?${q.toString()}`;
    const win = window.open(url, '_blank');
    if (win) win.opener = null;
    else window.location.hash = `#/trinary?${q.toString()}`;
  };

  const measureDimension = () => {
    // Box-counting the boundary applies to the exact fate map (outcome regions)
    // and the chaos map (the regular/chaotic frontier) — both store a categorical
    // `out` grid. The statistical lens is smooth, so skip it there.
    if (stateRef.current.lens !== 'exact') return;
    const N = paintedResRef.current;
    const out = outGridRef.current;
    if (out.length !== N * N) return;
    const sizes: number[] = [];
    for (let s = 1; s <= Math.min(32, N >> 2); s *= 2) sizes.push(s);
    const pts: [number, number][] = [];
    for (const s of sizes) {
      let boxes = 0;
      for (let by = 0; by < N; by += s) for (let bx = 0; bx < N; bx += s) {
        let first = -1, mixed = false;
        for (let j = by; j < Math.min(by + s, N) && !mixed; j++) {
          for (let i = bx; i < Math.min(bx + s, N); i++) {
            const o = out[j * N + i];
            if (first < 0) first = o; else if (o !== first) { mixed = true; break; }
          }
        }
        if (mixed) boxes++;
      }
      if (boxes > 0) pts.push([Math.log(1 / s), Math.log(boxes)]);
    }
    const nn = pts.length;
    let sx = 0, sy = 0, sxx = 0, sxy = 0;
    for (const [x, y] of pts) { sx += x; sy += y; sxx += x * x; sxy += x * y; }
    const D = nn > 1 ? (nn * sxy - sx * sy) / (nn * sxx - sx * sx) : 0;
    let bd = 0, pr = 0;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const c = out[j * N + i];
      if (i + 1 < N) { pr++; if (out[j * N + i + 1] !== c) bd++; }
      if (j + 1 < N) { pr++; if (out[(j + 1) * N + i] !== c) bd++; }
    }
    setDim({ D, alpha: 2 - D, boundary: pr ? bd / pr : 0, pts });
  };

  const stop = () => { runIdRef.current++; cancelAnimationFrame(rafRef.current); poolRef.current?.dispose(); poolRef.current = null; setBusy(false); };

  /** Render the supported planes on the GPU: build each pixel's launch params on
   *  the main thread (so they match the CPU exactly), dispatch in batches, then
   *  paint outcomes (exact) or reduce the mini-ensemble into fractions (stat).
   *  Rejects on any GPU failure so the caller can fall back to Workers/CPU. */
  const renderGpu = async (
    runId: number, cfgNow: EnsembleConfig, bc: BasinConfig,
    paint: (start: number, rgb: Uint8Array, out: Uint8Array, tt: Float32Array, stat: Float32Array, cnt: number) => void,
    onProgress: () => void, onDone: () => void,
  ) => {
    const gpu = gpuRef.current ?? (gpuRef.current = await GpuRunner.create());
    const N = bc.res, total = N * N;
    const { targetMass, Mtot } = basinTargets(cfgNow);
    const isPos = bc.mode === 'pos';
    if (bc.lens === 'exact') {
      const CHUNK = 4096;
      for (let start = 0; start < total; start += CHUNK) {
        if (runId !== runIdRef.current) return;
        const count = Math.min(CHUNK, total - start);
        let res;
        if (isPos) {
          const ics: PlanetIC[] = new Array(count);
          for (let k = 0; k < count; k++) {
            const p = start + k;
            ics[k] = exactPosPlanet(cfgNow, bc, Mtot, p % N, Math.floor(p / N));
          }
          res = await gpu.runBatchIC(cfgNow, ics);
        } else {
          const params: RunParams[] = new Array(count);
          for (let k = 0; k < count; k++) {
            const p = start + k;
            params[k] = exactRunParams(cfgNow, bc, targetMass, p % N, Math.floor(p / N))!;
          }
          res = await gpu.runBatch(cfgNow, params);
        }
        if (runId !== runIdRef.current) return;
        const rgb = new Uint8Array(count * 3), out = new Uint8Array(count), tt = new Float32Array(count), stat = new Float32Array(count * 4);
        for (let k = 0; k < count; k++) {
          const r = res[k], base = OUTCOME_RGB[r.outcome], tb = 0.28 + 0.72 * Math.min(1, r.tSim / cfgNow.tMax);
          rgb[k * 3] = base[0] * tb; rgb[k * 3 + 1] = base[1] * tb; rgb[k * 3 + 2] = base[2] * tb;
          out[k] = OUTCOME_CODE.indexOf(r.outcome); tt[k] = r.tSim;
        }
        paint(start, rgb, out, tt, stat, count);
        onProgress();
      }
    } else {
      const K = Math.max(1, Math.round(bc.statRuns));
      const PIX_CHUNK = Math.max(32, Math.floor(4096 / K)); // ~4k worlds per dispatch
      for (let start = 0; start < total; start += PIX_CHUNK) {
        if (runId !== runIdRef.current) return;
        const count = Math.min(PIX_CHUNK, total - start);
        let res;
        if (isPos) {
          const ics: PlanetIC[] = new Array(count * K);
          for (let k = 0; k < count; k++) {
            const p = start + k, i = p % N, j = Math.floor(p / N);
            const rng = mulberry32(statPixelSeed(cfgNow, p));
            for (let q = 0; q < K; q++) ics[k * K + q] = statPosPlanet(cfgNow, bc, Mtot, i, j, rng);
          }
          res = await gpu.runBatchIC(cfgNow, ics);
        } else {
          const params: RunParams[] = new Array(count * K);
          for (let k = 0; k < count; k++) {
            const p = start + k, i = p % N, j = Math.floor(p / N);
            const rng = mulberry32(statPixelSeed(cfgNow, p));
            for (let q = 0; q < K; q++) params[k * K + q] = statRunParams(cfgNow, bc, targetMass, i, j, rng)!;
          }
          res = await gpu.runBatch(cfgNow, params);
        }
        if (runId !== runIdRef.current) return;
        const rgb = new Uint8Array(count * 3), out = new Uint8Array(count), tt = new Float32Array(count), stat = new Float32Array(count * 4);
        for (let k = 0; k < count; k++) {
          let happy = 0, dest = 0, surv = 0, habSum = 0;
          for (let q = 0; q < K; q++) {
            const r = res[k * K + q];
            if (r.outcome === 'happy') happy++;
            else if (r.outcome === 'planet-destroyed') dest++;
            else if (r.outcome === 'survived') surv++;
            habSum += r.habitableFraction;
          }
          const frac = [happy / K, habSum / K, dest / K, surv / K];
          stat[k * 4] = frac[0]; stat[k * 4 + 1] = frac[1]; stat[k * 4 + 2] = frac[2]; stat[k * 4 + 3] = frac[3];
          const v = frac[STAT_ORDER.indexOf(bc.statMetric)];
          const [cr, cg, cb] = statColor(bc.statMetric, v);
          rgb[k * 3] = cr; rgb[k * 3 + 1] = cg; rgb[k * 3 + 2] = cb;
          out[k] = 0; tt[k] = v;
        }
        paint(start, rgb, out, tt, stat, count);
        onProgress();
      }
    }
    onDone();
  };

  const render = () => {
    cancelAnimationFrame(rafRef.current);
    poolRef.current?.dispose(); poolRef.current = null;
    const runId = ++runIdRef.current;
    const cfgNow = cfgRef.current;
    const s = stateRef.current;
    const dom = (s.mode === 'radspeed' && boxRef.current)
      ? { a0: boxRef.current.rMin, a1: boxRef.current.rMax, b0: boxRef.current.fMin, b1: boxRef.current.fMax }
      : s.domain;
    const T = s.res;
    // Progressive: a quick coarse whole-map pass (or two) before the full one,
    // so structure appears almost immediately and then sharpens.
    const stages = Array.from(new Set([Math.min(T, 48), Math.min(T, 96), T])).sort((a, b) => a - b);
    statReadyRef.current = false;
    // Keep any previous dimension readout visible while the new map computes
    // (it's replaced when measureDimension finishes) so the panel doesn't reflow.
    setBusy(true); setProgress(0);

    const renderStage = (stageIdx: number, prev: { data: Uint8ClampedArray; res: number } | null) => {
      const N = stages[stageIdx];
      const isFinal = stageIdx === stages.length - 1;
      const bc: BasinConfig = {
        mode: s.mode, metric: s.metric, lens: s.lens, statRuns: s.statRuns, statMetric: s.statMetric,
        domain: dom, res: N, samples: s.samples,
        posRule: s.posRule, posSpeedFrac: s.posSpeedFrac, fixedAngle: s.fixedAngle, fixedRadius: s.fixedRadius, fixedRetro: s.fixedRetro, frame: s.frame,
      };
      const cv = canvasRef.current!; cv.width = N; cv.height = N;
      const ctx = cv.getContext('2d')!;
      const img = ctx.createImageData(N, N);
      // Seed this (finer) pass with the previous coarse result, upscaled nearest-
      // neighbor, so the map sharpens in place instead of rebuilding from blank —
      // each not-yet-computed pixel keeps showing its coarse color until the
      // finer value lands on top.
      if (prev) {
        const src = prev.data, M = prev.res, d = img.data;
        for (let y = 0; y < N; y++) {
          const sy = Math.min(M - 1, (y * M / N) | 0);
          for (let x = 0; x < N; x++) {
            const so = (sy * M + Math.min(M - 1, (x * M / N) | 0)) * 4, o = (y * N + x) * 4;
            d[o] = src[so]; d[o + 1] = src[so + 1]; d[o + 2] = src[so + 2]; d[o + 3] = 255;
          }
        }
        if (runId === runIdRef.current) ctx.putImageData(img, 0, 0);
      }
      const outGrid = new Uint8Array(N * N), tGrid = new Float32Array(N * N), statGrid = new Float32Array(N * N * 4);
      outGridRef.current = outGrid; tGridRef.current = tGrid; statGridRef.current = statGrid; paintedResRef.current = N;
      let painted = 0; const total = N * N;

      // Color from the themed ramps (ignoring the worker/GPU's own rgb), so every
      // engine and every progressive stage paints in theme colors from the start.
      const isStat = bc.lens === 'stat';
      const isChaos = bc.lens === 'exact' && bc.metric === 'chaos';
      const tMax = cfgNow.tMax;
      const paint = (start: number, _rgb: Uint8Array, out: Uint8Array, tt: Float32Array, stat: Float32Array, cnt: number) => {
        const R = rampsRef.current;
        const statIdx = STAT_ORDER.indexOf(statMetricRef.current);
        for (let k = 0; k < cnt; k++) {
          const p = start + k, o = p * 4;
          let cr: number, cg: number, cb: number;
          if (isStat) {
            [cr, cg, cb] = R.stat(Math.pow(Math.min(1, Math.max(0, stat[k * 4 + statIdx])), 0.6));
          } else if (isChaos) {
            [cr, cg, cb] = R.chaos(tt[k] / CHAOS_LAMBDA_MAX);
          } else {
            const base = R.outcomeRgb[OUTCOME_CODE[out[k]]] ?? [128, 128, 128];
            const tb = 0.28 + 0.72 * Math.min(1, tt[k] / tMax);
            cr = base[0] * tb; cg = base[1] * tb; cb = base[2] * tb;
          }
          img.data[o] = cr; img.data[o + 1] = cg; img.data[o + 2] = cb; img.data[o + 3] = 255;
          outGrid[p] = out[k]; tGrid[p] = tt[k];
          statGrid[p * 4] = stat[k * 4]; statGrid[p * 4 + 1] = stat[k * 4 + 1]; statGrid[p * 4 + 2] = stat[k * 4 + 2]; statGrid[p * 4 + 3] = stat[k * 4 + 3];
        }
        painted += cnt;
      };
      const flush = () => { if (runId === runIdRef.current) ctx.putImageData(img, 0, 0); };
      const tick = () => { flush(); setProgress(painted / total); };
      const stageDone = () => {
        if (runId !== runIdRef.current) return;
        flush();
        if (isFinal) {
          setBusy(false); statReadyRef.current = bc.lens === 'stat';
          gridKeyRef.current = `${N}|${bc.lens === 'stat' ? 'stat' : bc.metric}`;
          setRenderedFrame(bc.frame ?? 'bary');
          measureDimension(); applyColor();
        } else renderStage(stageIdx + 1, { data: img.data, res: N });
      };

      const viaWorkersOrCpu = (preferCpu: boolean) => {
        if (!preferCpu && HAS_WORKERS) {
          try {
            const size = Math.min(8, Math.max(2, (navigator.hardwareConcurrency || 4) - 1));
            const pool = new BasinPool(size,
              (b) => { if (runId !== runIdRef.current) return; paint(b.start, b.rgb, b.out, b.t, b.stat, b.count); tick(); },
              () => stageDone());
            poolRef.current = pool;
            pool.run(cfgNow, bc);
            return;
          } catch { /* fall through to CPU */ }
        }
        // Batch a row or so per frame: worlds in a block share the star field,
        // so the integration is amortised, while we still yield to keep painting.
        const blk = Math.max(N, 64);
        let p = 0;
        const chunk = () => {
          if (runId !== runIdRef.current) return;
          const t0 = performance.now();
          do {
            const cnt = Math.min(blk, total - p);
            const b = computeBasinRange(cfgNow, bc, p, cnt);
            paint(p, b.rgb, b.out, b.t, b.stat, cnt);
            p += cnt;
          } while (p < total && performance.now() - t0 < 24);
          flush(); setProgress(p / total);
          if (p < total) rafRef.current = requestAnimationFrame(chunk);
          else stageDone();
        };
        rafRef.current = requestAnimationFrame(chunk);
      };

      if (s.engine === 'gpu' && HAS_GPU && gpuSupportsMap(s.metric, s.lens)) {
        renderGpu(runId, cfgNow, bc, paint, tick, stageDone)
          .catch(() => { gpuRef.current = null; if (runId === runIdRef.current) viaWorkersOrCpu(false); });
        return;
      }
      viaWorkersOrCpu(s.engine === 'cpu');
    };

    renderStage(0, null);
  };

  /** Recolor an already-computed continuous map (chaos λ or a statistical
   *  fraction) from the stored per-pixel values — no resimulation. With auto-fit
   *  the ramp is stretched to the data's 2nd–98th percentile; otherwise it uses
   *  the absolute range (λ∈[0,λmax], fraction∈[0,1]). Fate maps are categorical,
   *  so they keep their inline coloring. */
  const applyColor = () => {
    const N = paintedResRef.current;
    const cv = canvasRef.current; const ctx = cv?.getContext('2d');
    if (!cv || !ctx) return;
    const s = stateRef.current;
    const R = rampsRef.current;
    const isStat = s.lens === 'stat';
    const isChaos = s.lens === 'exact' && s.metric === 'chaos';
    // Fate is categorical (no auto-fit range): recolor straight from the outcome
    // code + survival-time grids using the themed divergent palette.
    if (s.lens === 'exact' && s.metric === 'fate') {
      const out = outGridRef.current, tg = tGridRef.current;
      if (out.length !== N * N) return;
      const tMax = cfgRef.current.tMax;
      const img = ctx.createImageData(N, N);
      for (let p = 0; p < N * N; p++) {
        const base = R.outcomeRgb[OUTCOME_CODE[out[p]]] ?? [128, 128, 128];
        const tb = 0.28 + 0.72 * Math.min(1, tg[p] / tMax);
        const o = p * 4;
        img.data[o] = base[0] * tb; img.data[o + 1] = base[1] * tb; img.data[o + 2] = base[2] * tb; img.data[o + 3] = 255;
      }
      ctx.putImageData(img, 0, 0); setColorRange(null); return;
    }
    if (!isStat && !isChaos) { setColorRange(null); return; }
    const sg = statGridRef.current, tg = tGridRef.current;
    if (isStat && sg.length !== N * N * 4) return;
    if (isChaos && tg.length < N * N) return;
    const idx = isStat ? STAT_ORDER.indexOf(statMetricRef.current) : 0;
    const valAt = isStat ? (p: number) => sg[p * 4 + idx] : (p: number) => tg[p];
    const auto = autoFitRef.current;
    let lo = 0, hi = isStat ? 1 : CHAOS_LAMBDA_MAX;
    if (auto) {
      const arr = new Float64Array(N * N);
      for (let p = 0; p < N * N; p++) arr[p] = valAt(p);
      arr.sort();
      lo = arr[Math.floor(0.02 * (arr.length - 1))];
      hi = arr[Math.floor(0.98 * (arr.length - 1))];
      if (!(hi > lo)) { lo = arr[0]; hi = arr[arr.length - 1]; if (!(hi > lo)) hi = lo + 1e-9; }
    }
    const span = hi - lo || 1;
    const img = ctx.createImageData(N, N);
    for (let p = 0; p < N * N; p++) {
      const v = valAt(p);
      const x = auto ? (v - lo) / span : (isStat ? Math.pow(v, 0.6) : v / CHAOS_LAMBDA_MAX);
      const [r, g, b] = isStat ? R.stat(x) : R.chaos(x);
      const o = p * 4; img.data[o] = r; img.data[o + 1] = g; img.data[o + 2] = b; img.data[o + 3] = 255;
      if (isStat) tg[p] = v; // keep hover reading the shown metric
    }
    ctx.putImageData(img, 0, 0);
    setColorRange([lo, hi]);
  };
  applyColorRef.current = applyColor;

  // The radspeed plane derives its domain from the shared census box, so only
  // reset the internal domain for the other planes.
  useEffect(() => { if (mode !== 'radspeed') setDomain(DEFAULT_DOMAIN[mode]); }, [mode]);
  useEffect(() => () => { cancelAnimationFrame(rafRef.current); poolRef.current?.dispose(); gpuRef.current?.dispose(); }, []);

  // Overlay the stars' orbits on the position plane (where the axes are real x,y
  // space). A separate transparent canvas above the map, so the progressive map
  // repaint never erases it. Cleared on the other planes (their axes aren't x,y).
  useEffect(() => {
    const cv = starCanvasRef.current; const ctx = cv?.getContext('2d');
    if (!cv || !ctx) return;
    const W = cv.width, H = cv.height;
    ctx.clearRect(0, 0, W, H);
    if (mode !== 'pos' || !showStars) return;
    const d = effDomain;
    const X = (x: number) => ((x - d.a0) / (d.a1 - d.a0)) * W;
    const Y = (y: number) => ((d.b1 - y) / (d.b1 - d.b0)) * H;
    // In a star frame the paths are drawn relative to that star's own motion, so
    // it sits pinned at the origin and the others loop around it.
    const fIdx = renderedFrame === 's0' ? 0 : renderedFrame === 's1' ? 1 : renderedFrame === 's2' ? 2 : -1;
    const o = fIdx >= 0 ? starTracks[fIdx] : null;
    starTracks.forEach((path, k) => {
      if (path.length < 2) return;
      const ox = (i: number) => o ? path[i].x - o[Math.min(i, o.length - 1)].x : path[i].x;
      const oy = (i: number) => o ? path[i].y - o[Math.min(i, o.length - 1)].y : path[i].y;
      const rgb = starRgb[k % starRgb.length];
      ctx.strokeStyle = `rgba(${rgb},0.55)`; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(X(ox(0)), Y(oy(0)));
      for (let i = 1; i < path.length; i++) ctx.lineTo(X(ox(i)), Y(oy(i)));
      ctx.stroke();
      // start position marker
      ctx.fillStyle = `rgb(${rgb})`;
      ctx.beginPath(); ctx.arc(X(ox(0)), Y(oy(0)), 3.5, 0, 7); ctx.fill();
    });
    if (o) { // crosshair at the co-moving frame center
      ctx.strokeStyle = 'rgba(128,128,128,0.7)'; ctx.lineWidth = 1;
      const cx = X(0), cy = Y(0);
      ctx.beginPath(); ctx.moveTo(cx - 6, cy); ctx.lineTo(cx + 6, cy); ctx.moveTo(cx, cy - 6); ctx.lineTo(cx, cy + 6); ctx.stroke();
    }
  }, [starTracks, effDomain.a0, effDomain.a1, effDomain.b0, effDomain.b1, mode, showStars, renderedFrame, starRgb]);

  const switchMode = (m: BasinMode) => { stop(); setMode(m); };

  // Imperative handle so the lab's Simple-mode experiment buttons can drive it.
  useImperativeHandle(ref, () => ({
    render,
    setPlane: (m: BasinMode) => { stop(); setMode(m); setDomain(DEFAULT_DOMAIN[m]); window.setTimeout(() => render(), 60); },
  }), []);

  // --- Drag-to-zoom ---
  const onDown = (e: React.PointerEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    dragRef.current = { x0: e.clientX - r.left, y0: e.clientY - r.top, x1: e.clientX - r.left, y1: e.clientY - r.top };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const pr = paintedResRef.current;
    const i = Math.min(pr - 1, Math.max(0, Math.floor(((e.clientX - r.left) / r.width) * pr)));
    const j = Math.min(pr - 1, Math.max(0, Math.floor(((e.clientY - r.top) / r.height) * pr)));
    if (tGridRef.current.length) {
      const ax = effDomain.a0 + (effDomain.a1 - effDomain.a0) * ((i + 0.5) / pr);
      const by = effDomain.b1 - (effDomain.b1 - effDomain.b0) * ((j + 0.5) / pr);
      const [la, lb] = AXIS_LABELS[mode];
      const v = tGridRef.current[j * pr + i];
      const detail = lens === 'stat'
        ? `${STAT_LABEL[statMetric]} ${(v * 100).toFixed(0)}% (of ${statRuns} worlds)`
        : metric === 'chaos'
          ? `λ=${v.toFixed(3)} (${v > 0.05 ? 'chaotic' : 'regular'})`
          : `${OUTCOME_CODE[outGridRef.current[j * pr + i]]} @ t=${v.toFixed(0)}`;
      setHover(`${la}=${ax.toFixed(2)} · ${lb}=${by.toFixed(2)} → ${detail} · click to open in a new tab`);
    }
    if (dragRef.current) {
      dragRef.current.x1 = e.clientX - r.left; dragRef.current.y1 = e.clientY - r.top;
      const d = dragRef.current, ov = overlayRef.current;
      if (ov) {
        ov.style.display = 'block';
        ov.style.left = `${Math.min(d.x0, d.x1)}px`; ov.style.top = `${Math.min(d.y0, d.y1)}px`;
        ov.style.width = `${Math.abs(d.x1 - d.x0)}px`; ov.style.height = `${Math.abs(d.y1 - d.y0)}px`;
      }
    }
  };
  const onUp = (e: React.PointerEvent) => {
    const d = dragRef.current; dragRef.current = null;
    if (overlayRef.current) overlayRef.current.style.display = 'none';
    if (!d) return;
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const dx = Math.abs(d.x1 - d.x0), dy = Math.abs(d.y1 - d.y0);
    if (dx < 6 && dy < 6) { // a click → open that exact world in the Observatory
      const pr = paintedResRef.current;
      const i = Math.min(pr - 1, Math.max(0, Math.floor((d.x0 / r.width) * pr)));
      const j = Math.min(pr - 1, Math.max(0, Math.floor((d.y0 / r.height) * pr)));
      goObservatory(i, j);
      return;
    }
    if (dx < 6 || dy < 6) return; // degenerate selection
    const nx0 = Math.min(d.x0, d.x1) / r.width, nx1 = Math.max(d.x0, d.x1) / r.width;
    const ny0 = Math.min(d.y0, d.y1) / r.height, ny1 = Math.max(d.y0, d.y1) / r.height;
    const nd: Domain = {
      a0: effDomain.a0 + (effDomain.a1 - effDomain.a0) * nx0, a1: effDomain.a0 + (effDomain.a1 - effDomain.a0) * nx1,
      b0: effDomain.b1 - (effDomain.b1 - effDomain.b0) * ny1, b1: effDomain.b1 - (effDomain.b1 - effDomain.b0) * ny0,
    };
    if (mode === 'radspeed' && system?.onBox) system.onBox({ rMin: nd.a0, rMax: nd.a1, fMin: nd.b0, fMax: nd.b1 });
    else setDomain(nd);
    setTimeout(render, mode === 'radspeed' ? 40 : 0);
  };

  const panel: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: 12 };
  const h3: React.CSSProperties = { margin: '0 0 8px', font: '600 12px/1.2 ui-monospace, monospace', color: 'var(--dim)', letterSpacing: 0.4 };
  const btn: React.CSSProperties = { padding: '6px 14px', borderRadius: 6, border: '1px solid var(--cp-border, #2a3550)', background: 'var(--panel-2)', color: 'var(--fg)', cursor: 'pointer', fontSize: 13 };

  return (
    <div style={{ ...panel, marginBottom: 12 }}>
      <h3 style={h3}>DESTINY MAP — {lens === 'stat' ? 'statistical portrait of fates' : 'fractal portrait of fates'}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 18, alignItems: 'start' }}>
        {/* Controls */}
        <div>
          <Pills label="Plane" value={mode} options={[
            { value: 'pos', label: 'Start position' }, { value: 'radspeed', label: 'Radius × speed' }, { value: 'anglespeed', label: 'Angle × speed' },
          ]} onChange={(v) => switchMode(v as BasinMode)} />
          <Pills label="Lens" value={lens} options={[
            { value: 'exact', label: 'Exact (1 world/px)' }, { value: 'stat', label: 'Statistical' },
          ]} onChange={(v) => { stop(); setLens(v as BasinLens); setRes(r => Math.min(r, v === 'stat' ? 96 : 256)); }} />
          {lens === 'exact' ? (
            <Pills label="Color by" value={metric} options={[
              { value: 'fate', label: 'Fate' }, { value: 'chaos', label: 'Chaos (λ)' },
            ]} onChange={(v) => setMetric(v as BasinMetric)} />
          ) : (
            <>
              <Pills label="Show" value={statMetric} options={[
                { value: 'happy', label: 'Happy %' }, { value: 'hab', label: 'Habitable' },
                { value: 'destroyed', label: 'Destroyed %' }, { value: 'survived', label: 'Survived %' },
              ]} onChange={(v) => { const m = v as StatMetric; statMetricRef.current = m; setStatMetric(m); if (!busy && gridKeyRef.current === currentGridKey()) applyColor(); }} />
              <Slider label="Worlds / pixel" value={statRuns} min={2} max={32} step={2} onChange={setStatRuns} format={v => `${v}`} />
            </>
          )}
          {(lens === 'stat' || metric === 'chaos') && (
            <Pills label="Color range" value={autoFit ? 1 : 0}
              options={[{ value: 1, label: 'Auto-fit' }, { value: 0, label: 'Absolute' }]}
              onChange={(v) => { autoFitRef.current = v === 1; setAutoFit(v === 1); if (!busy && gridKeyRef.current === currentGridKey()) applyColor(); }} />
          )}
          {mode === 'pos' && lens === 'exact' && (
            <>
              <Pills label="Launch from each point" value={posRule}
                options={[{ value: 'tangential', label: 'Tangential' }, { value: 'rest', label: 'At rest' }]}
                onChange={(v) => setPosRule(v as 'rest' | 'tangential')} />
              {posRule === 'tangential' &&
                <Slider label="Speed × circular" value={posSpeedFrac} min={0.2} max={1.6} step={0.05} onChange={setPosSpeedFrac} format={v => v.toFixed(2)} />}
            </>
          )}
          {mode === 'pos' && (
            <Pills label="Reference frame" value={frame}
              options={[
                { value: 'bary', label: 'Barycenter' },
                { value: 's0', label: 'Star A' }, { value: 's1', label: 'Star B' }, { value: 's2', label: 'Star C' },
              ]}
              onChange={(v) => setFrame(v as FrameId)} />
          )}
          {mode === 'radspeed' && lens === 'exact' && <Slider label="Fixed angle (°)" value={fixedAngle} min={0} max={360} step={5} onChange={setFixedAngle} format={v => `${v}`} />}
          {mode === 'anglespeed' && lens === 'exact' && <Slider label="Fixed radius" value={fixedRadius} min={0.3} max={6} step={0.1} onChange={setFixedRadius} format={v => v.toFixed(1)} />}
          {mode !== 'pos' && lens === 'exact' && <Pills label="Direction" value={fixedRetro ? 1 : 0} options={[{ value: 0, label: 'Prograde' }, { value: 1, label: 'Retrograde' }]} onChange={(v) => setFixedRetro(v === 1)} />}
          {mode === 'pos' && <Pills label="Star paths" value={showStars ? 1 : 0}
            options={[{ value: 1, label: 'Show' }, { value: 0, label: 'Hide' }]} onChange={(v) => setShowStars(v === 1)} />}
          <Pills label="Resolution" value={res}
            options={(lens === 'stat' ? [48, 64, 96, 128] : [96, 128, 192, 256]).map(r => ({ value: r, label: `${r}²` }))}
            onChange={setRes} />
          {lens === 'exact' && <Pills label="Samples / pixel" value={samples} options={[{ value: 1, label: '1 (crisp)' }, { value: 2, label: '4 (smooth)' }, { value: 3, label: '9' }]} onChange={setSamples} />}
          {(HAS_WORKERS || HAS_GPU) && <Pills label="Engine" value={engine} options={[
            ...(HAS_GPU ? [{ value: 'gpu', label: 'GPU (exp)' }] : []),
            ...(HAS_WORKERS ? [{ value: 'workers', label: `Workers ×${Math.min(8, Math.max(2, (navigator.hardwareConcurrency || 4) - 1))}` }] : []),
            { value: 'cpu', label: 'CPU' },
          ]} onChange={(v) => setEngine(v as BasinEngine)} />}
          {engine === 'gpu' && !gpuSupportsMap(metric, lens) && (
            <div style={{ font: '11px/1.5 system-ui', color: 'var(--accent)', marginTop: 4 }}>
              ⚠ The GPU lane doesn’t compute the chaos/λ exponent — this view will render on Workers instead.
            </div>
          )}
          {engine === 'gpu' && gpuSupportsMap(metric, lens) && (
            <div style={{ font: '11px/1.5 system-ui', color: 'var(--dim)', marginTop: 4 }}>
              ⚡ Experimental WebGPU: 32-bit precision, so fine fractal detail can differ slightly from Workers/CPU. Falls back automatically on error.
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button style={{ ...btn, background: busy ? 'var(--accent-soft)' : 'var(--success-soft)' }} onClick={busy ? stop : render}>{busy ? '❚❚ Stop' : '▦ Render map'}</button>
            <button style={btn} onClick={() => {
              if (mode === 'radspeed' && system?.onBox) {
                const d = DEFAULT_DOMAIN.radspeed;
                system.onBox({ rMin: d.a0, rMax: d.a1, fMin: d.b0, fMax: d.b1 });
              } else setDomain(DEFAULT_DOMAIN[mode]);
              setTimeout(render, 40);
            }}>⤢ Reset zoom</button>
            {mode === 'radspeed' && system?.onRunCensus && (
              <button style={btn} title="Run the ensemble on this radius × speed box" onClick={system.onRunCensus}>∑ Census this box</button>
            )}
          </div>

          {/* Fixed height + persists across renders, so it never reflows the panel. */}
          {lens === 'exact' && (
            <div style={{ marginTop: 10, height: 68, overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
              {dim ? (
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <DimPlot dim={dim} />
                  <div style={{ font: '11px/1.45 ui-monospace, monospace', whiteSpace: 'nowrap' }}>
                    <div>boundary&nbsp;<b style={{ color: 'var(--accent)' }}>D ≈ {dim.D.toFixed(3)}</b></div>
                    <div>uncertainty&nbsp;<b style={{ color: 'var(--accent-2)' }}>α ≈ {dim.alpha.toFixed(3)}</b></div>
                    <div style={{ color: 'var(--dim)' }}>boundary {(dim.boundary * 100).toFixed(0)}%</div>
                  </div>
                </div>
              ) : (
                <div style={{ font: '11px/1.5 system-ui', color: 'var(--dim-2)' }}>The boundary’s box-counting dimension appears here after a render.</div>
              )}
            </div>
          )}

          {lens === 'stat' ? (
            <div style={{ marginTop: 10, font: '11px ui-monospace, monospace', color: 'var(--dim)' }}>
              <div style={{
                height: 10, borderRadius: 3, marginBottom: 2,
                background: `linear-gradient(90deg, rgb(${ramps.stat(0).join(',')}), rgb(${ramps.stat(0.5).join(',')}), rgb(${ramps.stat(1).join(',')}))`,
              }} />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{STAT_LABEL[statMetric]} {colorRange ? `${(colorRange[0] * 100).toFixed(0)}%` : '0%'}</span>
                <span>{colorRange ? `${(colorRange[1] * 100).toFixed(0)}%` : '100%'}{autoFit ? ' · auto' : ''}</span>
              </div>
            </div>
          ) : metric === 'fate' ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 12px', marginTop: 10, font: '11px ui-monospace, monospace' }}>
              {OUTCOME_CODE.filter(o => o !== 'blowup').map(o => (
                <span key={o} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: `rgb(${ramps.outcomeRgb[o].join(',')})` }} />{o}
                </span>
              ))}
            </div>
          ) : (
            <div style={{ marginTop: 10, font: '11px ui-monospace, monospace', color: 'var(--dim)' }}>
              <div style={{
                height: 10, borderRadius: 3, marginBottom: 2,
                background: `linear-gradient(90deg, rgb(${ramps.chaos(0).join(',')}), rgb(${ramps.chaos(0.33).join(',')}), rgb(${ramps.chaos(0.66).join(',')}), rgb(${ramps.chaos(1).join(',')}))`,
              }} />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>regular  λ={colorRange ? colorRange[0].toFixed(2) : '0'}</span>
                <span>chaotic  λ{colorRange ? `=${colorRange[1].toFixed(2)}` : `≥${CHAOS_LAMBDA_MAX}`}{autoFit ? ' · auto' : ''}</span>
              </div>
            </div>
          )}
          <div style={{ font: '11px/1.5 system-ui', color: 'var(--dim)', marginTop: 8 }}>
            {lens === 'stat'
              ? `Each pixel is a mini-census: ${statRuns} worlds that share these axes but randomise the other launch dimensions, colored by ${STAT_LABEL[statMetric]}. The Exact lens shows one world per pixel — switch to it to see the fractal final-state boundaries underneath these smooth statistics.`
              : metric === 'fate'
                ? 'One pixel = one exact starting condition. Hue = outcome, brightness = how long it lasted. Drag a box to zoom — the boundaries stay intricate at every scale: the three-body problem’s fractal final-state sensitivity. D is the box-counting dimension of the boundary (1 = smooth, →2 = space-filling); α = 2−D is the uncertainty exponent.'
                : 'One pixel = one exact starting condition. Color = the planet’s Lyapunov exponent λ — how fast its future becomes unpredictable (blue = regular orbits, red = strongly chaotic). Drag a box to zoom. D is the box-counting dimension of the regular/chaotic frontier.'}
          </div>
          {mode === 'pos' && frame !== 'bary' && (
            <div style={{ font: '11px/1.5 system-ui', color: 'var(--dim)', marginTop: 6 }}>
              Frame co-moving with <b>{frame === 's0' ? 'Star A' : frame === 's1' ? 'Star B' : 'Star C'}</b>: each pixel is a start offset from that star, launched with the star’s own velocity, so destinies are read relative to a moving star (⌖ marks it, pinned at the origin while the others orbit).
            </div>
          )}
        </div>

        {/* Map */}
        <div style={{ maxWidth: 460, width: '100%' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <canvas ref={canvasRef} width={res} height={res}
              style={{ width: '100%', aspectRatio: '1', borderRadius: 6, display: 'block', cursor: 'crosshair', imageRendering: samples === 1 ? 'pixelated' : 'auto', touchAction: 'none', background: 'var(--viz-bg)' }}
              onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={() => setHover('')} />
            <canvas ref={starCanvasRef} width={600} height={600}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', borderRadius: 6, pointerEvents: 'none' }} />
            <div ref={overlayRef} style={{ position: 'absolute', display: 'none', border: '1px solid var(--accent-2)', background: 'var(--accent-soft)', pointerEvents: 'none' }} />
            {busy && (
              <div style={{ position: 'absolute', left: 8, right: 8, bottom: 8, pointerEvents: 'none' }}>
                <div style={{ font: '10px ui-monospace, monospace', color: 'var(--fg)', textShadow: '0 1px 3px #000', marginBottom: 3 }}>
                  rendering… {Math.round(progress * 100)}%
                </div>
                <div style={{ height: 5, borderRadius: 3, background: 'rgba(0,0,0,0.55)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${progress * 100}%`, background: 'var(--success)', borderRadius: 3 }} />
                </div>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', font: '10px ui-monospace, monospace', color: 'var(--dim)', marginTop: 3 }}>
            <span>{AXIS_LABELS[mode][0]} {effDomain.a0.toFixed(2)}…{effDomain.a1.toFixed(2)}</span>
            <span>{AXIS_LABELS[mode][1]} {effDomain.b0.toFixed(2)}…{effDomain.b1.toFixed(2)}</span>
          </div>
          <div style={{ font: '11px ui-monospace, monospace', color: 'var(--dim)', marginTop: 4, minHeight: 16 }}>{hover || 'Hover the map to inspect a starting condition.'}</div>
        </div>
      </div>
    </div>
  );
});

export default BasinMap;
