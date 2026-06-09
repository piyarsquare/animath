import * as THREE from 'three';

/**
 * An oriented "footprint" trail: each step lays a flat arrow pointing in the
 * direction of travel, with the letter **F** (for forward) inside it and a
 * cyan-left / magenta-right pair of halves. Both the F and the colors are
 * chiral, so wherever the surface is rendered through an orientation-reversing
 * transform (a mirrored Klein-bottle cell, the antipodal map, the Möbius floor
 * becoming the ceiling) the F comes back **reversed** and the colors swap —
 * making the orientation flip impossible to miss.
 *
 * Positions/orientations are supplied in whatever frame the caller wants; the
 * mesh can be rendered through any parent transform and the chirality follows.
 */
export interface FootprintTrail {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  count: () => number;
  /** Lay a print at `pos` facing `forward`, lifted along `up`. `mirror` reverses the
   *  chirality in place (the F + cyan/magenta swap) WITHOUT moving it off the `up`
   *  side — for a print set down while standing on the mirror face of the sheet. */
  append: (pos: THREE.Vector3, forward: THREE.Vector3, up: THREE.Vector3, mirror?: boolean) => void;
  /** Translate every laid print by (dx, dy, dz). Used when the player is folded back
   *  into the fundamental domain (a "teleport"), so the baked trail stays attached. */
  shift: (dx: number, dy: number, dz: number) => void;
  clear: () => void;
  dispose: () => void;
}

// Quad extent in (along, left) tangent coords; UV maps along→v (back→tip),
// left→u, so the texture's "up" is the travel direction.
const A_BACK = -0.4, A_TIP = 0.62, HW = 0.46, LIFT = 0.12;

function arrowTexture(): THREE.CanvasTexture {
  const s = 128;
  const cvs = document.createElement('canvas');
  cvs.width = cvs.height = s;
  const ctx = cvs.getContext('2d')!;
  ctx.clearRect(0, 0, s, s);

  const arrow = () => {
    ctx.beginPath();
    ctx.moveTo(s * 0.5, s * 0.05);   // tip (forward = canvas top)
    ctx.lineTo(s * 0.86, s * 0.42);
    ctx.lineTo(s * 0.65, s * 0.42);
    ctx.lineTo(s * 0.65, s * 0.96);
    ctx.lineTo(s * 0.35, s * 0.96);
    ctx.lineTo(s * 0.35, s * 0.42);
    ctx.lineTo(s * 0.14, s * 0.42);
    ctx.closePath();
  };

  arrow(); ctx.fillStyle = '#33d6ff'; ctx.fill();                 // left half (whole, then overpaint right)
  ctx.save(); ctx.beginPath(); ctx.rect(s * 0.5, 0, s * 0.5, s); ctx.clip();
  arrow(); ctx.fillStyle = '#ff4fa3'; ctx.fill(); ctx.restore(); // right half
  arrow(); ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.stroke();

  // the F, upright (its top toward the tip / forward)
  ctx.font = `bold ${Math.round(s * 0.42)}px Arial, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(0,0,0,0.65)';
  ctx.strokeText('F', s * 0.5, s * 0.64);
  ctx.fillStyle = '#ffffff';
  ctx.fillText('F', s * 0.5, s * 0.64);

  const t = new THREE.CanvasTexture(cvs);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

export function makeFootprintTrail(max: number): FootprintTrail {
  const VPER = 6; // two triangles
  const pos = new Float32Array(max * VPER * 3);
  const uv = new Float32Array(max * VPER * 2);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setDrawRange(0, 0);
  const tex = arrowTexture();
  const material = new THREE.MeshBasicMaterial({
    map: tex, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, depthWrite: true,
  });
  let count = 0;

  // quad corners: [along, left, u, v]. u runs left→0..1 so the F reads upright
  // (un-mirrored) to the player who just laid it; an orientation-reversing
  // parent transform then flips it.
  const CORNERS: [number, number, number, number][] = [
    [A_BACK, -HW, 1, 0],
    [A_TIP, -HW, 1, 1],
    [A_TIP, HW, 0, 1],
    [A_BACK, -HW, 1, 0],
    [A_TIP, HW, 0, 1],
    [A_BACK, HW, 0, 0],
  ];

  const append = (p0: THREE.Vector3, forward: THREE.Vector3, up: THREE.Vector3, mirror = false) => {
    if (count >= max) { pos.copyWithin(0, VPER * 3); uv.copyWithin(0, VPER * 2); count--; }
    const f = forward.clone().normalize();
    const n = up.clone().normalize();
    const l = new THREE.Vector3().crossVectors(n, f).normalize(); // left
    if (mirror) l.negate(); // mirror chirality in place (without flipping to the other side)
    let op = count * VPER * 3, ou = count * VPER * 2;
    for (const [along, left, u, v] of CORNERS) {
      pos[op] = p0.x + along * f.x + left * l.x + LIFT * n.x;
      pos[op + 1] = p0.y + along * f.y + left * l.y + LIFT * n.y;
      pos[op + 2] = p0.z + along * f.z + left * l.z + LIFT * n.z;
      uv[ou] = u; uv[ou + 1] = v;
      op += 3; ou += 2;
    }
    count++;
    (geo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    (geo.getAttribute('uv') as THREE.BufferAttribute).needsUpdate = true;
    geo.setDrawRange(0, count * VPER);
  };

  return {
    geometry: geo,
    material,
    count: () => count,
    append,
    shift: (dx, dy, dz) => {
      if (!count) return;
      for (let i = 0; i < count * VPER; i++) { pos[i * 3] += dx; pos[i * 3 + 1] += dy; pos[i * 3 + 2] += dz; }
      (geo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    },
    clear: () => { count = 0; geo.setDrawRange(0, 0); },
    dispose: () => { geo.dispose(); tex.dispose(); material.dispose(); },
  };
}
