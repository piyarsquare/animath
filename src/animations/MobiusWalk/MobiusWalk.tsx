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

const PAINT_MAX = 5000;
const PAINT_REACH = 7;
const PAINT_SPACING = 0.08;

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
  trail: THREE.Mesh;
  trailPos: Float32Array;
  trailCount: number;
  trailLast: THREE.Vector3 | null;
  paint: THREE.Points;
  paintPos: Float32Array;
  paintCount: number;
  paintLast: THREE.Vector3 | null;
  raycaster: THREE.Raycaster;
  stridePhase: number;
  bufW: number;
  bufH: number;
}

function flicker(kind: FlickerKind, t: number, seed: number, amp: number): number {
  if (kind === 'steady' || amp <= 0) return 1;
  if (kind === 'pulse') return 1 - amp * 0.5 * (1 + Math.sin(t * 2.2 + seed));
  if (kind === 'candle') return 1 - amp * (1 - (Math.sin(t * 5 + seed) * 0.5 + 0.5));
  const n = (Math.sin(t * 13 + seed) * 0.5 + 0.5) * 0.6 + (Math.sin(t * 29 + seed * 2.3) * 0.5 + 0.5) * 0.4;
  return 1 - amp * (1 - n); // torch
}

function applyTheme(c: SceneCtx, theme: MobiusTheme) {
  c.theme = theme;
  const L = theme.lighting;
  c.scene.background = new THREE.Color(theme.background);
  const fog = c.scene.fog as THREE.Fog;
  fog.color.setHex(theme.background); fog.near = theme.fogNear; fog.far = theme.fogFar;
  c.renderer.toneMappingExposure = L.exposure;

  c.ambient.intensity = L.ambient;
  c.hemi.visible = !!L.hemi;
  if (L.hemi) { c.hemi.color.setHex(L.hemi.sky); c.hemi.groundColor.setHex(L.hemi.ground); c.hemi.intensity = L.hemi.intensity; }
  c.moon.visible = !!L.moonbeam;
  if (L.moonbeam) {
    c.moon.color.setHex(L.moonbeam.color); c.moon.intensity = L.moonbeam.intensity;
    c.moon.position.set(...L.moonbeam.dir);
  }
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
  const [themeId, setThemeId] = useState(DEFAULT_THEME.id);
  const [thirdPerson, setThirdPerson] = useState(true);
  const [markers, setMarkers] = useState(true);
  const [bloomOn, setBloomOn] = useState(true);

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
  const paintRef = useRef(false);
  const speedRef = useRef(moveSpeed);
  const twistRef = useRef(twist);
  const thirdRef = useRef(thirdPerson);
  const bloomRef = useRef(bloomOn);
  useEffect(() => { speedRef.current = moveSpeed; }, [moveSpeed]);
  useEffect(() => { thirdRef.current = thirdPerson; }, [thirdPerson]);
  useEffect(() => { bloomRef.current = bloomOn; }, [bloomOn]);

  const setKey = useCallback((k: MoveKey, v: boolean) => { keysRef.current[k] = v; }, []);
  const setPaint = useCallback((v: boolean) => { paintRef.current = v; }, []);

  const onMount = useCallback(({ scene, camera, renderer }: {
    scene: THREE.Scene; camera: THREE.PerspectiveCamera; renderer: THREE.WebGLRenderer;
  }) => {
    const theme = THEMES.find((t) => t.id === themeId) ?? DEFAULT_THEME;
    const params: CorridorParams = { ...DEFAULT_PARAMS, tiltTurns: twistRef.current ? 1 : 0 };

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

    // Trail.
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

    // Wall-writing "ink" — additive glowing points.
    const paintPos = new Float32Array(PAINT_MAX * 3);
    const paintGeo = new THREE.BufferGeometry();
    paintGeo.setAttribute('position', new THREE.BufferAttribute(paintPos, 3));
    paintGeo.setDrawRange(0, 0);
    const paint = new THREE.Points(paintGeo, new THREE.PointsMaterial({
      size: 0.24, sizeAttenuation: true, map: glow, color: 0x8af7ff,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    paint.frustumCulled = false; scene.add(paint);

    // Lights.
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

    // Post-processing (GPU bloom).
    const bufW = renderer.domElement.width, bufH = renderer.domElement.height;
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(bufW, bufH),
      theme.lighting.bloom.strength, theme.lighting.bloom.radius, theme.lighting.bloom.threshold);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
    composer.setSize(bufW, bufH);

    const raycaster = new THREE.Raycaster(); raycaster.far = PAINT_REACH;

    const c: SceneCtx = {
      scene, camera, renderer, composer, bloom, mesh, decal, character,
      ambient, hemi, moon, fill, lights, flames, params, theme,
      trail, trailPos, trailCount: 0, trailLast: null,
      paint, paintPos, paintCount: 0, paintLast: null, raycaster,
      stridePhase: 0, bufW, bufH,
    };
    ctxRef.current = c;
    applyTheme(c, theme);

    clockRef.current.start();
    const animate = () => {
      const cx = ctxRef.current;
      if (!cx) return;
      const dt = Math.min(0.05, clockRef.current.getDelta());
      timeRef.current += dt;
      const time = timeRef.current;

      // Movement.
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

      // Character.
      const charRight = new THREE.Vector3().crossVectors(up, facing).normalize();
      cx.character.group.position.copy(foot);
      cx.character.group.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(charRight, up, facing));
      cx.character.group.visible = thirdRef.current;
      cx.character.stride(cx.stridePhase);

      // Camera.
      if (thirdRef.current) {
        const camPos = foot.clone().addScaledVector(facing, -3.0).addScaledVector(up, 1.9 + pitch * 1.6);
        const target = foot.clone().addScaledVector(up, 1.0).addScaledVector(facing, 1.2);
        cx.camera.up.copy(up); cx.camera.position.copy(camPos); cx.camera.lookAt(target);
      } else {
        cx.camera.up.copy(up); cx.camera.position.copy(eye); cx.camera.lookAt(eye.clone().add(lookDir));
      }
      cx.fill.position.copy(eye);

      // Emitter lights (torches/candles/…) near the player, with flicker.
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

      // Wall writing.
      if (paintRef.current) {
        cx.raycaster.set(eye, lookDir);
        const hit = cx.raycaster.intersectObject(cx.mesh, false)[0];
        if (hit) {
          const p = hit.point.clone().addScaledVector(eye.clone().sub(hit.point).normalize(), 0.03);
          if (!cx.paintLast || p.distanceTo(cx.paintLast) > PAINT_SPACING) {
            if (cx.paintCount >= PAINT_MAX) { cx.paintPos.copyWithin(0, 3); cx.paintCount--; }
            const o = cx.paintCount * 3;
            cx.paintPos[o] = p.x; cx.paintPos[o + 1] = p.y; cx.paintPos[o + 2] = p.z;
            cx.paintCount++; cx.paintLast = p.clone();
            (cx.paint.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
            cx.paint.geometry.setDrawRange(0, cx.paintCount);
          }
        }
      }

      // Floor trail.
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

      // Keep the composer sized to the drawing buffer.
      const w = cx.renderer.domElement.width, h = cx.renderer.domElement.height;
      if (w !== cx.bufW || h !== cx.bufH) { cx.bufW = w; cx.bufH = h; cx.composer.setSize(w, h); }

      if (bloomRef.current) cx.composer.render();
      else cx.renderer.render(cx.scene, cx.camera);
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
    c.paintCount = 0; c.paintLast = null; c.paint.geometry.setDrawRange(0, 0);
  }, []);

  useEffect(() => {
    twistRef.current = twist;
    const c = ctxRef.current; if (!c) return;
    const params: CorridorParams = { ...DEFAULT_PARAMS, tiltTurns: twist ? 1 : 0 };
    c.mesh.geometry.dispose(); c.mesh.geometry = makeCorridorGeometry(params);
    c.decal.geometry.dispose(); c.decal.geometry = makeFloorDecalGeometry(params);
    c.params = params; clearTrail(); clearWriting();
  }, [twist, clearTrail, clearWriting]);

  useEffect(() => {
    const c = ctxRef.current; if (!c) return;
    applyTheme(c, THEMES.find((t) => t.id === themeId) ?? DEFAULT_THEME);
  }, [themeId]);

  useEffect(() => { const c = ctxRef.current; if (c) c.decal.visible = markers; }, [markers]);

  useEffect(() => {
    const map: Record<string, MoveKey> = {
      KeyW: 'fwd', ArrowUp: 'fwd', KeyS: 'back', ArrowDown: 'back',
      KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
    };
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space') { paintRef.current = true; e.preventDefault(); return; }
      const m = map[e.code]; if (m) { keysRef.current[m] = true; e.preventDefault(); }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') { paintRef.current = false; e.preventDefault(); return; }
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
      c.paint.geometry.dispose(); (c.paint.material as THREE.Material).dispose();
      c.character.dispose();
      c.composer.dispose();
    }
  }, []);

  // Drag to look / turn.
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

      <MovePad onSet={setKey} onPaint={setPaint} />

      <div style={{
        position: 'absolute', top: 12, left: 0, right: 0, textAlign: 'center',
        color: 'rgba(255,255,255,0.6)', fontSize: 12, pointerEvents: 'none', textShadow: '0 1px 2px #000',
      }}>
        Drag to look · WASD / arrows move · Space (or ✎) writes on the wall
      </div>

      <ShellSettings>
        <Section title="Scene" icon="∞" defaultOpen>
          <Select label="Theme" options={THEMES.map((t) => ({ value: t.id, label: t.label }))} value={themeId} onChange={setThemeId} />
          <Checkbox label="Third-person view" checked={thirdPerson} onChange={setThirdPerson} />
          <Checkbox label="Floor markers (UP arrows)" checked={markers} onChange={setMarkers} />
          <Checkbox label="Cinematic bloom (GPU)" checked={bloomOn} onChange={setBloomOn} />
          <Slider label="Move speed" value={moveSpeed} min={1} max={14} step={0.5} onChange={setMoveSpeed} format={(v) => v.toFixed(1)} />
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

function MovePad({ onSet, onPaint }: { onSet: (k: MoveKey, v: boolean) => void; onPaint: (v: boolean) => void }) {
  const hold = (down: () => void, upFn: () => void, label: string, style: React.CSSProperties, aria: string) => (
    <button
      aria-label={aria}
      onPointerDown={(e) => { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); down(); }}
      onPointerUp={upFn}
      onPointerCancel={upFn}
      onPointerLeave={(e) => { if (e.buttons === 0) upFn(); }}
      style={{
        position: 'absolute', width: 46, height: 46, ...style,
        borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)',
        background: 'rgba(12,12,16,0.6)', color: '#f0f0f3', fontSize: 18,
        backdropFilter: 'blur(6px)', cursor: 'pointer', touchAction: 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >{label}</button>
  );
  const mv = (k: MoveKey, label: string, style: React.CSSProperties) =>
    hold(() => onSet(k, true), () => onSet(k, false), label, style, k);
  return (
    <div style={{ position: 'absolute', bottom: 20, right: 20, width: 150, height: 150, zIndex: 20 }}>
      {mv('fwd', '▲', { top: 0, left: 52 })}
      {mv('left', '◀', { top: 52, left: 0 })}
      {mv('right', '▶', { top: 52, left: 104 })}
      {mv('back', '▼', { top: 104, left: 52 })}
      {hold(() => onPaint(true), () => onPaint(false), '✎', { top: 104, left: 0, background: 'rgba(40,120,140,0.6)' }, 'write')}
    </div>
  );
}
