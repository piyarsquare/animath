// Value-plot atoms for the "Circular sums" tab. A circular summation is any scalar
// read off the distance matrix by walking the leaves in a circular order — here the
// tour energy (the Hamiltonian-cycle length). ValuePlot shows that scalar across
// many orders as bars (low = a tighter tour); CircleTour draws one order as the
// closed walk it sums. Both track the theme via the shared weight colormap.

import React from 'react';
import type { DistanceMatrix } from '../lib/metric';
import { useNetColors } from './themeColors';

export interface PlotValue {
  key: string;
  label: string;
  value: number;
}

/** Bars of a scalar over a list of configurations. Lower = warmer/taller-salient;
 *  the minimum is outlined, the selected bar is filled with the highlight. */
export function ValuePlot({
  values, selectedKey, minKey, onSelect,
}: {
  values: PlotValue[];
  selectedKey?: string;
  minKey?: string;
  onSelect?: (key: string) => void;
}): JSX.Element {
  const col = useNetColors();
  if (values.length === 0) return <div style={{ fontSize: 12, color: 'var(--fg, #aab)', opacity: 0.7 }}>—</div>;
  const vs = values.map((v) => v.value);
  const lo = Math.min(...vs);
  const hi = Math.max(...vs);
  const span = hi - lo || 1;
  const W = values.length;
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateRows: '1fr auto', padding: 10, gap: 6 }}>
      <svg viewBox={`0 0 ${W} 100`} preserveAspectRatio="none" width="100%" height="100%" style={{ overflow: 'visible' }}>
        {values.map((v, i) => {
          // t∈[0,1] over the range; low energy → t≈0 → the salient (bright) end.
          const t = (v.value - lo) / span;
          const h = 6 + 90 * (1 - t); // lower value → taller bar
          const on = v.key === selectedKey;
          const isMin = v.key === minKey;
          return (
            <rect key={v.key} x={i + 0.1} y={100 - h} width={0.8} height={h}
              fill={on ? col.highlight : col.ramp(1 - t)}
              stroke={isMin ? col.highlight : 'none'} strokeWidth={isMin ? 0.4 : 0}
              vectorEffect="non-scaling-stroke"
              style={{ cursor: onSelect ? 'pointer' : 'default' }}
              onClick={onSelect ? () => onSelect(v.key) : undefined}>
              <title>{`${v.label}: ${v.value.toFixed(2)}`}</title>
            </rect>
          );
        })}
      </svg>
      <div style={{ fontFamily: 'var(--mono, monospace)', fontSize: 11, color: 'var(--fg, #ccd)', display: 'flex', justifyContent: 'space-between' }}>
        <span>low {lo.toFixed(1)}</span>
        <span style={{ opacity: 0.7 }}>{values.length} orders</span>
        <span>high {hi.toFixed(1)}</span>
      </div>
    </div>
  );
}

/** One circular order drawn as the closed tour it sums: leaves on a circle, the
 *  Hamiltonian cycle traced, the running edge lengths summing to the energy. */
export function CircleTour({
  order, matrix, energy,
}: {
  order: number[];
  matrix: DistanceMatrix;
  energy: number;
}): JSX.Element {
  const col = useNetColors();
  const S = 320;
  const c = S / 2;
  const R = S * 0.36;
  const n = order.length;
  const ang = (p: number): number => -Math.PI / 2 + (2 * Math.PI * p) / n;
  const pt = (p: number): [number, number] => [c + R * Math.cos(ang(p)), c + R * Math.sin(ang(p))];
  const seg = order.map((leaf, p) => {
    const a = pt(p);
    const b = pt((p + 1) % n);
    const d = matrix.d[leaf][order[(p + 1) % n]];
    return { a, b, d };
  });
  const maxD = Math.max(1e-6, ...seg.map((s) => s.d));
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
      <svg viewBox={`0 0 ${S} ${S}`} width="100%" height="100%" style={{ maxWidth: '100%', maxHeight: '100%' }}>
        {seg.map((s, i) => (
          <line key={`e${i}`} x1={s.a[0]} y1={s.a[1]} x2={s.b[0]} y2={s.b[1]}
            stroke={col.ramp(s.d / maxD)} strokeWidth={1.2 + 3.5 * (s.d / maxD)} strokeLinecap="round" strokeOpacity={0.85} />
        ))}
        {order.map((leaf, p) => {
          const [x, y] = pt(p);
          const dir = ang(p);
          return (
            <g key={`v${leaf}`}>
              <circle cx={x} cy={y} r={3.5} fill={col.node} />
              <text x={c + (R + 16) * Math.cos(dir)} y={c + (R + 16) * Math.sin(dir)} fontSize={14} fontFamily="monospace"
                fill="var(--accent, #cda434)" textAnchor="middle" dominantBaseline="middle">{matrix.leaves[leaf]}</text>
            </g>
          );
        })}
        <text x={c} y={c} fontSize={16} fontFamily="monospace" fill="var(--fg, #dde)" textAnchor="middle" dominantBaseline="middle">
          {energy.toFixed(1)}
        </text>
      </svg>
    </div>
  );
}
