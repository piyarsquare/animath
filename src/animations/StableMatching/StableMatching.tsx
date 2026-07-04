import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Activity, AlertTriangle, Check, Copy, Download, FlaskConical, Layers, Pause,
  Shuffle, ShieldCheck,
} from 'lucide-react';
import './stableMatching.css';
import Workspace from '../../chrome/workspace/Workspace';
import type { ActionDef, LayoutDef, SectionDef, ViewDef } from '../../chrome/workspace/types';
import { Slider, Pills, Select, NumberInput, Checkbox, ColormapPicker } from '../../components/ControlPanel';
import { usePersistentState } from '../../lib/usePersistentState';
import explainerText from './EXPLAINER.md?raw';
import readmeText from './README.md?raw';
import { generateInstance, type Instance } from './model';
import {
  runRounds, applyLog, blockingPairs, stats,
  type Schedule, type Matching,
} from './galeShapley';
import { allStableMatchings, stablePairs, namedSolutions, score, layoutLattice, NAMED_LABELS, type NamedKey } from './rotations';
import { rothVandeVate, replaySteps, type ResolveResult } from './resolver';
import { mapStops, gradientCss } from '../../lib/colormapRegistry';
import { useThemeId } from '../../chrome/skins';

const FOOT_CAP = 1000; // cap the (worst-case exponential) stable-matching enumeration
type Jump = 'live' | NamedKey;
const JUMP_LABELS: Record<Jump, string> = { live: 'Live run', ...NAMED_LABELS };
// short "what is this" for each named solution
const NAMED_NOTE: Record<NamedKey, string> = {
  aOptimal: 'A proposes — best for A, worst for B (top of the lattice)',
  bOptimal: 'B proposes — best for B, worst for A (bottom of the lattice)',
  egalitarian: 'minimizes the total of everyone’s ranks (welfare-best)',
  median: 'each person gets their median stable partner (the lattice’s center)',
  minRegret: 'makes the single worst-off person as happy as possible',
  sexEqual: 'balances A’s and B’s total happiness (|ΣA − ΣB| smallest)',
  balanced: 'minimizes the larger of the two sides’ total rank',
};

const NS = 'stable-matching';

/* ── The preference matrix: rows = A, cols = B; each cell shows the pair's two
 *    ranks (A's rank of B, top-left; B's rank of A, bottom-right). The matching
 *    (= current tentative holds) lights up; the active proposal rings; blocking
 *    pairs (if any, at the end) flag red. This is the algorithm, foregrounded. ── */
const TRAIL = 6; // how many recent rounds of failed entries to keep in the fading trail
const MAX_CELL = 72; // matrix cell px ceiling (so a tiny grid doesn't blow up); the floor is just "visible"
const LAB_RES_MAX = 30;  // Lab grid resolution ceiling (cells per axis)
const ENUM_CAP = 300;    // stable-matching enumeration cap for the "# stable" surface
const EMPTY_MARKERS = new Map<string, 'active' | 'reject' | 'stolen'>();
const EMPTY_TRAIL = new Map<string, number>();

// The rank color scale comes from the shared colormap registry (a divergent-family
// map) instead of a hard-coded array. RANK_RAMP holds the active map's anchors as
// rgb triples, low→high; setRankRamp() refreshes it from the Color panel's choice
// (called once per render, before the cell renderers below read burd()/rankBurd()).
// Default = RdBu reversed, so rank #1 reads cool/blue and the worst reads warm/red.
function hexToRgb(h: string): [number, number, number] {
  const s = h.replace('#', '');
  const n = s.length === 3 ? s.split('').map(c => c + c).join('') : s;
  return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)];
}
let RANK_RAMP: number[][] = mapStops('rdbu').slice().reverse().map(hexToRgb);
function setRankRamp(id: string, reverse: boolean): void {
  const hex = mapStops(id);
  RANK_RAMP = (reverse ? hex.slice().reverse() : hex.slice()).map(hexToRgb);
}
function burd(u: number): string {
  const R = RANK_RAMP;
  const x = Math.max(0, Math.min(1, u));
  const seg = x * (R.length - 1), i = Math.min(R.length - 2, Math.floor(seg)), f = seg - i;
  const c = R[i].map((v, k) => Math.round(v + (R[i + 1][k] - v) * f));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}
const rankBurd = (r: number, maxRank: number) => burd(maxRank > 1 ? (r - 1) / (maxRank - 1) : 0);
type Marker = 'active' | 'reject' | 'stolen';
function Matrix({ inst, matching, rows, cols, markers, blocking, footprint, inspect, onHover, onClick, size, labels, view, gap, trail }: {
  inst: Instance; matching: Matching; rows: number[]; cols: number[];
  markers: Map<string, Marker>; blocking: Set<string>; footprint: Set<string> | null;
  inspect: [number, number] | null; onHover: (c: [number, number] | null) => void; onClick: (c: [number, number]) => void;
  size: number; labels: boolean;
  view: 'both' | 'a' | 'b' | 'diff'; gap: number; trail: Map<string, number>;
}) {
  const n = inst.n;
  const showNums = size >= 30;
  const rankColor = (r: number) => rankBurd(r, n);
  const diffColor = (d: number) => burd(((n > 1 ? Math.max(-1, Math.min(1, d / (n - 1))) : 0) + 1) / 2);
  return (
    <div className={`sm2-matrix${gap === 0 ? ' tight' : ''}`} style={{ gap: `${gap}px`, gridTemplateColumns: `${labels ? '1.8em ' : ''}repeat(${cols.length}, ${size}px)` }} onMouseLeave={() => onHover(null)}>
      {labels && <div className="sm2-corner" />}
      {labels && cols.map(j => <div key={`h${j}`} className={`sm2-chead${inspect && inspect[1] === j ? ' hi' : ''}`}>{j}</div>)}
      {rows.map(i => (
        <React.Fragment key={`r${i}`}>
          {labels && <div className={`sm2-rhead${inspect && inspect[0] === i ? ' hi' : ''}`}>{i}</div>}
          {cols.map(j => {
            const aR = inst.rankA[i][j] + 1, bR = inst.rankB[j][i] + 1, d = aR - bR;
            const matched = matching.a[i] === j;
            const mk = markers.get(`${i}-${j}`);   // this round: active (proposing) / reject / stolen
            const inFoot = footprint?.has(`${i}-${j}`) && !matched;   // matched in SOME stable matching, not this one
            const hi = inspect && (inspect[0] === i || inspect[1] === j);
            const sel = inspect && inspect[0] === i && inspect[1] === j;
            const cls = `sm2-mcell${matched ? ' matched' : ''}${mk ? ' ' + mk : ''}${blocking.has(`${i}-${j}`) ? ' blocking' : ''}${inFoot ? ' footprint' : ''}${hi ? ' hi' : ''}${sel ? ' sel' : ''}`;
            const bg = view === 'b' ? rankColor(bR) : view === 'diff' ? diffColor(d) : rankColor(aR);
            const age = trail.get(`${i}-${j}`);
            return (
              <div key={j} className={cls} style={{ height: size, background: bg }}
                onMouseEnter={() => onHover([i, j])} onClick={() => onClick([i, j])}
                title={`A${i}→B${j} #${aR} · B${j}→A${i} #${bR}`}>
                {view === 'both' && <span className="sm2-disc" style={{ background: rankColor(bR) }} />}
                {age !== undefined && !mk && <span className="sm2-trail" style={{ opacity: Math.max(0.12, 1 - age / TRAIL) }} />}
                {showNums && (view === 'both'
                  ? <><span className="ar">{aR}</span><span className="br">{bR}</span></>
                  : <span className="br">{view === 'diff' ? (d > 0 ? `+${d}` : `${d}`) : view === 'a' ? aR : bR}</span>)}
              </div>
            );
          })}
        </React.Fragment>
      ))}
    </div>
  );
}

// A person's full ranked list, read left→right best→worst, as color chips.
function PrefList({ inst, side, id, partner, mark }: {
  inst: Instance; side: 'A' | 'B'; id: number; partner: number; mark: number;
}) {
  const n = inst.n;
  const prefs = side === 'A' ? inst.prefsA[id] : inst.prefsB[id];
  const other = side === 'A' ? 'B' : 'A';
  return (
    <div className="sm2-pref">
      <span className="sm2-pref-who"><i className={`sw ${side === 'A' ? 'sq' : 'disc'}`} />{side}{id} ranks {other}:</span>
      <div className="sm2-pref-chips">
        {prefs.map((idx, p) => (
          <span key={idx} className={`sm2-chip${idx === partner ? ' partner' : ''}${idx === mark ? ' mark' : ''}`} style={{ background: rankBurd(p + 1, n) }} title={`#${p + 1}: ${other}${idx}`}>{idx}</span>
        ))}
      </div>
    </div>
  );
}

