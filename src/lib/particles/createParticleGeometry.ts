import * as THREE from 'three';
import { SamplePattern } from './types';

/** Build `particleCount` points over the domain box x ∈ [xMin,xMax],
 *  z ∈ [yMin,yMax], laid out according to `pattern`. The window need not be
 *  centred on the origin, so off-centre domains like x ∈ [0, 6] are supported. */
export function createParticleGeometry(
  particleCount: number,
  xMin: number = -4,
  xMax: number = 4,
  yMin: number = -4,
  yMax: number = 4,
  pattern: SamplePattern = SamplePattern.Grid,
): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  fillPattern(geometry, particleCount, xMin, xMax, yMin, yMax, pattern);
  return geometry;
}

export function rebuildGeometryBuffers(
  geometry: THREE.BufferGeometry,
  particleCount: number,
  xMin: number = -4,
  xMax: number = 4,
  yMin: number = -4,
  yMax: number = 4,
  pattern: SamplePattern = SamplePattern.Grid,
): void {
  fillPattern(geometry, particleCount, xMin, xMax, yMin, yMax, pattern);
  geometry.setDrawRange(0, particleCount);
}

/** Point on the outline of the unit square [-1,1]² at perimeter fraction u∈[0,1). */
function squarePerimeter(u: number): [number, number] {
  const s = u * 4;
  if (s < 1) return [-1 + 2 * s, -1];
  if (s < 2) return [1, -1 + 2 * (s - 1)];
  if (s < 3) return [1 - 2 * (s - 2), 1];
  return [-1, 1 - 2 * (s - 3)];
}

const GOLDEN = Math.PI * (3 - Math.sqrt(5));

/** Lay out `count` domain points per the chosen pattern. Radial patterns sample
 *  a disk of radius max(halfX,halfY) centred on the box; Grid/Squares/Random use
 *  the box. Every layout fills exactly `count` points (one per index). */
