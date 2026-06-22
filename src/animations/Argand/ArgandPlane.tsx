import React, { useEffect, useRef, useState } from 'react';
import {
  type Cx, cx, add, sub, scale, modulus,
  mulG, powRealG, affineAt, affineSimulAt, affineLoopAt,
  polyEval, polyFixedPoints, criticalPoint, hornerAt, hornerWaypoints, polyRampAt, snap,
} from './complexOps';

export type Feed = 'point' | 'shape' | 'grid';
export type Handle = 'z' | 'alpha1' | 'alpha0' | 'alpha2';

/** Shared palette — handles and the equation readout use the same colors. */
export const Z_COL = '#38bdf8';   // z  — input (cyan)
export const A1_COL = '#fb923c';  // α₁ — slope / multiplier (orange)
export const A0_COL = '#c084fc';  // α₀ — shift / intercept (violet)
export const A2_COL = '#f472b6';  // α₂ — quadratic term (pink)
export const F_COL = '#34d399';   // f(z) — output (emerald)
export const FIX_COL = '#fbbf24'; // z* — fixed point (gold)
export const CRIT_COL = '#94a3b8'; // critical point (slate)

const MARGIN = 0.9;        // keep the extent inside the frame

interface Props {
  /** The input locus: the point (Point), the shape's anchor (Shape), a probe (Grid). */
  z: Cx;
  /** Coefficients of f(z) = α₂·z² + α₁·z + α₀. */
  alpha1: Cx;
  alpha0: Cx;
  alpha2: Cx;
  /** Polynomial degree (1 = affine line, 2 = quadratic). */
  degree: number;
  /** Number-system parameter j² = p: p<0 complex, p=0 dual, p>0 split-complex. */
  p: number;
  /** What we feed f. */
  feed: Feed;
  /** Base shape points (centered near origin) for the shape feed. */
  curve: Cx[];
  /** Scrub 0→1 along the two-leg affine path (½ = after ×α₁). */
  t: number;
  playing: boolean;
  /** Locked coefficients can't be dragged. */
  lockA1: boolean;
  lockA0: boolean;
  lockA2: boolean;
  snapping: boolean;
  /** Ghost identity grid opacity (0 hides it). */
  gridOpacity: number;
  /** Mapped image-grid opacity (Grid feed). */
  imageOpacity: number;
  showUnitCircle: boolean;
  /** Recenter the plane on the fixed point z* (the map becomes a pure spiral). */
  viewFromFixed: boolean;
  /** Point feed: draw the orbit z → f(z) → f²(z) … toward/away from z*. */
  iterate: boolean;
  /** How many iterates to draw. */
  iterN: number;
  /** Half-extent of the visible plane in math units. */
  extent: number;
  onChange: (which: Handle, z: Cx) => void;
  onZoom?: (factor: number) => void;
}

/** Track the pixel size of the view body so the SVG fills the whole rectangle. */
function useSize(ref: React.RefObject<HTMLDivElement>) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      setSize({ w: Math.max(0, Math.floor(r.width)), h: Math.max(0, Math.floor(r.height)) });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

