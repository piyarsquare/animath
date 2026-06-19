import * as THREE from 'three';
import {
  EngineDeps3, FrameInput3, SolidEngine, ChiralityState, SolidMapState, TravelMode,
} from './engineTypes';
import { AXES, Axis, axisIndex, M3, SolidWorldSpec } from './solidSchema';
import { findLook } from './looks';
import { signTexture } from './textures';

/**
 * Solid Worlds — the flat (κ = 0) cover engine. The 3D port of Topology Walk's
 * seamless universal-cover tiling: render the fundamental cube room and a
 * bounded shell of its **deck-translates**, walking inside by a developing map.
 *
 * The walker carries a body frame (`bodyLinear`, an orthogonal 3×3). Crossing a
 * face applies that pairing's linear part to the frame — so a glide-reflection
 * pairing makes the frame **improper** (det −1). There is no normal to absorb
 * that flip (codimension 0), so the reversal lands on the body: the camera's
 * world matrix becomes left-handed and the whole view — room, sign, and the
 * walker's own footprints — renders mirror-reversed. `loopSign = det(bodyLinear)`
 * is the gauge-invariant certificate; the continuous step is always proper
 * (`perStepDet = +1`), the engine's proof that nothing *local* happened.
 */

interface Gen { g: THREE.Matrix4; gInv: THREE.Matrix4; gLin: THREE.Matrix4; gLinInv: THREE.Matrix4; }

interface Opts { roomSize: number; coverDepth: number; cameraDistance: number; lookId: string; }

function mat4From(m: M3, tx: number, ty: number, tz: number): THREE.Matrix4 {
  return new THREE.Matrix4().set(
    m[0], m[1], m[2], tx,
    m[3], m[4], m[5], ty,
    m[6], m[7], m[8], tz,
    0, 0, 0, 1,
  );
}

const TRAIL_CAP = 360;
const VPER = 24; // 8 triangles per 3D arrowhead stamp (top + bottom + 3 side walls)

const CY: [number, number, number] = [0.2, 0.84, 1];   // cyan — the print's left
const MG: [number, number, number] = [1, 0.31, 0.64];  // magenta — its right

