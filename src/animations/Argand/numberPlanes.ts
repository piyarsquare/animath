/**
 * numberPlanes.ts — the math foundation for the Argand app, **designed from the
 * three classes outward** rather than from the complex numbers in.
 *
 * A *number plane* is ℝ² equipped with one extra rule: how to multiply. Write a
 * point as `x + y·j`; the only choice is the value of `j²`, a real number we call
 *
 *     p = j².
 *
 * Its **sign** is the whole story (the magnitude just rescales the y-axis), so
 * there are exactly three classes:
 *
 *   | p   | class   | what ×  does | unit curve x²−p·y²=1 | physics            |
 *   |-----|---------|--------------|----------------------|--------------------|
 *   | < 0 | **Spin**  | rotation    | ellipse / circle     | ordinary complex   |
 *   | = 0 | **Shear** | shear       | two vertical lines   | dual / Galilean    |
 *   | > 0 | **Boost** | boost       | hyperbola + null cone| split / Minkowski  |
 *
 * The ordinary complex numbers are simply the Spin member at p = −1 — familiar,
 * but not privileged. Everything below is generic in `p`; nothing assumes p<0.
 *
 * The one invariant every class preserves under multiplication is the quadratic
 * form (the "norm")  N(z) = x² − p·y² :  N(z·w) = N(z)·N(w).  Multiplying by a
 * unit-norm element is a Spin / Shear / Boost — that is the unifying idea.
 *
 * Pure functions, no React/DOM — everything here is checked in
 * `__tests__/numberPlanes.test.ts`.
 */

/** A point of a number plane. `x` is the real axis; `y` is the `j` axis (it is
 *  NOT "imaginary" in the Shear/Boost classes, hence x/y rather than re/im). */
export interface Planar { x: number; y: number }

export const pt = (x: number, y: number): Planar => ({ x, y });
export const ONE: Planar = { x: 1, y: 0 };
export const ZERO: Planar = { x: 0, y: 0 };

export type PlaneKind = 'spin' | 'shear' | 'boost';

const EPS = 1e-9;

/** Which of the three classes a value of p = j² names (only the sign matters). */
export const kindOf = (p: number): PlaneKind => (p < -EPS ? 'spin' : p > EPS ? 'boost' : 'shear');

export const kindLabel: Record<PlaneKind, string> = {
  spin: 'Spin (complex, j² < 0)',
  shear: 'Shear (dual, j² = 0)',
  boost: 'Boost (split, j² > 0)',
};

/* ---- the vector-space part (the same in every class) ---- */

export const add = (a: Planar, b: Planar): Planar => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Planar, b: Planar): Planar => ({ x: a.x - b.x, y: a.y - b.y });
/** Scale by a real number. */
export const smul = (a: Planar, s: number): Planar => ({ x: a.x * s, y: a.y * s });

/* ---- the one rule that defines the class: multiplication, j² = p ---- */

/** Product (x₁+y₁j)(x₂+y₂j) with j² = p. p=−1 is ordinary complex. */
export const mul = (a: Planar, b: Planar, p: number): Planar => ({
  x: a.x * b.x + p * a.y * b.y,
  y: a.x * b.y + a.y * b.x,
});

/** Conjugate x − y·j. */
export const conj = (z: Planar): Planar => ({ x: z.x, y: -z.y });

/** The preserved quadratic form N(z) = x² − p·y² (multiplicative: N(zw)=N(z)N(w)). */
export const norm = (z: Planar, p: number): number => z.x * z.x - p * z.y * z.y;

/** The "length" √|N|. (A genuine length only in Spin; a pseudo-length elsewhere.) */
export const modulus = (z: Planar, p: number): number => Math.sqrt(Math.abs(norm(z, p)));

/** Multiplicative inverse z⁻¹ = conj(z)/N(z); null on the null set N(z)=0. */
export const inv = (z: Planar, p: number): Planar | null => {
  const n = norm(z, p);
  return Math.abs(n) < EPS ? null : smul(conj(z), 1 / n);
};

/** Division a/b; null where b lies on the null set. */
export const div = (a: Planar, b: Planar, p: number): Planar | null => {
  const bi = inv(b, p);
  return bi ? mul(a, bi, p) : null;
};

/* ---- exp / log of the one-parameter subgroup e^{j·v} ---------------- *
 * e^{j·v} solves C''=p·C with C(0)=1, S(0)=0, giving cos / 1 / cosh and  *
 * sin / · / sinh as p crosses zero — the rotation/shear/boost generator. *
 * The w = √|p| factor keeps the limit p→0 continuous.                    */

/** exp(u + v·j) in class p. */
export const exp = (u: number, v: number, p: number): Planar => {
  const e = Math.exp(u);
  if (p < -EPS) { const w = Math.sqrt(-p); return { x: e * Math.cos(w * v), y: (e * Math.sin(w * v)) / w }; }
  if (p > EPS) { const w = Math.sqrt(p); return { x: e * Math.cosh(w * v), y: (e * Math.sinh(w * v)) / w }; }
  return { x: e, y: e * v };
};

