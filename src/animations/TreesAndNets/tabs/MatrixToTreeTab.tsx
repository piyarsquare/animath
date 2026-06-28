// Tab: Distance matrix → Neighbor-Joining tree. Edit the distances; the NJ tree is
// rebuilt. Click a pair to see its tree-path length vs. the actual distance — the
// gap is how far the data is from being tree-shaped.

import React, { useMemo, useState } from 'react';
import Workspace from '../../../chrome/workspace/Workspace';
import type { SectionDef, ViewDef, LayoutDef } from '../../../chrome/workspace/types';
import { Kicker } from '../../../chrome/readouts';
import { computeNeighborJoining, njLeafPathInfo } from '../lib/neighborJoining';
import { NJTreeView, type Highlight } from '../views/NetViews';
import { APP_ID, APP_TITLE, MatrixControls, useMatrixState, type NavProps } from './common';

const EXPLAINER = `# Matrix → Tree

Edit a table of pairwise **distances** and watch **Neighbor-Joining** build a tree
from it. NJ repeatedly joins the two leaves that are closest *after* correcting for
how far each one sits from everyone else (the **Q** criterion), so it recovers the
tree even when the raw distances are noisy.

Every distance table yields *some* tree. Click a cell to trace that pair through the
tree: the **tree distance** is the path length between them; the gap from the
**actual** distance is how far the data is from being exactly tree-shaped.

This tab does one thing: distances → tree. Nothing here is shared with the other
tabs.`;

export function MatrixToTreeTab({ nav }: { nav: NavProps }): JSX.Element {
  const st = useMatrixState('matrix-tree');
  const [hl, setHl] = useState<Highlight>(null);
  const nj = useMemo(() => computeNeighborJoining(st.matrix), [st.matrix]);

  let selNode: JSX.Element;
  if (hl?.kind === 'pair') {
    const a = st.matrix.leaves[hl.i];
    const b = st.matrix.leaves[hl.j];
    const actual = st.matrix.d[hl.i][hl.j];
    const treeDist = njLeafPathInfo(nj, a, b).dist;
    const delta = treeDist - actual;
    selNode = (
      <div style={{ fontFamily: 'var(--mono, monospace)', fontSize: 12, lineHeight: 1.7 }}>
        pair&nbsp;&nbsp;<b style={{ color: 'var(--accent)' }}>{a}–{b}</b><br />
        actual&nbsp;&nbsp;{actual.toFixed(2)}<br />
        tree&nbsp;&nbsp;&nbsp;&nbsp;{treeDist.toFixed(2)}&nbsp;&nbsp;(Δ {delta >= 0 ? '+' : ''}{delta.toFixed(2)})
      </div>
    );
  } else {
    selNode = <Kicker>Click a <b>matrix cell</b> to trace that pair through the tree (tree distance vs. actual).</Kicker>;
  }

  const sections: SectionDef[] = [
    {
      id: 'distances', title: 'Distances', arch: 'subject', estHeight: 360,
      node: (
        <div style={{ display: 'grid', gap: 10 }}>
          <MatrixControls state={st} highlight={hl} onSelect={setHl} />
          <Kicker>Edit any distance and the <b>Neighbor-Joining tree</b> rebuilds. Presets: <b>Tree</b> is clean,
            <b> Conflict</b> isn't tree-shaped (the tree will be a compromise).</Kicker>
        </div>
      ),
    },
    { id: 'sel', title: 'Selection', arch: 'readout', estHeight: 120, node: selNode },
  ];
  const views: ViewDef[] = [
    { id: 'tree', title: 'Neighbor-Joining tree', defaultRect: { x: 360, y: 16, w: 480, h: 500 }, node: <NJTreeView nj={nj} matrix={st.matrix} highlight={hl} onSelect={setHl} /> },
  ];
  const layouts: LayoutDef[] = [
    { id: 'essentials', name: 'Essentials', open: { distances: { x: 84, y: 16 } }, views: { tree: { open: true } } },
  ];

  return (
    <Workspace appId={`${APP_ID}-matrix-tree`} title={APP_TITLE} subtitle={`${st.n} leaves · distance matrix → Neighbor-Joining tree`}
      sections={sections} views={views} layouts={layouts} defaultLayoutId="essentials" explainer={EXPLAINER} {...nav} />
  );
}
