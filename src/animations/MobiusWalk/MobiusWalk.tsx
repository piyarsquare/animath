import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import Canvas3D from '@/components/Canvas3D';
import {
  makeCorridorGeometry, makeFloorDecalGeometry, DEFAULT_PARAMS, frameAt, CorridorParams,
} from './corridorGeometry';
import { makeCorridorMaterial } from './shaders/corridorMaterial';
import { makeCharacter, Character } from './character';
import { THEMES, DEFAULT_THEME, MobiusTheme, floorMarkerTexture } from './themes';
import { ShellActions, ShellSettings, useAppHeader, useAppExplainer } from '../../components/AppShell';
import { Section, Slider, Select, Checkbox } from '../../components/ControlPanel';
import explainerText from './EXPLAINER.md?raw';

const EYE_HEIGHT = 1.6;
const LOOK_SENS = 0.0035;
const MAX_PITCH = 1.2;

const TRAIL_MAX_PAIRS = 2200;
const TRAIL_SPACING = 0.3;
const TRAIL_HALF_W = 0.14;

interface SceneCtx {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  mesh: THREE.Mesh;
  decal: THREE.Mesh;
  character: Character;
  ambient: THREE.AmbientLight;
  lamp: THREE.PointLight;
  params: CorridorParams;
  trail: THREE.Mesh;
  trailPos: Float32Array;
  trailCount: number;
  trailLast: THREE.Vector3 | null;
  stridePhase: number;
}

type MoveKey = 'fwd' | 'back' | 'left' | 'right';

function applyTheme(c: SceneCtx, theme: MobiusTheme) {
  c.scene.background = new THREE.Color(theme.background);
  (c.scene.fog as THREE.Fog).color.setHex(theme.background);
  (c.scene.fog as THREE.Fog).near = theme.fogNear;
  (c.scene.fog as THREE.Fog).far = theme.fogFar;
  c.ambient.intensity = theme.ambient;
  c.lamp.color.setHex(theme.lampColor);
  c.lamp.intensity = theme.lampIntensity;
  const old = c.mesh.material as THREE.MeshPhysicalMaterial;
  old.map?.dispose();
  old.dispose();
  c.mesh.material = makeCorridorMaterial(theme);
}

