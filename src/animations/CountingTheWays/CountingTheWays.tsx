import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Play, Pause, SkipForward, RotateCcw, FlaskConical, Trash2 } from 'lucide-react';
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
  diagTerm, conditionalRungs, significantRungs, lawRate,
  mulberry32, sampleSkellam, fitMoments, histogram,
} from './skellam';

const NS = 'counting-the-ways';
type Mode = 'explain' | 'lab';
type Framing = 'micro' | 'generic';
type RateSource = 'direct' | 'law';

const INF = Number.POSITIVE_INFINITY;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const fmt = (v: number, d = 3) => (v === 0 ? '0' : v < 1e-3 ? v.toExponential(1) : v.toFixed(d));

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

/* ── The softplus length-law, f(L) = softplus(a + b·L), drawn for both arms ── */

function LawCurve({ aP, bP, aM, bM, L }: { aP: number; bP: number; aM: number; bM: number; L: number }) {
  const W = 252, H = 92, padL = 6, padR = 6, padT = 8, padB = 16;
  const Lmin = 2, Lmax = 28;
  const fP = (x: number) => lawRate(aP, bP, x);
  const fM = (x: number) => lawRate(aM, bM, x);
  const xs: number[] = [];
  for (let x = Lmin; x <= Lmax + 1e-9; x += 0.5) xs.push(x);
  const maxF = Math.max(0.5, ...xs.map(x => Math.max(fP(x), fM(x))));
  const X = (x: number) => padL + ((x - Lmin) / (Lmax - Lmin)) * (W - padL - padR);
  const Y = (v: number) => H - padB - (v / maxF) * (H - padT - padB);
  const path = (f: (x: number) => number) => xs.map((x, i) => `${i ? 'L' : 'M'}${X(x).toFixed(1)},${Y(f(x)).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="ctw-law" preserveAspectRatio="xMidYMid meet">
      <line className="ctw-axis" x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} />
      <line className="ctw-lawL" x1={X(L)} y1={padT - 2} x2={X(L)} y2={H - padB} />
      <path className="ctw-lawP" d={path(fP)} />
      <path className="ctw-lawM" d={path(fM)} />
      <circle className="ctw-lawdotP" cx={X(L)} cy={Y(fP(L))} r={3} />
      <circle className="ctw-lawdotM" cx={X(L)} cy={Y(fM(L))} r={3} />
      <text className="ctw-axlbl" x={X(L)} y={H - 4} textAnchor="middle">L = {L}</text>
    </svg>
  );
}

/* ── The (X, Y) lattice — the hero, with staged reveal for the tutorial ───── */

interface LatticeProps {
  mu1: number; mu2: number; k: number; N: number; accN: number;
  showMarginals: boolean; lab: Labels; onPickK: (k: number) => void;
  /** Tutorial reveal: only margins index < marginsShown, cells with x+y ≤ cellThreshold,
   *  and the diagonal highlight when diagActive. All Infinity/true ⇒ the full picture. */
  marginsShown?: number; cellThreshold?: number; diagActive?: boolean;
}
function Lattice({ mu1, mu2, k, N, accN, showMarginals, lab, onPickK, marginsShown = INF, cellThreshold = INF, diagActive = true }: LatticeProps) {
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
      const revealed = x + y <= cellThreshold;
      const joint = pX[x] * pY[y];
      const onDiag = diagActive && x - y === k;
      const n = onDiag ? x - Math.max(0, k) : -1;
      const acc = onDiag && n < accN;
      const cur = onDiag && n === accN - 1;
      const op = revealed && jointMax > 0 ? joint / jointMax : 0;
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

  const marg2 = marg - 6;
  const topBars = showMarginals ? pX.map((p, x) => x < marginsShown && (
    <rect key={`tx${x}`} className="ctw-marg" x={gx(x) + 2} y={marg - (p / pXmax) * marg2} width={cs - 4} height={(p / pXmax) * marg2} />
  )) : null;
  const leftBars = showMarginals ? pY.map((p, y) => y < marginsShown && (
    <rect key={`ly${y}`} className="ctw-marg" x={marg - (p / pYmax) * marg2} y={gy(y) + 2} width={(p / pYmax) * marg2} height={cs - 4} />
  )) : null;

  const hoverInfo = hover ? { ...hover, jp: pX[hover.x] * pY[hover.y] } : null;

  return (
    <div className="ctw-lattice-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="ctw-lattice" preserveAspectRatio="xMidYMid meet">
        {showMarginals && <text className="ctw-axlbl" x={marg + grid / 2} y={H - 2} textAnchor="middle">{lab.x} →</text>}
        {showMarginals && <text className="ctw-axlbl" x={12} y={marg + grid / 2} textAnchor="middle" transform={`rotate(-90 12 ${marg + grid / 2})`}>{lab.y} →</text>}
        {topBars}
        {leftBars}
        {cells}
        {diagActive && (
          <line
            className="ctw-diagline"
            x1={gx(Math.max(0, k)) + cs / 2} y1={gy(Math.max(0, -k)) + cs / 2}
            x2={gx(Math.max(0, k) + N - Math.abs(k)) + cs / 2} y2={gy(Math.max(0, -k) + N - Math.abs(k)) + cs / 2}
          />
        )}
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

/* ── Difference histogram (Lab) ───────────────────────────────────────────── */

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
        <polyline key={o.label} className="ctw-overlay" style={{ stroke: o.color }}
          points={o.pmf.map((p, i) => `${X(i) + bw / 2},${Y(p * total)}`).join(' ')} />
      ))}
      {ticks}
      <text className="ctw-axlbl" x={W / 2} y={H - 1} textAnchor="middle">{lab.diff} →</text>
    </svg>
  );
}

/* ── The factored Skellam formula, each piece color-linked ────────────────── */

function FormulaBand({ mu1, mu2, k, partialBessel, partialSum }: {
  mu1: number; mu2: number; k: number; partialBessel: number; partialSum: number;
}) {
  const bd = besselBreakdown(mu1, mu2, k);
  const ak = Math.abs(k);
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
        Sum so far: <strong>Σ joint = {fmt(partialSum, 4)}</strong> &nbsp;→&nbsp; Bessel part <strong>{fmt(partialBessel, 3)}</strong>
        {bd.defined && <> &nbsp;(of {fmt(bd.bessel, 3)})</>}.
      </p>
    </div>
  );
}

/* ── A small bar chart with a single clean baseline (Skellam / Bessel) ─────── */

interface Bar { full: number; shown: number; label: string | null; active: boolean; }
function MiniDist({ bars, color, title, sub, onPick }: {
  bars: Bar[]; color: 'gold' | 'teal'; title: string; sub: string; onPick?: (i: number) => void;
}) {
  const W = 320, H = 126, padX = 6, padTop = 8, padBot = 18;
  const n = bars.length;
  const max = Math.max(...bars.map(b => b.full), 1e-9);
  const bw = (W - 2 * padX) / n;
  const baseY = H - padBot, area = baseY - padTop;
  const main = color === 'teal' ? 'var(--accent-2)' : 'var(--accent)';
  return (
    <div className="ctw-mini">
      <div className="ctw-mini-head"><strong>{title}</strong><span>{sub}</span></div>
      <svg viewBox={`0 0 ${W} ${H}`} className="ctw-mini-svg" preserveAspectRatio="xMidYMid meet">
        {bars.map((b, i) => {
          const x = padX + i * bw, w = Math.max(1, bw * 0.74);
          const fh = (b.full / max) * area, sh = (b.shown / max) * area;
          return (
            <g key={i} onClick={onPick ? () => onPick(i) : undefined} style={{ cursor: onPick ? 'pointer' : 'default' }}>
              {onPick && <rect x={x} y={padTop} width={bw} height={baseY - padTop} fill="transparent" />}
              <rect x={x + bw * 0.13} y={baseY - fh} width={w} height={fh} fill={main} opacity={0.15} />
              {b.shown > 0 && (
                <rect x={x + bw * 0.13} y={baseY - sh} width={w} height={sh} fill={main}
                  opacity={b.active ? 1 : 0.85} stroke={b.active ? 'var(--fg)' : 'none'} strokeWidth={b.active ? 1.2 : 0} />
              )}
              {b.label != null && <text x={x + bw / 2} y={H - 5} textAnchor="middle" className="ctw-mini-lbl">{b.label}</text>}
            </g>
          );
        })}
        <line x1={padX} y1={baseY + 0.5} x2={W - padX} y2={baseY + 0.5} className="ctw-axis" />
      </svg>
    </div>
  );
}

/* ── The app ──────────────────────────────────────────────────────────────── */

interface Run {
  id: number; source: RateSource; mu1: number; mu2: number; n: number; seed: number;
  mean: number; varr: number; mu1Hat: number; mu2Hat: number; err: number; bins: number[]; R: number;
}

export default function CountingTheWays() {
  const [mode, setMode] = useState<Mode>('explain');
  const [framing, setFraming] = usePersistentState<Framing>(`${NS}:framing`, 'micro');
  const [rateSource, setRateSource] = usePersistentState<RateSource>(`${NS}:rates`, 'direct');
  const [mu1D, setMu1D] = usePersistentState(`${NS}:mu1`, 4);
  const [mu2D, setMu2D] = usePersistentState(`${NS}:mu2`, 2.5);
  // softplus length-law parameters (two arms) + the allele length the rates are read at
  const [aP, setAP] = usePersistentState(`${NS}:aP`, -0.5);
  const [bP, setBP] = usePersistentState(`${NS}:bP`, 0.3);
  const [aM, setAM] = usePersistentState(`${NS}:aM`, -0.6);
  const [bM, setBM] = usePersistentState(`${NS}:bM`, 0.2);
  const [L, setL] = usePersistentState(`${NS}:L`, 15);
  const [k, setK] = usePersistentState(`${NS}:k`, 2);
  const [gridCap, setGridCap] = usePersistentState(`${NS}:gridCap`, 16);
  const [showMarginals, setShowMarginals] = usePersistentState(`${NS}:marg`, true);
  const [speed, setSpeed] = usePersistentState(`${NS}:speed`, 55);

  // rates are either set directly or read off the softplus law at length L
  const mu1 = rateSource === 'law' ? lawRate(aP, bP, L) : mu1D;
  const mu2 = rateSource === 'law' ? lawRate(aM, bM, L) : mu2D;

  const lab = labelsFor(framing);
  const N = useMemo(() => gridSize(mu1, mu2, k, gridCap), [mu1, mu2, k, gridCap]);
  const kClamped = clamp(k, -N, N);
  const rungCount = useMemo(() => Math.max(1, Math.min(significantRungs(mu1, mu2, kClamped), N - Math.abs(kClamped) + 1)), [mu1, mu2, kClamped, N]);
  const fullPmf = useMemo(() => skellamPmf(mu1, mu2, kClamped), [mu1, mu2, kClamped]);

  /* ── Explain: the staged tutorial that builds the whole matrix on Play ──
     One monotone `frame` drives four stages: margins → fill every cell →
     highlight the k-diagonal → sum it. frame 0 (and frame ≥ total) render the
     complete static picture, so the app is useful before you ever press Play. */
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const playTimer = useRef<number | null>(null);

  const stripSpan = Math.min(N, 14);
  const strip = useMemo(() => skellamRange(mu1, mu2, -stripSpan, stripSpan), [mu1, mu2, stripSpan]);
  const rungCountOf = useCallback(
    (kk: number) => Math.max(1, Math.min(significantRungs(mu1, mu2, kk), N - Math.abs(kk) + 1)),
    [mu1, mu2, N],
  );

  const Nm = N + 1;                        // reveal each Poisson margin
  const Nf = 2 * N + 1;                    // anti-diagonal wipe that fills the grid
  const FPK = 2;                           // frames per diagonal while sweeping
  const Nsw = (2 * stripSpan + 1) * FPK;   // sweep every diagonal into its Skellam bar
  const total = Nm + Nf + Nsw;

  // a fresh instance rewinds to the full static picture
  useEffect(() => { setFrame(0); setPlaying(false); }, [mu1, mu2, kClamped, N]);

  useEffect(() => {
    if (!playing) { if (playTimer.current) { clearInterval(playTimer.current); playTimer.current = null; } return; }
    const ms = Math.max(40, 280 - speed * 2.4);
    playTimer.current = window.setInterval(() => {
      setFrame(f => { if (f >= total) { setPlaying(false); return total; } return f + 1; });
    }, ms);
    return () => { if (playTimer.current) clearInterval(playTimer.current); };
  }, [playing, speed, total]);

  const inTut = playing || (frame > 0 && frame < total);
  const tut = useMemo(() => {
    if (!inTut) return { stage: 'static' as const, marginsShown: INF, cellThreshold: INF, diagActive: true, sweepK: kClamped, sumN: rungCountOf(kClamped), step: 0 };
    let f = frame;
    if (f < Nm) return { stage: 'margins' as const, marginsShown: f + 1, cellThreshold: -1, diagActive: false, sweepK: kClamped, sumN: 0, step: 1 };
    f -= Nm;
    if (f < Nf) return { stage: 'fill' as const, marginsShown: INF, cellThreshold: f, diagActive: false, sweepK: kClamped, sumN: 0, step: 2 };
    f -= Nf;
    // sweep k from −span to +span, summing each diagonal into its bar — the whole distribution, bottom to top
    const i = Math.min(2 * stripSpan, Math.floor(f / FPK));
    const frac = (f % FPK + 1) / FPK;
    const sweepK = -stripSpan + i;
    return { stage: 'sweep' as const, marginsShown: INF, cellThreshold: INF, diagActive: true, sweepK, sumN: Math.max(1, Math.round(frac * rungCountOf(sweepK))), step: 3 };
  }, [inTut, frame, Nm, Nf, FPK, stripSpan, kClamped, rungCountOf]);

  const activeK = tut.sweepK;   // the diagonal currently highlighted (the user's k, or the swept one)
  const accN = tut.sumN;
  const partialSum = useMemo(() => {
    let s = 0;
    for (let n = 0; n < accN; n++) s += diagTerm(mu1, mu2, activeK, n);
    return s;
  }, [mu1, mu2, activeK, accN]);
  const partialBessel = useMemo(() => {
    const z = 2 * Math.sqrt(mu1 * mu2);
    let s = 0;
    for (let n = 0; n < accN; n++) s += besselTerm(n, activeK, z);
    return s;
  }, [mu1, mu2, activeK, accN]);
  const cond = useMemo(() => conditionalRungs(mu1, mu2, activeK), [mu1, mu2, activeK]);

  // each Skellam bar's displayed value as the distribution builds bottom-to-top
  const barValue = useCallback((idx: number) => {
    const kk = idx - stripSpan;
    if (tut.stage === 'static') return strip[idx];
    if (tut.stage !== 'sweep') return 0;
    if (kk < tut.sweepK) return strip[idx];
    if (kk === tut.sweepK) return partialSum;
    return 0;
  }, [tut.stage, tut.sweepK, strip, stripSpan, partialSum]);

  const playPause = useCallback(() => {
    if (!playing && frame >= total) setFrame(0);
    setPlaying(p => !p);
  }, [playing, frame, total]);
  const stepStage = useCallback(() => {
    setPlaying(false);
    // rest on each stage: margins done · grid full · whole distribution built
    setFrame(f => [Nm - 1, Nm + Nf - 1, total - 1, total].find(t => t > f) ?? total);
  }, [Nm, Nf, total]);
  const resetTut = useCallback(() => { setPlaying(false); setFrame(0); }, []);

  const narration = ({
    margins: `Two independent Poisson counts. The bars on top are P(${lab.xShort} = x); down the left, P(${lab.yShort} = y) — each a Poisson with its own rate.`,
    fill: `Now fill every cell: the chance of that exact pair is the product P(${lab.xShort} = x)·P(${lab.yShort} = y). Independence means multiply.`,
    sweep: `Sum each diagonal, low k to high: diagonal k = ${activeK} totals ${fmt(partialSum, 4)}. Every diagonal's sum is one bar — together they build the whole Skellam distribution.`,
    static: '',
  } as Record<string, string>)[tut.stage];

  /* ── Lab: a cataloged simulator (draw → fit → log a row) ── */
  const [labN, setLabN] = usePersistentState(`${NS}:labN`, 600);
  const [labSeed, setLabSeed] = usePersistentState(`${NS}:labSeed`, 1);
  const [runs, setRuns] = useState<Run[]>([]);
  const [selRun, setSelRun] = useState<number | null>(null);
  const runIdRef = useRef(0);

  const runLab = useCallback(() => {
    const seed = labSeed >>> 0;
    const rng = mulberry32(seed);
    const xs: number[] = [];
    for (let i = 0; i < labN; i++) xs.push(sampleSkellam(mu1, mu2, rng));
    const f = fitMoments(xs);
    const r = kSpan(mu1, mu2);
    const id = ++runIdRef.current;
    const run: Run = {
      id, source: rateSource, mu1, mu2, n: labN, seed,
      mean: f.mean, varr: f.varr, mu1Hat: f.mu1, mu2Hat: f.mu2,
      err: Math.hypot(f.mu1 - mu1, f.mu2 - mu2), bins: histogram(xs, -r, r), R: r,
    };
    setRuns(rs => [run, ...rs].slice(0, 60));   // newest first, capped
    setSelRun(id);
    setLabSeed(s => s + 1);                       // next Run is a fresh draw
  }, [labN, labSeed, mu1, mu2, rateSource, setLabSeed]);
  const clearRuns = useCallback(() => { setRuns([]); setSelRun(null); }, []);

  const selected = runs.find(r => r.id === selRun) ?? runs[0] ?? null;
  const medErr = useMemo(() => {
    if (!runs.length) return 0;
    const s = runs.map(r => r.err).sort((a, b) => a - b), m = s.length;
    return m % 2 ? s[(m - 1) / 2] : (s[m / 2 - 1] + s[m / 2]) / 2;
  }, [runs]);

  /* ── Panels ── */
  const modelNode = (
    <>
      <Pills label="Framing" value={framing} onChange={setFraming}
        options={[{ value: 'micro', label: 'Microsatellite' }, { value: 'generic', label: 'Generic X, Y' }]} />
      <Pills label="Rates from" value={rateSource} onChange={setRateSource}
        options={[{ value: 'direct', label: 'Direct μ' }, { value: 'law', label: 'Length law' }]} />
      {rateSource === 'direct' ? (
        <>
          <Slider label={lab.mu1} value={mu1D} min={0} max={14} step={0.5} onChange={setMu1D} format={v => v.toFixed(1)} />
          <Slider label={lab.mu2} value={mu2D} min={0} max={14} step={0.5} onChange={setMu2D} format={v => v.toFixed(1)} />
        </>
      ) : (
        <>
          <LawCurve aP={aP} bP={bP} aM={aM} bM={bM} L={L} />
          <Slider label="a₊ — gain level (at L=0)" value={aP} min={-8} max={3} step={0.1} onChange={setAP} format={v => v.toFixed(1)} />
          <Slider label="b₊ — gain slope / repeat" value={bP} min={-0.2} max={0.8} step={0.02} onChange={setBP} format={v => v.toFixed(2)} />
          <Slider label="a₋ — loss level (at L=0)" value={aM} min={-8} max={3} step={0.1} onChange={setAM} format={v => v.toFixed(1)} />
          <Slider label="b₋ — loss slope / repeat" value={bM} min={-0.2} max={0.8} step={0.02} onChange={setBM} format={v => v.toFixed(2)} />
          <Slider label="length L (read the rates here)" value={L} min={2} max={28} step={1} onChange={v => setL(Math.round(v))} format={v => `${v}`} />
          <p className="ctw-hint">μ₁ = softplus(a₊+b₊·L) = <strong>{mu1.toFixed(2)}</strong> · μ₂ = softplus(a₋+b₋·L) = <strong>{mu2.toFixed(2)}</strong></p>
        </>
      )}
      <p className="ctw-hint">mean of K = μ₁ − μ₂ = <strong>{(mu1 - mu2).toFixed(2)}</strong> · variance = μ₁ + μ₂ = <strong>{(mu1 + mu2).toFixed(2)}</strong></p>
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
      <Slider label="Grid size cap" value={gridCap} min={10} max={24} step={1} onChange={v => setGridCap(Math.round(v))} format={v => `${v}×${v}`} />
    </>
  );

  const tutorNode = (
    <div className="ctw-actions">
      <div className="ctw-progress">{tut.stage === 'static' ? 'Full picture' : `Step ${tut.step} / 3 · ${tut.stage}`}</div>
      <button className="ctw-btn primary" onClick={playPause}>{playing ? <Pause size={16} /> : <Play size={16} />}{playing ? 'Pause' : frame > 0 && frame < total ? 'Resume' : 'Play tutorial'}</button>
      <button className="ctw-btn" onClick={stepStage} disabled={playing}><SkipForward size={16} />Next step</button>
      <button className="ctw-btn" onClick={resetTut} disabled={frame === 0 && !playing}><RotateCcw size={16} />Reset</button>
      <Slider label="Speed" value={speed} min={0} max={100} step={1} onChange={setSpeed} />
    </div>
  );

  const labNode = (
    <div className="ctw-actions">
      <div className="ctw-progress">{runs.length} run{runs.length === 1 ? '' : 's'} logged · next seed {labSeed}</div>
      <NumberInput label="Sample size" value={labN} onChange={v => setLabN(clamp(Math.round(v), 20, 20000))} min={20} max={20000} integer />
      <button className="ctw-btn primary" onClick={runLab}><FlaskConical size={16} />Run &amp; log</button>
      <button className="ctw-btn" onClick={clearRuns} disabled={runs.length === 0}><Trash2 size={16} />Clear catalog</button>
      <p className="ctw-hint">Each run draws a fresh sample from the current rates, fits μ̂ from its mean &amp; variance, and adds a row. Run repeatedly to see the recovery wobble; change the rates to compare.</p>
    </div>
  );

  /* ── Views ── */
  const explainView = (
    <div className="ctw-stage">
      {tut.stage === 'static'
        ? <p className="ctw-story">
            Two independent Poisson counts — <strong>{lab.x}</strong> at rate μ₁={mu1.toFixed(2)} and <strong>{lab.y}</strong> at rate μ₂={mu2.toFixed(2)} —
            and we only ever see their difference. Press <strong>Play tutorial</strong> to build the whole grid and watch the Bessel function appear as one diagonal's sum.
          </p>
        : <div className="ctw-tutorial"><span className="ctw-step">Step {tut.step} / 3</span><span className="ctw-tut-text">{narration}</span></div>}
      <Lattice mu1={mu1} mu2={mu2} k={activeK} N={N} accN={accN} showMarginals={showMarginals} lab={lab}
        marginsShown={tut.marginsShown} cellThreshold={tut.cellThreshold} diagActive={tut.diagActive}
        onPickK={v => setK(clamp(v, -N, N))} />
      <FormulaBand mu1={mu1} mu2={mu2} k={activeK} partialBessel={partialBessel} partialSum={partialSum} />
      <div className="ctw-dists">
        <MiniDist
          title="Skellam — the difference K"
          sub="marginal · sum a diagonal"
          color="gold"
          bars={strip.map((p, i) => ({ full: p, shown: barValue(i), label: (i - stripSpan) % 5 === 0 ? `${i - stripSpan}` : null, active: i - stripSpan === activeK }))}
          onPick={(i) => setK(i - stripSpan)}
        />
        <MiniDist
          title={`Bessel — given K = ${activeK}`}
          sub="conditional · rung n on that diagonal"
          color="teal"
          bars={cond.slice(0, 10).map((p, n) => ({ full: p, shown: p, label: `${n}`, active: false }))}
        />
      </div>
      <p className="ctw-hint">
        Two distributions, not one: <strong>Skellam</strong> is the difference itself — <em>sum</em> a diagonal.
        The <strong>Bessel</strong> distribution is where you land on a diagonal — <em>normalize</em> it.
        Same terms; the Bessel function Iₖ is their shared diagonal sum.
      </p>
    </div>
  );

  const labView = (
    <div className="ctw-stage">
      <p className="ctw-story">
        A cataloged simulator. Each run draws differences from the current rates and recovers μ̂ from the sample mean and variance.
        The catalog keeps every run so you can compare seeds, sample sizes and rates — and watch how tightly the fit recovers the truth.
      </p>
      {selected ? (
        <>
          <DiffHistogram bins={selected.bins} kMin={-selected.R} total={selected.n} lab={lab}
            overlays={[
              { color: 'var(--accent-2)', pmf: skellamRange(selected.mu1Hat, selected.mu2Hat, -selected.R, selected.R), label: 'fitted' },
              { color: 'var(--dim)', pmf: skellamRange(selected.mu1, selected.mu2, -selected.R, selected.R), label: 'true' },
            ]} />
          <StatGrid stats={[
            { k: 'fitted μ̂₁ (true)', v: `${selected.mu1Hat.toFixed(2)}  (${selected.mu1.toFixed(2)})` },
            { k: 'fitted μ̂₂ (true)', v: `${selected.mu2Hat.toFixed(2)}  (${selected.mu2.toFixed(2)})` },
            { k: 'mean → μ̂₁−μ̂₂', v: selected.mean.toFixed(2) },
            { k: 'variance → μ̂₁+μ̂₂', v: selected.varr.toFixed(2) },
          ]} />
          <p className="ctw-hint">
            Run #{selected.id} · {selected.n.toLocaleString()} draws · seed {selected.seed} · |μ̂−μ| = {selected.err.toFixed(2)}
            <span className="ctw-legend"><i style={{ background: 'var(--accent-2)' }} /> fitted &nbsp; <i style={{ background: 'var(--dim)' }} /> true</span>
          </p>
        </>
      ) : (
        <div className="ctw-empty"><FlaskConical size={26} /><p>Run the Lab to log your first experiment.</p></div>
      )}
      {runs.length > 0 && (
        <div className="ctw-cat">
          <Kicker>Catalog — {runs.length} run{runs.length === 1 ? '' : 's'} · median |μ̂−μ| = {medErr.toFixed(2)}</Kicker>
          <div className="ctw-cat-scroll">
            <table className="ctw-cat-table">
              <thead>
                <tr><th>#</th><th>rates</th><th>μ₁,μ₂</th><th>N</th><th>mean</th><th>var</th><th>μ̂₁</th><th>μ̂₂</th><th>err</th></tr>
              </thead>
              <tbody>
                {runs.map(r => (
                  <tr key={r.id} className={r.id === selected?.id ? 'sel' : ''} onClick={() => setSelRun(r.id)}>
                    <td>{r.id}</td>
                    <td>{r.source === 'law' ? 'law' : 'direct'}</td>
                    <td>{r.mu1.toFixed(1)}, {r.mu2.toFixed(1)}</td>
                    <td>{r.n}</td>
                    <td>{r.mean.toFixed(2)}</td>
                    <td>{r.varr.toFixed(2)}</td>
                    <td>{r.mu1Hat.toFixed(2)}</td>
                    <td>{r.mu2Hat.toFixed(2)}</td>
                    <td className={r.err > 0.5 ? 'hi' : ''}>{r.err.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  /* ── Assembly: sections / views / actions vary by mode ── */
  const modelH = rateSource === 'law' ? 470 : 250;
  const sections: SectionDef[] = mode === 'explain'
    ? [
      { id: 'model', title: 'The two counts', arch: 'subject', node: modelNode, estHeight: modelH },
      { id: 'select', title: 'Difference', arch: 'domain', node: selectNode, estHeight: 150 },
      { id: 'display', title: 'Display', arch: 'marks', node: displayNode, estHeight: 190 },
      { id: 'tutor', title: 'Build it', arch: 'playback', node: tutorNode, estHeight: 280 },
    ]
    : [
      { id: 'model', title: 'The rates', arch: 'subject', node: modelNode, estHeight: modelH },
      { id: 'lab', title: 'Run the lab', arch: 'lab', node: labNode, estHeight: 320 },
    ];

  const views: ViewDef[] = mode === 'explain'
    ? [{ id: 'lattice', title: 'The lattice of ways', node: explainView, defaultRect: { x: 372, y: 16, w: 720, h: 720 } }]
    : [{ id: 'lab', title: 'Simulator & catalog', node: labView, defaultRect: { x: 372, y: 16, w: 720, h: 680 } }];

  const layouts: LayoutDef[] = mode === 'explain'
    ? [{ id: 'essentials', name: 'Essentials', sub: 'Counts · Difference · Build', icon: 'tune', open: { model: { x: 84, y: 18 }, select: { x: 84, y: 300 }, tutor: { x: 84, y: 462 } } }]
    : [{ id: 'essentials', name: 'Essentials', sub: 'Rates · Lab', icon: 'tune', open: { model: { x: 84, y: 18 }, lab: { x: 84, y: 300 } } }];

  const actions: ActionDef[] = mode === 'explain'
    ? [
      { id: 'play', icon: playing ? 'pause' : 'play', label: playing ? 'Pause' : 'Play', primary: true, active: playing, sectionId: 'tutor', onClick: playPause },
      { id: 'step', icon: 'step', label: 'Next step', sectionId: 'tutor', disabled: playing, onClick: stepStage },
      { id: 'reset', icon: 'reset', label: 'Reset', sectionId: 'tutor', disabled: frame === 0 && !playing, onClick: resetTut },
    ]
    : [
      { id: 'run', icon: 'flask', label: 'Run & log', primary: true, sectionId: 'lab', onClick: runLab },
      { id: 'clear', icon: 'reset', label: 'Clear', sectionId: 'lab', disabled: runs.length === 0, onClick: clearRuns },
    ];

  const modes: WorkspaceMode[] = [
    { id: 'explain', label: 'Explain' },
    { id: 'lab', label: 'Lab' },
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
