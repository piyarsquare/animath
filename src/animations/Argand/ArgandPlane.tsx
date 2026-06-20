import React, { useEffect, useRef, useState } from 'react';
import {
  type Cx, cx, add, mul, argument, fromPolar,
  mulPath, addPath, snap,
} from './complexOps';

export type Mode = 'multiply' | 'add';

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
  /** Scrub parameter 0→1 along the chapter's path. */
  t: number;
  /** Show the second composition order (commutativity / parallelogram). */
  showSecondRoute: boolean;
  snapping: boolean;
  showGrid: boolean;
  showUnitCircle: boolean;
  /** Half-extent of the visible plane in math units. */
  extent: number;
  onChange: (which: 'a' | 'b', z: Cx) => void;
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
  a, b, mode, t, showSecondRoute, snapping, showGrid, showUnitCircle, extent, onChange,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<'a' | 'b' | null>(null);
  const side = useSquareSize(wrapRef);

  const k = (C * MARGIN) / extent;                 // math → virtual scale
  const toV = (z: Cx): [number, number] => [C + z.re * k, C - z.im * k];

  /** Client pixel → math coordinate (inverting the square SVG mapping). */
  const toMath = (clientX: number, clientY: number): Cx => {
    const r = svgRef.current!.getBoundingClientRect();
    const s = VIRT / (r.width || 1);
    const fx = (clientX - r.left) * s;
    const fy = (clientY - r.top) * s;
    return cx((fx - C) / k, -(fy - C) / k);
  };

  const onPointerDown = (which: 'a' | 'b') => (e: React.PointerEvent) => {
    e.preventDefault();
    dragRef.current = which;
    svgRef.current?.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    let z = toMath(e.clientX, e.clientY);
    if (snapping) z = snap(z);
    onChange(dragRef.current, z);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    dragRef.current = null;
    svgRef.current?.releasePointerCapture(e.pointerId);
  };

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

  const gridLines: number[] = [];
  for (let i = Math.ceil(-extent); i <= Math.floor(extent); i++) gridLines.push(i);

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
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
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
          {showGrid && gridLines.map(i => {
            const [, vy] = toV(cx(0, i));
            const [vx] = toV(cx(i, 0));
            return (
              <g key={`g${i}`} stroke="currentColor" strokeOpacity={i === 0 ? 0 : 0.08} strokeWidth={1.5}>
                <line x1={0} y1={vy} x2={VIRT} y2={vy} />
                <line x1={vx} y1={0} x2={vx} y2={VIRT} />
              </g>
            );
          })}

          {/* unit circle */}
          {showUnitCircle && (
            <circle cx={C} cy={C} r={k} fill="none" stroke="currentColor"
              strokeOpacity={0.28} strokeWidth={2} strokeDasharray="6 8" />
          )}

          {/* axes */}
          <g stroke="currentColor" strokeOpacity={0.45} strokeWidth={2}>
            <line x1={0} y1={C} x2={VIRT} y2={C} />
            <line x1={C} y1={0} x2={C} y2={VIRT} />
          </g>
          <text x={C + 10} y={28} fontSize={26} fill="currentColor" fillOpacity={0.5}>i</text>
          <text x={VIRT - 22} y={C - 12} fontSize={26} fill="currentColor" fillOpacity={0.5}>Re</text>

          {/* angle wedges (multiply): arg a, then arg b stacked on top to show angles add */}
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

          {/* the scrubbing point(s) */}
          {showSecondRoute && <circle cx={mover2[0]} cy={mover2[1]} r={9} fill={R_COL} fillOpacity={0.55} />}
          <circle cx={mover1[0]} cy={mover1[1]} r={11} fill={R_COL} stroke="var(--viz-bg,#0c0c10)" strokeWidth={2} />

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

          {/* draggable handles (large invisible hit area + visible dot) */}
          {([['a', va, A_COL, a], ['b', vb, B_COL, b]] as const).map(([id, v, col]) => (
            <g key={id} style={{ cursor: 'grab' }} onPointerDown={onPointerDown(id)}>
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
