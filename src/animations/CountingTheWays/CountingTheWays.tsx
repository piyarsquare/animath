import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Play, Pause, SkipForward, RotateCcw, FlaskConical, Shuffle } from 'lucide-react';
import './countingTheWays.css';
import Workspace from '../../chrome/workspace/Workspace';
import type { ActionDef, LayoutDef, SectionDef, ViewDef, WorkspaceMode } from '../../chrome/workspace/types';
import { Slider, Pills, Checkbox, NumberInput } from '../../components/ControlPanel';
import { Kicker, StatGrid } from '../../chrome/readouts';
import { usePersistentState } from '../../lib/usePersistentState';
import explainerText from './EXPLAINER.md?raw';
import readmeText from './README.md?raw';
import {
  poissonRange, skellamPmf, skellamRange, besselBreakdown, besselTerm,
  diagTerm, diagCell, conditionalRungs, significantRungs,
  mulberry32, sampleSkellam, fitMoments, histogram,
} from './skellam';

const NS = 'counting-the-ways';
type Mode = 'explain' | 'sample' | 'fit';
type Framing = 'micro' | 'generic';

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Words for the two counts and their difference, per framing. */
interface Labels { x: string; y: string; xShort: string; yShort: string; diff: string; mu1: string; mu2: string; }
function labelsFor(f: Framing): Labels {
  return f === 'micro'
    ? { x: 'repeats gained', y: 'repeats lost', xShort: 'gained', yShort: 'lost', diff: 'net change in length', mu1: 'μ₁ — gain rate', mu2: 'μ₂ — loss rate' }
    : { x: 'count X', y: 'count Y', xShort: 'X', yShort: 'Y', diff: 'difference K = X − Y', mu1: 'μ₁ — rate of X', mu2: 'μ₂ — rate of Y' };
}

/** Grid extent so the busy part of the (X,Y) lattice fits. */
function gridSize(mu1: number, mu2: number, k: number, cap: number): number {
  const base = Math.max(mu1, mu2);
  const ext = Math.ceil(base + 3.2 * Math.sqrt(base + 1));
  return clamp(Math.max(ext, Math.abs(k) + 2), 8, cap);
}
/** Half-width of the k-axis for the difference histograms. */
function kSpan(mu1: number, mu2: number): number {
  const sd = Math.sqrt(mu1 + mu2 + 1);
  return Math.min(36, Math.ceil(Math.abs(mu1 - mu2) + 4.5 * sd) + 1);
}

const fmt = (v: number, d = 3) => (v === 0 ? '0' : v < 1e-3 ? v.toExponential(1) : v.toFixed(d));

/* ── The (X, Y) lattice: the hero picture ─────────────────────────────────── */

