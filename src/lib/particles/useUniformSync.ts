import { useEffect } from 'react';
import * as THREE from 'three';
import { AXIS_COLORS } from './types';
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
    materialsRef.current.forEach(m => { m.uniforms.uJitterMode.value = state.jitterMode; });
  }, [state.jitterMode]);

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
    const cam = cameraRef.current;
    if (!cam) return;
    // Place the camera on a sphere of radius cameraZ around the pan target,
    // then look at the pan target. azimuth = 0, elevation = 0, pan = (0,0,0)
    // reproduces the original straight-back position (0, 0, cameraZ).
    const r = state.cameraZ;
    const az = state.azimuth;
    const el = state.elevation;
    const tx = state.panX, ty = state.panY, tz = state.panZ;
    cam.position.set(
      tx + r * Math.cos(el) * Math.sin(az),
      ty + r * Math.sin(el),
      tz + r * Math.cos(el) * Math.cos(az),
    );
    cam.up.set(0, 1, 0);
    cam.lookAt(tx, ty, tz);
    // Roll spins the camera about its own view axis (ambient "Roll" orbit in
    // Hopf/Torus). lookAt resets orientation, so apply roll after it.
    if (state.roll) cam.rotateZ(state.roll);
    // Keep the world matrix fresh so basis-vector reads from elsewhere
    // (e.g. the gesture hook computing pan) reflect the new orientation.
    cam.updateMatrixWorld(true);
  }, [state.cameraZ, state.azimuth, state.elevation, state.roll, state.panX, state.panY, state.panZ]);

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
    materialsRef.current.forEach(m => { m.uniforms.uColourQty.value = state.colourQuantity; });
  }, [state.colourQuantity]);

  useEffect(() => {
    materialsRef.current.forEach(m => { m.uniforms.uBrightnessQty.value = state.brightnessQuantity; });
  }, [state.brightnessQuantity]);

  useEffect(() => {
    materialsRef.current.forEach(m => { m.uniforms.uLogRadius.value = state.logRadius ? 1 : 0; });
  }, [state.logRadius]);

  // The geometry rebuild (uniform or adaptive) now lives in each viewer, so
  // it can depend on the selected function when adaptive sampling is on.
  // (Previously: rebuildGeometryBuffers on count/extent change.)
}
