/**
 * Split Decision — the population and its reproductive rules (the Worlds).
 *
 * A genotype is (p ∈ [0,1]^m, q ∈ [0,1]^n): the probability of putting each row in R₁
 * and each column in C₁. A phenotype is one sampled cut. Fitness is the selected
 * score of that cut.
 *
 * The engine is an operator model: `tournament` (select), each rule's `mate`,
 * `mutate`, and `evaluateIndividual` are pure functions of their inputs and an RNG;
 * `step` is a loop over them. The three Worlds are rows of `RULES`.
 *
 * RNG DRAW ORDER (a change here bumps ENGINE_VERSION):
 *   init:  for each individual in index order: p₀..p_{m−1}, q₀..q_{n−1};
 *          then the sex quota shuffle (Fisher–Yates, N−1 draws); then evaluation in
 *          index order (sampled fitness: m + n Bernoulli draws per individual).
 *   step:  the sex quota shuffle; then for each child slot in index order:
 *          parent selection (exactly k draws per tournament; two tournaments for
 *          'two' and 'sexed'), mate (the Mixer draws m + n coin flips), mutate
 *          (per locus in p then q order: one draw for "mutate?", then two draws for
 *          the Gaussian step if so); then evaluation of the children in index order.
 */

import { mulberry32, type Rng } from '@/lib/rng';
import { blockTable, isDegenerate, type BinaryMatrix, type Cut, type Degrees } from './matrix';
import { SCORES, evaluate, type ScoreId } from './scores';

export const ENGINE_VERSION = 1;

export type Sex = 'row' | 'col';
export type RuleId = 'clonal' | 'mixer' | 'prom';
export type FitnessMode = 'sampled' | 'rounded';

export interface Genome { p: number[]; q: number[] }

export interface Individual extends Genome {
  sex: Sex;
  /** Fitness of `cut` under the configured score. */
  fit: number;
  /** The phenotype that earned `fit` (sampled, or the rounded genome). */
  cut: Cut;
}

export interface EvolveConfig {
  engine: number;
  scoreId: ScoreId;
  fitness: FitnessMode;
  /** Phenotypes sampled per evaluation. Fixed at 1 (the canalization mechanism). */
  samplesPerEval: 1;
  rule: RuleId;
  /** Population size. */
  N: number;
  selection: { kind: 'tournament'; k: number };
  /** Per-locus mutation probability and Gaussian step (reflected into [0, 1]). */
  mu: number;
  sigma: number;
  /** Fraction of each generation born row-sex (a seeded quota, never a coin). */
  sexRatio: number;
  seed: number;
}

export const DEFAULT_CONFIG: EvolveConfig = {
  engine: ENGINE_VERSION,
  scoreId: 'bernoulli',
  fitness: 'sampled',
  samplesPerEval: 1,
  rule: 'mixer',
  N: 128,
  selection: { kind: 'tournament', k: 3 },
  mu: 0.1,
  sigma: 0.1,
  sexRatio: 0.5,
  seed: 1,
};

/* ── operators ── */

