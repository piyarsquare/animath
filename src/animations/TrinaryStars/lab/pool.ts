/** A pool of ensemble workers fed a contiguous work-queue. Hands each idle
 *  worker the next block of run-indices and streams RunResult batches back to
 *  the main thread, which aggregates them. Pausing lets in-flight jobs drain;
 *  the handing pointer persists so resume continues without overlap. */

import type { RunResult } from '../analysis/types';
import type { EnsembleConfig } from './rng';

const JOB = 48;

export class WorkerPool {
  private workers: Worker[] = [];
  private idle: Worker[] = [];
  private running = false;
  private next = 0;
  private targetN = 0;
  private outstanding = 0;
  private disposed = false;
  private onResults: (r: RunResult[]) => void;
  private onDone: () => void;

  constructor(
    size: number, cfg: EnsembleConfig, targetMass: number,
    onResults: (r: RunResult[]) => void, onDone: () => void,
  ) {
    this.onResults = onResults;
    this.onDone = onDone;
    for (let i = 0; i < size; i++) {
      const w = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
      w.onmessage = (e) => this.onMsg(w, e.data);
      w.postMessage({ type: 'config', cfg, targetMass });
      this.workers.push(w);
    }
  }

  private onMsg(w: Worker, m: any) {
    if (this.disposed) return;
    if (m.type === 'ready') { this.idle.push(w); this.deal(); return; }
    if (m.type === 'results') {
      this.outstanding--;
      this.onResults(m.runs as RunResult[]);
      this.idle.push(w);
      this.deal();
    }
  }

  /** Run up to index `targetN`. Safe to call again to resume or raise the goal. */
  run(targetN: number) {
    this.targetN = targetN;
    this.running = true;
    this.deal();
  }

  pause() { this.running = false; }

  private deal() {
    if (this.disposed) return;
    while (this.running && this.idle.length && this.next < this.targetN) {
      const w = this.idle.pop()!;
      const count = Math.min(JOB, this.targetN - this.next);
      const start = this.next;
      this.next += count;
      this.outstanding++;
      w.postMessage({ type: 'job', start, count });
    }
    if (this.running && this.next >= this.targetN && this.outstanding === 0) {
      this.running = false;
      this.onDone();
    }
  }

  dispose() {
    this.disposed = true;
    this.running = false;
    for (const w of this.workers) w.terminate();
    this.workers = [];
    this.idle = [];
  }
}
