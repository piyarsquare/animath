import { useRef } from 'react';
import { quarterQuat } from '../../math/quat4';
import { Plane } from '../../math/constants';
import { COMPLEX_PARTICLES_DEFAULTS } from '../../config/defaults';
import type { ParticleState } from './useParticleState';

// Lower than the original 0.005 — testers found 4D rotation too "twitchy",
// since a small finger drag composes two plane rotations at once.
const ROT_SENSITIVITY = 0.0025;      // radians per pixel of drag
const WHEEL_ZOOM_SENSITIVITY = 0.01; // cameraZ delta per wheel deltaY

interface Pt { x: number; y: number; }

/**
 * Pointer-driven 4D rotation, zoom, and twist for a particle viewer.
 *
 *   1 pointer drag         → xu (horizontal), yu (vertical)
 *   2 pointers, centroid   → xv (horizontal), yv (vertical)
 *   2 pointers, pinch      → cameraZ
 *   2 pointers, twist      → uv
 *   wheel                  → cameraZ
 *
 * Unifies mouse, pen, and touch via Pointer Events.
 */
export function useGestureRotation(state: ParticleState) {
  const pointers = useRef(new Map<number, Pt>());
  const lastPinchDist = useRef<number | null>(null);
  const lastTwistAngle = useRef<number | null>(null);

  function pushUniforms() {
    const L = state.rotLRef.current;
    const R = state.rotRRef.current;
    state.materialsRef.current.forEach(m => {
      m.uniforms.uRotL.value.w = L.w;
      m.uniforms.uRotL.value.v.set(L.x, L.y, L.z);
      m.uniforms.uRotR.value.w = R.w;
      m.uniforms.uRotR.value.v.set(R.x, R.y, R.z);
    });
    state.viewPointRef.current = { L: L.clone(), R: R.clone() };
    state.onViewPointChangeRef.current?.(state.viewPointRef.current);
  }

  function applyRotation(plane: Plane, theta: number) {
    if (Math.abs(theta) < 1e-7) return;
    const { L, R } = quarterQuat(plane, theta);
    state.rotLRef.current.copy(L.clone().multiply(state.rotLRef.current).normalize());
    state.rotRRef.current.copy(state.rotRRef.current.clone().multiply(R.conjugate()).normalize());
  }

  function clampedZoom(scale: number) {
    const { min, max } = COMPLEX_PARTICLES_DEFAULTS.ranges.cameraZ;
    state.setCameraZ(cz => Math.max(min, Math.min(max, cz * scale)));
  }

  function deltaZoom(delta: number) {
    const { min, max } = COMPLEX_PARTICLES_DEFAULTS.ranges.cameraZ;
    state.setCameraZ(cz => Math.max(min, Math.min(max, cz + delta)));
  }

  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      lastPinchDist.current = Math.hypot(a.x - b.x, a.y - b.y);
      lastTwistAngle.current = Math.atan2(b.y - a.y, b.x - a.x);
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const next: Pt = { x: e.clientX, y: e.clientY };
    const count = pointers.current.size;

    if (count === 1) {
      const dx = next.x - prev.x;
      const dy = next.y - prev.y;
      applyRotation('XU', dx * ROT_SENSITIVITY);
      applyRotation('YU', dy * ROT_SENSITIVITY);
      pushUniforms();
    } else if (count >= 2) {
      const others = [...pointers.current.entries()].filter(([id]) => id !== e.pointerId);
      const other = others[0]?.[1];
      if (other) {
        const prevCx = (prev.x + other.x) / 2;
        const prevCy = (prev.y + other.y) / 2;
        const newCx = (next.x + other.x) / 2;
        const newCy = (next.y + other.y) / 2;
        applyRotation('XV', (newCx - prevCx) * ROT_SENSITIVITY);
        applyRotation('YV', (newCy - prevCy) * ROT_SENSITIVITY);

        const newDist = Math.hypot(next.x - other.x, next.y - other.y);
        if (lastPinchDist.current != null && newDist > 1e-3) {
          clampedZoom(lastPinchDist.current / newDist);
        }
        lastPinchDist.current = newDist;

        const newAngle = Math.atan2(next.y - other.y, next.x - other.x);
        if (lastTwistAngle.current != null) {
          let dAngle = newAngle - lastTwistAngle.current;
          while (dAngle > Math.PI) dAngle -= 2 * Math.PI;
          while (dAngle < -Math.PI) dAngle += 2 * Math.PI;
          applyRotation('UV', dAngle);
        }
        lastTwistAngle.current = newAngle;

        pushUniforms();
      }
    }

    pointers.current.set(e.pointerId, next);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) {
      lastPinchDist.current = null;
      lastTwistAngle.current = null;
    }
  };

  const onWheel = (e: React.WheelEvent) => {
    deltaZoom(e.deltaY * WHEEL_ZOOM_SENSITIVITY);
  };

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: onPointerUp,
    onWheel,
  };
}
