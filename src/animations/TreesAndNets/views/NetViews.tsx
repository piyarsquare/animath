// The "Nets" views: the Neighbor-Joining tree, the circular split network, and a
// split-weights readout — all SVG, all pure functions of the distance matrix.
//
// They share one SELECTION (`Highlight`): click a split in any of them (a weight
// row, a net chord, or a tree edge) and it lights up in all three; click a matrix
// pair and the tree path between those leaves lights up. That cross-linking is
// what makes the matrix → tree → net → weights read as one object.

import React, { useMemo } from 'react';
import type { DistanceMatrix } from '../lib/metric';
import {
  type NJEdge,
  type NJResult,
  njEdgeId,
  njLeafPathInfo,
  splitForEdge,
} from '../lib/neighborJoining';
import { canonicalSplitKey } from '../lib/trees';
import type { WeightedDisplayedSplit } from '../lib/splitWeights';
import type { SplitGraph } from '../lib/splitGraph';

const C_TEAL = '#3fb6a6';
const C_HI = '#ffd54a'; // selection highlight (gold)

/** A shared selection across the Nets views. */
export type Highlight =
  | { kind: 'split'; key: string }
  | { kind: 'pair'; i: number; j: number }
  | null;

export type SelectHandler = (h: Highlight) => void;

const isSplit = (h: Highlight, key: string): boolean => !!h && h.kind === 'split' && h.key === key;

/** Teal→gold ramp for a normalized weight t∈[0,1]. */
function weightColor(t: number): string {
  const c = Math.max(0, Math.min(1, t));
  const r = Math.round(63 + (205 - 63) * c);
  const g = Math.round(182 + (164 - 182) * c);
  const b = Math.round(166 + (52 - 166) * c);
  return `rgb(${r}, ${g}, ${b})`;
}

interface Pt {
  x: number;
  y: number;
}

// =========================================================================
// Neighbor-Joining tree — Felsenstein equal-angle unrooted layout. Edge
// thickness encodes branch length (the tree's own weights); the interior edge
// for the selected split (or the path for a selected pair) is highlighted.
// =========================================================================
function layoutNJ(nj: NJResult, leafSet: Set<string>): Map<string, Pt> {
  const adj = new Map<string, { to: string; len: number }[]>();
  nj.nodes.forEach((id) => adj.set(id, []));
  nj.edges.forEach((e) => {
    adj.get(e.left)!.push({ to: e.right, len: e.length });
    adj.get(e.right)!.push({ to: e.left, len: e.length });
  });
  const isLeaf = (id: string): boolean => leafSet.has(id);
  const root = nj.nodes.find((id) => !isLeaf(id)) ?? nj.nodes[0];

  const countLeaves = (node: string, parent: string | null): number => {
    let c = isLeaf(node) ? 1 : 0;
    for (const { to } of adj.get(node)!) if (to !== parent) c += countLeaves(to, node);
    return c;
  };
  const refLen = Math.max(...nj.edges.map((e) => Math.abs(e.length)), 1e-6);
  const minLen = 0.12 * refLen;
  const pos = new Map<string, Pt>();
  const place = (node: string, parent: string | null, a0: number, a1: number, x: number, y: number): void => {
    pos.set(node, { x, y });
    const children = adj.get(node)!.filter((nb) => nb.to !== parent);
    const total = children.reduce((s, c) => s + countLeaves(c.to, node), 0) || 1;
    let a = a0;
    for (const child of children) {
      const lc = countLeaves(child.to, node);
      const span = (a1 - a0) * (lc / total);
      const mid = a + span / 2;
      const len = Math.max(Math.abs(child.len), minLen);
      place(child.to, node, a, a + span, x + len * Math.cos(mid), y + len * Math.sin(mid));
      a += span;
    }
  };
  place(root, null, 0, Math.PI * 2, 0, 0);
  return pos;
}

