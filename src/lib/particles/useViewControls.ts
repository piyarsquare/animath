import * as THREE from 'three';
import { ProjectionMode } from '../viewpoint';
import { QUARTER, Plane } from '../../math/constants';
import { quarterQuat } from '../../math/quat4';
import { dropModes, motionModes } from './types';
import type { ParticleState } from './useParticleState';

/** Ambient 3D view-rotation axes, used by the Hopf/Torus orbit controls. */
export type ViewAxis = 'Yaw' | 'Pitch' | 'Roll';

const ELEV_LIMIT = Math.PI / 2 - 0.01; // matches the gesture-orbit pitch clamp

export function useViewControls(state: ParticleState) {
  const {
    materialsRef, rotLRef, rotRRef, viewPointRef, onViewPointChangeRef,
    projRef, setViewType, setViewMotion, setDropAxis, setProj, setFiberCollapse,
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
    // Camera also returns to its default vantage point.
    state.setAzimuth(0);
    state.setElevation(0);
    state.setRoll(0);
    state.setPanX(0);
    state.setPanY(0);
    state.setPanZ(0);
  }

  function handleViewType(t: ProjectionMode) {
    setFiberCollapse(0);
    setViewType(t);
    applyView(t, dropAxis);
  }

  /**
   * Scrub the Torus → Hopf "fiber collapse" (0 = full Torus, 1 = full Hopf) by
   * manually driving the projection cross-fade uniforms. At intermediate values
   * the (1,1) fiber circles of the nested donuts shrink toward the single points
   * the Hopf map identifies them with. Only meaningful while the Torus view is
   * active (the projection Pills reset it via {@link handleViewType}).
   */
  function handleFiberCollapse(value: number) {
    setFiberCollapse(value);
    materialsRef.current.forEach(m => {
      m.uniforms.uProjMode.value = ProjectionMode.Torus;
      m.uniforms.uProjTarget.value = ProjectionMode.Hopf;
      m.uniforms.uProjAlpha.value = value;
    });
  }

  function handleMotion(m: (typeof motionModes)[number]) {
    setViewMotion(m);
  }

  /**
   * One-tap "Hopf study" preset: force the Hopf projection, freeze motion, and
   * reset the 4D orientation so latitude = |z|/|f| and longitude = arg z − arg f
   * read cleanly. A drop axis would override the projection (applyView routes
   * through it), so clear it here and animate straight to Hopf — done in the
   * controls layer to avoid the stale-`dropAxis`-closure problem of sequencing
   * setDropAxis + handleViewType in a single event handler.
   */
  function enterHopfStudy() {
    setDropAxis('None');
    setFiberCollapse(0);
    setViewType(ProjectionMode.Hopf);
    setViewMotion('Fixed');
    snapToStandardView();
    animateTo(ProjectionMode.Hopf);
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
    // Compose in the world frame: the shader applies p ↦ uRotL · p · conj(uRotR),
    // so accumulating the turn means premultiplying both L and R (uRotL = L·startL,
    // uRotR = R·startR). This matches the convention the animation loop uses.
    const endL = L.clone().multiply(startL).normalize();
    const endR = R.clone().multiply(startR).normalize();
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

  /**
   * Apply an incremental rotation in {plane} by {theta} radians, with no
   * slerp animation. Used by hold-to-rotate buttons that drive their own
   * requestAnimationFrame loop.
   */
  function rotateBy(plane: Plane, theta: number) {
    if (materialsRef.current.length === 0) return;
    const { L, R } = quarterQuat(plane, theta);
    rotLRef.current.copy(L.clone().multiply(rotLRef.current).normalize());
    rotRRef.current.copy(R.clone().multiply(rotRRef.current).normalize());
    materialsRef.current.forEach(m => {
      m.uniforms.uRotL.value.w = rotLRef.current.w;
      m.uniforms.uRotL.value.v.set(rotLRef.current.x, rotLRef.current.y, rotLRef.current.z);
      m.uniforms.uRotR.value.w = rotRRef.current.w;
      m.uniforms.uRotR.value.v.set(rotRRef.current.x, rotRRef.current.y, rotRRef.current.z);
    });
    viewPointRef.current = { L: rotLRef.current.clone(), R: rotRRef.current.clone() };
    onViewPointChangeRef.current?.(viewPointRef.current);
  }

  /**
   * Rotate the *ambient 3D view* (the camera), not the 4D pre-image. Used in
   * Hopf/Torus, where a 4D rotation before the nonlinear map deforms the image:
   * orbiting the camera keeps the picture rigid. Yaw spins around the vertical,
   * Pitch tilts up/down (clamped like the gesture orbit), Roll spins about the
   * view axis.
   */
  function orbitBy(axis: ViewAxis, theta: number) {
    if (axis === 'Yaw') state.setAzimuth(a => a + theta);
    else if (axis === 'Pitch') state.setElevation(e => Math.max(-ELEV_LIMIT, Math.min(ELEV_LIMIT, e + theta)));
    else state.setRoll(r => r + theta);
  }

  /** Animated eighth turn (45°) of the ambient view, mirroring {@link turn}. */
  function orbitTurn(axis: ViewAxis, dir: 1 | -1) {
    const total = (QUARTER / 2) * dir;
    const duration = 400;
    const start = performance.now();
    let last = 0;
    const step = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      orbitBy(axis, (p - last) * total);
      last = p;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  return {
    handleViewType, handleMotion, handleDropAxis, handleFiberCollapse,
    enterHopfStudy,
    turn, snapToStandardView, rotateBy, orbitBy, orbitTurn,
  };
}
