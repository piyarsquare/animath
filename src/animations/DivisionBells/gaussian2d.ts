/**
 * Math engine for "Division Bells" — how far apart are two 2-D Gaussians, by
 * every honest yardstick.
 *
 * The app rests on one exact identity. For P = N(μ₁, Σ₁) and Q = N(μ₂, Σ₂) the
 * Kullback–Leibler divergence has the closed form
 *
 *     KL(P‖Q) = ½[ (μ₂−μ₁)ᵀ Σ₂⁻¹ (μ₂−μ₁)      ← squared Mahalanobis of the means, in Q's metric
 *               + tr(Σ₂⁻¹Σ₁) − k + ln(detΣ₂/detΣ₁) ]   ← covariance mismatch, k = 2
 *
 * The first bracketed term is *exactly* the squared Mahalanobis separation of
 * the means measured in Q's precision. So when Σ₁ = Σ₂ the covariance term
 * vanishes and KL collapses to ½·d_M² — Mahalanobis IS the mean-shift part of
 * KL. When the covariances differ, KL adds the covariance term and becomes
 * asymmetric. That collapse is the app's payload; this module computes it (and
 * the wider divergence family) so the view can show it happen.
 *
 * A Gaussian is stored by its *principal axes* — a rotation θ and two standard
 * deviations (σ₁, σ₂) — never as raw matrix entries. In that form Σ is positive
 * semidefinite by construction, and Σ⁻¹, det Σ, Σ^{1/2} and Σ^{-1/2} are all
 * two-line closed forms with a single failure mode (σ → 0), closed by a floor.
 *
 * Closed-form measures (KL, Mahalanobis, Bhattacharyya, Hellinger) are exact.
 * Total variation and Bayes error have NO elementary closed form for two general
 * Gaussians (the Bayes decision boundary is a conic), so they are computed by a
 * numeric overlap integral and flagged `numeric` — never dressed as exact.
 */

export type Vec2 = readonly [number, number];
/** Row-major 2×2 matrix [a, b, c, d] = [[a, b], [c, d]]. Symmetric ⇒ b = c. */
export type Mat2 = readonly [number, number, number, number];

/**
 * A 2-D Gaussian by its principal axes: center `mean`, rotation `theta` (radians,
 * the angle of the first principal axis from +x), and the standard deviations
 * `sigma` = [σ₁, σ₂] along those axes. Covariance is R(θ)·diag(σ₁², σ₂²)·R(θ)ᵀ.
 */
export interface Gaussian2D {
  mean: Vec2;
  theta: number;
  sigma: Vec2;
}

/** Smallest allowed standard deviation — keeps Σ invertible and Σ^{-1/2} finite. */
export const SIGMA_FLOOR = 1e-4;

const TWO_PI = Math.PI * 2;

const clampSigma = (s: number): number => (s > SIGMA_FLOOR ? s : SIGMA_FLOOR);

/* ── plain 2×2 linear algebra ─────────────────────────────────────────────── */

export const matDet = (m: Mat2): number => m[0] * m[3] - m[1] * m[2];
export const matTrace = (m: Mat2): number => m[0] + m[3];

export function matInv(m: Mat2): Mat2 {
  const det = matDet(m);
  const inv = 1 / det;
  return [m[3] * inv, -m[1] * inv, -m[2] * inv, m[0] * inv];
}

export function matMul(a: Mat2, b: Mat2): Mat2 {
  return [
    a[0] * b[0] + a[1] * b[2],
    a[0] * b[1] + a[1] * b[3],
    a[2] * b[0] + a[3] * b[2],
    a[2] * b[1] + a[3] * b[3],
  ];
}

export const matVec = (m: Mat2, v: Vec2): Vec2 => [m[0] * v[0] + m[1] * v[1], m[2] * v[0] + m[3] * v[1]];
export const sub = (u: Vec2, v: Vec2): Vec2 => [u[0] - v[0], u[1] - v[1]];

