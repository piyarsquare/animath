// Stepwise animations of the two algorithms, driven by the engine traces.
//
//  - NeighborNetRun: the leaves sit on the circle in the FINAL circular order;
//    each agglomeration merge LOCKS the adjacency between the two spliced
//    endpoints (a link lights up). Because the components are always contiguous
//    arcs of the final order, "same component" = a locked link. When the order is
//    fully locked, the split network draws.
//  - NeighborJoiningRun: the final tree is laid out once; its edges are revealed
//    in the order the algorithm creates them (join by join), the current join
//    highlighted.

import React, { useMemo } from 'react';
import type { DistanceMatrix } from '../lib/metric';
import type { NJTrace, NJStep } from '../lib/neighborJoining';
import { njEdgeId } from '../lib/neighborJoining';
import type { NNTrace, NNStep } from '../lib/splitWeights';
import type { SplitGraph } from '../lib/splitGraph';
import { SplitGraphView } from './NetViews';

const C_TEAL = '#3fb6a6';
const C_HI = '#ffd54a';
const C_DIM = 'var(--fg, #6b7790)';

interface Pt { x: number; y: number; }

// =========================================================================
// NeighborNet — the circular order locking in.
// =========================================================================
export function NeighborNetRun({
  trace,
  matrix,
  splitGraph,
  step,
}: {
  trace: NNTrace;
  matrix: DistanceMatrix;
  splitGraph: SplitGraph;
  step: number;
}): JSX.Element {
  const S = 360;
  const c = S / 2;
  const R = S * 0.34;
  const order = trace.order;
  const n = order.length;
  const nSteps = trace.steps.length;
  const done = step >= nSteps;

  // Components after `step` merges = the componentsBefore of the next step (or
  // the single final component once everything is merged).
  const comps = step < nSteps ? trace.steps[step].componentsBefore : [order];
  const compOf = new Map<number, number>();
  comps.forEach((chain, ci) => chain.forEach((leaf) => compOf.set(leaf, ci)));
  const recent = step > 0 ? trace.steps[step - 1] : null;
  const recentPair = recent ? new Set(recent.endpoints) : new Set<number>();

  if (done) {
    return (
      <div style={{ position: 'absolute', inset: 0 }}>
        <SplitGraphView graph={splitGraph} matrix={matrix} highlight={null} onSelect={() => {}} />
      </div>
    );
  }

  const angleOf = (p: number): number => -Math.PI / 2 + (2 * Math.PI * p) / n;
  const pt = (p: number): Pt => ({ x: c + R * Math.cos(angleOf(p)), y: c + R * Math.sin(angleOf(p)) });

  // Oriented rigid blocks: a component of size >= 2 is a locked sub-arc that can
  // only move/flip as a whole. Draw it as a band hugging the circle.
  const posOf = new Map<number, number>();
  order.forEach((l, p) => posOf.set(l, p));
  const recentMerged = step > 0 ? new Set(trace.steps[step - 1].mergedOrder) : new Set<number>();
  const blocks = comps
    .filter((chain) => chain.length >= 2 && chain.length < n)
    .map((chain) => {
      const ps = chain.map((l) => posOf.get(l) as number);
      const set = new Set(ps);
      let start = ps[0];
      for (const p of ps) if (!set.has((p - 1 + n) % n)) { start = p; break; }
      const recent = chain.length === recentMerged.size && chain.every((l) => recentMerged.has(l));
      return { start, len: chain.length, recent };
    });
  const arcPath = (start: number, len: number): string => {
    const aR = R + 11;
    const a0 = angleOf(start);
    const a1 = angleOf((start + len - 1) % n);
    const largeArc = (len - 1) / n > 0.5 ? 1 : 0;
    return `M ${c + aR * Math.cos(a0)} ${c + aR * Math.sin(a0)} A ${aR} ${aR} 0 ${largeArc} 1 ${c + aR * Math.cos(a1)} ${c + aR * Math.sin(a1)}`;
  };

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
      <svg viewBox={`0 0 ${S} ${S}`} width="100%" height="100%" style={{ maxWidth: '100%', maxHeight: '100%' }}>
        <circle cx={c} cy={c} r={R} fill="none" stroke="var(--fg, #ccd)" strokeOpacity={0.1} strokeWidth={1} />
        {blocks.map((bk, i) => (
          <path key={`bk${i}`} d={arcPath(bk.start, bk.len)} fill="none" stroke={bk.recent ? C_HI : C_TEAL} strokeOpacity={bk.recent ? 0.9 : 0.5} strokeWidth={bk.recent ? 5 : 3.5} strokeLinecap="round" />
        ))}
        {order.map((leaf, p) => {
          const q = (p + 1) % n;
          const next = order[q];
          const isWrap = q === 0;
          const sameComp = compOf.get(leaf) === compOf.get(next);
          const locked = isWrap ? comps.length === 1 : sameComp;
          const isRecent = recentPair.has(leaf) && recentPair.has(next);
          const a = pt(p);
          const b = pt(q);
          return (
            <line key={`lk${p}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke={isRecent ? C_HI : locked ? C_TEAL : C_DIM}
              strokeOpacity={isRecent ? 1 : locked ? 0.9 : 0.22}
              strokeWidth={isRecent ? 4.5 : locked ? 3 : 1.4}
              strokeDasharray={locked || isRecent ? undefined : '3 4'}
              strokeLinecap="round" style={{ transition: 'stroke 200ms, stroke-width 200ms' }} />
          );
        })}
        {order.map((leaf, p) => {
          const a = pt(p);
          const dir = angleOf(p);
          const hot = recentPair.has(leaf);
          return (
            <g key={`v${leaf}`}>
              <circle cx={a.x} cy={a.y} r={hot ? 5 : 3.4} fill={hot ? C_HI : 'var(--accent, #cda434)'} />
              <text x={c + (R + 16) * Math.cos(dir)} y={c + (R + 16) * Math.sin(dir)} fontSize={14} fontFamily="monospace" fill={hot ? C_HI : 'var(--accent, #cda434)'} textAnchor="middle" dominantBaseline="middle">{matrix.leaves[leaf]}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// =========================================================================
// Neighbor-Joining — the tree growing join by join.
// =========================================================================
function layoutTree(trace: NJTrace, leafSet: Set<string>): Map<string, Pt> {
  const nj = trace.result;
  const adj = new Map<string, { to: string; len: number }[]>();
  nj.nodes.forEach((id) => adj.set(id, []));
  nj.edges.forEach((e) => {
    adj.get(e.left)!.push({ to: e.right, len: e.length });
    adj.get(e.right)!.push({ to: e.left, len: e.length });
  });
  const isLeaf = (id: string): boolean => leafSet.has(id);
  const root = nj.nodes.find((id) => !isLeaf(id)) ?? nj.nodes[0];
  const countLeaves = (node: string, parent: string | null): number => {
    let k = isLeaf(node) ? 1 : 0;
    for (const { to } of adj.get(node)!) if (to !== parent) k += countLeaves(to, node);
    return k;
  };
  const refLen = Math.max(...nj.edges.map((e) => Math.abs(e.length)), 1e-6);
  const minLen = 0.12 * refLen;
  const pos = new Map<string, Pt>();
  const place = (node: string, parent: string | null, a0: number, a1: number, x: number, y: number): void => {
    pos.set(node, { x, y });
    const children = adj.get(node)!.filter((nb) => nb.to !== parent);
    const total = children.reduce((s, ch) => s + countLeaves(ch.to, node), 0) || 1;
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

export function NeighborJoiningRun({
  trace,
  matrix,
  step,
}: {
  trace: NJTrace;
  matrix: DistanceMatrix;
  step: number;
}): JSX.Element {
  const S = 360;
  const leafSet = useMemo(() => new Set(matrix.leaves), [matrix]);
  const pos = useMemo(() => layoutTree(trace, leafSet), [trace, leafSet]);

  // Which step creates each edge, and which step reveals each interior node.
  const edgeStep = new Map<string, number>();
  const nodeStep = new Map<string, number>();
  matrix.leaves.forEach((l) => nodeStep.set(l, 0));
  trace.steps.forEach((s, i) => {
    if (s.newNode) nodeStep.set(s.newNode, i);
    edgeStep.set(njEdgeId(s.joined[0], s.newNode || s.joined[1]), i);
    if (!s.finalJoin) edgeStep.set(njEdgeId(s.joined[1], s.newNode), i);
  });

  const pts = [...pos.values()];
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const pad = 46;
  const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), 1e-6);
  const scale = (S - 2 * pad) / span;
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const T = (p: Pt): Pt => ({ x: S / 2 + (p.x - cx) * scale, y: S / 2 + (p.y - cy) * scale });
  const recent = step > 0 ? trace.steps[step - 1] : null;
  const recentNodes = new Set<string>(recent ? [recent.joined[0], recent.joined[1], recent.newNode].filter(Boolean) : []);

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
      <svg viewBox={`0 0 ${S} ${S}`} width="100%" height="100%" style={{ maxWidth: '100%', maxHeight: '100%' }}>
        {trace.result.edges.map((e, i) => {
          const created = edgeStep.get(njEdgeId(e.left, e.right)) ?? 0;
          if (created >= step) return null; // not yet joined
          const a = T(pos.get(e.left)!);
          const b = T(pos.get(e.right)!);
          const on = created === step - 1;
          return (
            <line key={`e${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke={on ? C_HI : 'var(--fg, #aeb6c8)'} strokeOpacity={on ? 1 : 0.8}
              strokeWidth={on ? 3.6 : 2} strokeLinecap="round" style={{ transition: 'stroke 200ms' }} />
          );
        })}
        {[...pos.entries()].map(([id, p]) => {
          const appears = nodeStep.get(id) ?? 0;
          const t = T(p);
          if (!leafSet.has(id)) {
            if (appears >= step) return null;
            return <circle key={`n${id}`} cx={t.x} cy={t.y} r={recentNodes.has(id) ? 4 : 2.5} fill={recentNodes.has(id) ? C_HI : 'var(--fg, #889)'} opacity={0.8} />;
          }
          const dir = Math.atan2(t.y - S / 2, t.x - S / 2);
          const hot = recentNodes.has(id);
          return (
            <g key={`l${id}`}>
              <circle cx={t.x} cy={t.y} r={hot ? 4.6 : 3.2} fill={hot ? C_HI : C_TEAL} />
              <text x={t.x + 13 * Math.cos(dir)} y={t.y + 13 * Math.sin(dir)} fontSize={14} fontFamily="monospace" fill={hot ? C_HI : 'var(--accent, #cda434)'} textAnchor="middle" dominantBaseline="middle">{id}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// =========================================================================
// The Q decision surface — the Q matrix over the current clusters at one step.
// Lower Q (a cheaper forced adjacency) is warmer; the minimum (the pair NJ
// joins) is outlined. This is the "why this pair" the join alone doesn't show.
// =========================================================================
export function QMatrix({ step }: { step: NJStep | null }): JSX.Element {
  if (!step || step.qScores.length === 0) {
    return <div style={{ fontSize: 12, color: 'var(--fg, #aab)', opacity: 0.7 }}>Terminal join — only two clusters remain; they connect directly (no Q choice).</div>;
  }
  const clusters = step.clustersBefore;
  const key = (a: string, b: string): string => (a < b ? `${a}|${b}` : `${b}|${a}`);
  const qOf = new Map<string, number>();
  step.qScores.forEach((s) => qOf.set(key(s.pair[0], s.pair[1]), s.q));
  const qs = step.qScores.map((s) => s.q);
  const lo = Math.min(...qs);
  const hi = Math.max(...qs);
  const tint = (q: number): string => { const t = hi > lo ? 1 - (q - lo) / (hi - lo) : 1; return `rgba(205, 164, 52, ${0.1 + 0.55 * t})`; };
  const chosen = key(step.joined[0], step.joined[1]);
  const head: React.CSSProperties = { fontFamily: 'var(--mono, monospace)', fontSize: 10, color: 'var(--accent, #cda434)', padding: '1px 4px', textAlign: 'center' };
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', fontFamily: 'var(--mono, monospace)', fontSize: 10 }}>
        <thead>
          <tr><th />{clusters.map((cl) => <th key={`h${cl}`} style={head}>{cl}</th>)}</tr>
        </thead>
        <tbody>
          {clusters.map((ri, i) => (
            <tr key={`r${ri}`}>
              <th style={head}>{ri}</th>
              {clusters.map((cj, j) => {
                if (j >= i) return <td key={`c${i}-${j}`} style={{ textAlign: 'center', color: 'var(--fg, #667)', opacity: 0.3 }}>{i === j ? '·' : ''}</td>;
                const q = qOf.get(key(ri, cj));
                const isMin = key(ri, cj) === chosen;
                return (
                  <td key={`c${i}-${j}`} style={{ padding: '1px 5px', textAlign: 'right', color: 'var(--fg, #dde)', background: q !== undefined ? tint(q) : 'transparent', outline: isMin ? '1.6px solid #ffd54a' : 'none', outlineOffset: -1 }}>
                    {q !== undefined ? q.toFixed(1) : ''}
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

// =========================================================================
// NeighborNet's decision surface: the component-level Q matrix at one merge.
// Lower Q (a cheaper merge) is warmer; the minimum (the components NeighborNet
// merges) is outlined. Labels are the components' leaf chains.
// =========================================================================
export function NNQMatrix({ step, matrix }: { step: NNStep | null; matrix: DistanceMatrix }): JSX.Element {
  if (!step || step.qScores.length === 0) {
    return <div style={{ fontSize: 12, color: 'var(--fg, #aab)', opacity: 0.7 }}>—</div>;
  }
  const labels = step.componentsBefore.map((chain) => chain.map((l) => matrix.leaves[l]).join(''));
  const pairKey = (a: number, b: number): string => `${Math.min(a, b)}|${Math.max(a, b)}`;
  const qOf = new Map<string, number>();
  step.qScores.forEach((s) => qOf.set(pairKey(s.pair[0], s.pair[1]), s.q));
  const qs = step.qScores.map((s) => s.q);
  const lo = Math.min(...qs);
  const hi = Math.max(...qs);
  const tint = (q: number): string => { const t = hi > lo ? 1 - (q - lo) / (hi - lo) : 1; return `rgba(63, 182, 166, ${0.1 + 0.55 * t})`; };
  const chosen = pairKey(step.leftIndex, step.rightIndex);
  const head: React.CSSProperties = { fontFamily: 'var(--mono, monospace)', fontSize: 10, color: 'var(--accent, #cda434)', padding: '1px 4px', textAlign: 'center' };
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', fontFamily: 'var(--mono, monospace)', fontSize: 10 }}>
        <thead>
          <tr><th />{labels.map((l, i) => <th key={`h${i}`} style={head}>{l}</th>)}</tr>
        </thead>
        <tbody>
          {labels.map((rl, i) => (
            <tr key={`r${i}`}>
              <th style={head}>{rl}</th>
              {labels.map((cl, j) => {
                if (j >= i) return <td key={`c${i}-${j}`} style={{ textAlign: 'center', color: 'var(--fg, #667)', opacity: 0.3 }}>{i === j ? '·' : ''}</td>;
                const q = qOf.get(pairKey(i, j));
                const isMin = pairKey(i, j) === chosen;
                return (
                  <td key={`c${i}-${j}`} style={{ padding: '1px 5px', textAlign: 'right', color: 'var(--fg, #dde)', background: q !== undefined ? tint(q) : 'transparent', outline: isMin ? '1.6px solid #ffd54a' : 'none', outlineOffset: -1 }}>
                    {q !== undefined ? q.toFixed(1) : ''}
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
