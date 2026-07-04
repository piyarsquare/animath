/**
 * Pure complex-number helpers for the Argand app — arithmetic, polar form, the
 * honest interpolation paths the chapters animate/scrub, formatting, and soft
 * snapping. No React, no DOM: everything here is testable in isolation.
 */

export interface Cx { re: number; im: number }

export const cx = (re: number, im: number): Cx => ({ re, im });

export const add = (a: Cx, b: Cx): Cx => ({ re: a.re + b.re, im: a.im + b.im });
export const mul = (a: Cx, b: Cx): Cx => ({
  re: a.re * b.re - a.im * b.im,
  im: a.re * b.im + a.im * b.re,
});
export const scale = (a: Cx, s: number): Cx => ({ re: a.re * s, im: a.im * s });

export const modulus = (a: Cx): number => Math.hypot(a.re, a.im);
/** Principal argument in (−π, π]. */
export const argument = (a: Cx): number => Math.atan2(a.im, a.re);
export const fromPolar = (r: number, theta: number): Cx => ({
  re: r * Math.cos(theta),
  im: r * Math.sin(theta),
});

/**
 * b raised to a REAL power t, principal branch: |b|^t · e^{i·t·arg b}. This is
 * the engine of the honest multiplication path — at t=0 it is 1, at t=1 it is b,
 * and in between it spirals (rotating by t·arg b while scaling by |b|^t), never
 * cutting a straight chord through the plane.
 */
export const powReal = (b: Cx, t: number): Cx =>
  fromPolar(Math.pow(modulus(b), t), argument(b) * t);

/** Subtraction a − b. */
export const sub = (a: Cx, b: Cx): Cx => ({ re: a.re - b.re, im: a.im - b.im });

/* ----------------------------------------------------------------- *
 *  Generalized number systems — one parameter p = j² selects the    *
 *  algebra: p<0 complex (elliptic), p=0 dual (parabolic), p>0        *
 *  split-complex (hyperbolic). Only the SIGN of p is an invariant    *
 *  (magnitude rescales away), so the app dials p over [-1, 0, 1].    *
 * ----------------------------------------------------------------- */

/** Generalized product (x₁+y₁j)(x₂+y₂j) with j² = p. p=-1 is ordinary complex. */
export const mulG = (a: Cx, b: Cx, p: number): Cx => ({
  re: a.re * b.re + p * a.im * b.im,
  im: a.re * b.im + a.im * b.re,
});

/** Conjugate (re, −im) and the quadratic form N(z) = re² − p·im² it preserves. */
export const conjG = (z: Cx): Cx => ({ re: z.re, im: -z.im });
export const normG = (z: Cx, p: number): number => z.re * z.re - p * z.im * z.im;
export const invG = (z: Cx, p: number): Cx => {
  const n = normG(z, p);
  return Math.abs(n) < 1e-9 ? z : scale(conjG(z), 1 / n);
};
export const divG = (a: Cx, b: Cx, p: number): Cx => mulG(a, invG(b, p), p);

// Generalized exp/log of the one-parameter "rotation" e^{jv} = C(v) + j·S(v),
// where C''=p·C, C(0)=1, S(0)=0 → cos/1/cosh and sin/·/sinh as p crosses 0.
const expG = (u: number, v: number, p: number): Cx => {
  const e = Math.exp(u);
  if (p < 0) { const w = Math.sqrt(-p); return { re: e * Math.cos(w * v), im: e * Math.sin(w * v) / w }; }
  if (p > 0) { const w = Math.sqrt(p); return { re: e * Math.cosh(w * v), im: e * Math.sinh(w * v) / w }; }
  return { re: e, im: e * v };
};
const logG = (b: Cx, p: number): { u: number; v: number } | null => {
  const n = normG(b, p);
  if (p < 0) {
    const w = Math.sqrt(-p);
    return { u: 0.5 * Math.log(n), v: Math.atan2(w * b.im, b.re) / w };
  }
  if (p === 0) {
    if (b.re <= 1e-9) return null;            // dual log needs Re > 0
    return { u: Math.log(b.re), v: b.im / b.re };
  }
  if (n <= 1e-9 || b.re <= 0) return null;     // split: inside the future cone only
  const w = Math.sqrt(p);
  return { u: 0.5 * Math.log(n), v: Math.atanh((w * b.im) / b.re) / w };
};