export function NJTreeView({
  nj,
  matrix,
  highlight,
  onSelect,
}: {
  nj: NJResult;
  matrix: DistanceMatrix;
  highlight: Highlight;
  onSelect: SelectHandler;
}): JSX.Element {
  const S = 360;
  const n = matrix.leaves.length;
  const leafSet = useMemo(() => new Set(matrix.leaves), [matrix]);
  const labelToIndex = useMemo(() => new Map(matrix.leaves.map((l, i) => [l, i])), [matrix]);

  // Per-edge interior split key (so an edge can be matched to a chord / weight).
  const edgeKey = useMemo(() => {
    const graph = new Map<string, Map<string, NJEdge>>();
    const add = (id: string): void => { if (!graph.has(id)) graph.set(id, new Map()); };
    nj.edges.forEach((e) => { add(e.left); add(e.right); graph.get(e.left)!.set(e.right, e); graph.get(e.right)!.set(e.left, e); });
    const map = new Map<string, string>();
    nj.edges.forEach((e) => {
      const side = splitForEdge(graph, e.left, e.right, leafSet);
      if (side.length >= 2 && side.length <= n - 2) {
        map.set(njEdgeId(e.left, e.right), canonicalSplitKey(matrix, side.map((l) => labelToIndex.get(l)!)));
      }
    });
    return map;
  }, [nj, matrix, leafSet, labelToIndex, n]);

  const emph = useMemo(() => {
    if (!highlight) return new Set<string>();
    if (highlight.kind === 'split') {
      const s = new Set<string>();
      edgeKey.forEach((key, eid) => { if (key === highlight.key) s.add(eid); });
      return s;
    }
    return njLeafPathInfo(nj, matrix.leaves[highlight.i], matrix.leaves[highlight.j]).edgeIds;
  }, [highlight, edgeKey, nj, matrix]);

  const pos = useMemo(() => layoutNJ(nj, leafSet), [nj, leafSet]);
  const pts = [...pos.values()];
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const pad = 46;
  const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), 1e-6);
  const scale = (S - 2 * pad) / span;
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const T = (p: Pt): Pt => ({ x: S / 2 + (p.x - cx) * scale, y: S / 2 + (p.y - cy) * scale });
  const refLen = Math.max(...nj.edges.map((e) => Math.abs(e.length)), 1e-6);

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
      <svg viewBox={`0 0 ${S} ${S}`} width="100%" height="100%" style={{ maxWidth: '100%', maxHeight: '100%' }}>
        {nj.edges.map((e, i) => {
          const a = T(pos.get(e.left)!);
          const b = T(pos.get(e.right)!);
          const eid = njEdgeId(e.left, e.right);
          const key = edgeKey.get(eid);
          const on = emph.has(eid);
          const neg = e.length < -1e-9;
          const w = 1.4 + 3.6 * (Math.abs(e.length) / refLen);
          const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
          return (
            <g key={`e${i}`} style={{ cursor: key ? 'pointer' : 'default' }}
              onClick={key ? () => onSelect(isSplit(highlight, key) ? null : { kind: 'split', key }) : undefined}>
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="transparent" strokeWidth={16} />
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke={on ? C_HI : neg ? '#c75d5d' : 'var(--fg, #aeb6c8)'}
                strokeOpacity={on ? 1 : 0.85} strokeWidth={on ? w + 2.4 : w}
                strokeDasharray={neg ? '4 3' : undefined} strokeLinecap="round"
                style={{ transition: 'stroke 160ms' }} />
              {on && key && (
                <text x={mid.x} y={mid.y - 5} fontSize={11} fontFamily="monospace" fill={C_HI} textAnchor="middle">{e.length.toFixed(2)}</text>
              )}
            </g>
          );
        })}
        {[...pos.entries()].map(([id, p]) => {
          const t = T(p);
          if (!leafSet.has(id)) return <circle key={`n${id}`} cx={t.x} cy={t.y} r={2.5} fill="var(--fg, #889)" opacity={0.6} />;
          const dir = Math.atan2(t.y - S / 2, t.x - S / 2);
          return (
            <g key={`l${id}`}>
              <circle cx={t.x} cy={t.y} r={3.2} fill={C_TEAL} />
              <text x={t.x + 13 * Math.cos(dir)} y={t.y + 13 * Math.sin(dir)} fontSize={14} fontFamily="monospace" fill="var(--accent, #cda434)" textAnchor="middle" dominantBaseline="middle">{id}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// =========================================================================
// Circular split network — each nontrivial split is a chord across the two gaps
// bounding its arc, thickness/opacity by weight. The selected split is brightened.
// =========================================================================
export function SplitNetworkView({
  splits,
  order,
  matrix,
  highlight,
  onSelect,
}: {
  splits: WeightedDisplayedSplit[];
  order: number[];
  matrix: DistanceMatrix;
  highlight: Highlight;
  onSelect: SelectHandler;
}): JSX.Element {
  const S = 360;
  const c = S / 2;
  const R = S * 0.34;
  const nn = order.length;
  const posAngle = (p: number): number => -Math.PI / 2 + (2 * Math.PI * p) / nn;
  const gapAngle = (p: number): number => -Math.PI / 2 + (2 * Math.PI * (p - 0.5)) / nn;
  const gapPt = (p: number): Pt => ({ x: c + R * Math.cos(gapAngle(p)), y: c + R * Math.sin(gapAngle(p)) });

  const drawn = splits.filter((s) => !s.trivial && s.weight > 1e-6);
  const maxW = Math.max(1e-6, ...drawn.map((s) => s.weight));
  const anySel = !!highlight && highlight.kind === 'split';

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
      <svg viewBox={`0 0 ${S} ${S}`} width="100%" height="100%" style={{ maxWidth: '100%', maxHeight: '100%' }}>
        <circle cx={c} cy={c} r={R} fill="none" stroke="var(--fg, #ccd)" strokeOpacity={0.12} strokeWidth={1} />
        {drawn.map((s, i) => {
          const a = gapPt(s.start);
          const b = gapPt((s.start + s.length) % nn);
          const t = s.weight / maxW;
          const on = isSplit(highlight, s.key);
          return (
            <g key={`s${i}`} style={{ cursor: 'pointer' }} onClick={() => onSelect(on ? null : { kind: 'split', key: s.key })}>
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="transparent" strokeWidth={14} />
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke={on ? C_HI : weightColor(t)}
                strokeOpacity={on ? 1 : anySel ? 0.12 + 0.18 * t : 0.25 + 0.6 * t}
                strokeWidth={(1 + 6 * t) + (on ? 2.5 : 0)} strokeLinecap="round"
                style={{ transition: 'stroke 160ms, stroke-opacity 160ms' }}>
                <title>{`${s.key}  weight ${s.weight.toFixed(3)}`}</title>
              </line>
            </g>
          );
        })}
        {order.map((leaf, p) => {
          const dir = posAngle(p);
          return (
            <g key={`v${leaf}`}>
              <circle cx={c + R * Math.cos(dir)} cy={c + R * Math.sin(dir)} r={3} fill="var(--accent, #cda434)" />
              <text x={c + (R + 16) * Math.cos(dir)} y={c + (R + 16) * Math.sin(dir)} fontSize={14} fontFamily="monospace" fill="var(--accent, #cda434)" textAnchor="middle" dominantBaseline="middle">{matrix.leaves[leaf]}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// =========================================================================
// Split-weights readout — the nontrivial circular splits and their weights as
// bars. A split that is also an edge of the NJ tree is tagged "△ tree" — the
// direct answer to "how do the weights connect to the tree". Click to select.
// =========================================================================
export function SplitWeightsList({
  splits,
  treeSplitKeys,
  highlight,
  onSelect,
}: {
  splits: WeightedDisplayedSplit[];
  treeSplitKeys: Set<string>;
  highlight: Highlight;
  onSelect: SelectHandler;
}): JSX.Element {
  const rows = splits.filter((s) => !s.trivial && s.weight > 1e-6).sort((a, b) => b.weight - a.weight);
  const maxW = Math.max(1e-6, ...rows.map((s) => s.weight));

  if (rows.length === 0) {
    return <div style={{ fontSize: 12, color: 'var(--fg, #aab)', opacity: 0.7 }}>No nontrivial splits carry weight — the metric reads as a star (no structure).</div>;
  }

  return (
    <div style={{ display: 'grid', gap: 5, fontFamily: 'var(--mono, monospace)', fontSize: 11 }}>
      {rows.map((s, i) => {
        const t = s.weight / maxW;
        const on = isSplit(highlight, s.key);
        const inTree = treeSplitKeys.has(s.key);
        return (
          <div key={`w${i}`} onClick={() => onSelect(on ? null : { kind: 'split', key: s.key })}
            style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <div style={{ position: 'relative', height: 16, background: 'var(--am-border, rgba(255,255,255,0.08))', borderRadius: 4, overflow: 'hidden', outline: on ? `1.5px solid ${C_HI}` : 'none' }}>
              <div style={{ position: 'absolute', inset: 0, width: `${Math.max(4, t * 100)}%`, background: on ? C_HI : weightColor(t), opacity: on ? 0.7 : 0.5 }} />
              <span style={{ position: 'absolute', left: 6, top: 1, color: 'var(--fg, #dde)' }}>{s.key}</span>
            </div>
            <span style={{ color: inTree ? C_TEAL : 'transparent', fontSize: 10 }} title={inTree ? 'also an edge of the NJ tree' : ''}>△&nbsp;tree</span>
            <span style={{ color: 'var(--fg, #ccd)', minWidth: '3.0em', textAlign: 'right' }}>{s.weight.toFixed(2)}</span>
          </div>
        );
      })}
    </div>
  );
}

// =========================================================================
// SplitsTree split-graph — the planar split network. A tree-like split system
// collapses to a tree; conflicting splits open "boxes". Each edge carries a
// split; the selected split's edges are highlighted (others dim).
// =========================================================================
export function SplitGraphView({
  graph,
  matrix,
  highlight,
  onSelect,
}: {
  graph: SplitGraph;
  matrix: DistanceMatrix;
  highlight: Highlight;
  onSelect: SelectHandler;
}): JSX.Element {
  const W = 420;
  const H = 320;
  const cx = W / 2;
  const cy = H / 2;
  const maxW = Math.max(1e-6, ...graph.edges.map((e) => e.weight));
  const anySel = !!highlight && highlight.kind === 'split';
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" style={{ maxWidth: '100%', maxHeight: '100%' }}>
        {graph.edges.map((e, i) => {
          const a = graph.nodes[e.a];
          const b = graph.nodes[e.b];
          const t = e.weight / maxW;
          const on = isSplit(highlight, e.splitKey);
          return (
            <g key={`e${i}`} style={{ cursor: 'pointer' }} onClick={() => onSelect(on ? null : { kind: 'split', key: e.splitKey })}>
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="transparent" strokeWidth={12} />
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke={on ? C_HI : weightColor(t)}
                strokeOpacity={on ? 1 : anySel ? 0.18 : 0.8}
                strokeWidth={1.2 + 3.2 * t + (on ? 2.2 : 0)} strokeLinecap="round"
                style={{ transition: 'stroke 160ms, stroke-opacity 160ms' }}>
                <title>{`${e.splitKey}  weight ${e.weight.toFixed(3)}`}</title>
              </line>
            </g>
          );
        })}
        {graph.nodes.map((nd, i) => {
          if (nd.leaves.length === 0) return null;
          const dir = Math.atan2(nd.y - cy, nd.x - cx) || 0;
          return (
            <g key={`n${i}`}>
              <circle cx={nd.x} cy={nd.y} r={3} fill="var(--accent, #cda434)" />
              <text x={nd.x + 11 * Math.cos(dir)} y={nd.y + 11 * Math.sin(dir)} fontSize={13} fontFamily="monospace" fill="var(--accent, #cda434)" textAnchor="middle" dominantBaseline="middle">{nd.leaves.map((l) => matrix.leaves[l]).join('')}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
