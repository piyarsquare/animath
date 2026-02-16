import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import Canvas3D from '../../components/Canvas3D';
import ToggleMenu from '../../components/ToggleMenu';
import Readme from '../../components/Readme';
import readmeText from './README.md?raw';
import { COMPLEX_PARTICLES_DEFAULTS } from '../../config/defaults';
import QuarterTurnBar from '@/controls/QuarterTurnBar';
import { vertexShader, fragmentShader } from './shaders';
import { useResponsive, getResponsiveControlsStyle } from '../../styles/responsive';
import { loadParticleTextures } from '../../lib/textures';
import {
  useParticleState, useUniformSync, useViewControls,
  createParticleGeometry, createAxes, startAnimationLoop,
  ViewPoint, ColorStyle, ColourBy,
  shapeNames, textureNames, viewTypes, motionModes, dropModes, AXIS_COLORS,
} from '../../lib/particles';
import { functionNames, functionFormulas } from '../../lib/complexMath';

export type { ViewPoint };

export interface ComplexMultibranchProps {
  count?: number;
  selectedFunction?: string;
  onViewPointChange?: (view: ViewPoint) => void;
  viewPoint?: ViewPoint;
}

export default function ComplexMultibranch({ count = COMPLEX_PARTICLES_DEFAULTS.defaultParticleCount, selectedFunction = 'exp', onViewPointChange, viewPoint }: ComplexMultibranchProps) {
  const { isMobile } = useResponsive();
  const state = useParticleState({ count, viewPoint, onViewPointChange });
  const controls = useViewControls(state);
  useUniformSync(state);

  // ---- Variant-specific state ----
  const [functionIndex, setFunctionIndex] = useState(() => {
    const idx = functionNames.indexOf(selectedFunction);
    return idx >= 0 ? idx : 0;
  });
  const [branchCount, setBranchCount] = useState(1);
  const [branchIndices, setBranchIndices] = useState<number[]>([0, 1, 2]);
  const [branchStyle, setBranchStyle] = useState<'color' | 'intensity' | 'shape'>('color');
  const sceneRef = useRef<THREE.Scene>();
  const pointsRef = useRef<THREE.Points[]>([]);
  const branchIndicesRef = useRef(branchIndices);

  // ---- Variant-specific uniform sync ----
  useEffect(() => {
    state.materialsRef.current.forEach(m => { m.uniforms.functionType.value = functionIndex; });
  }, [functionIndex]);

  useEffect(() => {
    branchIndicesRef.current = branchIndices;
    state.materialsRef.current.forEach((m, i) => {
      m.uniforms.branchIndex.value = branchIndices[i] ?? 0;
    });
  }, [branchIndices]);

  useEffect(() => {
    state.materialsRef.current.forEach((m, i) => {
      m.uniforms.intensity.value = branchStyle === 'intensity' ? state.intensity * (1 - i * 0.3) : state.intensity;
    });
  }, [state.intensity, branchStyle]);

  useEffect(() => {
    state.materialsRef.current.forEach((m, i) => {
      m.uniforms.hueShift.value = branchStyle === 'color' ? (state.hueShift + i / 3) % 1 : state.hueShift;
    });
  }, [state.hueShift, branchStyle]);

  useEffect(() => {
    state.materialsRef.current.forEach((m, i) => {
      m.uniforms.shapeType.value = branchStyle === 'shape' ? (state.shapeIndex + i) % shapeNames.length : state.shapeIndex;
    });
  }, [state.shapeIndex, branchStyle]);

  // ---- Branch material factory ----
  function createBranchMaterial(b: number) {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        opacity: { value: state.opacity },
        functionType: { value: functionIndex },
        globalSize: { value: state.size },
        intensity: { value: branchStyle === 'intensity' ? state.intensity * (1 - b * 0.3) : state.intensity },
        shimmerAmp: { value: state.shimmer },
        jitterAmp: { value: state.jitter },
        hueShift: { value: branchStyle === 'color' ? (state.hueShift + b / 3) % 1 : state.hueShift },
        saturation: { value: state.saturation },
        realView: { value: state.realViewRef.current ? 1 : 0 },
        shapeType: { value: branchStyle === 'shape' ? (state.shapeIndex + b) % shapeNames.length : state.shapeIndex },
        tex: { value: state.texturesRef.current[state.textureIndex] ?? new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1) },
        textureIndex: { value: state.textureIndex },
        uColourStyle: { value: state.colourStyle },
        uColourBy: { value: state.colourBy },
        uRotL: { value: { w: 1, v: new THREE.Vector3() } },
        uRotR: { value: { w: 1, v: new THREE.Vector3() } },
        uProjMode: { value: state.projRef.current },
        uProjTarget: { value: state.projRef.current },
        uProjAlpha: { value: 0 },
        branchIndex: { value: branchIndicesRef.current[b] ?? 0 },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
    });
  }

  // ---- Rebuild Points when branchCount changes ----
  useEffect(() => {
    if (!sceneRef.current || !state.geometryRef.current) return;
    pointsRef.current.forEach(p => sceneRef.current!.remove(p));
    state.materialsRef.current.forEach(m => m.dispose());
    state.materialsRef.current = [];
    pointsRef.current = [];
    for (let b = 0; b < branchCount; b++) {
      const material = createBranchMaterial(b);
      state.materialsRef.current.push(material);
      const pts = new THREE.Points(state.geometryRef.current, material);
      sceneRef.current.add(pts);
      pointsRef.current.push(pts);
    }
  }, [branchCount]);

  // ---- Scene setup ----
  const onMount = React.useCallback(
    (ctx: { scene: THREE.Scene; camera: THREE.PerspectiveCamera; renderer: THREE.WebGLRenderer }) => {
      const { scene, camera, renderer } = ctx;
      sceneRef.current = scene;
      state.cameraRef.current = camera;
      state.rendererRef.current = renderer;
      renderer.setClearColor(state.objectMode ? 0xffffff : 0x000000);
      camera.position.z = state.cameraZ;

      const textures = loadParticleTextures(() => {
        state.materialsRef.current.forEach(m => {
          m.uniforms.tex.value = textures[state.textureIndex];
        });
      });
      state.texturesRef.current = textures;

      const geometry = createParticleGeometry(state.particleCount);
      state.geometryRef.current = geometry;

      state.materialsRef.current = [];
      pointsRef.current = [];
      for (let b = 0; b < branchCount; b++) {
        const material = createBranchMaterial(b);
        state.materialsRef.current.push(material);
        const pts = new THREE.Points(geometry, material);
        scene.add(pts);
        pointsRef.current.push(pts);
      }

      const axes = createAxes(scene, state.hueShift, state.axisWidth);
      state.xAxisRef.current = axes.x;
      state.yAxisRef.current = axes.y;
      state.uAxisRef.current = axes.u;
      state.vAxisRef.current = axes.v;

      state.viewPointRef.current = { L: state.rotLRef.current.clone(), R: state.rotRRef.current.clone() };
      state.onViewPointChangeRef.current?.(state.viewPointRef.current);

      startAnimationLoop({
        renderer, scene, camera,
        materialsRef: state.materialsRef,
        axisRefs: { x: state.xAxisRef, y: state.yAxisRef, u: state.uAxisRef, v: state.vAxisRef },
        realViewRef: state.realViewRef,
        projRef: state.projRef,
        viewMotionRef: state.viewMotionRef,
        dropAxisRef: state.dropAxisRef,
        rotLRef: state.rotLRef,
        rotRRef: state.rotRRef,
        viewPointRef: state.viewPointRef,
        onViewPointChangeRef: state.onViewPointChangeRef,
        orientationRef: state.orientationRef,
        setOrientationMatrix: state.setOrientationMatrix,
      });
    }, []);

  const currentName = functionNames[functionIndex];
  const currentFormula = functionFormulas[currentName];

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden' }}>
      <Canvas3D onMount={onMount} />

      {/* Bottom Left Menu */}
      <div
        style={{
          ...getResponsiveControlsStyle(isMobile),
          bottom: isMobile ? '10px' : '10px',
          left: isMobile ? '10px' : '10px',
          maxWidth: isMobile ? 'calc(100vw - 20px)' : '300px',
        }}
      >
        <ToggleMenu title="Menu" defaultOpen={!isMobile}>
          <div style={{ color: 'white', display: 'flex', flexDirection: 'column', gap: isMobile ? 6 : 8 }}>
            <label style={{ fontSize: isMobile ? '12px' : '14px' }}>
              Saturation:
              <input type="range" min={COMPLEX_PARTICLES_DEFAULTS.ranges.saturation.min} max={COMPLEX_PARTICLES_DEFAULTS.ranges.saturation.max} step={COMPLEX_PARTICLES_DEFAULTS.ranges.saturation.step} value={state.saturation} onChange={(e) => state.setSaturation(parseFloat(e.target.value))} style={{ width: '100%' }} />
            </label>
            <label style={{ fontSize: isMobile ? '12px' : '14px' }}>
              Particles:
              <input type="range" min={COMPLEX_PARTICLES_DEFAULTS.ranges.particleCount.min} max={COMPLEX_PARTICLES_DEFAULTS.ranges.particleCount.max} step={COMPLEX_PARTICLES_DEFAULTS.ranges.particleCount.step} value={state.particleCount} onChange={(e) => state.setParticleCount(parseInt(e.target.value, 10))} style={{ width: '100%' }} />
            </label>
            <label style={{ fontSize: isMobile ? '12px' : '14px' }}>
              Size:
              <input type="range" min={COMPLEX_PARTICLES_DEFAULTS.ranges.size.min} max={COMPLEX_PARTICLES_DEFAULTS.ranges.size.max} step={COMPLEX_PARTICLES_DEFAULTS.ranges.size.step} value={state.size} onChange={(e) => state.setSize(parseFloat(e.target.value))} style={{ width: '100%' }} />
            </label>
            <label style={{ fontSize: isMobile ? '12px' : '14px' }}>
              Opacity:
              <input type="range" min={COMPLEX_PARTICLES_DEFAULTS.ranges.opacity.min} max={COMPLEX_PARTICLES_DEFAULTS.ranges.opacity.max} step={COMPLEX_PARTICLES_DEFAULTS.ranges.opacity.step} value={state.opacity} onChange={(e) => state.setOpacity(parseFloat(e.target.value))} style={{ width: '100%' }} />
            </label>
            <label style={{ fontSize: isMobile ? '12px' : '14px' }}>
              Intensity:
              <input type="range" min={COMPLEX_PARTICLES_DEFAULTS.ranges.intensity.min} max={COMPLEX_PARTICLES_DEFAULTS.ranges.intensity.max} step={COMPLEX_PARTICLES_DEFAULTS.ranges.intensity.step} value={state.intensity} onChange={(e) => state.setIntensity(parseFloat(e.target.value))} style={{ width: '100%' }} />
            </label>
            <label style={{ fontSize: isMobile ? '12px' : '14px' }}>
              Shimmer:
              <input type="range" min={COMPLEX_PARTICLES_DEFAULTS.ranges.shimmer.min} max={COMPLEX_PARTICLES_DEFAULTS.ranges.shimmer.max} step={COMPLEX_PARTICLES_DEFAULTS.ranges.shimmer.step} value={state.shimmer} onChange={(e) => state.setShimmer(parseFloat(e.target.value))} style={{ width: '100%' }} />
            </label>
            <label style={{ fontSize: isMobile ? '12px' : '14px' }}>
              Jitter:
              <input type="range" min={COMPLEX_PARTICLES_DEFAULTS.ranges.jitter.min} max={COMPLEX_PARTICLES_DEFAULTS.ranges.jitter.max} step={COMPLEX_PARTICLES_DEFAULTS.ranges.jitter.step} value={state.jitter} onChange={(e) => state.setJitter(parseFloat(e.target.value))} style={{ width: '100%' }} />
            </label>
            <label style={{ fontSize: isMobile ? '12px' : '14px' }}>
              Hue Shift:
              <input type="range" min={COMPLEX_PARTICLES_DEFAULTS.ranges.hueShift.min} max={COMPLEX_PARTICLES_DEFAULTS.ranges.hueShift.max} step={COMPLEX_PARTICLES_DEFAULTS.ranges.hueShift.step} value={state.hueShift} onChange={(e) => state.setHueShift(parseFloat(e.target.value))} style={{ width: '100%' }} />
            </label>
            <label style={{ fontSize: isMobile ? '12px' : '14px' }}>
              Axis Width: {state.axisWidth.toFixed(1)}
              <input type="range" min={COMPLEX_PARTICLES_DEFAULTS.ranges.axisWidth.min} max={COMPLEX_PARTICLES_DEFAULTS.ranges.axisWidth.max} step={COMPLEX_PARTICLES_DEFAULTS.ranges.axisWidth.step} value={state.axisWidth} onChange={(e) => state.setAxisWidth(parseFloat(e.target.value))} style={{ width: '100%' }} />
            </label>
            <div className="color-by-toolbar" style={{ display: 'flex', gap: 4 }}>
              {(['Domain', 'Range'] as const).map((n, idx) => (
                <button key={n} className={state.colourBy === idx ? 'active' : ''} onClick={() => state.setColourBy(idx as ColourBy)}>{n}</button>
              ))}
            </div>
            <div className="color-style-toolbar" style={{ display: 'flex', gap: 4 }}>
              {Object.keys(ColorStyle).filter(k => isNaN(Number(k))).map(k => (
                <button key={k} className={state.colourStyle === ColorStyle[k as keyof typeof ColorStyle] ? 'active' : ''} onClick={() => state.setColourStyle(ColorStyle[k as keyof typeof ColorStyle])}>{k}</button>
              ))}
            </div>
            <label style={{ fontSize: isMobile ? '12px' : '14px' }}>
              Shape:
              <select value={state.shapeIndex} onChange={(e) => state.setShapeIndex(parseInt(e.target.value, 10))}>
                {shapeNames.map((s, idx) => (<option key={s} value={idx}>{s}</option>))}
              </select>
            </label>
            <label style={{ fontSize: isMobile ? '12px' : '14px' }}>
              Texture:
              <select value={state.textureIndex} onChange={(e) => state.setTextureIndex(parseInt(e.target.value, 10))}>
                {textureNames.map((t, idx) => (<option key={t} value={idx}>{t}</option>))}
              </select>
            </label>
            <label style={{ fontSize: isMobile ? '12px' : '14px' }}>
              Object Mode:
              <input type="checkbox" checked={state.objectMode} onChange={(e) => state.setObjectMode(e.target.checked)} />
            </label>
            <label style={{ fontSize: isMobile ? '12px' : '14px' }}>
              Branches:
              <select value={branchCount} onChange={e => setBranchCount(parseInt(e.target.value, 10))}>
                {[1, 2, 3].map(n => (<option key={n} value={n}>{n}</option>))}
              </select>
            </label>
            <div style={{ display: 'flex', gap: 4, color: 'white' }}>
              {Array.from({ length: branchCount }).map((_, i) => (
                <input key={i} type="number" value={branchIndices[i]}
                  onChange={e => {
                    const arr = [...branchIndices];
                    arr[i] = parseInt(e.target.value, 10);
                    setBranchIndices(arr);
                  }} style={{ width: '4em' }} />
              ))}
            </div>
            <label style={{ fontSize: isMobile ? '12px' : '14px' }}>
              Style:
              <select value={branchStyle} onChange={e => setBranchStyle(e.target.value as 'color' | 'intensity' | 'shape')}>
                <option value="color">color</option>
                <option value="intensity">intensity</option>
                <option value="shape">shape</option>
              </select>
            </label>
          </div>
        </ToggleMenu>
      </div>

      {/* Top Left Controls */}
      <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label style={{ display: 'flex', flexDirection: 'column', color: 'white', gap: 4 }}>
          Function:
          <select value={functionIndex} onChange={(e) => setFunctionIndex(parseInt(e.target.value, 10))}>
            {functionNames.map((name, idx) => (<option key={name} value={idx}>{name}</option>))}
          </select>
        </label>
        <div className="view-type-toolbar">
          {viewTypes.map(([name, code]) => (
            <button key={name} className={state.viewType === code ? 'active' : ''} onClick={() => controls.handleViewType(code)}>{name}</button>
          ))}
        </div>
        <div className="view-motion-toolbar">
          {motionModes.map(m => (
            <button key={m} className={state.viewMotion === m ? 'active' : ''} onClick={() => controls.handleMotion(m)}>{m}</button>
          ))}
        </div>
        <div className="drop-axis-toolbar">
          {dropModes.map(d => (
            <button key={d} className={state.dropAxis === d ? 'active' : ''} onClick={() => controls.handleDropAxis(d)}>{d}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <label style={{ color: 'white', display: 'flex', flexDirection: 'column', margin: 0 }}>
            Distance: {state.cameraZ.toFixed(1)}
            <input type="range" min={COMPLEX_PARTICLES_DEFAULTS.ranges.cameraZ.min} max={COMPLEX_PARTICLES_DEFAULTS.ranges.cameraZ.max} step={COMPLEX_PARTICLES_DEFAULTS.ranges.cameraZ.step} value={state.cameraZ} onChange={(e) => state.setCameraZ(parseFloat(e.target.value))} style={{ width: '100%' }} />
          </label>
        </div>
      </div>

      {/* Top Right Orientation Matrix and Quarter Turn */}
      {!isMobile && (
        <div
          style={{
            ...getResponsiveControlsStyle(isMobile),
            position: 'absolute',
            top: '10px',
            right: '10px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 4,
          }}
        >
          <div style={{ fontSize: '1.2em', pointerEvents: 'none' }}>
            <div>{currentName}</div>
            <div>{currentFormula}</div>
          </div>
          <div style={{ fontFamily: 'monospace', lineHeight: 1 }}>
            <table style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {(['x', 'y', 'v', 'u'] as const).map(k => (
                    <th key={k} style={{ color: `hsl(${((AXIS_COLORS[k] + state.hueShift) % 1) * 360},100%,50%)`, padding: '0 4px', fontWeight: 'normal' }}>{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {state.orientationMatrix.map((row, i) => (
                  <tr key={i}>
                    {row.map((v, j) => (
                      <td key={j} style={{ textAlign: 'right', padding: '0 4px' }}>{v.toFixed(2)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <QuarterTurnBar onTurn={controls.turn} />
        </div>
      )}

      {/* Mobile: Function Name Display */}
      {isMobile && (
        <div style={{ ...getResponsiveControlsStyle(isMobile), top: '10px', right: '10px', maxWidth: '140px', textAlign: 'center', fontSize: '14px' }}>
          <div>{currentName}</div>
          <div style={{ fontSize: '12px' }}>{currentFormula}</div>
        </div>
      )}

      {/* About Menu */}
      <div style={{ position: 'absolute', bottom: '10px', right: '10px', zIndex: 10 }}>
        <ToggleMenu title="About" defaultOpen={!isMobile}>
          <Readme markdown={readmeText} />
        </ToggleMenu>
      </div>
    </div>
  );
}
