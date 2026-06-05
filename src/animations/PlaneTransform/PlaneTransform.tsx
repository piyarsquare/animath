import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { ShellSettings, useAppHeader, useAppExplainer } from '../../components/AppShell';
import { Section, Slider, Pills, Select } from '../../components/ControlPanel';
import Readme from '../../components/Readme';
import readmeText from './README.md?raw';
import explainerText from './EXPLAINER.md?raw';
import {
  functionNames, functionFormulas, POW_PQ_INDEX,
  applyComplexBranch, complexPowRational,
} from '../../lib/complexMath';
import { usePersistentState, clearPersistedState } from '../../lib/usePersistentState';
import { vertexShader, fragmentShader } from './shaders';
import PlaneCurveFloater, { type StandardCurveName } from './PlaneCurveFloater';
import { buildStandardCurve, type CurvePoint } from './standardCurves';
import {
  sampleInputPositions, clipFromMath, mathFromClip,
  type GridMode, type PlaneMode,
} from './polarViews';

/** localStorage namespace for this viewer's saved settings. */
const STORAGE_KEY = 'plane-transform';

type ColourMode = 0 | 1 | 2;
const COLOUR_MODE_LABELS: Record<ColourMode, string> = {
  0: 'Smooth',
  1: 'Tiles',
  2: 'Grid only',
};

interface PaneRefs {
  renderer?: THREE.WebGLRenderer;
  scene?: THREE.Scene;
  camera?: THREE.OrthographicCamera;
  material?: THREE.ShaderMaterial;
  points?: THREE.Points;
}

/**
 * Plane-transform viewer: shows how a complex function sends the (x, y) input
 * plane to the (u, v) output plane. Two square panes, side-by-side on a wide
 * canvas, stacked top-bottom on a tall one. Same point cloud renders into
 * both panes — the second pane's vertex shader runs the selected function so
 * each colored point ends up at its f(z) location.
 *
 * The View section offers a polar sampling grid (rings + rays) and a log-polar
 * plane layout (plot at (arg, log|·|)) — see polarViews.ts.
 */
