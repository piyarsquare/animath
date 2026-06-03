/// <reference lib="webworker" />
/** Ensemble worker: receives the shared config, then runs contiguous jobs of
 *  initial-condition indices and posts back RunResult batches. Pure number
 *  crunching — no Three.js, ideal for a background thread. */

import { runOne } from './runner';
import { sampleParams, type EnsembleConfig } from './rng';

const ctx: any = self; // DedicatedWorkerGlobalScope
let cfg: EnsembleConfig | null = null;
let targetMass = 1;

ctx.onmessage = (e: MessageEvent) => {
  const m = e.data;
  if (m.type === 'config') {
    cfg = m.cfg;
    targetMass = m.targetMass;
    ctx.postMessage({ type: 'ready' });
    return;
  }
  if (m.type === 'job' && cfg) {
    const { start, count } = m;
    const runs = [];
    for (let i = start; i < start + count; i++) {
      runs.push(runOne(cfg, sampleParams(cfg, i, targetMass)));
    }
    ctx.postMessage({ type: 'results', runs });
  }
};