interface LatticeProps {
  mu1: number; mu2: number; k: number; N: number; accN: number;
  showMarginals: boolean; lab: Labels;
  onPickK: (k: number) => void;
}
function Lattice({ mu1, mu2, k, N, accN, showMarginals, lab, onPickK }: LatticeProps) {
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);
  const pX = useMemo(() => poissonRange(mu1, N), [mu1, N]);
  const pY = useMemo(() => poissonRange(mu2, N), [mu2, N]);
  const pXmax = Math.max(...pX, 1e-9);
  const pYmax = Math.max(...pY, 1e-9);
  const jointMax = pXmax * pYmax;

  const cs = 22;
  const marg = showMarginals ? 48 : 14;
  const axis = 16;
  const grid = (N + 1) * cs;
  const W = marg + grid + 8;
  const H = marg + grid + axis;
  const gx = (x: number) => marg + x * cs;
  const gy = (y: number) => marg + y * cs;

  const cells: React.ReactNode[] = [];
  for (let y = 0; y <= N; y++) {
    for (let x = 0; x <= N; x++) {
      const joint = pX[x] * pY[y];
      const onDiag = x - y === k;
      const n = onDiag ? x - Math.max(0, k) : -1;
      const acc = onDiag && n < accN;
      const cur = onDiag && n === accN - 1;
      const op = jointMax > 0 ? joint / jointMax : 0;
      const cls = `ctw-cell${onDiag ? ' diag' : ''}${acc ? ' acc' : ''}${cur ? ' cur' : ''}`;
      cells.push(
        <rect
          key={`${x}-${y}`}
          className={cls}
          x={gx(x)} y={gy(y)} width={cs} height={cs}
          fill="var(--accent)"
          fillOpacity={acc ? Math.max(0.22, op) : op}
          onMouseEnter={() => setHover({ x, y })}
          onMouseLeave={() => setHover(h => (h && h.x === x && h.y === y ? null : h))}
          onClick={() => onPickK(x - y)}
        />,
      );
    }
  }

  // top marginal: P(X = x) above each column; left marginal: P(Y = y) beside each row
  const marg2 = marg - 6;
  const topBars = showMarginals ? pX.map((p, x) => {
    const h = (p / pXmax) * marg2;
    return <rect key={`tx${x}`} className="ctw-marg" x={gx(x) + 2} y={marg - h} width={cs - 4} height={h} />;
  }) : null;
  const leftBars = showMarginals ? pY.map((p, y) => {
    const w = (p / pYmax) * marg2;
    return <rect key={`ly${y}`} className="ctw-marg" x={marg - w} y={gy(y) + 2} width={w} height={cs - 4} />;
  }) : null;

  const hoverInfo = hover ? { ...hover, jp: pX[hover.x] * pY[hover.y] } : null;

  return (
    <div className="ctw-lattice-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="ctw-lattice" preserveAspectRatio="xMidYMid meet">
        {showMarginals && <text className="ctw-axlbl" x={marg + grid / 2} y={H - 2} textAnchor="middle">{lab.x} →</text>}
        {showMarginals && <text className="ctw-axlbl" x={12} y={marg + grid / 2} textAnchor="middle" transform={`rotate(-90 12 ${marg + grid / 2})`}>{lab.y} →</text>}
        {topBars}
        {leftBars}
        {cells}
        {/* the active diagonal drawn as a guide line through the cell centers */}
        <line
          className="ctw-diagline"
          x1={gx(Math.max(0, k)) + cs / 2} y1={gy(Math.max(0, -k)) + cs / 2}
          x2={gx(Math.max(0, k) + N - Math.abs(k)) + cs / 2} y2={gy(Math.max(0, -k) + N - Math.abs(k)) + cs / 2}
        />
        {hoverInfo && (
          <g className="ctw-hovermark" pointerEvents="none">
            <rect x={gx(hoverInfo.x)} y={gy(hoverInfo.y)} width={cs} height={cs} />
          </g>
        )}
      </svg>
      <div className="ctw-lattice-cap">
        {hoverInfo
          ? <>cell ({hoverInfo.x} {lab.xShort}, {hoverInfo.y} {lab.yShort}) · difference {hoverInfo.x - hoverInfo.y} · P = {fmt(hoverInfo.jp, 4)} <span className="dim">— click to follow that diagonal</span></>
          : <>each cell ({lab.xShort}, {lab.yShort}) is shaded by P(X={lab.xShort})·P(Y={lab.yShort}); the highlighted diagonal holds every way to net <strong>{k >= 0 ? `+${k}` : k}</strong>. Click any cell to pick its diagonal.</>}
      </div>
    </div>
  );
}

/* ── Difference histogram (Sample + Fit modes) ────────────────────────────── */

interface HistProps {
  bins: number[]; kMin: number; total: number;
  overlays: { color: string; pmf: number[]; label: string }[];
  lab: Labels;
}
function DiffHistogram({ bins, kMin, total, overlays, lab }: HistProps) {
  const W = 640, H = 300, padL = 36, padR = 12, padT = 14, padB = 30;
  const n = bins.length;
  const maxCount = Math.max(...bins, 1);
  const maxOverlay = Math.max(1e-9, ...overlays.flatMap(o => o.pmf.map(p => p * total)));
  const maxY = Math.max(maxCount, maxOverlay);
  const bw = (W - padL - padR) / n;
  const X = (i: number) => padL + i * bw;
  const Y = (v: number) => H - padB - (v / maxY) * (H - padT - padB);
  const ticks = [];
  for (let i = 0; i < n; i++) {
    const kk = kMin + i;
    if (n <= 16 || kk % (n > 28 ? 6 : 3) === 0) ticks.push(<text key={i} className="ctw-axlbl" x={X(i) + bw / 2} y={H - 10} textAnchor="middle">{kk}</text>);
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="ctw-hist" preserveAspectRatio="xMidYMid meet">
      <line className="ctw-axis" x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} />
      {bins.map((c, i) => c > 0 && (
        <rect key={i} className="ctw-bar" x={X(i) + 1} y={Y(c)} width={Math.max(1, bw - 2)} height={H - padB - Y(c)} />
      ))}
      {overlays.map(o => (
        <polyline
          key={o.label}
          className="ctw-overlay"
          style={{ stroke: o.color }}
          points={o.pmf.map((p, i) => `${X(i) + bw / 2},${Y(p * total)}`).join(' ')}
        />
      ))}
      {ticks}
      <text className="ctw-axlbl" x={(W) / 2} y={H - 1} textAnchor="middle">{lab.diff} →</text>
    </svg>
  );
}

