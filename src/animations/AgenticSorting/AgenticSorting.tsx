import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Snowflake } from 'lucide-react';
import './agenticSorting.css';
import Workspace from '../../chrome/workspace/Workspace';
import type { ActionDef, LayoutDef, SectionDef, ViewDef } from '../../chrome/workspace/types';
import { StatGrid, Sparkline, Kicker } from '../../chrome/readouts';
import { Slider, Pills, Select } from '../../components/ControlPanel';
import { usePersistentState } from '../../lib/usePersistentState';
import { useThemeId } from '../../chrome/skins';
import {
  generate, step, mulberry32,
  AGENT_TYPE_LIST, type AgentType, type Objective, type SimState, type Weights,
} from './engine';
import { measure, homeIndex, type MetricsView } from './metrics';
import { drawArena, drawTrajectories, TYPE_COLORS } from './arena';

// Agent identity → --data slot (theming v2; mirrors arena.ts's TYPE_COLORS).
const TYPE_SLOT: Record<AgentType, number> = { standard: 1, blindDate: 5, nomadic: 3, patrolling: 7, perfectionist: 6 };
const TYPE_FALLBACK: Record<AgentType, string> = { standard: '#0072B2', blindDate: '#E69F00', nomadic: '#009E73', patrolling: '#CC79A7', perfectionist: '#D55E00' };
const OBJ_FALLBACK: Record<Objective, string> = { 1: '#0072B2', [-1]: '#D55E00' };
/** Resolve the agent palettes + axis/mark from the theme tokens on `el`. */
function readAgentPalette(el: Element) {
  const cs = getComputedStyle(el);
  const d = (k: number, f: string) => cs.getPropertyValue(`--data-${k}`).trim() || f;
  const type = {} as Record<AgentType, string>;
  (Object.keys(TYPE_SLOT) as AgentType[]).forEach((t) => { type[t] = d(TYPE_SLOT[t], TYPE_FALLBACK[t]); });
  const obj: Record<Objective, string> = { 1: d(1, OBJ_FALLBACK[1]), [-1]: d(5, OBJ_FALLBACK[-1]) };
  return {
    type, obj,
    frozen: cs.getPropertyValue('--dim').trim() || '#9aa0a6',
    axis: cs.getPropertyValue('--dim').trim() || 'rgba(128,128,128,0.6)',
    mark: cs.getPropertyValue('--accent').trim() || '#ffce47',
  };
}
import {
  runExperiment, METRIC_LABELS,
  type MetricKey, type GroupResult, type ExperimentSpec, type SweepParam,
} from './lab';
import { LabResults } from './LabResults';
import { useCanvas2D } from './useCanvas2D';
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

const METRIC_OPTS: { value: MetricKey; label: string }[] = [
  { value: 'cyclesToSort', label: 'Cycles' },
  { value: 'swaps', label: 'Swaps' },
  { value: 'finalSortedness', label: 'Sorted' },
  { value: 'clustering', label: 'Cluster' },
];

