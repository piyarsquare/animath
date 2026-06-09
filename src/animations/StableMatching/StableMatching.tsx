import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Activity, AlertTriangle, FastForward, FlaskConical, Layers, Pause, Play,
  RotateCcw, Shuffle, SkipForward, ShieldCheck,
} from 'lucide-react';
import './stableMatching.css';
import { ShellSettings, ShellActions, useAppHeader, useAppExplainer } from '../../components/AppShell';
import { Section, Slider, Pills, Select, NumberInput, Checkbox } from '../../components/ControlPanel';
import { usePersistentState } from '../../lib/usePersistentState';
import explainerText from './EXPLAINER.md?raw';
import { generateInstance, type Instance } from './model';
import {
  runRounds, applyLog, blockingPairs, stats,
  type Schedule, type Matching,
} from './galeShapley';
import { allStableMatchings, stablePairs, namedSolutions, score, NAMED_LABELS, type NamedKey } from './rotations';
import { rothVandeVate, replaySteps, type ResolveResult } from './resolver';

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
const EMPTY_MARKERS = new Map<string, 'active' | 'reject' | 'stolen'>();
const EMPTY_TRAIL = new Map<string, number>();

// shared BuRd diverging scale (blue = best rank → white → red = worst)
const BURD = [[33, 102, 172], [103, 169, 207], [247, 247, 247], [239, 138, 98], [178, 24, 43]];
function burd(u: number): string {
  const x = Math.max(0, Math.min(1, u));
  const seg = x * (BURD.length - 1), i = Math.min(BURD.length - 2, Math.floor(seg)), f = seg - i;
  const c = BURD[i].map((v, k) => Math.round(v + (BURD[i + 1][k] - v) * f));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}
