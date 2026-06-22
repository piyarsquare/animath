/**
 * Math engine for "Counting the Ways".
 *
 * The whole app rests on one identity. If X ~ Poisson(μ₁) and Y ~ Poisson(μ₂)
 * are independent, the difference K = X − Y is Skellam-distributed:
 *
 *     P(K = k) = e^{−(μ₁+μ₂)} · (μ₁/μ₂)^{k/2} · I_{|k|}( 2·√(μ₁·μ₂) )
 *
 * where I_{|k|} is the modified Bessel function of the first kind. The Bessel
 * function is not bolted on: it IS the sum, over every way the two counts can
 * net to the same difference k, of their joint probability — one diagonal of
 * the (X, Y) lattice. This module computes the pmf BOTH ways (the honest
 * diagonal sum, and the closed Bessel form) so the app can show them agree, and
 * exposes the per-rung terms so the accumulation can be animated.
 *
 * Everything that can overflow (Poisson tails, the Bessel series for large
 * argument) is done in log space and exponentiated per term.
 */

/** Natural log of n! — cached, extended on demand. logFactorial(n) = ln Γ(n+1). */
const LOG_FACT: number[] = [0, 0];
export function logFactorial(n: number): number {
  if (n < 0 || !Number.isFinite(n)) return NaN;
  const m = Math.floor(n);
  if (m < LOG_FACT.length) return LOG_FACT[m];
  let v = LOG_FACT[LOG_FACT.length - 1];
  for (let i = LOG_FACT.length; i <= m; i++) {
    v += Math.log(i);
    LOG_FACT[i] = v;
  }
  return LOG_FACT[m];
}

/** Poisson pmf P(N = k) for rate μ ≥ 0, computed in log space. */
export function poissonPmf(mu: number, k: number): number {
  if (k < 0 || !Number.isInteger(k)) return 0;
  if (mu <= 0) return k === 0 ? 1 : 0;
  return Math.exp(-mu + k * Math.log(mu) - logFactorial(k));
}

/** Poisson pmf over n = 0 … nMax (inclusive). */
export function poissonRange(mu: number, nMax: number): number[] {
  const out: number[] = [];
  for (let n = 0; n <= nMax; n++) out.push(poissonPmf(mu, n));
  return out;
}

/**
 * The n-th term of the modified-Bessel series for I_{|k|}(z):
 *     (z/2)^{2n+|k|} / ( n! · (n+|k|)! ).
 * This is exactly the n-th rung of the difference diagonal once the constant
 * factors e^{−(μ₁+μ₂)}·(μ₁/μ₂)^{k/2} are pulled out — see diagTerm.
 */
export function besselTerm(n: number, k: number, z: number): number {
  const a = Math.abs(k);
  if (z <= 0) return n === 0 && a === 0 ? 1 : 0;
  return Math.exp((2 * n + a) * Math.log(z / 2) - logFactorial(n) - logFactorial(n + a));
}

/** Modified Bessel function of the first kind I_{|k|}(z), integer order, by series. */
export function besselI(k: number, z: number, maxTerms = 400): number {
  const a = Math.abs(k);
  if (z <= 0) return a === 0 ? 1 : 0;
  let sum = 0;
  for (let n = 0; n < maxTerms; n++) {
    const t = besselTerm(n, a, z);
    sum += t;
    if (n > a && t < sum * 1e-16) break;
  }
  return sum;
}

/**
 * One rung of the difference-k diagonal of the (X, Y) lattice: the joint
 * probability P(X = xₙ)·P(Y = yₙ), where (xₙ, yₙ) is the n-th cell with
 * x − y = k. With y₀ = max(0, −k) and x₀ = max(0, k), rung n is
 * (x₀ + n, y₀ + n) — both non-negative, both stepping by one.
 */
export function diagCell(k: number, n: number): { x: number; y: number } {
  return { x: Math.max(0, k) + n, y: Math.max(0, -k) + n };
}
export function diagTerm(mu1: number, mu2: number, k: number, n: number): number {
  const { x, y } = diagCell(k, n);
  return poissonPmf(mu1, x) * poissonPmf(mu2, y);
}

/**
 * Skellam pmf P(X − Y = k) as the honest sum down the diagonal. Robust for any
 * μ ≥ 0 (handles μ = 0, where the Bessel form's (μ₁/μ₂)^{k/2} is undefined).
 */
export function skellamPmf(mu1: number, mu2: number, k: number, maxRungs = 600): number {
  let sum = 0;
  for (let n = 0; n < maxRungs; n++) {
    const t = diagTerm(mu1, mu2, k, n);
    sum += t;
    if (n > Math.abs(k) && t < sum * 1e-16) break;
  }
  return sum;
}

/** Skellam pmf over k = kMin … kMax (inclusive). */
export function skellamRange(mu1: number, mu2: number, kMin: number, kMax: number): number[] {
  const out: number[] = [];
  for (let k = kMin; k <= kMax; k++) out.push(skellamPmf(mu1, mu2, k));
  return out;
}

