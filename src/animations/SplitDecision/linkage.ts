/**
 * Split Decision — linkage: how the loci co-vary across the population.
 *
 * Each individual carries m + n loci (one per row, one per column). Across the N
 * individuals each locus has a distribution, and every pair of loci has a
 * correlation. The matrix of those correlations is what distinguishes the three
 * reproductive rules at the level of the *population* rather than the individual:
 *
 *   • uniform crossover (the Mixer) breaks associations between loci every
 *     generation, driving the population toward **linkage equilibrium** — the state
 *     in which it is fully described by its allele frequencies alone. That is
 *     Geiringer's theorem (1944), and it is also the assumption under which sex
 *     reads as multiplicative-weights updates per locus (Chastain et al. 2014).
 *     Visually: the matrix goes pale.
 *   • clonal reproduction (the Monastery) copies whole genomes, so whatever
 *     associations selection builds are inherited intact and the matrix stays strong.
 *   • the two-sex Prom transmits the row half and the column half from *different*
 *     parents, chosen independently — so it should specifically flatten the
 *     **cross-half** block while leaving within-half structure alone. That is the
 *     same asymmetry that makes it poor at coordinated row-and-column moves.
 *
 * Genomes are re-labeled to the fittest individual's convention first: a population
 * split between the two labelings of the same split would otherwise show a spurious
 * correlation between every pair of loci, since flipping is a whole-genome operation.
 *
 * A locus that has stopped varying (every individual identical — the usual end state
 * once the population converges) has no correlation with anything. Those are reported
 * as zero and left out of the summary means, and `varying` says how many remain.
 */

import { canonicalOrientation, type Genome, type Individual } from './evolve';

export interface Linkage {
  m: number;
  n: number;
  /** Row-major (m+n)² correlation matrix; loci ordered p₀…p₍ₘ₋₁₎ then q₀…q₍ₙ₋₁₎. */
  r: Float64Array;
  /** Mean |r| over distinct pairs within the row half, within the column half, and across the two. */
  meanAbsPP: number;
  meanAbsQQ: number;
  meanAbsPQ: number;
  /** Loci still carrying variation (the rest are fixed and correlate with nothing). */
  varying: number;
  /** Individuals the correlations were measured over. */
  n_: number;
  /** Two standard errors of a single zero correlation — what one cell must exceed
   *  before it means anything (≈ 2/√N). */
  cellNoise: number;
  /** What the three summary means would read if the loci were independent. The mean
   *  |r| of a zero correlation is not its standard error: for r ≈ N(0, 1/√N) the mean
   *  absolute value is √(2/π)/√N, about 0.8 SE. Comparing a mean against a
   *  single-cell threshold would make an equilibrated population look structured. */
  meanAbsNull: number;
}

/** Below this standard deviation a locus counts as fixed. */
const FIXED_SD = 1e-9;

export function linkage(pop: Individual[], best: Genome, orientationBlind: boolean, m: number, n: number): Linkage {
  const L = m + n;
  const N = pop.length;
  const r = new Float64Array(L * L);
  const empty: Linkage = { m, n, r, meanAbsPP: 0, meanAbsQQ: 0, meanAbsPQ: 0, varying: 0, n_: N, cellNoise: 0, meanAbsNull: 0 };
  if (N < 2 || L === 0) return empty;

  // Canonicalized values, locus-major so the standardization below is a tight loop.
  const X: Float64Array[] = Array.from({ length: L }, () => new Float64Array(N));
  for (let i = 0; i < N; i++) {
    const ind = pop[i];
    const { flipP, flipQ } = canonicalOrientation(best, ind, orientationBlind);
    for (let a = 0; a < m; a++) X[a][i] = flipP ? 1 - ind.p[a] : ind.p[a];
    for (let b = 0; b < n; b++) X[m + b][i] = flipQ ? 1 - ind.q[b] : ind.q[b];
  }

  // Standardize each locus; a fixed locus becomes all-zero, so every product with it
  // is zero and it drops out of both the matrix and the means.
  const live = new Uint8Array(L);
  let varying = 0;
  for (let a = 0; a < L; a++) {
    const x = X[a];
    let s = 0;
    for (let i = 0; i < N; i++) s += x[i];
    const mu = s / N;
    let v = 0;
    for (let i = 0; i < N; i++) { const dd = x[i] - mu; v += dd * dd; }
    const sd = Math.sqrt(v / N);
    if (sd > FIXED_SD) {
      live[a] = 1; varying++;
      for (let i = 0; i < N; i++) x[i] = (x[i] - mu) / sd;
    } else {
      x.fill(0);
    }
  }

  let sPP = 0, cPP = 0, sQQ = 0, cQQ = 0, sPQ = 0, cPQ = 0;
  for (let a = 0; a < L; a++) {
    r[a * L + a] = live[a] ? 1 : 0;
    const xa = X[a];
    for (let b = a + 1; b < L; b++) {
      const xb = X[b];
      let acc = 0;
      for (let i = 0; i < N; i++) acc += xa[i] * xb[i];
      // Clamp: the products are exact only up to rounding, and |r| ≤ 1 by Cauchy–Schwarz.
      const rab = Math.max(-1, Math.min(1, acc / N));
      r[a * L + b] = rab; r[b * L + a] = rab;
      if (!live[a] || !live[b]) continue;
      const abs = Math.abs(rab);
      if (a < m && b < m) { sPP += abs; cPP++; }
      else if (a >= m && b >= m) { sQQ += abs; cQQ++; }
      else { sPQ += abs; cPQ++; }
    }
  }

  return {
    m, n, r,
    meanAbsPP: cPP ? sPP / cPP : 0,
    meanAbsQQ: cQQ ? sQQ / cQQ : 0,
    meanAbsPQ: cPQ ? sPQ / cPQ : 0,
    varying, n_: N,
    cellNoise: 2 / Math.sqrt(N),
    meanAbsNull: Math.sqrt(2 / Math.PI) / Math.sqrt(N),
  };
}
