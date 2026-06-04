import * as THREE from 'three';

/** Build a grid of `particleCount` points spread over the box
 *  x ∈ [-extentX, +extentX], z ∈ [-extentY, +extentY]. With equal extents the
 *  grid is square (the previous behavior, with a hard-coded extent of 4). */
export function createParticleGeometry(
  particleCount: number,
  extentX: number = 4,
  extentY: number = extentX,
): THREE.BufferGeometry {
  const side = Math.sqrt(particleCount);
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const sizes = new Float32Array(particleCount).fill(1);
  const seeds = new Float32Array(particleCount * 4);
  const spanX = extentX * 2;
  const spanY = extentY * 2;
  let i = 0;
  for (let ix = 0; ix < side; ix++) {
    for (let iz = 0; iz < side; iz++) {
      positions[3 * i] = (ix / side - 0.5) * spanX;
      positions[3 * i + 1] = 0;
      positions[3 * i + 2] = (iz / side - 0.5) * spanY;
      for (let k = 0; k < 4; k++) {
        seeds[4 * i + k] = Math.random();
      }
      i++;
    }
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('seed', new THREE.BufferAttribute(seeds, 4));
  return geometry;
}

export function rebuildGeometryBuffers(
  geometry: THREE.BufferGeometry,
  particleCount: number,
  extentX: number = 4,
  extentY: number = extentX,
): void {
  const side = Math.sqrt(particleCount);
  const pos = new Float32Array(particleCount * 3);
  const sizes = new Float32Array(particleCount).fill(1);
  const seeds = new Float32Array(particleCount * 4);
  const spanX = extentX * 2;
  const spanY = extentY * 2;
  let i = 0;
  for (let ix = 0; ix < side; ix++) {
    for (let iz = 0; iz < side; iz++) {
      pos[3 * i] = (ix / side - 0.5) * spanX;
      pos[3 * i + 1] = 0;
      pos[3 * i + 2] = (iz / side - 0.5) * spanY;
      for (let k = 0; k < 4; k++) {
        seeds[4 * i + k] = Math.random();
      }
      i++;
    }
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('seed', new THREE.BufferAttribute(seeds, 4));
  geometry.setDrawRange(0, particleCount);
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
  extentX: number,
  extentY: number,
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
  const spanX = extentX * 2;
  const spanY = extentY * 2;
  const h = Math.max(1e-4, 0.005 * Math.max(extentX, extentY));

  let c = 0;
  for (let ix = 0; ix < sideM; ix++) {
    for (let iz = 0; iz < sideM; iz++) {
      const x = (ix / sideM - 0.5) * spanX;
      const z = (iz / sideM - 0.5) * spanY;
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
