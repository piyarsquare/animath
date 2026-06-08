import * as THREE from 'three';
import { CoverModel, CoverFrameInput, CoverDeps, PlayerPose } from '../coverModel';
import { SquareMapState } from '../engineTypes';
import { glassState, GlassSpec } from '../glassSurface';
import { makeFootprintTrail } from '../footprints';
import { rp2Square } from '../squareMap';
import { parseWord } from '../surfaceSchema';
import { realize, Realization } from '../lib/realize';
import { develop } from '../lib/develop';
import {
  Vec3, Mat3, makeFrame, Frame, framePos, frameForward,
  stepForward as kStep, stepHeading as kStrafe, turn as kTurn, reorthonormalize,
} from '../lib/cayleyKlein';

/**
 * The spherical presenter for the χ>0 worlds, now driven by the geometry kernel
 * instead of the ad-hoc `sphericalCover`. At κ = +1 the kernel's model shell
 * `⟨P,P⟩ = 1` (form diag(1,1,1)) *is* the unit sphere in ℝ³, so the player's pose
 * is a kernel {@link Frame} whose {@link framePos} lands directly on it (world =
 * `framePos · R`) and walking/turning are the kernel's `stepForward`/`turn`.
 *
 * From the edge word, {@link realize} decides the realization by the V-structure:
 *
 *  - **ℝP² (`a b a b`, V=2):** an *isometric* smooth hemisphere square — the
 *    fundamental domain is the z≥0 hemisphere, its 4 corners on the equator. The
 *    deck group is the **Z/2 antipodal** map, which {@link develop} returns as the
 *    one non-identity element (det < 0). That single `det<0` drives BOTH the
 *    trees↔columns skin-swap on the lower hemisphere AND the mirror-reversed
 *    footprint twin — replacing the cover's hard-coded `scale(-1,-1,-1)`/`negate()`.
 *  - **Sphere (`a a⁻¹ b b⁻¹`, V=3):** a **chart** (`real.chart`) — the decorated
 *    square is spread over the whole sphere (distances distort; disclosed in the
 *    explainer). Trees are the one outer skin you walk; columns are the inner shell
 *    seen only through the glass. The deck is trivial.
 *
 * Everything else (planet skin, seam ring, inner shell, glass, footprints, camera,
 * the square chart) is the shared chrome, matching the old cover so the render is
 * faithful. Intrinsic instruments read the kernel's true model metric, never the
 * chart square.
 */

const EYE = 1.7;
const MAX_PITCH = 1.3;
const TRAIL_MAX = 900;
const TRAIL_SPACING = 1.6;
const SKY = 0x05070e;
const GLASS: GlassSpec = { showUnderBelow: 0.97 };
const LON = 24, LAT = 16;