function fillPattern(
  geometry: THREE.BufferGeometry,
  count: number,
  xMin: number, xMax: number, yMin: number, yMax: number,
  pattern: SamplePattern,
): void {
  const pos = new Float32Array(count * 3);
  const sizes = new Float32Array(count).fill(1);
  const seeds = new Float32Array(count * 4);

  const spanX = xMax - xMin, spanY = yMax - yMin;
  const cx = (xMin + xMax) / 2, cy = (yMin + yMax) / 2;
  const halfX = spanX / 2, halfY = spanY / 2;
  const R = Math.max(halfX, halfY) || 1;

  const set = (i: number, x: number, y: number) => {
    pos[3 * i] = x; pos[3 * i + 1] = 0; pos[3 * i + 2] = y;
    for (let k = 0; k < 4; k++) seeds[4 * i + k] = Math.random();
  };

  switch (pattern) {
    case SamplePattern.Polar: {
      // Interleaved polar lattice: equal-area radius, each ring nudged in angle
      // so the union covers ~count distinct angles (even arg z → crisp fibers).
      const nA = Math.max(8, Math.round(Math.sqrt(count) * 1.3));
      const nR = Math.max(1, Math.ceil(count / nA));
      for (let i = 0; i < count; i++) {
        const ring = Math.floor(i / nA), j = i % nA;
        const r = R * Math.sqrt((ring + 0.5) / nR);
        const ang = 2 * Math.PI * ((j + ring / nR) / nA);
        set(i, cx + r * Math.cos(ang), cy + r * Math.sin(ang));
      }
      break;
    }
    case SamplePattern.Rings: {
      // Concentric circles, each densely traced (golden-angle offset per ring).
      const nRings = Math.max(3, Math.round(Math.sqrt(count) / 2));
      const per = Math.ceil(count / nRings);
      for (let i = 0; i < count; i++) {
        const ring = Math.floor(i / per), j = i % per;
        const r = R * ((ring + 1) / nRings);
        const ang = 2 * Math.PI * (j / per) + ring * GOLDEN;
        set(i, cx + r * Math.cos(ang), cy + r * Math.sin(ang));
      }
      break;
    }
    case SamplePattern.Spokes: {
      // Radial rays from the centre.
      const nS = Math.max(6, Math.round(Math.sqrt(count) / 2));
      const per = Math.ceil(count / nS);
      for (let i = 0; i < count; i++) {
        const spoke = Math.floor(i / per), j = i % per;
        const ang = 2 * Math.PI * (spoke / nS);
        const r = R * ((j + 0.5) / per);
        set(i, cx + r * Math.cos(ang), cy + r * Math.sin(ang));
      }
      break;
    }
    case SamplePattern.Web: {
      // Spider web: half the points on rings, half on spokes.
      const half = Math.floor(count / 2);
      const nRings = Math.max(3, Math.round(Math.sqrt(half) / 1.2));
      const perR = Math.max(1, Math.ceil(half / nRings));
      for (let i = 0; i < half; i++) {
        const ring = Math.floor(i / perR), j = i % perR;
        const r = R * ((ring + 1) / nRings);
        const ang = 2 * Math.PI * (j / perR);
        set(i, cx + r * Math.cos(ang), cy + r * Math.sin(ang));
      }
      const nS = Math.max(6, Math.round(Math.sqrt(half) / 1.2));
      const perS = Math.max(1, Math.ceil((count - half) / nS));
      for (let i = half; i < count; i++) {
        const idx = i - half, spoke = Math.floor(idx / perS), j = idx % perS;
        const ang = 2 * Math.PI * (spoke / nS);
        const r = R * ((j + 0.5) / perS);
        set(i, cx + r * Math.cos(ang), cy + r * Math.sin(ang));
      }
      break;
    }
    case SamplePattern.Squares: {
      // Concentric axis-aligned square outlines.
      const nSq = Math.max(3, Math.round(Math.sqrt(count) / 2));
      const per = Math.ceil(count / nSq);
      for (let i = 0; i < count; i++) {
        const sq = Math.floor(i / per), j = i % per;
        const t = (sq + 1) / nSq;
        const [dx, dy] = squarePerimeter(j / per);
        set(i, cx + dx * halfX * t, cy + dy * halfY * t);
      }
      break;
    }
    case SamplePattern.Random: {
      for (let i = 0; i < count; i++) {
        set(i, xMin + Math.random() * spanX, yMin + Math.random() * spanY);
      }
      break;
    }
    case SamplePattern.Grid:
    default: {
      const side = Math.max(1, Math.ceil(Math.sqrt(count)));
      for (let i = 0; i < count; i++) {
        const ix = i % side, iy = Math.floor(i / side);
        set(i, xMin + ((ix + 0.5) / side) * spanX, yMin + ((iy + 0.5) / side) * spanY);
      }
      break;
    }
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('seed', new THREE.BufferAttribute(seeds, 4));
}

export interface AdaptiveOptions {
  /** Evaluate f at the input point (x, z). Returns its complex value. */
  evalFn: (x: number, z: number) => { x: number; y: number };
  /** Bias exponent on |f'(z)|. 0 → uniform, 1 → linear bias, >1 → more aggressive. */
  alpha: number;
  /** Clamp the per-candidate weight to `clampMul` × the median weight, so
   *  singularities like 1/z don't make all samples land in one spot. */
  clampMul?: number;
  /** Oversampling factor: how many uniform candidates to consider per output
   *  particle. Higher = better distribution at higher cost. */
  oversample?: number;
}

const MAX_CANDIDATES = 800_000;

/** Replace the geometry's buffers with `particleCount` points whose density
 *  in input-space is proportional to |f'(z)|^alpha — so regions where the
 *  function stretches the plane get more samples. Uses CPU finite-difference
 *  approximation of |f'(z)| at each candidate and weighted sampling. */
export function redistributeAdaptive(
  geometry: THREE.BufferGeometry,
  particleCount: number,
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
  opts: AdaptiveOptions,
): void {
  const { evalFn, alpha, clampMul = 50, oversample = 4 } = opts;

  // Build the oversampled uniform candidate grid.
  const desiredM = Math.min(particleCount * oversample, MAX_CANDIDATES);
  const sideM = Math.floor(Math.sqrt(desiredM));
  const M = sideM * sideM;
  const candX = new Float32Array(M);
  const candZ = new Float32Array(M);
  const weights = new Float64Array(M);
  const spanX = xMax - xMin;
  const spanY = yMax - yMin;
  const h = Math.max(1e-4, 0.0025 * Math.max(Math.abs(spanX), Math.abs(spanY)));

  let c = 0;
  for (let ix = 0; ix < sideM; ix++) {
    for (let iz = 0; iz < sideM; iz++) {
      const x = xMin + (ix / sideM) * spanX;
      const z = yMin + (iz / sideM) * spanY;
      candX[c] = x;
      candZ[c] = z;
      const fz   = evalFn(x, z);
      const fzh  = evalFn(x + h, z);
      const fzhz = evalFn(x, z + h);
      const dux = (fzh.x  - fz.x) / h;
      const dvx = (fzh.y  - fz.y) / h;
      const duy = (fzhz.x - fz.x) / h;
      const dvy = (fzhz.y - fz.y) / h;
      // Frobenius norm of the Jacobian — proportional to |f'(z)| for analytic f.
      const mag = Math.sqrt(dux * dux + dvx * dvx + duy * duy + dvy * dvy);
      weights[c] = isFinite(mag) ? mag : 0;
      c++;
    }
  }

  // Clamp weights so singularities can't capture nearly every sample. We
  // compute a quick median estimate from a partial sort of a sample.
  const sampleSize = Math.min(2048, M);
  const sample = new Float64Array(sampleSize);
  for (let i = 0; i < sampleSize; i++) {
    sample[i] = weights[Math.floor(Math.random() * M)];
  }
  sample.sort();
  const median = sample[sampleSize >>> 1] || 1e-6;
  const cap = median * clampMul;
  for (let i = 0; i < M; i++) {
    if (weights[i] > cap) weights[i] = cap;
    weights[i] = Math.pow(weights[i], alpha);
    if (!isFinite(weights[i])) weights[i] = 0;
  }

  // Cumulative distribution for binary-search sampling.
  const cum = new Float64Array(M);
  let sum = 0;
  for (let i = 0; i < M; i++) {
    sum += weights[i];
    cum[i] = sum;
  }

  const pos = new Float32Array(particleCount * 3);
  const sizes = new Float32Array(particleCount).fill(1);
  const seeds = new Float32Array(particleCount * 4);

  // If the entire weight collapsed to ~0 (extreme edge case), fall back to
  // uniform sampling from the candidates.
  if (sum <= 0 || !isFinite(sum)) {
    for (let i = 0; i < particleCount; i++) {
      const idx = Math.floor(Math.random() * M);
      pos[3 * i]     = candX[idx];
      pos[3 * i + 1] = 0;
      pos[3 * i + 2] = candZ[idx];
      for (let k = 0; k < 4; k++) seeds[4 * i + k] = Math.random();
    }
  } else {
    for (let i = 0; i < particleCount; i++) {
      const r = Math.random() * sum;
      let lo = 0, hi = M - 1;
      while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (cum[mid] < r) lo = mid + 1;
        else hi = mid;
      }
      pos[3 * i]     = candX[lo];
      pos[3 * i + 1] = 0;
      pos[3 * i + 2] = candZ[lo];
      for (let k = 0; k < 4; k++) seeds[4 * i + k] = Math.random();
    }
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('seed', new THREE.BufferAttribute(seeds, 4));
  geometry.setDrawRange(0, particleCount);
}
