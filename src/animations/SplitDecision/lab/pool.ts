/** A pool of sweep workers fed one job at a time (each job is one whole run, tens
 *  of milliseconds), streaming results back so the curves fill in as they arrive.
 *  Falls back to the main thread in yielding chunks when Workers are unavailable. */

import { jobCount, runJob, type JobResult, type SweepConfig } from './sweep';
import type { FromWorker, ToWorker } from './worker';

export const HAS_WORKERS = typeof Worker !== 'undefined';

export function poolSize(): number {
  const hc = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4;
  return Math.min(8, Math.max(2, hc - 1));
}

export class SweepPool {
  private workers: Worker[] = [];
  private idle: Worker[] = [];
  private next = 0;
  private total: number;
  private outstanding = 0;
  private running = false;
  private disposed = false;
  private fallbackTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private cfg: SweepConfig,
    private onResult: (r: JobResult) => void,
    private onDone: () => void,
    size = poolSize(),
  ) {
    this.total = jobCount(cfg);
    if (!HAS_WORKERS) return;
    for (let k = 0; k < Math.min(size, this.total); k++) {
      const w = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
      w.onmessage = (e: MessageEvent<FromWorker>) => this.onMsg(w, e.data);
      const msg: ToWorker = { type: 'config', cfg: this.cfg };
      w.postMessage(msg);
      this.workers.push(w);
    }
  }

  get done(): number { return this.next - this.outstanding; }
  get count(): number { return this.total; }

  start() {
    if (this.disposed) return;
    this.running = true;
    if (HAS_WORKERS) this.deal(); else this.fallbackTick();
  }

  stop() {
    this.running = false;
    if (this.fallbackTimer) { clearTimeout(this.fallbackTimer); this.fallbackTimer = null; }
  }

  dispose() {
    this.stop();
    this.disposed = true;
    for (const w of this.workers) w.terminate();
    this.workers = [];
    this.idle = [];
  }

  private onMsg(w: Worker, m: FromWorker) {
    if (this.disposed) return;
    if (m.type === 'ready') { this.idle.push(w); this.deal(); return; }
    this.outstanding--;
    this.onResult(m.result);
    this.idle.push(w);
    this.deal();
  }

  private deal() {
    if (this.disposed) return;
    while (this.running && this.idle.length && this.next < this.total) {
      const w = this.idle.pop()!;
      const msg: ToWorker = { type: 'job', i: this.next++ };
      this.outstanding++;
      w.postMessage(msg);
    }
    if (this.running && this.next >= this.total && this.outstanding === 0) this.finish();
  }

  /** Normal completion terminates the workers too; the pool is single-use. */
  private finish() {
    this.running = false;
    this.dispose();
    this.onDone();
  }

  private fallbackTick() {
    if (!this.running || this.disposed) return;
    if (this.next >= this.total) { this.finish(); return; }
    this.onResult(runJob(this.cfg, this.next++));
    this.fallbackTimer = setTimeout(() => this.fallbackTick(), 0);
  }
}
