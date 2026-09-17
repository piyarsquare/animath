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
import { SCORES, evaluate, sexedYield, type ScoreId, type YieldMode } from './scores';

export const ENGINE_VERSION = 1;

export type Sex = 'row' | 'col';
export type RuleId = 'clonal' | 'mixer' | 'prom';
export type FitnessMode = 'sampled' | 'rounded';
/** Whether both genders are scored by the judge, or each by its own yield. */
export type Payoff = 'shared' | 'sexed';
/** Whether each generation's sex composition is enforced or drawn. */
export type SexQuota = 'exact' | 'drift';

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
  /** `shared` — every individual is scored by the judge (the default, and what the
   *  Lab sweeps). `sexed` — each gender is scored by its own cross-block yield
   *  instead, so the two halves face opposite selective pressures. */
  payoff: Payoff;
  /** Only read when `payoff` is `sexed`: whether a gender's yield is the share of the
   *  matrix's ones it captures, or the density of the block it captured them from. */
  yieldMode: YieldMode;
  /** Phenotypes sampled per evaluation. Fixed at 1 (the canalization mechanism). */
  samplesPerEval: 1;
  rule: RuleId;
  /** Population size. */
  N: number;
  selection: { kind: 'tournament'; k: number };
  /** Per-locus mutation probability and Gaussian step (reflected into [0, 1]). */
  mu: number;
  sigma: number;
  /** Fraction of each generation born row-sex. */
  sexRatio: number;
  /** `exact` enforces that fraction every generation; `drift` draws each birth, so the
   *  realized ratio wanders and a sex can be lost (see `sexQuota` and `step`). */
  sexQuotaMode: SexQuota;
  seed: number;
}