/** Quadratic form vᵀ·M·v. */
export const quadForm = (m: Mat2, v: Vec2): number => v[0] * (m[0] * v[0] + m[1] * v[1]) + v[1] * (m[2] * v[0] + m[3] * v[1]);

/**
 * Eigenvalues of a *symmetric* 2×2 matrix, ascending. Used for the whitening
 * axes and for recovering (θ, σ) from a covariance matrix.
 */
export function symEig(m: Mat2): { values: [number, number]; angle: number } {
  const a = m[0];
  const b = m[1];
  const d = m[3];
  const half = (a + d) / 2;
  const disc = Math.sqrt(((a - d) / 2) ** 2 + b * b);
  const l1 = half - disc;
  const l2 = half + disc;
  // Angle of the *second* (larger-eigenvalue) axis; principal axis convention.
  const angle = Math.atan2(2 * b, a - d) / 2;
  return { values: [l1, l2], angle };
}

/* ── the Gaussian in principal-axis form ──────────────────────────────────── */

/** Build Σ = R(θ)·diag(v₁, v₂)·R(θ)ᵀ for a rotation θ and diagonal (v₁, v₂). */
function rotatedDiag(theta: number, v1: number, v2: number): Mat2 {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  const a = v1 * c * c + v2 * s * s;
  const b = (v1 - v2) * c * s;
  const d = v1 * s * s + v2 * c * c;
  return [a, b, b, d];
}

/** Covariance matrix Σ. */
export const covariance = (g: Gaussian2D): Mat2 => {
  const s1 = clampSigma(g.sigma[0]);
  const s2 = clampSigma(g.sigma[1]);
  return rotatedDiag(g.theta, s1 * s1, s2 * s2);
};

/** Precision matrix Σ⁻¹ (closed form; no matrix inverse needed). */
export const precision = (g: Gaussian2D): Mat2 => {
  const s1 = clampSigma(g.sigma[0]);
  const s2 = clampSigma(g.sigma[1]);
  return rotatedDiag(g.theta, 1 / (s1 * s1), 1 / (s2 * s2));
};

/** Symmetric square root Σ^{1/2}. */
export const sqrtCov = (g: Gaussian2D): Mat2 => rotatedDiag(g.theta, clampSigma(g.sigma[0]), clampSigma(g.sigma[1]));

/** Symmetric inverse square root Σ^{-1/2} — the whitening map for this Gaussian. */
export const whitenMatrix = (g: Gaussian2D): Mat2 => rotatedDiag(g.theta, 1 / clampSigma(g.sigma[0]), 1 / clampSigma(g.sigma[1]));

/** det Σ = σ₁²·σ₂². */
export const detCov = (g: Gaussian2D): number => {
  const s1 = clampSigma(g.sigma[0]);
  const s2 = clampSigma(g.sigma[1]);
  return s1 * s1 * s2 * s2;
};

/** ln det Σ, in log space for the tails. */
export const logDetCov = (g: Gaussian2D): number => 2 * (Math.log(clampSigma(g.sigma[0])) + Math.log(clampSigma(g.sigma[1])));

/** Recover a Gaussian's (θ, σ₁, σ₂) from a covariance matrix (round-trip helper). */
export function fromCovariance(mean: Vec2, cov: Mat2): Gaussian2D {
  const { values, angle } = symEig(cov);
  // values ascending [l1, l2]; angle points at the l2 axis. Order σ as (√l2, √l1)
  // so σ[0] is along `angle`, matching rotatedDiag's first slot.
  return { mean, theta: angle, sigma: [Math.sqrt(Math.max(0, values[1])), Math.sqrt(Math.max(0, values[0]))] };
}

/* ── densities ────────────────────────────────────────────────────────────── */

/** Squared Mahalanobis distance of a point from the distribution: (x−μ)ᵀΣ⁻¹(x−μ). */
export const mahalanobisSq = (g: Gaussian2D, x: Vec2): number => quadForm(precision(g), sub(x, g.mean));

/** Mahalanobis distance of a point from the distribution (in σ-units). */
export const mahalanobis = (g: Gaussian2D, x: Vec2): number => Math.sqrt(Math.max(0, mahalanobisSq(g, x)));

