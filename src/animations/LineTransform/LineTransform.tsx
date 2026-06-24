import React, { useEffect, useRef, useState } from 'react';
import { usePersistentState } from '../../lib/usePersistentState';

/**
 * LineTransform — the simplest possible view of a linear transformation of the
 * real line: one number line, the input **x** and output **y** above it, the
 * slope **m** and shift **b** below it. Drag x, m, or b and watch
 *
 *     y = m·x + b
 *
 * move: m stretches/flips, b slides. Deliberately minimal — no panels, no plane,
 * no chrome beyond a Home link. The 1-D ground floor under the Argand / Number
 * Planes app.
 */

const X_COL = '#38bdf8';   // input  (cyan)
const Y_COL = '#34d399';   // output (emerald)
const M_COL = '#fb923c';   // slope  (orange)
const B_COL = '#c084fc';   // shift  (violet)

type Handle = 'x' | 'm' | 'b';

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

const tidy = (n: number) => {
  const r = Math.round(n * 10) / 10;
  return Object.is(r, -0) ? 0 : r;
};
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

export default function LineTransform() {
  const [x, setX] = usePersistentState('line-transform:x', 1);
  const [m, setM] = usePersistentState('line-transform:m', 2);
  const [b, setB] = usePersistentState('line-transform:b', 1);

  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<Handle | null>(null);
  const { w, h } = useSize(wrapRef);

  const y = m * x + b;

  // Fit ~[-EXT, EXT] across the width; the line sits at vertical center.
  const EXT = 10;
  const margin = 56;
  const k = w > 0 ? (w - 2 * margin) / (2 * EXT) : 1;
  const cy = Math.round(h / 2);
  const toX = (v: number) => w / 2 + v * k;
  const toV = (clientX: number) => {
    const r = svgRef.current!.getBoundingClientRect();
    return (clientX - r.left - w / 2) / k;
  };

  const onDown = (which: Handle) => (e: React.PointerEvent) => {
    e.stopPropagation();
    drag.current = which;
    svgRef.current?.setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const v = tidy(toV(e.clientX));
    if (drag.current === 'x') setX(v);
    else if (drag.current === 'm') setM(v);
    else setB(v);
  };
  const onUp = (e: React.PointerEvent) => {
    drag.current = null;
    svgRef.current?.releasePointerCapture(e.pointerId);
  };

  // Integer ticks across the visible range.
  const ticks: number[] = [];
  for (let i = -EXT; i <= EXT; i++) ticks.push(i);

  const ABOVE = 52;   // px above the axis for x / y
  const BELOW = 52;   // px below the axis for m / b

  /** A labeled handle sitting `dy` from the axis (negative = above). */
  const marker = (which: Handle | 'y', value: number, col: string, label: string, dy: number) => {
    const hx = toX(value);
    const my = cy + dy;
    const draggable = which !== 'y';
    const labelAbove = dy < 0;
    return (
      <g key={label} style={{ cursor: draggable ? 'grab' : 'default' }} onPointerDown={draggable ? onDown(which as Handle) : undefined}>
        <line x1={hx} y1={cy} x2={hx} y2={my} stroke={col} strokeOpacity={0.5} strokeWidth={2} />
        {draggable && <circle cx={hx} cy={my} r={22} fill="transparent" />}
        <circle cx={hx} cy={my} r={9} fill={col} stroke="var(--viz-bg, #0c0c10)" strokeWidth={2.5} />
        <text x={hx} y={my + (labelAbove ? -16 : 26)} fontSize={17} fontWeight={700} fill={col} textAnchor="middle" style={{ userSelect: 'none' }}>{label}</text>
        <text x={hx} y={my + (labelAbove ? -34 : 42)} fontSize={12} fill={col} fillOpacity={0.75} textAnchor="middle" style={{ userSelect: 'none' }}>{fmt(value)}</text>
      </g>
    );
  };

  return (
    <div ref={wrapRef} style={{ position: 'fixed', inset: 0, background: 'var(--viz-bg, #0c0c10)', color: 'var(--fg, #e8e8ee)', fontFamily: 'var(--font-mono, monospace)', touchAction: 'none', overflow: 'hidden' }}>
      {/* Home */}
      <a href="#/" style={{ position: 'absolute', left: 16, top: 14, zIndex: 5, fontSize: 13, color: 'var(--fg, #e8e8ee)', textDecoration: 'none', opacity: 0.7 }}>← animath</a>

      {/* equation */}
      <div style={{ position: 'absolute', left: '50%', top: 16, transform: 'translateX(-50%)', zIndex: 5, textAlign: 'center' }}>
        <div style={{ fontSize: 20, fontWeight: 700 }}>
          <span style={{ color: Y_COL }}>y</span> = <span style={{ color: M_COL }}>m</span>·<span style={{ color: X_COL }}>x</span> + <span style={{ color: B_COL }}>b</span>
        </div>
        <div style={{ fontSize: 14, opacity: 0.8, marginTop: 2 }}>
          <span style={{ color: Y_COL }}>{fmt(y)}</span> = <span style={{ color: M_COL }}>{fmt(m)}</span>·<span style={{ color: X_COL }}>{fmt(x)}</span> + <span style={{ color: B_COL }}>{fmt(b)}</span>
        </div>
      </div>

      {w > 0 && h > 0 && (
        <svg ref={svgRef} width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}
          onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          {/* the number line */}
          <line x1={margin / 2} y1={cy} x2={w - margin / 2} y2={cy} stroke="currentColor" strokeOpacity={0.5} strokeWidth={2} />
          {/* ticks + integer labels */}
          <g stroke="currentColor" strokeOpacity={0.3}>
            {ticks.map(i => <line key={i} x1={toX(i)} y1={cy - 6} x2={toX(i)} y2={cy + 6} strokeWidth={i === 0 ? 2.5 : 1.5} />)}
          </g>
          <g fill="currentColor" fillOpacity={0.5} fontSize={12} textAnchor="middle">
            {ticks.filter(i => i !== 0).map(i => <text key={i} x={toX(i)} y={cy + 22}>{i}</text>)}
          </g>

          {/* the map x → y, drawn as a faint arc above the line */}
          {(() => {
            const x1 = toX(x), x2 = toX(y);
            const arcY = cy - ABOVE - 26;
            return <path d={`M ${x1} ${cy - ABOVE} Q ${(x1 + x2) / 2} ${arcY} ${x2} ${cy - ABOVE}`} fill="none" stroke="var(--fg, #e8e8ee)" strokeOpacity={0.25} strokeWidth={1.5} strokeDasharray="4 5" />;
          })()}

          {/* x and y above the line; m and b below it */}
          {marker('x', x, X_COL, 'x', -ABOVE)}
          {marker('y', y, Y_COL, 'y', -ABOVE)}
          {marker('m', m, M_COL, 'm', BELOW)}
          {marker('b', b, B_COL, 'b', BELOW)}
        </svg>
      )}

      <div style={{ position: 'absolute', left: '50%', bottom: 18, transform: 'translateX(-50%)', fontSize: 12, opacity: 0.6 }}>
        drag <span style={{ color: X_COL }}>x</span> · <span style={{ color: M_COL }}>m</span> · <span style={{ color: B_COL }}>b</span>
      </div>
    </div>
  );
}
