import { describe, it, expect } from 'vitest';
import {
  Gaussian2D, Vec2,
  covariance, precision, whitenMatrix, detCov, fromCovariance,
  matMul, matVec, sub,
  pdf, logPdf, mahalanobis, mahalanobisMeansSq, mahalanobisPooledSq,
  klDivergence, klDecompose, jeffreys,
  bhattacharyya, hellinger, bayesErrorBound, overlapIntegral,
} from '../gaussian2d';

/* ── helpers ──────────────────────────────────────────────────────────────── */

// Standard normal CDF via a high-accuracy erf (Abramowitz & Stegun 7.1.26).
function erf(x: number): number {
  const s = Math.sign(x);
  const a = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * a);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-a * a);
  return s * y;
}
const Phi = (z: number): number => 0.5 * (1 + erf(z / Math.SQRT2));

// Independent numeric 2-D integral of an arbitrary integrand over a wide window.
function integrate(p: Gaussian2D, q: Gaussian2D, f: (x: Vec2) => number, grid = 260, pad = 7): number {
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
  let s = 0;
  for (let i = 0; i < grid; i++) {
    const x = xmin + (i + 0.5) * dx;
    for (let j = 0; j < grid; j++) {
      const y = ymin + (j + 0.5) * dy;
      s += f([x, y]);
    }
  }
  return s * dx * dy;
}

const G = (mean: Vec2, theta: number, s1: number, s2: number): Gaussian2D => ({ mean, theta, sigma: [s1, s2] });

// A spread of test pairs: same/different means, spreads, rotations.
const PAIRS: [Gaussian2D, Gaussian2D][] = [
  [G([0, 0], 0, 1, 1), G([2, 0], 0, 1, 1)], // equal spherical, shifted
  [G([0, 0], 0, 1.5, 0.6), G([1, 1], 0.7, 0.9, 1.3)], // full general
  [G([-1, 0.5], 0.3, 1, 2), G([1.5, -0.5], -0.4, 1.4, 0.7)],
  [G([0, 0], 0, 1, 1), G([0, 0], 0, 2, 0.5)], // concentric, different shape
];

/* ── linear algebra & parametrization ─────────────────────────────────────── */

describe('covariance / precision / whitening', () => {
  it('precision is the inverse of covariance', () => {
    for (const [p] of PAIRS) {
      const prod = matMul(covariance(p), precision(p));
      expect(prod[0]).toBeCloseTo(1, 9);
      expect(prod[1]).toBeCloseTo(0, 9);
      expect(prod[2]).toBeCloseTo(0, 9);
      expect(prod[3]).toBeCloseTo(1, 9);
    }
  });

  it('whitening Σ^{-1/2} maps Σ to the identity: WᵀΣW = I', () => {
    for (const [p] of PAIRS) {
      const w = whitenMatrix(p);
      const m = matMul(matMul(w, covariance(p)), w); // W symmetric ⇒ WΣW
      expect(m[0]).toBeCloseTo(1, 9);
      expect(m[1]).toBeCloseTo(0, 9);
      expect(m[3]).toBeCloseTo(1, 9);
    }
  });

  it('fromCovariance round-trips the covariance matrix', () => {
    for (const [p] of PAIRS) {
      const c = covariance(p);
      const back = covariance(fromCovariance(p.mean, c));
      for (let k = 0; k < 4; k++) expect(back[k]).toBeCloseTo(c[k], 9);
    }
  });
});

/* ── densities ────────────────────────────────────────────────────────────── */

describe('density', () => {
  it('pdf integrates to ~1', () => {
    for (const [p] of PAIRS) {
      expect(integrate(p, p, (x) => pdf(p, x))).toBeCloseTo(1, 2);
    }
  });

  it('logPdf equals ln pdf', () => {
    for (const [p] of PAIRS) {
      for (const x of [[0, 0], [1, -1], [0.3, 0.7]] as Vec2[]) {
        expect(logPdf(p, x)).toBeCloseTo(Math.log(pdf(p, x)), 10);
      }
    }
  });

  it('Mahalanobis distance is Euclidean under whitening', () => {
    // Whitening the displacement from the mean turns d_M into an ordinary length.
    for (const [p] of PAIRS) {
      const x: Vec2 = [p.mean[0] + 0.9, p.mean[1] - 1.3];
      const w = matVec(whitenMatrix(p), sub(x, p.mean));
      expect(Math.hypot(w[0], w[1])).toBeCloseTo(mahalanobis(p, x), 9);
    }
  });
});

/* ── KL: the core identity ────────────────────────────────────────────────── */