/**
 * The generalized real power bᵗ = exp_p(t·Log_p b) — the one-parameter
 * "spiral" from 1 (t=0) to b (t=1) in the chosen system. Falls back to a plain
 * linear blend when b sits in a degenerate region (the null cone / Re≤0), so
 * the picture stays finite instead of producing NaNs.
 */
export const powRealG = (b: Cx, p: number, t: number): Cx => {
  if (p === -1) return powReal(b, t);          // exact ordinary-complex fast path
  const L = logG(b, p);
  if (!L) return { re: 1 + (b.re - 1) * t, im: b.im * t };
  return expG(L.u * t, L.v * t, p);
};

/* ----------------------------------------------------------------- *
 *  The affine map f(z) = α₁·z + α₀ — "multiply by the slope, then    *
 *  shift" — the complex cousin of y = m·x + b, in any system p.      *
 * ----------------------------------------------------------------- */

/** Evaluate f(z) = α₁·z + α₀ in system p. */
export const affine = (z: Cx, a1: Cx, a0: Cx, p: number): Cx => add(mulG(a1, z, p), a0);

/**
 * The honest two-leg path from z to f(z): first the multiply leg (z spirals to
 * α₁·z as the exponent of α₁ ramps 0→1), then the add leg (a straight slide by
 * α₀). s∈[0,½] is "×α₁", s∈[½,1] is "+α₀"; the waypoint at s=½ is α₁·z.
 */
export const affineAt = (z: Cx, a1: Cx, a0: Cx, p: number, s: number): Cx => {
  if (s <= 0.5) return mulG(powRealG(a1, p, s / 0.5), z, p);
  return add(mulG(a1, z, p), scale(a0, (s - 0.5) / 0.5));
};

/**
 * The fixed point z* with f(z*) = z*, i.e. z* = α₀/(1−α₁) — the one point the
 * line leaves put (the complex analog of where y=mx+b meets y=x). Returns null
 * when α₁→1 (a pure translation: the fixed point runs off to infinity).
 */
export const fixedPoint = (a1: Cx, a0: Cx, p: number): Cx | null => {
  const d = sub({ re: 1, im: 0 }, a1);
  if (Math.abs(normG(d, p)) < 1e-6) return null;
  return divG(a0, d, p);
};

/**
 * The "all-at-once" affine homotopy: α₁ᵘ·z + u·α₀, ramping the spin/scale AND
 * the shift together (u: 0→1 is z→f(z)). This is the *other* honest route from z
 * to f(z) — the diagonal that the two separate legs cut a corner around.
 */
export const affineSimulAt = (z: Cx, a1: Cx, a0: Cx, p: number, u: number): Cx =>
  add(mulG(powRealG(a1, p, u), z, p), scale(a0, u));

/**
 * One closed loop z → f(z) → z over φ∈[0,1]: the first half (φ≤½) is the honest
 * two-leg construction (×α₁ then +α₀), the second half (φ>½) is the simultaneous
 * homotopy run backward. Both halves share z (φ=0,1) and f(z) (φ=½), so the loop
 * is seamless — out by the corners, back along the diagonal.
 */
export const affineLoopAt = (z: Cx, a1: Cx, a0: Cx, p: number, phi: number): Cx => {
  const f = ((phi % 1) + 1) % 1;
  if (f <= 0.5) return affineAt(z, a1, a0, p, f / 0.5);
  return affineSimulAt(z, a1, a0, p, 1 - (f - 0.5) / 0.5);
};

/* ----------------------------------------------------------------- *
 *  Polynomials f(z) = Σ αₖ·zᵏ — the affine map is just degree 1.     *
 *  Coefficients are low-to-high: c = [α₀, α₁, α₂, …].                *
 * ----------------------------------------------------------------- */

/** Evaluate the polynomial by Horner's method (every product carries system p). */
export const polyEval = (c: Cx[], z: Cx, p: number): Cx => {
  let acc = c[c.length - 1];
  for (let kk = c.length - 2; kk >= 0; kk--) acc = add(mulG(acc, z, p), c[kk]);
  return acc;
};

/** A square root in system p (principal branch in the complex case). */
export const sqrtG = (w: Cx, p: number): Cx => powRealG(w, p, 0.5);

