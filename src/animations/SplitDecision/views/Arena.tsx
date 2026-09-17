/**
 * The Arena — the matrix as a DOM grid whose rows and columns reorder themselves
 * by the population's consensus genome. Cells are keyed by (i, j) and positioned
 * with transforms, so a new order is a transition, not a re-mount. Ones are filled
 * squares in --fg; the cross blocks of the consensus cut carry one faint tint.
 *
 * The grid is memoized on what actually moves it — the order, the cell size and the
 * consensus cut, all of which refresh on the loop's slow cadence — so a running
 * population does not rebuild a few hundred cells every frame. Hover is an overlay
 * band rather than a class on each cell, for the same reason.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { BinaryMatrix, Cut, Degrees } from '../matrix';
import { roundedCut, type Genome } from '../evolve';
import type { WatchSnapshot } from '../useWatchLoop';

export interface ArenaOptions {
  showPlanted: boolean;
  tint: boolean;
  paint: boolean;
  animate: boolean;
}

/** Display order for the loci, plus where the cut divides each half.
 *
 *  `rowSplit` is the index in `rows` at which the first group ends — so rows
 *  `[0, rowSplit)` are R₁ and `[rowSplit, m)` are R₂ — and `null` when the order
 *  does not group by the cut at all (the stored, shuffled order). The views draw
 *  their block rules from it, so both pictures cut in the same places. */
export interface LocusOrder {
  rows: number[];
  cols: number[];
  rowSplit: number | null;
  colSplit: number | null;
}

interface Props {
  M: BinaryMatrix;
  d: Degrees;
  snapshot: WatchSnapshot | null;
  planted: Cut | null;
  orientationBlind: boolean;
  options: ArenaOptions;
  /** Shared with the Linkage view so the two pictures line up. */
  order: LocusOrder;
  onToggleCell: (i: number, j: number) => void;
}

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