/** The closed Bessel form, factored — so the app can label each piece live. */
export interface BesselBreakdown {
  z: number;            // 2·√(μ₁·μ₂)
  norm: number;         // e^{−(μ₁+μ₂)}
  ratio: number;        // (μ₁/μ₂)^{k/2}  (NaN-guarded when a μ is 0)
  bessel: number;       // I_{|k|}(z)  — the diagonal sum with the constants removed
  pmf: number;          // norm · ratio · bessel  = P(K = k)
  defined: boolean;     // false when μ₁·μ₂ = 0 (Bessel form degenerates)
}
export function besselBreakdown(mu1: number, mu2: number, k: number): BesselBreakdown {
  const z = 2 * Math.sqrt(mu1 * mu2);
  const norm = Math.exp(-(mu1 + mu2));
  const defined = mu1 > 0 && mu2 > 0;
  const ratio = defined ? Math.pow(mu1 / mu2, k / 2) : NaN;
  const bessel = besselI(k, z);
  const pmf = defined ? norm * ratio * bessel : skellamPmf(mu1, mu2, k);
  return { z, norm, ratio, bessel, pmf, defined };
}

/**
 * The conditional law of the underlying counts given the difference: the
 * normalized diagonal terms. P(rung = n | K = k) = (n-th term) / Σ(terms).
 * This is *the* answer to the title question — each conditional probability is
 * one Bessel-series term divided by the Bessel sum.
 */
export function conditionalRungs(mu1: number, mu2: number, k: number, maxRungs = 600): number[] {
  const terms: number[] = [];
  let sum = 0;
  for (let n = 0; n < maxRungs; n++) {
    const t = diagTerm(mu1, mu2, k, n);
    terms.push(t);
    sum += t;
    if (n > Math.abs(k) && t < sum * 1e-13) break;
  }
  return sum > 0 ? terms.map(t => t / sum) : terms;
}

/** How many diagonal rungs carry essentially all the mass (for the walk length). */
export function significantRungs(mu1: number, mu2: number, k: number, eps = 1e-9): number {
  const total = skellamPmf(mu1, mu2, k);
  if (total <= 0) return 1;
  let sum = 0;
  for (let n = 0; n < 600; n++) {
    sum += diagTerm(mu1, mu2, k, n);
    if (total - sum < eps * total) return n + 1;
  }
  return 600;
}

/* ── Sampling ─────────────────────────────────────────────────────────────── */

/** Small, fast, seedable PRNG (mulberry32) — reproducible sample draws. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Draw one Poisson(μ) value (Knuth's method — fine for the modest μ here). */
export function samplePoisson(mu: number, rng: () => number): number {
  if (mu <= 0) return 0;
  const L = Math.exp(-mu);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rng();
  } while (p > L);
  return k - 1;
}

/** Draw one Skellam value K = X − Y. */
export function sampleSkellam(mu1: number, mu2: number, rng: () => number): number {
  return samplePoisson(mu1, rng) - samplePoisson(mu2, rng);
}

/* ── Fitting ──────────────────────────────────────────────────────────────── */

export interface MomentFit {
  mu1: number;   // (s² + m̄) / 2
  mu2: number;   // (s² − m̄) / 2
  mean: number;  // sample mean  m̄  ≈ μ₁ − μ₂  (the drift)
  varr: number;  // sample variance s² ≈ μ₁ + μ₂  (the total activity)
  n: number;
}
/**
 * Method-of-moments fit. The Skellam has mean μ₁−μ₂ and variance μ₁+μ₂, so the
 * sample mean and variance pin both rates: μ̂₁ = (s²+m̄)/2, μ̂₂ = (s²−m̄)/2.
 * Interpretable on its face — exactly why it suits the demystifying goal — and
 * it matches the first two moments exactly. (Clamped at 0 against sampling
 * noise that could push a rate slightly negative.)
 */
export function fitMoments(samples: number[]): MomentFit {
  const n = samples.length;
  if (n === 0) return { mu1: 0, mu2: 0, mean: 0, varr: 0, n: 0 };
  const mean = samples.reduce((a, b) => a + b, 0) / n;
  const varr = n > 1
    ? samples.reduce((a, b) => a + (b - mean) * (b - mean), 0) / (n - 1)
    : 0;
  return {
    mu1: Math.max(0, (varr + mean) / 2),
    mu2: Math.max(0, (varr - mean) / 2),
    mean,
    varr,
    n,
  };
}

/** Bin a list of integer differences into counts over [kMin, kMax]. */
export function histogram(samples: number[], kMin: number, kMax: number): number[] {
  const bins = new Array(kMax - kMin + 1).fill(0);
  for (const s of samples) {
    if (s >= kMin && s <= kMax) bins[s - kMin]++;
  }
  return bins;
}
