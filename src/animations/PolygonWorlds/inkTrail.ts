import * as THREE from 'three';

/**
 * The footprint trail as **ink on the sheet**.
 *
 * One trail exists per world: a sequence of oriented footprint decals
 * ("stamps") stored ONCE, in the world's canonical coordinates, with no mirror
 * flags and no per-side rebuilds. Every visible appearance of the trail — the
 * periodic copies in the neighbouring cells, the ℝP² antipodal twin, the
 * reversed read through the glass floor — is produced by rendering this one
 * buffer through the same genuine transforms that already place the decor
 * (deck elements, the sheet flip). An orientation-reversing (det < 0)
 * transform really mirrors the geometry it maps, so "my old footprints read
 * backwards from the other side of the sheet" is geometry, not a flag: you
 * never *become* mirrored — you are on the other side of the sheet, looking
 * at the back of the ink.
 *
 * A quad is written from an explicit affine frame (pos, fwd, left, normal):
 * the three vectors are the decal's actual axes — their length sets its size
 * (hyperbolic callers pass conformally shrinking vectors) — and the
 * **handedness** of the frame is the print's genuine chirality. A caller that
 * pulls a world-space stamp back through a det<0 transform hands us a
 * left-handed frame and the buffer holds mirror ink, exactly as a real stamp
 * through a real reflection.
 *
 * The glyph is the classic orientation-test pair: an arrow with an **F**,
 * cyan on the print's left and magenta on its right.
 */
export interface InkTrail {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  count: () => number;
  /** Write quad slot `i` (0 ≤ i < capacity) from an explicit frame. */
  setQuad: (i: number, pos: THREE.Vector3, fwd: THREE.Vector3, left: THREE.Vector3, normal: THREE.Vector3) => void;
  /** Set how many quads are drawn (slots ≥ n keep their data but are hidden). */
  setCount: (n: number) => void;
  /** Drop slot 0 (the oldest stamp), shifting the rest down — the ring-buffer step. */
  dropOldest: () => void;
  /** End-to-end chirality probe of slot `i` AS RENDERED: applies `m` (the
   *  instance transform the mesh is drawn through; null = identity) to the
   *  buffered corners and reports the signed side of the cyan half along the
   *  character's up×forward axis. >0 ⇒ the print reads right-handed (correct)
   *  in that frame; <0 ⇒ it reads mirror-reversed. 0 if the slot is empty. */
  chirality: (i: number, m: THREE.Matrix4 | null, forward: THREE.Vector3, up: THREE.Vector3) => number;
  /** Rendered center of slot `i` through instance transform `m` (null =
   *  identity) — the average of the quad's buffered corners after `m`. Null if
   *  the slot is empty. Diagnostic companion to {@link chirality}. */
  slotCenter: (i: number, m: THREE.Matrix4 | null) => THREE.Vector3 | null;
  clear: () => void;
  dispose: () => void;
}

// Decal extent in (along, left) frame coords; UV maps along→v (back→tip) and
// left→u so the texture's "up" is the travel direction. LIFT pushes the ink
// off the face along the frame's normal (so a flipped image hangs under it).
const A_BACK = -0.4, A_TIP = 0.62, HW = 0.46, LIFT = 0.12;

function glyphTexture(): THREE.CanvasTexture {
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

export function makeInkTrail(capacity: number): InkTrail {
  const VPER = 6; // two triangles
  const pos = new Float32Array(capacity * VPER * 3);
  const uv = new Float32Array(capacity * VPER * 2);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setDrawRange(0, 0);
  const tex = glyphTexture();
  const material = new THREE.MeshBasicMaterial({
    map: tex, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, depthWrite: true,
  });
  let n = 0;

  // quad corners: [along, left, u, v]. left=+HW ↔ u=0 (cyan) — cyan sits on
  // the frame's LEFT, so a right-handed frame reads cyan-left/magenta-right.
  const CORNERS: [number, number, number, number][] = [
    [A_BACK, -HW, 1, 0],
    [A_TIP, -HW, 1, 1],
    [A_TIP, HW, 0, 1],
    [A_BACK, -HW, 1, 0],
    [A_TIP, HW, 0, 1],
    [A_BACK, HW, 0, 0],
  ];

  const markDirty = () => {
    (geo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    (geo.getAttribute('uv') as THREE.BufferAttribute).needsUpdate = true;
  };

  const setQuad = (i: number, p: THREE.Vector3, f: THREE.Vector3, l: THREE.Vector3, nv: THREE.Vector3) => {
    let op = i * VPER * 3, ou = i * VPER * 2;
    for (const [along, left, u, v] of CORNERS) {
      pos[op] = p.x + along * f.x + left * l.x + LIFT * nv.x;
      pos[op + 1] = p.y + along * f.y + left * l.y + LIFT * nv.y;
      pos[op + 2] = p.z + along * f.z + left * l.z + LIFT * nv.z;
      uv[ou] = u; uv[ou + 1] = v;
      op += 3; ou += 2;
    }
    markDirty();
  };

  return {
    geometry: geo,
    material,
    count: () => n,
    setQuad,
    setCount: (c: number) => { n = c; geo.setDrawRange(0, n * VPER); },
    dropOldest: () => {
      if (!n) return;
      pos.copyWithin(0, VPER * 3, n * VPER * 3);
      uv.copyWithin(0, VPER * 2, n * VPER * 2);
      n--;
      geo.setDrawRange(0, n * VPER);
      markDirty();
    },
    chirality: (i, m, forward, up) => {
      if (i < 0 || i >= n) return 0;
      const base = i * VPER;
      const cy = new THREE.Vector3(), mg = new THREE.Vector3(), c = new THREE.Vector3();
      let nc = 0, nm = 0;
      for (let k = 0; k < VPER; k++) {
        const o = (base + k) * 3, u = uv[(base + k) * 2];
        c.set(pos[o], pos[o + 1], pos[o + 2]);
        if (m) c.applyMatrix4(m);
        if (u < 0.5) { cy.add(c); nc++; } else { mg.add(c); nm++; }
      }
      if (!nc || !nm) return 0;
      cy.multiplyScalar(1 / nc); mg.multiplyScalar(1 / nm);
      const axis = new THREE.Vector3().crossVectors(up, forward).normalize();
      return cy.sub(mg).dot(axis); // >0: cyan on the character's left ⇒ right-handed
    },
    slotCenter: (i, m) => {
      if (i < 0 || i >= n) return null;
      const c = new THREE.Vector3(), v = new THREE.Vector3();
      const base = i * VPER;
      for (let k = 0; k < VPER; k++) {
        const o = (base + k) * 3;
        v.set(pos[o], pos[o + 1], pos[o + 2]);
        if (m) v.applyMatrix4(m);
        c.add(v);
      }
      return c.multiplyScalar(1 / VPER);
    },
    clear: () => { n = 0; geo.setDrawRange(0, 0); },
    dispose: () => { geo.dispose(); tex.dispose(); material.dispose(); },
  };
}
