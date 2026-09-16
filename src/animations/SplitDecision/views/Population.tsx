/**
 * The Population — every individual as two strips (p over rows, q over columns),
 * sorted by fitness, re-labeled to the fittest individual's convention. Sex is
 * marked by shape (filled vs outlined), never by hue alone.
 */

import React, { useEffect, useRef, useState } from 'react';
import type { BinaryMatrix } from '../matrix';
import { canonicalizeTo } from '../evolve';
import type { WatchSnapshot } from '../useWatchLoop';

interface Props {
  M: BinaryMatrix;
  snapshot: WatchSnapshot | null;
  orientationBlind: boolean;
  showSexes: boolean;
}

/** Re-render at most every `ms`: the population view is the heaviest DOM. */
function useThrottled<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  const last = useRef(0);
  const pending = useRef<T>(value);
  useEffect(() => {
    pending.current = value;
    const now = performance.now();
    if (now - last.current >= ms) { last.current = now; setV(value); return; }
    const t = setTimeout(() => { last.current = performance.now(); setV(pending.current); }, ms - (now - last.current));
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function Population({ M, snapshot, orientationBlind, showSexes }: Props) {
  const snap = useThrottled(snapshot, 150);
  if (!snap) return <div className="sd-empty">Press Play to start a population.</div>;
  const { m, n } = M;
  const best = snap.pop[snap.stats.bestIdx];
  const rows = snap.pop.map((ind, idx) => ({ ind, idx, g: canonicalizeTo(best, ind, orientationBlind).genome })).sort((a, b) => b.ind.fit - a.ind.fit);
  const fits = snap.pop.map(x => x.fit);
  const fMin = Math.min(...fits), fMax = Math.max(...fits);
  const sexW = showSexes ? 1.6 : 0;
  const cols = sexW + m + 0.6 + n + 0.6 + 4;
  const N = rows.length;
  const rects: React.ReactNode[] = [];
  rows.forEach((r, k) => {
    const y = k;
    if (showSexes) {
      rects.push(r.ind.sex === 'row'
        ? <rect key={`s${r.idx}`} className="sd-sex row" x={0.2} y={y + 0.2} width={1} height={0.6} />
        : <rect key={`s${r.idx}`} className="sd-sex col" x={0.2} y={y + 0.2} width={1} height={0.6} />);
    }
    r.g.p.forEach((v, i) => rects.push(<rect key={`p${r.idx}-${i}`} className="sd-gene" x={sexW + i} y={y} width={1} height={1} style={{ opacity: v }} />));
    r.g.q.forEach((v, j) => rects.push(<rect key={`q${r.idx}-${j}`} className="sd-gene" x={sexW + m + 0.6 + j} y={y} width={1} height={1} style={{ opacity: v }} />));
    const fw = fMax > fMin ? (r.ind.fit - fMin) / (fMax - fMin) : 1;
    rects.push(<rect key={`f${r.idx}`} className="sd-fit" x={sexW + m + 0.6 + n + 0.6} y={y + 0.2} width={fw * 4} height={0.6} />);
  });
  return (
    <div className="sd-popwrap">
      <div className="sd-poplegend"><span>rows p</span><span>columns q</span><span>fitness</span>{showSexes && <span>▮ row-sex · ▯ column-sex</span>}</div>
      <svg className="sd-pop" viewBox={`0 0 ${cols} ${N}`} preserveAspectRatio="none">
        <rect className="sd-sep" x={sexW + m} y={0} width={0.6} height={N} />
        {rects}
      </svg>
    </div>
  );
}
