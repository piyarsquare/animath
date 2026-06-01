import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { ShellSettings, useAppHeader } from '../../components/AppShell';
import { Section, Slider, Pills, Select } from '../../components/ControlPanel';
import Readme from '../../components/Readme';
import readmeText from './README.md?raw';
import { functionNames, functionFormulas, POW_PQ_INDEX } from '../../lib/complexMath';
import { vertexShader, fragmentShader } from './shaders';

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
 */
export default function PlaneTransform() {
  const [functionIndex, setFunctionIndex] = useState(() =>
    Math.max(0, functionNames.indexOf('sin')),
  );
  const [expP, setExpP] = useState(1);
  const [expQ, setExpQ] = useState(2);
  const [branchIndex, setBranchIndex] = useState(0);
  const [density, setDensity] = useState(240);          // points per side
  const [pointSize, setPointSize] = useState(2.5);
  const [viewExtent, setViewExtent] = useState(3);      // half-side of visible square
  const [colourMode, setColourMode] = useState<ColourMode>(0);
  const [saturation, setSaturation] = useState(0.85);
  const [intensity, setIntensity] = useState(1.0);

  const fnName = functionNames[functionIndex];
  const fnFormula = functionIndex === POW_PQ_INDEX
    ? `z^(${expP}/${expQ})`
    : functionFormulas[fnName];
  useAppHeader(fnName, fnFormula);

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
    const inputPos = new Float32Array(n * 2);
    const seeds    = new Float32Array(n * 4);
    let k = 0;
    for (let i = 0; i < density; i++) {
      for (let j = 0; j < density; j++) {
        const x = (i / (density - 1) - 0.5) * 2 * viewExtent;
        const y = (j / (density - 1) - 0.5) * 2 * viewExtent;
        inputPos[2 * k]     = x;
        inputPos[2 * k + 1] = y;
        seeds[4 * k]     = Math.random();
        seeds[4 * k + 1] = Math.random();
        seeds[4 * k + 2] = Math.random();
        seeds[4 * k + 3] = Math.random();
        k++;
      }
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('inputPos', new THREE.BufferAttribute(inputPos, 2));
    geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    geom.setAttribute('seed',     new THREE.BufferAttribute(seeds, 4));
    geometryRef.current = geom;

    if (inputPane.current.points)  inputPane.current.points.geometry  = geom;
    if (outputPane.current.points) outputPane.current.points.geometry = geom;

    return () => geom.dispose();
  }, [density, viewExtent]);

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
      m.uniforms.functionType.value = functionIndex;
      m.uniforms.exponentP.value    = expP;
      m.uniforms.exponentQ.value    = expQ === 0 ? 1 : expQ;
      m.uniforms.branchIndex.value  = branchIndex;
      m.uniforms.pointSize.value    = pointSize;
      m.uniforms.colorMode.value    = colourMode;
      m.uniforms.saturation.value   = saturation;
      m.uniforms.intensity.value    = intensity;
    }
  }, [viewExtent, functionIndex, expP, expQ, branchIndex, pointSize, colourMode, saturation, intensity]);

  const PaneLabel = ({ children }: { children: React.ReactNode }) => (
    <div style={{
      position: 'absolute', top: 8, left: 12,
      color: '#9b9ba3', fontSize: 12, letterSpacing: 0.06,
      fontFamily: 'ui-monospace, SF Mono, Menlo, monospace',
      textTransform: 'uppercase', pointerEvents: 'none', userSelect: 'none',
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
        <div ref={inputMountRef} style={paneStyle}>
          <PaneLabel>Input · z = x + iy</PaneLabel>
        </div>
        <div ref={outputMountRef} style={paneStyle}>
          <PaneLabel>Output · w = f(z)</PaneLabel>
        </div>
      </div>

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

        <Section title="Colour" icon="◐" defaultOpen>
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
          <Slider label="Extent (±)" value={viewExtent}
            min={0.5} max={10} step={0.5}
            onChange={setViewExtent} format={v => v.toFixed(1)} />
          <Slider label="Point size" value={pointSize}
            min={1} max={6} step={0.5}
            onChange={setPointSize} format={v => v.toFixed(1)} />
          <Slider label="Density (per side)" value={density}
            min={40} max={400} step={20}
            onChange={setDensity} format={v => `${v}×${v}`} />
        </Section>

        <Section title="About" icon="ⓘ">
          <Readme markdown={readmeText} />
        </Section>
      </ShellSettings>
    </>
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
