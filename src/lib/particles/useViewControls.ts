import * as THREE from 'three';
import { ProjectionMode } from '../viewpoint';
import { QUARTER, Plane } from '../../math/constants';
import { quarterQuat } from '../../math/quat4';
import { dropModes, motionModes } from './types';
import type { ParticleState } from './useParticleState';

export function useViewControls(state: ParticleState) {
  const {
    materialsRef, rotLRef, rotRRef, viewPointRef, onViewPointChangeRef,
    projRef, setViewType, setViewMotion, setDropAxis, setProj,
    viewType, dropAxis,
  } = state;

  function animateTo(target: ProjectionMode) {
    if (materialsRef.current.length === 0) return;
    if (target === projRef.current) return;
    const start = performance.now();
    const duration = 1000;
    const step = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      materialsRef.current.forEach(m => { m.uniforms.uProjAlpha.value = p; });
      if (p < 1) {
        requestAnimationFrame(step);
      } else {
        materialsRef.current.forEach(m => {
          m.uniforms.uProjMode.value = target;
          m.uniforms.uProjAlpha.value = 0;
          m.uniforms.uProjTarget.value = target;
        });
        setProj(target);
      }
    };
    materialsRef.current.forEach(m => { m.uniforms.uProjTarget.value = target; });
    requestAnimationFrame(step);
  }

  function applyView(type: ProjectionMode, drop: (typeof dropModes)[number]) {
    const target = drop === 'DropX' ? ProjectionMode.DropX
      : drop === 'DropY' ? ProjectionMode.DropY
      : drop === 'DropU' ? ProjectionMode.DropU
      : drop === 'DropV' ? ProjectionMode.DropV
      : type;
    animateTo(target);
  }

  function snapToStandardView() {
    const qL = new THREE.Quaternion();
    const qR = new THREE.Quaternion();
    rotLRef.current.copy(qL);
    rotRRef.current.copy(qR);
    materialsRef.current.forEach(m => {
      m.uniforms.uRotL.value.w = qL.w;
      m.uniforms.uRotL.value.v.set(qL.x, qL.y, qL.z);
      m.uniforms.uRotR.value.w = qR.w;
      m.uniforms.uRotR.value.v.set(qR.x, qR.y, qR.z);
    });
    viewPointRef.current = { L: qL.clone(), R: qR.clone() };
    onViewPointChangeRef.current?.(viewPointRef.current);
  }

  function handleViewType(t: ProjectionMode) {
    setViewType(t);
    applyView(t, dropAxis);
  }

  function handleMotion(m: (typeof motionModes)[number]) {
    setViewMotion(m);
  }

  function handleDropAxis(d: (typeof dropModes)[number]) {
    if (d !== 'None') snapToStandardView();
    setDropAxis(d);
    applyView(viewType, d);
  }

  function applyQuarterTurn(plane: Plane, θ: number) {
    if (materialsRef.current.length === 0) return;
    const { L, R } = quarterQuat(plane, θ);
    const startL = rotLRef.current.clone();
    const startR = rotRRef.current.clone();
    const endL = L.clone().multiply(startL).normalize();
    const endR = startR.clone().multiply(R.conjugate()).normalize();
    const duration = 1000;
    const start = performance.now();
    const step = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const qL = startL.clone().slerp(endL, p);
      const qR = startR.clone().slerp(endR, p);
      materialsRef.current.forEach(m => {
        m.uniforms.uRotL.value.w = qL.w;
        m.uniforms.uRotL.value.v.set(qL.x, qL.y, qL.z);
        m.uniforms.uRotR.value.w = qR.w;
        m.uniforms.uRotR.value.v.set(qR.x, qR.y, qR.z);
      });
      viewPointRef.current = { L: qL.clone(), R: qR.clone() };
      onViewPointChangeRef.current?.(viewPointRef.current);
      rotLRef.current.copy(qL);
      rotRRef.current.copy(qR);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  const turn = (plane: Plane, dir: 1 | -1) => {
    applyQuarterTurn(plane, (QUARTER / 2) * dir);
  };

  return { handleViewType, handleMotion, handleDropAxis, turn };
}
