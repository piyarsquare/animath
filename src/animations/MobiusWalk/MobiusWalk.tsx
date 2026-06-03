import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import Canvas3D from '@/components/Canvas3D';
import {
  makeCorridorGeometry, makeFloorDecalGeometry, DEFAULT_PARAMS, frameAt, CorridorParams,
} from './corridorGeometry';
import { makeCorridorMaterial } from './shaders/corridorMaterial';
import { makeCharacter, Character } from './character';
import {
  THEMES, DEFAULT_THEME, MobiusTheme, FlickerKind, floorMarkerTexture, glowTexture,
} from './themes';
import { ShellActions, ShellSettings, useAppHeader, useAppExplainer } from '../../components/AppShell';
import { Section, Slider, Select, Checkbox } from '../../components/ControlPanel';
import explainerText from './EXPLAINER.md?raw';

const EYE_HEIGHT = 1.6;
const LOOK_SENS = 0.0035;
const MAX_PITCH = 1.2;
const MAX_LIGHTS = 6;

const TRAIL_MAX_PAIRS = 2200;
const TRAIL_SPACING = 0.3;
const TRAIL_HALF_W = 0.14;

const WRITE_REACH = 8;     // how far the gaze can reach a wall to write on
const MAX_WRITE = 60;      // max text decals kept
const INK = '#ffef6b';

const MINI_UP = new THREE.Vector3(0, 1, 0);
const MINI_BG = new THREE.Color(0x0a0c16);

/** Phone-ish layout: portrait or a small short side. Used to choose
 *  mobile-friendly defaults (first-person view, bloom off). */
function isCrampedLayout(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerHeight >= window.innerWidth || Math.min(window.innerWidth, window.innerHeight) < 560;
}

type MoveKey = 'fwd' | 'back' | 'left' | 'right';

interface SceneCtx {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  composer: EffectComposer;
  bloom: UnrealBloomPass;
  mesh: THREE.Mesh;
  decal: THREE.Mesh;
  character: Character;
  ambient: THREE.AmbientLight;
  hemi: THREE.HemisphereLight;
  moon: THREE.DirectionalLight;
  fill: THREE.PointLight;
  lights: THREE.PointLight[];
  flames: THREE.Sprite[];
  params: CorridorParams;
  theme: MobiusTheme;
  ambientBase: number;
  hemiBase: number;
  trail: THREE.Mesh;
  trailPos: Float32Array;
  trailCount: number;
  trailLast: THREE.Vector3 | null;
  writing: THREE.Group;
  writeMeshes: THREE.Mesh[];
  raycaster: THREE.Raycaster;
  miniScene: THREE.Scene;
  miniCam: THREE.PerspectiveCamera;
  miniBand: THREE.Mesh;
  miniMarker: THREE.Mesh;
  stridePhase: number;
  bufW: number;
  bufH: number;
}

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

/** Place a flat text panel on whatever wall the player is looking at, aligned to
 *  the corridor's local "up" so it reads upright — and so it appears reversed
 *  when you come around to the other side of the strip. */
function stampText(c: SceneCtx, eye: THREE.Vector3, lookDir: THREE.Vector3, up: THREE.Vector3, text: string) {
  if (!text) return;
  c.raycaster.set(eye, lookDir);
  c.raycaster.far = WRITE_REACH;
  const hit = c.raycaster.intersectObject(c.mesh, false)[0];
  if (!hit || !hit.face) return;

  const nrm = hit.face.normal.clone();
  if (nrm.dot(eye.clone().sub(hit.point)) < 0) nrm.negate(); // face the player
  const up1 = up.clone().addScaledVector(nrm, -up.dot(nrm));
  if (up1.lengthSq() < 1e-4) up1.copy(lookDir).addScaledVector(nrm, -lookDir.dot(nrm));
  up1.normalize();
  const rightV = new THREE.Vector3().crossVectors(up1, nrm).normalize();

  const { tex, aspect } = textTexture(text);
  const height = 0.55;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(height * aspect, height),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false }),
  );
  mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(rightV, up1, nrm));
  mesh.position.copy(hit.point).addScaledVector(nrm, 0.02);
  c.writing.add(mesh);
  c.writeMeshes.push(mesh);
  if (c.writeMeshes.length > MAX_WRITE) {
    const old = c.writeMeshes.shift()!;
    c.writing.remove(old);
    old.geometry.dispose();
    (old.material as THREE.MeshBasicMaterial).map?.dispose();
    (old.material as THREE.Material).dispose();
  }
}

