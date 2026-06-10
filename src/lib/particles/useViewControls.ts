import * as THREE from 'three';
import { ProjectionMode } from '../viewpoint';
import { QUARTER, Plane } from '../../math/constants';
import { quarterQuat } from '../../math/quat4';
import { dropModes, motionModes } from './types';
import type { ParticleState } from './useParticleState';

/** Ambient 3D view-rotation axes, used by the Hopf/Torus orbit controls. */
export type ViewAxis = 'Yaw' | 'Pitch' | 'Roll';

/** Camera-local rotation axis for each ambient control. */
const VIEW_AXES: Record<ViewAxis, THREE.Vector3> = {
  Yaw: new THREE.Vector3(0, 1, 0),
  Pitch: new THREE.Vector3(1, 0, 0),
  Roll: new THREE.Vector3(0, 0, 1),
};

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
    state.setCamQuat(new THREE.Quaternion());
    state.setPanX(0);
    state.setPanY(0);
    state.setPanZ(0);
  }

  /** The 4D axis cross belongs to the linear views — fade it out on the way
   *  to the torus, where the scaffold takes over as the reference frame. */
  function applyAxisFade(mix: number) {
    const opacity = Math.max(0, 1 - mix);
    for (const ref of [state.xAxisRef, state.yAxisRef, state.uAxisRef, state.vAxisRef]) {
      const ax = ref.current;
      if (!ax) continue;
      const mat = ax.line.material as THREE.LineBasicMaterial;
      mat.transparent = true;
      mat.opacity = opacity;
      ax.line.visible = opacity > 0.02;
    }
  }

  function handleViewType(t: ProjectionMode) {
    setFiberCollapse(0);
    setViewType(t);
    const mix = t === ProjectionMode.Hopf ? 2
      : t === ProjectionMode.Torus || t === ProjectionMode.Stereo ? 1 : 0;
    state.setProjMix(mix);
    applyAxisFade(mix);
    applyView(t, dropAxis);
  }

  /**
   * The Perspective ⇠ Torus ⇢ Hopf projection slider (0 ≤ v ≤ 2): integer
   * positions are the three modes, fractional positions drive the GPU
   * cross-fade live (segment A blends Perspective→Torus, segment B reuses the
   * Torus→Hopf fiber collapse). Also fades the 4D axis cross out toward the
   * torus and keeps viewType/fiberCollapse consistent so dependent UI (the
   * ambient rotation controls, the scaffold/fiber toggles) follows along.
   */
  function handleProjMix(v: number) {
    const mix = Math.max(0, Math.min(2, v));
    state.setProjMix(mix);
    setViewType(mix < 0.5 ? ProjectionMode.Perspective : mix < 1.5 ? ProjectionMode.Torus : ProjectionMode.Hopf);
    setFiberCollapse(Math.max(0, mix - 1));
    // Touching the slider releases an active drop axis — most recent intent
    // wins (the symmetric rule lives in handleDropAxis).
    if (dropAxis !== 'None') setDropAxis('None');
    const from = mix <= 1 ? ProjectionMode.Perspective : ProjectionMode.Torus;
    const to = mix <= 1 ? ProjectionMode.Torus : ProjectionMode.Hopf;
    const alpha = mix <= 1 ? mix : mix - 1;
    setProj(from);
    projRef.current = from;
    materialsRef.current.forEach(m => {
      m.uniforms.uProjMode.value = from;
      m.uniforms.uProjTarget.value = to;
      m.uniforms.uProjAlpha.value = alpha;
    });
    applyAxisFade(mix);
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

  function handleDropAxis(d: (typeof dropModes)[number]) {
    if (d !== 'None') {
      snapToStandardView();
      // A drop axis is a linear view: the projection slider returns to
      // Perspective (and the 4D axis cross comes back) so the two controls
      // never fight over the projection.
      state.setProjMix(0);
      setViewType(ProjectionMode.Perspective);
      setFiberCollapse(0);
      applyAxisFade(0);
      setDropAxis(d);
      applyView(ProjectionMode.Perspective, d);
    } else {
      setDropAxis(d);
      applyView(viewType, d);
    }
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
   * orbiting the camera keeps the picture rigid. Yaw spins around the camera's
   * up, Pitch tilts over the top, Roll spins about the view axis — all free
   * (no pole stops), composing on the orientation quaternion.
   */
  function orbitBy(axis: ViewAxis, theta: number) {
    const sign = axis === 'Pitch' ? -1 : 1; // Pitch+ tilts up, matching the old control
    state.setCamQuat(q => q.clone()
      .multiply(new THREE.Quaternion().setFromAxisAngle(VIEW_AXES[axis], sign * theta))
      .normalize());
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
    handleViewType, handleProjMix, handleMotion, handleDropAxis, handleFiberCollapse,
    turn, snapToStandardView, rotateBy, orbitBy, orbitTurn,
  };
}
