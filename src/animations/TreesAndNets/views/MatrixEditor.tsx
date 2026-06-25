// The editable distance matrix — the input every tree/net/weight derives from. A
// compact n×n grid of number inputs (upper triangle editable, lower triangle a
// faint mirror), heatmap-tinted by value. Clicking a cell SELECTS that leaf-pair,
// which lights up the path between them in the NJ tree (the matrix → tree bridge).

import React from 'react';
import type { DistanceMatrix } from '../lib/metric';
import type { Highlight, SelectHandler } from './NetViews';
import { useNetColors } from './themeColors';

/** Min/max over the off-diagonal entries (for the heatmap normalization). */
function extent(m: DistanceMatrix): [number, number] {
  let lo = Infinity;
  let hi = -Infinity;
  const n = m.leaves.length;
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      lo = Math.min(lo, m.d[i][j]);
      hi = Math.max(hi, m.d[i][j]);
    }
  }
  if (!Number.isFinite(lo)) return [0, 1];
  return [lo, hi];
}

const isPair = (h: Highlight, i: number, j: number): boolean =>
  !!h && h.kind === 'pair' && ((h.i === i && h.j === j) || (h.i === j && h.j === i));

export function MatrixEditor({
  matrix,
  onCell,
  highlight,
  onSelect,
}: {
  matrix: DistanceMatrix;
  /** Commit a new symmetric value for the pair (i, j). */
  onCell: (i: number, j: number, value: number) => void;
  highlight: Highlight;
  onSelect: SelectHandler;
}): JSX.Element {
  const col = useNetColors();
  const [lo, hi] = extent(matrix);
  const norm = (v: number): number => (hi > lo ? (v - lo) / (hi - lo) : 0.5);
  // Heatmap tint for a normalized distance t∈[0,1] (ordered magnitude → the
  // theme's sequential colormap). The '55' hex-alpha keeps it a faint wash
  // behind the cell text so values stay legible in every mode.
  const heat = (t: number): string => `${col.ramp(t)}55`;

  const commit = (i: number, j: number, raw: string): void => {
    const v = Number.parseFloat(raw);
    if (Number.isFinite(v)) onCell(i, j, Math.max(0, v));
  };
  const pick = (i: number, j: number): void => onSelect(isPair(highlight, i, j) ? null : { kind: 'pair', i, j });

  const headStyle: React.CSSProperties = {
    fontFamily: 'var(--mono, monospace)', fontSize: 12, color: 'var(--accent, #cda434)', textAlign: 'center', padding: '2px 4px',
  };
  const sel = (i: number, j: number): React.CSSProperties =>
    isPair(highlight, i, j) ? { outline: `1.5px solid ${col.highlight}`, outlineOffset: -1 } : {};

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', fontFamily: 'var(--mono, monospace)', fontSize: 12 }}>
        <thead>
          <tr>
            <th />
            {matrix.leaves.map((l) => (<th key={`h${l}`} style={headStyle}>{l}</th>))}
          </tr>
        </thead>
        <tbody>
          {matrix.leaves.map((rowLabel, i) => (
            <tr key={`r${rowLabel}`}>
              <th style={headStyle}>{rowLabel}</th>
              {matrix.leaves.map((colLabel, j) => {
                if (i === j) {
                  return <td key={`c${i}-${j}`} style={{ textAlign: 'center', color: 'var(--fg, #889)', opacity: 0.4 }}>·</td>;
                }
                const value = matrix.d[i][j];
                const tint = heat(norm(value));
                if (i > j) {
                  return (
                    <td key={`c${i}-${j}`} onClick={() => pick(i, j)}
                      style={{ textAlign: 'center', padding: '2px 6px', color: 'var(--fg, #aab)', opacity: 0.4, background: tint, cursor: 'pointer', ...sel(i, j) }}>
                      {value.toFixed(1)}
                    </td>
                  );
                }
                return (
                  <td key={`c${i}-${j}`} onClick={() => pick(i, j)} style={{ padding: 1, background: tint, cursor: 'pointer', ...sel(i, j) }}>
                    <input
                      key={`in-${i}-${j}-${value}`}
                      type="number" min={0} step={0.1} defaultValue={value}
                      onBlur={(e) => commit(i, j, e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                      style={{
                        width: '3.4em', background: 'transparent', border: '1px solid var(--am-border, rgba(255,255,255,0.12))',
                        borderRadius: 4, color: 'var(--fg, #dde)', fontFamily: 'var(--mono, monospace)', fontSize: 12, padding: '2px 4px', textAlign: 'center',
                      }}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
