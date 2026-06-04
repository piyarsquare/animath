// Polar / log-polar helpers for the Plane Transform viewer.
//
// These are deliberately small, dependency-free pure functions: this is an
// experiment living inside PlaneTransform, but if it proves useful the sampler
// and the layout transforms below can be lifted into `lib/particles` wholesale
// and shared with the 3D ComplexParticles viewer.
//
// IMPORTANT: `clipFromMath` mirrors the log-polar branch in
// `shaders/index.ts` (the vertex shader). If you change the math in one,
// change it in the other so the GPU points and the SVG curve overlay agree.

export type GridMode  = 'cartesian' | 'polar';
export type PlaneMode = 'cartesian' | 'logpolar';

const PI = Math.PI;
/** Floor on the magnitude before taking log, matching the shader's `max(r,…)`. */
const MIN_R = 1e-4;
/** Cartesian clamp for giant points (1/z near 0), matching the shader. */
const GIANT = 1e3;

/** Vertical span (in log-radius) that fills the visible pane in log-polar mode.
 *  Floored at 1 so the view never collapses or inverts for viewExtent ≤ 1. */
export function logSpan(viewExtent: number): number {
  return Math.max(Math.log(viewExtent), 1);
}

/**
 * Sample the input domain into a flat [x0,y0, x1,y1, …] array of `density²`
 * points (math coordinates), either on a Cartesian mesh or a polar grid of
 * log-spaced rings × evenly-spaced rays.
 */
export function sampleInputPositions(
  gridMode: GridMode, density: number, viewExtent: number,
): Float32Array {
  const n = density * density;
  const out = new Float32Array(n * 2);
  let k = 0;

  if (gridMode === 'polar') {
    const rMin = viewExtent * 1e-3;
    const ratio = viewExtent / rMin;
    for (let i = 0; i < density; i++) {
      // Log-spaced radius so rings read evenly and match the brightness banding.
      const t = density > 1 ? i / (density - 1) : 0;
      const r = rMin * Math.pow(ratio, t);
      for (let j = 0; j < density; j++) {
        const theta = (j / density) * 2 * PI;   // exclusive end avoids a doubled ray
        out[2 * k]     = r * Math.cos(theta);
        out[2 * k + 1] = r * Math.sin(theta);
        k++;
      }
    }
    return out;
  }

  // Cartesian mesh over [-viewExtent, +viewExtent]².
  for (let i = 0; i < density; i++) {
    for (let j = 0; j < density; j++) {
      out[2 * k]     = (i / (density - 1) - 0.5) * 2 * viewExtent;
      out[2 * k + 1] = (j / (density - 1) - 0.5) * 2 * viewExtent;
      k++;
    }
  }
  return out;
}

/**
 * Math point → normalized device coords (NDC, the [-1,1]² square the renderer
 * draws into). The SVG overlay reuses this so curves line up with the GPU
 * points. Mirrors the vertex shader.
 */
export function clipFromMath(
  x: number, y: number, planeMode: PlaneMode, viewExtent: number,
): [number, number] {
  if (planeMode === 'logpolar') {
    const r = Math.hypot(x, y);
    const ny = Math.log(Math.max(r, MIN_R)) / logSpan(viewExtent);
    const nx = Math.atan2(y, x) / PI;
    return [nx, ny];
  }
  // Cartesian: clamp giants the same way the shader does, then scale.
  let cx = x, cy = y;
  const L = Math.hypot(x, y);
  if (L > GIANT) { cx = (x / L) * GIANT; cy = (y / L) * GIANT; }
  return [cx / viewExtent, cy / viewExtent];
}

/**
 * Inverse of `clipFromMath`: NDC → math point. Used by freehand drawing so a
 * stroke in the (unrolled) input pane maps back to the right z values.
 */
export function mathFromClip(
  nx: number, ny: number, planeMode: PlaneMode, viewExtent: number,
): [number, number] {
  if (planeMode === 'logpolar') {
    const theta = nx * PI;
    const r = Math.exp(ny * logSpan(viewExtent));
    return [r * Math.cos(theta), r * Math.sin(theta)];
  }
  return [nx * viewExtent, ny * viewExtent];
}
