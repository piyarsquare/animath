import React, { useEffect, useMemo, useRef } from 'react';
import type { Bin, Snapshot } from '@/lib/nbody';
import { useThemeId } from '../../chrome/skins';
import { useThemeTokens } from '../../chrome/useThemeTokens';
import { sampleContinuous, themeMapsFor } from '../../lib/colormapRegistry';

/** The outcome bins, ordered by *goodness* (paradise best → chaotic worst). The
 *  two middle bins are the orthogonal half-goods (good climate / good dynamics).
 *  Theming v2 decision: outcomes ride a DIVERGENT colormap sampled by goodness, so
 *  the color carries the ordering. We use the theme's recommended divergent map
 *  from the registry (rdbu/coolwarm/brbg/…), so each skin gets an apt map.
 *  Spread across the full range so the two poles read saturated, not washed out. */
const BIN_GOODNESS: Record<Bin, number> = { both: 1, climate: 0.66, dynamics: 0.34, neither: 0 };
const BIN_LABEL: Record<Bin, string> = {
  both: 'Paradise', climate: 'Warm·precarious', dynamics: 'Calm·barren', neither: 'Chaotic',
};

/** Tokens this view reads (resolved at the forced-dark scene mode). */
const TOKENS = ['success', 'danger', 'dim', 'fg', 'viz-bg', 'data-1', 'accent-2'];
const FALLBACK: Record<string, string> = {
  success: '#4cc878', danger: '#f0746a', dim: '#8d96ab', fg: '#eef1f7',
  'viz-bg': '#0a0e16', 'data-1': '#5fa8ff', 'accent-2': '#5fe3cd',
};

interface Palette {
  bin: Record<Bin, string>;
  climate: { habitable: string; hot: string; cold: string };
  bg: string; fg: string; dim: string; success: string; danger: string;
  event: string; eventStar: string;
}

function buildPalette(tok: Record<string, string>, themeId: string): Palette {
  const g = (n: string) => tok[n] || FALLBACK[n];
  // Outcome color = the theme's recommended DIVERGENT colormap, sampled by
  // goodness. coolwarm runs cool→warm (opposite the colorbrewer good=high
  // convention), so flip it; the others put their cool/positive pole at the top.
  const mapId = themeMapsFor('divergent', themeId)[0] ?? 'rdbu';
  const flip = mapId === 'coolwarm';
  const binColor = (b: Bin) => sampleContinuous(mapId, flip ? 1 - BIN_GOODNESS[b] : BIN_GOODNESS[b]);
  return {
    bin: { both: binColor('both'), climate: binColor('climate'), dynamics: binColor('dynamics'), neither: binColor('neither') },
    // Physical temperature categories map onto the same voice: habitable = good,
    // hot = danger, cold = a cool data hue.
    climate: { habitable: g('success'), hot: g('danger'), cold: g('data-1') },
    bg: g('viz-bg'), fg: g('fg'), dim: g('dim'), success: g('success'), danger: g('danger'),
    event: g('accent-2'), eventStar: g('fg'),
  };
}

function statusText(s: Snapshot, p: Palette): { text: string; color: string } {
  if (s.planetFate === 'destroyed') return { text: '☄ Planet destroyed', color: p.danger };
  if (s.planetFate === 'ejected') return { text: '❄ Planet ejected — frozen wanderer', color: p.climate.cold };
  if (s.ejectedStar >= 0) return { text: `⊘ Star ${s.ejectedStar + 1} ejected → binary`, color: p.success };
  return { text: s.bound ? '☉☉☉ three stars · planet bound' : '⚠ planet unbound', color: p.fg };
}

/** Maps insolation to a 0..1 position on a log scale spanning the habitable band. */
function insolBar(s: Snapshot): { pos: number; loPos: number; hiPos: number } {
  const lo = Math.log(s.Slo), hi = Math.log(s.Shi);
  const pad = (hi - lo) * 1.5 + 1e-6;
  const min = lo - pad, max = hi + pad;
  const map = (v: number) => Math.min(1, Math.max(0, (Math.log(Math.max(v, 1e-9)) - min) / (max - min)));
  return { pos: map(s.S), loPos: map(s.Slo), hiPos: map(s.Shi) };
}

