// The twisting-ribbon (belt) mesh — the one unproven cost the three-hats review
// asked us to spike first. Built ONCE; `setTurn` mutates the buffer positions in
// place each frame (never a per-frame TubeGeometry rebuild), matching the repo's
// axis-update pattern in lib/particles/createAnimationLoop.ts.
//
// Geometry model (the honest belt). The ribbon runs along +Y from a fixed clamp
// (s=0, bottom) to the rotating block (s=1, top). Its flat cross-section is a
// strip of width W lying initially in the XY plane; at parameter s the strip is
// twisted about the long (Y) axis by twist(s) = θ·s — i.e. the physical belt
// accumulates the *full* block angle θ along its length (this is the fidelity
// crux of the T1 question: a stripe glued to this surface rotates at the full
// rate, not θ/2). Front and back faces are two-toned so the twist reads with no
// labels and no reliance on lighting direction.

import * as THREE from 'three';

const DEG = Math.PI / 180;

export interface BeltColors {
  /** Front face of the ribbon. */
  front: string;
  /** Back face (shows wherever the ribbon has twisted away from you). */
  back: string;
  /** The painted center stripe + the block's orientation marker. */
  stripe: string;
  /** The rotating block. */
  block: string;
  /** The fixed clamp. */
  clamp: string;
}

export interface BeltMesh {
  group: THREE.Group;
  /** Mutate the twist + block orientation in place. Angle in DEGREES (accumulated). */
  setTurn: (turnDeg: number) => void;
  setColors: (c: BeltColors) => void;
  dispose: () => void;
}

interface BeltOpts {
  segments?: number;
  height?: number;
  width?: number;
}

const Y_AXIS = new THREE.Vector3(0, 1, 0);

export function buildBelt(colors: BeltColors, opts: BeltOpts = {}): BeltMesh {
  const N = opts.segments ?? 96;
  const H = opts.height ?? 3;
  const W = opts.width ?? 0.7;
  const hw = W / 2;
  const sHW = W * 0.12; // center-stripe half-width
  const eps = 0.012; // lift the stripe just off the front face

  const group = new THREE.Group();

  // --- ribbon surface (shared geometry, front + back meshes) ------------------
  const ribbonGeo = new THREE.BufferGeometry();
  const ribbonPos = new Float32Array((N + 1) * 2 * 3);
  ribbonGeo.setAttribute('position', new THREE.BufferAttribute(ribbonPos, 3));
  const ribbonIdx: number[] = [];
  for (let i = 0; i < N; i++) {
    const a = 2 * i, b = 2 * i + 1, c = 2 * i + 3, d = 2 * i + 2;
    ribbonIdx.push(a, b, c, a, c, d);
  }
  ribbonGeo.setIndex(ribbonIdx);

  const frontMat = new THREE.MeshStandardMaterial({ side: THREE.FrontSide, roughness: 0.55, metalness: 0.05 });
  const backMat = new THREE.MeshStandardMaterial({ side: THREE.BackSide, roughness: 0.7, metalness: 0.0 });
  const frontMesh = new THREE.Mesh(ribbonGeo, frontMat);
  const backMesh = new THREE.Mesh(ribbonGeo, backMat);
  group.add(frontMesh, backMesh);

  // --- center stripe (separate thin strip, lifted onto the front face) --------
  const stripeGeo = new THREE.BufferGeometry();
  const stripePos = new Float32Array((N + 1) * 2 * 3);
  stripeGeo.setAttribute('position', new THREE.BufferAttribute(stripePos, 3));
  stripeGeo.setIndex(ribbonIdx.slice());
  const stripeMat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  const stripeMesh = new THREE.Mesh(stripeGeo, stripeMat);
  group.add(stripeMesh);

  // --- block (rotates by θ) with an orientation marker ------------------------
  const block = new THREE.Group();
  const blockMat = new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.1 });
  const blockBox = new THREE.Mesh(new THREE.BoxGeometry(W * 1.5, 0.28, W * 0.8), blockMat);
  // A wedge marker on the +Z face: a clear "front" so the block's own rotation
  // (which returns home at BOTH 360° and 720°) is unmistakable.
  const markerMat = new THREE.MeshStandardMaterial({ roughness: 0.4 });
  const marker = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.3, 4), markerMat);
  marker.rotation.x = Math.PI / 2; // point along +Z
  marker.position.set(0, 0, W * 0.4 + 0.12);
  block.add(blockBox, marker);
  block.position.set(0, H / 2 + 0.14, 0);
  group.add(block);

  // --- clamp (fixed) ----------------------------------------------------------
  const clampMat = new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0.0 });
  const clamp = new THREE.Mesh(new THREE.BoxGeometry(W * 1.6, 0.24, W * 0.9), clampMat);
  clamp.position.set(0, -H / 2 - 0.12, 0);
  group.add(clamp);

  function setColors(c: BeltColors) {
    frontMat.color.set(c.front);
    backMat.color.set(c.back);
    stripeMat.color.set(c.stripe);
    blockMat.color.set(c.block);
    markerMat.color.set(c.stripe);
    clampMat.color.set(c.clamp);
  }
  setColors(colors);

  function setTurn(turnDeg: number) {
    const theta = turnDeg * DEG;
    for (let i = 0; i <= N; i++) {
      const s = i / N;
      const y = -H / 2 + s * H;
      const t = theta * s; // honest belt: full block angle accumulated along length
      const ct = Math.cos(t), st = Math.sin(t);
      const o = i * 6;
      // ribbon: left then right
      ribbonPos[o + 0] = -hw * ct; ribbonPos[o + 1] = y; ribbonPos[o + 2] = -hw * st;
      ribbonPos[o + 3] = hw * ct; ribbonPos[o + 4] = y; ribbonPos[o + 5] = hw * st;
      // stripe: thin, lifted along the face normal n = (-sin t, 0, cos t)
      const nx = -st * eps, nz = ct * eps;
      stripePos[o + 0] = -sHW * ct + nx; stripePos[o + 1] = y; stripePos[o + 2] = -sHW * st + nz;
      stripePos[o + 3] = sHW * ct + nx; stripePos[o + 4] = y; stripePos[o + 5] = sHW * st + nz;
    }
    ribbonGeo.attributes.position.needsUpdate = true;
    stripeGeo.attributes.position.needsUpdate = true;
    ribbonGeo.computeVertexNormals();
    ribbonGeo.computeBoundingSphere();
    // The block is glued to the ribbon's top: it carries the full angle θ.
    block.quaternion.setFromAxisAngle(Y_AXIS, theta);
  }
  setTurn(0);

  function dispose() {
    ribbonGeo.dispose();
    stripeGeo.dispose();
    frontMat.dispose();
    backMat.dispose();
    stripeMat.dispose();
    blockMat.dispose();
    markerMat.dispose();
    clampMat.dispose();
    (blockBox.geometry as THREE.BufferGeometry).dispose();
    (marker.geometry as THREE.BufferGeometry).dispose();
    (clamp.geometry as THREE.BufferGeometry).dispose();
  }

  return { group, setTurn, setColors, dispose };
}
