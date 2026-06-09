import type React from 'react';

/**
 * Pointer-capture drag: listeners attach on pointerdown and detach on
 * pointerup/cancel, so StrictMode double-mounts can never leak them, and
 * capture keeps delivery on the grabbed element even outside its bounds.
 * Works for mouse, touch and pen (headers/handles set touch-action: none).
 */
export function beginPointerDrag(
  e: React.PointerEvent,
  onMove: (dx: number, dy: number) => void,
  onSettle: () => void
): void {
  const el = e.currentTarget as HTMLElement;
  const sx = e.clientX, sy = e.clientY;
  const id = e.pointerId;
  try { el.setPointerCapture(id); } catch { /* capture unsupported */ }
  const move = (ev: PointerEvent) => {
    if (ev.pointerId !== id) return;
    onMove(ev.clientX - sx, ev.clientY - sy);
  };
  const finish = (ev: PointerEvent) => {
    if (ev.pointerId !== id) return;
    el.removeEventListener('pointermove', move);
    el.removeEventListener('pointerup', finish);
    el.removeEventListener('pointercancel', finish);
    onSettle();
  };
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerup', finish);
  el.addEventListener('pointercancel', finish);
}
