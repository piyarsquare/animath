import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity, AlertTriangle, FastForward, FlaskConical, Layers, Pause, Play,
  RotateCcw, Shuffle, SkipForward, ShieldCheck, Scale,
} from 'lucide-react';
import './stableMatching.css';
import { ShellSettings, ShellActions, useAppHeader, useAppExplainer } from '../../components/AppShell';
import { Section, Slider, Pills, NumberInput, Checkbox } from '../../components/ControlPanel';
import { usePersistentState } from '../../lib/usePersistentState';
import explainerText from './EXPLAINER.md?raw';
import { generateInstance } from './model';
import {
  run, applyLog, stats, blockingPairs, extremal, oneSided,
  type Mode, type Side, type Matching,
} from './galeShapley';

const NS = 'stable-matching';

/* ── Visualizer: a single person box ───────────────────────────────────────── */
function Person({
  side, id, quality, partnerRank, n, role,
}: {
  side: Side; id: number; quality: number; partnerRank: number | null; n: number;
  role: 'proposer' | 'receiver' | 'reject' | 'bumped' | null;
}) {
  let rankClass = '';
  if (partnerRank != null) rankClass = partnerRank === 1 ? 'best' : partnerRank <= n / 2 ? 'mid' : 'low';
  return (
    <div className={`sm2-person side-${side}${partnerRank != null ? ' matched' : ''}${role ? ' role-' + role : ''}`}>
      <span className="sm2-idx">{side}{id}</span>
      <span className="sm2-quality" title={`desirability ${(quality * 100).toFixed(0)}%`}>
        <span className="sm2-quality-fill" style={{ width: `${quality * 100}%` }} />
      </span>
      {partnerRank != null && n <= 30 && <span className={`sm2-rank ${rankClass}`}>#{partnerRank}</span>}
    </div>
  );
}

function Column({
  side, label, inst, matching, order, event,
}: {
  side: Side; label: string; inst: ReturnType<typeof generateInstance>;
  matching: Matching; order: number[];
  event: ReturnType<typeof run>['log'][number] | null;
}) {
  const match = side === 'A' ? matching.a : matching.b;
  const rank = side === 'A' ? inst.rankA : inst.rankB;
  const quality = side === 'A' ? inst.qualityA : inst.qualityB;
  return (
    <div className="sm2-col">
      <h4>{label}</h4>
      <div className="sm2-col-list">
        {order.map(id => {
          let role: 'proposer' | 'receiver' | 'reject' | 'bumped' | null = null;
          if (event) {
            const isProp = event.proposer.side === side && event.proposer.id === id;
            const isRecv = event.receiver.side === side && event.receiver.id === id;
            if (isProp) role = event.outcome === 'reject' ? 'reject' : 'proposer';
            else if (isRecv) role = 'receiver';
            else if (event.outcome === 'bump' && event.proposer.side === side && event.displaced === id) role = 'bumped';
          }
          const partner = match[id];
          return (
            <Person key={id} side={side} id={id} quality={quality[id]} n={inst.n}
              partnerRank={partner === -1 ? null : rank[id][partner] + 1} role={role} />
          );
        })}
      </div>
    </div>
  );
}

/* ── Lab heatmap ───────────────────────────────────────────────────────────── */
type Cell = { x: number; y: number; v: number };

function Heatmap({ data, res, maxV, hue, title, caption }: {
  data: Cell[] | null; res: number; maxV: number; hue: number; title: string; caption: string;
}) {
  const [hover, setHover] = useState<Cell | null>(null);
  if (!data || !data.length) {
    return <div className="sm2-heatmap-empty"><FlaskConical size={28} /><p>Run the Lab to see the surface</p></div>;
  }
  const cs = 100 / res;
  const color = (v: number) => {
    const t = Math.max(0, Math.min(1, v / (maxV || 1)));
    return `hsl(${hue}, 70%, ${92 - t * 57}%)`; // single-hue sequential (CVD-safe)
  };
  return (
    <div className="sm2-heatmap">
      <h4>{title}</h4>
      <div className="sm2-heatmap-grid" onMouseLeave={() => setHover(null)}>
        {data.map((c, i) => (
          <div key={i} className="sm2-cell"
            style={{ left: `${c.x * 100}%`, bottom: `${c.y * 100}%`, width: `${cs}%`, height: `${cs}%`, background: color(c.v) }}
            onMouseEnter={() => setHover(c)} />
        ))}
        {hover && (
          <div className="sm2-tip">
            consensus A {(hover.x * 100).toFixed(0)}% · B {(hover.y * 100).toFixed(0)}%<br />{caption}: <strong>{hover.v.toFixed(2)}</strong>
          </div>
        )}
      </div>
      <div className="sm2-heatmap-x">consensus A →</div>
      <div className="sm2-heatmap-legend"><span>0</span><span className="bar" style={{ background: `linear-gradient(90deg, hsl(${hue},70%,92%), hsl(${hue},70%,35%))` }} /><span>{maxV.toFixed(1)}</span></div>
    </div>
  );
}

/* ── App ───────────────────────────────────────────────────────────────────── */
export default function StableMatching() {
  useAppHeader('Stable Matching');
  useAppExplainer(explainerText);

  const [view, setView] = usePersistentState<'visualizer' | 'lab'>(`${NS}:view`, 'visualizer');

  // domain + algorithm
  const [n, setN] = usePersistentState(`${NS}:n`, 12);
  const [seed, setSeed] = usePersistentState(`${NS}:seed`, 1);
  const [consensusA, setConsensusA] = usePersistentState(`${NS}:cA`, 0);
  const [consensusB, setConsensusB] = usePersistentState(`${NS}:cB`, 0);
  const [proposer, setProposer] = usePersistentState<'A' | 'B' | 'market'>(`${NS}:proposer`, 'A');
  const [bias, setBias] = usePersistentState(`${NS}:bias`, 50);
  const [speed, setSpeed] = usePersistentState(`${NS}:speed`, 50);
  const [sortByQuality, setSortByQuality] = usePersistentState(`${NS}:sortQ`, true);

  // playback
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<number | null>(null);

  const inst = useMemo(
    () => generateInstance({ n, consensusA: consensusA / 100, consensusB: consensusB / 100, seed }),
    [n, consensusA, consensusB, seed],
  );
  const mode: Mode = useMemo(
    () => (proposer === 'market' ? { kind: 'market', bias, seed } : { kind: 'one-sided', proposer }),
    [proposer, bias, seed],
  );
  const result = useMemo(() => run(inst, mode), [inst, mode]);
  const ex = useMemo(() => extremal(inst), [inst]);
  const total = result.log.length;

  // a fresh run resets playback
  useEffect(() => { setStep(0); setPlaying(false); }, [result]);

  const matching = useMemo(() => applyLog(n, result.log, step), [n, result, step]);
  const st = useMemo(() => stats(inst, matching), [inst, matching]);
  const event = step > 0 ? result.log[step - 1] : null;
  const done = step >= total;
  const blocking = done ? blockingPairs(inst, matching) : null;

  const orderA = useMemo(() => {
    const ids = Array.from({ length: n }, (_, i) => i);
    return sortByQuality ? ids.sort((a, b) => inst.qualityA[b] - inst.qualityA[a]) : ids;
  }, [n, sortByQuality, inst]);
  const orderB = useMemo(() => {
    const ids = Array.from({ length: n }, (_, i) => i);
    return sortByQuality ? ids.sort((a, b) => inst.qualityB[b] - inst.qualityB[a]) : ids;
  }, [n, sortByQuality, inst]);

  useEffect(() => {
    if (!playing) { if (timer.current) { clearInterval(timer.current); timer.current = null; } return; }
    const ms = Math.max(40, 520 - speed * 4.6);
    timer.current = window.setInterval(() => {
      setStep(s => { if (s >= total) { setPlaying(false); return s; } return s + 1; });
    }, ms);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [playing, speed, total]);

  const reset = useCallback(() => { setPlaying(false); setStep(0); }, []);
  const shuffle = useCallback(() => setSeed(s => (s * 1103515245 + 12345) & 0x7fffffff), [setSeed]);

  /* ── Lab ── */
  const [labN, setLabN] = usePersistentState(`${NS}:labN`, 30);
  const [labRes, setLabRes] = usePersistentState(`${NS}:labRes`, 12);
  const [labTrials, setLabTrials] = usePersistentState(`${NS}:labTrials`, 12);
  const [labMetric, setLabMetric] = usePersistentState<'aGap' | 'aAvg' | 'bAvg'>(`${NS}:labMetric`, 'aGap');
  const [labData, setLabData] = useState<Cell[] | null>(null);
  const [labMax, setLabMax] = useState(1);
  const [labRunning, setLabRunning] = useState(false);
  const [labProgress, setLabProgress] = useState(0);
  const labCancel = useRef(false);

  const runLab = useCallback(() => {
    labCancel.current = false;
    setLabRunning(true); setLabProgress(0); setLabData([]);
    const res = Math.max(2, Math.min(24, labRes));
    const total2 = res * res;
    const out: Cell[] = [];
    let max = 0, done2 = 0;
    const metricOf = (cA: number, cB: number, s: number): number => {
      let sum = 0;
      for (let t = 0; t < labTrials; t++) {
        const ins = generateInstance({ n: labN, consensusA: cA, consensusB: cB, seed: s + t * 7919 + 1 });
        if (labMetric === 'aGap') sum += extremal(ins).aGap;
        else { const m = oneSided(ins, 'A').matching; const st2 = stats(ins, m); sum += labMetric === 'aAvg' ? st2.aAvg : st2.bAvg; }
      }
      return sum / labTrials;
    };
    const batch = () => {
      if (labCancel.current) { setLabRunning(false); return; }
      const end = Math.min(total2, done2 + 20);
      for (; done2 < end; done2++) {
        const xi = done2 % res, yi = Math.floor(done2 / res);
        const v = metricOf(xi / (res - 1), yi / (res - 1), 1000 + done2);
        max = Math.max(max, v);
        out.push({ x: xi / (res - 1) * (1 - 1 / res), y: yi / (res - 1) * (1 - 1 / res), v });
      }
      setLabProgress(Math.round((done2 / total2) * 100));
      setLabData([...out]); setLabMax(max);
      if (done2 < total2) window.setTimeout(batch, 0); else setLabRunning(false);
    };
    batch();
  }, [labN, labRes, labTrials, labMetric]);

  useEffect(() => () => { labCancel.current = true; }, []);

  const labTitle = labMetric === 'aGap' ? 'Proposer advantage (A gap)' : labMetric === 'aAvg' ? 'A avg rank (A proposes)' : 'B avg rank (A proposes)';
  const labHue = labMetric === 'aGap' ? 270 : labMetric === 'aAvg' ? 210 : 330;

  /* ── Controls (framework-native) ── */
  const settings = (
    <ShellSettings>
      <Section title="Domain" icon="◷" defaultOpen>
        <NumberInput label="Population" value={n} onChange={setN} min={4} max={60} integer />
        <Slider label="Consensus A" value={consensusA} min={0} max={100} step={1} onChange={setConsensusA} format={v => `${v}%`} />
        <Slider label="Consensus B" value={consensusB} min={0} max={100} step={1} onChange={setConsensusB} format={v => `${v}%`} />
        <NumberInput label="Seed" value={seed} onChange={setSeed} min={1} integer />
      </Section>
      <Section title="Algorithm" icon="↻" defaultOpen>
        <Pills label="Proposers" value={proposer} onChange={setProposer}
          options={[{ value: 'A', label: 'A proposes' }, { value: 'B', label: 'B proposes' }, { value: 'market', label: 'Market' }]} />
        {proposer === 'market' && (
          <Slider label="Bias toward A" value={bias} min={0} max={100} step={1} onChange={setBias} format={v => `${v}%`} />
        )}
      </Section>
      <Section title="Display" icon="◐">
        <Checkbox label="Sort by desirability (the common preference)" checked={sortByQuality} onChange={setSortByQuality} />
      </Section>
    </ShellSettings>
  );

  const actions = (
    <ShellActions>
      {view === 'visualizer' ? (
        <div className="sm2-actions">
          <button className="sm2-btn primary" onClick={() => setPlaying(p => !p)} disabled={done && !playing}>
            {playing ? <Pause size={16} /> : <Play size={16} />}{playing ? 'Pause' : 'Play'}
          </button>
          <button className="sm2-btn" onClick={() => setStep(s => Math.min(total, s + 1))} disabled={playing || done}><SkipForward size={16} />Step</button>
          <button className="sm2-btn" onClick={() => setStep(total)} disabled={done}><FastForward size={16} />Finish</button>
          <button className="sm2-btn" onClick={reset}><RotateCcw size={16} />Reset</button>
          <button className="sm2-btn" onClick={shuffle}><Shuffle size={16} />Shuffle</button>
          <Slider label="Speed" value={speed} min={0} max={100} step={1} onChange={setSpeed} />
        </div>
      ) : (
        <div className="sm2-actions">
          <Pills label="Surface" value={labMetric} onChange={setLabMetric}
            options={[{ value: 'aGap', label: 'A advantage' }, { value: 'aAvg', label: 'A rank' }, { value: 'bAvg', label: 'B rank' }]} />
          <NumberInput label="Population" value={labN} onChange={setLabN} min={6} max={80} integer />
          <NumberInput label="Resolution" value={labRes} onChange={setLabRes} min={4} max={24} integer />
          <NumberInput label="Trials / cell" value={labTrials} onChange={setLabTrials} min={1} max={60} integer />
          <button className="sm2-btn primary" onClick={runLab} disabled={labRunning}>
            <FlaskConical size={16} />{labRunning ? `Running ${labProgress}%` : 'Run Lab'}
          </button>
        </div>
      )}
    </ShellActions>
  );

  /* ── Render ── */
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
          <div className="sm2-metrics">
            <div className="sm2-metric big">
              <span className="sm2-metric-label"><Scale size={14} /> Proposer advantage</span>
              <strong>A {ex.aGap.toFixed(2)} · B {ex.bGap.toFixed(2)}</strong>
              <span className="sm2-metric-sub">gap between best &amp; worst stable matching — <em>0 = proposing doesn't matter</em> (raise both consensus sliders to watch it collapse)</span>
            </div>
            <div className="sm2-metric">
              <span className="sm2-metric-label"><Activity size={14} /> Avg rank</span>
              <strong>A {st.aAvg.toFixed(2)} · B {st.bAvg.toFixed(2)}</strong>
              <span className="sm2-metric-sub">{st.unmatched > 0 ? `${st.unmatched} unmatched` : 'everyone matched'}</span>
            </div>
            <div className={`sm2-metric stability ${blocking == null ? '' : blocking === 0 ? 'ok' : 'bad'}`}>
              <span className="sm2-metric-label">{blocking === 0 ? <ShieldCheck size={14} /> : <AlertTriangle size={14} />} Stability</span>
              <strong>{blocking == null ? '—' : blocking === 0 ? 'Stable' : `${blocking} blocking`}</strong>
              <span className="sm2-metric-sub">{blocking == null ? 'finish the run to check' : blocking === 0 ? 'no blocking pairs' : 'pairs who would defect'}</span>
            </div>
          </div>
          <div className="sm2-people">
            <Column side="A" label="Group A" inst={inst} matching={matching} order={orderA} event={event} />
            <Column side="B" label="Group B" inst={inst} matching={matching} order={orderB} event={event} />
          </div>
        </div>
      ) : (
        <div className="sm2-lab">
          <Heatmap data={labData} res={Math.max(2, Math.min(24, labRes))} maxV={labMax} hue={labHue}
            title={labTitle} caption={labMetric === 'aGap' ? 'gap' : 'rank'} />
          <p className="sm2-lab-note">
            Each cell averages <strong>{labTrials}</strong> independent random instances (no single-draw noise).
            On the <em>A advantage</em> surface, the gap fades to zero toward the top-right corner — when both
            groups fully share a common preference, the stable matching is unique and proposing confers no edge.
          </p>
        </div>
      )}
    </div>
  );
}
