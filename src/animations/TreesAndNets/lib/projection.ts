// General m-dimensional → 3D projection for the associahedron viewer.
//
// The associahedron of n leaves is (n-3)-dimensional: 3D at n=6, 4D at n=7, 5D
// at n=8, 6D at n=9, ... A bespoke 4D→3D transform does not scale, so we instead
// keep the polytope in its intrinsic R^{n-3} coordinates and apply a steerable
// linear projection to 3D. The default axes come from PCA (the directions of
// greatest spread); the viewer lets the user choose which principal components
// map to screen X/Y/Z, which is a dimension-agnostic way to "alter the projection".

export interface Pca {
  /** Centroid of the input points (length d). */
  center: number[];
  /** Principal axes as unit vectors (length d each), sorted by descending variance. */
  axes: number[][];
  /** Variances along each axis (descending). */
  values: number[];
}

/** Cyclic Jacobi eigendecomposition of a small symmetric matrix (d <= ~7 here). */
function jacobiEigen(input: number[][]): { values: number[]; vectors: number[][] } {
  const n = input.length;
  const a = input.map((row) => row.slice());
  const V: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  );
  for (let sweep = 0; sweep < 100; sweep++) {
    let off = 0;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) off += a[p][q] * a[p][q];
    if (off < 1e-14) break;
    for (let p = 0; p < n; p++) {
      for (let q = p + 1; q < n; q++) {
        if (Math.abs(a[p][q]) < 1e-15) continue;
        const phi = 0.5 * Math.atan2(2 * a[p][q], a[q][q] - a[p][p]);
        const c = Math.cos(phi);
        const s = Math.sin(phi);
        for (let k = 0; k < n; k++) {
          const akp = a[k][p];
          const akq = a[k][q];
          a[k][p] = c * akp - s * akq;
          a[k][q] = s * akp + c * akq;
        }
        for (let k = 0; k < n; k++) {
          const apk = a[p][k];
          const aqk = a[q][k];
          a[p][k] = c * apk - s * aqk;
          a[q][k] = s * apk + c * aqk;
        }
        for (let k = 0; k < n; k++) {
          const vkp = V[k][p];
          const vkq = V[k][q];
          V[k][p] = c * vkp - s * vkq;
          V[k][q] = s * vkp + c * vkq;
        }
      }
    }
  }
  return { values: a.map((row, i) => row[i]), vectors: V };
}

/** Principal component analysis of points in R^d (d = points[0].length). */
export function pca(points: number[][]): Pca {
  const d = points[0]?.length ?? 0;
  const count = Math.max(points.length, 1);
  const center = new Array<number>(d).fill(0);
  for (const p of points) for (let i = 0; i < d; i++) center[i] += p[i];
  for (let i = 0; i < d; i++) center[i] /= count;

  const cov: number[][] = Array.from({ length: d }, () => new Array<number>(d).fill(0));
  for (const p of points) {
    for (let i = 0; i < d; i++) {
      const pi = p[i] - center[i];
      for (let j = i; j < d; j++) {
        const v = pi * (p[j] - center[j]);
        cov[i][j] += v;
        if (j !== i) cov[j][i] += v;
      }
    }
  }
  for (let i = 0; i < d; i++) for (let j = 0; j < d; j++) cov[i][j] /= count;

  if (d === 0) return { center, axes: [], values: [] };
  const { values, vectors } = jacobiEigen(cov);
  const order = [...values.keys()].sort((a, b) => values[b] - values[a]);
  return {
    center,
    axes: order.map((k) => vectors.map((row) => row[k])),
    values: order.map((k) => values[k]),
  };
}

/** Project a centered point onto principal axis `idx` (0 if out of range). */
export function projectOnto(point: number[], pcaResult: Pca, idx: number): number {
  const axis = pcaResult.axes[idx];
  if (!axis) return 0;
  let sum = 0;
  for (let i = 0; i < axis.length; i++) sum += (point[i] - pcaResult.center[i]) * axis[i];
  return sum;
}
