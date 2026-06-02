import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import ParticleViewerShell from '../../components/ParticleViewerShell';
import { Select } from '../../components/ControlPanel';
import readmeText from './README.md?raw';
import explainerText from './EXPLAINER.md?raw';
import { COMPLEX_PARTICLES_DEFAULTS } from '../../config/defaults';
import { vertexShader, fragmentShader } from './shaders';
import { loadParticleTextures } from '../../lib/textures';
import {
  useParticleState, useUniformSync, useViewControls,
  createParticleGeometry, rebuildGeometryBuffers, redistributeAdaptive,
  createAxes, startAnimationLoop, shapeNames,
} from '../../lib/particles';
import type { ViewPoint } from '../../lib/particles';
import {
  applyComplex, complexPowRational,
  functionNames, functionFormulas, POW_PQ_INDEX,
} from '../../lib/complexMath';

export type { ViewPoint };

export interface ComplexParticlesProps {
  count?: number;
  selectedFunction?: string;
  p?: number;
  q?: number;
  branches?: number;
  onViewPointChange?: (view: ViewPoint) => void;
  viewPoint?: ViewPoint;
}

type BranchStyle = 'color' | 'intensity' | 'shape';

export default function ComplexParticles({
  count = COMPLEX_PARTICLES_DEFAULTS.defaultParticleCount,
  selectedFunction = 'exp',
  p = 1,
  q = 2,
  branches = 1,
  onViewPointChange,
  viewPoint,
}: ComplexParticlesProps) {
  const state = useParticleState({ count, viewPoint, onViewPointChange });
  const controls = useViewControls(state);
  useUniformSync(state);

  const [functionIndex, setFunctionIndex] = useState(() => {
    const idx = functionNames.indexOf(selectedFunction);
    return idx >= 0 ? idx : 0;
  });
  const [expP, setExpP] = useState(p);
  const [expQ, setExpQ] = useState(q);
  const [branchCount, setBranchCount] = useState(branches);
  const [branchIndices, setBranchIndices] = useState<number[]>([0, 1, 2]);
  const [branchStyle, setBranchStyle] = useState<BranchStyle>('color');

  const sceneRef = useRef<THREE.Scene>();
  const pointsRef = useRef<THREE.Points[]>([]);
  const branchIndicesRef = useRef(branchIndices);

  useEffect(() => {
    state.materialsRef.current.forEach(m => { m.uniforms.functionType.value = functionIndex; });
  }, [functionIndex]);

  /** Rebuild the particle grid when sampling-related state changes. In
   *  adaptive mode the rebuild depends on the function (we need |f'(z)| at
   *  each candidate); otherwise we re-stamp the uniform grid. */
  useEffect(() => {
    const geom = state.geometryRef.current;
    if (!geom) return;
    if (state.adaptive) {
      const evalFn = (x: number, z: number) => {
        const pt = new THREE.Vector2(x, z);
        const out = functionIndex === POW_PQ_INDEX
          ? complexPowRational(pt, expP, expQ === 0 ? 1 : expQ)
          : applyComplex(pt, functionIndex);
        return { x: out.x, y: out.y };
      };
      redistributeAdaptive(geom, state.particleCount, state.gridExtent, {
        evalFn,
        alpha: state.adaptiveAlpha,
      });
    } else {
      rebuildGeometryBuffers(geom, state.particleCount, state.gridExtent);
    }
  }, [
    state.adaptive, state.adaptiveAlpha, state.particleCount, state.gridExtent,
    functionIndex, expP, expQ,
  ]);

  useEffect(() => {
    state.materialsRef.current.forEach(m => {
      m.uniforms.exponentP.value = expP;
      m.uniforms.exponentQ.value = expQ === 0 ? 1 : expQ;
    });
  }, [expP, expQ]);

  useEffect(() => {
    branchIndicesRef.current = branchIndices;
    state.materialsRef.current.forEach((m, i) => {
      m.uniforms.branchIndex.value = branchIndices[i] ?? 0;
    });
  }, [branchIndices]);

  useEffect(() => {
    state.materialsRef.current.forEach((m, i) => {
      m.uniforms.intensity.value = (branchCount > 1 && branchStyle === 'intensity')
        ? state.intensity * (1 - i * 0.3)
        : state.intensity;
    });
  }, [state.intensity, branchStyle, branchCount]);

  useEffect(() => {
    state.materialsRef.current.forEach((m, i) => {
      m.uniforms.hueShift.value = (branchCount > 1 && branchStyle === 'color')
        ? (state.hueShift + i / 3) % 1
        : state.hueShift;
    });
  }, [state.hueShift, branchStyle, branchCount]);

  useEffect(() => {
    state.materialsRef.current.forEach((m, i) => {
      m.uniforms.shapeType.value = (branchCount > 1 && branchStyle === 'shape')
        ? (state.shapeIndex + i) % shapeNames.length
        : state.shapeIndex;
    });
  }, [state.shapeIndex, branchStyle, branchCount]);

  function createBranchMaterial(b: number) {
    const styled = branchCount > 1;
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        opacity: { value: state.opacity },
        functionType: { value: functionIndex },
        exponentP: { value: expP },
        exponentQ: { value: expQ === 0 ? 1 : expQ },
        globalSize: { value: state.size },
        intensity: { value: styled && branchStyle === 'intensity' ? state.intensity * (1 - b * 0.3) : state.intensity },
        shimmerAmp: { value: state.shimmer },
        jitterAmp: { value: state.jitter },
        hueShift: { value: styled && branchStyle === 'color' ? (state.hueShift + b / 3) % 1 : state.hueShift },
        saturation: { value: state.saturation },
        realView: { value: state.realViewRef.current ? 1 : 0 },
        shapeType: { value: styled && branchStyle === 'shape' ? (state.shapeIndex + b) % shapeNames.length : state.shapeIndex },
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

  useEffect(() => {
    if (!sceneRef.current || !state.geometryRef.current) return;
    pointsRef.current.forEach(pts => sceneRef.current!.remove(pts));
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

      const geometry = createParticleGeometry(state.particleCount, state.gridExtent);
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
  const isPowPQ = functionIndex === POW_PQ_INDEX;
  const displayName = isPowPQ ? `z^(${expP}/${expQ})` : currentName;
  const displayFormula = isPowPQ ? `p = ${expP}, q = ${expQ}` : functionFormulas[currentName];

  const functionPicker = (
    <>
      <Select
        label="Function"
        options={functionNames.map((name, idx) => ({ value: idx, label: name }))}
        value={functionIndex}
        onChange={setFunctionIndex}
      />
      {isPowPQ && (
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
    </>
  );

  const variantExtras = (
    <>
      <Select
        label="Branches"
        options={[1, 2, 3].map(n => ({ value: n, label: String(n) }))}
        value={branchCount}
        onChange={setBranchCount}
      />
      {branchCount > 1 && (
        <>
          <div className="cp-row">
            <div className="cp-row-label"><span>Branch indices</span></div>
            <div style={{ display: 'flex', gap: 6 }}>
              {Array.from({ length: branchCount }).map((_, i) => (
                <input
                  key={i}
                  type="number"
                  value={branchIndices[i] ?? 0}
                  onChange={e => {
                    const arr = [...branchIndices];
                    arr[i] = parseInt(e.target.value, 10);
                    setBranchIndices(arr);
                  }}
                />
              ))}
            </div>
          </div>
          <Select
            label="Differentiate by"
            options={(['color', 'intensity', 'shape'] as const).map(s => ({ value: s, label: s }))}
            value={branchStyle}
            onChange={setBranchStyle}
          />
        </>
      )}
    </>
  );

  return (
    <ParticleViewerShell
      state={state}
      controls={controls}
      onMount={onMount}
      functionName={displayName}
      functionFormula={displayFormula}
      functionPicker={functionPicker}
      variantExtras={variantExtras}
      functionList={{
        names: functionNames,
        currentIndex: functionIndex,
        onChangeIndex: setFunctionIndex,
      }}
      readme={readmeText}
      explainer={explainerText}
    />
  );
}