/**
 * The fixed points f(z*) = z*. Degree 1 → one point α₀/(1−α₁); degree 2 → the
 * two roots of α₂z² + (α₁−1)z + α₀ = 0 via the (system-p) quadratic formula.
 */
export const polyFixedPoints = (c: Cx[], p: number): Cx[] => {
  const one: Cx = { re: 1, im: 0 };
  if (c.length >= 3 && modulus(c[2]) > 1e-9) {
    const A = c[2], B = sub(c[1], one), C = c[0];
    const disc = sub(mulG(B, B, p), scale(mulG(A, C, p), 4));
    const sq = sqrtG(disc, p), twoA = scale(A, 2), negB = scale(B, -1);
    return [divG(sub(negB, sq), twoA, p), divG(add(negB, sq), twoA, p)];
  }
  const z = fixedPoint(c[1] ?? one, c[0] ?? one, p);
  return z ? [z] : [];
};

/** The critical point f′(z)=0 of a quadratic: z = −α₁/(2α₂) (the fold). */
export const criticalPoint = (c: Cx[], p: number): Cx | null => {
  if (c.length < 3 || modulus(c[2]) < 1e-9) return null;
  return divG(scale(c[1], -1), scale(c[2], 2), p);
};

/**
 * Degree-ramp homotopy: scale the leading coefficient by s∈[0,1], morphing the
 * lower-degree image (s=0) into the full one (s=1). Used to watch the α₂ term
 * *bend* a shape or the grid into curves.
 */
export const polyRampAt = (c: Cx[], z: Cx, p: number, s: number): Cx =>
  polyEval([...c.slice(0, -1), scale(c[c.length - 1], s)], z, p);

/** z raised to an integer power in system p (z⁰=1, z¹=z, z²=z·z, …). */
const powIntG = (z: Cx, k: number, p: number): Cx => {
  let r: Cx = { re: 1, im: 0 };
  for (let i = 0; i < k; i++) r = mulG(r, z, p);
  return r;
};

/** The individual terms αₖ·zᵏ, highest degree first: [α_n zⁿ, …, α₁z, α₀]. */
export const polyTerms = (c: Cx[], z: Cx, p: number): Cx[] => {
  const out: Cx[] = [];
  for (let k = c.length - 1; k >= 0; k--) out.push(mulG(c[k], powIntG(z, k, p), p));
  return out;
};

/** Running tip-to-tail sum of the terms: [0, α_nzⁿ, α_nzⁿ+α_{n-1}zⁿ⁻¹, …, f(z)]. */
export const polyTermCumulative = (c: Cx[], z: Cx, p: number): Cx[] => {
  const terms = polyTerms(c, z, p);
  const cum: Cx[] = [{ re: 0, im: 0 }];
  for (const tm of terms) cum.push(add(cum[cum.length - 1], tm));
  return cum;
};

/**
 * A closed loop that builds f(z) as the tip-to-tail sum of its terms. The
 * forward half (φ≤½) lays the terms down one at a time, highest degree first
 * (quadratic → linear → additive), each taking an equal slice; the return half
 * collapses *all* of them at once (a straight slide f(z)→0). Closed at the
 * origin, so it wraps seamlessly.
 */
export const polyTermLoopAt = (c: Cx[], z: Cx, p: number, phi: number): Cx => {
  const cum = polyTermCumulative(c, z, p);
  const nT = cum.length - 1;
  const f = ((phi % 1) + 1) % 1;
  if (f <= 0.5) {
    const x = f * 2 * nT;
    const idx = Math.min(nT - 1, Math.floor(x));
    const s = x - idx;
    return add(scale(cum[idx], 1 - s), scale(cum[idx + 1], s));
  }
  const u = (f - 0.5) * 2;
  return scale(cum[nT], 1 - u);
};

/* ----------------------------------------------------------------- *
 *  Arc-length pacing — so the pen moves at constant *geometric*      *
 *  speed instead of constant param speed.                           *
 * ----------------------------------------------------------------- */

export interface ArcLengthMap {
  /** Total geometric length of the path, in math units. */
  length: number;
  /** Native parameter s∈[0,1] at a given distance traveled along the path. */
  sAt: (arc: number) => number;
  /** Distance traveled along the path at a given native parameter s∈[0,1]. */
  arcAt: (s: number) => number;
}

