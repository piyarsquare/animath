/** Streaming aggregation of RunResults: outcome tallies, running mean ± stderr,
 *  histograms that sharpen as samples arrive, and a leaderboard of the longest
 *  stable eras. O(1) memory per stat — no run list retained. */

import type { Outcome, RunResult } from '../analysis/types';

export const OUTCOMES: Outcome[] = ['happy', 'survived', 'planet-ejected', 'planet-destroyed', 'blowup'];
export const HIST_BINS = 24;
const RECORD_COUNT = 10;

interface Welford { n: number; mean: number; m2: number; }
const newWelford = (): Welford => ({ n: 0, mean: 0, m2: 0 });
function pushWelford(w: Welford, x: number) {
  w.n++;
  const d = x - w.mean;
  w.mean += d / w.n;
  w.m2 += d * (x - w.mean);
}
const stderr = (w: Welford) => (w.n > 1 ? Math.sqrt(w.m2 / (w.n - 1)) / Math.sqrt(w.n) : 0);

function bin(v: number, lo: number, hi: number): number {
  const t = (v - lo) / (hi - lo || 1);
  return Math.min(HIST_BINS - 1, Math.max(0, Math.floor(t * HIST_BINS)));
}

export interface AggSnapshot {
  n: number;
  counts: Record<Outcome, number>;
  habMean: number;
  habStderr: number;
  longMean: number;
  longMax: number;
  histHab: number[];        // habitable fraction, [0,1]
  histLong: number[];       // longest stable era, [0, tMax]
  histEject: number[];      // time-to-ejection (happy runs), [0, tMax]
  histMax: { hab: number; long: number; eject: number }; // tallest bin per hist
  records: RunResult[];     // top RECORD_COUNT by longest stable era
  tMax: number;
}

export class Aggregator {
  private tMax: number;
  private n = 0;
  private counts = Object.fromEntries(OUTCOMES.map(o => [o, 0])) as Record<Outcome, number>;
  private hab = newWelford();
  private long = newWelford();
  private histHab = new Array(HIST_BINS).fill(0);
  private histLong = new Array(HIST_BINS).fill(0);
  private histEject = new Array(HIST_BINS).fill(0);
  private records: RunResult[] = [];

  constructor(tMax: number) { this.tMax = tMax; }

  ingest(r: RunResult) {
    this.n++;
    this.counts[r.outcome]++;
    pushWelford(this.hab, r.habitableFraction);
    pushWelford(this.long, r.longestHabitable);
    this.histHab[bin(r.habitableFraction, 0, 1)]++;
    this.histLong[bin(r.longestHabitable, 0, this.tMax)]++;
    if (r.tEject >= 0) this.histEject[bin(r.tEject, 0, this.tMax)]++;

    // Maintain the longest-stable-era leaderboard.
    const last = this.records[this.records.length - 1];
    if (this.records.length < RECORD_COUNT || r.longestHabitable > (last?.longestHabitable ?? -1)) {
      this.records.push(r);
      this.records.sort((a, b) => b.longestHabitable - a.longestHabitable);
      if (this.records.length > RECORD_COUNT) this.records.length = RECORD_COUNT;
    }
  }

  get count() { return this.n; }

  snapshot(): AggSnapshot {
    return {
      n: this.n,
      counts: { ...this.counts },
      habMean: this.hab.mean,
      habStderr: stderr(this.hab),
      longMean: this.long.mean,
      longMax: this.records[0]?.longestHabitable ?? 0,
      histHab: this.histHab.slice(),
      histLong: this.histLong.slice(),
      histEject: this.histEject.slice(),
      histMax: {
        hab: Math.max(1, ...this.histHab),
        long: Math.max(1, ...this.histLong),
        eject: Math.max(1, ...this.histEject),
      },
      records: this.records.slice(),
      tMax: this.tMax,
    };
  }
}