export default function ArgandPlane({
  z, alpha1, alpha0, alpha2, degree, p, feed, curve, t, playing, lockA1, lockA0, lockA2, snapping, gridOpacity, imageOpacity, showUnitCircle, viewFromFixed, iterate, iterN, extent, onChange, onZoom,
}: Props) {
  const quad = degree >= 2;
  const coeffs: Cx[] = quad ? [alpha0, alpha1, alpha2] : [alpha0, alpha1];
  const isPoint = feed === 'point';
  const isShape = feed === 'shape';
  const isGrid = feed === 'grid';
  // The moving marker/sweep appears only in motion (playing) or parked mid-path;
  // at rest only the full static story shows.
  const showMover = playing || (t > 0.01 && t < 0.99);
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<Handle | null>(null);
  const { w, h } = useSize(wrapRef);

  // Pan offset: the math point shown at the middle of the view. Transient.
  const [center, setCenter] = useState<Cx>(cx(0, 0));

  // Multi-pointer bookkeeping for pinch-zoom / two-finger (or shift/right-drag) pan.
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const gesture = useRef<{ dist: number; mx: number; my: number } | null>(null);
  const panning = useRef<{ x: number; y: number } | null>(null);

  // The fixed points f(z*) = z* (one for a line, two for a quadratic). "View
  // from z*" recenters on the first so the map reads as a pure spiral.
  const zStars = polyFixedPoints(coeffs, p);
  const zCrit = criticalPoint(coeffs, p);
  const ctr = viewFromFixed && zStars[0] ? zStars[0] : center;

  // Equal x/y scale (circles stay circles) from the SHORTER side, so `extent`
  // units fit there and the longer side simply shows more — the plot fills the
  // whole rectangle instead of an inscribed square.
  const k = ((Math.min(w, h) / 2) * MARGIN) / extent || 1;
  const toV = (q: Cx): [number, number] =>
    [w / 2 + (q.re - ctr.re) * k, h / 2 - (q.im - ctr.im) * k];

  const toMath = (clientX: number, clientY: number): Cx => {
    const r = svgRef.current!.getBoundingClientRect();
    const sx = w / (r.width || 1), sy = h / (r.height || 1);
    const fx = (clientX - r.left) * sx;
    const fy = (clientY - r.top) * sy;
    return cx((fx - w / 2) / k + ctr.re, -(fy - h / 2) / k + ctr.im);
  };

  const panByClient = (dxpx: number, dypx: number) => {
    if (viewFromFixed && zStars[0]) return;        // view is locked to z*
    const r = svgRef.current?.getBoundingClientRect();
    const sx = w / (r?.width || 1), sy = h / (r?.height || 1);
    setCenter(c => cx(c.re - (dxpx * sx) / k, c.im + (dypx * sy) / k));
  };

  const startGesture = () => {
    const pts = [...pointers.current.values()];
    if (pts.length < 2) return;
    gesture.current = {
      dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y),
      mx: (pts[0].x + pts[1].x) / 2,
      my: (pts[0].y + pts[1].y) / 2,
    };
  };

  const locked = (which: Handle): boolean =>
    (which === 'alpha1' && lockA1) || (which === 'alpha0' && lockA0) || (which === 'alpha2' && lockA2);

  const onHandleDown = (which: Handle) => (e: React.PointerEvent) => {
    if (locked(which)) return;                      // a locked coefficient won't grab
    e.stopPropagation();
    e.preventDefault();
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    svgRef.current?.setPointerCapture(e.pointerId);
    if (pointers.current.size >= 2) { dragRef.current = null; startGesture(); return; }
    dragRef.current = which;
  };

  const onRootDown = (e: React.PointerEvent) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    svgRef.current?.setPointerCapture(e.pointerId);
    if (pointers.current.size >= 2) { dragRef.current = null; startGesture(); return; }
    if (e.button === 2 || e.shiftKey) panning.current = { x: e.clientX, y: e.clientY };
  };

  const onMove = (e: React.PointerEvent) => {
    const rec = pointers.current.get(e.pointerId);
    if (rec) { rec.x = e.clientX; rec.y = e.clientY; }

    if (pointers.current.size >= 2 && gesture.current) {
      const pts = [...pointers.current.values()];
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const mx = (pts[0].x + pts[1].x) / 2;
      const my = (pts[0].y + pts[1].y) / 2;
      if (dist > 1e-3 && gesture.current.dist > 1e-3) onZoom?.(gesture.current.dist / dist);
      panByClient(mx - gesture.current.mx, my - gesture.current.my);
      gesture.current = { dist, mx, my };
      return;
    }
    if (dragRef.current) {
      let q = toMath(e.clientX, e.clientY);
      if (snapping) q = snap(q);
      onChange(dragRef.current, q);
      return;
    }
    if (panning.current) {
      panByClient(e.clientX - panning.current.x, e.clientY - panning.current.y);
      panning.current = { x: e.clientX, y: e.clientY };
    }
  };

  const onUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    svgRef.current?.releasePointerCapture(e.pointerId);
    if (pointers.current.size < 2) gesture.current = null;
    if (pointers.current.size === 0) { dragRef.current = null; panning.current = null; }
  };

  const onWheel = (e: React.WheelEvent) => onZoom?.(Math.exp(e.deltaY * 0.0015));

  /* ---- the affine map applied to the current feed ---- */

  const fOf = (q: Cx): Cx => polyEval(coeffs, q, p);
  // The two-leg path of one input point, split so each leg gets its color.
  const legPath = (q: Cx, leg: 0 | 1): string => {
    const lo = leg === 0 ? 0 : 0.5, hi = leg === 0 ? 0.5 : 1;
    const n = 24;
    const pts: string[] = [];
    for (let i = 0; i <= n; i++) {
      const [vx, vy] = toV(affineAt(q, alpha1, alpha0, p, lo + (hi - lo) * (i / n)));
      pts.push(`${i === 0 ? 'M' : 'L'} ${vx.toFixed(1)} ${vy.toFixed(1)}`);
    }
    return pts.join(' ');
  };
  const fullPath = (q: Cx): string => {
    const n = 40;
    const pts: string[] = [];
    for (let i = 0; i <= n; i++) {
      const [vx, vy] = toV(affineAt(q, alpha1, alpha0, p, i / n));
      pts.push(`${i === 0 ? 'M' : 'L'} ${vx.toFixed(1)} ${vy.toFixed(1)}`);
    }
    return pts.join(' ');
  };
  // The return route: the "all-at-once" diagonal from f(z) back to z.
  const simulArc = (q: Cx): string => {
    const n = 32;
    const pts: string[] = [];
    for (let i = 0; i <= n; i++) {
      const [vx, vy] = toV(affineSimulAt(q, alpha1, alpha0, p, i / n));
      pts.push(`${i === 0 ? 'M' : 'L'} ${vx.toFixed(1)} ${vy.toFixed(1)}`);
    }
    return pts.join(' ');
  };
  const vpoly = (pts: Cx[]): string =>
    pts.map((q, i) => { const [vx, vy] = toV(q); return `${i === 0 ? 'M' : 'L'} ${vx.toFixed(1)} ${vy.toFixed(1)}`; }).join(' ');

  // Shape feed: the base shape anchored at z, and its image under f. A quadratic
  // bends straight edges, so we densify the polyline before mapping it.
  const placed = curve.map(pt => add(pt, z));
  const shapePts = quad
    ? placed.flatMap((q, i) => {
        if (i === placed.length - 1) return [q];
        const r = placed[i + 1];
        return Array.from({ length: 6 }, (_, j) => add(scale(q, 1 - j / 6), scale(r, j / 6)));
      })
    : placed;

  // Visible half-spans in math units (the rectangle can show more than `extent`
  // along its longer side).
  const halfX = w > 0 ? (w / 2) / k : extent;
  const halfY = h > 0 ? (h / 2) / k : extent;

  // Integer grid lines (ghost identity grid, panning with the view center).
  const xLines: number[] = [];
  for (let i = Math.ceil(ctr.re - halfX); i <= Math.floor(ctr.re + halfX); i++) xLines.push(i);
  const yLines: number[] = [];
  for (let i = Math.ceil(ctr.im - halfY); i <= Math.floor(ctr.im + halfY); i++) yLines.push(i);

  // Grid feed: a complete origin-centered lattice mapped by f at param s. Affine
  // ⇒ straight lines stay straight, so mapping the two endpoints is exact.
  const reach = Math.max(halfX, halfY) + Math.abs(ctr.re) + Math.abs(ctr.im) + 2;
  const GN = Math.ceil(reach);
  const gridIdx: number[] = [];
  for (let i = -GN; i <= GN; i++) gridIdx.push(i);
  const gridEnds = (i: number, horizontal: boolean): [Cx, Cx] =>
    horizontal ? [cx(-GN, i), cx(GN, i)] : [cx(i, -GN), cx(i, GN)];
  // Map a grid line through an arbitrary per-point map. A quadratic bends lines,
  // so we sample; the affine map keeps them straight (two endpoints suffice).
  const sampleLine = (i: number, horizontal: boolean, mapFn: (q: Cx) => Cx): string => {
    const [p0, p1] = gridEnds(i, horizontal);
    const n = quad ? 24 : 1;
    const pts: string[] = [];
    for (let j = 0; j <= n; j++) {
      const q = add(scale(p0, 1 - j / n), scale(p1, j / n));
      const [vx, vy] = toV(mapFn(q));
      pts.push(`${j === 0 ? 'M' : 'L'} ${vx.toFixed(1)} ${vy.toFixed(1)}`);
    }
    return pts.join(' ');
  };
  // the full image grid f(grid) — always shown (the complete story)
  const gridLineImage = (i: number, horizontal: boolean): string => sampleLine(i, horizontal, fOf);
  // the live grid in motion — degree-ramp morph (quad) or the affine loop (line)
  const triS = t < 0.5 ? t * 2 : 2 - 2 * t;   // 0→1→0 over t, seamless on wrap
  const gridLineLoop = (i: number, horizontal: boolean): string =>
    sampleLine(i, horizontal, q => quad ? polyRampAt(coeffs, q, p, triS) : affineLoopAt(q, alpha1, alpha0, p, t));

  const [oVx, oVy] = toV(cx(0, 0));

  // Horner chain (quadratic Point feed): the accumulator's spiral+slide path
  // α₂ → α₂z → α₂z+α₁ → … → f(z), plus its integer waypoints.
  const hornerPts = hornerWaypoints(coeffs, z, p);
  const hornerPathD = (() => {
    const n = 100;
    const pts: string[] = [];
    for (let i = 0; i <= n; i++) { const [vx, vy] = toV(hornerAt(coeffs, z, p, i / n)); pts.push(`${i === 0 ? 'M' : 'L'} ${vx.toFixed(1)} ${vy.toFixed(1)}`); }
    return pts.join(' ');
  })();

  // Iteration orbit: the literal iterates zₖ = fᵏ(z) (stopping if they escape).
  // For a line this is the log spiral z* + α₁ᵏ·(z−z*); for a quadratic it's
  // genuine nonlinear dynamics (the Mandelbrot/Julia orbit).
  const orbitDots: Cx[] = [z];
  for (let kk = 0; kk < iterN; kk++) {
    const nx = fOf(orbitDots[orbitDots.length - 1]);
    if (!isFinite(nx.re) || !isFinite(nx.im) || modulus(nx) > 1e4) break;
    orbitDots.push(nx);
  }
  const orbitSpiral = !quad && zStars[0];   // smooth log spiral only for a line
  const orbitAt = (s: number): Cx => {
    if (orbitSpiral) return add(zStars[0], mulG(powRealG(alpha1, p, s), sub(z, zStars[0]), p));
    const i0 = Math.min(orbitDots.length - 2, Math.max(0, Math.floor(s)));
    if (i0 < 0) return z;
    const fr = Math.min(1, Math.max(0, s - i0));
    return add(scale(orbitDots[i0], 1 - fr), scale(orbitDots[i0 + 1], fr));
  };
  const orbitPathD = (() => {
    if (orbitSpiral) {
      const n = Math.max(64, iterN * 10);
      const pts: string[] = [];
      for (let i = 0; i <= n; i++) { const [vx, vy] = toV(orbitAt((iterN * i) / n)); pts.push(`${i === 0 ? 'M' : 'L'} ${vx.toFixed(1)} ${vy.toFixed(1)}`); }
      return pts.join(' ');
    }
    return orbitDots.map((q, i) => { const [vx, vy] = toV(q); return `${i === 0 ? 'M' : 'L'} ${vx.toFixed(1)} ${vy.toFixed(1)}`; }).join(' ');
  })();

  // The system's "unit circle": the level set N(z)=re²−p·im²=1 — an ellipse
  // (p<0), two lines (p=0), or a hyperbola with its null cone (p>0).
  const unitCurveNode = (() => {
    if (!showUnitCircle) return null;
    const st = { fill: 'none', stroke: 'currentColor', strokeOpacity: 0.28, strokeWidth: 2, strokeDasharray: '6 8' } as const;
    if (p < 0) return <ellipse cx={oVx} cy={oVy} rx={k} ry={k / Math.sqrt(-p)} {...st} />;
    if (p === 0) {
      const [xp] = toV(cx(1, 0)); const [xm] = toV(cx(-1, 0));
      return <g {...st}><line x1={xp} y1={0} x2={xp} y2={h} /><line x1={xm} y1={0} x2={xm} y2={h} /></g>;
    }
    const wp = Math.sqrt(p);
    const sMax = Math.asinh(reach * wp) + 0.5;
    const branch = (sign: number): string => {
      const pts: string[] = [];
      for (let i = 0; i <= 48; i++) {
        const s = -sMax + (2 * sMax * i) / 48;
        const [vx, vy] = toV(cx(sign * Math.cosh(s), Math.sinh(s) / wp));
        pts.push(`${i === 0 ? 'M' : 'L'} ${vx.toFixed(1)} ${vy.toFixed(1)}`);
      }
      return pts.join(' ');
    };
    const asym = (sign: number): string => {
      const [x1, y1] = toV(cx(sign * wp * reach, reach));
      const [x2, y2] = toV(cx(-sign * wp * reach, -reach));
      return `M ${x1.toFixed(1)} ${y1.toFixed(1)} L ${x2.toFixed(1)} ${y2.toFixed(1)}`;
    };
    return (
      <g>
        <path d={branch(1)} {...st} /><path d={branch(-1)} {...st} />
        <path d={asym(1)} fill="none" stroke="#f87171" strokeOpacity={0.3} strokeWidth={1.5} strokeDasharray="2 9" />
        <path d={asym(-1)} fill="none" stroke="#f87171" strokeOpacity={0.3} strokeWidth={1.5} strokeDasharray="2 9" />
      </g>
    );
  })();

  // Draggable handle glyph (a distinct shape per role; a ring marks a lock).
  const handleGlyph = (which: Handle, q: Cx, col: string, shape: 'circle' | 'diamond' | 'square' | 'triangle', isLocked: boolean) => {
    const [vx, vy] = toV(q);
    const r = 10;
    const body = shape === 'circle'
      ? <circle cx={vx} cy={vy} r={r} fill={col} stroke="var(--viz-bg,#0c0c10)" strokeWidth={2.5} />
      : shape === 'diamond'
        ? <rect x={vx - r} y={vy - r} width={r * 2} height={r * 2} transform={`rotate(45 ${vx} ${vy})`} fill={col} stroke="var(--viz-bg,#0c0c10)" strokeWidth={2.5} />
        : shape === 'triangle'
          ? <path d={`M ${vx} ${vy - r * 1.2} L ${vx + r * 1.1} ${vy + r * 0.8} L ${vx - r * 1.1} ${vy + r * 0.8} Z`} fill={col} stroke="var(--viz-bg,#0c0c10)" strokeWidth={2.5} />
          : <rect x={vx - r} y={vy - r} width={r * 2} height={r * 2} fill={col} stroke="var(--viz-bg,#0c0c10)" strokeWidth={2.5} />;
    const label = which === 'z' ? 'z' : which === 'alpha1' ? 'α₁' : which === 'alpha2' ? 'α₂' : 'α₀';
    return (
      <g key={which} style={{ cursor: isLocked ? 'default' : 'grab' }} onPointerDown={onHandleDown(which)}>
        {!isLocked && <circle cx={vx} cy={vy} r={28} fill="transparent" />}
        {body}
        {isLocked && <circle cx={vx} cy={vy} r={r + 4} fill="none" stroke={col} strokeOpacity={0.6} strokeWidth={2} strokeDasharray="3 3" />}
        <text x={vx + 13} y={vy - 11} fontSize={19} fill={col} fontWeight={700}
          style={{ pointerEvents: 'none', userSelect: 'none' }}>{label}</text>
      </g>
    );
  };

  return (
    <div
      ref={wrapRef}
      style={{
        position: 'absolute', inset: 0,
        background: 'var(--viz-bg, #0c0c10)', overflow: 'hidden',
        touchAction: 'none',
      }}
    >
      {w > 0 && h > 0 && (
        <svg
          ref={svgRef}
          width={w}
          height={h}
          viewBox={`0 0 ${w} ${h}`}
          style={{ display: 'block', color: 'var(--fg, #e8e8ee)', fontFamily: 'var(--font-mono, monospace)' }}
          onPointerDown={onRootDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onWheel={onWheel}
          onDoubleClick={() => setCenter(cx(0, 0))}
          onContextMenu={e => e.preventDefault()}
        >
          <defs>
            {[['ah-z', Z_COL], ['ah-a1', A1_COL], ['ah-a0', A0_COL], ['ah-f', F_COL]].map(([id, col]) => (
              <marker key={id} id={id} markerWidth="10" markerHeight="10" refX="7" refY="3"
                orient="auto" markerUnits="strokeWidth">
                <path d="M0,0 L7,3 L0,6 Z" fill={col} />
              </marker>
            ))}
          </defs>

          {/* ghost identity grid (the unchanged plane) */}
          {gridOpacity > 0.001 && (
            <g stroke="currentColor" strokeOpacity={gridOpacity} strokeWidth={1.5}>
              {xLines.filter(i => i !== 0).map(i => { const [vx] = toV(cx(i, 0)); return <line key={`x${i}`} x1={vx} y1={0} x2={vx} y2={h} />; })}
              {yLines.filter(i => i !== 0).map(i => { const [, vy] = toV(cx(0, i)); return <line key={`y${i}`} x1={0} y1={vy} x2={w} y2={vy} />; })}
            </g>
          )}

          {/* the system's unit curve */}
          {unitCurveNode}

          {/* axes */}
          <g stroke="currentColor" strokeOpacity={0.45} strokeWidth={2}>
            <line x1={0} y1={oVy} x2={w} y2={oVy} />
            <line x1={oVx} y1={0} x2={oVx} y2={h} />
          </g>
          <text x={oVx + 9} y={26} fontSize={21} fill="currentColor" fillOpacity={0.5}>i</text>
          <text x={w - 24} y={oVy - 11} fontSize={21} fill="currentColor" fillOpacity={0.5}>Re</text>

          {/* ---- GRID feed: the whole coordinate grid mapped by f ---- */}
          {isGrid && (
            <>
              {/* the full image grid f(grid) — always shown */}
              <g stroke={F_COL} strokeOpacity={imageOpacity} strokeWidth={2} fill="none">
                {gridIdx.map(i => <path key={`gv${i}`} d={gridLineImage(i, false)} />)}
                {gridIdx.map(i => <path key={`gh${i}`} d={gridLineImage(i, true)} />)}
              </g>
              {/* the live grid travelling the loop — only while in motion */}
              {showMover && (
                <g stroke="#fde68a" strokeOpacity={0.8} strokeWidth={2} fill="none">
                  {gridIdx.map(i => <path key={`lv${i}`} d={gridLineLoop(i, false)} />)}
                  {gridIdx.map(i => <path key={`lh${i}`} d={gridLineLoop(i, true)} />)}
                </g>
              )}
            </>
          )}

          {/* ---- SHAPE feed: the placed shape and its image under f ---- */}
          {isShape && (
            <>
              {!quad && (
                <g stroke="#fde68a" strokeOpacity={0.28} strokeWidth={1.5} fill="none">
                  {placed.map((q, i) => {
                    if (i % Math.max(1, Math.floor(placed.length / 18)) !== 0) return null;
                    return <path key={i} d={fullPath(q)} />;
                  })}
                </g>
              )}
              <path d={vpoly(placed)} fill="none" stroke={Z_COL} strokeOpacity={0.45}
                strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
              <path d={vpoly(shapePts.map(fOf))} fill="none" stroke={F_COL}
                strokeWidth={3.5} strokeLinejoin="round" strokeLinecap="round" />
              {showMover && (
                <path d={vpoly(shapePts.map(q => quad ? polyRampAt(coeffs, q, p, triS) : affineLoopAt(q, alpha1, alpha0, p, t)))}
                  fill="none" stroke="#fde68a" strokeOpacity={0.9} strokeWidth={3}
                  strokeLinejoin="round" strokeLinecap="round" />
              )}
            </>
          )}

          {/* α₀ as a translation vector from the origin (the "shift") */}
          {(() => { const [ax, ay] = toV(alpha0); return (
            <line x1={oVx} y1={oVy} x2={ax} y2={ay} stroke={A0_COL} strokeOpacity={0.55} strokeWidth={2.5}
              strokeDasharray="5 5" markerEnd="url(#ah-a0)" />
          ); })()}

          {/* ---- ITERATION: the orbit z → f(z) → f²(z) … spiraling about z* ---- */}
          {isPoint && iterate && (
            <>
              <path d={orbitPathD} fill="none" stroke={F_COL} strokeOpacity={0.6} strokeWidth={2} strokeLinecap="round" />
              {orbitDots.map((q, kk) => {
                const [vx, vy] = toV(q);
                const op = Math.max(0.25, 0.95 - 0.6 * (kk / Math.max(1, iterN)));
                return <circle key={kk} cx={vx} cy={vy} r={kk === 0 ? 6 : 4}
                  fill={kk === 0 ? Z_COL : F_COL} fillOpacity={kk === 0 ? 1 : op} />;
              })}
              {(() => { const [fx, fy] = toV(orbitDots[1] ?? fOf(z)); return <text x={fx + 9} y={fy - 8} fontSize={16} fill={F_COL}>f(z)</text>; })()}
              {showMover && (() => { const [mx, my] = toV(orbitAt(t * iterN)); return (
                <circle cx={mx} cy={my} r={7} fill="#fde68a" stroke="var(--viz-bg,#0c0c10)" strokeWidth={2} />
              ); })()}
            </>
          )}

          {/* ---- DEGREE 1: the probe z → α₁z → f(z), and the diagonal way back ---- */}
          {(isPoint || isGrid) && !quad && !(isPoint && iterate) && (
            <>
              {/* the return route (f(z) → z), spin & shift interpolated together */}
              <path d={simulArc(z)} fill="none" stroke="#2dd4bf" strokeOpacity={0.55} strokeWidth={2.5} strokeDasharray="7 6" strokeLinecap="round" />
              {/* the two outgoing legs */}
              <path d={legPath(z, 0)} fill="none" stroke={A1_COL} strokeOpacity={0.85} strokeWidth={3} strokeLinecap="round" />
              <path d={legPath(z, 1)} fill="none" stroke={A0_COL} strokeOpacity={0.85} strokeWidth={3} strokeDasharray="2 6" strokeLinecap="round" />
              {(() => { const [wx, wy] = toV(mulG(alpha1, z, p)); return (
                <circle cx={wx} cy={wy} r={5} fill={A1_COL} fillOpacity={0.8} />
              ); })()}
              {showMover && (() => { const [mx, my] = toV(affineLoopAt(z, alpha1, alpha0, p, t)); return (
                <circle cx={mx} cy={my} r={7} fill={F_COL} stroke="var(--viz-bg,#0c0c10)" strokeWidth={2} />
              ); })()}
              {(() => { const [fx, fy] = toV(fOf(z)); return <>
                <circle cx={fx} cy={fy} r={6} fill={F_COL} />
                <text x={fx + 10} y={fy - 9} fontSize={18} fill={F_COL}>f(z)</text>
              </>; })()}
            </>
          )}

          {/* ---- DEGREE 2: Horner evaluation as a chain of ×z spirals + slides ---- */}
          {(isPoint || isGrid) && quad && !(isPoint && iterate) && (
            <>
              {isPoint && <path d={hornerPathD} fill="none" stroke={F_COL} strokeOpacity={0.55} strokeWidth={2.5} strokeLinecap="round" />}
              {isPoint && hornerPts.map((q, i) => {
                const [vx, vy] = toV(q);
                // even index = a coefficient/start node; odd = an ×z product
                const col = i === 0 ? A2_COL : i % 2 === 1 ? A1_COL : A0_COL;
                return <circle key={i} cx={vx} cy={vy} r={i === 0 ? 6 : 4} fill={col} fillOpacity={0.85} />;
              })}
              {showMover && (() => {
                const [mx, my] = toV(isPoint ? hornerAt(coeffs, z, p, t) : polyRampAt(coeffs, z, p, triS));
                return <circle cx={mx} cy={my} r={7} fill="#fde68a" stroke="var(--viz-bg,#0c0c10)" strokeWidth={2} />;
              })()}
              {(() => { const [fx, fy] = toV(fOf(z)); return <>
                <circle cx={fx} cy={fy} r={6} fill={F_COL} />
                <text x={fx + 10} y={fy - 9} fontSize={18} fill={F_COL}>f(z)</text>
              </>; })()}
            </>
          )}

          {/* ---- the critical point z = −α₁/2α₂ (the quadratic's fold) ---- */}
          {zCrit && (() => { const [cxp, cyp] = toV(zCrit); return (
            <g stroke={CRIT_COL} strokeWidth={1.5} fill="none">
              <circle cx={cxp} cy={cyp} r={5} />
              <line x1={cxp - 7} y1={cyp} x2={cxp + 7} y2={cyp} />
              <line x1={cxp} y1={cyp - 7} x2={cxp} y2={cyp + 7} />
            </g>
          ); })()}

          {/* ---- the fixed point(s) z* (where f(z*) = z*) ---- */}
          {zStars.map((zs, i) => { const [sx, sy] = toV(zs); return (
            <g key={i}>
              <circle cx={sx} cy={sy} r={6.5} fill="none" stroke={FIX_COL} strokeWidth={2} />
              <circle cx={sx} cy={sy} r={2} fill={FIX_COL} />
              <text x={sx + 9} y={sy + 20} fontSize={16} fill={FIX_COL}>z*{zStars.length > 1 ? <tspan baselineShift="sub" fontSize={11}>{i + 1}</tspan> : null}</text>
            </g>
          ); })}

          {/* draggable handles: z (input), α₁ (slope), α₀ (shift), α₂ (quadratic) */}
          {handleGlyph('z', z, Z_COL, 'circle', false)}
          {handleGlyph('alpha1', alpha1, A1_COL, 'diamond', lockA1)}
          {handleGlyph('alpha0', alpha0, A0_COL, 'square', lockA0)}
          {quad && handleGlyph('alpha2', alpha2, A2_COL, 'triangle', lockA2)}
        </svg>
      )}
    </div>
  );
}
