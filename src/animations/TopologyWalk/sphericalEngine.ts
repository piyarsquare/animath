import * as THREE from 'three';
import { makeFootprintTrail } from './footprints';
import { makeCharacter } from './character';
import { EngineDeps, EngineOptions, FrameInput, WorldEngine, SphereMapState } from './engine';

/**
 * The **positive-curvature** walk: a first-person stroll on a small planet.
 *
 *  - **Sphere (S²):** an ordinary round world. Walk a great circle and you come
 *    home after one full lap, facing the same way — orientable, χ = 2.
 *  - **Projective plane (ℝP²):** the very same sphere, but with **antipodal
 *    points identified** (x ∼ −x). The world is decorated antipodally-symmetrically
 *    (every landmark has an identical twin straight through the planet), so the two
 *    "ends" look the same; the giveaway is your **trail**, which reappears at the
 *    antipode **mirror-reversed** — because the antipodal map on S² reverses
 *    orientation. So a one-way trip to the "other side" flips you, and it takes a
 *    second lap to come back a true copy. χ = 1, non-orientable.
 *
 * Unlike the flat engine (which slides an infinite tiled plane under a fixed
 * player), here the **planet is fixed at the origin** and the camera walks around
 * it: positions are honest world coordinates, so the trail and landmarks simply
 * stay put. Movement integrates great circles by rotating the player's tangent
 * frame {up (radial), fwd, right}. Curvature is real and unavoidable (Gauss–Bonnet
 * pins the total to 2πχ); a bigger radius only dilutes it, which is why a large
 * planet feels locally flat while a small one shows its shape at a glance.
 */

const R0 = 30;         // default planet radius
const EYE = 1.7;
const TRAIL_MAX = 900;
const TRAIL_SPACING = 1.6;
const MAX_PITCH = 1.3;

interface Beacon { dir: THREE.Vector3; color: number; label: string }

// Landmarks scattered (deliberately *not* antipodally symmetric on their own, so
// the plain sphere looks different front-to-back; ℝP² adds the antipodal twins).
// Each carries a distinct colour and a numbered label so individual landmarks are
// easy to name and re-recognise after a lap — and so the mini-map can colour-code
// them to match.
const BEACONS: Beacon[] = [
  // Offset from the north pole so it sits a few metres to the *side* of the
  // spawn point (player starts at up = +Y) instead of swallowing the camera.
  { dir: new THREE.Vector3(0.22, 1, -0.18).normalize(), color: 0xff5a5a, label: '1' },
  { dir: new THREE.Vector3(1, 0.2, 0.1).normalize(), color: 0x5ad1ff, label: '2' },
  { dir: new THREE.Vector3(0.1, 0.1, 1).normalize(), color: 0x8aff6a, label: '3' },
  { dir: new THREE.Vector3(-0.8, 0.3, 0.6).normalize(), color: 0xffd24a, label: '4' },
  { dir: new THREE.Vector3(0.5, -0.5, -0.7).normalize(), color: 0xc08aff, label: '5' },
  { dir: new THREE.Vector3(-0.4, -0.7, 0.3).normalize(), color: 0xff9a3d, label: '6' },
  // A second wave, fleshing out the hemispheres so there is always a landmark in
  // view and the lat/long position is unambiguous.
  { dir: new THREE.Vector3(-1, 0.15, -0.2).normalize(), color: 0xff6ad5, label: '7' },
  { dir: new THREE.Vector3(0.3, 0.5, -1).normalize(), color: 0x4ad6c0, label: '8' },
  { dir: new THREE.Vector3(0.9, -0.3, 0.5).normalize(), color: 0xe0e060, label: '9' },
  { dir: new THREE.Vector3(0, -1, 0.05).normalize(), color: 0xb0b0c0, label: '10' },
  { dir: new THREE.Vector3(-0.5, 0.4, 0.9).normalize(), color: 0x7a9bff, label: '11' },
  { dir: new THREE.Vector3(0.6, 0.7, 0.4).normalize(), color: 0xff8a8a, label: '12' },
];

