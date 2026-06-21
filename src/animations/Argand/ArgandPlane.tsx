import React, { useEffect, useRef, useState } from 'react';
import {
  type Cx, cx, add, mul, argument, fromPolar,
  mulPath, addPath, cycleSweep, snap,
} from './complexOps';

export type Mode = 'multiply' | 'add';
export type Subject = 'number' | 'curve' | 'plane';

/** Handle / result colors — chosen to read on both light and dark viz-bg skins. */
const A_COL = '#38bdf8';   // a — cyan
const B_COL = '#fb923c';   // b — orange
const R_COL = '#34d399';   // result — emerald

const VIRT = 1000;         // virtual viewBox side
const C = VIRT / 2;        // origin in virtual coords
const MARGIN = 0.9;        // keep the extent inside the frame

interface Props {
  a: Cx;
  b: Cx;
  mode: Mode;
  /** number: combine two numbers a,b · curve: transform a placed shape by b. */
  subject: Subject;
  /** Base curve points (centered near origin) for the curve subject. */
  curve: Cx[];
  /** Scrub parameter 0→1 along the chapter's path. */
  t: number;
  /** True while the path is being animated (ping-ponging). */
  playing: boolean;
  /** Show the second composition order (commutativity / parallelogram). */
  showSecondRoute: boolean;
  snapping: boolean;
  showGrid: boolean;
  showUnitCircle: boolean;
  /** Half-extent of the visible plane in math units. */
  extent: number;
  onChange: (which: 'a' | 'b', z: Cx) => void;
  /** Multiply the extent by `factor` (pinch / wheel zoom). */
  onZoom?: (factor: number) => void;
}

/** Track the largest inscribed square of the view body (the SVG is square). */
function useSquareSize(ref: React.RefObject<HTMLDivElement>) {
  const [side, setSide] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      setSide(Math.max(0, Math.floor(Math.min(r.width, r.height))));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return side;
}

