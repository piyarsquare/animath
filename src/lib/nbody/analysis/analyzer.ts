/**
 * Streaming per-run analyzer. Fed sampled (time, stars, planet) states, it
 * classifies each instant on the climate (A) and dynamics (B) axes, accumulates
 * time in each bin, segments the timeline into eras, and detects the events that
 * resolve a run. It stores no full trajectory — just running totals plus a
 * compact segment/event list — so it scales to long runs and big ensembles.
 */

import type { Planet, Star } from '../integrator';
import { insolation, planetEnergy, minStarDist, climateOf } from './classify';
import { detectEjection, planetEscaped } from './events';
import type { Bin, ClassifyParams, LabEvent, PlanetFate, Segment, Snapshot } from './types';

const ZERO_BINS = (): Record<Bin, number> => ({ both: 0, climate: 0, dynamics: 0, neither: 0 });

export class Analyzer {
  private p: ClassifyParams;
  /** Reference insolation at launch (public for the sky view; retuning β
   *  re-measures it from the launch snapshot). */
  Sref: number;
  private Slo: number;
  private Shi: number;

  private total = 0;
  private binTime = ZERO_BINS();
  private habitableTime = 0;
  private minDistAll = Infinity;

  private segments: Segment[] = [];
  private events: LabEvent[] = [];
  private currentBin: Bin = 'neither';
  private segStart = 0;

  private longestHab = 0;
  private habRunStart: number | null = null;

  // Rolling window of orbital energy for the "calm" test.
  private wT: number[] = [];
  private wE: number[] = [];

  private ejectedStar = -1;
  private planetFate: PlanetFate = 'bound';

  private lastT = 0;
  private lastS = 0;
  private lastClimate: ReturnType<typeof climateOf> = 'habitable';
  private lastBound = true;
  private lastCalm = false;

  /** The launch configuration S_ref was measured from, kept so a β (lumExp)
   *  retune can re-measure the reference under the new law — "×launch light"
   *  must keep meaning the light at THIS launch, whatever β currently is. */
  private launchSnapshot: { stars: Star[]; planet: Planet } | null;

  constructor(params: ClassifyParams, stars: Star[], planet: Planet, Sref?: number) {
    this.p = params;
    this.Sref = Sref ?? insolation(planet, stars, params.lumExp, params.insolSoft2);
    // With an externally-supplied Sref we don't own the reference's meaning, so
    // never recompute it (retune keeps it fixed in that case).
    this.launchSnapshot = Sref !== undefined ? null : {
      stars: stars.map(s => ({ ...s })),
      planet: { ...planet },
    };
    this.Slo = this.Sref * params.habLo;
    this.Shi = this.Sref * params.habHi;
    // Seed the first sample so segment/era tracking starts cleanly.
    this.ingest(0, stars, planet, false);
  }

  /** Feed one sample. `t` is sim-time; dt is inferred from the previous sample. */
  push(t: number, stars: Star[], planet: Planet) {
    this.ingest(t, stars, planet, true);
  }

  /** Re-tune the classification knobs mid-run without restarting the timeline:
   *  moving a climate slider re-labels the future without wiping the past (or
   *  resetting the physics). If β (lumExp) changed, S_ref is re-measured from
   *  the stored launch configuration under the new law — otherwise the launch
   *  point would drift away from meaning exactly 1× launch light in
   *  unequal-mass systems. Accumulated bins/segments keep their old labels —
   *  the honest reading: they were classified under the rules of their time. */
  retune(params: ClassifyParams) {
    if (params.lumExp !== this.p.lumExp && this.launchSnapshot) {
      const { stars, planet } = this.launchSnapshot;
      this.Sref = insolation(planet, stars, params.lumExp, params.insolSoft2);
    }
    this.p = params;
    this.Slo = this.Sref * params.habLo;
    this.Shi = this.Sref * params.habHi;
  }

