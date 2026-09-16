/**
 * The Arena — the matrix as a DOM grid whose rows and columns reorder themselves
 * by the population's consensus genome. Cells are keyed by (i, j) and positioned
 * with transforms, so a new order is a transition, not a re-mount. Ones are filled
 * squares in --fg; the cross blocks of the consensus cut carry one faint tint.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { BinaryMatrix, Cut, Degrees } from '../matrix';
import { canonicalizeTo, roundedCut, type Genome, type Individual } from '../evolve';
import type { WatchSnapshot } from '../useWatchLoop';

export interface ArenaOptions {
  sort: boolean;
  showPlanted: boolean;
  tint: boolean;
  paint: boolean;
  animate: boolean;
}

interface Props {
  M: BinaryMatrix;
  d: Degrees;
  snapshot: WatchSnapshot | null;
  planted: Cut | null;
  orientationBlind: boolean;
  options: ArenaOptions;
  onToggleCell: (i: number, j: number) => void;
}

const SORT_INTERVAL_MS = 250;

function useSize(ref: React.RefObject<HTMLDivElement | null>) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

/** Per-locus interquartile range of the canonicalized population. */
function spread(pop: Individual[], best: Genome, orientationBlind: boolean, m: number, n: number) {
  const P = Array.from({ length: m }, () => [] as number[]);
  const Q = Array.from({ length: n }, () => [] as number[]);
  for (const ind of pop) {
    const { genome } = canonicalizeTo(best, ind, orientationBlind);
    genome.p.forEach((v, i) => P[i].push(v));
    genome.q.forEach((v, j) => Q[j].push(v));
  }
  const iqr = (a: number[]) => { const s = a.slice().sort((x, y) => x - y); return [s[Math.floor(s.length * 0.25)], s[Math.floor(s.length * 0.75)]] as [number, number]; };
  return { p: P.map(iqr), q: Q.map(iqr) };
}