const rankBurd = (r: number, maxRank: number) => burd(maxRank > 1 ? (r - 1) / (maxRank - 1) : 0);
type Marker = 'active' | 'reject' | 'stolen';
function Matrix({ inst, matching, rows, cols, markers, blocking, footprint, size, labels, view, gap, trail }: {
  inst: Instance; matching: Matching; rows: number[]; cols: number[];
  markers: Map<string, Marker>; blocking: Set<string>; footprint: Set<string> | null; size: number; labels: boolean;
  view: 'both' | 'a' | 'b' | 'diff'; gap: number; trail: Map<string, number>;
}) {
  const n = inst.n;
  const showNums = size >= 30;
  const rankColor = (r: number) => rankBurd(r, n);
  const diffColor = (d: number) => burd(((n > 1 ? Math.max(-1, Math.min(1, d / (n - 1))) : 0) + 1) / 2);
  return (
    <div className={`sm2-matrix${gap === 0 ? ' tight' : ''}`} style={{ gap: `${gap}px`, gridTemplateColumns: `${labels ? '1.8em ' : ''}repeat(${cols.length}, ${size}px)` }}>
      {labels && <div className="sm2-corner" />}
      {labels && cols.map(j => <div key={`h${j}`} className="sm2-chead">{j}</div>)}
      {rows.map(i => (
        <React.Fragment key={`r${i}`}>
          {labels && <div className="sm2-rhead">{i}</div>}
          {cols.map(j => {
            const aR = inst.rankA[i][j] + 1, bR = inst.rankB[j][i] + 1, d = aR - bR;
            const matched = matching.a[i] === j;
            const mk = markers.get(`${i}-${j}`);   // this round: active (proposing) / reject / stolen
            const inFoot = footprint?.has(`${i}-${j}`) && !matched;   // matched in SOME stable matching, not this one
            const cls = `sm2-mcell${matched ? ' matched' : ''}${mk ? ' ' + mk : ''}${blocking.has(`${i}-${j}`) ? ' blocking' : ''}${inFoot ? ' footprint' : ''}`;
            const bg = view === 'b' ? rankColor(bR) : view === 'diff' ? diffColor(d) : rankColor(aR);
            const age = trail.get(`${i}-${j}`);
            return (
              <div key={j} className={cls} style={{ height: size, background: bg }}
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

type Cell = { x: number; y: number; v: number; a?: number; b?: number };
function Heatmap({ data, res, maxV, hue, title, caption, mode, maxRank }: {
  data: Cell[] | null; res: number; maxV: number; hue: number; title: string; caption: string;
  mode: 'single' | 'lego'; maxRank: number;
}) {
  const [hover, setHover] = useState<Cell | null>(null);
  if (!data || !data.length) return <div className="sm2-heatmap-empty"><FlaskConical size={28} /><p>Run the Lab to see the surface</p></div>;
  const cs = 100 / res;
  const single = (v: number) => `hsl(${hue}, 70%, ${92 - Math.max(0, Math.min(1, v / (maxV || 1))) * 57}%)`;
  return (
    <div className="sm2-heatmap">
      <h4>{title}</h4>
      <div className="sm2-heatmap-grid" onMouseLeave={() => setHover(null)}>
        {data.map((c, i) => (
          <div key={i} className="sm2-cell" style={{ left: `${c.x * 100}%`, bottom: `${c.y * 100}%`, width: `${cs}%`, height: `${cs}%`, background: mode === 'lego' ? rankBurd(c.a ?? 0, maxRank) : single(c.v) }} onMouseEnter={() => setHover(c)}>
            {mode === 'lego' && <span className="sm2-disc" style={{ background: rankBurd(c.b ?? 0, maxRank) }} />}
          </div>
        ))}
        {hover && <div className="sm2-tip">consensus A {(hover.x * 100).toFixed(0)}% · B {(hover.y * 100).toFixed(0)}%<br />
          {mode === 'lego' ? `A avg #${(hover.a ?? 0).toFixed(2)} · B avg #${(hover.b ?? 0).toFixed(2)}` : <>{caption}: <strong>{hover.v.toFixed(2)}</strong></>}</div>}
      </div>
      <div className="sm2-heatmap-x">consensus A →</div>
      {mode === 'lego'
        ? <p className="sm2-legend"><span className="k sq">square = A avg rank</span><span className="k disc">circle = B avg rank</span><span className="k scale">blue #1 → red #{maxRank}</span></p>
        : <div className="sm2-heatmap-legend"><span>0</span><span className="bar" style={{ background: `linear-gradient(90deg, hsl(${hue},70%,92%), hsl(${hue},70%,35%))` }} /><span>{maxV.toFixed(1)}</span></div>}
    </div>
  );
}

export default function StableMatching() {
  useAppHeader('Stable Matching');
  useAppExplainer(explainerText);

  const [view, setView] = usePersistentState<'visualizer' | 'lab'>(`${NS}:view`, 'visualizer');
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

  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<number | null>(null);
  const matrixWrap = useRef<HTMLDivElement>(null);
  const [cellSize, setCellSize] = useState(40);

  const inst = useMemo(() => generateInstance({ n, consensusA: consensusA / 100, consensusB: consensusB / 100, seed }), [n, consensusA, consensusB, seed]);
  const result = useMemo(() => runRounds(inst, schedule, bias, seed), [inst, schedule, bias, seed]);
  const rounds = result.rounds;
  const total = rounds.length;                                  // a "step" is now a whole round
  const safeStep = Math.min(step, total);                       // guard the render before the reset effect fires
  useEffect(() => { setStep(0); setPlaying(false); setJump('live'); setResolve(null); setRStep(0); setRPlaying(false); }, [result]);

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

  // Roth–Vande Vate resolver: repair the (possibly unstable) run to stability.
  const [resolve, setResolve] = useState<ResolveResult | null>(null);
  const [rStep, setRStep] = useState(0);
  const [rPlaying, setRPlaying] = useState(false);
  const resolveMatching = useMemo(() => resolve ? replaySteps(resolve.start, resolve.steps, rStep) : null, [resolve, rStep]);
  const finalUnstable = useMemo(() => blockingPairs(inst, finalMatching) > 0, [inst, finalMatching]);

  const shown = resolveMatching ?? (jump === 'live' ? matching : named[jump]);
  const shownDone = resolve != null || jump !== 'live' || done;   // a named / resolved matching is complete

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

  // size the matrix so the whole grid fits the available width and height
  useLayoutEffect(() => {
    if (view !== 'visualizer') return;
    const el = matrixWrap.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      const top = el.getBoundingClientRect().top;
      const availH = window.innerHeight - top - 64;   // room for legend + bottom padding
      const byW = (w - (showLabels ? 34 : 6)) / n - 3; // minus row header + per-cell gap
      const byH = (availH - (showLabels ? 22 : 6)) / n - 3; // minus column header
      // floor keeps cells visible (a dense lego heatmap) at large n; the wrap scrolls if needed
      setCellSize(Math.max(5, Math.min(80, Math.floor(Math.min(byW, byH)))));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, [n, view, showLabels]);

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

  const reset = useCallback(() => { setPlaying(false); setStep(0); setJump('live'); setResolve(null); setRStep(0); setRPlaying(false); }, []);
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
  const [labSchedule, setLabSchedule] = usePersistentState<Schedule>(`${NS}:labSchedule`, 'alt');
  const [labMetric, setLabMetric] = usePersistentState<'lego' | 'unstable' | 'blocking' | 'stableCount'>(`${NS}:labMetric`, 'lego');
  const [labData, setLabData] = useState<Cell[] | null>(null);
  const [labMax, setLabMax] = useState(1);
  const [labRunning, setLabRunning] = useState(false);
  const [labProgress, setLabProgress] = useState(0);
  const labCancel = useRef(false);

  const runLab = useCallback(() => {
    labCancel.current = false; setLabRunning(true); setLabProgress(0); setLabData([]);
    const res = Math.max(2, Math.min(24, labRes)); const cells = res * res; const out: Cell[] = []; let max = 0, k = 0;
    const metricOf = (cA: number, cB: number, s: number): { v: number; a?: number; b?: number } => {
      if (labMetric === 'lego') {
        let sa = 0, sb = 0;
        for (let t = 0; t < labTrials; t++) {
          const ins = generateInstance({ n: labN, consensusA: cA, consensusB: cB, seed: s + t * 7919 + 1 });
          const { matching } = runRounds(ins, labSchedule, 50, s + t * 104729 + 3);
          const st = stats(ins, matching); sa += st.aAvg; sb += st.bAvg;
        }
        return { v: 0, a: sa / labTrials, b: sb / labTrials };
      }
      if (labMetric === 'stableCount') {
        // count is a property of the instance (schedule-independent): the lattice size
        let sum = 0;
        for (let t = 0; t < labTrials; t++) {
          const ins = generateInstance({ n: labN, consensusA: cA, consensusB: cB, seed: s + t * 7919 + 1 });
          sum += stablePairs(ins, 300).count;
        }
        return { v: sum / labTrials };
      }
      let sum = 0;
      for (let t = 0; t < labTrials; t++) {
        const ins = generateInstance({ n: labN, consensusA: cA, consensusB: cB, seed: s + t * 7919 + 1 });
        const { matching } = runRounds(ins, labSchedule, 50, s + t * 104729 + 3);
        sum += labMetric === 'unstable' ? (blockingPairs(ins, matching) > 0 ? 100 : 0) : blockingPairs(ins, matching);
      }
      return { v: sum / labTrials };
    };
    const batch = () => {
      if (labCancel.current) { setLabRunning(false); return; }
      const end = Math.min(cells, k + 20);
      for (; k < end; k++) { const xi = k % res, yi = Math.floor(k / res); const m = metricOf(xi / (res - 1), yi / (res - 1), 1000 + k); max = Math.max(max, m.v); out.push({ x: xi / (res - 1) * (1 - 1 / res), y: yi / (res - 1) * (1 - 1 / res), v: m.v, a: m.a, b: m.b }); }
      setLabProgress(Math.round((k / cells) * 100)); setLabData([...out]); setLabMax(labMetric === 'unstable' ? 100 : max);
      if (k < cells) window.setTimeout(batch, 0); else setLabRunning(false);
    };
    batch();
  }, [labN, labRes, labTrials, labMetric, labSchedule]);
  useEffect(() => () => { labCancel.current = true; }, []);
  const labTitle = labMetric === 'lego' ? `A & B avg rank — ${labSchedule}` : labMetric === 'unstable' ? `Unstable runs % — ${labSchedule}` : labMetric === 'stableCount' ? '# stable matchings (lattice size)' : `Avg blocking pairs — ${labSchedule}`;
  const labHue = labMetric === 'stableCount' ? 168 : 280;
  const labCaption = labMetric === 'unstable' ? 'unstable %' : labMetric === 'stableCount' ? '# stable' : 'pairs';

  const settings = (
    <ShellSettings>
      <Section title="Domain" icon="◷" defaultOpen>
        <NumberInput label="Population (per side)" value={n} onChange={setN} min={3} max={200} integer />
        <Slider label="Consensus A" value={consensusA} min={0} max={100} step={1} onChange={setConsensusA} format={v => `${v}%`} />
        <Slider label="Consensus B" value={consensusB} min={0} max={100} step={1} onChange={setConsensusB} format={v => `${v}%`} />
        <NumberInput label="Seed" value={seed} onChange={setSeed} min={1} integer />
      </Section>
      <Section title="Algorithm" icon="↻" defaultOpen>
        <Pills label="Schedule (who proposes each round)" value={schedule} onChange={setSchedule} options={[{ value: 'A', label: 'A' }, { value: 'B', label: 'B' }, { value: 'alt', label: 'Alternate' }, { value: 'random', label: 'Random' }]} />
        {schedule === 'random' && <Slider label="Bias toward A" value={bias} min={0} max={100} step={1} onChange={setBias} format={v => `${v}%`} />}
      </Section>
      <Section title="Display" icon="◧">
        <Pills label="Cell shows" value={cellView} onChange={setCellView} options={[{ value: 'both', label: 'Both (Lego)' }, { value: 'a', label: 'A→B' }, { value: 'b', label: 'B→A' }, { value: 'diff', label: 'Difference' }]} />
        <Pills label="Order" value={order} onChange={setOrder} options={[{ value: 'matchdiag', label: 'Match diagonal' }, { value: 'settle', label: 'Settle round' }, { value: 'attract', label: 'Attractiveness' }, { value: 'index', label: 'Original' }]} />
        <Checkbox label="Show index labels" checked={showLabels} onChange={setShowLabels} />
        <Checkbox label="Tight grid (no gaps)" checked={tight} onChange={setTight} />
        <Checkbox label="Stable-pair footprint (cells matched in some stable matching)" checked={showFootprint} onChange={setShowFootprint} />
      </Section>
    </ShellSettings>
  );

  const actions = (
    <ShellActions>
      {view === 'visualizer' ? (
        resolve ? (
          <div className="sm2-actions">
            <button className="sm2-btn primary" onClick={() => setRPlaying(p => !p)} disabled={rStep >= resolve.steps.length && !rPlaying}>{rPlaying ? <Pause size={16} /> : <Play size={16} />}{rPlaying ? 'Pause' : 'Play'}</button>
            <button className="sm2-btn" onClick={() => setRStep(s => Math.min(resolve.steps.length, s + 1))} disabled={rPlaying || rStep >= resolve.steps.length}><SkipForward size={16} />Step</button>
            <button className="sm2-btn" onClick={() => setRStep(resolve.steps.length)} disabled={rStep >= resolve.steps.length}><FastForward size={16} />Finish</button>
            <button className="sm2-btn" onClick={endResolve}><RotateCcw size={16} />Back to run</button>
            <Slider label="Speed" value={speed} min={0} max={100} step={1} onChange={setSpeed} />
          </div>
        ) : (
          <div className="sm2-actions">
            <button className="sm2-btn primary" onClick={() => { setJump('live'); setPlaying(p => !p); }} disabled={jump === 'live' && done && !playing}>{playing ? <Pause size={16} /> : <Play size={16} />}{playing ? 'Pause' : 'Play'}</button>
            <button className="sm2-btn" onClick={() => { setJump('live'); setStep(s => Math.min(total, s + 1)); }} disabled={playing || (jump === 'live' && done)}><SkipForward size={16} />Step</button>
            <button className="sm2-btn" onClick={() => { setJump('live'); setStep(total); }} disabled={jump === 'live' && done}><FastForward size={16} />Finish</button>
            <button className="sm2-btn" onClick={reset}><RotateCcw size={16} />Reset</button>
            <button className="sm2-btn" onClick={shuffle}><Shuffle size={16} />Shuffle</button>
            <button className="sm2-btn stabilize" onClick={stabilize} disabled={!finalUnstable} title={finalUnstable ? 'Repair the unstable result to a stable matching' : 'Already stable — nothing to repair'}><ShieldCheck size={16} />Stabilize</button>
            <Slider label="Speed" value={speed} min={0} max={100} step={1} onChange={setSpeed} />
            <Checkbox label="Live re-sort (build the diagonal as it runs)" checked={liveSort} onChange={setLiveSort} />
            <Select label="Jump to a stable solution" value={jump} onChange={setJump}
              options={(['live', 'aOptimal', 'bOptimal', 'egalitarian', 'median', 'minRegret', 'sexEqual', 'balanced'] as Jump[])
                .map(k => ({ value: k, label: JUMP_LABELS[k] }))} />
          </div>
        )
      ) : (
        <div className="sm2-actions">
          <Pills label="Schedule" value={labSchedule} onChange={setLabSchedule} options={[{ value: 'A', label: 'A' }, { value: 'B', label: 'B' }, { value: 'alt', label: 'Alt' }, { value: 'random', label: 'Rnd' }]} />
          <Pills label="Surface" value={labMetric} onChange={setLabMetric} options={[{ value: 'lego', label: 'Ranks (A·B)' }, { value: 'unstable', label: 'Unstable %' }, { value: 'blocking', label: 'Blocking' }, { value: 'stableCount', label: '# stable' }]} />
          <NumberInput label="Population" value={labN} onChange={setLabN} min={6} max={80} integer />
          <NumberInput label="Resolution" value={labRes} onChange={setLabRes} min={4} max={24} integer />
          <NumberInput label="Trials / cell" value={labTrials} onChange={setLabTrials} min={1} max={60} integer />
          <button className="sm2-btn primary" onClick={runLab} disabled={labRunning}><FlaskConical size={16} />{labRunning ? `Running ${labProgress}%` : 'Run Lab'}</button>
        </div>
      )}
    </ShellActions>
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

  const legend = (
    <p className="sm2-legend">
      {cellView === 'both' && <><span className="k sq">square = A→B rank</span><span className="k disc">circle = B→A rank</span></>}
      {cellView === 'a' && <span className="k sq">colour = A's rank of B</span>}
      {cellView === 'b' && <span className="k sq">colour = B's rank of A</span>}
      {cellView === 'diff'
        ? <span className="k scale diverge">blue = A keener · red = B keener</span>
        : <span className="k scale">blue #1 → red last</span>}
      <span className="k matched">held / matched</span><span className="k active">proposing</span><span className="k blocking">blocking</span>
      {showFootprint && <span className="k footprint">stable elsewhere</span>}
    </p>
  );

  return (
    <div className="sm2-app">
      {settings}{actions}
      <header className="sm2-header">
        <div className="sm2-tabs">
          <button className={view === 'visualizer' ? 'active' : ''} onClick={() => setView('visualizer')}><Layers size={15} />Visualizer</button>
          <button className={view === 'lab' ? 'active' : ''} onClick={() => setView('lab')}><FlaskConical size={15} />Lab</button>
        </div>
        {view === 'visualizer' && <div className="sm2-progress">Round {safeStep} / {total}{done ? ' · complete' : ''}</div>}
      </header>

      {view === 'visualizer' ? (
        <div className="sm2-visualizer">
          <p className="sm2-story">{story}</p>
          {resolve
            ? <div className="sm2-narrate resolve"><strong>Stabilizing — Roth–Vande Vate</strong>: satisfy a blocking pair, repeat. Step {rStep} / {resolve.steps.length} · {blocking.size === 0 ? <>resolved — <strong>stable</strong> in {resolve.steps.length} steps</> : `${blocking.size} blocking pair${blocking.size === 1 ? '' : 's'} left`}. Reset to return to the live run.</div>
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
                  <div className="sm2-strip">{acct.aSorted.map((r, i) => <i key={i} style={{ background: r < 0 ? '#3a3a44' : rankBurd(r, n) }} title={r < 0 ? 'unmatched' : `#${r}`} />)}</div>
                </div>
                <div className="sm2-row">
                  <span className="sm2-bar-label"><i className="sw disc" />B</span>
                  <strong style={{ color: rankBurd(acct.bAvg || 1, n) }}>#{acct.bAvg.toFixed(2)}</strong>
                  <div className="sm2-strip">{acct.bSorted.map((r, i) => <i key={i} style={{ background: r < 0 ? '#3a3a44' : rankBurd(r, n) }} title={r < 0 ? 'unmatched' : `#${r}`} />)}</div>
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
          <div className="sm2-matrix-wrap" ref={matrixWrap}>
            <Matrix inst={inst} matching={shown} rows={rows} cols={cols} markers={resolve ? resolveMarkers : jump === 'live' ? markers : EMPTY_MARKERS} blocking={blocking} footprint={showFootprint ? solution.pairs : null} size={cellSize} labels={showLabels && cellSize >= 16} view={cellView} gap={tight ? 0 : 3} trail={resolve || jump !== 'live' ? EMPTY_TRAIL : trail} />
            {legend}
          </div>
        </div>
      ) : (
        <div className="sm2-lab">
          <Heatmap data={labData} res={Math.max(2, Math.min(24, labRes))} maxV={labMax} hue={labHue} title={labTitle} caption={labCaption} mode={labMetric === 'lego' ? 'lego' : 'single'} maxRank={labN} />
          <p className="sm2-lab-note">{labMetric === 'stableCount'
            ? <>Each cell counts the <strong>number of stable matchings</strong> (the lattice size), averaged over <strong>{labTrials}</strong> instances — this is a property of the preferences, not of any schedule. It is huge in the disordered (low-consensus) corner and <strong>collapses to exactly 1</strong> as both sides converge on one ranking: a unique, assortative stable matching. The order/disorder phase curve of the whole problem. (Enumeration is capped at 300; keep Population small.)</>
            : <>Each cell sweeps consensus A × B and averages <strong>{labTrials}</strong> independent instances run with the <strong>{labSchedule}</strong> schedule — signal, not single-draw noise. {labMetric === 'lego'
              ? 'Lego cells: the square is A’s average rank, the circle B’s, on the same blue→red scale (blue = #1). Low consensus is blue (people want different partners, so everyone does well); as both groups converge on one ranking the cells redden — most chase the same few.'
              : labMetric === 'unstable'
                ? 'One-sided (A or B) is stable everywhere (a flat 0); the synchronous Alternate / Random schedules leave blocking pairs across most of the surface — synchronous two-sided deferred acceptance is not guaranteed stable.'
                : 'Average number of blocking pairs left at the end — zero for one-sided, positive across most of the plane for Alternate / Random.'}</>}</p>
        </div>
      )}
    </div>
  );
}
