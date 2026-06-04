import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import {
  makeCorridorGeometry, makeFloorDecalGeometry, DEFAULT_PARAMS, frameAt, CorridorParams,
  spacePeriod, centerlineLength,
} from './corridorGeometry';
import { makeCorridorMaterial } from './shaders/corridorMaterial';
import { makeCharacter } from './character';
import { makeFootprintTrail } from './footprints';
import {
  THEMES, DEFAULT_THEME, MobiusTheme, FlickerKind, floorMarkerTexture, glowTexture,
} from './themes';
import { EngineDeps, EngineOptions, FrameInput, WorldEngine } from './engine';

const EYE_HEIGHT = 1.6;
const MAX_LIGHTS = 6;
const FOOT_MAX = 1400;
const TRAIL_SPACING = 1.4;
const WRITE_REACH = 8;     // how far the gaze can reach a wall to write on
const MAX_WRITE = 60;      // max text decals kept
const INK = '#ffef6b';
const MINI_UP = new THREE.Vector3(0, 1, 0);
const MINI_BG = new THREE.Color(0x0a0c16);

/** Friendly surface id → centreline + twist parameters. */
const SPACE_PARAMS: Record<string, Partial<CorridorParams>> = {
  loop:    { space: 'loop', tiltTurns: 0 },
  mobius:  { space: 'loop', tiltTurns: 1 },
  double:  { space: 'loop', tiltTurns: 2 },
  triple:  { space: 'loop', tiltTurns: 3 },
  trefoil: { space: 'knot', tiltTurns: 0 },
};
const spaceParams = (id: string): Partial<CorridorParams> => SPACE_PARAMS[id] ?? SPACE_PARAMS.mobius;

/**
 * Mini-map band geometry: a ribbon following the centreline, coloured magenta on
 * one long edge and cyan on the other. On a plain ring the two colours stay on
 * the same sides; with the half-twist they swap as you go round — so the map
 * itself shows whether the corridor is a Möbius strip.
 */
function makeMiniBandGeometry(params: CorridorParams): THREE.BufferGeometry {
  const segs = 220, halfW = 2.6;
  const g = new THREE.BufferGeometry();
  const pos: number[] = [], col: number[] = [];
  const cA = new THREE.Color(0xff3bd0), cB = new THREE.Color(0x37d6ff);
  for (let i = 0; i <= segs; i++) {
    const { center, n } = frameAt(i / segs, params);
    const a = center.clone().addScaledVector(n, halfW);
    const b = center.clone().addScaledVector(n, -halfW);
    pos.push(a.x, a.y, a.z, b.x, b.y, b.z);
    col.push(cA.r, cA.g, cA.b, cB.r, cB.g, cB.b);
  }
  const idx: number[] = [];
  for (let i = 0; i < segs; i++) { const a = i * 2, c = (i + 1) * 2; idx.push(a, c, c + 1, a, c + 1, a + 1); }
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx); g.computeBoundingSphere();
  return g;
}

function flicker(kind: FlickerKind, t: number, seed: number, amp: number): number {
  if (kind === 'steady' || amp <= 0) return 1;
  if (kind === 'pulse') return 1 - amp * 0.5 * (1 + Math.sin(t * 2.2 + seed));
  if (kind === 'candle') return 1 - amp * (1 - (Math.sin(t * 5 + seed) * 0.5 + 0.5));
  const n = (Math.sin(t * 13 + seed) * 0.5 + 0.5) * 0.6 + (Math.sin(t * 29 + seed * 2.3) * 0.5 + 0.5) * 0.4;
  return 1 - amp * (1 - n);
}