export function Arena({ M, d, snapshot, planted, orientationBlind, options, onToggleCell }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const { w: W, h: H } = useSize(wrap);
  const [hover, setHover] = useState<{ i: number; j: number } | null>(null);
  const { m, n } = M;

  const consensus = snapshot?.stats.consensus ?? null;
  const best = snapshot ? snapshot.pop[snapshot.stats.bestIdx] : null;
  const iq = useMemo(() => (snapshot && best ? spread(snapshot.pop, best, orientationBlind, m, n) : null), [snapshot, best, orientationBlind, m, n]);

  // Throttled reorder: at most every SORT_INTERVAL_MS, keyed on the consensus genome.
  const [order, setOrder] = useState<{ rows: number[]; cols: number[] }>({ rows: Array.from({ length: m }, (_, i) => i), cols: Array.from({ length: n }, (_, j) => j) });
  const lastSort = useRef(0);
  useEffect(() => {
    const identity = { rows: Array.from({ length: m }, (_, i) => i), cols: Array.from({ length: n }, (_, j) => j) };
    if (!options.sort || !consensus) { setOrder(identity); return; }
    const now = performance.now();
    if (now - lastSort.current < SORT_INTERVAL_MS && snapshot && snapshot.gen > 0) return;
    lastSort.current = now;
    const rows = identity.rows.slice().sort((a, b) => (consensus.p[b] - consensus.p[a]) || (a - b));
    const cols = identity.cols.slice().sort((a, b) => (consensus.q[b] - consensus.q[a]) || (a - b));
    setOrder({ rows, cols });
  }, [consensus, options.sort, m, n, snapshot]);

  const rowPos = useMemo(() => { const p = new Array<number>(m); order.rows.forEach((i, k) => { p[i] = k; }); return p; }, [order, m]);
  const colPos = useMemo(() => { const p = new Array<number>(n); order.cols.forEach((j, k) => { p[j] = k; }); return p; }, [order, n]);

  const stripL = 30 + (options.showPlanted ? 8 : 0);
  const stripT = 30 + (options.showPlanted ? 8 : 0);
  const cs = Math.max(3, Math.min(30, Math.floor(Math.min((W - stripL - 8) / n, (H - stripT - 26) / m))));
  const cut = consensus ? roundedCut(consensus) : null;

  const cells: React.ReactNode[] = [];
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      const one = M.cells[i * n + j] === 1;
      const cross = options.tint && cut ? cut.z[i] !== cut.w[j] : false;
      const hov = hover && (hover.i === i || hover.j === j);
      cells.push(
        <div key={`${i}-${j}`} data-i={i} data-j={j}
          className={`sd-cell${one ? ' one' : ''}${cross ? ' cross' : ''}${hov ? ' hov' : ''}`}
          style={{ width: cs, height: cs, transform: `translate(${stripL + colPos[j] * cs}px, ${stripT + rowPos[i] * cs}px)` }} />,
      );
    }
  }

  const rowBars: React.ReactNode[] = [];
  for (let i = 0; i < m; i++) {
    const v = consensus ? consensus.p[i] : 0.5;
    const [lo, hi] = iq ? iq.p[i] : [v, v];
    rowBars.push(
      <div key={i} className="sd-rbar" style={{ transform: `translate(0px, ${stripT + rowPos[i] * cs}px)`, height: cs }}>
        {options.showPlanted && planted && <i className={`sd-pl${planted.z[i] ? ' in' : ''}`} />}
        <span className="sd-bar" style={{ width: `${v * 100}%` }} />
        <span className="sd-whisk" style={{ left: `${lo * 100}%`, width: `${Math.max(0, hi - lo) * 100}%` }} />
      </div>,
    );
  }
  const colBars: React.ReactNode[] = [];
  for (let j = 0; j < n; j++) {
    const v = consensus ? consensus.q[j] : 0.5;
    const [lo, hi] = iq ? iq.q[j] : [v, v];
    colBars.push(
      <div key={j} className="sd-cbar" style={{ transform: `translate(${stripL + colPos[j] * cs}px, 0px)`, width: cs }}>
        {options.showPlanted && planted && <i className={`sd-pl${planted.w[j] ? ' in' : ''}`} />}
        <span className="sd-bar" style={{ height: `${v * 100}%` }} />
        <span className="sd-whisk" style={{ bottom: `${lo * 100}%`, height: `${Math.max(0, hi - lo) * 100}%` }} />
      </div>,
    );
  }

  const onMove = (e: React.PointerEvent) => {
    const t = e.target as HTMLElement;
    if (t.dataset.i === undefined) return;
    const i = +t.dataset.i, j = +t.dataset.j!;
    if (!hover || hover.i !== i || hover.j !== j) setHover({ i, j });
  };
  const onClick = (e: React.MouseEvent) => {
    const t = e.target as HTMLElement;
    if (t.dataset.i === undefined) return;
    const i = +t.dataset.i, j = +t.dataset.j!;
    if (options.paint) onToggleCell(i, j); else setHover({ i, j });
  };

  let caption = 'hover a cell · rows sort by p̄, columns by q̄';
  if (hover && cut) {
    const a = cut.z[hover.i] ? 'R₁' : 'R₂', b = cut.w[hover.j] ? 'C₁' : 'C₂';
    const role = cut.z[hover.i] !== cut.w[hover.j] ? 'cross block' : 'diagonal block';
    caption = `row ${hover.i + 1} (degree ${d.r[hover.i]}) · column ${hover.j + 1} (degree ${d.c[hover.j]}) · ${a}×${b}, ${role}${M.cells[hover.i * n + hover.j] ? ' · a one' : ''}`;
  }

  return (
    <div ref={wrap} className={`sd-arena${options.animate ? '' : ' fast'}${options.paint ? ' paint' : ''}`}>
      <div className="sd-grid" style={{ width: stripL + n * cs, height: stripT + m * cs }} onPointerMove={onMove} onPointerLeave={() => setHover(null)} onClick={onClick}>
        <div className="sd-strip-l" style={{ width: stripL - 4 }}>{rowBars}</div>
        <div className="sd-strip-t" style={{ height: stripT - 4 }}>{colBars}</div>
        {cells}
      </div>
      <div className="sd-caption">{caption}</div>
    </div>
  );
}
