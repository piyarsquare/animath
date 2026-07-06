import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Workspace from '../../chrome/workspace/Workspace';
import type { LayoutDef, SectionDef, ViewDef } from '../../chrome/workspace/types';
import { Slider, Checkbox, Pills } from '../../components/ControlPanel';
import { Breakdown, StatGrid, Kicker } from '../../chrome/readouts';
import { usePersistentState } from '../../lib/usePersistentState';
import explainerText from './EXPLAINER.md?raw';
import './divisionBells.css';
import { useThemeTokens } from '../../chrome/useThemeTokens';
import {
  Gaussian2D, Vec2,
  klDivergence, klDecompose, mahalanobisMeans, mahalanobisPooled,
  bhattacharyya, overlapIntegral,
  pdf, logPdf, covariance, whitenMatrix, fromCovariance, matMul, matVec, sub,
} from './gaussian2d';
import { FAMILY, MeasureCtx } from './measures';

type FieldMode = 'none' | 'density' | 'kl' | 'classify';
type WhitenMode = 'off' | 'P' | 'Q';

/** #rrggbb / #rgb → [r,g,b] bytes, with a fallback for non-hex tokens. */
function hexToRgb(s: string | undefined, fb: [number, number, number]): [number, number, number] {
  if (!s) return fb;
  const t = s.trim();
  let m = /^#([0-9a-f]{3})$/i.exec(t);
  if (m) { const h = m[1]; return [parseInt(h[0] + h[0], 16), parseInt(h[1] + h[1], 16), parseInt(h[2] + h[2], 16)]; }
  m = /^#([0-9a-f]{6})$/i.exec(t);
  if (m) { const h = m[1]; return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
  return fb;
}

/** Whiten `g` into `ref`'s metric: y = Σ_ref^{-½}(x − μ_ref). ref becomes N(0, I). */
function whitenGaussian(g: Gaussian2D, ref: Gaussian2D): Gaussian2D {
  const W = whitenMatrix(ref);
  const meanV = matVec(W, sub(g.mean, ref.mean));
  const newCov = matMul(matMul(W, covariance(g)), W); // W symmetric ⇒ WΣWᵀ
  return fromCovariance([meanV[0], meanV[1]], newCov);
}

const NS = 'division-bells';
const LN2 = Math.log(2);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const fmt = (v: number, d = 2) => (Math.abs(v) >= 1e4 ? v.toExponential(1) : v.toFixed(d));

/* ── the immersive plane: two Gaussians as σ-ellipses, draggable means ──────── */

type Which = 'P' | 'Q';
interface PlaneProps {
  /** The displayed Gaussians (already whitened if `whitened`). */
  P: Gaussian2D;
  Q: Gaussian2D;
  extent: number;
  show1: boolean;
  show2: boolean;
  showFill: boolean;
  showVector: boolean;
  field: FieldMode;
  priorP: number;
  /** True when the plane is a whitened frame — mean drag is disabled. */
  whitened: boolean;
  onDragMean: (which: Which, mean: Vec2) => void;
}

function useSize(ref: React.RefObject<HTMLDivElement>) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      setSize({ w: Math.max(1, Math.floor(r.width)), h: Math.max(1, Math.floor(r.height)) });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

function BellsPlane({ P, Q, extent, show1, show2, showFill, showVector, field, priorP, whitened, onDragMean }: PlaneProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<Which | null>(null);
  const { w, h } = useSize(wrapRef);
  const tokens = useThemeTokens(['data-1', 'data-2', 'accent', 'fg', 'viz-bg'], wrapRef);
  // primitive params so the field effect's dep array stays statically checkable
  const pm0 = P.mean[0], pm1 = P.mean[1], pth = P.theta, ps0 = P.sigma[0], ps1 = P.sigma[1];
  const qm0 = Q.mean[0], qm1 = Q.mean[1], qth = Q.theta, qs0 = Q.sigma[0], qs1 = Q.sigma[1];

  // Equal x/y scale from the shorter side so ellipses aren't sheared.
  const k = ((Math.min(w, h) / 2) * 0.9) / extent || 1;
  const toV = (m: Vec2): [number, number] => [w / 2 + m[0] * k, h / 2 - m[1] * k];
  const toMath = (clientX: number, clientY: number): Vec2 => {
    const r = svgRef.current!.getBoundingClientRect();
    const sx = w / (r.width || 1), sy = h / (r.height || 1);
    const fx = (clientX - r.left) * sx, fy = (clientY - r.top) * sy;
    return [(fx - w / 2) / k, -(fy - h / 2) / k];
  };

  // ── the canvas field: density / signed KL integrand / decision-overlap ──
  // Static given the params, so it's an effect (offscreen low-res → upscaled),
  // never a per-frame loop. Canvas can't read var(), so colors come resolved.
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv || w < 2 || h < 2) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.floor(w * dpr);
    cv.height = Math.floor(h * dpr);
    const ctx2d = cv.getContext('2d');
    if (!ctx2d) return;
    ctx2d.clearRect(0, 0, cv.width, cv.height);
    if (field === 'none') return;

    const RES = 150;
    const rh = Math.max(1, Math.round((RES * h) / w));
    const off = document.createElement('canvas');
    off.width = RES; off.height = rh;
    const octx = off.getContext('2d');
    if (!octx) return;
    const img = octx.createImageData(RES, rh);

    const c1 = hexToRgb(tokens['data-1'], [90, 150, 240]);
    const c2 = hexToRgb(tokens['data-2'], [240, 150, 60]);
    const cA = hexToRgb(tokens['accent'], [240, 200, 80]);
    const bg = hexToRgb(tokens['viz-bg'], [8, 10, 16]);
    const pPeak = Math.max(1e-12, pdf(P, P.mean));
    const qPeak = Math.max(1e-12, pdf(Q, Q.mean));
    const winPeak = Math.max(priorP * pPeak, (1 - priorP) * qPeak);

    // pass 1: sample p, q; track the KL-integrand magnitude for normalization
    const pv = new Float64Array(RES * rh);
    const qv = new Float64Array(RES * rh);
    let sMax = 1e-12;
    for (let j = 0; j < rh; j++) {
      const my = -(((j + 0.5) / rh) * h - h / 2) / k;
      for (let i = 0; i < RES; i++) {
        const mx = (((i + 0.5) / RES) * w - w / 2) / k;
        const p = pdf(P, [mx, my]);
        const q = pdf(Q, [mx, my]);
        const idx = i + j * RES;
        pv[idx] = p; qv[idx] = q;
        if (field === 'kl' && p > 1e-10) {
          const s = Math.abs(p * (logPdf(P, [mx, my]) - logPdf(Q, [mx, my])));
          if (s > sMax) sMax = s;
        }
      }
    }
    // pass 2: color
    for (let idx = 0; idx < RES * rh; idx++) {
      const p = pv[idx], q = qv[idx];
      let R = bg[0], G = bg[1], B = bg[2];
      const over = (c: [number, number, number], a: number) => {
        const aa = a < 0 ? 0 : a > 1 ? 1 : a;
        R = R * (1 - aa) + c[0] * aa; G = G * (1 - aa) + c[1] * aa; B = B * (1 - aa) + c[2] * aa;
      };
      if (field === 'density') {
        over(c1, (p / pPeak) * 0.8);
        over(c2, (q / qPeak) * 0.8);
      } else if (field === 'kl') {
        const j = Math.floor(idx / RES), i = idx % RES;
        const my = -(((j + 0.5) / rh) * h - h / 2) / k;
        const mx = (((i + 0.5) / RES) * w - w / 2) / k;
        const s = p > 1e-10 ? p * (logPdf(P, [mx, my]) - logPdf(Q, [mx, my])) : 0;
        over(s >= 0 ? c1 : c2, (Math.abs(s) / sMax) * 0.85); // P-favored vs Q-favored
      } else { // classify: winner tint + the min-overlap error mass
        const wP = priorP * p, wQ = (1 - priorP) * q;
        over(wP >= wQ ? c1 : c2, (Math.max(wP, wQ) / winPeak) * 0.32);
        over(cA, (Math.min(wP, wQ) / (0.5 * winPeak)) * 0.85); // the confusable (Bayes-error) band
      }
      const o = idx * 4;
      img.data[o] = R; img.data[o + 1] = G; img.data[o + 2] = B; img.data[o + 3] = 255;
    }
    octx.putImageData(img, 0, 0);
    ctx2d.imageSmoothingEnabled = true;
    ctx2d.drawImage(off, 0, 0, cv.width, cv.height);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w, h, k, field, priorP, tokens, pm0, pm1, pth, ps0, ps1, qm0, qm1, qth, qs0, qs1]);

  const onHandleDown = (which: Which) => (e: React.PointerEvent) => {
    if (whitened) return; // whitened frame: adjust via sliders, not drag
    e.stopPropagation();
    svgRef.current?.setPointerCapture(e.pointerId);
    dragRef.current = which;
  };
  const onMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const [mx, my] = toMath(e.clientX, e.clientY);
    onDragMean(dragRef.current, [clamp(mx, -extent, extent), clamp(my, -extent, extent)]);
  };
  const onUp = (e: React.PointerEvent) => {
    svgRef.current?.releasePointerCapture(e.pointerId);
    dragRef.current = null;
  };

  // Grid lines at integer math coords.
  const gridLines: React.ReactNode[] = [];
  if (w > 0 && h > 0) {
    const n = Math.ceil(extent);
    for (let i = -n; i <= n; i++) {
      const [vx] = toV([i, 0]);
      const [, vy] = toV([0, i]);
      const major = i === 0;
      gridLines.push(
        <line key={`gx${i}`} x1={vx} y1={0} x2={vx} y2={h} stroke={major ? 'var(--fg)' : 'var(--border)'} strokeOpacity={major ? 0.35 : 0.5} strokeWidth={major ? 1.2 : 0.6} />,
        <line key={`gy${i}`} x1={0} y1={vy} x2={w} y2={vy} stroke={major ? 'var(--fg)' : 'var(--border)'} strokeOpacity={major ? 0.35 : 0.5} strokeWidth={major ? 1.2 : 0.6} />,
      );
    }
  }

  const ellipses = (g: Gaussian2D, color: string): React.ReactNode => {
    const [cx, cy] = toV(g.mean);
    const rot = -(g.theta * 180) / Math.PI; // screen y is flipped
    const ring = (n: number, opacity: number, fill: boolean) => (
      <ellipse
        key={`${fill ? 'f' : 's'}${n}`}
        cx={cx} cy={cy}
        rx={Math.max(0.5, g.sigma[0] * k * n)} ry={Math.max(0.5, g.sigma[1] * k * n)}
        transform={`rotate(${rot} ${cx} ${cy})`}
        fill={fill ? color : 'none'}
        fillOpacity={fill ? opacity : 0}
        stroke={fill ? 'none' : color}
        strokeOpacity={fill ? 0 : opacity}
        strokeWidth={1.6}
      />
    );
    return (
      <g pointerEvents="none">
        {showFill && show2 && ring(2, 0.07, true)}
        {showFill && show1 && ring(1, 0.13, true)}
        {show2 && ring(2, 0.55, false)}
        {show1 && ring(1, 0.9, false)}
      </g>
    );
  };

  const meanHandle = (g: Gaussian2D, which: Which, color: string): React.ReactNode => {
    const [cx, cy] = toV(g.mean);
    return (
      <g key={which} style={{ cursor: whitened ? 'default' : 'grab' }} onPointerDown={onHandleDown(which)}>
        <circle cx={cx} cy={cy} r={12} fill="transparent" />
        <circle cx={cx} cy={cy} r={5} fill={color} stroke="var(--viz-bg, var(--bg))" strokeWidth={1.5} />
        <text x={cx + 9} y={cy - 8} fill={color} fontFamily="var(--font-mono)" fontSize={13} fontWeight={700}>{which}</text>
      </g>
    );
  };

  const caption = whitened
    ? 'whitened frame — the reference bell is a unit circle, so Mahalanobis = ordinary distance; adjust with sliders'
    : 'drag P · Q — separation and divergence update live';

  // Difference vector μ_P → μ_Q.
  let vector: React.ReactNode = null;
  if (showVector && w > 0) {
    const [x1, y1] = toV(P.mean);
    const [x2, y2] = toV(Q.mean);
    const ang = Math.atan2(y2 - y1, x2 - x1);
    const hlen = 9;
    vector = (
      <g pointerEvents="none" stroke="var(--dim)" strokeOpacity={0.8}>
        <line x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth={1.4} strokeDasharray="5 4" />
        <line x1={x2} y1={y2} x2={x2 - hlen * Math.cos(ang - 0.4)} y2={y2 - hlen * Math.sin(ang - 0.4)} strokeWidth={1.4} />
        <line x1={x2} y1={y2} x2={x2 - hlen * Math.cos(ang + 0.4)} y2={y2 - hlen * Math.sin(ang + 0.4)} strokeWidth={1.4} />
      </g>
    );
  }

  return (
    <div className="db-plane-wrap" ref={wrapRef}>
      <canvas ref={canvasRef} className="db-field" style={{ width: '100%', height: '100%' }} />
      <svg
        ref={svgRef}
        className="db-plane"
        viewBox={`0 0 ${w} ${h}`}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        {gridLines}
        {ellipses(P, 'var(--data-1)')}
        {ellipses(Q, 'var(--data-2)')}
        {vector}
        {meanHandle(P, 'P', 'var(--data-1)')}
        {meanHandle(Q, 'Q', 'var(--data-2)')}
      </svg>
      <div className="db-caption">{caption}</div>
    </div>
  );
}

