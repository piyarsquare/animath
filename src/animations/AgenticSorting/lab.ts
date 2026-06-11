/**
 * Agentic Sorting — batch experiment engine ("Lab").
 *
 * The sandbox runs one population live. The Lab runs *many* headless — exactly
 * the loop used to get aggregate numbers like "pure Blind Date sorts in ~545
 * swaps": `generate → step×cap → measure`, repeated over trials and conditions.
 * Because `step()` is pure, thousands of trials run synchronously in a few
 * hundred milliseconds; `runExperiment` chunks the work and yields so the
 * progress bar can paint.
 */

import {
  generate, step, mulberry32,
  AGENT_TYPE_LIST, type AgentType, type Weights, type GenerateConfig,
} from './engine';
import { algotypeClustering, sortedness } from './metrics';

export type MetricKey = 'cyclesToSort' | 'swaps' | 'finalSortedness' | 'clustering';

export const METRIC_LABELS: Record<MetricKey, string> = {
  cyclesToSort: 'Cycles to sort',
  swaps: 'Total swaps',
  finalSortedness: 'Final sortedness',
  clustering: 'Clustering reached',
};

export interface TrialResult {
  cyclesToSort: number;     // = cap if the threshold was never reached
  swaps: number;            // swaps when threshold first met (else at cap)
  finalSortedness: number;  // 0..1, measured at cap
  clustering: number;       // -1..1, measured at cap
  converged: boolean;
}

export interface TrialConfig extends GenerateConfig {
  wakeFraction: number;
  threshold: number; // sortedness target counted as "sorted"
  cap: number;       // max cycles
}

/** Run one population to the cycle cap, recording when it first crossed the
 *  sortedness threshold. Per-cycle sortedness is inlined (no allocation). */
export function runTrial(cfg: TrialConfig, seed: number): TrialResult {
  const rng = mulberry32(seed);
  let s = generate(cfg, rng);
  const n = s.agents.length;
  let converged = false;
  let cyclesToSort = cfg.cap;
  let swapsAtSort = 0;

  for (let c = 1; c <= cfg.cap; c++) {
    s = step(s, rng, cfg.wakeFraction);
    if (!converged && n > 1) {
      let ok = 0;
      for (let i = 0; i < n - 1; i++) if (s.agents[i].value <= s.agents[i + 1].value) ok++;
      if (ok / (n - 1) >= cfg.threshold) {
        converged = true;
        cyclesToSort = c;
        swapsAtSort = s.swaps;
      }
    }
  }

  return {
    cyclesToSort,
    swaps: converged ? swapsAtSort : s.swaps,
    finalSortedness: sortedness(s.agents.map(a => a.value)),
    clustering: algotypeClustering(s.agents.map(a => a.type)),
    converged,
  };
}

export interface Aggregate {
  mean: number;
  sd: number;
  min: number;
  max: number;
}

export function aggregate(values: number[]): Aggregate {
  const n = values.length || 1;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
  return { mean, sd: Math.sqrt(variance), min: Math.min(...values), max: Math.max(...values) };
}

/** A condition tested in an experiment (a strategy, a sweep point, or "the mix"). */
export interface GroupResult {
  label: string;
  /** swept parameter value, for sweeps (x-axis). */
  param?: number;
  trials: TrialResult[];
  convergedRate: number;
}

export function metricValues(g: GroupResult, m: MetricKey): number[] {
  return g.trials.map(t => t[m]);
}

interface Common {
  trials: number;
  count: number;
  wakeFraction: number;
  threshold: number;
  cap: number;
  objectiveMode: 'uniform' | 'split';
  descShare: number;   // 0..1
  frozenShare: number; // 0..1
  weights: Weights;
  seed: number;
}

export type SweepParam = 'count' | 'frozenShare' | 'wakeFraction' | 'descShare';

export type ExperimentSpec =
  | ({ kind: 'compare' } & Common)
  | ({ kind: 'monte' } & Common)
  | ({ kind: 'sweep'; param: SweepParam; from: number; to: number; steps: number } & Common);

const pureWeights = (t: AgentType): Weights =>
  AGENT_TYPE_LIST.reduce((w, k) => { w[k] = k === t ? 100 : 0; return w; }, {} as Weights);

interface Condition { label: string; param?: number; cfg: TrialConfig; }

function buildConditions(spec: ExperimentSpec): Condition[] {
  const base: Omit<TrialConfig, 'weights'> = {
    count: spec.count,
    wakeFraction: spec.wakeFraction,
    threshold: spec.threshold,
    cap: spec.cap,
    objectiveMode: spec.objectiveMode,
    descShare: spec.descShare,
    frozenShare: spec.frozenShare,
  };

  if (spec.kind === 'compare') {
    return [
      ...AGENT_TYPE_LIST.map(t => ({
        label: t, cfg: { ...base, weights: pureWeights(t) } as TrialConfig,
      })),
      { label: 'Current mix', cfg: { ...base, weights: spec.weights } as TrialConfig },
    ];
  }
  if (spec.kind === 'monte') {
    return [{ label: 'Current mix', cfg: { ...base, weights: spec.weights } as TrialConfig }];
  }
  // sweep
  const out: Condition[] = [];
  const steps = Math.max(2, spec.steps);
  for (let i = 0; i < steps; i++) {
    const v = spec.from + ((spec.to - spec.from) * i) / (steps - 1);
    const cfg: TrialConfig = { ...base, weights: spec.weights };
    if (spec.param === 'count') cfg.count = Math.round(v);
    else if (spec.param === 'frozenShare') cfg.frozenShare = v;
    else if (spec.param === 'wakeFraction') cfg.wakeFraction = v;
    else if (spec.param === 'descShare') { cfg.objectiveMode = 'split'; cfg.descShare = v; }
    out.push({ label: v.toFixed(spec.param === 'count' ? 0 : 2), param: v, cfg });
  }
  return out;
}

/** Run the whole experiment, yielding to the event loop so progress paints. */
export async function runExperiment(
  spec: ExperimentSpec,
  onProgress: (frac: number) => void,
): Promise<GroupResult[]> {
  const conditions = buildConditions(spec);
  const total = conditions.length * spec.trials || 1;
  const results: GroupResult[] = [];
  let done = 0;

  for (const cond of conditions) {
    const trials: TrialResult[] = [];
    for (let i = 0; i < spec.trials; i++) {
      trials.push(runTrial(cond.cfg, spec.seed + done * 2654435761));
      done++;
      if (done % 20 === 0) {
        onProgress(done / total);
        await new Promise(r => setTimeout(r, 0));
      }
    }
    results.push({
      label: cond.label,
      param: cond.param,
      trials,
      convergedRate: trials.filter(t => t.converged).length / (trials.length || 1),
    });
  }
  onProgress(1);
  return results;
}
