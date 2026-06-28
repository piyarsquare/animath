// Tab: Run. Play Neighbor-Joining and NeighborNet step by step on a chosen matrix.
// The Q matrix shows WHY each pair is joined (the minimum is chosen); NeighborNet
// locks the circular order one block at a time. Independent: its own matrix.

import React, { useEffect, useMemo, useState } from 'react';
import Workspace from '../../../chrome/workspace/Workspace';
import type { SectionDef, ViewDef, LayoutDef, ActionDef } from '../../../chrome/workspace/types';
import { Kicker } from '../../../chrome/readouts';
import { Pills } from '../../../components/ControlPanel';
import { usePersistentState } from '../../../lib/usePersistentState';
import { presetNames, type PresetName } from '../lib/metric';
import { computeNeighborJoiningTrace } from '../lib/neighborJoining';
import { computeNeighborNetTrace, solveSplitWeights, computeLevyPachterOrdering } from '../lib/splitWeights';
import { buildSplitGraph } from '../lib/splitGraph';
import { NeighborNetRun, NeighborJoiningRun, QMatrix, NNQMatrix } from '../views/AlgorithmView';
import { APP_ID, APP_TITLE, MatrixControls, useMatrixState, type NavProps } from './common';

const EXPLAINER = `# Run

Watch **Neighbor-Joining** and **NeighborNet** build, step by step, on the current
matrix — and see *why* each step happens, not just the result.

The **Q matrix** scores every pair by how cheap it is to join them; the minimum
(outlined) is the one chosen. **NeighborNet** locks in the circular order one
adjacency per merge — once a block grows past size two its orientation is fixed and
it can only flip **as a whole**.

Run on a preset, or edit the Distances panel (in the rail). This tab keeps its own
matrix; nothing here touches the other tabs.`;

