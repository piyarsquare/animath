import * as THREE from 'three';
import { CoverModel, CoverFrameInput, CoverDeps, PlayerPose } from '../coverModel';
import { SquareMapState } from '../engineTypes';
import { glassState, POLYGON_GLASS } from '../glassSurface';
import { makeInkTrail, INK_LIFT } from '../inkTrail';
import { makeSignBuilder, SignBuilder } from '../sign';
import { cornerColor } from '../decor';
import { rp2Square, sq2hemi } from '../squareMap';
import { parseWord } from '../surfaceSchema';
import { realize, Realization } from '../lib/realize';
import { develop } from '../lib/develop';
import {
  Vec3, makeFrame, Frame, framePos, frameForward, originTo,
  stepForward as kStep, stepHeading as kStrafe, turn as kTurn, reorthonormalize,
} from '../lib/cayleyKlein';

/**
 * The spherical presenter for the χ>0 worlds, driven by the kernel. At κ=+1 the
 * model shell *is* the unit sphere, so the player is a kernel {@link Frame} whose
 * {@link framePos} lands on it (world = framePos·R) and walking/turning are
 * `stepForward`/`turn`.
 *
 * The planet is a **two-sided sheet wrapped into a ball** (one neutral colour): the
 * **outer face wears the trees** (you walk it) and the **inner face the columns**
 * (seen through the glass). Each landmark's tree (outer, grown outward) and column
 * (inner, grown inward) sit at the *same* direction and grow *away* from the shell,
 * so neither penetrates it — fixing the "columns inside trees" overlap. Boundary
 * landmarks land on the seam/equator and the centre beacon at the chart centre.
 *
 *  - **Sphere (`a a⁻¹ b b⁻¹`, chart):** the square is charted over the whole shell;
 *    trees outside, columns inside, no antipodal identification.
 *  - **ℝP² (`a b a b`, isometric hemisphere):** the Z/2 antipodal deck (from
 *    {@link develop}, det<0) puts the *flipped* sheet on the lower hemisphere — the
 *    trees↔columns swap and the mirror trail twin both fall out of that one det<0.
 */

const EYE = 1.7;
const MAX_PITCH = 1.3;
const TRAIL_MAX = 900;
const TRAIL_SPACING = 1.6;
const SKY = 0x05070e;
const GLASS = POLYGON_GLASS;   // shared spec — slider feels the same in every world
const LON = 24, LAT = 16;
const SHELL_COLOR = 0x46658f; // one neutral shell colour (sides told apart by
                              // trees vs columns + the warm/cool light)
const SHELL_GAP = 0.985;      // inner-marker radius fraction (the sheet thickness)
const VERTEX_INSET = 0.82;    // vertex towers sit just inside the square's corners
const CHART_CORNERS: [number, number][] = [[0, 0], [1, 0], [1, 1], [0, 1]];

const v3 = (p: Vec3): THREE.Vector3 => new THREE.Vector3(p[0], p[1], p[2]);
const upY = new THREE.Vector3(0, 1, 0);

/** Faint lat/long lines baked onto a transparent texture, to read motion. */
function gridTexture(): THREE.CanvasTexture {
  const s = 1024;
  const cvs = document.createElement('canvas'); cvs.width = cvs.height = s;
  const ctx = cvs.getContext('2d')!;
  ctx.clearRect(0, 0, s, s);
  ctx.strokeStyle = 'rgba(200,224,248,0.5)'; ctx.lineWidth = 2;
  for (let i = 0; i <= LON; i++) { const x = (i / LON) * s; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, s); ctx.stroke(); }
  for (let j = 0; j <= LAT; j++) { const y = (j / LAT) * s; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(s, y); ctx.stroke(); }
  const t = new THREE.CanvasTexture(cvs);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