/** One standard normal draw (Box–Muller, two uniforms, the sine half discarded). */
export function randn(rng: Rng): number {
  const u1 = 1 - rng(); // (0, 1]
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/** Tournament selection over `candidates` (indices into pop): exactly k draws, the
 *  fittest wins, ties to the earliest drawn. */
export function tournament(pop: Individual[], candidates: number[], k: number, rng: Rng): Individual {
  let best = pop[candidates[Math.floor(rng() * candidates.length)]];
  for (let t = 1; t < k; t++) {
    const c = pop[candidates[Math.floor(rng() * candidates.length)]];
    if (c.fit > best.fit) best = c;
  }
  return best;
}

/** Uniform crossover per locus over the whole genome (m + n coin flips). */
export function uniformCrossover(a: Genome, b: Genome, rng: Rng): Genome {
  return {
    p: a.p.map((v, i) => (rng() < 0.5 ? v : b.p[i])),
    q: a.q.map((v, j) => (rng() < 0.5 ? v : b.q[j])),
  };
}

/** Reflect a value into [0, 1]. */
export function reflect(v: number): number {
  for (let guard = 0; guard < 64 && (v < 0 || v > 1); guard++) v = v < 0 ? -v : 2 - v;
  return Math.min(1, Math.max(0, v));
}

/** Per-locus Gaussian mutation with reflection. `mask` says which half may mutate. */
export function mutate(g: Genome, mask: { p: boolean; q: boolean }, mu: number, sigma: number, rng: Rng): Genome {
  const one = (v: number) => (rng() < mu ? reflect(v + sigma * randn(rng)) : v);
  return {
    p: mask.p ? g.p.map(one) : g.p.slice(),
    q: mask.q ? g.q.map(one) : g.q.slice(),
  };
}

/** One sampled phenotype: z_i ~ Bernoulli(p_i), w_j ~ Bernoulli(q_j). */
export function samplePhenotype(g: Genome, rng: Rng): Cut {
  return { z: g.p.map(v => (rng() < v ? 1 : 0)), w: g.q.map(v => (rng() < v ? 1 : 0)) };
}

/** The rounded genome: z_i = [p_i > ½]. */
export function roundedCut(g: Genome): Cut {
  return { z: g.p.map(v => (v > 0.5 ? 1 : 0)), w: g.q.map(v => (v > 0.5 ? 1 : 0)) };
}

export function evaluateIndividual(g: Genome, sex: Sex, M: BinaryMatrix, d: Degrees, cfg: EvolveConfig, rng: Rng): Individual {
  const cut = cfg.fitness === 'sampled' ? samplePhenotype(g, rng) : roundedCut(g);
  const fit = evaluate(M, d, SCORES[cfg.scoreId], cut);
  return { p: g.p, q: g.q, sex, fit, cut };
}

/* ── the Worlds ── */

export interface Rule {
  id: RuleId;
  name: string;
  history: string;
  blurb: string;
  /** How parents are chosen for one child: one tournament, two, or one per sex. */
  parents: 'one' | 'two' | 'sexed';
  /** Pure recombination; no mutation here. For 'sexed', parents = [rowParent, colParent]. */
  mate(parents: Individual[], rng: Rng): Genome;
  /** Which half a child of the given sex mutates. */
  mutationMask(childSex: Sex): { p: boolean; q: boolean };
}

export const RULES: Record<RuleId, Rule> = {
  clonal: {
    id: 'clonal', name: "Muller's Monastery",
    history: 'clonal reproduction (Muller 1932 on why sex speeds adaptation; Muller 1964, the ratchet)',
    blurb: 'No sex. One parent, copied, then mutated — the only rule whose lineage can move a row entry and a column entry together in one step.',
    parents: 'one',
    mate: ([a]) => ({ p: a.p.slice(), q: a.q.slice() }),
    mutationMask: () => ({ p: true, q: true }),
  },
  mixer: {
    id: 'mixer', name: 'Hardy–Weinberg Mixer',
    history: 'random mating (Hardy 1908; Weinberg 1908); free recombination to linkage equilibrium (Geiringer 1944); the multiplicative-weights reading of sex (Chastain, Livnat, Papadimitriou & Vazirani 2014)',
    blurb: 'Two parents; every locus is a coin flip between them, rows and columns alike.',
    parents: 'two',
    mate: ([a, b], rng) => uniformCrossover(a, b, rng),
    mutationMask: () => ({ p: true, q: true }),
  },
  prom: {
    id: 'prom', name: 'Potter–De Jong Prom',
    history: 'a variant of cooperative coevolution (Potter & De Jong 1994): two sexes, each transmitting one half of the genome intact',
    blurb: 'Row-sex parents pass on the rows, column-sex parents the columns, both intact. A child mutates only the half it will transmit; the other half is a passenger.',
    parents: 'sexed',
    mate: ([row, col]) => ({ p: row.p.slice(), q: col.q.slice() }),
    mutationMask: sex => (sex === 'row' ? { p: true, q: false } : { p: false, q: true }),
  },
};

export const RULE_IDS: RuleId[] = ['clonal', 'mixer', 'prom'];

/* ── the population ── */

/** The sex quota for a generation: exactly round(N·r) row-sex (clamped so both sexes
 *  exist), in a seeded shuffled order. N − 1 draws. */
export function sexQuota(N: number, ratio: number, rng: Rng): Sex[] {
  const nRow = Math.min(N - 1, Math.max(1, Math.round(N * ratio)));
  const sexes: Sex[] = Array.from({ length: N }, (_, i) => (i < nRow ? 'row' : 'col'));
  for (let i = N - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [sexes[i], sexes[j]] = [sexes[j], sexes[i]]; }
  return sexes;
}

export function makeRng(cfg: EvolveConfig): Rng {
  return mulberry32(cfg.seed);
}

export function initPopulation(M: BinaryMatrix, d: Degrees, cfg: EvolveConfig, rng: Rng): Individual[] {
  const genomes: Genome[] = [];
  for (let c = 0; c < cfg.N; c++) {
    const p = Array.from({ length: M.m }, () => rng());
    const q = Array.from({ length: M.n }, () => rng());
    genomes.push({ p, q });
  }
  const sexes = sexQuota(cfg.N, cfg.sexRatio, rng);
  return genomes.map((g, c) => evaluateIndividual(g, sexes[c], M, d, cfg, rng));
}

/** Seed every individual at one cut (p = z, q = w), for trap experiments. */
export function populationAtCut(cut: Cut, M: BinaryMatrix, d: Degrees, cfg: EvolveConfig, rng: Rng): Individual[] {
  const sexes = sexQuota(cfg.N, cfg.sexRatio, rng);
  return sexes.map(sex => evaluateIndividual({ p: cut.z.slice(), q: cut.w.slice() }, sex, M, d, cfg, rng));
}

/** One generation: N children by the rule's operators, then evaluated. Non-overlapping
 *  generations, no elitism. */
export function step(pop: Individual[], M: BinaryMatrix, d: Degrees, cfg: EvolveConfig, rng: Rng): Individual[] {
  const rule = RULES[cfg.rule];
  const k = cfg.selection.k;
  const all = pop.map((_, i) => i);
  const rows = all.filter(i => pop[i].sex === 'row');
  const cols = all.filter(i => pop[i].sex === 'col');
  const sexes = sexQuota(cfg.N, cfg.sexRatio, rng);
  const children: Genome[] = [];
  for (let c = 0; c < cfg.N; c++) {
    let parents: Individual[];
    if (rule.parents === 'one') parents = [tournament(pop, all, k, rng)];
    else if (rule.parents === 'two') parents = [tournament(pop, all, k, rng), tournament(pop, all, k, rng)];
    else parents = [tournament(pop, rows, k, rng), tournament(pop, cols, k, rng)];
    const g = rule.mate(parents, rng);
    children.push(mutate(g, rule.mutationMask(sexes[c]), cfg.mu, cfg.sigma, rng));
  }
  return children.map((g, c) => evaluateIndividual(g, sexes[c], M, d, cfg, rng));
}

/* ── readouts ── */

export interface GenStats {
  gen: number;
  bestFit: number;
  meanFit: number;
  bestIdx: number;
  /** Fitness of the fittest individual's rounded genome (deterministic; what "reached" reads). */
  bestRoundedFit: number;
  /** Mean over individuals of the mean per-locus binary entropy (bits), zero-degree loci excluded. */
  meanEntropy: number;
  /** Per-locus entropy of the canonicalized population-mean genome (bits), zero-degree loci excluded. */
  consensusEntropy: number;
  /** The canonicalized population-mean genome (the Arena's sort key). */
  consensus: Genome;
  /** Fraction of individuals in the same labeling convention as the fittest one. */
  conventionFraction: number;
}

function binH(t: number): number {
  if (t <= 0 || t >= 1) return 0;
  return -(t * Math.log2(t) + (1 - t) * Math.log2(1 - t));
}

/** The labeling variants of a genome: the complement, and (for orientation-blind
 *  judges) the two orientation twins. */
export function variants(g: Genome, orientationBlind: boolean): Genome[] {
  const flipP = g.p.map(v => 1 - v), flipQ = g.q.map(v => 1 - v);
  const out: Genome[] = [g, { p: flipP, q: flipQ }];
  if (orientationBlind) out.push({ p: g.p, q: flipQ }, { p: flipP, q: g.q });
  return out;
}

function l1(a: Genome, b: Genome): number {
  let s = 0;
  for (let i = 0; i < a.p.length; i++) s += Math.abs(a.p[i] - b.p[i]);
  for (let j = 0; j < a.q.length; j++) s += Math.abs(a.q[j] - b.q[j]);
  return s;
}

/** Re-label `g` (choosing among its variants) to lie closest to `ref`. */
export function canonicalizeTo(ref: Genome, g: Genome, orientationBlind: boolean): { genome: Genome; flipped: boolean } {
  const vs = variants(g, orientationBlind);
  let best = 0, bestD = Infinity;
  vs.forEach((v, i) => { const dd = l1(ref, v); if (dd < bestD - 1e-12) { bestD = dd; best = i; } });
  return { genome: vs[best], flipped: best !== 0 };
}

export function genStats(pop: Individual[], gen: number, M: BinaryMatrix, d: Degrees, cfg: EvolveConfig): GenStats {
  const spec = SCORES[cfg.scoreId];
  let bestIdx = 0, sum = 0;
  pop.forEach((ind, i) => { sum += ind.fit; if (ind.fit > pop[bestIdx].fit) bestIdx = i; });
  const best = pop[bestIdx];
  const bestRoundedFit = evaluate(M, d, spec, roundedCut(best));
  const activeP = d.r.map(v => v > 0), activeQ = d.c.map(v => v > 0);
  const nActive = activeP.filter(Boolean).length + activeQ.filter(Boolean).length || 1;
  const sumP = new Array<number>(M.m).fill(0), sumQ = new Array<number>(M.n).fill(0);
  let entSum = 0, same = 0;
  for (const ind of pop) {
    let e = 0;
    ind.p.forEach((v, i) => { if (activeP[i]) e += binH(v); });
    ind.q.forEach((v, j) => { if (activeQ[j]) e += binH(v); });
    entSum += e / nActive;
    const { genome, flipped } = canonicalizeTo(best, ind, spec.orientationBlind);
    if (!flipped) same++;
    genome.p.forEach((v, i) => { sumP[i] += v; });
    genome.q.forEach((v, j) => { sumQ[j] += v; });
  }
  const consensus: Genome = { p: sumP.map(v => v / pop.length), q: sumQ.map(v => v / pop.length) };
  let cEnt = 0;
  consensus.p.forEach((v, i) => { if (activeP[i]) cEnt += binH(v); });
  consensus.q.forEach((v, j) => { if (activeQ[j]) cEnt += binH(v); });
  return {
    gen, bestFit: best.fit, meanFit: sum / pop.length, bestIdx, bestRoundedFit,
    meanEntropy: entSum / pop.length, consensusEntropy: cEnt / nActive, consensus,
    conventionFraction: same / pop.length,
  };
}

/** "Reached": the first generation of a run of `sustain` consecutive generations in
 *  which the fittest individual's rounded cut scores the exact optimum. */
export class ReachTracker {
  reachedAt: number | null = null;
  private streak = 0;
  private streakStart = 0;
  constructor(private optimum: number | null, private sustain = 5, private eps = 1e-9) {}
  update(gen: number, bestRoundedFit: number): number | null {
    if (this.reachedAt !== null || this.optimum === null) return this.reachedAt;
    if (bestRoundedFit >= this.optimum - this.eps) {
      if (this.streak === 0) this.streakStart = gen;
      this.streak++;
      if (this.streak >= this.sustain) this.reachedAt = this.streakStart;
    } else {
      this.streak = 0;
    }
    return this.reachedAt;
  }
}

/** Convenience for tests and the Lab: run a configured population for `gens`
 *  generations and return the per-generation stats. */
export function run(M: BinaryMatrix, d: Degrees, cfg: EvolveConfig, gens: number, init?: (rng: Rng) => Individual[]): { pop: Individual[]; history: GenStats[] } {
  const rng = makeRng(cfg);
  let pop = init ? init(rng) : initPopulation(M, d, cfg, rng);
  const history: GenStats[] = [genStats(pop, 0, M, d, cfg)];
  for (let g = 1; g <= gens; g++) {
    pop = step(pop, M, d, cfg, rng);
    history.push(genStats(pop, g, M, d, cfg));
  }
  return { pop, history };
}

/** A cheap fingerprint of a population, for determinism tests. */
export function populationHash(pop: Individual[]): number {
  let h = 2166136261;
  const mix = (v: number) => { h ^= Math.floor(v * 1e9) | 0; h = Math.imul(h, 16777619); };
  for (const ind of pop) { ind.p.forEach(mix); ind.q.forEach(mix); mix(ind.fit); }
  return h >>> 0;
}

// Re-exported so the views can tint by block without importing matrix twice.
export { blockTable, isDegenerate };
