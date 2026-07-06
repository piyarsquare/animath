/**
 * Shared **df64** ("double-float") emulated extended precision for the deep-zoom
 * fractal shaders.
 *
 * An extended number is the unevaluated sum `hi + lo` of two float32s. `dfAdd`
 * and `dfMul` are error-free transformations (two-sum, Dekker two-product): they
 * compute the rounded result AND the rounding error, so carrying the error in
 * `lo` roughly doubles the working mantissa (~46 bits ≈ 14 digits), pushing the
 * usable zoom well past the ~1e5× single-precision wall. Full method + the limits
 * of finite-bit computation: `animations/FractalsGPU/DEEP_ZOOM.md`.
 *
 * This module is the single source shared by both fractal viewers — FractalsGPU
 * and Correspondence/FractalPane inline {@link DF64_GLSL} into their fragment
 * shaders and use the JS helpers here — so a fix to the emulated-double arithmetic
 * or the escape ceiling lands in exactly one place and the two viewers can't drift
 * out of numerical agreement.
 */

/** Hard ceiling on iterations. Must match `MAX_ITER` inside {@link DF64_GLSL}. */
export const MAX_ITERATIONS = 4000;

/**
 * GLSL source: the `MAX_ITER` ceiling plus the df64 error-free-transform
 * primitives (`dfAdd`, `dfMul`, `dfNeg`, `dfAbs`). Inline it into a fragment
 * shader with `${DF64_GLSL}` — exactly as `PALETTE_GLSL` is inlined. `dfAbs` is
 * only needed by the Burning Ship variant; an unused GLSL function is harmless.
 */
export const DF64_GLSL = `
  const int MAX_ITER = ${MAX_ITERATIONS};

  // ---- df64: an "extended" number is the unevaluated sum hi+lo of two float32s.
  // dfAdd / dfMul are error-free transformations (two-sum, Dekker two-product):
  // they compute the rounded result AND the rounding error, so carrying the
  // error in 'lo' roughly doubles the working mantissa (~46 bits ≈ 14 digits).
  vec2 dfAdd(vec2 a, vec2 b){
    float t1 = a.x + b.x;
    float e  = t1 - a.x;
    float t2 = ((b.x - e) + (a.x - (t1 - e))) + a.y + b.y;
    float hi = t1 + t2;
    float lo = t2 - (hi - t1);
    return vec2(hi, lo);
  }
  vec2 dfMul(vec2 a, vec2 b){
    float split = 4097.0;            // 2^12 + 1, the Dekker split for float32
    float cona = a.x * split;
    float conb = b.x * split;
    float a1 = cona - (cona - a.x);
    float b1 = conb - (conb - b.x);
    float a2 = a.x - a1;
    float b2 = b.x - b1;
    float c11 = a.x * b.x;
    float c21 = a2 * b2 - (((c11 - a1 * b1) - a2 * b1) - a1 * b2);
    float c2 = a.x * b.y + a.y * b.x;
    float t1 = c11 + c2;
    float e = t1 - c11;
    float t2 = ((c2 - e) + (c11 - (t1 - e))) + c21 + a.y * b.y;
    float hi = t1 + t2;
    float lo = t2 - (hi - t1);
    return vec2(hi, lo);
  }
  vec2 dfNeg(vec2 a){ return vec2(-a.x, -a.y); }
  vec2 dfAbs(vec2 a){ return (a.x < 0.0) ? vec2(-a.x, -a.y) : a; }
`;

/**
 * Split a float64 into a `(hi, lo)` pair of float32s whose exact sum is the
 * original value — the df64 representation the shader expects. `Math.fround` is
 * the round-to-float32; the residual `lo` is what single precision throws away
 * (and what carries the deep-zoom detail).
 */
export function splitDouble(value: number): [number, number] {
  const hi = Math.fround(value);
  return [hi, value - hi];
}

/**
 * A reasonable iteration cap for a given zoom factor. Deep zoom needs many more
 * iterations to resolve the boundary (escape times grow with depth), so this
 * ramps up with `log2(zoom)` — without it, a deep view renders as a flat interior
 * and the Extended-precision detail is invisible.
 */
export function suggestedIter(zoom: number): number {
  const v = 100 + 110 * Math.max(0, Math.log2(Math.max(1, zoom)) - 2);
  return Math.min(MAX_ITERATIONS, Math.max(100, Math.round(v / 10) * 10));
}
