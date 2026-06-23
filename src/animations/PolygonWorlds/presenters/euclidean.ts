import * as THREE from 'three';
import { CoverModel, CoverFrameInput, CoverDeps, PlayerPose } from '../coverModel';
import { SquareMapState } from '../engineTypes';
import { glassState, POLYGON_GLASS } from '../glassSurface';
import { makeInkTrail } from '../inkTrail';
import { makeSignBuilder, SignBuilder } from '../sign';
import { cornerColor } from '../decor';
import { parseWord } from '../surfaceSchema';
import { realize, Realization } from '../lib/realize';
import { applyMat, det3, ORIGIN, Isometry } from '../lib/cayleyKlein';

/**
 * The flat (Euclidean-plane) presenter for the χ=0 worlds, driven by the geometry
 * kernel. {@link realize} gives the fundamental polygon's side-pairing isometries
 * (the deck group); tiling the universal cover is "apply the deck lattice": cell
 * (I, J) is γ₀ᴵ · γ₁ᴶ, whose translation places the copy and whose **sign of the
 * determinant** decides whether the copy is mirror-reflected.
 *
 * Each cell is a **two-sided sheet** (a thin slab) of one neutral color: **trees on
 * the top face**, **columns on the bottom face**, each landmark's two forms at the
 * identical (u, v) and growing *away* from the sheet (so they never penetrate it).
 * A mirror-reflected cell (`det < 0`) is the sheet **flipped over like a
 * transparency** — rotated π about the glide axis. That one proper rotation does
 * both things the glide demands: the columns face becomes the top (the side cue),
 * and the cell's content is genuinely mirrored in-plane across the glide axis, so
 * anything written on the sheet reads REVERSED through the glass from the other
 * side. (`scale.y = −1` alone — the earlier sheet flip — swaps the faces but
 * silently drops the in-plane reflection, which made old ink read un-reversed and
 * the walk contradict the mini-map's own gluing arrows.)
 *
 * The footprint trail is **ink on the sheet**: each stamp is pulled back through the
 * home cell's current transform into sheet coordinates (in-plane position + heading +
 * which FACE the ink is on) and written once into one shared buffer; every cell then
 * carries a mesh instance of that buffer, so the trail tiles seamlessly with the
 * ground and a det<0 cell genuinely turns the inked face downward — your old prints
 * hang under the glass, mirror-reversed, when the identification carries them to the
 * other side of the sheet.
 */

const K = 2;            // render (2K+1)² copies around the player
const EYE = 1.7;
const UP = new THREE.Vector3(0, 1, 0);
const SKY = 0x070912;
const TRAIL_MAX = 1500;
const TRAIL_SPACING = 1.6;
// The default opacity reads as clear-but-present glass (you see the brown
// underside + columns + footprints through it); raising it toward 1 turns the
// sheet solid. The threshold spec is shared across all three worlds so the
// slider feels identical everywhere (see POLYGON_GLASS).
const GLASS = POLYGON_GLASS;
const FLOOR_COLOR = 0x46658f;   // one neutral sheet color (the two sides are told
                                // apart by trees vs columns + the warm/cool light)
// Vertex towers sit just inside every corner of the cell — the m-gon's
// "slightly smaller polygon". 0.82 keeps them clear of the seams.
const VERTEX_INSET = 0.82;

interface Cell {
  group: THREE.Group;     // matrix = translate(cellOrigin) · (flipped ? rotateπ(glideDir) : I) — the rigid transparency flip
  slab: THREE.Mesh;
  top: THREE.Group;       // trees (top face)
  bottom: THREE.Group;    // columns (bottom face)
  cornersTop: THREE.Group;    // numbered corner markers just inside each vertex (top face)
  cornersBottom: THREE.Group; // their Roman-numeral counterparts (bottom face)
  signsG: THREE.Group;    // one instance per planted sign (sheet coordinates)
}

/** A planted sign in sheet coordinates: in-plane base position + facing
 *  azimuth + which face the post grows from — the same data as an ink stamp,
 *  but realized as a rigid object (its per-cell local matrix is always
 *  PROPER; on face 1 it is pre-composed with the transparency flip, so the
 *  cell drawn flipped under the player at plant time renders it exactly
 *  upright before them, and the identification carries it to the other side
 *  of the sheet where its ink reads reversed only through the glass). */