describe('KL divergence', () => {
  it('KL(P‖P) = 0 and KL ≥ 0', () => {
    for (const [p, q] of PAIRS) {
      expect(klDivergence(p, p)).toBeCloseTo(0, 9);
      expect(klDivergence(p, q)).toBeGreaterThanOrEqual(-1e-9);
    }
  });

  it('closed form equals the numeric integral ∫ p·(ln p − ln q)  (both ways)', () => {
    for (const [p, q] of PAIRS) {
      const numeric = integrate(p, q, (x) => {
        const pv = pdf(p, x);
        return pv > 0 ? pv * (logPdf(p, x) - logPdf(q, x)) : 0;
      });
      expect(klDivergence(p, q)).toBeCloseTo(numeric, 2);
    }
  });

  it('decomposition sums to KL and its parts are non-negative', () => {
    for (const [p, q] of PAIRS) {
      const d = klDecompose(p, q);
      expect(d.total).toBeCloseTo(klDivergence(p, q), 9);
      expect(d.meanShift).toBeGreaterThanOrEqual(-1e-12);
      expect(d.covMismatch).toBeGreaterThanOrEqual(-1e-12);
    }
  });

  it('EXACT collapse: equal covariances ⇒ KL = ½·d_M², and d_M directed = pooled', () => {
    const p = G([0, 0], 0.4, 1.3, 0.7);
    const q = G([1.5, -0.8], 0.4, 1.3, 0.7); // same θ, σ ⇒ same Σ
    const d = klDecompose(p, q);
    expect(d.covMismatch).toBeCloseTo(0, 9);
    expect(d.lambdas[0]).toBeCloseTo(1, 9);
    expect(d.lambdas[1]).toBeCloseTo(1, 9);
    expect(klDivergence(p, q)).toBeCloseTo(0.5 * mahalanobisMeansSq(p, q), 9);
    // With equal Σ the directed and pooled Mahalanobis coincide.
    expect(mahalanobisMeansSq(p, q)).toBeCloseTo(mahalanobisPooledSq(p, q), 9);
  });

  it('KL is asymmetric when covariances differ; Jeffreys is symmetric', () => {
    // Genuinely asymmetric: different means AND non-symmetric covariance pair
    // (not related by a symmetry that would force KL(P‖Q) = KL(Q‖P)).
    const p = G([0, 0], 0, 2, 0.5); // elongated at the origin
    const q = G([2, 0], 0, 1, 1); // spherical, shifted — different metric each way
    expect(Math.abs(klDivergence(p, q) - klDivergence(q, p))).toBeGreaterThan(0.5);
    expect(jeffreys(p, q)).toBeCloseTo(jeffreys(q, p), 12);
  });
});

/* ── Bhattacharyya / Hellinger ────────────────────────────────────────────── */

describe('Bhattacharyya & Hellinger', () => {
  it('BC = ∫√(pq): closed form matches the numeric integral', () => {
    for (const [p, q] of PAIRS) {
      const numeric = integrate(p, q, (x) => Math.sqrt(pdf(p, x) * pdf(q, x)));
      expect(bhattacharyya(p, q).coefficient).toBeCloseTo(numeric, 2);
    }
  });

  it('identical ⇒ D_B = 0, BC = 1, H = 0; and symmetric', () => {
    const p = G([0.2, -0.4], 0.5, 1.1, 0.8);
    expect(bhattacharyya(p, p).distance).toBeCloseTo(0, 9);
    expect(bhattacharyya(p, p).coefficient).toBeCloseTo(1, 9);
    // H = √(1−BC) loses half its digits to the square root near identical, so
    // ~1e-8 is the honest floor here — effectively zero for display.
    expect(hellinger(p, p).distance).toBeCloseTo(0, 6);
    for (const [a, b] of PAIRS) {
      expect(bhattacharyya(a, b).distance).toBeCloseTo(bhattacharyya(b, a).distance, 12);
    }
  });

  it('Hellinger stays in [0,1] and H² = 1 − BC', () => {
    for (const [p, q] of PAIRS) {
      const h = hellinger(p, q);
      expect(h.squared).toBeCloseTo(1 - bhattacharyya(p, q).coefficient, 12);
      expect(h.distance).toBeGreaterThanOrEqual(0);
      expect(h.distance).toBeLessThanOrEqual(1);
    }
  });
});

/* ── total variation & Bayes error (numeric) + the analytic bounds ────────── */

describe('total variation & Bayes error', () => {
  it('equal spherical Gaussians: Bayes error = Φ(−δ/2), TV = 2Φ(δ/2) − 1', () => {
    for (const delta of [1, 2, 3]) {
      const p = G([0, 0], 0, 1, 1);
      const q = G([delta, 0], 0, 1, 1);
      const r = overlapIntegral(p, q, { grid: 400 });
      expect(r.bayesError).toBeCloseTo(Phi(-delta / 2), 3);
      expect(r.tv).toBeCloseTo(2 * Phi(delta / 2) - 1, 3);
      expect(r.overlap).toBeCloseTo(1 - r.tv, 3); // ∫min = 1 − TV
    }
  });

  it('Bayes error ≤ ½·BC  (the Bhattacharyya bound holds numerically)', () => {
    for (const [p, q] of PAIRS) {
      const r = overlapIntegral(p, q, { grid: 300 });
      expect(r.bayesError).toBeLessThanOrEqual(bayesErrorBound(p, q) + 1e-3);
    }
  });

  it('Pinsker: TV ≤ √(KL/2)', () => {
    for (const [p, q] of PAIRS) {
      const r = overlapIntegral(p, q, { grid: 300 });
      expect(r.tv).toBeLessThanOrEqual(Math.sqrt(klDivergence(p, q) / 2) + 1e-3);
    }
  });
});

/* ── degenerate covariance is floored, never NaN ──────────────────────────── */

describe('degenerate covariance', () => {
  it('near-singular σ does not produce NaN in the divergences', () => {
    const p = G([0, 0], 0, 1, 0); // σ₂ = 0 → floored
    const q = G([1, 0], 0.5, 1e-9, 2); // σ₁ ~ 0 → floored
    expect(Number.isFinite(klDivergence(p, q))).toBe(true);
    expect(Number.isFinite(klDivergence(q, p))).toBe(true);
    expect(Number.isFinite(bhattacharyya(p, q).distance)).toBe(true);
    expect(Number.isFinite(detCov(p))).toBe(true);
    expect(detCov(p)).toBeGreaterThan(0);
  });
});
