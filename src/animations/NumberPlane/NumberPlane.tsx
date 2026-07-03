import React, { useEffect, useRef } from 'react';
import Workspace from '../../chrome/workspace/Workspace';
import type { LayoutDef, SectionDef, ViewDef } from '../../chrome/workspace/types';
import { Pills, Slider, Checkbox } from '../../components/ControlPanel';
import { usePersistentState } from '../../lib/usePersistentState';
import { useThemeId } from '../../chrome/skins';
import { themeMapsFor, sampleContinuous, hexToRgb } from '../../lib/colormapRegistry';
import { useThemeTokens } from '../../chrome/useThemeTokens';
import { usePhone } from '../../chrome/usePhone';
import { type Planar, pt, add, smul, mul, affine, powReal, kindLabel, kindOf } from '../Argand/numberPlanes';
import explainer from './EXPLAINER.md?raw';

// ---------------------------------------------------------------------------
// Number Plane — one expression, three arithmetics.
// Three plots (j² = −p, 0, +p) render the SAME expression under each plane's
// own multiplication. Feeds: a draggable point z (image, smooth flow path, and
// an iterated orbit), preset shapes, or a grid; t + Play morphs source → image
// along the multiplicative flow z·αˢ (spiral / shear / boost arcs — powReal
// blends straight only where the angle honestly doesn't exist); a "rails"
// slider realigns the split plot's frame onto its asymptotes. All three plots
// share one zoom/pan window so they stay comparable.
// ---------------------------------------------------------------------------

const V = 340; // viewBox size

type ExprId = 'affine' | 'quad';
type FeedId = 'point' | 'shape' | 'grid' | 'rays';
type ShapeId = 'circle' | 'square' | 'triangle';
interface ViewWin { cx: number; cy: number; r: number }
const HOME: ViewWin = { cx: 0, cy: 0, r: 3 };

// The three planes are distinct *identities* → discrete data tokens (never --accent).
const planeCol = (p: number) =>
  p < 0 ? 'var(--data-1, #5fe3cd)' : p === 0 ? 'var(--data-2, #ffce47)' : 'var(--data-3, #ff5aa6)';
const A1_COL = 'var(--data-4, #b08cff)';
const A0_COL = 'var(--data-5, #69a8ff)';
const Z_COL = 'var(--data-6, #f0f0f4)';
const A2_COL = 'var(--data-7, #ff9daa)';

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpP = (a: Planar, b: Planar, t: number) => pt(lerp(a.x, b.x, t), lerp(a.y, b.y, t));

function samples(a: number, b: number, n = 48): number[] {
  const out: number[] = [];
  for (let i = 0; i <= n; i++) out.push(a + ((b - a) * i) / n);
  return out;
}

/** |z| = r level set of x² − p·y², for any p; E = how far to extend open curves. */
function levelSet(p: number, r: number, E: number): Planar[][] {
  if (p < 0) {
    const s = 1 / Math.sqrt(-p);
    return [samples(0, 2 * Math.PI, 72).map(t => pt(r * Math.cos(t), r * s * Math.sin(t)))];
  }
  if (p === 0) return [
    samples(-E, E).map(y => pt(r, y)),
    samples(-E, E).map(y => pt(-r, y)),
  ];
  const s = 1 / Math.sqrt(p);
  const T = Math.acosh(Math.max(E / r, 1.02)) + 0.2;
  return [
    samples(-T, T).map(t => pt(r * Math.cosh(t), r * s * Math.sinh(t))),
    samples(-T, T).map(t => pt(-r * Math.cosh(t), r * s * Math.sinh(t))),
    samples(-T, T).map(t => pt(r * Math.sinh(t), r * s * Math.cosh(t))),
    samples(-T, T).map(t => pt(r * Math.sinh(t), -r * s * Math.cosh(t))),
  ];
}

/** The "no way back" set: numbers with |z| = 0 (nothing multiplies them to 1). */
function nullSet(p: number, E: number): Planar[][] {
  if (p < 0) return [];
  if (p === 0) return [samples(-E, E).map(y => pt(0, y))];
  const s = 1 / Math.sqrt(p);
  return [
    samples(-E, E).map(t => pt(t, t * s)),
    samples(-E, E).map(t => pt(t, -t * s)),
  ];
}