function applyTheme(c: SceneCtx, theme: MobiusTheme, ambientMul: number) {
  c.theme = theme;
  const L = theme.lighting;
  c.scene.background = new THREE.Color(theme.background);
  const fog = c.scene.fog as THREE.Fog;
  fog.color.setHex(theme.background); fog.near = theme.fogNear; fog.far = theme.fogFar;
  c.renderer.toneMappingExposure = L.exposure;

  c.ambientBase = L.ambient;
  c.hemiBase = L.hemi ? L.hemi.intensity : 0;
  c.ambient.intensity = c.ambientBase * ambientMul;
  c.hemi.visible = !!L.hemi;
  if (L.hemi) { c.hemi.color.setHex(L.hemi.sky); c.hemi.groundColor.setHex(L.hemi.ground); }
  c.hemi.intensity = c.hemiBase * ambientMul;
  c.moon.visible = !!L.moonbeam;
  if (L.moonbeam) { c.moon.color.setHex(L.moonbeam.color); c.moon.intensity = L.moonbeam.intensity; c.moon.position.set(...L.moonbeam.dir); }
  c.fill.color.setHex(L.emitter.color);

  c.bloom.strength = L.bloom.strength;
  c.bloom.radius = L.bloom.radius;
  c.bloom.threshold = L.bloom.threshold;

  const old = c.mesh.material as THREE.MeshPhysicalMaterial;
  old.map?.dispose(); old.dispose();
  c.mesh.material = makeCorridorMaterial(theme);
}

