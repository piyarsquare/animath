import React from 'react';
import { MiniHisto, StatGrid } from '../../chrome/readouts';
import { TYPE_COLORS } from './arena';
import type { AgentType } from './engine';
import {
  aggregate, metricValues, METRIC_LABELS,
  type GroupResult, type MetricKey,
} from './lab';

/** Short labels for the compare-strategies x-axis. */
const SHORT: Record<string, string> = {
  standard: 'Std', blindDate: 'Blind', nomadic: 'Nomad',
  patrolling: 'Patrol', perfectionist: 'Perfect', 'Current mix': 'Mix',
};

function fmt(metric: MetricKey, v: number): string {
  if (metric === 'finalSortedness' || metric === 'clustering') return `${Math.round(v * 100)}%`;
  return Math.round(v).toString();
}

/** Format a swept-parameter value (fractions like 0.25 vs counts like 200). */
function fmtParam(v: number): string {
  const a = Math.abs(v);
  if (a < 1 && a > 0) return v.toFixed(2);
  if (a < 10) return v.toFixed(1);
  return Math.round(v).toString();
}

function barColor(label: string): string {
  return (TYPE_COLORS as Record<string, string>)[label] ?? 'var(--accent)';
}

/** Vertical bars with mean ± sd error bars (compare & sweep share this). */
function BarChart({ results, metric }: { results: GroupResult[]; metric: MetricKey }) {
  const W = 320, H = 150, padB = 26, padT = 14;
  const stats = results.map(g => aggregate(metricValues(g, metric)));
  const top = Math.max(1e-6, ...stats.map(s => s.mean + s.sd));
  const n = results.length;
  const slot = W / n;
  const bw = Math.min(38, slot * 0.6);
  const y = (v: number) => padT + (1 - v / top) * (H - padT - padB);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 168, display: 'block' }}>
      {results.map((g, i) => {
        const s = stats[i];
        const cx = i * slot + slot / 2;
        const label = SHORT[g.label] ?? g.label;
        return (
          <g key={g.label}>
            <rect
              x={cx - bw / 2} y={y(s.mean)} width={bw} height={Math.max(0, H - padB - y(s.mean))}
              rx={2} fill={barColor(g.label)} opacity={0.9}
            />
            {/* error bar */}
            <line x1={cx} x2={cx} y1={y(s.mean + s.sd)} y2={y(Math.max(0, s.mean - s.sd))}
              stroke="var(--fg)" strokeWidth={1} opacity={0.6} />
            <line x1={cx - 4} x2={cx + 4} y1={y(s.mean + s.sd)} y2={y(s.mean + s.sd)}
              stroke="var(--fg)" strokeWidth={1} opacity={0.6} />
            <text x={cx} y={y(s.mean + s.sd) - 3} textAnchor="middle"
              fontSize={9} fontFamily="var(--font-mono)" fill="var(--dim)">{fmt(metric, s.mean)}</text>
            <text x={cx} y={H - 9} textAnchor="middle" fontSize={9.5} fill="var(--dim)">{label}</text>
          </g>
        );
      })}
    </svg>
  );
}

/** Mean metric vs swept parameter. */
function LineChart({ results, metric, xlabel }: { results: GroupResult[]; metric: MetricKey; xlabel: string }) {
  const W = 320, H = 150, padB = 26, padT = 14, padL = 6, padR = 6;
  const pts = results.map(g => ({ x: g.param ?? 0, y: aggregate(metricValues(g, metric)).mean }));
  const xmin = Math.min(...pts.map(p => p.x)), xmax = Math.max(...pts.map(p => p.x));
  const ymax = Math.max(1e-6, ...pts.map(p => p.y));
  const px = (x: number) => padL + ((x - xmin) / (xmax - xmin || 1)) * (W - padL - padR);
  const py = (y: number) => padT + (1 - y / ymax) * (H - padT - padB);
  const d = pts.map(p => `${px(p.x).toFixed(1)},${py(p.y).toFixed(1)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 168, display: 'block' }}>
      <polyline points={d} fill="none" stroke="var(--accent)" strokeWidth={2} />
      {pts.map((p, i) => <circle key={i} cx={px(p.x)} cy={py(p.y)} r={2.5} fill="var(--accent)" />)}
      <text x={padL} y={H - 9} fontSize={9} fill="var(--dim)" fontFamily="var(--font-mono)">{fmtParam(xmin)}</text>
      <text x={W - padR} y={H - 9} textAnchor="end" fontSize={9} fill="var(--dim)" fontFamily="var(--font-mono)">{fmtParam(xmax)}</text>
      <text x={W / 2} y={H - 9} textAnchor="middle" fontSize={9.5} fill="var(--dim-2)">{xlabel}</text>
      <text x={padL} y={py(ymax) - 2} fontSize={9} fill="var(--dim)" fontFamily="var(--font-mono)">{fmt(metric, ymax)}</text>
    </svg>
  );
}

export function LabResults({
  kind, results, metric, sweepLabel,
}: {
  kind: 'compare' | 'monte' | 'sweep';
  results: GroupResult[];
  metric: MetricKey;
  sweepLabel?: string;
}) {
  if (results.length === 0) {
    return <p className="as-hint">Set up an experiment and press <strong>Run experiment</strong>. Each trial sorts a fresh population headless; results aggregate over all trials.</p>;
  }

  if (kind === 'monte') {
    const g = results[0];
    const vals = metricValues(g, metric);
    const a = aggregate(vals);
    // bin into a histogram
    const bins = 12;
    const lo = a.min, hi = a.max || 1;
    const counts = new Array(bins).fill(0);
    for (const v of vals) {
      const idx = Math.min(bins - 1, Math.floor(((v - lo) / (hi - lo || 1)) * bins));
      counts[idx]++;
    }
    return (
      <div className="as-panel">
        <MiniHisto bars={counts} caption={`${METRIC_LABELS[metric]} · ${vals.length} trials`} />
        <StatGrid stats={[
          { k: 'Mean', v: fmt(metric, a.mean) },
          { k: 'Std dev', v: fmt(metric, a.sd) },
          { k: 'Min', v: fmt(metric, a.min) },
          { k: 'Max', v: fmt(metric, a.max) },
        ]} />
        <p className="as-hint">Converged: {Math.round(g.convergedRate * 100)}% of trials reached the sort threshold.</p>
      </div>
    );
  }

  return (
    <div className="as-panel">
      {kind === 'compare'
        ? <BarChart results={results} metric={metric} />
        : <LineChart results={results} metric={metric} xlabel={sweepLabel ?? 'parameter'} />}
      <table className="as-lab-table">
        <thead>
          <tr><th>{kind === 'sweep' ? sweepLabel : 'Condition'}</th><th>mean</th><th>± sd</th><th>conv.</th></tr>
        </thead>
        <tbody>
          {results.map(g => {
            const a = aggregate(metricValues(g, metric));
            return (
              <tr key={g.label}>
                <td>{SHORT[g.label] ?? g.label}</td>
                <td>{fmt(metric, a.mean)}</td>
                <td>{fmt(metric, a.sd)}</td>
                <td>{Math.round(g.convergedRate * 100)}%</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
