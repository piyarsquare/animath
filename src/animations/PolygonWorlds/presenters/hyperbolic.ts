import * as THREE from 'three';
import { CoverModel, CoverFrameInput, CoverDeps, PlayerPose } from '../coverModel';
import { SquareMapState } from '../engineTypes';
import { glassState, GlassSpec } from '../glassSurface';
import { makeFootprintTrail } from '../footprints';
import { parseWord } from '../surfaceSchema';
import { realize, Realization } from '../lib/realize';
import { develop } from '../lib/develop';
import {
  Vec3, Mat3, makeFrame, Frame, framePos,
  stepForward as kStep, stepHeading as kStrafe, turn as kTurn, reorthonormalize,
  applyMat, inv3, distance, geodesicPoint, originTo, ORIGIN,
} from '../lib/cayleyKlein';

/**
 * The hyperbolic presenter for the χ<0 worlds (genus-2 octagon, 3-cross-cap …),
 * driven by the kernel at κ=−1 and rendered in the **Poincaré disk**.
 *
 * The player is a kernel {@link Frame} on the κ=−1 shell (the hyperboloid). The
 * scene is **re-centred on the player** every frame — the view isometry
 * `T = frame⁻¹` carries the player to the basepoint O — and every cover point is
 * mapped hyperboloid → Poincaré disk `(x,y)/(1+w)` → a flat **glass disk floor**
 * (radius `DISK_R`). Walking right-multiplies the frame (`stepForward`/`turn`), so
 * the whole hyperbolic tiling flows past a player who stays at the disk centre
 * facing +X — the standard hyperbolic first-person view.
 *
 * The tiles are the Fuchsian deck cosets from {@link develop}; their geodesic
 * edges draw the `{2n, 2n}` tiling out to the horizon (the disk boundary = the
 * circle at infinity). A small pool of decorated copies is re-assigned to the tiles
 * **nearest the player** each frame and scaled by the conformal factor `1−r²`, so
 * landmarks shrink toward the boundary exactly as hyperbolic distance demands. The
 * per-tile **trees↔columns skin follows `det(γ) < 0`** (the glide tiles of the
 * non-orientable worlds), straight from the kernel.
 */

