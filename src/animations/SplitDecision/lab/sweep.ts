/**
 * Split Decision — the Lab's sweep, as pure functions the worker and the tests share.
 *
 * A sweep is a grid over planted signal strength × reproductive rule × seed. One job
 * is one run to gMax generations; the job index is a mixed-radix code of
 * (signalIdx, ruleIdx, seedIdx). The worker builds the planted matrix itself from the
 * signal and matrix seed, so no matrix crosses the wire.
 */

import { runSeed } from '@/lib/rng';
import { degrees, densitiesForSignal, planted, type Cut } from '../matrix';
import { SCORES, evaluate, exactOptimum } from '../scores';
import { ReachTracker, genStats, initPopulation, makeRng, step, type EvolveConfig, type RuleId } from '../evolve';

export interface SweepConfig {
  engine: number;
  /** Everything about the population except rule and seed, which the grid supplies. */
  base: Omit<EvolveConfig, 'rule' | 'seed'>;
  m: number;
  n: number;
  r1: number;
  c1: number;
  /** Planted signal strengths s ∈ [0, 1] (ρ_in = ½ + s/2, ρ_out = ½ − s/2). */
  signals: number[];
  rules: RuleId[];
  /** Replicates per (signal, rule). */
  seeds: number;
  baseSeed: number;
  matrixSeed: number;
  gMax: number;
  /** Consecutive generations at the optimum that count as "reached". */
  sustain: number;
}

export interface JobResult {
  i: number;
  signalIdx: number;
  ruleIdx: number;
  seedIdx: number;
  /** First generation of a sustained optimum, or null if censored at gMax (or no exact optimum). */
  reachedAt: number | null;
  /** The exact optimum (null when the matrix is too large to enumerate). */
  optimum: number | null;
  plantedScore: number;
  finalBestRounded: number;
  finalMeanEntropy: number;
  gens: number;
}

export function jobCount(cfg: SweepConfig): number {
  return cfg.signals.length * cfg.rules.length * cfg.seeds;
}

export function decodeJob(cfg: SweepConfig, i: number): { signalIdx: number; ruleIdx: number; seedIdx: number } {
  const seedIdx = i % cfg.seeds;
  const rest = Math.floor(i / cfg.seeds);
  const ruleIdx = rest % cfg.rules.length;
  const signalIdx = Math.floor(rest / cfg.rules.length);
  return { signalIdx, ruleIdx, seedIdx };
}

export function encodeJob(cfg: SweepConfig, signalIdx: number, ruleIdx: number, seedIdx: number): number {
  return (signalIdx * cfg.rules.length + ruleIdx) * cfg.seeds + seedIdx;
}

/** Evaluations per sweep — shown next to the Run button so the dials stay honest. */
export function evaluationCount(cfg: SweepConfig): number {
  return jobCount(cfg) * cfg.gMax * cfg.base.N;
}

/** The planted instance for a signal level: shared by every rule and seed at that level. */
export function instanceFor(cfg: SweepConfig, signalIdx: number) {
  const { rhoIn, rhoOut } = densitiesForSignal(cfg.signals[signalIdx]);
  return planted({ m: cfg.m, n: cfg.n, r1: cfg.r1, c1: cfg.c1, rhoIn, rhoOut }, runSeed(cfg.matrixSeed, signalIdx));
}

export function runJob(cfg: SweepConfig, i: number): JobResult {
  const { signalIdx, ruleIdx, seedIdx } = decodeJob(cfg, i);
  const inst = instanceFor(cfg, signalIdx);
  const M = inst.matrix, d = degrees(M);
  const spec = SCORES[cfg.base.scoreId];
  const opt = exactOptimum(M, d, spec);
  const plantedScore = evaluate(M, d, spec, inst.planted as Cut);
  const evo: EvolveConfig = { ...cfg.base, rule: cfg.rules[ruleIdx], seed: runSeed(cfg.baseSeed, i) };
  const rng = makeRng(evo);
  let pop = initPopulation(M, d, evo, rng);
  const tracker = new ReachTracker(opt ? opt.score : null, cfg.sustain);
  let stats = genStats(pop, 0, M, d, evo);
  tracker.update(0, stats.bestRoundedFit);
  let g = 1;
  for (; g <= cfg.gMax; g++) {
    pop = step(pop, M, d, evo, rng);
    stats = genStats(pop, g, M, d, evo);
    if (tracker.update(g, stats.bestRoundedFit) !== null) break;
  }
  return {
    i, signalIdx, ruleIdx, seedIdx,
    reachedAt: tracker.reachedAt,
    optimum: opt ? opt.score : null,
    plantedScore,
    finalBestRounded: stats.bestRoundedFit,
    finalMeanEntropy: stats.meanEntropy,
    gens: Math.min(g, cfg.gMax),
  };
}

/* ── summaries ── */

export interface CellSummary {
  signalIdx: number;
  ruleIdx: number;
  n: number;
  /** Sorted generations at which runs reached the optimum (censored runs omitted). */
  reached: number[];
  censored: number;
  /** Median of (optimum − finalBestRounded) over all runs; null without an exact optimum. */
  medianFinalGap: number | null;
}

export function summarize(cfg: SweepConfig, rows: JobResult[]): CellSummary[] {
  const out: CellSummary[] = [];
  for (let s = 0; s < cfg.signals.length; s++) {
    for (let r = 0; r < cfg.rules.length; r++) {
      const cell = rows.filter(x => x.signalIdx === s && x.ruleIdx === r);
      const reached = cell.filter(x => x.reachedAt !== null).map(x => x.reachedAt as number).sort((a, b) => a - b);
      const gaps = cell.filter(x => x.optimum !== null).map(x => (x.optimum as number) - x.finalBestRounded).sort((a, b) => a - b);
      out.push({
        signalIdx: s, ruleIdx: r, n: cell.length, reached,
        censored: cell.length - reached.length,
        medianFinalGap: gaps.length ? gaps[Math.floor(gaps.length / 2)] : null,
      });
    }
  }
  return out;
}

/** Survival-style curve: the fraction of runs that had reached the optimum by
 *  generation g, sampled at `points` generations from 0 to gMax. */
export function reachedByGeneration(cell: CellSummary, gMax: number, points = 60): Array<{ g: number; frac: number }> {
  const out: Array<{ g: number; frac: number }> = [];
  for (let k = 0; k <= points; k++) {
    const g = Math.round((k / points) * gMax);
    const count = cell.reached.filter(x => x <= g).length;
    out.push({ g, frac: cell.n ? count / cell.n : 0 });
  }
  return out;
}