export function makeSphericalPresenter(c: CoverDeps): CoverModel {
  const { deps, root, decor } = c;
  const { scene, camera } = deps;

  const real: Realization = realize(parseWord(c.spec.word));
  const antipodal = !real.chart;             // ℝP²: hemisphere domain + Z/2 deck (chart ⇒ sphere charts the whole shell)
  const twin = develop(real).elements.find((e) => e.det() < 0) ?? null;
  const twinM4 = twin ? new THREE.Matrix4().set(
    twin.m[0], twin.m[1], twin.m[2], 0, twin.m[3], twin.m[4], twin.m[5], 0,
    twin.m[6], twin.m[7], twin.m[8], 0, 0, 0, 0, 1) : null;
  const deckDir = (d: THREE.Vector3): THREE.Vector3 =>
    twinM4 ? d.clone().applyMatrix4(twinM4) : d.clone().negate();

  let R = Math.max(12, c.squareSize);
  let glassOpacity = 0.45;   // clear-but-present default (host re-pushes on mount)
  let camDist = 4.5;
  let underVisible = true;   // inner-decor gate from the glass slider (see applyGlass)

  camera.fov = 75; camera.near = 0.05; camera.far = R * 5; camera.updateProjectionMatrix();
  camera.up.set(0, 1, 0);
  scene.background = new THREE.Color(SKY);
  scene.fog = null;

  // ── one neutral two-sided shell ──────────────────────────────────────────────
  const grid = gridTexture();
  const planetMat = new THREE.MeshStandardMaterial({ map: grid, color: SHELL_COLOR, emissive: SHELL_COLOR, emissiveIntensity: 0.12, roughness: 0.6, transparent: true, opacity: 1, side: THREE.DoubleSide });
  const planet = new THREE.Mesh(new THREE.SphereGeometry(R, 64, 48), planetMat);
  root.add(planet);

  /** Spread a square (u,v) over the WHOLE sphere (lon×lat) — the sphere's one skin. */
  function fullDir(u: number, v: number): THREE.Vector3 {
    const lon = (u - 0.5) * Math.PI * 2, lat = (v - 0.5) * Math.PI, cl = Math.cos(lat);
    return new THREE.Vector3(cl * Math.cos(lon), Math.sin(lat), cl * Math.sin(lon));
  }
  /** Outer direction for landmark i. */
  const dirFor = (u: number, v: number) =>
    antipodal ? sq2hemi((u - 0.5) * 2, (v - 0.5) * 2) : fullDir(u, v);

  // ── markers ──────────────────────────────────────────────────────────────────
  // OUTER (walked): trees at +dir, grown outward. On ℝP² the antipodal half (−dir)
  // wears the flipped skin (columns). INNER (seen through the glass): the opposite
  // form at each direction, grown inward — back-to-back, no penetration.
  const outerG = new THREE.Group();
  const innerG = new THREE.Group();
  root.add(outerG, innerG);
  const treeDirs: THREE.Vector3[] = [];

  function place(g: THREE.Group, dir: THREE.Vector3, radius: number, outward: boolean) {
    g.position.copy(dir).multiplyScalar(radius);
    g.quaternion.setFromUnitVectors(upY, outward ? dir : dir.clone().negate());
  }
  function buildMarkers() {
    outerG.clear(); innerG.clear(); treeDirs.length = 0;
    decor.props.forEach((p, i) => {
      const d = dirFor(p.u, p.v);
      treeDirs.push(d);
      // outer: tree at +d (grown out); inner: column at +d (grown in)
      const tOut = decor.makeTop(i); place(tOut, d, R, true); outerG.add(tOut);
      const cIn = decor.makeBottom(i); place(cIn, d, R * SHELL_GAP, false); innerG.add(cIn);
      if (antipodal) {
        // antipodal half wears the flipped skin (column out at −d, tree in at −d)
        const ad = deckDir(d);
        const cOut = decor.makeBottom(i); place(cOut, ad, R, true); outerG.add(cOut);
        const tIn = decor.makeTop(i); place(tIn, ad, R * SHELL_GAP, false); innerG.add(tIn);
      }
    });
    // numbered corner markers just inside each chart corner (the square's corners)
    CHART_CORNERS.forEach(([cu, cv], v) => {
      const col = cornerColor(v, CHART_CORNERS.length);
      const iu = 0.5 + (cu - 0.5) * VERTEX_INSET, iv = 0.5 + (cv - 0.5) * VERTEX_INSET;
      const d = dirFor(iu, iv);
      treeDirs.push(d);
      const tOut = decor.makeCornerTop(v + 1, col); place(tOut, d, R, true); outerG.add(tOut);
      const cIn = decor.makeCornerBottom(v + 1, col); place(cIn, d, R * SHELL_GAP, false); innerG.add(cIn);
      if (antipodal) {
        const ad = deckDir(d);
        const cOut = decor.makeCornerBottom(v + 1, col); place(cOut, ad, R, true); outerG.add(cOut);
        const tIn = decor.makeCornerTop(v + 1, col); place(tIn, ad, R * SHELL_GAP, false); innerG.add(tIn);
      }
    });
  }
  buildMarkers();

  // seam ring (ℝP² only): the z=0 great circle where the two skins meet.
  const seamMat = new THREE.MeshStandardMaterial({ color: 0xffe08a, emissive: 0xffe08a, emissiveIntensity: 0.4, roughness: 0.5 });
  const seam = antipodal ? new THREE.Mesh(new THREE.TorusGeometry(R, 0.12, 8, 96), seamMat) : null;
  if (seam) root.add(seam);

  // ── the ink trail: one buffer in true world coords on the fixed planet ──────
  // The sphere IS the cover, so the stamps are simply where you walked. On ℝP²
  // the one genuine det<0 deck element (the antipodal map) draws the trail's
  // mirror twin — no flags, the reflection does the mirroring.
  const ink = makeInkTrail(TRAIL_MAX);
  const inkMesh = new THREE.Mesh(ink.geometry, ink.material); inkMesh.frustumCulled = false;
  inkMesh.userData.ink = true;   // ink may legitimately render through det<0 — exempt from the decor audit
  root.add(inkMesh);
  let inkTwin: THREE.Mesh | null = null;
  // The twin draws the trail through the genuine deck of the TWO-SIDED shell —
  // which swaps faces (the twisted I-bundle over ℝP²): ink floating at radius
  // R+LIFT on the walked outer face lands at R−LIFT at the antipode, UNDER the
  // glass, where it reads mirror-reversed through it. The bare antipodal map
  // −Id preserves radius — it is the deck of the *untwisted* bundle and would
  // float mirror prints in open air on the walking face ("crossing the seam
  // mirrored my ink in place" — exactly the misconception this app dispels).
  // The uniform shrink equals the radial face swap to first order in LIFT/R
  // for a zero-thickness decal, and must be recomputed when R changes.
  const placeTwin = () => {
    if (!inkTwin || !twinM4) return;
    const s = (R - INK_LIFT) / (R + INK_LIFT);
    inkTwin.matrix.copy(twinM4).multiply(new THREE.Matrix4().makeScale(s, s, s));
  };
  if (twinM4) {
    inkTwin = new THREE.Mesh(ink.geometry, ink.material); inkTwin.frustumCulled = false;
    inkTwin.matrixAutoUpdate = false; inkTwin.userData.ink = true;
    placeTwin();
    root.add(inkTwin);
  }
  let hist = 0;                                     // frozen stamp count
  let lastFrozen: THREE.Vector3 | null = null;      // spacing reference
  const leftV = new THREE.Vector3(), normV = new THREE.Vector3();
  function writeStamp(slot: number) {
    leftV.crossVectors(posU, fwdU);                 // up×fwd — the player's left
    normV.copy(posU);
    ink.setQuad(slot, posW, fwdU, leftV, normV);
  }

  // ── planted signs: a rigid object on the shell + its genuine deck image ──────
  // On ℝP² the face-swapping deck (proper in 3D: tangent vectors negate, the
  // radial response is +1) carries the sign to the antipode growing INWARD —
  // under the glass, where its ink reads reversed only through it.
  interface PlantedSign { builder: SignBuilder; b: THREE.Vector3; fwdS: THREE.Vector3; main: THREE.Group; twin: THREE.Group | null }
  const signs: PlantedSign[] = [];
  const MAX_SIGNS = 4;
  function placeSign(s: PlantedSign) {
    const right = new THREE.Vector3().crossVectors(s.b, s.fwdS);
    s.main.matrix.makeBasis(right, s.b, s.fwdS).setPosition(s.b.x * R, s.b.y * R, s.b.z * R);
    if (s.twin) {
      const r2 = right.clone().negate(), f2 = s.fwdS.clone().negate();
      s.twin.matrix.makeBasis(r2, s.b, f2).setPosition(-s.b.x * R, -s.b.y * R, -s.b.z * R);
    }
  }
  function removeSign(s: PlantedSign) {
    root.remove(s.main);
    if (s.twin) root.remove(s.twin);
    s.builder.dispose();
  }
  function clearSignsFn() { signs.forEach(removeSign); signs.length = 0; }

  function applyGlass() {
    const g = glassState(glassOpacity, GLASS);
    planetMat.opacity = g.opacity; planetMat.depthWrite = g.depthWrite; planetMat.transparent = glassOpacity < 0.999; planetMat.needsUpdate = true;
    underVisible = g.showUnder;
    innerG.visible = g.showUnder;   // per-frame update() re-shows it while inside
    for (const s of signs) if (s.twin) s.twin.visible = g.showUnder;
  }
  applyGlass();

  // ── player pose as a kernel Frame on the κ=+1 shell (the unit sphere) ─────────
  // Spawn at the surface direction farthest from every landmark, so the player
  // never starts inside a tree or on the centre beacon.
  function clearSpawnFrame(): Frame {
    let best: THREE.Vector3 = treeDirs[0] ?? new THREE.Vector3(0, 0, 1);
    let bestD = -1;
    const cand = new THREE.Vector3();
    for (let cu = 0.05; cu <= 0.95; cu += 0.1) {
      for (let cv = 0.05; cv <= 0.95; cv += 0.1) {
        cand.copy(dirFor(cu, cv));
        let mind = Infinity;
        for (const d of treeDirs) mind = Math.min(mind, cand.angleTo(d));
        if (mind > bestD) { bestD = mind; best = cand.clone(); }
      }
    }
    return makeFrame(1, originTo(1, [best.x, best.y, best.z]));
  }
  let frame: Frame = clearSpawnFrame();
  let lastYaw = 0;
  const posU = new THREE.Vector3(), fwdU = new THREE.Vector3();
  const posW = new THREE.Vector3(), eye = new THREE.Vector3(), look = new THREE.Vector3();
  const camPos = new THREE.Vector3();
  // ── the inside walk (ℝP² only) ───────────────────────────────────────────────
  // On ℝP² the seam (z=0 great circle) is where the orientation cover changes
  // sheet. Crossing it physically dives the camera through the floor onto the
  // INNER face of the shell — you walk the hollow planet from inside, the world
  // you came from now overhead through the glass — and crossing back re-emerges
  // you. The flip is a smooth somersault about the heading: `rollT` eases 0→1 as
  // the player crosses into z<0, rotating local "up" from +normal to −normal and
  // sliding the eye from R+EYE (outside) to R−EYE (inside). Matches chart()'s
  // `flipped` (= the antipodal sheet), so map, decor sheet and camera agree.
  const localUp = new THREE.Vector3();
  const rollQ = new THREE.Quaternion();
  let rollT = 0;

  function syncPose() {
    posU.copy(v3(framePos(frame)));
    fwdU.copy(v3(frameForward(frame)));
    posW.copy(posU).multiplyScalar(R);
  }
  syncPose();

  function update(input: CoverFrameInput, cam: THREE.PerspectiveCamera) {
    const { fwd: f, strafe, yaw, pitch, dt, moveSpeed, thirdPerson } = input;
    const dyaw = yaw - lastYaw; lastYaw = yaw;
    if (dyaw) frame = kTurn(frame, -dyaw);
    if (f) frame = kStep(frame, (f * moveSpeed * dt) / R);
    if (strafe) frame = kStrafe(frame, -Math.PI / 2, (strafe * moveSpeed * dt) / R);
    if (dyaw || f || strafe) frame = reorthonormalize(frame);
    syncPose();

    // ease the somersault toward the current sheet (inside ⇔ on the z<0 sheet)
    const targetInside = antipodal && posU.z < 0 ? 1 : 0;
    const rate = dt / 0.5;                       // ~half-second flip
    rollT += Math.max(-rate, Math.min(rate, targetInside - rollT));
    // local up = surface normal rolled about the heading: +normal → −normal
    rollQ.setFromAxisAngle(fwdU, rollT * Math.PI);
    localUp.copy(posU).applyQuaternion(rollQ);
    const eyeR = R + EYE * Math.cos(rollT * Math.PI);   // R+EYE (out) → R−EYE (in)
    // inner decor is your foreground once you are inside — show it regardless of glass
    innerG.visible = underVisible || rollT > 0.02;
    // lift the shell's self-glow as you dive inside, so the hollow interior reads
    // (the directional key lights graze the inner face near the seam)
    planetMat.emissiveIntensity = 0.12 + 0.34 * rollT;

    cam.up.copy(localUp);
    if (thirdPerson) {
      // orbit the avatar (fixed at posW on the shell); localUp carries the inside
      // flip, so the rig swings toward the planet's center once you are inside
      camPos.copy(posW).addScaledVector(fwdU, -camDist).addScaledVector(localUp, 2.6 + pitch * 1.6);
      cam.position.copy(camPos);
      cam.lookAt(posW.x + localUp.x * 1.2, posW.y + localUp.y * 1.2, posW.z + localUp.z * 1.2);
    } else {
      eye.copy(posU).multiplyScalar(eyeR);
      const cp = Math.cos(Math.max(-MAX_PITCH, Math.min(MAX_PITCH, pitch)));
      look.copy(fwdU).multiplyScalar(cp).addScaledVector(localUp, Math.sin(pitch));
      cam.position.copy(eye);
      cam.lookAt(eye.x + look.x, eye.y + look.y, eye.z + look.z);
    }

    // ── ink the shell: freeze a footprint every TRAIL_SPACING of walked path ──
    if (!lastFrozen || lastFrozen.distanceTo(posW) > TRAIL_SPACING) {
      if (hist >= TRAIL_MAX) { ink.dropOldest(); hist--; }
      writeStamp(hist); hist++;
      ink.setCount(hist);
      lastFrozen = posW.clone();
    }
  }

  function pose(): PlayerPose {
    return { position: posW.clone(), up: posU.clone(), forward: fwdU.clone() };
  }

  function chart(): SquareMapState {
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
    planet.geometry.dispose(); planet.geometry = new THREE.SphereGeometry(R, 64, 48);
    buildMarkers();
    if (seam) { seam.geometry.dispose(); seam.geometry = new THREE.TorusGeometry(R, 0.12, 8, 96); }
    camera.far = R * 5; camera.updateProjectionMatrix();
    hist = 0; lastFrozen = null; ink.setCount(0);
    placeTwin();   // the face-swap shrink depends on R
    signs.forEach(placeSign);   // signs keep their direction on the resized shell
    syncPose();
  }

  return {
    kind: 'spherical',
    update, pose, chart,
    // the freshest print as rendered (the main mesh carries no transform),
    // read in the character's frame (>0 ⇒ reads right-handed under the player)
    debugProbe: () => ink.chirality(hist - 1, null, fwdU, posU),
    // the freshest print's mirror image AS RENDERED through the twin's actual
    // matrix, against the walking shell: mirror ink must hang below the glass
    auditInk: () => {
      if (!inkTwin || hist === 0) return null;
      const c = ink.slotCenter(hist - 1, inkTwin.matrix);
      return c ? { mirrorR: c.length(), shellR: R } : null;
    },
    clearTrail: () => { hist = 0; lastFrozen = null; ink.setCount(0); },
    plantSign: (front: string, back: string) => {
      if (signs.length >= MAX_SIGNS) removeSign(signs.shift()!);
      const b = posU.clone().addScaledVector(fwdU, 1.2 / R).normalize();
      const f = fwdU.clone().addScaledVector(b, -b.dot(fwdU)).normalize().negate(); // front faces the player
      const builder = makeSignBuilder(front, back);
      const main = builder.make(); main.matrixAutoUpdate = false; root.add(main);
      let twin: THREE.Group | null = null;
      if (antipodal) {
        twin = builder.make(); twin.matrixAutoUpdate = false;
        twin.visible = innerG.visible;   // under-glass content, gated like the inner shell
        root.add(twin);
      }
      const s: PlantedSign = { builder, b, fwdS: f, main, twin };
      signs.push(s);
      placeSign(s);
    },
    clearSigns: clearSignsFn,
    setFloorOpacity: (o: number) => { glassOpacity = o; applyGlass(); },
    setCameraDistance: (d: number) => { camDist = d; },
    setRadius,
    dispose: () => {
      ink.dispose();
      clearSignsFn();
      planet.geometry.dispose();
      grid.dispose(); planetMat.dispose();
      seam?.geometry.dispose(); seamMat.dispose();
    },
  };
}
