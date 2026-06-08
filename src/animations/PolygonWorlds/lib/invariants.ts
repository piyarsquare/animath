/**
 * Polygon Worlds — the geometry kernel's invariant battery.
 *
 * Because the only CI gate is `npm run build` (a type-check), these executable
 * assertions are the *real* correctness gate for the kernel: they pin the math to
 * facts that must hold in every constant-curvature geometry. Run via
 * `scripts/verify-geometry.ts` (mirrors `scripts/verify-schemas.ts`). The kernel
 * interface is frozen only once this battery is green.
 *
 * Each check returns a {@link Check}; the runner tallies failures. Checks sweep
 * κ ∈ {positive, flat, negative} so the unified model is proven across curvature,
 * not just in one regime.
 */

import {
  Mat3, Vec3, IDENTITY3, mul, applyMat, det3, inv3, transpose3,
  cosK, sinK, form, rotation, translateX, translateY, translateDir, REFLECT_X,
  distance, geodesicPoint, ORIGIN,
  makeFrame, framePos, stepForward, turn, isometry, originTo, angleAt,
} from './cayleyKlein';

export interface Check { name: string; pass: boolean; detail: string }

const ok = (name: string, pass: boolean, detail = ''): Check => ({ name, pass, detail });
const approx = (a: number, b: number, eps = 1e-7) => Math.abs(a - b) <= eps;
const vapprox = (a: Vec3, b: Vec3, eps = 1e-7) => approx(a[0], b[0], eps) && approx(a[1], b[1], eps) && approx(a[2], b[2], eps);
const mapprox = (a: Mat3, b: Mat3, eps = 1e-7) => a.every((x, i) => approx(x, b[i], eps));

/** The Gκ form as a matrix, for the form-preservation test. */
const Gk = (k: number): Mat3 => [k, 0, 0, 0, k, 0, 0, 0, 1];

/** A reproducible LCG so the random-isometry checks are deterministic. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

/** A pseudo-random isometry at curvature κ (compose a few generators). */
function randomIsometry(k: number, rnd: () => number): Mat3 {
  let m = IDENTITY3;
  for (let i = 0; i < 4; i++) {
    m = mul(m, rotation((rnd() - 0.5) * 6));
    m = mul(m, translateX(k, (rnd() - 0.5) * 3));
    m = mul(m, translateY(k, (rnd() - 0.5) * 3));
    if (rnd() < 0.5) m = mul(m, REFLECT_X);
  }
  return m;
}

// ─────────────────────────────────────────────────────────────────────────────

/** The curvature-trig identities Cκ² + κ Sκ² = 1 and the derivative relations. */
function trigChecks(k: number): Check[] {
  const out: Check[] = [];
  let worstPyth = 0, worstDeriv = 0;
  const h = 1e-6;
  for (const t of [-2.3, -0.7, 0, 0.4, 1.1, 2.0]) {
    const c = cosK(k, t), s = sinK(k, t);
    worstPyth = Math.max(worstPyth, Math.abs(c * c + k * s * s - 1));
    // Cκ' = −κ Sκ ; Sκ' = Cκ  (central difference)
    const dC = (cosK(k, t + h) - cosK(k, t - h)) / (2 * h);
    const dS = (sinK(k, t + h) - sinK(k, t - h)) / (2 * h);
    worstDeriv = Math.max(worstDeriv, Math.abs(dC - (-k * s)), Math.abs(dS - c));
  }
  out.push(ok(`κ=${k}: Cκ²+κSκ²=1`, worstPyth < 1e-9, `max err ${worstPyth.toExponential(2)}`));
  out.push(ok(`κ=${k}: Cκ'=−κSκ, Sκ'=Cκ`, worstDeriv < 1e-4, `max err ${worstDeriv.toExponential(2)}`));
  return out;
}

/** Every generator must preserve the form: Mᵀ Gκ M = Gκ. */
function formPreservation(k: number): Check[] {
  const G = Gk(k);
  const gens: [string, Mat3][] = [
    ['rotation', rotation(0.9)],
    ['translateX', translateX(k, 1.3)],
    ['translateY', translateY(k, -0.8)],
    ['reflectX', REFLECT_X],
    ['translateDir', translateDir(k, 0.5, 1.1)],
  ];
  return gens.map(([name, m]) => {
    const lhs = mul(transpose3(m), mul(G, m));
    return ok(`κ=${k}: ${name} preserves Gκ`, mapprox(lhs, G, 1e-9));
  });
}

