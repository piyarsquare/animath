/**
 * Split Decision — the Lab's sweep, as pure functions the worker and the tests share.
 *
 * A sweep is a grid over planted signal strength × reproductive rule × seed. One job
 * is one run to gMax generations; the job index is a mixed-radix code of
 * (signalIdx, ruleIdx, seedIdx). The worker builds the instance itself from the
 * config, so no matrix crosses the wire.
 *
 * Two instance kinds: a planted checkerboard whose densities follow the signal axis,
 * or a fixture (optionally with every individual started at one cut — the
 * Escape-the-trap preset), which has a single "signal" level.
 */

import { runSeed } from '@/lib/rng';
import { degrees, densitiesForSignal, fixtureById, planted, type BinaryMatrix, type Cut } from '../matrix';
import { SCORES, evaluate, exactOptimum, type Optimum } from '../scores';
import { ReachTracker, genStats, initPopulation, makeRng, populationAtCut, step, type EvolveConfig, type RuleId } from '../evolve';

export type SweepInstance =
  | { kind: 'planted'; m: number; n: number; r1: number; c1: number }
  | { kind: 'fixture'; id: string; startAt: Cut | null };

export interface SweepConfig {
  engine: number;
  /** Everything about the population except rule and seed, which the grid supplies. */
  base: Omit<EvolveConfig, 'rule' | 'seed'>;
  instance: SweepInstance;
  /** Planted signal strengths s ∈ [0, 1] (ρ_in = ½ + s/2, ρ_out = ½ − s/2). One entry for a fixture. */
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
  /** First generation the best rounded cut scored strictly above where the run
   *  started — the question the trap preset actually asks (H3 is about escaping a
   *  local optimum, which is weaker than reaching the global one). */
  escapedAt: number | null;
  /** The exact optimum (null when the matrix is too large to enumerate). */
  optimum: number | null;
  /** The planted split's score (null for a fixture without one). */
  plantedScore: number | null;
  startScore: number;
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

/** The instance for a signal level: shared by every rule and seed at that level. */
export function instanceFor(cfg: SweepConfig, signalIdx: number): { matrix: BinaryMatrix; planted: Cut | null; startAt: Cut | null } {
  if (cfg.instance.kind === 'fixture') {
    const f = fixtureById(cfg.instance.id);
    if (!f) throw new Error(`unknown fixture ${cfg.instance.id}`);
    return { matrix: f.matrix, planted: f.planted, startAt: cfg.instance.startAt };
  }
  const { m, n, r1, c1 } = cfg.instance;
  const { rhoIn, rhoOut } = densitiesForSignal(cfg.signals[signalIdx]);
  const inst = planted({ m, n, r1, c1, rhoIn, rhoOut }, runSeed(cfg.matrixSeed, signalIdx));
  return { matrix: inst.matrix, planted: inst.planted, startAt: null };
}

/** The largest m + n the Exhaustive Bailiff enumerates (2^19 cuts). */
export const ENUMERATION_LIMIT = 20;

/** Can every job in this sweep be scored against an exact optimum? Without one,
 *  "reached" is undefined and every run would read as censored. */
export function canEnumerate(cfg: SweepConfig): boolean {
  if (cfg.instance.kind === 'planted') return cfg.instance.m + cfg.instance.n <= ENUMERATION_LIMIT;
  const f = fixtureById(cfg.instance.id);
  return !!f && f.matrix.m + f.matrix.n <= ENUMERATION_LIMIT;
}

// The exact optimum depends only on the instance and the judge, not on the rule
// or seed, so each worker computes it once per signal level it sees.
const OPTIMUM_CACHE = new Map<string, Optimum | null>();
function optimumFor(cfg: SweepConfig, signalIdx: number, M: BinaryMatrix, d: ReturnType<typeof degrees>): Optimum | null {
  const key = `${JSON.stringify(cfg.instance)}|${cfg.signals[signalIdx]}|${cfg.matrixSeed}|${cfg.base.scoreId}`;
  const hit = OPTIMUM_CACHE.get(key);
  if (hit !== undefined) return hit;
  if (OPTIMUM_CACHE.size > 64) OPTIMUM_CACHE.clear();
  const opt = exactOptimum(M, d, SCORES[cfg.base.scoreId], ENUMERATION_LIMIT);
  OPTIMUM_CACHE.set(key, opt);
  return opt;
}

export function runJob(cfg: SweepConfig, i: number): JobResult {
  const { signalIdx, ruleIdx, seedIdx } = decodeJob(cfg, i);
  const inst = instanceFor(cfg, signalIdx);
  const M = inst.matrix, d = degrees(M);
  const spec = SCORES[cfg.base.scoreId];
  const opt = optimumFor(cfg, signalIdx, M, d);
  const plantedScore = inst.planted ? evaluate(M, d, spec, inst.planted) : null;
  const evo: EvolveConfig = { ...cfg.base, rule: cfg.rules[ruleIdx], seed: runSeed(cfg.baseSeed, i) };
  const rng = makeRng(evo);
  let pop = inst.startAt ? populationAtCut(inst.startAt, M, d, evo, rng) : initPopulation(M, d, evo, rng);
  const tracker = new ReachTracker(opt ? opt.score : null, cfg.sustain);
  let stats = genStats(pop, 0, M, d, evo);
  const startScore = stats.bestRoundedFit;
  tracker.update(0, stats.bestRoundedFit);
  let escapedAt: number | null = null;
  let g = 1;
  for (; g <= cfg.gMax; g++) {
    pop = step(pop, M, d, evo, rng);
    stats = genStats(pop, g, M, d, evo);
    if (escapedAt === null && stats.bestRoundedFit > startScore + 1e-9) escapedAt = g;
    if (tracker.update(g, stats.bestRoundedFit) !== null) break;
  }
  return {
    i, signalIdx, ruleIdx, seedIdx,
    reachedAt: tracker.reachedAt,
    escapedAt,
    optimum: opt ? opt.score : null,
    plantedScore,
    startScore,
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
  /** Sorted generations at which runs first improved on their starting score. */
  escaped: number[];
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
      const escaped = cell.filter(x => x.escapedAt !== null).map(x => x.escapedAt as number).sort((a, b) => a - b);
      out.push({
        signalIdx: s, ruleIdx: r, n: cell.length, reached, escaped,
        censored: cell.length - reached.length,
        medianFinalGap: gaps.length ? gaps[Math.floor(gaps.length / 2)] : null,
      });
    }
  }
  return out;
}

/** Survival-style curve: the fraction of runs past the given event by generation g,
 *  sampled at `points` generations from 0 to gMax. */
export function reachedByGeneration(cell: CellSummary, gMax: number, points = 60, event: 'reached' | 'escaped' = 'reached'): Array<{ g: number; frac: number }> {
  const events = event === 'escaped' ? cell.escaped : cell.reached;
  const out: Array<{ g: number; frac: number }> = [];
  for (let k = 0; k <= points; k++) {
    const g = Math.round((k / points) * gMax);
    const count = events.filter(x => x <= g).length;
    out.push({ g, frac: cell.n ? count / cell.n : 0 });
  }
  return out;
}

/** The generation by which half of ALL runs in the cell had reached the optimum
 *  (the survival curve's median, censored runs counted as never), or null when
 *  half of them never did. */
export function medianReached(cell: CellSummary, event: 'reached' | 'escaped' = 'reached'): number | null {
  const events = event === 'escaped' ? cell.escaped : cell.reached;
  if (cell.n === 0 || events.length * 2 <= cell.n) return null;
  return events[Math.ceil(cell.n / 2) - 1];
}
