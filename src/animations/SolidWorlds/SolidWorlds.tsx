import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import Canvas3D from '@/components/Canvas3D';
import Workspace from '../../chrome/workspace/Workspace';
import type { ActionDef, LayoutDef, SectionDef, ViewDef } from '../../chrome/workspace/types';
import { usePhone } from '../../chrome/usePhone';
import { Slider, Select, Pills, Checkbox } from '../../components/ControlPanel';
import { usePersistentState } from '../../lib/usePersistentState';
import { SOLID_WORLDS, DEFAULT_WORLD_ID, worldById } from './worlds';
import { analyzeSolid, AxisAnalysis } from './solidSchema';
import { LOOKS } from './looks';
import { makeCoverEngine } from './coverEngine';
import {
  EngineDeps3, SolidEngine, ChiralityState, SolidMapState, TravelMode, DecorMode,
  DEFAULT_ROOM_SIZE, DEFAULT_COVER_DEPTH,
} from './engineTypes';
import DebugPoseHUD from '../../components/DebugPoseHUD';
import { poseParams, pNum, pStr, hudEnabled, type DebugState } from '../../lib/debugPose';
import { nearestMarkerDistance } from '../../lib/nearestMarker';
import explainerText from './EXPLAINER.md?raw';

const LOOK_SENS = 0.0035;
const MAX_PITCH = 1.3;
const CAM_MIN = 1.5, CAM_MAX = 40;
const clampCam = (d: number) => Math.max(CAM_MIN, Math.min(CAM_MAX, d));

type MoveKey = 'fwd' | 'back' | 'left' | 'right' | 'up' | 'down';

