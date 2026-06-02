import React, { useRef, useState } from 'react';

/**
 * Pointer-drag behavior shared by the floating panels (PlaybackFloater,
 * ActionFloater). Attach `dragHandlers` to whatever element should act as the
 * grip (a header bar, or a little handle on the collapsed icon), put `panelRef`
 * on the panel root, and spread `posStyle` onto it. Until the panel is dragged
 * it stays anchored by its CSS default corner; once moved it switches to
 * absolute left/top, clamped to stay inside the positioned ancestor.
 */
export function useFloaterDrag() {
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);

  const clampToParent = (x: number, y: number) => {
    const el = panelRef.current;
    const parent = el?.offsetParent as HTMLElement | null;
    if (!el || !parent) return { x, y };
    const maxX = Math.max(0, parent.clientWidth - el.offsetWidth);
    const maxY = Math.max(0, parent.clientHeight - el.offsetHeight);
    return { x: Math.max(0, Math.min(maxX, x)), y: Math.max(0, Math.min(maxY, y)) };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    const el = panelRef.current;
    if (!el) return;
    dragRef.current = { startX: e.clientX, startY: e.clientY, baseX: el.offsetLeft, baseY: el.offsetTop };
    setPos({ x: el.offsetLeft, y: el.offsetTop });
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    e.preventDefault();
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    setPos(clampToParent(d.baseX + (e.clientX - d.startX), d.baseY + (e.clientY - d.startY)));
  };
  const onPointerUp = () => { dragRef.current = null; };

  const posStyle: React.CSSProperties = pos
    ? { left: pos.x, top: pos.y, right: 'auto', bottom: 'auto' }
    : {};

  return {
    panelRef,
    posStyle,
    dragHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
    },
  };
}
