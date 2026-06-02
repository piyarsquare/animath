import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import Canvas3D from '@/components/Canvas3D';
import { makeCorridorGeometry, DEFAULT_PARAMS, frameAt, CorridorParams } from './corridorGeometry';
import { corridorMaterial } from './shaders/corridorMaterial';
import { ShellActions, ShellSettings, useAppHeader, useAppExplainer } from '../../components/AppShell';
import { Section, Slider } from '../../components/ControlPanel';
import explainerText from './EXPLAINER.md?raw';

const EYE_HEIGHT = 1.6;          // camera height above the floor
const LOOK_SENS = 0.0035;        // radians per pixel dragged
const MAX_PITCH = 1.3;           // ~75°

const TRAIL_MAX_PAIRS = 2200;    // ribbon capacity (~4 laps); oldest drops off
const TRAIL_SPACING = 0.3;       // min metres between trail samples
const TRAIL_HALF_W = 0.14;       // ribbon half-width

interface SceneCtx {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  mesh: THREE.Mesh;
  lamp: THREE.PointLight;
  params: CorridorParams;
  trail: THREE.Mesh;
  trailPos: Float32Array;
  trailCount: number;        // number of vertex pairs laid
  trailLast: THREE.Vector3 | null;
}

type MoveKey = 'fwd' | 'back' | 'left' | 'right';

/**
 * First-person walk along the floor of a corridor whose rectangular section is
 * looped with a half-twist — a Möbius strip. You drive the movement and look
 * freely; "up" is always the floor's surface normal, so as you walk the loop the
 * world rolls until you're standing where the ceiling used to be (a full lap),
 * returning to normal after two laps.
 */