/* ── the app ────────────────────────────────────────────────────────────────── */

export default function DivisionBells() {
  // Two Gaussians in (mean, θ, σ₁, σ₂) form — the PSD-by-construction parametrization.
  const [pMx, setPMx] = usePersistentState(`${NS}:pMx`, -1.4);
  const [pMy, setPMy] = usePersistentState(`${NS}:pMy`, 0);
  const [pTh, setPTh] = usePersistentState(`${NS}:pTh`, 0);
  const [pS1, setPS1] = usePersistentState(`${NS}:pS1`, 1.4);
  const [pS2, setPS2] = usePersistentState(`${NS}:pS2`, 0.8);
  const [qMx, setQMx] = usePersistentState(`${NS}:qMx`, 1.6);
  const [qMy, setQMy] = usePersistentState(`${NS}:qMy`, 0.4);
  const [qTh, setQTh] = usePersistentState(`${NS}:qTh`, 0.9);
  const [qS1, setQS1] = usePersistentState(`${NS}:qS1`, 1.0);
  const [qS2, setQS2] = usePersistentState(`${NS}:qS2`, 1.0);

  const [show1, setShow1] = usePersistentState(`${NS}:show1`, true);
  const [show2, setShow2] = usePersistentState(`${NS}:show2`, true);
  const [showFill, setShowFill] = usePersistentState(`${NS}:showFill`, true);
  const [showVector, setShowVector] = usePersistentState(`${NS}:showVec`, true);
  const [priorP, setPriorP] = usePersistentState(`${NS}:priorP`, 0.5); // prior for Bayes error
  const [field, setField] = usePersistentState<FieldMode>(`${NS}:field`, 'none');
  const [whiten, setWhiten] = usePersistentState<WhitenMode>(`${NS}:whiten`, 'off');

  const P: Gaussian2D = { mean: [pMx, pMy], theta: pTh, sigma: [pS1, pS2] };
  const Q: Gaussian2D = { mean: [qMx, qMy], theta: qTh, sigma: [qS1, qS2] };

  // The Gaussians as displayed: whitened into P's or Q's metric, or as-is.
  const dP = whiten === 'off' ? P : whiten === 'Q' ? whitenGaussian(P, Q) : whitenGaussian(P, P);
  const dQ = whiten === 'off' ? Q : whiten === 'Q' ? whitenGaussian(Q, Q) : whitenGaussian(Q, P);

  const onDragMean = useCallback((which: Which, m: Vec2) => {
    const rx = Math.round(m[0] * 100) / 100, ry = Math.round(m[1] * 100) / 100;
    if (which === 'P') { setPMx(rx); setPMy(ry); } else { setQMx(rx); setQMy(ry); }
  }, [setPMx, setPMy, setQMx, setQMy]);

  // Presets — the two teaching anchors.
  const matchShapes = () => { setQTh(pTh); setQS1(pS1); setQS2(pS2); };   // ⇒ KL collapses to ½·d_M²
  const concentric = () => { setQMx(pMx); setQMy(pMy); };                 // ⇒ d_M = 0 yet KL > 0
  const reset = () => {
    setPMx(-1.4); setPMy(0); setPTh(0); setPS1(1.4); setPS2(0.8);
    setQMx(1.6); setQMy(0.4); setQTh(0.9); setQS1(1.0); setQS2(1.0);
  };

  /* ── the divergences ── */
  const klPQ = klDivergence(P, Q);
  const klQP = klDivergence(Q, P);
  const dec = klDecompose(P, Q);
  const dMdir = mahalanobisMeans(P, Q); // directed, in Q's metric
  const dMpool = mahalanobisPooled(P, Q); // symmetric
  const total = dec.total;
  const pctMean = total > 1e-6 ? Math.round((dec.meanShift / total) * 100) : 0;
  const pctCov = total > 1e-6 ? Math.round((dec.covMismatch / total) * 100) : 0;
  const shapesMatch = dec.covMismatch < 1e-4;

  // The numeric overlap (TV, Bayes error) — computed once here and shared, since
  // it's the one expensive quantity and has no Gaussian closed form.
  const overlap = useMemo(
    () => overlapIntegral(P, Q, { grid: 170, priorP }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pMx, pMy, pTh, pS1, pS2, qMx, qMy, qTh, qS1, qS2, priorP],
  );
  const ctx: MeasureCtx = { overlap };
  const bc = bhattacharyya(P, Q).coefficient;
  // live relationship checks (the honest hierarchy)
  const pinskerRHS = Math.sqrt(Math.max(0, klPQ) / 2); // TV ≤ √(KL/2)
  const bhatBound = 0.5 * bc; // Pₑ ≤ ½·BC

  /* ── panels ── */
  const bellPanel = (which: Which) => {
    const isP = which === 'P';
    const th = isP ? pTh : qTh, s1 = isP ? pS1 : qS1, s2 = isP ? pS2 : qS2;
    const mx = isP ? pMx : qMx, my = isP ? pMy : qMy;
    const setTh = isP ? setPTh : setQTh, setS1 = isP ? setPS1 : setQS1, setS2 = isP ? setPS2 : setQS2;
    const setMx = isP ? setPMx : setQMx, setMy = isP ? setPMy : setQMy;
    const col = isP ? 'var(--data-1)' : 'var(--data-2)';
    return (
      <>
        <div className="db-sub"><span className="db-swatch" style={{ background: col }} /> bell {which}</div>
        <Slider label="mean x" value={mx} min={-5} max={5} step={0.1} onChange={v => setMx(Math.round(v * 10) / 10)} format={v => v.toFixed(1)} />
        <Slider label="mean y" value={my} min={-5} max={5} step={0.1} onChange={v => setMy(Math.round(v * 10) / 10)} format={v => v.toFixed(1)} />
        <Slider label="σ₁ (long axis)" value={s1} min={0.2} max={3} step={0.05} onChange={setS1} format={v => v.toFixed(2)} />
        <Slider label="σ₂ (short axis)" value={s2} min={0.2} max={3} step={0.05} onChange={setS2} format={v => v.toFixed(2)} />
        <Slider label="tilt θ" value={th} min={0} max={Math.PI} step={0.02} onChange={setTh} format={v => `${Math.round((v * 180) / Math.PI)}°`} />
      </>
    );
  };

  const bellsNode = (
    <>
      {bellPanel('P')}
      {bellPanel('Q')}
      <div className="db-sub">presets</div>
      <div className="db-presets">
        <button className="db-btn" onClick={matchShapes}>Match shapes</button>
        <button className="db-btn" onClick={concentric}>Concentric</button>
        <button className="db-btn" onClick={reset}>Reset</button>
      </div>
      <p className="db-hint">Or drag <strong>P</strong> and <strong>Q</strong> on the plane.</p>
    </>
  );

  const displayNode = (
    <>
      <Pills label="Field" value={field} onChange={setField} options={[
        { value: 'none', label: 'None' },
        { value: 'density', label: 'Density' },
        { value: 'kl', label: 'KL flow' },
        { value: 'classify', label: 'Classify' },
      ]} />
      {field === 'kl' && <p className="db-hint">Signed integrand p·log(p/q): P-favored vs Q-favored regions. Its integral <em>is</em> KL(P‖Q) = <strong>{fmt(klPQ)}</strong>.</p>}
      {field === 'classify' && <p className="db-hint">The lit band is the confusable region — its mass is the Bayes error <strong>{fmt(overlap.bayesError, 3)}</strong> (prior π(P)={priorP.toFixed(2)}).</p>}
      <Pills label="Whiten into" value={whiten} onChange={setWhiten} options={[
        { value: 'off', label: 'Off' },
        { value: 'P', label: "P's frame" },
        { value: 'Q', label: "Q's frame" },
      ]} />
      {whiten !== 'off' && <p className="db-hint">Whitened: the reference bell is a unit circle, so its Mahalanobis distance reads as ordinary distance. Drag is off — use the sliders.</p>}
      <Checkbox label="1σ ellipse" checked={show1} onChange={setShow1} />
      <Checkbox label="2σ ellipse" checked={show2} onChange={setShow2} />
      <Checkbox label="Density fill (outline)" checked={showFill} onChange={setShowFill} />
      <Checkbox label="Mean-difference vector" checked={showVector} onChange={setShowVector} />
    </>
  );

  const readoutNode = (
    <>
      <Kicker>KL(P‖Q) = ½·d_M²(means) + covariance mismatch</Kicker>
      <Breakdown rows={[
        { label: 'mean shift', pct: pctMean, color: 'var(--data-3)' },
        { label: 'cov mismatch', pct: pctCov, color: 'var(--data-4)' },
      ]} />
      <p className="db-hint">
        = ½·d_M² <strong>{fmt(dec.meanShift)}</strong> + cov <strong>{fmt(dec.covMismatch)}</strong> = <strong>{fmt(total)}</strong> nats.
        {shapesMatch
          ? <> Shapes match → cov term is 0, so <strong>KL = ½·d_M²</strong>.</>
          : <> Different shapes → the cov term makes KL <strong>asymmetric</strong>.</>}
      </p>
      <StatGrid stats={[
        { k: 'KL(P‖Q) — nats · bits', v: `${fmt(klPQ)} · ${fmt(klPQ / LN2)}` },
        { k: 'KL(Q‖P) — nats · bits', v: `${fmt(klQP)} · ${fmt(klQP / LN2)}` },
        { k: 'Mahalanobis dₘ (in Q, σ)', v: fmt(dMdir) },
        { k: 'Mahalanobis dₘ (pooled, σ)', v: fmt(dMpool) },
      ]} />
      <p className="db-hint">
        Asymmetry: KL(P‖Q) − KL(Q‖P) = <strong>{fmt(klPQ - klQP)}</strong> nats.
        Mahalanobis is a symmetric distance; KL is an asymmetric divergence.
      </p>
    </>
  );

  const fmtMeasure = (v: number, method: 'closed' | 'numeric') =>
    Number.isNaN(v) ? '—' : `${method === 'numeric' ? '≈ ' : ''}${fmt(v, 3)}`;

  const yardsticksNode = (
    <>
      <Kicker>The yardstick family — how confusable are the two bells?</Kicker>
      <p className="db-hint">
        Every row answers the same question. <strong>Bayes error</strong> is the
        operational one: the mistake rate of the best classifier told to tell P from Q.
      </p>
      <Slider label="prior π(P) — for Bayes error" value={priorP} min={0.05} max={0.95} step={0.05} onChange={setPriorP} format={v => v.toFixed(2)} />
      <table className="db-table">
        <thead>
          <tr><th>measure</th><th>value</th><th>kind</th></tr>
        </thead>
        <tbody>
          {FAMILY.map(m => {
            const v = m.compute(P, Q, ctx);
            return (
              <tr key={m.id} title={m.note}>
                <td><span className="db-sym">{m.symbol}</span> {m.label}</td>
                <td className="db-val">{fmtMeasure(v, m.method)}</td>
                <td className="db-tags">
                  {m.bounded ? <i className="db-tag b" title="bounded in [0,1]">[0,1]</i> : <i className="db-tag u" title="unbounded">∞</i>}
                  {m.metric ? <i className="db-tag m" title="a true metric">M</i> : <i className="db-tag d" title="a divergence, not a metric">÷</i>}
                  {m.method === 'numeric' && <i className="db-tag n" title="numeric (no Gaussian closed form)">≈</i>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="db-rel">
        <div>Pₑ = ½(1 − TV) = <strong>{fmt(0.5 * (1 - overlap.tv), 3)}</strong> {priorP === 0.5 ? '✓' : '(equal-prior identity)'}</div>
        <div>Pₑ ≤ ½·BC = <strong>{fmt(bhatBound, 3)}</strong> {overlap.bayesError <= bhatBound + 1e-3 ? '✓' : ''}</div>
        <div>TV ≤ √(KL/2) = <strong>{fmt(pinskerRHS, 3)}</strong> {overlap.tv <= pinskerRHS + 1e-3 ? '✓ (Pinsker)' : ''}</div>
      </div>
      <p className="db-hint">A bounded stack (TV, Hellinger, Pₑ) with <strong>KL the unbounded outlier</strong>. Values marked <em>≈ num</em> have no Gaussian closed form (the decision boundary is a conic) and are integrated numerically.</p>
    </>
  );

  const sections: SectionDef[] = [
    { id: 'bells', title: 'The two bells', arch: 'subject', node: bellsNode, estHeight: 470 },
    { id: 'display', title: 'Display', arch: 'marks', node: displayNode, estHeight: 170 },
    { id: 'readout', title: 'Separation & divergence', arch: 'readout', node: readoutNode, estHeight: 340 },
    { id: 'yardsticks', title: 'The yardstick family', arch: 'lab', node: yardsticksNode, estHeight: 430 },
  ];

  const views: ViewDef[] = [
    {
      id: 'plane',
      title: 'The plane',
      hint: 'drag P and Q — watch the divergence',
      node: (
        <BellsPlane
          P={dP} Q={dQ} extent={6}
          show1={show1} show2={show2} showFill={showFill} showVector={showVector}
          field={field} priorP={priorP} whitened={whiten !== 'off'}
          onDragMean={onDragMean}
        />
      ),
      defaultRect: { x: 372, y: 16, w: 720, h: 720 },
    },
  ];

  const layouts: LayoutDef[] = [
    { id: 'essentials', name: 'Essentials', sub: 'Bells · KL & Mahalanobis', icon: 'tune', open: { bells: { x: 84, y: 18 }, readout: { x: 84, y: 500 } } },
    { id: 'measures', name: 'All measures', sub: 'Bells · the yardstick family', icon: 'grid', open: { bells: { x: 84, y: 18 }, yardsticks: { x: 84, y: 500 } } },
  ];

  return (
    <Workspace
      appId={NS}
      title="Division Bells"
      subtitle={`KL(P‖Q)=${fmt(klPQ)} · dₘ=${fmt(dMdir)}σ`}
      sections={sections}
      views={views}
      layouts={layouts}
      defaultLayoutId="essentials"
      immersive
      explainer={explainerText}
    />
  );
}
