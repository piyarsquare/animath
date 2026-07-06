import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import Canvas3D from '@/components/Canvas3D';
import Workspace from '../../chrome/workspace/Workspace';
import type { LayoutDef, SectionDef, ViewDef } from '../../chrome/workspace/types';
import { Slider, Select, Pills, Checkbox } from '../../components/ControlPanel';
import { THEMES, DEFAULT_THEME } from './themes';
import { DEFAULT_PARAMS } from './corridorGeometry';
import {
  Family, SURFACES, surfaceDef, EngineDeps, EngineOptions, WorldEngine, FlatMapState, SphereMapState,
} from './engine';
import { makeCorridorEngine } from './corridorEngine';
import { makeFlatEngine } from './flatEngine';
import { makeSphericalEngine } from './sphericalEngine';
import { drawSquareMap, rp2Square, SquareMapSpec, SquareEdgeSpec, SquareDot } from './squareMap';
import explainerText from './EXPLAINER.md?raw';

const LOOK_SENS = 0.0035;
const MAX_PITCH = 1.3;

/** Phone-ish layout: portrait or a small short side. Drives mobile-friendly
 *  defaults (first-person view, bloom off). */
function isCramped(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerHeight >= window.innerWidth || Math.min(window.innerWidth, window.innerHeight) < 560;
}

/** Canonical surface to land on when the player switches worlds. */
const DEFAULT_SURFACE: Record<Family, string> = { corridor: 'mobius', flat: 'torus', spherical: 'sphere' };

type MoveKey = 'fwd' | 'back' | 'left' | 'right';

function makeEngine(family: Family, deps: EngineDeps, opts: EngineOptions): WorldEngine {
  if (family === 'corridor') return makeCorridorEngine(deps, opts);
  if (family === 'spherical') return makeSphericalEngine(deps, opts);
  return makeFlatEngine(deps, opts);
}

interface Ctx {
  deps: EngineDeps;
  engine: WorldEngine;
  family: Family;
  surfaceId: string;
}

