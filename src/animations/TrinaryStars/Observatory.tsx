import React, { useEffect, useRef } from 'react';
import type { Bin, Snapshot } from '@/lib/nbody';

const BIN_COLOR: Record<Bin, string> = {
  both: '#46d98a',      // habitable AND calm — paradise
  climate: '#e8c15a',   // comfortable temperature, dynamically precarious
  dynamics: '#5a9be8',  // calm orbit, wrong temperature
  neither: '#6b2740',   // chaotic and deadly
};
const BIN_LABEL: Record<Bin, string> = {
  both: 'Paradise', climate: 'Warm·precarious', dynamics: 'Calm·barren', neither: 'Chaotic',
};
const CLIMATE_COLOR = { habitable: '#46d98a', hot: '#ff7043', cold: '#5a9be8' } as const;

function statusText(s: Snapshot): { text: string; color: string } {
  if (s.planetFate === 'destroyed') return { text: '☄ Planet destroyed', color: '#ff7043' };
  if (s.planetFate === 'ejected') return { text: '❄ Planet ejected — frozen wanderer', color: '#5a9be8' };
  if (s.ejectedStar >= 0) return { text: `⊘ Star ${s.ejectedStar + 1} ejected → binary`, color: '#46d98a' };
  return { text: s.bound ? '☉☉☉ three stars · planet bound' : '⚠ planet unbound', color: 'var(--fg)' };
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

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const W = cv.width, H = cv.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0a0e16';
    ctx.fillRect(0, 0, W, H);
    if (!snapshot || snapshot.t <= 0) return;

    const T = Math.max(snapshot.t, 1e-6);
    for (const seg of snapshot.segments) {
      const x0 = (seg.t0 / T) * W;
      const x1 = (seg.t1 / T) * W;
      ctx.fillStyle = BIN_COLOR[seg.bin];
      ctx.fillRect(x0, 0, Math.max(1, x1 - x0), H);
    }
    // Event markers.
    for (const ev of snapshot.events) {
      const x = (ev.t / T) * W;
      ctx.strokeStyle = ev.kind === 'star-ejected' ? '#ffffff' : '#ff5fa2';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
  }, [snapshot]);

  if (!snapshot) return null;
  const st = statusText(snapshot);
  const bar = insolBar(snapshot);
  const pct = (v: number) => `${(v * 100).toFixed(0)}%`;

  const chip: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' };

  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 0,
      padding: '8px 12px 10px', background: 'var(--panel)',
      borderTop: '1px solid var(--border)', backdropFilter: 'blur(5px)',
      color: 'var(--fg)', font: '12px/1.4 ui-monospace, monospace', pointerEvents: 'none',
    }}>
      {/* Stats row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 18px', marginBottom: 6 }}>
        <span style={{ ...chip, color: st.color, fontWeight: 600 }}>{st.text}</span>
        <span style={chip}>
          <span style={{ width: 9, height: 9, borderRadius: 9, background: CLIMATE_COLOR[snapshot.climate] }} />
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
          left: `calc(${bar.pos * 100}% - 1.5px)`, background: CLIMATE_COLOR[snapshot.climate],
        }} />
      </div>

      {/* Timeline of eras */}
      <canvas ref={canvasRef} width={1000} height={26}
        style={{ width: '100%', height: 26, borderRadius: 4, display: 'block' }} />

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 14px', marginTop: 5, opacity: 0.85 }}>
        {(Object.keys(BIN_COLOR) as Bin[]).map(b => (
          <span key={b} style={chip}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: BIN_COLOR[b] }} />
            {BIN_LABEL[b]}
          </span>
        ))}
        <span style={{ ...chip, opacity: 0.7 }}>│ event</span>
      </div>
    </div>
  );
}
