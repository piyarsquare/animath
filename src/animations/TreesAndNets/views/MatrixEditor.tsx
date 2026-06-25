// The editable distance matrix — the input the whole app derives from. A compact
// n×n grid of number inputs (upper triangle editable, lower triangle a faint
// mirror), heatmap-tinted by value. This is the "front door": every tree, net,
// energy and order downstream is a pure function of these distances.

import React from 'react';
import type { DistanceMatrix } from '../lib/metric';

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

/** A cool→warm tint for a normalized value t∈[0,1] (teal → gold, the app palette). */
function heat(t: number): string {
  const c = Math.max(0, Math.min(1, t));
  const r = Math.round(63 + (205 - 63) * c);
  const g = Math.round(182 + (164 - 182) * c);
  const b = Math.round(166 + (52 - 166) * c);
  return `rgba(${r}, ${g}, ${b}, 0.22)`;
}

export function MatrixEditor({
  matrix,
  onCell,
}: {
  matrix: DistanceMatrix;
  /** Commit a new symmetric value for the pair (i, j). */
  onCell: (i: number, j: number, value: number) => void;
}): JSX.Element {
  const [lo, hi] = extent(matrix);
  const norm = (v: number): number => (hi > lo ? (v - lo) / (hi - lo) : 0.5);

  const commit = (i: number, j: number, raw: string): void => {
    const v = Number.parseFloat(raw);
    if (Number.isFinite(v)) onCell(i, j, Math.max(0, v));
  };

  const headStyle: React.CSSProperties = {
    fontFamily: 'var(--mono, monospace)',
    fontSize: 12,
    color: 'var(--accent, #cda434)',
    textAlign: 'center',
    padding: '2px 4px',
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', fontFamily: 'var(--mono, monospace)', fontSize: 12 }}>
        <thead>
          <tr>
            <th />
            {matrix.leaves.map((l) => (
              <th key={`h${l}`} style={headStyle}>{l}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.leaves.map((rowLabel, i) => (
            <tr key={`r${rowLabel}`}>
              <th style={headStyle}>{rowLabel}</th>
              {matrix.leaves.map((colLabel, j) => {
                if (i === j) {
                  return (
                    <td key={`c${i}-${j}`} style={{ textAlign: 'center', color: 'var(--fg, #889)', opacity: 0.4 }}>·</td>
                  );
                }
                const value = matrix.d[i][j];
                const tint = heat(norm(value));
                if (i > j) {
                  // Lower triangle: read-only mirror, faint.
                  return (
                    <td
                      key={`c${i}-${j}`}
                      style={{ textAlign: 'center', padding: '2px 6px', color: 'var(--fg, #aab)', opacity: 0.4, background: tint }}
                    >
                      {value.toFixed(1)}
                    </td>
                  );
                }
                return (
                  <td key={`c${i}-${j}`} style={{ padding: 1, background: tint }}>
                    <input
                      // Remount when the underlying value identity changes (preset / n
                      // switch) so the uncontrolled field re-seeds; edits commit on
                      // blur / Enter so mid-typing decimals aren't clobbered.
                      key={`in-${i}-${j}-${value}`}
                      type="number"
                      min={0}
                      step={0.1}
                      defaultValue={value}
                      onBlur={(e) => commit(i, j, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                      }}
                      style={{
                        width: '3.4em',
                        background: 'transparent',
                        border: '1px solid var(--am-border, rgba(255,255,255,0.12))',
                        borderRadius: 4,
                        color: 'var(--fg, #dde)',
                        fontFamily: 'var(--mono, monospace)',
                        fontSize: 12,
                        padding: '2px 4px',
                        textAlign: 'center',
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