// one swept cell: true consensus (ca,cb), draw position (x,y), the mean(s) and
// sample standard deviation(s) over `n` independent trials.
type Cell = { x: number; y: number; ca: number; cb: number; v: number; sd: number; n: number; a?: number; b?: number; aSd?: number; bSd?: number };
// mean + sample standard deviation from a running sum / sum-of-squares
function meanSd(sum: number, sumSq: number, n: number): { mean: number; sd: number } {
  const mean = sum / n;
  const varr = n > 1 ? Math.max(0, (sumSq - (sum * sum) / n) / (n - 1)) : 0;
  return { mean, sd: Math.sqrt(varr) };
}
// 95% confidence half-width for a cell mean (normal approx): 1.96·SD/√n
const ci95 = (sd: number, n: number) => (n > 1 ? 1.96 * sd / Math.sqrt(n) : 0);
function Heatmap({ data, res, maxV, hue, title, caption, mode, maxRank, stat }: {
  data: Cell[] | null; res: number; maxV: number; hue: number; title: string; caption: string;
  mode: 'single' | 'lego'; maxRank: number; stat: 'mean' | 'sd';
}) {
  const [hover, setHover] = useState<Cell | null>(null);
  if (!data || !data.length) return <div className="sm2-heatmap-empty"><FlaskConical size={28} /><p>Run the Lab to see the surface</p></div>;
  const cs = 100 / res;
  const single = (v: number) => `hsl(${hue}, 70%, ${92 - Math.max(0, Math.min(1, v / (maxV || 1))) * 57}%)`;
  const shownVal = (c: Cell) => stat === 'sd' ? c.sd : c.v;   // single-metric surface: mean or std-dev
  return (
    <div className="sm2-heatmap">
      <h4>{title}{stat === 'sd' && mode === 'single' ? ' — std dev' : ''}</h4>
      <div className="sm2-heatmap-grid" onMouseLeave={() => setHover(null)}>
        {data.map((c, i) => (
          <div key={i} className="sm2-cell" style={{ left: `${c.x * 100}%`, bottom: `${c.y * 100}%`, width: `${cs}%`, height: `${cs}%`, background: mode === 'lego' ? rankBurd(c.a ?? 0, maxRank) : single(shownVal(c)) }} onMouseEnter={() => setHover(c)}>
            {mode === 'lego' && <span className="sm2-disc" style={{ background: rankBurd(c.b ?? 0, maxRank) }} />}
          </div>
        ))}
        {hover && <div className="sm2-tip">consensus A {(hover.ca * 100).toFixed(0)}% · B {(hover.cb * 100).toFixed(0)}% · n={hover.n}<br />
          {mode === 'lego'
            ? <>A #{(hover.a ?? 0).toFixed(2)} <span className="dim">± {(hover.aSd ?? 0).toFixed(2)}</span> · B #{(hover.b ?? 0).toFixed(2)} <span className="dim">± {(hover.bSd ?? 0).toFixed(2)}</span></>
            : <>{caption}: <strong>{hover.v.toFixed(2)}</strong> <span className="dim">± {hover.sd.toFixed(2)} SD · 95% CI ±{ci95(hover.sd, hover.n).toFixed(2)}</span></>}</div>}
      </div>
      <div className="sm2-heatmap-x">consensus A →</div>
      {mode === 'lego'
        ? <p className="sm2-legend"><span className="k sq">square = A avg rank</span><span className="k disc">circle = B avg rank</span><span className="k scale">blue #1 → red #{maxRank}</span></p>
        : <div className="sm2-heatmap-legend"><span>0</span><span className="bar" style={{ background: `linear-gradient(90deg, hsl(${hue},70%,92%), hsl(${hue},70%,35%))` }} /><span>{maxV.toFixed(1)}</span><span className="cap">{stat === 'sd' ? 'std dev' : caption}</span></div>}
    </div>
  );
}

// communicable summary of a completed Lab surface: descriptive stats + CSV export
type LabStat5 = { mean: number; median: number; min: number; max: number };
type LabRunMeta = { res: number; trials: number; n: number; seed: number; schedule: Schedule; metric: string };
type LabSummaryData =
  | { kind: 'single'; cells: number; run: LabRunMeta; five: LabStat5; noise: number; ci: number; loAt: string; hiAt: string }
  | { kind: 'lego'; cells: number; run: LabRunMeta; A: LabStat5; B: LabStat5; aNoise: number; bNoise: number };
function LabSummary({ s, onCopy, onDownload, copied }: { s: LabSummaryData; onCopy: () => void; onDownload: () => void; copied: boolean }) {
  const { run, cells } = s;
  const unit = run.metric === 'unstable' ? 'unstable %' : run.metric === 'cost' ? 'repair steps' : run.metric === 'stableCount' ? '# stable' : 'blocking pairs';
  const total = (cells * run.trials).toLocaleString();
  return (
    <div className="sm2-lab-stats">
      <div className="sm2-stat-head">
        <h4>Surface summary</h4>
        <div className="sm2-stat-export">
          <button className="sm2-btn sm" onClick={onCopy} title="Copy the full grid as CSV">{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? 'Copied' : 'Copy CSV'}</button>
          <button className="sm2-btn sm" onClick={onDownload} title="Download the full grid as a .csv file"><Download size={14} />Download</button>
        </div>
      </div>
      <p className="sm2-stat-meta">{run.res}×{run.res} = {cells} cells · {run.trials} trial{run.trials === 1 ? '' : 's'}/cell = <strong>{total}</strong> instances · n={run.n} · {run.schedule} schedule · seed {run.seed}</p>
      {s.kind === 'single'
        ? <table className="sm2-stat-table"><tbody>
            <tr><th>{unit}</th><td>mean <strong>{s.five.mean.toFixed(2)}</strong></td><td>median {s.five.median.toFixed(2)}</td><td>range {s.five.min.toFixed(2)} – {s.five.max.toFixed(2)}</td></tr>
            <tr><th>extremes</th><td colSpan={3}>min at consensus {s.loAt} · max at {s.hiAt}</td></tr>
            <tr><th>noise</th><td colSpan={3}>typical within-cell SD ±{s.noise.toFixed(2)} → each cell mean is ±{s.ci.toFixed(2)} (95% CI)</td></tr>
          </tbody></table>
        : <table className="sm2-stat-table"><tbody>
            <tr><th>A avg rank</th><td>mean <strong>#{s.A.mean.toFixed(2)}</strong></td><td>median #{s.A.median.toFixed(2)}</td><td>range #{s.A.min.toFixed(2)} – #{s.A.max.toFixed(2)}</td><td>SD ±{s.aNoise.toFixed(2)}</td></tr>
            <tr><th>B avg rank</th><td>mean <strong>#{s.B.mean.toFixed(2)}</strong></td><td>median #{s.B.median.toFixed(2)}</td><td>range #{s.B.min.toFixed(2)} – #{s.B.max.toFixed(2)}</td><td>SD ±{s.bNoise.toFixed(2)}</td></tr>
          </tbody></table>}
    </div>
  );
}

const LATTICE_CAP = 80; // don't draw a lattice bigger than this many nodes
/* The lattice of stable matchings: A-optimal at the top, B-optimal at the bottom,
 * each downward edge a single rotation. Named solutions are flagged in place. */
