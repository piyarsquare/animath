import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Activity, AlertTriangle, FastForward, FlaskConical, Layers, Pause, Play,
  RotateCcw, Shuffle, SkipForward, ShieldCheck,
} from 'lucide-react';
import './stableMatching.css';
import { ShellSettings, ShellActions, useAppHeader, useAppExplainer } from '../../components/AppShell';
import { Section, Slider, Pills, NumberInput, Checkbox } from '../../components/ControlPanel';
import { usePersistentState } from '../../lib/usePersistentState';
import explainerText from './EXPLAINER.md?raw';
import { generateInstance, type Instance } from './model';
import {
  run, applyLog, oneSided, stats,
  type Mode, type Side, type Matching, type ProposalEvent,
} from './galeShapley';

const NS = 'stable-matching';

/* ── The preference matrix: rows = A, cols = B; each cell shows the pair's two
 *    ranks (A's rank of B, top-left; B's rank of A, bottom-right). The matching
 *    (= current tentative holds) lights up; the active proposal rings; blocking
 *    pairs (if any, at the end) flag red. This is the algorithm, foregrounded. ── */
const TRAIL = 6; // how many recent failed entries to keep in the fading trail
function Matrix({ inst, matching, rows, cols, event, blocking, size, labels, view, gap, trail }: {
  inst: Instance; matching: Matching; rows: number[]; cols: number[];
  event: ProposalEvent | null; blocking: Set<string>; size: number; labels: boolean;
  view: 'both' | 'a' | 'b' | 'diff'; gap: number; trail: Map<string, number>;
}) {
  const n = inst.n;
  const showNums = size >= 30;
  const BURD = [[33, 102, 172], [103, 169, 207], [247, 247, 247], [239, 138, 98], [178, 24, 43]];
  const burd = (u: number) => {
    const x = Math.max(0, Math.min(1, u));
    const seg = x * (BURD.length - 1), i = Math.min(BURD.length - 2, Math.floor(seg)), f = seg - i;
    const c = BURD[i].map((v, k) => Math.round(v + (BURD[i + 1][k] - v) * f));
    return `rgb(${c[0]},${c[1]},${c[2]})`;
  };
  const rankColor = (r: number) => burd(n > 1 ? (r - 1) / (n - 1) : 0);
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
            const cur = !!event && (
              (event.proposer.side === 'A' && event.proposer.id === i && event.receiver.id === j) ||
              (event.proposer.side === 'B' && event.proposer.id === j && event.receiver.id === i));
            const rej = cur && event!.outcome === 'reject';
            // the pair that was just broken by a bump (the "stole away" event)
            const stolen = !!event && event.outcome === 'bump' && event.displaced !== undefined && (
              (event.proposer.side === 'A' && i === event.displaced && j === event.receiver.id) ||
              (event.proposer.side === 'B' && j === event.displaced && i === event.receiver.id));
            const cls = `sm2-mcell${matched ? ' matched' : ''}${cur ? (rej ? ' reject' : ' active') : ''}${stolen ? ' stolen' : ''}${blocking.has(`${i}-${j}`) ? ' blocking' : ''}`;
            const bg = view === 'b' ? rankColor(bR) : view === 'diff' ? diffColor(d) : rankColor(aR);
            const age = trail.get(`${i}-${j}`);
            return (
              <div key={j} className={cls} style={{ height: size, background: bg }}
                title={`A${i}→B${j} #${aR} · B${j}→A${i} #${bR}`}>
                {view === 'both' && <span className="sm2-disc" style={{ background: rankColor(bR) }} />}
                {age !== undefined && !cur && !stolen && <span className="sm2-trail" style={{ opacity: Math.max(0.12, 1 - age / TRAIL) }} />}
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

type Cell = { x: number; y: number; v: number };
function Heatmap({ data, res, maxV, hue, title, caption }: {
  data: Cell[] | null; res: number; maxV: number; hue: number; title: string; caption: string;
}) {
  const [hover, setHover] = useState<Cell | null>(null);
  if (!data || !data.length) return <div className="sm2-heatmap-empty"><FlaskConical size={28} /><p>Run the Lab to see the surface</p></div>;
  const cs = 100 / res;
  const color = (v: number) => `hsl(${hue}, 70%, ${92 - Math.max(0, Math.min(1, v / (maxV || 1))) * 57}%)`;
  return (
    <div className="sm2-heatmap">
      <h4>{title}</h4>
      <div className="sm2-heatmap-grid" onMouseLeave={() => setHover(null)}>
        {data.map((c, i) => (
          <div key={i} className="sm2-cell" style={{ left: `${c.x * 100}%`, bottom: `${c.y * 100}%`, width: `${cs}%`, height: `${cs}%`, background: color(c.v) }} onMouseEnter={() => setHover(c)} />
        ))}
        {hover && <div className="sm2-tip">consensus A {(hover.x * 100).toFixed(0)}% · B {(hover.y * 100).toFixed(0)}%<br />{caption}: <strong>{hover.v.toFixed(2)}</strong></div>}
      </div>
      <div className="sm2-heatmap-x">consensus A →</div>
      <div className="sm2-heatmap-legend"><span>0</span><span className="bar" style={{ background: `linear-gradient(90deg, hsl(${hue},70%,92%), hsl(${hue},70%,35%))` }} /><span>{maxV.toFixed(1)}</span></div>
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
  const [proposer, setProposer] = usePersistentState<'A' | 'B' | 'market'>(`${NS}:proposer`, 'A');
  const [bias, setBias] = usePersistentState(`${NS}:bias`, 50);
  const [speed, setSpeed] = usePersistentState(`${NS}:speed`, 50);
  const [order, setOrder] = usePersistentState<'matchdiag' | 'settle' | 'attract' | 'index'>(`${NS}:order`, 'matchdiag');
  const [showLabels, setShowLabels] = usePersistentState(`${NS}:labels`, true);
  const [cellView, setCellView] = usePersistentState<'both' | 'a' | 'b' | 'diff'>(`${NS}:cellView`, 'both');
  const [tight, setTight] = usePersistentState(`${NS}:tight`, true);
  const [liveSort, setLiveSort] = usePersistentState(`${NS}:liveSort`, false);

  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<number | null>(null);
  const matrixWrap = useRef<HTMLDivElement>(null);
  const [cellSize, setCellSize] = useState(40);

  const inst = useMemo(() => generateInstance({ n, consensusA: consensusA / 100, consensusB: consensusB / 100, seed }), [n, consensusA, consensusB, seed]);
  const mode: Mode = useMemo(() => (proposer === 'market' ? { kind: 'market', bias, seed } : { kind: 'one-sided', proposer }), [proposer, bias, seed]);
  const result = useMemo(() => run(inst, mode), [inst, mode]);
  const total = result.log.length;
  useEffect(() => { setStep(0); setPlaying(false); }, [result]);

  const matching = useMemo(() => applyLog(n, result.log, step), [n, result, step]);
  const event = step > 0 ? result.log[step - 1] : null;
  const done = step >= total;

  // short-lived trail of recently failed entries (rejected proposals + bumped pairs),
  // keyed by matrix cell → age (0 = most recent), so they fade out over the next steps.
  const trail = useMemo(() => {
    const m = new Map<string, number>();
    for (let k = step - 1; k >= Math.max(0, step - TRAIL); k--) {
      const e = result.log[k]; if (!e) continue;
      let cell: [number, number] | null = null;
      if (e.outcome === 'reject') cell = e.proposer.side === 'A' ? [e.proposer.id, e.receiver.id] : [e.receiver.id, e.proposer.id];
      else if (e.outcome === 'bump' && e.displaced !== undefined) cell = e.proposer.side === 'A' ? [e.displaced, e.receiver.id] : [e.receiver.id, e.displaced];
      if (cell) { const key = `${cell[0]}-${cell[1]}`; if (!m.has(key)) m.set(key, (step - 1) - k); }
    }
    return m;
  }, [result, step]);

  // total-rank accounting (welfare): lower = better
  const acct = useMemo(() => {
    let aTot = 0, bTot = 0, aM = 0, bM = 0;
    const hist: number[] = new Array(n).fill(0);
    for (let i = 0; i < n; i++) if (matching.a[i] !== -1) { const r = inst.rankA[i][matching.a[i]] + 1; aTot += r; aM++; hist[r - 1]++; }
    for (let j = 0; j < n; j++) if (matching.b[j] !== -1) { const r = inst.rankB[j][matching.b[j]] + 1; bTot += r; bM++; hist[r - 1]++; }
    const matchedPeople = aM + bM;
    return { aTot, bTot, combined: aTot + bTot, aM, bM, avg: matchedPeople ? (aTot + bTot) / matchedPeople : 0, free: n - aM, hist };
  }, [inst, matching, n]);

  const blocking = useMemo(() => {
    const s = new Set<string>();
    if (!done) return s;
    for (let i = 0; i < n; i++) {
      const pr = matching.a[i] === -1 ? Infinity : inst.rankA[i][matching.a[i]];
      for (let j = 0; j < n; j++) {
        if (matching.a[i] === j) continue;
        if (inst.rankA[i][j] < pr) { const pj = matching.b[j] === -1 ? Infinity : inst.rankB[j][matching.b[j]]; if (inst.rankB[j][i] < pj) s.add(`${i}-${j}`); }
      }
    }
    return s;
  }, [done, matching, inst, n]);

  // average attractiveness = mean rank a member receives in the OTHER side's lists
  // (lower = more wanted). A principled ordering derived from the preferences
  // themselves; at high consensus it coincides with the shared desirability order.
  const attract = useMemo(() => {
    const a = new Array(n).fill(0), b = new Array(n).fill(0);
    for (let i = 0; i < n; i++) { let s = 0; for (let j = 0; j < n; j++) s += inst.rankB[j][i]; a[i] = s / n; }
    for (let j = 0; j < n; j++) { let s = 0; for (let i = 0; i < n; i++) s += inst.rankA[i][j]; b[j] = s / n; }
    return { a, b };
  }, [inst, n]);
  const finalMatching = useMemo(() => applyLog(n, result.log, total), [n, result, total]);
  // settle round = the last proposal that touched each member's final pairing
  const settle = useMemo(() => {
    const lastA = new Array(n).fill(-1), lastB = new Array(n).fill(-1);
    result.log.forEach((e, k) => {
      if (e.outcome === 'reject') return;
      (e.proposer.side === 'A' ? lastA : lastB)[e.proposer.id] = k;
      (e.receiver.side === 'A' ? lastA : lastB)[e.receiver.id] = k;
      if (e.outcome === 'bump' && e.displaced !== undefined) (e.proposer.side === 'A' ? lastA : lastB)[e.displaced] = k;
    });
    const A = new Array(n), B = new Array(n);
    for (let i = 0; i < n; i++) A[i] = finalMatching.a[i] === -1 ? Infinity : (lastA[i] >= 0 ? lastA[i] : Infinity);
    for (let j = 0; j < n; j++) B[j] = finalMatching.b[j] === -1 ? Infinity : (lastB[j] >= 0 ? lastB[j] : Infinity);
    return { A, B };
  }, [result, n, finalMatching]);

  // ordering basis: the FINAL matching (static layout) or, with live re-sort on,
  // the matching/settle as it stands at the current step (the diagonal builds itself).
  const orderBasis = useMemo(() => {
    if (!liveSort) return { match: finalMatching, settle };
    const lastA = new Array(n).fill(-1), lastB = new Array(n).fill(-1);
    for (let k = 0; k < step; k++) {
      const e = result.log[k]; if (!e || e.outcome === 'reject') continue;
      (e.proposer.side === 'A' ? lastA : lastB)[e.proposer.id] = k;
      (e.receiver.side === 'A' ? lastA : lastB)[e.receiver.id] = k;
      if (e.outcome === 'bump' && e.displaced !== undefined) (e.proposer.side === 'A' ? lastA : lastB)[e.displaced] = k;
    }
    const A = new Array(n), B = new Array(n);
    for (let i = 0; i < n; i++) A[i] = matching.a[i] === -1 ? Infinity : (lastA[i] >= 0 ? lastA[i] : Infinity);
    for (let j = 0; j < n; j++) B[j] = matching.b[j] === -1 ? Infinity : (lastB[j] >= 0 ? lastB[j] : Infinity);
    return { match: matching, settle: { A, B } };
  }, [liveSort, finalMatching, settle, step, matching, result, n]);

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
    const out: number[] = []; const used = new Set<number>();
    for (const i of rows) { const p = orderBasis.match.a[i]; if (p !== -1 && !used.has(p)) { out.push(p); used.add(p); } }
    for (let j = 0; j < n; j++) if (!used.has(j)) out.push(j);
    return out;
  }, [n, order, attract, orderBasis, rows]);

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
      setCellSize(Math.max(12, Math.min(80, Math.floor(Math.min(byW, byH)))));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, [n, view, showLabels]);

  const reset = useCallback(() => { setPlaying(false); setStep(0); }, []);
  const shuffle = useCallback(() => setSeed(s => (s * 1103515245 + 12345) & 0x7fffffff), [setSeed]);

  const narrate = (): string => {
    if (!event) return total ? 'Press Play or Step to run deferred acceptance.' : 'No proposals needed.';
    const { proposer: p, receiver: r, outcome, displaced } = event;
    const pr = (p.side === 'A' ? inst.rankA[p.id][r.id] : inst.rankB[p.id][r.id]) + 1;
    const P = `${p.side}${p.id}`, R = `${r.side}${r.id}`;
    if (outcome === 'accept') return `${P} proposes to ${R} (its #${pr}) — ${R} is free and holds ${P}.`;
    if (outcome === 'reject') return `${P} proposes to ${R} (its #${pr}) — ${R} prefers who it already holds and rejects ${P}.`;
    return `${P} proposes to ${R} (its #${pr}) — ${R} prefers ${P}, holds ${P}, and releases ${p.side}${displaced} (now free).`;
  };

  /* ── Lab (welfare surfaces, replicated) ── */
  const [labN, setLabN] = usePersistentState(`${NS}:labN`, 30);
  const [labRes, setLabRes] = usePersistentState(`${NS}:labRes`, 12);
  const [labTrials, setLabTrials] = usePersistentState(`${NS}:labTrials`, 12);
  const [labMetric, setLabMetric] = usePersistentState<'total' | 'aAvg' | 'bAvg'>(`${NS}:labMetric`, 'total');
  const [labData, setLabData] = useState<Cell[] | null>(null);
  const [labMax, setLabMax] = useState(1);
  const [labRunning, setLabRunning] = useState(false);
  const [labProgress, setLabProgress] = useState(0);
  const labCancel = useRef(false);

  const runLab = useCallback(() => {
    labCancel.current = false; setLabRunning(true); setLabProgress(0); setLabData([]);
    const res = Math.max(2, Math.min(24, labRes)); const cells = res * res; const out: Cell[] = []; let max = 0, k = 0;
    const metricOf = (cA: number, cB: number, s: number) => {
      let sum = 0;
      for (let t = 0; t < labTrials; t++) {
        const ins = generateInstance({ n: labN, consensusA: cA, consensusB: cB, seed: s + t * 7919 + 1 });
        const st = stats(ins, oneSided(ins, 'A').matching);
        sum += labMetric === 'aAvg' ? st.aAvg : labMetric === 'bAvg' ? st.bAvg : (st.aAvg + st.bAvg) / 2;
      }
      return sum / labTrials;
    };
    const batch = () => {
      if (labCancel.current) { setLabRunning(false); return; }
      const end = Math.min(cells, k + 20);
      for (; k < end; k++) { const xi = k % res, yi = Math.floor(k / res); const v = metricOf(xi / (res - 1), yi / (res - 1), 1000 + k); max = Math.max(max, v); out.push({ x: xi / (res - 1) * (1 - 1 / res), y: yi / (res - 1) * (1 - 1 / res), v }); }
      setLabProgress(Math.round((k / cells) * 100)); setLabData([...out]); setLabMax(max);
      if (k < cells) window.setTimeout(batch, 0); else setLabRunning(false);
    };
    batch();
  }, [labN, labRes, labTrials, labMetric]);
  useEffect(() => () => { labCancel.current = true; }, []);
  const labTitle = labMetric === 'total' ? 'Combined avg rank (welfare)' : labMetric === 'aAvg' ? 'A avg rank' : 'B avg rank';

  const settings = (
    <ShellSettings>
      <Section title="Domain" icon="◷" defaultOpen>
        <NumberInput label="Population (per side)" value={n} onChange={setN} min={3} max={60} integer />
        <Slider label="Consensus A" value={consensusA} min={0} max={100} step={1} onChange={setConsensusA} format={v => `${v}%`} />
        <Slider label="Consensus B" value={consensusB} min={0} max={100} step={1} onChange={setConsensusB} format={v => `${v}%`} />
        <NumberInput label="Seed" value={seed} onChange={setSeed} min={1} integer />
      </Section>
      <Section title="Algorithm" icon="↻" defaultOpen>
        <Pills label="Proposers" value={proposer} onChange={setProposer} options={[{ value: 'A', label: 'A proposes' }, { value: 'B', label: 'B proposes' }, { value: 'market', label: 'Market' }]} />
        {proposer === 'market' && <Slider label="Bias toward A" value={bias} min={0} max={100} step={1} onChange={setBias} format={v => `${v}%`} />}
      </Section>
      <Section title="Display" icon="◧">
        <Pills label="Cell shows" value={cellView} onChange={setCellView} options={[{ value: 'both', label: 'Both (Lego)' }, { value: 'a', label: 'A→B' }, { value: 'b', label: 'B→A' }, { value: 'diff', label: 'Difference' }]} />
        <Pills label="Order" value={order} onChange={setOrder} options={[{ value: 'matchdiag', label: 'Match diagonal' }, { value: 'settle', label: 'Settle round' }, { value: 'attract', label: 'Attractiveness' }, { value: 'index', label: 'Original' }]} />
        <Checkbox label="Show index labels" checked={showLabels} onChange={setShowLabels} />
        <Checkbox label="Tight grid (no gaps)" checked={tight} onChange={setTight} />
      </Section>
    </ShellSettings>
  );

  const actions = (
    <ShellActions>
      {view === 'visualizer' ? (
        <div className="sm2-actions">
          <button className="sm2-btn primary" onClick={() => setPlaying(p => !p)} disabled={done && !playing}>{playing ? <Pause size={16} /> : <Play size={16} />}{playing ? 'Pause' : 'Play'}</button>
          <button className="sm2-btn" onClick={() => setStep(s => Math.min(total, s + 1))} disabled={playing || done}><SkipForward size={16} />Step</button>
          <button className="sm2-btn" onClick={() => setStep(total)} disabled={done}><FastForward size={16} />Finish</button>
          <button className="sm2-btn" onClick={reset}><RotateCcw size={16} />Reset</button>
          <button className="sm2-btn" onClick={shuffle}><Shuffle size={16} />Shuffle</button>
          <Slider label="Speed" value={speed} min={0} max={100} step={1} onChange={setSpeed} />
          <Checkbox label="Live re-sort (build the diagonal as it runs)" checked={liveSort} onChange={setLiveSort} />
        </div>
      ) : (
        <div className="sm2-actions">
          <Pills label="Surface" value={labMetric} onChange={setLabMetric} options={[{ value: 'total', label: 'Welfare' }, { value: 'aAvg', label: 'A rank' }, { value: 'bAvg', label: 'B rank' }]} />
          <NumberInput label="Population" value={labN} onChange={setLabN} min={6} max={80} integer />
          <NumberInput label="Resolution" value={labRes} onChange={setLabRes} min={4} max={24} integer />
          <NumberInput label="Trials / cell" value={labTrials} onChange={setLabTrials} min={1} max={60} integer />
          <button className="sm2-btn primary" onClick={runLab} disabled={labRunning}><FlaskConical size={16} />{labRunning ? `Running ${labProgress}%` : 'Run Lab'}</button>
        </div>
      )}
    </ShellActions>
  );

  const maxHist = Math.max(1, ...acct.hist);

  const story = (() => {
    const cons = (consensusA === 0 && consensusB === 0) ? 'preferences are independent — everyone wants different partners'
      : (consensusA >= 80 && consensusB >= 80) ? 'both sides nearly share one ranking — everyone chases the same few'
      : `consensus A ${consensusA}% · B ${consensusB}% blends a shared ranking with private taste`;
    const mech = proposer === 'market'
      ? `each round a coin (${bias}% toward A) picks who proposes; that proposer asks its top remaining choice, and each receiver keeps its best offer so far and rejects the rest`
      : `each free ${proposer} proposes to its first not-yet-asked choice, and each ${proposer === 'A' ? 'B' : 'A'} keeps the best proposer it has seen, rejecting the rest`;
    const tail = done ? `Settled in ${total} proposals — total rank ${acct.combined} (avg #${acct.avg.toFixed(2)}).`
      : total ? `${step} of ${total} proposals so far.` : 'Already stable.';
    return `${n} A's and ${n} B's; ${cons}. With ${proposer === 'market' ? 'a two-sided market' : `${proposer} proposing`}, ${mech}. ${tail}`;
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
        {view === 'visualizer' && <div className="sm2-progress">Proposal {step} / {total}{done ? ' · complete' : ''}</div>}
      </header>

      {view === 'visualizer' ? (
        <div className="sm2-visualizer">
          <p className="sm2-story">{story}</p>
          <div className="sm2-narrate">{narrate()}</div>
          <div className="sm2-metrics">
            <div className="sm2-metric big">
              <span className="sm2-metric-label"><Activity size={14} /> Total rank (lower = happier)</span>
              <strong>{acct.combined}</strong>
              <span className="sm2-metric-sub">A {acct.aTot} + B {acct.bTot} · avg #{acct.avg.toFixed(2)} · {acct.free ? `${acct.free} still free` : 'all matched'}</span>
            </div>
            <div className="sm2-metric">
              <span className="sm2-metric-label">rank distribution</span>
              <div className="sm2-dist">{acct.hist.map((c, i) => <span key={i} className="b" style={{ height: `${(c / maxHist) * 100}%` }} title={`#${i + 1}: ${c}`} />)}</div>
              <span className="sm2-metric-sub">how many got their #1, #2, … choice</span>
            </div>
            <div className={`sm2-metric stability ${!done ? '' : blocking.size === 0 ? 'ok' : 'bad'}`}>
              <span className="sm2-metric-label">{blocking.size === 0 ? <ShieldCheck size={14} /> : <AlertTriangle size={14} />} Stability</span>
              <strong>{!done ? '—' : blocking.size === 0 ? 'Stable' : `${blocking.size} blocking`}</strong>
              <span className="sm2-metric-sub">{!done ? 'finish the run to check' : blocking.size === 0 ? 'no pair would defect' : 'red cells would defect'}</span>
            </div>
          </div>
          <div className="sm2-matrix-wrap" ref={matrixWrap}>
            <Matrix inst={inst} matching={matching} rows={rows} cols={cols} event={event} blocking={blocking} size={cellSize} labels={showLabels} view={cellView} gap={tight ? 0 : 3} trail={trail} />
            {legend}
          </div>
        </div>
      ) : (
        <div className="sm2-lab">
          <Heatmap data={labData} res={Math.max(2, Math.min(24, labRes))} maxV={labMax} hue={labMetric === 'total' ? 160 : labMetric === 'aAvg' ? 210 : 330} title={labTitle} caption="rank" />
          <p className="sm2-lab-note">Each cell averages <strong>{labTrials}</strong> independent instances (A proposing) — signal, not single-draw noise. Total-rank welfare is lowest (best) when consensus is low (people want different partners); as both groups converge on one common preference, everyone chases the same few and average rank climbs.</p>
        </div>
      )}
    </div>
  );
}
