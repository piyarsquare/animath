import * as THREE from 'three';
import { CoverModel, CoverFrameInput, CoverDeps, PlayerPose } from '../coverModel';
import { SquareMapState } from '../engineTypes';
import { glassState, GlassSpec } from '../glassSurface';
import { makeFootprintTrail } from '../footprints';
import { parseWord } from '../surfaceSchema';
import { realize, Realization } from '../lib/realize';
import { applyMat, det3, ORIGIN, Isometry } from '../lib/cayleyKlein';

/**
 * The flat (Euclidean-plane) presenter for the χ=0 worlds, now driven by the
 * geometry kernel instead of an ad-hoc square grid. From the edge word, {@link
 * realize} gives the fundamental polygon's **side-pairing isometries** (the deck
 * group). Tiling the universal cover is then "apply the deck lattice": cell (I, J)
 * is the transform γ₀ᴵ · γ₁ᴶ, whose translation places the copy and whose **sign of
 * the determinant** decides whether that copy is mirror-reflected (trees ↔ columns).
 * For the torus both generators are translations (no flip); for the Klein bottle
 * one is a glide reflection (det < 0), so every other row/column flips — and that
 * falls out of the kernel, not a hard-coded `I & 1`.
 *
 * Everything else (glass floor, decor, footprints, camera, the square chart) is the
 * shared chrome, unchanged from the original cover so the render matches.
 */

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

export function makeEuclideanPresenter(c: CoverDeps): CoverModel {
  const { deps, root, decor } = c;
  const { scene, camera } = deps;

  // ── kernel: realize the word → deck lattice ─────────────────────────────────
  const real: Realization = realize(parseWord(c.spec.word));
  const gens: Isometry[] = real.deckGenerators.filter(Boolean);
  // Model-space lattice basis (xy) from the first two generators. For the square
  // these are axis-aligned translations; the 2×2 [a b] basis also handles any flat
  // word (e.g. the hexagonal torus) without change.
  const o = ORIGIN;
  const g0 = applyMat(gens[0].m, o), g1 = applyMat(gens[1].m, o);
  const ax = g0[0] - o[0], ay = g0[1] - o[1];     // va (model)
  const bx = g1[0] - o[0], by = g1[1] - o[1];     // vb (model)
  const detA = det3(gens[0].m), detB = det3(gens[1].m);
  const flipParity = (I: number, J: number) =>
    ((detA < 0 && (I & 1)) ? 1 : 0) ^ ((detB < 0 && (J & 1)) ? 1 : 0);

  let side = c.squareSize;
  let thickness = c.floorThickness;
  let floorOpacity = 0.35;
  // World units per model unit, so the cell spacing equals `side`.
  const baseLen = Math.hypot(ax, ay) || 1;
  let scale = side / baseLen;
  // World lattice basis (x, z) and its inverse, for locating the player's cell.
  const lattice = () => ({ ax: ax * scale, az: ay * scale, bx: bx * scale, bz: by * scale });
  function cellOf(px: number, pz: number): [number, number] {
    const L = lattice();
    const det = L.ax * L.bz - L.az * L.bx;
    const I = (px * L.bz - pz * L.bx) / det;
    const J = (-px * L.az + pz * L.ax) / det;
    return [Math.round(I), Math.round(J)];
  }
  function cellOrigin(I: number, J: number): [number, number] {
    const L = lattice();
    return [I * L.ax + J * L.bx, I * L.az + J * L.bz];
  }

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
  function applyFloorOpacity(opacity: number) {
    floorOpacity = opacity;
    const g = glassState(opacity, GLASS);
    floorMat.opacity = g.opacity; floorMat.visible = g.visible; floorMat.depthWrite = g.depthWrite;
  }
  applyFloorOpacity(floorOpacity);

  // ── tiled copies of the decorated square ────────────────────────────────────
  const cells: Cell[] = [];
  for (let i = 0; i < (2 * K + 1) * (2 * K + 1); i++) {
    const group = new THREE.Group(); group.matrixAutoUpdate = false;
    const trees = new THREE.Group(), columns = new THREE.Group();
    const under = new THREE.Group(); under.scale.set(1, -1, -1); under.position.y = -thickness; under.visible = false;
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

  const foot = makeFootprintTrail(TRAIL_MAX);
  const footMesh = new THREE.Mesh(foot.geometry, foot.material);
  footMesh.frustumCulled = false;
  root.add(footMesh);
  let trailLast: THREE.Vector3 | null = null;

  // player state (walks the flat plane in world coords)
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

    floor.position.set(px, -thickness / 2, pz);
    floorTex.offset.set(px / 3, -pz / 3);

    // tile the decorated square around the player via the deck lattice
    const showUnder = glassState(floorOpacity, GLASS).showUnder;
    const [I0, J0] = cellOf(px, pz);
    let idx = 0;
    for (let di = -K; di <= K; di++) {
      for (let dj = -K; dj <= K; dj++) {
        const I = I0 + di, J = J0 + dj;
        const [cx, cz] = cellOrigin(I, J);
        const flipped = flipParity(I, J) === 1;
        S.makeScale(1, 1, flipped ? -1 : 1);
        const cell = cells[idx++];
        cell.group.matrix.copy(M.makeTranslation(cx, 0, cz)).multiply(S);
        cell.trees.visible = flipped;       // flipped class wears trees
        cell.columns.visible = !flipped;
        cell.under.visible = showUnder;
        if (showUnder) { cell.underTrees.visible = !flipped; cell.underColumns.visible = flipped; }
      }
    }

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
    const [I0, J0] = cellOf(px, pz);
    const [cx, cz] = cellOrigin(I0, J0);
    const flipped = flipParity(I0, J0) === 1;
    const sz0 = flipped ? -1 : 1;
    const bx2 = px - cx, bz2 = sz0 * (pz - cz);
    const mhx = forward.x, mhz = sz0 * forward.z, mhl = Math.hypot(mhx, mhz) || 1;
    return { u: bx2 / side + 0.5, v: bz2 / side + 0.5, hx: mhx / mhl, hz: mhz / mhl, flipped };
  }

  return {
    kind: 'euclidean',
    update, pose, chart,
    clearTrail: () => { foot.clear(); trailLast = null; },
    setFloorOpacity: applyFloorOpacity,
    setSquareSize: (v: number) => {
      side = v; scale = side / baseLen; placeDecor(); rebuildFloorGeo();
      floorTex.repeat.set((2 * K + 3) * side / 3, (2 * K + 3) * side / 3);
      scene.fog = new THREE.Fog(SKY, side * 0.7, side * 3);
    },
    setFloorThickness: (t: number) => {
      thickness = t; rebuildFloorGeo();
      for (const cell of cells) cell.under.position.y = -thickness;
    },
    dispose: () => {
      foot.dispose(); floor.geometry.dispose(); floorTex.dispose(); floorMat.dispose();
    },
  };
}
