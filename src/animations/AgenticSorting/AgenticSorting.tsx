import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, Zap, Users, Snowflake } from 'lucide-react';
import './agenticSorting.css';
import Workspace from '../../chrome/workspace/Workspace';
import type { LayoutDef, SectionDef, ViewDef } from '../../chrome/workspace/types';
import { StatGrid, Sparkline, Kicker } from '../../chrome/readouts';
import { Slider, Pills } from '../../components/ControlPanel';
import { usePersistentState } from '../../lib/usePersistentState';
import {
  generate, step, mulberry32,
  AGENT_TYPE_LIST, type AgentType, type SimState, type Weights,
} from './engine';
import { measure, homeIndex, type MetricsView } from './metrics';
import { drawArena, TYPE_COLORS } from './arena';
import explainerText from './EXPLAINER.md?raw';
import readmeText from './README.md?raw';

/** Per-algotype reference text for the population-mix panel. The classic-sort
 *  analogy is kept honest: only the rule that genuinely echoes the named sort is
 *  claimed (see EXPLAINER.md for the fidelity notes). */
const AGENT_META: Record<AgentType, { name: string; icon: string; desc: string }> = {
  standard: {
    name: 'Standard', icon: '\u{1F464}',
    desc: 'Compares a random adjacent neighbor and swaps if out of order. Bubble-style.',
  },
  blindDate: {
    name: 'Blind Date', icon: '\u{1F3B2}',
    desc: 'Compares a partner anywhere in the array — long-range compare-swap.',
  },
  nomadic: {
    name: 'Nomadic', icon: '\u{1F3C3}',
    desc: 'Only ever inspects the neighbor behind it, drifting toward its goal end.',
  },
  patrolling: {
    name: 'Patrolling', icon: '\u{1F46E}',
    desc: 'Keeps a heading; swaps on contact, reverses when settled. Cocktail-shaker.',
  },
  perfectionist: {
    name: 'Perfectionist', icon: '\u{1F9D0}',
    desc: 'Scans the whole right tail for the extreme value and pulls it in. Selection-style.',
  },
};

const DEFAULT_WEIGHTS: Weights = {
  standard: 20, blindDate: 20, nomadic: 20, patrolling: 20, perfectionist: 20,
};

const emptyMetrics: MetricsView = {
  cycles: 0, wakeups: 0, swaps: 0, sortedness: 1, inversions: 0,
  runs: 1, clustering: 0, ceiling: 1, hasFrozen: false, descShareLive: 0,
};

