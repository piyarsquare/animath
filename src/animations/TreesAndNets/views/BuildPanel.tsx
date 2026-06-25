// The metric builder's control: an editable weight per candidate edge (split).
// This is the inverse of the Split-weights readout in Nets mode — there the
// weights are *solved from* the matrix; here you *set* them and the matrix is
// generated (d(i,j) = Σ weight of splits separating i, j). Drag a slider or type
// a value and the whole picture (matrix → tree → net) regenerates.
//
// Rows mirror the Nets weight bars (same color language) so the two modes read
// as one object seen from both sides. Interior/arc splits come first, then the
// leaf branches (pendant edges). Click a label to light that split up everywhere.

import React from 'react';
import type { BuildItem } from '../lib/buildMetric';
import type { Highlight, SelectHandler } from './NetViews';
import { useNetColors } from './themeColors';

const isSplit = (h: Highlight, key: string): boolean => !!h && h.kind === 'split' && h.key === key;

function WeightRow({
  item, weight, wmax, max, inTree, selected, onWeight, onSelect,
}: {
  item: BuildItem; weight: number; wmax: number; max: number;
  inTree: boolean; selected: boolean;
  onWeight: (v: number) => void; onSelect: () => void;
}): JSX.Element {
  const col = useNetColors();
  const t = max > 0 ? weight / max : 0;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 84px 3.2em', alignItems: 'center', gap: 8 }}>
      {/* label + proportional fill, click to select (links to tree/net) */}
      <div onClick={onSelect} title={item.key}
        style={{ position: 'relative', height: 16, background: 'var(--am-border, rgba(255,255,255,0.08))', borderRadius: 4, overflow: 'hidden', cursor: 'pointer', outline: selected ? `1.5px solid ${col.highlight}` : 'none' }}>
        <div style={{ position: 'absolute', inset: 0, width: `${Math.max(weight > 0 ? 4 : 0, t * 100)}%`, background: selected ? col.highlight : col.ramp(t), opacity: selected ? 0.7 : 0.5 }} />
        <span style={{ position: 'absolute', left: 6, top: 1, whiteSpace: 'nowrap', color: inTree ? col.structure : 'var(--fg, #dde)' }}>{item.label}</span>
      </div>
      <input type="range" min={0} max={wmax} step={wmax / 100} value={Math.min(weight, wmax)}
        onChange={(e) => onWeight(Number.parseFloat(e.target.value))}
        style={{ width: '100%', accentColor: 'var(--accent, #cda434)' }} />
      <input type="number" min={0} step={0.1} value={Number(weight.toFixed(2))}
        onChange={(e) => { const v = Number.parseFloat(e.target.value); if (Number.isFinite(v)) onWeight(Math.max(0, v)); }}
        style={{ width: '3.2em', background: 'transparent', border: '1px solid var(--am-border, rgba(255,255,255,0.12))', borderRadius: 4, color: 'var(--fg, #dde)', fontFamily: 'var(--mono, monospace)', fontSize: 11, padding: '1px 3px', textAlign: 'right' }} />
    </div>
  );
}

export function BuildWeights({
  items, weights, treeSplitKeys, highlight, onWeight, onSelect,
}: {
  items: BuildItem[];
  weights: number[];
  /** Splits that are also edges of the generated NJ tree (tagged structurally). */
  treeSplitKeys: Set<string>;
  highlight: Highlight;
  onWeight: (index: number, value: number) => void;
  onSelect: SelectHandler;
}): JSX.Element {
  if (items.length === 0) {
    return <div style={{ fontSize: 12, color: 'var(--fg, #aab)', opacity: 0.7 }}>—</div>;
  }
  // A stable slider range so the handles don't rescale as you drag: a little
  // above the largest current weight.
  const wmax = Math.max(2, Math.ceil(Math.max(...weights, 0) * 1.5));
  const max = Math.max(1e-6, ...weights);
  const order = items.map((it, k) => k);
  const interior = order.filter((k) => !items[k].trivial);
  const leaves = order.filter((k) => items[k].trivial);

  const rows = (idxs: number[]): JSX.Element[] => idxs.map((k) => (
    <WeightRow key={items[k].key} item={items[k]} weight={weights[k] ?? 0} wmax={wmax} max={max}
      inTree={treeSplitKeys.has(items[k].key)} selected={isSplit(highlight, items[k].key)}
      onWeight={(v) => onWeight(k, v)} onSelect={() => onSelect(isSplit(highlight, items[k].key) ? null : { kind: 'split', key: items[k].key })} />
  ));

  const sub: React.CSSProperties = { fontFamily: 'var(--mono, monospace)', fontSize: 10, color: 'var(--accent, #cda434)', opacity: 0.85, margin: '2px 0' };
  return (
    <div style={{ display: 'grid', gap: 5, fontFamily: 'var(--mono, monospace)', fontSize: 11, maxHeight: 300, overflowY: 'auto', paddingRight: 4 }}>
      {interior.length > 0 && <div style={sub}>splits (interior / arcs)</div>}
      {rows(interior)}
      {leaves.length > 0 && <div style={sub}>leaf branches</div>}
      {rows(leaves)}
    </div>
  );
}