export function Arena({ M, d, snapshot, planted, options, order, onToggleCell }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const { w: W, h: H } = useSize(wrap);
  const [hover, setHover] = useState<{ i: number; j: number } | null>(null);
  const { m, n } = M;

  // `consensus`, `spreadP` and `spreadQ` come from the loop's slow cadence, so their
  // identity is stable between refreshes and every memo below keys off them.
  const consensus: Genome | null = snapshot?.stats.consensus ?? null;
  const spreadP = snapshot?.stats.spreadP ?? null;
  const spreadQ = snapshot?.stats.spreadQ ?? null;

  const rowPos = useMemo(() => { const p = new Array<number>(m); order.rows.forEach((i, k) => { p[i] = k; }); return p; }, [order, m]);
  const colPos = useMemo(() => { const p = new Array<number>(n); order.cols.forEach((j, k) => { p[j] = k; }); return p; }, [order, n]);

  const stripL = 30 + (options.showPlanted ? 8 : 0);
  const stripT = 30 + (options.showPlanted ? 8 : 0);
  const cs = Math.max(3, Math.min(30, Math.floor(Math.min((W - stripL - 8) / n, (H - stripT - 26) / m))));
  const cut = useMemo(() => (consensus ? roundedCut(consensus) : null), [consensus]);

  const cells = useMemo(() => {
    const out: React.ReactNode[] = [];
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < n; j++) {
        const one = M.cells[i * n + j] === 1;
        const cross = options.tint && cut ? cut.z[i] !== cut.w[j] : false;
        out.push(
          <div key={`${i}-${j}`} data-i={i} data-j={j}
            className={`sd-cell${one ? ' one' : ''}${cross ? ' cross' : ''}`}
            style={{ width: cs, height: cs, transform: `translate(${stripL + colPos[j] * cs}px, ${stripT + rowPos[i] * cs}px)` }} />,
        );
      }
    }
    return out;
  }, [M, m, n, cs, cut, options.tint, rowPos, colPos, stripL, stripT]);

  const rowBars = useMemo(() => {
    const out: React.ReactNode[] = [];
    for (let i = 0; i < m; i++) {
      // Indexed reads are total: a snapshot shorter than the matrix should draw a
      // neutral bar, never take the whole route down (SplitDecision gates a stale
      // snapshot, and this keeps the view honest if one ever slips through).
      const v = consensus?.p[i] ?? 0.5;
      const [lo, hi] = spreadP?.[i] ?? [v, v];
      out.push(
        <div key={i} className="sd-rbar" style={{ transform: `translate(0px, ${stripT + rowPos[i] * cs}px)`, height: cs }}>
          {options.showPlanted && planted && <i className={`sd-pl${planted.z[i] ? ' in' : ''}`} />}
          <span className="sd-bar" style={{ width: `${v * 100}%` }} />
          <span className="sd-whisk" style={{ left: `${lo * 100}%`, width: `${Math.max(0, hi - lo) * 100}%` }} />
        </div>,
      );
    }
    return out;
  }, [m, consensus, spreadP, rowPos, cs, stripT, options.showPlanted, planted]);

  const colBars = useMemo(() => {
    const out: React.ReactNode[] = [];
    for (let j = 0; j < n; j++) {
      const v = consensus?.q[j] ?? 0.5;
      const [lo, hi] = spreadQ?.[j] ?? [v, v];
      out.push(
        <div key={j} className="sd-cbar" style={{ transform: `translate(${stripL + colPos[j] * cs}px, 0px)`, width: cs }}>
          {options.showPlanted && planted && <i className={`sd-pl${planted.w[j] ? ' in' : ''}`} />}
          <span className="sd-bar" style={{ height: `${v * 100}%` }} />
          <span className="sd-whisk" style={{ bottom: `${lo * 100}%`, height: `${Math.max(0, hi - lo) * 100}%` }} />
        </div>,
      );
    }
    return out;
  }, [n, consensus, spreadQ, colPos, cs, stripL, options.showPlanted, planted]);

  const onMove = (e: React.PointerEvent) => {
    const t = e.target as HTMLElement;
    if (t.dataset.i === undefined) { if (hover) setHover(null); return; }
    const i = +t.dataset.i, j = +t.dataset.j!;
    if (!hover || hover.i !== i || hover.j !== j) setHover({ i, j });
  };
  const onClick = (e: React.MouseEvent) => {
    const t = e.target as HTMLElement;
    if (t.dataset.i === undefined) return;
    const i = +t.dataset.i, j = +t.dataset.j!;
    if (options.paint) onToggleCell(i, j); else setHover({ i, j });
  };

  let caption = order.rowSplit === null
    ? 'hover a cell · stored order — the split is not in the layout'
    : 'hover a cell · rows and columns grouped by the split, rule at the boundary';
  if (hover && cut) {
    const a = cut.z[hover.i] ? 'R₁' : 'R₂', b = cut.w[hover.j] ? 'C₁' : 'C₂';
    const role = cut.z[hover.i] !== cut.w[hover.j] ? 'cross block' : 'diagonal block';
    caption = `row ${hover.i + 1} (degree ${d.r[hover.i]}) · column ${hover.j + 1} (degree ${d.c[hover.j]}) · ${a}×${b}, ${role}${M.cells[hover.i * n + hover.j] ? ' · a one' : ''}`;
  }

  return (
    <div ref={wrap} className={`sd-arena${options.animate ? '' : ' fast'}${options.paint ? ' paint' : ''}`}>
      <div className="sd-grid" style={{ width: stripL + n * cs, height: stripT + m * cs }}
        onPointerMove={onMove} onPointerLeave={() => setHover(null)} onClick={onClick}>
        <div className="sd-strip-l" style={{ width: stripL - 4 }}>{rowBars}</div>
        <div className="sd-strip-t" style={{ height: stripT - 4 }}>{colBars}</div>
        {cells}
        {/* The block rules: where the split divides the rows and the columns. Same
            boundaries the correlation matrix rules, so the two pictures agree. */}
        {order.rowSplit !== null && order.rowSplit > 0 && order.rowSplit < m && (
          <div className="sd-blockrule sd-blockrule-h"
            style={{ transform: `translate(${stripL}px, ${stripT + order.rowSplit * cs}px)`, width: n * cs }} />
        )}
        {order.colSplit !== null && order.colSplit > 0 && order.colSplit < n && (
          <div className="sd-blockrule sd-blockrule-v"
            style={{ transform: `translate(${stripL + order.colSplit * cs}px, ${stripT}px)`, height: m * cs }} />
        )}
        {hover && (
          <>
            <div className="sd-hov-row" style={{ transform: `translate(${stripL}px, ${stripT + rowPos[hover.i] * cs}px)`, width: n * cs, height: cs }} />
            <div className="sd-hov-col" style={{ transform: `translate(${stripL + colPos[hover.j] * cs}px, ${stripT}px)`, width: cs, height: m * cs }} />
          </>
        )}
      </div>
      <div className="sd-caption">{caption}</div>
    </div>
  );
}
