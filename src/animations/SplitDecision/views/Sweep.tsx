/**
 * The Sweep — the Lab's picture. Top: the fraction of runs that reached the exact
 * optimum by G_max, per rule, across planted signal strength. Bottom: survival
 * curves (reached-by-generation) at one signal level. A hypothesis box states each
 * prediction next to what the sweep observed, so the app never asserts what it
 * measures. Below, the catalog of past sweeps.
 */

import React from 'react';
import { RULES, type RuleId } from '../evolve';
import { SCORES } from '../scores';
import { reachedByGeneration, medianReached, jobCount, type SweepConfig, type CellSummary } from '../lab/sweep';

export interface SweepRecord {
  id: number;
  when: string;
  cfg: SweepConfig;
  /** Per-(signal, rule) summaries — what the view draws and the only thing stored.
   *  The raw per-run rows stay in a ref during the sweep: keeping 216 of them in
   *  React state meant a re-render and a ~55 KB localStorage write per finished run. */
  cells: CellSummary[];
  /** Runs finished so far. */
  count: number;
  done: boolean;
  /** Stopped before every job finished (Stop, leaving the Lab, or a reload). */
  stopped?: boolean;
}

interface Props {
  record: SweepRecord | null;
  catalog: SweepRecord[];
  selectedSignal: number;
  onSelectSignal: (i: number) => void;
  onSelectRecord: (id: number) => void;
}

const RULE_CLASS: Record<RuleId, string> = { clonal: 'r-clonal', mixer: 'r-mixer', prom: 'r-prom' };
const W = 600, H = 160, PAD = 8;

function describe(cfg: SweepConfig): string {
  const inst = cfg.instance.kind === 'planted'
    ? `planted ${cfg.instance.m}×${cfg.instance.n} (|R₁|=${cfg.instance.r1}, |C₁|=${cfg.instance.c1})`
    : `fixture ${cfg.instance.id}${cfg.instance.startAt ? ', started at the trap' : ''}`;
  return `${inst} · ${SCORES[cfg.base.scoreId].name} · ${cfg.base.fitness} · N=${cfg.base.N} k=${cfg.base.selection.k} μ=${cfg.base.mu} σ=${cfg.base.sigma} · ${cfg.seeds} seeds · G_max ${cfg.gMax}`;
}

function cellOf(cells: CellSummary[], s: number, r: number): CellSummary | undefined {
  return cells.find(c => c.signalIdx === s && c.ruleIdx === r);
}

