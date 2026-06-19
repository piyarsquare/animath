import * as THREE from 'three';
import {
  EngineDeps3, FrameInput3, SolidEngine, ChiralityState, SolidMapState,
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
const VPER = 6;

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
    scene.background = new THREE.Color(L.sky);
    scene.fog = new THREE.Fog(L.sky, size * 1.2, size * (depth + 2.6));
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
  const trailMesh = new THREE.Mesh(trailGeo, trailMat);
  let trailN = 0;
  const lastStamp = new THREE.Vector3();
  let hasStamp = false;

  function writeStamp(p: THREE.Vector3, fwd: THREE.Vector3, left: THREE.Vector3, nrm: THREE.Vector3) {
    if (trailN >= TRAIL_CAP) {
      trailPos.copyWithin(0, VPER * 3, trailN * VPER * 3);
      trailUv.copyWithin(0, VPER * 2, trailN * VPER * 2);
      trailN--;
    }
    const i = trailN;
    const aBack = -size * 0.045, aTip = size * 0.075, hw = size * 0.05, lift = size * 0.012;
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

    // floor grid (a landmark, not a constraint — there is no global "down")
    const grid = new THREE.GridHelper(size, 6, 0x4a6a8a, 0x2c3e52);
    grid.position.y = -h + 0.01;
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
    const R = (depth + 0.55) * size, cap = 220;
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

  // ── third-person avatar (fundamental cell only) ──────────────────────────
  const avatar = new THREE.Group();
  avatar.matrixAutoUpdate = false;
  {
    const coneGeo = track(new THREE.ConeGeometry(size * 0.04, size * 0.16, 12));
    const head = new THREE.Mesh(coneGeo, track(new THREE.MeshStandardMaterial({ color: 0xffe08a, side: THREE.DoubleSide })));
    head.rotation.x = -Math.PI / 2; head.position.z = -size * 0.04; // points toward −z (forward)
    const lGeo = track(new THREE.SphereGeometry(size * 0.025, 10, 8));
    const lBall = new THREE.Mesh(lGeo, track(new THREE.MeshStandardMaterial({ color: 0x33d6ff })));
    lBall.position.set(size * 0.07, 0, 0);  // right side cyan vs left magenta → chiral
    const rBall = new THREE.Mesh(lGeo, track(new THREE.MeshStandardMaterial({ color: 0xff4fa3 })));
    rBall.position.set(-size * 0.07, 0, 0);
    avatar.add(head, lBall, rBall);
  }
  scene.add(avatar);

  // ── helpers ──────────────────────────────────────────────────────────────
  const Rview = new THREE.Matrix4();
  const camLinear = new THREE.Matrix4();
  const fwd = new THREE.Vector3(), right = new THREE.Vector3(), up = new THREE.Vector3();
  const disp = new THREE.Vector3();
  const camWorld = new THREE.Matrix4();
  const camPos = new THREE.Vector3();
  const h = () => size / 2;

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

    // move (free flight along the look frame)
    disp.set(0, 0, 0)
      .addScaledVector(fwd, input.fwd)
      .addScaledVector(right, input.strafe)
      .addScaledVector(up, input.rise);
    if (disp.lengthSq() > 1) disp.normalize();
    pos.addScaledVector(disp, input.moveSpeed * dt);

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

    // drop a footprint at a steady spacing (skip the wrap jump)
    if (!hasStamp) { lastStamp.copy(pos); hasStamp = true; }
    else {
      const d = pos.distanceTo(lastStamp);
      if (d > size * 0.16 && d < size * 0.9) {
        const left = right.clone().negate();
        writeStamp(pos, fwd, left, up);
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

    avatar.visible = input.thirdPerson;
    if (input.thirdPerson) {
      camWorld.copy(bodyLinear).setPosition(pos);
      avatar.matrix.copy(camWorld);
      avatar.matrixWorldNeedsUpdate = true;
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
      return {
        perStepDet: 1,
        loopSign: bodyLinear.determinant() < 0 ? -1 : 1,
        crossings: { x: cell.x, y: cell.y, z: cell.z },
      };
    },
    getMapState(): SolidMapState {
      return {
        u: pos.x / h(), v: pos.y / h(), w: pos.z / h(),
        cell: { x: cell.x, y: cell.y, z: cell.z },
        mirrored: bodyLinear.determinant() < 0,
      };
    },
    dispose() {
      scene.remove(coverRoot, avatar, ambient, hemi, keyLight, fillLight);
      while (coverRoot.children.length) coverRoot.remove(coverRoot.children[0]);
      roomDisposables.forEach((d) => d.dispose());
      disposables.forEach((d) => d.dispose());
      trailMesh.geometry.dispose();
    },
  };
}
