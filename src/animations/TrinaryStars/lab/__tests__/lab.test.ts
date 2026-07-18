import { describe, it, expect } from 'vitest';
import { Aggregator, OUTCOMES, HIST_BINS } from '../ensemble';
import { mulberry32, runSeed, sampleParams, type EnsembleConfig } from '../rng';
import { runOne, runPlanet, runPlanetLyap, runBatchFate, runBatchLyap, targetMassOf } from '../runner';
import { buildStars, getScenario, launchPlanet, DEFAULT_CLASSIFY, type RunResult, type Planet } from '@/lib/nbody';

/** A small, fast ensemble config over the figure-eight. */
function cfg(over: Partial<EnsembleConfig> = {}): EnsembleConfig {
  return {
    presetId: 'figure8', target: 'bary', massMul: [1, 1, 1], starSoft: 0.01,
    classify: DEFAULT_CLASSIFY, tMax: 30,
    rMin: 1.0, rMax: 4.0, fMin: 0.5, fMax: 1.2, allowRetro: true,
    baseSeed: 123456789,
    ...over,
  };
}

function fakeResult(over: Partial<RunResult>): RunResult {
  return {
    tSim: 30, outcome: 'survived', habitableFraction: 0.5, bothFraction: 0.2,
    longestHabitable: 10, minStarDist: 1, ejectedStar: -1, tEject: -1,
    planetFate: 'bound', radius: 2, speed: 1, angleDeg: 0, retro: false, seed: 0,
    ...over,
  };
}

describe('rng / sampling', () => {
  it('mulberry32 is deterministic and uniform-ish in [0,1)', () => {
    const a = mulberry32(42), b = mulberry32(42);
    const seqA = Array.from({ length: 100 }, () => a());
    const seqB = Array.from({ length: 100 }, () => b());
    expect(seqA).toEqual(seqB);
    for (const v of seqA) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThan(1); }
    const mean = seqA.reduce((s, v) => s + v, 0) / seqA.length;
    expect(mean).toBeGreaterThan(0.35);
    expect(mean).toBeLessThan(0.65);
  });

  it('sampleParams is reproducible from (baseSeed, index) and respects every range', () => {
    const c = cfg();
    const M = targetMassOf(c);
    for (let i = 0; i < 200; i++) {
      const p1 = sampleParams(c, i, M);
      const p2 = sampleParams(c, i, M);
      expect(p1).toEqual(p2); // the UI's shareable-world claim
      expect(p1.radius).toBeGreaterThanOrEqual(c.rMin);
      expect(p1.radius).toBeLessThanOrEqual(c.rMax);
      const vcirc = Math.sqrt(M / Math.max(0.05, p1.radius));
      const f = p1.speed / vcirc;
      expect(f).toBeGreaterThanOrEqual(c.fMin - 1e-12);
      expect(f).toBeLessThanOrEqual(c.fMax + 1e-12);
      expect(p1.angleDeg).toBeGreaterThanOrEqual(0);
      expect(p1.angleDeg).toBeLessThan(360);
      expect(p1.seed).toBe(runSeed(c.baseSeed, i));
    }
  });

  it('retro launches never occur when allowRetro is off, and do occur when on', () => {
    const off = cfg({ allowRetro: false });
    const on = cfg({ allowRetro: true });
    const M = targetMassOf(off);
    let retros = 0;
    for (let i = 0; i < 100; i++) {
      expect(sampleParams(off, i, M).retro).toBe(false);
      if (sampleParams(on, i, M).retro) retros++;
    }
    expect(retros).toBeGreaterThan(20); // ~50% expected
    expect(retros).toBeLessThan(80);
  });
});