const EYE = 1.7;
const MAX_PITCH = 1.3;
const TRAIL_MAX = 500;
const SKY = 0x070912;
const GLASS: GlassSpec = { showUnderBelow: 0.95 };
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

  let DISK_R = Math.max(34, c.squareSize * 1.4);  // world radius of the unit disk
  let glassOpacity = 0.35;

  camera.fov = 75; camera.near = 0.05; camera.far = DISK_R * 6; camera.updateProjectionMatrix();
  camera.up.set(0, 1, 0);
  scene.background = new THREE.Color(SKY);
  scene.fog = new THREE.Fog(SKY, DISK_R * 1.1, DISK_R * 3.2);

  // ── geometry helpers (hyperboloid → re-centred Poincaré disk → floor) ────────
  let T: Mat3 = inv3(makeFrame(kappa).g);          // view isometry = frame⁻¹

  /** Project a cover point (after the view isometry T) to a floor world position. */
  function project(Q: Vec3, out: THREE.Vector3): THREE.Vector3 {
    const x = T[0] * Q[0] + T[1] * Q[1] + T[2] * Q[2];
    const y = T[3] * Q[0] + T[4] * Q[1] + T[5] * Q[2];
    const w = T[6] * Q[0] + T[7] * Q[1] + T[8] * Q[2];
    const k = 1 / (1 + w);
    return out.set(x * k * DISK_R, 0, y * k * DISK_R);
  }
  /** Poincaré radius² of a cover point after T (0 at centre → 1 at the horizon). */
  function poincareR2(Q: Vec3): number {
    const x = T[0] * Q[0] + T[1] * Q[1] + T[2] * Q[2];
    const y = T[3] * Q[0] + T[4] * Q[1] + T[5] * Q[2];
    const w = T[6] * Q[0] + T[7] * Q[1] + T[8] * Q[2];
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

  // Precompute, per tile, the home-polygon edge sample points + prop positions
  // pushed by the deck element (fixed in cover coords; only T changes per frame).
  type TileGeo = { center: Vec3; det: number; edgePts: Vec3[]; props: Vec3[] };
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
      center: applyMat(el.m, ORIGIN),
      det: el.det(),
      edgePts,
      props: homeProps.map((hp) => applyMat(el.m, hp)),
    };
  });

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

  // ── decor pool (each cell carries a tree + column variant per prop) ──────────
  interface Cell { trees: THREE.Group; columns: THREE.Group; }
  const cells: Cell[] = [];
  for (let i = 0; i < N_DECOR; i++) {
    const trees = new THREE.Group(), columns = new THREE.Group();
    decor.props.forEach((_, j) => { trees.add(decor.makeTop(j)); columns.add(decor.makeBottom(j)); });
    trees.visible = false; columns.visible = false;
    root.add(trees, columns);
    cells.push({ trees, columns });
  }
  // Decor is full-size near the player and shrinks by the conformal factor (1−r²)
  // with Poincaré radius — the correct way to keep a fixed *hyperbolic* size.
  const decorBase = 1;

  // footprint trail — stored in COVER coords and re-projected each frame
  const foot = makeFootprintTrail(TRAIL_MAX);
  const footMesh = new THREE.Mesh(foot.geometry, foot.material); footMesh.frustumCulled = false;
  root.add(footMesh);
  const covTrail: Vec3[] = [];
  let lastTrailPos: Vec3 | null = null;

  // ── player frame on the κ=−1 shell ───────────────────────────────────────────
  let frame: Frame = makeFrame(kappa);             // identity ⇒ centre, facing +x
  let lastYaw = 0;
  const fwdW = new THREE.Vector3(1, 0, 0);         // re-centred ⇒ player always faces +X
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();

  function applyGlass() {
    const g = glassState(glassOpacity, GLASS);
    floorMat.opacity = g.opacity; floorMat.visible = g.visible; floorMat.depthWrite = g.depthWrite;
  }
  applyGlass();

  function rebuildEdges() {
    let o = 0;
    for (const tile of tiles) {
      for (const pt of tile.edgePts) {
        project(pt, tmp);
        edgePos[o++] = tmp.x; edgePos[o++] = tmp.y + 0.02; edgePos[o++] = tmp.z;
      }
    }
    edgeGeo.attributes.position.needsUpdate = true;
    edgeGeo.computeBoundingSphere();
  }

  function placeDecor() {
    // nearest deck cosets to the player (player = framePos; cosets fixed in cover)
    const pPos = framePos(frame);
    const order = tiles
      .map((t, i) => ({ i, d: distance(kappa, pPos, t.center) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, N_DECOR);
    let used = 0;
    for (const { i } of order) {
      const tile = tiles[i];
      const cell = cells[used++];
      const flipped = tile.det < 0;             // glide tile ⇒ swapped skin
      cell.trees.visible = flipped; cell.columns.visible = !flipped;
      const showT = cell.trees, showC = cell.columns;
      decor.props.forEach((_, j) => {
        const hp = tile.props[j];
        project(hp, tmp);
        const r2 = Math.min(0.97, poincareR2(hp));
        const sc = decorBase * (1 - r2);
        const tj = showT.children[j] as THREE.Object3D;
        const cj = showC.children[j] as THREE.Object3D;
        tj.position.copy(tmp); tj.scale.setScalar(sc);
        cj.position.copy(tmp); cj.scale.setScalar(sc);
      });
    }
    for (let k = used; k < cells.length; k++) { cells[k].trees.visible = false; cells[k].columns.visible = false; }
  }

  function rebuildTrail() {
    foot.clear();
    for (let i = 0; i < covTrail.length; i++) {
      project(covTrail[i], tmp);
      if (i + 1 < covTrail.length) project(covTrail[i + 1], tmp2);
      else tmp2.set(0, 0, 0);                     // last → toward the player (centre)
      tmp2.sub(tmp);
      if (tmp2.lengthSq() < 1e-6) tmp2.copy(fwdW);
      foot.append(tmp, tmp2.normalize(), UP);
    }
  }

  function update(input: CoverFrameInput, cam: THREE.PerspectiveCamera) {
    const { fwd: f, strafe, yaw, pitch, dt, moveSpeed, thirdPerson } = input;
    const dyaw = yaw - lastYaw; lastYaw = yaw;
    if (dyaw) frame = kTurn(frame, -dyaw);
    if (f) frame = kStep(frame, (f * moveSpeed * dt) / DISK_R);
    if (strafe) frame = kStrafe(frame, -Math.PI / 2, (strafe * moveSpeed * dt) / DISK_R);
    if (dyaw || f || strafe) frame = reorthonormalize(frame);
    T = inv3(frame.g);

    // record the trail in cover coords as the player advances
    const pPos = framePos(frame);
    if (!lastTrailPos || distance(kappa, lastTrailPos, pPos) > 0.12) {
      covTrail.push(pPos);
      if (covTrail.length > TRAIL_MAX) covTrail.shift();
      lastTrailPos = pPos;
    }

    rebuildEdges();
    placeDecor();
    rebuildTrail();

    cam.up.copy(UP);
    if (thirdPerson) {
      const D = 3.4;
      cam.position.set(-D, 2.4 + pitch * 1.6, 0);
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
    // representative of the player inside the home polygon: the coset element d
    // nearest the player, pulled back to centre.
    const pPos = framePos(frame);
    let best = 0, bestD = Infinity;
    for (let i = 0; i < tiles.length; i++) {
      const d = distance(kappa, pPos, tiles[i].center);
      if (d < bestD) { bestD = d; best = i; }
    }
    const di = inv3(elems[best].m);
    const rep = applyMat(di, pPos);                          // in home domain
    const w = rep[2], k = 1 / (1 + w);
    const px = rep[0] * k, py = rep[1] * k;                  // Poincaré coords
    // heading: advance the player's forward a touch, pull back the same way
    const fAhead = framePos(kStep(frame, 0.08));
    const repA = applyMat(di, fAhead);
    const ka = 1 / (1 + repA[2]);
    let hx = repA[0] * ka - px, hz = repA[1] * ka - py;
    const hl = Math.hypot(hx, hz) || 1; hx /= hl; hz /= hl;
    return { u: (px + 1) / 2, v: (py + 1) / 2, hx, hz, flipped: elems[best].det() < 0 };
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
    clearTrail: () => { covTrail.length = 0; lastTrailPos = null; foot.clear(); },
    setFloorOpacity: (o: number) => { glassOpacity = o; applyGlass(); },
    setSquareSize: (v: number) => { DISK_R = Math.max(34, v * 1.4); rebuildFloor(); },
    dispose: () => {
      foot.dispose();
      floor.geometry.dispose(); floorMat.dispose();
      ring.geometry.dispose(); ringMat.dispose();
      edgeGeo.dispose(); edgeMatHome.dispose();
    },
  };
}
