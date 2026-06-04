import * as THREE from 'three';
import { makeFootprintTrail, FootprintTrail } from './footprints';
import { makeCharacter } from './character';
import { EngineDeps, EngineOptions, FrameInput, WorldEngine } from './engine';

const L = 30;             // fundamental-domain side
const K = 2;              // render (2K+1)^2 cells around the player
const EYE = 1.7;
const TRAIL_MAX = 1500;
const TRAIL_SPACING = 1.6;   // distance between footprints
const UP_Y = new THREE.Vector3(0, 1, 0);

interface Pillar { x: number; z: number; color: number; label: string }
const PILLARS: Pillar[] = [
  { x: -9, z: -7, color: 0xff5a5a, label: '1' },
  { x: 8, z: -9, color: 0x5ad1ff, label: '2' },
  { x: -6, z: 8, color: 0x8aff6a, label: '3' },
  { x: 10, z: 6, color: 0xffd24a, label: '4' },
  { x: 0, z: 0, color: 0xc08aff, label: '5' },
  { x: -12, z: 2, color: 0xff9a3d, label: '6' },
  { x: 4, z: 12, color: 0xff6ad5, label: '7' },
];

/** Number + arrow on a transparent tile; the arrow/number reverse under a
 *  mirror, which is exactly how you spot the Klein flip. */