function LatticeView({ inst, set, capped, named, picked, onPick }: {
  inst: Instance; set: Matching[]; capped: boolean;
  named: Record<NamedKey, Matching>; picked: number | null; onPick: (i: number) => void;
}) {
  const N = set.length;
  const sigOf = (M: Matching) => M.a.join(',');
  const layout = useMemo(() => (N >= 2 && N <= LATTICE_CAP && !capped ? layoutLattice(inst, set) : null), [inst, set, N, capped]);
  // map each named solution to its node index
  const namedAt = useMemo(() => {
    const idx = new Map<string, number>(); set.forEach((M, i) => idx.set(sigOf(M), i));
    const out: Partial<Record<NamedKey, number>> = {};
    (Object.keys(named) as NamedKey[]).forEach(k => { const i = idx.get(sigOf(named[k])); if (i !== undefined) out[k] = i; });
    return out;
  }, [set, named]);
  const aTotOf = (M: Matching) => score(inst, M).aTot;
  const aTots = set.map(aTotOf), aMin = Math.min(...aTots, 0), aMax = Math.max(...aTots, 1);

  if (N === 1) return <div className="sm2-lattice-empty"><Layers size={28} /><p>A unique stable matching — the lattice is a single point. Lower the consensus to grow it.</p></div>;
  if (!layout) return <div className="sm2-lattice-empty"><Layers size={28} /><p>{capped ? 'Too many stable matchings to enumerate' : `Lattice too large to draw (${N} matchings)`}. Lower the population or raise the consensus.</p></div>;

  const W = 760, H = 480, padX = 40, padY = 36;
  const X = (x: number) => padX + x * (W - 2 * padX);
  const Y = (y: number) => padY + y * (H - 2 * padY);
  // Legible per-skin label colors: the --data ramp stays readable on every skin's
  // lattice panel — fixed light hues (the old #7dd3fc/#fca5a5/#fff) vanished on the
  // light skins. Applied via `style` since SVG fill/stroke attributes don't resolve var().
  const NAMED_RING: Partial<Record<NamedKey, string>> = { egalitarian: 'var(--data-2)', median: 'var(--data-7)', minRegret: 'var(--data-4)', sexEqual: 'var(--data-5)', balanced: 'var(--data-3)' };
  const labelFor = (i: number): { text: string; color: string } | null => {
    for (const k of ['aOptimal', 'bOptimal', 'egalitarian', 'median', 'minRegret', 'sexEqual', 'balanced'] as NamedKey[])
      if (namedAt[k] === i) return { text: NAMED_LABELS[k], color: k === 'aOptimal' ? 'var(--data-1)' : k === 'bOptimal' ? 'var(--data-6)' : (NAMED_RING[k] ?? 'var(--fg)') };
    return null;
  };

  return (
    <div className="sm2-lattice">
      <svg viewBox={`0 0 ${W} ${H}`} className="sm2-lattice-svg" preserveAspectRatio="xMidYMid meet">
        {layout.edges.map(([lo, hi], k) => (
          <line key={k} x1={X(layout.pos[hi].x)} y1={Y(layout.pos[hi].y)} x2={X(layout.pos[lo].x)} y2={Y(layout.pos[lo].y)} style={{ stroke: 'var(--border)' }} strokeWidth={1} />
        ))}
        {set.map((M, i) => {
          const p = layout.pos[i], lab = labelFor(i), s = score(inst, M);
          const fill = rankBurd(1 + ((aTots[i] - aMin) / Math.max(1, aMax - aMin)) * (inst.n - 1), inst.n);
          const sel = picked === i;
          return (
            <g key={i} className="sm2-lnode" onClick={() => onPick(i)} style={{ cursor: 'pointer' }}>
              <circle cx={X(p.x)} cy={Y(p.y)} r={sel ? 9 : 6} fill={fill} style={{ stroke: sel ? 'var(--fg)' : lab ? lab.color : 'var(--border-strong)' }} strokeWidth={sel ? 2.5 : lab ? 2 : 1} />
              {lab && <text x={X(p.x)} y={Y(p.y) - 11} textAnchor="middle" fontSize={11} style={{ fill: lab.color }}>{lab.text}</text>}
              <title>{`${lab ? lab.text + ' · ' : ''}Σrank ${s.total} (A ${s.aTot} + B ${s.bTot})`}</title>
            </g>
          );
        })}
      </svg>
      <p className="sm2-lattice-cap">{capped ? '≥' : ''}{N} stable matchings · <span style={{ color: 'var(--data-1)' }}>A-optimal</span> top → <span style={{ color: 'var(--data-6)' }}>B-optimal</span> bottom · each edge is one rotation · click a node to view it. Node color = how good for A (blue) → for B (red).</p>
    </div>
  );
}