/** Group axioms: associativity, identity, inverse. */
function groupAxioms(k: number): Check[] {
  const rnd = rng(7);
  const A = randomIsometry(k, rnd), B = randomIsometry(k, rnd), C = randomIsometry(k, rnd);
  const assoc = mapprox(mul(mul(A, B), C), mul(A, mul(B, C)), 1e-7);
  const ident = mapprox(mul(A, IDENTITY3), A) && mapprox(mul(IDENTITY3, A), A);
  let worstInv = 0;
  for (let i = 0; i < 8; i++) {
    const M = randomIsometry(k, rnd);
    worstInv = Math.max(worstInv, ...mul(M, inv3(M)).map((x, j) => Math.abs(x - IDENTITY3[j])));
  }
  return [
    ok(`κ=${k}: associativity`, assoc),
    ok(`κ=${k}: identity`, ident),
    ok(`κ=${k}: M·M⁻¹ = I`, worstInv < 1e-7, `max err ${worstInv.toExponential(2)}`),
  ];
}

/** Geodesics: walking arc length s from O lands at distance s, on the shell. */
function geodesicChecks(k: number): Check[] {
  let worstDist = 0, worstShell = 0;
  for (const s of [0.3, 1.0, 2.5]) for (const th of [0, 1.2, -2.0]) {
    const p = geodesicPoint(k, th, s);
    worstDist = Math.max(worstDist, Math.abs(distance(k, ORIGIN, p) - s));
    worstShell = Math.max(worstShell, Math.abs(form(k, p, p) - 1));
    const f = stepForward(turn(makeFrame(k), th), s);
    worstDist = Math.max(worstDist, Math.abs(distance(k, ORIGIN, framePos(f)) - s));
  }
  return [
    ok(`κ=${k}: distance(O, step s) = s`, worstDist < 1e-7, `max err ${worstDist.toExponential(2)}`),
    ok(`κ=${k}: geodesic stays on shell`, worstShell < 1e-9, `max err ${worstShell.toExponential(2)}`),
  ];
}

/** Isometries preserve distance and map the shell to itself. */
function isometryPreservesDistance(k: number): Check[] {
  const rnd = rng(99);
  let worst = 0, worstShell = 0;
  const pts: Vec3[] = [ORIGIN, geodesicPoint(k, 0.4, 1.0), geodesicPoint(k, 2.1, 0.6), geodesicPoint(k, -1.0, 1.8)];
  for (let i = 0; i < 6; i++) {
    const M = randomIsometry(k, rnd);
    for (let a = 0; a < pts.length; a++) {
      const ip = applyMat(M, pts[a]);
      worstShell = Math.max(worstShell, Math.abs(form(k, ip, ip) - 1));
      for (let b = a + 1; b < pts.length; b++) {
        const d0 = distance(k, pts[a], pts[b]);
        const d1 = distance(k, ip, applyMat(M, pts[b]));
        worst = Math.max(worst, Math.abs(d0 - d1));
      }
    }
  }
  return [
    ok(`κ=${k}: isometry preserves distance`, worst < 1e-6, `max err ${worst.toExponential(2)}`),
    ok(`κ=${k}: isometry keeps shell`, worstShell < 1e-9, `max err ${worstShell.toExponential(2)}`),
  ];
}

/** Orientation: rotations/translations det +1; reflections det −1. */
function orientationChecks(k: number): Check[] {
  return [
    ok(`κ=${k}: det(rotation)=+1`, approx(det3(rotation(0.7)), 1)),
    ok(`κ=${k}: det(translateX)=+1`, approx(det3(translateX(k, 1.1)), 1)),
    ok(`κ=${k}: det(reflectX)=−1`, approx(det3(REFLECT_X), -1)),
    ok(`κ=${k}: det(glide)=−1`, approx(det3(mul(translateX(k, 0.9), REFLECT_X)), -1)),
  ];
}

/**
 * Gauss–Bonnet: the angle excess of a geodesic triangle equals κ·area.
 *
 * Independent check (not circular): the area comes from the *side lengths*
 * (½·a·b·sin γ, exact to leading order for a small triangle), the excess comes
 * from the kernel's *angle measurement*. For a small isoceles triangle the
 * relation excess = κ·area holds to O(size²), so we test a small one.
 */
