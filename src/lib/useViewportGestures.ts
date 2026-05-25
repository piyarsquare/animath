import { useRef } from 'react';

export interface ViewBounds {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

export interface Point2 { x: number; y: number; }

interface UseViewportGesturesOptions {
  view: ViewBounds;
  onViewChange: (v: ViewBounds) => void;
  /**
   * 'pan' (default) — 1-finger drag pans the viewport, clean taps fire onTap.
   * 'draw' — 1-finger drag invokes onDrawStart/Move/End; tap is suppressed.
   * In both modes 2-finger pinches to zoom around the pinch midpoint, wheel zooms.
   */
  mode?: 'pan' | 'draw';
  /** Optional clamp applied to every emitted view (e.g. enforce aspect ratio). */
  clamp?: (v: ViewBounds, el: HTMLElement) => ViewBounds;
  /**
   * Element whose rect defines the math-coordinate space. Use when the canvas is
   * smaller than the event-target element (e.g. a centered square inside a wider
   * wrapper). Defaults to the pointer-event target.
   */
  coordRef?: React.RefObject<HTMLElement | null>;
  /** Clean tap callback — fires only if a single pointer went down and up without dragging. */
  onTap?: (mathPoint: Point2) => void;
  /** Called when the user begins drawing in draw mode. */
  onDrawStart?: (mathPoint: Point2) => void;
  /** Called on each pointer move while drawing. */
  onDrawMove?: (mathPoint: Point2) => void;
  /** Called when drawing ends (pointer up or canceled). */
  onDrawEnd?: () => void;
}

const TAP_MAX_MOVE_PX = 5;
const TAP_MAX_DURATION_MS = 350;
const WHEEL_ZOOM_FACTOR = 0.0015; // factor = exp(deltaY * WHEEL_ZOOM_FACTOR)

function screenToMath(view: ViewBounds, px: number, py: number, el: HTMLElement): Point2 {
  const w = el.clientWidth;
  const h = el.clientHeight;
  return {
    x: view.xMin + (view.xMax - view.xMin) * (px / w),
    y: view.yMin + (view.yMax - view.yMin) * (py / h),
  };
}

function panView(view: ViewBounds, dxPx: number, dyPx: number, el: HTMLElement): ViewBounds {
  const sx = (view.xMax - view.xMin) / el.clientWidth;
  const sy = (view.yMax - view.yMin) / el.clientHeight;
  return {
    xMin: view.xMin - dxPx * sx,
    xMax: view.xMax - dxPx * sx,
    yMin: view.yMin - dyPx * sy,
    yMax: view.yMax - dyPx * sy,
  };
}

/** Scale view about a pivot expressed in canvas-local pixels. factor < 1 zooms in. */
function zoomViewAtPixel(view: ViewBounds, factor: number, px: number, py: number, el: HTMLElement): ViewBounds {
  const w = el.clientWidth;
  const h = el.clientHeight;
  const tx = px / w;
  const ty = py / h;
  const fx = view.xMin + (view.xMax - view.xMin) * tx;
  const fy = view.yMin + (view.yMax - view.yMin) * ty;
  const newW = (view.xMax - view.xMin) * factor;
  const newH = (view.yMax - view.yMin) * factor;
  return {
    xMin: fx - newW * tx,
    xMax: fx + newW * (1 - tx),
    yMin: fy - newH * ty,
    yMax: fy + newH * (1 - ty),
  };
}

interface PointerRecord { x: number; y: number; downX: number; downY: number; downTime: number; }

/**
 * Pointer/wheel-driven pan, pinch-zoom, and wheel-zoom for a 2D viewport.
 * Unifies mouse, pen, and touch via Pointer Events. Spread the return value onto
 * the element that hosts the viewport (typically the canvas container).
 */
export function useViewportGestures(opts: UseViewportGesturesOptions) {
  const { view, onViewChange, mode = 'pan', clamp, coordRef, onTap, onDrawStart, onDrawMove, onDrawEnd } = opts;

  const pointers = useRef(new Map<number, PointerRecord>());
  const lastPinch = useRef<{ dist: number; midX: number; midY: number } | null>(null);
  const drawing = useRef(false);

  const coordEl = (e: React.PointerEvent | React.WheelEvent): HTMLElement =>
    coordRef?.current ?? (e.currentTarget as HTMLElement);

  const emit = (v: ViewBounds, el: HTMLElement) => {
    onViewChange(clamp ? clamp(v, el) : v);
  };

  const localCoords = (e: React.PointerEvent | React.WheelEvent) => {
    const rect = coordEl(e).getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const el = coordEl(e);
    const local = localCoords(e);
    pointers.current.set(e.pointerId, {
      x: local.x, y: local.y, downX: local.x, downY: local.y, downTime: performance.now(),
    });

    if (pointers.current.size === 1 && mode === 'draw') {
      drawing.current = true;
      onDrawStart?.(screenToMath(view, local.x, local.y, el));
    }

    if (pointers.current.size === 2) {
      // Starting a pinch — drop any in-progress draw.
      if (drawing.current) {
        drawing.current = false;
        onDrawEnd?.();
      }
      const pts = [...pointers.current.values()];
      const dx = pts[0].x - pts[1].x;
      const dy = pts[0].y - pts[1].y;
      lastPinch.current = {
        dist: Math.hypot(dx, dy),
        midX: (pts[0].x + pts[1].x) / 2,
        midY: (pts[0].y + pts[1].y) / 2,
      };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const rec = pointers.current.get(e.pointerId);
    if (!rec) return;
    const el = coordEl(e);
    const local = localCoords(e);
    const dxFromLast = local.x - rec.x;
    const dyFromLast = local.y - rec.y;
    rec.x = local.x;
    rec.y = local.y;

    if (pointers.current.size === 1) {
      if (mode === 'draw' && drawing.current) {
        onDrawMove?.(screenToMath(view, local.x, local.y, el));
      } else if (mode === 'pan') {
        if (dxFromLast || dyFromLast) emit(panView(view, dxFromLast, dyFromLast, el), el);
      }
    } else if (pointers.current.size >= 2) {
      const pts = [...pointers.current.values()];
      const newDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const newMidX = (pts[0].x + pts[1].x) / 2;
      const newMidY = (pts[0].y + pts[1].y) / 2;

      let v = view;
      if (lastPinch.current && newDist > 1e-3) {
        const factor = lastPinch.current.dist / newDist;
        v = zoomViewAtPixel(v, factor, newMidX, newMidY, el);
      }
      if (lastPinch.current) {
        const dMx = newMidX - lastPinch.current.midX;
        const dMy = newMidY - lastPinch.current.midY;
        if (dMx || dMy) v = panView(v, dMx, dMy, el);
      }
      lastPinch.current = { dist: newDist, midX: newMidX, midY: newMidY };
      emit(v, el);
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const rec = pointers.current.get(e.pointerId);
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) lastPinch.current = null;

    if (drawing.current && pointers.current.size === 0) {
      drawing.current = false;
      onDrawEnd?.();
    }

    if (rec && mode === 'pan' && onTap && pointers.current.size === 0) {
      const movedPx = Math.hypot(rec.x - rec.downX, rec.y - rec.downY);
      const heldMs = performance.now() - rec.downTime;
      if (movedPx < TAP_MAX_MOVE_PX && heldMs < TAP_MAX_DURATION_MS) {
        const el = coordEl(e);
        onTap(screenToMath(view, rec.x, rec.y, el));
      }
    }
  };

  const onWheel = (e: React.WheelEvent) => {
    const el = coordEl(e);
    const local = localCoords(e);
    const factor = Math.exp(e.deltaY * WHEEL_ZOOM_FACTOR);
    emit(zoomViewAtPixel(view, factor, local.x, local.y, el), el);
  };

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: onPointerUp,
    onWheel,
  };
}
