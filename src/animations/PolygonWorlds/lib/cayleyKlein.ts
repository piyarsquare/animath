/**
 * Polygon Worlds — the geometry kernel: one constant-curvature model for all κ.
 *
 * This is the Three.js-free math core the whole engine develops from. There is
 * ONE representation; the curvature κ is a parameter, never a branch. Spherical
 * (κ > 0), Euclidean (κ = 0) and hyperbolic (κ < 0) are the same formulas at
 * different κ, and the κ → 0 limit is taken analytically (a power series), so
 * nothing special-cases the flat case.
 *
 * ## The model
 *
 * Points live in ℝ³ with coordinates `(x, y, w)` and the symmetric bilinear form
 *
 *     ⟨P, Q⟩_κ = κ·(x_P x_Q + y_P y_Q) + w_P w_Q        (form Gκ = diag(κ, κ, 1))
 *
 * The surface is the unit shell `⟨P, P⟩_κ = 1`. The basepoint ("origin") is
 * `O = (0, 0, 1)`; its tangent plane is the (x, y)-plane, on which the *true*
 * Riemannian metric is the ordinary Euclidean one for every κ (the κ in Gκ
 * cancels the 1/κ in the induced metric — which is exactly why this model has no
 * blow-up at κ = 0).
 *
 * A point at geodesic distance r in direction θ from O is
 *     P(r, θ) = (Sκ(r)·cosθ, Sκ(r)·sinθ, Cκ(r))
 * where Cκ, Sκ are the **curvature-trig** functions below.
 *
 * ## Convention note (vs the plan's sketch)
 *
 * The build plan's sketch wrote both "κ = curvature (κ>0 ⇒ sphere)" and "form
 * diag(1,1,−κ)", which are opposite sign conventions. We take **κ = Gaussian
 * curvature** (matching the χ → curvature table that is the load-bearing
 * decision) and the form `diag(κ, κ, 1)`; the two differ only by a coordinate
 * relabelling. With this choice the matrix exponentials of the generators below
 * reduce continuously to Euclidean translations/rotations at κ = 0.
 *
 * ## Isometries
 *
 * Isometries are the 3×3 matrices preserving Gκ (the group O(Gκ), including the
 * orientation-reversing reflections). We build them as matrix exponentials of the
 * Lie-algebra generators, so `det = ±1` reports orientation directly and
 * composition is matrix multiplication.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Tiny linear algebra (row-major 3×3, column vectors). Three.js-free on purpose.
// ─────────────────────────────────────────────────────────────────────────────

export type Vec3 = readonly [number, number, number];
/** Row-major 3×3 matrix: [m00,m01,m02, m10,m11,m12, m20,m21,m22]. */
export type Mat3 = readonly [number, number, number, number, number, number, number, number, number];

export const dot3 = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const add3 = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub3 = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale3 = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];

/** Apply a matrix to a column vector: M·v. */
export function applyMat(m: Mat3, v: Vec3): Vec3 {
  return [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
    m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
    m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
  ];
}

/** Matrix product A·B. */
export function mul(a: Mat3, b: Mat3): Mat3 {
  const r = new Array(9).fill(0);
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++)
      r[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j];
  return r as unknown as Mat3;
}

export const IDENTITY3: Mat3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];

export function det3(m: Mat3): number {
  return (
    m[0] * (m[4] * m[8] - m[5] * m[7]) -
    m[1] * (m[3] * m[8] - m[5] * m[6]) +
    m[2] * (m[3] * m[7] - m[4] * m[6])
  );
}

/** General 3×3 inverse (robust for any κ, including κ = 0). */
export function inv3(m: Mat3): Mat3 {
  const d = det3(m);
  if (Math.abs(d) < 1e-14) throw new Error('inv3: singular matrix');
  const id = 1 / d;
  return [
    (m[4] * m[8] - m[5] * m[7]) * id,
    (m[2] * m[7] - m[1] * m[8]) * id,
    (m[1] * m[5] - m[2] * m[4]) * id,
    (m[5] * m[6] - m[3] * m[8]) * id,
    (m[0] * m[8] - m[2] * m[6]) * id,
    (m[2] * m[3] - m[0] * m[5]) * id,
    (m[3] * m[7] - m[4] * m[6]) * id,
    (m[1] * m[6] - m[0] * m[7]) * id,
    (m[0] * m[4] - m[1] * m[3]) * id,
  ];
}

