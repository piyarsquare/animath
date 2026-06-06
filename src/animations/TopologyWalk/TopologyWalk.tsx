import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import Canvas3D from '@/components/Canvas3D';
import { ShellActions, ShellSettings, useAppHeader, useAppExplainer } from '../../components/AppShell';
import { Section, Slider, Select, Pills, Checkbox } from '../../components/ControlPanel';
import { THEMES, DEFAULT_THEME } from './themes';
import { DEFAULT_PARAMS } from './corridorGeometry';
import {
  Family, SURFACES, surfaceDef, EngineDeps, EngineOptions, WorldEngine,
} from './engine';
import { makeCorridorEngine } from './corridorEngine';
import { makeFlatEngine } from './flatEngine';
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
const DEFAULT_SURFACE: Record<Family, string> = { corridor: 'mobius', flat: 'torus' };

type MoveKey = 'fwd' | 'back' | 'left' | 'right';

function makeEngine(family: Family, deps: EngineDeps, opts: EngineOptions): WorldEngine {
  return family === 'corridor' ? makeCorridorEngine(deps, opts) : makeFlatEngine(deps, opts);
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
  const [floorOpacity, setFloorOpacity] = useState(0.72);
  const [wallText, setWallText] = useState('MÖBIUS');

  const def = surfaceDef(surfaceId);
  const family = def.family;
  const isCorridor = family === 'corridor';

  useAppHeader('Topology Walk', def.short);
  useAppExplainer(explainerText);

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
  const lastByFamily = useRef<Record<Family, string>>({ corridor: 'mobius', flat: 'klein' });
  const optsRef = useRef<EngineOptions>({ surfaceId, width, themeId, ambientMul, markers, bloom, miniMap, projectAvatar, floorOpacity });

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const clearTrail = useCallback(() => { ctxRef.current?.engine.clearTrail(); }, []);
  const clearWriting = useCallback(() => { ctxRef.current?.engine.clearWriting?.(); }, []);

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

  return (
    <>
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

      <div style={{
        position: 'absolute', top: 12, left: 0, right: 0, textAlign: 'center',
        color: 'rgba(255,255,255,0.6)', fontSize: 12, pointerEvents: 'none', textShadow: '0 1px 2px #000',
      }}>
        {isCorridor
          ? 'Drag to look · WASD / arrows move · Space (or ✎) writes your text on the wall'
          : 'Drag to look · WASD / arrows or the pad to walk · landmarks repeat — columns turn to trees across the Klein flip'}
      </div>

      <ShellSettings>
        <Section title="World" icon="∞" defaultOpen>
          <Pills
            label="Setting"
            options={[{ value: 'corridor', label: 'Corridor (hallway)' }, { value: 'flat', label: 'Open space' }]}
            value={family}
            onChange={(v) => switchWorld(v as Family)}
          />
          <Select label="Surface" options={surfaceOptions} value={surfaceId} onChange={setSurfaceId} />
          <Checkbox label="Third-person view" checked={thirdPerson} onChange={setThirdPerson} />
          {!isCorridor && (
            <Checkbox label="Project avatar into every cell" checked={projectAvatar} onChange={setProjectAvatar} />
          )}
          {!isCorridor && (
            <Slider label="Floor opacity" value={floorOpacity} min={0} max={1} step={0.05} onChange={setFloorOpacity} format={(v) => `${Math.round(v * 100)}%`} />
          )}
          <Slider label="Walk speed" value={moveSpeed} min={1} max={16} step={0.5} onChange={setMoveSpeed} format={(v) => v.toFixed(1)} />
          <div style={{ fontSize: 11, color: 'var(--cp-fg-dim)' }}>
            {isCorridor
              ? 'Walk a lap of the Möbius corridor and the floor rolls up into the ceiling.'
              : 'Red edges glue with a flip on the Klein bottle (columns ↔ trees across them); blue edges glue straight.'}
          </div>
        </Section>

        {isCorridor && (
          <Section title="Scene" icon="✦" defaultOpen>
            <Select label="Theme" options={THEMES.map((t) => ({ value: t.id, label: t.label }))} value={themeId} onChange={setThemeId} />
            <Checkbox label="Floor markers (UP arrows)" checked={markers} onChange={setMarkers} />
            <Checkbox label="Cinematic bloom (GPU)" checked={bloom} onChange={setBloom} />
            <Checkbox label="Mini-map" checked={miniMap} onChange={setMiniMap} />
            <Slider label="Corridor width" value={width} min={0.8} max={4} step={0.1} onChange={setWidth} format={(v) => v.toFixed(1)} />
            <Slider label="Ambient light" value={ambientMul} min={0} max={2.5} step={0.05} onChange={setAmbientMul} format={(v) => `${Math.round(v * 100)}%`} />
          </Section>
        )}

        {isCorridor && (
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
        )}
      </ShellSettings>

      <ShellActions>
        <div className="cp-section-body">
          <button style={actionBtn} onClick={clearTrail}>Clear trail</button>
          {isCorridor && <button style={actionBtn} onClick={clearWriting}>Clear writing</button>}
        </div>
      </ShellActions>
    </>
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