export function makeCoverEngine(deps: EngineDeps3, spec: SolidWorldSpec, opts: Opts): SolidEngine {
  const { scene, camera, renderer } = deps;
  let size = opts.roomSize;
  let depth = opts.coverDepth;
  let camDist = opts.cameraDistance;
  let lookId = opts.lookId;

  // ── pose (developing map) ──────────────────────────────────────────────
  const pos = new THREE.Vector3();
  const bodyLinear = new THREE.Matrix4();          // orthogonal, translation 0
  const cell: Record<Axis, number> = { x: 0, y: 0, z: 0 };
  let yaw = 0, pitch = 0;

  // ── lighting ───────────────────────────────────────────────────────────
  const ambient = new THREE.AmbientLight(0xffffff, 0.5);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
  const keyLight = new THREE.DirectionalLight(0xffffff, 0.9);
  keyLight.position.set(0.4, 1, 0.3);
  const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
  fillLight.position.set(-0.3, -1, -0.2);
  scene.add(ambient, hemi, keyLight, fillLight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  function applyLook(id: string) {
    const L = findLook(id);
    const R = (depth + 0.55) * size; // matches the cover render radius
    scene.background = new THREE.Color(L.sky);
    // Very light fog: every rendered ring stays crisp (the hall-of-mirrors), and
    // only the cull boundary itself feathers into the sky. near sits past the
    // farthest drawn room, so nothing inside the cover hazes over.
    scene.fog = new THREE.Fog(L.sky, R * 0.95, R * 1.2);
    renderer.toneMappingExposure = L.exposure;
    ambient.intensity = L.ambient;
    hemi.color.setHex(L.hemiSky); hemi.groundColor.setHex(L.hemiGround); hemi.intensity = L.hemi;
    keyLight.color.setHex(L.keyColor); keyLight.intensity = L.key;
    fillLight.color.setHex(L.fillColor); fillLight.intensity = L.fill;
  }

  // ── disposal bookkeeping ─────────────────────────────────────────────────
  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(o: T): T => { disposables.push(o); return o; };

  // ── the footprint trail (stored once, in fundamental coordinates) ────────
  // Each stamp is a small SOLID 3D arrow (a raised tetra-arrow) so it reads from
  // any angle and never vanishes edge-on: a peak raised along the frame normal,
  // its LEFT face cyan and its RIGHT face magenta — the print's chirality. A
  // stamp written through a det < 0 transform (or viewed by a mirrored walker)
  // swaps which face you see, exactly as a real stamp through a real reflection.
  const trailPos = new Float32Array(TRAIL_CAP * VPER * 3);
  const trailCol = new Float32Array(TRAIL_CAP * VPER * 3);
  const trailGeo = track(new THREE.BufferGeometry());
  trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
  trailGeo.setAttribute('color', new THREE.BufferAttribute(trailCol, 3));
  trailGeo.setDrawRange(0, 0);
  const trailMat = track(new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }));
  const trailMesh = new THREE.Mesh(trailGeo, trailMat);
  // The geometry is preallocated at the origin with drawRange 0, so Three caches
  // a zero-radius bounding sphere before any footprint is written and buffer
  // writes never invalidate it — a per-cell clone whose cell origin is off-screen
  // would then be wrongly culled while its footprints are still visible. Disable
  // frustum culling on the trail (clone() copies the flag to every cover cell).
  trailMesh.frustumCulled = false;
  let trailN = 0;
  const lastStamp = new THREE.Vector3();
  let hasStamp = false;

  function writeStamp(p: THREE.Vector3, fwd: THREE.Vector3, left: THREE.Vector3, nrm: THREE.Vector3) {
    if (trailN >= TRAIL_CAP) {
      trailPos.copyWithin(0, VPER * 3, trailN * VPER * 3);
      trailCol.copyWithin(0, VPER * 3, trailN * VPER * 3);
      trailN--;
    }
    // A flat-lying arrowhead with thickness: a solid prism (top + bottom faces +
    // 3 side walls) pointing along travel, colored by its LEFT coordinate
    // (cyan-left → magenta-right) so the print's chirality reads from any angle.
    const aTip = size * 0.13, aBack = -size * 0.08, hw = size * 0.08, th = size * 0.022;
    const P = (along: number, lt: number, up: number): [number, number, number] => [
      p.x + along * fwd.x + lt * left.x + up * nrm.x,
      p.y + along * fwd.y + lt * left.y + up * nrm.y,
      p.z + along * fwd.z + lt * left.z + up * nrm.z,
    ];
    const col = (lt: number): [number, number, number] => {
      const t = Math.max(0, Math.min(1, lt / hw * 0.5 + 0.5)); // +hw → cyan, −hw → magenta
      return [MG[0] + (CY[0] - MG[0]) * t, MG[1] + (CY[1] - MG[1]) * t, MG[2] + (CY[2] - MG[2]) * t];
    };
    // the three corners (tip, back-left, back-right), each at top (+th) and bottom (−th)
    const aT = P(aTip, 0, th), bT = P(aBack, hw, th), cT = P(aBack, -hw, th);
    const aB = P(aTip, 0, -th), bB = P(aBack, hw, -th), cB = P(aBack, -hw, -th);
    const lA = 0, lB = hw, lC = -hw; // left coords for coloring
    type Vert = [[number, number, number], number];
    const tris: [Vert, Vert, Vert][] = [
      [[aT, lA], [bT, lB], [cT, lC]],          // top
      [[aB, lA], [cB, lC], [bB, lB]],          // bottom
      [[aT, lA], [aB, lA], [bB, lB]], [[aT, lA], [bB, lB], [bT, lB]], // tip→back-left wall
      [[bT, lB], [bB, lB], [cB, lC]], [[bT, lB], [cB, lC], [cT, lC]], // back wall
      [[cT, lC], [cB, lC], [aB, lA]], [[cT, lC], [aB, lA], [aT, lA]], // back-right→tip wall
    ];
    let o = trailN * VPER * 3;
    for (const tri of tris) for (const [v, lt] of tri) {
      const c = col(lt);
      trailPos[o] = v[0]; trailPos[o + 1] = v[1]; trailPos[o + 2] = v[2];
      trailCol[o] = c[0]; trailCol[o + 1] = c[1]; trailCol[o + 2] = c[2];
      o += 3;
    }
    trailN++;
    (trailGeo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    (trailGeo.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true;
    trailGeo.setDrawRange(0, trailN * VPER);
  }

  // ── the fundamental room (decor), rebuilt when the size changes ──────────
  let room = new THREE.Group();
  const roomDisposables: { dispose: () => void }[] = [];

  function buildRoom() {
    roomDisposables.forEach((d) => d.dispose());
    roomDisposables.length = 0;
    room = new THREE.Group();
    const h = size / 2;
    const std = (color: number) => {
      const m = new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.1, side: THREE.DoubleSide });
      roomDisposables.push(m); return m;
    };

    // cube edge frame
    const boxGeo = new THREE.BoxGeometry(size, size, size);
    const edges = new THREE.EdgesGeometry(boxGeo);
    boxGeo.dispose();
    roomDisposables.push(edges);
    const frameMat = new THREE.LineBasicMaterial({ color: 0x9fc0e0 });
    roomDisposables.push(frameMat);
    room.add(new THREE.LineSegments(edges, frameMat));

    // floor: a clear horizontal reference plane (a landmark for moving in 3D —
    // there is no global "down", but a plane keeps you oriented). A faint solid
    // slab you can see through, topped by a bright grid.
    const floorGeo = new THREE.PlaneGeometry(size, size);
    roomDisposables.push(floorGeo);
    const floorMat = new THREE.MeshBasicMaterial({
      color: 0x2a3c54, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false,
    });
    roomDisposables.push(floorMat);
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2; floor.position.y = -h;
    room.add(floor);
    const grid = new THREE.GridHelper(size, 8, 0x9fc4ec, 0x53708f);
    grid.position.y = -h + 0.02;
    roomDisposables.push(grid.geometry, grid.material as THREE.Material);
    room.add(grid);

    // asymmetric landmark props, so a copy is recognizable — and its mirror obvious
    const pillarGeo = new THREE.CylinderGeometry(size * 0.04, size * 0.05, size * 0.42, 14);
    roomDisposables.push(pillarGeo);
    const pillar = new THREE.Mesh(pillarGeo, std(0xffcf5a));
    pillar.position.set(h * 0.55, -h + size * 0.21, h * 0.42);
    room.add(pillar);

    const barGeo = new THREE.BoxGeometry(size * 0.34, size * 0.06, size * 0.06);
    const postGeo = new THREE.BoxGeometry(size * 0.06, size * 0.28, size * 0.06);
    roomDisposables.push(barGeo, postGeo);
    const lMat = std(0x46c8b0);
    const lUp = new THREE.Mesh(postGeo, lMat); lUp.position.set(-h * 0.5, -h + size * 0.14, -h * 0.4);
    const lFoot = new THREE.Mesh(barGeo, lMat); lFoot.position.set(-h * 0.5 + size * 0.14, -h + size * 0.03, -h * 0.4);
    room.add(lUp, lFoot);

    const ballGeo = new THREE.SphereGeometry(size * 0.09, 18, 14);
    roomDisposables.push(ballGeo);
    const ball = new THREE.Mesh(ballGeo, std(0xff6aa0));
    ball.position.set(h * 0.22, -h + size * 0.1, -h * 0.62);
    room.add(ball);

    // the opaque "HELLO" sign — reads forwards here, mirror-reversed once you
    // walk an orientation-reversing loop (the conversation's headline case)
    const postG = new THREE.CylinderGeometry(size * 0.012, size * 0.012, size * 0.34, 10);
    roomDisposables.push(postG);
    const sign = new THREE.Mesh(postG, std(0x9a9aa4));
    sign.position.set(0, -h + size * 0.17, -h * 0.5);
    room.add(sign);
    const plaqueGeo = new THREE.PlaneGeometry(size * 0.34, size * 0.17);
    roomDisposables.push(plaqueGeo);
    const signTex = signTexture('HELLO');
    roomDisposables.push(signTex);
    const plaqueMat = new THREE.MeshBasicMaterial({ map: signTex, side: THREE.DoubleSide });
    roomDisposables.push(plaqueMat);
    const plaque = new THREE.Mesh(plaqueGeo, plaqueMat);
    plaque.position.set(0, -h + size * 0.38, -h * 0.5);
    room.add(plaque);
  }

  // ── deck generators + the cover shell ────────────────────────────────────
  const gens: Record<Axis, Gen> = { x: blankGen(), y: blankGen(), z: blankGen() };
  function blankGen(): Gen {
    return { g: new THREE.Matrix4(), gInv: new THREE.Matrix4(), gLin: new THREE.Matrix4(), gLinInv: new THREE.Matrix4() };
  }
  function buildGenerators() {
    for (const axis of AXES) {
      const p = spec.pairings.find((q) => q.axis === axis)!;
      const t = [0, 0, 0]; t[axisIndex(axis)] = size;
      const g = mat4From(p.linear, t[0], t[1], t[2]);
      const gLin = mat4From(p.linear, 0, 0, 0);
      gens[axis] = { g, gInv: g.clone().invert(), gLin, gLinInv: gLin.clone().invert() };
    }
  }

  const coverRoot = new THREE.Group();
  scene.add(coverRoot);
  function buildCover() {
    while (coverRoot.children.length) coverRoot.remove(coverRoot.children[0]);
    const genList: THREE.Matrix4[] = [];
    for (const axis of AXES) genList.push(gens[axis].g, gens[axis].gInv);
    const R = (depth + 0.55) * size, cap = 400;
    const seen = new Set<string>();
    const key = (m: THREE.Matrix4) => m.elements.map((e) => Math.round(e * 1000)).join(',');
    const out: THREE.Matrix4[] = [];
    const queue: THREE.Matrix4[] = [new THREE.Matrix4()];
    seen.add(key(queue[0]));
    const c = new THREE.Vector3();
    while (queue.length && out.length < cap) {
      const cur = queue.shift()!;
      c.setFromMatrixPosition(cur);
      if (c.length() > R) continue;
      out.push(cur);
      for (const gen of genList) {
        const cand = cur.clone().multiply(gen);
        const k = key(cand);
        if (!seen.has(k)) { seen.add(k); queue.push(cand); }
      }
    }
    for (const m of out) {
      const cellGroup = new THREE.Group();
      cellGroup.matrixAutoUpdate = false;
      cellGroup.matrix.copy(m);
      cellGroup.add(room.clone(true));
      cellGroup.add(trailMesh.clone());
      coverRoot.add(cellGroup);
    }
  }

  // ── third-person avatars (fundamental cell only), one per travel mode ─────
  // All deliberately CHIRAL — cyan on the LEFT, magenta on the RIGHT, nose toward
  // −z (forward) — so you can watch yourself become your own mirror image.
  const mat = (color: number) => track(new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.1, side: THREE.DoubleSide }));
  const CYAN = 0x33d6ff, MAGENTA = 0xff4fa3;

  function buildPerson(): THREE.Group {
    const g = new THREE.Group();
    const body = new THREE.Mesh(track(new THREE.CylinderGeometry(size * 0.045, size * 0.06, size * 0.26, 14)), mat(0xffe08a));
    const head = new THREE.Mesh(track(new THREE.SphereGeometry(size * 0.05, 14, 10)), mat(0xffd27a)); head.position.y = size * 0.18;
    const nose = new THREE.Mesh(track(new THREE.ConeGeometry(size * 0.022, size * 0.08, 10)), mat(0xfff0c0));
    nose.rotation.x = -Math.PI / 2; nose.position.set(0, size * 0.18, -size * 0.07);
    const sg = track(new THREE.SphereGeometry(size * 0.026, 10, 8));
    const l = new THREE.Mesh(sg, mat(CYAN)); l.position.set(-size * 0.075, size * 0.02, 0);
    const r = new THREE.Mesh(sg, mat(MAGENTA)); r.position.set(size * 0.075, size * 0.02, 0);
    g.add(body, head, nose, l, r);
    return g;
  }

  function buildAirplane(): THREE.Group {
    const g = new THREE.Group();
    const fuse = new THREE.Mesh(track(new THREE.CylinderGeometry(size * 0.05, size * 0.035, size * 0.5, 14)), mat(0xe6ecf5));
    fuse.rotation.x = Math.PI / 2; // length along z
    const nose = new THREE.Mesh(track(new THREE.ConeGeometry(size * 0.05, size * 0.14, 14)), mat(0xcdd7e6));
    nose.rotation.x = -Math.PI / 2; nose.position.z = -size * 0.32;
    const wing = new THREE.Mesh(track(new THREE.BoxGeometry(size * 0.62, size * 0.02, size * 0.14)), mat(0xb9c6da));
    const tailFin = new THREE.Mesh(track(new THREE.BoxGeometry(size * 0.02, size * 0.12, size * 0.1)), mat(0xb9c6da));
    tailFin.position.set(0, size * 0.06, size * 0.22);
    const tailWing = new THREE.Mesh(track(new THREE.BoxGeometry(size * 0.24, size * 0.02, size * 0.08)), mat(0xb9c6da));
    tailWing.position.z = size * 0.22;
    const tipGeo = track(new THREE.BoxGeometry(size * 0.06, size * 0.03, size * 0.14));
    const lTip = new THREE.Mesh(tipGeo, mat(CYAN)); lTip.position.set(-size * 0.31, 0, 0);    // left wingtip cyan
    const rTip = new THREE.Mesh(tipGeo, mat(MAGENTA)); rTip.position.set(size * 0.31, 0, 0);   // right wingtip magenta
    g.add(fuse, nose, wing, tailFin, tailWing, lTip, rTip);
    return g;
  }

  function buildCar(): THREE.Group {
    const g = new THREE.Group();
    const body = new THREE.Mesh(track(new THREE.BoxGeometry(size * 0.3, size * 0.1, size * 0.5)), mat(0xe06a4a));
    body.position.y = size * 0.06;
    const cabin = new THREE.Mesh(track(new THREE.BoxGeometry(size * 0.24, size * 0.1, size * 0.24)), mat(0xf0e6d0));
    cabin.position.set(0, size * 0.15, size * 0.02);
    const wheelGeo = track(new THREE.CylinderGeometry(size * 0.05, size * 0.05, size * 0.04, 12));
    for (const [x, z] of [[-0.16, -0.16], [0.16, -0.16], [-0.16, 0.16], [0.16, 0.16]] as const) {
      const w = new THREE.Mesh(wheelGeo, mat(0x222228)); w.rotation.z = Math.PI / 2;
      w.position.set(x * size, size * 0.02, z * size); g.add(w);
    }
    const stripeGeo = track(new THREE.BoxGeometry(size * 0.02, size * 0.06, size * 0.4));
    const l = new THREE.Mesh(stripeGeo, mat(CYAN)); l.position.set(-size * 0.155, size * 0.06, 0);   // left flank cyan
    const r = new THREE.Mesh(stripeGeo, mat(MAGENTA)); r.position.set(size * 0.155, size * 0.06, 0);  // right flank magenta
    g.add(body, cabin, l, r);
    return g;
  }

  const avatars: Record<TravelMode, THREE.Group> = { walk: buildPerson(), fly: buildAirplane(), drive: buildCar() };
  for (const m of Object.keys(avatars) as TravelMode[]) {
    avatars[m].matrixAutoUpdate = false; avatars[m].visible = false; scene.add(avatars[m]);
  }

  // ── helpers ──────────────────────────────────────────────────────────────
  const Rview = new THREE.Matrix4();
  const camLinear = new THREE.Matrix4();
  const fwd = new THREE.Vector3(), right = new THREE.Vector3(), up = new THREE.Vector3();
  const fwdFlat = new THREE.Vector3(), rightFlat = new THREE.Vector3();
  const disp = new THREE.Vector3();
  const camWorld = new THREE.Matrix4();
  const avatarLinear = new THREE.Matrix4(), yawMat = new THREE.Matrix4();
  const camPos = new THREE.Vector3(), stampPos = new THREE.Vector3();
  const h = () => size / 2;
  const floorEye = () => -h() + size * 0.16; // eye height above the floor when grounded

  function recompFrame() {
    Rview.makeRotationY(yaw).multiply(new THREE.Matrix4().makeRotationX(pitch));
    camLinear.copy(bodyLinear).multiply(Rview);
    fwd.set(0, 0, -1).applyMatrix4(camLinear).normalize();
    right.set(1, 0, 0).applyMatrix4(camLinear).normalize();
    up.set(0, 1, 0).applyMatrix4(camLinear).normalize();
  }

  // ── init ─────────────────────────────────────────────────────────────────
  camera.matrixAutoUpdate = false;
  buildRoom();
  buildGenerators();
  buildCover();
  applyLook(opts.lookId);

  function frame(input: FrameInput3): void {
    const { dt } = input;
    yaw = input.yaw; pitch = input.pitch;
    recompFrame();

    // move: an airplane flies along the look frame (6DOF); a person/car is
    // gravity-bound — it moves on the horizontal floor plane and settles back to
    // floor height when you're not actively rising.
    const grounded = input.mode !== 'fly';
    if (!grounded) {
      disp.set(0, 0, 0)
        .addScaledVector(fwd, input.fwd)
        .addScaledVector(right, input.strafe)
        .addScaledVector(up, input.rise);
      if (disp.lengthSq() > 1) disp.normalize();
      pos.addScaledVector(disp, input.moveSpeed * dt);
    } else {
      // horizontal forward/right (project the look onto the floor plane, ⊥ +y)
      fwdFlat.copy(fwd); fwdFlat.y = 0;
      if (fwdFlat.lengthSq() < 1e-4) { fwdFlat.copy(right); fwdFlat.y = 0; }
      fwdFlat.normalize();
      rightFlat.copy(right); rightFlat.y = 0; rightFlat.normalize();
      disp.set(0, 0, 0).addScaledVector(fwdFlat, input.fwd).addScaledVector(rightFlat, input.strafe);
      if (disp.lengthSq() > 1) disp.normalize();
      pos.addScaledVector(disp, input.moveSpeed * dt);
      // vertical: rise input lets you jump/fly between floors; otherwise gravity
      // eases you down to the floor walk-height of the current cell.
      if (input.rise !== 0) pos.y += input.rise * input.moveSpeed * dt;
      else pos.y += (floorEye() - pos.y) * Math.min(1, dt * 6);
    }

    // wrap each axis back into the fundamental cube via the deck generators,
    // accumulating the holonomy into bodyLinear
    let wrapped = false;
    for (const axis of AXES) {
      const i = axisIndex(axis);
      const comp = () => (i === 0 ? pos.x : i === 1 ? pos.y : pos.z);
      let guard = 0;
      while (comp() > h() && guard++ < 4) {
        pos.applyMatrix4(gens[axis].gInv); bodyLinear.premultiply(gens[axis].gLinInv);
        cell[axis] += 1; wrapped = true;
      }
      while (comp() < -h() && guard++ < 8) {
        pos.applyMatrix4(gens[axis].g); bodyLinear.premultiply(gens[axis].gLin);
        cell[axis] -= 1; wrapped = true;
      }
    }
    if (wrapped) { recompFrame(); hasStamp = false; }  // re-index; don't smear across the seam

    // drop a footprint at a steady spacing (skip the wrap jump). The stamp lies
    // FLAT on the body's horizontal plane (normal = body up, not the pitched
    // camera up), so the trail reads as a clean ribbon however you are looking.
    if (!hasStamp) { lastStamp.copy(pos); hasStamp = true; }
    else {
      const d = pos.distanceTo(lastStamp);
      if (d > size * 0.3 && d < size * 0.95) {
        const upS = new THREE.Vector3(0, 1, 0).applyMatrix4(bodyLinear).normalize();
        const fwdS = fwd.clone().addScaledVector(upS, -fwd.dot(upS));
        if (fwdS.lengthSq() < 1e-4) fwdS.copy(right); // looking straight up/down
        fwdS.normalize();
        const leftS = new THREE.Vector3().crossVectors(upS, fwdS).normalize();
        // grounded: lay the print on the floor under your feet; flying: at the craft
        const sp = grounded ? stampPos.set(pos.x, -h() + size * 0.014, pos.z) : pos;
        writeStamp(sp, fwdS, leftS, upS);
        lastStamp.copy(pos);
      }
    }

    // place the camera (its world matrix carries the holonomy — left-handed
    // once you have crossed an odd number of glide-reflections)
    camWorld.copy(camLinear);
    if (input.thirdPerson) {
      camPos.copy(pos).addScaledVector(fwd, -camDist).addScaledVector(up, camDist * 0.28);
    } else {
      camPos.copy(pos);
    }
    camWorld.setPosition(camPos);
    camera.matrix.copy(camWorld);
    camera.matrixWorldNeedsUpdate = true;

    // show only the active travel mode's vehicle (third person), facing the way
    // you're heading (yaw, upright), carrying the holonomy so it mirrors with you
    for (const m of Object.keys(avatars) as TravelMode[]) avatars[m].visible = false;
    if (input.thirdPerson) {
      const av = avatars[input.mode];
      av.visible = true;
      avatarLinear.copy(bodyLinear).multiply(yawMat.makeRotationY(yaw));
      avatarLinear.setPosition(pos);
      av.matrix.copy(avatarLinear);
      av.matrixWorldNeedsUpdate = true;
    }

    renderer.render(scene, camera);
  }

  return {
    frame,
    clearTrail() { trailN = 0; trailGeo.setDrawRange(0, 0); hasStamp = false; },
    setCoverDepth(n) { depth = Math.max(0, Math.round(n)); applyLook(lookId); buildCover(); },
    setRoomSize(s) { size = s; buildRoom(); buildGenerators(); buildCover(); applyLook(lookId); },
    setCameraDistance(d) { camDist = d; },
    setLook(id) { lookId = id; applyLook(id); },
    recenter() {
      pos.set(0, 0, 0); bodyLinear.identity();
      cell.x = 0; cell.y = 0; cell.z = 0; hasStamp = false;
    },
    getChirality(): ChiralityState {
      const e = bodyLinear.elements; // column-major; diagonal at 0, 5, 10
      const trace = e[0] + e[5] + e[10];
      const rotationDeg = Math.acos(Math.max(-1, Math.min(1, (trace - 1) / 2))) * 180 / Math.PI;
      return {
        perStepDet: 1,
        loopSign: bodyLinear.determinant() < 0 ? -1 : 1,
        rotationDeg,
        crossings: { x: cell.x, y: cell.y, z: cell.z },
      };
    },
    getMapState(): SolidMapState {
      return {
        u: pos.x / h(), v: pos.y / h(), w: pos.z / h(),
        fwd: [fwd.x, fwd.y, fwd.z],
        cell: { x: cell.x, y: cell.y, z: cell.z },
        mirrored: bodyLinear.determinant() < 0,
      };
    },
    dispose() {
      scene.remove(coverRoot, avatars.fly, avatars.walk, avatars.drive, ambient, hemi, keyLight, fillLight);
      while (coverRoot.children.length) coverRoot.remove(coverRoot.children[0]);
      roomDisposables.forEach((d) => d.dispose());
      disposables.forEach((d) => d.dispose());
      trailMesh.geometry.dispose();
    },
  };
}