export const DEFAULT_CONFIG: EvolveConfig = {
  engine: ENGINE_VERSION,
  scoreId: 'bernoulli',
  fitness: 'sampled',
  payoff: 'shared',
  yieldMode: 'density',
  samplesPerEval: 1,
  rule: 'mixer',
  N: 128,
  selection: { kind: 'tournament', k: 3 },
  mu: 0.1,
  sigma: 0.1,
  sexRatio: 0.5,
  sexQuotaMode: 'exact',
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
  // Under `sexed` payoff the judge is replaced by the individual's OWN gender's
  // yield, so the two halves of the population are selected on opposite readings of
  // the same genome — see `sexedYield`.
  const fit = cfg.payoff === 'sexed'
    ? sexedYield(M, cut, sex, cfg.yieldMode)
    : evaluate(M, d, SCORES[cfg.scoreId], cut);
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

/** The sexes of one generation.
 *
 *  `exact` — the quota: exactly round(N·r) row-sex, in a seeded shuffled order, N − 1
 *  draws. The composition of every generation is then identical, which is what makes
 *  runs comparable.
 *
 *  `drift` — each birth is its own draw at probability r, so the realized ratio is
 *  binomial around it and **a sex can be missing altogether**. That is the point of
 *  the mode: at a lopsided ratio (or a small population) the rare sex flickers out,
 *  and a two-sex rule with only one sex present has to do something. See `step`:
 *  it reproduces parthenogenetically.
 *
 *  Neither mode clamps. round(N·r) at r = 0 is zero row-sex, and that is allowed. */
export function sexQuota(N: number, ratio: number, rng: Rng, mode: SexQuota = 'exact'): Sex[] {
  if (mode === 'drift') return Array.from({ length: N }, () => (rng() < ratio ? 'row' : 'col'));
  const nRow = Math.max(0, Math.min(N, Math.round(N * ratio)));
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
  const sexes = sexQuota(cfg.N, cfg.sexRatio, rng, cfg.sexQuotaMode);
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
  // k < 1 has no meaning (a tournament needs one draw); treat it as drift, which is
  // what one draw is, rather than let a bad value through to `tournament`.
  const k = Math.max(1, cfg.selection.k);
  const all = pop.map((_, i) => i);
  const rows = all.filter(i => pop[i].sex === 'row');
  const cols = all.filter(i => pop[i].sex === 'col');
  const sexes = sexQuota(cfg.N, cfg.sexRatio, rng, cfg.sexQuotaMode);
  // A two-sex rule needs one parent of each sex. Under a drifting quota the rare sex
  // can be missing entirely, and then the generation reproduces **parthenogenetically**:
  // one parent, both halves transmitted, both halves mutated — the whiptail-lizard
  // outcome, and the same operator the Monastery uses. Note this is a property of the
  // generation, not an absorbing state: with a fixed ratio the lost sex reappears in the
  // next draw. Making the ratio heritable is what would let sex be lost for good.
  const parthenogenetic = rule.parents === 'sexed' && (rows.length === 0 || cols.length === 0);
  const children: Genome[] = [];
  for (let c = 0; c < cfg.N; c++) {
    let parents: Individual[];
    if (rule.parents === 'one' || parthenogenetic) parents = [tournament(pop, all, k, rng)];
    else if (rule.parents === 'two') parents = [tournament(pop, all, k, rng), tournament(pop, all, k, rng)];
    else parents = [tournament(pop, rows, k, rng), tournament(pop, cols, k, rng)];
    const g = parthenogenetic
      ? { p: parents[0].p.slice(), q: parents[0].q.slice() }
      : rule.mate(parents, rng);
    const mask = parthenogenetic ? { p: true, q: true } : rule.mutationMask(sexes[c]);
    children.push(mutate(g, mask, cfg.mu, cfg.sigma, rng));
  }
  return children.map((g, c) => evaluateIndividual(g, sexes[c], M, d, cfg, rng));
}

/* ── readouts ── */

/** The per-generation record: scalars only, cheap enough to compute every step. */
export interface GenStats {
  gen: number;
  bestFit: number;
  meanFit: number;
  bestIdx: number;
  /** Fitness of the fittest individual's rounded genome (deterministic; what "reached" reads). */
  bestRoundedFit: number;
  /** Mean over individuals of the mean per-locus binary entropy (bits), zero-degree loci excluded. */
  meanEntropy: number;
  /** Mean fitness within each gender. Under a shared judge these are the same quantity
   *  measured on two halves of the population; under `sexed` payoff they are the two
   *  genders' separate yields, which is the whole point of that regime. NaN when a
   *  gender is empty (it never is: the quota clamps both to at least one). */
  meanFitRow: number;
  meanFitCol: number;
  /** Fraction of the population born row-sex. Under an exact quota this is the setting;
   *  under a drifting one it is what actually happened, and 0 or 1 means a sex is
   *  missing — the generation reproduced parthenogenetically. */
  rowShare: number;
}

/** The per-frame picture: everything above plus the population-level summaries the
 *  views draw. Computing these walks every genome's labeling variants, so they are
 *  refreshed on the render cadence, not on every generation. */
export interface FullStats extends GenStats {
  /** Per-locus entropy of the canonicalized population-mean genome (bits), zero-degree loci excluded. */
  consensusEntropy: number;
  /** The canonicalized population-mean genome (the Arena's sort key). */
  consensus: Genome;
  /** Fraction of individuals in the same labeling convention as the fittest one. */
  conventionFraction: number;
  /** Per-locus interquartile range of the canonicalized population (the Arena's whiskers). */
  spreadP: Array<[number, number]>;
  spreadQ: Array<[number, number]>;
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

/** Which of `g`'s labelings lies closest to `ref`, as two flip flags — computed
 *  from the half-distances, so nothing is allocated. Both the plain and the
 *  complemented distance are accumulated in the same pass — note that
 *  |ref − (1 − g)| is NOT len − |ref − g|, so the flipped sum has to be summed,
 *  not derived (a brute-force equivalence test pins this). */
export function canonicalOrientation(ref: Genome, g: Genome, orientationBlind: boolean): { flipP: boolean; flipQ: boolean } {
  let dp = 0, dq = 0, dpFlip = 0, dqFlip = 0;
  for (let i = 0; i < g.p.length; i++) {
    dp += Math.abs(ref.p[i] - g.p[i]);
    dpFlip += Math.abs(ref.p[i] - (1 - g.p[i]));
  }
  for (let j = 0; j < g.q.length; j++) {
    dq += Math.abs(ref.q[j] - g.q[j]);
    dqFlip += Math.abs(ref.q[j] - (1 - g.q[j]));
  }
  // Candidates: identity, the complement (both halves), and — when the judge cannot
  // see orientation — either half alone.
  const cands: Array<{ flipP: boolean; flipQ: boolean; d: number }> = [
    { flipP: false, flipQ: false, d: dp + dq },
    { flipP: true, flipQ: true, d: dpFlip + dqFlip },
  ];
  if (orientationBlind) {
    cands.push({ flipP: false, flipQ: true, d: dp + dqFlip });
    cands.push({ flipP: true, flipQ: false, d: dpFlip + dq });
  }
  let best = cands[0];
  for (const c of cands) if (c.d < best.d - 1e-12) best = c;
  return { flipP: best.flipP, flipQ: best.flipQ };
}

/** Re-label `g` (choosing among its variants) to lie closest to `ref`. */
export function canonicalizeTo(ref: Genome, g: Genome, orientationBlind: boolean): { genome: Genome; flipped: boolean } {
  const { flipP, flipQ } = canonicalOrientation(ref, g, orientationBlind);
  const genome: Genome = {
    p: flipP ? g.p.map(v => 1 - v) : g.p.slice(),
    q: flipQ ? g.q.map(v => 1 - v) : g.q.slice(),
  };
  return { genome, flipped: flipP || flipQ };
}

/** Which loci any ones-only judge can see at all: a zero-degree row or column has
 *  no selection pressure, so its entry never canalizes and is left out of entropy. */
function activeLoci(d: Degrees): { p: boolean[]; q: boolean[]; n: number } {
  const p = d.r.map(v => v > 0), q = d.c.map(v => v > 0);
  const n = p.filter(Boolean).length + q.filter(Boolean).length || 1;
  return { p, q, n };
}

/** Mean over individuals of the mean per-locus entropy (bits). The only statistic
 *  the neutral and Rounded twins contribute, so it is worth having on its own. */
export function meanEntropyOf(pop: Individual[], d: Degrees): number {
  const act = activeLoci(d);
  let sum = 0;
  for (const ind of pop) {
    let e = 0;
    for (let i = 0; i < ind.p.length; i++) if (act.p[i]) e += binH(ind.p[i]);
    for (let j = 0; j < ind.q.length; j++) if (act.q[j]) e += binH(ind.q[j]);
    sum += e / act.n;
  }
  return sum / pop.length;
}

/** The per-generation record. No canonicalization: this runs on every step. */
export function genStats(pop: Individual[], gen: number, M: BinaryMatrix, d: Degrees, cfg: EvolveConfig): GenStats {
  let bestIdx = 0, sum = 0, sumRow = 0, nRow = 0, sumCol = 0, nCol = 0;
  for (let i = 0; i < pop.length; i++) {
    sum += pop[i].fit;
    if (pop[i].sex === 'row') { sumRow += pop[i].fit; nRow++; } else { sumCol += pop[i].fit; nCol++; }
    if (pop[i].fit > pop[bestIdx].fit) bestIdx = i;
  }
  const best = pop[bestIdx];
  return {
    gen, bestFit: best.fit, meanFit: sum / pop.length, bestIdx,
    // The rounded reading is the judge's, and stays the judge's even under sexed
    // payoff: it is what "reached the optimum" is measured against, and two yields
    // are not one objective.
    bestRoundedFit: evaluate(M, d, SCORES[cfg.scoreId], roundedCut(best)),
    meanEntropy: meanEntropyOf(pop, d),
    meanFitRow: nRow ? sumRow / nRow : NaN,
    meanFitCol: nCol ? sumCol / nCol : NaN,
    rowShare: pop.length ? nRow / pop.length : 0,
  };
}

/** The per-frame picture. Walks every genome once against the fittest one's
 *  labeling, accumulating the consensus and the per-locus quartiles in the same
 *  pass — no intermediate genome copies. */
export function fullStats(pop: Individual[], gen: number, M: BinaryMatrix, d: Degrees, cfg: EvolveConfig): FullStats {
  const light = genStats(pop, gen, M, d, cfg);
  const spec = SCORES[cfg.scoreId];
  const best = pop[light.bestIdx];
  const act = activeLoci(d);
  const colsP: number[][] = Array.from({ length: M.m }, () => []);
  const colsQ: number[][] = Array.from({ length: M.n }, () => []);
  let same = 0;
  for (const ind of pop) {
    const { flipP, flipQ } = canonicalOrientation(best, ind, spec.orientationBlind);
    if (!flipP && !flipQ) same++;
    for (let i = 0; i < M.m; i++) colsP[i].push(flipP ? 1 - ind.p[i] : ind.p[i]);
    for (let j = 0; j < M.n; j++) colsQ[j].push(flipQ ? 1 - ind.q[j] : ind.q[j]);
  }
  const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
  const iqr = (a: number[]): [number, number] => {
    const s = a.slice().sort((x, y) => x - y);
    return [s[Math.floor(s.length * 0.25)], s[Math.floor(s.length * 0.75)]];
  };
  const consensus: Genome = { p: colsP.map(mean), q: colsQ.map(mean) };
  let cEnt = 0;
  for (let i = 0; i < M.m; i++) if (act.p[i]) cEnt += binH(consensus.p[i]);
  for (let j = 0; j < M.n; j++) if (act.q[j]) cEnt += binH(consensus.q[j]);
  return {
    ...light, consensus, consensusEntropy: cEnt / act.n,
    conventionFraction: same / pop.length,
    spreadP: colsP.map(iqr), spreadQ: colsQ.map(iqr),
  };
}

/** "Reached": the first generation of a run of `sustain` consecutive generations in
 *  which the fittest individual's rounded cut scores the exact optimum. Equality
 *  within `eps`, not "at least": a degenerate rounded cut scores 0 under the guard,
 *  which would exceed a negative optimum (the sparse fixture under Occam's Invoice). */
export class ReachTracker {
  reachedAt: number | null = null;
  private streak = 0;
  private streakStart = 0;
  constructor(private optimum: number | null, private sustain = 5, private eps = 1e-9) {}
  update(gen: number, bestRoundedFit: number): number | null {
    if (this.reachedAt !== null || this.optimum === null) return this.reachedAt;
    if (Math.abs(bestRoundedFit - this.optimum) <= this.eps) {
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