export default function MobiusWalk() {
  const [twist, setTwist] = useState(true);
  const [moveSpeed, setMoveSpeed] = useState(6);
  const [width, setWidth] = useState(DEFAULT_PARAMS.width);
  const [ambientMul, setAmbientMul] = useState(1);
  const [themeId, setThemeId] = useState(DEFAULT_THEME.id);
  // First-person by default on portrait / small screens (a chase cam is too
  // cramped in a narrow corridor on a phone); third-person elsewhere.
  const [thirdPerson, setThirdPerson] = useState(() => !isCrampedLayout());
  const [markers, setMarkers] = useState(true);
  const [bloomOn, setBloomOn] = useState(() => !isCrampedLayout()); // bloom is heavy on phones
  const [miniMap, setMiniMap] = useState(true);
  const [wallText, setWallText] = useState('MÖBIUS');

  useAppHeader('Möbius Walk', twist ? 'twisted corridor' : 'untwisted corridor');
  useAppExplainer(explainerText);

  const ctxRef = useRef<SceneCtx | null>(null);
  const rafRef = useRef<number | null>(null);
  const clockRef = useRef(new THREE.Clock());
  const timeRef = useRef(0);

  const sRef = useRef(0);
  const wRef = useRef(0);
  const yawRef = useRef(0);
  const pitchRef = useRef(0);
  const keysRef = useRef<Record<MoveKey, boolean>>({ fwd: false, back: false, left: false, right: false });
  const stampRef = useRef(false);
  const speedRef = useRef(moveSpeed);
  const twistRef = useRef(twist);
  const thirdRef = useRef(thirdPerson);
  const bloomRef = useRef(bloomOn);
  const wallTextRef = useRef(wallText);
  const miniRef = useRef(true);
  useEffect(() => { speedRef.current = moveSpeed; }, [moveSpeed]);
  useEffect(() => { thirdRef.current = thirdPerson; }, [thirdPerson]);
  useEffect(() => { bloomRef.current = bloomOn; }, [bloomOn]);
  useEffect(() => { miniRef.current = miniMap; }, [miniMap]);
  useEffect(() => { wallTextRef.current = wallText; }, [wallText]);

  const setKey = useCallback((k: MoveKey, v: boolean) => { keysRef.current[k] = v; }, []);
  const requestStamp = useCallback(() => { stampRef.current = true; }, []);

  const onMount = useCallback(({ scene, camera, renderer }: {
    scene: THREE.Scene; camera: THREE.PerspectiveCamera; renderer: THREE.WebGLRenderer;
  }) => {
    const theme = THEMES.find((t) => t.id === themeId) ?? DEFAULT_THEME;
    const params: CorridorParams = { ...DEFAULT_PARAMS, tiltTurns: twistRef.current ? 1 : 0, width };

    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = theme.lighting.exposure;

    const mesh = new THREE.Mesh(makeCorridorGeometry(params), makeCorridorMaterial(theme));
    scene.add(mesh);

    const decal = new THREE.Mesh(
      makeFloorDecalGeometry(params),
      new THREE.MeshBasicMaterial({ map: floorMarkerTexture(), transparent: true, side: THREE.DoubleSide, depthWrite: false }),
    );
    decal.frustumCulled = false; scene.add(decal);

    const character = makeCharacter(); scene.add(character.group);
    const glow = glowTexture();

    const trailPos = new Float32Array(TRAIL_MAX_PAIRS * 2 * 3);
    const trailIndex = new Uint16Array((TRAIL_MAX_PAIRS - 1) * 6);
    for (let i = 0; i < TRAIL_MAX_PAIRS - 1; i++) {
      const o = i * 6, v = i * 2;
      trailIndex[o] = v; trailIndex[o + 1] = v + 1; trailIndex[o + 2] = v + 2;
      trailIndex[o + 3] = v + 1; trailIndex[o + 4] = v + 3; trailIndex[o + 5] = v + 2;
    }
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
    trailGeo.setIndex(new THREE.BufferAttribute(trailIndex, 1));
    trailGeo.setDrawRange(0, 0);
    const trail = new THREE.Mesh(trailGeo, new THREE.MeshBasicMaterial({ color: 0xff2740, side: THREE.DoubleSide }));
    trail.frustumCulled = false; scene.add(trail);

    const writing = new THREE.Group(); scene.add(writing);

    const ambient = new THREE.AmbientLight(0xffffff, theme.lighting.ambient); scene.add(ambient);
    const hemi = new THREE.HemisphereLight(0xffffff, 0x202028, 0); scene.add(hemi);
    const moon = new THREE.DirectionalLight(0xffffff, 0); scene.add(moon);
    const fill = new THREE.PointLight(0xffffff, 3, 11, 1.6); scene.add(fill);
    const lights: THREE.PointLight[] = [];
    const flames: THREE.Sprite[] = [];
    for (let i = 0; i < MAX_LIGHTS; i++) {
      const pl = new THREE.PointLight(0xffffff, 0, 14, 1.6); scene.add(pl); lights.push(pl);
      const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      spr.visible = false; scene.add(spr); flames.push(spr);
    }

    scene.fog = new THREE.Fog(theme.background, theme.fogNear, theme.fogFar);
    scene.background = new THREE.Color(theme.background);
    camera.fov = 75; camera.near = 0.05; camera.far = 200; camera.updateProjectionMatrix();

    const bufW = renderer.domElement.width, bufH = renderer.domElement.height;
    const composer = new EffectComposer(renderer);
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

    const c: SceneCtx = {
      scene, camera, renderer, composer, bloom, mesh, decal, character,
      ambient, hemi, moon, fill, lights, flames, params, theme, ambientBase: theme.lighting.ambient, hemiBase: 0,
      trail, trailPos, trailCount: 0, trailLast: null,
      writing, writeMeshes: [], raycaster,
      miniScene, miniCam, miniBand, miniMarker,
      stridePhase: 0, bufW, bufH,
    };
    ctxRef.current = c;
    applyTheme(c, theme, ambientMul);

    clockRef.current.start();
    const animate = () => {
      const cx = ctxRef.current;
      if (!cx) return;
      const dt = Math.min(0.05, clockRef.current.getDelta());
      timeRef.current += dt;
      const time = timeRef.current;

      const k = keysRef.current;
      const fwd = (k.fwd ? 1 : 0) - (k.back ? 1 : 0);
      const strafe = (k.right ? 1 : 0) - (k.left ? 1 : 0);
      const moving = !!(fwd || strafe);
      if (moving) {
        const v = speedRef.current * dt;
        const cyaw = Math.cos(yawRef.current), syaw = Math.sin(yawRef.current);
        sRef.current += (fwd * cyaw - strafe * syaw) * v;
        const halfW = cx.params.width - 0.3;
        wRef.current = Math.max(-halfW, Math.min(halfW, wRef.current + (fwd * syaw + strafe * cyaw) * v));
        cx.stridePhase += dt * speedRef.current * 1.6;
      }

      const circ = 2 * Math.PI * cx.params.radius;
      const period = cx.params.tiltTurns % 2 === 1 ? 2 : 1;
      const t = (((sRef.current / circ) % period) + period) % period;
      const f = frameAt(t, cx.params);

      const up = f.b;
      const right = f.n.clone().negate();
      const yaw = yawRef.current, pitch = pitchRef.current;
      const facing = new THREE.Vector3()
        .addScaledVector(f.tangent, Math.cos(yaw)).addScaledVector(right, Math.sin(yaw)).normalize();
      const foot = f.center.clone().addScaledVector(right, wRef.current).addScaledVector(f.b, -cx.params.height);
      const eye = foot.clone().addScaledVector(up, EYE_HEIGHT);
      const lookDir = facing.clone().multiplyScalar(Math.cos(pitch)).addScaledVector(up, Math.sin(pitch)).normalize();

      const charRight = new THREE.Vector3().crossVectors(up, facing).normalize();
      cx.character.group.position.copy(foot);
      cx.character.group.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(charRight, up, facing));
      cx.character.group.visible = thirdRef.current;
      cx.character.stride(cx.stridePhase);

      if (thirdRef.current) {
        // Keep the avatar centred (target it directly) and scale the camera
        // back + up on narrow/portrait aspects, where the small horizontal FOV
        // otherwise magnifies it into a legs-in-face view.
        const aspect = cx.camera.aspect || 1;
        const distScale = Math.min(1.6, Math.max(1, 1 / Math.min(aspect, 1)));
        const D = 3.0 * distScale;
        const H = 2.1 + (distScale - 1) * 0.9 + pitch * 1.6;
        const camPos = foot.clone().addScaledVector(facing, -D).addScaledVector(up, H);
        const target = foot.clone().addScaledVector(up, 1.2);
        cx.camera.up.copy(up); cx.camera.position.copy(camPos); cx.camera.lookAt(target);
      } else {
        cx.camera.up.copy(up); cx.camera.position.copy(eye); cx.camera.lookAt(eye.clone().add(lookDir));
      }
      cx.fill.position.copy(eye);

      // Write text on the wall (one stamp per request).
      if (stampRef.current) { stampRef.current = false; stampText(cx, eye, lookDir, up, wallTextRef.current); }

      // Emitter lights.
      const L = cx.theme.lighting.emitter;
      const count = Math.min(L.count, MAX_LIGHTS);
      const base = Math.round(sRef.current / L.spacing);
      for (let i = 0; i < MAX_LIGHTS; i++) {
        const pl = cx.lights[i], spr = cx.flames[i];
        if (i >= count) { pl.visible = false; spr.visible = false; continue; }
        const slot = base + i - (count >> 1);
        const st = (((slot * L.spacing / circ) % period) + period) % period;
        const ff = frameAt(st, cx.params);
        const side = (slot & 1) ? 1 : -1;
        const pos = ff.center.clone()
          .addScaledVector(ff.n, side * cx.params.width * 0.85)
          .addScaledVector(ff.b, cx.params.height * 0.35);
        const fl = flicker(L.flicker, time, slot * 1.7, L.amp);
        pl.visible = true; pl.position.copy(pos); pl.color.setHex(L.color);
        pl.intensity = L.intensity * fl; pl.distance = L.distance; pl.decay = L.decay;
        if (L.spriteSize > 0) {
          spr.visible = true; spr.position.copy(pos);
          const sc = L.spriteSize * (0.85 + 0.4 * fl); spr.scale.set(sc, sc, sc);
          (spr.material as THREE.SpriteMaterial).color.setHex(L.color);
        } else spr.visible = false;
      }

      const floorPt = foot.clone().addScaledVector(up, 0.03);
      if (moving && (!cx.trailLast || floorPt.distanceTo(cx.trailLast) > TRAIL_SPACING)) {
        if (cx.trailCount >= TRAIL_MAX_PAIRS) { cx.trailPos.copyWithin(0, 6); cx.trailCount--; }
        const o = cx.trailCount * 6;
        cx.trailPos[o] = floorPt.x + right.x * TRAIL_HALF_W;
        cx.trailPos[o + 1] = floorPt.y + right.y * TRAIL_HALF_W;
        cx.trailPos[o + 2] = floorPt.z + right.z * TRAIL_HALF_W;
        cx.trailPos[o + 3] = floorPt.x - right.x * TRAIL_HALF_W;
        cx.trailPos[o + 4] = floorPt.y - right.y * TRAIL_HALF_W;
        cx.trailPos[o + 5] = floorPt.z - right.z * TRAIL_HALF_W;
        cx.trailCount++; cx.trailLast = floorPt.clone();
        (cx.trail.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
        cx.trail.geometry.setDrawRange(0, Math.max(0, (cx.trailCount - 1) * 6));
      }

      const w = cx.renderer.domElement.width, h = cx.renderer.domElement.height;
      if (w !== cx.bufW || h !== cx.bufH) { cx.bufW = w; cx.bufH = h; cx.composer.setSize(w, h); }

      if (bloomRef.current) cx.composer.render();
      else cx.renderer.render(cx.scene, cx.camera);

      // Mini-map: an orbiting inset view of the loop with the avatar marker,
      // drawn into the top-right corner via a scissored viewport. Coordinates
      // are CSS pixels (lower-left origin) — three multiplies by the pixel ratio
      // internally, so we must NOT pre-multiply by dpr.
      if (miniRef.current) {
        const r = cx.renderer, el = r.domElement;
        const Wc = el.clientWidth, Hc = el.clientHeight;
        const mm = Math.min(150, Math.floor(Math.min(Wc, Hc) * 0.34)), gg = 12;
        const vx = Wc - gg - mm, vy = Hc - gg - mm, vw = mm, vh = mm;

        cx.miniMarker.position.copy(f.center).addScaledVector(f.b, 1.7);
        cx.miniMarker.quaternion.setFromUnitVectors(MINI_UP, facing);
        const rad = cx.params.radius, ang = time * 0.18, Dm = rad * 2.6;
        cx.miniCam.position.set(Math.cos(ang) * Dm, Math.sin(ang) * Dm, rad * 1.7);
        cx.miniCam.up.set(0, 0, 1);
        cx.miniCam.lookAt(0, 0, 0);

        r.setScissorTest(true);
        r.setViewport(vx, vy, vw, vh);
        r.setScissor(vx, vy, vw, vh);
        r.setClearColor(MINI_BG, 1);
        r.clear(true, true, false);
        r.render(cx.miniScene, cx.miniCam);
        r.setScissorTest(false);
        r.setViewport(0, 0, Wc, Hc);
        r.setClearColor(0x000000, 0);
      }

      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearTrail = useCallback(() => {
    const c = ctxRef.current; if (!c) return;
    c.trailCount = 0; c.trailLast = null; c.trail.geometry.setDrawRange(0, 0);
  }, []);
  const clearWriting = useCallback(() => {
    const c = ctxRef.current; if (!c) return;
    for (const m of c.writeMeshes) {
      c.writing.remove(m); m.geometry.dispose();
      (m.material as THREE.MeshBasicMaterial).map?.dispose(); (m.material as THREE.Material).dispose();
    }
    c.writeMeshes = [];
  }, []);

  // Twist or width changes reshape the corridor; rebuild geometry, clear marks.
  useEffect(() => {
    twistRef.current = twist;
    const c = ctxRef.current; if (!c) return;
    const params: CorridorParams = { ...c.params, tiltTurns: twist ? 1 : 0, width };
    c.mesh.geometry.dispose(); c.mesh.geometry = makeCorridorGeometry(params);
    c.decal.geometry.dispose(); c.decal.geometry = makeFloorDecalGeometry(params);
    c.miniBand.geometry.dispose(); c.miniBand.geometry = makeMiniBandGeometry(params);
    c.params = params; clearTrail(); clearWriting();
  }, [twist, width, clearTrail, clearWriting]);

  useEffect(() => {
    const c = ctxRef.current; if (c) applyTheme(c, THEMES.find((t) => t.id === themeId) ?? DEFAULT_THEME, ambientMul);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeId]);

  useEffect(() => {
    const c = ctxRef.current; if (!c) return;
    c.ambient.intensity = c.ambientBase * ambientMul;
    c.hemi.intensity = c.hemiBase * ambientMul;
  }, [ambientMul]);

  useEffect(() => { const c = ctxRef.current; if (c) c.decal.visible = markers; }, [markers]);

  useEffect(() => {
    const map: Record<string, MoveKey> = {
      KeyW: 'fwd', ArrowUp: 'fwd', KeyS: 'back', ArrowDown: 'back',
      KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
    };
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space') { if (!e.repeat) stampRef.current = true; e.preventDefault(); return; }
      const m = map[e.code]; if (m) { keysRef.current[m] = true; e.preventDefault(); }
    };
    const up = (e: KeyboardEvent) => {
      const m = map[e.code]; if (m) { keysRef.current[m] = false; e.preventDefault(); }
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  useEffect(() => () => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    const c = ctxRef.current; ctxRef.current = null;
    if (c) {
      c.mesh.geometry.dispose(); (c.mesh.material as THREE.MeshPhysicalMaterial).map?.dispose(); (c.mesh.material as THREE.Material).dispose();
      c.decal.geometry.dispose(); ((c.decal.material as THREE.MeshBasicMaterial).map)?.dispose(); (c.decal.material as THREE.Material).dispose();
      c.trail.geometry.dispose(); (c.trail.material as THREE.Material).dispose();
      for (const m of c.writeMeshes) { m.geometry.dispose(); (m.material as THREE.MeshBasicMaterial).map?.dispose(); (m.material as THREE.Material).dispose(); }
      c.miniBand.geometry.dispose(); (c.miniBand.material as THREE.Material).dispose();
      c.miniMarker.geometry.dispose(); (c.miniMarker.material as THREE.Material).dispose();
      c.character.dispose();
      c.composer.dispose();
    }
  }, []);

  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    dragRef.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current; if (!d) return;
    yawRef.current += (e.clientX - d.x) * LOOK_SENS;
    pitchRef.current = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, pitchRef.current - (e.clientY - d.y) * LOOK_SENS));
    d.x = e.clientX; d.y = e.clientY;
  };
  const onPointerUp = () => { dragRef.current = null; };

  return (
    <>
      <div
        style={{ position: 'absolute', inset: 0, cursor: 'grab', touchAction: 'none' }}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove}
        onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
      >
        <Canvas3D onMount={onMount} />
      </div>

      <MovePad onSet={setKey} onWrite={requestStamp} />

      {miniMap && (
        <div style={{
          position: 'absolute', top: 12, right: 12, width: 150, height: 150,
          pointerEvents: 'none', border: '1px solid rgba(255,255,255,0.18)',
          borderRadius: 8, boxShadow: '0 4px 14px rgba(0,0,0,0.45)',
        }}>
          <div style={{
            position: 'absolute', top: 4, left: 8, fontSize: 10, letterSpacing: '0.08em',
            color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase',
          }}>Map</div>
        </div>
      )}

      <div style={{
        position: 'absolute', top: 12, left: 0, right: 0, textAlign: 'center',
        color: 'rgba(255,255,255,0.6)', fontSize: 12, pointerEvents: 'none', textShadow: '0 1px 2px #000',
      }}>
        Drag to look · WASD / arrows move · Space (or ✎) writes your text on the wall
      </div>

      <ShellSettings>
        <Section title="Scene" icon="∞" defaultOpen>
          <Select label="Theme" options={THEMES.map((t) => ({ value: t.id, label: t.label }))} value={themeId} onChange={setThemeId} />
          <Checkbox label="Third-person view" checked={thirdPerson} onChange={setThirdPerson} />
          <Checkbox label="Floor markers (UP arrows)" checked={markers} onChange={setMarkers} />
          <Checkbox label="Cinematic bloom (GPU)" checked={bloomOn} onChange={setBloomOn} />
          <Checkbox label="Mini-map" checked={miniMap} onChange={setMiniMap} />
          <Slider label="Corridor width" value={width} min={0.8} max={4} step={0.1} onChange={setWidth} format={(v) => v.toFixed(1)} />
          <Slider label="Ambient light" value={ambientMul} min={0} max={2.5} step={0.05} onChange={setAmbientMul} format={(v) => `${Math.round(v * 100)}%`} />
          <Slider label="Move speed" value={moveSpeed} min={1} max={14} step={0.5} onChange={setMoveSpeed} format={(v) => v.toFixed(1)} />
        </Section>
        <Section title="Writing" icon="✎" defaultOpen>
          <label className="cp-row">
            <div className="cp-row-label"><span>Wall text</span></div>
            <input
              type="text" value={wallText} maxLength={24}
              onChange={(e) => setWallText(e.target.value)}
              style={{
                background: 'rgba(255,255,255,0.06)', color: 'var(--cp-fg)',
                border: '1px solid var(--cp-border)', borderRadius: 4, padding: '6px 8px', fontSize: 13, width: '100%',
              }}
            />
          </label>
          <div style={{ fontSize: 11, color: 'var(--cp-fg-dim)' }}>
            Aim at a wall and press Space (or ✎) to paint it. Come around to read it from the other side.
          </div>
        </Section>
      </ShellSettings>

      <ShellActions>
        <div className="cp-section-body">
          <button style={actionBtn(twist)} onClick={() => setTwist((t) => !t)}>
            {twist ? 'Disable twist (plain loop)' : 'Enable Möbius twist'}
          </button>
          <button style={actionBtn(false)} onClick={clearTrail}>Clear trail</button>
          <button style={actionBtn(false)} onClick={clearWriting}>Clear writing</button>
        </div>
      </ShellActions>
    </>
  );
}

