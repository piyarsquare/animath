import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAppHeader } from '../../../components/AppShell';
import { Slider, Pills } from '../../../components/ControlPanel';
import { PRESETS, getPreset, type TargetId } from '../presets';
import { DEFAULT_CLASSIFY } from '../analysis/types';
import type { Outcome, RunResult } from '../analysis/types';
import { Aggregator, OUTCOMES, type AggSnapshot } from './ensemble';
import { runOne, targetMassOf } from './runner';
import { sampleParams, type EnsembleConfig } from './rng';
import { WorkerPool } from './pool';
import MiniSim from './MiniSim';

const HAS_WORKERS = typeof Worker !== 'undefined';
const TILE_COUNT = 8;

const OUTCOME_META: Record<Outcome, { label: string; color: string }> = {
  happy: { label: 'Happy ending (star ejected, planet survives)', color: '#46d98a' },
  survived: { label: 'Survived (bound, still chaotic)', color: '#9ec7ff' },
  'planet-ejected': { label: 'Planet ejected (frozen wanderer)', color: '#5a9be8' },
  'planet-destroyed': { label: 'Planet destroyed (close pass)', color: '#ff7043' },
  blowup: { label: 'Numerical blow-up (discarded)', color: '#555' },
};

const panel: React.CSSProperties = {
  background: 'rgba(12,16,24,0.6)', border: '1px solid rgba(120,150,200,0.18)',
  borderRadius: 10, padding: 12,
};
const h3: React.CSSProperties = { margin: '0 0 8px', font: '600 12px/1.2 ui-monospace, monospace', color: '#9ec7ff', letterSpacing: 0.4 };