/** Log density ln p(x), computed in log space (k = 2). */
export function logPdf(g: Gaussian2D, x: Vec2): number {
  return -0.5 * mahalanobisSq(g, x) - Math.log(TWO_PI) - 0.5 * logDetCov(g);
}

/** Density p(x). */
export const pdf = (g: Gaussian2D, x: Vec2): number => Math.exp(logPdf(g, x));

/* ── Mahalanobis separation between two distributions ─────────────────────── */

/**
 * Squared Mahalanobis separation of the two means, measured in Q's metric:
 * (μ_P − μ_Q)ᵀ Σ_Q⁻¹ (μ_P − μ_Q). This is the *directed* separation and the one
 * that appears inside KL(P‖Q). Asymmetric in general (Σ_P ≠ Σ_Q).
 */
export const mahalanobisMeansSq = (p: Gaussian2D, q: Gaussian2D): number => quadForm(precision(q), sub(p.mean, q.mean));

export const mahalanobisMeans = (p: Gaussian2D, q: Gaussian2D): number => Math.sqrt(Math.max(0, mahalanobisMeansSq(p, q)));

/** Average (pooled) covariance Σ̄ = (Σ_P + Σ_Q)/2. */
export function pooledCov(p: Gaussian2D, q: Gaussian2D): Mat2 {
  const cp = covariance(p);
  const cq = covariance(q);
  return [(cp[0] + cq[0]) / 2, (cp[1] + cq[1]) / 2, (cp[2] + cq[2]) / 2, (cp[3] + cq[3]) / 2];
}

/**
 * Squared Mahalanobis separation of the means in the *pooled* metric Σ̄⁻¹ —
 * symmetric, so this is the honest "separation between the two groups" number
 * when their spreads differ. Clearly labeled separately from the directed one.
 */
export const mahalanobisPooledSq = (p: Gaussian2D, q: Gaussian2D): number => quadForm(matInv(pooledCov(p, q)), sub(p.mean, q.mean));

export const mahalanobisPooled = (p: Gaussian2D, q: Gaussian2D): number => Math.sqrt(Math.max(0, mahalanobisPooledSq(p, q)));

/* ── Kullback–Leibler divergence ──────────────────────────────────────────── */

/** KL(P‖Q) closed form for two Gaussians (nats). Asymmetric. */
export function klDivergence(p: Gaussian2D, q: Gaussian2D): number {
  const trTerm = matTrace(matMul(precision(q), covariance(p)));
  const meanTerm = mahalanobisMeansSq(p, q);
  const logDetTerm = logDetCov(q) - logDetCov(p); // ln(detΣ_Q / detΣ_P)
  return 0.5 * (trTerm + meanTerm - 2 + logDetTerm);
}

export interface KLDecomposition {
  /** ½·d_M²(means, in Q's metric) — the mean-shift term (≥ 0). */
  meanShift: number;
  /** ½·Σ(λ − 1 − ln λ) over eigenvalues λ of Σ_Q⁻¹Σ_P — the covariance mismatch (≥ 0). */
  covMismatch: number;
  /** The two eigenvalues λ of Σ_Q⁻¹Σ_P (per-axis mismatch: λ − 1 − ln λ ≥ 0 each). */
  lambdas: [number, number];
  /** meanShift + covMismatch — equals klDivergence(p, q). */
  total: number;
}

/**
 * KL split into its two *non-negative* pieces. The covariance term is rendered
 * as ½·Σ(λ − 1 − ln λ) over the eigenvalues of M = Σ_Q⁻¹Σ_P — manifestly ≥ 0
 * per axis (λ − 1 − ln λ ≥ 0 for all λ > 0), which the raw "tr + ln det − k"
 * form hides. When Σ_P = Σ_Q both λ = 1, the covariance term is 0, and KL
 * collapses to the mean-shift term alone.
 */