describe('Aggregator', () => {
  it('matches brute-force mean and sample standard error', () => {
    const agg = new Aggregator(100);
    const xs = [0.1, 0.5, 0.9, 0.3, 0.7, 0.2, 0.8, 0.4];
    for (const x of xs) agg.ingest(fakeResult({ habitableFraction: x }));
    const s = agg.snapshot();
    const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
    const varS = xs.reduce((a, b) => a + (b - mean) ** 2, 0) / (xs.length - 1);
    const stderr = Math.sqrt(varS / xs.length);
    expect(s.n).toBe(xs.length);
    expect(s.habMean).toBeCloseTo(mean, 12);
    expect(s.habStderr).toBeCloseTo(stderr, 12);
  });

  it('tallies outcomes, clamps histogram bins, and keeps a correct top-10 leaderboard', () => {
    const agg = new Aggregator(100);
    // Out-of-range values must clamp into the first/last bin, not vanish.
    agg.ingest(fakeResult({ habitableFraction: 0, longestHabitable: 0 }));
    agg.ingest(fakeResult({ habitableFraction: 1, longestHabitable: 250 })); // > tMax
    for (let i = 0; i < 15; i++) agg.ingest(fakeResult({ longestHabitable: i, outcome: 'happy', tEject: 10 }));
    const s = agg.snapshot();
    expect(s.counts.happy).toBe(15);
    expect(s.counts.survived).toBe(2);
    expect(s.histHab.reduce((a, b) => a + b, 0)).toBe(17);
    expect(s.histHab.length).toBe(HIST_BINS);
    expect(s.histEject.reduce((a, b) => a + b, 0)).toBe(15); // only tEject >= 0
    // Leaderboard: exactly 10 records, sorted descending, topped by the 250 run.
    expect(s.records.length).toBe(10);
    expect(s.longMax).toBe(250);
    for (let i = 1; i < s.records.length; i++) {
      expect(s.records[i].longestHabitable).toBeLessThanOrEqual(s.records[i - 1].longestHabitable);
    }
    expect(OUTCOMES).toContain('blowup');
  });
});

describe('runner', () => {
  it('runOne is deterministic: same config + params → identical RunResult', () => {
    const c = cfg({ tMax: 20 });
    const p = sampleParams(c, 7, targetMassOf(c));
    const a = runOne(c, p);
    const b = runOne(c, p);
    expect(a).toEqual(b);
  });

  it('classifies a plunging launch as planet-destroyed', () => {
    const c = cfg({ tMax: 20 });
    const r = runOne(c, { radius: 1.2, speed: 0, angleDeg: 0, retro: false, seed: 1 });
    expect(r.outcome).toBe('planet-destroyed');
    expect(r.planetFate).toBe('destroyed');
    expect(r.minStarDist).toBeLessThan(DEFAULT_CLASSIFY.rKill);
    expect(r.tSim).toBeLessThan(20);
  });

  it('classifies the edge-tuned default as bound through a short budget', () => {
    const c = cfg({ tMax: 30 });
    const r = runOne(c, { radius: 3.2, speed: 0.95, angleDeg: 0, retro: false, seed: 1 });
    expect(r.outcome).toBe('survived');
    expect(r.habitableFraction).toBeGreaterThan(0.5);
  });

  it('runBatchFate is result-identical to running each planet alone (the bit-identical claim)', () => {
    const c = cfg({ tMax: 25 });
    const mkPlanets = (): Planet[] => {
      const stars = buildStars(getScenario(c.presetId), c.massMul);
      return [
        { ...launchPlanet(stars, 'bary', 3.2, 0.95), alive: true },  // long-lived
        { ...launchPlanet(stars, 'bary', 1.2, 0.0), alive: true },   // destroyed early
        { ...launchPlanet(stars, 'bary', 2.5, 2.2), alive: true },   // flung out fast
      ];
    };
    // Batch: one shared star integration.
    const starsB = buildStars(getScenario(c.presetId), c.massMul);
    const batch = runBatchFate(c, starsB, mkPlanets());
    // Solo: fresh stars per planet.
    const solos = mkPlanets().map(p => {
      const stars = buildStars(getScenario(c.presetId), c.massMul);
      return runPlanet(c, stars, { ...p });
    });
    expect(batch.length).toBe(solos.length);
    // The runner's own claim is "bit-identical to running each planet alone" —
    // hold it to exact equality, not a tolerance.
    for (let k = 0; k < solos.length; k++) {
      expect(batch[k]).toEqual(solos[k]);
    }
  });

  it('runBatchLyap matches runPlanetLyap per planet', () => {
    const c = cfg({ tMax: 15 });
    const mk = (): Planet[] => {
      const stars = buildStars(getScenario(c.presetId), c.massMul);
      return [
        { ...launchPlanet(stars, 'bary', 3.2, 0.95), alive: true },
        { ...launchPlanet(stars, 'bary', 2.0, 1.0), alive: true },
      ];
    };
    const batch = runBatchLyap(c, buildStars(getScenario(c.presetId), c.massMul), mk());
    const solos = mk().map(p => runPlanetLyap(c, buildStars(getScenario(c.presetId), c.massMul), { ...p }));
    for (let k = 0; k < solos.length; k++) {
      expect(batch[k].outcome).toBe(solos[k].outcome);
      expect(batch[k].lambda).toBe(solos[k].lambda); // bit-identical claim
    }
  });
});
