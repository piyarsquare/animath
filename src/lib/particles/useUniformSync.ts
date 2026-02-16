import { useEffect } from 'react';
import * as THREE from 'three';
import { AXIS_COLORS } from './types';
import { rebuildGeometryBuffers } from './createParticleGeometry';
import type { ParticleState } from './useParticleState';

export function useUniformSync(state: ParticleState): void {
  const {
    materialsRef, geometryRef, cameraRef, rendererRef, texturesRef,
    xAxisRef, yAxisRef, uAxisRef, vAxisRef,
  } = state;

  useEffect(() => {
    materialsRef.current.forEach(m => { m.uniforms.saturation.value = state.saturation; });
  }, [state.saturation]);

  useEffect(() => {
    materialsRef.current.forEach(m => { m.uniforms.opacity.value = state.opacity; });
  }, [state.opacity]);

  useEffect(() => {
    materialsRef.current.forEach(m => { m.uniforms.globalSize.value = state.size; });
  }, [state.size]);

  useEffect(() => {
    materialsRef.current.forEach(m => { m.uniforms.intensity.value = state.intensity; });
  }, [state.intensity]);

  useEffect(() => {
    materialsRef.current.forEach(m => { m.uniforms.shimmerAmp.value = state.shimmer; });
  }, [state.shimmer]);

  useEffect(() => {
    materialsRef.current.forEach(m => { m.uniforms.jitterAmp.value = state.jitter; });
  }, [state.jitter]);

  useEffect(() => {
    materialsRef.current.forEach(m => { m.uniforms.hueShift.value = state.hueShift; });
    const setAxisHue = (ref: typeof xAxisRef, hue: number) => {
      if (ref.current) {
        (ref.current.line.material as THREE.LineBasicMaterial).color.setHSL(
          (hue + state.hueShift) % 1, 1, 0.5
        );
      }
    };
    setAxisHue(xAxisRef, AXIS_COLORS.x);
    setAxisHue(yAxisRef, AXIS_COLORS.y);
    setAxisHue(uAxisRef, AXIS_COLORS.u);
    setAxisHue(vAxisRef, AXIS_COLORS.v);
  }, [state.hueShift]);

  useEffect(() => {
    const setWidth = (ref: typeof xAxisRef) => {
      if (ref.current) {
        (ref.current.line.material as THREE.LineBasicMaterial).linewidth = state.axisWidth;
      }
    };
    setWidth(xAxisRef);
    setWidth(yAxisRef);
    setWidth(uAxisRef);
    setWidth(vAxisRef);
  }, [state.axisWidth]);

  useEffect(() => {
    materialsRef.current.forEach(m => { m.uniforms.realView.value = state.realView ? 1 : 0; });
  }, [state.realView]);

  useEffect(() => {
    if (cameraRef.current) cameraRef.current.position.z = state.cameraZ;
  }, [state.cameraZ]);

  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setClearColor(state.objectMode ? 0xffffff : 0x000000);
    }
    materialsRef.current.forEach(m => {
      m.blending = state.objectMode ? THREE.NormalBlending : THREE.AdditiveBlending;
      m.depthWrite = state.objectMode;
    });
  }, [state.objectMode]);

  useEffect(() => {
    materialsRef.current.forEach(m => { m.uniforms.shapeType.value = state.shapeIndex; });
  }, [state.shapeIndex]);

  useEffect(() => {
    if (texturesRef.current[state.textureIndex]) {
      materialsRef.current.forEach(m => {
        m.uniforms.tex.value = texturesRef.current[state.textureIndex];
        m.uniforms.textureIndex.value = state.textureIndex;
      });
    }
  }, [state.textureIndex]);

  useEffect(() => {
    materialsRef.current.forEach(m => { m.uniforms.uColourStyle.value = state.colourStyle; });
  }, [state.colourStyle]);

  useEffect(() => {
    materialsRef.current.forEach(m => { m.uniforms.uColourBy.value = state.colourBy; });
  }, [state.colourBy]);

  useEffect(() => {
    if (geometryRef.current) {
      rebuildGeometryBuffers(geometryRef.current, state.particleCount);
    }
  }, [state.particleCount]);
}