function gaussBonnetSmall(k: number): Check {
  const L = 0.08, gamma = Math.PI / 3; // two sides L at 60° at A=O
  const A = ORIGIN;
  const B = geodesicPoint(k, 0, L);
  const C = geodesicPoint(k, gamma, L);
  const angA = angleAt(k, A, B, C);
  const angB = angleAt(k, B, A, C);
  const angC = angleAt(k, C, A, B);
  const excess = angA + angB + angC - Math.PI;
  const areaFlat = 0.5 * L * L * Math.sin(gamma);
  const predicted = k * areaFlat;
  // tolerance: the O(size²) correction scales the leading term
  const tol = Math.max(1e-9, Math.abs(predicted) * 0.02 + L * L * L * L);
  return ok(
    `κ=${k}: excess = κ·area (small triangle)`,
    Math.abs(excess - predicted) < tol,
    `excess ${excess.toExponential(3)} vs κ·area ${predicted.toExponential(3)}`,
  );
}

/**
 * Exact large-scale anchors that pin the *curvature scale* (not just the sign):
 *  • κ>0: a spherical octant has three right angles (excess = π/2) and closes.
 *  • κ=0: a right-angled square closes with zero holonomy.
 *  • κ<0: a geodesic triangle has negative excess.
 */
function gaussBonnetAnchors(): Check[] {
  const out: Check[] = [];

  // Spherical octant at κ>0: walk a quarter great circle, turn 90°, ×3.
  {
    const k = 0.5;
    const quarter = (Math.PI / 2) / Math.sqrt(k); // distance of a 90° great-circle arc
    let f = makeFrame(k);
    for (let i = 0; i < 3; i++) { f = stepForward(f, quarter); f = turn(f, Math.PI / 2); }
    const closed = vapprox(framePos(f), ORIGIN, 1e-6);
    // the three corners are each π/2 by construction → excess = π/2 = κ·area
    const A = ORIGIN, B = geodesicPoint(k, 0, quarter), C = geodesicPoint(k, Math.PI / 2, quarter);
    const excess = angleAt(k, A, B, C) + angleAt(k, B, A, C) + angleAt(k, C, A, B) - Math.PI;
    out.push(ok('κ=0.5: spherical octant closes', closed));
    out.push(ok('κ=0.5: octant excess = π/2', approx(excess, Math.PI / 2, 1e-6), `excess ${excess.toFixed(6)}`));
  }

  // Flat square closes with zero holonomy.
  {
    const k = 0;
    let f = makeFrame(k);
    const g0 = f.g;
    for (let i = 0; i < 4; i++) { f = stepForward(f, 1.7); f = turn(f, Math.PI / 2); }
    out.push(ok('κ=0: flat square closes', vapprox(framePos(f), ORIGIN, 1e-9)));
    out.push(ok('κ=0: flat square zero holonomy', mapprox(f.g, g0, 1e-9)));
  }

  // Hyperbolic triangle has negative excess.
  {
    const k = -0.5;
    const A = ORIGIN, B = geodesicPoint(k, 0, 1.5), C = geodesicPoint(k, 1.0, 1.5);
    const excess = angleAt(k, A, B, C) + angleAt(k, B, A, C) + angleAt(k, C, A, B) - Math.PI;
    out.push(ok('κ=−0.5: hyperbolic triangle excess < 0', excess < -1e-3, `excess ${excess.toFixed(6)}`));
  }

  return out;
}

/** Sanity: the Isometry wrapper agrees with the raw matrix ops. */
function wrapperChecks(k: number): Check[] {
  const a = isometry(k, translateX(k, 0.7));
  const b = isometry(k, rotation(0.9));
  const composed = a.compose(b); // a ∘ b
  const p = geodesicPoint(k, 0.3, 1.0);
  const direct = applyMat(a.m, applyMat(b.m, p));
  return [
    ok(`κ=${k}: Isometry.compose = a∘b`, vapprox(composed.apply(p), direct)),
    ok(`κ=${k}: Isometry.inverse`, vapprox(a.compose(a.inverse()).apply(p), p)),
  ];
}

/** Run the whole battery across the three curvature regimes. */
export function runBattery(): Check[] {
  const out: Check[] = [];
  const kappas = [0.5, 0, -0.5];
  for (const k of kappas) {
    out.push(...trigChecks(k));
    out.push(...formPreservation(k));
    out.push(...groupAxioms(k));
    out.push(...geodesicChecks(k));
    out.push(...isometryPreservesDistance(k));
    out.push(...orientationChecks(k));
    out.push(gaussBonnetSmall(k));
    out.push(...wrapperChecks(k));
  }
  out.push(...gaussBonnetAnchors());
  return out;
}
