import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import Canvas3D from '@/components/Canvas3D';
import Workspace from '../../chrome/workspace/Workspace';
import type { ActionDef, LayoutDef, SectionDef, ViewDef } from '../../chrome/workspace/types';
import { usePhone } from '../../chrome/usePhone';
import { Slider, Select, Pills } from '../../components/ControlPanel';
import { WORLDS, worldById, WorldSpec, deriveGeometry, analyzeWorld } from './worldSpec';
import { generateProps, ARRANGEMENTS, ArrangementId } from './decor';
import { makeFundamentalSquareEngine } from './fundamentalSquareEngine';
import { LOOKS } from './looks';
import {
  EngineDeps, PolygonEngine, SquareMapState,
  DEFAULT_SQUARE_SIZE, DEFAULT_FLOOR_THICKNESS,
} from './engineTypes';
import { drawSquareMap, SquareMapSpec, SquareEdgeSpec } from './squareMap';
import { drawPolygonMap, PolygonMapSpec } from './polygonMap';
import { parseWord } from './surfaceSchema';
import { realize } from './lib/realize';
import { usePersistentState } from '../../lib/usePersistentState';
import { EmbeddingInset } from './instruments/embeddingInset';
import explainerText from './EXPLAINER.md?raw';

const LOOK_SENS = 0.0035;
const MAX_PITCH = 1.3;
const DEFAULT_RADIUS = 30;
const CAM_MIN = 1.5, CAM_MAX = 12;       // camera-distance range (matches the slider)
const clampCam = (d: number) => Math.max(CAM_MIN, Math.min(CAM_MAX, d));

type MoveKey = 'fwd' | 'back' | 'left' | 'right';