/**
 * log z = u + v·j, the inverse of {@link exp}. Returns null exactly where the
 * generalized angle does not exist: the **null cone** (Boost, N≤0 or x≤0) and the
 * **degenerate line** x≤0 (Shear). In Spin it exists everywhere but the origin.
 * This null-domain IS the honest boundary the app must respect — drawing a value
 * here would be drawing an angle that isn't there.
 */
export const log = (z: Planar, p: number): { u: number; v: number } | null => {
  const n = norm(z, p);
  if (p < -EPS) {
    const w = Math.sqrt(-p);
    if (n < EPS) return null;                 // only the origin
    return { u: 0.5 * Math.log(n), v: Math.atan2(w * z.y, z.x) / w };
  }
  if (p <= EPS && p >= -EPS) {                // Shear (p = 0)
    if (z.x <= EPS) return null;              // needs x > 0
    return { u: Math.log(z.x), v: z.y / z.x };
  }
  if (n <= EPS || z.x <= 0) return null;      // Boost: principal future cone only
  const w = Math.sqrt(p);
  return { u: 0.5 * Math.log(n), v: Math.atanh((w * z.y) / z.x) / w };
};

/**
 * Real power bᵗ = exp(t·log b): the one-parameter "spiral" from 1 (t=0) to b
 * (t=1) inside the class. Where log is undefined (the null set) it falls back to
 * a straight blend so a picture stays finite instead of NaN — callers that care
 * about honesty should gate on {@link argDefined} first.
 */
export const powReal = (b: Planar, p: number, t: number): Planar => {
  const L = log(b, p);
  if (!L) return { x: 1 + (b.x - 1) * t, y: b.y * t };
  return exp(L.u * t, L.v * t, p);
};

/** Square root √z = z^{1/2} (principal). */
export const sqrt = (z: Planar, p: number): Planar => powReal(z, p, 0.5);

/* ---- polar form: z = ρ · e^{j·θ}, one law across the three classes --- *
 * Defined by CLASS (the sign of p) on the canonical unit curve, which is  *
 * exactly the meaningful case at p ∈ {−1, 0, +1}. The angle θ is an        *
 * ordinary angle (Spin), a slope (Shear), or a rapidity (Boost) — never    *
 * call it "angle" unqualified off Spin. Multiplication adds θ and scales ρ  *
 * in all three.                                                            */

/** The unit-curve point e^{j·θ} (canonical, ρ=1): circle / line / hyperbola. */
export const unit = (theta: number, kind: PlaneKind): Planar =>
  kind === 'spin' ? { x: Math.cos(theta), y: Math.sin(theta) }
    : kind === 'boost' ? { x: Math.cosh(theta), y: Math.sinh(theta) }
      : { x: 1, y: theta };

/** Build ρ·e^{j·θ} in the class of p. */
export const fromPolar = (rho: number, theta: number, p: number): Planar =>
  smul(unit(theta, kindOf(p)), rho);

/**
 * Is the generalized angle θ defined at z? True everywhere but the origin in
 * Spin; only on the principal future cone (x>|y|) in Boost; only for x>0 in
 * Shear. (This is the same domain as {@link log} — the app's honesty boundary.)
 */
export const argDefined = (z: Planar, p: number): boolean => {
  const k = kindOf(p);
  if (k === 'spin') return Math.abs(z.x) > EPS || Math.abs(z.y) > EPS;
  if (k === 'shear') return z.x > EPS;
  return z.x > EPS && z.x * z.x - z.y * z.y > EPS;   // future cone
};

/** The generalized angle θ (angle / slope / rapidity), or null where undefined. */
export const arg = (z: Planar, p: number): number | null => {
  if (!argDefined(z, p)) return null;
  const k = kindOf(p);
  if (k === 'spin') return Math.atan2(z.y, z.x);
  if (k === 'shear') return z.y / z.x;
  return Math.atanh(z.y / z.x);                       // rapidity
};

/** Polar pair (ρ, θ), or null where the angle is undefined. ρ uses the canonical
 *  class norm so ρ·e^{jθ} round-trips. */
export const toPolar = (z: Planar, p: number): { rho: number; theta: number } | null => {
  const theta = arg(z, p);
  if (theta === null) return null;
  const k = kindOf(p);
  const rho = k === 'spin' ? Math.hypot(z.x, z.y) : k === 'shear' ? z.x : Math.sqrt(z.x * z.x - z.y * z.y);
  return { rho, theta };
};

/* ---- lines and polynomials over a number plane --------------------- *
 * f(z)=α₁z+α₀ (a "line") and Σ αₖzᵏ. Coefficients low→high: [α₀,α₁,…].  */

/** Evaluate f(z)=α₁z+α₀ in class p. */
export const affine = (z: Planar, a1: Planar, a0: Planar, p: number): Planar => add(mul(a1, z, p), a0);