interface PlantedSign { builder: SignBuilder; sx: number; sz: number; phi: number; face: number }
const MAX_SIGNS = 4;

/** A footprint in sheet coordinates: in-plane position + heading + the face the
 *  ink is on (0 = the slab's authored top face, 1 = its bottom face). For face 1
 *  the in-plane numbers are already pulled back through the flip (mirrored
 *  across the glide axis) — they are SHEET coordinates, not world ones. */
interface Stamp { x: number; z: number; fx: number; fz: number; face: number }

export function makeEuclideanPresenter(c: CoverDeps): CoverModel {
  const { deps, root, decor } = c;
  const { scene, camera } = deps;

  // ── kernel: realize the word → deck lattice ─────────────────────────────────
  const real: Realization = realize(parseWord(c.spec.word));
  const m = real.edges;                                       // polygon side count (4 = the square worlds, 6 = hexagonal)
  const polyVerts = real.vertices.map((v) => [v[0], v[1]] as [number, number]); // kernel units, circumradius 1
  const squareChart = !!c.spec.edges;                         // square worlds keep the classic square mini-map
  const gens: Isometry[] = real.deckGenerators.filter(Boolean);
  const o = ORIGIN;
  const g0 = applyMat(gens[0].m, o), g1 = applyMat(gens[1].m, o);
  const ax = g0[0] - o[0], ay = g0[1] - o[1];
  const bx = g1[0] - o[0], by = g1[1] - o[1];
  const detA = det3(gens[0].m), detB = det3(gens[1].m);
  const flipParity = (I: number, J: number) =>
    ((detA < 0 && (I & 1)) ? 1 : 0) ^ ((detB < 0 && (J & 1)) ? 1 : 0);
  // The glide axis: a glide reflection's mirror line is parallel to its own
  // translation. The flipped cell transform is the π-rotation about this axis
  // (through the cell center at slab mid-height) — the "flip the transparency
  // over" move: face swap + genuine in-plane mirror in one proper rotation.
  const glideDir = new THREE.Vector3();
  if (detA < 0) glideDir.set(ax, 0, ay).normalize();
  else if (detB < 0) glideDir.set(bx, 0, by).normalize();
  else glideDir.set(1, 0, 0);            // unused (orientable: no flipped cells)
  /** Reflect an in-plane (x,z) pair across the glide axis direction. */
  const reflectInPlane = (x: number, z: number): [number, number] => {
    const dx = glideDir.x, dz = glideDir.z;
    return [
      (dx * dx - dz * dz) * x + 2 * dx * dz * z,
      2 * dx * dz * x + (dz * dz - dx * dx) * z,
    ];
  };

  let side = c.squareSize;
  let thickness = c.floorThickness;
  let floorOpacity = 0.45;   // clear-but-present default (host re-pushes on mount)
  let camDist = 3.2;
  const baseLen = Math.hypot(ax, ay) || 1;
  let scale = side / baseLen;
  // Decor is authored in unit-square (u,v); it spans the polygon's INSCRIBED
  // square: width 2·inradius. For the square worlds this is exactly `side`, so
  // their layout is unchanged; on the hexagon everything stays inside the cell.
  const inradiusK = Math.cos(Math.PI / m);                   // kernel units (circumradius 1)
  const span = () => 2 * inradiusK * scale;
  /** World position of polygon corner k, inset radially toward the center
   *  (matches the old square inset: ±0.41·side at m=4). */
  const cornerWorld = (k: number): [number, number] =>
    [polyVerts[k][0] * scale * VERTEX_INSET, polyVerts[k][1] * scale * VERTEX_INSET];
  /** The cell slab: the realized fundamental polygon extruded to the floor
   *  thickness, centered on the slab mid-plane (the cell-group origin). The
   *  rotation maps shape (x,y) → floor plan (x,z) with NO mirror (det +1). */
  function slabGeometry(): THREE.ExtrudeGeometry {
    const shape = new THREE.Shape();
    polyVerts.forEach(([vx, vy], i) => {
      const wx = vx * scale, wy = vy * scale;
      if (i === 0) shape.moveTo(wx, wy); else shape.lineTo(wx, wy);
    });
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false });
    geo.rotateX(Math.PI / 2);            // (x,y,extrude z) → (x, y∈[−t,0], plan z=shape y)
    geo.translate(0, thickness / 2, 0);
    return geo;
  }
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

  // ── one neutral glass slab material (no per-side color) ─────────────────────
  const floorMat = new THREE.MeshStandardMaterial({
    color: FLOOR_COLOR, emissive: FLOOR_COLOR, emissiveIntensity: 0.16, roughness: 0.5,
    metalness: 0.05, transparent: true, opacity: floorOpacity, side: THREE.DoubleSide,
  });
  function applyFloorOpacity(opacity: number) {
    floorOpacity = opacity;
    const g = glassState(opacity, GLASS);
    floorMat.opacity = g.opacity; floorMat.visible = g.visible; floorMat.depthWrite = g.depthWrite;
    floorMat.transparent = opacity < 0.999;   // fully opaque ⇒ the side you walk never shows through
    floorMat.needsUpdate = true;
  }

  // ── the ink trail: one canonical buffer in sheet coordinates ──────────────────
  // Stamps are the player's world print pulled back through the home cell's
  // CURRENT transform into sheet coordinates: on the flipped face that pull-back
  // (the inverse π-rotation) mirrors the in-plane numbers and lands the ink on
  // the bottom face — mirror-handed ink, exactly what a real stamp through a real
  // flip leaves. Rendering never touches the buffer: each cell draws an instance
  // through its own matrix, so the trail tiles seamlessly and a flipped cell
  // genuinely carries the ink to the sheet's other side, reading reversed.
  const ink = makeInkTrail(TRAIL_MAX);
  const stamps: Stamp[] = [];
  let lastFrozen: THREE.Vector3 | null = null;      // spacing ref (world, fold-carried)
  const posV = new THREE.Vector3(), fwdV = new THREE.Vector3();
  const leftV = new THREE.Vector3(), normV = new THREE.Vector3();
  function writeStamp(slot: number, s: Stamp) {
    const sy = s.face ? -1 : 1;
    posV.set(s.x, sy * (thickness / 2), s.z);
    fwdV.set(s.fx, 0, s.fz);
    // bottom-face ink is mirror-handed in sheet coords: left = −(up × fwd)
    leftV.set(s.fz, 0, -s.fx).multiplyScalar(sy);
    normV.set(0, sy, 0);
    ink.setQuad(slot, posV, fwdV, leftV, normV);
  }
  const rewriteStamps = () => { stamps.forEach((s, i) => writeStamp(i, s)); };

  // ── planted signs: rigid sheet-coordinate objects, one instance per cell ─────
  // A sign's per-cell local matrix is the player's world plant pose pulled back
  // through the home cell's CURRENT transform (premultiplied by the transparency
  // flip when planted from the other face) — always a PROPER matrix; every cell
  // then draws it through its own genuine transform, exactly like the decor.
  const signs: PlantedSign[] = [];
  const FLIP = new THREE.Matrix4().makeRotationAxis(glideDir, Math.PI);
  const signLocal = (s: PlantedSign): THREE.Matrix4 => {
    const m = new THREE.Matrix4().makeRotationY(s.phi).setPosition(s.sx, thickness / 2, s.sz);
    return s.face ? m.premultiply(FLIP) : m;
  };
  function addSignInstance(cell: Cell, s: PlantedSign) {
    const g = s.builder.make();
    g.matrixAutoUpdate = false;
    g.matrix.copy(signLocal(s));
    cell.signsG.add(g);
  }
  function rebuildSignInstances() {
    for (const cell of cells) {
      cell.signsG.clear();
      for (const s of signs) addSignInstance(cell, s);
    }
  }
  function clearSigns() {
    for (const cell of cells) cell.signsG.clear();
    for (const s of signs) s.builder.dispose();
    signs.length = 0;
  }

  // ── tiled copies of the two-sided sheet ──────────────────────────────────────
  // Authored with the slab mid-plane at the group origin: top face at +t/2 (trees,
  // up), bottom face at −t/2 (columns, grown down). The group sits at world y=−t/2,
  // so the top face — the walking surface — is at y=0. A flipped cell is rotated π
  // about the glide axis through its center at slab mid-height: faces swap AND the
  // content mirrors in-plane — the transparency flipped over.
  const cells: Cell[] = [];
  function buildCells() {
    for (const cell of cells) root.remove(cell.group);
    cells.length = 0;
    for (let i = 0; i < (2 * K + 1) * (2 * K + 1); i++) {
      const group = new THREE.Group(); group.matrixAutoUpdate = false;
      const slab = new THREE.Mesh(slabGeometry(), floorMat);
      slab.receiveShadow = true;   // the flat floor catches the decor's soft shadows
      const top = new THREE.Group(), bottom = new THREE.Group();
      // Bottom-face decor is turned over RIGIDLY (π about the glide axis), never
      // mirrored with scale.y=−1: a baked reflection would cancel against the
      // flipped cells' transparency-flip and surface as mirror-written glyphs on
      // the face you walk. Rigid + rigid composes to a translation, so on a
      // flipped cell the columns and Roman plates come up reading exactly
      // upright — backwards text only ever appears THROUGH the glass.
      decor.props.forEach((_, j) => {
        const t = decor.makeTop(j); top.add(t);          // grows +y from the top face
        const b = decor.makeBottom(j);                   // turned over: grows −y from the bottom face
        b.setRotationFromAxisAngle(glideDir, Math.PI);
        bottom.add(b);
      });
      const cornersTop = new THREE.Group(), cornersBottom = new THREE.Group();
      for (let v = 0; v < m; v++) {
        const col = cornerColor(v, m);
        cornersTop.add(decor.makeCornerTop(v + 1, col)); // Arabic disc, top face
        const cb = decor.makeCornerBottom(v + 1, col);   // Roman disc, turned onto the bottom face
        cb.setRotationFromAxisAngle(glideDir, Math.PI);
        cornersBottom.add(cb);
      }
      // every cell carries an instance of the one shared ink buffer — the trail
      // tiles with the ground, and a det<0 cell mirrors it for real
      const trailInk = new THREE.Mesh(ink.geometry, ink.material);
      trailInk.frustumCulled = false;
      trailInk.userData.ink = true;  // ink may legitimately read mirrored — exempt from the decor audit
      const signsG = new THREE.Group();
      group.add(slab, top, bottom, cornersTop, cornersBottom, signsG, trailInk);
      root.add(group);
      const cell: Cell = { group, slab, top, bottom, cornersTop, cornersBottom, signsG };
      for (const s of signs) addSignInstance(cell, s);
      cells.push(cell);
    }
    placeDecor();
  }
  function placeDecor() {
    const ht = thickness / 2;
    const s = span();
    for (const cell of cells) {
      decor.props.forEach((p, j) => {
        const x = (p.u - 0.5) * s, z = (p.v - 0.5) * s;
        cell.top.children[j].position.set(x, ht, z);
        cell.bottom.children[j].position.set(x, -ht, z);
      });
      for (let v = 0; v < m; v++) {
        const [x, z] = cornerWorld(v);
        cell.cornersTop.children[v].position.set(x, ht, z);
        cell.cornersBottom.children[v].position.set(x, -ht, z);
      }
    }
  }
  buildCells();
  applyFloorOpacity(floorOpacity);

  // player state (walks the flat plane in world coords). Spawn at the home-cell
  // point farthest from every landmark, so the player never starts inside a tree.
  function clearSpawn(): [number, number] {
    const s = span();
    const avoid: [number, number][] = [
      ...decor.props.map((p) => [(p.u - 0.5) * s, (p.v - 0.5) * s] as [number, number]),
      ...Array.from({ length: m }, (_, k) => cornerWorld(k)),
    ];
    let best: [number, number] = [0, 0], bestD = -1;
    for (let cu = 0.1; cu <= 0.9; cu += 0.1) {
      for (let cv = 0.1; cv <= 0.9; cv += 0.1) {
        const wx = (cu - 0.5) * s, wz = (cv - 0.5) * s;
        let mind = Infinity;
        for (const [px2, pz2] of avoid) mind = Math.min(mind, Math.hypot(wx - px2, wz - pz2));
        if (mind > bestD) { bestD = mind; best = [wx, wz]; }
      }
    }
    return best;
  }
  let [px, pz] = clearSpawn();
  // Accumulated flip parity carried through folds: each time the player is folded
  // back across a glide edge we XOR in that crossing's parity, so the world keeps
  // showing the correct (flipped / un-flipped) face even though the player's cell
  // index is reset to home. 0 for the orientable torus (no flip edges) always.
  let flipAcc = 0;
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

    // ── Fold the player back into the home cell — "crossing teleports you". The cover
    // is drawn as a (2K+1)² patch of cells around the player; left to roam free the
    // camera would wander arbitrarily far from the origin. Instead, the moment the
    // player steps out of the home cell, translate them back by that cell's lattice
    // origin so they re-enter from the identified edge, and fold the crossing's flip
    // parity into `flipAcc`. The fold is a PURE translation even across a glide edge:
    // toggling `flipAcc` re-renders every cell with its flip toggled, and for the
    // alternating glide pattern (…,A,B,A,B,…) that global toggle IS the scene shifted
    // by one glide step — so the matching player move is exactly the translation, and
    // the view is unchanged (a seamless teleport). The glide's reflection is never
    // applied to the player's world numbers; it lives in the flipped cells' transform
    // and in the pull-backs through it (the chart and the ink stamps), which is where
    // the classic square-diagram re-entry — exit at v, come back at 1−v — shows up.
    const [fi, fj] = cellOf(px, pz);
    if (fi !== 0 || fj !== 0) {
      const [ox, oz] = cellOrigin(fi, fj);
      px -= ox; pz -= oz;
      // `lastFrozen` — a pure spacing reference, not a print — rides along through
      // the fold so the gap between prints stays even across a wrap. The ink
      // itself never moves: stamps live in sheet coordinates and every cell
      // already draws them.
      if (lastFrozen) lastFrozen.set(lastFrozen.x - ox, lastFrozen.y, lastFrozen.z - oz);
      if (flipParity(fi, fj)) flipAcc ^= 1;   // you are now on the other face
    }

    pos.set(px, 0, pz);
    forward.set(Math.sin(yaw), 0, -Math.cos(yaw));

    cam.up.copy(UP);
    if (thirdPerson) {
      const aspect = cam.aspect || 1;
      const D = camDist * Math.min(1.6, Math.max(1, 1 / Math.min(aspect, 1)));
      cam.position.set(px, 0, pz).addScaledVector(forward, -D).addScaledVector(UP, 2.2 + pitch * 1.6);
      cam.lookAt(px + forward.x * 0.5, 1.3, pz + forward.z * 0.5);
    } else {
      const cp = Math.cos(pitch);
      cam.position.set(px, EYE, pz);
      cam.lookAt(px + forward.x * cp, EYE + Math.sin(pitch), pz + forward.z * cp);
    }

    // tile the sheet around the player via the deck lattice
    const [I0, J0] = cellOf(px, pz);
    let idx = 0;
    for (let di = -K; di <= K; di++) {
      for (let dj = -K; dj <= K; dj++) {
        const I = I0 + di, J = J0 + dj;
        const [cx, cz] = cellOrigin(I, J);
        const flipped = (flipParity(I, J) ^ flipAcc) === 1;
        if (flipped) S.makeRotationAxis(glideDir, Math.PI);  // the transparency flip
        else S.identity();
        const cell = cells[idx++];
        cell.group.matrix.copy(M.makeTranslation(cx, -thickness / 2, cz)).multiply(S);
      }
    }

    // ── ink the sheet ─────────────────────────────────────────────────────────
    // Freeze a footprint every TRAIL_SPACING of walked path: the player's world
    // print pulled back into sheet coordinates (on the flipped face that inverse
    // flip mirrors the in-plane numbers — sheet coords, not world ones).
    if (!lastFrozen || lastFrozen.distanceTo(pos) > TRAIL_SPACING) {
      let sx = px, sz = pz, sfx = forward.x, sfz = forward.z;
      if (flipAcc) {
        [sx, sz] = reflectInPlane(sx, sz);
        [sfx, sfz] = reflectInPlane(sfx, sfz);
      }
      const here: Stamp = { x: sx, z: sz, fx: sfx, fz: sfz, face: flipAcc };
      if (stamps.length >= TRAIL_MAX) { stamps.shift(); ink.dropOldest(); }
      stamps.push(here);
      writeStamp(stamps.length - 1, here);
      ink.setCount(stamps.length);
      lastFrozen = pos.clone();
    }
  }

  function pose(): PlayerPose {
    return { position: pos.clone(), up: UP.clone(), forward: forward.clone() };
  }

  function chart(): SquareMapState {
    // The map charts the FUNDAMENTAL DOMAIN: pull the player's world position and
    // heading back through the home cell's current transform (the in-plane part of
    // the transparency flip when on the other face). This is where the classic
    // square-diagram re-entry — exit at v, come back at 1−v — shows up.
    // The Dirichlet representative: the NEAREST cell origin (for the square's
    // orthogonal lattice this equals the oblique round; for the hexagonal
    // lattice it is what keeps the marker inside the drawn polygon). The flip
    // parity is read from that cell, so the reflection rides the right rep.
    const [Ir, Jr] = cellOf(px, pz);
    let I0 = Ir, J0 = Jr, bd = Infinity;
    for (let di = -1; di <= 1; di++) {
      for (let dj = -1; dj <= 1; dj++) {
        const [ox, oz] = cellOrigin(Ir + di, Jr + dj);
        const d = (px - ox) * (px - ox) + (pz - oz) * (pz - oz);
        if (d < bd) { bd = d; I0 = Ir + di; J0 = Jr + dj; }
      }
    }
    const [cx, cz] = cellOrigin(I0, J0);
    const flipped = (flipParity(I0, J0) ^ flipAcc) === 1;
    let bx2 = px - cx, bz2 = pz - cz, mhx = forward.x, mhz = forward.z;
    if (flipped) {
      [bx2, bz2] = reflectInPlane(bx2, bz2);
      [mhx, mhz] = reflectInPlane(mhx, mhz);
    }
    const mhl = Math.hypot(mhx, mhz) || 1;
    if (squareChart) {
      return { u: bx2 / side + 0.5, v: bz2 / side + 0.5, hx: mhx / mhl, hz: mhz / mhl, flipped };
    }
    // polygon worlds: coordinates normalized to the circumcircle (the n-gon
    // mini-map draws the polygon's vertices at radius 1 in these units)
    return { u: (bx2 / scale + 1) / 2, v: (bz2 / scale + 1) / 2, hx: mhx / mhl, hz: mhz / mhl, flipped };
  }

  return {
    kind: 'euclidean',
    update, pose, chart,
    // the freshest print AS RENDERED through the home cell's current transform,
    // read in the character's frame (>0 ⇒ reads right-handed under the player)
    debugProbe: () => {
      M.makeTranslation(0, -thickness / 2, 0);
      if (flipAcc) M.multiply(S.makeRotationAxis(glideDir, Math.PI));
      return ink.chirality(stamps.length - 1, M, forward, UP);
    },
    clearTrail: () => { stamps.length = 0; lastFrozen = null; ink.setCount(0); },
    // Debug-pose harness: drop the player at chart (u,v) in the home cell, on the
    // canonical face (flipAcc=0). The inverse of chart()'s home-cell branch:
    // square worlds chart u = bx/side + 0.5; polygon worlds u = (bx/scale + 1)/2.
    setPose: (u: number, v: number) => {
      if (squareChart) { px = (u - 0.5) * side; pz = (v - 0.5) * side; }
      else { px = (2 * u - 1) * scale; pz = (2 * v - 1) * scale; }
      flipAcc = 0;
      pos.set(px, 0, pz);
      stamps.length = 0; lastFrozen = null; ink.setCount(0);   // no streak from the old spot
    },
    plantSign: (front: string, back: string) => {
      if (signs.length >= MAX_SIGNS) signs.shift()!.builder.dispose();
      signs.push({
        builder: makeSignBuilder(front, back),
        sx: px + forward.x * 1.2,
        sz: pz + forward.z * 1.2,
        phi: Math.atan2(-forward.x, -forward.z),   // front face looks back at the player
        face: flipAcc,
      });
      rebuildSignInstances();
    },
    clearSigns,
    setFloorOpacity: applyFloorOpacity,
    setCameraDistance: (d: number) => { camDist = d; },
    setSquareSize: (v: number) => {
      side = v; scale = side / baseLen;
      // the lattice rescaled under the ink — old stamp coordinates no longer
      // lie on this sheet, so the trail (and the planted signs) restart
      stamps.length = 0; lastFrozen = null; ink.setCount(0);
      clearSigns();
      buildCells();
      scene.fog = new THREE.Fog(SKY, side * 0.7, side * 3);
    },
    setFloorThickness: (t: number) => { thickness = t; buildCells(); rewriteStamps(); },
    dispose: () => {
      ink.dispose();
      for (const s of signs) s.builder.dispose();
      for (const cell of cells) cell.slab.geometry.dispose();
      floorMat.dispose();
    },
  };
}
