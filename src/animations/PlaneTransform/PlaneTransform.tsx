import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import Workspace from '../../chrome/workspace/Workspace';
import { SplitPanes } from '../../chrome/workspace/SplitPanes';
import type { LayoutDef, SectionDef, ViewDef } from '../../chrome/workspace/types';
import { usePhone } from '../../chrome/usePhone';
import { Slider, Pills, Select, NumberInput, ComplexInput } from '../../components/ControlPanel';
import readmeText from './README.md?raw';
import explainerText from './EXPLAINER.md?raw';
import {
  functionNames, functionFormulas, functionCategories,
  POW_PQ_INDEX, QUADRATIC_INDEX, MULTIVALUED_INDICES,
  applyComplexBranch, complexPowRational, complexQuadratic,
} from '../../lib/complexMath';
import { usePersistentState, clearPersistedState } from '../../lib/usePersistentState';
import { decodeFunction, encodeFunction, type FunctionState } from '../../lib/functionHandoff';
import { useHandoffState } from '../../lib/useHandoffState';
import { vertexShader, fragmentShader } from './shaders';
import {
  buildStandardCurve, STANDARD_CURVES,
  type StandardCurveName, type CurvePoint,
} from './standardCurves';
import {
  sampleInputPositions, clipFromMath, mathFromClip,
  type GridMode, type PlaneMode,
} from './polarViews';

/** localStorage namespace for this viewer's saved settings. */
const STORAGE_KEY = 'plane-transform';

type ColorMode = 0 | 1 | 2;
const COLOR_MODE_LABELS: Record<ColorMode, string> = {
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
  /** Mount size cached by a ResizeObserver — read per frame without layout. */
  size?: { w: number; h: number };
  ro?: ResizeObserver;
}

/**
 * Plane-transform viewer: shows how a complex function sends the (x, y) input
 * plane to the (u, v) output plane. Two view windows on the workspace stage —
 * the z-plane (input) and the f(z)-plane — share one point cloud; the output
 * window's vertex shader runs the selected function so each colored point ends
 * up at its f(z) location.
 *
 * The Grid panel offers a polar sampling grid (rings + rays) and a log-polar
 * plane layout (plot at (arg, log|·|)) — see polarViews.ts.
 */