/**
 * Build a constant-speed (arc-length) reparameterization of a path
 * `P : [0,1] → ℂ`. Samples the path, accumulates chord lengths, and exposes
 * `sAt(arc)` / `arcAt(s)` mapping between native param and distance traveled.
 *
 * This lets a clock advance at constant *geometric* speed (units/sec): a tight
 * multiplication spiral and a short straight addition slide then feel like the
 * same pen moving, instead of both finishing in the same wall-clock time no
 * matter how far they travel — the "completely different scales" problem.
 */
export function arcLengthMap(P: (s: number) => Cx, samples = 96): ArcLengthMap {
  const cum: number[] = [0];
  let prev = P(0);
  for (let i = 1; i <= samples; i++) {
    const p = P(i / samples);
    cum.push(cum[i - 1] + Math.hypot(p.re - prev.re, p.im - prev.im));
    prev = p;
  }
  const length = cum[samples];

  const sAt = (arc: number): number => {
    if (length < 1e-9) return 0;
    const a = Math.min(length, Math.max(0, arc));
    let i = 1;
    while (i < samples && cum[i] < a) i++;
    const seg = cum[i] - cum[i - 1] || 1;
    return (i - 1 + (a - cum[i - 1]) / seg) / samples;
  };

  const arcAt = (s: number): number => {
    if (length < 1e-9) return 0;
    const f = Math.min(1, Math.max(0, s)) * samples;
    const i0 = Math.min(samples - 1, Math.floor(f));
    return cum[i0] + (cum[i0 + 1] - cum[i0]) * (f - i0);
  };

  return { length, sAt, arcAt };
}

/* ----------------------------------------------------------------- *
 *  Formatting — both rectangular (x+iy) and polar (r·e^{iθ}) forms.  *
 * ----------------------------------------------------------------- */

const round = (n: number, dp = 2): number => {
  const f = 10 ** dp;
  // avoid "-0"
  const r = Math.round(n * f) / f;
  return Object.is(r, -0) ? 0 : r;
};

/** "x + yi" with tidy signs and the i-unit special-cased. */
export function formatRect(z: Cx, dp = 2): string {
  const x = round(z.re, dp);
  const y = round(z.im, dp);
  if (y === 0) return `${x}`;
  const im = Math.abs(y) === 1 ? 'i' : `${Math.abs(y)}i`;
  if (x === 0) return y < 0 ? `−${im}` : im;
  return `${x} ${y < 0 ? '−' : '+'} ${im}`;
}

/** "r·e^{iθ}" with θ in radians, plus a degrees gloss. */
export function formatPolar(z: Cx, dp = 2): string {
  const r = round(modulus(z), dp);
  const th = argument(z);
  const deg = round((th * 180) / Math.PI, 0);
  return `${r} · e^(${round(th, dp)}i)  (${deg}°)`;
}

/* ----------------------------------------------------------------- *
 *  Soft snapping — makes i, 1, −1, 1+i, e^{iπ/6}, … reachable so a   *
 *  learner can land exact values instead of pixel-hunting.          *
 * ----------------------------------------------------------------- */

const NICE_RADII = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4];

/**
 * Pull a dragged value onto a nearby "nice" target: first the Gaussian-integer
 * lattice (covers 1, i, 1+i, 2−i, …), then a nice radius and/or an angle that
 * is a multiple of π/6. Thresholds are in math units / radians, so snapping
 * feels the same regardless of zoom.
 */
export function snap(z: Cx): Cx {
  // Gaussian lattice
  const rx = Math.round(z.re);
  const ry = Math.round(z.im);
  if (Math.hypot(z.re - rx, z.im - ry) < 0.16) return { re: rx, im: ry };

  // polar niceties
  const r = modulus(z);
  if (r < 1e-6) return z;
  const th = argument(z);
  let nr = r;
  let nth = th;
  let hit = false;
  for (const cand of NICE_RADII) {
    if (Math.abs(r - cand) < 0.12) { nr = cand; hit = true; break; }
  }
  const step = Math.PI / 6;
  const k = Math.round(th / step);
  if (Math.abs(th - k * step) < 0.13) { nth = k * step; hit = true; }
  return hit ? fromPolar(nr, nth) : z;
}
