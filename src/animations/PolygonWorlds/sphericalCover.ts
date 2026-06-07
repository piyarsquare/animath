import * as THREE from 'three';
import { CoverModel, CoverFrameInput, CoverDeps, PlayerPose } from './coverModel';
import { SquareMapState } from './engineTypes';
import { glassState, GlassSpec } from './glassSurface';
import { makeFootprintTrail } from './footprints';
import { rp2Square } from './squareMap';

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
 *  of {@link rp2Square}'s disk→square stretch. The seam great circle z=0 is the
 *  square boundary; the two faces are the two hemispheres. */
function sq2hemi(sx: number, sy: number): THREE.Vector3 {
  const h = Math.hypot(sx, sy);
  if (h < 1e-6) return new THREE.Vector3(0, 0, 1);
  const m = Math.max(Math.abs(sx), Math.abs(sy));
  const x = sx * m / h, y = sy * m / h;
  const z = Math.sqrt(Math.max(0, 1 - x * x - y * y));
  return new THREE.Vector3(x, y, z);
}

/**
 * The spherical cover for the χ>0 worlds. The planet is fixed at the origin and
 * the camera walks great circles around it by rotating the tangent frame
 * {up (radial), fwd}. The shared decorated square is charted onto the planet —
 * trees on the z≥0 hemisphere, columns antipodally on z<0, meeting at the seam
 * great circle. **ℝP²** identifies antipodal points (x∼−x): an antipodal twin of
 * the decor + trail makes the trail return mirror-reversed. **Sphere** is the
 * same planet without that identification.
 */
