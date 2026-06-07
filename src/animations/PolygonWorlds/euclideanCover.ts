import * as THREE from 'three';
import { CoverModel, CoverFrameInput, CoverDeps, PlayerPose } from './coverModel';
import { SquareMapState } from './engineTypes';
import { glassState, GlassSpec } from './glassSurface';
import { makeFootprintTrail } from './footprints';

const K = 2;            // render (2K+1)² copies around the player
const EYE = 1.7;
const UP = new THREE.Vector3(0, 1, 0);
const SKY = 0x070912;
const TRAIL_MAX = 1500;
const TRAIL_SPACING = 1.6;
const GLASS: GlassSpec = { showUnderBelow: 0.95 };

function floorTexture(side: number): THREE.CanvasTexture {
  const s = 256;
  const cvs = document.createElement('canvas'); cvs.width = cvs.height = s;
  const ctx = cvs.getContext('2d')!;
  ctx.fillStyle = '#1c2a44'; ctx.fillRect(0, 0, s, s);
  ctx.strokeStyle = '#4a6796'; ctx.lineWidth = 3; ctx.strokeRect(0, 0, s, s);
  const t = new THREE.CanvasTexture(cvs);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set((2 * K + 3) * side / 3, (2 * K + 3) * side / 3);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

interface Cell {
  group: THREE.Group;
  trees: THREE.Group;
  columns: THREE.Group;
  under: THREE.Group;
  underTrees: THREE.Group;
  underColumns: THREE.Group;
}

/**
 * The flat (Euclidean-plane) cover for the χ=0 worlds. The player walks an
 * intrinsically flat plane; the gluing is shown by tiling the fundamental square
 * (the universal cover) around a fixed player over a glass floor, so nothing
 * flips underfoot. On the Klein bottle the left/right ("a") pair glues with a
 * flip, so every odd column of copies is mirror-reflected and wears the opposite
 * face; the torus glues by pure translation, so every copy is the same.
 */
export function makeEuclideanCover(c: CoverDeps): CoverModel {
  const { deps, root, decor } = c;
  const { scene, camera } = deps;
  const flipI = !c.spec.orientable;

  let side = c.squareSize;
  let thickness = c.floorThickness;
  let floorOpacity = 0.35;

  camera.fov = 75; camera.near = 0.05; camera.far = 400; camera.updateProjectionMatrix();
  camera.up.set(0, 1, 0);
  scene.background = new THREE.Color(SKY);
  scene.fog = new THREE.Fog(SKY, side * 0.7, side * 3);

  // ── glass floor slab ────────────────────────────────────────────────────────
  const floorTex = floorTexture(side);
  const floorMat = new THREE.MeshStandardMaterial({
    map: floorTex, color: 0x46658f, emissive: 0x0c1730, emissiveIntensity: 0.6,
    roughness: 0.5, metalness: 0.08, transparent: true, opacity: floorOpacity, side: THREE.DoubleSide,
  });
  const floorW = () => (2 * K + 3) * side;
  const floor = new THREE.Mesh(new THREE.BoxGeometry(floorW(), thickness, floorW()), floorMat);
  root.add(floor);
  function rebuildFloorGeo() {
    floor.geometry.dispose();
    floor.geometry = new THREE.BoxGeometry(floorW(), thickness, floorW());
  }
  function applyFloorOpacity(o: number) {
    floorOpacity = o;
    const g = glassState(o, GLASS);
    floorMat.opacity = g.opacity; floorMat.visible = g.visible; floorMat.depthWrite = g.depthWrite;
  }
  applyFloorOpacity(floorOpacity);

  // ── tiled copies of the decorated square ────────────────────────────────────
  const cells: Cell[] = [];
  for (let i = 0; i < (2 * K + 1) * (2 * K + 1); i++) {
    const group = new THREE.Group(); group.matrixAutoUpdate = false;
    const trees = new THREE.Group(), columns = new THREE.Group();
    const under = new THREE.Group(); under.scale.set(1, -1, -1); under.visible = false;
    const underTrees = new THREE.Group(), underColumns = new THREE.Group();
    decor.props.forEach((_, j) => {
      columns.add(decor.makeColumn(j)); trees.add(decor.makeTree(j));
      underColumns.add(decor.makeColumn(j)); underTrees.add(decor.makeTree(j));
    });
    under.add(underTrees, underColumns);
    group.add(trees, columns, under);
    root.add(group);
    cells.push({ group, trees, columns, under, underTrees, underColumns });
  }
  function placeDecor() {
    for (const cell of cells) {
      decor.props.forEach((p, j) => {
        const x = (p.u - 0.5) * side, z = (p.v - 0.5) * side;
        cell.columns.children[j].position.set(x, 0, z);
        cell.trees.children[j].position.set(x, 0, z);
        cell.underColumns.children[j].position.set(x, 0, z);
        cell.underTrees.children[j].position.set(x, 0, z);
      });
    }
  }
  placeDecor();

  // footprint trail (one per step, on top)
  const foot = makeFootprintTrail(TRAIL_MAX);
  const footMesh = new THREE.Mesh(foot.geometry, foot.material);
  footMesh.frustumCulled = false;
  root.add(footMesh);
  let trailLast: THREE.Vector3 | null = null;

  // player state
  let px = 2, pz = 2;
  const forward = new THREE.Vector3(0, 0, -1);
  const pos = new THREE.Vector3(px, 0, pz);
  const M = new THREE.Matrix4(), S = new THREE.Matrix4();

  function update(input: CoverFrameInput, cam: THREE.PerspectiveCamera) {
    const { fwd, strafe, yaw, pitch, dt, moveSpeed, thirdPerson } = input;
    if (fwd || strafe) {
      const v = moveSpeed * dt, sy = Math.sin(yaw), cy = Math.cos(yaw);
      px += (fwd * sy + strafe * cy) * v;
      pz += (fwd * -cy + strafe * sy) * v;
    }
    pos.set(px, 0, pz);
    forward.set(Math.sin(yaw), 0, -Math.cos(yaw));

    cam.up.copy(UP);
    if (thirdPerson) {
      const aspect = cam.aspect || 1;
      const D = 3.2 * Math.min(1.6, Math.max(1, 1 / Math.min(aspect, 1)));
      cam.position.set(px, 0, pz).addScaledVector(forward, -D).addScaledVector(UP, 2.2 + pitch * 1.6);
      cam.lookAt(px + forward.x * 0.5, 1.3, pz + forward.z * 0.5);
    } else {
      const cp = Math.cos(pitch);
      cam.position.set(px, EYE, pz);
      cam.lookAt(px + Math.sin(yaw) * cp, EYE + Math.sin(pitch), pz - Math.cos(yaw) * cp);
    }

    // floor follows the player; the slab top sits at y=0
    floor.position.set(px, -thickness / 2, pz);
    floorTex.offset.set(px / 3, -pz / 3);

    // tile the decorated square around the player
    const showUnder = glassState(floorOpacity, GLASS).showUnder;
    const I0 = Math.round(px / side), J0 = Math.round(pz / side);
    let idx = 0;
    for (let di = -K; di <= K; di++) {
      for (let dj = -K; dj <= K; dj++) {
        const I = I0 + di, J = J0 + dj;
        const flipped = flipI && (I & 1) !== 0;
        const sz = flipped ? -1 : 1;
        S.makeScale(1, 1, sz);
        const cell = cells[idx++];
        cell.group.matrix.copy(M.makeTranslation(I * side, 0, J * side)).multiply(S);
        cell.trees.visible = flipped;       // flipped class wears trees
        cell.columns.visible = !flipped;
        cell.under.visible = showUnder;
        if (showUnder) { cell.underTrees.visible = !flipped; cell.underColumns.visible = flipped; }
      }
    }

    // one footprint per step
    if (!trailLast || trailLast.distanceTo(pos) > TRAIL_SPACING) {
      const d = trailLast ? pos.clone().sub(trailLast) : forward.clone();
      if (d.lengthSq() < 1e-9) d.copy(forward);
      foot.append(pos, d.normalize(), UP);
      trailLast = pos.clone();
    }
  }

  function pose(): PlayerPose {
    return { position: pos.clone(), up: UP.clone(), forward: forward.clone() };
  }

  function chart(): SquareMapState {
    const I0 = Math.round(px / side), J0 = Math.round(pz / side);
    const sz0 = flipI && (I0 & 1) ? -1 : 1;
    const bx = px - I0 * side, bz = sz0 * (pz - J0 * side);
    const mhx = forward.x, mhz = sz0 * forward.z, mhl = Math.hypot(mhx, mhz) || 1;
    return { u: bx / side + 0.5, v: bz / side + 0.5, hx: mhx / mhl, hz: mhz / mhl, flipped: flipI && (I0 & 1) !== 0 };
  }

  return {
    kind: 'euclidean',
    update, pose, chart,
    clearTrail: () => { foot.clear(); trailLast = null; },
    setFloorOpacity: applyFloorOpacity,
    setSquareSize: (v: number) => {
      side = v; placeDecor(); rebuildFloorGeo();
      floorTex.repeat.set((2 * K + 3) * side / 3, (2 * K + 3) * side / 3);
      scene.fog = new THREE.Fog(SKY, side * 0.7, side * 3);
    },
    setFloorThickness: (t: number) => { thickness = t; rebuildFloorGeo(); },
    dispose: () => {
      foot.dispose(); floor.geometry.dispose(); floorTex.dispose(); floorMat.dispose();
    },
  };
}
