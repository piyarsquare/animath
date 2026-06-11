import { useEffect } from 'react';
import * as THREE from 'three';
import { AXIS_COLORS } from './types';
import type { ParticleState } from './useParticleState';

export function useUniformSync(state: ParticleState): void {
  const {
    materialsRef, cameraRef, rendererRef, texturesRef,
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
    // Free orbit: the orientation quaternion places the camera on a sphere of
    // radius cameraZ around the pan target, facing it. Identity + pan (0,0,0)
    // reproduces the original straight-back position (0, 0, cameraZ). No
    // turntable poles — drags tumble without limits.
    const q = state.camQuat;
    cam.position
      .set(0, 0, state.cameraZ)
      .applyQuaternion(q)
      .add(new THREE.Vector3(state.panX, state.panY, state.panZ));
    cam.quaternion.copy(q);
    // Keep the world matrix fresh so basis-vector reads from elsewhere
    // (e.g. the gesture hook computing pan) reflect the new orientation.
    cam.updateMatrixWorld(true);
  }, [state.cameraZ, state.camQuat, state.panX, state.panY, state.panZ]);

  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setClearColor(state.objectMode ? 0xffffff : 0x000000);
    }
    materialsRef.current.forEach(m => {
      // Sheet materials keep their own NormalBlending + no depth-write (true
      // translucency); only the point cloud follows the object/light-bg toggle.
      if (m.userData.sheet) return;
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
    materialsRef.current.forEach(m => { m.uniforms.uColorStyle.value = state.colorStyle; });
  }, [state.colorStyle]);

  useEffect(() => {
    materialsRef.current.forEach(m => { m.uniforms.uColormap.value = state.colormap; });
  }, [state.colormap]);

  useEffect(() => {
    materialsRef.current.forEach(m => {
      if (m.uniforms.uColorRepeat) m.uniforms.uColorRepeat.value = state.colorRepeat;
    });
  }, [state.colorRepeat]);

  useEffect(() => {
    materialsRef.current.forEach(m => {
      if (m.uniforms.uReciprocal) m.uniforms.uReciprocal.value = state.reciprocal ? 1 : 0;
    });
  }, [state.reciprocal]);

  useEffect(() => {
    materialsRef.current.forEach(m => {
      if (m.uniforms.uLight) m.uniforms.uLight.value = state.lighting ? 1 : 0;
      if (m.uniforms.uLightStrength) m.uniforms.uLightStrength.value = state.lightStrength;
    });
  }, [state.lighting, state.lightStrength]);

  useEffect(() => {
    materialsRef.current.forEach(m => { m.uniforms.uColorBy.value = state.colorBy; });
  }, [state.colorBy]);

  useEffect(() => {
    materialsRef.current.forEach(m => { m.uniforms.uColorQty.value = state.colorQuantity; });
  }, [state.colorQuantity]);

  useEffect(() => {
    materialsRef.current.forEach(m => { m.uniforms.uBrightnessQty.value = state.brightnessQuantity; });
  }, [state.brightnessQuantity]);

  useEffect(() => {
    materialsRef.current.forEach(m => { m.uniforms.uInCoord.value = state.inputCoord; });
  }, [state.inputCoord]);

  useEffect(() => {
    materialsRef.current.forEach(m => { m.uniforms.uOutCoord.value = state.outputCoord; });
  }, [state.outputCoord]);

  // The geometry rebuild (uniform or adaptive) now lives in each viewer, so
  // it can depend on the selected function when adaptive sampling is on.
  // (Previously: rebuildGeometryBuffers on count/extent change.)
}
