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

/**
 * The multiplication path a·bᵗ: starts at a (t=0), ends at a·b (t=1), spiraling.
 * This is why a·b "adds angles and multiplies lengths" — you watch a swing
 * through arg b while its length grows by the factor |b|.
 */
export const mulPath = (a: Cx, b: Cx, t: number): Cx => mul(a, powReal(b, t));

/** The addition path a + t·b: a straight tip-to-tail slide from a to a+b. */
export const addPath = (a: Cx, b: Cx, t: number): Cx => add(a, scale(b, t));

/**
 * The unified two-factor multiplication sweep for a shape point q and the
 * constant b, as a CLOSED loop over phase∈[0,1]:
 *   q (the shape) → q·b (the image) → b (the point) → q·b → q.
 * The first quarter ramps b's exponent — the POINT acting on the SHAPE (q·bˢ);
 * the next ramps q's exponent — the SHAPE acting on the POINT (b·qˢ), which
 * collapses the whole shape onto the single point b at the midpoint; then back.
 * Both halves pass through the same product q·b — commutativity, animated. The
 * loop is closed (q at both ends), so it plays seamlessly forward or reversed.
 */
export function cycleSweep(q: Cx, b: Cx, phase: number): Cx {
  const p = ((phase % 1) + 1) % 1;
  if (p < 0.25) return mul(q, powReal(b, p / 0.25));                 // q → q·b
  if (p < 0.5)  return mul(b, powReal(q, 1 - (p - 0.25) / 0.25));    // q·b → b
  if (p < 0.75) return mul(b, powReal(q, (p - 0.5) / 0.25));         // b → q·b
  return mul(q, powReal(b, 1 - (p - 0.75) / 0.25));                  // q·b → q
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
