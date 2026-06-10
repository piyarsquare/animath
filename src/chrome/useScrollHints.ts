import { useEffect, useState } from 'react';
import type React from 'react';

/**
 * Tracks whether a scroll container has more content beyond its start/end
 * edge, so the chrome can show "there's more" affordances (the rail on short
 * windows, the phone dock on narrow screens). Updates on scroll and resize.
 */
export function useScrollHints(
  ref: React.RefObject<HTMLElement>,
  axis: 'x' | 'y',
): { start: boolean; end: boolean } {
  const [hint, setHint] = useState({ start: false, end: false });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const pos = axis === 'y' ? el.scrollTop : el.scrollLeft;
      const max = axis === 'y'
        ? el.scrollHeight - el.clientHeight
        : el.scrollWidth - el.clientWidth;
      const next = { start: pos > 2, end: pos < max - 2 };
      setHint(h => (h.start === next.start && h.end === next.end ? h : next));
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => { el.removeEventListener('scroll', update); ro.disconnect(); };
  }, [ref, axis]);
  return hint;
}
