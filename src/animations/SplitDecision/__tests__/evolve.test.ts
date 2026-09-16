import { describe, it, expect } from 'vitest';
import matrixSrc from '../matrix.ts?raw';
import scoresSrc from '../scores.ts?raw';
import evolveSrc from '../evolve.ts?raw';
import sweepSrc from '../lab/sweep.ts?raw';
import { mulberry32, runSeed } from '@/lib/rng';
import { degrees, fixtureById, planted, PAGE50_TRAP_CUT, type Cut } from '../matrix';
import { SCORES, exactOptimum, evaluate } from '../scores';
import {
  DEFAULT_CONFIG, RULES, RULE_IDS, ReachTracker,
  tournament, uniformCrossover, mutate, reflect, sexQuota, roundedCut, samplePhenotype,
  initPopulation, populationAtCut, step, run, genStats, populationHash, makeRng, canonicalizeTo,
  type EvolveConfig, type Individual, type RuleId, type FitnessMode,
} from '../evolve';
import { decodeJob, encodeJob, jobCount, evaluationCount, runJob, summarize, reachedByGeneration, medianReached, type SweepConfig } from '../lab/sweep';

const cfgWith = (over: Partial<EvolveConfig>): EvolveConfig => ({ ...DEFAULT_CONFIG, ...over });
const complete = () => { const f = fixtureById('complete-8x10')!; return { M: f.matrix, d: degrees(f.matrix), planted: f.planted as Cut }; };

describe('operators', () => {
  it('the Prom passes the row parent\'s p and the column parent\'s q intact, as copies', () => {
    const row: Individual = { p: [0.1, 0.9, 0.3], q: [0.5, 0.5], sex: 'row', fit: 0, cut: { z: [], w: [] } };
    const col: Individual = { p: [0.7, 0.7, 0.7], q: [0.2, 0.8], sex: 'col', fit: 0, cut: { z: [], w: [] } };
    const g = RULES.prom.mate([row, col], mulberry32(1));
    expect(g.p).toEqual(row.p);
    expect(g.q).toEqual(col.q);
    expect(g.p).not.toBe(row.p);
    expect(RULES.prom.mutationMask('row')).toEqual({ p: true, q: false });
    expect(RULES.prom.mutationMask('col')).toEqual({ p: false, q: true });
  });
  it('the Monastery clones; the Mixer takes every locus from one parent or the other', () => {
    const a = { p: [0, 0, 0], q: [0, 0] }, b = { p: [1, 1, 1], q: [1, 1] };
    expect(RULES.clonal.mate([a as Individual], mulberry32(1))).toEqual(a);
    const child = uniformCrossover(a, b, mulberry32(3));
    child.p.forEach(v => expect([0, 1]).toContain(v));
    child.q.forEach(v => expect([0, 1]).toContain(v));
  });
  it('mutation respects the mask and reflects into [0, 1]', () => {
    const g = { p: [0.5, 0.5, 0.5, 0.5], q: [0.5, 0.5, 0.5, 0.5] };
    const m = mutate(g, { p: true, q: false }, 1, 0.3, mulberry32(9));
    expect(m.q).toEqual(g.q);
    expect(m.p.some(v => v !== 0.5)).toBe(true);
    m.p.forEach(v => { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(1); });
    expect(reflect(-0.2)).toBeCloseTo(0.2, 12);
    expect(reflect(1.3)).toBeCloseTo(0.7, 12);
    expect(reflect(2.5)).toBeCloseTo(0.5, 12);
    expect(reflect(0.4)).toBe(0.4);
  });
  it('tournament draws exactly k times and returns the fittest of the draws', () => {
    const pop: Individual[] = [0, 1, 2, 3].map(f => ({ p: [], q: [], sex: 'row', fit: f, cut: { z: [], w: [] } }));
    let draws = 0;
    const rng = () => { draws++; return 0.999; }; // always the last candidate
    expect(tournament(pop, [0, 1, 2, 3], 3, rng).fit).toBe(3);
    expect(draws).toBe(3);
    expect(tournament(pop, [0, 1], 2, () => 0).fit).toBe(0);
  });
  it('the sex quota is exact and both sexes always exist', () => {
    const q = sexQuota(64, 0.5, mulberry32(1));
    expect(q.filter(s => s === 'row').length).toBe(32);
    expect(sexQuota(10, 0.05, mulberry32(1)).filter(s => s === 'row').length).toBe(1);
    expect(sexQuota(10, 0.99, mulberry32(1)).filter(s => s === 'row').length).toBe(9);
  });
  it('rounded and sampled phenotypes', () => {
    expect(roundedCut({ p: [0.2, 0.5, 0.51], q: [1, 0] })).toEqual({ z: [0, 0, 1], w: [1, 0] });
    const c = samplePhenotype({ p: [0, 1, 0.5], q: [1] }, mulberry32(4));
    expect(c.z[0]).toBe(0); expect(c.z[1]).toBe(1); expect(c.w[0]).toBe(1);
  });
  it('canonicalization picks the labeling closest to the reference', () => {
    const ref = { p: [1, 1, 0, 0], q: [1, 0] };
    const g = { p: [0, 0, 1, 1], q: [0, 1] };
    expect(canonicalizeTo(ref, g, false)).toEqual({ genome: ref, flipped: true });
    const twin = { p: [1, 1, 0, 0], q: [0, 1] };
    expect(canonicalizeTo(ref, twin, false).flipped).toBe(false);
    expect(canonicalizeTo(ref, twin, true)).toEqual({ genome: ref, flipped: true });
  });
});

