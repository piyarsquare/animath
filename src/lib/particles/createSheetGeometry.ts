import * as THREE from 'three';

/** Build a regular (res × res cells) indexed triangle grid spanning the domain
 *  box x ∈ [xMin,xMax], z ∈ [yMin,yMax]. The vertices match the points layout
 *  (pos.x = x, pos.y = 0, pos.z = y), so the shared vertex shader maps them onto
 *  the function surface exactly as it does the point cloud — but here adjacent
 *  vertices are stitched into triangles, giving a continuous sheet (and, via
 *  `wireframe`, a grid mesh). `seed` is all-zero so any Jitter applies as a
 *  uniform translation rather than tearing the surface apart. */
export function createSheetGeometry(
  res: number,
  xMin: number = -4,
  xMax: number = 4,
  yMin: number = -4,
  yMax: number = 4,
): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  fillSheet(geometry, res, xMin, xMax, yMin, yMax);
  return geometry;
}

/** Restamp an existing sheet geometry's buffers for a new resolution / box. */
export function rebuildSheetGeometry(
  geometry: THREE.BufferGeometry,
  res: number,
  xMin: number = -4,
  xMax: number = 4,
  yMin: number = -4,
  yMax: number = 4,
): void {
  fillSheet(geometry, res, xMin, xMax, yMin, yMax);
}

function fillSheet(
  geometry: THREE.BufferGeometry,
  res: number,
  xMin: number, xMax: number, yMin: number, yMax: number,
): void {
  const cells = Math.max(1, Math.floor(res));
  const n = cells + 1;            // vertices per side
  const vertCount = n * n;
  const spanX = xMax - xMin, spanY = yMax - yMin;

  const pos = new Float32Array(vertCount * 3);
  const seeds = new Float32Array(vertCount * 4); // zeros: jitter → uniform shift
  const sizes = new Float32Array(vertCount).fill(1);

  for (let j = 0; j < n; j++) {
    const y = yMin + (j / cells) * spanY;
    for (let i = 0; i < n; i++) {
      const k = j * n + i;
      pos[3 * k] = xMin + (i / cells) * spanX;
      pos[3 * k + 1] = 0;
      pos[3 * k + 2] = y;
    }
  }

  // Two triangles per cell. Uint32 so high resolutions (vertices > 65535) work.
  const index = new Uint32Array(cells * cells * 6);
  let t = 0;
  for (let j = 0; j < cells; j++) {
    for (let i = 0; i < cells; i++) {
      const a = j * n + i;
      const b = a + 1;
      const c = a + n;
      const d = c + 1;
      index[t++] = a; index[t++] = b; index[t++] = d;
      index[t++] = a; index[t++] = d; index[t++] = c;
    }
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('seed', new THREE.BufferAttribute(seeds, 4));
  geometry.setIndex(new THREE.BufferAttribute(index, 1));
  geometry.setDrawRange(0, index.length);
}
