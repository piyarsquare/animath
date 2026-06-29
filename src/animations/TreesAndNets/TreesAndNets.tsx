// Trees and Nets — a tabbed app whose tabs are INDEPENDENT domains. Each tab is one
// transform (input → function → output) and renders its own <Workspace> with its own
// state and its own teaching explainer. There is deliberately NO crossover between
// tabs: no shared matrix, no shared selection. The shared atom is conceptual — a
// weighted split system — of which a distance matrix, a tree, and a net are views.
//
// This shell is just the tab router. Each tab lives in tabs/.

import React from 'react';
import { usePersistentState } from '../../lib/usePersistentState';
import { APP_ID, TABS, type NavProps } from './tabs/common';
import { MatrixToTreeTab } from './tabs/MatrixToTreeTab';
import { TreeToMatrixTab } from './tabs/TreeToMatrixTab';
import { MatrixToNetTab } from './tabs/MatrixToNetTab';
import { CircularSumsTab } from './tabs/CircularSumsTab';
import { RunTab } from './tabs/RunTab';

export default function TreesAndNets(): JSX.Element {
  const [tab, setTab] = usePersistentState<string>(`${APP_ID}:tab`, 'matrix-tree');
  const nav: NavProps = { modes: TABS, activeMode: tab, onModeChange: setTab };
  switch (tab) {
    case 'tree-matrix': return <TreeToMatrixTab nav={nav} />;
    case 'matrix-net': return <MatrixToNetTab nav={nav} />;
    case 'sums': return <CircularSumsTab nav={nav} />;
    case 'run': return <RunTab nav={nav} />;
    case 'matrix-tree':
    default: return <MatrixToTreeTab nav={nav} />;
  }
}
