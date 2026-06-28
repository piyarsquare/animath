// Tab: Tree → distance matrix. Shape a tree by setting its branch lengths; read off
// the additive distance matrix it implies (each distance is the sum of the branch
// lengths on the path between the two leaves). The inverse of Matrix → Tree.

import React, { useMemo, useState } from 'react';
import Workspace from '../../../chrome/workspace/Workspace';
import type { SectionDef, ViewDef, LayoutDef } from '../../../chrome/workspace/types';
import { Kicker } from '../../../chrome/readouts';
import { Pills, Slider } from '../../../components/ControlPanel';
import { usePersistentState } from '../../../lib/usePersistentState';
import { defaultLeaves, metricFromSplits, type WeightedSplit } from '../lib/metric';
import { balancedTreeEdges } from '../lib/fattenTree';
import { computeNeighborJoining } from '../lib/neighborJoining';
import { MatrixEditor } from '../views/MatrixEditor';
import { NJTreeView, type Highlight } from '../views/NetViews';
import { EdgeSliders } from '../views/BuildPanel';
import { APP_ID, APP_TITLE, type NavProps } from './common';

const EXPLAINER = `# Tree → Matrix

A tree *is* a distance matrix. The distance between two leaves is the sum of the
**branch lengths** along the path connecting them — an **additive** metric.

Set the internal **branch lengths** and the leaf branch length and read off the
matrix the tree generates. Lengthen one internal edge and every distance that
*crosses* that edge grows by the same amount; the matrix is just the bookkeeping of
those sums.

This tab is the inverse of *Matrix → Tree*, and it's completely independent of it.`;

export function TreeToMatrixTab({ nav }: { nav: NavProps }): JSX.Element {
  const [n, setN] = usePersistentState<number>(`${APP_ID}:tree-matrix:n`, 6);
  const [leafLen, setLeafLen] = usePersistentState<number>(`${APP_ID}:tree-matrix:leaf`, 1);
  const [lengths, setLengths] = usePersistentState<Record<string, number>>(`${APP_ID}:tree-matrix:lengths`, {});
  const [hl, setHl] = useState<Highlight>(null);

  const treeEdges = useMemo(() => balancedTreeEdges(n), [n]);
  const matrix = useMemo(() => {
    const splits: WeightedSplit[] = [];
    for (let i = 0; i < n; i += 1) splits.push({ side: [i], weight: Math.max(0, leafLen) });
    treeEdges.forEach((e) => splits.push({ side: e.side, weight: Math.max(0, lengths[e.key] ?? 1) }));
    return metricFromSplits(n, splits, defaultLeaves(n));
  }, [n, treeEdges, lengths, leafLen]);
  const nj = useMemo(() => computeNeighborJoining(matrix), [matrix]);

  const setLen = (key: string, v: number): void => setLengths((prev) => ({ ...prev, [key]: Math.max(0, v) }));

  const sections: SectionDef[] = [
    {
      id: 'tree', title: 'Tree', arch: 'subject', estHeight: 180,
      node: (
        <div style={{ display: 'grid', gap: 10 }}>
          <Pills<number> label="Leaves (n)" value={n} onChange={setN} options={[5, 6, 7, 8, 9].map((k) => ({ value: k, label: String(k) }))} />
          <Slider label="Leaf branch length" value={leafLen} min={0} max={2} step={0.1} onChange={setLeafLen} format={(v) => v.toFixed(1)} />
          <Kicker>A balanced tree on n leaves. Set the internal edges below; the matrix on the right is the sum of
            branch lengths on each path.</Kicker>
        </div>
      ),
    },
    {
      id: 'edges', title: 'Branch lengths', arch: 'drive', estHeight: 300,
      node: <EdgeSliders edges={treeEdges} value={(k) => lengths[k] ?? 1} max={2} step={0.1} onChange={setLen} highlight={hl} onSelect={setHl} />,
    },
  ];
  const views: ViewDef[] = [
    { id: 'tree', title: 'Tree', defaultRect: { x: 360, y: 16, w: 400, h: 420 }, node: <NJTreeView nj={nj} matrix={matrix} highlight={hl} onSelect={setHl} /> },
    {
      id: 'matrix', title: 'Generated distances', defaultRect: { x: 776, y: 16, w: 360, h: 320 },
      node: (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', overflow: 'auto', padding: 12 }}>
          <MatrixEditor matrix={matrix} onCell={() => {}} highlight={hl} onSelect={setHl} readOnly />
        </div>
      ),
    },
  ];
  const layouts: LayoutDef[] = [
    { id: 'essentials', name: 'Essentials', open: { tree: { x: 84, y: 16 }, edges: { x: 84, y: 212 } }, views: { tree: { open: true }, matrix: { open: true } } },
  ];

  return (
    <Workspace appId={`${APP_ID}-tree-matrix`} title={APP_TITLE} subtitle={`${n} leaves · tree (branch lengths) → distance matrix`}
      sections={sections} views={views} layouts={layouts} defaultLayoutId="essentials" explainer={EXPLAINER} {...nav} />
  );
}