export function klDecompose(p: Gaussian2D, q: Gaussian2D): KLDecomposition {
  const m = matMul(precision(q), covariance(p));
  const tr = matTrace(m);
  const det = matDet(m); // = detΣ_P / detΣ_Q, > 0
  const root = Math.sqrt(Math.max(0, tr * tr - 4 * det));
  const l1 = (tr - root) / 2;
  const l2 = (tr + root) / 2;
  const perAxis = (l: number): number => l - 1 - Math.log(l);
  const meanShift = 0.5 * mahalanobisMeansSq(p, q);
  const covMismatch = 0.5 * (perAxis(l1) + perAxis(l2));
  return { meanShift, covMismatch, lambdas: [l1, l2], total: meanShift + covMismatch };
}

/** Symmetrized KL, ½[KL(P‖Q) + KL(Q‖P)] — Jeffreys divergence (nats). */
export const jeffreys = (p: Gaussian2D, q: Gaussian2D): number => 0.5 * (klDivergence(p, q) + klDivergence(q, p));

/* ── Bhattacharyya, Hellinger ─────────────────────────────────────────────── */

export interface Bhattacharyya {
  /** Bhattacharyya distance D_B = −ln BC (≥ 0, symmetric, not a metric). */
  distance: number;
  /** Bhattacharyya coefficient BC = ∫√(pq) ∈ (0, 1]. 1 ⇔ identical. */
  coefficient: number;
}

/**
 * Bhattacharyya distance/coefficient for two Gaussians — closed form:
 *   D_B = ⅛·(Δμ)ᵀ Σ̄⁻¹ (Δμ) + ½·ln( det Σ̄ / √(detΣ_P·detΣ_Q) ),  Σ̄ = (Σ_P+Σ_Q)/2.
 * The first term is ⅛·d_M²(pooled) — the symmetric sibling of KL's ½·d_M².
 */
export function bhattacharyya(p: Gaussian2D, q: Gaussian2D): Bhattacharyya {
  const sBar = pooledCov(p, q);
  const meanTerm = 0.125 * quadForm(matInv(sBar), sub(p.mean, q.mean));
  const covTerm = 0.5 * (Math.log(matDet(sBar)) - 0.5 * (logDetCov(p) + logDetCov(q)));
  const distance = meanTerm + covTerm;
  return { distance, coefficient: Math.exp(-distance) };
}

export interface Hellinger {
  /** Squared Hellinger H² = 1 − BC ∈ [0, 1]. */
  squared: number;
  /** Hellinger distance H = √(1 − BC) ∈ [0, 1] — a true metric. */
  distance: number;
}

/** Hellinger distance from the Bhattacharyya coefficient: H² = 1 − BC. */
export function hellinger(p: Gaussian2D, q: Gaussian2D): Hellinger {
  const bc = bhattacharyya(p, q).coefficient;
  const squared = Math.max(0, 1 - bc);
  return { squared, distance: Math.sqrt(squared) };
}

/** Bhattacharyya upper bound on the equal-prior Bayes error: P_e ≤ ½·BC. */
export const bayesErrorBound = (p: Gaussian2D, q: Gaussian2D): number => 0.5 * bhattacharyya(p, q).coefficient;

/* ── Wasserstein-2 (Bures / optimal transport) ────────────────────────────── */

export interface Wasserstein {
  /** Squared 2-Wasserstein distance W₂². */
  squared: number;
  /** W₂ — a true metric; the geometry-aware "how far must the mass move" distance. */
  distance: number;
}

/**
 * The 2-Wasserstein (Bures/Fréchet) distance between two Gaussians — closed form:
 *   W₂² = |μ_P − μ_Q|² + tr(Σ_P + Σ_Q − 2(Σ_Q^{½}Σ_P Σ_Q^{½})^{½}).
 * Unlike KL/Hellinger/TV (which compare densities pointwise), this is an
 * *optimal-transport* distance: how far probability mass must physically move.
 * For a 2×2 SPD matrix M, tr(√M) = √(tr M + 2√det M) (eigenvalues a,b give
 * (√a+√b)² = a+b+2√ab), and by the cyclic trace tr(Σ_Q^{½}Σ_P Σ_Q^{½}) =
 * tr(Σ_P Σ_Q), det(·) = detΣ_P·detΣ_Q — so no explicit matrix root is needed.
 * When Σ_P = Σ_Q the covariance term vanishes and W₂ is the plain Euclidean gap
 * between the means (contrast KL, which becomes ½·d_M²).
 */