export default function PlaneTransform() {
  const [functionIndex, setFunctionIndex] = usePersistentState(
    `${STORAGE_KEY}:functionIndex`, Math.max(0, functionNames.indexOf('sin')),
  );
  const [expP, setExpP] = usePersistentState(`${STORAGE_KEY}:expP`, 1);
  const [expQ, setExpQ] = usePersistentState(`${STORAGE_KEY}:expQ`, 2);
  const [branchIndex, setBranchIndex] = usePersistentState(`${STORAGE_KEY}:branchIndex`, 0);
  const [density, setDensity] = usePersistentState(`${STORAGE_KEY}:density`, 240);          // points per side
  const [pointSize, setPointSize] = usePersistentState(`${STORAGE_KEY}:pointSize`, 2.5);
  const [viewExtent, setViewExtent] = usePersistentState(`${STORAGE_KEY}:viewExtent`, 3);   // half-side of visible square
  const [gridMode, setGridMode] = usePersistentState<GridMode>(`${STORAGE_KEY}:gridMode`, 'cartesian');
  const [planeMode, setPlaneMode] = usePersistentState<PlaneMode>(`${STORAGE_KEY}:planeMode`, 'cartesian');
  const [colourMode, setColourMode] = usePersistentState<ColourMode>(`${STORAGE_KEY}:colourMode`, 0);
  const [saturation, setSaturation] = usePersistentState(`${STORAGE_KEY}:saturation`, 0.85);
  const [intensity, setIntensity] = usePersistentState(`${STORAGE_KEY}:intensity`, 1.0);
  // Drawn curve + draw toggle are transient per-session state, not persisted.
  const [curve, setCurve] = useState<CurvePoint[]>([]);
  const [drawMode, setDrawMode] = useState(false);

  const fnName = functionNames[functionIndex];
  const fnFormula = functionIndex === POW_PQ_INDEX
    ? `z^(${expP}/${expQ})`
    : functionFormulas[fnName];
  useAppHeader(fnName, fnFormula);
  useAppExplainer(explainerText);

  // Containers + refs for the two panes.
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputMountRef  = useRef<HTMLDivElement>(null);
  const outputMountRef = useRef<HTMLDivElement>(null);
  const inputPane  = useRef<PaneRefs>({});
  const outputPane = useRef<PaneRefs>({});
  const geometryRef = useRef<THREE.BufferGeometry>();

  // Detect landscape vs portrait container shape so the panes stack correctly.
  const [horizontal, setHorizontal] = useState(true);
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      setHorizontal(r.width >= r.height);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Build the point cloud whenever the density or visible extent changes.
  // Points are sampled in math coords so the vertex shader can just divide by
  // viewExtent for the input pane and apply f then divide for the output pane.
  useEffect(() => {
    const n = density * density;
    const inputPos = sampleInputPositions(gridMode, density, viewExtent);
    const seeds    = new Float32Array(n * 4);
    for (let k = 0; k < n; k++) {
      seeds[4 * k]     = Math.random();
      seeds[4 * k + 1] = Math.random();
      seeds[4 * k + 2] = Math.random();
      seeds[4 * k + 3] = Math.random();
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('inputPos', new THREE.BufferAttribute(inputPos, 2));
    geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    geom.setAttribute('seed',     new THREE.BufferAttribute(seeds, 4));
    geometryRef.current = geom;

    if (inputPane.current.points)  inputPane.current.points.geometry  = geom;
    if (outputPane.current.points) outputPane.current.points.geometry = geom;

    return () => geom.dispose();
  }, [density, viewExtent, gridMode]);

  // Mount and tear down both renderers.
  useEffect(() => {
    function mount(target: HTMLDivElement, transform: 0 | 1, store: React.MutableRefObject<PaneRefs>) {
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setClearColor(0x0c0c10);
      target.appendChild(renderer.domElement);
      renderer.domElement.style.display = 'block';
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';

      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      const material = new THREE.ShaderMaterial({
        uniforms: {
          viewExtent:    { value: viewExtent },
          transform:     { value: transform },
          planeMode:     { value: planeMode === 'logpolar' ? 1 : 0 },
          functionType:  { value: functionIndex },
          exponentP:     { value: expP },
          exponentQ:     { value: expQ === 0 ? 1 : expQ },
          branchIndex:   { value: branchIndex },
          pointSize:     { value: pointSize },
          colorMode:     { value: colourMode },
          saturation:    { value: saturation },
          intensity:     { value: intensity },
        },
        vertexShader,
        fragmentShader,
      });
      const points = new THREE.Points(geometryRef.current!, material);
      scene.add(points);
      store.current = { renderer, scene, camera, material, points };
    }

    if (inputMountRef.current)  mount(inputMountRef.current,  0, inputPane);
    if (outputMountRef.current) mount(outputMountRef.current, 1, outputPane);

    let raf = 0;
    const tick = () => {
      const renderPane = (pane: PaneRefs, mountEl: HTMLDivElement | null) => {
        if (!pane.renderer || !pane.scene || !pane.camera || !mountEl) return;
        const r = mountEl.getBoundingClientRect();
        // Render the canvas as a square that fits the smaller of the
        // container's two dimensions, so the (x, y) view stays isotropic.
        const size = Math.min(r.width, r.height);
        if (size > 0 && (pane.renderer.domElement.width !== size * window.devicePixelRatio
                      || pane.renderer.domElement.height !== size * window.devicePixelRatio)) {
          pane.renderer.setSize(size, size, false);
          pane.renderer.domElement.style.width  = `${size}px`;
          pane.renderer.domElement.style.height = `${size}px`;
        }
        pane.renderer.render(pane.scene, pane.camera);
      };
      renderPane(inputPane.current,  inputMountRef.current);
      renderPane(outputPane.current, outputMountRef.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      for (const pane of [inputPane.current, outputPane.current]) {
        pane.renderer?.dispose();
        if (pane.renderer?.domElement.parentNode) {
          pane.renderer.domElement.parentNode.removeChild(pane.renderer.domElement);
        }
      }
      inputPane.current  = {};
      outputPane.current = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync uniforms when state changes.
  useEffect(() => {
    for (const pane of [inputPane.current, outputPane.current]) {
      const m = pane.material; if (!m) continue;
      m.uniforms.viewExtent.value   = viewExtent;
      m.uniforms.planeMode.value    = planeMode === 'logpolar' ? 1 : 0;
      m.uniforms.functionType.value = functionIndex;
      m.uniforms.exponentP.value    = expP;
      m.uniforms.exponentQ.value    = expQ === 0 ? 1 : expQ;
      m.uniforms.branchIndex.value  = branchIndex;
      m.uniforms.pointSize.value    = pointSize;
      m.uniforms.colorMode.value    = colourMode;
      m.uniforms.saturation.value   = saturation;
      m.uniforms.intensity.value    = intensity;
    }
  }, [viewExtent, planeMode, functionIndex, expP, expQ, branchIndex, pointSize, colourMode, saturation, intensity]);

  // Map a curve through the active complex function to get the output polyline.
  const outputCurve = useMemo<CurvePoint[]>(() => {
    if (curve.length === 0) return [];
    const tmp = new THREE.Vector2();
    return curve.map(([x, y]) => {
      tmp.set(x, y);
      const w = functionIndex === POW_PQ_INDEX
        ? complexPowRational(tmp, expP, expQ === 0 ? 1 : expQ)
        : applyComplexBranch(tmp, functionIndex, branchIndex);
      return [w.x, w.y] as CurvePoint;
    });
  }, [curve, functionIndex, expP, expQ, branchIndex]);

  const handleStandardCurve = (id: StandardCurveName) => {
    setCurve(buildStandardCurve(id, viewExtent));
  };

  const PaneLabel = ({ children }: { children: React.ReactNode }) => (
    <div style={{
      position: 'absolute', top: 8, left: 12,
      color: '#9b9ba3', fontSize: 12, letterSpacing: 0.06,
      fontFamily: 'ui-monospace, SF Mono, Menlo, monospace',
      textTransform: 'uppercase', pointerEvents: 'none', userSelect: 'none',
      zIndex: 2,
    }}>{children}</div>
  );

  const isPow = functionIndex === POW_PQ_INDEX;
  const isMulti = functionIndex === 1 /* sqrt */
               || functionIndex === 3 /* ln */
               || functionIndex === 14 /* branchSqrtPoly */
               || isPow;

  const colourPills = useMemo(() => (
    [0, 1, 2] as ColourMode[]
  ).map(m => ({ value: m, label: COLOUR_MODE_LABELS[m] })), []);

  return (
    <>
      <div
        ref={wrapperRef}
        style={{
          position: 'absolute', inset: 0,
          display: 'flex',
          flexDirection: horizontal ? 'row' : 'column',
          alignItems: 'stretch',
          gap: 1,
          background: '#1a1a22',
        }}
      >
        <InputPane
          mountRef={inputMountRef}
          viewExtent={viewExtent}
          planeMode={planeMode}
          drawMode={drawMode}
          curve={curve}
          onAppendCurve={(pt, fresh) => {
            setCurve(prev => fresh ? [pt] : [...prev, pt]);
          }}
          onWheelZoom={(factor) => setViewExtent(v => Math.min(20, Math.max(0.2, v * factor)))}
        >
          <PaneLabel>Input · z = x + iy</PaneLabel>
        </InputPane>
        <OutputPane
          mountRef={outputMountRef}
          viewExtent={viewExtent}
          planeMode={planeMode}
          curve={outputCurve}
          onWheelZoom={(factor) => setViewExtent(v => Math.min(20, Math.max(0.2, v * factor)))}
        >
          <PaneLabel>Output · w = f(z)</PaneLabel>
        </OutputPane>
      </div>

      <PlaneCurveFloater
        drawMode={drawMode}
        onToggleDraw={() => setDrawMode(d => !d)}
        onStandardCurve={handleStandardCurve}
        onClear={() => { setCurve([]); setDrawMode(false); }}
        hasCurve={curve.length > 0}
      />

      <ShellSettings>
        <Section title="Function" icon="ƒ" defaultOpen>
          <Select
            label="Function"
            options={functionNames.map((n, i) => ({ value: i, label: n }))}
            value={functionIndex}
            onChange={setFunctionIndex}
          />
          {isPow && (
            <div style={{ display: 'flex', gap: 8 }}>
              <label className="cp-row" style={{ flex: 1 }}>
                <div className="cp-row-label"><span>p</span></div>
                <input type="number" value={expP} step={1}
                  onChange={e => setExpP(parseInt(e.target.value, 10) || 0)} />
              </label>
              <label className="cp-row" style={{ flex: 1 }}>
                <div className="cp-row-label"><span>q</span></div>
                <input type="number" value={expQ} step={1}
                  onChange={e => setExpQ(parseInt(e.target.value, 10) || 1)} />
              </label>
            </div>
          )}
          {isMulti && (
            <Select
              label="Branch index"
              options={[-2, -1, 0, 1, 2].map(b => ({ value: b, label: String(b) }))}
              value={branchIndex}
              onChange={setBranchIndex}
            />
          )}
        </Section>

        <Section title="Color" icon="◐" defaultOpen>
          <Pills
            label="Mode"
            options={colourPills}
            value={colourMode}
            onChange={setColourMode}
          />
          <Slider label="Saturation" value={saturation}
            min={0} max={1} step={0.01}
            onChange={setSaturation} format={v => v.toFixed(2)} />
          <Slider label="Intensity" value={intensity}
            min={0.3} max={1.5} step={0.05}
            onChange={setIntensity} format={v => v.toFixed(2)} />
        </Section>

        <Section title="View" icon="◑">
          <Pills<GridMode>
            label="Grid"
            options={[
              { value: 'cartesian', label: 'Cartesian' },
              { value: 'polar', label: 'Polar' },
            ]}
            value={gridMode}
            onChange={setGridMode}
          />
          <Pills<PlaneMode>
            label="Plane"
            options={[
              { value: 'cartesian', label: 'Cartesian' },
              { value: 'logpolar', label: 'Log-polar' },
            ]}
            value={planeMode}
            onChange={setPlaneMode}
          />
          <Slider label="Extent (±)" value={viewExtent}
            min={0.5} max={10} step={0.5}
            onChange={setViewExtent} format={v => v.toFixed(1)} />
          <Slider label="Point size" value={pointSize}
            min={1} max={6} step={0.5}
            onChange={setPointSize} format={v => v.toFixed(1)} />
          <Slider label="Density (per side)" value={density}
            min={40} max={900} step={20}
            onChange={setDensity} format={v => `${v}×${v} (${((v * v) / 1e6).toFixed(2)}M)`} />
        </Section>

        <Section title="About" icon="ⓘ">
          <Readme markdown={readmeText} />
        </Section>

        <button
          style={{
            margin: '4px 0', padding: '12px 16px', borderRadius: 6,
            border: '1px solid var(--cp-border)',
            background: 'rgba(255,255,255,0.06)', color: 'var(--cp-fg)',
            cursor: 'pointer', fontSize: 14, fontWeight: 600,
          }}
          onClick={() => {
            clearPersistedState(STORAGE_KEY);
            window.location.reload();
          }}
          title="Forget saved settings and restore the defaults"
        >
          Reset settings to defaults
        </button>
      </ShellSettings>
    </>
  );
}

/* ------------------------------------------------------------------ *
 *  Pane sub-components.                                              *
 *  Both render the Three.js canvas + an SVG overlay sized to the     *
 *  centered square in which the renderer draws. The input pane also  *
 *  owns the pointer handlers that capture freehand curve strokes.    *
 * ------------------------------------------------------------------ */

function useInscribedSquare(ref: React.RefObject<HTMLDivElement>) {
  const [box, setBox] = useState({ w: 0, h: 0, size: 0, offX: 0, offY: 0 });
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      const size = Math.min(r.width, r.height);
      setBox({
        w: r.width, h: r.height, size,
        offX: (r.width - size) / 2,
        offY: (r.height - size) / 2,
      });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return box;
}

interface PaneCommon {
  mountRef: React.RefObject<HTMLDivElement>;
  viewExtent: number;
  planeMode: PlaneMode;
  curve: CurvePoint[];
  onWheelZoom: (factor: number) => void;
  children?: React.ReactNode;
}

function CurveSvg({ box, viewExtent, planeMode, points }: {
  box: { w: number; h: number; size: number; offX: number; offY: number };
  viewExtent: number;
  planeMode: PlaneMode;
  points: CurvePoint[];
}) {
  if (box.size === 0 || points.length === 0) return null;
  const cx = box.offX + box.size / 2;
  const cy = box.offY + box.size / 2;
  const half = box.size / 2;
  // Map each math point through the same transform the shader uses (Cartesian
  // or log-polar), then place it within the inscribed square. Clamp the NDC so
  // a stray point at infinity can't blow the path out to a huge bounding box.
  const d = points.map(([x, y], i) => {
    let [nx, ny] = clipFromMath(x, y, planeMode, viewExtent);
    nx = Math.max(-1e4, Math.min(1e4, nx));
    ny = Math.max(-1e4, Math.min(1e4, ny));
    const px = cx + nx * half;
    const py = cy - ny * half;
    return `${i === 0 ? 'M' : 'L'} ${px.toFixed(2)} ${py.toFixed(2)}`;
  }).join(' ');
  return (
    <svg
      width={box.w} height={box.h}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1 }}
    >
      <path d={d} stroke="#ffffff" strokeOpacity={0.9} strokeWidth={2}
            fill="none" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function InputPane({
  mountRef, viewExtent, planeMode, drawMode, curve, onAppendCurve, onWheelZoom, children,
}: PaneCommon & {
  drawMode: boolean;
  onAppendCurve: (pt: CurvePoint, fresh: boolean) => void;
}) {
  const box = useInscribedSquare(mountRef);
  const drawingRef = useRef(false);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{ dist: number } | null>(null);

  const toMath = (clientX: number, clientY: number): CurvePoint | null => {
    const el = mountRef.current; if (!el || box.size === 0) return null;
    const r = el.getBoundingClientRect();
    const half = box.size / 2;
    const cx = r.left + box.offX + half;
    const cy = r.top  + box.offY + half;
    // Pixel → NDC → math, inverting whichever plane layout is active so a
    // freehand stroke in the (possibly unrolled) input pane maps to real z.
    const nx = (clientX - cx) / half;
    const ny = -(clientY - cy) / half;
    return mathFromClip(nx, ny, planeMode, viewExtent);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointersRef.current.size >= 2) {
      // Starting a pinch — drop any in-progress freehand stroke.
      drawingRef.current = false;
      const pts = [...pointersRef.current.values()];
      pinchRef.current = { dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) };
      return;
    }

    if (drawMode) {
      const p = toMath(e.clientX, e.clientY);
      if (!p) return;
      drawingRef.current = true;
      onAppendCurve(p, true);
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const rec = pointersRef.current.get(e.pointerId);
    if (!rec) return;
    rec.x = e.clientX; rec.y = e.clientY;

    if (pointersRef.current.size >= 2 && pinchRef.current) {
      const pts = [...pointersRef.current.values()];
      const newDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (newDist > 1e-3 && pinchRef.current.dist > 1e-3) {
        const factor = pinchRef.current.dist / newDist;
        onWheelZoom(factor);
      }
      pinchRef.current.dist = newDist;
      return;
    }

    if (drawingRef.current) {
      const p = toMath(e.clientX, e.clientY);
      if (p) onAppendCurve(p, false);
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    if (pointersRef.current.size === 0) drawingRef.current = false;
  };

  const onWheel = (e: React.WheelEvent) => {
    const factor = Math.exp(e.deltaY * 0.0015);
    onWheelZoom(factor);
  };

  return (
    <div
      ref={mountRef}
      style={{
        ...paneStyle,
        cursor: drawMode ? 'crosshair' : 'default',
        touchAction: 'none',
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
    >
      {children}
      <CurveSvg box={box} viewExtent={viewExtent} planeMode={planeMode} points={curve} />
    </div>
  );
}

function OutputPane({
  mountRef, viewExtent, planeMode, curve, onWheelZoom, children,
}: PaneCommon) {
  const box = useInscribedSquare(mountRef);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{ dist: number } | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointersRef.current.size === 2) {
      const pts = [...pointersRef.current.values()];
      pinchRef.current = { dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) };
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const rec = pointersRef.current.get(e.pointerId);
    if (!rec) return;
    rec.x = e.clientX; rec.y = e.clientY;
    if (pointersRef.current.size >= 2 && pinchRef.current) {
      const pts = [...pointersRef.current.values()];
      const newDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (newDist > 1e-3 && pinchRef.current.dist > 1e-3) {
        onWheelZoom(pinchRef.current.dist / newDist);
      }
      pinchRef.current.dist = newDist;
    }
  };
  const onPointerUp = (e: React.PointerEvent) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
  };
  const onWheel = (e: React.WheelEvent) => {
    onWheelZoom(Math.exp(e.deltaY * 0.0015));
  };

  return (
    <div
      ref={mountRef}
      style={{ ...paneStyle, touchAction: 'none' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
    >
      {children}
      <CurveSvg box={box} viewExtent={viewExtent} planeMode={planeMode} points={curve} />
    </div>
  );
}

const paneStyle: React.CSSProperties = {
  flex: 1,
  position: 'relative',
  background: '#0c0c10',
  overflow: 'hidden',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};
