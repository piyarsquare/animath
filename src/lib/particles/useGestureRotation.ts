import { useRef } from 'react';
import { quarterQuat } from '../../math/quat4';
import { Plane } from '../../math/constants';
import { COMPLEX_PARTICLES_DEFAULTS } from '../../config/defaults';
import type { ParticleState } from './useParticleState';

const ROT_SENSITIVITY = 0.005;       // radians per pixel of drag
const WHEEL_ZOOM_SENSITIVITY = 0.01; // cameraZ delta per wheel deltaY

interface Pt { x: number; y: number; }

/**
 * Pointer-driven view controls for a particle viewer.
 *
 *   1 pointer drag         → XU (horizontal) + YU (vertical) — feels like a
 *                            standard 3D orbit in perspective view.
 *   2 pointers, pinch      → cameraZ (zoom).
 *   wheel                  → cameraZ.
 *
 * Earlier revisions mapped 2-finger drag and 2-finger twist onto the XV, YV,
 * and UV planes, but composing four rotations through a single drag was
 * unnavigable in 4D. Those planes are now reached via the on-screen quarter-
 * turn buttons (tap for 90°, hold for continuous rotation).
 *
 * Unifies mouse, pen, and touch via Pointer Events.
 */
export function useGestureRotation(state: ParticleState) {
  const pointers = useRef(new Map<number, Pt>());
  const lastPinchDist = useRef<number | null>(null);

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
        const newDist = Math.hypot(next.x - other.x, next.y - other.y);
        if (lastPinchDist.current != null && newDist > 1e-3) {
          clampedZoom(lastPinchDist.current / newDist);
        }
        lastPinchDist.current = newDist;
      }
    }

    pointers.current.set(e.pointerId, next);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) lastPinchDist.current = null;
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
