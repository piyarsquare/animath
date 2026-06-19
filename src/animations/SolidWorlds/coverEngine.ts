import * as THREE from 'three';
import {
  EngineDeps3, FrameInput3, SolidEngine, ChiralityState, SolidMapState, TravelMode,
} from './engineTypes';
import { AXES, Axis, axisIndex, M3, SolidWorldSpec } from './solidSchema';
import { findLook } from './looks';
import { footprintTexture, signTexture } from './textures';

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

const TRAIL_CAP = 480;
const VPER = 6; // two triangles per flat footprint decal

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
  // The classic flat orientation decal: an arrow with an F, cyan on its LEFT and
  // magenta on its RIGHT. The frame's handedness IS the print's chirality, so a
  // stamp written through a det < 0 transform — or viewed by a mirror-reversed
  // walker — reads backwards. Off by default; toggle it on to leave a trail.
  const trailPos = new Float32Array(TRAIL_CAP * VPER * 3);
  const trailUv = new Float32Array(TRAIL_CAP * VPER * 2);
  const trailGeo = track(new THREE.BufferGeometry());
  trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
  trailGeo.setAttribute('uv', new THREE.BufferAttribute(trailUv, 2));
  trailGeo.setDrawRange(0, 0);
  const footTex = track(footprintTexture());
  const trailMat = track(new THREE.MeshBasicMaterial({
    map: footTex, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, depthWrite: true,
  }));
  // Drawn instanced (one InstancedMesh over all cover cells, in buildCover) so the
  // trail tiles + mirrors through every deck-translate in a single draw call.
  let trailN = 0;
  let trailOn = false;
  const lastStamp = new THREE.Vector3();
  let hasStamp = false;

  function writeStamp(p: THREE.Vector3, fwd: THREE.Vector3, left: THREE.Vector3, nrm: THREE.Vector3) {
    if (trailN >= TRAIL_CAP) {
      trailPos.copyWithin(0, VPER * 3, trailN * VPER * 3);
      trailUv.copyWithin(0, VPER * 2, trailN * VPER * 2);
      trailN--;
    }
    const i = trailN;
    const aBack = -size * 0.07, aTip = size * 0.12, hw = size * 0.075, lift = size * 0.02;
    // [along, left, u, v]; left=+hw ↔ u=0 (cyan) so a right-handed frame reads cyan-left
    const C: [number, number, number, number][] = [
      [aBack, -hw, 1, 0], [aTip, -hw, 1, 1], [aTip, hw, 0, 1],
      [aBack, -hw, 1, 0], [aTip, hw, 0, 1], [aBack, hw, 0, 0],
    ];
    let op = i * VPER * 3, ou = i * VPER * 2;
    for (const [along, lt, u, v] of C) {
      trailPos[op] = p.x + along * fwd.x + lt * left.x + lift * nrm.x;
      trailPos[op + 1] = p.y + along * fwd.y + lt * left.y + lift * nrm.y;
      trailPos[op + 2] = p.z + along * fwd.z + lt * left.z + lift * nrm.z;
      trailUv[ou] = u; trailUv[ou + 1] = v;
      op += 3; ou += 2;
    }
    trailN++;
    (trailGeo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    (trailGeo.getAttribute('uv') as THREE.BufferAttribute).needsUpdate = true;
    trailGeo.setDrawRange(0, trailN * VPER);
  }

  // ── the fundamental room (decor) as reusable PARTS, rebuilt on size change ──
  // Solid parts become one InstancedMesh each over the whole cover; line parts
  // are merged into one LineSegments — so draw calls stay ~constant no matter how
  // many cover cells (depth) we draw. Each part carries its local transform.
  interface Part { geo: THREE.BufferGeometry; mat: THREE.Material; matrix: THREE.Matrix4; }
  let meshParts: Part[] = [];
  let lineParts: Part[] = [];
  const roomDisposables: { dispose: () => void }[] = [];
  const localM = (x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) =>
    new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx, ry, rz)).setPosition(x, y, z);

  function buildRoom() {
    roomDisposables.forEach((d) => d.dispose());
    roomDisposables.length = 0;
    meshParts = []; lineParts = [];
    const h = size / 2;
    const std = (color: number) => {
      const m = new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.1, side: THREE.DoubleSide });
      roomDisposables.push(m); return m;
    };
    const mesh = (geo: THREE.BufferGeometry, mat: THREE.Material, matrix: THREE.Matrix4) => {
      roomDisposables.push(geo); meshParts.push({ geo, mat, matrix });
    };

    // cube edge frame (lines)
    const boxGeo = new THREE.BoxGeometry(size, size, size);
    const edges = new THREE.EdgesGeometry(boxGeo); boxGeo.dispose();
    roomDisposables.push(edges);
    const frameMat = new THREE.LineBasicMaterial({ color: 0x9fc0e0 }); roomDisposables.push(frameMat);
    lineParts.push({ geo: edges, mat: frameMat, matrix: new THREE.Matrix4() });

    // floor: a see-through reference plane (a landmark for moving in 3D)
    const floorMat = new THREE.MeshBasicMaterial({ color: 0x2a3c54, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false });
    roomDisposables.push(floorMat);
    mesh(new THREE.PlaneGeometry(size, size), floorMat, localM(0, -h, 0, -Math.PI / 2));

    // floor grid (lines), built by hand so it merges cleanly
    const gp: number[] = []; const n = 8, step = size / n;
    for (let i = 0; i <= n; i++) { const t = -h + i * step; gp.push(-h, 0, t, h, 0, t, t, 0, -h, t, 0, h); }
    const gridGeo = new THREE.BufferGeometry();
    gridGeo.setAttribute('position', new THREE.Float32BufferAttribute(gp, 3));
    roomDisposables.push(gridGeo);
    const gridMat = new THREE.LineBasicMaterial({ color: 0x6f93b8 }); roomDisposables.push(gridMat);
    lineParts.push({ geo: gridGeo, mat: gridMat, matrix: localM(0, -h + 0.02, 0) });

    // asymmetric landmark props, so a copy is recognizable — and its mirror obvious
    mesh(new THREE.CylinderGeometry(size * 0.04, size * 0.05, size * 0.42, 14), std(0xffcf5a), localM(h * 0.55, -h + size * 0.21, h * 0.42));
    const lMat = std(0x46c8b0);
    mesh(new THREE.BoxGeometry(size * 0.06, size * 0.28, size * 0.06), lMat, localM(-h * 0.5, -h + size * 0.14, -h * 0.4));
    mesh(new THREE.BoxGeometry(size * 0.34, size * 0.06, size * 0.06), lMat, localM(-h * 0.5 + size * 0.14, -h + size * 0.03, -h * 0.4));
    mesh(new THREE.SphereGeometry(size * 0.09, 18, 14), std(0xff6aa0), localM(h * 0.22, -h + size * 0.1, -h * 0.62));

    // the opaque "HELLO" sign — reads forwards here, mirror-reversed once you
    // walk an orientation-reversing loop (the conversation's headline case)
    mesh(new THREE.CylinderGeometry(size * 0.012, size * 0.012, size * 0.34, 10), std(0x9a9aa4), localM(0, -h + size * 0.17, -h * 0.5));
    const signTex = signTexture('HELLO'); roomDisposables.push(signTex);
    const plaqueMat = new THREE.MeshBasicMaterial({ map: signTex, side: THREE.DoubleSide }); roomDisposables.push(plaqueMat);
    mesh(new THREE.PlaneGeometry(size * 0.34, size * 0.17), plaqueMat, localM(0, -h + size * 0.38, -h * 0.5));
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
  const coverDisposables: THREE.BufferGeometry[] = []; // merged line geos, per rebuild
  function buildCover() {
    while (coverRoot.children.length) coverRoot.remove(coverRoot.children[0]);
    coverDisposables.forEach((g) => g.dispose()); coverDisposables.length = 0;

    // BFS the deck group out to a radius; dedupe by matrix key (works for the
    // non-abelian turn-space / amphicosm groups).
    const genList: THREE.Matrix4[] = [];
    for (const axis of AXES) genList.push(gens[axis].g, gens[axis].gInv);
    const R = (depth + 0.55) * size, cap = 1700;
    const seen = new Set<string>();
    const key = (m: THREE.Matrix4) => m.elements.map((e) => Math.round(e * 1000)).join(',');
    const cells: THREE.Matrix4[] = [];
    const queue: THREE.Matrix4[] = [new THREE.Matrix4()];
    seen.add(key(queue[0]));
    const c = new THREE.Vector3();
    while (queue.length && cells.length < cap) {
      const cur = queue.shift()!;
      c.setFromMatrixPosition(cur);
      if (c.length() > R) continue;
      cells.push(cur);
      for (const gen of genList) {
        const cand = cur.clone().multiply(gen);
        const k = key(cand);
        if (!seen.has(k)) { seen.add(k); queue.push(cand); }
      }
    }
    const N = cells.length;
    const tmp = new THREE.Matrix4();

    // each solid decor part → one InstancedMesh over all cells (one draw call)
    for (const part of meshParts) {
      const inst = new THREE.InstancedMesh(part.geo, part.mat, N);
      inst.frustumCulled = false;
      for (let i = 0; i < N; i++) inst.setMatrixAt(i, tmp.multiplyMatrices(cells[i], part.matrix));
      inst.instanceMatrix.needsUpdate = true;
      coverRoot.add(inst);
    }
    // each line part → one merged LineSegments across all cells
    const v = new THREE.Vector3();
    for (const part of lineParts) {
      const src = part.geo.getAttribute('position');
      const arr = new Float32Array(src.count * 3 * N);
      let o = 0;
      for (let i = 0; i < N; i++) {
        tmp.multiplyMatrices(cells[i], part.matrix);
        for (let j = 0; j < src.count; j++) {
          v.fromBufferAttribute(src as THREE.BufferAttribute, j).applyMatrix4(tmp);
          arr[o++] = v.x; arr[o++] = v.y; arr[o++] = v.z;
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
      coverDisposables.push(g);
      const ls = new THREE.LineSegments(g, part.mat); ls.frustumCulled = false;
      coverRoot.add(ls);
    }
    // the footprint trail → one InstancedMesh; the shared geometry's drawRange
    // (updated as you walk) draws the same stamps tiled + mirrored through every
    // cell. frustumCulled off — the preallocated geometry has a stale zero bound.
    const trailInst = new THREE.InstancedMesh(trailGeo, trailMat, N);
    trailInst.frustumCulled = false;
    for (let i = 0; i < N; i++) trailInst.setMatrixAt(i, cells[i]);
    trailInst.instanceMatrix.needsUpdate = true;
    coverRoot.add(trailInst);
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
  const fwdFlat = new THREE.Vector3(), rightFlat = new THREE.Vector3(), upDir = new THREE.Vector3();
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
      // Gravity lives in the CARRIED frame: "up" is the body up (bodyLinear·+y),
      // which the holonomy rotates as you cross faces — so down stays consistent
      // as you move from cube to cube, but WHICH face is the floor depends on how
      // you entered the room. Move on the plane ⊥ up; settle onto the −up face.
      upDir.set(0, 1, 0).applyMatrix4(bodyLinear).normalize();
      fwdFlat.copy(fwd).addScaledVector(upDir, -fwd.dot(upDir));
      if (fwdFlat.lengthSq() < 1e-4) fwdFlat.copy(right).addScaledVector(upDir, -right.dot(upDir));
      fwdFlat.normalize();
      rightFlat.copy(right).addScaledVector(upDir, -right.dot(upDir)).normalize();
      disp.set(0, 0, 0).addScaledVector(fwdFlat, input.fwd).addScaledVector(rightFlat, input.strafe);
      if (disp.lengthSq() > 1) disp.normalize();
      pos.addScaledVector(disp, input.moveSpeed * dt);
      if (input.rise !== 0) pos.addScaledVector(upDir, input.rise * input.moveSpeed * dt);
      else {
        const along = pos.dot(upDir);          // height along up; floor is the −up face
        pos.addScaledVector(upDir, (floorEye() - along) * Math.min(1, dt * 6));
      }
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
    if (!trailOn) { hasStamp = false; }
    else if (!hasStamp) { lastStamp.copy(pos); hasStamp = true; }
    else {
      const d = pos.distanceTo(lastStamp);
      if (d > size * 0.13 && d < size * 0.6) { // dense enough to read as a trail; upper bound skips the wrap jump
        const upS = new THREE.Vector3(0, 1, 0).applyMatrix4(bodyLinear).normalize();
        const fwdS = fwd.clone().addScaledVector(upS, -fwd.dot(upS));
        if (fwdS.lengthSq() < 1e-4) fwdS.copy(right); // looking straight up/down
        fwdS.normalize();
        const leftS = new THREE.Vector3().crossVectors(upS, fwdS).normalize();
        // grounded: lay the print on the carried-frame floor (the −up face) under
        // your feet; flying: at the craft itself.
        let sp = pos;
        if (grounded) sp = stampPos.copy(pos).addScaledVector(upS, (-h() + size * 0.014) - pos.dot(upS));
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
      // the airplane noses along the full flight direction (yaw + pitch); the
      // grounded person/car stay upright and only turn (yaw).
      if (input.mode === 'fly') avatarLinear.copy(camLinear);
      else avatarLinear.copy(bodyLinear).multiply(yawMat.makeRotationY(yaw));
      avatarLinear.setPosition(pos);
      av.matrix.copy(avatarLinear);
      av.matrixWorldNeedsUpdate = true;
    }

    renderer.render(scene, camera);
  }

  return {
    frame,
    clearTrail() { trailN = 0; trailGeo.setDrawRange(0, 0); hasStamp = false; },
    setTrailEnabled(on) { trailOn = on; if (!on) { trailN = 0; trailGeo.setDrawRange(0, 0); hasStamp = false; } },
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
      coverDisposables.forEach((g) => g.dispose());
      roomDisposables.forEach((d) => d.dispose());
      disposables.forEach((d) => d.dispose());
    },
  };
}
