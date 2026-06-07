import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import Canvas3D from '@/components/Canvas3D';
import { ShellActions, ShellSettings, useAppHeader, useAppExplainer } from '../../components/AppShell';
import { Section, Slider, Select, Checkbox } from '../../components/ControlPanel';
import { WORLDS, worldById, WorldSpec } from './worldSpec';
import { makeFundamentalSquareEngine } from './fundamentalSquareEngine';
import { EngineDeps, PolygonEngine, SquareMapState } from './engineTypes';
import { drawSquareMap, SquareMapSpec, SquareEdgeSpec } from './squareMap';
import explainerText from './EXPLAINER.md?raw';

const LOOK_SENS = 0.0035;
const MAX_PITCH = 1.3;

// Phase 1: the Euclidean worlds are live; the spherical cover (sphere / ℝP²)
// lands next, so only the flat worlds are offered for now.
const READY = new Set(['torus', 'klein']);

type MoveKey = 'fwd' | 'back' | 'left' | 'right';

export default function PolygonWorlds() {
  const [worldId, setWorldId] = useState('klein');
  const [moveSpeed, setMoveSpeed] = useState(6);
  const [thirdPerson, setThirdPerson] = useState(true);
  const [floorOpacity, setFloorOpacity] = useState(0.35);

  const spec = worldById(worldId);
  useAppHeader('Polygon Worlds', spec.short);
  useAppExplainer(explainerText);

  const engineRef = useRef<PolygonEngine | null>(null);
  const depsRef = useRef<EngineDeps | null>(null);
  const rafRef = useRef<number | null>(null);
  const clockRef = useRef(new THREE.Clock());

  const yawRef = useRef(0);
  const pitchRef = useRef(0);
  const keysRef = useRef<Record<MoveKey, boolean>>({ fwd: false, back: false, left: false, right: false });
  const speedRef = useRef(moveSpeed);
  const thirdRef = useRef(thirdPerson);
  const worldRef = useRef(spec);

  const setKey = useCallback((k: MoveKey, v: boolean) => { keysRef.current[k] = v; }, []);

  const onMount = useCallback(({ scene, camera, renderer }: {
    scene: THREE.Scene; camera: THREE.PerspectiveCamera; renderer: THREE.WebGLRenderer;
  }) => {
    const deps: EngineDeps = { scene, camera, renderer };
    depsRef.current = deps;
    engineRef.current = makeFundamentalSquareEngine(deps, worldRef.current);
    clockRef.current.start();
    const animate = () => {
      const eng = engineRef.current;
      if (eng) {
        const dt = Math.min(0.05, clockRef.current.getDelta());
        const k = keysRef.current;
        eng.frame({
          dt,
          fwd: (k.fwd ? 1 : 0) - (k.back ? 1 : 0),
          strafe: (k.right ? 1 : 0) - (k.left ? 1 : 0),
          yaw: yawRef.current, pitch: pitchRef.current,
          moveSpeed: speedRef.current, thirdPerson: thirdRef.current,
        });
      }
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Rebuild the engine when the world changes (different cover/gluing).
  useEffect(() => {
    worldRef.current = spec;
    const deps = depsRef.current;
    if (!deps || !engineRef.current) return;
    engineRef.current.dispose();
    engineRef.current = makeFundamentalSquareEngine(deps, spec);
  }, [spec]);

  useEffect(() => { speedRef.current = moveSpeed; }, [moveSpeed]);
  useEffect(() => { thirdRef.current = thirdPerson; }, [thirdPerson]);
  useEffect(() => { engineRef.current?.setFloorOpacity(floorOpacity); }, [floorOpacity]);

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
    engineRef.current?.dispose();
    engineRef.current = null;
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

  const getMapState = useCallback(() => engineRef.current?.getMapState() ?? null, []);
  const worldOptions = WORLDS.filter((w) => READY.has(w.id)).map((w) => ({ value: w.id, label: w.label }));

  return (
    <>
      <div
        style={{ position: 'absolute', inset: 0, cursor: 'grab', touchAction: 'none' }}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove}
        onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
      >
        <Canvas3D onMount={onMount} />
      </div>

      <MovePad onSet={setKey} />
      <SquareMiniMap getState={getMapState} spec={spec} />

      <div style={{
        position: 'absolute', top: 12, left: 0, right: 0, textAlign: 'center',
        color: 'rgba(255,255,255,0.6)', fontSize: 12, pointerEvents: 'none', textShadow: '0 1px 2px #000',
      }}>
        Drag to look · WASD / arrows or the pad to walk · the square's gluing decides the world
      </div>

      <ShellSettings>
        <Section title="World" icon="⬚" defaultOpen>
          <Select label="Gluing" options={worldOptions} value={worldId} onChange={setWorldId} />
          <Checkbox label="Third-person view" checked={thirdPerson} onChange={setThirdPerson} />
          <Slider label="Glass floor opacity" value={floorOpacity} min={0} max={1} step={0.05} onChange={setFloorOpacity} format={(v) => `${Math.round(v * 100)}%`} />
          <Slider label="Walk speed" value={moveSpeed} min={1} max={16} step={0.5} onChange={setMoveSpeed} format={(v) => v.toFixed(1)} />
          <div style={{ fontSize: 11, color: 'var(--cp-fg-dim)' }}>
            One square, four gluings. {spec.orientable ? 'Orientable' : 'Non-orientable'} · χ = {spec.chi}.
            Sphere and ℝP² (the curved worlds) are coming next.
          </div>
        </Section>
      </ShellSettings>

      <ShellActions>
        <div className="cp-section-body">
          <button style={actionBtn} onClick={() => engineRef.current?.clearTrail()}>Clear trail</button>
        </div>
      </ShellActions>
    </>
  );
}

const actionBtn: React.CSSProperties = {
  padding: '12px 16px', borderRadius: 6, border: '1px solid var(--cp-border)',
  background: 'rgba(255,255,255,0.06)', color: 'var(--cp-fg)', cursor: 'pointer', fontSize: 14, textAlign: 'left',
};

function MovePad({ onSet }: { onSet: (k: MoveKey, v: boolean) => void }) {
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
    </div>
  );
}

function padBtn(style: React.CSSProperties): React.CSSProperties {
  return {
    position: 'absolute', width: 46, height: 46, ...style,
    borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(12,12,16,0.6)', color: '#f0f0f3', fontSize: 18,
    backdropFilter: 'blur(6px)', cursor: 'pointer', touchAction: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  };
}

const MAP_RED = '#ff4060', MAP_BLUE = '#4080ff', MAP_TEAL = '#34d6c0', MAP_PURPLE = '#b070ff';

/** Build the square mini-map spec from the world's edge identifications + the
 *  player chart. (Opposite-edge worlds for now; the sphere's adjacent fold lands
 *  with the spherical cover.) */
function squareSpec(spec: WorldSpec, st: SquareMapState | null): SquareMapSpec {
  // a = left/right pair, b = top/bottom pair
  const aFlip = spec.edges.left.orient === -1 || spec.edges.right.orient === -1;
  const bFlip = spec.edges.top.orient === -1 || spec.edges.bottom.orient === -1;
  const lr: SquareEdgeSpec = { color: aFlip ? (bFlip ? MAP_PURPLE : MAP_RED) : MAP_TEAL, glue: aFlip ? 'flip' : 'straight', double: true };
  const tb: SquareEdgeSpec = { color: bFlip ? MAP_RED : MAP_BLUE, glue: bFlip ? 'flip' : 'straight', double: false };
  const marker = st
    ? { sx: (st.u - 0.5) * 2, sy: (st.v - 0.5) * 2, angle: Math.atan2(-st.hz, st.hx), flipped: st.flipped }
    : null;
  const label = !st ? '' : st.flipped ? `${spec.label} · mirror side` : spec.label;
  return { tb, lr, marker, dots: [], border: false, label };
}

function SquareMiniMap({ getState, spec }: { getState: () => SquareMapState | null; spec: WorldSpec }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const specRef = useRef(spec);
  specRef.current = spec;
  useEffect(() => {
    const cvs = canvasRef.current; if (!cvs) return;
    const ctx = cvs.getContext('2d'); if (!ctx) return;
    const SIZE = 150;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cvs.width = SIZE * dpr; cvs.height = SIZE * dpr;
    ctx.scale(dpr, dpr);
    let raf = 0;
    const loop = () => { drawSquareMap(ctx, SIZE, squareSpec(specRef.current, getState())); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [getState]);
  return (
    <div style={{
      position: 'absolute', top: 12, right: 12, width: 150, height: 150,
      pointerEvents: 'none', border: '1px solid rgba(255,255,255,0.18)',
      borderRadius: 8, boxShadow: '0 4px 14px rgba(0,0,0,0.45)', overflow: 'hidden',
    }}>
      <canvas ref={canvasRef} style={{ width: 150, height: 150, display: 'block' }} />
      <div style={{
        position: 'absolute', top: 4, left: 8, fontSize: 10, letterSpacing: '0.08em',
        color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase',
      }}>Map</div>
    </div>
  );
}
