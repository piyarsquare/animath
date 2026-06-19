// The twisting-ribbon (belt) mesh — the one unproven cost the three-hats review
// asked us to spike first. Built ONCE; the setters mutate the buffer positions
// in place each frame (never a per-frame TubeGeometry rebuild), matching the
// repo's axis-update pattern in lib/particles/createAnimationLoop.ts.
//
// Geometry model. The ribbon runs along +Y from a fixed clamp (s=0, bottom) to
// the rotating block (s=1, top). Every cross-section is a flat strip of width W;
// its orientation along the belt is a unit quaternion frame Q(s) (see belt.ts).
// A *pure twist* uses Q(s) = rotation about Y by θ·s; the *untwist* drives the
// same vertices from the null-homotopy frames instead, plus a centerline bow so
// the belt visibly loops out of plane while the block stays put. Front and back
// faces are two-toned (FrontSide / BackSide meshes sharing one geometry) so the
// twist reads with no labels and no reliance on lighting direction.

import * as THREE from 'three';
import { twistFrame, untwistFrame, type Quat } from './belt';

const DEG = Math.PI / 180;

export interface BeltColors {
  front: string;
  back: string;
  stripe: string;
  block: string;
  clamp: string;
}

export interface BeltMesh {
  group: THREE.Group;
  /** Pure twist. Angle in DEGREES (accumulated). */
  setTurn: (turnDeg: number) => void;
  /** Untwist homotopy from `turnDeg` at homotopy time t∈[0,1] (contractible turns). */
  setUntwist: (turnDeg: number, t: number) => void;
  /** The refusal: keep the twist frames (block pinned), only bow the body by
   *  `amt` so it strains and recoils without ever shedding the twist. */
  setStrain: (turnDeg: number, amt: number) => void;
  setColors: (c: BeltColors) => void;
  /** Reference to the stripe mesh so the app can toggle it. */
  stripe: THREE.Mesh;
  dispose: () => void;
}

interface BeltOpts {
  segments?: number;
  height?: number;
  width?: number;
}

// Scratch objects reused every frame (no per-frame allocation).
const _q = new THREE.Quaternion();
const _wide = new THREE.Vector3();
const _norm = new THREE.Vector3();
const X_AXIS = new THREE.Vector3(1, 0, 0);
const Z_AXIS = new THREE.Vector3(0, 0, 1);

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
  group.add(new THREE.Mesh(ribbonGeo, frontMat), new THREE.Mesh(ribbonGeo, backMat));

  // --- center stripe (separate thin strip, lifted onto the front face) --------
  const stripeGeo = new THREE.BufferGeometry();
  const stripePos = new Float32Array((N + 1) * 2 * 3);
  stripeGeo.setAttribute('position', new THREE.BufferAttribute(stripePos, 3));
  stripeGeo.setIndex(ribbonIdx.slice());
  const stripeMat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  const stripe = new THREE.Mesh(stripeGeo, stripeMat);
  group.add(stripe);

  // --- block (rotates by θ) with an orientation marker ------------------------
  const block = new THREE.Group();
  const blockMat = new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.1 });
  const blockBox = new THREE.Mesh(new THREE.BoxGeometry(W * 1.5, 0.28, W * 0.8), blockMat);
  const markerMat = new THREE.MeshStandardMaterial({ roughness: 0.4 });
  const marker = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.3, 4), markerMat);
  marker.rotation.x = Math.PI / 2; // point along +Z
  marker.position.set(0, 0, W * 0.4 + 0.12);
  block.add(blockBox, marker);
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

  /** Write all vertices from a per-s frame quaternion and a centerline bow. */
  function writeFrames(frame: (s: number) => Quat, bowZ: (s: number) => number) {
    let topX = 0, topY = 0, topZ = 0;
    for (let i = 0; i <= N; i++) {
      const s = i / N;
      const q = frame(s);
      _q.set(q.x, q.y, q.z, q.w);
      _wide.copy(X_AXIS).applyQuaternion(_q); // width direction
      _norm.copy(Z_AXIS).applyQuaternion(_q); // face normal (for stripe lift)
      const cy = -H / 2 + s * H;
      const cz = bowZ(s);
      const o = i * 6;
      // ribbon left / right edges
      ribbonPos[o + 0] = -hw * _wide.x; ribbonPos[o + 1] = cy - hw * _wide.y; ribbonPos[o + 2] = cz - hw * _wide.z;
      ribbonPos[o + 3] = hw * _wide.x; ribbonPos[o + 4] = cy + hw * _wide.y; ribbonPos[o + 5] = cz + hw * _wide.z;
      // stripe, narrower + lifted along the face normal
      stripePos[o + 0] = -sHW * _wide.x + eps * _norm.x; stripePos[o + 1] = cy - sHW * _wide.y + eps * _norm.y; stripePos[o + 2] = cz - sHW * _wide.z + eps * _norm.z;
      stripePos[o + 3] = sHW * _wide.x + eps * _norm.x; stripePos[o + 4] = cy + sHW * _wide.y + eps * _norm.y; stripePos[o + 5] = cz + sHW * _wide.z + eps * _norm.z;
      if (i === N) { topX = 0; topY = cy; topZ = cz; }
    }
    ribbonGeo.attributes.position.needsUpdate = true;
    stripeGeo.attributes.position.needsUpdate = true;
    ribbonGeo.computeVertexNormals();
    ribbonGeo.computeBoundingSphere();
    // Block: glued to the ribbon's top — carries that cross-section's frame and
    // sits at its (possibly bowed) position, just above the surface.
    const top = frame(1);
    block.quaternion.set(top.x, top.y, top.z, top.w);
    block.position.set(topX, topY + 0.14, topZ);
  }

  const noBow = () => 0;

  function setTurn(turnDeg: number) {
    const theta = turnDeg * DEG;
    writeFrames(s => twistFrame(s, theta), noBow);
  }

  function setUntwist(turnDeg: number, t: number) {
    const theta = turnDeg * DEG;
    // Belly the belt toward the camera at mid-homotopy (peaks at t=0.5, zero at
    // the ends) so the "loop it over the top" move reads in 3D.
    const amp = 4 * t * (1 - t) * 0.9;
    writeFrames(s => untwistFrame(s, t, theta), s => amp * Math.sin(Math.PI * s));
  }

  function setStrain(turnDeg: number, amt: number) {
    const theta = turnDeg * DEG;
    // Frames stay = the pure twist (block stays at −1, twist count unchanged);
    // only the centerline bows out and recoils.
    writeFrames(s => twistFrame(s, theta), s => amt * Math.sin(Math.PI * s));
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

  return { group, setTurn, setUntwist, setStrain, setColors, stripe, dispose };
}
