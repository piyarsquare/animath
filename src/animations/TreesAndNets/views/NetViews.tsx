// The "Nets" views: the Neighbor-Joining tree, the circular split network, and a
// split-weights readout. All SVG, all pure functions of the distance matrix
// (via the engine). These are what finally make "Trees and Nets" show nets.

import React from 'react';
import type { DistanceMatrix } from '../lib/metric';
import type { NJResult } from '../lib/neighborJoining';
import type { WeightedDisplayedSplit } from '../lib/splitWeights';

const C_TEAL = '#3fb6a6';

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
// Neighbor-Joining tree — Felsenstein equal-angle unrooted layout.
// =========================================================================
function layoutNJ(nj: NJResult, leafSet: Set<string>): { pos: Map<string, Pt>; order: string[] } {
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
  return { pos, order: nj.nodes };
}

export function NJTreeView({ nj, matrix }: { nj: NJResult; matrix: DistanceMatrix }): JSX.Element {
  const S = 360;
  const leafSet = new Set(matrix.leaves);
  const { pos } = layoutNJ(nj, leafSet);

  // Fit the raw layout into the viewBox with padding.
  const pts = [...pos.values()];
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const pad = 46;
  const span = Math.max(maxX - minX, maxY - minY, 1e-6);
  const scale = (S - 2 * pad) / span;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const T = (p: Pt): Pt => ({ x: S / 2 + (p.x - cx) * scale, y: S / 2 + (p.y - cy) * scale });

  const negative = (len: number): boolean => len < -1e-9;

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
      <svg viewBox={`0 0 ${S} ${S}`} width="100%" height="100%" style={{ maxWidth: '100%', maxHeight: '100%' }}>
        {nj.edges.map((e, i) => {
          const a = T(pos.get(e.left)!);
          const b = T(pos.get(e.right)!);
          return (
            <line
              key={`e${i}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={negative(e.length) ? '#c75d5d' : 'var(--fg, #aeb6c8)'}
              strokeOpacity={0.85}
              strokeWidth={2.2}
              strokeDasharray={negative(e.length) ? '4 3' : undefined}
              strokeLinecap="round"
            />
          );
        })}
        {[...pos.entries()].map(([id, p]) => {
          const t = T(p);
          if (!leafSet.has(id)) {
            return <circle key={`n${id}`} cx={t.x} cy={t.y} r={2.5} fill="var(--fg, #889)" opacity={0.6} />;
          }
          const dir = Math.atan2(t.y - S / 2, t.x - S / 2);
          const lx = t.x + 13 * Math.cos(dir);
          const ly = t.y + 13 * Math.sin(dir);
          return (
            <g key={`l${id}`}>
              <circle cx={t.x} cy={t.y} r={3.2} fill={C_TEAL} />
              <text x={lx} y={ly} fontSize={14} fontFamily="monospace" fill="var(--accent, #cda434)" textAnchor="middle" dominantBaseline="middle">{id}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// =========================================================================
// Circular split network — leaves on a circle in the given order; each
// nontrivial split drawn as a chord across the two gaps bounding its arc,
// thickness/opacity by its fitted weight.
// =========================================================================
export function SplitNetworkView({
  splits,
  order,
  matrix,
}: {
  splits: WeightedDisplayedSplit[];
  order: number[];
  matrix: DistanceMatrix;
}): JSX.Element {
  const S = 360;
  const c = S / 2;
  const R = S * 0.34;
  const n = order.length;
  const posAngle = (p: number): number => -Math.PI / 2 + (2 * Math.PI * p) / n;
  const gapAngle = (p: number): number => -Math.PI / 2 + (2 * Math.PI * (p - 0.5)) / n;
  const leafPt = (p: number): Pt => ({ x: c + R * Math.cos(posAngle(p)), y: c + R * Math.sin(posAngle(p)) });
  const gapPt = (p: number): Pt => ({ x: c + R * Math.cos(gapAngle(p)), y: c + R * Math.sin(gapAngle(p)) });

  const drawn = splits.filter((s) => !s.trivial && s.weight > 1e-6);
  const maxW = Math.max(1e-6, ...drawn.map((s) => s.weight));

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
      <svg viewBox={`0 0 ${S} ${S}`} width="100%" height="100%" style={{ maxWidth: '100%', maxHeight: '100%' }}>
        <circle cx={c} cy={c} r={R} fill="none" stroke="var(--fg, #ccd)" strokeOpacity={0.12} strokeWidth={1} />
        {drawn.map((s, i) => {
          const a = gapPt(s.start);
          const b = gapPt((s.start + s.length) % n);
          const t = s.weight / maxW;
          return (
            <line
              key={`s${i}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={weightColor(t)}
              strokeOpacity={0.25 + 0.6 * t}
              strokeWidth={1 + 6 * t}
              strokeLinecap="round"
            >
              <title>{`${s.key}  weight ${s.weight.toFixed(3)}`}</title>
            </line>
          );
        })}
        {order.map((leaf, p) => {
          const lp = leafPt(p);
          const dir = posAngle(p);
          const lx = c + (R + 16) * Math.cos(dir);
          const ly = c + (R + 16) * Math.sin(dir);
          return (
            <g key={`v${leaf}`}>
              <circle cx={lp.x} cy={lp.y} r={3} fill="var(--accent, #cda434)" />
              <text x={lx} y={ly} fontSize={14} fontFamily="monospace" fill="var(--accent, #cda434)" textAnchor="middle" dominantBaseline="middle">{matrix.leaves[leaf]}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// =========================================================================
// Split-weights readout — the nontrivial circular splits and their weights as
// bars (the numbers behind the network). Trivial (pendant) splits omitted.
// =========================================================================
export function SplitWeightsList({ splits }: { splits: WeightedDisplayedSplit[] }): JSX.Element {
  const rows = splits
    .filter((s) => !s.trivial && s.weight > 1e-6)
    .sort((a, b) => b.weight - a.weight);
  const maxW = Math.max(1e-6, ...rows.map((s) => s.weight));

  if (rows.length === 0) {
    return <div style={{ fontSize: 12, color: 'var(--fg, #aab)', opacity: 0.7 }}>No nontrivial splits carry weight — the metric reads as a star (no structure).</div>;
  }

  return (
    <div style={{ display: 'grid', gap: 5, fontFamily: 'var(--mono, monospace)', fontSize: 11 }}>
      {rows.map((s, i) => {
        const t = s.weight / maxW;
        return (
          <div key={`w${i}`} style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: 8 }}>
            <div style={{ position: 'relative', height: 16, background: 'var(--am-border, rgba(255,255,255,0.08))', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, width: `${Math.max(4, t * 100)}%`, background: weightColor(t), opacity: 0.5 }} />
              <span style={{ position: 'absolute', left: 6, top: 1, color: 'var(--fg, #dde)' }}>{s.key}</span>
            </div>
            <span style={{ color: 'var(--fg, #ccd)', minWidth: '3.2em', textAlign: 'right' }}>{s.weight.toFixed(2)}</span>
          </div>
        );
      })}
    </div>
  );
}