function labelTexture(label: string, color: number): THREE.CanvasTexture {
  const s = 128;
  const cvs = document.createElement('canvas');
  cvs.width = cvs.height = s;
  const ctx = cvs.getContext('2d')!;
  ctx.clearRect(0, 0, s, s);
  ctx.fillStyle = '#' + new THREE.Color(color).getHexString();
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 6;
  ctx.font = `bold ${Math.round(s * 0.5)}px sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.strokeText(label, s * 0.36, s * 0.5);
  ctx.fillText(label, s * 0.36, s * 0.5);
  // arrow ▶ to the right of the number
  ctx.beginPath();
  ctx.moveTo(s * 0.6, s * 0.34); ctx.lineTo(s * 0.84, s * 0.5); ctx.lineTo(s * 0.6, s * 0.66);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  const t = new THREE.CanvasTexture(cvs);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

function floorTexture(): THREE.CanvasTexture {
  const s = 256;
  const cvs = document.createElement('canvas'); cvs.width = cvs.height = s;
  const ctx = cvs.getContext('2d')!;
  ctx.fillStyle = '#11131c'; ctx.fillRect(0, 0, s, s);
  ctx.strokeStyle = '#283042'; ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, s, s);
  const t = new THREE.CanvasTexture(cvs);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set((2 * K + 3) * L / 3, (2 * K + 3) * L / 3);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

interface Built { group: THREE.Group; dispose: () => void }

/** One copy of the fundamental domain: pillars + a colored boundary square +
 *  the (shared) footprint trail. */
function buildCell(foot: FootprintTrail): Built {
  const group = new THREE.Group();
  const disposers: (() => void)[] = [];

  for (const p of PILLARS) {
    const cellPillar = new THREE.Group();
    cellPillar.position.set(p.x, 0, p.z);
    const bodyGeo = new THREE.CylinderGeometry(0.8, 0.8, 3.2, 18);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: p.color, emissive: p.color, emissiveIntensity: 0.3, roughness: 0.5, side: THREE.DoubleSide,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.6;
    cellPillar.add(body);
    const tex = labelTexture(p.label, p.color);
    const decalGeo = new THREE.PlaneGeometry(1.5, 1.5);
    const decalMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false });
    const decal = new THREE.Mesh(decalGeo, decalMat);
    decal.position.set(0.82, 1.9, 0);
    decal.rotation.y = Math.PI / 2; // face +x
    cellPillar.add(decal);
    group.add(cellPillar);
    disposers.push(() => { bodyGeo.dispose(); bodyMat.dispose(); decalGeo.dispose(); decalMat.dispose(); tex.dispose(); });
  }

  // boundary square: left/right edges red (the "flip" gluing on a Klein
  // bottle), top/bottom edges blue.
  const h = L / 2, y = 0.04;
  const segs: [THREE.Vector3, THREE.Vector3, THREE.Color][] = [
    [new THREE.Vector3(-h, y, -h), new THREE.Vector3(-h, y, h), new THREE.Color(0xff4060)], // left
    [new THREE.Vector3(h, y, -h), new THREE.Vector3(h, y, h), new THREE.Color(0xff4060)],   // right
    [new THREE.Vector3(-h, y, -h), new THREE.Vector3(h, y, -h), new THREE.Color(0x4080ff)], // bottom
    [new THREE.Vector3(-h, y, h), new THREE.Vector3(h, y, h), new THREE.Color(0x4080ff)],   // top
  ];
  const lpos: number[] = [], lcol: number[] = [];
  for (const [a, c, col] of segs) {
    lpos.push(a.x, a.y, a.z, c.x, c.y, c.z);
    lcol.push(col.r, col.g, col.b, col.r, col.g, col.b);
  }
  const edgeGeo = new THREE.BufferGeometry();
  edgeGeo.setAttribute('position', new THREE.Float32BufferAttribute(lpos, 3));
  edgeGeo.setAttribute('color', new THREE.Float32BufferAttribute(lcol, 3));
  const edgeMat = new THREE.LineBasicMaterial({ vertexColors: true });
  group.add(new THREE.LineSegments(edgeGeo, edgeMat));
  disposers.push(() => { edgeGeo.dispose(); edgeMat.dispose(); });

  // shared footprint trail (base coords); appears in every cell, mirrored where
  // the cell is — so the arrow's left/right colors swap on the Klein bottle.
  const fp = new THREE.Mesh(foot.geometry, foot.material);
  fp.frustumCulled = false;
  group.add(fp);

  return { group, dispose: () => disposers.forEach((d) => d()) };
}

/**
 * The flat "open space" engine. Walks an intrinsically flat torus or Klein
 * bottle; the edge-gluing is shown by tiling the fundamental domain (the
 * universal cover) around the player, so movement is ordinary flat walking —
 * nothing flips locally, you only discover the topology by travelling.
 */
export function makeFlatEngine(deps: EngineDeps, opts: EngineOptions): WorldEngine {
  const { scene, camera, renderer } = deps;
  let klein = opts.surfaceId === 'klein';

  // player state
  let px = 2, pz = 2;
  let stridePhase = 0;
  let trailLast: THREE.Vector2 | null = null;

  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  camera.fov = 75; camera.near = 0.05; camera.far = 400; camera.updateProjectionMatrix();
  camera.up.set(0, 1, 0);

  scene.background = new THREE.Color(0x070912);
  scene.fog = new THREE.Fog(0x070912, L * 0.6, L * 2.6);

  const root = new THREE.Group();
  scene.add(root);

  root.add(new THREE.AmbientLight(0xffffff, 0.55));
  const dir = new THREE.DirectionalLight(0xffffff, 0.7);
  dir.position.set(0.4, 1, 0.3);
  root.add(dir);

  const floorMat = new THREE.MeshStandardMaterial({ map: floorTexture(), roughness: 0.9, metalness: 0.0 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry((2 * K + 3) * L, (2 * K + 3) * L), floorMat);
  floor.rotation.x = -Math.PI / 2;
  root.add(floor);

  const foot = makeFootprintTrail(TRAIL_MAX);
  const character = makeCharacter();
  root.add(character.group);

  const cells: { group: THREE.Group }[] = [];
  const cellDisposers: (() => void)[] = [];
  for (let i = 0; i < (2 * K + 1) * (2 * K + 1); i++) {
    const built = buildCell(foot);
    built.group.matrixAutoUpdate = false;
    root.add(built.group);
    cells.push({ group: built.group });
    cellDisposers.push(built.dispose);
  }

  const M = new THREE.Matrix4();
  const S = new THREE.Matrix4();

  function clearTrail() { foot.clear(); trailLast = null; }

  function frame(input: FrameInput) {
    const { dt, fwd, strafe, yaw, pitch } = input;
    const moving = !!(fwd || strafe);
    if (moving) {
      const v = input.moveSpeed * dt;
      const sy = Math.sin(yaw), cy = Math.cos(yaw);
      // forward = (sin yaw, -cos yaw); right = (cos yaw, sin yaw)
      px += (fwd * sy + strafe * cy) * v;
      pz += (fwd * -cy + strafe * sy) * v;
      stridePhase += dt * input.moveSpeed * 1.4;
    }

    const cp = Math.cos(pitch);
    const forward = new THREE.Vector3(Math.sin(yaw), 0, -Math.cos(yaw)); // heading on the floor

    const charRight = new THREE.Vector3().crossVectors(UP_Y, forward).normalize();
    character.group.position.set(px, 0, pz);
    character.group.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(charRight, UP_Y, forward));
    character.group.visible = input.thirdPerson;
    character.stride(stridePhase);

    if (input.thirdPerson) {
      const aspect = camera.aspect || 1;
      const distScale = Math.min(1.6, Math.max(1, 1 / Math.min(aspect, 1)));
      const D = 3.2 * distScale;
      const camPos = new THREE.Vector3(px, 0, pz)
        .addScaledVector(forward, -D)
        .addScaledVector(UP_Y, 2.2 + pitch * 1.6);
      camera.up.set(0, 1, 0);
      camera.position.copy(camPos);
      camera.lookAt(px + forward.x * 0.5, 1.3, pz + forward.z * 0.5);
    } else {
      const look = new THREE.Vector3(Math.sin(yaw) * cp, Math.sin(pitch), -Math.cos(yaw) * cp);
      camera.up.set(0, 1, 0);
      camera.position.set(px, EYE, pz);
      camera.lookAt(px + look.x, EYE + look.y, pz + look.z);
    }
    floor.position.set(px, 0, pz);
    (floor.material as THREE.MeshStandardMaterial).map!.offset.set(px / 3, -pz / 3);

    // Tile the fundamental domain around the player.
    const I0 = Math.round(px / L), J0 = Math.round(pz / L);
    let idx = 0;
    for (let di = -K; di <= K; di++) {
      for (let dj = -K; dj <= K; dj++) {
        const I = I0 + di, J = J0 + dj;
        const sz = klein && (I & 1) ? -1 : 1;
        S.makeScale(1, 1, sz);
        M.makeTranslation(I * L, 0, J * L).multiply(S);
        cells[idx++].group.matrix.copy(M);
      }
    }

    // Footprints in base (quotient) coords, so they recur in every cell —
    // mirrored where the cell is mirrored (Klein), swapping the arrow's
    // left/right colors.
    const cur = new THREE.Vector2(px, pz);
    if (!trailLast || trailLast.distanceTo(cur) > TRAIL_SPACING) {
      const sz = klein && (I0 & 1) ? -1 : 1;
      const bx = px - I0 * L;
      const bz = sz * (pz - J0 * L);
      let dwx: number, dwz: number;
      if (trailLast) { dwx = px - trailLast.x; dwz = pz - trailLast.y; }
      else { dwx = Math.sin(yaw); dwz = -Math.cos(yaw); }
      const len = Math.hypot(dwx, dwz) || 1;
      foot.append(new THREE.Vector3(bx, 0, bz), new THREE.Vector3(dwx / len, 0, sz * dwz / len), UP_Y);
      trailLast = cur;
    }

    renderer.render(scene, camera);
  }

  return {
    family: 'flat',
    frame,
    clearTrail,
    setSurface: (id) => { klein = id === 'klein'; clearTrail(); },
    dispose: () => {
      scene.remove(root);
      cellDisposers.forEach((d) => d());
      foot.dispose();
      character.dispose();
      floor.geometry.dispose();
      (floor.material as THREE.MeshStandardMaterial).map?.dispose();
      (floor.material as THREE.Material).dispose();
    },
  };
}