  private ingest(t: number, stars: Star[], planet: Planet, accumulate: boolean) {
    const dt = Math.max(0, t - this.lastT);
    const { lumExp, insolSoft2, calmWindow, calmThresh, rKill, rEsc } = this.p;

    const S = insolation(planet, stars, lumExp, insolSoft2);
    const climate = climateOf(S, this.Slo, this.Shi);
    const Ep = planetEnergy(planet, stars, insolSoft2);
    const bound = Ep < 0;
    const dmin = minStarDist(planet, stars);

    // Orbital-energy steadiness over the window ⇒ "calm" (no violent kicks).
    this.wT.push(t); this.wE.push(Ep);
    while (this.wT.length > 1 && t - this.wT[0] > calmWindow) { this.wT.shift(); this.wE.shift(); }
    const calm = bound && dmin > 2 * rKill && this.energyVariation() < calmThresh;

    const A = climate === 'habitable';
    const B = calm;
    const bin: Bin = A && B ? 'both' : A ? 'climate' : B ? 'dynamics' : 'neither';

    if (accumulate && dt > 0) {
      this.total += dt;
      this.binTime[this.currentBin] += dt;
      if (this.lastClimate === 'habitable') this.habitableTime += dt;
    }
    if (dmin < this.minDistAll) this.minDistAll = dmin;

    // Longest contiguous habitable (climate-A) stretch.
    if (A && this.habRunStart === null) this.habRunStart = t;
    if (!A && this.habRunStart !== null) {
      this.longestHab = Math.max(this.longestHab, t - this.habRunStart);
      this.habRunStart = null;
    }

    // Segment the timeline whenever the bin changes.
    if (bin !== this.currentBin) {
      this.segments.push({ t0: this.segStart, t1: t, bin: this.currentBin });
      this.segStart = t;
      this.currentBin = bin;
    }

    // Events (each fires at most once per run).
    if (this.ejectedStar < 0) {
      const ej = detectEjection(stars, rEsc);
      if (ej >= 0) {
        this.ejectedStar = ej;
        this.events.push({ t, kind: 'star-ejected', star: ej });
      }
    }
    if (this.planetFate === 'bound') {
      if (dmin < rKill) {
        this.planetFate = 'destroyed';
        this.events.push({ t, kind: 'planet-destroyed' });
      } else if (planetEscaped(planet, stars, rEsc, insolSoft2)) {
        this.planetFate = 'ejected';
        this.events.push({ t, kind: 'planet-ejected' });
      }
    }

    this.lastT = t;
    this.lastS = S;
    this.lastClimate = climate;
    this.lastBound = bound;
    this.lastCalm = calm;
  }

  /** Current planet fate, for cheap early-stop checks in the headless runner. */
  fateNow(): PlanetFate { return this.planetFate; }

  private energyVariation(): number {
    const n = this.wE.length;
    if (n < 3) return 0;
    let mean = 0;
    for (const e of this.wE) mean += e;
    mean /= n;
    let v = 0;
    for (const e of this.wE) v += (e - mean) * (e - mean);
    const std = Math.sqrt(v / n);
    return std / (Math.abs(mean) + 1e-6);
  }

  snapshot(): Snapshot {
    const total = this.total || 1e-9;
    const binFractions = ZERO_BINS();
    (Object.keys(this.binFractionsSource()) as Bin[]).forEach(b => {
      binFractions[b] = this.binTime[b] / total;
    });
    const longestHab = this.habRunStart !== null
      ? Math.max(this.longestHab, this.lastT - this.habRunStart)
      : this.longestHab;
    // Include the still-open current segment so the timeline reaches "now".
    const segments = this.segments.concat({ t0: this.segStart, t1: this.lastT, bin: this.currentBin });
    return {
      t: this.lastT,
      total: this.total,
      S: this.lastS,
      Sref: this.Sref,
      Slo: this.Slo,
      Shi: this.Shi,
      climate: this.lastClimate,
      bound: this.lastBound,
      calm: this.lastCalm,
      bin: this.currentBin,
      habitableFraction: this.habitableTime / total,
      bothFraction: this.binTime.both / total,
      binFractions,
      minStarDist: this.minDistAll,
      longestHabitable: longestHab,
      currentBin: this.currentBin,
      currentBinDur: this.lastT - this.segStart,
      ejectedStar: this.ejectedStar,
      planetFate: this.planetFate,
      segments,
      events: this.events,
    };
  }

  private binFractionsSource() { return this.binTime; }
}