// ---- change of basis: align the frame to the rails (asymptotes), p > 0 only.
type Mat = [number, number, number, number];
function railMatrix(p: number, s: number): Mat {
  if (p <= 1e-9 || s <= 0) return [1, 0, 0, 1];
  const rp = Math.sqrt(p);
  const c = 1 / Math.sqrt(2 * rp);
  const m: Mat = [c, c * rp, -c, c * rp];
  return [lerp(1, m[0], s), lerp(0, m[1], s), lerp(0, m[2], s), lerp(1, m[3], s)];
}
const matApply = (m: Mat, z: Planar): Planar => pt(m[0] * z.x + m[1] * z.y, m[2] * z.x + m[3] * z.y);
function matInvApply(m: Mat, z: Planar): Planar {
  const det = m[0] * m[3] - m[1] * m[2];
  return pt((m[3] * z.x - m[1] * z.y) / det, (-m[2] * z.x + m[0] * z.y) / det);
}

// ---- the smooth flow from source to image ----
// Multiplication travels the one-parameter arc z·αˢ (powReal blends straight
// exactly where the generalized angle doesn't exist). Affine takes Argand's two
// honest legs: spiral to αz, then slide by β. The square rides z·zᵗ.
// Legs: spiral ×α₁ · slide +α₀ · (quad only) bend the α₂z² term in.
function flowAt(expr: ExprId, z: Planar, a1: Planar, a0: Planar, a2: Planar, p: number, t: number): Planar {
  const L1 = expr === 'quad' ? 0.5 : 0.62;
  const L2 = expr === 'quad' ? 0.75 : 1;
  if (t <= L1) return mul(z, powReal(a1, p, t / L1), p);
  const az = mul(z, a1, p);
  if (t <= L2) return add(az, smul(a0, (t - L1) / (L2 - L1)));
  const base = add(az, a0);
  return add(base, smul(mul(a2, mul(z, z, p), p), (t - L2) / (1 - L2)));
}

// ---- feed shapes ----
function shapePts(shape: ShapeId, c: Planar): Planar[] {
  if (shape === 'circle') return samples(0, 2 * Math.PI, 72).map(t => pt(c.x + 0.65 * Math.cos(t), c.y + 0.65 * Math.sin(t)));
  if (shape === 'square') {
    const h = 0.55, out: Planar[] = [];
    const corners = [pt(c.x - h, c.y - h), pt(c.x + h, c.y - h), pt(c.x + h, c.y + h), pt(c.x - h, c.y + h), pt(c.x - h, c.y - h)];
    for (let i = 0; i < 4; i++) for (const t of samples(0, 1, 16)) out.push(lerpP(corners[i], corners[i + 1], t));
    return out;
  }
  const v = [pt(c.x - 0.6, c.y - 0.45), pt(c.x + 0.65, c.y - 0.3), pt(c.x - 0.05, c.y + 0.75), pt(c.x - 0.6, c.y - 0.45)], out: Planar[] = [];
  for (let i = 0; i < 3; i++) for (const t of samples(0, 1, 20)) out.push(lerpP(v[i], v[i + 1], t));
  return out;
}

