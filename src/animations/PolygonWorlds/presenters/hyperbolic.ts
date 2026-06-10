import * as THREE from 'three';
import { CoverModel, CoverFrameInput, CoverDeps, PlayerPose } from '../coverModel';
import { SquareMapState } from '../engineTypes';
import { glassState, POLYGON_GLASS } from '../glassSurface';
import { makeInkTrail } from '../inkTrail';
import { cornerColor } from '../decor';
import { parseWord } from '../surfaceSchema';
import { realize, Realization } from '../lib/realize';
import { develop } from '../lib/develop';
import {
  Vec3, Mat3, makeFrame, Frame, framePos,
  stepForward as kStep, stepHeading as kStrafe, turn as kTurn, reorthonormalize,
  applyMat, inv3, mul, det3, distance, geodesicPoint, originTo, ORIGIN, IDENTITY3,
} from '../lib/cayleyKlein';

/**
 * The hyperbolic presenter for the χ<0 worlds (genus-2 octagon, 3-cross-cap …),
 * driven by the kernel at κ=−1 and rendered in the **Poincaré disk**.
 *
 * The player is a kernel {@link Frame} on the κ=−1 shell (the hyperboloid). It is
 * **only ever moved by `stepForward`/`turn`/`stepHeading`, so its frame stays
 * orientation-preserving (det > 0)** — the controls never invert. The scene is
 * re-centred on the player (the view `Tview = frame⁻¹` carries them to the basepoint
 * O); cover points map hyperboloid → Poincaré disk `(x,y)/(1+w)` → a flat **glass
 * disk floor** (radius `DISK_R`).
 *
 * The player is **kept in the fundamental domain by re-basing every frame**: a deck
 * element `h` tracks which tile they walked into (a greedy walk on the deck group's
 * Cayley graph toward the player), and then the frame is *folded back* by the nearest
 * orientation-preserving deck element so it can never drift far from the basepoint —
 * crossing an edge **teleports** the camera across the identified edge with no visible
 * pop (the fold leaves `Mtiles = frame⁻¹ · h` exactly invariant). This is what keeps
 * ℍ² stable: without it the frame's entries grow like `cosh(distance)` and `frame⁻¹`
 * goes singular within a few dozen tiles. The tiling is drawn through `Mtiles`, so the
 * developed tiles always surround the player. Crossing a **glide** edge of a
 * non-orientable world makes `det(h) < 0`,
 * which flips the skin of *every* tile (`det(h)·det(γ) < 0`) — you genuinely flip to
 * the other side (trees ↔ columns, decals mirror-reversed) — while your frame, and
 * therefore your controls, stay put. The geodesic tile edges draw the `{2n, 2n}`
 * tiling out to the horizon; decor copies are kept on the tiles nearest the player
 * and scaled by the conformal factor `1−r²`.
 */

const EYE = 1.7;
const MAX_PITCH = 1.3;
const TRAIL_MAX = 360;     // stamps; each is re-projected into N_DECOR tiles per frame
const SKY = 0x070912;
const GLASS = POLYGON_GLASS;   // shared spec — slider feels the same in every world
const EDGE_SEGS = 7;        // polyline segments per geodesic polygon edge
const N_DECOR = 16;         // decorated tile copies kept near the player
const UP = new THREE.Vector3(0, 1, 0);

const v3 = (p: Vec3): THREE.Vector3 => new THREE.Vector3(p[0], p[1], p[2]);