export default function Observatory({ snapshot }: { snapshot: Snapshot | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  // Read tokens from inside the forced-dark scene subtree so the timeline tracks
  // the theme (and redraws on a skin switch — rule #3).
  const themeId = useThemeId();
  const tokens = useThemeTokens(TOKENS, rootRef);
  const pal = useMemo(() => buildPalette(tokens, themeId), [tokens, themeId]);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const W = cv.width, H = cv.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, W, H);
    if (!snapshot || snapshot.t <= 0) return;

    const T = Math.max(snapshot.t, 1e-6);
    for (const seg of snapshot.segments) {
      const x0 = (seg.t0 / T) * W;
      const x1 = (seg.t1 / T) * W;
      ctx.fillStyle = pal.bin[seg.bin];
      ctx.fillRect(x0, 0, Math.max(1, x1 - x0), H);
    }
    // Event markers.
    for (const ev of snapshot.events) {
      const x = (ev.t / T) * W;
      ctx.strokeStyle = ev.kind === 'star-ejected' ? pal.eventStar : pal.event;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    // themeId in deps so a skin change forces a redraw even at a frozen snapshot.
  }, [snapshot, pal, themeId]);

  if (!snapshot) return <div ref={rootRef} style={{ display: 'none' }} />;
  const st = statusText(snapshot, pal);
  const bar = insolBar(snapshot);
  const pct = (v: number) => `${(v * 100).toFixed(0)}%`;

  const chip: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' };

  return (
    <div ref={rootRef} style={{
      position: 'absolute', left: 0, right: 0, bottom: 0,
      padding: '8px 12px 10px', background: 'var(--panel)',
      borderTop: '1px solid var(--border)', backdropFilter: 'blur(5px)',
      color: 'var(--fg)', font: '12px/1.4 ui-monospace, monospace', pointerEvents: 'none',
    }}>
      {/* Stats row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 18px', marginBottom: 6 }}>
        <span style={{ ...chip, color: st.color, fontWeight: 600 }}>{st.text}</span>
        <span style={chip}>
          <span style={{ width: 9, height: 9, borderRadius: 9, background: pal.climate[snapshot.climate] }} />
          {snapshot.climate.toUpperCase()}
        </span>
        <span style={chip}>habitable&nbsp;<b style={{ color: 'var(--success)' }}>{pct(snapshot.habitableFraction)}</b></span>
        <span style={chip}>paradise&nbsp;<b style={{ color: 'var(--success)' }}>{pct(snapshot.bothFraction)}</b></span>
        <span style={chip}>longest stable&nbsp;<b style={{ color: 'var(--accent)' }}>{snapshot.longestHabitable.toFixed(1)}</b></span>
      </div>

      {/* Insolation bar with habitable band highlighted */}
      <div style={{ position: 'relative', height: 8, borderRadius: 4, background: 'var(--track)', marginBottom: 6 }}>
        <div style={{
          position: 'absolute', top: 0, bottom: 0, borderRadius: 4,
          left: `${bar.loPos * 100}%`, width: `${(bar.hiPos - bar.loPos) * 100}%`,
          background: 'var(--success-soft)',
        }} />
        <div style={{
          position: 'absolute', top: -2, width: 3, height: 12, borderRadius: 2,
          left: `calc(${bar.pos * 100}% - 1.5px)`, background: pal.climate[snapshot.climate],
        }} />
      </div>

      {/* Timeline of eras */}
      <canvas ref={canvasRef} width={1000} height={26}
        style={{ width: '100%', height: 26, borderRadius: 4, display: 'block' }} />

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 14px', marginTop: 5, opacity: 0.85 }}>
        {(Object.keys(BIN_LABEL) as Bin[]).map(b => (
          <span key={b} style={chip}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: pal.bin[b] }} />
            {BIN_LABEL[b]}
          </span>
        ))}
        <span style={{ ...chip, opacity: 0.7 }}>│ event</span>
      </div>
    </div>
  );
}