export default function MobiusWalk() {
  const [twist, setTwist] = useState(true);
  const [moveSpeed, setMoveSpeed] = useState(6);
  const [themeId, setThemeId] = useState(DEFAULT_THEME.id);
  const [thirdPerson, setThirdPerson] = useState(true);
  const [markers, setMarkers] = useState(true);

  useAppHeader('Möbius Walk', twist ? 'twisted corridor' : 'untwisted corridor');
  useAppExplainer(explainerText);

  const ctxRef = useRef<SceneCtx | null>(null);
  const rafRef = useRef<number | null>(null);
  const clockRef = useRef(new THREE.Clock());

  const sRef = useRef(0);
  const wRef = useRef(0);
  const yawRef = useRef(0);
  const pitchRef = useRef(0);
  const keysRef = useRef<Record<MoveKey, boolean>>({ fwd: false, back: false, left: false, right: false });
  const speedRef = useRef(moveSpeed);
  const twistRef = useRef(twist);
  const thirdRef = useRef(thirdPerson);
  useEffect(() => { speedRef.current = moveSpeed; }, [moveSpeed]);
  useEffect(() => { thirdRef.current = thirdPerson; }, [thirdPerson]);

  const setKey = useCallback((k: MoveKey, v: boolean) => { keysRef.current[k] = v; }, []);

  const onMount = useCallback(({ scene, camera, renderer }: {
    scene: THREE.Scene; camera: THREE.PerspectiveCamera; renderer: THREE.WebGLRenderer;
  }) => {
    const theme = THEMES.find((t) => t.id === themeId) ?? DEFAULT_THEME;
    const params: CorridorParams = { ...DEFAULT_PARAMS, tiltTurns: twistRef.current ? 1 : 0 };

    const mesh = new THREE.Mesh(makeCorridorGeometry(params), makeCorridorMaterial(theme));
    scene.add(mesh);

    // Floor-marker decal (forward arrows + "UP"): read it on the floor, then see
    // it overhead and reversed after a lap.
    const decal = new THREE.Mesh(
      makeFloorDecalGeometry(params),
      new THREE.MeshBasicMaterial({
        map: floorMarkerTexture(), transparent: true, side: THREE.DoubleSide, depthWrite: false,
      }),
    );
    decal.frustumCulled = false;
    scene.add(decal);

    const character = makeCharacter();
    scene.add(character.group);

    // Red trail ribbon dropped on the floor as you walk.
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
    trail.frustumCulled = false;
    scene.add(trail);

    const ambient = new THREE.AmbientLight(0xffffff, theme.ambient);
    scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 0.4);
    dir.position.set(5, 5, 5);
    scene.add(dir);
    const lamp = new THREE.PointLight(theme.lampColor, theme.lampIntensity, 36, 1.5);
    scene.add(lamp);

    scene.background = new THREE.Color(theme.background);
    scene.fog = new THREE.Fog(theme.background, theme.fogNear, theme.fogFar);

    camera.fov = 75; camera.near = 0.05; camera.far = 200; camera.updateProjectionMatrix();

    ctxRef.current = {
      scene, camera, renderer, mesh, decal, character, ambient, lamp, params,
      trail, trailPos, trailCount: 0, trailLast: null, stridePhase: 0,
    };

    clockRef.current.start();
    const animate = () => {
      const c = ctxRef.current;
      if (!c) return;
      const dt = Math.min(0.05, clockRef.current.getDelta());

      const k = keysRef.current;
      const fwd = (k.fwd ? 1 : 0) - (k.back ? 1 : 0);
      const strafe = (k.right ? 1 : 0) - (k.left ? 1 : 0);
      const moving = !!(fwd || strafe);
      if (moving) {
        const v = speedRef.current * dt;
        const cy = Math.cos(yawRef.current);
        const sy = Math.sin(yawRef.current);
        sRef.current += (fwd * cy - strafe * sy) * v;
        const halfW = c.params.width - 0.3;
        wRef.current = Math.max(-halfW, Math.min(halfW, wRef.current + (fwd * sy + strafe * cy) * v));
        c.stridePhase += dt * speedRef.current * 1.6;
      }

      const circ = 2 * Math.PI * c.params.radius;
      const period = c.params.tiltTurns % 2 === 1 ? 2 : 1;
      const t = (((sRef.current / circ) % period) + period) % period;
      const f = frameAt(t, c.params);

      const up = f.b;
      const right = f.n.clone().negate();
      const yaw = yawRef.current;
      const pitch = pitchRef.current;
      const facing = new THREE.Vector3()
        .addScaledVector(f.tangent, Math.cos(yaw))
        .addScaledVector(right, Math.sin(yaw))
        .normalize();

      const foot = f.center.clone().addScaledVector(right, wRef.current).addScaledVector(f.b, -c.params.height);

      // Character placement + stride.
      const charRight = new THREE.Vector3().crossVectors(up, facing).normalize();
      const m = new THREE.Matrix4().makeBasis(charRight, up, facing);
      c.character.group.position.copy(foot);
      c.character.group.quaternion.setFromRotationMatrix(m);
      c.character.group.visible = thirdRef.current;
      c.character.stride(c.stridePhase);

      // Camera.
      if (thirdRef.current) {
        const camHeight = 1.9 + pitch * 1.6;
        const camPos = foot.clone().addScaledVector(facing, -3.0).addScaledVector(up, camHeight);
        const target = foot.clone().addScaledVector(up, 1.0).addScaledVector(facing, 1.2);
        c.camera.up.copy(up);
        c.camera.position.copy(camPos);
        c.camera.lookAt(target);
        c.lamp.position.copy(foot).addScaledVector(up, 1.6);
      } else {
        const eye = foot.clone().addScaledVector(up, EYE_HEIGHT);
        const lookDir = facing.clone().multiplyScalar(Math.cos(pitch)).addScaledVector(up, Math.sin(pitch));
        c.camera.up.copy(up);
        c.camera.position.copy(eye);
        c.camera.lookAt(eye.clone().add(lookDir));
        c.lamp.position.copy(eye).addScaledVector(up, 0.3);
      }

      // Lay the trail just above the floor under the feet.
      const floorPt = foot.clone().addScaledVector(up, 0.03);
      if (moving && (!c.trailLast || floorPt.distanceTo(c.trailLast) > TRAIL_SPACING)) {
        if (c.trailCount >= TRAIL_MAX_PAIRS) { c.trailPos.copyWithin(0, 6); c.trailCount--; }
        const o = c.trailCount * 6;
        c.trailPos[o] = floorPt.x + right.x * TRAIL_HALF_W;
        c.trailPos[o + 1] = floorPt.y + right.y * TRAIL_HALF_W;
        c.trailPos[o + 2] = floorPt.z + right.z * TRAIL_HALF_W;
        c.trailPos[o + 3] = floorPt.x - right.x * TRAIL_HALF_W;
        c.trailPos[o + 4] = floorPt.y - right.y * TRAIL_HALF_W;
        c.trailPos[o + 5] = floorPt.z - right.z * TRAIL_HALF_W;
        c.trailCount++;
        c.trailLast = floorPt.clone();
        (c.trail.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
        c.trail.geometry.setDrawRange(0, Math.max(0, (c.trailCount - 1) * 6));
      }

      c.renderer.render(c.scene, c.camera);
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearTrail = useCallback(() => {
    const c = ctxRef.current;
    if (!c) return;
    c.trailCount = 0; c.trailLast = null; c.trail.geometry.setDrawRange(0, 0);
  }, []);

  // Rebuild corridor + decal when the twist toggles; clear the (now-misplaced) trail.
  useEffect(() => {
    twistRef.current = twist;
    const c = ctxRef.current;
    if (!c) return;
    const params: CorridorParams = { ...DEFAULT_PARAMS, tiltTurns: twist ? 1 : 0 };
    c.mesh.geometry.dispose();
    c.mesh.geometry = makeCorridorGeometry(params);
    c.decal.geometry.dispose();
    c.decal.geometry = makeFloorDecalGeometry(params);
    c.params = params;
    clearTrail();
  }, [twist, clearTrail]);

  // Theme switch.
  useEffect(() => {
    const c = ctxRef.current;
    if (!c) return;
    applyTheme(c, THEMES.find((t) => t.id === themeId) ?? DEFAULT_THEME);
  }, [themeId]);

  // Floor-marker visibility.
  useEffect(() => {
    const c = ctxRef.current;
    if (c) c.decal.visible = markers;
  }, [markers]);

  // Keyboard movement.
  useEffect(() => {
    const map: Record<string, MoveKey> = {
      KeyW: 'fwd', ArrowUp: 'fwd', KeyS: 'back', ArrowDown: 'back',
      KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
    };
    const down = (e: KeyboardEvent) => { const m = map[e.code]; if (m) { keysRef.current[m] = true; e.preventDefault(); } };
    const up = (e: KeyboardEvent) => { const m = map[e.code]; if (m) { keysRef.current[m] = false; e.preventDefault(); } };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  useEffect(() => () => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    const c = ctxRef.current;
    ctxRef.current = null;
    if (c) {
      c.mesh.geometry.dispose();
      (c.mesh.material as THREE.MeshPhysicalMaterial).map?.dispose();
      (c.mesh.material as THREE.Material).dispose();
      c.decal.geometry.dispose();
      ((c.decal.material as THREE.MeshBasicMaterial).map)?.dispose();
      (c.decal.material as THREE.Material).dispose();
      c.trail.geometry.dispose();
      (c.trail.material as THREE.Material).dispose();
      c.character.dispose();
    }
  }, []);

  // Drag to look / turn.
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    dragRef.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    yawRef.current += (e.clientX - d.x) * LOOK_SENS;
    pitchRef.current = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, pitchRef.current - (e.clientY - d.y) * LOOK_SENS));
    d.x = e.clientX; d.y = e.clientY;
  };
  const onPointerUp = () => { dragRef.current = null; };

  return (
    <>
      <div
        style={{ position: 'absolute', inset: 0, cursor: 'grab', touchAction: 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <Canvas3D onMount={onMount} />
      </div>

      <MovePad onSet={setKey} />

      <div style={{
        position: 'absolute', top: 12, left: 0, right: 0, textAlign: 'center',
        color: 'rgba(255,255,255,0.6)', fontSize: 12, pointerEvents: 'none', textShadow: '0 1px 2px #000',
      }}>
        Drag to look/turn · WASD / arrows or the pad to move
      </div>

      <ShellSettings>
        <Section title="Scene" icon="∞" defaultOpen>
          <Select
            label="Theme"
            options={THEMES.map((t) => ({ value: t.id, label: t.label }))}
            value={themeId}
            onChange={setThemeId}
          />
          <Checkbox label="Third-person view" checked={thirdPerson} onChange={setThirdPerson} />
          <Checkbox label="Floor markers (UP arrows)" checked={markers} onChange={setMarkers} />
          <Slider
            label="Move speed" value={moveSpeed}
            min={1} max={14} step={0.5}
            onChange={setMoveSpeed} format={(v) => v.toFixed(1)}
          />
        </Section>
      </ShellSettings>

      <ShellActions>
        <div className="cp-section-body">
          <button
            style={actionBtn(twist)}
            onClick={() => setTwist((t) => !t)}
          >
            {twist ? 'Disable twist (plain loop)' : 'Enable Möbius twist'}
          </button>
          <button style={actionBtn(false)} onClick={clearTrail}>Clear trail</button>
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

function MovePad({ onSet }: { onSet: (k: MoveKey, v: boolean) => void }) {
  const btn = (k: MoveKey, label: string, style: React.CSSProperties) => (
    <button
      aria-label={k}
      onPointerDown={(e) => { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); onSet(k, true); }}
      onPointerUp={() => onSet(k, false)}
      onPointerCancel={() => onSet(k, false)}
      onPointerLeave={(e) => { if (e.buttons === 0) onSet(k, false); }}
      style={{
        position: 'absolute', width: 46, height: 46, ...style,
        borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)',
        background: 'rgba(12,12,16,0.6)', color: '#f0f0f3', fontSize: 18,
        backdropFilter: 'blur(6px)', cursor: 'pointer', touchAction: 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >{label}</button>
  );
  return (
    <div style={{ position: 'absolute', bottom: 20, right: 20, width: 150, height: 150, zIndex: 20 }}>
      {btn('fwd', '▲', { top: 0, left: 52 })}
      {btn('left', '◀', { top: 52, left: 0 })}
      {btn('right', '▶', { top: 52, left: 104 })}
      {btn('back', '▼', { top: 104, left: 52 })}
    </div>
  );
}
