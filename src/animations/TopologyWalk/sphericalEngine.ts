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

// The two cover hemispheres are keyed on sign(z): trees where z>0, columns where
// z<0, so the seam is the z=0 meridian great circle (through both poles). The
// antipodal map negates z, so it swaps the skins — on ℝP² every glued pair {p,−p}
// is a tree on one sheet and a column on the other, exactly the Klein flip wrapped
// onto a sphere. (The same sign(z) split is where the square-map chart's
// representative flips, so all the readouts agree.)
function planetTexture(): THREE.CanvasTexture {
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

  // emphasised equator (mid latitude row) + prime meridian (left edge)
  ctx.strokeStyle = '#e6f2fb'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(0, s / 2); ctx.lineTo(s, s / 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(2, 0); ctx.lineTo(2, s); ctx.stroke();

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
  let showInner = opts.innerShell;
  // Twin shell radius: "same radius" (mirror, on the glass's inner face) vs the
  // shrunk nested shell. The antipodal map −I is an isometry, so the honest twin is
  // the same size — the nested shell is just an exploded view to separate it.
  let innerSameRadius = opts.innerSameRadius;
  // Glass opacity of the outer planet while the inner shell is shown (shared with
  // the flat worlds' floor-opacity knob); lower it to see further inside.
  let glassOpacity = opts.floorOpacity;

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

  // the planet (geometry is rebuilt when the radius slider changes)
  const planetTex = planetTexture();
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

  // ── Cover skins: a forest on the z>0 sheet, a colonnade on z<0 ───────────────
  // Generic trees and columns marking the two cover hemispheres. They are placed
  // in antipodal pairs (tree at d, column at −d), so on ℝP² every glued point {d,−d}
  // is a tree on one sheet and a column on the other — the Klein flip on a sphere.
  // A glowing ring marks the z=0 seam great circle where the two skins meet.
  const SKIN_N = 30;
  const treeTrunkGeo = new THREE.CylinderGeometry(0.18, 0.26, 1.6, 8);
  const treeLeafGeo = new THREE.ConeGeometry(0.9, 2.2, 10);
  const colGeo = new THREE.CylinderGeometry(0.42, 0.42, 2.6, 12);
  const treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: 0.9 });
  const treeLeafMat = new THREE.MeshStandardMaterial({ color: 0x3f9a48, roughness: 0.8 });
  const colMat = new THREE.MeshStandardMaterial({ color: 0xc2cad6, roughness: 0.65 });
  ownGeos.push(treeTrunkGeo, treeLeafGeo, colGeo);
  ownMats.push(treeTrunkMat, treeLeafMat, colMat);
  const makeTree = () => {
    const g = new THREE.Group();
    const t = new THREE.Mesh(treeTrunkGeo, treeTrunkMat); t.position.y = 0.8; g.add(t);
    const f = new THREE.Mesh(treeLeafGeo, treeLeafMat); f.position.y = 2.3; g.add(f);
    return g;
  };
  const makeColumn = () => {
    const g = new THREE.Group();
    const c = new THREE.Mesh(colGeo, colMat); c.position.y = 1.3; g.add(c);
    return g;
  };

  const skins = new THREE.Group();
  const skinProps: { group: THREE.Group; dir: THREE.Vector3 }[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < SKIN_N; i++) {
    const zc = (i + 0.5) / SKIN_N;            // hemisphere z ∈ (0,1]
    const rr = Math.sqrt(1 - zc * zc), th = golden * i;
    const d = new THREE.Vector3(rr * Math.cos(th), rr * Math.sin(th), zc).normalize();
    const tree = makeTree(); skins.add(tree); skinProps.push({ group: tree, dir: d.clone() });
    const col = makeColumn(); skins.add(col); skinProps.push({ group: col, dir: d.clone().negate() });
  }
  const seamMat = new THREE.MeshStandardMaterial({ color: 0xffe08a, emissive: 0xffe08a, emissiveIntensity: 0.4, roughness: 0.5 });
  ownMats.push(seamMat);
  const seamRing = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.12, 8, 96), seamMat);
  skins.add(seamRing);
  function placeSkins() {
    for (const sp of skinProps) {
      sp.group.position.copy(sp.dir).multiplyScalar(radius);
      sp.group.quaternion.setFromUnitVectors(upY, sp.dir);
    }
    seamRing.geometry.dispose();
    seamRing.geometry = new THREE.TorusGeometry(radius, 0.12, 8, 96);
  }
  placeSkins();
  skins.visible = colorCells;
  root.add(skins);

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

  // ── "The other side, inside" ──────────────────────────────────────────────
  // The ℝP² gluing carried on a second sphere via the antipodal map T(x) = −k·x.
  // With k = 1 this is the true gluing: the antipodal map is an isometry, so the
  // twin is the SAME size as the planet, sharing its surface — you stand on the
  // outer face (normal out) and the twin lives on the inner face (normal in), the
  // spherical glass-floor + mirrored-underside. We render it a hair inside
  // (k = SAME) so the two faces don't z-fight. The shrunk shell (k = NEST) is the
  // same thing exploded inward, to separate the twin from your feet.
  // Either way the twin points radially INWARD (its up-normal opposes yours): −I
  // already lands your antipode −d straight underfoot and reverses orientation;
  // aiming each twin inward parks that reversal on the vertical axis, so it reads
  // as a mirror/reflection of you hanging just under the glass.
  const INNER_K_SAME = 0.98;
  const INNER_K_NEST = 0.52;
  let innerK = innerSameRadius ? INNER_K_SAME : INNER_K_NEST;
  const innerPlanetMat = new THREE.MeshStandardMaterial({ map: planetTex, color: 0x9fb4c8, roughness: 0.9, metalness: 0.0, side: THREE.DoubleSide });
  ownMats.push(innerPlanetMat);
  const innerPlanet = new THREE.Mesh(new THREE.SphereGeometry(radius * innerK, 48, 32), innerPlanetMat);
  root.add(innerPlanet);

  const inner = new THREE.Group();
  inner.scale.setScalar(-innerK);
  let innerClone = landmarks.clone(true);
  function orientInnerClone() {
    for (let i = 0; i < innerClone.children.length && i < BEACONS.length; i++) {
      // point the twin radially inward (normal reversed) by aiming local +y at −dir;
      // the group's −k scale then turns that into "up = toward the planet centre".
      innerClone.children[i].quaternion.setFromUnitVectors(upY, BEACONS[i].dir.clone().negate());
    }
  }
  orientInnerClone();
  inner.add(innerClone);
  const footInner = new THREE.Mesh(foot.geometry, foot.material);
  footInner.frustumCulled = false;
  inner.add(footInner);
  root.add(inner);

  // The inner shell is only meaningful where antipodes are actually glued (ℝP²).
  // Showing it turns the outer planet to glass so the inner world reads through.
  function applyInnerShell() {
    const on = showInner && rp2;
    inner.visible = on;
    innerPlanet.visible = on;
    if (on) {
      planetMat.transparent = true;
      planetMat.opacity = glassOpacity;
      planetMat.side = THREE.DoubleSide;
      planetMat.depthWrite = glassOpacity >= 0.98;
    } else {
      planetMat.transparent = false;
      planetMat.opacity = 1;
      planetMat.side = THREE.FrontSide;
      planetMat.depthWrite = true;
    }
    planetMat.needsUpdate = true;
  }
  applyInnerShell();

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
    // The antipodal twins (outer far side) and the inner-shell landmarks are both
    // clones, so rebuild them from the re-seated originals; resize the inner shell.
    antipode.remove(antiClone);
    antiClone = landmarks.clone(true);
    antipode.add(antiClone);
    inner.remove(innerClone);
    innerClone = landmarks.clone(true);
    orientInnerClone();
    inner.add(innerClone);
    innerPlanet.geometry.dispose();
    innerPlanet.geometry = new THREE.SphereGeometry(radius * innerK, 48, 32);
    placeSkins();
    camera.far = radius * 5; camera.updateProjectionMatrix();
    clearTrail();
  }

  // Show / hide the cover skins (trees ⇄ columns + the seam ring). The landmarks
  // and trail are unaffected; only the terrain reveals which cover sheet you're on.
  function setColorCells(on: boolean) {
    colorCells = on;
    mapState.colored = on;
    skins.visible = on;
  }

  // Toggle the inner co-identification shell (and the outer planet's glassiness).
  function setInnerShell(on: boolean) { showInner = on; applyInnerShell(); }
  function setFloorOpacity(o: number) { glassOpacity = o; applyInnerShell(); }
  // Switch the twin between same-radius (mirror, on the inner face) and the shrunk
  // nested shell. Only the radius changes; the twin keeps its inward orientation.
  function setInnerSameRadius(on: boolean) {
    innerSameRadius = on;
    innerK = innerSameRadius ? INNER_K_SAME : INNER_K_NEST;
    inner.scale.setScalar(-innerK);
    innerPlanet.geometry.dispose();
    innerPlanet.geometry = new THREE.SphereGeometry(radius * innerK, 48, 32);
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
    up: [0, 1, 0], fwd: [0, 0, -1],
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
    mapState.up[0] = up.x; mapState.up[1] = up.y; mapState.up[2] = up.z;
    mapState.fwd[0] = fwd.x; mapState.fwd[1] = fwd.y; mapState.fwd[2] = fwd.z;

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
    setSurface: (id) => { rp2 = id === 'rp2'; antipode.visible = rp2; mapState.rp2 = rp2; applyInnerShell(); clearTrail(); },
    setRadius,
    setColorCells,
    setInnerShell,
    setInnerSameRadius,
    setFloorOpacity,
    getSphereState: () => mapState,
    dispose: () => {
      scene.remove(root);
      foot.dispose();
      character.dispose();
      planet.geometry.dispose();
      innerPlanet.geometry.dispose();
      seamRing.geometry.dispose();
      planetTex.dispose();
      ownGeos.forEach((g) => g.dispose());
      // Sprite badges own a CanvasTexture each; release those too.
      ownMats.forEach((m) => { (m as THREE.SpriteMaterial).map?.dispose?.(); m.dispose(); });
    },
  };
}