/** A camera-facing number badge for a beacon (so a landmark is identifiable from
 *  any direction). On the ℝP² antipodal twin the parent's point reflection flips
 *  the badge, which reads as the mirror-reversed label — exactly the cue we want. */
function makeLabelSprite(label: string, color: number, mats: THREE.Material[]): THREE.Sprite {
  const s = 128;
  const cvs = document.createElement('canvas'); cvs.width = cvs.height = s;
  const ctx = cvs.getContext('2d')!;
  ctx.clearRect(0, 0, s, s);
  ctx.beginPath(); ctx.arc(s / 2, s / 2, s * 0.42, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(8,10,16,0.78)'; ctx.fill();
  ctx.lineWidth = 7; ctx.strokeStyle = '#' + new THREE.Color(color).getHexString(); ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${Math.round(s * 0.5)}px system-ui, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(label, s / 2, s * 0.54);
  const tex = new THREE.CanvasTexture(cvs);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const mat = new THREE.SpriteMaterial({ map: tex, depthTest: true, transparent: true });
  mats.push(mat);
  const sp = new THREE.Sprite(mat);
  sp.scale.set(2.4, 2.4, 1);
  return sp;
}

/** A glowing marker that stands radially on the planet's surface, topped by a
 *  numbered badge. */
function makeBeacon(b: Beacon, geos: THREE.BufferGeometry[], mats: THREE.Material[]): THREE.Group {
  const g = new THREE.Group();
  const coneGeo = new THREE.ConeGeometry(0.9, 3, 16);
  const tipGeo = new THREE.SphereGeometry(0.55, 16, 12);
  // DoubleSide so the antipodal (reflected) twin used for ℝP² isn't back-face culled.
  const mat = new THREE.MeshStandardMaterial({ color: b.color, emissive: b.color, emissiveIntensity: 0.45, roughness: 0.5, side: THREE.DoubleSide });
  geos.push(coneGeo, tipGeo); mats.push(mat);
  const cone = new THREE.Mesh(coneGeo, mat); cone.position.y = 1.5; g.add(cone);
  const tip = new THREE.Mesh(tipGeo, mat); tip.position.y = 3.3; g.add(tip);
  const badge = makeLabelSprite(b.label, b.color, mats); badge.position.y = 5.0; g.add(badge);
  return g;
}

/**
 * Lat/long grid over a checkered land, bright enough to read clearly against the
 * near-black sky and dense enough that motion + rotation are legible. The checker
 * gives surface texture (so you can tell you're moving even between grid lines);
 * the emphasised equator + prime meridian give an absolute frame of reference.
 */
const LON = 24;  // longitude cells (meridians)
const LAT = 16;  // latitude cells (parallels)

// The two longitudinal hemispheres (lon ∈ [0,π) and [π,2π)) are antipodal twins:
// every antipodal pair {p, −p} has exactly one member in each. So on ℝP² they are
// the two sheets of the sphere's double cover — tint them to see yourself cross
// from one cover sheet to the other (the dividing meridians are the gluing circle).
const COVER_WARM = '#ff7a4d';
const COVER_COOL = '#4da6ff';
function planetTexture(coverTint: boolean): THREE.CanvasTexture {
  const s = 1024;
  const cvs = document.createElement('canvas'); cvs.width = cvs.height = s;
  const ctx = cvs.getContext('2d')!;

  // checkered terrain — two clearly-lit land tones
  const cw = s / LON, ch = s / LAT;
  for (let i = 0; i < LON; i++) {
    for (let j = 0; j < LAT; j++) {
      ctx.fillStyle = ((i + j) & 1) ? '#5c809b' : '#476a85';
      ctx.fillRect(i * cw, j * ch, cw + 1, ch + 1);
    }
  }

  // fine grid lines
  ctx.strokeStyle = '#9cc0d8'; ctx.lineWidth = 2;
  for (let i = 0; i <= LON; i++) {
    const x = (i / LON) * s;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, s); ctx.stroke();
  }
  for (let j = 0; j <= LAT; j++) {
    const y = (j / LAT) * s;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(s, y); ctx.stroke();
  }

  // cover tint: wash the two longitudinal hemispheres in warm / cool, leaving the
  // checker + grid legible underneath. The seam is the meridian great circle that
  // glues to its antipode on ℝP².
  if (coverTint) {
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = COVER_WARM; ctx.fillRect(0, 0, s / 2, s);
    ctx.fillStyle = COVER_COOL; ctx.fillRect(s / 2, 0, s / 2, s);
    ctx.globalAlpha = 1;
  }

  // emphasised equator (mid latitude row) + prime meridian (left edge)
  ctx.strokeStyle = '#e6f2fb'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(0, s / 2); ctx.lineTo(s, s / 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(2, 0); ctx.lineTo(2, s); ctx.stroke();
  // mark the hemisphere seam (the lon = π meridian, at the texture's mid-x) so the
  // gluing circle reads even before you tint.
  ctx.strokeStyle = 'rgba(230,242,251,0.6)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(s / 2, 0); ctx.lineTo(s / 2, s); ctx.stroke();

  const t = new THREE.CanvasTexture(cvs);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export function makeSphericalEngine(deps: EngineDeps, opts: EngineOptions): WorldEngine {
  const { scene, camera, renderer } = deps;
  let rp2 = opts.surfaceId === 'rp2';
  let radius = opts.planetRadius > 0 ? opts.planetRadius : R0;
  let colorCells = opts.colorCells;

  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  camera.fov = 75; camera.near = 0.05; camera.far = radius * 5; camera.updateProjectionMatrix();
  camera.up.set(0, 1, 0);

  scene.background = new THREE.Color(0x05070e);
  scene.fog = null;

  const root = new THREE.Group();
  scene.add(root);

  root.add(new THREE.AmbientLight(0xffffff, 0.5));
  const dir = new THREE.DirectionalLight(0xffffff, 0.85);
  dir.position.set(0.6, 0.8, 0.4);
  root.add(dir);

  const ownGeos: THREE.BufferGeometry[] = [];
  const ownMats: THREE.Material[] = [];

  // the planet (geometry is rebuilt when the radius slider changes; the texture is
  // swapped when the cover tint toggles)
  let planetTex = planetTexture(colorCells);
  const planetMat = new THREE.MeshStandardMaterial({ map: planetTex, color: 0xffffff, roughness: 0.9, metalness: 0.0 });
  ownMats.push(planetMat);
  const planet = new THREE.Mesh(new THREE.SphereGeometry(radius, 64, 48), planetMat);
  root.add(planet);

  // landmarks (one set on the surface). Each beacon group is kept so the radius
  // slider can re-seat it at the new surface; the ℝP² antipodal twins are a clone.
  const beaconGroups: THREE.Group[] = [];
  const landmarks = new THREE.Group();
  const upY = new THREE.Vector3(0, 1, 0);
  for (const b of BEACONS) {
    const g = makeBeacon(b, ownGeos, ownMats);
    g.position.copy(b.dir).multiplyScalar(radius);
    g.quaternion.setFromUnitVectors(upY, b.dir);
    beaconGroups.push(g);
    landmarks.add(g);
  }
  root.add(landmarks);

  // footprint trail (true world coords on the fixed planet)
  const foot = makeFootprintTrail(TRAIL_MAX);
  const footMain = new THREE.Mesh(foot.geometry, foot.material);
  footMain.frustumCulled = false;
  root.add(footMain);

  // ℝP² identification: an antipodal copy (point reflection through the centre,
  // which on S² is orientation-reversing → the twin trail reads mirrored) holding
  // the landmark twins and the trail's far-side image. Shown only for ℝP².
  const antipode = new THREE.Group();
  antipode.scale.set(-1, -1, -1);
  antipode.matrixAutoUpdate = true;
  let antiClone = landmarks.clone(true);
  antipode.add(antiClone);
  const footAnti = new THREE.Mesh(foot.geometry, foot.material);
  footAnti.frustumCulled = false;
  antipode.add(footAnti);
  antipode.visible = rp2;
  root.add(antipode);

  // Rebuild the planet shell + re-seat the landmarks at a new radius. A bigger
  // planet dilutes the curvature (Gauss–Bonnet pins ∫K dA = 2πχ regardless), so
  // it feels locally flatter; the eye height and stride length stay in fixed world
  // units. The trail is cleared because its points lived on the old shell.
  function setRadius(r: number) {
    if (r <= 0 || r === radius) return;
    radius = r;
    planet.geometry.dispose();
    planet.geometry = new THREE.SphereGeometry(radius, 64, 48);
    for (let i = 0; i < beaconGroups.length; i++) {
      beaconGroups[i].position.copy(BEACONS[i].dir).multiplyScalar(radius);
    }
    // The antipodal twins are a clone, so rebuild it from the re-seated originals.
    antipode.remove(antiClone);
    antiClone = landmarks.clone(true);
    antipode.add(antiClone);
    camera.far = radius * 5; camera.updateProjectionMatrix();
    clearTrail();
  }

  // Swap the planet skin between the plain checker and the cover-tinted one. The
  // landmarks/trail are unaffected; only the ground reveals which sheet you're on.
  function setColorCells(on: boolean) {
    if (on === colorCells) return;
    colorCells = on;
    mapState.colored = on;
    const next = planetTexture(colorCells);
    planetMat.map = next;
    planetMat.needsUpdate = true;
    planetTex.dispose();
    planetTex = next;
  }

  const character = makeCharacter();
  root.add(character.group);

  // player tangent frame on the sphere
  const up = new THREE.Vector3(0, 1, 0);   // radial (local up)
  const fwd = new THREE.Vector3(0, 0, -1); // heading (tangent)
  let stridePhase = 0;
  let lastYaw = 0;
  let trailLast: THREE.Vector3 | null = null;

  // scratch
  const nUp = new THREE.Vector3(), nFwd = new THREE.Vector3(), mr = new THREE.Vector3();
  const posW = new THREE.Vector3(), eye = new THREE.Vector3(), look = new THREE.Vector3();
  const camPos = new THREE.Vector3(), tmpRight = new THREE.Vector3();
  const basisM = new THREE.Matrix4();
  const northT = new THREE.Vector3(), eastT = new THREE.Vector3();

  // Mini-map state. Landmarks are fixed (lat = asin(y), lon = atan2(z, x)); the
  // player's lat/lon/bearing are refreshed each frame.
  const mapState: SphereMapState = {
    lat: Math.PI / 2, lon: 0, bearing: 0, rp2, colored: colorCells,
    landmarks: BEACONS.map((b) => ({
      lat: Math.asin(b.dir.y), lon: Math.atan2(b.dir.z, b.dir.x), color: b.color,
    })),
  };

  function orthonormalize() {
    up.normalize();
    fwd.addScaledVector(up, -fwd.dot(up)).normalize();
  }
  // move along the heading great circle (rotate up toward fwd)
  function stepForward(dθ: number) {
    const c = Math.cos(dθ), s = Math.sin(dθ);
    nUp.copy(up).multiplyScalar(c).addScaledVector(fwd, s);
    nFwd.copy(fwd).multiplyScalar(c).addScaledVector(up, -s);
    up.copy(nUp); fwd.copy(nFwd);
  }
  // strafe: rotate up toward the right tangent, keep facing (re-projected)
  function stepRight(dθ: number) {
    mr.copy(fwd).cross(up).normalize();           // player's right = fwd × up
    const c = Math.cos(dθ), s = Math.sin(dθ);
    nUp.copy(up).multiplyScalar(c).addScaledVector(mr, s);
    up.copy(nUp);
    orthonormalize();
  }
  // turn in place: rotate heading about the radial up (toward the right)
  function turn(α: number) {
    mr.copy(fwd).cross(up).normalize();
    const c = Math.cos(α), s = Math.sin(α);
    fwd.multiplyScalar(c).addScaledVector(mr, s).normalize();
  }

  function clearTrail() { foot.clear(); trailLast = null; }

  function frame(input: FrameInput) {
    const { dt, fwd: f, strafe, yaw, pitch, moveSpeed, thirdPerson } = input;

    const dyaw = yaw - lastYaw; lastYaw = yaw;
    if (dyaw) turn(dyaw);

    const moving = !!(f || strafe);
    if (f) stepForward((f * moveSpeed * dt) / radius);
    if (strafe) stepRight((strafe * moveSpeed * dt) / radius);
    if (moving) { orthonormalize(); stridePhase += dt * moveSpeed * 1.4; }

    posW.copy(up).multiplyScalar(radius);

    // Mini-map: latitude/longitude of the radial up, and the compass bearing of
    // the heading (0 = toward the north pole, +clockwise/eastward). north tangent
    // is +Y projected onto the tangent plane; east = up × north.
    mapState.lat = Math.asin(Math.max(-1, Math.min(1, up.y)));
    mapState.lon = Math.atan2(up.z, up.x);
    northT.set(0, 1, 0).addScaledVector(up, -up.y);
    if (northT.lengthSq() < 1e-6) { mapState.bearing = lastYaw; }
    else {
      northT.normalize();
      eastT.copy(up).cross(northT);
      mapState.bearing = Math.atan2(fwd.dot(eastT), fwd.dot(northT));
    }

    // avatar: feet on the surface, +Z = heading, +Y = radial up (matches flat)
    tmpRight.copy(up).cross(fwd).normalize();
    character.group.position.copy(posW);
    character.group.quaternion.setFromRotationMatrix(basisM.makeBasis(tmpRight, up, fwd));
    character.group.visible = thirdPerson;
    character.stride(stridePhase);

    if (thirdPerson) {
      const D = 4.5;
      camPos.copy(posW).addScaledVector(fwd, -D).addScaledVector(up, 2.6 + pitch * 1.6);
      camera.up.copy(up);
      camera.position.copy(camPos);
      camera.lookAt(posW.x + up.x * 1.2, posW.y + up.y * 1.2, posW.z + up.z * 1.2);
    } else {
      eye.copy(up).multiplyScalar(radius + EYE);
      const cp = Math.cos(Math.max(-MAX_PITCH, Math.min(MAX_PITCH, pitch)));
      look.copy(fwd).multiplyScalar(cp).addScaledVector(up, Math.sin(pitch));
      camera.up.copy(up);
      camera.position.copy(eye);
      camera.lookAt(eye.x + look.x, eye.y + look.y, eye.z + look.z);
    }

    if (!trailLast || trailLast.distanceTo(posW) > TRAIL_SPACING) {
      foot.append(posW, fwd, up);
      trailLast = posW.clone();
    }

    renderer.render(scene, camera);
  }

  return {
    family: 'spherical',
    frame,
    clearTrail,
    setSurface: (id) => { rp2 = id === 'rp2'; antipode.visible = rp2; mapState.rp2 = rp2; clearTrail(); },
    setRadius,
    setColorCells,
    getSphereState: () => mapState,
    dispose: () => {
      scene.remove(root);
      foot.dispose();
      character.dispose();
      planet.geometry.dispose();
      planetTex.dispose();
      ownGeos.forEach((g) => g.dispose());
      // Sprite badges own a CanvasTexture each; release those too.
      ownMats.forEach((m) => { (m as THREE.SpriteMaterial).map?.dispose?.(); m.dispose(); });
    },
  };
}