export default function MobiusWalk() {
  const [twist, setTwist] = useState(true);
  const [moveSpeed, setMoveSpeed] = useState(6);

  useAppHeader('Möbius Walk', twist ? 'twisted corridor' : 'untwisted corridor');
  useAppExplainer(explainerText);

  const ctxRef = useRef<SceneCtx | null>(null);
  const rafRef = useRef<number | null>(null);
  const clockRef = useRef(new THREE.Clock());

  // Player state (refs so the animation loop reads live values).
  const sRef = useRef(0);     // arc position along the corridor
  const wRef = useRef(0);     // lateral position across the floor
  const yawRef = useRef(0);   // look yaw (around surface normal)
  const pitchRef = useRef(0); // look pitch
  const keysRef = useRef<Record<MoveKey, boolean>>({ fwd: false, back: false, left: false, right: false });
  const speedRef = useRef(moveSpeed);
  const twistRef = useRef(twist);
  useEffect(() => { speedRef.current = moveSpeed; }, [moveSpeed]);

  const setKey = useCallback((k: MoveKey, v: boolean) => { keysRef.current[k] = v; }, []);

  const onMount = useCallback(({ scene, camera, renderer }: {
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
  }) => {
    const params: CorridorParams = { ...DEFAULT_PARAMS, tiltTurns: twistRef.current ? 1 : 0 };

    const mesh = new THREE.Mesh(makeCorridorGeometry(params), corridorMaterial());
    scene.add(mesh);

    // Red trail ribbon dropped on the floor as you walk. Pre-allocated; the
    // index stitches consecutive vertex pairs into a strip, drawRange grows as
    // samples are laid. DoubleSide + unlit so it stays bright red and is just
    // as visible when you later see it overhead on the ceiling.
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
    const trail = new THREE.Mesh(
      trailGeo,
      new THREE.MeshBasicMaterial({ color: 0xff2740, side: THREE.DoubleSide }),
    );
    trail.frustumCulled = false;
    scene.add(trail);

    scene.add(new THREE.AmbientLight(0xffffff, 0.45));
    const dir = new THREE.DirectionalLight(0xffffff, 0.5);
    dir.position.set(5, 5, 5);
    scene.add(dir);
    const lamp = new THREE.PointLight(0xfff1e0, 10, 36, 1.5);
    scene.add(lamp);

    scene.background = new THREE.Color(0x05050a);
    scene.fog = new THREE.Fog(0x05050a, 6, 30);

    camera.fov = 75;
    camera.near = 0.05;
    camera.far = 200;
    camera.updateProjectionMatrix();

    ctxRef.current = { scene, camera, renderer, mesh, lamp, params, trail, trailPos, trailCount: 0, trailLast: null };

    clockRef.current.start();
    const animate = () => {
      const c = ctxRef.current;
      if (!c) return;
      const dt = Math.min(0.05, clockRef.current.getDelta());

      // Movement, relative to where you're facing (yaw), in the floor plane.
      const k = keysRef.current;
      const fwd = (k.fwd ? 1 : 0) - (k.back ? 1 : 0);
      const strafe = (k.right ? 1 : 0) - (k.left ? 1 : 0);
      if (fwd || strafe) {
        const v = speedRef.current * dt;
        const cy = Math.cos(yawRef.current);
        const sy = Math.sin(yawRef.current);
        sRef.current += (fwd * cy - strafe * sy) * v;            // along corridor
        const halfW = c.params.width - 0.3;
        wRef.current = Math.max(-halfW, Math.min(halfW,
          wRef.current + (fwd * sy + strafe * cy) * v));         // across floor
      }

      // Position on the (possibly twisting) floor; up = floor normal.
      const circ = 2 * Math.PI * c.params.radius;
      const period = c.params.tiltTurns % 2 === 1 ? 2 : 1; // laps before the frame repeats
      const t = (((sRef.current / circ) % period) + period) % period;
      const f = frameAt(t, c.params);

      const up = f.b;                              // surface normal = gravity-up
      const right = f.n.clone().negate();          // player's right on the floor
      const eye = f.center.clone()
        .addScaledVector(right, wRef.current)
        .addScaledVector(f.b, -(c.params.height - EYE_HEIGHT));

      const yaw = yawRef.current;
      const pitch = pitchRef.current;
      const cp = Math.cos(pitch);
      const lookDir = new THREE.Vector3()
        .addScaledVector(f.tangent, cp * Math.cos(yaw))
        .addScaledVector(right, cp * Math.sin(yaw))
        .addScaledVector(up, Math.sin(pitch));

      c.camera.up.copy(up);
      c.camera.position.copy(eye);
      c.camera.lookAt(eye.clone().add(lookDir));
      // Headlamp at eye level (not ahead) so looking at a near wall doesn't bloom.
      c.lamp.position.copy(eye).addScaledVector(up, 0.3);

      // Lay the trail on the floor just beneath the feet.
      const floorPt = eye.clone().addScaledVector(up, -(EYE_HEIGHT - 0.03));
      if (!c.trailLast || floorPt.distanceTo(c.trailLast) > TRAIL_SPACING) {
        if (c.trailCount >= TRAIL_MAX_PAIRS) {
          c.trailPos.copyWithin(0, 6);   // drop the oldest pair
          c.trailCount--;
        }
        const o = c.trailCount * 6;
        c.trailPos[o]     = floorPt.x + right.x * TRAIL_HALF_W;
        c.trailPos[o + 1] = floorPt.y + right.y * TRAIL_HALF_W;
        c.trailPos[o + 2] = floorPt.z + right.z * TRAIL_HALF_W;
        c.trailPos[o + 3] = floorPt.x - right.x * TRAIL_HALF_W;
        c.trailPos[o + 4] = floorPt.y - right.y * TRAIL_HALF_W;
        c.trailPos[o + 5] = floorPt.z - right.z * TRAIL_HALF_W;
        c.trailCount++;
        c.trailLast = floorPt.clone();
        const attr = c.trail.geometry.getAttribute('position') as THREE.BufferAttribute;
        attr.needsUpdate = true;
        c.trail.geometry.setDrawRange(0, Math.max(0, (c.trailCount - 1) * 6));
      }

      c.renderer.render(c.scene, c.camera);
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
  }, []);

  const clearTrail = useCallback(() => {
    const c = ctxRef.current;
    if (!c) return;
    c.trailCount = 0;
    c.trailLast = null;
    c.trail.geometry.setDrawRange(0, 0);
  }, []);

  // Rebuild the corridor in place when the twist toggles (no canvas remount).
  // The old trail no longer lies on the reshaped floor, so clear it.
  useEffect(() => {
    twistRef.current = twist;
    const c = ctxRef.current;
    if (!c) return;
    const params: CorridorParams = { ...DEFAULT_PARAMS, tiltTurns: twist ? 1 : 0 };
    c.mesh.geometry.dispose();
    c.mesh.geometry = makeCorridorGeometry(params);
    c.params = params;
    clearTrail();
  }, [twist, clearTrail]);

  // Keyboard: WASD / arrow keys.
  useEffect(() => {
    const map: Record<string, MoveKey> = {
      KeyW: 'fwd', ArrowUp: 'fwd',
      KeyS: 'back', ArrowDown: 'back',
      KeyA: 'left', ArrowLeft: 'left',
      KeyD: 'right', ArrowRight: 'right',
    };
    const down = (e: KeyboardEvent) => {
      const m = map[e.code];
      if (m) { keysRef.current[m] = true; e.preventDefault(); }
    };
    const up = (e: KeyboardEvent) => {
      const m = map[e.code];
      if (m) { keysRef.current[m] = false; e.preventDefault(); }
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  // Stop the loop and release the scene on unmount.
  useEffect(() => () => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    const c = ctxRef.current;
    ctxRef.current = null;
    if (c) {
      c.mesh.geometry.dispose();
      (c.mesh.material as THREE.Material).dispose();
      c.trail.geometry.dispose();
      (c.trail.material as THREE.Material).dispose();
    }
  }, []);

  // Drag-to-look.
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
    d.x = e.clientX;
    d.y = e.clientY;
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
        color: 'rgba(255,255,255,0.6)', fontSize: 12, pointerEvents: 'none',
        textShadow: '0 1px 2px #000',
      }}>
        Drag to look · WASD / arrows or the pad to move
      </div>

      <ShellSettings>
        <Section title="Walk" icon="∞" defaultOpen>
          <Slider
            label="Move speed"
            value={moveSpeed}
            min={1} max={14} step={0.5}
            onChange={setMoveSpeed}
            format={(v) => v.toFixed(1)}
          />
        </Section>
      </ShellSettings>

      <ShellActions>
        <div className="cp-section-body">
          <button
            style={{
              padding: '12px 16px', borderRadius: 6,
              border: '1px solid var(--cp-border)',
              background: twist ? 'rgba(255, 212, 0, 0.18)' : 'rgba(255,255,255,0.06)',
              color: 'var(--cp-fg)', cursor: 'pointer', fontSize: 14, textAlign: 'left',
            }}
            onClick={() => setTwist((t) => !t)}
          >
            {twist ? 'Disable twist (plain loop)' : 'Enable Möbius twist'}
          </button>
          <button
            style={{
              padding: '12px 16px', borderRadius: 6,
              border: '1px solid var(--cp-border)',
              background: 'rgba(255,255,255,0.06)',
              color: 'var(--cp-fg)', cursor: 'pointer', fontSize: 14, textAlign: 'left',
            }}
            onClick={clearTrail}
          >
            Clear trail
          </button>
        </div>
      </ShellActions>
    </>
  );
}

/* On-screen movement pad — works on touch and as a discoverable desktop hint. */
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
