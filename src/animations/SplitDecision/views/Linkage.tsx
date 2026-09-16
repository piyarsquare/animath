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
import type { WatchSnapshot } from '../useWatchLoop';

interface Props {
  M: BinaryMatrix;
  snapshot: WatchSnapshot | null;
  orientationBlind: boolean;
  rule: RuleId;
  /** Locus display order: row indices then column indices, as the Arena sorts them. */
  order: { rows: number[]; cols: number[] };
}

const LUT_N = 65;

export function Linkage({ M, snapshot, orientationBlind, rule, order }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const themeId = useThemeId();
  const tokens = useThemeTokens(['border', 'panel-2'], wrap);
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
      // Display order: sorted rows, then sorted columns, mapped to locus indices.
      const loci = [...order.rows, ...order.cols.map(j => m + j)];

      const lut: Array<[number, number, number]> = [];
      for (let k = 0; k < LUT_N; k++) lut.push(hexToRgb(sampleContinuous(mapId, k / (LUT_N - 1))));

      const img = ctx.createImageData(L, L);
      const px = img.data;
      for (let y = 0; y < L; y++) {
        for (let x = 0; x < L; x++) {
          const r = lk.r[loci[y] * L + loci[x]];
          const t = Math.max(0, Math.min(1, (r + 1) / 2));
          const [cr, cg, cb] = lut[Math.round(t * (LUT_N - 1))];
          const o = (y * L + x) * 4;
          px[o] = cr; px[o + 1] = cg; px[o + 2] = cb; px[o + 3] = 255;
        }
      }
      const off = document.createElement('canvas');
      off.width = L; off.height = L;
      off.getContext('2d')?.putImageData(img, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, side, side);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(off, 0, 0, L, L, 0, 0, side, side);

      // The rule separating the row half from the column half.
      const cut = (m / L) * side;
      ctx.strokeStyle = tokens['border'] || 'rgba(128,128,128,0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cut, 0); ctx.lineTo(cut, side);
      ctx.moveTo(0, cut); ctx.lineTo(side, cut);
      ctx.stroke();
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
    </div>
  );
}