/** Lat/long checkered planet skin, bright enough to read movement against the sky. */
function planetTexture(): THREE.CanvasTexture {
  const s = 1024;
  const cvs = document.createElement('canvas'); cvs.width = cvs.height = s;
  const ctx = cvs.getContext('2d')!;
  const cw = s / LON, ch = s / LAT;
  for (let i = 0; i < LON; i++) for (let j = 0; j < LAT; j++) {
    ctx.fillStyle = ((i + j) & 1) ? '#5c809b' : '#476a85';
    ctx.fillRect(i * cw, j * ch, cw + 1, ch + 1);
  }
  ctx.strokeStyle = '#9cc0d8'; ctx.lineWidth = 2;
  for (let i = 0; i <= LON; i++) { const x = (i / LON) * s; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, s); ctx.stroke(); }
  for (let j = 0; j <= LAT; j++) { const y = (j / LAT) * s; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(s, y); ctx.stroke(); }
  ctx.strokeStyle = '#e6f2fb'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(0, s / 2); ctx.lineTo(s, s / 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(2, 0); ctx.lineTo(2, s); ctx.stroke();
  const t = new THREE.CanvasTexture(cvs);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

/** Square (sx,sy ∈ −1..1) → a unit direction on the z≥0 hemisphere — the inverse
 *  of {@link rp2Square}'s disk→square stretch, and exactly the chart whose corners
 *  are the realize() polygon's equator vertices. The seam great circle z=0 is the
 *  square boundary; the two faces are the two hemispheres. */
function sq2hemi(sx: number, sy: number): THREE.Vector3 {
  const h = Math.hypot(sx, sy);
  if (h < 1e-6) return new THREE.Vector3(0, 0, 1);
  const m = Math.max(Math.abs(sx), Math.abs(sy));
  const x = sx * m / h, y = sy * m / h;
  const z = Math.sqrt(Math.max(0, 1 - x * x - y * y));
  return new THREE.Vector3(x, y, z);
}

const v3 = (p: Vec3): THREE.Vector3 => new THREE.Vector3(p[0], p[1], p[2]);

/** Row-major kernel Mat3 → a THREE.Matrix4 (no translation; an O(3) isometry of
 *  the unit sphere). It commutes with the uniform world scale R, so applying it to
 *  world-space (×R) points is the same as applying it in the model. */
function mat3ToM4(m: Mat3): THREE.Matrix4 {
  return new THREE.Matrix4().set(
    m[0], m[1], m[2], 0,
    m[3], m[4], m[5], 0,
    m[6], m[7], m[8], 0,
    0, 0, 0, 1,
  );
}

export function makeSphericalPresenter(c: CoverDeps): CoverModel {
  const { deps, root, decor } = c;
  const { scene, camera } = deps;

  // ── kernel: realize the word → curvature, deck group, chart-or-isometric ─────
  const real: Realization = realize(parseWord(c.spec.word));
  const wholeSphere = real.chart;            // sphere: chart the whole shell
  const antipodal = !real.chart;             // ℝP²: hemisphere domain + Z/2 deck
  // The one non-identity deck element (the antipodal map for ℝP²); det < 0.
  const twin = develop(real).elements.find((e) => e.det() < 0) ?? null;
  const twinM4 = twin ? mat3ToM4(twin.m) : null;
  /** Apply the antipodal deck map to a unit model direction. */
  const deckDir = (d: THREE.Vector3): THREE.Vector3 =>
    twinM4 ? d.clone().applyMatrix4(twinM4) : d.clone().negate();

  let R = Math.max(12, c.squareSize);
  let glassOpacity = 0.35;

  camera.fov = 75; camera.near = 0.05; camera.far = R * 5; camera.updateProjectionMatrix();
  camera.up.set(0, 1, 0);
  scene.background = new THREE.Color(SKY);
  scene.fog = null;

  // planet
  const planetTex = planetTexture();
  const planetMat = new THREE.MeshStandardMaterial({ map: planetTex, color: 0xffffff, roughness: 0.9, metalness: 0, transparent: true, opacity: 1, side: THREE.DoubleSide });
  const planet = new THREE.Mesh(new THREE.SphereGeometry(R, 64, 48), planetMat);
  root.add(planet);

  // ── decor on the sphere ──────────────────────────────────────────────────────
  // SPHERE (orientable, the pillowcase fold): the front face (trees) becomes the
  // WHOLE outer surface — you only ever walk this one side — and the back face
  // (columns) is the whole inner shell, seen only through the glass, never walked.
  // ℝP² (non-orientable, antipodal): trees on the z≥0 hemisphere, columns on the
  // antipodal z<0 image, meeting at the seam great circle; crossing it / going
  // antipodal flips you.
  const upY = new THREE.Vector3(0, 1, 0);

  /** Spread a square (u,v) over the WHOLE sphere (lon×lat) — the sphere's one skin. */
  function fullDir(u: number, v: number): THREE.Vector3 {
    const lon = (u - 0.5) * Math.PI * 2, lat = (v - 0.5) * Math.PI, cl = Math.cos(lat);
    return new THREE.Vector3(cl * Math.cos(lon), Math.sin(lat), cl * Math.sin(lon));
  }

  const decorGroup = new THREE.Group();
  const trees: THREE.Group[] = [];
  const cols: THREE.Group[] = [];          // ℝP² only (columns wear the swapped skin on z<0)
  const treeDirs: THREE.Vector3[] = [];
  const colDirs: THREE.Vector3[] = [];     // ℝP² only
  decor.props.forEach((p, i) => {
    const td = antipodal ? sq2hemi((p.u - 0.5) * 2, (p.v - 0.5) * 2) : fullDir(p.u, p.v);
    treeDirs.push(td);
    const tree = decor.makeTree(i); trees.push(tree); decorGroup.add(tree);
    if (antipodal) {
      colDirs.push(deckDir(td));           // antipodal deck image (det < 0 ⇒ swapped skin)
      const col = decor.makeColumn(i); cols.push(col); decorGroup.add(col);
    }
  });
  root.add(decorGroup);

  // seam ring (ℝP² only): the z=0 great circle where the two skins meet.
  const seamMat = new THREE.MeshStandardMaterial({ color: 0xffe08a, emissive: 0xffe08a, emissiveIntensity: 0.4, roughness: 0.5 });
  const seam = antipodal ? new THREE.Mesh(new THREE.TorusGeometry(R, 0.12, 8, 96), seamMat) : null;
  if (seam) root.add(seam);

  // footprint trail (true world coords on the fixed planet)
  const foot = makeFootprintTrail(TRAIL_MAX);
  const footMesh = new THREE.Mesh(foot.geometry, foot.material); footMesh.frustumCulled = false;
  root.add(footMesh);
  let trailLast: THREE.Vector3 | null = null;

  function placeDecor() {
    decor.props.forEach((_, i) => {
      trees[i].position.copy(treeDirs[i]).multiplyScalar(R);
      trees[i].quaternion.setFromUnitVectors(upY, treeDirs[i]);
      if (antipodal) {
        cols[i].position.copy(colDirs[i]).multiplyScalar(R);
        cols[i].quaternion.setFromUnitVectors(upY, colDirs[i]);
      }
    });
    if (seam) { seam.geometry.dispose(); seam.geometry = new THREE.TorusGeometry(R, 0.12, 8, 96); }
  }
  placeDecor();

  // ℝP² antipodal twin of the decor + trail, rendered through the kernel deck
  // element (det < 0 ⇒ orientation-reversing → the twin trail reads mirrored). The
  // plain sphere has no such identification.
  const antipode = new THREE.Group();
  antipode.matrixAutoUpdate = false;
  if (twinM4) antipode.matrix.copy(twinM4);
  antipode.visible = antipodal;
  let antiClone: THREE.Group | null = null;
  if (antipodal) {
    const footAnti = new THREE.Mesh(foot.geometry, foot.material); footAnti.frustumCulled = false;
    antipode.add(footAnti);
    antiClone = decorGroup.clone(true);
    antipode.add(antiClone);
    root.add(antipode);
  }

  // ── inner shell: the OTHER face, view-only through the glass planet ───────────
  // Sphere: the whole columns back-face (the folded-away side). ℝP²: the opposite
  // skin of each landmark (a column inside every tree, a tree inside every column).
  const K_IN = 0.997;
  const inner = new THREE.Group();
  inner.visible = false;
  const innerProps: { g: THREE.Group; dir: THREE.Vector3 }[] = [];
  decor.props.forEach((_, i) => {
    const ic = decor.makeColumn(i); inner.add(ic); innerProps.push({ g: ic, dir: treeDirs[i].clone() }); // column under each tree
    if (antipodal) {
      const it = decor.makeTree(i); inner.add(it); innerProps.push({ g: it, dir: colDirs[i].clone() });  // tree under each column
    }
  });
  root.add(inner);
  function placeInner() {
    for (const { g, dir } of innerProps) {
      g.position.copy(dir).multiplyScalar(R * K_IN);
      g.quaternion.setFromUnitVectors(upY, dir.clone().negate()); // hang inward
    }
  }
  placeInner();

  function applyGlass() {
    const g = glassState(glassOpacity, GLASS);
    planetMat.opacity = g.opacity;
    planetMat.depthWrite = g.depthWrite;
    planetMat.transparent = glassOpacity < 0.999;
    planetMat.needsUpdate = true;
    inner.visible = g.showUnder;
  }
  applyGlass();

  // ── player pose as a kernel Frame on the κ=+1 shell (the unit sphere) ─────────
  // Start pose = the old cover's: position +y, forward −z, left −x. The frame
  // matrix has columns [forward | left | position]; this rotation reaches it with
  // det = +1 (orientation-preserving), so the initial framing matches the baseline.
  let frame: Frame = makeFrame(1, [0, -1, 0, 0, 0, 1, -1, 0, 0]);
  let lastYaw = 0;
  const posU = new THREE.Vector3(), fwdU = new THREE.Vector3();
  const posW = new THREE.Vector3(), eye = new THREE.Vector3(), look = new THREE.Vector3();
  const camPos = new THREE.Vector3();

  /** Refresh the cached world-space pose vectors from the kernel frame. */
  function syncPose() {
    posU.copy(v3(framePos(frame)));            // unit point on the shell = radial up
    fwdU.copy(v3(frameForward(frame)));        // unit tangent forward
    posW.copy(posU).multiplyScalar(R);
  }
  syncPose();

  function update(input: CoverFrameInput, cam: THREE.PerspectiveCamera) {
    const { fwd: f, strafe, yaw, pitch, dt, moveSpeed, thirdPerson } = input;
    const dyaw = yaw - lastYaw; lastYaw = yaw;
    // Walking is in model arc length: world distance / R (the shell has radius 1).
    if (dyaw) frame = kTurn(frame, -dyaw);
    if (f) frame = kStep(frame, (f * moveSpeed * dt) / R);
    if (strafe) frame = kStrafe(frame, -Math.PI / 2, (strafe * moveSpeed * dt) / R);
    if (dyaw || f || strafe) frame = reorthonormalize(frame);
    syncPose();

    cam.up.copy(posU);
    if (thirdPerson) {
      const D = 4.5;
      camPos.copy(posW).addScaledVector(fwdU, -D).addScaledVector(posU, 2.6 + pitch * 1.6);
      cam.position.copy(camPos);
      cam.lookAt(posW.x + posU.x * 1.2, posW.y + posU.y * 1.2, posW.z + posU.z * 1.2);
    } else {
      eye.copy(posU).multiplyScalar(R + EYE);
      const cp = Math.cos(Math.max(-MAX_PITCH, Math.min(MAX_PITCH, pitch)));
      look.copy(fwdU).multiplyScalar(cp).addScaledVector(posU, Math.sin(pitch));
      cam.position.copy(eye);
      cam.lookAt(eye.x + look.x, eye.y + look.y, eye.z + look.z);
    }

    if (!trailLast || trailLast.distanceTo(posW) > TRAIL_SPACING) {
      foot.append(posW, fwdU, posU);
      trailLast = posW.clone();
    }
  }

  function pose(): PlayerPose {
    return { position: posW.clone(), up: posU.clone(), forward: fwdU.clone() };
  }

  function chart(): SquareMapState {
    // The chart's representative (z≥0) flips for z<0; that flip is a real mirror
    // *sheet* only on ℝP² (non-orientable). The plain sphere is orientable — there
    // is no mirror side — so its marker never turns amber.
    const rep = posU.z < 0;
    const [sx, sy] = rp2Square(posU.x, posU.y, posU.z, rep);
    const e = 0.06, ce = Math.cos(e), se = Math.sin(e);
    let ax = posU.x * ce + fwdU.x * se, ay = posU.y * ce + fwdU.y * se, az = posU.z * ce + fwdU.z * se;
    const al = Math.hypot(ax, ay, az) || 1; ax /= al; ay /= al; az /= al;
    const [qx, qy] = rp2Square(ax, ay, az, rep);
    let hx = qx - sx, hz = qy - sy; const hl = Math.hypot(hx, hz) || 1; hx /= hl; hz /= hl;
    return { u: (sx + 1) / 2, v: (sy + 1) / 2, hx, hz, flipped: antipodal && rep };
  }

  function setRadius(r: number) {
    if (r <= 0 || r === R) return;
    R = r;
    planet.geometry.dispose();
    planet.geometry = new THREE.SphereGeometry(R, 64, 48);
    placeDecor();
    placeInner();
    if (antipodal && antiClone) {
      antipode.remove(antiClone);
      antiClone = decorGroup.clone(true);
      antipode.add(antiClone);
    }
    camera.far = R * 5; camera.updateProjectionMatrix();
    foot.clear(); trailLast = null;
    syncPose();
  }

  return {
    kind: 'spherical',
    update, pose, chart,
    clearTrail: () => { foot.clear(); trailLast = null; },
    setFloorOpacity: (o: number) => { glassOpacity = o; applyGlass(); },
    setRadius,
    dispose: () => {
      foot.dispose();
      planet.geometry.dispose(); planetTex.dispose(); planetMat.dispose();
      seam?.geometry.dispose(); seamMat.dispose();
    },
  };
}
