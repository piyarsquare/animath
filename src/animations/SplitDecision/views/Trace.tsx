/**
 * The Trace — fitness over generations (best-rounded, mean; the planted and exact
 * optimum as reference lines) and the three entropy curves (sampled · rounded ·
 * neutral), which are what "the genome makes up its mind" is read against.
 */

import React, { useMemo } from 'react';
import type { TracePoint } from '../useWatchLoop';

interface Props {
  history: TracePoint[];
  optimum: number | null;
  plantedScore: number | null;
  units: string;
}

const W = 600, H = 150;

function path(pts: TracePoint[], y: (p: TracePoint) => number, xMax: number, yMin: number, yMax: number): string {
  const sx = (g: number) => (g / Math.max(1, xMax)) * W;
  const sy = (v: number) => H - ((v - yMin) / (yMax - yMin || 1)) * H;
  return pts.map((p, i) => `${i ? 'L' : 'M'}${sx(p.gen).toFixed(1)},${sy(y(p)).toFixed(1)}`).join(' ');
}

export function Trace({ history, optimum, plantedScore, units }: Props) {
  // The loop mutates one history array in place, so the memo keys on its length
  // (and the y-axis inputs) rather than its identity.
  const n = history.length;
  const view = useMemo(() => {
    if (!n) return null;
    const k = Math.max(1, Math.ceil(n / 600));
    const pts = history.filter((_, i) => i % k === 0);
    if (pts[pts.length - 1] !== history[n - 1]) pts.push(history[n - 1]);
    const xMax = Math.max(10, history[n - 1].gen);
    const fitVals = pts.flatMap(p => [p.best, p.mean]);
    if (optimum !== null) fitVals.push(optimum);
    if (plantedScore !== null) fitVals.push(plantedScore);
    let fMin = Math.min(...fitVals), fMax = Math.max(...fitVals);
    if (fMax - fMin < 1e-9) { fMin -= 1; fMax += 1; }
    const pad = (fMax - fMin) * 0.06;
    fMin -= pad; fMax += pad;
    const eMax = 1.02;
    return {
      xMax, fMin, fMax,
      dMean: path(pts, p => p.mean, xMax, fMin, fMax),
      dBest: path(pts, p => p.best, xMax, fMin, fMax),
      dNeut: path(pts, p => p.neutral, xMax, 0, eMax),
      dRound: path(pts, p => p.rounded, xMax, 0, eMax),
      dSamp: path(pts, p => p.entropy, xMax, 0, eMax),
    };
  }, [history, n, optimum, plantedScore]);
  if (!view) return <div className="sd-empty">No generations yet.</div>;
  const { xMax, fMin, fMax } = view;
  const sy = (v: number) => H - ((v - fMin) / (fMax - fMin)) * H;
  const fmt = (v: number) => (Math.abs(v) >= 100 ? v.toFixed(0) : Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(2));
  return (
    <div className="sd-trace">
      <div className="sd-tr-head">
        <b>fitness</b> <span className="u">({units})</span>
        <span className="lg l-best">best (rounded)</span><span className="lg l-mean">mean</span>
        {optimum !== null && <span className="lg l-opt">exact optimum {fmt(optimum)}</span>}
        {plantedScore !== null && <span className="lg l-pl">planted {fmt(plantedScore)}</span>}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="sd-chart">
        {optimum !== null && <line className="ref opt" x1={0} x2={W} y1={sy(optimum)} y2={sy(optimum)} />}
        {plantedScore !== null && <line className="ref pl" x1={0} x2={W} y1={sy(plantedScore)} y2={sy(plantedScore)} />}
        <path className="ln mean" d={view.dMean} />
        <path className="ln best" d={view.dBest} />
      </svg>
      <div className="sd-tr-axis"><span>{fmt(fMax)}</span><span>gen 0 … {xMax}</span><span>{fmt(fMin)}</span></div>
      <div className="sd-tr-head">
        <b>genome entropy</b> <span className="u">(bits per locus)</span>
        <span className="lg l-samp">sampled</span><span className="lg l-round">rounded twin</span><span className="lg l-neut">neutral twin (k = 1)</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="sd-chart">
        <path className="ln neut" d={view.dNeut} />
        <path className="ln round" d={view.dRound} />
        <path className="ln samp" d={view.dSamp} />
      </svg>
      <div className="sd-tr-axis"><span>1</span><span>gen 0 … {xMax}</span><span>0</span></div>
    </div>
  );
}
