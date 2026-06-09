import * as THREE from 'three';
import { CoverModel, CoverFrameInput, CoverDeps, PlayerPose } from '../coverModel';
import { SquareMapState } from '../engineTypes';
import { glassState, POLYGON_GLASS } from '../glassSurface';
import { makeFootprintTrail } from '../footprints';
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
 * Each cell is a **two-sided sheet** (a thin slab) of one neutral colour: **trees on
 * the top face**, **columns on the bottom face**, each landmark's two forms at the
 * identical (u, v) and growing *away* from the sheet (so they never penetrate it).
 * A mirror-reflected cell (`det < 0`) is the whole sheet flipped (`scale.y = −1`):
 * the columns face becomes the top — the trees↔columns swap is the side cue (the two
 * faces are not coloured differently; a warm light from above and a cool one from
 * below tint them instead). The footprint trail is always laid on top of the sheet,
 * the same side the character is rendered on, so your fresh trail stays with you;
 * on a mirrored cell each print is set down mirror-reversed in place (you are on the
 * sheet's other face), so the chiral F still flags the flip.
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
const FLOOR_COLOR = 0x46658f;   // one neutral sheet colour (the two sides are told
                                // apart by trees vs columns + the warm/cool light)
// Vertex towers sit just inside every corner of the square cell — the 4-gon's
// "slightly smaller polygon". Authored in (u,v); 0.82 keeps them clear of the seams.
const VERTEX_INSET = 0.82;
const CELL_CORNERS: [number, number][] = [[0, 0], [1, 0], [1, 1], [0, 1]];
const insetCorner = ([cu, cv]: [number, number]): [number, number] =>
  [0.5 + (cu - 0.5) * VERTEX_INSET, 0.5 + (cv - 0.5) * VERTEX_INSET];

interface Cell {
  group: THREE.Group;     // matrix = translate(cellOrigin) · scale(1, flip, 1)
  slab: THREE.Mesh;
  top: THREE.Group;       // trees (top face)
  bottom: THREE.Group;    // columns (bottom face)
  cornersTop: THREE.Group;    // numbered corner markers just inside each vertex (top face)
  cornersBottom: THREE.Group; // their Roman-numeral counterparts (bottom face)
}

export function makeEuclideanPresenter(c: CoverDeps): CoverModel {
  const { deps, root, decor } = c;
  const { scene, camera } = deps;

  // ── kernel: realize the word → deck lattice ─────────────────────────────────
  const real: Realization = realize(parseWord(c.spec.word));
  const gens: Isometry[] = real.deckGenerators.filter(Boolean);
  const o = ORIGIN;
  const g0 = applyMat(gens[0].m, o), g1 = applyMat(gens[1].m, o);
  const ax = g0[0] - o[0], ay = g0[1] - o[1];
  const bx = g1[0] - o[0], by = g1[1] - o[1];
  const detA = det3(gens[0].m), detB = det3(gens[1].m);
  const flipParity = (I: number, J: number) =>
    ((detA < 0 && (I & 1)) ? 1 : 0) ^ ((detB < 0 && (J & 1)) ? 1 : 0);

  let side = c.squareSize;
  let thickness = c.floorThickness;
  let floorOpacity = 0.45;   // clear-but-present default (host re-pushes on mount)
  let camDist = 3.2;
  const baseLen = Math.hypot(ax, ay) || 1;
  let scale = side / baseLen;
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

  // ── one neutral glass slab material (no per-side colour) ─────────────────────
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

  // ── tiled copies of the two-sided sheet ──────────────────────────────────────
  // Authored with the slab mid-plane at the group origin: top face at +t/2 (trees,
  // up), bottom face at −t/2 (columns, grown down). The group sits at world y=−t/2,
  // so the top face — the walking surface — is at y=0. A flipped cell scales y=−1
  // about the slab mid-plane, swapping the faces in place.
  const cells: Cell[] = [];
  function buildCells() {
    for (const cell of cells) root.remove(cell.group);
    cells.length = 0;
    for (let i = 0; i < (2 * K + 1) * (2 * K + 1); i++) {
      const group = new THREE.Group(); group.matrixAutoUpdate = false;
      const slab = new THREE.Mesh(new THREE.BoxGeometry(side, thickness, side), floorMat);
      const top = new THREE.Group(), bottom = new THREE.Group();
      decor.props.forEach((_, j) => {
        const t = decor.makeTop(j); top.add(t);          // grows +y from the top face
        const b = decor.makeBottom(j); b.scale.y = -1; bottom.add(b); // grows −y from the bottom face
      });
      const cornersTop = new THREE.Group(), cornersBottom = new THREE.Group();
      CELL_CORNERS.forEach((_, v) => {
        const col = cornerColor(v, CELL_CORNERS.length);
        cornersTop.add(decor.makeCornerTop(v + 1, col));                     // Arabic disc, top face
        const cb = decor.makeCornerBottom(v + 1, col); cb.scale.y = -1; cornersBottom.add(cb); // Roman, bottom
      });
      group.add(slab, top, bottom, cornersTop, cornersBottom);
      root.add(group);
      cells.push({ group, slab, top, bottom, cornersTop, cornersBottom });
    }
    placeDecor();
  }
  function placeDecor() {
    const ht = thickness / 2;
    for (const cell of cells) {
      decor.props.forEach((p, j) => {
        const x = (p.u - 0.5) * side, z = (p.v - 0.5) * side;
        cell.top.children[j].position.set(x, ht, z);
        cell.bottom.children[j].position.set(x, -ht, z);
      });
      CELL_CORNERS.forEach((corner, v) => {
        const [iu, iv] = insetCorner(corner);
        const x = (iu - 0.5) * side, z = (iv - 0.5) * side;
        cell.cornersTop.children[v].position.set(x, ht, z);
        cell.cornersBottom.children[v].position.set(x, -ht, z);
      });
    }
  }
  buildCells();
  applyFloorOpacity(floorOpacity);

  const foot = makeFootprintTrail(TRAIL_MAX);
  const footMesh = new THREE.Mesh(foot.geometry, foot.material);
  footMesh.frustumCulled = false;
  root.add(footMesh);
  let trailLast: THREE.Vector3 | null = null;
  // Each print remembers the sheet side it was laid on (`side` = the flipAcc parity at
  // lay time). It is drawn mirror-reversed only when the side you are viewing from now
  // differs — a *relative* flip — so a fresh print always reads correct in the
  // character's frame while a print from the other face reads reversed once you cross to
  // it. Because the prints are baked, re-mirroring on a side change means a rebuild.
  const trail: { pos: THREE.Vector3; fwd: THREE.Vector3; side: number }[] = [];
  function rebuildTrail() {
    foot.clear();
    for (const t of trail) foot.append(t.pos, t.fwd, UP, (t.side ^ flipAcc) === 1);
  }

  // player state (walks the flat plane in world coords). Spawn at the home-cell
  // point farthest from every landmark, so the player never starts inside a tree.
  function clearSpawn(): [number, number] {
    const avoid: [number, number][] = [
      ...decor.props.map((p) => [p.u, p.v] as [number, number]),
      ...CELL_CORNERS.map(insetCorner),
    ];
    let best = [0.5, 0.5], bestD = -1;
    for (let cu = 0.1; cu <= 0.9; cu += 0.1) {
      for (let cv = 0.1; cv <= 0.9; cv += 0.1) {
        let mind = Infinity;
        for (const [au, av] of avoid) mind = Math.min(mind, Math.hypot(cu - au, cv - av));
        if (mind > bestD) { bestD = mind; best = [cu, cv]; }
      }
    }
    return [(best[0] - 0.5) * side, (best[1] - 0.5) * side];
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
  const footPos = new THREE.Vector3();

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
    // player steps out of the home cell, translate them (and the baked trail) back by
    // that cell's lattice origin so they re-enter from the identified edge. The patch
    // is redrawn centred on home, so the relative geometry — hence the view — is
    // unchanged (a seamless teleport); the flip parity of the crossing is folded into
    // `flipAcc` so a glide edge still swaps the face you are standing on.
    const [fi, fj] = cellOf(px, pz);
    if (fi !== 0 || fj !== 0) {
      const [ox, oz] = cellOrigin(fi, fj);
      px -= ox; pz -= oz;
      // The trail does NOT move with the teleport. The ground patch is static in scene
      // space and every print was laid at the (already-folded) player position — i.e.
      // inside the home cell — so each print stays where it was stamped and the trail
      // wraps *within* the fundamental polygon, exactly like the now-confined player.
      // (Dragging the whole baked trail by the fold delta on each crossing is what made
      // it spill across the cover into "infinite space".) Only `trailLast` — a pure
      // spacing reference, not a print — tracks the player's periodic image so the gap
      // between prints stays even across a wrap.
      if (trailLast) trailLast.set(trailLast.x - ox, trailLast.y, trailLast.z - oz);
      // A glide crossing flips the side you view from ⇒ every existing print's relative
      // mirror changes; rebuild to re-mirror them. A plain translation needs nothing.
      if (flipParity(fi, fj)) { flipAcc ^= 1; rebuildTrail(); }
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
      cam.lookAt(px + Math.sin(yaw) * cp, EYE + Math.sin(pitch), pz - Math.cos(yaw) * cp);
    }

    // tile the sheet around the player via the deck lattice
    const [I0, J0] = cellOf(px, pz);
    let idx = 0;
    for (let di = -K; di <= K; di++) {
      for (let dj = -K; dj <= K; dj++) {
        const I = I0 + di, J = J0 + dj;
        const [cx, cz] = cellOrigin(I, J);
        const flipped = (flipParity(I, J) ^ flipAcc) === 1;
        S.makeScale(1, flipped ? -1 : 1, 1);
        const cell = cells[idx++];
        cell.group.matrix.copy(M.makeTranslation(cx, -thickness / 2, cz)).multiply(S);
      }
    }

    // footprints: always laid on top of the sheet — the same side the character is
    // rendered on — so your fresh trail stays with you. A fresh print is laid un-mirrored
    // (it reads correct in the character's frame); it only turns mirror-reversed later, if
    // you cross to the other face and look back at it (the relative flip, in rebuildTrail).
    if (!trailLast || trailLast.distanceTo(pos) > TRAIL_SPACING) {
      const d = trailLast ? pos.clone().sub(trailLast) : forward.clone();
      if (d.lengthSq() < 1e-9) d.copy(forward);
      d.y = 0; d.normalize();
      footPos.set(px, 0, pz);
      trail.push({ pos: footPos.clone(), fwd: d.clone(), side: flipAcc });
      if (trail.length > TRAIL_MAX) trail.shift();
      foot.append(footPos, d, UP, false);     // same side as the viewer ⇒ never mirrored
      trailLast = pos.clone();
    }
  }

  function pose(): PlayerPose {
    return { position: pos.clone(), up: UP.clone(), forward: forward.clone() };
  }

  function chart(): SquareMapState {
    const [I0, J0] = cellOf(px, pz);
    const [cx, cz] = cellOrigin(I0, J0);
    const flipped = (flipParity(I0, J0) ^ flipAcc) === 1;
    const sz0 = flipped ? -1 : 1;
    const bx2 = px - cx, bz2 = sz0 * (pz - cz);
    const mhx = forward.x, mhz = sz0 * forward.z, mhl = Math.hypot(mhx, mhz) || 1;
    return { u: bx2 / side + 0.5, v: bz2 / side + 0.5, hx: mhx / mhl, hz: mhz / mhl, flipped };
  }

  return {
    kind: 'euclidean',
    update, pose, chart,
    debugProbe: () => foot.lastChirality(forward, UP),
    clearTrail: () => { trail.length = 0; foot.clear(); trailLast = null; },
    setFloorOpacity: applyFloorOpacity,
    setCameraDistance: (d: number) => { camDist = d; },
    setSquareSize: (v: number) => {
      side = v; scale = side / baseLen;
      buildCells();
      scene.fog = new THREE.Fog(SKY, side * 0.7, side * 3);
    },
    setFloorThickness: (t: number) => { thickness = t; buildCells(); },
    dispose: () => {
      foot.dispose();
      for (const cell of cells) cell.slab.geometry.dispose();
      floorMat.dispose();
    },
  };
}
