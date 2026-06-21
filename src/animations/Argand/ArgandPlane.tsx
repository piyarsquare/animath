import React, { useEffect, useRef, useState } from 'react';
import {
  type Cx, cx, add,
  mulG, affine, affineAt, affineSimulAt, affineLoopAt, fixedPoint, snap,
} from './complexOps';

export type Feed = 'point' | 'shape' | 'grid';
export type Handle = 'z' | 'alpha1' | 'alpha0';

/** Shared palette — handles and the equation readout use the same colors. */
export const Z_COL = '#38bdf8';   // z  — input (cyan)
export const A1_COL = '#fb923c';  // α₁ — slope / multiplier (orange)
export const A0_COL = '#c084fc';  // α₀ — shift / intercept (violet)
export const F_COL = '#34d399';   // f(z) — output (emerald)
export const FIX_COL = '#fbbf24'; // z* — fixed point (gold)

const MARGIN = 0.9;        // keep the extent inside the frame

interface Props {
  /** The input locus: the point (Point), the shape's anchor (Shape), a probe (Grid). */
  z: Cx;
  /** Coefficients of f(z) = α₁·z + α₀. */
  alpha1: Cx;
  alpha0: Cx;
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
  snapping: boolean;
  showGrid: boolean;
  showUnitCircle: boolean;
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
  z, alpha1, alpha0, p, feed, curve, t, playing, lockA1, lockA0, snapping, showGrid, showUnitCircle, extent, onChange, onZoom,
}: Props) {
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

  // Equal x/y scale (circles stay circles) from the SHORTER side, so `extent`
  // units fit there and the longer side simply shows more — the plot fills the
  // whole rectangle instead of an inscribed square.
  const k = ((Math.min(w, h) / 2) * MARGIN) / extent || 1;
  const toV = (q: Cx): [number, number] =>
    [w / 2 + (q.re - center.re) * k, h / 2 - (q.im - center.im) * k];

  const toMath = (clientX: number, clientY: number): Cx => {
    const r = svgRef.current!.getBoundingClientRect();
    const sx = w / (r.width || 1), sy = h / (r.height || 1);
    const fx = (clientX - r.left) * sx;
    const fy = (clientY - r.top) * sy;
    return cx((fx - w / 2) / k + center.re, -(fy - h / 2) / k + center.im);
  };

  const panByClient = (dxpx: number, dypx: number) => {
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
    (which === 'alpha1' && lockA1) || (which === 'alpha0' && lockA0);

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

  const fOf = (q: Cx): Cx => affine(q, alpha1, alpha0, p);
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

  // Shape feed: the base shape anchored at z, and its image under f.
  const placed = curve.map(pt => add(pt, z));

  // Visible half-spans in math units (the rectangle can show more than `extent`
  // along its longer side).
  const halfX = w > 0 ? (w / 2) / k : extent;
  const halfY = h > 0 ? (h / 2) / k : extent;

  // Integer grid lines (ghost identity grid, panning with center).
  const xLines: number[] = [];
  for (let i = Math.ceil(center.re - halfX); i <= Math.floor(center.re + halfX); i++) xLines.push(i);
  const yLines: number[] = [];
  for (let i = Math.ceil(center.im - halfY); i <= Math.floor(center.im + halfY); i++) yLines.push(i);

  // Grid feed: a complete origin-centered lattice mapped by f at param s. Affine
  // ⇒ straight lines stay straight, so mapping the two endpoints is exact.
  const reach = Math.max(halfX, halfY) + Math.abs(center.re) + Math.abs(center.im) + 2;
  const GN = Math.ceil(reach);
  const gridIdx: number[] = [];
  for (let i = -GN; i <= GN; i++) gridIdx.push(i);
  const gridEnds = (i: number, horizontal: boolean): [Cx, Cx] =>
    horizontal ? [cx(-GN, i), cx(GN, i)] : [cx(i, -GN), cx(i, GN)];
  // the full image grid f(grid) — always shown (the complete story)
  const gridLineImage = (i: number, horizontal: boolean): string => {
    const [p0, p1] = gridEnds(i, horizontal);
    const [x1, y1] = toV(fOf(p0)); const [x2, y2] = toV(fOf(p1));
    return `M ${x1.toFixed(1)} ${y1.toFixed(1)} L ${x2.toFixed(1)} ${y2.toFixed(1)}`;
  };
  // the live grid travelling the loop — only while in motion
  const gridLineLoop = (i: number, horizontal: boolean, phi: number): string => {
    const [p0, p1] = gridEnds(i, horizontal);
    const [x1, y1] = toV(affineLoopAt(p0, alpha1, alpha0, p, phi));
    const [x2, y2] = toV(affineLoopAt(p1, alpha1, alpha0, p, phi));
    return `M ${x1.toFixed(1)} ${y1.toFixed(1)} L ${x2.toFixed(1)} ${y2.toFixed(1)}`;
  };

  const [oVx, oVy] = toV(cx(0, 0));
  const zStar = fixedPoint(alpha1, alpha0, p);

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
  const handleGlyph = (which: Handle, q: Cx, col: string, shape: 'circle' | 'diamond' | 'square', isLocked: boolean) => {
    const [vx, vy] = toV(q);
    const r = 13;
    const body = shape === 'circle'
      ? <circle cx={vx} cy={vy} r={r} fill={col} stroke="var(--viz-bg,#0c0c10)" strokeWidth={3} />
      : shape === 'diamond'
        ? <rect x={vx - r} y={vy - r} width={r * 2} height={r * 2} transform={`rotate(45 ${vx} ${vy})`} fill={col} stroke="var(--viz-bg,#0c0c10)" strokeWidth={3} />
        : <rect x={vx - r} y={vy - r} width={r * 2} height={r * 2} fill={col} stroke="var(--viz-bg,#0c0c10)" strokeWidth={3} />;
    const label = which === 'z' ? 'z' : which === 'alpha1' ? 'α₁' : 'α₀';
    return (
      <g key={which} style={{ cursor: isLocked ? 'default' : 'grab' }} onPointerDown={onHandleDown(which)}>
        {!isLocked && <circle cx={vx} cy={vy} r={30} fill="transparent" />}
        {body}
        {isLocked && <circle cx={vx} cy={vy} r={r + 5} fill="none" stroke={col} strokeOpacity={0.6} strokeWidth={2} strokeDasharray="3 3" />}
        <text x={vx + 17} y={vy - 13} fontSize={24} fill={col} fontWeight={700}
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
          {showGrid && (
            <g stroke="currentColor" strokeOpacity={0.18} strokeWidth={1.5}>
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
          <text x={oVx + 10} y={28} fontSize={26} fill="currentColor" fillOpacity={0.5}>i</text>
          <text x={w - 26} y={oVy - 12} fontSize={26} fill="currentColor" fillOpacity={0.5}>Re</text>

          {/* ---- GRID feed: the whole coordinate grid mapped by f ---- */}
          {isGrid && (
            <>
              {/* the full image grid f(grid) — always shown */}
              <g stroke={F_COL} strokeOpacity={0.5} strokeWidth={2} fill="none">
                {gridIdx.map(i => <path key={`gv${i}`} d={gridLineImage(i, false)} />)}
                {gridIdx.map(i => <path key={`gh${i}`} d={gridLineImage(i, true)} />)}
              </g>
              {/* the live grid travelling the loop — only while in motion */}
              {showMover && (
                <g stroke="#fde68a" strokeOpacity={0.8} strokeWidth={2} fill="none">
                  {gridIdx.map(i => <path key={`lv${i}`} d={gridLineLoop(i, false, t)} />)}
                  {gridIdx.map(i => <path key={`lh${i}`} d={gridLineLoop(i, true, t)} />)}
                </g>
              )}
            </>
          )}

          {/* ---- SHAPE feed: the placed shape and its image under f ---- */}
          {isShape && (
            <>
              <g stroke="#fde68a" strokeOpacity={0.28} strokeWidth={1.5} fill="none">
                {placed.map((q, i) => {
                  if (i % Math.max(1, Math.floor(placed.length / 18)) !== 0) return null;
                  return <path key={i} d={fullPath(q)} />;
                })}
              </g>
              <path d={vpoly(placed)} fill="none" stroke={Z_COL} strokeOpacity={0.45}
                strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
              <path d={vpoly(placed.map(fOf))} fill="none" stroke={F_COL}
                strokeWidth={3.5} strokeLinejoin="round" strokeLinecap="round" />
              {showMover && (
                <path d={vpoly(placed.map(q => affineLoopAt(q, alpha1, alpha0, p, t)))}
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

          {/* ---- the probe point z → α₁z → f(z), and the diagonal way back ---- */}
          {(isPoint || isGrid) && (
            <>
              {/* the return route (f(z) → z), spin & shift interpolated together */}
              <path d={simulArc(z)} fill="none" stroke="#2dd4bf" strokeOpacity={0.55} strokeWidth={2.5} strokeDasharray="7 6" strokeLinecap="round" />
              {/* the two outgoing legs */}
              <path d={legPath(z, 0)} fill="none" stroke={A1_COL} strokeOpacity={0.85} strokeWidth={3} strokeLinecap="round" />
              <path d={legPath(z, 1)} fill="none" stroke={A0_COL} strokeOpacity={0.85} strokeWidth={3} strokeDasharray="2 6" strokeLinecap="round" />
              {/* the ×α₁ waypoint */}
              {(() => { const [wx, wy] = toV(mulG(alpha1, z, p)); return (
                <circle cx={wx} cy={wy} r={6} fill={A1_COL} fillOpacity={0.8} />
              ); })()}
              {/* the moving point (around the closed loop) */}
              {showMover && (() => { const [mx, my] = toV(affineLoopAt(z, alpha1, alpha0, p, t)); return (
                <circle cx={mx} cy={my} r={9} fill={F_COL} stroke="var(--viz-bg,#0c0c10)" strokeWidth={2} />
              ); })()}
              {/* the output f(z) */}
              {(() => { const [fx, fy] = toV(fOf(z)); return <>
                <circle cx={fx} cy={fy} r={7} fill={F_COL} />
                <text x={fx + 12} y={fy - 10} fontSize={22} fill={F_COL}>f(z)</text>
              </>; })()}
            </>
          )}

          {/* ---- the fixed point z* (where f(z*) = z*) ---- */}
          {zStar && (() => { const [sx, sy] = toV(zStar); return (
            <g>
              <circle cx={sx} cy={sy} r={8} fill="none" stroke={FIX_COL} strokeWidth={2.5} />
              <circle cx={sx} cy={sy} r={2.5} fill={FIX_COL} />
              <text x={sx + 11} y={sy + 24} fontSize={20} fill={FIX_COL}>z*</text>
            </g>
          ); })()}

          {/* draggable handles: z (input), α₁ (slope), α₀ (shift) */}
          {handleGlyph('z', z, Z_COL, 'circle', false)}
          {handleGlyph('alpha1', alpha1, A1_COL, 'diamond', lockA1)}
          {handleGlyph('alpha0', alpha0, A0_COL, 'square', lockA0)}
        </svg>
      )}
    </div>
  );
}