/** A thin stacked bar showing a population mix's algotype proportions. */
function MixBar({ weights }: { weights: Weights }) {
  const total = AGENT_TYPE_LIST.reduce((s, t) => s + weights[t], 0) || 1;
  return (
    <span className="as-mixbar">
      {AGENT_TYPE_LIST.map(t => (
        <span key={t} style={{ width: `${(weights[t] / total) * 100}%`, background: TYPE_COLORS[t] }} />
      ))}
    </span>
  );
}

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

  // ---- top-bar mode (Sandbox = live sim · Lab = batch experiments) ----
  const [mode, setMode] = usePersistentState<'sandbox' | 'lab'>('agentic-sorting:mode', 'sandbox');

  // ---- lab (full batch experiments) ----
  const [labKind, setLabKind] = usePersistentState<'compare' | 'mixes' | 'monte' | 'sweep'>('agentic-sorting:labKind', 'compare');
  const [savedMixes, setSavedMixes] = usePersistentState<{ id: number; label: string; weights: Weights }[]>('agentic-sorting:savedMixes', []);
  const [labTrials, setLabTrials] = usePersistentState('agentic-sorting:labTrials', 24);
  const [labCount, setLabCount] = usePersistentState('agentic-sorting:labCount', 64);
  const [labWake, setLabWake] = usePersistentState('agentic-sorting:labWake', 0.15);
  const [labCap, setLabCap] = usePersistentState('agentic-sorting:labCap', 3000);
  const [labMetric, setLabMetric] = usePersistentState<MetricKey>('agentic-sorting:labMetric', 'cyclesToSort');
  const [sweepParam, setSweepParam] = usePersistentState<SweepParam>('agentic-sorting:sweepParam', 'count');
  const [sweepSteps, setSweepSteps] = usePersistentState('agentic-sorting:sweepSteps', 7);
  const [blendA, setBlendA] = usePersistentState<AgentType>('agentic-sorting:blendA', 'standard');
  const [blendB, setBlendB] = usePersistentState<AgentType>('agentic-sorting:blendB', 'blindDate');
  const [labRunning, setLabRunning] = useState(false);
  const [pendingLabRun, setPendingLabRun] = useState(false); // preset → auto-run a Lab experiment
  const [labProgress, setLabProgress] = useState(0);
  const [labResults, setLabResults] = useState<GroupResult[]>([]);
  const [labResultKind, setLabResultKind] = useState<'compare' | 'monte' | 'sweep'>('compare');
  const [labSweepLabel, setLabSweepLabel] = useState('');

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
  // Resolved (hex) agent palettes for the canvas, read from the theme --data
  // tokens (var() doesn't resolve in canvas fillStyle). Refreshed on a skin change.
  const typeColorsRef = useRef<Record<AgentType, string>>(TYPE_FALLBACK);
  const objColorsRef = useRef<Record<Objective, string>>(OBJ_FALLBACK);
  const frozenRef = useRef('#9aa0a6');

  // ---- canvas (arena) ----
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 });

  // ---- trajectories view (population-wide delayed gratification) ----
  const TRAJ_MAX = 360; // samples captured per run before the plot freezes
  const trajRef = useRef<number[][]>([]);       // traj[id] = distance samples
  const trajLenRef = useRef(0);                 // samples recorded so far
  const targetByIdRef = useRef<number[]>([]);   // fixed sorted-home per agent id
  const trajCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const trajSizeRef = useRef({ w: 0, h: 0 });
  const lastTrajDrawRef = useRef(0);

  const drawTraj = useCallback(() => {
    const cvs = trajCanvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;
    const { w, h } = trajSizeRef.current;
    if (w === 0 || h === 0) return;
    drawTrajectories(ctx, w, h, trajRef.current, trajLenRef.current, axisRef.current);
  }, []);

  /** Record one distance-to-home sample for every agent (called once per frame
   *  while running, until the buffer fills). */
  const recordTraj = useCallback(() => {
    if (trajLenRef.current >= TRAJ_MAX) return;
    const agents = stateRef.current.agents;
    const target = targetByIdRef.current;
    const buf = trajRef.current;
    for (let i = 0; i < agents.length; i++) {
      const a = agents[i];
      (buf[a.id] ||= []).push(Math.abs(i - (target[a.id] ?? 0)));
    }
    trajLenRef.current += 1;
  }, []);

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
      typeColors: typeColorsRef.current,
      objColors: objColorsRef.current,
      frozen: frozenRef.current,
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
    // fix each agent's sorted-home target and reset the trajectory buffers
    const agents = stateRef.current.agents;
    const values = agents.map(g => g.value);
    const target: number[] = [];
    for (const a of agents) target[a.id] = homeIndex(values, a.value);
    targetByIdRef.current = target;
    trajRef.current = agents.map(() => []);
    trajLenRef.current = 0;
    recordTraj(); // seed the trajectories with the initial (shuffled) distances
    flushMetrics();
    draw();
    drawTraj();
  }, [arraySize, weights, objectiveMode, descShare, frozenPct, flushMetrics, draw, drawTraj, recordTraj]);

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
  const applyPalette = useCallback((el: Element) => {
    const p = readAgentPalette(el);
    axisRef.current = p.axis; markRef.current = p.mark;
    typeColorsRef.current = p.type; objColorsRef.current = p.obj; frozenRef.current = p.frozen;
  }, []);
  useCanvas2D(canvasRef, sizeRef, (cvs) => { applyPalette(cvs); draw(); }, [draw, mode, applyPalette]);
  // Re-read the palette + redraw on a skin change (theming v2).
  const themeId = useThemeId();
  useEffect(() => {
    if (canvasRef.current) { applyPalette(canvasRef.current); draw(); drawTraj(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeId]);

  useCanvas2D(trajCanvasRef, trajSizeRef, () => drawTraj(), [drawTraj, mode]);

  // the simulation loop — fixed-timestep accumulator, one draw per frame
  useEffect(() => {
    if (!isRunning || mode !== 'sandbox') return;
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
      if (steps > 0) recordTraj();
      draw();
      if (t - lastMetricRef.current > 100) {
        lastMetricRef.current = t;
        flushMetrics();
      }
      if (t - lastTrajDrawRef.current > 140) {
        lastTrajDrawRef.current = t;
        drawTraj();
      }
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [isRunning, mode, draw, flushMetrics, recordTraj, drawTraj]);

  // Connected proportions: setting one weight rescales the others so the five
  // always sum to 100 (a population is a mix, not five independent dials).
  const setWeightBalanced = (type: AgentType, raw: number) => {
    setWeights(prev => {
      const v = Math.max(0, Math.min(100, Math.round(raw)));
      const others = AGENT_TYPE_LIST.filter(t => t !== type);
      const otherSum = others.reduce((s, t) => s + prev[t], 0);
      const remaining = 100 - v;
      const next = { ...prev, [type]: v } as Weights;
      if (otherSum > 0) {
        let acc = 0;
        for (const t of others) { next[t] = Math.round((prev[t] / otherSum) * remaining); acc += next[t]; }
        const drift = remaining - acc; // fix integer rounding on the largest other
        if (drift !== 0) {
          const big = others.reduce((a, b) => (next[b] > next[a] ? b : a), others[0]);
          next[big] = Math.max(0, next[big] + drift);
        }
      } else {
        const each = Math.floor(remaining / others.length);
        let acc = 0;
        for (const t of others) { next[t] = each; acc += each; }
        next[others[0]] += remaining - acc;
      }
      return next;
    });
  };

  // capture the current population mix for head-to-head comparison in the Lab
  const addCurrentMix = () => {
    setSavedMixes(prev => prev.length >= 6 ? prev
      : [...prev, { id: Date.now(), label: `Mix ${prev.length + 1}`, weights: { ...weights } }]);
  };
  const removeMix = (id: number) =>
    setSavedMixes(prev => prev.filter(m => m.id !== id));

  // full lab experiment (compare strategies · monte-carlo · parameter sweep)
  const SWEEP_RANGE: Record<SweepParam, [number, number]> = {
    count: [16, 300], frozenShare: [0, 0.4], wakeFraction: [0.05, 0.5], descShare: [0, 1], blend: [0, 100],
  };
  const runLab = useCallback(async () => {
    if (labRunning) return;
    setLabRunning(true); setLabProgress(0);
    const common = {
      trials: labTrials, count: labCount, wakeFraction: labWake,
      threshold: 0.99, cap: labCap, objectiveMode, descShare: descShare / 100,
      frozenShare: frozenPct / 100, weights, seed: (Math.random() * 0xffffffff) >>> 0,
    };
    let spec: ExperimentSpec;
    if (labKind === 'sweep') {
      const [from, to] = SWEEP_RANGE[sweepParam];
      spec = sweepParam === 'blend'
        ? { kind: 'sweep', param: 'blend', from, to, steps: sweepSteps, blend: { a: blendA, b: blendB }, ...common }
        : { kind: 'sweep', param: sweepParam, from, to, steps: sweepSteps, ...common };
    } else if (labKind === 'mixes') {
      spec = { kind: 'mixes', mixes: savedMixes.map(m => ({ label: m.label, weights: m.weights })), ...common };
    } else {
      spec = { kind: labKind, ...common };
    }
    const res = await runExperiment(spec, setLabProgress);
    setLabResults(res);
    // mixes render like compare (labeled bars); only sweep differs
    setLabResultKind(labKind === 'sweep' ? 'sweep' : labKind === 'monte' ? 'monte' : 'compare');
    setLabSweepLabel(
      labKind !== 'sweep' ? ''
        : sweepParam === 'blend' ? `% ${AGENT_META[blendA].name}`
          : sweepParam,
    );
    setLabRunning(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labRunning, labKind, labTrials, labCount, labWake, labCap, sweepParam, sweepSteps, blendA, blendB, savedMixes, objectiveMode, descShare, frozenPct, weights]);

  const labReady =
    (labKind !== 'mixes' || savedMixes.length >= 2) &&
    (labKind !== 'sweep' || sweepParam !== 'blend' || blendA !== blendB);

  // a preset that jumps into the Lab auto-runs once the mode has switched
  useEffect(() => {
    if (mode === 'lab' && pendingLabRun && !labRunning && labReady) {
      setPendingLabRun(false);
      runLab();
    }
  }, [mode, pendingLabRun, labRunning, labReady, runLab]);

  // one-click scenarios — each lands on the settings/view that show one idea
  const presets = [
    {
      id: 'cluster', label: 'Clustering', caption: 'Like-colored agents drift together — a pattern no rule encodes.',
      apply: () => {
        setMode('sandbox'); setObjectiveMode('uniform'); setFrozenPct(0);
        setColorBy('type'); setWeights({ ...DEFAULT_WEIGHTS }); setIsRunning(true);
      },
    },
    {
      id: 'robust', label: 'Robustness to defects', caption: 'Gray cells are frozen; the rest sort around them, up to a ceiling.',
      apply: () => {
        setMode('sandbox'); setObjectiveMode('uniform'); setFrozenPct(20);
        setColorBy('type'); setWeights({ ...DEFAULT_WEIGHTS }); setIsRunning(true);
      },
    },
    {
      id: 'delay', label: 'Delayed gratification', caption: 'In the Trajectories plot, warm lines rise before they fall.',
      apply: () => {
        setMode('sandbox'); setObjectiveMode('uniform'); setFrozenPct(15);
        setColorBy('type'); setWeights({ ...DEFAULT_WEIGHTS }); setIsRunning(true);
      },
    },
    {
      id: 'phase', label: 'Phase separation', caption: 'Agents disagree on direction; monotone domains form (animath-original).',
      apply: () => {
        setMode('sandbox'); setObjectiveMode('split'); setDescShare(50); setFrozenPct(0);
        setColorBy('objective');
        setWeights({ standard: 34, blindDate: 0, nomadic: 33, patrolling: 33, perfectionist: 0 });
        setIsRunning(true);
      },
    },
    {
      id: 'slowmix', label: 'The even mix is slow', caption: 'Lab: pure strategies fully sort faster than the even five-way mix.',
      apply: () => {
        setObjectiveMode('uniform'); setFrozenPct(0); setWeights({ ...DEFAULT_WEIGHTS });
        setLabKind('compare'); setLabMetric('cyclesToSort'); setMode('lab'); setPendingLabRun(true);
      },
    },
  ];

  const pct = (x: number) => `${Math.round(x * 100)}%`;
  const signedPct = (x: number) => `${x >= 0 ? '+' : ''}${Math.round(x * 100)}%`;

  /* ---------- panels (closed archetype vocabulary) ---------- */

  const scenariosNode = (
    <div className="as-scenarios">
      {presets.map(p => (
        <button key={p.id} className="as-preset" onClick={p.apply}>
          <span className="as-preset-label">{p.label}</span>
          <span className="as-preset-caption">{p.caption}</span>
        </button>
      ))}
      <p className="as-hint">One-click demos — each sets up one idea and starts the run.</p>
    </div>
  );

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
          ? 'Agents disagree on which way order runs — domains form instead of a single sort. (animath-original, not in Levin’s model.)'
          : 'Every agent pursues the same ascending order, each by its own local rule. (faithful to Levin’s model.)'}
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
            onChange={(v) => setWeightBalanced(key, v)} format={(v) => `${v}%`}
          />
        </div>
      ))}
      <p className="as-hint">The five sum to 100%. Each algotype’s rule is in the <strong>?</strong> guide.</p>
    </div>
  );

  // START/PAUSE + Reset are the always-on action strip (see `actions` below);
  // this panel keeps only the pacing controls so the verbs aren't duplicated.
  const runNode = (
    <div className="as-panel">
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
          <Kicker>Distance to home over time</Kicker>
          <Sparkline pts={trackHist.length > 1 ? trackHist : [trackHist[0] ?? 0, trackHist[0] ?? 0]} />
          <StatGrid stats={[
            { k: 'Now', v: String(trackHist[trackHist.length - 1] ?? 0) },
            { k: 'Peak', v: String(trackHist.length ? Math.max(...trackHist) : 0) },
          ]} />
          <p className="as-hint">
            If the line rises before it falls, the agent moved <em>away</em> from
            its sorted home — delayed gratification, most visible with defects
            present. Tap it again to stop tracking.
          </p>
        </>
      ) : (
        <p className="as-hint">
          Click any agent in the array to follow it. Its distance-to-home often
          rises before it falls: the agent moves away from its rightful place to
          let the array sort around obstacles.
        </p>
      )}
    </div>
  );

  /* ---------- lab-mode panels ---------- */

  const labExperimentNode = (
    <div className="as-panel">
      <Pills
        label="Experiment" value={labKind}
        options={[
          { value: 'compare', label: 'Strategies' },
          { value: 'mixes', label: 'Mixes' },
          { value: 'monte', label: 'Monte-Carlo' },
          { value: 'sweep', label: 'Sweep' },
        ]}
        onChange={setLabKind}
      />
      {labKind === 'mixes' && (
        <div className="as-mixes">
          <button className="as-button as-button-reset" onClick={addCurrentMix} disabled={savedMixes.length >= 6}>
            + Add current mix
          </button>
          {savedMixes.length === 0 && (
            <p className="as-hint">Set the <strong>Population mix</strong> below, then add it — repeat to build two or more mixes, and compare them under identical conditions.</p>
          )}
          {savedMixes.map(m => (
            <div key={m.id} className="as-mix-row">
              <span className="as-mix-label">{m.label}</span>
              <MixBar weights={m.weights} />
              <button className="as-mix-remove" onClick={() => removeMix(m.id)} title="Remove">×</button>
            </div>
          ))}
        </div>
      )}
      {labKind === 'sweep' && (
        <>
          <Select
            label="Sweep parameter" value={sweepParam}
            options={[
              { value: 'blend', label: 'Mix of two types' },
              { value: 'count', label: 'Array size' },
              { value: 'frozenShare', label: 'Frozen %' },
              { value: 'wakeFraction', label: 'Wake rate' },
              { value: 'descShare', label: 'Descending %' },
            ]}
            onChange={setSweepParam}
          />
          {sweepParam === 'blend' && (
            <>
              <Select
                label="Type A (0→100%)" value={blendA}
                options={AGENT_TYPE_LIST.map(t => ({ value: t, label: AGENT_META[t].name }))}
                onChange={setBlendA}
              />
              <Select
                label="Type B (the remainder)" value={blendB}
                options={AGENT_TYPE_LIST.map(t => ({ value: t, label: AGENT_META[t].name }))}
                onChange={setBlendB}
              />
              {blendA === blendB && <p className="as-hint">Pick two different types to blend.</p>}
            </>
          )}
          <Slider label="Sweep points" value={sweepSteps} min={3} max={12} step={1} onChange={setSweepSteps} />
        </>
      )}
      <p className="as-hint">
        {labKind === 'compare'
          ? 'Each pure algotype and the current mix, head-to-head (the "545 swaps" comparison).'
          : labKind === 'mixes'
            ? 'Your saved population mixes, head-to-head under identical conditions.'
            : labKind === 'monte'
              ? 'Repeats the current mix / objective / frozen settings on many seeds.'
              : 'Varies one knob across its range; the rest come from the current settings.'}
      </p>
    </div>
  );

  const labConditionsNode = (
    <div className="as-panel">
      <Slider label="Trials per condition" value={labTrials} min={4} max={80} step={1} onChange={setLabTrials} />
      <Slider label="Array size" value={labCount} min={16} max={200} step={1} onChange={setLabCount} format={(v) => `${v} agents`} />
      <Slider label="Wake rate" value={labWake} min={0.05} max={0.5} step={0.01} onChange={setLabWake} format={pct} />
      <Slider label="Cycle cap" value={labCap} min={200} max={6000} step={100} onChange={setLabCap} />
      <Pills
        label="Objective" value={objectiveMode}
        options={[{ value: 'uniform', label: 'Selfish' }, { value: 'split', label: 'Phase sep.' }]}
        onChange={setObjectiveMode}
      />
      {objectiveMode === 'split' && (
        <Slider label="Descending share" value={descShare} min={0} max={100} step={1} onChange={setDescShare} format={(v) => `${v}%`} />
      )}
      <Slider label="Frozen / defective" value={frozenPct} min={0} max={40} step={1} onChange={setFrozenPct} format={(v) => `${v}%`} />
      <p className="as-hint">A trial sorts a fresh population until ≥99% sorted or the cap. These conditions apply to every group; <strong>Strategies</strong> and <strong>Mixes</strong> vary only the population. <em>Objective and Frozen are shared with the Sandbox; array size and wake rate here are Lab-only.</em></p>
    </div>
  );

  const labMetricNode = (
    <div className="as-panel">
      <Pills label="Show metric" value={labMetric} options={METRIC_OPTS} onChange={setLabMetric} />
      <p className="as-hint">
        {METRIC_LABELS[labMetric]} across conditions. A condition that doesn't
        fully sort within the cap is plotted <em>at</em> the cap — read the
        convergence column. Try <strong>Final sortedness</strong> for non-
        converging cases (mixes, frozen, phase separation). Clustering is only
        meaningful for the mixed population (pure strategies report ≈0).
      </p>
    </div>
  );

  // "Run experiment" is the always-on action strip (see `actions` below); this
  // panel keeps the live progress bar and the not-ready hint.
  const labRunNode = (
    <div className="as-panel">
      {labRunning
        ? (
          <>
            <p className="as-hint">Running… {Math.round(labProgress * 100)}%</p>
            <div className="as-progress"><div className="as-progress-fill" style={{ width: `${labProgress * 100}%` }} /></div>
          </>
        )
        : !labReady
          ? <p className="as-hint">Add at least two mixes to compare.</p>
          : <p className="as-hint">Press <strong>Run experiment</strong> in the action bar to run this experiment.</p>}
    </div>
  );

  const labResultsNode = (
    <div className="as-arena as-lab-results">
      <LabResults kind={labResultKind} results={labResults} metric={labMetric} sweepLabel={labSweepLabel} />
    </div>
  );

  const arenaNode = (
    <div className="as-arena">
      <canvas
        ref={canvasRef}
        className="as-arena-canvas"
        onPointerDown={onArenaPointerDown}
      />
      <div className="as-arena-label as-arena-label-top">High value</div>
      <div className="as-arena-label as-arena-label-bottom">Low value</div>
    </div>
  );

  const trajNode = (
    <div className="as-arena">
      <canvas ref={trajCanvasRef} className="as-arena-canvas" />
      <div className="as-arena-label as-arena-label-top">Far from home</div>
      <div className="as-arena-label as-arena-label-bottom">At home (sorted)</div>
      <div className="as-arena-label as-arena-label-time">time →</div>
      <div className="as-traj-legend">
        <span className="as-traj-swatch as-traj-warm" /> backtracked (rose then fell)
        <span className="as-traj-swatch as-traj-cool" /> straight to home
      </div>
    </div>
  );

  const sandboxSections: SectionDef[] = [
    { id: 'scenarios', title: 'Scenarios', arch: 'subject', node: scenariosNode, estHeight: 470 },
    { id: 'array', title: 'Array', arch: 'subject', node: arrayNode, estHeight: 250 },
    { id: 'display', title: 'Display', arch: 'marks', node: displayNode, estHeight: 180 },
    { id: 'agents', title: 'Population mix', arch: 'drive', node: agentsNode, estHeight: 330 },
    { id: 'run', title: 'Run', arch: 'playback', node: runNode, estHeight: 200 },
    { id: 'metrics', title: 'Metrics', arch: 'readout', node: metricsNode, estHeight: 340 },
    { id: 'track', title: 'Track agent', arch: 'readout', node: trackNode, estHeight: 240 },
  ];

  const labSections: SectionDef[] = [
    { id: 'labExperiment', title: 'Experiment', arch: 'subject', node: labExperimentNode, estHeight: 280 },
    { id: 'agents', title: 'Population mix', arch: 'drive', node: agentsNode, estHeight: 330 },
    { id: 'labConditions', title: 'Conditions', arch: 'domain', node: labConditionsNode, estHeight: 420 },
    { id: 'labMetric', title: 'Metric', arch: 'marks', node: labMetricNode, estHeight: 170 },
    { id: 'labRun', title: 'Run', arch: 'playback', node: labRunNode, estHeight: 160 },
  ];

  const sandboxViews: ViewDef[] = [
    { id: 'arena', title: 'Array', node: arenaNode, defaultRect: { x: 372, y: 16, w: 720, h: 360 } },
    { id: 'trajectories', title: 'Trajectories', node: trajNode, defaultRect: { x: 372, y: 392, w: 720, h: 300 } },
  ];

  const labViews: ViewDef[] = [
    { id: 'labResults', title: 'Results', node: labResultsNode, defaultRect: { x: 372, y: 16, w: 760, h: 560 } },
  ];

  const sandboxLayouts: LayoutDef[] = [
    {
      id: 'explore', name: 'Explore', sub: 'Scenarios · arena · trajectories', icon: 'chart',
      // The on-ramp: one-click Scenarios + Run on the left, the moving picture and
      // the trajectories plot (the signature visual) both on the right.
      open: { scenarios: { x: 84, y: 18 }, run: { x: 84, y: 484 } },
      views: {
        arena: { x: 372, y: 16, w: 720, h: 318, open: true },
        trajectories: { x: 372, y: 350, w: 720, h: 300, open: true },
      },
    },
    {
      id: 'tinker', name: 'Tinker', sub: 'Array · Mix · Display · Run', icon: 'tune',
      open: { array: { x: 84, y: 18 }, run: { x: 84, y: 280 }, agents: { x: 84, y: 492 }, display: { x: 312, y: 18 } },
      views: {
        arena: { x: 540, y: 16, w: 700, h: 560, open: true },
        trajectories: { open: false },
      },
    },
    {
      id: 'analyze', name: 'Analyze', sub: 'Metrics · Track · trajectories', icon: 'chart',
      open: { metrics: { x: 84, y: 18 }, track: { x: 84, y: 372 } },
      views: {
        arena: { x: 372, y: 16, w: 720, h: 300, open: true },
        trajectories: { x: 372, y: 324, w: 720, h: 300, open: true },
      },
    },
  ];

  const labLayouts: LayoutDef[] = [
    {
      id: 'lab', name: 'Lab', sub: 'Experiment · Results', icon: 'chart',
      open: {
        labExperiment: { x: 84, y: 18 }, agents: { x: 84, y: 320 },
        labConditions: { x: 312, y: 18 }, labMetric: { x: 312, y: 460 },
        labRun: { x: 312, y: 640 },
      },
      views: { labResults: { x: 560, y: 16, w: 700, h: 600, open: true } },
    },
  ];

  const modes = [
    { id: 'sandbox', label: 'Sandbox' },
    { id: 'lab', label: 'Lab' },
  ];

  const help = [explainerText, readmeText].filter(Boolean).join('\n\n---\n\n');

  /* Always-on action strip — contextual projection of each mode's playback
     panel (sandbox Run / lab Run), re-wired onto the rewritten engine after
     the chrome-overhaul merge. Labels stay static (no live progress %). */
  const actions: ActionDef[] = mode === 'lab'
    ? [
      { id: 'run', icon: 'play', label: 'Run experiment', primary: true, sectionId: 'labRun', disabled: labRunning || !labReady, onClick: runLab },
    ]
    : [
      { id: 'run', icon: isRunning ? 'pause' : 'play', label: isRunning ? 'Pause' : 'Start', primary: true, active: isRunning, sectionId: 'run', onClick: () => setIsRunning(r => !r) },
      { id: 'reset', icon: 'reset', label: 'Reset', sectionId: 'run', onClick: regenerate },
    ];

  return (
    <Workspace
      key={mode}
      appId={mode === 'lab' ? 'agentic-sorting-lab' : 'agentic-sorting'}
      title="Agentic Sorting"
      subtitle={mode === 'lab' ? 'Batch experiments over many instances' : 'Emergent order from selfish local rules'}
      sections={mode === 'lab' ? labSections : sandboxSections}
      views={mode === 'lab' ? labViews : sandboxViews}
      layouts={mode === 'lab' ? labLayouts : sandboxLayouts}
      defaultLayoutId={mode === 'lab' ? 'lab' : 'explore'}
      explainer={help}
      modes={modes}
      activeMode={mode}
      onModeChange={(id) => setMode(id as 'sandbox' | 'lab')}
      actions={actions}
    />
  );
}
