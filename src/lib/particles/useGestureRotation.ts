import { useRef } from 'react';
import { COMPLEX_PARTICLES_DEFAULTS } from '../../config/defaults';
import type { ParticleState } from './useParticleState';

const ORBIT_SENSITIVITY = 0.006;     // radians of camera orbit per pixel
const WHEEL_ZOOM_SENSITIVITY = 0.01; // cameraZ delta per wheel deltaY
const ELEV_LIMIT = Math.PI / 2 - 0.01;

interface Pt { x: number; y: number; }

/**
 * Pointer-driven CAMERA controls for a particle viewer.
 *
 *   1 pointer drag    → orbit the camera around the origin (azimuth/elevation).
 *                       The 4D quaternion rotation is untouched: gestures only
 *                       change where you look from, not how the 4D object is
 *                       oriented. Any plane rotation that "swaps axes" lives
 *                       on the on-screen quarter-turn buttons.
 *   2 pointer pinch   → cameraZ (zoom around origin).
 *   wheel             → cameraZ.
 */
export function useGestureRotation(state: ParticleState) {
  const pointers = useRef(new Map<number, Pt>());
  const lastPinchDist = useRef<number | null>(null);

  function clampedZoomScale(scale: number) {
    const { min, max } = COMPLEX_PARTICLES_DEFAULTS.ranges.cameraZ;
    state.setCameraZ(cz => Math.max(min, Math.min(max, cz * scale)));
  }

  function clampedZoomDelta(delta: number) {
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
      // Drag-right turns the camera to the right (azimuth grows).
      // Drag-up pitches the view down (elevation grows).
      state.setAzimuth(a => a + dx * ORBIT_SENSITIVITY);
      state.setElevation(e =>
        Math.max(-ELEV_LIMIT, Math.min(ELEV_LIMIT, e - dy * ORBIT_SENSITIVITY)),
      );
    } else if (count >= 2) {
      const others = [...pointers.current.entries()].filter(([id]) => id !== e.pointerId);
      const other = others[0]?.[1];
      if (other) {
        const newDist = Math.hypot(next.x - other.x, next.y - other.y);
        if (lastPinchDist.current != null && newDist > 1e-3) {
          clampedZoomScale(lastPinchDist.current / newDist);
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