export function transpose3(m: Mat3): Mat3 {
  return [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];
}

// ─────────────────────────────────────────────────────────────────────────────
// Curvature trigonometry — entire (analytic) functions of κ and t.
//
//   Cκ(t) = Σ (-κt²)^n / (2n)!      → cos(√κ t)   κ>0 · 1           κ=0 · cosh(√−κ t) κ<0
//   Sκ(t) = t·Σ (-κt²)^n / (2n+1)!  → sin(√κ t)/√κ · t · sinh(√−κ t)/√−κ
//
// They satisfy  Cκ' = −κ Sκ,  Sκ' = Cκ,  and the Pythagorean identity
//   Cκ(t)² + κ Sκ(t)² = 1.
// The method (closed form vs series) is chosen on |κt²| only — there is no
// `κ === 0` test, so the flat case is reached as a smooth limit.
// ─────────────────────────────────────────────────────────────────────────────

/** Cκ(t) — the curved cosine. */
export function cosK(kappa: number, t: number): number {
  const a = kappa * t * t; // (√κ t)², signed
  if (Math.abs(a) < 1e-8) return 1 - a / 2 + (a * a) / 24; // analytic κ→0 series
  return a > 0 ? Math.cos(Math.sqrt(a)) : Math.cosh(Math.sqrt(-a));
}

/** Sκ(t) — the curved sine (already divided by √κ, so Sκ(t) → t as κ → 0). */
export function sinK(kappa: number, t: number): number {
  const a = kappa * t * t;
  if (Math.abs(a) < 1e-8) return t * (1 - a / 6 + (a * a) / 120);
  return a > 0 ? Math.sin(Math.sqrt(kappa) * t) / Math.sqrt(kappa)
    : Math.sinh(Math.sqrt(-kappa) * t) / Math.sqrt(-kappa);
}

/** Tκ(t) = Sκ/Cκ — the curved tangent. */
export function tanK(kappa: number, t: number): number {
  return sinK(kappa, t) / cosK(kappa, t);
}

// ─────────────────────────────────────────────────────────────────────────────
// The model + isometry generators
// ─────────────────────────────────────────────────────────────────────────────

/** The basepoint O = (0, 0, 1). */
export const ORIGIN: Vec3 = [0, 0, 1];

/** Gκ inner product ⟨P, Q⟩_κ = κ(x x' + y y') + w w'. */
export function form(kappa: number, p: Vec3, q: Vec3): number {
  return kappa * (p[0] * q[0] + p[1] * q[1]) + p[2] * q[2];
}

/** Re-project a vector back onto the unit shell ⟨P,P⟩_κ = 1 (numerical hygiene
 *  after long walks). Leaves the κ = 0 sheet (w = 1) effectively untouched. */
export function normalizePoint(kappa: number, p: Vec3): Vec3 {
  const q = form(kappa, p, p);
  if (q <= 0) return p; // degenerate; caller shouldn't hit this on the shell
  return scale3(p, 1 / Math.sqrt(q));
}

/** Rotation by θ about the basepoint (fixes w). det = +1. */
export function rotation(theta: number): Mat3 {
  const c = Math.cos(theta), s = Math.sin(theta);
  return [c, -s, 0, s, c, 0, 0, 0, 1];
}

/** Geodesic translation by arc length `s` along +x. exp(s·Xx) with
 *  Xx = [[0,0,1],[0,0,0],[−κ,0,0]]. At κ = 0 this is the Euclidean shift
 *  (x,y,w) ↦ (x + s w, y, w). det = +1. */
export function translateX(kappa: number, s: number): Mat3 {
  const c = cosK(kappa, s), sn = sinK(kappa, s);
  return [c, 0, sn, 0, 1, 0, -kappa * sn, 0, c];
}