export function makeSphericalCover(c: CoverDeps): CoverModel {
  const { deps, root, decor } = c;
  const { scene, camera } = deps;
  const rp2 = c.spec.id === 'rp2';
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

  // decor charted onto the sphere: trees on z≥0, columns at the antipode (z≤0)
  const upY = new THREE.Vector3(0, 1, 0);
  const dirs: THREE.Vector3[] = decor.props.map((p) => sq2hemi((p.u - 0.5) * 2, (p.v - 0.5) * 2));
  const decorGroup = new THREE.Group();
  const trees: THREE.Group[] = [];
  const cols: THREE.Group[] = [];
  decor.props.forEach((_, i) => {
    const tree = decor.makeTree(i); trees.push(tree); decorGroup.add(tree);
    const col = decor.makeColumn(i); cols.push(col); decorGroup.add(col);
  });
  root.add(decorGroup);

  // seam ring (z=0 great circle, the boundary of the square / where skins meet)
  const seamMat = new THREE.MeshStandardMaterial({ color: 0xffe08a, emissive: 0xffe08a, emissiveIntensity: 0.4, roughness: 0.5 });
  const seam = new THREE.Mesh(new THREE.TorusGeometry(R, 0.12, 8, 96), seamMat);
  root.add(seam);

  // footprint trail (true world coords on the fixed planet)
  const foot = makeFootprintTrail(TRAIL_MAX);
  const footMesh = new THREE.Mesh(foot.geometry, foot.material); footMesh.frustumCulled = false;
  root.add(footMesh);
  let trailLast: THREE.Vector3 | null = null;

  function placeDecor() {
    decor.props.forEach((_, i) => {
      const d = dirs[i];
      trees[i].position.copy(d).multiplyScalar(R);
      trees[i].quaternion.setFromUnitVectors(upY, d);
      const nd = d.clone().negate();
      cols[i].position.copy(nd).multiplyScalar(R);
      cols[i].quaternion.setFromUnitVectors(upY, nd);
    });
    seam.geometry.dispose();
    seam.geometry = new THREE.TorusGeometry(R, 0.12, 8, 96);
  }
  placeDecor();

  // ℝP²: an antipodal twin (point reflection through the centre, orientation-
  // reversing → the twin trail reads mirrored) holding clones of the decor + trail.
  const antipode = new THREE.Group();
  antipode.scale.set(-1, -1, -1);
  antipode.visible = rp2;
  const footAnti = new THREE.Mesh(foot.geometry, foot.material); footAnti.frustumCulled = false;
  antipode.add(footAnti);
  let antiClone = decorGroup.clone(true);
  antipode.add(antiClone);
  root.add(antipode);

  function applyGlass() {
    const g = glassState(glassOpacity, GLASS);
    planetMat.opacity = g.opacity;
    planetMat.depthWrite = g.depthWrite;
    planetMat.transparent = glassOpacity < 0.999;
    planetMat.needsUpdate = true;
  }
  applyGlass();

  // ── player tangent frame on the sphere ──────────────────────────────────────
  const up = new THREE.Vector3(0, 1, 0);
  const fwd = new THREE.Vector3(0, 0, -1);
  let lastYaw = 0;
  const nUp = new THREE.Vector3(), nFwd = new THREE.Vector3(), mr = new THREE.Vector3();
  const posW = new THREE.Vector3(), eye = new THREE.Vector3(), look = new THREE.Vector3();
  const camPos = new THREE.Vector3();

  function orthonormalize() { up.normalize(); fwd.addScaledVector(up, -fwd.dot(up)).normalize(); }
  function stepForward(d: number) {
    const cs = Math.cos(d), sn = Math.sin(d);
    nUp.copy(up).multiplyScalar(cs).addScaledVector(fwd, sn);
    nFwd.copy(fwd).multiplyScalar(cs).addScaledVector(up, -sn);
    up.copy(nUp); fwd.copy(nFwd);
  }
  function stepRight(d: number) {
    mr.copy(fwd).cross(up).normalize();
    const cs = Math.cos(d), sn = Math.sin(d);
    nUp.copy(up).multiplyScalar(cs).addScaledVector(mr, sn);
    up.copy(nUp); orthonormalize();
  }
  function turn(a: number) {
    mr.copy(fwd).cross(up).normalize();
    fwd.multiplyScalar(Math.cos(a)).addScaledVector(mr, Math.sin(a)).normalize();
  }

  function update(input: CoverFrameInput, cam: THREE.PerspectiveCamera) {
    const { fwd: f, strafe, yaw, pitch, dt, moveSpeed, thirdPerson } = input;
    const dyaw = yaw - lastYaw; lastYaw = yaw;
    if (dyaw) turn(dyaw);
    if (f) stepForward((f * moveSpeed * dt) / R);
    if (strafe) stepRight((strafe * moveSpeed * dt) / R);
    if (f || strafe) orthonormalize();

    posW.copy(up).multiplyScalar(R);

    cam.up.copy(up);
    if (thirdPerson) {
      const D = 4.5;
      camPos.copy(posW).addScaledVector(fwd, -D).addScaledVector(up, 2.6 + pitch * 1.6);
      cam.position.copy(camPos);
      cam.lookAt(posW.x + up.x * 1.2, posW.y + up.y * 1.2, posW.z + up.z * 1.2);
    } else {
      eye.copy(up).multiplyScalar(R + EYE);
      const cp = Math.cos(Math.max(-MAX_PITCH, Math.min(MAX_PITCH, pitch)));
      look.copy(fwd).multiplyScalar(cp).addScaledVector(up, Math.sin(pitch));
      cam.position.copy(eye);
      cam.lookAt(eye.x + look.x, eye.y + look.y, eye.z + look.z);
    }

    if (!trailLast || trailLast.distanceTo(posW) > TRAIL_SPACING) {
      foot.append(posW, fwd, up);
      trailLast = posW.clone();
    }
  }

  function pose(): PlayerPose {
    return { position: up.clone().multiplyScalar(R), up: up.clone(), forward: fwd.clone() };
  }

  function chart(): SquareMapState {
    const flip = up.z < 0;
    const [sx, sy] = rp2Square(up.x, up.y, up.z, flip);
    const e = 0.06, ce = Math.cos(e), se = Math.sin(e);
    let ax = up.x * ce + fwd.x * se, ay = up.y * ce + fwd.y * se, az = up.z * ce + fwd.z * se;
    const al = Math.hypot(ax, ay, az) || 1; ax /= al; ay /= al; az /= al;
    const [qx, qy] = rp2Square(ax, ay, az, flip);
    let hx = qx - sx, hz = qy - sy; const hl = Math.hypot(hx, hz) || 1; hx /= hl; hz /= hl;
    return { u: (sx + 1) / 2, v: (sy + 1) / 2, hx, hz, flipped: flip };
  }

  function setRadius(r: number) {
    if (r <= 0 || r === R) return;
    R = r;
    planet.geometry.dispose();
    planet.geometry = new THREE.SphereGeometry(R, 64, 48);
    placeDecor();
    antipode.remove(antiClone);
    antiClone = decorGroup.clone(true);
    antipode.add(antiClone);
    camera.far = R * 5; camera.updateProjectionMatrix();
    foot.clear(); trailLast = null;
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
      seam.geometry.dispose(); seamMat.dispose();
    },
  };
}
