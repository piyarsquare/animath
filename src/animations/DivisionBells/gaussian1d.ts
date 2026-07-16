/**
 * 1-D companion to `gaussian2d.ts` — the "felt" line view of Division Bells.
 *
 * On a single axis two Gaussians are two bell curves, and each way of asking "how
 * far apart are they?" becomes something you can *see*:
 *   • Mahalanobis separation  = the peak-to-peak gap in units of spread (σ).
 *   • overlap ∫min(p,q)        = the shaded lens where the bells cross.
 *   • Bayes error              = ½·overlap (equal prior) — the confusable mass,
 *                                straddling the decision boundary (a crossing point).
 *
 * The measures that have clean 1-D closed forms use them; the areas (overlap,
 * Bayes error, TV) are integrated numerically over an adaptive window — cheap and
 * exact enough, and cross-checked in tests against the equal-σ closed form.
 */

const SQRT_2PI = Math.sqrt(2 * Math.PI);
const SIGMA_FLOOR = 1e-4;
const clampS = (s: number) => (s > SIGMA_FLOOR ? s : SIGMA_FLOOR);

/** Gaussian density N(μ, σ²) at x. */
export function pdf1(mu: number, sigma: number, x: number): number {
  const s = clampS(sigma);
  const z = (x - mu) / s;
  return Math.exp(-0.5 * z * z) / (s * SQRT_2PI);
}

/** Error function (Abramowitz & Stegun 7.1.26, ~1e-7 accuracy). */
export function erf(x: number): number {
  const sgn = Math.sign(x);
  const a = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * a);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-a * a);
  return sgn * y;
}

/** Standard normal CDF Φ(z). */
export const Phi = (z: number): number => 0.5 * (1 + erf(z / Math.SQRT2));

/** N(μ, σ²) CDF at x. */
export const cdf1 = (mu: number, sigma: number, x: number): number => Phi((x - mu) / clampS(sigma));

/**
 * Symmetric (pooled) Mahalanobis separation of the two means:
 * |μ₁ − μ₂| / σ_pooled, σ_pooled = √((σ₁² + σ₂²)/2). The "how many bell-widths
 * apart" number — always defined, symmetric, and equal to |Δμ|/σ when σ₁ = σ₂.
 */
export function mahalanobisPooled1(m1: number, s1: number, m2: number, s2: number): number {
  const sp = Math.sqrt((clampS(s1) ** 2 + clampS(s2) ** 2) / 2);
  return Math.abs(m1 - m2) / sp;
}

/** Directed Mahalanobis of the means in a reference bell's metric: |Δμ| / σ_ref. */
export const mahalanobisDirected1 = (m1: number, m2: number, sRef: number): number => Math.abs(m1 - m2) / clampS(sRef);

/** KL(P‖Q) for 1-D Gaussians (nats): ln(σ₂/σ₁) + (σ₁² + Δμ²)/(2σ₂²) − ½. */
export function kl1(m1: number, s1: number, m2: number, s2: number): number {
  const a = clampS(s1), b = clampS(s2);
  return Math.log(b / a) + (a * a + (m1 - m2) ** 2) / (2 * b * b) - 0.5;
}

/**
 * The x-values where the two densities cross (p = q) — the decision boundary(ies).
 * Equal σ ⇒ one crossing (the midpoint when σ₁ = σ₂); unequal σ ⇒ up to two.
 * Solves the quadratic a·x² + b·x + c = 0 from equating the log-densities.
 */
export function crossings1(m1: number, s1: number, m2: number, s2: number): number[] {
  const a1 = clampS(s1), a2 = clampS(s2);
  const A = 1 / (a2 * a2) - 1 / (a1 * a1);
  const B = 2 * (m1 / (a1 * a1) - m2 / (a2 * a2));
  const C = m2 * m2 / (a2 * a2) - m1 * m1 / (a1 * a1) - 2 * Math.log(a1 / a2);
  if (Math.abs(A) < 1e-12) {
    if (Math.abs(B) < 1e-12) return [];
    return [-C / B];
  }
  const disc = B * B - 4 * A * C;
  if (disc < 0) return [];
  const r = Math.sqrt(disc);
  return [(-B - r) / (2 * A), (-B + r) / (2 * A)].sort((p, q) => p - q);
}

/** An integration window wide enough to hold both bells' mass. */
function window1(m1: number, s1: number, m2: number, s2: number, pad = 8): [number, number] {
  const smax = Math.max(clampS(s1), clampS(s2));
  return [Math.min(m1, m2) - pad * smax, Math.max(m1, m2) + pad * smax];
}

/** Overlap mass ∫ min(p, q) dx ∈ [0, 1] — the shaded lens's area. */
export function overlap1(m1: number, s1: number, m2: number, s2: number, grid = 4000): number {
  const [lo, hi] = window1(m1, s1, m2, s2);
  const dx = (hi - lo) / grid;
  let sum = 0;
  for (let i = 0; i < grid; i++) {
    const x = lo + (i + 0.5) * dx;
    sum += Math.min(pdf1(m1, s1, x), pdf1(m2, s2, x));
  }
  return sum * dx;
}

/** Total variation ½∫|p − q| = 1 − overlap. */
export const tv1 = (m1: number, s1: number, m2: number, s2: number): number => 1 - overlap1(m1, s1, m2, s2);

/**
 * Bayes error ∫ min(π_P·p, π_Q·q) dx — the minimum misclassification rate of the
 * best classifier telling P from Q, for prior `priorP` on P (default equal priors,
 * where it equals ½·overlap). This shaded area *is* the number.
 */
export function bayesError1(m1: number, s1: number, m2: number, s2: number, priorP = 0.5, grid = 4000): number {
  const [lo, hi] = window1(m1, s1, m2, s2);
  const dx = (hi - lo) / grid;
  const pQ = 1 - priorP;
  let sum = 0;
  for (let i = 0; i < grid; i++) {
    const x = lo + (i + 0.5) * dx;
    sum += Math.min(priorP * pdf1(m1, s1, x), pQ * pdf1(m2, s2, x));
  }
  return sum * dx;
}