export function makeHyperbolicPresenter(c: CoverDeps): CoverModel {
  const { deps, root, decor } = c;
  const { scene, camera } = deps;

  // ── kernel: realize the word → hyperbolic polygon + Fuchsian deck ────────────
  const real: Realization = realize(parseWord(c.spec.word));
  const kappa = real.kappa;                       // −1
  const dev = develop(real);
  const elems = dev.elements;                     // deck cosets (incl. identity)
  const m = real.edges;                           // polygon side count (2n)

  // Normalise the disk scale so the home polygon's world size tracks the same
  // `squareSize` slider as the flat cell — its circumradius (centre→vertex) is set
  // to the flat cell's half-diagonal (squareSize·√2/2). Without this the hyperbolic
  // worlds rendered ~1.5× larger than the torus at the same setting, so switching
  // topology felt like a radical change of scale.
  const rhoV = Math.tanh(real.circumradius / 2);  // home-vertex Poincaré radius
  const diskRadiusFor = (sq: number) => Math.max(12, (sq * Math.SQRT1_2) / rhoV);
  let DISK_R = diskRadiusFor(c.squareSize);        // world radius of the unit disk
  let glassOpacity = 0.45;   // clear-but-present default (host re-pushes on mount)
  let underVisible = false;                        // glass reveals the other side
  let camDist = 3.4;

  camera.fov = 75; camera.near = 0.05; camera.far = DISK_R * 6; camera.updateProjectionMatrix();
  camera.up.set(0, 1, 0);
  scene.background = new THREE.Color(SKY);
  scene.fog = new THREE.Fog(SKY, DISK_R * 1.1, DISK_R * 3.2);

  // ── geometry helpers (hyperboloid → Poincaré disk → floor) ───────────────────
  // Tview re-centres the player (det > 0, never mirrored); Mtiles = Tview·h draws
  // the tiling re-centred on the player's current tile. Both refreshed in update().
  let Tview: Mat3 = IDENTITY3;
  let Mtiles: Mat3 = IDENTITY3;

  /** Project a cover point through matrix M to a floor world position. */
  function projectM(M: Mat3, Q: Vec3, out: THREE.Vector3): THREE.Vector3 {
    const x = M[0] * Q[0] + M[1] * Q[1] + M[2] * Q[2];
    const y = M[3] * Q[0] + M[4] * Q[1] + M[5] * Q[2];
    const w = M[6] * Q[0] + M[7] * Q[1] + M[8] * Q[2];
    const k = 1 / (1 + w);
    return out.set(x * k * DISK_R, 0, y * k * DISK_R);
  }
  /** Poincaré radius² of a cover point through M (0 at centre → 1 at the horizon). */
  function poincareR2(M: Mat3, Q: Vec3): number {
    const x = M[0] * Q[0] + M[1] * Q[1] + M[2] * Q[2];
    const y = M[3] * Q[0] + M[4] * Q[1] + M[5] * Q[2];
    const w = M[6] * Q[0] + M[7] * Q[1] + M[8] * Q[2];
    const k = 1 / (1 + w);
    return (x * x + y * y) * k * k;
  }

  /** Point at fraction t along the geodesic from A to B (both on the shell). */
  function geodInterp(A: Vec3, B: Vec3, t: number): Vec3 {
    const g = originTo(kappa, A);
    const Bl = applyMat(inv3(g), B);
    const th = Math.atan2(Bl[1], Bl[0]);
    const d = distance(kappa, ORIGIN, Bl);
    return applyMat(g, geodesicPoint(kappa, th, t * d));
  }

  // home polygon vertices + inradius + a (u,v)→interior chart for decor
  const verts = real.vertices;
  const edgeMid = geodInterp(verts[0], verts[1], 0.5);
  const inradius = distance(kappa, ORIGIN, edgeMid);
  function propHyper(u: number, v: number): Vec3 {
    const du = u - 0.5, dv = v - 0.5;
    const th = Math.atan2(dv, du);
    const rho = Math.min(1, Math.hypot(du, dv) * 2) * inradius * 0.86;
    return geodesicPoint(kappa, th, rho);
  }

  // Vertex towers sit just inside every polygon vertex — the "slightly smaller
  // n-gon" inscribed by pulling each vertex a fraction of the way back to centre.
  const TOWER_INSET = 0.85;
  const nVerts = verts.length;
  const homeTowers = verts.map((V) => geodInterp(ORIGIN, V, TOWER_INSET));

  // Precompute, per tile, the home-polygon edge sample points + prop positions +
  // inset-vertex tower positions, pushed by the deck element (fixed in cover
  // coords; only T changes per frame).
  type TileGeo = { m: Mat3; center: Vec3; det: number; edgePts: Vec3[]; props: Vec3[]; towers: Vec3[] };
  const homeProps = decor.props.map((p) => propHyper(p.u, p.v));
  const tiles: TileGeo[] = elems.map((el) => {
    const edgePts: Vec3[] = [];
    for (let k = 0; k < m; k++) {
      const A = verts[k], B = verts[(k + 1) % m];
      for (let s = 0; s < EDGE_SEGS; s++) {
        edgePts.push(applyMat(el.m, geodInterp(A, B, s / EDGE_SEGS)));
        edgePts.push(applyMat(el.m, geodInterp(A, B, (s + 1) / EDGE_SEGS)));
      }
    }
    return {
      m: el.m,
      center: applyMat(el.m, ORIGIN),
      det: el.det(),
      edgePts,
      props: homeProps.map((hp) => applyMat(el.m, hp)),
      towers: homeTowers.map((hv) => applyMat(el.m, hv)),
    };
  });
  // Deck generators + inverses — the moves the player's tile tracker `h` walks.
  const genMats: Mat3[] = [];
  for (const g of real.deckGenerators) { if (g) { genMats.push(g.m, inv3(g.m)); } }

  // ── glass disk floor + horizon ring ──────────────────────────────────────────
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x46658f, emissive: 0x0c1730, emissiveIntensity: 0.6, roughness: 0.5,
    metalness: 0.08, transparent: true, opacity: glassOpacity, side: THREE.DoubleSide,
  });
  const floor = new THREE.Mesh(new THREE.CircleGeometry(DISK_R, 96), floorMat);
  floor.rotation.x = -Math.PI / 2;
  root.add(floor);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x8ab4ff });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(DISK_R, 0.18, 8, 160), ringMat);
  ring.rotation.x = -Math.PI / 2;
  root.add(ring);

  // tiling edges — one LineSegments updated in place each frame
  const segCount = tiles.length * m * EDGE_SEGS;
  const edgePos = new Float32Array(segCount * 2 * 3);
  const edgeGeo = new THREE.BufferGeometry();
  edgeGeo.setAttribute('position', new THREE.BufferAttribute(edgePos, 3));
  const edgeMatHome = new THREE.LineBasicMaterial({ color: 0xbcd2ff, transparent: true, opacity: 0.9 });
  const lines = new THREE.LineSegments(edgeGeo, edgeMatHome);
  lines.frustumCulled = false;
  root.add(lines);

  // ── decor pool (each cell carries a tree + column variant per prop, plus a
  //    numbered corner marker per polygon vertex) ────────────────────────────────
  interface Cell { trees: THREE.Group; columns: THREE.Group; cornersTop: THREE.Group; cornersBottom: THREE.Group; }
  const cells: Cell[] = [];
  for (let i = 0; i < N_DECOR; i++) {
    const trees = new THREE.Group(), columns = new THREE.Group();
    decor.props.forEach((_, j) => { trees.add(decor.makeTop(j)); columns.add(decor.makeBottom(j)); });
    const cornersTop = new THREE.Group(), cornersBottom = new THREE.Group();
    for (let v = 0; v < nVerts; v++) {
      const col = cornerColor(v, nVerts);
      cornersTop.add(decor.makeCornerTop(v + 1, col));
      cornersBottom.add(decor.makeCornerBottom(v + 1, col));
    }
    trees.visible = false; columns.visible = false; cornersTop.visible = false; cornersBottom.visible = false;
    root.add(trees, columns, cornersTop, cornersBottom);
    cells.push({ trees, columns, cornersTop, cornersBottom });
  }
  // Decor is full-size near the player and shrinks by the conformal factor (1−r²)
  // with Poincaré radius — the correct way to keep a fixed *hyperbolic* size.
  const decorBase = 1;

  // ── the ink trail: stamps canonical in the HOME DOMAIN, drawn through the deck ─
  // A stamp is the player's tangent frame recorded as three cover points — the
  // position plus a point a small geodesic step AHEAD and one to the LEFT —
  // pulled back into the fundamental domain through h⁻¹ at lay time (the same
  // recipe as the flat presenter's sheet coordinates: when laid from the mirror
  // side, det(h)<0, the pull-back is genuinely mirror-handed). Per frame each
  // stamp is projected through the same nearest-tile transforms that place the
  // decor (Mtiles·γ), so EVERY visible tile shows the one canonical trail —
  // and because the canonical representatives never leave the domain, the trail
  // can neither outrun the rendered window nor blow up numerically (a stamp
  // stored in player-relative cover coords recedes like cosh(distance) and its
  // quotient images are unreachable through near-identity tiles — the old
  // disappearing-trail failure). Where the composed transform is orientation-
  // reversing the projected left lands on the right and the decal's derived
  // normal points DOWN — the print renders under the glass, mirror-reversed,
  // with no flags and no per-print side data. A footprint freezes every ~1.6
  // world units (3.2/DISK_R cover units).
  type Stamp = { p: Vec3; pf: Vec3; pl: Vec3 };
  const ink = makeInkTrail(TRAIL_MAX * N_DECOR);
  const inkMesh = new THREE.Mesh(ink.geometry, ink.material); inkMesh.frustumCulled = false;
  inkMesh.userData.ink = true;   // ink may legitimately read mirrored — exempt from the decor audit
  root.add(inkMesh);
  const stamps: Stamp[] = [];
  let lastFrozen: Vec3 | null = null;     // spacing reference (cover coords, folded with the player)
  let freshSlot = -1;                     // buffer slot of the freshest print's image nearest the player (probe)
  const pP = new THREE.Vector3(), pF = new THREE.Vector3(), pL = new THREE.Vector3();
  const fV = new THREE.Vector3(), lV = new THREE.Vector3(), nV = new THREE.Vector3();

  // ── player frame on the κ=−1 shell ───────────────────────────────────────────
  // Spawn at the in-domain point farthest from every landmark (so the player never
  // starts inside a tree or on the centre beacon).
  function clearSpawn(): Frame {
    let bu = 0.5, bv = 0.5, bd = -1;
    for (let cu = 0.15; cu <= 0.85; cu += 0.1) {
      for (let cv = 0.15; cv <= 0.85; cv += 0.1) {
        let mind = Infinity;
        for (const p of decor.props) mind = Math.min(mind, Math.hypot(cu - p.u, cv - p.v));
        if (mind > bd) { bd = mind; bu = cu; bv = cv; }
      }
    }
    return makeFrame(kappa, originTo(kappa, propHyper(bu, bv)));
  }
  let frame: Frame = clearSpawn();                 // det>0 always (controls never flip)
  let h: Mat3 = IDENTITY3;                          // deck element of the player's tile
  let detH = 1;
  let lastYaw = 0;
  const fwdW = new THREE.Vector3(1, 0, 0);         // re-centred ⇒ player always faces +X
  const tmp = new THREE.Vector3();

  function applyGlass() {
    const g = glassState(glassOpacity, GLASS);
    floorMat.opacity = g.opacity; floorMat.visible = g.visible; floorMat.depthWrite = g.depthWrite;
    floorMat.transparent = glassOpacity < 0.999; floorMat.needsUpdate = true;
    underVisible = g.showUnder;
  }
  applyGlass();

  function rebuildEdges() {
    let o = 0;
    for (const tile of tiles) {
      for (const pt of tile.edgePts) {
        projectM(Mtiles, pt, tmp);
        edgePos[o++] = tmp.x; edgePos[o++] = tmp.y + 0.02; edgePos[o++] = tmp.z;
      }
    }
    edgeGeo.attributes.position.needsUpdate = true;
    edgeGeo.computeBoundingSphere();
  }

  function placeDecor(order: { i: number }[]) {
    // tiles nearest the player on screen (their rendered centre nearest the disk
    // origin); the whole skin flips with det(h) so crossing a glide flips you.
    let used = 0;
    for (const { i } of order) {
      const tile = tiles[i];
      const cell = cells[used++];
      const flipped = detH * tile.det < 0;      // your side × the tile's side
      // the side you stand on grows UP from the glass floor; the OTHER face is the
      // same landmark mirrored DOWN below the floor, revealed when the glass clears
      // — so looking down through the floor shows the opposite side of the domain.
      const above = flipped ? cell.columns : cell.trees;
      const below = flipped ? cell.trees : cell.columns;
      above.visible = true;
      below.visible = underVisible;
      decor.props.forEach((_, j) => {
        const hp = tile.props[j];
        projectM(Mtiles, hp, tmp);
        const r2 = Math.min(0.97, poincareR2(Mtiles, hp));
        const sc = decorBase * (1 - r2);
        const aj = above.children[j] as THREE.Object3D;
        const bj = below.children[j] as THREE.Object3D;
        aj.position.copy(tmp); aj.scale.set(sc, sc, sc);
        bj.position.copy(tmp); bj.scale.set(sc, -sc, sc);   // mirror below the floor
      });
      // corner markers — same above/below split, placed at the inset-vertex points
      const aboveT = flipped ? cell.cornersBottom : cell.cornersTop;
      const belowT = flipped ? cell.cornersTop : cell.cornersBottom;
      aboveT.visible = true;
      belowT.visible = underVisible;
      tile.towers.forEach((tw, v) => {
        projectM(Mtiles, tw, tmp);
        const r2 = Math.min(0.97, poincareR2(Mtiles, tw));
        const sc = decorBase * (1 - r2);
        const aj = aboveT.children[v] as THREE.Object3D;
        const bj = belowT.children[v] as THREE.Object3D;
        aj.position.copy(tmp); aj.scale.set(sc, sc, sc);
        bj.position.copy(tmp); bj.scale.set(sc, -sc, sc);
      });
    }
    for (let k = used; k < cells.length; k++) {
      cells[k].trees.visible = false; cells[k].columns.visible = false;
      cells[k].cornersTop.visible = false; cells[k].cornersBottom.visible = false;
    }
  }

  /** Draw every stamp's image in each of the given tiles. The projected frame
   *  carries the chirality: through a det<0 composed transform the left vector
   *  lands on the right and the derived normal (f×l) points down — mirror ink
   *  under the glass, by geometry alone. */
  function rebuildInk(order: { i: number }[]) {
    let slot = 0;
    freshSlot = -1;
    let freshBest = Infinity;
    for (const { i } of order) {
      const M = mul(Mtiles, tiles[i].m);
      for (let s = 0; s < stamps.length; s++) {
        const st = stamps[s];
        if (poincareR2(M, st.p) > 0.992) continue;   // at the horizon — invisible
        projectM(M, st.p, pP); projectM(M, st.pf, pF); projectM(M, st.pl, pL);
        fV.subVectors(pF, pP); lV.subVectors(pL, pP);
        const sc = fV.length();
        if (sc < 1e-6) continue;
        nV.crossVectors(fV, lV).setLength(sc);       // ±up, conformally scaled
        if (s === stamps.length - 1) {               // freshest print: its image
          const d = pP.lengthSq();                   // nearest the player feeds
          if (d < freshBest) { freshBest = d; freshSlot = slot; } // the probe
        }
        ink.setQuad(slot++, pP, fV, lV, nV);
      }
    }
    ink.setCount(slot);
  }

  function update(input: CoverFrameInput, cam: THREE.PerspectiveCamera) {
    const { fwd: f, strafe, yaw, pitch, dt, moveSpeed, thirdPerson } = input;
    const dyaw = yaw - lastYaw; lastYaw = yaw;
    if (dyaw) frame = kTurn(frame, -dyaw);
    // ×2: near the (always re-centred) origin the Poincaré map compresses by the
    // factor tanh(d/2)≈d/2, so a raw step of moveSpeed·dt/DISK_R slides the ground
    // at only moveSpeed/2 world-units/sec — half the flat/spherical rate. Doubling
    // the step restores parity, so walking feels the same speed in every world.
    if (f) frame = kStep(frame, (2 * f * moveSpeed * dt) / DISK_R);
    if (strafe) frame = kStrafe(frame, -Math.PI / 2, (2 * strafe * moveSpeed * dt) / DISK_R);
    if (dyaw || f || strafe) frame = reorthonormalize(frame);

    // Walk the tile tracker `h` toward the player along the deck Cayley graph, so
    // the developed tiles stay around them (no walk-off). The player frame is left
    // alone (det > 0), so only the *world* flips through a glide, not the controls.
    let pPos = framePos(frame);
    for (let iter = 0; iter < 16; iter++) {
      let bestD = distance(kappa, pPos, applyMat(h, ORIGIN));
      let bestM: Mat3 | null = null;
      for (const gm of genMats) {
        const cand = mul(h, gm);
        const d = distance(kappa, pPos, applyMat(cand, ORIGIN));
        if (d < bestD - 1e-9) { bestD = d; bestM = cand; }
      }
      if (!bestM) break;
      h = bestM;
    }

    // ── Fold the player back into the home tile — the "crossing teleports you" rule.
    // Without this the frame walks off across the cover: on ℍ² its matrix entries grow
    // like cosh(distance), so after a few dozen tiles inv3(frame.g) goes singular and
    // the view blows up (the "loses stability if you stray from the start" failure).
    // `h` is the deck element of the tile the player now sits in; re-base both `frame`
    // and `h` by the nearest ORIENTATION-PRESERVING deck element D⁻¹ on the left. This
    // leaves the render transform Mtiles = inv3(frame.g)·h *exactly* invariant — the
    // camera teleports across the identified edge with no visible pop — while keeping
    // det(frame) > 0 (controls never invert) and the sign of det(h) (the sheet side you
    // are on) unchanged. The player is thus always inside the home polygon or its one
    // mirror neighbour ("one side or the other"), so the frame can never drift far.
    let D: Mat3 = h;
    if (det3(h) < 0) {
      // On a flipped tile: fold to the nearest orientation-preserving neighbour so D
      // stays det > 0 (keeps the frame right-handed) and the flipped skin still shows.
      let bestD = Infinity, bestM: Mat3 | null = null;
      for (const gm of genMats) {
        const cand = mul(h, gm);
        if (det3(cand) < 0) continue;
        const cd = distance(kappa, pPos, applyMat(cand, ORIGIN));
        if (cd < bestD) { bestD = cd; bestM = cand; }
      }
      D = bestM ?? h;
    }
    if (distance(kappa, ORIGIN, applyMat(D, ORIGIN)) > 1e-6) {
      const Dinv = inv3(D);
      frame = reorthonormalize({ kappa: frame.kappa, g: mul(Dinv, frame.g) });
      h = mul(Dinv, h);
      // The ink needs no carrying: stamps are canonical in the home domain, so a
      // fold (which changes only the frame/h bookkeeping, not the quotient) leaves
      // them untouched. Only the spacing reference, a player-relative cover point,
      // rides along.
      if (lastFrozen) lastFrozen = applyMat(Dinv, lastFrozen);
      pPos = framePos(frame);
    }

    detH = det3(h);
    Tview = inv3(frame.g);
    Mtiles = mul(Tview, h);

    // Freeze a footprint every ~1.6 world units: the player's frame as a stamp —
    // position + a geodesic step ahead + one whose PROJECTION lands on the
    // avatar's left — pulled back into the home domain through h⁻¹. Stamping is
    // a world-space act, so the world print is pulled back through the whole
    // render transform: h⁻¹ (mirror-handed ink when det(h)<0, exactly like the
    // flat presenter's flipped-face pull-back), and the cover→floor projection
    // (x,y) ↦ (X,Z), which is itself orientation-REVERSING under the fixed
    // camera (forward +X, up +Y ⇒ camera-right = +Z = cover-left), so the
    // pull-back of the avatar's left is the kernel-RIGHT direction (−π/2).
    // δ sets the decal's intrinsic size — chosen so the print is ~1 world unit
    // at the disk centre (it shrinks conformally outward).
    if (!lastFrozen || distance(kappa, lastFrozen, pPos) > 3.2 / DISK_R) {
      const delta = 2 / DISK_R;
      const di = inv3(h);
      if (stamps.length >= TRAIL_MAX) stamps.shift();
      stamps.push({
        p: applyMat(di, pPos),
        pf: applyMat(di, framePos(kStep(frame, delta))),
        pl: applyMat(di, framePos(kStrafe(frame, -Math.PI / 2, delta))),
      });
      lastFrozen = pPos;
    }

    // tiles nearest the player on screen — decor and ink share the same set
    const order = tiles
      .map((t, i) => ({ i, d: poincareR2(Mtiles, t.center) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, N_DECOR);

    rebuildEdges();
    placeDecor(order);
    rebuildInk(order);

    cam.up.copy(UP);
    if (thirdPerson) {
      cam.position.set(-camDist, 2.4 + pitch * 1.6, 0);
      cam.lookAt(0.6, 1.3, 0);
    } else {
      const cp = Math.cos(Math.max(-MAX_PITCH, Math.min(MAX_PITCH, pitch)));
      cam.position.set(0, EYE, 0);
      cam.lookAt(cp, EYE + Math.sin(pitch), 0);
    }
  }

  function pose(): PlayerPose {
    return { position: new THREE.Vector3(0, 0, 0), up: UP.clone(), forward: fwdW.clone() };
  }

  function chart(): SquareMapState {
    // the player's representative inside the home polygon = h⁻¹ · player, with the
    // side given by det(h) (flipped after crossing an odd number of glide edges).
    const di = inv3(h);
    const rep = applyMat(di, framePos(frame));               // in home domain
    const w = rep[2], k = 1 / (1 + w);
    const px = rep[0] * k, py = rep[1] * k;                  // Poincaré coords
    const repA = applyMat(di, framePos(kStep(frame, 0.08))); // a touch ahead
    const ka = 1 / (1 + repA[2]);
    let hx = repA[0] * ka - px, hz = repA[1] * ka - py;
    const hl = Math.hypot(hx, hz) || 1; hx /= hl; hz /= hl;
    return { u: (px + 1) / 2, v: (py + 1) / 2, hx, hz, flipped: detH < 0 };
  }

  function rebuildFloor() {
    floor.geometry.dispose(); floor.geometry = new THREE.CircleGeometry(DISK_R, 96);
    ring.geometry.dispose(); ring.geometry = new THREE.TorusGeometry(DISK_R, 0.18, 8, 160);
    scene.fog = new THREE.Fog(SKY, DISK_R * 1.1, DISK_R * 3.2);
    camera.far = DISK_R * 6; camera.updateProjectionMatrix();
  }

  return {
    kind: 'hyperbolic',
    update, pose, chart,
    // the freshest print's image nearest the player (their own tile's copy),
    // read in the character's frame (>0 ⇒ reads right-handed under the player)
    debugProbe: () => ink.chirality(freshSlot, null, fwdW, UP),
    clearTrail: () => { stamps.length = 0; lastFrozen = null; freshSlot = -1; ink.setCount(0); },
    setFloorOpacity: (o: number) => { glassOpacity = o; applyGlass(); },
    setCameraDistance: (d: number) => { camDist = d; },
    // stamps live in cover coordinates, which are scale-free — the ink survives
    // a disk rescale and simply re-projects at the new radius
    setSquareSize: (v: number) => { DISK_R = diskRadiusFor(v); rebuildFloor(); },
    dispose: () => {
      ink.dispose();
      floor.geometry.dispose(); floorMat.dispose();
      ring.geometry.dispose(); ringMat.dispose();
      edgeGeo.dispose(); edgeMatHome.dispose();
    },
  };
}