/** Geodesic translation by arc length `s` along +y. det = +1. */
export function translateY(kappa: number, s: number): Mat3 {
  const c = cosK(kappa, s), sn = sinK(kappa, s);
  return [1, 0, 0, 0, c, sn, 0, -kappa * sn, c];
}

/** Reflection across the x-axis geodesic (y ↦ −y). Orientation-reversing,
 *  det = −1 — the generator of the glide/flip edge pairings whose `det < 0`
 *  drives the trees↔columns skin swap and the normal flip. */
export const REFLECT_X: Mat3 = [1, 0, 0, 0, -1, 0, 0, 0, 1];

/** Translate along direction θ (in the basepoint tangent frame) by arc length s:
 *  rot(θ) · translateX · rot(−θ). */
export function translateDir(kappa: number, theta: number, s: number): Mat3 {
  return mul(rotation(theta), mul(translateX(kappa, s), rotation(-theta)));
}

// ─────────────────────────────────────────────────────────────────────────────
// Measurements: distance, geodesic point, angle
// ─────────────────────────────────────────────────────────────────────────────

const clamp = (x: number, lo: number, hi: number) => (x < lo ? lo : x > hi ? hi : x);

/** Geodesic distance between two model points.
 *
 *  ⟨P, Q⟩_κ = Cκ(d). Inverting Cκ needs the sign of κ (acos for the sphere,
 *  acosh for the hyperbolic plane); near κ = 0 we fall back to the chord in the
 *  tangent plane, which is the analytic limit. This is a *measurement* helper —
 *  the geodesic/transport path (translateX etc.) stays branch-free. */
export function distance(kappa: number, p: Vec3, q: Vec3): number {
  const c = form(kappa, p, q);
  if (kappa > 1e-9) return Math.acos(clamp(c, -1, 1)) / Math.sqrt(kappa);
  if (kappa < -1e-9) return Math.acosh(Math.max(c, 1)) / Math.sqrt(-kappa);
  // Flat limit: w ≈ 1, distance is the Euclidean chord in (x, y).
  const dx = p[0] / p[2] - q[0] / q[2], dy = p[1] / p[2] - q[1] / q[2];
  return Math.hypot(dx, dy);
}

/** The point reached by walking arc length `s` from O along direction θ. */
export function geodesicPoint(kappa: number, theta: number, s: number): Vec3 {
  const sn = sinK(kappa, s);
  return [sn * Math.cos(theta), sn * Math.sin(theta), cosK(kappa, s)];
}

// ─────────────────────────────────────────────────────────────────────────────
// Frame: the player's pose as a group element.
//
// A Frame is an isometry g; the pose it represents is g applied to the basepoint
// frame (point O, forward +x, left +y). Walking and turning are right-multiplies,
// so parallel transport and holonomy come out for free.
// ─────────────────────────────────────────────────────────────────────────────

export interface Frame {
  readonly kappa: number;
  /** The isometry taking the basepoint frame to this pose. */
  readonly g: Mat3;
}

export const makeFrame = (kappa: number, g: Mat3 = IDENTITY3): Frame => ({ kappa, g });

/** The point this frame sits at. */
export const framePos = (f: Frame): Vec3 => applyMat(f.g, ORIGIN);
/** The forward tangent (world ℝ³ vector) of this frame. */
export const frameForward = (f: Frame): Vec3 => applyMat(f.g, [1, 0, 0]);
/** The left tangent of this frame. */
export const frameLeft = (f: Frame): Vec3 => applyMat(f.g, [0, 1, 0]);

/** Walk arc length `s` straight ahead. */
export const stepForward = (f: Frame, s: number): Frame =>
  ({ kappa: f.kappa, g: mul(f.g, translateX(f.kappa, s)) });

/** Turn left by angle θ in place (no translation). */
export const turn = (f: Frame, theta: number): Frame =>
  ({ kappa: f.kappa, g: mul(f.g, rotation(theta)) });

/** Walk arc length `s` along heading θ relative to the frame's forward axis. */
export const stepHeading = (f: Frame, theta: number, s: number): Frame =>
  ({ kappa: f.kappa, g: mul(f.g, translateDir(f.kappa, theta, s)) });

