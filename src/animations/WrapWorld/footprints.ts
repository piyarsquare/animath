import * as THREE from 'three';

/**
 * An oriented "footprint" trail: each step lays a flat arrow pointing in the
 * direction of travel, with a left half and a right half in different colors
 * (so a mirror-reflection is visible as the colors swapping sides) and a
 * distinct underside color (its top vs bottom). Positions/orientations are
 * supplied in whatever frame the caller wants (base coords for the flat tiling,
 * world coords on the sphere); the mesh can then be rendered through any parent
 * transform — a mirrored cell or the antipodal map — and the chirality follows.
 */
export interface FootprintTrail {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  count: () => number;
  append: (pos: THREE.Vector3, forward: THREE.Vector3, up: THREE.Vector3) => void;
  clear: () => void;
  dispose: () => void;
}

// Arrow outline in (along, left) tangent coords.
const SHAPE: [number, number][] = [
  [0.6, 0],      // tip
  [-0.4, 0.34],  // back-left
  [-0.4, -0.34], // back-right
];
const TOP_Y = 0.12;
const BOT_Y = 0.05;
const C_TIP = new THREE.Color(0xffffff);
const C_LEFT = new THREE.Color(0x33d6ff);   // left half (top)
const C_RIGHT = new THREE.Color(0xff4fa3);  // right half (top)
const C_UNDER = new THREE.Color(0xffc400);  // underside

export function makeFootprintTrail(max: number): FootprintTrail {
  const VPER = 6; // two triangles: top + underside
  const pos = new Float32Array(max * VPER * 3);
  const col = new Float32Array(max * VPER * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setDrawRange(0, 0);
  const material = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide });
  let count = 0;

  const write = (
    o: number, along: number, left: number, y: number,
    p: THREE.Vector3, f: THREE.Vector3, l: THREE.Vector3, n: THREE.Vector3, c: THREE.Color,
  ) => {
    pos[o] = p.x + along * f.x + left * l.x + y * n.x;
    pos[o + 1] = p.y + along * f.y + left * l.y + y * n.y;
    pos[o + 2] = p.z + along * f.z + left * l.z + y * n.z;
    col[o] = c.r; col[o + 1] = c.g; col[o + 2] = c.b;
  };

  const append = (p0: THREE.Vector3, forward: THREE.Vector3, up: THREE.Vector3) => {
    if (count >= max) { pos.copyWithin(0, VPER * 3); col.copyWithin(0, VPER * 3); count--; }
    const f = forward.clone().normalize();
    const n = up.clone().normalize();
    const l = new THREE.Vector3().crossVectors(n, f).normalize(); // left
    let o = count * VPER * 3;
    const topCols = [C_TIP, C_LEFT, C_RIGHT];
    for (let i = 0; i < 3; i++) { write(o, SHAPE[i][0], SHAPE[i][1], TOP_Y, p0, f, l, n, topCols[i]); o += 3; }
    for (let i = 0; i < 3; i++) { write(o, SHAPE[i][0], SHAPE[i][1], BOT_Y, p0, f, l, n, C_UNDER); o += 3; }
    count++;
    (geo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    (geo.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true;
    geo.setDrawRange(0, count * VPER);
  };

  return {
    geometry: geo,
    material,
    count: () => count,
    append,
    clear: () => { count = 0; geo.setDrawRange(0, 0); },
    dispose: () => { geo.dispose(); material.dispose(); },
  };
}