function actionBtn(active: boolean): React.CSSProperties {
  return {
    padding: '12px 16px', borderRadius: 6, border: '1px solid var(--cp-border)',
    background: active ? 'rgba(255, 212, 0, 0.18)' : 'rgba(255,255,255,0.06)',
    color: 'var(--cp-fg)', cursor: 'pointer', fontSize: 14, textAlign: 'left',
  };
}

function MovePad({ onSet, onWrite }: { onSet: (k: MoveKey, v: boolean) => void; onWrite: () => void }) {
  const mv = (k: MoveKey, label: string, style: React.CSSProperties) => (
    <button
      aria-label={k}
      onPointerDown={(e) => { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); onSet(k, true); }}
      onPointerUp={() => onSet(k, false)}
      onPointerCancel={() => onSet(k, false)}
      onPointerLeave={(e) => { if (e.buttons === 0) onSet(k, false); }}
      style={padBtn(style)}
    >{label}</button>
  );
  return (
    <div style={{ position: 'absolute', bottom: 20, right: 20, width: 150, height: 150, zIndex: 20 }}>
      {mv('fwd', '▲', { top: 0, left: 52 })}
      {mv('left', '◀', { top: 52, left: 0 })}
      {mv('right', '▶', { top: 52, left: 104 })}
      {mv('back', '▼', { top: 104, left: 52 })}
      <button
        aria-label="write"
        onPointerDown={(e) => { e.preventDefault(); onWrite(); }}
        style={padBtn({ top: 104, left: 0, background: 'rgba(40,120,140,0.7)' })}
      >✎</button>
    </div>
  );
}

function padBtn(style: React.CSSProperties): React.CSSProperties {
  return {
    position: 'absolute', width: 46, height: 46, ...style,
    borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)',
    background: (style.background as string) ?? 'rgba(12,12,16,0.6)', color: '#f0f0f3', fontSize: 18,
    backdropFilter: 'blur(6px)', cursor: 'pointer', touchAction: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  };
}
