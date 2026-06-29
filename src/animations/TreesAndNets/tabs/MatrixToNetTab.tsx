// Tab: Distance matrix → split network (NeighborNet). Edit the distances; the
// circular split system and its weights are fit, and drawn as a SplitsTree-style
// net. Where the data conflicts with any single tree, the net opens boxes.

import React, { useMemo, useState } from 'react';
import Workspace from '../../../chrome/workspace/Workspace';
import type { SectionDef, ViewDef, LayoutDef } from '../../../chrome/workspace/types';
import { Kicker } from '../../../chrome/readouts';
import { computeNeighborJoining } from '../lib/neighborJoining';
import { solveSplitWeights, computeLevyPachterOrdering } from '../lib/splitWeights';
import { buildSplitGraph } from '../lib/splitGraph';
import { SplitGraphView, SplitNetworkView, SplitWeightsList, type Highlight } from '../views/NetViews';
import { APP_ID, APP_TITLE, MatrixControls, useMatrixState, type NavProps } from './common';

const EXPLAINER = `# Matrix → Net

**NeighborNet** turns a distance matrix into a **split network**. It first finds a
circular order of the leaves, then fits a non-negative weight to every **split** (a
cut of the leaves into two arcs) so the weighted splits best reproduce the
distances.

A tree-like metric gives a few non-crossing chords — a tree in disguise. A
conflicted metric gives **crossing** splits, which the net draws as **boxes**: the
signature of structure no single tree can hold. Click any split (a chord, a weight
bar) to light it up across the views.

This tab does one thing: distances → net. Independent of the other tabs.`;

export function MatrixToNetTab({ nav }: { nav: NavProps }): JSX.Element {
  const st = useMatrixState('matrix-net');
  const [hl, setHl] = useState<Highlight>(null);
  const lpOrder = useMemo(() => computeLevyPachterOrdering(st.matrix), [st.matrix]);
  const weightedSplits = useMemo(() => solveSplitWeights(st.matrix, lpOrder), [st.matrix, lpOrder]);
  const splitGraph = useMemo(() => buildSplitGraph(weightedSplits, lpOrder, st.n), [weightedSplits, lpOrder, st.n]);
  const treeSplitKeys = useMemo(() => new Set(computeNeighborJoining(st.matrix).splitKeys), [st.matrix]);

  const sections: SectionDef[] = [
    {
      id: 'distances', title: 'Distances', arch: 'subject', estHeight: 360,
      node: (
        <div style={{ display: 'grid', gap: 10 }}>
          <MatrixControls state={st} highlight={hl} onSelect={setHl} />
          <Kicker>Edit any distance and the <b>net</b> refits. Try <b>Conflict</b> — the crossing splits open boxes.</Kicker>
        </div>
      ),
    },
    {
      id: 'weights', title: 'Split weights', arch: 'readout', estHeight: 240,
      node: (
        <div style={{ display: 'grid', gap: 8 }}>
          <SplitWeightsList splits={weightedSplits} treeSplitKeys={treeSplitKeys} highlight={hl} onSelect={setHl} />
          <Kicker>Non-negative weights of the circular splits. <b style={{ color: 'var(--fg)' }}>△ tree</b> marks splits
            that are also edges of the Neighbor-Joining tree.</Kicker>
        </div>
      ),
    },
  ];
  const views: ViewDef[] = [
    { id: 'splitgraph', title: 'Split network (SplitsTree)', defaultRect: { x: 360, y: 16, w: 460, h: 380 }, node: <SplitGraphView graph={splitGraph} matrix={st.matrix} highlight={hl} onSelect={setHl} /> },
    { id: 'chordnet', title: 'Chord net (simple)', defaultRect: { x: 836, y: 16, w: 380, h: 380 }, node: <SplitNetworkView splits={weightedSplits} order={lpOrder} matrix={st.matrix} highlight={hl} onSelect={setHl} /> },
  ];
  const layouts: LayoutDef[] = [
    { id: 'essentials', name: 'Essentials', open: { distances: { x: 84, y: 16 }, weights: { x: 84, y: 410 } }, views: { splitgraph: { open: true }, chordnet: { open: false } } },
  ];

  return (
    <Workspace appId={`${APP_ID}-matrix-net`} title={APP_TITLE} subtitle={`${st.n} leaves · distance matrix → split network`}
      sections={sections} views={views} layouts={layouts} defaultLayoutId="essentials" explainer={EXPLAINER} {...nav} />
  );
}
