/**
 * The Linkage view — the correlation matrix between loci across the population.
 *
 * Every pair of the m + n loci gets a Pearson correlation measured over the N
 * individuals, drawn as a heatmap on a divergent map (zero is the pale middle).
 * Rows and columns are ordered by the same consensus sort as the Arena, so the
 * blocks line up with the picture next door, and the two halves of the genome are
 * separated by a rule.
 *
 * This is the one view that shows the reproductive rule acting on the *population*
 * rather than on individuals — see `linkage.ts` for what each rule predicts.
 *
 * Canvas, not elements: (m + n)² is 6400 cells on a 40×40 matrix.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import type { BinaryMatrix } from '../matrix';
import { linkage, type Linkage as LinkageData } from '../linkage';
import { RULES, type RuleId } from '../evolve';
import { hexToRgb, sampleContinuous, themeMapsFor } from '../../../lib/colormapRegistry';
import { useThemeId } from '../../../chrome/skins';
import { useThemeTokens } from '../../../chrome/useThemeTokens';
import type { LocusOrder } from './Arena';
import type { WatchSnapshot } from '../useWatchLoop';

interface Props {
  M: BinaryMatrix;
  snapshot: WatchSnapshot | null;
  orientationBlind: boolean;
  rule: RuleId;
  /** Locus display order and block boundaries — the same object the Arena lays out
   *  by, so the two pictures cut in the same places. */
  order: LocusOrder;
}

const LUT_N = 65;
/** Where the divergent scale saturates.
 *
 *  Correlations here live near the noise floor — the independence baseline is
 *  √(2/π)/√N ≈ 0.07 at N = 128 and a strongly linked block averages ~0.2 — so a map
 *  spread over the full [−1, +1] renders every real structure as a pale wash and
 *  gives the only saturated color to the diagonal, which is 1 by definition and says
 *  nothing. Clipping at ±0.5 spends the scale where the data is. It is a CONSTANT,
 *  not an auto-fit: auto-normalizing per frame would make the Mixer's noise as loud
 *  as the Monastery's signal and destroy the comparison the view exists for. */
const COLOR_MAX = 0.5;
/** Block wash: how far a block's mean |r| must exceed the independence baseline to
 *  reach full tint. Roughly the Monastery's within-block reading. */
const BLOCK_SPAN = 0.16;
const BLOCK_ALPHA = 0.5;

/** The display groups: each half split by the cut, or left whole when the order does
 *  not group (the stored order). Returned as [start, end) in display space. */
function groupsOf(m: number, n: number, rowSplit: number | null, colSplit: number | null): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  const half = (base: number, len: number, at: number | null) => {
    if (at !== null && at > 0 && at < len) { out.push([base, base + at]); out.push([base + at, base + len]); }
    else out.push([base, base + len]);
  };
  half(0, m, rowSplit);
  half(m, n, colSplit);
  return out;
}