/**
 * The fixed point z* with f(z*)=z*, i.e. z* = α₀/(1−α₁). Returns null as α₁→1 —
 * a pure shift has NO fixed point, the limit where z* runs off to infinity. This
 * escaping fixed point is one of the limits worth teaching, not hiding.
 */
export const affineFixedPoint = (a1: Planar, a0: Planar, p: number): Planar | null => {
  const d = sub(ONE, a1);
  if (Math.abs(norm(d, p)) < 1e-6) return null;
  return div(a0, d, p);
};

/** Evaluate Σ αₖzᵏ by Horner (every product carries class p). */
export const polyEval = (coeffs: Planar[], z: Planar, p: number): Planar => {
  let acc = coeffs[coeffs.length - 1];
  for (let k = coeffs.length - 2; k >= 0; k--) acc = add(mul(acc, z, p), coeffs[k]);
  return acc;
};

/**
 * Fixed points f(z*)=z*. Degree 1 → α₀/(1−α₁). Degree 2 → the two roots of
 * α₂z²+(α₁−1)z+α₀ via the class-p quadratic formula. NOTE: exact in Spin; in
 * Shear/Boost the system square root falls back on the null set, so the degree-2
 * roots there are approximate — a known limit, surfaced honestly to callers.
 */
export const polyFixedPoints = (coeffs: Planar[], p: number): Planar[] => {
  if (coeffs.length >= 3 && modulus(coeffs[2], p) > EPS) {
    const A = coeffs[2], B = sub(coeffs[1], ONE), C = coeffs[0];
    const disc = sub(mul(B, B, p), smul(mul(A, C, p), 4));
    const sq = sqrt(disc, p), negB = smul(B, -1), twoA = smul(A, 2);
    const r1 = div(sub(negB, sq), twoA, p);
    const r2 = div(add(negB, sq), twoA, p);
    return [r1, r2].filter((r): r is Planar => r !== null);
  }
  const z = affineFixedPoint(coeffs[1] ?? ONE, coeffs[0] ?? ONE, p);
  return z ? [z] : [];
};

/** The critical point f′(z)=0 of a quadratic: z = −α₁/(2α₂). */
export const criticalPoint = (coeffs: Planar[], p: number): Planar | null => {
  if (coeffs.length < 3 || modulus(coeffs[2], p) < EPS) return null;
  return div(smul(coeffs[1], -1), smul(coeffs[2], 2), p);
};

/* ---- the Algebra strategy: one value carrying a class -------------- *
 * `plane(p)` bundles every operation with its p bound, so callers can     *
 * pass one object around instead of threading p through every call.       */

export interface Plane {
  readonly p: number;
  readonly kind: PlaneKind;
  add(a: Planar, b: Planar): Planar;
  sub(a: Planar, b: Planar): Planar;
  smul(a: Planar, s: number): Planar;
  mul(a: Planar, b: Planar): Planar;
  conj(z: Planar): Planar;
  norm(z: Planar): number;
  modulus(z: Planar): number;
  inv(z: Planar): Planar | null;
  div(a: Planar, b: Planar): Planar | null;
  powReal(b: Planar, t: number): Planar;
  sqrt(z: Planar): Planar;
  unit(theta: number): Planar;
  fromPolar(rho: number, theta: number): Planar;
  argDefined(z: Planar): boolean;
  arg(z: Planar): number | null;
  toPolar(z: Planar): { rho: number; theta: number } | null;
  affine(z: Planar, a1: Planar, a0: Planar): Planar;
  affineFixedPoint(a1: Planar, a0: Planar): Planar | null;
  polyEval(coeffs: Planar[], z: Planar): Planar;
  polyFixedPoints(coeffs: Planar[]): Planar[];
  criticalPoint(coeffs: Planar[]): Planar | null;
}

/** A number plane as one value carrying its class (the Algebra strategy). */
export const plane = (p: number): Plane => ({
  p,
  kind: kindOf(p),
  add,
  sub,
  smul,
  mul: (a, b) => mul(a, b, p),
  conj,
  norm: z => norm(z, p),
  modulus: z => modulus(z, p),
  inv: z => inv(z, p),
  div: (a, b) => div(a, b, p),
  powReal: (b, t) => powReal(b, p, t),
  sqrt: z => sqrt(z, p),
  unit: theta => unit(theta, kindOf(p)),
  fromPolar: (rho, theta) => fromPolar(rho, theta, p),
  argDefined: z => argDefined(z, p),
  arg: z => arg(z, p),
  toPolar: z => toPolar(z, p),
  affine: (z, a1, a0) => affine(z, a1, a0, p),
  affineFixedPoint: (a1, a0) => affineFixedPoint(a1, a0, p),
  polyEval: (coeffs, z) => polyEval(coeffs, z, p),
  polyFixedPoints: coeffs => polyFixedPoints(coeffs, p),
  criticalPoint: coeffs => criticalPoint(coeffs, p),
});
