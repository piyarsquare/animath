import React from 'react';

/**
 * Shared readout primitives for Analyze-tier panels (DESIGN-SPEC §3):
 * Breakdown (labeled % bars), MiniHisto (bar histogram + mono caption),
 * Sparkline (filled SVG line), StatGrid (stat cards), Kicker (mono uppercase
 * section label). Use these for lab/readout content so the labs feel
 * consistent across apps.
 */

export function Breakdown({ rows }: { rows: { label: string; pct: number; color?: string }[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9, margin: '4px 0 2px' }}>
      {rows.map(r => (
        <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 72, fontSize: 12, color: 'var(--dim)' }}>{r.label}</span>
          <div style={{ flex: 1, height: 8, borderRadius: 999, background: 'var(--track)', overflow: 'hidden' }}>
            <div style={{ width: `${r.pct}%`, height: '100%', background: r.color ?? 'var(--accent)', borderRadius: 999 }} />
          </div>
          <span style={{ width: 34, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600 }}>
            {r.pct}%
          </span>
        </div>
      ))}
    </div>
  );
}

export function MiniHisto({ bars, caption }: { bars: number[]; caption?: string }) {
  const max = Math.max(...bars, 1);
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 72, padding: '4px 0' }}>
        {bars.map((h, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: `${Math.max(4, (h / max) * 100)}%`,
              background: 'var(--accent)',
              opacity: 0.3 + 0.6 * (h / max),
              borderRadius: '2px 2px 0 0',
            }}
          />
        ))}
      </div>
      {caption && (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--dim-2)', marginTop: 2 }}>
          {caption}
        </div>
      )}
    </div>
  );
}

export function Sparkline({ pts, h = 54 }: { pts: number[]; h?: number }) {
  const max = Math.max(...pts), min = Math.min(...pts), w = 232;
  const d = pts
    .map((p, i) => `${((i / (pts.length - 1)) * w).toFixed(1)},${(h - ((p - min) / (max - min || 1)) * h).toFixed(1)}`)
    .join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: h, display: 'block', overflow: 'visible' }} preserveAspectRatio="none">
      <polyline points={`0,${h} ${d} ${w},${h}`} fill="var(--accent-soft)" stroke="none" />
      <polyline points={d} fill="none" stroke="var(--accent)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function StatGrid({ stats }: { stats: { k: string; v: string }[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, margin: '4px 0 2px' }}>
      {stats.map(s => (
        <div key={s.k} style={{ padding: '8px 10px', borderRadius: 9, background: 'var(--panel-2)', border: '1px solid var(--border)' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em' }}>{s.v}</div>
          <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 1 }}>{s.k}</div>
        </div>
      ))}
    </div>
  );
}

// Kicker moved into components/ControlPanel (the shared type scale's level 2);
// re-exported here so existing Analyze-tier imports keep working.
export { Kicker } from '../components/ControlPanel';