/* ── The factored Skellam formula, each piece color-linked ────────────────── */

function FormulaBand({ mu1, mu2, k, partialBessel, partialSum }: {
  mu1: number; mu2: number; k: number; partialBessel: number; partialSum: number;
}) {
  const bd = besselBreakdown(mu1, mu2, k);
  const ak = Math.abs(k);
  // the normalizer is tiny — show enough precision that the row reads as a true product
  const fmtNorm = (v: number) => (v >= 1e-3 ? v.toFixed(4) : v.toExponential(2));
  return (
    <div className="ctw-formula">
      <div className="ctw-eq">
        <span className="ctw-lhs">P(K={k})</span>
        <span className="ctw-op">=</span>
        <span className="ctw-chip norm">e<sup>−(μ₁+μ₂)</sup></span>
        <span className="ctw-op">·</span>
        <span className="ctw-chip ratio">(μ₁/μ₂)<sup>{k}/2</sup></span>
        <span className="ctw-op">·</span>
        <span className="ctw-chip bessel">I<sub>{ak}</sub>(2√μ₁μ₂)</span>
      </div>
      <div className="ctw-eqvals">
        <span className="ctw-val norm">{fmtNorm(bd.norm)}</span>
        <span className="ctw-op">·</span>
        <span className="ctw-val ratio">{bd.defined ? fmt(bd.ratio, 3) : '—'}</span>
        <span className="ctw-op">·</span>
        <span className="ctw-val bessel">{fmt(bd.bessel, 3)}</span>
        <span className="ctw-op">=</span>
        <span className="ctw-val total">{fmt(bd.pmf, 4)}</span>
      </div>
      <p className="ctw-formula-note">
        The scary piece <span className="ctw-chip bessel sm">I<sub>{ak}</sub></span> is just the diagonal sum with the constants pulled out.
        Walk so far: <strong>Σ joint = {fmt(partialSum, 4)}</strong> &nbsp;→&nbsp; Bessel part <strong>{fmt(partialBessel, 3)}</strong>
        {bd.defined && <> &nbsp;(of {fmt(bd.bessel, 3)})</>}.
      </p>
    </div>
  );
}

/* ── The app ──────────────────────────────────────────────────────────────── */