export function Linkage({ M, snapshot, orientationBlind, rule, order }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const themeId = useThemeId();
  const tokens = useThemeTokens(['border', 'panel-2', 'fg', 'dim-2'], wrap);
  const mapId = useMemo(() => themeMapsFor('divergent', themeId)[0] ?? 'rdbu', [themeId]);

  // The correlation is computed from the population snapshot, which the loop
  // republishes on its slow cadence — so this is not per-frame work.
  const lk: LinkageData | null = useMemo(() => {
    if (!snapshot || snapshot.pop.length < 2) return null;
    return linkage(snapshot.pop, snapshot.pop[snapshot.stats.bestIdx], orientationBlind, M.m, M.n);
  }, [snapshot, orientationBlind, M.m, M.n]);

  useEffect(() => {
    const el = canvas.current, box = wrap.current;
    if (!el || !box || !lk) return;
    const draw = () => {
      const side = Math.min(box.clientWidth, box.clientHeight);
      if (side <= 0) return;                       // collapsed view: nothing to do
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      el.width = Math.round(side * dpr); el.height = Math.round(side * dpr);
      el.style.width = `${side}px`; el.style.height = `${side}px`;
      const ctx = el.getContext('2d');
      if (!ctx) return;

      const { m, n } = M;
      const L = m + n;
      // Display order: the Arena's rows then its columns, mapped to locus indices.
      const loci = [...order.rows, ...order.cols.map(j => m + j)];
      const groups = groupsOf(m, n, order.rowSplit, order.colSplit);

      const lut: Array<[number, number, number]> = [];
      for (let k = 0; k < LUT_N; k++) lut.push(hexToRgb(sampleContinuous(mapId, k / (LUT_N - 1))));
      const colorOf = (r: number) => {
        const t = Math.max(0, Math.min(1, (Math.max(-COLOR_MAX, Math.min(COLOR_MAX, r)) / COLOR_MAX + 1) / 2));
        return lut[Math.round(t * (LUT_N - 1))];
      };

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, side, side);
      const cell = side / L;

      // ── the block layer ──────────────────────────────────────────────────────
      // Mean |r| over each pair of groups, washed behind that block. This is the
      // level the view is actually about: a rule's signature is which BLOCKS are
      // linked, not which individual pair of loci is. The wash is neutral (--fg at
      // an alpha), never a hue — it carries magnitude only, and the cells keep the
      // divergent map for sign.
      const blockMean = (ga: [number, number], gb: [number, number]) => {
        let sum = 0, count = 0;
        for (let y = ga[0]; y < ga[1]; y++) {
          for (let x = gb[0]; x < gb[1]; x++) {
            if (loci[y] === loci[x]) continue;                // the diagonal is 1 by definition
            sum += Math.abs(lk.r[loci[y] * L + loci[x]]); count++;
          }
        }
        return count ? sum / count : 0;
      };
      const fg = tokens['fg'] || '#e8ecf5';
      for (const ga of groups) {
        for (const gb of groups) {
          const excess = (blockMean(ga, gb) - lk.meanAbsNull) / BLOCK_SPAN;
          const a = Math.max(0, Math.min(1, excess)) * BLOCK_ALPHA;
          if (a <= 0.003) continue;
          ctx.globalAlpha = a;
          ctx.fillStyle = fg;
          ctx.fillRect(gb[0] * cell, ga[0] * cell, (gb[1] - gb[0]) * cell, (ga[1] - ga[0]) * cell);
        }
      }
      ctx.globalAlpha = 1;

      // ── the cells ────────────────────────────────────────────────────────────
      // Inset by a hairline so the block wash shows through as a lattice between
      // them, and the diagonal drawn neutral: it is 1 everywhere and would otherwise
      // be the loudest thing on screen for no information.
      const inset = Math.min(1, cell * 0.08);
      const diag = tokens['dim-2'] || tokens['border'] || '#7b8496';
      for (let y = 0; y < L; y++) {
        for (let x = 0; x < L; x++) {
          if (loci[y] === loci[x]) { ctx.globalAlpha = 0.35; ctx.fillStyle = diag; }
          else {
            const [cr, cg, cb] = colorOf(lk.r[loci[y] * L + loci[x]]);
            ctx.globalAlpha = 0.9;                            // lets the block wash read through
            ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
          }
          ctx.fillRect(x * cell + inset, y * cell + inset, cell - 2 * inset, cell - 2 * inset);
        }
      }
      ctx.globalAlpha = 1;

      // ── the rules ────────────────────────────────────────────────────────────
      // Every group boundary, with the row/column half boundary heavier: the same
      // places the Arena rules, so the two pictures agree on where the blocks are.
      // --border is a hairline meant for panel edges (0.13 alpha in the default
      // skin) and vanishes over the cells; these rules carry structure, so they get
      // --fg at the same weight the Arena's rules use.
      ctx.strokeStyle = fg;
      ctx.globalAlpha = 0.42;
      for (const [start] of groups) {
        if (start === 0) continue;
        ctx.lineWidth = start === m ? 1.75 : 0.75;
        const at = start * cell;
        ctx.beginPath();
        ctx.moveTo(at, 0); ctx.lineTo(at, side);
        ctx.moveTo(0, at); ctx.lineTo(side, at);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(box);
    return () => ro.disconnect();
  }, [M, lk, order, mapId, tokens]);

  if (!lk) return <div className="sd-empty">Press Play to start a population.</div>;

  const strong = (v: number) => (v > lk.meanAbsNull * 2 ? 'hi' : v > lk.meanAbsNull * 1.3 ? 'mid' : 'lo');
  const fmt = (v: number) => v.toFixed(3);
  const expectation: Record<RuleId, string> = {
    clonal: 'whole genomes are copied, so associations selection builds are inherited: every block should stay above the independence line.',
    mixer: 'every locus is an independent coin flip between two parents, which breaks associations — all three should fall to the independence line (linkage equilibrium).',
    prom: 'the row half and the column half come from different parents chosen independently, so the ACROSS block should collapse to the independence line while the within-half blocks stay high.',
  };

  return (
    <div className="sd-linkwrap">
      <div className="sd-poplegend">
        <span>correlation between loci, across the {lk.n_} individuals</span>
        <span className="dim">{lk.varying} of {lk.m + lk.n} loci still vary</span>
      </div>
      <div className="sd-linkcanvas" ref={wrap}><canvas ref={canvas} /></div>
      <div className="sd-linkstats">
        <div className={`sd-linkstat ${strong(lk.meanAbsPP)}`}><b>{fmt(lk.meanAbsPP)}</b><span>within rows</span></div>
        <div className={`sd-linkstat ${strong(lk.meanAbsQQ)}`}><b>{fmt(lk.meanAbsQQ)}</b><span>within columns</span></div>
        <div className={`sd-linkstat ${strong(lk.meanAbsPQ)}`}><b>{fmt(lk.meanAbsPQ)}</b><span>ACROSS the halves</span></div>
        <div className="sd-linkstat null"><b>{fmt(lk.meanAbsNull)}</b><span>if loci were independent</span></div>
      </div>
      <p className="sd-note">
        Mean |r| per block. <b>{RULES[rule].name}</b>: {expectation[rule]} A single cell needs
        |r| above {fmt(lk.cellNoise)} to mean anything at this population size; the means are
        compared against {fmt(lk.meanAbsNull)}, which is what they read when nothing is linked.
      </p>
      <p className="sd-note dim">
        Each block is lit by how far its mean |r| runs above that line, so a rule's
        signature is the pattern of lit blocks; cells inside carry the sign, on a scale
        that saturates at |r| = {COLOR_MAX.toFixed(1)} — fixed, not fitted, so a flat
        matrix stays flat instead of being stretched to look structured.
        {order.rowSplit === null
          ? ' The stored locus order does not group by the split, so only the row/column halves are ruled.'
          : ' Rules mark the split, in the same places the Arena rules it.'}
      </p>
    </div>
  );
}