export default function PolygonWorlds() {
  // Persistence: the genuine *settings* survive a reload (per CLAUDE.md), keyed
  // `animath:<ver>:polygon-worlds:<field>`. Navigation/view state stays
  // session-only — the selected world (so you land predictably), the
  // third-person toggle and the camera distance (transient view, per the
  // "don't persist camera" convention).
  const pk = (f: string) => `polygon-worlds:${f}`;
  const [worldId, setWorldId] = useState('klein');
  const [moveSpeed, setMoveSpeed] = usePersistentState(pk('moveSpeed'), 6);
  const [thirdPerson, setThirdPerson] = useState(true);
  const [camDistance, setCamDistance] = useState(3.2);
  // Start as clear-but-present glass: see-through enough to read the underside
  // (other face + columns + footprints), but tinted enough to know the floor is
  // there. The same value reads the same in every world (shared POLYGON_GLASS).
  const [floorOpacity, setFloorOpacity] = usePersistentState(pk('floorOpacity'), 0.45);
  const [squareSize, setSquareSize] = usePersistentState(pk('squareSize'), DEFAULT_SQUARE_SIZE);
  const [floorThickness, setFloorThickness] = usePersistentState(pk('floorThickness'), DEFAULT_FLOOR_THICKNESS);
  const [planetRadius, setPlanetRadius] = usePersistentState(pk('planetRadius'), DEFAULT_RADIUS);
  const [landmarkCount, setLandmarkCount] = usePersistentState(pk('landmarkCount'), 7);
  const [arrangement, setArrangement] = usePersistentState<ArrangementId>(pk('arrangement'), 'scattered');
  const [signFront, setSignFront] = usePersistentState(pk('signFront'), 'FRONT');
  const [signBack, setSignBack] = usePersistentState(pk('signBack'), 'BACK');
  const [look, setLook] = usePersistentState(pk('look'), 'daytime');

  const spec = worldById(worldId);
  const analysis = useMemo(() => analyzeWorld(spec), [spec]);
  const cover = deriveGeometry(spec).cover;
  const isSpherical = cover === 'spherical';
  const isHyperbolic = cover === 'hyperbolic';
  const props = useMemo(() => generateProps(landmarkCount, arrangement), [landmarkCount, arrangement]);
  // Below 740px the workspace re-chromes (full-bleed view + floating bottom dock):
  // lift the walk pad clear of the dock and move the corner overlays off the bar.
  const phone = usePhone();

  const engineRef = useRef<PolygonEngine | null>(null);
  const depsRef = useRef<EngineDeps | null>(null);
  const rafRef = useRef<number | null>(null);
  const clockRef = useRef(new THREE.Clock());

  const yawRef = useRef(0);
  const pitchRef = useRef(0);
  const keysRef = useRef<Record<MoveKey, boolean>>({ fwd: false, back: false, left: false, right: false });
  const speedRef = useRef(moveSpeed);
  const thirdRef = useRef(thirdPerson);
  const camDistRef = useRef(camDistance);
  const worldRef = useRef(spec);
  const sizeRef = useRef(squareSize);
  const thickRef = useRef(floorThickness);
  const opacityRef = useRef(floorOpacity);
  const radiusRef = useRef(planetRadius);
  const lookRef = useRef(look);
  const propsRef = useRef(props);

  const setKey = useCallback((k: MoveKey, v: boolean) => { keysRef.current[k] = v; }, []);

  const onMount = useCallback(({ scene, camera, renderer }: {
    scene: THREE.Scene; camera: THREE.PerspectiveCamera; renderer: THREE.WebGLRenderer;
  }) => {
    const deps: EngineDeps = { scene, camera, renderer };
    depsRef.current = deps;
    engineRef.current = makeFundamentalSquareEngine(deps, worldRef.current, {
      squareSize: sizeRef.current, floorThickness: thickRef.current, props: propsRef.current,
    });
    engineRef.current.setFloorOpacity(opacityRef.current);
    engineRef.current.setRadius(radiusRef.current);
    engineRef.current.setCameraDistance(camDistRef.current);
    engineRef.current.setLook(lookRef.current);
    // Test seam (opt-in via ?polydebug): exposes the live minimap chart so a headless
    // harness can tell which side of the sheet the character is on. No effect on the
    // shipped app — the bridge is only attached when the query flag is present.
    if (typeof location !== 'undefined' && location.search.includes('polydebug')) {
      (window as unknown as { __poly?: unknown }).__poly = {
        map: () => engineRef.current?.getMapState(),
        probe: () => engineRef.current?.debugProbe(),
        setYaw: (v: number) => { yawRef.current = v; },
        // mirror-ink placement audit (spherical twin worlds; null elsewhere)
        auditInk: () => engineRef.current?.auditInk(),
        // wipe the trail (used by the chirality guard to force a guaranteed
        // FRESH print on the flip side, free of any pre-crossing stamp)
        clearTrail: () => engineRef.current?.clearTrail(),
        // plant/clear the two-inked glass sign without driving the panel UI
        plantSign: (f: string, b: string) => engineRef.current?.plantSign(f, b),
        clearSigns: () => engineRef.current?.clearSigns(),
        // The decor law (S06): every rendered decor/scenery mesh is placed by a
        // PROPER (det>0) world transform — mirror-reading only ever arises from
        // genuinely viewing the back of ink, or from the ink's own det<0 render
        // transforms (ink meshes are tagged userData.ink and exempted here).
        auditDecor: () => {
          const s = depsRef.current?.scene;
          if (!s) return null;
          s.updateMatrixWorld(true);
          let meshCount = 0, improper = 0;
          const offenders: string[] = [];
          s.traverseVisible((o) => {
            const m = o as THREE.Mesh;
            if (!m.isMesh || m.userData.ink) return;
            meshCount++;
            if (m.matrixWorld.determinant() < 0) {
              improper++;
              if (offenders.length < 8) offenders.push(`${o.type}#${o.id}<${o.parent?.type ?? ''}`);
            }
          });
          return { meshes: meshCount, improper, offenders };
        },
      };
    }
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
  }, []);

  // Rebuild the engine when the world changes (different cover/gluing) or when the
  // landmark set changes (count/arrangement → the decor is rebuilt).
  useEffect(() => {
    worldRef.current = spec;
    propsRef.current = props;
    const deps = depsRef.current;
    if (!deps || !engineRef.current) return;
    engineRef.current.dispose();
    engineRef.current = makeFundamentalSquareEngine(deps, spec, {
      squareSize: sizeRef.current, floorThickness: thickRef.current, props,
    });
    engineRef.current.setFloorOpacity(opacityRef.current);
    engineRef.current.setRadius(radiusRef.current);
    engineRef.current.setCameraDistance(camDistRef.current);
    engineRef.current.setLook(lookRef.current);
  }, [spec, props]);

  useEffect(() => { speedRef.current = moveSpeed; }, [moveSpeed]);
  useEffect(() => { thirdRef.current = thirdPerson; }, [thirdPerson]);
  useEffect(() => { opacityRef.current = floorOpacity; engineRef.current?.setFloorOpacity(floorOpacity); }, [floorOpacity]);
  useEffect(() => { sizeRef.current = squareSize; engineRef.current?.setSquareSize(squareSize); }, [squareSize]);
  useEffect(() => { thickRef.current = floorThickness; engineRef.current?.setFloorThickness(floorThickness); }, [floorThickness]);
  useEffect(() => { radiusRef.current = planetRadius; engineRef.current?.setRadius(planetRadius); }, [planetRadius]);
  useEffect(() => { camDistRef.current = camDistance; engineRef.current?.setCameraDistance(camDistance); }, [camDistance]);
  useEffect(() => { lookRef.current = look; engineRef.current?.setLook(look); }, [look]);

  useEffect(() => {
    const map: Record<string, MoveKey> = {
      KeyW: 'fwd', ArrowUp: 'fwd', KeyS: 'back', ArrowDown: 'back',
      KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
    };
    // Workspace panels hold focusable form fields; typing/arrowing in them must
    // not move the walker, so window-level key handling defers to the field.
    const inFormField = () => {
      const t = document.activeElement?.tagName;
      return t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT';
    };
    const down = (e: KeyboardEvent) => {
      if (inFormField()) return;
      const m = map[e.code]; if (m) { keysRef.current[m] = true; e.preventDefault(); }
    };
    const up = (e: KeyboardEvent) => {
      const m = map[e.code];
      if (!m) return;
      // Always release the movement flag (a key let go while a field has focus
      // must not leave the walker stuck), but let the field keep its native keyup.
      keysRef.current[m] = false;
      if (!inFormField()) e.preventDefault();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  useEffect(() => () => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    engineRef.current?.dispose();
    engineRef.current = null;
  }, []);

  // Zoom the camera in/out by a multiplicative factor (wheel + pinch), keeping the
  // "Camera distance" slider in sync. <1 = closer, >1 = farther.
  const zoomBy = useCallback((factor: number) => {
    setCamDistance((d) => clampCam(d * factor));
  }, []);

  // Pointer state: one-finger / mouse drag looks; two fingers pinch to zoom.
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchRef = useRef<number | null>(null);
  const pinchDist = () => {
    const pts = [...pointersRef.current.values()];
    if (pts.length < 2) return 0;
    return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
  };
  const onPointerDown = (e: React.PointerEvent) => {
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    if (pointersRef.current.size >= 2) {
      dragRef.current = null;             // second finger down → pinch, stop looking
      pinchRef.current = pinchDist();
    } else {
      dragRef.current = { x: e.clientX, y: e.clientY };
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const p = pointersRef.current.get(e.pointerId);
    if (p) { p.x = e.clientX; p.y = e.clientY; }
    if (pointersRef.current.size >= 2) {  // pinch: spread = zoom in, pinch = zoom out
      const d = pinchDist();
      if (pinchRef.current && d > 0) zoomBy(pinchRef.current / d);
      pinchRef.current = d;
      return;
    }
    const d = dragRef.current; if (!d) return;
    yawRef.current += (e.clientX - d.x) * LOOK_SENS;
    pitchRef.current = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, pitchRef.current - (e.clientY - d.y) * LOOK_SENS));
    d.x = e.clientX; d.y = e.clientY;
  };
  const onPointerUp = (e: React.PointerEvent) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    const rem = pointersRef.current.size === 1 ? [...pointersRef.current.values()][0] : null;
    dragRef.current = rem ? { x: rem.x, y: rem.y } : null;
  };

  // Wheel zoom — native non-passive listener so we can preventDefault the page scroll.
  const containerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = containerRef.current; if (!el) return;
    const onWheel = (e: WheelEvent) => { e.preventDefault(); zoomBy(e.deltaY > 0 ? 1.1 : 1 / 1.1); };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomBy]);

  const getMapState = useCallback(() => engineRef.current?.getMapState() ?? null, []);
  // Player's unit surface-normal direction (pose up). For the spherical worlds this
  // is the point on the unit sphere the player occupies, which the embedding inset's
  // sphere/Roman marker rides; flat/hyperbolic immersions ignore it.
  const getDir = useCallback(() => engineRef.current?.getPose()?.up ?? null, []);
  // World groups for the picker — grouped by the geometry χ forces. The picker
  // itself now lives in the World panel (the title opens it); see worldNode.
  const GEO_GROUPS: { cover: ReturnType<typeof deriveGeometry>['cover']; label: string }[] = [
    { cover: 'euclidean', label: 'Flat · χ = 0' },
    { cover: 'spherical', label: 'Sphere · χ > 0' },
    { cover: 'hyperbolic', label: 'Hyperbolic · χ < 0' },
  ];

  /* ---- archetype panels (one row per legacy control; nothing dropped) ---- */

  // subject — pick the world (grouped by the geometry χ forces) and read out the
  // invariants the chosen gluing implies. The title doubles as a shortcut here.
  const worldNode = (
    <>
      <Select
        label="World"
        groups={GEO_GROUPS.map((g) => ({
          label: g.label,
          options: WORLDS.filter((w) => deriveGeometry(w).cover === g.cover).map((w) => ({ value: w.id, label: w.label })),
        }))}
        value={worldId}
        onChange={(v) => setWorldId(v)}
      />
      <div style={{ fontSize: 11, color: 'var(--cp-fg-dim)', lineHeight: 1.5 }}>
        <div style={{ marginBottom: 4 }}>
          <span style={{ color: 'var(--cp-fg)' }}>Edge word</span>{' '}
          <code style={{ fontSize: 11 }}>{spec.word}</code>
        </div>
        <div>
          <strong style={{ color: 'var(--cp-fg)' }}>{analysis.name}</strong> ·{' '}
          {analysis.orientable ? 'orientable' : 'non-orientable'} · χ = {analysis.chi} ·{' '}
          {analysis.curvature === 'flat' ? 'flat (κ = 0)'
            : analysis.curvature === 'positive' ? 'positively curved (κ > 0)'
              : 'negatively curved (κ < 0)'}
        </div>
        <div style={{ marginTop: 4, opacity: 0.85 }}>
          χ picks the geometry; edge count is presentation.
          {!analysis.orientable && ' Crossing a flipped edge swaps trees ↔ columns.'}
        </div>
      </div>
    </>
  );

  // view — camera distance + the scene's scale (the old Terrain panel folded in;
  // first/third person is a top-bar pill now, so it's gone from here).
  const viewNode = (
    <>
      {/* Perspective lives in the top-bar pills on desktop; on the cramped phone
          bar those pills are dropped, so it rides here in the View sheet instead. */}
      {phone && (
        <Pills label="Perspective" options={[{ value: 'third', label: 'Third person' }, { value: 'first', label: 'First person' }]} value={thirdPerson ? 'third' : 'first'} onChange={(v) => setThirdPerson(v === 'third')} />
      )}
      <Select label="Look" options={LOOKS.map((l) => ({ value: l.id, label: l.label }))} value={look} onChange={setLook} />
      {thirdPerson && (
        <Slider label="Camera distance" value={camDistance} min={1.5} max={12} step={0.5} onChange={setCamDistance} format={(v) => `${v.toFixed(1)}`} />
      )}
      {!isSpherical && (
        <Slider label={isHyperbolic ? 'Disk scale' : spec.edges ? 'Square size' : 'Polygon size'} value={squareSize} min={14} max={60} step={2} onChange={setSquareSize} format={(v) => `${Math.round(v)} m`} />
      )}
      {!isSpherical && !isHyperbolic && (
        <Slider label="Floor thickness" value={floorThickness} min={0} max={6} step={0.2} onChange={setFloorThickness} format={(v) => `${v.toFixed(1)} m`} />
      )}
      {isSpherical && (
        <Slider label="Planet radius" value={planetRadius} min={12} max={90} step={2} onChange={setPlanetRadius} format={(v) => `${Math.round(v)} m`} />
      )}
    </>
  );

  // marks — landmarks + glass + the ink trail, and the two-faced glass sign's
  // text. Each sign face carries its own ink (amber front, cyan back); read from
  // its back side an ink is mirror-reversed — the orientation cue in your own
  // words. The verbs (plant / clear) live in the always-on action strip.
  const marksNode = (
    <>
      <Slider label="Landmarks" value={landmarkCount} min={1} max={14} step={1} onChange={(v) => setLandmarkCount(Math.round(v))} format={(v) => `${Math.round(v)}`} />
      <Select label="Arrangement" options={ARRANGEMENTS.map((a) => ({ value: a.id, label: a.label }))} value={arrangement} onChange={(v) => setArrangement(v as ArrangementId)} />
      <Slider label={isSpherical ? 'Planet glass opacity' : 'Glass floor opacity'} value={floorOpacity} min={0} max={1} step={0.05} onChange={setFloorOpacity} format={(v) => `${Math.round(v * 100)}%`} />
      <div style={{ fontSize: 11, color: 'var(--cp-fg-dim)', lineHeight: 1.5, marginTop: 2 }}>
        Sign — a glass plaque with its own ink on each face. Plant it (below), walk around it, then cross a flipped edge and read it through the floor.
      </div>
      <label className="cp-row">
        <span className="cp-row-label">Front</span>
        <input type="text" value={signFront} maxLength={16} onChange={(e) => setSignFront(e.target.value)} />
      </label>
      <label className="cp-row">
        <span className="cp-row-label">Back</span>
        <input type="text" value={signBack} maxLength={16} onChange={(e) => setSignBack(e.target.value)} />
      </label>
    </>
  );

  // always-on verbs (bottom-center strip) — reachable without opening a panel.
  const actions: ActionDef[] = [
    { id: 'plant', icon: 'pin', label: 'Plant sign', primary: true, onClick: () => engineRef.current?.plantSign(signFront, signBack) },
    { id: 'clear-signs', icon: 'close', label: 'Clear signs', onClick: () => engineRef.current?.clearSigns() },
    { id: 'clear-trail', icon: 'reset', label: 'Clear trail', onClick: () => engineRef.current?.clearTrail() },
  ];

  // drive — locomotion.
  const walkNode = (
    <>
      <Slider label="Walk speed" value={moveSpeed} min={1} max={16} step={0.5} onChange={setMoveSpeed} format={(v) => v.toFixed(1)} />
      <div style={{ fontSize: 11, color: 'var(--cp-fg-dim)', lineHeight: 1.5 }}>
        WASD / arrow keys or the on-screen pad walk; drag the view to look; pinch or scroll to zoom.
      </div>
    </>
  );

  const sections: SectionDef[] = [
    { id: 'world', title: 'World', arch: 'subject', node: worldNode, estHeight: 210 },
    { id: 'view', title: 'View', arch: 'view', node: viewNode, estHeight: 220 },
    { id: 'marks', title: 'Landmarks & sign', arch: 'marks', node: marksNode, estHeight: 320 },
    { id: 'drive', title: 'Walk', arch: 'drive', node: walkNode, estHeight: 150 },
  ];

  const views: ViewDef[] = [
    {
      id: 'walk',
      title: 'First-person view',
      defaultRect: { x: 372, y: 16, w: 712, h: 628 },
      node: (
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
          {/* gesture surface — the overlays below are siblings so taps on the
              pad / map never start a look-drag (same structure as pre-migration) */}
          <div
            ref={containerRef}
            style={{ position: 'absolute', inset: 0, cursor: 'grab', touchAction: 'none' }}
            onPointerDown={onPointerDown} onPointerMove={onPointerMove}
            onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
          >
            <Canvas3D onMount={onMount} />
          </div>

          <MovePad onSet={setKey} phone={phone} />
          <SquareMiniMap getState={getMapState} spec={spec} phone={phone} />
          <EmbeddingInset key={`embed-${spec.id}`} worldId={spec.id} getState={getMapState} getDir={getDir} phone={phone} />

          {!phone && (
            <div style={{
              position: 'absolute', top: 12, left: 0, right: 0, textAlign: 'center',
              color: 'rgba(255,255,255,0.6)', fontSize: 12, pointerEvents: 'none', textShadow: '0 1px 2px #000',
            }}>
              Drag to look · WASD / arrows or the pad to walk · the polygon's gluing decides the world
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <Workspace
      appId="polygon-worlds"
      title="Polygon Worlds"
      subtitle={spec.short}
      titlePanel="world"
      modes={phone ? undefined : [{ id: 'third', label: 'Third person' }, { id: 'first', label: 'First person' }]}
      activeMode={thirdPerson ? 'third' : 'first'}
      onModeChange={(id) => setThirdPerson(id === 'third')}
      actions={actions}
      immersive
      sections={sections}
      views={views}
      layouts={LAYOUTS}
      defaultLayoutId="walk"
      explainer={explainerText}
    />
  );
}

/** One built-in arrangement: the world picker, camera and locomotion in a left
 *  column beside the walk window (Compact + Everything are auto-appended). */
const LAYOUTS: LayoutDef[] = [
  {
    id: 'walk', name: 'Walk', sub: 'World', icon: 'move',
    open: { world: { x: 84, y: 18 } },
  },
];

function MovePad({ onSet, phone }: { onSet: (k: MoveKey, v: boolean) => void; phone?: boolean }) {
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
  // On phone the floating bottom dock sits at the screen's bottom edge; lift the
  // pad above it so the back arrow stays tappable.
  return (
    <div style={{ position: 'absolute', bottom: phone ? 100 : 20, right: phone ? 14 : 20, width: 150, height: 150, zIndex: 20 }}>
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
  // a = left/right pair, b = top/bottom pair (square worlds only — guarded by caller)
  const e = spec.edges!;
  const aFlip = e.left.orient === -1 || e.right.orient === -1;
  const bFlip = e.top.orient === -1 || e.bottom.orient === -1;
  const lr: SquareEdgeSpec = { color: aFlip ? (bFlip ? MAP_PURPLE : MAP_RED) : MAP_TEAL, glue: aFlip ? 'flip' : 'straight', double: true };
  const tb: SquareEdgeSpec = { color: bFlip ? MAP_RED : MAP_BLUE, glue: bFlip ? 'flip' : 'straight', double: false };
  const marker = st
    ? { sx: (st.u - 0.5) * 2, sy: (st.v - 0.5) * 2, angle: Math.atan2(-st.hz, st.hx), flipped: st.flipped }
    : null;
  const label = !st ? '' : st.flipped ? `${spec.label} · other face` : spec.label;
  return { tb, lr, marker, dots: [], border: false, label };
}

/** Build the n-gon edge-diagram spec (hyperbolic worlds, no square `edges`). */
function polygonSpec(spec: WorldSpec, st: SquareMapState | null): PolygonMapSpec {
  const word = parseWord(spec.word);
  const m = word.length;
  const real = realize(word);
  const marker = st
    ? { px: (st.u - 0.5) * 2, py: (st.v - 0.5) * 2, hx: st.hx, hy: st.hz, flipped: st.flipped }
    : null;
  const label = !st ? spec.label : st.flipped ? `${spec.label} · other face` : spec.label;
  // flat + spherical n-gon worlds chart in circumcircle units (vertices at radius 1
  // — the chart()'s disk coords); only hyperbolic worlds chart in Poincaré
  // coordinates (vertices at tanh(R/2)).
  const hyper = deriveGeometry(spec).cover === 'hyperbolic';
  return {
    sides: m,
    baseAngle: -Math.PI / 2 + Math.PI / m,
    rhoV: hyper ? Math.tanh(real.circumradius / 2) : 1,
    letters: word.map((l) => ({ gen: l.gen, inv: l.inv })),
    marker,
    label,
  };
}

function SquareMiniMap({ getState, spec, phone }: { getState: () => SquareMapState | null; spec: WorldSpec; phone?: boolean }) {
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
    const loop = () => {
      const s = specRef.current;
      if (s.edges) drawSquareMap(ctx, SIZE, squareSpec(s, getState()));
      else drawPolygonMap(ctx, SIZE, polygonSpec(s, getState()));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [getState]);
  // On phone, drop below the floating top bar and shrink so it shares the top row.
  const box = phone ? 112 : 150;
  return (
    <div style={{
      position: 'absolute', top: phone ? 52 : 12, right: phone ? 8 : 12, width: box, height: box,
      pointerEvents: 'none', border: '1px solid rgba(255,255,255,0.18)',
      borderRadius: 8, boxShadow: '0 4px 14px rgba(0,0,0,0.45)', overflow: 'hidden',
    }}>
      <canvas ref={canvasRef} style={{ width: box, height: box, display: 'block' }} />
      <div style={{
        position: 'absolute', top: 4, left: 8, fontSize: 10, letterSpacing: '0.08em',
        color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase',
      }}>Map</div>
    </div>
  );
}