export default function StableMatching() {
  // (the old `${NS}:view` tab state is gone — the workspace layouts Run / Lab /
  //  Lattice replace the in-page Visualizer / Lattice / Lab tab strip)
  const [n, setN] = usePersistentState(`${NS}:n`, 8);
  const [seed, setSeed] = usePersistentState(`${NS}:seed`, 1);
  const [consensusA, setConsensusA] = usePersistentState(`${NS}:cA`, 0);
  const [consensusB, setConsensusB] = usePersistentState(`${NS}:cB`, 0);
  const [schedule, setSchedule] = usePersistentState<Schedule>(`${NS}:schedule`, 'A');
  const [bias, setBias] = usePersistentState(`${NS}:bias`, 50);
  const [speed, setSpeed] = usePersistentState(`${NS}:speed`, 50);
  const [order, setOrder] = usePersistentState<'matchdiag' | 'settle' | 'attract' | 'index'>(`${NS}:order`, 'matchdiag');
  const [showLabels, setShowLabels] = usePersistentState(`${NS}:labels`, true);
  const [cellView, setCellView] = usePersistentState<'both' | 'a' | 'b' | 'diff'>(`${NS}:cellView`, 'both');
  const [tight, setTight] = usePersistentState(`${NS}:tight`, true);
  const [liveSort, setLiveSort] = usePersistentState(`${NS}:liveSort`, false);
  const [showFootprint, setShowFootprint] = usePersistentState(`${NS}:footprint`, true);
  // Matrix/heatmap rank coloring — a divergent-family colormap from the shared
  // registry (replaces the old hard-coded BuRd). Default RdBu reversed = blue #1.
  const [matrixMap, setMatrixMap] = usePersistentState(`${NS}:matrixMap`, 'rdbu');
  const [matrixReverse, setMatrixReverse] = usePersistentState(`${NS}:matrixRev`, true);
  const themeId = useThemeId();
  // Refresh the module-level rank ramp before the Matrix/Heatmap renderers (which
  // call burd()/rankBurd()) run this render. Cheap + deterministic; single-instance.
  setRankRamp(matrixMap, matrixReverse);

  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<number | null>(null);
  // element state (not a ref) so the measuring effect re-runs when the matrix
  // view window is closed by one layout and reopened (remounted) by another
  const [matrixWrap, setMatrixWrap] = useState<HTMLDivElement | null>(null);
  const [cellSize, setCellSize] = useState(40);

  const inst = useMemo(() => generateInstance({ n, consensusA: consensusA / 100, consensusB: consensusB / 100, seed }), [n, consensusA, consensusB, seed]);
  const result = useMemo(() => runRounds(inst, schedule, bias, seed), [inst, schedule, bias, seed]);
  const rounds = result.rounds;
  const total = rounds.length;                                  // a "step" is now a whole round
  const safeStep = Math.min(step, total);                       // guard the render before the reset effect fires
  useEffect(() => { setStep(0); setPlaying(false); setJump('live'); setResolve(null); setRStep(0); setRPlaying(false); setPickedNode(null); }, [result]);
  useEffect(() => { setPickedNode(null); setInspect(null); setPinned(false); }, [inst]);   // a new instance invalidates node indices

  // flatten round events (in order) + per-round cumulative counts, to rebuild the matching
  const flat = useMemo(() => rounds.flatMap(r => r.events), [rounds]);
  const roundEnd = useMemo(() => { const a: number[] = []; let c = 0; for (const r of rounds) { c += r.events.length; a.push(c); } return a; }, [rounds]);
  const matching = useMemo(() => applyLog(n, flat, safeStep === 0 ? 0 : roundEnd[safeStep - 1]), [n, flat, roundEnd, safeStep]);
  const done = safeStep >= total;
  const finalMatching = result.matching;

  // the solution space (pure property of the instance): the full stable set, the
  // footprint (cells matched in SOME stable matching), and the named solutions.
  const stableSet = useMemo(() => allStableMatchings(inst, FOOT_CAP), [inst]);
  const solution = useMemo(() => {
    const pairs = new Set<string>();
    for (const M of stableSet.matchings) for (let m = 0; m < n; m++) if (M.a[m] !== -1) pairs.add(`${m}-${M.a[m]}`);
    return { pairs, count: stableSet.matchings.length, capped: stableSet.capped };
  }, [stableSet, n]);
  const named = useMemo(() => namedSolutions(inst, stableSet.matchings), [inst, stableSet]);

  // "Jump to" a named stable matching: overrides the displayed matching statically.
  const [jump, setJump] = useState<Jump>('live');
  const [pickedNode, setPickedNode] = useState<number | null>(null); // a node clicked in the lattice
  const [inspect, setInspect] = useState<[number, number] | null>(null); // hovered/pinned cell → read its prefs
  const [pinned, setPinned] = useState(false);

  // Roth–Vande Vate resolver: repair the (possibly unstable) run to stability.
  const [resolve, setResolve] = useState<ResolveResult | null>(null);
  const [rStep, setRStep] = useState(0);
  const [rPlaying, setRPlaying] = useState(false);
  const resolveMatching = useMemo(() => resolve ? replaySteps(resolve.start, resolve.steps, rStep) : null, [resolve, rStep]);
  const finalUnstable = useMemo(() => blockingPairs(inst, finalMatching) > 0, [inst, finalMatching]);

  const pickedMatching = pickedNode != null && pickedNode < stableSet.matchings.length ? stableSet.matchings[pickedNode] : null;
  const shown = resolveMatching ?? pickedMatching ?? (jump === 'live' ? matching : named[jump]);
  const shownDone = resolve != null || pickedMatching != null || jump !== 'live' || done;   // a named / picked / resolved matching is complete

  // markers for the round just applied: every proposal this round (active/reject), plus bumped pairs (stolen)
  const markers = useMemo(() => {
    const mk = new Map<string, Marker>();
    if (safeStep <= 0) return mk;
    for (const e of rounds[safeStep - 1].events) {
      const pc = e.proposer.side === 'A' ? [e.proposer.id, e.receiver.id] : [e.receiver.id, e.proposer.id];
      if (e.outcome === 'reject') mk.set(`${pc[0]}-${pc[1]}`, 'reject');
      else {
        mk.set(`${pc[0]}-${pc[1]}`, 'active');
        if (e.outcome === 'bump' && e.displaced !== undefined) {
          const dc = e.proposer.side === 'A' ? [e.displaced, e.receiver.id] : [e.receiver.id, e.displaced];
          mk.set(`${dc[0]}-${dc[1]}`, 'stolen');
        }
      }
    }
    return mk;
  }, [rounds, safeStep]);

  // short-lived trail of recently failed entries (rejected proposals + bumped pairs),
  // keyed by matrix cell → age (0 = most recent), so they fade out over the next steps.
  const trail = useMemo(() => {
    const m = new Map<string, number>();
    for (let k = safeStep - 2; k >= Math.max(0, safeStep - 1 - TRAIL); k--) { // current round (safeStep-1) is shown via markers
      const r = rounds[k]; if (!r) continue;
      const age = (safeStep - 1) - k;
      for (const e of r.events) {
        let cell: [number, number] | null = null;
        if (e.outcome === 'reject') cell = e.proposer.side === 'A' ? [e.proposer.id, e.receiver.id] : [e.receiver.id, e.proposer.id];
        else if (e.outcome === 'bump' && e.displaced !== undefined) cell = e.proposer.side === 'A' ? [e.displaced, e.receiver.id] : [e.receiver.id, e.displaced];
        if (cell) { const key = `${cell[0]}-${cell[1]}`; if (!m.has(key)) m.set(key, age); }
      }
    }
    return m;
  }, [rounds, safeStep]);

  // total-rank accounting (welfare): lower = better. Per side, so the headline
  // average and the outcome distribution can be read for A and B separately.
  const acct = useMemo(() => {
    let aTot = 0, bTot = 0, aM = 0, bM = 0;
    // each side's outcomes as a sorted (best→worst) list of partner ranks; −1 = unmatched.
    const aSorted: number[] = [], bSorted: number[] = [];
    for (let i = 0; i < n; i++) { if (shown.a[i] !== -1) { const r = inst.rankA[i][shown.a[i]] + 1; aTot += r; aM++; aSorted.push(r); } else aSorted.push(-1); }
    for (let j = 0; j < n; j++) { if (shown.b[j] !== -1) { const r = inst.rankB[j][shown.b[j]] + 1; bTot += r; bM++; bSorted.push(r); } else bSorted.push(-1); }
    const byRank = (x: number, y: number) => (x < 0 ? n + 1 : x) - (y < 0 ? n + 1 : y); // matched first (best→worst), unmatched last
    aSorted.sort(byRank); bSorted.sort(byRank);
    const matchedPeople = aM + bM;
    return {
      aTot, bTot, combined: aTot + bTot, aM, bM,
      aAvg: aM ? aTot / aM : 0, bAvg: bM ? bTot / bM : 0,
      avg: matchedPeople ? (aTot + bTot) / matchedPeople : 0,
      aFree: n - aM, bFree: n - bM, free: n - aM, aSorted, bSorted,
    };
  }, [inst, shown, n]);

  const blocking = useMemo(() => {
    const s = new Set<string>();
    if (jump === 'live' && !done) return s;   // a jumped named matching is complete + always stable
    for (let i = 0; i < n; i++) {
      const pr = shown.a[i] === -1 ? Infinity : inst.rankA[i][shown.a[i]];
      for (let j = 0; j < n; j++) {
        if (shown.a[i] === j) continue;
        if (inst.rankA[i][j] < pr) { const pj = shown.b[j] === -1 ? Infinity : inst.rankB[j][shown.b[j]]; if (inst.rankB[j][i] < pj) s.add(`${i}-${j}`); }
      }
    }
    return s;
  }, [done, jump, shown, inst, n]);

  // average attractiveness = mean rank a member receives in the OTHER side's lists
  // (lower = more wanted). A principled ordering derived from the preferences
  // themselves; at high consensus it coincides with the shared desirability order.
  const attract = useMemo(() => {
    const a = new Array(n).fill(0), b = new Array(n).fill(0);
    for (let i = 0; i < n; i++) { let s = 0; for (let j = 0; j < n; j++) s += inst.rankB[j][i]; a[i] = s / n; }
    for (let j = 0; j < n; j++) { let s = 0; for (let i = 0; i < n; i++) s += inst.rankA[i][j]; b[j] = s / n; }
    return { a, b };
  }, [inst, n]);
  // settle round = the last round that touched each member's final pairing
  const settle = useMemo(() => {
    const lastA = new Array(n).fill(-1), lastB = new Array(n).fill(-1);
    rounds.forEach((r, ri) => {
      for (const e of r.events) {
        if (e.outcome === 'reject') continue;
        (e.proposer.side === 'A' ? lastA : lastB)[e.proposer.id] = ri;
        (e.receiver.side === 'A' ? lastA : lastB)[e.receiver.id] = ri;
        if (e.outcome === 'bump' && e.displaced !== undefined) (e.proposer.side === 'A' ? lastA : lastB)[e.displaced] = ri;
      }
    });
    const A = new Array(n), B = new Array(n);
    for (let i = 0; i < n; i++) A[i] = finalMatching.a[i] === -1 ? Infinity : (lastA[i] >= 0 ? lastA[i] : Infinity);
    for (let j = 0; j < n; j++) B[j] = finalMatching.b[j] === -1 ? Infinity : (lastB[j] >= 0 ? lastB[j] : Infinity);
    return { A, B };
  }, [rounds, n, finalMatching]);

  // ordering basis: the FINAL matching (static layout) or, with live re-sort on,
  // the matching/settle as it stands at the current round (the diagonal builds itself).
  const orderBasis = useMemo(() => {
    if (!liveSort) return { match: finalMatching, settle };
    const lastA = new Array(n).fill(-1), lastB = new Array(n).fill(-1);
    for (let k = 0; k < safeStep && k < rounds.length; k++) {
      for (const e of rounds[k].events) {
        if (e.outcome === 'reject') continue;
        (e.proposer.side === 'A' ? lastA : lastB)[e.proposer.id] = k;
        (e.receiver.side === 'A' ? lastA : lastB)[e.receiver.id] = k;
        if (e.outcome === 'bump' && e.displaced !== undefined) (e.proposer.side === 'A' ? lastA : lastB)[e.displaced] = k;
      }
    }
    const A = new Array(n), B = new Array(n);
    for (let i = 0; i < n; i++) A[i] = matching.a[i] === -1 ? Infinity : (lastA[i] >= 0 ? lastA[i] : Infinity);
    for (let j = 0; j < n; j++) B[j] = matching.b[j] === -1 ? Infinity : (lastB[j] >= 0 ? lastB[j] : Infinity);
    return { match: matching, settle: { A, B } };
  }, [liveSort, finalMatching, settle, safeStep, matching, rounds, n]);

  const rows = useMemo(() => {
    const ids = Array.from({ length: n }, (_, i) => i);
    if (order === 'index') return ids;
    if (order === 'attract') return ids.sort((x, y) => attract.a[x] - attract.a[y]);
    return ids.sort((x, y) => (orderBasis.settle.A[x] - orderBasis.settle.A[y]) || (attract.a[x] - attract.a[y])); // settle / matchdiag
  }, [n, order, attract, orderBasis]);
  const cols = useMemo(() => {
    const ids = Array.from({ length: n }, (_, i) => i);
    if (order === 'index') return ids;
    if (order === 'attract') return ids.sort((x, y) => attract.b[x] - attract.b[y]);
    if (order === 'settle') return ids.sort((x, y) => (orderBasis.settle.B[x] - orderBasis.settle.B[y]) || (attract.b[x] - attract.b[y]));
    // matchdiag: place each row's partner at the same ordinal → matches on the diagonal
    // (follow the jumped matching when one is shown, so its pairs sit on the diagonal)
    const diag = jump === 'live' ? orderBasis.match : shown;
    const out: number[] = []; const used = new Set<number>();
    for (const i of rows) { const p = diag.a[i]; if (p !== -1 && !used.has(p)) { out.push(p); used.add(p); } }
    for (let j = 0; j < n; j++) if (!used.has(j)) out.push(j);
    return out;
  }, [n, order, attract, orderBasis, rows, jump, shown]);

  useEffect(() => {
    if (!playing) { if (timer.current) { clearInterval(timer.current); timer.current = null; } return; }
    const ms = Math.max(60, 520 - speed * 4.5);
    timer.current = window.setInterval(() => setStep(s => { if (s >= total) { setPlaying(false); return s; } return s + 1; }), ms);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [playing, speed, total]);

  // size the matrix so the whole grid fits the wrap's OWN box. The wrap is a
  // flex-fill child of the view-window body (see .sm2-stage-matrix in the CSS),
  // so its ResizeObserver is the single source of truth — window drags/resizes,
  // layout switches and phone cards all flow through it; never window.innerHeight.
  useLayoutEffect(() => {
    const el = matrixWrap;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      const availH = el.clientHeight - 52;   // just the legend + a little bottom breathing (inspect bar is sticky, see CSS)
      const byW = (w - (showLabels ? 34 : 6)) / n - 3 - 8 / n; // minus row header + per-cell gap + a right inset
      const byH = (availH - (showLabels ? 22 : 6)) / n - 3; // minus column header
      // the largest square that keeps the WHOLE grid in the window (no scroll), capped so a
      // small grid doesn't blow up; floored only so cells stay visible at very large n.
      const fit = Math.floor(Math.min(byW, byH));
      setCellSize(Math.max(6, Math.min(MAX_CELL, fit)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [matrixWrap, n, showLabels]);

  // markers for the resolution step just applied: the satisfied pair + the two
  // partners it displaced (the blocking cell healing).
  const resolveMarkers = useMemo(() => {
    if (!resolve || rStep <= 0) return EMPTY_MARKERS;
    const mk = new Map<string, Marker>();
    const s = resolve.steps[rStep - 1];
    mk.set(`${s.a}-${s.b}`, 'active');
    if (s.freedB !== -1) mk.set(`${s.a}-${s.freedB}`, 'stolen');
    if (s.freedA !== -1) mk.set(`${s.freedA}-${s.b}`, 'stolen');
    return mk;
  }, [resolve, rStep]);

  // resolution playback (reuses the Speed slider rate)
  useEffect(() => {
    if (!rPlaying || !resolve) return;
    const ms = Math.max(120, 620 - speed * 4.5);
    const t = window.setInterval(() => setRStep(s => { if (s >= resolve.steps.length) { setRPlaying(false); return s; } return s + 1; }), ms);
    return () => clearInterval(t);
  }, [rPlaying, resolve, speed]);

  const stabilize = useCallback(() => {
    setJump('live');
    const r = rothVandeVate(inst, finalMatching, seed);
    setResolve(r); setRStep(0); setRPlaying(r.steps.length > 0);
  }, [inst, finalMatching, seed]);
  const endResolve = useCallback(() => { setResolve(null); setRStep(0); setRPlaying(false); }, []);

  const goLive = useCallback(() => { setJump('live'); setPickedNode(null); }, []);
  const reset = useCallback(() => { setPlaying(false); setStep(0); goLive(); setResolve(null); setRStep(0); setRPlaying(false); }, [goLive]);
  const shuffle = useCallback(() => setSeed(s => (s * 1103515245 + 12345) & 0x7fffffff), [setSeed]);

  const narrate = (): string => {
    if (safeStep <= 0) return total ? 'Press Play or Step to run the rounds.' : 'No proposals needed.';
    const r = rounds[safeStep - 1];
    const held = r.events.filter(e => e.outcome !== 'reject').length;
    const bumps = r.events.filter(e => e.outcome === 'bump').length;
    const rejects = r.events.filter(e => e.outcome === 'reject').length;
    const proposals = held + rejects;
    return `Round ${safeStep}: all free ${r.side}'s proposed at once — ${proposals} proposal${proposals === 1 ? '' : 's'} → ${held} held${bumps ? ` (${bumps} by bumping)` : ''}, ${rejects} rejected.`;
  };

  /* ── Lab (welfare surfaces, replicated) ── */
  const [labN, setLabN] = usePersistentState(`${NS}:labN`, 30);
  const [labRes, setLabRes] = usePersistentState(`${NS}:labRes`, 12);
  const [labTrials, setLabTrials] = usePersistentState(`${NS}:labTrials`, 12);
  const [labSeed, setLabSeed] = usePersistentState(`${NS}:labSeed`, 1);   // re-rollable: changes the whole ensemble draw
  const [labSchedule, setLabSchedule] = usePersistentState<Schedule>(`${NS}:labSchedule`, 'alt');
  const [labMetric, setLabMetric] = usePersistentState<'lego' | 'unstable' | 'blocking' | 'stableCount' | 'cost'>(`${NS}:labMetric`, 'lego');
  const [labStat, setLabStat] = usePersistentState<'mean' | 'sd'>(`${NS}:labStat`, 'mean');  // surface shows the mean or the dispersion
  const [labData, setLabData] = useState<Cell[] | null>(null);
  const [labRunning, setLabRunning] = useState(false);
  const [labProgress, setLabProgress] = useState(0);
  // the parameters the *current* labData was actually computed with (so the
  // summary/export describe the displayed surface, not the live sliders).
  const [labRun, setLabRun] = useState<{ res: number; trials: number; n: number; seed: number; schedule: Schedule; metric: string } | null>(null);
  const labCancel = useRef(false);

  const runLab = useCallback(() => {
    labCancel.current = false; setLabRunning(true); setLabProgress(0); setLabData([]);
    const res = Math.max(2, Math.min(LAB_RES_MAX, labRes)); const cells = res * res; const out: Cell[] = []; let k = 0;
    const T = Math.max(1, labTrials);
    const seedBase = ((labSeed >>> 0) * 1000003) >>> 0;   // distinct, reproducible ensemble per Lab seed
    setLabRun({ res, trials: T, n: labN, seed: labSeed, schedule: labSchedule, metric: labMetric });
    // mean(s) + sample SD over T trials at one consensus point
    const metricOf = (cA: number, cB: number, s: number): Omit<Cell, 'x' | 'y' | 'ca' | 'cb' | 'n'> => {
      if (labMetric === 'lego') {
        let sa = 0, saa = 0, sb = 0, sbb = 0;
        for (let t = 0; t < T; t++) {
          const ins = generateInstance({ n: labN, consensusA: cA, consensusB: cB, seed: s + t * 7919 + 1 });
          const { matching } = runRounds(ins, labSchedule, 50, s + t * 104729 + 3);
          const st = stats(ins, matching); sa += st.aAvg; saa += st.aAvg * st.aAvg; sb += st.bAvg; sbb += st.bAvg * st.bAvg;
        }
        const A = meanSd(sa, saa, T), B = meanSd(sb, sbb, T);
        return { v: 0, sd: 0, a: A.mean, aSd: A.sd, b: B.mean, bSd: B.sd };
      }
      // single-value metrics: accumulate sum + sum-of-squares of the per-trial value
      let sum = 0, sumSq = 0;
      for (let t = 0; t < T; t++) {
        const seedT = s + t * 104729 + 3;
        const ins = generateInstance({ n: labN, consensusA: cA, consensusB: cB, seed: s + t * 7919 + 1 });
        let v: number;
        if (labMetric === 'stableCount') v = stablePairs(ins, ENUM_CAP).count;   // schedule-independent: the lattice size
        else if (labMetric === 'cost') { const { matching } = runRounds(ins, labSchedule, 50, seedT); v = rothVandeVate(ins, matching, seedT).steps.length; }
        else { const { matching } = runRounds(ins, labSchedule, 50, seedT); const bp = blockingPairs(ins, matching); v = labMetric === 'unstable' ? (bp > 0 ? 100 : 0) : bp; }
        sum += v; sumSq += v * v;
      }
      const { mean, sd } = meanSd(sum, sumSq, T);
      return { v: mean, sd };
    };
    const batch = () => {
      if (labCancel.current) { setLabRunning(false); return; }
      const end = Math.min(cells, k + 20);
      for (; k < end; k++) {
        const xi = k % res, yi = Math.floor(k / res);
        const cA = xi / (res - 1), cB = yi / (res - 1);
        const m = metricOf(cA, cB, seedBase + k);
        out.push({ x: cA * (1 - 1 / res), y: cB * (1 - 1 / res), ca: cA, cb: cB, n: T, ...m });
      }
      setLabProgress(Math.round((k / cells) * 100)); setLabData([...out]);
      if (k < cells) window.setTimeout(batch, 0); else setLabRunning(false);
    };
    batch();
  }, [labN, labRes, labTrials, labSeed, labMetric, labSchedule]);
  useEffect(() => () => { labCancel.current = true; }, []);

  // display max for the color scale — depends on whether we're showing mean or SD
  const labMax = useMemo(() => {
    if (!labData || !labData.length) return 1;
    if (labMetric === 'unstable' && labStat === 'mean') return 100;
    let m = 0; for (const c of labData) m = Math.max(m, labStat === 'sd' ? c.sd : c.v);
    return m || 1;
  }, [labData, labMetric, labStat]);

  // communicable summary of the *completed* surface (means, dispersion, extremes, where)
  const labSummary = useMemo<LabSummaryData | null>(() => {
    if (!labData || !labData.length || labRunning || !labRun) return null;
    const cells = labData.length;
    const pct = (v: number) => `${Math.round(v * 100)}%`;
    const stat5 = (vals: number[]) => {
      const s = [...vals].sort((p, q) => p - q); const m = s.length;
      const mean = vals.reduce((a, b) => a + b, 0) / m;
      const median = m % 2 ? s[(m - 1) / 2] : (s[m / 2 - 1] + s[m / 2]) / 2;
      return { mean, median, min: s[0], max: s[m - 1] };
    };
    if (labRun.metric === 'lego') {
      const A = stat5(labData.map(c => c.a ?? 0)), B = stat5(labData.map(c => c.b ?? 0));
      const aNoise = labData.reduce((s, c) => s + (c.aSd ?? 0), 0) / cells;
      const bNoise = labData.reduce((s, c) => s + (c.bSd ?? 0), 0) / cells;
      return { kind: 'lego' as const, cells, run: labRun, A, B, aNoise, bNoise };
    }
    const vals = labData.map(c => c.v);
    const five = stat5(vals);
    const lo = labData.reduce((p, c) => c.v < p.v ? c : p);
    const hi = labData.reduce((p, c) => c.v > p.v ? c : p);
    const noise = labData.reduce((s, c) => s + c.sd, 0) / cells;
    const ci = labData.reduce((s, c) => s + ci95(c.sd, c.n), 0) / cells;
    return { kind: 'single' as const, cells, run: labRun, five, noise, ci, loAt: `A ${pct(lo.ca)}·B ${pct(lo.cb)}`, hiAt: `A ${pct(hi.ca)}·B ${pct(hi.cb)}` };
  }, [labData, labRunning, labRun]);

  // the displayed surface as CSV — the communicable, shareable form of the experiment
  const labCsv = useCallback((): string => {
    if (!labData || !labRun) return '';
    const head = labRun.metric === 'lego'
      ? 'consensusA,consensusB,A_mean,A_sd,B_mean,B_sd,n'
      : 'consensusA,consensusB,mean,sd,sem,ci95_halfwidth,n';
    const rows = labData.map(c => labRun.metric === 'lego'
      ? [c.ca, c.cb, c.a, c.aSd, c.b, c.bSd, c.n].map((x, i) => i === 6 ? `${x}` : (x as number).toFixed(4)).join(',')
      : [c.ca, c.cb, c.v, c.sd, c.n > 1 ? c.sd / Math.sqrt(c.n) : 0, ci95(c.sd, c.n), c.n].map((x, i) => i === 6 ? `${x}` : (x as number).toFixed(4)).join(','));
    const meta = `# Stable Matching Lab · metric=${labRun.metric} schedule=${labRun.schedule} n=${labRun.n} grid=${labRun.res}x${labRun.res} trials=${labRun.trials} seed=${labRun.seed}`;
    return `${meta}\n${head}\n${rows.join('\n')}\n`;
  }, [labData, labRun]);
  const [labCopied, setLabCopied] = useState(false);
  const copyCsv = useCallback(() => {
    const csv = labCsv(); if (!csv) return;
    navigator.clipboard?.writeText(csv).then(() => { setLabCopied(true); window.setTimeout(() => setLabCopied(false), 1600); }).catch(() => {});
  }, [labCsv]);
  const downloadCsv = useCallback(() => {
    const csv = labCsv(); if (!csv || !labRun) return;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `stable-matching-${labRun.metric}-${labRun.schedule}-n${labRun.n}-seed${labRun.seed}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }, [labCsv, labRun]);
  const labTitle = labMetric === 'lego' ? `A & B avg rank — ${labSchedule}` : labMetric === 'unstable' ? `Unstable runs % — ${labSchedule}` : labMetric === 'stableCount' ? '# stable matchings (lattice size)' : labMetric === 'cost' ? `Cost to stabilize (RVV steps) — ${labSchedule}` : `Avg blocking pairs — ${labSchedule}`;
  const labHue = labMetric === 'stableCount' ? 168 : labMetric === 'cost' ? 312 : 280;
  const labCaption = labMetric === 'unstable' ? 'unstable %' : labMetric === 'stableCount' ? '# stable' : labMetric === 'cost' ? 'steps' : 'pairs';

  /* ── workspace panels (archetype vocabulary, DESIGN-SPEC §3) ── */

  const instanceNode = (
    <>
      <NumberInput label="Population (per side)" value={n} onChange={setN} min={3} max={200} integer />
      <Slider label="Consensus A" value={consensusA} min={0} max={100} step={1} onChange={setConsensusA} format={v => `${v}%`} />
      <Slider label="Consensus B" value={consensusB} min={0} max={100} step={1} onChange={setConsensusB} format={v => `${v}%`} />
      <div className="sm2-seedrow">
        <NumberInput label="Seed" value={seed} onChange={setSeed} min={1} integer />
        <button className="sm2-btn" onClick={shuffle} title="Draw a fresh instance (new random seed)"><Shuffle size={16} />Shuffle</button>
      </div>
    </>
  );

  const algorithmNode = (
    <>
      <Pills label="Schedule (who proposes each round)" value={schedule} onChange={setSchedule} options={[{ value: 'A', label: 'A' }, { value: 'B', label: 'B' }, { value: 'alt', label: 'Alternate' }, { value: 'random', label: 'Random' }]} />
      {schedule === 'random' && <Slider label="Bias toward A" value={bias} min={0} max={100} step={1} onChange={setBias} format={v => `${v}%`} />}
    </>
  );

  const displayNode = (
    <>
      <Pills label="Cell shows" value={cellView} onChange={setCellView} options={[{ value: 'both', label: 'Both (Lego)' }, { value: 'a', label: 'A→B' }, { value: 'b', label: 'B→A' }, { value: 'diff', label: 'Difference' }]} />
      <Pills label="Order" value={order} onChange={setOrder} options={[{ value: 'matchdiag', label: 'Match diagonal' }, { value: 'settle', label: 'Settle round' }, { value: 'attract', label: 'Attractiveness' }, { value: 'index', label: 'Original' }]} />
      <Checkbox label="Show index labels" checked={showLabels} onChange={setShowLabels} />
      <Checkbox label="Tight grid (no gaps)" checked={tight} onChange={setTight} />
      <Checkbox label="Stable-pair footprint (cells matched in some stable matching)" checked={showFootprint} onChange={setShowFootprint} />
      <Checkbox label="Live re-sort (build the diagonal as it runs)" checked={liveSort} onChange={setLiveSort} />
    </>
  );

  // Transport (Play/Step/Finish/Reset · the RVV Back-to-run) lives once, in the
  // always-on action strip (`actions` below) — never duplicated here. This panel
  // keeps only the round readout and the *parameters*: speed, the one-shot
  // Stabilize repair, and the jump-to-solution navigator.
  const playbackNode = (
    <div className="sm2-actions">
      <div className="sm2-progress">Round {safeStep} / {total}{done ? ' · complete' : ''}</div>
      <Slider label="Speed" value={speed} min={0} max={100} step={1} onChange={setSpeed} />
      {!resolve && (
        <>
          <button className="sm2-btn stabilize" onClick={stabilize} disabled={!finalUnstable} title={finalUnstable ? 'Repair the unstable result to a stable matching' : 'Already stable — nothing to repair'}><ShieldCheck size={16} />Stabilize</button>
          <Select label="Jump to a stable solution" value={pickedMatching ? 'live' : jump} onChange={(v) => { setPickedNode(null); setJump(v); }}
            options={(['live', 'aOptimal', 'bOptimal', 'egalitarian', 'median', 'minRegret', 'sexEqual', 'balanced'] as Jump[])
              .map(k => ({ value: k, label: JUMP_LABELS[k] }))} />
        </>
      )}
    </div>
  );

  const labNode = (
    <div className="sm2-actions">
      <Pills label="Schedule" value={labSchedule} onChange={setLabSchedule} options={[{ value: 'A', label: 'A' }, { value: 'B', label: 'B' }, { value: 'alt', label: 'Alt' }, { value: 'random', label: 'Rnd' }]} />
      <Pills label="Surface (what each cell measures)" value={labMetric} onChange={setLabMetric} options={[{ value: 'lego', label: 'Ranks (A·B)' }, { value: 'unstable', label: 'Unstable %' }, { value: 'blocking', label: 'Blocking' }, { value: 'stableCount', label: '# stable' }, { value: 'cost', label: 'Repair cost' }]} />
      {labMetric !== 'lego' && <Pills label="Show statistic" value={labStat} onChange={setLabStat} options={[{ value: 'mean', label: 'Mean' }, { value: 'sd', label: 'Std dev' }]} />}
      <NumberInput label="Population (per side)" value={labN} onChange={setLabN} min={6} max={80} integer />
      <NumberInput label="Cells per axis (resolution)" value={labRes} onChange={setLabRes} min={2} max={LAB_RES_MAX} integer />
      <NumberInput label="Repeats per cell (trials)" value={labTrials} onChange={setLabTrials} min={1} max={120} integer />
      <div className="sm2-seedrow">
        <NumberInput label="Seed" value={labSeed} onChange={setLabSeed} min={1} integer />
        <button className="sm2-btn" onClick={() => setLabSeed(s => s + 1)} disabled={labRunning} title="Draw a fresh ensemble (new random instances)"><Shuffle size={16} />Re-roll</button>
      </div>
      {labRunning
        ? <button className="sm2-btn" onClick={() => { labCancel.current = true; }}><Pause size={16} />Stop ({labProgress}%)</button>
        : <button className="sm2-btn primary" onClick={runLab}><FlaskConical size={16} />Run Lab</button>}
    </div>
  );

  const story = (() => {
    const cons = (consensusA === 0 && consensusB === 0) ? 'preferences are independent — everyone wants different partners'
      : (consensusA >= 80 && consensusB >= 80) ? 'both sides nearly share one ranking — everyone chases the same few'
      : `consensus A ${consensusA}% · B ${consensusB}% blends a shared ranking with private taste`;
    const sched = schedule === 'A' ? 'A proposes every round' : schedule === 'B' ? 'B proposes every round'
      : schedule === 'alt' ? 'the sides strictly alternate (A, B, A, …)' : `a coin (${bias}% toward A) picks the proposing side each round`;
    const tail = done ? `Settled in ${total} rounds — total rank ${acct.combined} (avg #${acct.avg.toFixed(2)}).`
      : total ? `${safeStep} of ${total} rounds so far.` : 'Already stable.';
    return `${n} A's and ${n} B's; ${cons}. Each round the whole proposing side asks at once and every receiver keeps its single best offer (bumping if better), rejecting the rest; ${sched}. ${tail}`;
  })();

  // The rank-scale legend swatch is driven by the active colormap (--sm-scale), so
  // it always matches the matrix; the text stays color-agnostic (direction, not
  // hue) so it reads correctly whatever divergent map is chosen.
  const legend = (
    <p className="sm2-legend" style={{ '--sm-scale': gradientCss(matrixMap, matrixReverse) } as React.CSSProperties}>
      {cellView === 'both' && <><span className="k sq">square = A→B rank</span><span className="k disc">circle = B→A rank</span></>}
      {cellView === 'a' && <span className="k sq">color = A's rank of B</span>}
      {cellView === 'b' && <span className="k sq">color = B's rank of A</span>}
      {cellView === 'diff'
        ? <span className="k scale diverge">A keener ←→ B keener</span>
        : <span className="k scale">best #1 → worst</span>}
      <span className="k matched">held / matched</span><span className="k active">proposing</span><span className="k blocking">blocking</span>
      {showFootprint && <span className="k footprint">stable elsewhere</span>}
    </p>
  );

  /* ── workspace views — each surface is a window on the stage ── */

  const matrixViewNode = (
    <div className="sm2-stage sm2-stage-matrix">
      <p className="sm2-story">{story}</p>
      {resolve
        ? <div className="sm2-narrate resolve"><strong>Stabilizing — Roth–Vande Vate</strong>: satisfy a blocking pair, repeat. Step {rStep} / {resolve.steps.length} · {blocking.size === 0 ? <>resolved — <strong>stable</strong> in {resolve.steps.length} steps</> : rStep >= resolve.steps.length && !resolve.converged ? <>stopped at {resolve.steps.length} steps (large instance) — {blocking.size} blocking pair{blocking.size === 1 ? '' : 's'} remain</> : `${blocking.size} blocking pair${blocking.size === 1 ? '' : 's'} left`}. Reset to return to the live run.</div>
        : jump === 'live'
          ? <div className="sm2-narrate">{narrate()}</div>
          : <div className="sm2-narrate jump"><strong>{JUMP_LABELS[jump]} stable matching</strong> — {NAMED_NOTE[jump as NamedKey]}. Σrank {acct.combined} (A {acct.aTot} + B {acct.bTot}){solution.capped ? ' · approximate (enumeration capped)' : ''}. Press Step or Reset to return to the live run.</div>}
      <div className="sm2-metrics">
        <div className="sm2-metric big sm2-outcome">
          <span className="sm2-metric-label"><Activity size={14} /> Partner rank by side — average &amp; distribution (lower = happier)</span>
          <div className="sm2-rows">
            <div className="sm2-row">
              <span className="sm2-bar-label"><i className="sw sq" />A</span>
              <strong style={{ color: rankBurd(acct.aAvg || 1, n) }}>#{acct.aAvg.toFixed(2)}</strong>
              <div className="sm2-strip">{acct.aSorted.map((r, i) => <i key={i} style={{ background: r < 0 ? 'var(--border)' : rankBurd(r, n) }} title={r < 0 ? 'unmatched' : `#${r}`} />)}</div>
            </div>
            <div className="sm2-row">
              <span className="sm2-bar-label"><i className="sw disc" />B</span>
              <strong style={{ color: rankBurd(acct.bAvg || 1, n) }}>#{acct.bAvg.toFixed(2)}</strong>
              <div className="sm2-strip">{acct.bSorted.map((r, i) => <i key={i} style={{ background: r < 0 ? 'var(--border)' : rankBurd(r, n) }} title={r < 0 ? 'unmatched' : `#${r}`} />)}</div>
            </div>
          </div>
          <span className="sm2-metric-sub">each tick = one person, sorted best → worst · blue #1 → red #{n} · total rank {acct.combined}{acct.free ? ` · ${acct.free} still free` : ''}</span>
        </div>
        <div className="sm2-metric">
          <span className="sm2-metric-label"><Layers size={14} /> Solution space</span>
          <strong>{solution.capped ? `≥${FOOT_CAP}` : solution.count}</strong>
          <span className="sm2-metric-sub">{solution.count === 1 ? 'a unique stable matching' : `${solution.capped ? 'at least ' : ''}${solution.count} stable matchings`} · footprint {solution.pairs.size} of {n * n} cells</span>
        </div>
        <div className={`sm2-metric stability ${!shownDone ? '' : blocking.size === 0 ? 'ok' : 'bad'}`}>
          <span className="sm2-metric-label">{blocking.size === 0 ? <ShieldCheck size={14} /> : <AlertTriangle size={14} />} Stability</span>
          <strong>{!shownDone ? '—' : blocking.size === 0 ? 'Stable' : `${blocking.size} blocking`}</strong>
          <span className="sm2-metric-sub">{!shownDone ? 'finish the run to check' : blocking.size === 0 ? 'no pair would defect' : 'purple-ringed cells would defect'}</span>
        </div>
      </div>
      <div className="sm2-matrix-wrap" ref={setMatrixWrap}>
        <Matrix inst={inst} matching={shown} rows={rows} cols={cols} markers={resolve ? resolveMarkers : jump === 'live' ? markers : EMPTY_MARKERS} blocking={blocking} footprint={showFootprint ? solution.pairs : null}
          inspect={inspect} onHover={(c) => { if (!pinned) setInspect(c); }} onClick={(c) => { if (pinned && inspect && inspect[0] === c[0] && inspect[1] === c[1]) { setPinned(false); setInspect(null); } else { setInspect(c); setPinned(true); } }}
          size={cellSize} labels={showLabels && cellSize >= 16} view={cellView} gap={tight ? 0 : 3} trail={resolve || jump !== 'live' ? EMPTY_TRAIL : trail} />
        {legend}
      </div>
      {inspect && (
        <div className={`sm2-inspect${pinned ? ' pinned' : ''}`}>
          <PrefList inst={inst} side="A" id={inspect[0]} partner={shown.a[inspect[0]]} mark={inspect[1]} />
          <PrefList inst={inst} side="B" id={inspect[1]} partner={shown.b[inspect[1]]} mark={inspect[0]} />
          <span className="sm2-inspect-hint">◆ outline = partner this matching · ▢ = the cell you're on · {pinned ? 'click the cell again to unpin' : 'click a cell to pin'}</span>
        </div>
      )}
    </div>
  );

  const surfaceViewNode = (
    <div className="sm2-stage">
      <div className="sm2-lab">
        <Heatmap data={labData} res={labRun ? labRun.res : Math.max(2, Math.min(LAB_RES_MAX, labRes))} maxV={labMax} hue={labHue} title={labTitle} caption={labCaption} mode={labMetric === 'lego' ? 'lego' : 'single'} maxRank={labN} stat={labStat} />
        {labSummary && <LabSummary s={labSummary} onCopy={copyCsv} onDownload={downloadCsv} copied={labCopied} />}
        <p className="sm2-lab-note">{labMetric === 'cost'
          ? <>Each cell averages the <strong>number of Roth–Vande Vate repair steps</strong> needed to fix the <strong>{labSchedule}</strong> schedule's (often unstable) result into a stable matching, over <strong>{labTrials}</strong> instances. One-sided (A/B) is already stable → 0; the synchronous Alternate / Random schedules cost more to repair where preferences are disordered. The "cost to stabilize" of the frustrated regime.</>
          : labMetric === 'stableCount'
          ? <>Each cell counts the <strong>number of stable matchings</strong> (the lattice size), averaged over <strong>{labTrials}</strong> instances — this is a property of the preferences, not of any schedule. It is huge in the disordered (low-consensus) corner and <strong>collapses to exactly 1</strong> as both sides converge on one ranking: a unique, assortative stable matching. The order/disorder phase curve of the whole problem. (Enumeration is capped at 300; keep Population small.)</>
          : <>Each cell sweeps consensus A × B and averages <strong>{labTrials}</strong> independent instances run with the <strong>{labSchedule}</strong> schedule — signal, not single-draw noise. {labMetric === 'lego'
            ? 'Lego cells: the square is A’s average rank, the circle B’s, on the same blue→red scale (blue = #1). Low consensus is blue (people want different partners, so everyone does well); as both groups converge on one ranking the cells redden — most chase the same few.'
            : labMetric === 'unstable'
              ? 'One-sided (A or B) is stable everywhere (a flat 0); the synchronous Alternate / Random schedules leave blocking pairs across most of the surface — synchronous two-sided deferred acceptance is not guaranteed stable.'
              : 'Average number of blocking pairs left at the end — zero for one-sided, positive across most of the plane for Alternate / Random.'}</>}</p>
      </div>
    </div>
  );

  const latticeViewNode = (
    <div className="sm2-stage">
      <div className="sm2-lattice-view">
        <p className="sm2-story">The <strong>lattice of stable matchings</strong> for this instance — every stable matching, ordered by who-prefers-what. A-optimal sits at the top (best for A), B-optimal at the bottom; each edge is a single <em>rotation</em>. Named solutions are flagged. Click any node to load it into the Matching matrix (the Run layout).</p>
        <LatticeView inst={inst} set={stableSet.matchings} capped={stableSet.capped} named={named} picked={pickedNode}
          onPick={(i) => { setPickedNode(i); setJump('live'); setResolve(null); }} />
      </div>
    </div>
  );

  /* ── workspace assembly: panels, view windows, built-in layouts ── */

  const colorNode = (
    <ColormapPicker
      family="divergent"
      value={matrixMap}
      onChange={setMatrixMap}
      themeId={themeId}
      reverse={matrixReverse}
      onReverse={setMatrixReverse}
    />
  );

  const sections: SectionDef[] = [
    { id: 'algorithm', title: 'Algorithm', arch: 'subject', node: algorithmNode, estHeight: 170 },
    { id: 'instance', title: 'Instance', arch: 'domain', node: instanceNode, estHeight: 300 },
    { id: 'color', title: 'Color', arch: 'color', node: colorNode, estHeight: 300 },
    { id: 'display', title: 'Display', arch: 'marks', node: displayNode, estHeight: 360 },
    { id: 'playback', title: 'Playback', arch: 'playback', node: playbackNode, estHeight: 470 },
    { id: 'lab', title: 'Lab', arch: 'lab', node: labNode, estHeight: 540 },
  ];

  const wsViews: ViewDef[] = [
    { id: 'matrix', title: 'Matching matrix', node: matrixViewNode, defaultRect: { x: 372, y: 16, w: 660, h: 600 } },
    { id: 'surface', title: 'Welfare surface', node: surfaceViewNode, defaultRect: { x: 372, y: 16, w: 560, h: 600 } },
    { id: 'lattice', title: 'Stable-matching lattice', node: latticeViewNode, defaultRect: { x: 372, y: 16, w: 640, h: 560 } },
  ];

  const layouts: LayoutDef[] = [
    {
      id: 'run', name: 'Run', sub: 'Matrix · Playback', icon: 'play',
      open: { instance: { x: 84, y: 18 }, playback: { x: 84, y: 330 } },
      views: { matrix: { open: true }, surface: { open: false }, lattice: { open: false } },
    },
    {
      id: 'lab', name: 'Lab', sub: 'Sweep the consensus plane', icon: 'flask',
      open: { lab: { x: 84, y: 18 } },
      views: { matrix: { open: false }, surface: { open: true }, lattice: { open: false } },
    },
    {
      id: 'lattice', name: 'Lattice', sub: 'The space of stable matchings', icon: 'layers',
      open: { instance: { x: 84, y: 18 } },
      views: { matrix: { open: false }, surface: { open: false }, lattice: { open: true } },
    },
  ];

  // The "?" modal carries the short explainer and the full README, so nothing
  // the old chrome could surface is lost.
  const help = [explainerText, readmeText].filter(Boolean).join('\n\n---\n\n');

  /* Always-on action strip — the same verbs as the Playback panel (its
     projection), contextual: the RVV resolve replay swaps the set. */
  const actions: ActionDef[] = resolve
    ? [
      { id: 'play', icon: rPlaying ? 'pause' : 'play', label: rPlaying ? 'Pause' : 'Play', primary: true, active: rPlaying, sectionId: 'playback', disabled: rStep >= resolve.steps.length && !rPlaying, onClick: () => setRPlaying(p => !p) },
      { id: 'step', icon: 'step', label: 'Step', sectionId: 'playback', disabled: rPlaying || rStep >= resolve.steps.length, onClick: () => setRStep(s => Math.min(resolve.steps.length, s + 1)) },
      { id: 'finish', icon: 'finish', label: 'Finish', sectionId: 'playback', disabled: rStep >= resolve.steps.length, onClick: () => setRStep(resolve.steps.length) },
      { id: 'back', icon: 'back', label: 'Back to run', sectionId: 'playback', onClick: endResolve },
    ]
    : [
      { id: 'play', icon: playing ? 'pause' : 'play', label: playing ? 'Pause' : 'Play', primary: true, active: playing, sectionId: 'playback', disabled: jump === 'live' && !pickedMatching && done && !playing, onClick: () => { goLive(); setPlaying(p => !p); } },
      { id: 'step', icon: 'step', label: 'Step', sectionId: 'playback', disabled: playing || (jump === 'live' && !pickedMatching && done), onClick: () => { goLive(); setStep(s => Math.min(total, s + 1)); } },
      { id: 'finish', icon: 'finish', label: 'Finish', sectionId: 'playback', disabled: jump === 'live' && !pickedMatching && done, onClick: () => { goLive(); setStep(total); } },
      { id: 'reset', icon: 'reset', label: 'Reset', sectionId: 'playback', onClick: reset },
    ];

  return (
    <Workspace
      appId="stable-matching"
      title="Stable Matching"
      sections={sections}
      views={wsViews}
      layouts={layouts}
      defaultLayoutId="run"
      explainer={help}
      actions={actions}
    />
  );
}
