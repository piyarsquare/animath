// Shared scaffolding for the tabbed app. Each tab is an INDEPENDENT mini-app: it
// renders its own <Workspace> (its own appId → its own persisted layout) and holds
// its own state. Nothing is shared between tabs — no shared matrix, no shared
// selection. The only thing they have in common is the tab bar (Workspace
// `modes`), passed down identically so the bar looks the same on every tab.

import React, { useCallback, useEffect, useState } from 'react';
import type { WorkspaceMode } from '../../../chrome/workspace/types';
import { Pills } from '../../../components/ControlPanel';
import { usePersistentState } from '../../../lib/usePersistentState';
import { preset, presetNames, type DistanceMatrix, type PresetName } from '../lib/metric';
import { MatrixEditor } from '../views/MatrixEditor';
import type { Highlight, SelectHandler } from '../views/NetViews';

/** Persistence base; each tab namespaces under `${APP_ID}-${tabId}`. */
export const APP_ID = 'tn3';
export const APP_TITLE = 'Trees and Nets';

/** The tab bar. Each entry is one self-contained domain (one transform). */
export const TABS: WorkspaceMode[] = [
  { id: 'matrix-tree', label: 'Matrix → Tree' },
  { id: 'tree-matrix', label: 'Tree → Matrix' },
  { id: 'matrix-net', label: 'Matrix → Net' },
  { id: 'sums', label: 'Circular sums' },
  { id: 'run', label: 'Run' },
];

/** The shell passes these to every tab so the tab bar is identical everywhere. */
export interface NavProps {
  modes: WorkspaceMode[];
  activeMode: string;
  onModeChange: (id: string) => void;
}

const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/** A self-contained editable distance matrix (state + cell editing + presets). */
export interface MatrixState {
  n: number;
  setN: (n: number) => void;
  presetName: PresetName;
  setPresetName: (p: PresetName) => void;
  matrix: DistanceMatrix;
  setMatrix: React.Dispatch<React.SetStateAction<DistanceMatrix>>;
  setCell: (i: number, j: number, value: number) => void;
}

export function useMatrixState(key: string, defaultN = 6): MatrixState {
  const [n, setN] = usePersistentState<number>(`${APP_ID}:${key}:n`, defaultN);
  const [presetName, setPresetName] = usePersistentState<PresetName>(`${APP_ID}:${key}:preset`, 'tree');
  const [matrix, setMatrix] = useState<DistanceMatrix>(() => preset(n, presetName));
  useEffect(() => { setMatrix(preset(n, presetName)); }, [n, presetName]);
  const setCell = useCallback((i: number, j: number, value: number) => {
    setMatrix((prev) => {
      const d = prev.d.map((row) => row.slice());
      d[i][j] = Math.max(0, value);
      d[j][i] = Math.max(0, value);
      return { leaves: prev.leaves, d };
    });
  }, []);
  return { n, setN, presetName, setPresetName, matrix, setMatrix, setCell };
}

/** The standard "Distances" control: leaf count, preset, and the matrix grid. */
export function MatrixControls({
  state, highlight, onSelect, readOnly = false, nOptions = [5, 6, 7, 8, 9],
}: {
  state: MatrixState;
  highlight: Highlight;
  onSelect: SelectHandler;
  readOnly?: boolean;
  nOptions?: number[];
}): JSX.Element {
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <Pills<number> label="Leaves (n)" value={state.n} onChange={state.setN}
        options={nOptions.map((k) => ({ value: k, label: String(k) }))} />
      {!readOnly && (
        <Pills<PresetName> label="Preset metric" value={state.presetName} onChange={state.setPresetName}
          options={presetNames(state.n).map((p) => ({ value: p, label: cap(p) }))} />
      )}
      <MatrixEditor matrix={state.matrix} onCell={state.setCell} highlight={highlight} onSelect={onSelect} readOnly={readOnly} />
    </div>
  );
}