/** Render text to a transparent canvas texture; returns it with its aspect. */
function textTexture(text: string): { tex: THREE.CanvasTexture; aspect: number } {
  const font = 72, pad = 26;
  const meas = document.createElement('canvas').getContext('2d')!;
  meas.font = `bold ${font}px Georgia, 'Times New Roman', serif`;
  const w = Math.max(font, Math.ceil(meas.measureText(text || ' ').width)) + pad * 2;
  const h = font + pad * 2;
  const cvs = document.createElement('canvas');
  cvs.width = w; cvs.height = h;
  const ctx = cvs.getContext('2d')!;
  ctx.font = `bold ${font}px Georgia, 'Times New Roman', serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = INK; ctx.shadowBlur = 22;
  ctx.fillStyle = INK; ctx.fillText(text, w / 2, h / 2 + 4);
  const tex = new THREE.CanvasTexture(cvs);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return { tex, aspect: w / h };
}

/**
 * The swept-tube "hallway" engine. Walks a rectangular corridor along a twisting
 * or knotted centreline; "up" follows the cross-section frame, so a Möbius lap
 * rolls the world over and the floor becomes the ceiling.
 */
export function makeCorridorEngine(deps: EngineDeps, opts: EngineOptions): WorldEngine {
  const { scene, camera, renderer } = deps;

  let theme: MobiusTheme = THEMES.find((t) => t.id === opts.themeId) ?? DEFAULT_THEME;
  let params: CorridorParams = { ...DEFAULT_PARAMS, ...spaceParams(opts.surfaceId), width: opts.width };
  let ambientMul = opts.ambientMul;
  let markersOn = opts.markers;
  let bloomOn = opts.bloom;
  let miniOn = opts.miniMap;

  // player state
  let s = 0;            // arc length along the centreline
  let w = 0;            // lateral offset on the floor
  let stridePhase = 0;
  let footLast: THREE.Vector3 | null = null;
  let length = centerlineLength(params);
  let period = spacePeriod(params);
  let ambientBase = theme.lighting.ambient;
  let hemiBase = 0;

  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = theme.lighting.exposure;
  camera.fov = 75; camera.near = 0.05; camera.far = 200; camera.updateProjectionMatrix();

  // All scene-attached objects live under one root, so dispose() can detach the
  // whole engine cleanly when the host swaps to the flat world.
  const root = new THREE.Group();
  scene.add(root);

  const mesh = new THREE.Mesh(makeCorridorGeometry(params), makeCorridorMaterial(theme));
  root.add(mesh);

  const markerTex = floorMarkerTexture();
  const decal = new THREE.Mesh(
    makeFloorDecalGeometry(params),
    new THREE.MeshBasicMaterial({ map: markerTex, transparent: true, side: THREE.DoubleSide, depthWrite: false }),
  );
  decal.frustumCulled = false; decal.visible = markersOn; root.add(decal);

  const character = makeCharacter(); root.add(character.group);
  const glow = glowTexture();

  const foot = makeFootprintTrail(FOOT_MAX);
  const footMesh = new THREE.Mesh(foot.geometry, foot.material);
  footMesh.frustumCulled = false; root.add(footMesh);

  const writing = new THREE.Group(); root.add(writing);
  const writeMeshes: THREE.Mesh[] = [];

  const ambient = new THREE.AmbientLight(0xffffff, theme.lighting.ambient); root.add(ambient);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x202028, 0); root.add(hemi);
  const moon = new THREE.DirectionalLight(0xffffff, 0); root.add(moon);
  const fill = new THREE.PointLight(0xffffff, 3, 11, 1.6); root.add(fill);
  const lights: THREE.PointLight[] = [];
  const flames: THREE.Sprite[] = [];
  for (let i = 0; i < MAX_LIGHTS; i++) {
    const pl = new THREE.PointLight(0xffffff, 0, 14, 1.6); root.add(pl); lights.push(pl);
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    spr.visible = false; root.add(spr); flames.push(spr);
  }

  scene.fog = new THREE.Fog(theme.background, theme.fogNear, theme.fogFar);
  scene.background = new THREE.Color(theme.background);

  const composer = new EffectComposer(renderer);
  let bufW = renderer.domElement.width, bufH = renderer.domElement.height;
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(bufW, bufH),
    theme.lighting.bloom.strength, theme.lighting.bloom.radius, theme.lighting.bloom.threshold);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  composer.setSize(bufW, bufH);

  const raycaster = new THREE.Raycaster();

  // Mini-map: an inset 3-D view of the loop, rendered into the corner.
  const miniScene = new THREE.Scene();
  const miniCam = new THREE.PerspectiveCamera(34, 1, 0.1, 500);
  const miniBand = new THREE.Mesh(
    makeMiniBandGeometry(params),
    new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }),
  );
  miniScene.add(miniBand);
  const miniMarker = new THREE.Mesh(
    new THREE.ConeGeometry(1.1, 2.8, 12),
    new THREE.MeshBasicMaterial({ color: 0xffe14d }),
  );
  miniScene.add(miniMarker);

  /** Place a flat text panel on whatever wall the player is looking at, aligned
   *  to the corridor's local "up" so it reads upright — and appears reversed
   *  when you come around to the other side of the strip. */
  function stampText(eye: THREE.Vector3, lookDir: THREE.Vector3, up: THREE.Vector3, text: string) {
    if (!text) return;
    raycaster.set(eye, lookDir);
    raycaster.far = WRITE_REACH;
    const hit = raycaster.intersectObject(mesh, false)[0];
    if (!hit || !hit.face) return;

    const nrm = hit.face.normal.clone();
    if (nrm.dot(eye.clone().sub(hit.point)) < 0) nrm.negate(); // face the player
    const up1 = up.clone().addScaledVector(nrm, -up.dot(nrm));
    if (up1.lengthSq() < 1e-4) up1.copy(lookDir).addScaledVector(nrm, -lookDir.dot(nrm));
    up1.normalize();
    const rightV = new THREE.Vector3().crossVectors(up1, nrm).normalize();

    const { tex, aspect } = textTexture(text);
    const height = 0.55;
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(height * aspect, height),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false }),
    );
    m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(rightV, up1, nrm));
    m.position.copy(hit.point).addScaledVector(nrm, 0.02);
    writing.add(m);
    writeMeshes.push(m);
    if (writeMeshes.length > MAX_WRITE) {
      const old = writeMeshes.shift()!;
      writing.remove(old);
      old.geometry.dispose();
      (old.material as THREE.MeshBasicMaterial).map?.dispose();
      (old.material as THREE.Material).dispose();
    }
  }

  function applyTheme(next: MobiusTheme) {
    theme = next;
    const L = theme.lighting;
    scene.background = new THREE.Color(theme.background);
    const fog = scene.fog as THREE.Fog;
    fog.color.setHex(theme.background); fog.near = theme.fogNear; fog.far = theme.fogFar;
    renderer.toneMappingExposure = L.exposure;

    ambientBase = L.ambient;
    hemiBase = L.hemi ? L.hemi.intensity : 0;
    ambient.intensity = ambientBase * ambientMul;
    hemi.visible = !!L.hemi;
    if (L.hemi) { hemi.color.setHex(L.hemi.sky); hemi.groundColor.setHex(L.hemi.ground); }
    hemi.intensity = hemiBase * ambientMul;
    moon.visible = !!L.moonbeam;
    if (L.moonbeam) { moon.color.setHex(L.moonbeam.color); moon.intensity = L.moonbeam.intensity; moon.position.set(...L.moonbeam.dir); }
    fill.color.setHex(L.emitter.color);

    bloom.strength = L.bloom.strength;
    bloom.radius = L.bloom.radius;
    bloom.threshold = L.bloom.threshold;

    const old = mesh.material as THREE.MeshPhysicalMaterial;
    old.map?.dispose(); old.dispose();
    mesh.material = makeCorridorMaterial(theme);
  }
  applyTheme(theme);

  function rebuildGeometry(next: CorridorParams) {
    mesh.geometry.dispose(); mesh.geometry = makeCorridorGeometry(next);
    decal.geometry.dispose(); decal.geometry = makeFloorDecalGeometry(next);
    miniBand.geometry.dispose(); miniBand.geometry = makeMiniBandGeometry(next);
    params = next; length = centerlineLength(next); period = spacePeriod(next);
  }

  function clearTrail() { foot.clear(); footLast = null; }
  function clearWriting() {
    for (const m of writeMeshes) {
      writing.remove(m); m.geometry.dispose();
      (m.material as THREE.MeshBasicMaterial).map?.dispose(); (m.material as THREE.Material).dispose();
    }
    writeMeshes.length = 0;
  }

  function frame(input: FrameInput) {
    const { dt, time, fwd, strafe, yaw, pitch } = input;
    const moving = !!(fwd || strafe);
    if (moving) {
      const v = input.moveSpeed * dt;
      const cyaw = Math.cos(yaw), syaw = Math.sin(yaw);
      s += (fwd * cyaw - strafe * syaw) * v;
      const halfW = params.width - 0.3;
      w = Math.max(-halfW, Math.min(halfW, w + (fwd * syaw + strafe * cyaw) * v));
      stridePhase += dt * input.moveSpeed * 1.6;
    }

    const circ = length;
    const t = (((s / circ) % period) + period) % period;
    const f = frameAt(t, params);

    const up = f.b;
    const right = f.n.clone().negate();
    const facing = new THREE.Vector3()
      .addScaledVector(f.tangent, Math.cos(yaw)).addScaledVector(right, Math.sin(yaw)).normalize();
    const footPos = f.center.clone().addScaledVector(right, w).addScaledVector(f.b, -params.height);
    const eye = footPos.clone().addScaledVector(up, EYE_HEIGHT);
    const lookDir = facing.clone().multiplyScalar(Math.cos(pitch)).addScaledVector(up, Math.sin(pitch)).normalize();

    const charRight = new THREE.Vector3().crossVectors(up, facing).normalize();
    character.group.position.copy(footPos);
    character.group.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(charRight, up, facing));
    character.group.visible = input.thirdPerson;
    character.stride(stridePhase);

    if (input.thirdPerson) {
      // Keep the avatar centred and pull the camera back + up on narrow/portrait
      // aspects, where the small horizontal FOV otherwise magnifies it.
      const aspect = camera.aspect || 1;
      const distScale = Math.min(1.6, Math.max(1, 1 / Math.min(aspect, 1)));
      const D = 3.0 * distScale;
      const H = 2.1 + (distScale - 1) * 0.9 + pitch * 1.6;
      const camPos = footPos.clone().addScaledVector(facing, -D).addScaledVector(up, H);
      const target = footPos.clone().addScaledVector(up, 1.2);
      camera.up.copy(up); camera.position.copy(camPos); camera.lookAt(target);
    } else {
      camera.up.copy(up); camera.position.copy(eye); camera.lookAt(eye.clone().add(lookDir));
    }
    fill.position.copy(eye);

    if (input.stamp) stampText(eye, lookDir, up, input.wallText);

    // Emitter lights.
    const L = theme.lighting.emitter;
    const count = Math.min(L.count, MAX_LIGHTS);
    const base = Math.round(s / L.spacing);
    for (let i = 0; i < MAX_LIGHTS; i++) {
      const pl = lights[i], spr = flames[i];
      if (i >= count) { pl.visible = false; spr.visible = false; continue; }
      const slot = base + i - (count >> 1);
      const st = (((slot * L.spacing / circ) % period) + period) % period;
      const ff = frameAt(st, params);
      const side = (slot & 1) ? 1 : -1;
      const pos = ff.center.clone()
        .addScaledVector(ff.n, side * params.width * 0.85)
        .addScaledVector(ff.b, params.height * 0.35);
      const fl = flicker(L.flicker, time, slot * 1.7, L.amp);
      pl.visible = true; pl.position.copy(pos); pl.color.setHex(L.color);
      pl.intensity = L.intensity * fl; pl.distance = L.distance; pl.decay = L.decay;
      if (L.spriteSize > 0) {
        spr.visible = true; spr.position.copy(pos);
        const sc = L.spriteSize * (0.85 + 0.4 * fl); spr.scale.set(sc, sc, sc);
        (spr.material as THREE.SpriteMaterial).color.setHex(L.color);
      } else spr.visible = false;
    }

    // Footprints on the floor, oriented along travel; up = the (twisting)
    // surface normal, so they ride the Möbius twist and read reversed overhead.
    if (moving && (!footLast || footPos.distanceTo(footLast) > TRAIL_SPACING)) {
      const dir = footLast ? footPos.clone().sub(footLast) : facing.clone();
      if (dir.lengthSq() < 1e-6) dir.copy(facing);
      foot.append(footPos.clone(), dir, up);
      footLast = footPos.clone();
    }

    const dw = renderer.domElement.width, dh = renderer.domElement.height;
    if (dw !== bufW || dh !== bufH) { bufW = dw; bufH = dh; composer.setSize(dw, dh); }

    if (bloomOn) composer.render();
    else renderer.render(scene, camera);

    // Mini-map: orbiting inset view with the avatar marker, drawn into the
    // top-right corner via a scissored viewport. Coordinates are CSS pixels
    // (lower-left origin) — three multiplies by the pixel ratio internally, so
    // we must NOT pre-multiply by dpr.
    if (miniOn) {
      const el = renderer.domElement;
      const Wc = el.clientWidth, Hc = el.clientHeight;
      const mm = Math.min(150, Math.floor(Math.min(Wc, Hc) * 0.34)), gg = 12;
      const vx = Wc - gg - mm, vy = Hc - gg - mm, vw = mm, vh = mm;

      miniMarker.position.copy(f.center).addScaledVector(f.b, 1.7);
      miniMarker.quaternion.setFromUnitVectors(MINI_UP, facing);
      const rad = params.space === 'knot' ? params.knotR + params.knotr : params.radius;
      const ang = time * 0.18, Dm = rad * 2.6;
      miniCam.position.set(Math.cos(ang) * Dm, Math.sin(ang) * Dm, rad * 1.7);
      miniCam.up.set(0, 0, 1);
      miniCam.lookAt(0, 0, 0);

      renderer.setScissorTest(true);
      renderer.setViewport(vx, vy, vw, vh);
      renderer.setScissor(vx, vy, vw, vh);
      renderer.setClearColor(MINI_BG, 1);
      renderer.clear(true, true, false);
      renderer.render(miniScene, miniCam);
      renderer.setScissorTest(false);
      renderer.setViewport(0, 0, Wc, Hc);
      renderer.setClearColor(0x000000, 0);
    }
  }

  return {
    family: 'corridor',
    frame,
    clearTrail,
    clearWriting,
    setSurface: (id) => {
      rebuildGeometry({ ...DEFAULT_PARAMS, ...spaceParams(id), width: params.width });
      clearTrail(); clearWriting();
    },
    setWidth: (next) => { rebuildGeometry({ ...params, width: next }); clearTrail(); clearWriting(); },
    setTheme: (id) => applyTheme(THEMES.find((t) => t.id === id) ?? DEFAULT_THEME),
    setAmbient: (mul) => { ambientMul = mul; ambient.intensity = ambientBase * mul; hemi.intensity = hemiBase * mul; },
    setMarkers: (on) => { markersOn = on; decal.visible = on; },
    setBloom: (on) => { bloomOn = on; },
    setMiniMap: (on) => { miniOn = on; },
    dispose: () => {
      scene.remove(root);
      mesh.geometry.dispose();
      (mesh.material as THREE.MeshPhysicalMaterial).map?.dispose(); (mesh.material as THREE.Material).dispose();
      decal.geometry.dispose(); markerTex.dispose(); (decal.material as THREE.Material).dispose();
      foot.dispose();
      clearWriting();
      for (const spr of flames) (spr.material as THREE.Material).dispose();
      glow.dispose();
      miniBand.geometry.dispose(); (miniBand.material as THREE.Material).dispose();
      miniMarker.geometry.dispose(); (miniMarker.material as THREE.Material).dispose();
      character.dispose();
      composer.dispose();
    },
  };
}