// Clamp a colormap's sampled range to the sub-interval whose luminance clears
// the plot background by a margin — so no orbit step or shape segment vanishes
// into the background, on dark AND light skins.
function contrastRange(cmap: string, bgHex: string): [number, number] {
  const lum = (hex: string) => { const [r, g, b] = hexToRgb(hex); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const lb = lum(bgHex);
  const ok = (t: number) => Math.abs(lum(sampleContinuous(cmap, t)) - lb) >= 70;
  let lo = 0, hi = 1;
  while (lo < 0.6 && !ok(lo)) lo += 0.04;
  while (hi > lo && !ok(hi)) hi -= 0.04;
  return hi > lo ? [lo, hi] : [0, 1];
}

const fmtP = (p: number) => (p === 0 ? '0' : (p > 0 ? '+' : '−') + String(Math.round(Math.abs(p) * 100) / 100));

// ---- one plot ----
interface PlotProps {
  p: number;
  expr: ExprId;
  feed: FeedId;
  shape: ShapeId;
  a1: Planar;
  a0: Planar;
  a2: Planar;
  z0: Planar;
  sc: Planar;
  t: number;
  iterN: number;
  rails: number;
  showGrid: boolean;
  showNull: boolean;
  showLevels: boolean;
  showLabels: boolean;
  cmap: string;
  cmapLo: number;
  cmapHi: number;
  win: ViewWin;
  onDrag: (which: 'a1' | 'a0' | 'a2' | 'z0' | 'sc', z: Planar) => void;
  onWin: (w: ViewWin) => void;
}

function PlanePlot(props: PlotProps) {
  const { p, expr, feed, shape, a1, a0, a2, z0, sc, t, iterN, rails, showGrid, showNull, showLevels, showLabels, cmap, cmapLo, cmapHi, win, onDrag, onWin } = props;
  const cAt = (u: number) => sampleContinuous(cmap, cmapLo + Math.max(0, Math.min(1, u)) * (cmapHi - cmapLo));
  const svgRef = useRef<SVGSVGElement | null>(null);
  const gesture = useRef<{ kind: 'handle' | 'pan'; which?: 'a1' | 'a0' | 'a2' | 'z0' | 'sc'; last?: { x: number; y: number } } | null>(null);
  const pinch = useRef<Map<number, { x: number; y: number }>>(new Map());
  const col = planeCol(p);
  const M = railMatrix(p, rails);

  // world → rail frame → window → screen
  const view = (z: Planar) => matApply(M, z);
  const px = (v: Planar) => pt(((v.x - win.cx) / (2 * win.r) + 0.5) * V, (0.5 - (v.y - win.cy) / (2 * win.r)) * V);
  const toScreen = (z: Planar) => px(view(z));
  const poly = (ps: Planar[]) =>
    ps.map(toScreen)
      .filter(q => isFinite(q.x) && isFinite(q.y) && Math.abs(q.x - V / 2) < V * 3 && Math.abs(q.y - V / 2) < V * 3)
      .map(q => `${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(' ');

  const map = (z: Planar): Planar =>
    expr === 'affine' ? affine(z, a1, a0, p) : add(affine(z, a1, a0, p), mul(a2, mul(z, z, p), p));
  const E = (Math.abs(win.cx) + Math.abs(win.cy) + win.r) * 1.6 + 1;

  const clientToFrame = (cx: number, cy: number): Planar => {
    const r = svgRef.current!.getBoundingClientRect();
    return pt(
      win.cx + ((cx - r.left) / r.width - 0.5) * 2 * win.r,
      win.cy + (0.5 - (cy - r.top) / r.height) * 2 * win.r,
    );
  };
  const clientToWorld = (cx: number, cy: number): Planar => matInvApply(M, clientToFrame(cx, cy));

  const targets: Array<['a1' | 'a0' | 'a2' | 'z0' | 'sc', Planar]> = [];
  targets.push(['a1', a1], ['a0', a0]);
  if (expr === 'quad') targets.push(['a2', a2]);
  if (feed === 'point') targets.push(['z0', z0]);
  if (feed === 'shape') targets.push(['sc', sc]);

  const onDown = (e: React.PointerEvent) => {
    pinch.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    (e.target as Element).setPointerCapture(e.pointerId);
    if (pinch.current.size >= 2) { gesture.current = null; return; } // two fingers: pan+zoom
    const touch = e.pointerType === 'touch';
    const w = clientToWorld(e.clientX, e.clientY);
    // touch gets a fatter hit radius — and one finger NEVER pans (two fingers do),
    // so grabbing a point can't accidentally drag the plane
    let best: 'a1' | 'a0' | 'a2' | 'z0' | 'sc' | null = null, bd = touch ? win.r / 3.5 : win.r / 6;
    for (const [k, q] of targets) {
      const d = Math.hypot(w.x - q.x, w.y - q.y);
      if (d < bd) { bd = d; best = k; }
    }
    gesture.current = best
      ? { kind: 'handle', which: best }
      : touch ? null : { kind: 'pan', last: { x: e.clientX, y: e.clientY } };
  };

  const onMove = (e: React.PointerEvent) => {
    if (pinch.current.has(e.pointerId)) {
      if (pinch.current.size === 2) {
        const pts = [...pinch.current.entries()];
        const other = pts.find(([id]) => id !== e.pointerId)![1];
        const before = pinch.current.get(e.pointerId)!;
        const dBefore = Math.hypot(before.x - other.x, before.y - other.y);
        const dAfter = Math.hypot(e.clientX - other.x, e.clientY - other.y);
        const prevMidX = (before.x + other.x) / 2, prevMidY = (before.y + other.y) / 2;
        const midX = (e.clientX + other.x) / 2, midY = (e.clientY + other.y) / 2;
        pinch.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (dBefore > 0 && dAfter > 0) {
          const rect = svgRef.current!.getBoundingClientRect();
          // pan by the midpoint drift…
          const panX = ((midX - prevMidX) / rect.width) * 2 * win.r;
          const panY = ((midY - prevMidY) / rect.height) * 2 * win.r;
          let cx = win.cx - panX, cy = win.cy + panY;
          // …then zoom about the midpoint
          const scale = dBefore / dAfter;
          const nr = Math.max(0.2, Math.min(40, win.r * scale));
          const fx = cx + ((midX - rect.left) / rect.width - 0.5) * 2 * win.r;
          const fy = cy + (0.5 - (midY - rect.top) / rect.height) * 2 * win.r;
          onWin({ cx: fx + (cx - fx) * (nr / win.r), cy: fy + (cy - fy) * (nr / win.r), r: nr });
        }
        return;
      }
      pinch.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }
    const g = gesture.current;
    if (!g) return;
    if (g.kind === 'handle' && g.which) {
      const w = clientToWorld(e.clientX, e.clientY);
      const snap = (v: number) => Math.round(v * 20) / 20;
      onDrag(g.which, pt(snap(w.x), snap(w.y)));
    } else if (g.kind === 'pan' && g.last) {
      const rect = svgRef.current!.getBoundingClientRect();
      const dx = ((e.clientX - g.last.x) / rect.width) * 2 * win.r;
      const dy = ((e.clientY - g.last.y) / rect.height) * 2 * win.r;
      g.last = { x: e.clientX, y: e.clientY };
      onWin({ cx: win.cx - dx, cy: win.cy + dy, r: win.r });
    }
  };

  const onUp = (e: React.PointerEvent) => {
    pinch.current.delete(e.pointerId);
    gesture.current = null;
  };

  const onWheel = (e: React.WheelEvent) => {
    const f = clientToFrame(e.clientX, e.clientY);
    const k = Math.exp(e.deltaY * 0.0015);
    const nr = Math.max(0.2, Math.min(40, win.r * k));
    onWin({ cx: f.x + (win.cx - f.x) * (nr / win.r), cy: f.y + (win.cy - f.y) * (nr / win.r), r: nr });
  };

  // axis ticks that survive zoom
  const step = win.r <= 6 ? 1 : win.r <= 15 ? 5 : 10;
  const ticks: number[] = [];
  for (let k = Math.ceil((win.cx - win.r) / step) * step; k <= win.cx + win.r; k += step) if (k !== 0) ticks.push(k);
  const yticks: number[] = [];
  for (let k = Math.ceil((win.cy - win.r) / step) * step; k <= win.cy + win.r; k += step) if (k !== 0) yticks.push(k);
  const o = px(pt(0, 0));

  // source geometry for the mapped feeds
  const sourceLines: Planar[][] = [];
  if (feed === 'grid') {
    for (let k = -2; k <= 2; k++) {
      sourceLines.push(samples(-2, 2, 40).map(u => pt(k, u)));
      sourceLines.push(samples(-2, 2, 40).map(u => pt(u, k)));
    }
  } else if (feed === 'shape') {
    sourceLines.push(shapePts(shape, sc));
  } else if (feed === 'rays') {
    // the fan: every line through 0 is a copy of the real number line, t·(a+bj);
    // multiplication shuffles the blades — color tracks which blade went where
    const N = 12;
    for (let i = 0; i < N; i++) {
      const th = (i * Math.PI) / N;
      sourceLines.push(samples(-2.4, 2.4, 48).map(u => pt(u * Math.cos(th), u * Math.sin(th))));
    }
  }

  // the iterated orbit (point feed) with smooth arcs between iterates
  const orbitArcs: Planar[][] = [];
  const orbitPts: Planar[] = [];
  if (feed === 'point') {
    let z = z0;
    orbitPts.push(z);
    for (let i = 0; i < iterN; i++) {
      const zn = map(z);
      if (!isFinite(zn.x) || !isFinite(zn.y) || Math.hypot(zn.x, zn.y) > 1e4) break;
      const zz = z;
      orbitArcs.push(samples(0, 1, 24).map(s => flowAt(expr, zz, a1, a0, a2, p, s)));
      orbitPts.push(zn);
      z = zn;
    }
  }

  const marker = (q: Planar, fill: string, r: number, label?: string, key?: string) => {
    const s = toScreen(q);
    return (
      <g key={key}>
        <circle cx={s.x} cy={s.y} r={r} fill={fill} stroke="var(--card)" strokeWidth={2} />
        {label && <text x={s.x + 10} y={s.y - 8} fill={fill} fontSize={13} fontWeight={700}
          fontFamily="var(--font-mono, monospace)">{label}</text>}
      </g>
    );
  };

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${V} ${V}`}
      style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none',
        cursor: 'grab' }}
      onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
      onWheel={onWheel} onDoubleClick={() => onWin(HOME)}
    >
      {/* frame axes */}
      <line x1={0} y1={o.y} x2={V} y2={o.y} stroke="var(--fg)" strokeOpacity={0.25} />
      <line x1={o.x} y1={0} x2={o.x} y2={V} stroke="var(--fg)" strokeOpacity={0.25} />
      {ticks.map(k => {
        const s = px(pt(k, 0));
        return <line key={`tx${k}`} x1={s.x} y1={o.y - 4} x2={s.x} y2={o.y + 4} stroke="var(--fg)" strokeOpacity={0.3} />;
      })}
      {yticks.map(k => {
        const s = px(pt(0, k));
        return <line key={`ty${k}`} x1={o.x - 4} y1={s.y} x2={o.x + 4} y2={s.y} stroke="var(--fg)" strokeOpacity={0.3} />;
      })}

      {showNull && nullSet(p, E).map((c, i) => (
        <polyline key={`n${i}`} points={poly(c)} fill="none" stroke="var(--fg)"
          strokeOpacity={0.45} strokeWidth={1.5} strokeDasharray="5 5" />
      ))}

      {/* level-set overlay |z| = r (a mark, under the feed layers) */}
      {showLevels && [0.5, 1, 1.5, 2].map(r =>
        levelSet(p, r, E).map((c, i) => (
          <polyline key={`lv${r}-${i}`} points={poly(c)} fill="none" stroke={col}
            strokeWidth={r === 1 ? 2 : 1.1} strokeOpacity={r === 1 ? 0.85 : 0.4} />
        )),
      )}
      {showLevels && showLabels && (
        <>
          {[0.5, 1, 1.5, 2].map(r => {
            const v = toScreen(pt(r, 0));
            return (
              <text key={`ll${r}`} x={v.x + 3} y={v.y - 6}
                fill={col} fillOpacity={r === 1 ? 0.95 : 0.6}
                fontSize={r === 1 ? 11 : 9.5} fontWeight={r === 1 ? 700 : 400}
                fontFamily="var(--font-mono, monospace)">{String(r)}</text>
            );
          })}
          <text x={V - 10} y={22} textAnchor="end" fill={col} fillOpacity={0.6} fontSize={11}
            fontFamily="var(--font-mono, monospace)">levels: |z| = r</text>
        </>
      )}

      {(
        <>
          {showGrid && sourceLines.map((line, i) => (
            <polyline key={`s${i}`} points={poly(line)} fill="none"
              stroke={feed === 'rays' ? cAt(i / Math.max(1, sourceLines.length - 1)) : 'var(--fg)'}
              strokeOpacity={feed === 'rays' ? 0.25 : 0.14} />
          ))}
          {feed !== 'shape' && sourceLines.map((line, i) => (
            <polyline key={`m${i}`} points={poly(line.map(q => flowAt(expr, q, a1, a0, a2, p, t)))} fill="none"
              stroke={feed === 'rays' ? cAt(i / Math.max(1, sourceLines.length - 1)) : col}
              strokeWidth={1.7} strokeOpacity={0.85} />
          ))}
          {feed === 'shape' && sourceLines.map((line, li) => {
            const img = line.map(q => flowAt(expr, q, a1, a0, a2, p, t));
            return img.slice(0, -1).map((q, i) => (
              <polyline key={`cs${li}-${i}`} points={poly([q, img[i + 1]])} fill="none"
                stroke={cAt(i / Math.max(1, img.length - 2))}
                strokeWidth={2.2} strokeOpacity={0.95} />
            ));
          })}

          {feed === 'point' && (
            <>
              {/* the smooth path z → f(z), with the moving dot at t */}
              {iterN <= 1 && orbitArcs[0] && (
                <>
                  <polyline points={poly(orbitArcs[0])} fill="none" stroke={col}
                    strokeWidth={1.6} strokeOpacity={0.55} strokeDasharray="1 4" strokeLinecap="round" />
                  {marker(flowAt(expr, z0, a1, a0, a2, p, t), col, 6, 'f(z)')}
                </>
              )}
              {iterN > 1 && (
                <>
                  {orbitArcs.map((arc, i) => (
                    <polyline key={`oa${i}`} points={poly(arc)} fill="none"
                      stroke={cAt(i / Math.max(1, orbitArcs.length - 1))}
                      strokeWidth={1.5} strokeOpacity={0.75} />
                  ))}
                  {orbitPts.slice(1).map((q, i) =>
                    marker(q, cAt(i / Math.max(1, orbitPts.length - 2)),
                      Math.max(2.5, 6 - i * 0.35), i === 0 ? 'f(z)' : undefined, `o${i}`))}
                </>
              )}
              {marker(z0, Z_COL, 7, 'z')}
            </>
          )}

          {feed === 'shape' && marker(sc, Z_COL, 6)}

          {marker(a1, A1_COL, 8, 'α₁')}
          {marker(a0, A0_COL, 8, 'α₀')}
          {expr === 'quad' && marker(a2, A2_COL, 8, 'α₂')}
        </>
      )}

      <text x={10} y={22} fill={col} fontSize={14} fontWeight={700}
        fontFamily="var(--font-mono, monospace)">{`p = ${fmtP(p)}`}</text>
      <text x={10} y={40} fill="var(--fg)" fillOpacity={0.6} fontSize={12}
        fontFamily="var(--font-sans, sans-serif)">{kindLabel[kindOf(p)]}</text>
      {rails > 0 && p > 0 && (
        <text x={10} y={V - 12} fill="var(--fg)" fillOpacity={0.5} fontSize={11}
          fontFamily="var(--font-sans, sans-serif)">frame → rails {(rails * 100).toFixed(0)}%</text>
      )}
    </svg>
  );
}