export default function AgenticSorting() {
  // ---- persisted settings ----
  const [arraySize, setArraySize] = usePersistentState('agentic-sorting:size', 96);
  const [stepInterval, setStepInterval] = usePersistentState('agentic-sorting:interval', 24);
  const [wakeFraction, setWakeFraction] = usePersistentState('agentic-sorting:wake', 0.15);
  const [display, setDisplay] = usePersistentState<'bars' | 'dots'>('agentic-sorting:display', 'bars');
  const [colorBy, setColorBy] = usePersistentState<'type' | 'objective'>('agentic-sorting:colorby', 'type');
  const [objectiveMode, setObjectiveMode] = usePersistentState<'uniform' | 'split'>('agentic-sorting:objmode', 'uniform');
  const [descShare, setDescShare] = usePersistentState('agentic-sorting:descshare', 50);
  const [frozenPct, setFrozenPct] = usePersistentState('agentic-sorting:frozen', 0);
  const [weights, setWeights] = usePersistentState<Weights>('agentic-sorting:weights', DEFAULT_WEIGHTS);

  // ---- transient ----
  const [isRunning, setIsRunning] = useState(false);
  const [metrics, setMetrics] = useState<MetricsView>(emptyMetrics);
  const [history, setHistory] = useState<number[]>([]);

  // ---- click-to-track (delayed gratification) ----
  const [selected, setSelected] = useState<
    { id: number; value: number; type: AgentType } | null
  >(null);
  const [trackHist, setTrackHist] = useState<number[]>([]);
  const selectedIdRef = useRef<number | null>(null);
  const selTargetRef = useRef(0);
  const trackHistRef = useRef<number[]>([]);
  const markRef = useRef('#ffce47');

  // ---- simulation refs (live, read inside the rAF loop) ----
  const stateRef = useRef<SimState>({ agents: [], cycles: 0, wakeups: 0, swaps: 0 });
  const rngRef = useRef<() => number>(mulberry32(1));
  const histRef = useRef<number[]>([]);
  const rafRef = useRef<number>();
  const accRef = useRef(0);
  const lastRef = useRef(0);
  const lastMetricRef = useRef(0);

  // refs mirroring settings the draw/loop need without re-subscribing
  const intervalRef = useRef(stepInterval);
  const wakeRef = useRef(wakeFraction);
  const displayRef = useRef(display);
  const colorByRef = useRef(colorBy);
  const axisRef = useRef('rgba(128,128,128,0.6)');

  // ---- canvas ----
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 });

  const draw = useCallback(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;
    const { w, h } = sizeRef.current;
    if (w === 0 || h === 0) return;
    drawArena(ctx, w, h, stateRef.current.agents, {
      display: displayRef.current,
      colorBy: colorByRef.current,
      axis: axisRef.current,
      mark: markRef.current,
      selectedId: selectedIdRef.current,
    });
  }, []);

  const flushMetrics = useCallback(() => {
    const s = stateRef.current;
    const m = measure(s.agents, s);
    histRef.current = [...histRef.current, m.sortedness].slice(-160);
    setMetrics(m);
    setHistory(histRef.current);

    // sample the tracked agent's distance-to-goal
    if (selectedIdRef.current != null) {
      const idx = s.agents.findIndex(a => a.id === selectedIdRef.current);
      if (idx >= 0) {
        const dist = Math.abs(idx - selTargetRef.current);
        trackHistRef.current = [...trackHistRef.current, dist].slice(-160);
        setTrackHist(trackHistRef.current);
      }
    }
  }, []);

  const regenerate = useCallback(() => {
    const seed = (Math.random() * 0xffffffff) >>> 0;
    rngRef.current = mulberry32(seed);
    stateRef.current = generate({
      count: arraySize,
      weights,
      objectiveMode,
      descShare: descShare / 100,
      frozenShare: frozenPct / 100,
    }, rngRef.current);
    histRef.current = [];
    accRef.current = 0;
    // dropping/rebuilding the population invalidates any tracked agent
    selectedIdRef.current = null;
    trackHistRef.current = [];
    setSelected(null);
    setTrackHist([]);
    flushMetrics();
    draw();
  }, [arraySize, weights, objectiveMode, descShare, frozenPct, flushMetrics, draw]);

  // click an agent to follow it: map pointer x → array index → that agent's id
  const onArenaPointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const rect = cvs.getBoundingClientRect();
    const agents = stateRef.current.agents;
    const n = agents.length;
    if (n === 0 || rect.width === 0) return;
    const idx = Math.min(n - 1, Math.max(0, Math.floor(((e.clientX - rect.left) / rect.width) * n)));
    const a = agents[idx];
    if (selectedIdRef.current === a.id) {
      // tap the tracked agent again to stop tracking
      selectedIdRef.current = null;
      trackHistRef.current = [];
      setSelected(null);
      setTrackHist([]);
    } else {
      selectedIdRef.current = a.id;
      selTargetRef.current = homeIndex(agents.map(g => g.value), a.value);
      trackHistRef.current = [Math.abs(idx - selTargetRef.current)];
      setSelected({ id: a.id, value: a.value, type: a.type });
      setTrackHist(trackHistRef.current);
    }
    draw();
  }, [draw]);

  // (re)build the population whenever a structural setting changes
  useEffect(() => { regenerate(); }, [regenerate]);

  // keep loop/draw refs in sync with settings
  useEffect(() => { intervalRef.current = stepInterval; }, [stepInterval]);
  useEffect(() => { wakeRef.current = wakeFraction; }, [wakeFraction]);
  useEffect(() => { displayRef.current = display; draw(); }, [display, draw]);
  useEffect(() => { colorByRef.current = colorBy; draw(); }, [colorBy, draw]);

  // DPR-aware canvas sizing (ignores zero-size when the window is collapsed)
  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ro = new ResizeObserver(() => {
      const rect = cvs.getBoundingClientRect();
      const w = Math.round(rect.width), h = Math.round(rect.height);
      if (w === 0 || h === 0) return;
      const dpr = window.devicePixelRatio || 1;
      cvs.width = Math.round(w * dpr);
      cvs.height = Math.round(h * dpr);
      const ctx = cvs.getContext('2d');
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sizeRef.current = { w, h };
      const cs = getComputedStyle(cvs);
      axisRef.current = cs.getPropertyValue('--dim').trim() || 'rgba(128,128,128,0.6)';
      markRef.current = cs.getPropertyValue('--accent').trim() || '#ffce47';
      draw();
    });
    ro.observe(cvs);
    return () => ro.disconnect();
  }, [draw]);

  // the simulation loop — fixed-timestep accumulator, one draw per frame
  useEffect(() => {
    if (!isRunning) return;
    lastRef.current = performance.now();
    const loop = (t: number) => {
      rafRef.current = requestAnimationFrame(loop);
      const dt = t - lastRef.current;
      lastRef.current = t;
      accRef.current += dt;
      const interval = Math.max(1, intervalRef.current);
      let steps = 0;
      while (accRef.current >= interval && steps < 500) {
        stateRef.current = step(stateRef.current, rngRef.current, wakeRef.current);
        accRef.current -= interval;
        steps++;
      }
      if (accRef.current > interval * 4) accRef.current = 0; // don't spiral after a stall
      draw();
      if (t - lastMetricRef.current > 100) {
        lastMetricRef.current = t;
        flushMetrics();
      }
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [isRunning, draw, flushMetrics]);

  const setWeight = (type: AgentType, val: number) =>
    setWeights(prev => ({ ...prev, [type]: val }));

  const pct = (x: number) => `${Math.round(x * 100)}%`;
  const signedPct = (x: number) => `${x >= 0 ? '+' : ''}${Math.round(x * 100)}%`;

  /* ---------- panels (closed archetype vocabulary) ---------- */

  const arrayNode = (
    <div className="as-panel">
      <Slider
        label="Array size" value={arraySize} min={16} max={400} step={1}
        onChange={setArraySize} format={(v) => `${v} agents`}
      />
      <Pills
        label="Objective"
        value={objectiveMode}
        options={[
          { value: 'uniform', label: 'Selfish (ascending)' },
          { value: 'split', label: 'Phase separation' },
        ]}
        onChange={setObjectiveMode}
      />
      {objectiveMode === 'split' && (
        <Slider
          label="Descending share" value={descShare} min={0} max={100} step={1}
          onChange={setDescShare} format={(v) => `${v}%`}
        />
      )}
      <Slider
        label="Frozen / defective" value={frozenPct} min={0} max={40} step={1}
        onChange={setFrozenPct} format={(v) => `${v}%`}
      />
      <p className="as-hint">
        {objectiveMode === 'split'
          ? 'Agents disagree on which way order runs — watch domains form instead of a single sort.'
          : 'Every agent pursues the same ascending order, each by its own local rule.'}
      </p>
    </div>
  );

  const displayNode = (
    <div className="as-panel">
      <Pills
        label="Marks" value={display}
        options={[{ value: 'bars', label: 'Bars' }, { value: 'dots', label: 'Dots' }]}
        onChange={setDisplay}
      />
      <Pills
        label="Color by" value={colorBy}
        options={[{ value: 'type', label: 'Algotype' }, { value: 'objective', label: 'Objective' }]}
        onChange={setColorBy}
      />
      <p className="as-hint">
        {colorBy === 'type'
          ? 'Hue = algotype. Watch like-colored agents cluster — a pattern no rule encodes.'
          : 'Hue = objective (blue ascending, orange descending).'}
      </p>
    </div>
  );

  const agentsNode = (
    <div className="as-weight-list">
      {AGENT_TYPE_LIST.map((key) => (
        <div key={key} className="as-weight-item">
          <div className="as-weight-head">
            <span className="as-dot" style={{ background: TYPE_COLORS[key] }} />
            <span className="as-legend-icon">{AGENT_META[key].icon}</span>
            <span className="as-legend-name">{AGENT_META[key].name}</span>
          </div>
          <Slider
            label="" value={weights[key]} min={0} max={100} step={1}
            onChange={(v) => setWeight(key, v)} format={(v) => `${v}%`}
          />
          <p className="as-weight-desc">{AGENT_META[key].desc}</p>
        </div>
      ))}
    </div>
  );

  const runNode = (
    <div className="as-panel">
      <div className="as-controls-row">
        <button
          className={`as-button as-button-primary ${isRunning ? 'as-button-pause' : ''}`}
          onClick={() => setIsRunning(r => !r)}
        >
          {isRunning ? <Pause size={18} /> : <Play size={18} />}
          {isRunning ? 'PAUSE' : 'START'}
        </button>
        <button
          className="as-button as-button-reset"
          onClick={regenerate}
          title="Regenerate the population with the current settings"
        >
          <RotateCcw size={18} />
        </button>
      </div>
      <Slider
        label="Step interval" value={stepInterval}
        min={1} max={200} step={1} onChange={setStepInterval} format={(v) => `${v} ms`}
      />
      <Slider
        label="Wake rate" value={wakeFraction} min={0.05} max={0.5} step={0.01}
        onChange={setWakeFraction} format={pct}
      />
    </div>
  );

  const metricsNode = (
    <div className="as-panel">
      <StatGrid stats={[
        { k: 'Sortedness', v: pct(metrics.sortedness) },
        { k: 'Inversions', v: String(metrics.inversions) },
        { k: 'Monotone runs', v: String(metrics.runs) },
        { k: 'Clustering', v: signedPct(metrics.clustering) },
      ]} />
      <Kicker>Sortedness over time</Kicker>
      <Sparkline pts={history.length > 1 ? history : [metrics.sortedness, metrics.sortedness]} />
      {metrics.hasFrozen && (
        <p className="as-hint">
          <Snowflake size={11} style={{ verticalAlign: '-1px' }} /> Best reachable
          with the defects pinned: <strong>{pct(metrics.ceiling)}</strong> — the
          agents sort up to this ceiling, around the obstacles.
        </p>
      )}
      <Kicker>Throughput</Kicker>
      <StatGrid stats={[
        { k: 'Cycles', v: String(metrics.cycles) },
        { k: 'Wakeups', v: String(metrics.wakeups) },
        { k: 'Swaps', v: String(metrics.swaps) },
        { k: 'Descending', v: pct(metrics.descShareLive) },
      ]} />
    </div>
  );

  const trackNode = (
    <div className="as-panel">
      {selected ? (
        <>
          <div className="as-track-head">
            <span className="as-dot" style={{ background: TYPE_COLORS[selected.type] }} />
            <span className="as-legend-name">{AGENT_META[selected.type].name}</span>
            <span className="as-track-meta">value {selected.value} · home #{selTargetRef.current}</span>
          </div>
          <Kicker>Distance to goal over time</Kicker>
          <Sparkline pts={trackHist.length > 1 ? trackHist : [trackHist[0] ?? 0, trackHist[0] ?? 0]} />
          <StatGrid stats={[
            { k: 'Now', v: String(trackHist[trackHist.length - 1] ?? 0) },
            { k: 'Peak', v: String(trackHist.length ? Math.max(...trackHist) : 0) },
          ]} />
          <p className="as-hint">
            If the line rises before it falls, the agent moved <em>away</em> from
            where it belongs — delayed gratification, most visible with defects
            present. Tap it again to stop tracking.
          </p>
        </>
      ) : (
        <p className="as-hint">
          Click any agent in the array to follow it. Its distance-to-goal often
          rises before it falls: the agent moves away from its rightful place to
          let the array sort around obstacles.
        </p>
      )}
    </div>
  );

  const arenaNode = (
    <div className="as-arena">
      <canvas
        ref={canvasRef}
        className="as-arena-canvas"
        onPointerDown={onArenaPointerDown}
      />
      <div className="as-arena-label as-arena-label-top">Positive</div>
      <div className="as-arena-label as-arena-label-bottom">Negative</div>
    </div>
  );

  const sections: SectionDef[] = [
    { id: 'array', title: 'Array', arch: 'subject', node: arrayNode, estHeight: 250 },
    { id: 'display', title: 'Display', arch: 'marks', node: displayNode, estHeight: 180 },
    { id: 'agents', title: 'Population mix', arch: 'drive', node: agentsNode, estHeight: 500 },
    { id: 'run', title: 'Run', arch: 'playback', node: runNode, estHeight: 200 },
    { id: 'metrics', title: 'Metrics', arch: 'readout', node: metricsNode, estHeight: 340 },
    { id: 'track', title: 'Track agent', arch: 'lab', node: trackNode, estHeight: 240 },
  ];

  const views: ViewDef[] = [
    { id: 'arena', title: 'Array', node: arenaNode, defaultRect: { x: 372, y: 16, w: 720, h: 560 } },
  ];

  const layouts: LayoutDef[] = [
    {
      id: 'setup', name: 'Setup', sub: 'Array · Mix · Run', icon: 'tune',
      open: { array: { x: 84, y: 18 }, run: { x: 84, y: 280 }, agents: { x: 84, y: 500 } },
    },
    {
      id: 'analysis', name: 'Analysis', sub: 'Metrics + agent tracker', icon: 'chart',
      open: { metrics: { x: 84, y: 18 }, track: { x: 84, y: 372 } },
    },
  ];

  const help = [explainerText, readmeText].filter(Boolean).join('\n\n---\n\n');

  return (
    <Workspace
      appId="agentic-sorting"
      title="Agentic Sorting"
      subtitle="Emergent order from selfish local rules"
      sections={sections}
      views={views}
      layouts={layouts}
      defaultLayoutId="setup"
      explainer={help}
    />
  );
}
