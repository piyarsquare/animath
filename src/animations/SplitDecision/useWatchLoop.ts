/**
 * The Watch-mode simulation loop.
 *
 * Three populations advance in lockstep from the same seed: the configured one, a
 * neutral twin (k = 1) and a Rounded twin — the two controls the entropy trace is
 * read against. They live in a ref and advance inside one requestAnimationFrame
 * loop with an accumulator (generations per second × Δt).
 *
 * Three cadences, deliberately separate, because the simulation is cheap and React
 * is not (a profile of a 24×24 / N = 256 run spent 44% of its time in the
 * reconciler and 8% in this engine):
 *   • every generation — the scalars the trace plots (`genStats`, no
 *     canonicalization) plus each twin's entropy;
 *   • every PUBLISH_MS — a snapshot to React, so the render rate is bounded no
 *     matter how fast the generations run;
 *   • every FULL_MS — the population-level picture (`fullStats`: consensus,
 *     quartiles, convention fraction). Its object identity is stable in between,
 *     so views that memoize on it re-render at this slower rate.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Rng } from '@/lib/rng';
import type { BinaryMatrix, Degrees } from './matrix';
import {
  ReachTracker, fullStats, genStats, initPopulation, makeRng, meanEntropyOf, step,
  type EvolveConfig, type FullStats, type Individual,
} from './evolve';

export interface TracePoint {
  gen: number;
  best: number;
  mean: number;
  entropy: number;
  neutral: number;
  rounded: number;
}

export interface WatchSnapshot {
  gen: number;
  stats: FullStats;
  pop: Individual[];
  history: TracePoint[];
  reachedAt: number | null;
}

interface Line { cfg: EvolveConfig; rng: Rng; pop: Individual[]; entropy: number }
interface Sim {
  main: Line; neutral: Line; rounded: Line;
  gen: number; history: TracePoint[]; tracker: ReachTracker;
  stats: FullStats; fullAt: number;
}

const MAX_HISTORY = 3000;
const MAX_GENS_PER_FRAME = 200;
/** Snapshot to React at most this often (ms) — the render budget. */
const PUBLISH_MS = 50;
/** Refresh the population-level picture at most this often (ms). */
const FULL_MS = 250;

function hashCells(cells: Uint8Array): number {
  let h = 2166136261;
  for (let i = 0; i < cells.length; i++) { h ^= cells[i]; h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function useWatchLoop(M: BinaryMatrix, d: Degrees, cfg: EvolveConfig, optimum: number | null, sustain = 5) {
  const simRef = useRef<Sim | null>(null);
  const [snapshot, setSnapshot] = useState<WatchSnapshot | null>(null);
  const [playing, setPlaying] = useState(false);
  const [gps, setGps] = useState(20);
  const gpsRef = useRef(gps);
  gpsRef.current = gps;
  const cfgKey = `${JSON.stringify(cfg)}|${M.m}x${M.n}|${hashCells(M.cells)}|${optimum}`;

  /** Recompute the population-level picture, unless one is recent enough. */
  const refreshFull = useCallback((s: Sim, now: number, force = false) => {
    if (!force && now - s.fullAt < FULL_MS) return;
    s.stats = fullStats(s.main.pop, s.gen, M, d, s.main.cfg);
    s.fullAt = now;
  }, [M, d]);

  const publish = useCallback((force = false) => {
    const s = simRef.current;
    if (!s) return;
    refreshFull(s, performance.now(), force);
    setSnapshot({ gen: s.gen, stats: s.stats, pop: s.main.pop, history: s.history, reachedAt: s.tracker.reachedAt });
  }, [refreshFull]);

  const build = useCallback((): Sim => {
    const mk = (c: EvolveConfig): Line => {
      const rng = makeRng(c);
      const pop = initPopulation(M, d, c, rng);
      return { cfg: c, rng, pop, entropy: meanEntropyOf(pop, d) };
    };
    const main = mk(cfg);
    const neutral = mk({ ...cfg, selection: { kind: 'tournament', k: 1 } });
    const rounded = mk({ ...cfg, fitness: 'rounded' });
    const stats = fullStats(main.pop, 0, M, d, cfg);
    const tracker = new ReachTracker(optimum, sustain);
    tracker.update(0, stats.bestRoundedFit);
    const point: TracePoint = {
      gen: 0, best: stats.bestRoundedFit, mean: stats.meanFit,
      entropy: stats.meanEntropy, neutral: neutral.entropy, rounded: rounded.entropy,
    };
    return { main, neutral, rounded, gen: 0, history: [point], tracker, stats, fullAt: performance.now() };
  }, [M, d, cfg, optimum, sustain]);

  const advance = useCallback((n: number) => {
    const s = simRef.current;
    if (!s) return;
    for (let i = 0; i < n; i++) {
      s.gen++;
      s.main.pop = step(s.main.pop, M, d, s.main.cfg, s.main.rng);
      s.neutral.pop = step(s.neutral.pop, M, d, s.neutral.cfg, s.neutral.rng);
      s.rounded.pop = step(s.rounded.pop, M, d, s.rounded.cfg, s.rounded.rng);
      const light = genStats(s.main.pop, s.gen, M, d, s.main.cfg);
      s.neutral.entropy = meanEntropyOf(s.neutral.pop, d);
      s.rounded.entropy = meanEntropyOf(s.rounded.pop, d);
      s.tracker.update(s.gen, light.bestRoundedFit);
      s.history.push({
        gen: s.gen, best: light.bestRoundedFit, mean: light.meanFit,
        entropy: light.meanEntropy, neutral: s.neutral.entropy, rounded: s.rounded.entropy,
      });
      if (s.history.length > MAX_HISTORY) {
        const last = s.history[s.history.length - 1];
        s.history = s.history.filter((_, k) => k % 2 === 0);
        if (s.history[s.history.length - 1] !== last) s.history.push(last);
      }
    }
  }, [M, d]);

  // (Re)build whenever the configuration or the matrix changes.
  useEffect(() => {
    simRef.current = build();
    publish(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfgKey]);

  const reset = useCallback(() => { simRef.current = build(); publish(true); }, [build, publish]);
  const stepOnce = useCallback(() => { advance(1); publish(true); }, [advance, publish]);

  useEffect(() => {
    if (!playing) return;
    let raf = 0, last = performance.now(), acc = 0, lastPublish = 0;
    const tick = (now: number) => {
      const dt = Math.min(0.25, (now - last) / 1000);
      last = now;
      acc += dt * gpsRef.current;
      const n = Math.min(MAX_GENS_PER_FRAME, Math.floor(acc));
      if (n > 0) {
        acc -= n;
        advance(n);
        if (now - lastPublish >= PUBLISH_MS) { lastPublish = now; publish(); }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); publish(true); };
  }, [playing, advance, publish]);

  return { snapshot, playing, setPlaying, gps, setGps, reset, stepOnce };
}