// ---- the app ----
export default function NumberPlane() {
  const [exprRaw, setExpr] = usePersistentState<ExprId>('number-plane:expr2', 'affine');
  const expr: ExprId = exprRaw === 'quad' ? 'quad' : 'affine'; // shed stale 'unit'/'square' values
  const [feed, setFeed] = usePersistentState<FeedId>('number-plane:feed', 'grid');
  const [shape, setShape] = usePersistentState<ShapeId>('number-plane:shape', 'circle');
  const [dial, setDial] = usePersistentState('number-plane:dial', 1);
  const [a1, setA1] = usePersistentState<Planar>('number-plane:a1', pt(1.2, 0.6));
  const [a0, setA0] = usePersistentState<Planar>('number-plane:a0', pt(0.4, 0.3));
  const [a2, setA2] = usePersistentState<Planar>('number-plane:a2', pt(0.35, 0.15));
  const [z0, setZ0] = usePersistentState<Planar>('number-plane:z0', pt(1.3, 0.5));
  const [sc, setSc] = usePersistentState<Planar>('number-plane:shape-c', pt(1.0, 0.6));
  const [iterN, setIterN] = usePersistentState('number-plane:iter', 1);
  const [rails, setRails] = usePersistentState('number-plane:rails', 0);
  const [showGrid, setShowGrid] = usePersistentState('number-plane:src-grid', true);
  const [showNull, setShowNull] = usePersistentState('number-plane:null-set', true);
  const [showLevels, setShowLevels] = usePersistentState('number-plane:levels', true);
  const [showLabels, setShowLabels] = usePersistentState('number-plane:level-labels', true);
  const [t, setT] = React.useState(1);
  const [playing, setPlaying] = React.useState(false);
  const [win, setWin] = React.useState<ViewWin>(HOME); // camera, not a setting — not persisted
  const phone = usePhone();
  const themeId = useThemeId();
  const cmap = themeMapsFor('sequential', themeId)[0];
  const tokens = useThemeTokens(['--viz-bg']);
  const [cmapLo, cmapHi] = React.useMemo(
    () => contrastRange(cmap, tokens['--viz-bg'] || '#0c0c10'),
    [cmap, tokens]);

  useEffect(() => {
    if (!playing) return;
    let raf = 0, last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 2600; last = now;
      setT(v => (v + dt > 1.25 ? -0.25 : v + dt));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);
  const tShown = Math.max(0, Math.min(1, t));

  const planes = [-dial, 0, dial];
  const onDrag = (which: 'a1' | 'a0' | 'a2' | 'z0' | 'sc', z: Planar) =>
    which === 'a1' ? setA1(z) : which === 'a0' ? setA0(z) : which === 'a2' ? setA2(z)
      : which === 'z0' ? setZ0(z) : setSc(z);

  const exprNode = (
    <div>
      <Pills<ExprId>
        label="Expression"
        options={[
          { value: 'affine', label: 'α₁z + α₀' },
          { value: 'quad', label: 'α₂z² + α₁z + α₀' },
        ]}
        value={expr}
        onChange={setExpr}
      />
      {(
        <>
          <Pills<FeedId>
            label="Feed"
            options={[
              { value: 'point', label: 'Point' },
              { value: 'shape', label: 'Shape' },
              { value: 'grid', label: 'Grid' },
              { value: 'rays', label: 'Rays' },
            ]}
            value={feed}
            onChange={setFeed}
          />
          {feed === 'shape' && (
            <Pills<ShapeId>
              label="Shape"
              options={[
                { value: 'circle', label: '○' },
                { value: 'square', label: '□' },
                { value: 'triangle', label: '△' },
              ]}
              value={shape}
              onChange={setShape}
            />
          )}
        </>
      )}
      <p style={{ fontSize: 12.5, opacity: 0.75, margin: '10px 2px 0', lineHeight: 1.5 }}>
        {expr === 'affine'
          ? 'y = mx + b, promoted to the plane. Drag α₁, α₀ — and z — on any plot; all three share them.'
          : 'The quadratic in each arithmetic: the α₂ term bends the plane. Drag α₂, α₁, α₀ — and z.'}
      </p>
    </div>
  );

  const dialNode = (
    <div>
      <Slider label="p" value={dial} min={0} max={2} step={0.05} onChange={setDial}
        format={v => v.toFixed(2)} stops={[{ value: 1, label: '1' }]} />
      <p style={{ fontSize: 12.5, opacity: 0.75, margin: '8px 2px 0', lineHeight: 1.5 }}>
        One knob: the left plot shows j² = −p, the right j² = +p; the dual plane
        (0) holds still between them. Turn toward 0 and both worlds flatten into it.
      </p>
    </div>
  );

  const playNode = (
    <div>
      <Slider label="t · source → image" value={tShown} min={0} max={1} step={0.01}
        onChange={v => { setPlaying(false); setT(v); }} format={v => v.toFixed(2)} />
      <div style={{ margin: '8px 0' }}>
        <button
          onClick={() => setPlaying(pl => !pl)}
          style={{ font: 'inherit', fontSize: 13, fontWeight: 600, padding: '6px 16px', borderRadius: 8,
            border: '1px solid var(--rule)', background: playing ? 'var(--accent)' : 'var(--soft)',
            color: playing ? 'var(--bg)' : 'var(--fg)', cursor: 'pointer' }}
        >
          {playing ? '❚❚ Pause' : '▶ Play'}
        </button>
      </div>
      <Slider label="Iterate (Point feed)" value={iterN} min={1} max={14} step={1} onChange={setIterN}
        format={v => (v <= 1 ? 'off' : `${v} steps`)} />
      <p style={{ fontSize: 12.5, opacity: 0.75, margin: '8px 2px 0', lineHeight: 1.5 }}>
        The path from z to f(z) is the multiplication's own flow — a spiral arc, a
        shear, a boost — not a straight teleport. Iterating chains it: spiral ·
        shear · saddle.
      </p>
    </div>
  );

  const axesNode = (
    <div>
      <Slider label="Align frame to rails" value={rails} min={0} max={1} step={0.01} onChange={setRails}
        format={v => `${(v * 100).toFixed(0)}%`} />
      <p style={{ fontSize: 12.5, opacity: 0.75, margin: '8px 2px 0', lineHeight: 1.5 }}>
        Realigns the boost plot's frame onto its asymptotes (the rails) — at 100%
        the hyperbolas sit square to the axes and × is two independent stretches.
        The dual plane's rail already is an axis. The complex plane doesn't move:
        it has no real rails to align. That failure is the whole story.
      </p>
      <div style={{ marginTop: 8 }}>
        <button
          onClick={() => setWin(HOME)}
          style={{ font: 'inherit', fontSize: 13, fontWeight: 600, padding: '6px 16px', borderRadius: 8,
            border: '1px solid var(--rule)', background: 'var(--soft)', color: 'var(--fg)', cursor: 'pointer' }}
        >
          ⟲ Reset view
        </button>
        <p style={{ fontSize: 12.5, opacity: 0.75, margin: '8px 2px 0', lineHeight: 1.5 }}>
          Mouse: scroll to zoom, drag empty space to pan. Touch: one finger moves
          points, two fingers pan &amp; zoom. All three plots share one window;
          double-tap to reset.
        </p>
      </div>
    </div>
  );

  const paramsNode = (
    <div>
      <Slider label="α₁ · re" value={a1.x} min={-2} max={2} step={0.05} onChange={v => setA1(pt(v, a1.y))} />
      <Slider label="α₁ · im" value={a1.y} min={-2} max={2} step={0.05} onChange={v => setA1(pt(a1.x, v))} />
      <Slider label="α₀ · re" value={a0.x} min={-2} max={2} step={0.05} onChange={v => setA0(pt(v, a0.y))} />
      <Slider label="α₀ · im" value={a0.y} min={-2} max={2} step={0.05} onChange={v => setA0(pt(a0.x, v))} />
      <Slider label="α₂ · re" value={a2.x} min={-2} max={2} step={0.05} onChange={v => setA2(pt(v, a2.y))} />
      <Slider label="α₂ · im" value={a2.y} min={-2} max={2} step={0.05} onChange={v => setA2(pt(a2.x, v))} />
    </div>
  );

  const marksNode = (
    <div>
      <Checkbox label="Source (faint)" checked={showGrid} onChange={setShowGrid} />
      <Checkbox label="Null set (|z| = 0)" checked={showNull} onChange={setShowNull} />
      <Checkbox label="Level sets (|z| = r)" checked={showLevels} onChange={setShowLevels} />
      <Checkbox label="Level labels" checked={showLabels} onChange={setShowLabels} />
    </div>
  );

  const sections: SectionDef[] = [
    { id: 'expression', title: 'Expression', arch: 'subject', node: exprNode, estHeight: 230 },
    { id: 'dial', title: 'The dial', arch: 'drive', node: dialNode, estHeight: 150 },
    { id: 'play', title: 'Play', arch: 'playback', node: playNode, estHeight: 260 },
    { id: 'axes', title: 'Axes & view', arch: 'view', node: axesNode, estHeight: 260 },
    { id: 'params', title: 'Coefficients', arch: 'domain', node: paramsNode, estHeight: 220 },
    { id: 'marks', title: 'Marks', arch: 'marks', node: marksNode, estHeight: 100 },
  ];

  const views: ViewDef[] = [
    {
      id: 'planes',
      title: 'Three planes',
      defaultRect: { x: 370, y: 16, w: 880, h: 380 },
      node: (
        <div style={{ position: 'absolute', inset: 0, display: 'flex',
          flexDirection: phone ? 'column' : 'row',
          alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: phone ? '48px 8px 92px' : 8, background: 'var(--bg)' }}>
          {/* desktop: three squares in a row; phone: stacked vertically —
              all three always visible, sharing the card's height */}
          {planes.map((p, i) => (
            <div key={i} style={{ flex: '1 1 0', minWidth: 0, minHeight: 0,
              ...(phone ? { width: '100%' } : { aspectRatio: '1 / 1', maxHeight: '100%', alignSelf: 'center' }),
              border: '1px solid var(--rule)',
              borderRadius: 10, overflow: 'hidden', background: 'var(--viz-bg, #0c0c10)' }}>
              <PlanePlot p={p} expr={expr} feed={feed} shape={shape} a1={a1} a0={a0} a2={a2} z0={z0} sc={sc}
                t={tShown} iterN={iterN} rails={rails} win={win}
                showGrid={showGrid} showNull={showNull} showLevels={showLevels} showLabels={showLabels} cmap={cmap} cmapLo={cmapLo} cmapHi={cmapHi} onDrag={onDrag} onWin={setWin} />
            </div>
          ))}
        </div>
      ),
    },
  ];

  const layouts: LayoutDef[] = [
    {
      id: 'essentials', name: 'Essentials', sub: 'Expression · Dial · Play', icon: 'tune',
      open: { expression: { x: 24, y: 16 }, dial: { x: 24, y: 300 }, play: { x: 24, y: 486 } },
    },
  ];

  return (
    <Workspace
      appId="number-plane"
      title="Number Plane"
      subtitle="j² = p"
      sections={sections}
      views={views}
      layouts={layouts}
      defaultLayoutId="essentials"
      explainer={explainer}
    />
  );
}
