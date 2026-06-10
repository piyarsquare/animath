import { useRef } from 'react';
import * as THREE from 'three';
import { COMPLEX_PARTICLES_DEFAULTS } from '../../config/defaults';
import type { ParticleState } from './useParticleState';

const ORBIT_SENSITIVITY = 0.006;     // radians of camera orbit per pixel
const WHEEL_ZOOM_SENSITIVITY = 0.01; // cameraZ delta per wheel deltaY

interface Pt { x: number; y: number; }

const X_AXIS = new THREE.Vector3(1, 0, 0);
const Y_AXIS = new THREE.Vector3(0, 1, 0);

/**
 * Pointer-driven CAMERA controls for a particle viewer. Gestures never touch
 * the 4D quaternion rotation — plane rotations live on the on-screen
 * quarter-turn buttons.
 *
 *   1-pointer drag             → free orbit (trackball tumble around the
 *                                look-at target, no pole limits) — or pan,
 *                                when the Camera panel's Drag mode is Pan.
 *   1-pointer drag + Shift     → pan (translates the look-at target in the
 *                                screen plane, scene follows the finger).
 *   2-pointer pinch            → cameraZ (zoom).
 *   2-pointer centroid drag    → pan, in addition to any pinch.
 *   wheel                      → cameraZ.
 */
export function useGestureRotation(state: ParticleState) {
  const pointers = useRef(new Map<number, Pt>());
  const lastPinchDist = useRef<number | null>(null);
  const lastCentroid = useRef<Pt | null>(null);

  function clampedZoomScale(scale: number) {
    const { min, max } = COMPLEX_PARTICLES_DEFAULTS.ranges.cameraZ;
    state.setCameraZ(cz => Math.max(min, Math.min(max, cz * scale)));
  }

  function clampedZoomDelta(delta: number) {
    const { min, max } = COMPLEX_PARTICLES_DEFAULTS.ranges.cameraZ;
    state.setCameraZ(cz => Math.max(min, Math.min(max, cz + delta)));
  }

  /** Translate the look-at target by a screen-space drag. Drag right shifts
   *  the target left so the visible scene follows the finger (Maps convention). */
  function applyPan(dxPx: number, dyPx: number, el: HTMLElement) {
    const cam = state.cameraRef.current;
    if (!cam || el.clientHeight === 0) return;
    const fovRad = (cam.fov * Math.PI) / 180;
    // By construction the camera-to-target distance equals state.cameraZ.
    const worldPerPixel = (2 * state.cameraZ * Math.tan(fovRad / 2)) / el.clientHeight;
    const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
    const up    = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 1);
    const sx = -dxPx * worldPerPixel;
    const sy =  dyPx * worldPerPixel; // browser y grows downward
    state.setPanX(p => p + right.x * sx + up.x * sy);
    state.setPanY(p => p + right.y * sx + up.y * sy);
    state.setPanZ(p => p + right.z * sx + up.z * sy);
  }

  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      lastPinchDist.current = Math.hypot(a.x - b.x, a.y - b.y);
      lastCentroid.current  = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const next: Pt = { x: e.clientX, y: e.clientY };
    const count = pointers.current.size;
    const el = e.currentTarget as HTMLElement;

    if (count === 1) {
      const dx = next.x - prev.x;
      const dy = next.y - prev.y;
      if (e.shiftKey || state.dragMode === 'pan') {
        applyPan(dx, dy, el);
      } else {
        // Free trackball orbit: incremental rotations about the camera's own
        // right/up axes, so the tumble never hits a pole stop. Drag-right
        // turns the camera right; drag-up pitches over the top and keeps going.
        state.setCamQuat(q => q.clone()
          .multiply(new THREE.Quaternion().setFromAxisAngle(Y_AXIS, dx * ORBIT_SENSITIVITY))
          .multiply(new THREE.Quaternion().setFromAxisAngle(X_AXIS, dy * ORBIT_SENSITIVITY))
          .normalize());
      }
    } else if (count >= 2) {
      const others = [...pointers.current.entries()].filter(([id]) => id !== e.pointerId);
      const other = others[0]?.[1];
      if (other) {
        const newDist = Math.hypot(next.x - other.x, next.y - other.y);
        const newCentroid = { x: (next.x + other.x) / 2, y: (next.y + other.y) / 2 };

        if (lastPinchDist.current != null && newDist > 1e-3) {
          clampedZoomScale(lastPinchDist.current / newDist);
        }
        if (lastCentroid.current != null) {
          applyPan(
            newCentroid.x - lastCentroid.current.x,
            newCentroid.y - lastCentroid.current.y,
            el,
          );
        }
        lastPinchDist.current = newDist;
        lastCentroid.current  = newCentroid;
      }
    }

    pointers.current.set(e.pointerId, next);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) {
      lastPinchDist.current = null;
      lastCentroid.current  = null;
    }
  };

  const onWheel = (e: React.WheelEvent) => {
    clampedZoomDelta(e.deltaY * WHEEL_ZOOM_SENSITIVITY);
  };

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: onPointerUp,
    onWheel,
  };
}
