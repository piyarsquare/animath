/** Sweep worker: receives the config once, then one job index at a time, and posts
 *  back one result per job. All logic lives in sweep.ts (pure, unit-tested); this
 *  file is the message loop only, and imports no React. */

import { runJob, type JobResult, type SweepConfig } from './sweep';

export type ToWorker = { type: 'config'; cfg: SweepConfig } | { type: 'job'; i: number };
export type FromWorker = { type: 'ready' } | { type: 'result'; result: JobResult };

const ctx = self as unknown as { postMessage: (m: FromWorker) => void; onmessage: ((e: MessageEvent<ToWorker>) => void) | null };
let cfg: SweepConfig | null = null;

ctx.onmessage = (e: MessageEvent<ToWorker>) => {
  const m = e.data;
  if (m.type === 'config') {
    cfg = m.cfg;
    ctx.postMessage({ type: 'ready' });
  } else if (m.type === 'job' && cfg) {
    ctx.postMessage({ type: 'result', result: runJob(cfg, m.i) });
  }
};
