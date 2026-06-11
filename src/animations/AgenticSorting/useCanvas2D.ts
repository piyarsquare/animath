import { useEffect, type MutableRefObject, type RefObject } from 'react';

/**
 * DPR-aware 2D canvas sizing via a ResizeObserver. Sets the backing-store size
 * for the device pixel ratio, writes the CSS-pixel size into `size`, and calls
 * `onResize` after each resize (ignoring zero-size, which happens when the
 * window is collapsed or the mode-swapped view is unmounted). Re-attaches when
 * any of `deps` change — pass the mode so a remounted canvas is re-observed.
 */
export function useCanvas2D(
  ref: RefObject<HTMLCanvasElement | null>,
  size: MutableRefObject<{ w: number; h: number }>,
  onResize: (cvs: HTMLCanvasElement) => void,
  deps: unknown[],
) {
  useEffect(() => {
    const cvs = ref.current;
    if (!cvs) return;
    const ro = new ResizeObserver(() => {
      const rect = cvs.getBoundingClientRect();
      const w = Math.round(rect.width), h = Math.round(rect.height);
      if (w === 0 || h === 0) return;
      const dpr = window.devicePixelRatio || 1;
      cvs.width = Math.round(w * dpr);
      cvs.height = Math.round(h * dpr);
      const ctx = cvs.getContext('2d');
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      size.current = { w, h };
      onResize(cvs);
    });
    ro.observe(cvs);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