export default function ArgandPlane({
  a, b, mode, subject, curve, t, playing, showSecondRoute, snapping, showGrid, showUnitCircle, extent, onChange, onZoom,
}: Props) {
  const isCurve = subject === 'curve';
  const isPlane = subject === 'plane';
  // The moving marker/sweep appears only while in motion (playing) or when the
  // user has parked the scrub mid-path; at rest (t at an endpoint) only the full
  // arc shows — the static "story" Dan asked to always be complete.
  const showMover = playing || (t > 0.01 && t < 0.99);
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<'a' | 'b' | null>(null);
  const side = useSquareSize(wrapRef);

  // Pan offset: the math point shown at the middle of the view. Transient view
  // state (like a camera) — never persisted.
  const [center, setCenter] = useState<Cx>(cx(0, 0));

  // Multi-pointer bookkeeping for pinch-zoom / two-finger (or shift/right-drag) pan.
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const gesture = useRef<{ dist: number; mx: number; my: number } | null>(null);
  const panning = useRef<{ x: number; y: number } | null>(null);

  const k = (C * MARGIN) / extent;                 // math → virtual scale
  const toV = (z: Cx): [number, number] =>
    [C + (z.re - center.re) * k, C - (z.im - center.im) * k];

  /** Client pixel → math coordinate (inverting the square SVG mapping). */
  const toMath = (clientX: number, clientY: number): Cx => {
    const r = svgRef.current!.getBoundingClientRect();
    const s = VIRT / (r.width || 1);
    const fx = (clientX - r.left) * s;
    const fy = (clientY - r.top) * s;
    return cx((fx - C) / k + center.re, -(fy - C) / k + center.im);
  };

  /** Shift the view by a client-pixel delta, so content follows the fingers. */
  const panByClient = (dxpx: number, dypx: number) => {
    const r = svgRef.current?.getBoundingClientRect();
    const s = VIRT / (r?.width || 1);
    setCenter(c => cx(c.re - (dxpx * s) / k, c.im + (dypx * s) / k));
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

  // Handle drag begins here; stopPropagation keeps the root from treating it as
  // a pan. A second pointer promotes to a pinch/pan gesture.
  const onHandleDown = (which: 'a' | 'b') => (e: React.PointerEvent) => {
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
    // desktop pan: right-button or shift+drag on empty plane.
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
      let z = toMath(e.clientX, e.clientY);
      if (snapping) z = snap(z);
      onChange(dragRef.current, z);
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

  // The result and the two construction routes.
  const result = mode === 'multiply' ? mul(a, b) : add(a, b);
  const path = (s: number, primary: boolean): Cx =>
    mode === 'multiply'
      ? (primary ? mulPath(a, b, s) : mulPath(b, a, s))
      : (primary ? addPath(a, b, s) : addPath(b, a, s));

  const sampleRoute = (primary: boolean): string => {
    const n = mode === 'multiply' ? 48 : 1;
    const pts: string[] = [];
    for (let i = 0; i <= n; i++) {
      const [vx, vy] = toV(path(i / n, primary));
      pts.push(`${i === 0 ? 'M' : 'L'} ${vx.toFixed(1)} ${vy.toFixed(1)}`);
    }
    return pts.join(' ');
  };

  const mover1 = toV(path(t, true));
  const mover2 = toV(path(t, false));

  // Sector path for an angle wedge (math angles → virtual sector).
  const sector = (rho: number, p0: number, p1: number): string => {
    const n = 28;
    let d = `M ${C} ${C}`;
    for (let i = 0; i <= n; i++) {
      const phi = p0 + (p1 - p0) * (i / n);
      const [vx, vy] = toV(fromPolar(rho, phi));
      d += ` L ${vx.toFixed(1)} ${vy.toFixed(1)}`;
    }
    return d + ' Z';
  };

  // Curve subject: the placed shape (base translated by a) and its image under
  // the constant b at scrub param t (b·q spirals / q+b slides, per point).
  const placed = curve.map(p => add(p, a));
  const imageAt = (q: Cx, s: number): Cx =>
    mode === 'multiply' ? mulPath(q, b, s) : addPath(q, b, s);
  const vpoly = (pts: Cx[]): string =>
    pts.map((p, i) => {
      const [vx, vy] = toV(p);
      return `${i === 0 ? 'M' : 'L'} ${vx.toFixed(1)} ${vy.toFixed(1)}`;
    }).join(' ');

  // Integer grid lines spanning the visible window (which pans with center).
  const xLines: number[] = [];
  for (let i = Math.ceil(center.re - extent); i <= Math.floor(center.re + extent); i++) xLines.push(i);
  const yLines: number[] = [];
  for (let i = Math.ceil(center.im - extent); i <= Math.floor(center.im + extent); i++) yLines.push(i);

  // Plane subject: a complete origin-centered lattice whose endpoints we map by
  // the (linear) operation. Because z↦z·b and z↦z+b are linear, straight grid
  // lines stay straight — so transforming the two endpoints is exact and cheap.
  const GN = Math.ceil(extent) + 2;
  const gridIdx: number[] = [];
  for (let i = -GN; i <= GN; i++) gridIdx.push(i);
  const gridLine = (i: number, horizontal: boolean, s: number): string => {
    const p0 = horizontal ? cx(-GN, i) : cx(i, -GN);
    const p1 = horizontal ? cx(GN, i) : cx(i, GN);
    const [x1, y1] = toV(imageAt(p0, s));
    const [x2, y2] = toV(imageAt(p1, s));
    return `M ${x1.toFixed(1)} ${y1.toFixed(1)} L ${x2.toFixed(1)} ${y2.toFixed(1)}`;
  };

  const [oVx, oVy] = toV(cx(0, 0));
  const va = toV(a), vb = toV(b), vr = toV(result);

  const argA = argument(a);
  const argB = argument(b);

  return (
    <div
      ref={wrapRef}
      style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--viz-bg, #0c0c10)', overflow: 'hidden',
        touchAction: 'none',
      }}
    >
      {side > 0 && (
        <svg
          ref={svgRef}
          width={side}
          height={side}
          viewBox={`0 0 ${VIRT} ${VIRT}`}
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
            {[['ah-a', A_COL], ['ah-b', B_COL], ['ah-r', R_COL]].map(([id, col]) => (
              <marker key={id} id={id} markerWidth="10" markerHeight="10" refX="7" refY="3"
                orient="auto" markerUnits="strokeWidth">
                <path d="M0,0 L7,3 L0,6 Z" fill={col} />
              </marker>
            ))}
          </defs>

          {/* grid */}
          {showGrid && (
            <g stroke="currentColor" strokeOpacity={0.08} strokeWidth={1.5}>
              {xLines.filter(i => i !== 0).map(i => {
                const [vx] = toV(cx(i, 0));
                return <line key={`x${i}`} x1={vx} y1={0} x2={vx} y2={VIRT} />;
              })}
              {yLines.filter(i => i !== 0).map(i => {
                const [, vy] = toV(cx(0, i));
                return <line key={`y${i}`} x1={0} y1={vy} x2={VIRT} y2={vy} />;
              })}
            </g>
          )}

          {/* unit circle */}
          {showUnitCircle && (
            <circle cx={oVx} cy={oVy} r={k} fill="none" stroke="currentColor"
              strokeOpacity={0.28} strokeWidth={2} strokeDasharray="6 8" />
          )}

          {/* axes */}
          <g stroke="currentColor" strokeOpacity={0.45} strokeWidth={2}>
            <line x1={0} y1={oVy} x2={VIRT} y2={oVy} />
            <line x1={oVx} y1={0} x2={oVx} y2={VIRT} />
          </g>
          <text x={oVx + 10} y={28} fontSize={26} fill="currentColor" fillOpacity={0.5}>i</text>
          <text x={VIRT - 22} y={oVy - 12} fontSize={26} fill="currentColor" fillOpacity={0.5}>Re</text>

          {/* ---- PLANE subject: the whole coordinate grid morphs by the op ---- */}
          {isPlane && (
            <>
              {/* the live morphed grid (z ↦ z·bᵗ spirals every line; z+t·b slides
                  it rigidly). The faint identity grid above is the ghost it came
                  from — so you see "multiply by b" rotate-and-scale the plane. */}
              <g stroke={R_COL} strokeOpacity={0.5} strokeWidth={2} fill="none">
                {gridIdx.map(i => <path key={`pv${i}`} d={gridLine(i, false, t)} />)}
                {gridIdx.map(i => <path key={`ph${i}`} d={gridLine(i, true, t)} />)}
              </g>
              {/* the probe number a riding the morph: its honest route + marker */}
              <path d={sampleRoute(true)} fill="none" stroke={A_COL}
                strokeOpacity={0.7} strokeWidth={3} strokeDasharray="2 7" strokeLinecap="round" />
              <line x1={oVx} y1={oVy} x2={vb[0]} y2={vb[1]} stroke={B_COL} strokeWidth={4} markerEnd="url(#ah-b)" />
              <circle cx={mover1[0]} cy={mover1[1]} r={10} fill={A_COL} stroke="var(--viz-bg,#0c0c10)" strokeWidth={2} />
              <text x={mover1[0] + 12} y={mover1[1] - 10} fontSize={22} fill={A_COL}>
                {mode === 'multiply' ? 'a·bᵗ' : 'a+tb'}
              </text>
            </>
          )}

          {/* ---- NUMBER subject: a ∘ b with the construction routes ---- */}
          {!isCurve && !isPlane && (
            <>
              {/* angle wedges (multiply): arg a, then arg b on top, to show angles add */}
              {mode === 'multiply' && (
                <>
                  <path d={sector(extent * 0.32, 0, argA)} fill={A_COL} fillOpacity={0.16} />
                  <path d={sector(extent * 0.46, argA, argA + argB)} fill={B_COL} fillOpacity={0.18} />
                </>
              )}

              {/* construction routes */}
              {showSecondRoute && (
                <path d={sampleRoute(false)} fill="none" stroke={R_COL}
                  strokeOpacity={0.4} strokeWidth={3} strokeDasharray="4 8" strokeLinecap="round" />
              )}
              <path d={sampleRoute(true)} fill="none" stroke={R_COL}
                strokeOpacity={0.7} strokeWidth={3.5} strokeLinecap="round" />

              {/* the scrubbing point(s) — only while in motion, so a stopped
                  state shows the full arc with no partial-looking marker */}
              {showMover && showSecondRoute && <circle cx={mover2[0]} cy={mover2[1]} r={9} fill={R_COL} fillOpacity={0.55} />}
              {showMover && <circle cx={mover1[0]} cy={mover1[1]} r={11} fill={R_COL} stroke="var(--viz-bg,#0c0c10)" strokeWidth={2} />}

              {/* vectors to a, b, result */}
              <line x1={oVx} y1={oVy} x2={va[0]} y2={va[1]} stroke={A_COL} strokeWidth={4} markerEnd="url(#ah-a)" />
              <line x1={oVx} y1={oVy} x2={vb[0]} y2={vb[1]} stroke={B_COL} strokeWidth={4} markerEnd="url(#ah-b)" />
              <line x1={oVx} y1={oVy} x2={vr[0]} y2={vr[1]} stroke={R_COL} strokeWidth={2.5}
                strokeOpacity={0.85} markerEnd="url(#ah-r)" />

              {/* parallelogram closure for addition */}
              {mode === 'add' && (
                <g stroke="currentColor" strokeOpacity={0.25} strokeWidth={2} strokeDasharray="5 7" fill="none">
                  <line x1={va[0]} y1={va[1]} x2={vr[0]} y2={vr[1]} />
                  <line x1={vb[0]} y1={vb[1]} x2={vr[0]} y2={vr[1]} />
                </g>
              )}

              {/* result label */}
              <circle cx={vr[0]} cy={vr[1]} r={6} fill={R_COL} />
              <text x={vr[0] + 12} y={vr[1] - 10} fontSize={24} fill={R_COL}>
                {mode === 'multiply' ? 'a·b' : 'a+b'}
              </text>
            </>
          )}

          {/* ---- CURVE subject: the placed shape and its image under b ---- */}
          {isCurve && (
            <>
              {/* per-vertex connectors (original → full image) */}
              <g stroke="currentColor" strokeOpacity={0.12} strokeWidth={1.5}>
                {placed.map((q, i) => {
                  if (i % Math.max(1, Math.floor(placed.length / 18)) !== 0) return null;
                  const [x1, y1] = toV(q);
                  const [x2, y2] = toV(imageAt(q, 1));
                  return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />;
                })}
              </g>
              {/* original shape (dim) */}
              <path d={vpoly(placed)} fill="none" stroke={A_COL} strokeOpacity={0.4}
                strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
              {/* the FULL image — always shown, so a stopped state is the whole story */}
              <path d={vpoly(placed.map(q => imageAt(q, 1)))} fill="none" stroke={R_COL}
                strokeWidth={3.5} strokeLinejoin="round" strokeLinecap="round" />
              {/* the moving in-between sweep — only while in motion. For
                  multiply this is the unified two-factor loop (q → q·b → b →
                  q·b → q): the shape spirals to its image, then the WHOLE shape
                  collapses onto the point b and back, showing both
                  "shape × point" and "point × shape". */}
              {showMover && (
                <path
                  d={vpoly(placed.map(q => mode === 'multiply' ? cycleSweep(q, b, t) : addPath(q, b, t)))}
                  fill="none" stroke="#fde68a"
                  strokeOpacity={0.9} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
              )}
              {/* the constant b */}
              <line x1={oVx} y1={oVy} x2={vb[0]} y2={vb[1]} stroke={B_COL} strokeWidth={4} markerEnd="url(#ah-b)" />
            </>
          )}

          {/* draggable handles (large invisible hit area + visible dot) */}
          {([['a', va, A_COL, a], ['b', vb, B_COL, b]] as const).map(([id, v, col]) => (
            <g key={id} style={{ cursor: 'grab' }} onPointerDown={onHandleDown(id)}>
              <circle cx={v[0]} cy={v[1]} r={30} fill="transparent" />
              <circle cx={v[0]} cy={v[1]} r={13} fill={col} stroke="var(--viz-bg,#0c0c10)" strokeWidth={3} />
              <text x={v[0] + 16} y={v[1] - 14} fontSize={26} fill={col} fontWeight={700}
                style={{ pointerEvents: 'none', userSelect: 'none' }}>{id}</text>
            </g>
          ))}
        </svg>
      )}
    </div>
  );
}