export function wasserstein2(p: Gaussian2D, q: Gaussian2D): Wasserstein {
  const sp = covariance(p);
  const sq = covariance(q);
  const d = sub(p.mean, q.mean);
  const meanTerm = d[0] * d[0] + d[1] * d[1];
  const trM = matTrace(matMul(sp, sq)); // tr(Σ_P Σ_Q)
  const detM = detCov(p) * detCov(q);
  const traceRoot = Math.sqrt(Math.max(0, trM + 2 * Math.sqrt(Math.max(0, detM))));
  const bures = Math.max(0, matTrace(sp) + matTrace(sq) - 2 * traceRoot);
  const squared = meanTerm + bures;
  return { squared, distance: Math.sqrt(Math.max(0, squared)) };
}

/* ── total variation & Bayes error (numeric — no Gaussian closed form) ─────── */

export interface OverlapResult {
  /** Overlap mass ∫ min(p, q) dx ∈ [0, 1]. */
  overlap: number;
  /** Total variation ½∫|p − q| dx ∈ [0, 1] (a true metric). */
  tv: number;
  /** Bayes error ∫ min(π_P·p, π_Q·q) dx for the given priors — min classifier error. */
  bayesError: number;
  /** The integration window used (for drawing the overlap region). */
  box: { xmin: number; xmax: number; ymin: number; ymax: number };
  /** Grid resolution actually used. */
  grid: number;
}

/**
 * Numeric overlap integral over an adaptive window covering both Gaussians.
 * Returns total variation, overlap mass, and Bayes error. These have no
 * elementary closed form for two general Gaussians (the decision boundary is a
 * conic), so callers must present them as approximate (`≈`). `priorP` is the
 * prior probability of class P for the Bayes-error term (default equal priors).
 */
export function overlapIntegral(
  p: Gaussian2D,
  q: Gaussian2D,
  opts: { grid?: number; priorP?: number; sigmas?: number } = {},
): OverlapResult {
  const grid = opts.grid ?? 220;
  const priorP = opts.priorP ?? 0.5;
  const priorQ = 1 - priorP;
  const pad = opts.sigmas ?? 6;

  const cp = covariance(p);
  const cq = covariance(q);
  const hx = pad * Math.max(Math.sqrt(cp[0]), Math.sqrt(cq[0]));
  const hy = pad * Math.max(Math.sqrt(cp[3]), Math.sqrt(cq[3]));
  const xmin = Math.min(p.mean[0], q.mean[0]) - hx;
  const xmax = Math.max(p.mean[0], q.mean[0]) + hx;
  const ymin = Math.min(p.mean[1], q.mean[1]) - hy;
  const ymax = Math.max(p.mean[1], q.mean[1]) + hy;

  const dx = (xmax - xmin) / grid;
  const dy = (ymax - ymin) / grid;
  const dA = dx * dy;

  let overlap = 0;
  let absdiff = 0;
  let bayes = 0;
  for (let i = 0; i < grid; i++) {
    const x = xmin + (i + 0.5) * dx;
    for (let j = 0; j < grid; j++) {
      const y = ymin + (j + 0.5) * dy;
      const pv = pdf(p, [x, y]);
      const qv = pdf(q, [x, y]);
      overlap += Math.min(pv, qv);
      absdiff += Math.abs(pv - qv);
      bayes += Math.min(priorP * pv, priorQ * qv);
    }
  }
  return {
    overlap: overlap * dA,
    tv: 0.5 * absdiff * dA,
    bayesError: bayes * dA,
    box: { xmin, xmax, ymin, ymax },
    grid,
  };
}
