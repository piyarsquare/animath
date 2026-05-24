import React, { useEffect, useState } from 'react';
import * as THREE from 'three';
import ParticleViewerShell from '../../components/ParticleViewerShell';
import { Select } from '../../components/ControlPanel';
import readmeText from './README.md?raw';
import { COMPLEX_PARTICLES_DEFAULTS } from '../../config/defaults';
import { vertexShader, fragmentShader } from './shaders';
import { loadParticleTextures } from '../../lib/textures';
import {
  useParticleState, useUniformSync, useViewControls,
  createParticleGeometry, createAxes, startAnimationLoop,
} from '../../lib/particles';
import type { ViewPoint } from '../../lib/particles';
import { functionNames, functionFormulas } from '../../lib/complexMath';

export type { ViewPoint };

export interface ComplexParticlesProps {
  count?: number;
  selectedFunction?: string;
  onViewPointChange?: (view: ViewPoint) => void;
  viewPoint?: ViewPoint;
}

export default function ComplexParticles({
  count = COMPLEX_PARTICLES_DEFAULTS.defaultParticleCount,
  selectedFunction = 'exp',
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

  useEffect(() => {
    state.materialsRef.current.forEach(m => { m.uniforms.functionType.value = functionIndex; });
  }, [functionIndex]);

  const onMount = React.useCallback(
    (ctx: { scene: THREE.Scene; camera: THREE.PerspectiveCamera; renderer: THREE.WebGLRenderer }) => {
      const { scene, camera, renderer } = ctx;
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

      const white = textures[0];
      const material = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          opacity: { value: state.opacity },
          functionType: { value: functionIndex },
          globalSize: { value: state.size },
          intensity: { value: state.intensity },
          shimmerAmp: { value: state.shimmer },
          jitterAmp: { value: state.jitter },
          hueShift: { value: state.hueShift },
          saturation: { value: state.saturation },
          realView: { value: state.realViewRef.current ? 1 : 0 },
          shapeType: { value: state.shapeIndex },
          tex: { value: white },
          textureIndex: { value: state.textureIndex },
          uColourStyle: { value: state.colourStyle },
          uColourBy: { value: state.colourBy },
          uRotL: { value: { w: 1, v: new THREE.Vector3() } },
          uRotR: { value: { w: 1, v: new THREE.Vector3() } },
          uProjMode: { value: state.projRef.current },
          uProjTarget: { value: state.projRef.current },
          uProjAlpha: { value: 0 },
        },
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexColors: true,
      });
      state.materialsRef.current = [material];
      scene.add(new THREE.Points(geometry, material));

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

  const functionPicker = (
    <Select
      label="Function"
      options={functionNames.map((name, idx) => ({ value: idx, label: name }))}
      value={functionIndex}
      onChange={setFunctionIndex}
    />
  );

  return (
    <ParticleViewerShell
      state={state}
      controls={controls}
      onMount={onMount}
      functionName={currentName}
      functionFormula={currentFormula}
      functionPicker={functionPicker}
      readme={readmeText}
    />
  );
}