export default function PlaneTransform({ embed }: {
  /** Chrome-less applet mode (#/embed/plane-transform, docs/EMBEDS.md):
   *  URL-configured, ephemeral state, both panes side by side. */
  embed?: import('../../lib/embedParams').PlaneEmbedConfig;
} = {}) {
  // Per-field persistence key; null in embed mode (ephemeral).
  const ek = (field: string) => (embed ? null : `${STORAGE_KEY}:${field}`);
  // A cross-app function handoff (?fn=…) seeds these via the third "seed" setter,
  // which overrides the live view for this session WITHOUT persisting — so the
  // destination app's own saved function survives (see useHandoffState).
  const [functionIndex, setFunctionIndex, seedFunctionIndex] = useHandoffState(
    ek('functionIndex'), Math.max(0, functionNames.indexOf(embed?.fn ?? 'sin')),
  );
  const [expP, setExpP, seedExpP] = useHandoffState(ek('expP'), embed?.p ?? 1);
  const [expQ, setExpQ, seedExpQ] = useHandoffState(ek('expQ'), embed?.q ?? 2);
  const [branchIndex, setBranchIndex] = usePersistentState(ek('branchIndex'), 0);
  // Coefficients for the generic quadratic a·z²+b·z+c (each [Re, Im]); default
  // a=1 so the out-of-the-box quadratic is z². Mirrors ComplexParticles.
  const [quadA, setQuadA, seedQuadA] = useHandoffState<[number, number]>(ek('quadA'), [1, 0]);
  const [quadB, setQuadB, seedQuadB] = useHandoffState<[number, number]>(ek('quadB'), [0, 0]);
  const [quadC, setQuadC, seedQuadC] = useHandoffState<[number, number]>(ek('quadC'), [0, 0]);

  // One-time function handoff (Phase-2 "graph ↔ map"): arriving from Complex
  // Particles' "↗ plane map" link carries the function in the URL (?fn=…). Apply
  // it to this session's view only (the seed* setters don't persist), then strip
  // the query — so a later plain reload still shows the user's own saved choice
  // rather than the handed-off function. Embed mode parses its own params, so it
  // is skipped here.
  useEffect(() => {
    if (embed) return;
    const seed = decodeFunction(window.location.hash);
    if (seed.index === undefined) return;
    seedFunctionIndex(seed.index);
    if (seed.p !== undefined) seedExpP(seed.p);
    if (seed.q !== undefined) seedExpQ(seed.q === 0 ? 1 : seed.q);
    if (seed.quad) { seedQuadA(seed.quad.a); seedQuadB(seed.quad.b); seedQuadC(seed.quad.c); }
    window.history.replaceState(null, '', window.location.hash.split('?')[0] || '#/plane-transform');
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [density, setDensity] = usePersistentState(ek('density'), 240);          // points per side
  const [pointSize, setPointSize] = usePersistentState(ek('pointSize'), 2.5);
  const [viewExtent, setViewExtent] = usePersistentState(ek('viewExtent'), embed?.extent ?? 3);   // half-side of visible square
  const [gridMode, setGridMode] = usePersistentState<GridMode>(ek('gridMode'), 'cartesian');
  const [planeMode, setPlaneMode] = usePersistentState<PlaneMode>(ek('planeMode'), 'cartesian');
  const [colorMode, setColorMode] = usePersistentState<ColorMode>(ek('colorMode'), 0);
  const [saturation, setSaturation] = usePersistentState(ek('saturation'), 0.85);
  const [intensity, setIntensity] = usePersistentState(ek('intensity'), 1.0);
  // Drawn curve + draw toggle are transient per-session state, not persisted.
  const [curve, setCurve] = useState<CurvePoint[]>([]);
  const [drawMode, setDrawMode] = useState(false);

  const fmtComplex = ([re, im]: [number, number]): string => {
    const r = Number(re.toFixed(3));
    const i = Number(im.toFixed(3));
    if (i === 0) return `${r}`;
    if (r === 0) return i === 1 ? 'i' : i === -1 ? '−i' : `${i}i`;
    return `${r}${i > 0 ? '+' : '−'}${Math.abs(i)}i`;
  };
  const fnName = functionNames[functionIndex];
  const fnFormula = functionIndex === POW_PQ_INDEX
    ? `z^(${expP}/${expQ})`
    : functionIndex === QUADRATIC_INDEX
      ? `(${fmtComplex(quadA)})·z² + (${fmtComplex(quadB)})·z + (${fmtComplex(quadC)})`
      : functionFormulas[fnName];

  // Mount targets + refs for the two panes (one per view window).
  const inputMountRef  = useRef<HTMLDivElement>(null);
  const outputMountRef = useRef<HTMLDivElement>(null);
  const inputPane  = useRef<PaneRefs>({});
  const outputPane = useRef<PaneRefs>({});
  const geometryRef = useRef<THREE.BufferGeometry>();

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

  // Mount and tear down both renderers. The desktop and phone workspaces are
  // different subtrees, so crossing the 740px breakpoint remounts the view
  // bodies — keying this effect on `phone` rebuilds the renderers into the
  // fresh mount divs (within one chrome the windows are hidden when collapsed,
  // never unmounted).
  const phone = usePhone();
  useEffect(() => {
    function mount(target: HTMLDivElement, transform: 0 | 1, store: React.MutableRefObject<PaneRefs>) {
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // cap DPR — phones report 3
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
          uQuadA:        { value: new THREE.Vector2(quadA[0], quadA[1]) },
          uQuadB:        { value: new THREE.Vector2(quadB[0], quadB[1]) },
          uQuadC:        { value: new THREE.Vector2(quadC[0], quadC[1]) },
          pointSize:     { value: pointSize },
          colorMode:     { value: colorMode },
          saturation:    { value: saturation },
          intensity:     { value: intensity },
        },
        vertexShader,
        fragmentShader,
      });
      const points = new THREE.Points(geometryRef.current!, material);
      scene.add(points);
      const ro = new ResizeObserver(entries => {
        const r = entries[0]?.contentRect;
        if (r) store.current.size = { w: r.width, h: r.height };
      });
      ro.observe(target);
      store.current = {
        renderer, scene, camera, material, points, ro,
        size: { w: target.clientWidth, h: target.clientHeight },
      };
    }

    if (inputMountRef.current)  mount(inputMountRef.current,  0, inputPane);
    if (outputMountRef.current) mount(outputMountRef.current, 1, outputPane);

    let raf = 0;
    const tick = () => {
      const renderPane = (pane: PaneRefs, mountEl: HTMLDivElement | null) => {
        if (!pane.renderer || !pane.scene || !pane.camera || !mountEl) return;
        // Render the canvas as a square that fits the smaller of the
        // container's two dimensions, so the (x, y) view stays isotropic.
        // Sizes come from the ResizeObserver cache — reading layout here
        // would force a reflow on every animation frame.
        const sz = pane.size;
        const size = sz ? Math.min(sz.w, sz.h) : 0;
        const buf = Math.floor(size * pane.renderer.getPixelRatio());
        if (size > 0 && (pane.renderer.domElement.width !== buf
                      || pane.renderer.domElement.height !== buf)) {
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
        pane.ro?.disconnect();
        pane.renderer?.dispose();
        if (pane.renderer?.domElement.parentNode) {
          pane.renderer.domElement.parentNode.removeChild(pane.renderer.domElement);
        }
      }
      inputPane.current  = {};
      outputPane.current = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phone]);

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
      (m.uniforms.uQuadA.value as THREE.Vector2).set(quadA[0], quadA[1]);
      (m.uniforms.uQuadB.value as THREE.Vector2).set(quadB[0], quadB[1]);
      (m.uniforms.uQuadC.value as THREE.Vector2).set(quadC[0], quadC[1]);
      m.uniforms.pointSize.value    = pointSize;
      m.uniforms.colorMode.value    = colorMode;
      m.uniforms.saturation.value   = saturation;
      m.uniforms.intensity.value    = intensity;
    }
  }, [viewExtent, planeMode, functionIndex, expP, expQ, branchIndex, quadA, quadB, quadC, pointSize, colorMode, saturation, intensity, phone]);

  // Map a curve through the active complex function to get the output polyline.
  const outputCurve = useMemo<CurvePoint[]>(() => {
    if (curve.length === 0) return [];
    const tmp = new THREE.Vector2();
    return curve.map(([x, y]) => {
      tmp.set(x, y);
      const w = functionIndex === POW_PQ_INDEX
        ? complexPowRational(tmp, expP, expQ === 0 ? 1 : expQ)
        : functionIndex === QUADRATIC_INDEX
          ? complexQuadratic(tmp,
              new THREE.Vector2(quadA[0], quadA[1]),
              new THREE.Vector2(quadB[0], quadB[1]),
              new THREE.Vector2(quadC[0], quadC[1]))
          : applyComplexBranch(tmp, functionIndex, branchIndex);
      return [w.x, w.y] as CurvePoint;
    });
  }, [curve, functionIndex, expP, expQ, branchIndex, quadA, quadB, quadC]);

  const handleStandardCurve = (id: StandardCurveName) => {
    setCurve(buildStandardCurve(id, viewExtent));
  };

  const isPow = functionIndex === POW_PQ_INDEX;
  const isQuadratic = functionIndex === QUADRATIC_INDEX;
  const isMulti = MULTIVALUED_INDICES.has(functionIndex);

  const colorPills = useMemo(() => (
    [0, 1, 2] as ColorMode[]
  ).map(m => ({ value: m, label: COLOR_MODE_LABELS[m] })), []);

  /* ---- archetype panels (PARAM-MAP §2; rows unchanged from the old drawer) ---- */

  const functionGroups = functionCategories.map(cat => ({
    label: cat.label,
    options: cat.members.map(idx => ({ value: idx, label: functionNames[idx] })),
  }));

  const functionNode = (
    <>
      <Select
        label="Function"
        groups={functionGroups}
        value={functionIndex}
        onChange={setFunctionIndex}
      />
      {isPow && (
        <>
          <NumberInput label="p" value={expP} integer onChange={setExpP} />
          {/* q = 0 is undefined (z^(p/0)); coerce to 1 so the header/saved value
              matches what actually renders. Negative q stays allowed. */}
          <NumberInput label="q" value={expQ} integer onChange={v => setExpQ(v === 0 ? 1 : v)} />
        </>
      )}
      {isQuadratic && (
        <>
          <div style={{ fontSize: 11, color: 'var(--cp-fg-dim, #9b9ba3)', margin: '4px 0 2px' }}>
            f(z) = a·z² + b·z + c
          </div>
          <ComplexInput label="a" value={quadA} onChange={setQuadA} />
          <ComplexInput label="b" value={quadB} onChange={setQuadB} />
          <ComplexInput label="c" value={quadC} onChange={setQuadC} />
        </>
      )}
      {isMulti && (
        <Select
          label="Branch index"
          options={[-2, -1, 0, 1, 2].map(b => ({ value: b, label: String(b) }))}
          value={branchIndex}
          onChange={setBranchIndex}
        />
      )}
    </>
  );

  const gridNode = (
    <>
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
    </>
  );

  const colorNode = (
    <>
      <Pills
        label="Mode"
        options={colorPills}
        value={colorMode}
        onChange={setColorMode}
      />
      <Slider label="Saturation" value={saturation}
        min={0} max={1} step={0.01}
        onChange={setSaturation} format={v => v.toFixed(2)} />
      <Slider label="Intensity" value={intensity}
        min={0.3} max={1.5} step={0.05}
        onChange={setIntensity} format={v => v.toFixed(2)} />
    </>
  );

  const marksNode = (
    <Slider label="Point size" value={pointSize}
      min={1} max={6} step={0.5}
      onChange={setPointSize} format={v => v.toFixed(1)} />
  );

  // The old PlaneCurveFloater's content, as plain panel rows: draw toggle,
  // standard-curve picker, Clear.
  const curvesNode = (
    <>
      <button
        style={{
          ...curveButtonStyle,
          ...(drawMode ? {
            background: 'rgba(120,180,255,0.18)',
            borderColor: 'rgba(120,180,255,0.55)',
          } : {}),
        }}
        onClick={() => setDrawMode(d => !d)}
        aria-pressed={drawMode}
      >
        {drawMode ? '● Drawing — tap to stop' : '✎ Draw on input'}
      </button>
      <div style={{ fontSize: 11, color: 'var(--cp-fg-dim, #9b9ba3)', margin: '6px 0 2px' }}>
        Standard curves
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
        {STANDARD_CURVES.map(c => (
          <button
            key={c.id}
            style={curveButtonStyle}
            onClick={() => handleStandardCurve(c.id)}
            title={c.id}
          >{c.label}</button>
        ))}
      </div>
      <button
        style={{
          ...curveButtonStyle,
          marginTop: 8,
          ...(curve.length === 0 ? { opacity: 0.45, cursor: 'default' } : {}),
        }}
        onClick={() => { setCurve([]); setDrawMode(false); }}
        disabled={curve.length === 0}
      >Clear</button>
      <div style={{ fontSize: 11, color: 'var(--cp-fg-dim, #9b9ba3)', marginTop: 8 }}>
        Curves drawn on the z-plane window map through f onto the f(z)-plane.
      </div>
    </>
  );

  const detailNode = (
    <>
      <Slider label="Density (per side)" value={density}
        min={40} max={900} step={20}
        onChange={setDensity} format={v => `${v}×${v} (${((v * v) / 1e6).toFixed(2)}M)`} />
      <button
        style={{ ...curveButtonStyle, marginTop: 8, fontWeight: 600 }}
        onClick={() => {
          clearPersistedState(STORAGE_KEY);
          window.location.reload();
        }}
        title="Forget saved settings and restore the defaults"
      >
        Reset settings to defaults
      </button>
    </>
  );

  const sections: SectionDef[] = [
    { id: 'function', title: 'Function', arch: 'subject', node: functionNode, estHeight: 200 },
    { id: 'grid', title: 'Grid', arch: 'domain', node: gridNode, estHeight: 220 },
    { id: 'color', title: 'Color', arch: 'color', node: colorNode, estHeight: 210 },
    { id: 'marks', title: 'Grid style', arch: 'marks', node: marksNode, estHeight: 110 },
    { id: 'curves', title: 'Curves', arch: 'drive', node: curvesNode, estHeight: 300 },
    { id: 'detail', title: 'Detail', arch: 'quality', node: detailNode, estHeight: 160 },
  ];

  // Domain and image are one mathematical unit, so they live as two PANES of
  // ONE split view window (CHROME-REVIEW P5): the chrome can no longer
  // mis-size, half-hide or separate them, and the equal split keeps the two
  // inscribed squares scale-commensurable (same pixels-per-unit — the whole
  // point of reading |f'| off the picture). The id is fresh ('plane', not
  // 'input') so stale persisted rects from the two-window era are dropped.
  const views: ViewDef[] = [
    {
      id: 'plane',
      title: 'z ↦ f(z)',
      defaultRect: { x: 360, y: 16, w: 724, h: 380 },
      hint: 'scroll to zoom both planes · open Curves to draw on z',
      panes: [
        {
          id: 'domain',
          label: 'z — domain',
          node: (
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
            />
          ),
        },
        {
          id: 'image',
          label: 'w = f(z) — image',
          node: (
            <OutputPane
              mountRef={outputMountRef}
              viewExtent={viewExtent}
              planeMode={planeMode}
              curve={outputCurve}
              onWheelZoom={(factor) => setViewExtent(v => Math.min(20, Math.max(0.2, v * factor)))}
            />
          ),
        },
      ],
    },
  ];

  const layouts: LayoutDef[] = [
    {
      id: 'essentials', name: 'Essentials', sub: 'Function · Color', icon: 'tune',
      open: { function: { x: 84, y: 18 }, color: { x: 84, y: 240 } },
    },
    {
      id: 'draw', name: 'Draw', sub: 'Curves beside the planes', icon: 'move',
      open: { curves: { x: 84, y: 18 } },
    },
  ];

  // Embed mode: both panes side by side, none of the workspace chrome. The
  // badge links back to the full app (docs/EMBEDS.md).
  if (embed) {
    const zoom = embed.controls
      ? (factor: number) => setViewExtent(v => Math.min(20, Math.max(0.2, v * factor)))
      : () => {};
    return (
      <div className="am-embed">
        <div className="am-embed-row">
          <SplitPanes
            panes={[
              {
                id: 'domain',
                label: 'z',
                node: (
                  <InputPane
                    mountRef={inputMountRef}
                    viewExtent={viewExtent}
                    planeMode={planeMode}
                    drawMode={false}
                    curve={curve}
                    onAppendCurve={() => {}}
                    onWheelZoom={zoom}
                  />
                ),
              },
              {
                id: 'image',
                label: `f(z) = ${fnFormula}`,
                node: (
                  <OutputPane
                    mountRef={outputMountRef}
                    viewExtent={viewExtent}
                    planeMode={planeMode}
                    curve={outputCurve}
                    onWheelZoom={zoom}
                  />
                ),
              },
            ]}
          />
          <a
            className="am-embed-badge"
            href={`${import.meta.env.BASE_URL}#/plane-transform`}
            target="_blank"
            rel="noreferrer"
            title="Open in animath"
          >
            animath ⧉
          </a>
        </div>
        {embed.caption && <div className="am-embed-caption">{embed.caption}</div>}
      </div>
    );
  }

  // The "?" modal carries both the short explainer and the full About readme,
  // so nothing from the old drawer's About section is lost.
  const help = [explainerText, readmeText].filter(Boolean).join('\n\n---\n\n');

  // Cross-app handoff (Phase-2 "graph ↔ map"): open the same function as its 4D
  // graph in Complex Particles. Carries ONLY the function (name + p/q or quadratic
  // coeffs), never view/appearance state.
  const handoffState: FunctionState = { index: functionIndex, p: expP, q: expQ, quad: { a: quadA, b: quadB, c: quadC } };
  const topBarExtra = (
    <a
      className="am-bar-link"
      href={`#/complex-particles?${encodeFunction(handoffState)}`}
      title="See this function as its 4D graph — the particle cloud (z, f(z)) in ℂ²"
    >↗ 4D graph</a>
  );

  return (
    <Workspace
      appId="plane-transform"
      title={fnName}
      subtitle={fnFormula}
      sections={sections}
      views={views}
      layouts={layouts}
      defaultLayoutId="essentials"
      explainer={help || null}
      titlePanel="function"
      topExtra={topBarExtra}
    />
  );
}

/** Shared inline style for the Curves/Detail panel buttons (the panels load
 *  ControlPanel.css, whose --cp-* variables theme these). */
const curveButtonStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '8px 10px',
  borderRadius: 6,
  border: '1px solid var(--cp-border, #3a3a44)',
  background: 'rgba(255,255,255,0.06)',
  color: 'var(--cp-fg, #e8e8ee)',
  cursor: 'pointer',
  fontSize: 13,
};

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

/** Each pane fills its view-window body (the chrome positions the body's
 *  children at absolute inset 0) and centers the inscribed square canvas. */
const paneStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  background: '#0c0c10',
  overflow: 'hidden',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};