export default function SolidWorlds() {
  const pk = (f: string) => `solid-worlds:${f}`;
  // Debug-pose deep link (docs/HEADLESS_WEBGL.md): a hash query can pin the world,
  // camera and pose so a headless shot reproduces an exact frame. Parsed once; an
  // explicit URL param wins over the session default. Absent params → today's behavior.
  const bootRef = useRef(poseParams());
  const boot = bootRef.current;
  const bootWorld = pStr(boot, 'world', '');
  const [worldId, setWorldId] = useState(() =>
    SOLID_WORLDS.some((w) => w.id === bootWorld) ? bootWorld : DEFAULT_WORLD_ID);
  const [moveSpeed, setMoveSpeed] = usePersistentState(pk('moveSpeed'), 5);
  const [thirdPerson, setThirdPerson] = useState(() => pStr(boot, 'cam', 'third') !== 'first');
  const [mode, setMode] = usePersistentState<TravelMode>(pk('mode'), 'walk');
  const [trailEnabled, setTrailEnabled] = useState(false); // off by default
  const [camDistance, setCamDistance] = useState(() => {
    const c = pNum(boot, 'camd', NaN);
    return Number.isFinite(c) ? clampCam(c) : 6;
  });
  // Session-only (not persisted): a quality/perf knob whose default should always
  // win on load — otherwise a stale stored value hides the hall-of-mirrors depth.
  const [coverDepth, setCoverDepth] = useState(DEFAULT_COVER_DEPTH);
  const [roomSize, setRoomSize] = usePersistentState(pk('roomSize'), DEFAULT_ROOM_SIZE);
  const [fog, setFog] = usePersistentState(pk('fog'), 0.2);
  const [cutGap, setCutGap] = usePersistentState(pk('cutGap'), 0.3);
  const [wallOpacity, setWallOpacity] = usePersistentState(pk('wallOpacity'), 0.84);
  const [decorMode, setDecorMode] = usePersistentState<DecorMode>(pk('decorMode'), 'diagnostic');
  const [showFloor, setShowFloor] = usePersistentState(pk('floor'), true);
  const [showLabels, setShowLabels] = usePersistentState(pk('labels'), false);
  const [showCorners, setShowCorners] = usePersistentState(pk('corners'), false);
  const [showSeams, setShowSeams] = usePersistentState(pk('seams'), true);
  const [look, setLook] = usePersistentState(pk('look'), 'daytime');

  const spec = worldById(worldId);
  const analysis = useMemo(() => analyzeSolid(spec), [spec]);
  const phone = usePhone();

  const engineRef = useRef<SolidEngine | null>(null);
  const depsRef = useRef<EngineDeps3 | null>(null);
  const rafRef = useRef<number | null>(null);
  const clockRef = useRef(new THREE.Clock());

  const yawRef = useRef(0);
  const pitchRef = useRef(0);
  const keysRef = useRef<Record<MoveKey, boolean>>({ fwd: false, back: false, left: false, right: false, up: false, down: false });
  const speedRef = useRef(moveSpeed);
  const thirdRef = useRef(thirdPerson);
  const modeRef = useRef(mode);
  const trailRef = useRef(trailEnabled);
  const camDistRef = useRef(camDistance);
  const worldRef = useRef(spec);
  const depthRef = useRef(coverDepth);
  const sizeRef = useRef(roomSize);
  const fogRef = useRef(fog);
  const cutGapRef = useRef(cutGap);
  const wallOpacityRef = useRef(wallOpacity);
  const floorRef = useRef(showFloor);
  const labelsRef = useRef(showLabels);
  const cornersRef = useRef(showCorners);
  const seamsRef = useRef(showSeams);
  const lookRef = useRef(look);
  const decorRef = useRef(decorMode);

  const setKey = useCallback((k: MoveKey, v: boolean) => { keysRef.current[k] = v; }, []);

  const onMount = useCallback(({ scene, camera, renderer }: {
    scene: THREE.Scene; camera: THREE.PerspectiveCamera; renderer: THREE.WebGLRenderer;
  }) => {
    const deps: EngineDeps3 = { scene, camera, renderer };
    depsRef.current = deps;
    engineRef.current = makeCoverEngine(deps, worldRef.current, {
      roomSize: sizeRef.current, coverDepth: depthRef.current,
      cameraDistance: camDistRef.current, lookId: lookRef.current,
      fogAmount: fogRef.current, cutFrac: cutGapRef.current, wallOpacity: wallOpacityRef.current, showFloor: floorRef.current,
      showLabels: labelsRef.current, showCorners: cornersRef.current,
      showSeams: seamsRef.current, decorMode: decorRef.current,
    });
    engineRef.current.setTrailEnabled(trailRef.current);
    // Debug-pose deep link: ?look= overrides the view engine-level (doesn't clobber
    // the persisted look); seed the look orientation; drop the walker at the
    // requested cube position (x,y,z ∈ −1..1 → setPose u,v,w). Read via the ref so
    // onMount stays dependency-free.
    const bp = bootRef.current;
    const bootLook = pStr(bp, 'look', '');
    if (bootLook) { lookRef.current = bootLook; engineRef.current.setLook(bootLook); }
    yawRef.current = pNum(bp, 'yaw', yawRef.current);
    pitchRef.current = pNum(bp, 'pitch', pitchRef.current);
    if (bp.has('x') || bp.has('y') || bp.has('z')) {
      engineRef.current.setPose({
        u: bp.has('x') ? pNum(bp, 'x', 0) : undefined,
        v: bp.has('y') ? pNum(bp, 'y', 0) : undefined,
        w: bp.has('z') ? pNum(bp, 'z', 0) : undefined,
      });
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
          rise: (k.up ? 1 : 0) - (k.down ? 1 : 0),
          yaw: yawRef.current, pitch: pitchRef.current,
          moveSpeed: speedRef.current, thirdPerson: thirdRef.current,
          mode: modeRef.current,
        });
      }
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
  }, []);

  // Rebuild the engine when the world changes (different gluing / cover). The FIRST
  // run is skipped: it fires on mount, right after Canvas3D's onMount already built
  // the engine (children-first effect order) with the boot pose applied — rebuilding
  // here would be redundant AND would discard a debug-pose deep link's x/y/z position.
  const skipFirstRebuild = useRef(true);
  useEffect(() => {
    worldRef.current = spec;
    const deps = depsRef.current;
    if (!deps || !engineRef.current) return;
    if (skipFirstRebuild.current) { skipFirstRebuild.current = false; return; }
    engineRef.current.dispose();
    engineRef.current = makeCoverEngine(deps, spec, {
      roomSize: sizeRef.current, coverDepth: depthRef.current,
      cameraDistance: camDistRef.current, lookId: lookRef.current,
      fogAmount: fogRef.current, cutFrac: cutGapRef.current, wallOpacity: wallOpacityRef.current, showFloor: floorRef.current,
      showLabels: labelsRef.current, showCorners: cornersRef.current,
      showSeams: seamsRef.current, decorMode: decorRef.current,
    });
    engineRef.current.setTrailEnabled(trailRef.current);
  }, [spec]);

  useEffect(() => { speedRef.current = moveSpeed; }, [moveSpeed]);
  useEffect(() => { thirdRef.current = thirdPerson; }, [thirdPerson]);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { trailRef.current = trailEnabled; engineRef.current?.setTrailEnabled(trailEnabled); }, [trailEnabled]);
  useEffect(() => { camDistRef.current = camDistance; engineRef.current?.setCameraDistance(camDistance); }, [camDistance]);
  useEffect(() => { depthRef.current = coverDepth; engineRef.current?.setCoverDepth(coverDepth); }, [coverDepth]);
  useEffect(() => { sizeRef.current = roomSize; engineRef.current?.setRoomSize(roomSize); }, [roomSize]);
  useEffect(() => { fogRef.current = fog; engineRef.current?.setFog(fog); }, [fog]);
  useEffect(() => { cutGapRef.current = cutGap; engineRef.current?.setCutFrac(cutGap); }, [cutGap]);
  useEffect(() => { wallOpacityRef.current = wallOpacity; engineRef.current?.setWallOpacity(wallOpacity); }, [wallOpacity]);
  useEffect(() => { floorRef.current = showFloor; engineRef.current?.setFloor(showFloor); }, [showFloor]);
  useEffect(() => { labelsRef.current = showLabels; engineRef.current?.setLabels(showLabels); }, [showLabels]);
  useEffect(() => { cornersRef.current = showCorners; engineRef.current?.setCorners(showCorners); }, [showCorners]);
  useEffect(() => { seamsRef.current = showSeams; engineRef.current?.setSeams(showSeams); }, [showSeams]);
  useEffect(() => { lookRef.current = look; engineRef.current?.setLook(look); }, [look]);
  useEffect(() => { decorRef.current = decorMode; engineRef.current?.setDecorMode(decorMode); }, [decorMode]);

  useEffect(() => {
    const map: Record<string, MoveKey> = {
      KeyW: 'fwd', ArrowUp: 'fwd', KeyS: 'back', ArrowDown: 'back',
      KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
      KeyE: 'up', Space: 'up', KeyQ: 'down', ShiftLeft: 'down',
    };
    const inFormField = () => {
      const t = document.activeElement?.tagName;
      return t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT';
    };
    const down = (e: KeyboardEvent) => {
      if (inFormField()) return;
      const m = map[e.code]; if (m) { keysRef.current[m] = true; e.preventDefault(); }
    };
    const up = (e: KeyboardEvent) => {
      const m = map[e.code]; if (!m) return;
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

  const zoomBy = useCallback((factor: number) => { setCamDistance((d) => clampCam(d * factor)); }, []);

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
    if (pointersRef.current.size >= 2) { dragRef.current = null; pinchRef.current = pinchDist(); }
    else dragRef.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const p = pointersRef.current.get(e.pointerId);
    if (p) { p.x = e.clientX; p.y = e.clientY; }
    if (pointersRef.current.size >= 2) {
      const d = pinchDist();
      if (pinchRef.current && d > 0) zoomBy(pinchRef.current / d);
      pinchRef.current = d; return;
    }
    const d = dragRef.current; if (!d) return;
    yawRef.current -= (e.clientX - d.x) * LOOK_SENS;
    pitchRef.current = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, pitchRef.current - (e.clientY - d.y) * LOOK_SENS));
    d.x = e.clientX; d.y = e.clientY;
  };
  const onPointerUp = (e: React.PointerEvent) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    const rem = pointersRef.current.size === 1 ? [...pointersRef.current.values()][0] : null;
    dragRef.current = rem ? { x: rem.x, y: rem.y } : null;
  };

  const containerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = containerRef.current; if (!el) return;
    const onWheel = (e: WheelEvent) => { e.preventDefault(); zoomBy(e.deltaY > 0 ? 1.1 : 1 / 1.1); };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomBy]);

  const recenter = useCallback(() => {
    engineRef.current?.recenter();
    yawRef.current = 0; pitchRef.current = 0;
  }, []);
  const getChirality = useCallback(() => engineRef.current?.getChirality() ?? null, []);
  const getMap = useCallback(() => engineRef.current?.getMapState() ?? null, []);
  // Opt-in debug HUD (?hud / ?debug=1): snapshots the live pose so a headless shot
  // records what the engine thinks the frame is — the dual-verified determinant
  // (loop handedness), the cell, the cube position, and distance to the nearest
  // cube vertex. (SolidWorlds has no geometric ink-probe analog, so it carries no
  // independent `witness` yet — deferred; its determinant is the authoritative,
  // screw-safe invariant. See the session log.)
  const showHud = useRef(hudEnabled(boot)).current;
  const getDebug = useCallback((): DebugState | null => {
    const eng = engineRef.current;
    if (!eng) return null;
    const ms = eng.getMapState();
    if (!ms) return null;
    return {
      world: worldRef.current.id,
      look: lookRef.current,
      pos: { x: ms.u, y: ms.v, z: ms.w },
      yaw: yawRef.current,
      pitch: pitchRef.current,
      determinant: ms.mirrored ? -1 : 1,
      cell: ms.cell,
      nearestMarker: nearestMarkerDistance({ x: ms.u, y: ms.v, z: ms.w }, CUBE_VERTS),
    };
  }, []);

  const actions: ActionDef[] = [
    { id: 'recenter', icon: 'move', label: 'Recenter', primary: true, onClick: recenter },
    { id: 'clear', icon: 'reset', label: 'Clear trail', onClick: () => engineRef.current?.clearTrail() },
  ];

  /* ---- panels ---- */

  const worldNode = (
    <>
      <Select
        label="World"
        options={SOLID_WORLDS.map((w) => ({ value: w.id, label: w.label }))}
        value={worldId}
        onChange={setWorldId}
      />
      <div style={{ fontSize: 11, color: 'var(--cp-fg-dim)', lineHeight: 1.5 }}>
        <div>
          <strong style={{ color: 'var(--cp-fg)' }}>{analysis.manifold}</strong> ·{' '}
          {analysis.orientable ? 'orientable' : 'non-orientable'}
        </div>
        <div style={{ marginTop: 2 }}>
          H₁ = {analysis.h1} · χ = {analysis.euler} ·{' '}
          {analysis.isManifold ? 'manifold ✓' : 'not a manifold (!)'}{' '}
          <span style={{ opacity: 0.7 }}>
            (H₁ from the deck group; free action ⇒ a flat manifold)
          </span>
        </div>
        <div style={{ marginTop: 2, opacity: 0.7 }}>
          {analysis.verified
            ? 'cross-checked: the glued-cube cell complex agrees'
            : 'experimental: cell-complex cross-check pending'}
        </div>
        <div style={{ marginTop: 4, opacity: 0.9 }}>{analysis.note}</div>
        <div style={{ marginTop: 4, opacity: 0.8 }}>
          χ is always 0 in 3D — it can&apos;t pick the geometry; H₁ is the fingerprint instead.
        </div>
      </div>
    </>
  );

  const viewNode = (
    <>
      {phone && (
        <Pills label="Perspective" options={[{ value: 'third', label: 'Third person' }, { value: 'first', label: 'First person' }]} value={thirdPerson ? 'third' : 'first'} onChange={(v) => setThirdPerson(v === 'third')} />
      )}
      <Pills
        label="Decor"
        options={[{ value: 'diagnostic', label: 'Diagnostic' }, { value: 'rooms', label: 'Rooms' }]}
        value={decorMode}
        onChange={(v) => setDecorMode(v as DecorMode)}
      />
      <Select label="Look" options={LOOKS.map((l) => ({ value: l.id, label: l.label }))} value={look} onChange={setLook} />
      {thirdPerson && (
        <Slider label="Camera distance" value={camDistance} min={CAM_MIN} max={CAM_MAX} step={0.5} onChange={setCamDistance} format={(v) => v.toFixed(1)} />
      )}
      {thirdPerson && (
        <Slider label="Cutaway" value={cutGap} min={0.05} max={0.9} step={0.05} onChange={setCutGap} format={(v) => `${Math.round(v * 100)}% to walker`} />
      )}
      <Slider label="Cover depth" value={coverDepth} min={0} max={10} step={1} onChange={(v) => setCoverDepth(Math.round(v))} format={(v) => `${Math.round(v)} ${Math.round(v) === 1 ? 'ring' : 'rings'}`} />
      <Slider label="Room size" value={roomSize} min={6} max={30} step={1} onChange={setRoomSize} format={(v) => `${Math.round(v)} m`} />
      <Slider label="Fog" value={fog} min={0} max={1} step={0.05} onChange={setFog} format={(v) => (v <= 0.001 ? 'off' : `${Math.round(v * 100)}%`)} />
      {decorMode === 'rooms' && (
        <Slider label="Wall opacity" value={wallOpacity} min={0.3} max={1} step={0.02} onChange={setWallOpacity} format={(v) => `${Math.round(v * 100)}%`} />
      )}
      <Checkbox label="Show seams (cell edges)" checked={showSeams} onChange={setShowSeams} />
      <Checkbox label="Floor plane" checked={showFloor} onChange={setShowFloor} />
      <Checkbox label="Face labels" checked={showLabels} onChange={setShowLabels} />
      <Checkbox label="Corner markers" checked={showCorners} onChange={setShowCorners} />
    </>
  );

  const walkNode = (
    <>
      <Pills
        label="Travel"
        options={[{ value: 'walk', label: 'Walk' }, { value: 'drive', label: 'Drive' }, { value: 'fly', label: 'Fly' }]}
        value={mode}
        onChange={(v) => setMode(v as TravelMode)}
      />
      <Slider label="Speed" value={moveSpeed} min={1} max={14} step={0.5} onChange={setMoveSpeed} format={(v) => v.toFixed(1)} />
      <div style={{ fontSize: 11, color: 'var(--cp-fg-dim)', lineHeight: 1.5 }}>
        WASD / arrows or the pad move; <strong>E / Q</strong> {mode === 'fly' ? 'fly up & down' : 'jump up / drop to the floor below'}; drag to look; pinch / scroll to zoom.
        {mode === 'fly'
          ? ' The airplane roams freely in 3D.'
          : ' On the floor, the x-loop in Klein × Circle brings you back mirrored.'}
      </div>
    </>
  );

  const readNode = (
    <>
      <div style={{ fontSize: 12, color: 'var(--cp-fg)', lineHeight: 1.55 }}>
        Walk a loop and watch your <strong>handedness</strong>. Crossing a glide-reflection
        face flips it; cross again and it restores. The flip is the loop's (a global
        holonomy), not any one doorway's — the continuous step never reverses.
      </div>
      <Checkbox label="Footprint trail" checked={trailEnabled} onChange={setTrailEnabled} />
      <ChiralityReadout get={getChirality} />
    </>
  );

  const sections: SectionDef[] = [
    { id: 'world', title: 'World', arch: 'subject', node: worldNode, estHeight: 200 },
    { id: 'view', title: 'View', arch: 'view', node: viewNode, estHeight: 240 },
    { id: 'walk', title: 'Walk', arch: 'drive', node: walkNode, estHeight: 150 },
    { id: 'chirality', title: 'Chirality', arch: 'readout', node: readNode, estHeight: 210 },
  ];

  const views: ViewDef[] = [
    {
      id: 'walk',
      title: 'First-person view',
      defaultRect: { x: 372, y: 16, w: 712, h: 628 },
      node: (
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
          <div
            ref={containerRef}
            style={{ position: 'absolute', inset: 0, cursor: 'grab', touchAction: 'none' }}
            onPointerDown={onPointerDown} onPointerMove={onPointerMove}
            onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
          >
            <Canvas3D onMount={onMount} />
          </div>
          <ChiralityHUD get={getChirality} phone={phone} />
          <SolidMiniMap get={getMap} perAxis={analysis.perAxis} phone={phone} />
          {showHud && <DebugPoseHUD get={getDebug} phone={phone} />}
          <MovePad onSet={setKey} phone={phone} />
          {!phone && (
            <div style={{
              position: 'absolute', top: 12, left: 0, right: 0, textAlign: 'center',
              color: 'rgba(255,255,255,0.6)', fontSize: 12, pointerEvents: 'none', textShadow: '0 1px 2px #000',
            }}>
              Drag to look · WASD / arrows fly · walk the x-loop in Klein × Circle to come back mirrored
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <Workspace
      appId="solid-worlds"
      title={phone ? spec.label : 'Solid Worlds'}
      subtitle={spec.short}
      titlePanel="world"
      modes={phone ? undefined : [{ id: 'third', label: 'Third person' }, { id: 'first', label: 'First person' }]}
      activeMode={thirdPerson ? 'third' : 'first'}
      onModeChange={(id) => setThirdPerson(id === 'third')}
      actions={actions}
      phoneActionsInDock
      immersive
      sections={sections}
      views={views}
      layouts={LAYOUTS}
      defaultLayoutId="walk"
      explainer={explainerText}
    />
  );
}

const LAYOUTS: LayoutDef[] = [
  {
    id: 'walk', name: 'Walk', sub: 'World', icon: 'move',
    open: { world: { x: 84, y: 18 }, chirality: { x: 84, y: 232 } },
  },
];

/** The three holonomy states a loop can leave you in. A rotation (det +1) is
 *  cosmetic — you can turn your body to undo it; a reflection (det −1) is the
 *  real invariant — no reorientation fixes it. */
function handedness(c: ChiralityState): { label: string; color: string } {
  if (c.loopSign === -1) return { label: 'MIRRORED', color: '#ff5aa6' };
  if (c.rotationDeg > 5) return { label: `ROTATED ${Math.round(c.rotationDeg)}°`, color: '#ffcf5a' };
  return { label: 'ORIGINAL', color: '#5ad1ff' };
}

/** The live handedness HUD, overlaid on the canvas — the headline instrument. */
function ChiralityHUD({ get, phone }: { get: () => ChiralityState | null; phone?: boolean }) {
  const tagRef = useRef<HTMLSpanElement>(null);
  const subRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const c = get();
      if (c && tagRef.current && subRef.current) {
        const s = handedness(c);
        tagRef.current.textContent = s.label;
        tagRef.current.style.color = s.color;
        subRef.current.textContent = `loops · x ${c.crossings.x} · y ${c.crossings.y} · z ${c.crossings.z}`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [get]);
  return (
    <div style={{
      position: 'absolute', top: phone ? 52 : 12, left: 12, pointerEvents: 'none',
      padding: '8px 12px', borderRadius: 8, background: 'rgba(8,10,18,0.6)',
      border: '1px solid rgba(255,255,255,0.16)', boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
      backdropFilter: 'blur(6px)', fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)' }}>Handedness</div>
      <span ref={tagRef} style={{ fontSize: 20, fontWeight: 800, color: '#5ad1ff' }}>ORIGINAL</span>
      <div ref={subRef} style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>loops · x 0 · y 0 · z 0</div>
    </div>
  );
}

/** A compact textual echo of the same state, for the Chirality panel. */
function ChiralityReadout({ get }: { get: () => ChiralityState | null }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const c = get();
      if (c && ref.current) {
        const mirrored = c.loopSign === -1;
        const rot = c.rotationDeg > 5 ? `, rotated ${Math.round(c.rotationDeg)}°` : '';
        ref.current.textContent = `Handedness: ${mirrored ? 'MIRRORED' : 'original'}${mirrored ? '' : rot} · per-step det = +1 (no local flip)`;
        ref.current.style.color = mirrored ? '#ff5aa6' : 'var(--cp-fg)';
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [get]);
  return <div ref={ref} style={{ fontSize: 12, fontWeight: 600, marginTop: 4 }}>Handedness: original · per-step det = +1 (no local flip)</div>;
}

// ── the "you-are-here in the fundamental cube" mini-map (a Schlegel-style
//    isometric wireframe). Each axis's edges are colored by what its pairing
//    does — translation (blue) · rotation (amber) · glide-reflection (pink) —
//    and the dot turns pink when you are mirror-reversed. ───────────────────
const CUBE_CORNERS: [number, number, number][] = [
  [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
  [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1],
];
const CUBE_EDGES: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7],
];
// The cube corners as {x,y,z} points (same u,v,w ∈ −1..1 frame the map reports) —
// the markers for the debug HUD's nearest-vertex readout.
const CUBE_VERTS = CUBE_CORNERS.map(([x, y, z]) => ({ x, y, z }));
const AXIS_COLOR: Record<string, string> = {
  translation: '#7fa8d8', rotation: '#ffcf5a', 'glide-reflection': '#ff5aa6',
};
function isoProject(x: number, y: number, z: number, cx: number, cy: number, s: number): [number, number] {
  const ay = 0.7, ax = 0.5;
  const ca = Math.cos(ay), sa = Math.sin(ay), cp = Math.cos(ax), sp = Math.sin(ax);
  const X = x * ca + z * sa, Z0 = -x * sa + z * ca, Y = y * cp - Z0 * sp;
  return [cx + X * s, cy - Y * s];
}
/** Which axis (0/1/2) a cube edge runs along — the coordinate its endpoints differ in. */
function edgeAxis(a: number, b: number): number {
  const ca = CUBE_CORNERS[a], cb = CUBE_CORNERS[b];
  return ca[0] !== cb[0] ? 0 : ca[1] !== cb[1] ? 1 : 2;
}

function SolidMiniMap({ get, perAxis, phone }: { get: () => SolidMapState | null; perAxis: AxisAnalysis[]; phone?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const perAxisRef = useRef(perAxis);
  perAxisRef.current = perAxis;
  useEffect(() => {
    const cvs = canvasRef.current; if (!cvs) return;
    const ctx = cvs.getContext('2d'); if (!ctx) return;
    const SIZE = 120, dpr = Math.min(2, window.devicePixelRatio || 1);
    cvs.width = SIZE * dpr; cvs.height = SIZE * dpr; ctx.scale(dpr, dpr);
    let raf = 0;
    const loop = () => {
      const st = get();
      const cx = SIZE / 2, cy = SIZE / 2 + 6, s = SIZE * 0.26;
      ctx.clearRect(0, 0, SIZE, SIZE);
      // cube edges, colored by each axis's pairing kind
      ctx.lineWidth = 1.6;
      for (const [a, b] of CUBE_EDGES) {
        const kind = perAxisRef.current[edgeAxis(a, b)]?.kind ?? 'translation';
        ctx.strokeStyle = AXIS_COLOR[kind];
        const p = isoProject(...CUBE_CORNERS[a], cx, cy, s);
        const q = isoProject(...CUBE_CORNERS[b], cx, cy, s);
        ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
      }
      if (st) {
        const dot = isoProject(st.u, st.v, st.w, cx, cy, s);
        // heading arrow
        const end = isoProject(st.u + st.fwd[0] * 0.6, st.v + st.fwd[1] * 0.6, st.w + st.fwd[2] * 0.6, cx, cy, s);
        ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(dot[0], dot[1]); ctx.lineTo(end[0], end[1]); ctx.stroke();
        // the walker — pink when mirror-reversed, cyan otherwise
        ctx.fillStyle = st.mirrored ? '#ff5aa6' : '#5ad1ff';
        ctx.beginPath(); ctx.arc(dot[0], dot[1], 4, 0, 7); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1; ctx.stroke();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [get]);
  const box = phone ? 100 : 120;
  return (
    <div style={{
      position: 'absolute', top: phone ? 52 : 12, right: phone ? 8 : 12, width: box, height: box,
      pointerEvents: 'none', borderRadius: 8, background: 'rgba(8,10,18,0.55)',
      border: '1px solid rgba(255,255,255,0.16)', boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
      backdropFilter: 'blur(6px)', overflow: 'hidden',
    }}>
      <canvas ref={canvasRef} style={{ width: box, height: box, display: 'block' }} />
      <div style={{
        position: 'absolute', top: 4, left: 8, fontSize: 9, letterSpacing: '0.1em',
        color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase',
      }}>Cube</div>
    </div>
  );
}

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
  return (
    <div style={{ position: 'absolute', bottom: phone ? 84 : 20, right: phone ? 14 : 20, width: 150, height: 150, zIndex: 20 }}>
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
