/**
 * The Population — every individual as two strips (p over rows, q over columns),
 * sorted by fitness, re-labeled to the fittest individual's convention, with a
 * fitness bar alongside.
 *
 * Drawn on a canvas, not as elements: at N = 256 over a 24×24 matrix this is
 * ~12k genome cells, and as SVG rects they dominated the React reconciler. The
 * genome block is written once into an ImageData at one pixel per gene and blitted
 * up with smoothing off, so the cost is a typed-array loop rather than a DOM tree.
 *
 * Sex is marked by presence or absence of a tick, never by hue alone — at one pixel
 * per individual a glyph would not read, and a two-color code would not survive a
 * color-vision deficiency.
 */

import React, { useEffect, useRef } from 'react';
import type { BinaryMatrix } from '../matrix';
import { canonicalOrientation } from '../evolve';
import { useThemeTokens } from '../../../chrome/useThemeTokens';
import type { WatchSnapshot } from '../useWatchLoop';

interface Props {
  M: BinaryMatrix;
  snapshot: WatchSnapshot | null;
  orientationBlind: boolean;
  showSexes: boolean;
}

/**
 * Resolve any CSS color to [r, g, b, a] by letting the browser parse it.
 * The theme tokens are not all hex — `--border` is `rgba(150,175,220,0.13)` in the
 * default skin — so slicing hex pairs is wrong (it read "ba" as 186 and painted a
 * neon-green separator). A scratch context handles hex, rgb(), hsl() and the rest.
 */
function resolveColor(css: string, fallback: [number, number, number, number]): [number, number, number, number] {
  if (!css) return fallback;
  const c = document.createElement('canvas');
  c.width = c.height = 1;
  const ctx = c.getContext('2d');
  if (!ctx) return fallback;
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = '#000';
  ctx.fillStyle = css;                 // invalid values leave the previous style
  if (ctx.fillStyle === '#000' && css.trim() !== '#000' && css.trim() !== 'black') return fallback;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
  return [r, g, b, a / 255];
}

const SEX_W = 2;   // px, in genome space
const GAP_W = 1;
const FIT_W = 6;

export function Population({ M, snapshot, orientationBlind, showSexes }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const tokens = useThemeTokens(['fg', 'data-2'], wrap);

  useEffect(() => {
    const el = canvas.current, box = wrap.current;
    if (!el || !box || !snapshot) return;
    const draw = () => {
      const cssW = box.clientWidth, cssH = box.clientHeight;
      if (cssW <= 0 || cssH <= 0) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      el.width = Math.round(cssW * dpr); el.height = Math.round(cssH * dpr);
      el.style.width = `${cssW}px`; el.style.height = `${cssH}px`;
      const ctx = el.getContext('2d');
      if (!ctx) return;

      const { m, n } = M;
      const sexW = showSexes ? SEX_W : 0;
      const W = sexW + m + GAP_W + n + GAP_W + FIT_W;
      const pop = snapshot.pop;
      const N = pop.length;
      const best = pop[snapshot.stats.bestIdx];

      const [fr, fg, fb, fa] = resolveColor(tokens.fg, [232, 236, 245, 1]);
      const [dr, dg, db, da] = resolveColor(tokens['data-2'], [95, 227, 205, 1]);

      // One pixel per gene, then blit scaled — no per-cell draw call.
      const img = ctx.createImageData(W, N);
      const px = img.data;
      const put = (x: number, y: number, r: number, g: number, b: number, a: number) => {
        const o = (y * W + x) * 4;
        px[o] = r; px[o + 1] = g; px[o + 2] = b; px[o + 3] = Math.round(a * 255);
      };
      const fits = pop.map(p => p.fit);
      const fMin = Math.min(...fits), fMax = Math.max(...fits);
      const order = pop.map((_, i) => i).sort((a, b) => pop[b].fit - pop[a].fit);

      order.forEach((idx, y) => {
        const ind = pop[idx];
        const { flipP, flipQ } = canonicalOrientation(best, ind, orientationBlind);
        // The two GAP_W columns are left unpainted: the panel shows through as a
        // clean separator between the row half, the column half and the fitness bar.
        if (showSexes && ind.sex === 'row') for (let x = 0; x < SEX_W; x++) put(x, y, fr, fg, fb, 0.85 * fa);
        for (let i = 0; i < m; i++) {
          const v = flipP ? 1 - ind.p[i] : ind.p[i];
          put(sexW + i, y, fr, fg, fb, v * fa);
        }
        for (let j = 0; j < n; j++) {
          const v = flipQ ? 1 - ind.q[j] : ind.q[j];
          put(sexW + m + GAP_W + j, y, fr, fg, fb, v * fa);
        }
        const frac = fMax > fMin ? (ind.fit - fMin) / (fMax - fMin) : 1;
        const bars = Math.round(frac * FIT_W);
        for (let x = 0; x < bars; x++) put(sexW + m + GAP_W + n + GAP_W + x, y, dr, dg, db, 0.9 * da);
      });

      const off = document.createElement('canvas');
      off.width = W; off.height = N;
      off.getContext('2d')?.putImageData(img, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssW, cssH);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(off, 0, 0, W, N, 0, 0, cssW, cssH);
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(box);
    return () => ro.disconnect();
  }, [M, snapshot, orientationBlind, showSexes, tokens]);

  if (!snapshot) return <div className="sd-empty">Press Play to start a population.</div>;
  return (
    <div className="sd-popwrap">
      <div className="sd-poplegend">
        <span>rows p</span><span>columns q</span><span>fitness</span>
        {showSexes && <span>tick = row-sex · blank = column-sex</span>}
        <span className="dim">{snapshot.pop.length} individuals, fittest at the top</span>
      </div>
      <div className="sd-popcanvaswrap" ref={wrap}><canvas ref={canvas} className="sd-popcanvas" /></div>
    </div>
  );
}