export function RunTab({ nav }: { nav: NavProps }): JSX.Element {
  const st = useMatrixState('run');
  const { matrix } = st;
  const [runAlgo, setRunAlgo] = usePersistentState<'nn' | 'nj'>(`${APP_ID}:run:algo`, 'nn');
  const [runStep, setRunStep] = useState(0);
  const [runPlaying, setRunPlaying] = useState(false);

  const njTrace = useMemo(() => computeNeighborJoiningTrace(matrix), [matrix]);
  const nnTrace = useMemo(() => computeNeighborNetTrace(matrix), [matrix]);
  const lpOrder = useMemo(() => computeLevyPachterOrdering(matrix), [matrix]);
  const splitGraph = useMemo(() => buildSplitGraph(solveSplitWeights(matrix, lpOrder), lpOrder, st.n), [matrix, lpOrder, st.n]);
  const runMax = runAlgo === 'nj' ? njTrace.steps.length : nnTrace.steps.length;

  useEffect(() => { setRunStep(0); setRunPlaying(false); }, [matrix, runAlgo]);
  useEffect(() => {
    if (!runPlaying) return undefined;
    if (runStep >= runMax) { setRunPlaying(false); return undefined; }
    const t = setTimeout(() => setRunStep((s) => Math.min(s + 1, runMax)), 850);
    return () => clearTimeout(t);
  }, [runPlaying, runStep, runMax]);
  const stepFn = (): void => setRunStep((s) => Math.min(s + 1, runMax));
  const reset = (): void => { setRunStep(0); setRunPlaying(false); };
  const play = (): void => { if (runStep >= runMax) setRunStep(0); setRunPlaying((p) => !p); };

  let narration: string;
  if (runAlgo === 'nn') {
    if (runStep >= nnTrace.steps.length) narration = `Order locked: (${nnTrace.order.map((l) => matrix.leaves[l]).join(' ')}). The net is its split decomposition.`;
    else if (runStep === 0) narration = 'Star: every circular ordering is equally likely. For each pair of components, Q scores merging them; the minimum merges, and once a block exceeds size 2 its orientation locks — it can only flip as a whole.';
    else {
      const s = nnTrace.steps[runStep - 1];
      const chain = (idx: number): string => s.componentsBefore[idx].map((l) => matrix.leaves[l]).join('');
      const locked = s.mergedOrder.length > 2 ? ` Block ${s.mergedOrder.map((l) => matrix.leaves[l]).join('')} is now oriented — it flips only as a whole.` : '';
      narration = `Merge ${chain(s.leftIndex)} + ${chain(s.rightIndex)} — splice ${matrix.leaves[s.endpoints[0]]}–${matrix.leaves[s.endpoints[1]]}.${locked}`;
    }
  } else if (runStep >= njTrace.steps.length) narration = 'Tree complete — every cluster joined.';
  else if (runStep === 0) narration = 'Star: every circular ordering is equally likely. The Q matrix scores each pair by how cheap it is to force them adjacent — Play joins the minimum-Q pair.';
  else {
    const s = njTrace.steps[runStep - 1];
    narration = s.finalJoin
      ? `Final join: connect ${s.joined[0]}–${s.joined[1]}.`
      : `Join ${s.joined[0]}, ${s.joined[1]} → ${s.newNode}: the minimum of the Q matrix (Q ${Math.min(...s.qScores.map((x) => x.q)).toFixed(1)}).`;
  }
  const njDecision = njTrace.steps[Math.min(runStep > 0 ? runStep - 1 : 0, Math.max(0, njTrace.steps.length - 1))] ?? null;
  const nnDecision = nnTrace.steps[Math.min(runStep > 0 ? runStep - 1 : 0, Math.max(0, nnTrace.steps.length - 1))] ?? null;

  const sections: SectionDef[] = [
    {
      id: 'algo', title: 'Algorithm', arch: 'drive', estHeight: 210,
      node: (
        <div style={{ display: 'grid', gap: 10 }}>
          <Pills<'nn' | 'nj'> label="Animate" value={runAlgo} onChange={setRunAlgo} options={[{ value: 'nn', label: 'NeighborNet' }, { value: 'nj', label: 'Neighbor-Joining' }]} />
          <Pills<number> label="Leaves (n)" value={st.n} onChange={st.setN} options={[5, 6, 7, 8].map((k) => ({ value: k, label: String(k) }))} />
          <Pills<PresetName> value={st.presetName} onChange={st.setPresetName} options={presetNames(st.n).map((p) => ({ value: p, label: p.charAt(0).toUpperCase() + p.slice(1) }))} />
          <Kicker>Play to watch it run on the current matrix. Edit the matrix in the <b>Distances</b> panel (rail).</Kicker>
        </div>
      ),
    },
    {
      id: 'qmatrix', title: 'Q matrix', arch: 'readout', estHeight: 230,
      node: (
        <div style={{ display: 'grid', gap: 8 }}>
          {runAlgo === 'nj' ? <QMatrix step={njDecision} /> : <NNQMatrix step={nnDecision} matrix={matrix} />}
          <Kicker>Q = how cheap it is to {runAlgo === 'nj' ? 'force two clusters adjacent' : 'merge two components'} (lower is better).
            The <b style={{ color: 'var(--accent)' }}>minimum</b> (outlined) is chosen — that is <i>why</i>.</Kicker>
        </div>
      ),
    },
    {
      id: 'step', title: 'Step', arch: 'readout', estHeight: 140,
      node: <div style={{ fontFamily: 'var(--mono, monospace)', fontSize: 12, lineHeight: 1.6 }}>step {Math.min(runStep, runMax)} / {runMax}<br /><br />{narration}</div>,
    },
    {
      id: 'distances', title: 'Distances', arch: 'subject', estHeight: 320,
      node: <MatrixControls state={st} highlight={null} onSelect={() => {}} nOptions={[5, 6, 7, 8]} />,
    },
  ];
  const views: ViewDef[] = [
    {
      id: 'run', title: runAlgo === 'nn' ? 'NeighborNet — order locking in' : 'Neighbor-Joining — tree growing',
      defaultRect: { x: 360, y: 16, w: 560, h: 560 },
      node: runAlgo === 'nn'
        ? <NeighborNetRun trace={nnTrace} matrix={matrix} splitGraph={splitGraph} step={runStep} />
        : <NeighborJoiningRun trace={njTrace} matrix={matrix} step={runStep} />,
    },
  ];
  const actions: ActionDef[] = [
    { id: 'play', icon: runPlaying ? 'pause' : 'play', label: runPlaying ? 'Pause' : 'Play', primary: true, active: runPlaying, sectionId: 'algo', onClick: play },
    { id: 'step', icon: 'step', label: 'Step', sectionId: 'algo', disabled: runPlaying || runStep >= runMax, onClick: stepFn },
    { id: 'reset', icon: 'reset', label: 'Reset', sectionId: 'algo', disabled: runStep === 0 && !runPlaying, onClick: reset },
  ];
  const layouts: LayoutDef[] = [
    { id: 'essentials', name: 'Essentials', open: { algo: { x: 84, y: 16 }, qmatrix: { x: 84, y: 240 }, step: { x: 84, y: 486 } }, views: { run: { open: true } } },
  ];

  return (
    <Workspace appId={`${APP_ID}-run`} title={APP_TITLE} subtitle={`${st.n} leaves · ${runAlgo === 'nn' ? 'NeighborNet' : 'Neighbor-Joining'} step by step`}
      sections={sections} views={views} layouts={layouts} defaultLayoutId="essentials" explainer={EXPLAINER} actions={actions} {...nav} />
  );
}
