/** A pool of basin workers fed a queue of pixel-range jobs. Streams completed
 *  blocks back to the main thread for incremental painting. */

import type { BasinConfig } from './basin';
import type { EnsembleConfig } from './rng';

export interface BasinBlockMsg { start: number; count: number; rgb: Uint8Array; out: Uint8Array; t: Float32Array; }

export class BasinPool {
  private workers: Worker[] = [];
  private idle: Worker[] = [];
  private cfg!: EnsembleConfig;
  private bc!: BasinConfig;
  private next = 0;
  private total = 0;
  private job = 0;
  private outstanding = 0;
  private disposed = false;
  private onBlock: (b: BasinBlockMsg) => void;
  private onDone: () => void;

  constructor(size: number, onBlock: (b: BasinBlockMsg) => void, onDone: () => void) {
    this.onBlock = onBlock;
    this.onDone = onDone;
    for (let i = 0; i < size; i++) {
      const w = new Worker(new URL('./basinWorker.ts', import.meta.url), { type: 'module' });
      w.onmessage = (e) => this.onMsg(w, e.data);
      this.workers.push(w);
      this.idle.push(w);
    }
  }

  private onMsg(w: Worker, m: BasinBlockMsg) {
    if (this.disposed) return;
    this.outstanding--;
    this.onBlock(m);
    this.idle.push(w);
    this.deal();
  }

  run(cfg: EnsembleConfig, bc: BasinConfig) {
    this.cfg = cfg; this.bc = bc;
    this.total = bc.res * bc.res;
    this.job = Math.max(bc.res * 2, 256); // a few rows per job
    this.next = 0;
    this.deal();
  }

  private deal() {
    if (this.disposed) return;
    while (this.idle.length && this.next < this.total) {
      const w = this.idle.pop()!;
      const count = Math.min(this.job, this.total - this.next);
      const start = this.next;
      this.next += count;
      this.outstanding++;
      w.postMessage({ cfg: this.cfg, bc: this.bc, start, count });
    }
    if (this.next >= this.total && this.outstanding === 0) this.onDone();
  }

  dispose() {
    this.disposed = true;
    for (const w of this.workers) w.terminate();
    this.workers = []; this.idle = [];
  }
}
