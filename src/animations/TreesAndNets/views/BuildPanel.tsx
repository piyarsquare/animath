// A list of editable edge sliders — one row per edge (split), a proportional bar +
// a range + a value. Generic over what the weight means (a branch length, a fatten
// amount, …): the caller supplies the range and the value accessor. Click a label
// to light that split up everywhere (shared selection).

import React from 'react';
import type { Highlight, SelectHandler } from './NetViews';
import { useNetColors } from './themeColors';

const isSplit = (h: Highlight, key: string): boolean => !!h && h.kind === 'split' && h.key === key;

export function EdgeSliders({
  edges, value, max, step = 0.1, onChange, highlight, onSelect,
}: {
  edges: { key: string; label?: string }[];
  value: (key: string) => number;
  max: number;
  step?: number;
  onChange: (key: string, v: number) => void;
  highlight: Highlight;
  onSelect: SelectHandler;
}): JSX.Element {
  const col = useNetColors();
  if (edges.length === 0) {
    return <div style={{ fontSize: 12, color: 'var(--fg, #aab)', opacity: 0.7 }}>No internal edges (need n ≥ 5).</div>;
  }
  return (
    <div style={{ display: 'grid', gap: 6, fontFamily: 'var(--mono, monospace)', fontSize: 11, maxHeight: 300, overflowY: 'auto', paddingRight: 4 }}>
      {edges.map((e) => {
        const v = value(e.key);
        const t = Math.max(0, Math.min(1, max > 0 ? v / max : 0));
        const on = isSplit(highlight, e.key);
        return (
          <div key={e.key} style={{ display: 'grid', gridTemplateColumns: '1fr 88px 2.6em', alignItems: 'center', gap: 8 }}>
            <div onClick={() => onSelect(on ? null : { kind: 'split', key: e.key })} title={e.key}
              style={{ position: 'relative', height: 16, background: 'var(--am-border, rgba(255,255,255,0.08))', borderRadius: 4, overflow: 'hidden', cursor: 'pointer', outline: on ? `1.5px solid ${col.highlight}` : 'none' }}>
              <div style={{ position: 'absolute', inset: 0, width: `${Math.max(v > 0 ? 4 : 0, t * 100)}%`, background: on ? col.highlight : col.ramp(t), opacity: on ? 0.7 : 0.5 }} />
              <span style={{ position: 'absolute', left: 6, top: 1, whiteSpace: 'nowrap', color: 'var(--fg, #dde)' }}>{e.label ?? e.key}</span>
            </div>
            <input type="range" min={0} max={max} step={step} value={Math.min(max, v)}
              onChange={(ev) => onChange(e.key, Number.parseFloat(ev.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent, #cda434)' }} />
            <span style={{ color: 'var(--fg, #ccd)', textAlign: 'right' }}>{v.toFixed(1)}</span>
          </div>
        );
      })}
    </div>
  );
}