describe('the engine is a pure function of its seed', () => {
  it('no Math.random in the engine sources', () => {
    for (const src of [matrixSrc, scoresSrc, evolveSrc, sweepSrc]) expect(src).not.toMatch(/Math\.random/);
  });
  it('identical trajectories from identical configs, for every rule and fitness mode', () => {
    const { M, d } = complete();
    for (const rule of RULE_IDS) for (const fitness of ['sampled', 'rounded'] as FitnessMode[]) {
      const cfg = cfgWith({ rule, fitness, N: 24, seed: 11 });
      const a = run(M, d, cfg, 50).pop, b = run(M, d, cfg, 50).pop;
      expect(populationHash(a)).toBe(populationHash(b));
      expect(populationHash(run(M, d, { ...cfg, seed: 12 }, 50).pop)).not.toBe(populationHash(a));
    }
  });
  it('runSeed is injective over 10⁴ indices for several bases', () => {
    for (const base of [0, 1, 12345, 0xdeadbeef]) {
      const seen = new Set<number>();
      for (let i = 0; i < 10000; i++) seen.add(runSeed(base, i));
      expect(seen.size).toBe(10000);
    }
  });
  it('step preserves N, evaluates every child, and every genome stays in [0, 1]', () => {
    const { M, d } = complete();
    for (const rule of RULE_IDS) {
      const cfg = cfgWith({ rule, N: 16, seed: 3 });
      const rng = makeRng(cfg);
      const pop = step(initPopulation(M, d, cfg, rng), M, d, cfg, rng);
      expect(pop.length).toBe(16);
      for (const ind of pop) {
        expect(Number.isFinite(ind.fit)).toBe(true);
        [...ind.p, ...ind.q].forEach(v => { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(1); });
        expect(ind.fit).toBeCloseTo(evaluate(M, d, SCORES[cfg.scoreId], ind.cut), 12);
      }
    }
  });
});

describe('convergence on a perfect planted signal (seed batch)', () => {
  const inst = planted({ m: 8, n: 10, r1: 4, c1: 5, rhoIn: 1, rhoOut: 0 }, 42);
  const M = inst.matrix, d = degrees(M);
  const optimum = exactOptimum(M, d, SCORES.bernoulli)!.score;
  const seeds = 12, gMax = 300;
  const reachedCount = (rule: RuleId) => {
    let reached = 0;
    for (let s = 0; s < seeds; s++) {
      const cfg = cfgWith({ rule, scoreId: 'bernoulli', N: 64, seed: runSeed(1000, s) });
      const tracker = new ReachTracker(optimum, 5);
      const rng = makeRng(cfg);
      let pop = initPopulation(M, d, cfg, rng);
      tracker.update(0, genStats(pop, 0, M, d, cfg).bestRoundedFit);
      for (let g = 1; g <= gMax && tracker.reachedAt === null; g++) {
        pop = step(pop, M, d, cfg, rng);
        tracker.update(g, genStats(pop, g, M, d, cfg).bestRoundedFit);
      }
      if (tracker.reachedAt !== null) reached++;
    }
    return reached;
  };
  it('the Mixer and the Monastery reach a sustained rounded optimum on at least 10 of 12 seeds by generation 300', () => {
    expect(reachedCount('mixer')).toBeGreaterThanOrEqual(10);
    expect(reachedCount('clonal')).toBeGreaterThanOrEqual(10);
  });
  it('the Prom reaches it on at least some seeds (it is the slowest rule; see the pedagogy review)', () => {
    expect(reachedCount('prom')).toBeGreaterThanOrEqual(1);
  });
});

describe('canalization (the genome makes up its mind)', () => {
  const inst = planted({ m: 10, n: 10, r1: 5, c1: 5, rhoIn: 1, rhoOut: 0 }, 7);
  const M = inst.matrix, d = degrees(M);
  const entropyAt = (gen: number, over: Partial<EvolveConfig>, seeds = 8) => {
    const vals: number[] = [];
    for (let s = 0; s < seeds; s++) vals.push(run(M, d, cfgWith({ rule: 'clonal', scoreId: 'edgeCount', N: 64, ...over, seed: runSeed(500, s) }), gen).history[gen].meanEntropy);
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const sd = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length);
    return { mean, sd };
  };
  it('under neutral selection (k = 1) with reflecting mutation the entropy curve stays flat', () => {
    const e0 = entropyAt(0, { selection: { kind: 'tournament', k: 1 } });
    const e100 = entropyAt(100, { selection: { kind: 'tournament', k: 1 } });
    expect(e0.mean).toBeCloseTo(1 / (2 * Math.LN2), 1); // uniform genotypes: mean H = 1/(2 ln 2) ≈ 0.72 bits
    expect(Math.abs(e100.mean - e0.mean)).toBeLessThan(0.06);
  });
  it('under Sampled fitness (k = 2) the entropy falls below the neutral curve by more than the seed spread', () => {
    const neutral = entropyAt(100, { selection: { kind: 'tournament', k: 1 } });
    const sampled = entropyAt(100, { selection: { kind: 'tournament', k: 2 }, fitness: 'sampled' });
    expect(neutral.mean - sampled.mean).toBeGreaterThan(2 * Math.max(neutral.sd, sampled.sd));
  });
});

