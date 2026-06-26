// The fatten-a-tree control: one slider per internal tree edge. At 0 the edge is
// a crisp tree split; turn it up and a *crossing* split is added, opening a box —
// the tree fattens into a net. Rows reuse the Nets weight-bar look so the two
// modes read as one object. Click a label to light that split up everywhere.

import React from 'react';
import type { TreeEdge } from '../lib/fattenTree';
import type { Highlight, SelectHandler } from './NetViews';
import { useNetColors } from './themeColors';

const isSplit = (h: Highlight, key: string): boolean => !!h && h.kind === 'split' && h.key === key;

export function FattenControls({
  edges, fatten, highlight, onFatten, onSelect,
}: {
  edges: TreeEdge[];
  fatten: Record<string, number>;
  highlight: Highlight;
  onFatten: (key: string, value: number) => void;
  onSelect: SelectHandler;
}): JSX.Element {
  const col = useNetColors();
  if (edges.length === 0) {
    return <div style={{ fontSize: 12, color: 'var(--fg, #aab)', opacity: 0.7 }}>No internal edges to fatten — add leaves (n ≥ 5).</div>;
  }
  return (
    <div style={{ display: 'grid', gap: 6, fontFamily: 'var(--mono, monospace)', fontSize: 11 }}>
      {edges.map((e) => {
        const f = fatten[e.key] ?? 0;
        const on = isSplit(highlight, e.key);
        return (
          <div key={e.key} style={{ display: 'grid', gridTemplateColumns: '1fr 88px 2.6em', alignItems: 'center', gap: 8 }}>
            <div onClick={() => onSelect(on ? null : { kind: 'split', key: e.key })} title={e.key}
              style={{ position: 'relative', height: 16, background: 'var(--am-border, rgba(255,255,255,0.08))', borderRadius: 4, overflow: 'hidden', cursor: 'pointer', outline: on ? `1.5px solid ${col.highlight}` : 'none' }}>
              <div style={{ position: 'absolute', inset: 0, width: `${Math.max(f > 0 ? 4 : 0, Math.min(1, f) * 100)}%`, background: on ? col.highlight : col.ramp(Math.min(1, f)), opacity: on ? 0.7 : 0.5 }} />
              <span style={{ position: 'absolute', left: 6, top: 1, whiteSpace: 'nowrap', color: 'var(--fg, #dde)' }}>{e.key}</span>
            </div>
            <input type="range" min={0} max={1} step={0.05} value={Math.min(1, f)}
              onChange={(ev) => onFatten(e.key, Number.parseFloat(ev.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent, #cda434)' }} />
            <span style={{ color: 'var(--fg, #ccd)', textAlign: 'right' }}>{f.toFixed(2)}</span>
          </div>
        );
      })}
    </div>
  );
}
