import * as THREE from 'three';

/** Cell spacing (domain units per grid cell) for a `res×res` sheet over the box
 *  x ∈ [xMin,xMax], y ∈ [yMin,yMax]. The fill shader needs this to find a quad's
 *  four corners from its stored lower-left `cellBase`. */
export function sheetCellSize(
  res: number, xMin: number, xMax: number, yMin: number, yMax: number,
): [number, number] {
  const cells = Math.max(1, Math.floor(res));
  return [(xMax - xMin) / cells, (yMax - yMin) / cells];
}

/** Build the **filled** sheet: a regular grid of rectangular cells over the
 *  domain box, each cell two triangles. The geometry is **non-indexed** (6
 *  vertices per cell) so every vertex of a cell can carry that cell's lower-left
 *  domain point in `cellBase` — the fill shader colours each rectangle by the
 *  average of its four corner colours (one flat colour per cell). Vertex
 *  positions still match the points layout (pos.x = x, pos.y = 0, pos.z = y), so
 *  the shared surface math maps them onto the function graph exactly as the
 *  point cloud. `seed` is zero so any Jitter shifts the sheet uniformly rather
 *  than tearing it. */
export function createSheetGeometry(
  res: number,
  xMin: number = -4, xMax: number = 4, yMin: number = -4, yMax: number = 4,
): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  fillSheet(geometry, res, xMin, xMax, yMin, yMax);
  return geometry;
}

export function rebuildSheetGeometry(
  geometry: THREE.BufferGeometry,
  res: number,
  xMin: number = -4, xMax: number = 4, yMin: number = -4, yMax: number = 4,
): void {
  fillSheet(geometry, res, xMin, xMax, yMin, yMax);
}

/** Build the **wireframe** sheet: the same grid drawn as `LineSegments` of only
 *  the row and column edges — i.e. rectangle borders, with no triangle diagonals.
 *  Indexed (one vertex per grid node) and uses the same shared surface math, so
 *  the lines land exactly on the edges of the filled cells. */
export function createSheetWireGeometry(
  res: number,
  xMin: number = -4, xMax: number = 4, yMin: number = -4, yMax: number = 4,
): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  fillSheetWire(geometry, res, xMin, xMax, yMin, yMax);
  return geometry;
}

export function rebuildSheetWireGeometry(
  geometry: THREE.BufferGeometry,
  res: number,
  xMin: number = -4, xMax: number = 4, yMin: number = -4, yMax: number = 4,
): void {
  fillSheetWire(geometry, res, xMin, xMax, yMin, yMax);
}

function fillSheet(
  geometry: THREE.BufferGeometry,
  res: number,
  xMin: number, xMax: number, yMin: number, yMax: number,
): void {
  const cells = Math.max(1, Math.floor(res));
  const [dx, dy] = sheetCellSize(cells, xMin, xMax, yMin, yMax);
  const quadCount = cells * cells;
  const vertCount = quadCount * 6; // two triangles per cell, non-indexed

  const pos = new Float32Array(vertCount * 3);
  const base = new Float32Array(vertCount * 2); // cell lower-left domain point
  const seeds = new Float32Array(vertCount * 4); // zeros: jitter → uniform shift
  const sizes = new Float32Array(vertCount).fill(1);

  let v = 0;
  const put = (x: number, y: number, bx: number, by: number) => {
    pos[3 * v] = x; pos[3 * v + 1] = 0; pos[3 * v + 2] = y;
    base[2 * v] = bx; base[2 * v + 1] = by;
    v++;
  };

  for (let j = 0; j < cells; j++) {
    const y0 = yMin + j * dy, y1 = y0 + dy;
    for (let i = 0; i < cells; i++) {
      const x0 = xMin + i * dx, x1 = x0 + dx;
      // Triangle 1: (x0,y0) (x1,y0) (x1,y1)
      put(x0, y0, x0, y0); put(x1, y0, x0, y0); put(x1, y1, x0, y0);
      // Triangle 2: (x0,y0) (x1,y1) (x0,y1)
      put(x0, y0, x0, y0); put(x1, y1, x0, y0); put(x0, y1, x0, y0);
    }
  }

  geometry.setIndex(null);
  geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geometry.setAttribute('cellBase', new THREE.BufferAttribute(base, 2));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('seed', new THREE.BufferAttribute(seeds, 4));
  geometry.setDrawRange(0, vertCount);
}

function fillSheetWire(
  geometry: THREE.BufferGeometry,
  res: number,
  xMin: number, xMax: number, yMin: number, yMax: number,
): void {
  const cells = Math.max(1, Math.floor(res));
  const n = cells + 1;            // vertices per side
  const vertCount = n * n;
  const spanX = xMax - xMin, spanY = yMax - yMin;

  const pos = new Float32Array(vertCount * 3);
  const seeds = new Float32Array(vertCount * 4);
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

  // Only horizontal + vertical edges (rectangle borders), never diagonals.
  const segs = 2 * n * (cells); // n rows × cells + n cols × cells
  const index = new Uint32Array(segs * 2);
  let t = 0;
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < cells; i++) {            // horizontal edges
      index[t++] = j * n + i; index[t++] = j * n + i + 1;
    }
  }
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < cells; j++) {            // vertical edges
      index[t++] = j * n + i; index[t++] = (j + 1) * n + i;
    }
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('seed', new THREE.BufferAttribute(seeds, 4));
  geometry.setIndex(new THREE.BufferAttribute(index, 1));
  geometry.setDrawRange(0, index.length);
}