function Histogram({ data, max, color, domain }: { data: number[]; max: number; color: string; domain: [string, string] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current; const ctx = cv?.getContext('2d');
    if (!cv || !ctx) return;
    const W = cv.width, H = cv.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0a0e16'; ctx.fillRect(0, 0, W, H);
    const n = data.length, bw = W / n;
    for (let i = 0; i < n; i++) {
      const h = Math.max(0, (data[i] / max) * (H - 3));
      ctx.fillStyle = color;
      ctx.fillRect(i * bw + 0.5, H - h, bw - 1, h);
    }
  }, [data, max, color]);
  return (
    <div>
      <canvas ref={ref} width={320} height={84} style={{ width: '100%', height: 84, borderRadius: 6, display: 'block' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', font: '10px/1.4 ui-monospace, monospace', color: '#6f7f99', marginTop: 2 }}>
        <span>{domain[0]}</span><span>{domain[1]}</span>
      </div>
    </div>
  );
}

export default function TrinaryLab() {
  useAppHeader('Trinary Lab', 'ensemble statistics');

  const [presetId, setPresetId] = useState(PRESETS[0].id);
  const preset = getPreset(presetId);
  const [target, setTarget] = useState<TargetId>(preset.target);
  const [tMax, setTMax] = useState(180);
  const [rMin, setRMin] = useState(0.6);
  const [rMax, setRMax] = useState(4);
  const [fMin, setFMin] = useState(0.6);
  const [fMax, setFMax] = useState(1.25);
  const [allowRetro, setAllowRetro] = useState(true);
  const [habLo, setHabLo] = useState(DEFAULT_CLASSIFY.habLo);
  const [habHi, setHabHi] = useState(DEFAULT_CLASSIFY.habHi);
  const [targetN, setTargetN] = useState(4000);

  const [running, setRunning] = useState(false);
  const [agg, setAgg] = useState<AggSnapshot | null>(null);
  const [rate, setRate] = useState(0);
  const [engine, setEngine] = useState<'cpu' | 'workers'>(HAS_WORKERS ? 'workers' : 'cpu');

  const cfg: EnsembleConfig = useMemo(() => ({
    presetId, target, massMul: [1, 1, 1], starSoft: preset.starSoft,
    classify: { ...DEFAULT_CLASSIFY, habLo, habHi },
    tMax, rMin, rMax, fMin, fMax, allowRetro, baseSeed: 1234567,
  }), [presetId, target, preset.starSoft, habLo, habHi, tMax, rMin, rMax, fMin, fMax, allowRetro]);

  const cfgRef = useRef(cfg); cfgRef.current = cfg;
  const targetNRef = useRef(targetN); targetNRef.current = targetN;
  const aggRef = useRef<Aggregator | null>(null);
  const runningRef = useRef(false);
  const rafRef = useRef(0);
  const tmRef = useRef(1);
  const poolRef = useRef<WorkerPool | null>(null);
  const watchdogRef = useRef<number | null>(null);
  const uiClock = useRef({ t: 0, n: 0 });

  const ensureAgg = () => {
    if (!aggRef.current || aggRef.current.count >= targetNRef.current) {
      aggRef.current = new Aggregator(cfgRef.current.tMax);
    }
    return aggRef.current;
  };

  const refreshUi = (force = false) => {
    const agg = aggRef.current;
    if (!agg) return;
    const now = performance.now();
    if (force || now - uiClock.current.t > 120) {
      const dn = agg.count - uiClock.current.n;
      if (now > uiClock.current.t) setRate((dn / (now - uiClock.current.t)) * 1000);
      uiClock.current = { t: now, n: agg.count };
      setAgg(agg.snapshot());
    }
  };

  const finish = () => {
    if (!runningRef.current) return;
    runningRef.current = false;
    setRunning(false);
    refreshUi(true);
  };

  const ingestBatch = (runs: RunResult[]) => {
    const agg = aggRef.current;
    if (!agg) return;
    if (watchdogRef.current) { clearTimeout(watchdogRef.current); watchdogRef.current = null; }
    for (const r of runs) agg.ingest(r);
    refreshUi();
    if (agg.count >= targetNRef.current) finish();
  };

  const cpuTick = () => {
    if (!runningRef.current) return;
    const agg = aggRef.current!;
    const cfgNow = cfgRef.current, tm = tmRef.current, targetN = targetNRef.current;
    const batch: RunResult[] = [];
    const t0 = performance.now();
    while (agg.count + batch.length < targetN && performance.now() - t0 < 22) {
      const i = agg.count + batch.length;
      batch.push(runOne(cfgNow, sampleParams(cfgNow, i, tm)));
    }
    ingestBatch(batch);
    if (runningRef.current && agg.count < targetN) rafRef.current = requestAnimationFrame(cpuTick);
  };

  const startCpu = () => { rafRef.current = requestAnimationFrame(cpuTick); };

  const startWorkers = () => {
    try {
      if (!poolRef.current) {
        const size = Math.min(8, Math.max(2, (navigator.hardwareConcurrency || 4) - 1));
        poolRef.current = new WorkerPool(size, cfgRef.current, tmRef.current, ingestBatch, finish);
      }
      poolRef.current.run(targetNRef.current);
      // Safety net: if no worker results arrive shortly, fall back to CPU.
      watchdogRef.current = window.setTimeout(() => {
        if (runningRef.current && (aggRef.current?.count ?? 0) === 0) {
          poolRef.current?.dispose(); poolRef.current = null;
          setEngine('cpu');
          startCpu();
        }
      }, 3000);
    } catch {
      poolRef.current = null;
      setEngine('cpu');
      startCpu();
    }
  };

  const start = () => {
    ensureAgg();
    tmRef.current = targetMassOf(cfgRef.current);
    uiClock.current = { t: performance.now(), n: aggRef.current!.count };
    runningRef.current = true; setRunning(true);
    if (engineRef.current === 'workers') startWorkers(); else startCpu();
  };

  const pause = () => {
    runningRef.current = false; setRunning(false);
    cancelAnimationFrame(rafRef.current);
    if (watchdogRef.current) { clearTimeout(watchdogRef.current); watchdogRef.current = null; }
    poolRef.current?.pause();
  };

  const reset = () => {
    pause();
    poolRef.current?.dispose(); poolRef.current = null;
    aggRef.current = new Aggregator(cfgRef.current.tMax);
    setRate(0); setAgg(null);
  };

  const engineRef = useRef(engine); engineRef.current = engine;
  useEffect(() => () => { cancelAnimationFrame(rafRef.current); poolRef.current?.dispose(); }, []);
  // Changing the configuration or engine invalidates accumulated stats.
  useEffect(() => { reset(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [cfg, engine]);

  const onPickPreset = (id: string) => { setPresetId(id); setTarget(getPreset(id).target); };

  const n = agg?.n ?? 0;
  const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
  const happyPct = n ? (agg!.counts.happy / n) : 0;
  const btn: React.CSSProperties = {
    padding: '8px 16px', borderRadius: 6, border: '1px solid var(--cp-border, #2a3550)',
    background: 'rgba(255,255,255,0.06)', color: '#e8edf6', cursor: 'pointer', fontSize: 14,
  };

  const targetOptions: { value: TargetId; label: string }[] = [
    { value: 'bary', label: 'Barycenter' }, { value: 's0', label: 'Star 1' },
    { value: 's1', label: 'Star 2' }, { value: 's2', label: 'Star 3' },
    ...(preset.hasBinary ? [{ value: 'binary' as TargetId, label: 'Inner binary' }] : []),
  ];

  return (
    <div style={{
      position: 'absolute', inset: 0, overflow: 'auto', background: '#05060a',
      color: '#cfe0f5', font: '13px/1.5 system-ui, sans-serif', padding: '12px 14px 40px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <button style={btn} onClick={() => { window.location.hash = '#/trinary'; }}>← Single run</button>
        <button style={{ ...btn, background: running ? 'rgba(255,212,0,0.18)' : 'rgba(70,217,138,0.18)' }}
          onClick={running ? pause : start}>{running ? '❚❚ Pause' : (n > 0 && n < targetN ? '▶ Resume' : '▶ Run ensemble')}</button>
        <button style={btn} onClick={reset}>↺ Reset</button>
        <div style={{ flex: 1 }} />
        <span style={{ font: '12px ui-monospace, monospace', color: '#6f7f99' }}>
          {rate > 0 ? `${rate.toFixed(0)} worlds/s` : ''}
        </span>
      </div>

      {/* Completion meter */}
      <div style={{ ...panel, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ font: '700 26px/1 ui-monospace, monospace', color: '#fff' }}>{n.toLocaleString()}</span>
          <span style={{ color: '#6f7f99' }}>/ {targetN.toLocaleString()} worlds explored</span>
          <span style={{ flex: 1 }} />
          <span style={{ font: '700 20px ui-monospace, monospace', color: '#46d98a' }}>{pct(happyPct)}</span>
          <span style={{ color: '#6f7f99' }}>happy endings</span>
        </div>
        <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.08)', marginTop: 8, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${Math.min(100, (n / targetN) * 100)}%`, background: '#46d98a', transition: 'width 0.1s' }} />
        </div>
      </div>

      {/* Two-column body */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12 }}>
        {/* Live sample + outcomes */}
        <div style={panel}>
          <h3 style={h3}>LIVE SAMPLES</h3>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
              {Array.from({ length: TILE_COUNT }, (_, i) => (
                <MiniSim key={i} cfg={cfg} running={running} size={94} steps={80} />
              ))}
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              {OUTCOMES.map(o => {
                const c = agg?.counts[o] ?? 0;
                const frac = n ? c / n : 0;
                return (
                  <div key={o} style={{ marginBottom: 7 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', font: '11px ui-monospace, monospace' }}>
                      <span style={{ color: OUTCOME_META[o].color }}>{OUTCOME_META[o].label}</span>
                      <span style={{ color: '#9aa7bd' }}>{pct(frac)}</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)', marginTop: 2 }}>
                      <div style={{ height: '100%', width: `${frac * 100}%`, background: OUTCOME_META[o].color, borderRadius: 3 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 18, marginTop: 10, flexWrap: 'wrap', font: '12px ui-monospace, monospace' }}>
            <span>mean habitable&nbsp;<b style={{ color: '#46d98a' }}>{agg ? pct(agg.habMean) : '—'}</b>
              {agg && agg.n > 1 ? <span style={{ color: '#6f7f99' }}> ±{(agg.habStderr * 100).toFixed(2)}</span> : null}</span>
            <span>mean stable era&nbsp;<b style={{ color: '#9ec7ff' }}>{agg ? agg.longMean.toFixed(1) : '—'}</b></span>
            <span>longest ever&nbsp;<b style={{ color: '#ffd27f' }}>{agg ? agg.longMax.toFixed(1) : '—'}</b></span>
          </div>
        </div>

        {/* Distributions */}
        <div style={panel}>
          <h3 style={h3}>DISTRIBUTIONS (sharpen as N grows)</h3>
          <div style={{ font: '11px ui-monospace, monospace', color: '#9aa7bd', margin: '2px 0' }}>habitable fraction of lifetime</div>
          <Histogram data={agg?.histHab ?? []} max={agg?.histMax.hab ?? 1} color="#46d98a" domain={['0%', '100%']} />
          <div style={{ font: '11px ui-monospace, monospace', color: '#9aa7bd', margin: '8px 0 2px' }}>longest stable era</div>
          <Histogram data={agg?.histLong ?? []} max={agg?.histMax.long ?? 1} color="#9ec7ff" domain={['0', tMax.toFixed(0)]} />
          <div style={{ font: '11px ui-monospace, monospace', color: '#9aa7bd', margin: '8px 0 2px' }}>time to star ejection (happy runs)</div>
          <Histogram data={agg?.histEject ?? []} max={agg?.histMax.eject ?? 1} color="#ffd27f" domain={['0', tMax.toFixed(0)]} />
        </div>

        {/* Records */}
        <div style={panel}>
          <h3 style={h3}>LONGEST STABLE ERAS</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', font: '11px ui-monospace, monospace' }}>
            <thead>
              <tr style={{ color: '#6f7f99', textAlign: 'right' }}>
                <th style={{ textAlign: 'left' }}>#</th><th>stable</th><th>hab%</th><th>r</th><th>v</th><th>dir</th><th>outcome</th>
              </tr>
            </thead>
            <tbody>
              {(agg?.records ?? []).map((r, i) => (
                <tr key={i} style={{ textAlign: 'right', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ textAlign: 'left', color: '#6f7f99' }}>{i + 1}</td>
                  <td style={{ color: '#ffd27f' }}>{r.longestHabitable.toFixed(1)}</td>
                  <td>{(r.habitableFraction * 100).toFixed(0)}</td>
                  <td>{r.radius.toFixed(2)}</td>
                  <td>{r.speed.toFixed(2)}</td>
                  <td>{r.retro ? 'retro' : 'pro'}</td>
                  <td style={{ color: OUTCOME_META[r.outcome].color }}>{r.outcome}</td>
                </tr>
              ))}
              {!agg?.records.length && <tr><td colSpan={7} style={{ color: '#6f7f99', padding: '8px 0' }}>Run the ensemble to populate…</td></tr>}
            </tbody>
          </table>
        </div>

        {/* Controls */}
        <div style={panel}>
          <h3 style={h3}>SYSTEM &amp; SWEEP</h3>
          <Pills options={PRESETS.map(p => ({ value: p.id, label: p.name }))} value={presetId} onChange={onPickPreset} />
          <Pills label="Orbit around" options={targetOptions} value={target} onChange={setTarget} />
          <Pills label="Engine" value={engine}
            options={[{ value: 'cpu', label: 'CPU' }, ...(HAS_WORKERS ? [{ value: 'workers' as const, label: `Workers ×${Math.min(8, Math.max(2, (navigator.hardwareConcurrency || 4) - 1))}` }] : [])]}
            onChange={(v) => setEngine(v as 'cpu' | 'workers')} />
          <Slider label="Runs (target N)" value={targetN} min={500} max={20000} step={500} onChange={setTargetN} format={v => v.toLocaleString()} />
          <Slider label="Time budget / run" value={tMax} min={60} max={400} step={20} onChange={setTMax} format={v => v.toFixed(0)} />
          <Slider label="Launch radius min" value={rMin} min={0.2} max={6} step={0.1} onChange={v => setRMin(Math.min(v, rMax))} format={v => v.toFixed(1)} />
          <Slider label="Launch radius max" value={rMax} min={0.2} max={8} step={0.1} onChange={v => setRMax(Math.max(v, rMin))} format={v => v.toFixed(1)} />
          <Slider label="Speed × circular min" value={fMin} min={0.2} max={1.5} step={0.05} onChange={v => setFMin(Math.min(v, fMax))} format={v => v.toFixed(2)} />
          <Slider label="Speed × circular max" value={fMax} min={0.2} max={1.8} step={0.05} onChange={v => setFMax(Math.max(v, fMin))} format={v => v.toFixed(2)} />
          <Pills label="Launch direction" options={[{ value: 1, label: 'Pro + retro' }, { value: 0, label: 'Prograde only' }]}
            value={allowRetro ? 1 : 0} onChange={v => setAllowRetro(v === 1)} />
          <Slider label="Habitable floor (×ref)" value={habLo} min={0.1} max={1} step={0.05} onChange={setHabLo} format={v => v.toFixed(2)} />
          <Slider label="Habitable ceiling (×ref)" value={habHi} min={1} max={6} step={0.25} onChange={setHabHi} format={v => v.toFixed(2)} />
          <div style={{ font: '11px/1.5 system-ui', color: '#6f7f99', marginTop: 6 }}>
            Each run launches a planet from a randomly sampled radius, speed and direction, then integrates to a verdict. Changing any setting clears the tally.
          </div>
        </div>
      </div>
    </div>
  );
}
