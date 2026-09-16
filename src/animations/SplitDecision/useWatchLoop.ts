/**
 * The Watch-mode simulation loop. The population lives in a ref and advances
 * inside one requestAnimationFrame loop with an accumulator (generations per
 * second × Δt), publishing one snapshot per frame to React. Three populations run
 * in lockstep from the same seed: the configured one, a neutral twin (k = 1) and a
 * Rounded twin — the two controls the entropy trace is read against.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Rng } from '@/lib/rng';
import type { BinaryMatrix, Degrees } from './matrix';
import { ReachTracker, genStats, initPopulation, makeRng, step, type EvolveConfig, type GenStats, type Individual } from './evolve';

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
  stats: GenStats;
  pop: Individual[];
  history: TracePoint[];
  reachedAt: number | null;
}

interface Line { cfg: EvolveConfig; rng: Rng; pop: Individual[]; entropy: number }
interface Sim { main: Line; neutral: Line; rounded: Line; gen: number; history: TracePoint[]; tracker: ReachTracker; stats: GenStats }

const MAX_HISTORY = 3000;
const MAX_GENS_PER_FRAME = 60;

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

  const publish = useCallback(() => {
    const s = simRef.current;
    if (!s) return;
    setSnapshot({ gen: s.gen, stats: s.stats, pop: s.main.pop, history: s.history, reachedAt: s.tracker.reachedAt });
  }, []);

  const build = useCallback((): Sim => {
    const mk = (c: EvolveConfig): { line: Line; stats: GenStats } => {
      const rng = makeRng(c);
      const pop = initPopulation(M, d, c, rng);
      const stats = genStats(pop, 0, M, d, c);
      return { line: { cfg: c, rng, pop, entropy: stats.meanEntropy }, stats };
    };
    const main = mk(cfg);
    const neutral = mk({ ...cfg, selection: { kind: 'tournament', k: 1 } });
    const rounded = mk({ ...cfg, fitness: 'rounded' });
    const tracker = new ReachTracker(optimum, sustain);
    tracker.update(0, main.stats.bestRoundedFit);
    const point: TracePoint = { gen: 0, best: main.stats.bestRoundedFit, mean: main.stats.meanFit, entropy: main.stats.meanEntropy, neutral: neutral.line.entropy, rounded: rounded.line.entropy };
    return { main: main.line, neutral: neutral.line, rounded: rounded.line, gen: 0, history: [point], tracker, stats: main.stats };
  }, [M, d, cfg, optimum, sustain]);

  const advance = useCallback((n: number) => {
    const s = simRef.current;
    if (!s) return;
    for (let i = 0; i < n; i++) {
      s.gen++;
      for (const line of [s.main, s.neutral, s.rounded]) {
        line.pop = step(line.pop, M, d, line.cfg, line.rng);
      }
      s.stats = genStats(s.main.pop, s.gen, M, d, s.main.cfg);
      s.neutral.entropy = genStats(s.neutral.pop, s.gen, M, d, s.neutral.cfg).meanEntropy;
      s.rounded.entropy = genStats(s.rounded.pop, s.gen, M, d, s.rounded.cfg).meanEntropy;
      s.tracker.update(s.gen, s.stats.bestRoundedFit);
      s.history.push({ gen: s.gen, best: s.stats.bestRoundedFit, mean: s.stats.meanFit, entropy: s.stats.meanEntropy, neutral: s.neutral.entropy, rounded: s.rounded.entropy });
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
    publish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfgKey]);

  const reset = useCallback(() => { simRef.current = build(); publish(); }, [build, publish]);
  const stepOnce = useCallback(() => { advance(1); publish(); }, [advance, publish]);

  useEffect(() => {
    if (!playing) return;
    let raf = 0, last = performance.now(), acc = 0;
    const tick = (now: number) => {
      const dt = Math.min(0.25, (now - last) / 1000);
      last = now;
      acc += dt * gpsRef.current;
      const n = Math.min(MAX_GENS_PER_FRAME, Math.floor(acc));
      if (n > 0) { acc -= n; advance(n); publish(); }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, advance, publish]);

  return { snapshot, playing, setPlaying, gps, setGps, reset, stepOnce };
}