describe('ReachTracker and trap seeding', () => {
  it('reports the first generation of a sustained run at the optimum', () => {
    const t = new ReachTracker(1, 3);
    expect(t.update(0, 0.5)).toBeNull();
    expect(t.update(1, 1)).toBeNull();
    expect(t.update(2, 1)).toBeNull();
    expect(t.update(3, 0.9)).toBeNull();   // streak broken
    expect(t.update(4, 1)).toBeNull();
    expect(t.update(5, 1)).toBeNull();
    expect(t.update(6, 1)).toBe(4);
    expect(t.update(7, 0)).toBe(4);        // sticky
    expect(new ReachTracker(null).update(1, 5)).toBeNull();
  });
  it('a population seeded at the page-50 trap starts with every rounded cut equal to it', () => {
    const f = fixtureById('page50-4x4')!; const M = f.matrix, d = degrees(M);
    const cfg = cfgWith({ scoreId: 'modularity', N: 8, seed: 1 });
    const pop = populationAtCut(PAGE50_TRAP_CUT, M, d, cfg, makeRng(cfg));
    for (const ind of pop) expect(roundedCut(ind)).toEqual(PAGE50_TRAP_CUT);
  });
});

describe('the sweep', () => {
  const sweep: SweepConfig = {
    engine: 1,
    base: { engine: 1, scoreId: 'bernoulli', fitness: 'sampled', samplesPerEval: 1, N: 16, selection: { kind: 'tournament', k: 2 }, mu: 0.1, sigma: 0.1, sexRatio: 0.5 },
    instance: { kind: 'planted', m: 6, n: 6, r1: 3, c1: 3 }, signals: [0.2, 1], rules: ['clonal', 'mixer', 'prom'], seeds: 3, baseSeed: 9, matrixSeed: 3, gMax: 40, sustain: 3,
  };
  it('job index ↔ (signal, rule, seed) is a bijection', () => {
    expect(jobCount(sweep)).toBe(18);
    for (let i = 0; i < jobCount(sweep); i++) { const { signalIdx, ruleIdx, seedIdx } = decodeJob(sweep, i); expect(encodeJob(sweep, signalIdx, ruleIdx, seedIdx)).toBe(i); }
    expect(evaluationCount(sweep)).toBe(18 * 40 * 16);
  });
  it('runJob returns a consistent result and is deterministic', () => {
    const a = runJob(sweep, 5), b = runJob(sweep, 5);
    expect(a).toEqual(b);
    expect(a.optimum).not.toBeNull();
    expect(a.gens).toBeLessThanOrEqual(40);
    if (a.reachedAt !== null) expect(a.finalBestRounded).toBeCloseTo(a.optimum as number, 9);
  });
  it('the Escape-the-trap preset starts every run at the trap and can only leave it for the global optimum', () => {
    const trap: SweepConfig = { ...sweep, base: { ...sweep.base, scoreId: 'modularity', N: 32 }, instance: { kind: 'fixture', id: 'page50-4x4', startAt: PAGE50_TRAP_CUT }, signals: [0], seeds: 2, gMax: 60 };
    expect(jobCount(trap)).toBe(6);
    const r = runJob(trap, 0);
    expect(r.startScore).toBeCloseTo(0.1728, 3);
    expect(r.optimum).toBeCloseTo(0.2715, 3);
    expect(r.plantedScore).toBeNull();
    if (r.reachedAt !== null) expect(r.finalBestRounded).toBeCloseTo(0.2715, 3);
  });
  it('summarize groups by cell and the reached-by-generation curve is monotone in [0, 1]', () => {
    const rows = Array.from({ length: jobCount(sweep) }, (_, i) => runJob(sweep, i));
    const cells = summarize(sweep, rows);
    expect(cells.length).toBe(6);
    for (const c of cells) {
      expect(c.n).toBe(3);
      expect(c.reached.length + c.censored).toBe(3);
      const curve = reachedByGeneration(c, sweep.gMax, 10);
      for (let k = 1; k < curve.length; k++) expect(curve[k].frac).toBeGreaterThanOrEqual(curve[k - 1].frac);
      expect(curve[curve.length - 1].frac).toBeCloseTo(c.reached.length / 3, 12);
      const med = medianReached(c);
      if (c.reached.length * 2 > c.n) expect(med).toBe(c.reached[Math.floor(c.reached.length / 2)]); else expect(med).toBeNull();
    }
  });
});