export function Sweep({ record, catalog, selectedSignal, onSelectSignal, onSelectRecord }: Props) {
  const rec = record;
  const cells = rec?.cells ?? [];
  const cfg = rec?.cfg ?? null;
  // The trap preset asks whether a rule can leave a strict local optimum at all, which
  // is a weaker and more discriminating event than reaching the global optimum.
  const isTrap = cfg?.instance.kind === 'fixture' && cfg.instance.startAt !== null;
  const event: 'reached' | 'escaped' = isTrap ? 'escaped' : 'reached';
  const verb = isTrap ? 'escaped the trap' : 'reached the optimum';
  const total = cfg ? jobCount(cfg) : 0;
  const sel = cfg ? Math.min(selectedSignal, cfg.signals.length - 1) : 0;

  return (
    <div className="sd-sweep">
      {!rec && <div className="sd-story">Press <b>Run sweep</b> to race the three worlds across planted signal strength, or pick the <b>Escape the trap</b> preset in the Lab panel.</div>}
      {rec && cfg && (
        <>
          <div className="sd-status">sweep #{rec.id} · {describe(cfg)} · {rec.count}/{total} runs{rec.stopped ? ' · stopped' : rec.done ? '' : ' · running…'}</div>

          {cfg.signals.length > 1 && (
            <>
              <div className="sd-tr-head"><b>{verb} by G_max</b> <span className="u">(fraction of seeds)</span>
                {cfg.rules.map(r => <span key={r} className={`lg ${RULE_CLASS[r]}`}>{RULES[r].name}</span>)}
              </div>
              <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="sd-chart">
                {cfg.rules.map((r, ri) => {
                  const pts = cfg.signals.map((_, si) => { const c = cellOf(cells, si, ri); const ev = c ? (event === 'escaped' ? c.escaped : c.reached) : []; const frac = c && c.n ? ev.length / c.n : 0; return { x: PAD + (si / Math.max(1, cfg.signals.length - 1)) * (W - 2 * PAD), y: H - PAD - frac * (H - 2 * PAD) }; });
                  return <g key={r} className={RULE_CLASS[r]}>
                    <path className="ln" d={pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')} />
                    {pts.map((p, i) => <circle key={i} className="dot" cx={p.x} cy={p.y} r={4} />)}
                  </g>;
                })}
              </svg>
              <div className="sd-signals">
                {cfg.signals.map((s, si) => (
                  <button key={si} type="button" className={`sd-sig${si === sel ? ' on' : ''}`} onClick={() => onSelectSignal(si)}>signal {s.toFixed(2)}</button>
                ))}
              </div>
            </>
          )}

          <div className="sd-tr-head"><b>{verb} by generation</b> <span className="u">(survival curve{cfg.signals.length > 1 ? ` at signal ${cfg.signals[sel].toFixed(2)}` : ''})</span>
            {cfg.rules.map((r, ri) => {
              const c = cellOf(cells, sel, ri);
              const ev = c ? (event === 'escaped' ? c.escaped : c.reached) : [];
              const med = c ? medianReached(c, event) : null;
              return <span key={r} className={`lg ${RULE_CLASS[r]}`}>{RULES[r].name}: {c ? `${ev.length}/${c.n}` : '—'}{med !== null ? `, median gen ${med}` : c && c.n ? ', median censored' : ''}</span>;
            })}
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="sd-chart">
            {cfg.rules.map((r, ri) => {
              const c = cellOf(cells, sel, ri);
              if (!c || !c.n) return null;
              const curve = reachedByGeneration(c, cfg.gMax, 80, event);
              const d = curve.map((p, i) => `${i ? 'L' : 'M'}${(PAD + (p.g / cfg.gMax) * (W - 2 * PAD)).toFixed(1)},${(H - PAD - p.frac * (H - 2 * PAD)).toFixed(1)}`).join(' ');
              return <path key={r} className={`ln ${RULE_CLASS[r]}`} d={d} />;
            })}
          </svg>
          <div className="sd-tr-axis"><span>gen 0</span><span>fraction reached, 0 → 1</span><span>gen {cfg.gMax}</span></div>

          <Hypotheses cfg={cfg} cells={cells} sel={sel} />
        </>
      )}

      {catalog.length > 0 && (
        <div className="sd-cat">
          <div className="sd-tr-head"><b>catalog</b> <span className="u">{catalog.length} sweep{catalog.length === 1 ? '' : 's'} — click a row to show it</span></div>
          <div className="sd-cat-scroll">
            <table className="sd-cat-table">
              <thead><tr><th>#</th><th>instance</th><th>judge</th><th>N · k</th><th>seeds</th><th>G_max</th><th>reached at top signal</th></tr></thead>
              <tbody>
                {catalog.map(r => {
                  const cs = r.cells;
                  const top = r.cfg.signals.length - 1;
                  const isT = r.cfg.instance.kind === 'fixture' && r.cfg.instance.startAt !== null;
                  const reached = r.cfg.rules.map((rule, ri) => { const c = cellOf(cs, top, ri); const e = c ? (isT ? c.escaped : c.reached) : []; return `${RULES[rule].name.split(' ').pop()} ${c ? `${e.length}/${c.n}` : '—'}`; }).join(' · ');
                  return (
                    <tr key={r.id} className={rec && r.id === rec.id ? 'sel' : ''} onClick={() => onSelectRecord(r.id)}>
                      <td>{r.id}</td>
                      <td>{r.cfg.instance.kind === 'planted' ? `${r.cfg.instance.m}×${r.cfg.instance.n}` : r.cfg.instance.id}</td>
                      <td>{SCORES[r.cfg.base.scoreId].name}</td>
                      <td>{r.cfg.base.N} · {r.cfg.base.selection.k}</td>
                      <td>{r.cfg.seeds}</td>
                      <td>{r.cfg.gMax}</td>
                      <td>{reached}{r.stopped ? ' (stopped)' : r.done ? '' : ' (running)'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Hypotheses({ cfg, cells, sel }: { cfg: SweepConfig; cells: CellSummary[]; sel: number }) {
  const idx = (r: RuleId) => cfg.rules.indexOf(r);
  const cell = (r: RuleId, s = sel) => (idx(r) >= 0 ? cellOf(cells, s, idx(r)) : undefined);
  const trap = cfg.instance.kind === 'fixture' && cfg.instance.startAt !== null;
  const ev: 'reached' | 'escaped' = trap ? 'escaped' : 'reached';
  const frac = (c?: CellSummary) => (c && c.n ? `${(ev === 'escaped' ? c.escaped : c.reached).length}/${c.n}` : '—');
  const med = (c?: CellSummary) => { const m = c ? medianReached(c, ev) : null; return m === null ? 'censored' : `gen ${m}`; };
  const mixer = cell('mixer'), clonal = cell('clonal'), prom = cell('prom');
  const rows: Array<{ h: string; predicted: string; observed: string }> = trap
    ? [{ h: 'H3 — escape from a strict single-flip local optimum', predicted: 'Monastery ≥ Mixer > Prom escape', observed: `Monastery ${frac(clonal)} (${med(clonal)}) · Mixer ${frac(mixer)} (${med(mixer)}) · Prom ${frac(prom)} (${med(prom)})` }]
    : [
      { h: 'H1 — at strong signal the Mixer dominates the Monastery', predicted: 'Mixer reaches more seeds, sooner', observed: `Mixer ${frac(mixer)} (${med(mixer)}) vs Monastery ${frac(clonal)} (${med(clonal)})` },
      { h: 'H2 — the Prom is slower than the Mixer at every signal', predicted: 'Prom median later, fewer seeds', observed: `Prom ${frac(prom)} (${med(prom)}) vs Mixer ${frac(mixer)} (${med(mixer)})` },
    ];
  return (
    <div className="sd-hyp">
      <div className="sd-tr-head"><b>hypotheses under test</b> <span className="u">predicted → observed at signal {cfg.signals[sel].toFixed(2)}</span></div>
      {rows.map(r => <div key={r.h} className="sd-hyp-row"><span className="h">{r.h}</span><span className="p">{r.predicted}</span><span className="o">{r.observed}</span></div>)}
    </div>
  );
}
