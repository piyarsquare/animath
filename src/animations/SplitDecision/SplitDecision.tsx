/**
 * Split Decision — a population evolves a two-way split of a binary matrix. The
 * reproductive rule is the experiment; the selection score is the landscape.
 * Watch mode: the Arena (the matrix sorting itself), the Population, the Trace.
 * The Lab (a sweep over planted signal × rule) is Phase 3.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './splitDecision.css';
import Workspace from '../../chrome/workspace/Workspace';
import type { ActionDef, LayoutDef, SectionDef, ViewDef, WorkspaceMode } from '../../chrome/workspace/types';
import { Slider, Pills, Select, Checkbox, NumberInput, Button, Note } from '../../components/ControlPanel';
import { StatGrid } from '../../chrome/readouts';
import { usePersistentState } from '../../lib/usePersistentState';
import explainerText from './EXPLAINER.md?raw';
import { FIXTURES, PAGE50_TRAP_CUT, degrees, fixtureById, handshake, planted, toggleCell, type BinaryMatrix, type Cut } from './matrix';
import { SCORES, SCORE_IDS, evaluate, exactOptimum, isStrictLocalOptimum, type ScoreId } from './scores';
import { DEFAULT_CONFIG, ENGINE_VERSION, RULES, RULE_IDS, type EvolveConfig, type FitnessMode, type RuleId } from './evolve';
import { useWatchLoop } from './useWatchLoop';
import { Arena } from './views/Arena';
import { Population } from './views/Population';
import { Trace } from './views/Trace';
import { Sweep, type SweepRecord } from './views/Sweep';
import { HAS_WORKERS, SweepPool, poolSize } from './lab/pool';
import { canEnumerate, evaluationCount, jobCount, type JobResult, type SweepConfig } from './lab/sweep';

const NS = 'split-decision';
const MAX_CELLS = 1600;
type Source = 'planted' | 'fixture';
type Mode = 'watch' | 'lab';
type Preset = 'signal' | 'trap';
const MAX_CATALOG = 12;
const SIGNAL_LEVELS = [0, 0.2, 0.4, 0.6, 0.8, 1];

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const sig2 = (v: number) => (Math.abs(v) >= 100 ? v.toFixed(0) : Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(2));

export default function SplitDecision() {
  /* ── the landscape (Score) ── */
  const [scoreId, setScoreId] = usePersistentState<ScoreId>(`${NS}:score`, DEFAULT_CONFIG.scoreId);
  const [fitness, setFitness] = usePersistentState<FitnessMode>(`${NS}:fitness`, 'sampled');

  /* ── the instance (Matrix) ── */
  const [source, setSource] = usePersistentState<Source>(`${NS}:source`, 'planted');
  const [fixtureId, setFixtureId] = usePersistentState(`${NS}:fixture`, 'sparse-8x10');
  const [pm, setPm] = usePersistentState(`${NS}:pm`, 10);
  const [pn, setPn] = usePersistentState(`${NS}:pn`, 10);
  const [r1, setR1] = usePersistentState(`${NS}:r1`, 5);
  const [c1, setC1] = usePersistentState(`${NS}:c1`, 5);
  const [rhoIn, setRhoIn] = usePersistentState(`${NS}:rhoIn`, 0.9);
  const [rhoOut, setRhoOut] = usePersistentState(`${NS}:rhoOut`, 0.1);
  const [matrixSeed, setMatrixSeed] = usePersistentState(`${NS}:matrixSeed`, 1);
  const [paint, setPaint] = useState(false);
  const [custom, setCustom] = useState<{ matrix: BinaryMatrix; planted: Cut | null } | null>(null);

  /* ── the experiment (Reproduction) ── */
  const [rule, setRule] = usePersistentState<RuleId>(`${NS}:rule`, DEFAULT_CONFIG.rule);
  const [N, setN] = usePersistentState(`${NS}:N`, DEFAULT_CONFIG.N);
  const [k, setK] = usePersistentState(`${NS}:k`, DEFAULT_CONFIG.selection.k);
  const [mu, setMu] = usePersistentState(`${NS}:mu`, DEFAULT_CONFIG.mu);
  const [sigma, setSigma] = usePersistentState(`${NS}:sigma`, DEFAULT_CONFIG.sigma);
  const [sexRatio, setSexRatio] = usePersistentState(`${NS}:sexRatio`, DEFAULT_CONFIG.sexRatio);
  const [seed, setSeed] = usePersistentState(`${NS}:seed`, DEFAULT_CONFIG.seed);

  /* ── the picture (Cells) ── */
  const [sort, setSort] = usePersistentState(`${NS}:sort`, true);
  const [showPlanted, setShowPlanted] = usePersistentState(`${NS}:showPlanted`, true);
  const [tint, setTint] = usePersistentState(`${NS}:tint`, true);
  const [showSexes, setShowSexes] = usePersistentState(`${NS}:showSexes`, true);

  /* ── the Lab ── */
  const [mode, setMode] = usePersistentState<Mode>(`${NS}:mode`, 'watch');
  const [preset, setPreset] = usePersistentState<Preset>(`${NS}:preset`, 'signal');
  const [labLevels, setLabLevels] = usePersistentState(`${NS}:labLevels`, 6);
  const [labSeeds, setLabSeeds] = usePersistentState(`${NS}:labSeeds`, 12);
  const [labGMax, setLabGMax] = usePersistentState(`${NS}:labGMax`, 300);
  const [labRules, setLabRules] = usePersistentState<RuleId[]>(`${NS}:labRules`, ['clonal', 'mixer', 'prom']);
  const [labSeedBase, setLabSeedBase] = usePersistentState(`${NS}:labSeedBase`, 1);
  const [catalog, setCatalog] = usePersistentState<SweepRecord[]>(`${NS}:sweeps`, []);
  const [selectedRecord, setSelectedRecord] = useState<number | null>(null);
  const [selectedSignal, setSelectedSignal] = useState(SIGNAL_LEVELS.length - 1);
  const [sweeping, setSweeping] = useState(false);
  const poolRef = useRef<SweepPool | null>(null);
  const activeSweepRef = useRef<number | null>(null);

  const r1c = clamp(r1, 1, pm - 1), c1c = clamp(c1, 1, pn - 1);
  const base = useMemo(() => {
    if (source === 'fixture') {
      const f = fixtureById(fixtureId) ?? FIXTURES[0];
      return { matrix: f.matrix, planted: f.planted };
    }
    const inst = planted({ m: pm, n: pn, r1: r1c, c1: c1c, rhoIn, rhoOut }, matrixSeed);
    return { matrix: inst.matrix, planted: inst.planted as Cut | null };
  }, [source, fixtureId, pm, pn, r1c, c1c, rhoIn, rhoOut, matrixSeed]);
  const inst = custom ?? base;
  const M = inst.matrix;
  const d = useMemo(() => degrees(M), [M]);
  const spec = SCORES[scoreId];
  const optimum = useMemo(() => exactOptimum(M, d, spec), [M, d, spec]);
  const plantedScore = inst.planted ? evaluate(M, d, spec, inst.planted) : null;
  const shake = useMemo(() => handshake(M), [M]);

  const cfg: EvolveConfig = useMemo(() => ({
    engine: ENGINE_VERSION, scoreId, fitness, samplesPerEval: 1, rule, N,
    selection: { kind: 'tournament', k }, mu, sigma, sexRatio, seed,
  }), [scoreId, fitness, rule, N, k, mu, sigma, sexRatio, seed]);

  const loop = useWatchLoop(M, d, cfg, optimum ? optimum.score : null);
  const snap = loop.snapshot;

  // Leaving Watch pauses the population (it survives in the loop's ref); leaving the
  // Lab stops the pool. Unmount disposes it.
  const setPlaying = loop.setPlaying;
  useEffect(() => { if (mode !== 'watch') setPlaying(false); }, [mode, setPlaying]);
  // Stopping (or leaving the Lab) marks the active record stopped, so the catalog
  // never shows a sweep as running that no worker can add to.
  const stopSweep = useCallback(() => {
    poolRef.current?.dispose(); poolRef.current = null;
    const id = activeSweepRef.current; activeSweepRef.current = null;
    if (id !== null) setCatalog(c => c.map(x => (x.id === id && !x.done ? { ...x, done: true, stopped: true } : x)));
    setSweeping(false);
  }, [setCatalog]);
  useEffect(() => { if (mode !== 'lab') stopSweep(); }, [mode, stopSweep]);
  useEffect(() => () => { poolRef.current?.dispose(); }, []);

  const trapScore = useMemo(() => {
    const f = fixtureById('page50-4x4')!;
    return SCORE_IDS.filter(id => isStrictLocalOptimum(f.matrix, degrees(f.matrix), SCORES[id], PAGE50_TRAP_CUT));
  }, []);

  const sweepCfg: SweepConfig = useMemo(() => {
    const { rule: _rule, seed: _seed, ...base } = cfg;
    const levels = SIGNAL_LEVELS.slice(SIGNAL_LEVELS.length - Math.max(2, Math.min(SIGNAL_LEVELS.length, labLevels)));
    return preset === 'trap'
      ? { engine: ENGINE_VERSION, base: { ...base, scoreId: 'modularity' }, instance: { kind: 'fixture', id: 'page50-4x4', startAt: PAGE50_TRAP_CUT }, signals: [0], rules: labRules, seeds: labSeeds, baseSeed: labSeedBase, matrixSeed, gMax: labGMax, sustain: 5 }
      : { engine: ENGINE_VERSION, base, instance: { kind: 'planted', m: pm, n: pn, r1: r1c, c1: c1c }, signals: levels, rules: labRules, seeds: labSeeds, baseSeed: labSeedBase, matrixSeed, gMax: labGMax, sustain: 5 };
  }, [cfg, preset, labLevels, labRules, labSeeds, labSeedBase, matrixSeed, labGMax, pm, pn, r1c, c1c]);

  const enumerable = canEnumerate(sweepCfg);
  const runSweep = useCallback(() => {
    stopSweep();
    if (!labRules.length || !canEnumerate(sweepCfg)) return;
    const id = (catalog.reduce((mx, r) => Math.max(mx, r.id), 0)) + 1;
    const record: SweepRecord = { id, when: new Date().toISOString(), cfg: sweepCfg, results: [], done: false };
    setCatalog(c => [record, ...c].slice(0, MAX_CATALOG));
    setSelectedRecord(id);
    setSelectedSignal(sweepCfg.signals.length - 1);
    const append = (r: JobResult) => setCatalog(c => c.map(x => (x.id === id ? { ...x, results: [...x.results, r] } : x)));
    const pool = new SweepPool(sweepCfg, append, () => { setCatalog(c => c.map(x => (x.id === id ? { ...x, done: true } : x))); setSweeping(false); poolRef.current = null; activeSweepRef.current = null; });
    poolRef.current = pool;
    activeSweepRef.current = id;
    setSweeping(true);
    pool.start();
    setLabSeedBase(b => b + 1); // the next sweep is a fresh draw
  }, [stopSweep, labRules.length, catalog, sweepCfg, setCatalog, setLabSeedBase]);
  const clearCatalog = useCallback(() => { stopSweep(); setCatalog([]); setSelectedRecord(null); }, [stopSweep, setCatalog]);
  useEffect(() => {
    // A record still marked running after a reload has no pool behind it.
    setCatalog(c => (c.some(x => !x.done && x.id !== activeSweepRef.current) ? c.map(x => (!x.done && x.id !== activeSweepRef.current ? { ...x, done: true, stopped: true } : x)) : c));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const shownRecord = catalog.find(r => r.id === selectedRecord) ?? catalog[0] ?? null;

  const onToggleCell = useCallback((i: number, j: number) => {
    setCustom(c => { const cur = c ?? inst; return { matrix: toggleCell(cur.matrix, i, j), planted: cur.planted }; });
  }, [inst]);
  // Any change to the instance source discards the painted matrix.
  const clearCustom = useCallback(() => setCustom(null), []);

  /* ── panels ── */
  const scoreNode = (
    <>
      <Select label="Judge" value={scoreId} onChange={v => setScoreId(v)}
        options={SCORE_IDS.map(id => ({ value: id, label: SCORES[id].name }))} />
      <Note>
        <b>{spec.history}</b> · <code>{spec.formula}</code>
      </Note>
      <Note>Blind spot: {spec.blindSpot}</Note>
      <Pills label="Fitness" value={fitness} onChange={setFitness}
        options={[{ value: 'sampled', label: 'Sampled' }, { value: 'rounded', label: 'Rounded' }]} />
      <Note>Sampled draws one split from the genome's probabilities (the canalization mechanism); Rounded scores the rounded genome.</Note>
    </>
  );

  const nMax = Math.max(4, Math.floor(MAX_CELLS / pm));
  const matrixNode = (
    <>
      <Pills label="Instance" value={source} onChange={v => { setSource(v); clearCustom(); }}
        options={[{ value: 'planted', label: 'Planted' }, { value: 'fixture', label: 'Fixture' }]} />
      {source === 'fixture' ? (
        <>
          <Select label="Fixture" value={fixtureId} onChange={v => { setFixtureId(v); clearCustom(); }}
            options={FIXTURES.map(f => ({ value: f.id, label: f.name }))} />
          <Note>{fixtureById(fixtureId)?.blurb}</Note>
        </>
      ) : (
        <>
          <Slider label="rows m" value={pm} min={4} max={40} step={1} onChange={v => { setPm(Math.round(v)); if (Math.round(v) * pn > MAX_CELLS) setPn(Math.floor(MAX_CELLS / Math.round(v))); clearCustom(); }} format={v => `${v}`} />
          <Slider label="columns n" value={pn} min={4} max={nMax} step={1} onChange={v => { setPn(Math.round(v)); clearCustom(); }} format={v => `${v}`} />
          <Slider label="|R₁| — rows in the first class" value={r1c} min={1} max={pm - 1} step={1} onChange={v => { setR1(Math.round(v)); clearCustom(); }} format={v => `${v}`} />
          <Slider label="|C₁| — columns in the first class" value={c1c} min={1} max={pn - 1} step={1} onChange={v => { setC1(Math.round(v)); clearCustom(); }} format={v => `${v}`} />
          <Slider label="ρ_in — cross-block density" value={rhoIn} min={0} max={1} step={0.05} onChange={v => { setRhoIn(v); clearCustom(); }} format={v => v.toFixed(2)} />
          <Slider label="ρ_out — diagonal-block density" value={rhoOut} min={0} max={1} step={0.05} onChange={v => { setRhoOut(v); clearCustom(); }} format={v => v.toFixed(2)} />
          <div className="sd-row">
            <NumberInput label="Matrix seed" value={matrixSeed} onChange={v => { setMatrixSeed(Math.round(v)); clearCustom(); }} min={0} integer />
            <Button variant="secondary" icon="reset" onClick={() => { setMatrixSeed(s => s + 1); clearCustom(); }} style={{ alignSelf: 'flex-end' }}>New draw</Button>
          </div>
          <Note>Signal = ρ_in − ρ_out = <b>{(rhoIn - rhoOut).toFixed(2)}</b>. Rows and columns are stored shuffled; the Arena's sort is what reveals the split.</Note>
        </>
      )}
      <Checkbox label="Paint mode — click cells to toggle them" checked={paint} onChange={setPaint} />
      {custom && <Note><b>Custom matrix</b> (painted; not saved). Change the instance to discard it.</Note>}
      <Note>{M.m}×{M.n} · {d.e} ones · a zero-violation split with four nonempty classes {shake ? 'exists' : 'does not exist'} (Tarjan's Handshake).</Note>
    </>
  );

  const ruleSpec = RULES[rule];
  const reproNode = (
    <>
      <Pills label="World" value={rule} onChange={setRule}
        options={RULE_IDS.map(id => ({ value: id, label: RULES[id].name.replace(/^(Muller's |Hardy–Weinberg |Potter–De Jong )/, '') }))} />
      <Note><b>{ruleSpec.name}</b> — {ruleSpec.blurb}</Note>
      <Slider label="Population N" value={N} min={8} max={256} step={8} onChange={v => setN(Math.round(v))} format={v => `${v}`} />
      <Slider label="Tournament size k (1 = drift)" value={k} min={1} max={6} step={1} onChange={v => setK(Math.round(v))} format={v => `${v}`} />
      <Slider label="Mutation rate μ per locus" value={mu} min={0} max={0.5} step={0.01} onChange={setMu} format={v => v.toFixed(2)} />
      <Slider label="Mutation step σ" value={sigma} min={0.01} max={0.5} step={0.01} onChange={setSigma} format={v => v.toFixed(2)} />
      {rule === 'prom' && <Slider label="Sex ratio (row-sex fraction)" value={sexRatio} min={0.1} max={0.9} step={0.05} onChange={setSexRatio} format={v => v.toFixed(2)} />}
      <div className="sd-row">
        <NumberInput label="Run seed" value={seed} onChange={v => setSeed(Math.round(v))} min={0} integer />
        <Button variant="secondary" icon="reset" onClick={() => setSeed(s => s + 1)} style={{ alignSelf: 'flex-end' }}>Next seed</Button>
      </div>
    </>
  );

  const runNode = (
    <>
      <div className="sd-status">gen <b>{snap?.gen ?? 0}</b>{loop.playing ? ' · running' : ' · paused'}{snap?.reachedAt !== null && snap?.reachedAt !== undefined ? ` · reached the optimum at gen ${snap.reachedAt}` : ''}</div>
      <Slider label="Generations per second" value={loop.gps} min={1} max={200} step={1} onChange={v => loop.setGps(Math.round(v))} format={v => `${v}`}
        stops={[{ value: 5, label: 'slow' }, { value: 20, label: '20' }, { value: 100, label: 'fast' }]} />
      <Note>Play, Step and Reset live on the action strip. Reset replays the same seed; Next seed (in Reproduction) starts a fresh run.</Note>
    </>
  );

  const st = snap?.stats;
  const readoutNode = (
    <>
      <StatGrid stats={[
        { k: 'generation', v: `${snap?.gen ?? 0}` },
        { k: `best (rounded), ${spec.units}`, v: st ? sig2(st.bestRoundedFit) : '—' },
        { k: 'mean fitness', v: st ? sig2(st.meanFit) : '—' },
        { k: 'entropy, bits/locus', v: st ? st.meanEntropy.toFixed(2) : '—' },
        { k: 'exact optimum', v: optimum ? sig2(optimum.score) : 'too big to enumerate' },
        { k: 'planted split', v: plantedScore !== null ? sig2(plantedScore) : '—' },
        { k: 'reached (sustained 5 gens)', v: snap?.reachedAt !== null && snap?.reachedAt !== undefined ? `gen ${snap.reachedAt}` : optimum ? 'not yet' : '—' },
        { k: 'same convention as best', v: st ? `${Math.round(st.conventionFraction * 100)}%` : '—' },
      ]} />
      <Note>"Reached" reads the fittest individual's <b>rounded</b> split, sustained for five generations — a lucky sample does not count. Entropy excludes zero-degree rows and columns, which no ones-only judge can see.</Note>
    </>
  );

  const cellsNode = (
    <>
      <Checkbox label="Sort rows and columns by the population mean" checked={sort} onChange={setSort} />
      <Checkbox label="Mark the planted classes on the edge strips" checked={showPlanted} onChange={setShowPlanted} />
      <Checkbox label="Tint the consensus cross blocks" checked={tint} onChange={setTint} />
      <Checkbox label="Mark sexes in the Population" checked={showSexes} onChange={setShowSexes} />
      <Note>Edge bars are the population's mean p̄ᵢ / q̄ⱼ; the whiskers span its interquartile range — the diversity, in the picture.</Note>
    </>
  );

  const evals = evaluationCount(sweepCfg);
  const labNode = (
    <>
      <Pills label="Preset" value={preset} onChange={v => { setPreset(v); if (v === 'trap') setScoreId('modularity'); }}
        options={[{ value: 'signal', label: 'Signal sweep' }, { value: 'trap', label: 'Escape the trap' }]} />
      {preset === 'signal' ? (
        <>
          <Note>Planted {pm}×{pn} (|R₁| = {r1c}, |C₁| = {c1c}) from the Matrix panel's sizes, at each signal level; every rule and seed at a level shares the same matrix. Judge, fitness, N, k, μ, σ come from the Judge and Reproduction panels.</Note>
          <Slider label="Signal levels (from 1 downward)" value={Math.max(2, Math.min(SIGNAL_LEVELS.length, labLevels))} min={2} max={SIGNAL_LEVELS.length} step={1} onChange={v => setLabLevels(Math.round(v))} format={v => `${v}`} />
        </>
      ) : (
        <Note>The monograph's page-50 4×4 with every individual started at the cut that alternating best responses cannot leave. Judge forced to <b>Newman's Leftovers</b>{trapScore.length ? ` (the only judge for which it is a strict single-flip local optimum${trapScore.length > 1 ? 's' : ''}: ${trapScore.map(id => SCORES[id].name).join(', ')})` : ''}. "Reached" means the global optimum.</Note>
      )}
      <div className="sd-row">
        {RULE_IDS.map(id => <Checkbox key={id} label={RULES[id].name.split(' ').pop()!} checked={labRules.includes(id)} onChange={on => setLabRules(rs => (on ? RULE_IDS.filter(r => r === id || rs.includes(r)) : rs.filter(r => r !== id)))} />)}
      </div>
      <Slider label="Seeds per cell" value={labSeeds} min={4} max={32} step={4} onChange={v => setLabSeeds(Math.round(v))} format={v => `${v}`} />
      <Slider label="G_max — generations per run" value={labGMax} min={50} max={1000} step={50} onChange={v => setLabGMax(Math.round(v))} format={v => `${v}`} />
      {!enumerable && <Note><b>Too big to score.</b> The Lab defines "reached" against the exact optimum, which the Exhaustive Bailiff enumerates only for m + n ≤ 20. Shrink the matrix in the Matrix panel to run a sweep.</Note>}
      <div className="sd-status">{jobCount(sweepCfg)} runs · {evals >= 1e6 ? `${(evals / 1e6).toFixed(1)}M` : `${Math.round(evals / 1e3)}k`} evaluations · {HAS_WORKERS ? `${Math.min(poolSize(), jobCount(sweepCfg))} workers` : 'main thread (no Workers here)'}{sweeping && shownRecord ? ` · ${shownRecord.results.length}/${jobCount(shownRecord.cfg)} done` : ''}</div>
      <Note>The Lab matches evaluations per generation across rules, not lineages: the Prom's two sexes each hold about half the population.</Note>
    </>
  );

  const sections: SectionDef[] = mode === 'lab' ? [
    { id: 'score', title: 'Judge', arch: 'subject', node: scoreNode, estHeight: 300 },
    { id: 'repro', title: 'Reproduction', arch: 'drive', node: reproNode, estHeight: 420 },
    { id: 'lab', title: 'Sweep', arch: 'lab', node: labNode, estHeight: 540 },
  ] : [
    { id: 'score', title: 'Judge', arch: 'subject', node: scoreNode, estHeight: 300 },
    { id: 'matrix', title: 'Matrix', arch: 'domain', node: matrixNode, estHeight: source === 'planted' ? 520 : 260 },
    { id: 'cells', title: 'Cells', arch: 'marks', node: cellsNode, estHeight: 210 },
    { id: 'repro', title: 'Reproduction', arch: 'drive', node: reproNode, estHeight: 420 },
    { id: 'run', title: 'Run', arch: 'playback', node: runNode, estHeight: 170 },
    { id: 'readout', title: 'Readouts', arch: 'readout', node: readoutNode, estHeight: 330 },
  ];

  const animate = !loop.playing || loop.gps <= 10;
  const views: ViewDef[] = mode === 'lab' ? [
    {
      id: 'sweep', title: 'Sweep — the race', defaultRect: { x: 372, y: 16, w: 820, h: 700 },
      node: <Sweep record={shownRecord} catalog={catalog} selectedSignal={selectedSignal} onSelectSignal={setSelectedSignal} onSelectRecord={setSelectedRecord} />,
    },
  ] : [
    {
      id: 'arena', title: 'Arena — the matrix', defaultRect: { x: 372, y: 16, w: 560, h: 520 },
      node: <Arena M={M} d={d} snapshot={snap} planted={inst.planted} orientationBlind={spec.orientationBlind}
        options={{ sort, showPlanted, tint, paint, animate }} onToggleCell={onToggleCell} />,
    },
    {
      id: 'trace', title: 'Trace', defaultRect: { x: 948, y: 16, w: 440, h: 330 },
      node: <Trace history={snap?.history ?? []} optimum={optimum ? optimum.score : null} plantedScore={plantedScore} units={spec.units} />,
    },
    {
      id: 'population', title: 'Population', defaultRect: { x: 948, y: 362, w: 440, h: 300 },
      node: <Population M={M} snapshot={snap} orientationBlind={spec.orientationBlind} showSexes={showSexes && rule === 'prom'} />,
    },
  ];

  const layouts: LayoutDef[] = mode === 'lab' ? [
    { id: 'essentials', name: 'Essentials', sub: 'Judge · Reproduction · Sweep', icon: 'tune', open: { lab: { x: 84, y: 18 }, repro: { x: 84, y: 600, collapsed: true } } },
  ] : [
    { id: 'essentials', name: 'Essentials', sub: 'Judge · Matrix · Run', icon: 'tune', open: { score: { x: 84, y: 18 }, matrix: { x: 84, y: 330, collapsed: true }, run: { x: 84, y: 380 } } },
  ];

  const actions: ActionDef[] = mode === 'lab' ? [
    { id: 'run', icon: 'flask', label: 'Run sweep', primary: true, sectionId: 'lab', disabled: sweeping || labRules.length === 0 || !enumerable, onClick: runSweep },
    { id: 'stop', icon: 'pause', label: 'Stop', sectionId: 'lab', disabled: !sweeping, onClick: stopSweep },
    { id: 'clear', icon: 'reset', label: 'Clear', sectionId: 'lab', disabled: catalog.length === 0, onClick: clearCatalog },
  ] : [
    { id: 'play', icon: loop.playing ? 'pause' : 'play', label: loop.playing ? 'Pause' : 'Play', primary: true, active: loop.playing, sectionId: 'run', onClick: () => loop.setPlaying(p => !p) },
    { id: 'step', icon: 'step', label: 'Step', sectionId: 'run', disabled: loop.playing, onClick: loop.stepOnce },
    { id: 'reset', icon: 'reset', label: 'Reset', sectionId: 'run', onClick: () => { loop.setPlaying(false); loop.reset(); } },
  ];

  const subtitle = mode === 'lab'
    ? `${spec.name} · ${preset === 'trap' ? 'escape the trap' : 'signal sweep'}${sweeping && shownRecord ? ` · ${shownRecord.results.length}/${jobCount(shownRecord.cfg)}` : ''}`
    : `${ruleSpec.name} · ${spec.name} · gen ${snap?.gen ?? 0}${st ? ` · best ${sig2(st.bestRoundedFit)}` : ''}`;
  const modes: WorkspaceMode[] = [{ id: 'watch', label: 'Watch' }, { id: 'lab', label: 'Lab' }];

  return (
    <Workspace
      appId={NS}
      title="Split Decision"
      subtitle={subtitle}
      sections={sections}
      views={views}
      layouts={layouts}
      defaultLayoutId="essentials"
      explainer={explainerText}
      actions={actions}
      modes={modes}
      activeMode={mode}
      onModeChange={id => setMode(id as Mode)}
    />
  );
}
