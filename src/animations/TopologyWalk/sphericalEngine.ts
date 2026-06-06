import * as THREE from 'three';
import { makeFootprintTrail } from './footprints';
import { makeCharacter } from './character';
import { EngineDeps, EngineOptions, FrameInput, WorldEngine } from './engine';

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

const R = 30;          // planet radius
const EYE = 1.7;
const TRAIL_MAX = 900;
const TRAIL_SPACING = 1.6;
const MAX_PITCH = 1.3;

interface Beacon { dir: THREE.Vector3; color: number }

// Landmarks scattered (deliberately *not* antipodally symmetric on their own, so
// the plain sphere looks different front-to-back; ℝP² adds the antipodal twins).
const BEACONS: Beacon[] = [
  { dir: new THREE.Vector3(0, 1, 0).normalize(), color: 0xff5a5a },
  { dir: new THREE.Vector3(1, 0.2, 0.1).normalize(), color: 0x5ad1ff },
  { dir: new THREE.Vector3(0.1, 0.1, 1).normalize(), color: 0x8aff6a },
  { dir: new THREE.Vector3(-0.8, 0.3, 0.6).normalize(), color: 0xffd24a },
  { dir: new THREE.Vector3(0.5, -0.5, -0.7).normalize(), color: 0xc08aff },
  { dir: new THREE.Vector3(-0.4, -0.7, 0.3).normalize(), color: 0xff9a3d },
];

/** Lat/long grid on a dark planet, to make motion and rotation legible. */
function planetTexture(): THREE.CanvasTexture {
  const s = 512;
  const cvs = document.createElement('canvas'); cvs.width = cvs.height = s;
  const ctx = cvs.getContext('2d')!;
  ctx.fillStyle = '#14202e'; ctx.fillRect(0, 0, s, s);
  ctx.strokeStyle = '#26405a'; ctx.lineWidth = 2;
  for (let i = 0; i <= 12; i++) {
    const x = (i / 12) * s;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, s); ctx.stroke();
  }
  for (let j = 0; j <= 8; j++) {
    const y = (j / 8) * s;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(s, y); ctx.stroke();
  }
  const t = new THREE.CanvasTexture(cvs);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** A glowing marker that stands radially on the planet's surface. */
function makeBeacon(color: number, geos: THREE.BufferGeometry[], mats: THREE.Material[]): THREE.Group {
  const g = new THREE.Group();
  const coneGeo = new THREE.ConeGeometry(0.9, 3, 16);
  const tipGeo = new THREE.SphereGeometry(0.55, 16, 12);
  // DoubleSide so the antipodal (reflected) twin used for ℝP² isn't back-face culled.
  const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.45, roughness: 0.5, side: THREE.DoubleSide });
  geos.push(coneGeo, tipGeo); mats.push(mat);
  const cone = new THREE.Mesh(coneGeo, mat); cone.position.y = 1.5; g.add(cone);
  const tip = new THREE.Mesh(tipGeo, mat); tip.position.y = 3.3; g.add(tip);
  return g;
}

export function makeSphericalEngine(deps: EngineDeps, opts: EngineOptions): WorldEngine {
  const { scene, camera, renderer } = deps;
  let rp2 = opts.surfaceId === 'rp2';

  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  camera.fov = 75; camera.near = 0.05; camera.far = R * 5; camera.updateProjectionMatrix();
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

  // the planet
  const planetGeo = new THREE.SphereGeometry(R, 64, 48);
  const planetTex = planetTexture();
  const planetMat = new THREE.MeshStandardMaterial({ map: planetTex, color: 0x9fb4c8, roughness: 0.95, metalness: 0.0 });
  ownGeos.push(planetGeo); ownMats.push(planetMat);
  root.add(new THREE.Mesh(planetGeo, planetMat));

  // landmarks (one set on the surface)
  const landmarks = new THREE.Group();
  for (const b of BEACONS) {
    const g = makeBeacon(b.color, ownGeos, ownMats);
    g.position.copy(b.dir).multiplyScalar(R);
    g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.dir);
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
  antipode.add(landmarks.clone(true));
  const footAnti = new THREE.Mesh(foot.geometry, foot.material);
  footAnti.frustumCulled = false;
  antipode.add(footAnti);
  antipode.visible = rp2;
  root.add(antipode);

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
    if (f) stepForward((f * moveSpeed * dt) / R);
    if (strafe) stepRight((strafe * moveSpeed * dt) / R);
    if (moving) { orthonormalize(); stridePhase += dt * moveSpeed * 1.4; }

    posW.copy(up).multiplyScalar(R);

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
      eye.copy(up).multiplyScalar(R + EYE);
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
    setSurface: (id) => { rp2 = id === 'rp2'; antipode.visible = rp2; clearTrail(); },
    dispose: () => {
      scene.remove(root);
      foot.dispose();
      character.dispose();
      planetTex.dispose();
      ownGeos.forEach((g) => g.dispose());
      ownMats.forEach((m) => m.dispose());
    },
  };
}