export default function TopologyWalk() {
  const [surfaceId, setSurfaceId] = useState('klein');
  const [moveSpeed, setMoveSpeed] = useState(6);
  const [width, setWidth] = useState(DEFAULT_PARAMS.width);
  const [ambientMul, setAmbientMul] = useState(1);
  const [themeId, setThemeId] = useState(DEFAULT_THEME.id);
  // First-person by default on portrait / small screens (a chase cam is too
  // cramped on a phone); third-person elsewhere. Bloom is heavy on phones.
  const [thirdPerson, setThirdPerson] = useState(() => !isCramped());
  const [markers, setMarkers] = useState(true);
  const [bloom, setBloom] = useState(() => !isCramped());
  const [miniMap, setMiniMap] = useState(true);
  const [projectAvatar, setProjectAvatar] = useState(true);
  const [floorOpacity, setFloorOpacity] = useState(0.35);
  const [colorCells, setColorCells] = useState(false);
  const [planetRadius, setPlanetRadius] = useState(30);
  const [innerShell, setInnerShell] = useState(true);
  const [wallText, setWallText] = useState('MÖBIUS');

  const def = surfaceDef(surfaceId);
  const family = def.family;
  const isCorridor = family === 'corridor';
  const isFlat = family === 'flat';
  const isSpherical = family === 'spherical';
  // The two "rectangular" worlds: both glue a square fundamental domain and share
  // the unified glass / mini-map / other-side presentation.
  const isRect = isFlat || isSpherical;

  const ctxRef = useRef<Ctx | null>(null);
  const rafRef = useRef<number | null>(null);
  const clockRef = useRef(new THREE.Clock());
  const timeRef = useRef(0);

  const yawRef = useRef(0);
  const pitchRef = useRef(0);
  const keysRef = useRef<Record<MoveKey, boolean>>({ fwd: false, back: false, left: false, right: false });
  const stampRef = useRef(false);

  const speedRef = useRef(moveSpeed);
  const thirdRef = useRef(thirdPerson);
  const wallTextRef = useRef(wallText);
  const surfaceRef = useRef(surfaceId);
  // Remember the last surface chosen in each world, so toggling Corridor↔Flat
  // returns you to where you were rather than always resetting.
  const lastByFamily = useRef<Record<Family, string>>({ corridor: 'mobius', flat: 'klein', spherical: 'sphere' });
  const optsRef = useRef<EngineOptions>({ surfaceId, width, themeId, ambientMul, markers, bloom, miniMap, projectAvatar, floorOpacity, colorCells, planetRadius, innerShell });

  const setKey = useCallback((k: MoveKey, v: boolean) => { keysRef.current[k] = v; }, []);
  const requestStamp = useCallback(() => { stampRef.current = true; }, []);

  const onMount = useCallback(({ scene, camera, renderer }: {
    scene: THREE.Scene; camera: THREE.PerspectiveCamera; renderer: THREE.WebGLRenderer;
  }) => {
    const deps: EngineDeps = { scene, camera, renderer };
    const d = surfaceDef(surfaceRef.current);
    const engine = makeEngine(d.family, deps, optsRef.current);
    ctxRef.current = { deps, engine, family: d.family, surfaceId: surfaceRef.current };

    clockRef.current.start();
    const animate = () => {
      const c = ctxRef.current;
      if (!c) return;
      const dt = Math.min(0.05, clockRef.current.getDelta());
      timeRef.current += dt;
      const k = keysRef.current;
      const fwd = (k.fwd ? 1 : 0) - (k.back ? 1 : 0);
      const strafe = (k.right ? 1 : 0) - (k.left ? 1 : 0);
      const stamp = stampRef.current; stampRef.current = false;
      c.engine.frame({
        dt, time: timeRef.current, fwd, strafe,
        yaw: yawRef.current, pitch: pitchRef.current,
        moveSpeed: speedRef.current, thirdPerson: thirdRef.current,
        stamp, wallText: wallTextRef.current,
      });
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
  }, []);

  // Surface change: rebuild the engine when crossing the corridor/flat divide,
  // otherwise reshape the current world in place.
  useEffect(() => {
    surfaceRef.current = surfaceId;
    optsRef.current.surfaceId = surfaceId;
    const c = ctxRef.current; if (!c) return;
    const d = surfaceDef(surfaceId);
    if (d.family !== c.family) {
      c.engine.dispose();
      c.engine = makeEngine(d.family, c.deps, optsRef.current);
      c.family = d.family;
    } else if (c.surfaceId !== surfaceId) {
      c.engine.setSurface?.(surfaceId);
    }
    c.surfaceId = surfaceId;
  }, [surfaceId]);

  useEffect(() => { lastByFamily.current[surfaceDef(surfaceId).family] = surfaceId; }, [surfaceId]);

  useEffect(() => { speedRef.current = moveSpeed; }, [moveSpeed]);
  useEffect(() => { thirdRef.current = thirdPerson; }, [thirdPerson]);
  useEffect(() => { wallTextRef.current = wallText; }, [wallText]);
  useEffect(() => { optsRef.current.width = width; ctxRef.current?.engine.setWidth?.(width); }, [width]);
  useEffect(() => { optsRef.current.themeId = themeId; ctxRef.current?.engine.setTheme?.(themeId); }, [themeId]);
  useEffect(() => { optsRef.current.ambientMul = ambientMul; ctxRef.current?.engine.setAmbient?.(ambientMul); }, [ambientMul]);
  useEffect(() => { optsRef.current.markers = markers; ctxRef.current?.engine.setMarkers?.(markers); }, [markers]);
  useEffect(() => { optsRef.current.bloom = bloom; ctxRef.current?.engine.setBloom?.(bloom); }, [bloom]);
  useEffect(() => { optsRef.current.miniMap = miniMap; ctxRef.current?.engine.setMiniMap?.(miniMap); }, [miniMap]);
  useEffect(() => { optsRef.current.projectAvatar = projectAvatar; ctxRef.current?.engine.setProjectAvatar?.(projectAvatar); }, [projectAvatar]);
  useEffect(() => { optsRef.current.floorOpacity = floorOpacity; ctxRef.current?.engine.setFloorOpacity?.(floorOpacity); }, [floorOpacity]);
  useEffect(() => { optsRef.current.colorCells = colorCells; ctxRef.current?.engine.setColorCells?.(colorCells); }, [colorCells]);
  useEffect(() => { optsRef.current.planetRadius = planetRadius; ctxRef.current?.engine.setRadius?.(planetRadius); }, [planetRadius]);
  useEffect(() => { optsRef.current.innerShell = innerShell; ctxRef.current?.engine.setInnerShell?.(innerShell); }, [innerShell]);

  const clearTrail = useCallback(() => { ctxRef.current?.engine.clearTrail(); }, []);
  const clearWriting = useCallback(() => { ctxRef.current?.engine.clearWriting?.(); }, []);
  const getMapState = useCallback(() => ctxRef.current?.engine.getMapState?.() ?? null, []);
  const getSphereState = useCallback(() => ctxRef.current?.engine.getSphereState?.() ?? null, []);

  useEffect(() => {
    const map: Record<string, MoveKey> = {
      KeyW: 'fwd', ArrowUp: 'fwd', KeyS: 'back', ArrowDown: 'back',
      KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
    };
    // Never hijack keys while the user is typing in a form control (e.g. the
    // Wall-text input in the Move & write panel) — without this guard WASD /
    // Space would walk the avatar and stamp writing while they type.
    const typing = () => {
      const el = document.activeElement;
      return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT');
    };
    const down = (e: KeyboardEvent) => {
      if (typing()) return;
      if (e.code === 'Space') { if (!e.repeat) stampRef.current = true; e.preventDefault(); return; }
      const m = map[e.code]; if (m) { keysRef.current[m] = true; e.preventDefault(); }
    };
    const up = (e: KeyboardEvent) => {
      if (typing()) return;
      const m = map[e.code]; if (m) { keysRef.current[m] = false; e.preventDefault(); }
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  useEffect(() => () => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    const c = ctxRef.current; ctxRef.current = null;
    c?.engine.dispose();
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

  const switchWorld = (fam: Family) => setSurfaceId(lastByFamily.current[fam] ?? DEFAULT_SURFACE[fam]);
  const surfaceOptions = SURFACES.filter((s) => s.family === family).map((s) => ({ value: s.id, label: s.label }));

  /* ---- archetype panels (docs/redesign/PARAM-MAP.md §5) ---- */

  const worldNode = (
    <>
      <Pills
        label="Setting"
        options={[
          { value: 'corridor', label: 'Corridor (hallway)' },
          { value: 'flat', label: 'Open space (flat)' },
          { value: 'spherical', label: 'Curved (sphere)' },
        ]}
        value={family}
        onChange={(v) => switchWorld(v as Family)}
      />
      <Select label="Surface" options={surfaceOptions} value={surfaceId} onChange={setSurfaceId} />
      {isSpherical && (
        <Slider label="Planet radius" value={planetRadius} min={12} max={90} step={2} onChange={setPlanetRadius} format={(v) => `${Math.round(v)} m`} />
      )}
      {isCorridor && (
        <Slider label="Corridor width" value={width} min={0.8} max={4} step={0.1} onChange={setWidth} format={(v) => v.toFixed(1)} />
      )}
      <div className="am-hint">
        {isCorridor
          ? 'Walk a lap of the Möbius corridor and the floor rolls up into the ceiling.'
          : isSpherical
            ? 'A small planet (χ>0, positive curvature). On the projective plane antipodal points are the same spot, so your trail returns to the far side mirror-reversed.'
            : 'Red edges glue with a flip on the Klein bottle (columns ↔ trees across them); blue edges glue straight.'}
      </div>
    </>
  );

  const cameraNode = (
    <>
      <Checkbox label="Third-person view" checked={thirdPerson} onChange={setThirdPerson} />
      {isFlat && (
        <Checkbox label="Project avatar into every cell" checked={projectAvatar} onChange={setProjectAvatar} />
      )}
      <Checkbox
        label={isSpherical ? 'Mini-map (sphere)' : isFlat ? 'Mini-map (fundamental domain)' : 'Mini-map'}
        checked={miniMap}
        onChange={setMiniMap}
      />
      {isFlat && (
        <Checkbox label="Color each cover cell" checked={colorCells} onChange={setColorCells} />
      )}
    </>
  );

  const sceneNode = (
    <>
      {isCorridor && (
        <Select label="Theme" options={THEMES.map((t) => ({ value: t.id, label: t.label }))} value={themeId} onChange={setThemeId} />
      )}
      {isCorridor && (
        <Checkbox label="Floor markers (UP arrows)" checked={markers} onChange={setMarkers} />
      )}
      {/* Glass floor "see the other side" — the spherical planet can be turned
          back to a solid (the flat floor is always glass); the opacity slider is
          shared by both rectangular worlds via the unified glass helper. */}
      {isSpherical && (
        <Checkbox label="Glass floor — see the other side" checked={innerShell} onChange={setInnerShell} />
      )}
      {isRect && (isFlat || innerShell) && (
        <Slider label="Glass floor opacity" value={floorOpacity} min={0} max={1} step={0.05} onChange={setFloorOpacity} format={(v) => `${Math.round(v * 100)}%`} />
      )}
      {isCorridor && (
        <Slider label="Ambient light" value={ambientMul} min={0} max={2.5} step={0.05} onChange={setAmbientMul} format={(v) => `${Math.round(v * 100)}%`} />
      )}
    </>
  );

  const moveNode = (
    <>
      <Slider label="Walk speed" value={moveSpeed} min={1} max={16} step={0.5} onChange={setMoveSpeed} format={(v) => v.toFixed(1)} />
      {isCorridor && (
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
      )}
      {isCorridor && (
        <div className="am-hint">
          Aim at a wall and press Space (or ✎) to paint it. Come around to read it from the other side.
        </div>
      )}
      <div className="am-hint">Drag to look · W A S D to walk</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
        <button style={actionBtn} onClick={clearTrail}>Clear trail</button>
        {isCorridor && <button style={actionBtn} onClick={clearWriting}>Clear writing</button>}
      </div>
    </>
  );

  const qualityNode = isCorridor
    ? <Checkbox label="Cinematic bloom (GPU)" checked={bloom} onChange={setBloom} />
    : <div className="am-hint">Cinematic bloom applies to the corridor worlds.</div>;

  const sections: SectionDef[] = [
    { id: 'world', title: 'World', arch: 'subject', node: worldNode, estHeight: 290 },
    { id: 'camera', title: 'Camera', arch: 'view', node: cameraNode, estHeight: 190 },
    { id: 'scene', title: 'Scene', arch: 'marks', node: sceneNode, estHeight: 250 },
    { id: 'move', title: 'Move & write', arch: 'drive', node: moveNode, estHeight: 300 },
    { id: 'quality', title: 'Quality', arch: 'quality', node: qualityNode, estHeight: 110 },
  ];

  const views: ViewDef[] = [
    {
      id: 'walk',
      title: 'First-person view',
      defaultRect: { x: 372, y: 16, w: 712, h: 628 },
      node: (
        // Single wrapper: the window body forces `inset: 0` on its direct child,
        // so the bottom-right MovePad etc. must position against this container,
        // not the body itself. Look-drag handlers stay on the canvas layer only,
        // so MovePad / mini-map overlays never start a camera drag.
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
          <div
            style={{ position: 'absolute', inset: 0, cursor: 'grab', touchAction: 'none' }}
            onPointerDown={onPointerDown} onPointerMove={onPointerMove}
            onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
          >
            <Canvas3D onMount={onMount} />
          </div>

          <MovePad onSet={setKey} onWrite={isCorridor ? requestStamp : undefined} />

          {isCorridor && miniMap && (
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

          {isFlat && miniMap && <FlatMiniMap getState={getMapState} />}

          {isSpherical && miniMap && <SphereMiniMap getState={getSphereState} />}

          <div style={{
            position: 'absolute', top: 12, left: 0, right: 0, textAlign: 'center',
            color: 'rgba(255,255,255,0.6)', fontSize: 12, pointerEvents: 'none', textShadow: '0 1px 2px #000',
          }}>
            {isCorridor
              ? 'Drag to look · WASD / arrows move · Space (or ✎) writes your text on the wall'
              : isSpherical
                ? 'Drag to look · WASD / arrows or the pad to walk a great circle around the planet'
                : 'Drag to look · WASD / arrows or the pad to walk · landmarks repeat — columns turn to trees across the Klein flip'}
          </div>
        </div>
      ),
    },
  ];

  const layouts: LayoutDef[] = [
    {
      id: 'walk', name: 'Walk', sub: 'World · Move', icon: 'move',
      open: { world: { x: 84, y: 18 }, move: { x: 84, y: 330 } },
    },
  ];

  return (
    <Workspace
      appId="topology-walk"
      title="Topology Walk"
      subtitle={def.short}
      sections={sections}
      views={views}
      layouts={layouts}
      defaultLayoutId="walk"
      explainer={explainerText}
    />
  );
}

const actionBtn: React.CSSProperties = {
  padding: '12px 16px', borderRadius: 6, border: '1px solid var(--cp-border)',
  background: 'rgba(255,255,255,0.06)', color: 'var(--cp-fg)', cursor: 'pointer', fontSize: 14, textAlign: 'left',
};

function MovePad({ onSet, onWrite }: { onSet: (k: MoveKey, v: boolean) => void; onWrite?: () => void }) {
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
      {onWrite && (
        <button
          aria-label="write"
          onPointerDown={(e) => { e.preventDefault(); onWrite(); }}
          style={padBtn({ top: 104, left: 0, background: 'rgba(40,120,140,0.7)' })}
        >✎</button>
      )}
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

/**
 * A top-down map of the flat world's **fundamental domain**: the glued square,
 * its edges marked with identification arrows (single on the straight-glued blue
 * pair, double on the left/right pair — which point opposite ways for the Klein
 * flip, the same way for the torus), and a marker for the player's position and
 * heading inside it. The marker wraps across edges exactly as the world does, and
 * turns amber on the Klein bottle's mirror side.
 */
function FlatMiniMap({ getState }: { getState: () => FlatMapState | null }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const cvs = canvasRef.current; if (!cvs) return;
    const ctx = cvs.getContext('2d'); if (!ctx) return;
    const SIZE = 150;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cvs.width = SIZE * dpr; cvs.height = SIZE * dpr;
    ctx.scale(dpr, dpr);
    let raf = 0;
    const loop = () => { drawSquareMap(ctx, SIZE, flatSquareSpec(getState())); raf = requestAnimationFrame(loop); };
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

const MAP_RED = '#ff4060', MAP_BLUE = '#4080ff', MAP_TEAL = '#34d6c0';

/** Build the {@link SquareMapSpec} for the flat world: top/bottom always glue
 *  straight (blue); left/right flip (red) on the Klein bottle, straight (teal) on
 *  the torus. The marker charts (u,v)→square coords and turns amber on the mirror
 *  side. With no live state yet, the Klein default square is drawn (no marker). */
function flatSquareSpec(st: FlatMapState | null): SquareMapSpec {
  const klein = st ? st.klein : true;
  const tb: SquareEdgeSpec = { color: MAP_BLUE, glue: 'straight', double: false };
  const lr: SquareEdgeSpec = { color: klein ? MAP_RED : MAP_TEAL, glue: klein ? 'flip' : 'straight', double: true };
  const marker = st
    ? { sx: (st.u - 0.5) * 2, sy: (st.v - 0.5) * 2, angle: Math.atan2(-st.hz, st.hx), flipped: st.flipped }
    : null;
  const label = !st ? '' : klein ? (st.flipped ? 'Klein · mirror side' : 'Klein bottle') : 'Flat torus';
  return { tb, lr, marker, dots: [], border: false, label };
}

/**
 * An equirectangular (latitude × longitude) map of the spherical world: a grid,
 * the emphasized equator + hemisphere-seam meridian, the color-coded landmarks
 * (plus their antipodal twins on ℝP²), and a chevron at the player's position
 * pointing along the compass bearing. When the cover hemispheres are tinted in 3D,
 * the map tints its two halves to match — the seam is the gluing circle of ℝP².
 */
function SphereMiniMap({ getState }: { getState: () => SphereMapState | null }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const cvs = canvasRef.current; if (!cvs) return;
    const ctx = cvs.getContext('2d'); if (!ctx) return;
    const SIZE = 150;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cvs.width = SIZE * dpr; cvs.height = SIZE * dpr;
    ctx.scale(dpr, dpr);
    let raf = 0;
    const loop = () => {
      const st = getState();
      if (st && st.rp2) drawSquareMap(ctx, SIZE, rp2SquareSpec(st));
      else drawSphereMap(ctx, SIZE, st);
      raf = requestAnimationFrame(loop);
    };
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

const TAU = Math.PI * 2;

function drawSphereMap(ctx: CanvasRenderingContext2D, size: number, st: SphereMapState | null) {
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = 'rgba(10,12,20,0.72)';
  ctx.fillRect(0, 0, size, size);

  const m = 16, w = size - 2 * m, x0 = m, y0 = m;
  // map a (lat,lon) to canvas: lon -π..π → left..right, lat +π/2..-π/2 → top..bottom
  const px = (lon: number) => x0 + ((((lon + Math.PI) % TAU) + TAU) % TAU) / TAU * w;
  const py = (lat: number) => y0 + (Math.PI / 2 - lat) / Math.PI * w;

  // domain interior (+ hemisphere tint matching the 3D cover skins: the z>0 /
  // lon>0 half is the forest, the z<0 / lon<0 half the colonnade).
  ctx.fillStyle = 'rgba(40,54,80,0.5)';
  ctx.fillRect(x0, y0, w, w);
  if (st && st.colored) {
    ctx.globalAlpha = 0.38;
    ctx.fillStyle = '#c2cad6'; ctx.fillRect(x0, y0, w / 2, w);        // lon<0 columns
    ctx.fillStyle = '#3f9a48'; ctx.fillRect(x0 + w / 2, y0, w / 2, w); // lon>0 trees
    ctx.globalAlpha = 1;
  }

  // graticule
  ctx.strokeStyle = 'rgba(156,192,216,0.28)'; ctx.lineWidth = 1;
  for (let i = 1; i < 6; i++) {
    const gx = x0 + (i / 6) * w; ctx.beginPath(); ctx.moveTo(gx, y0); ctx.lineTo(gx, y0 + w); ctx.stroke();
  }
  for (let j = 1; j < 4; j++) {
    const gy = y0 + (j / 4) * w; ctx.beginPath(); ctx.moveTo(x0, gy); ctx.lineTo(x0 + w, gy); ctx.stroke();
  }
  // emphasized equator + hemisphere seam meridian (lon = ±π/2 in this −π..π frame
  // are the seam edges; the center line lon = 0 is the prime meridian)
  ctx.strokeStyle = 'rgba(230,242,251,0.65)'; ctx.lineWidth = 1.6;
  const yeq = y0 + w / 2; ctx.beginPath(); ctx.moveTo(x0, yeq); ctx.lineTo(x0 + w, yeq); ctx.stroke();
  ctx.strokeStyle = 'rgba(230,242,251,0.45)';
  const xseam = x0 + w / 2; ctx.beginPath(); ctx.moveTo(xseam, y0); ctx.lineTo(xseam, y0 + w); ctx.stroke();

  ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 1; ctx.strokeRect(x0, y0, w, w);

  if (!st) return;

  // landmarks (and antipodal twins on ℝP², drawn dimmer)
  const dot = (lat: number, lon: number, color: number, alpha: number) => {
    ctx.beginPath(); ctx.arc(px(lon), py(lat), 3.4, 0, TAU);
    ctx.fillStyle = '#' + new THREE.Color(color).getHexString();
    ctx.globalAlpha = alpha; ctx.fill();
    ctx.globalAlpha = 1;
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.stroke();
  };
  for (const lm of st.landmarks) {
    if (st.rp2) dot(-lm.lat, lm.lon + Math.PI, lm.color, 0.4);
    dot(lm.lat, lm.lon, lm.color, 1);
  }

  // player marker: chevron at (lat,lon), pointing up (north) at bearing 0 then
  // rotated clockwise by the compass bearing.
  ctx.save(); ctx.translate(px(st.lon), py(st.lat)); ctx.rotate(st.bearing);
  ctx.beginPath();
  ctx.moveTo(0, -8); ctx.lineTo(5.5, 5); ctx.lineTo(0, 2); ctx.lineTo(-5.5, 5); ctx.closePath();
  ctx.fillStyle = '#8ef0ff';
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.65)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.restore();

  ctx.font = '9px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillText(st.rp2 ? 'ℝP² · antipodes glued' : 'Sphere', size / 2, size - 6);
}

const MAP_PURPLE = '#b070ff';

/**
 * Build the {@link SquareMapSpec} for the ℝP² fundamental domain: a square whose
 * BOTH pairs of opposite edges glue with a flip (the antipodal identification),
 * top/bottom red, left/right purple. The player and landmarks are charted in via
 * {@link rp2Square}; the player marker turns amber on the z<0 cover sheet (the
 * "column" side). Each ℝP² point appears once — the square is the quotient, so
 * there are no antipodal twins to draw. The heading comes from a small forward
 * step charted on the SAME representative sheet (so it doesn't jump at the seam);
 * the square→canvas scale cancels in the angle, so it is computed in square coords.
 */
function rp2SquareSpec(st: SphereMapState): SquareMapSpec {
  const dots: SquareDot[] = st.landmarks.map((lm) => {
    const cl = Math.cos(lm.lat);
    const dx = cl * Math.cos(lm.lon), dy = Math.sin(lm.lat), dz = cl * Math.sin(lm.lon);
    const [sx, sy] = rp2Square(dx, dy, dz, dz < 0);
    return { sx, sy, color: lm.color };
  });

  const [ux, uy, uz] = st.up, [fx, fy, fz] = st.fwd;
  const flip = uz < 0;
  const [psx, psy] = rp2Square(ux, uy, uz, flip);
  const e = 0.06, ce = Math.cos(e), se = Math.sin(e);
  let ax = ux * ce + fx * se, ay = uy * ce + fy * se, az = uz * ce + fz * se;
  const al = Math.hypot(ax, ay, az) || 1; ax /= al; ay /= al; az /= al;
  const [qsx, qsy] = rp2Square(ax, ay, az, flip);
  // canvas y is flipped vs square y, so the heading angle negates Δsy.
  const angle = Math.atan2(-(qsy - psy), qsx - psx);

  return {
    tb: { color: MAP_RED, glue: 'flip', double: false },
    lr: { color: MAP_PURPLE, glue: 'flip', double: true },
    marker: { sx: psx, sy: psy, angle, flipped: flip },
    dots,
    border: true,
    label: flip ? 'ℝP² · column sheet' : 'ℝP² · both pairs flip',
  };
}