export default function CountingTheWays() {
  const [mode, setMode] = useState<Mode>('explain');
  const [framing, setFraming] = usePersistentState<Framing>(`${NS}:framing`, 'micro');
  const [mu1, setMu1] = usePersistentState(`${NS}:mu1`, 4);
  const [mu2, setMu2] = usePersistentState(`${NS}:mu2`, 2.5);
  const [k, setK] = usePersistentState(`${NS}:k`, 2);
  const [gridCap, setGridCap] = usePersistentState(`${NS}:gridCap`, 18);
  const [showMarginals, setShowMarginals] = usePersistentState(`${NS}:marg`, true);
  const [showConditional, setShowConditional] = usePersistentState(`${NS}:cond`, true);
  const [speed, setSpeed] = usePersistentState(`${NS}:speed`, 55);

  const lab = labelsFor(framing);
  const N = useMemo(() => gridSize(mu1, mu2, k, gridCap), [mu1, mu2, k, gridCap]);
  const kClamped = clamp(k, -N, N);

  /* ── Explain: the diagonal walk ── */
  const rungCount = useMemo(() => Math.min(significantRungs(mu1, mu2, kClamped), N - Math.abs(kClamped) + 1), [mu1, mu2, kClamped, N]);
  const [accN, setAccN] = useState(0);
  const [walking, setWalking] = useState(false);
  const walkTimer = useRef<number | null>(null);

  // a fresh instance (new μ or k) rewinds the walk
  useEffect(() => { setAccN(0); setWalking(false); }, [mu1, mu2, kClamped]);

  useEffect(() => {
    if (!walking) { if (walkTimer.current) { clearInterval(walkTimer.current); walkTimer.current = null; } return; }
    const ms = Math.max(90, 620 - speed * 5);
    walkTimer.current = window.setInterval(() => {
      setAccN(a => { if (a >= rungCount) { setWalking(false); return a; } return a + 1; });
    }, ms);
    return () => { if (walkTimer.current) clearInterval(walkTimer.current); };
  }, [walking, speed, rungCount]);

  const partialSum = useMemo(() => {
    let s = 0;
    for (let n = 0; n < accN; n++) s += diagTerm(mu1, mu2, kClamped, n);
    return s;
  }, [mu1, mu2, kClamped, accN]);
  const partialBessel = useMemo(() => {
    const z = 2 * Math.sqrt(mu1 * mu2);
    let s = 0;
    for (let n = 0; n < accN; n++) s += besselTerm(n, kClamped, z);
    return s;
  }, [mu1, mu2, kClamped, accN]);

  const fullPmf = useMemo(() => skellamPmf(mu1, mu2, kClamped), [mu1, mu2, kClamped]);
  const cond = useMemo(() => conditionalRungs(mu1, mu2, kClamped), [mu1, mu2, kClamped]);

  // the Skellam strip across k, with the active bar growing as the walk accumulates
  const stripSpan = Math.min(N, 14);
  const strip = useMemo(() => skellamRange(mu1, mu2, -stripSpan, stripSpan), [mu1, mu2, stripSpan]);
  const stripMax = Math.max(...strip, 1e-9);

  const walkPlay = useCallback(() => {
    setAccN(a => (a >= rungCount ? 0 : a)); // restart if finished
    setWalking(w => !w);
  }, [rungCount]);
  const walkStep = useCallback(() => { setWalking(false); setAccN(a => Math.min(rungCount, a + 1)); }, [rungCount]);
  const walkReset = useCallback(() => { setWalking(false); setAccN(0); }, []);

  /* ── Sample: Monte-Carlo convergence ──
     Accumulators live in a ref and the RNG is advanced inside the interval body
     (never inside a state updater, which StrictMode would double-invoke); each
     tick snapshots into state for rendering. */
  const R = useMemo(() => kSpan(mu1, mu2), [mu1, mu2]);
  const [sampleSeed, setSampleSeed] = usePersistentState(`${NS}:sseed`, 1);
  const [sampleTarget, setSampleTarget] = usePersistentState(`${NS}:starget`, 4000);
  const [sampling, setSampling] = useState(false);
  const rngRef = useRef<() => number>(mulberry32(1));
  const sampleTimer = useRef<number | null>(null);
  type Snap = { count: number; bins: number[]; sum: number; sumSq: number };
  const freshSnap = useCallback((): Snap => ({ count: 0, bins: new Array(2 * R + 1).fill(0), sum: 0, sumSq: 0 }), [R]);
  const accRef = useRef<Snap>(freshSnap());
  const [snap, setSnap] = useState<Snap>(freshSnap());

  const resetSamples = useCallback(() => {
    setSampling(false);
    rngRef.current = mulberry32(sampleSeed >>> 0);
    accRef.current = freshSnap();
    setSnap({ ...accRef.current, bins: accRef.current.bins.slice() });
  }, [sampleSeed, freshSnap]);
  // a new rate or seed invalidates the running ensemble
  useEffect(() => { resetSamples(); }, [mu1, mu2, sampleSeed, R]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!sampling) { if (sampleTimer.current) { clearInterval(sampleTimer.current); sampleTimer.current = null; } return; }
    const batch = Math.max(20, Math.round(speed * 3));
    sampleTimer.current = window.setInterval(() => {
      const a = accRef.current;
      if (a.count >= sampleTarget) { setSampling(false); return; }
      const take = Math.min(batch, sampleTarget - a.count);
      for (let i = 0; i < take; i++) {
        const v = sampleSkellam(mu1, mu2, rngRef.current);
        a.sum += v; a.sumSq += v * v; a.count++;
        if (v >= -R && v <= R) a.bins[v + R]++;
      }
      setSnap({ count: a.count, bins: a.bins.slice(), sum: a.sum, sumSq: a.sumSq });
    }, 40);
    return () => { if (sampleTimer.current) clearInterval(sampleTimer.current); };
  }, [sampling, speed, sampleTarget, mu1, mu2, R]);

  const sampleStart = useCallback(() => {
    if (accRef.current.count >= sampleTarget) resetSamples();
    setSampling(s => !s);
  }, [sampleTarget, resetSamples]);

  const sCount = snap.count;
  const sBins = snap.bins;
  const sMean = sCount > 0 ? snap.sum / sCount : 0;
  const sVar = sCount > 1 ? (snap.sumSq - (snap.sum * snap.sum) / sCount) / (sCount - 1) : 0;
  const skellamOverlay = useMemo(() => skellamRange(mu1, mu2, -R, R), [mu1, mu2, R]);

  /* ── Fit: synthetic data → recover μ̂ ── */
  const [fitSeed, setFitSeed] = usePersistentState(`${NS}:fseed`, 7);
  const [fitNRaw, setFitN] = usePersistentState(`${NS}:fn`, 600);
  const fitN = clamp(fitNRaw, 20, 20000);
  const [fitData, setFitData] = useState<{ bins: number[]; fit: ReturnType<typeof fitMoments>; R: number; n: number } | null>(null);

  const runFit = useCallback(() => {
    const rng = mulberry32(fitSeed >>> 0);
    const samples: number[] = [];
    for (let i = 0; i < fitN; i++) samples.push(sampleSkellam(mu1, mu2, rng));
    const r = kSpan(mu1, mu2);
    setFitData({ bins: histogram(samples, -r, r), fit: fitMoments(samples), R: r, n: fitN });
  }, [fitSeed, fitN, mu1, mu2]);
  // refit when the truth or sample size changes, so the view is never stale
  useEffect(() => { runFit(); }, [runFit]);

  /* ── Panels ── */
  const modelNode = (
    <>
      <Pills label="Framing" value={framing} onChange={setFraming}
        options={[{ value: 'micro', label: 'Microsatellite' }, { value: 'generic', label: 'Generic X, Y' }]} />
      <Slider label={lab.mu1} value={mu1} min={0} max={14} step={0.5} onChange={setMu1} format={v => v.toFixed(1)} />
      <Slider label={lab.mu2} value={mu2} min={0} max={14} step={0.5} onChange={setMu2} format={v => v.toFixed(1)} />
      <p className="ctw-hint">mean of K = μ₁ − μ₂ = <strong>{(mu1 - mu2).toFixed(1)}</strong> · variance = μ₁ + μ₂ = <strong>{(mu1 + mu2).toFixed(1)}</strong></p>
    </>
  );

  const selectNode = (
    <>
      <Slider label={`Difference k (the ${lab.diff})`} value={kClamped} min={-N} max={N} step={1} onChange={v => setK(Math.round(v))} format={v => (v >= 0 ? `+${v}` : `${v}`)} />
      <p className="ctw-hint">P(K={kClamped}) = <strong>{fmt(fullPmf, 4)}</strong> · the diagonal has {rungCount} rung{rungCount === 1 ? '' : 's'} carrying the mass.</p>
    </>
  );

  const displayNode = (
    <>
      <Checkbox label="Show the two Poisson margins" checked={showMarginals} onChange={setShowMarginals} />
      <Checkbox label="Show the conditional over rungs" checked={showConditional} onChange={setShowConditional} />
      <Slider label="Grid size cap" value={gridCap} min={10} max={24} step={1} onChange={v => setGridCap(Math.round(v))} format={v => `${v}×${v}`} />
    </>
  );

  const walkNode = (
    <div className="ctw-actions">
      <div className="ctw-progress">Rung {accN} / {rungCount}{accN >= rungCount && rungCount > 0 ? ' · complete' : ''}</div>
      <button className="ctw-btn primary" onClick={walkPlay}>{walking ? <Pause size={16} /> : <Play size={16} />}{walking ? 'Pause' : accN >= rungCount ? 'Replay' : 'Walk'}</button>
      <button className="ctw-btn" onClick={walkStep} disabled={walking || accN >= rungCount}><SkipForward size={16} />Add a rung</button>
      <button className="ctw-btn" onClick={walkReset} disabled={accN === 0}><RotateCcw size={16} />Reset</button>
      <Slider label="Speed" value={speed} min={0} max={100} step={1} onChange={setSpeed} />
    </div>
  );

  const samplerNode = (
    <div className="ctw-actions">
      <div className="ctw-progress">{sCount.toLocaleString()} / {sampleTarget.toLocaleString()} draws</div>
      <button className="ctw-btn primary" onClick={sampleStart}>{sampling ? <Pause size={16} /> : <Play size={16} />}{sampling ? 'Pause' : sCount >= sampleTarget ? 'Restart' : 'Sample'}</button>
      <button className="ctw-btn" onClick={resetSamples} disabled={sCount === 0}><RotateCcw size={16} />Reset</button>
      <NumberInput label="Target draws" value={sampleTarget} onChange={v => setSampleTarget(clamp(Math.round(v), 100, 200000))} min={100} max={200000} integer />
      <div className="ctw-seedrow">
        <NumberInput label="Seed" value={sampleSeed} onChange={v => setSampleSeed(Math.round(v))} min={1} integer />
        <button className="ctw-btn" onClick={() => setSampleSeed(s => s + 1)} title="Draw a fresh stream"><Shuffle size={16} />Re-roll</button>
      </div>
      <Slider label="Speed" value={speed} min={0} max={100} step={1} onChange={setSpeed} />
    </div>
  );

  const fitNode = (
    <div className="ctw-actions">
      <p className="ctw-hint">Generate synthetic differences from the (hidden) truth above, then read μ̂ back off the data — no real data involved.</p>
      <NumberInput label="Sample size" value={fitNRaw} onChange={v => setFitN(clamp(Math.round(v), 20, 20000))} min={20} max={20000} integer />
      <div className="ctw-seedrow">
        <NumberInput label="Seed" value={fitSeed} onChange={v => setFitSeed(Math.round(v))} min={1} integer />
        <button className="ctw-btn" onClick={() => setFitSeed(s => s + 1)} title="Draw a fresh dataset"><Shuffle size={16} />Re-roll</button>
      </div>
      <button className="ctw-btn primary" onClick={runFit}><FlaskConical size={16} />Generate &amp; fit</button>
    </div>
  );

  /* ── Views ── */
  const explainView = (
    <div className="ctw-stage">
      <p className="ctw-story">
        Two independent Poisson counts — <strong>{lab.x}</strong> at rate μ₁={mu1.toFixed(1)} and <strong>{lab.y}</strong> at rate μ₂={mu2.toFixed(1)} —
        and we only ever see their difference. To get <strong>{kClamped >= 0 ? `+${kClamped}` : kClamped}</strong> you can gain&nbsp;{Math.max(0, kClamped)} and lose&nbsp;0,
        or gain&nbsp;{Math.max(0, kClamped) + 1} and lose&nbsp;1, or … — every rung of one diagonal. Add them up: that sum is the Bessel function.
      </p>
      <Lattice mu1={mu1} mu2={mu2} k={kClamped} N={N} accN={accN} showMarginals={showMarginals} lab={lab} onPickK={v => setK(clamp(v, -N, N))} />
      <FormulaBand mu1={mu1} mu2={mu2} k={kClamped} partialBessel={partialBessel} partialSum={partialSum} />
      <div className="ctw-strip">
        <Kicker>Skellam P(K=k) — the difference distribution</Kicker>
        <div className="ctw-strip-bars">
          {strip.map((p, i) => {
            const kk = i - stripSpan;
            const active = kk === kClamped;
            const h = (active ? partialSum : p) / stripMax;
            return (
              <button key={kk} className={`ctw-strip-bar${active ? ' active' : ''}`} title={`P(K=${kk}) = ${fmt(p, 4)}`} onClick={() => setK(kk)}>
                <span className="ctw-strip-fill" style={{ height: `${Math.max(2, h * 100)}%` }} />
                {(stripSpan <= 10 || kk % 2 === 0) && <span className="ctw-strip-lbl">{kk}</span>}
              </button>
            );
          })}
        </div>
        <p className="ctw-hint">The bar at k={kClamped} fills as you walk its diagonal — landing at P = {fmt(fullPmf, 4)}.</p>
      </div>
      {showConditional && (
        <div className="ctw-cond">
          <Kicker>Conditional given the difference is {kClamped} — P(rung n | K={kClamped})</Kicker>
          <div className="ctw-cond-bars">
            {cond.slice(0, 10).map((p, n) => {
              const c = diagCell(kClamped, n);
              return (
                <div key={n} className="ctw-cond-bar" title={`n=${n}: ${c.x} ${lab.xShort}, ${c.y} ${lab.yShort} — P = ${fmt(p, 3)}`}>
                  <span className="ctw-cond-fill" style={{ height: `${Math.max(2, (p / Math.max(...cond, 1e-9)) * 100)}%` }} />
                  <span className="ctw-cond-lbl">{c.x},{c.y}</span>
                </div>
              );
            })}
          </div>
          <p className="ctw-hint">Each underlying ({lab.xShort}, {lab.yShort}) pair, given the net change — exactly one Bessel-series term ÷ the Bessel sum.</p>
        </div>
      )}
    </div>
  );

  const sampleView = (
    <div className="ctw-stage">
      <p className="ctw-story">
        Draw {lab.x} and {lab.y} at random and keep only the difference. The histogram of <strong>{sCount.toLocaleString()}</strong> draws
        is converging to the smooth Skellam curve — the same numbers the diagonal sum produced.
      </p>
      <DiffHistogram bins={sBins} kMin={-R} total={sCount} lab={lab}
        overlays={[{ color: 'var(--accent-2)', pmf: skellamOverlay, label: 'Skellam' }]} />
      <StatGrid stats={[
        { k: 'sample mean → μ₁−μ₂', v: `${sMean.toFixed(2)}  (${(mu1 - mu2).toFixed(1)})` },
        { k: 'sample var → μ₁+μ₂', v: `${sVar.toFixed(2)}  (${(mu1 + mu2).toFixed(1)})` },
      ]} />
      <p className="ctw-hint">Curve = the exact Skellam pmf at μ₁={mu1.toFixed(1)}, μ₂={mu2.toFixed(1)}. Bars = your random draws. They meet as the count grows.</p>
    </div>
  );

  const fitView = (
    <div className="ctw-stage">
      {fitData && (() => {
        const f = fitData.fit;
        const trueOverlay = skellamRange(mu1, mu2, -fitData.R, fitData.R);
        const fitOverlay = skellamRange(f.mu1, f.mu2, -fitData.R, fitData.R);
        return (
          <>
            <p className="ctw-story">
              {fitData.n.toLocaleString()} synthetic differences. We never look at the rates that made them — we recover μ̂ from just the
              sample mean and variance, and the fitted Skellam (Bessel and all) lands on the data.
            </p>
            <DiffHistogram bins={fitData.bins} kMin={-fitData.R} total={fitData.n} lab={lab}
              overlays={[
                { color: 'var(--accent-2)', pmf: fitOverlay, label: 'fitted' },
                { color: 'var(--dim)', pmf: trueOverlay, label: 'true' },
              ]} />
            <StatGrid stats={[
              { k: 'fitted μ̂₁ (true)', v: `${f.mu1.toFixed(2)}  (${mu1.toFixed(1)})` },
              { k: 'fitted μ̂₂ (true)', v: `${f.mu2.toFixed(2)}  (${mu2.toFixed(1)})` },
              { k: 'mean → μ̂₁−μ̂₂', v: f.mean.toFixed(2) },
              { k: 'variance → μ̂₁+μ̂₂', v: f.varr.toFixed(2) },
            ]} />
            <p className="ctw-hint">
              The mean gives the drift μ̂₁−μ̂₂; the variance gives the total activity μ̂₁+μ̂₂; solving the two recovers both rates.
              <span className="ctw-legend"><i style={{ background: 'var(--accent-2)' }} /> fitted &nbsp; <i style={{ background: 'var(--dim)' }} /> true</span>
            </p>
          </>
        );
      })()}
    </div>
  );

  /* ── Assembly: sections / views / actions vary by mode ── */
  const sections: SectionDef[] = mode === 'explain'
    ? [
      { id: 'model', title: 'The two counts', arch: 'subject', node: modelNode, estHeight: 250 },
      { id: 'select', title: 'Difference', arch: 'domain', node: selectNode, estHeight: 150 },
      { id: 'display', title: 'Display', arch: 'marks', node: displayNode, estHeight: 190 },
      { id: 'walk', title: 'Walk the diagonal', arch: 'playback', node: walkNode, estHeight: 300 },
    ]
    : mode === 'sample'
      ? [
        { id: 'model', title: 'The two counts', arch: 'subject', node: modelNode, estHeight: 250 },
        { id: 'sampler', title: 'Sampler', arch: 'playback', node: samplerNode, estHeight: 360 },
      ]
      : [
        { id: 'model', title: 'The hidden truth', arch: 'subject', node: modelNode, estHeight: 250 },
        { id: 'fit', title: 'Fit', arch: 'lab', node: fitNode, estHeight: 300 },
      ];

  const views: ViewDef[] = mode === 'explain'
    ? [{ id: 'lattice', title: 'The lattice of ways', node: explainView, defaultRect: { x: 372, y: 16, w: 720, h: 720 } }]
    : mode === 'sample'
      ? [{ id: 'sampler', title: 'Sampling the difference', node: sampleView, defaultRect: { x: 372, y: 16, w: 700, h: 560 } }]
      : [{ id: 'fit', title: 'Fitting synthetic data', node: fitView, defaultRect: { x: 372, y: 16, w: 700, h: 600 } }];

  const layouts: LayoutDef[] = mode === 'explain'
    ? [{ id: 'essentials', name: 'Essentials', sub: 'Counts · Difference · Walk', icon: 'tune', open: { model: { x: 84, y: 18 }, select: { x: 84, y: 280 }, walk: { x: 84, y: 440 } } }]
    : mode === 'sample'
      ? [{ id: 'essentials', name: 'Essentials', sub: 'Counts · Sampler', icon: 'tune', open: { model: { x: 84, y: 18 }, sampler: { x: 84, y: 280 } } }]
      : [{ id: 'essentials', name: 'Essentials', sub: 'Truth · Fit', icon: 'tune', open: { model: { x: 84, y: 18 }, fit: { x: 84, y: 280 } } }];

  const actions: ActionDef[] = mode === 'explain'
    ? [
      { id: 'walk', icon: walking ? 'pause' : 'play', label: walking ? 'Pause' : 'Walk', primary: true, active: walking, sectionId: 'walk', onClick: walkPlay },
      { id: 'step', icon: 'step', label: 'Add a rung', sectionId: 'walk', disabled: walking || accN >= rungCount, onClick: walkStep },
      { id: 'reset', icon: 'reset', label: 'Reset', sectionId: 'walk', disabled: accN === 0, onClick: walkReset },
    ]
    : mode === 'sample'
      ? [
        { id: 'sample', icon: sampling ? 'pause' : 'play', label: sampling ? 'Pause' : 'Sample', primary: true, active: sampling, sectionId: 'sampler', onClick: sampleStart },
        { id: 'reset', icon: 'reset', label: 'Reset', sectionId: 'sampler', disabled: sCount === 0, onClick: resetSamples },
      ]
      : [
        { id: 'fit', icon: 'flask', label: 'Generate & fit', primary: true, sectionId: 'fit', onClick: runFit },
      ];

  const modes: WorkspaceMode[] = [
    { id: 'explain', label: 'Explain' },
    { id: 'sample', label: 'Sample' },
    { id: 'fit', label: 'Fit' },
  ];

  const help = [explainerText, readmeText].filter(Boolean).join('\n\n---\n\n');

  return (
    <Workspace
      appId={NS}
      title="Counting the Ways"
      subtitle={`X−Y · μ₁=${mu1.toFixed(1)} μ₂=${mu2.toFixed(1)}`}
      sections={sections}
      views={views}
      layouts={layouts}
      defaultLayoutId="essentials"
      explainer={help}
      actions={actions}
      modes={modes}
      activeMode={mode}
      onModeChange={(id) => setMode(id as Mode)}
    />
  );
}