/** Re-orthonormalise the frame's matrix against Gκ (numerical hygiene). Uses
 *  Gram–Schmidt in the Gκ metric on the first two columns, then rebuilds the
 *  point column from the shell constraint. */
export function reorthonormalize(f: Frame): Frame {
  const k = f.kappa;
  const g = f.g;
  // columns
  const col = (j: number): Vec3 => [g[j], g[3 + j], g[6 + j]];
  const set = (m: number[], j: number, v: Vec3) => { m[j] = v[0]; m[3 + j] = v[1]; m[6 + j] = v[2]; };
  const pt = normalizePoint(k, col(2));
  // tangent basis: project columns 0,1 to the tangent plane at pt and Gκ-orthonormalise
  // true-unit tangent has Gκ-norm² = κ; carry the sign of κ through.
  const tnorm = (v: Vec3) => form(k, v, v); // = κ for a unit tangent
  let e0 = sub3(col(0), scale3(pt, form(k, col(0), pt)));
  const n0 = tnorm(e0);
  if (Math.abs(n0) > 1e-12) e0 = scale3(e0, Math.sqrt(Math.abs(k) / Math.abs(n0)) || 1);
  let e1 = sub3(col(1), add3(scale3(pt, form(k, col(1), pt)), scale3(e0, k !== 0 ? form(k, col(1), e0) / k : 0)));
  const n1 = tnorm(e1);
  if (Math.abs(n1) > 1e-12) e1 = scale3(e1, Math.sqrt(Math.abs(k) / Math.abs(n1)) || 1);
  const m = new Array(9).fill(0);
  set(m, 0, e0); set(m, 1, e1); set(m, 2, pt);
  return { kappa: k, g: m as unknown as Mat3 };
}

// ─────────────────────────────────────────────────────────────────────────────
// Isometry value type — a thin wrapper the rest of the engine consumes.
// ─────────────────────────────────────────────────────────────────────────────

export interface Isometry {
  readonly kappa: number;
  readonly m: Mat3;
  apply(p: Vec3): Vec3;
  compose(other: Isometry): Isometry; // this ∘ other (apply other first)
  inverse(): Isometry;
  det(): number; // +1 orientation-preserving, −1 reversing
}

export function isometry(kappa: number, m: Mat3): Isometry {
  return {
    kappa,
    m,
    apply: (p) => applyMat(m, p),
    compose: (other) => isometry(kappa, mul(m, other.m)),
    inverse: () => isometry(kappa, inv3(m)),
    det: () => det3(m),
  };
}

export const IDENTITY = (kappa: number): Isometry => isometry(kappa, IDENTITY3);

// ─────────────────────────────────────────────────────────────────────────────
// Helpers for triangles / parallel transport (used by the invariant battery and
// the develop layer): map the origin onto any point, and measure the interior
// angle of a geodesic corner.
// ─────────────────────────────────────────────────────────────────────────────

/** The geodesic direction (θ from +x) and distance from O to a shell point. */
export function polarFromOrigin(kappa: number, p: Vec3): { theta: number; dist: number } {
  return { theta: Math.atan2(p[1], p[0]), dist: distance(kappa, ORIGIN, p) };
}

/** An isometry mapping the basepoint O onto `target` (along the geodesic from O),
 *  carrying the +x axis to the outward geodesic direction. So `originTo(p)·O = p`. */
export function originTo(kappa: number, target: Vec3): Mat3 {
  const { theta, dist } = polarFromOrigin(kappa, target);
  return translateDir(kappa, theta, dist);
}

/** The interior angle at vertex `v` of the geodesic corner v→a, v→b (in [0, π]). */
export function angleAt(kappa: number, v: Vec3, a: Vec3, b: Vec3): number {
  const gInv = inv3(originTo(kappa, v)); // bring v to the origin
  const la = applyMat(gInv, a), lb = applyMat(gInv, b);
  const ta = Math.atan2(la[1], la[0]), tb = Math.atan2(lb[1], lb[0]);
  let d = Math.abs(ta - tb);
  if (d > Math.PI) d = 2 * Math.PI - d;
  return d;
}
