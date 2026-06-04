import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAppHeader, ShellSettings } from '../../../components/AppShell';
import { Slider, Pills, Section } from '../../../components/ControlPanel';
import { SCENARIOS, getScenario, DEFAULT_CLASSIFY, type TargetId, type Outcome, type RunResult } from '@/lib/nbody';
import { Aggregator, OUTCOMES, type AggSnapshot } from './ensemble';
import { runOne, targetMassOf } from './runner';
import { sampleParams, type EnsembleConfig } from './rng';
import { WorkerPool } from './pool';
import { GpuRunner, gpuAvailable } from './gpu';
import BasinMap, { type BasinHandle } from './BasinMap';
import MiniSim from './MiniSim';

const HAS_WORKERS = typeof Worker !== 'undefined';
const HAS_GPU = gpuAvailable();
type Engine = 'cpu' | 'workers' | 'gpu';

/** The Lab has two instruments you switch between:
 *   - Destiny Map: the deterministic (and now statistical) heatmap, one chosen
 *     2D slice of launch space, drag-to-zoom into its fractal boundaries.
 *   - Census: thousands of random worlds tallied into outcomes, distributions
 *     and records, with live mini-sims. */
type Instrument = 'map' | 'census';
const TILE_COUNT = 8;

/** Read the lab config carried in the URL hash query (for shareable links). */
function labParams(): URLSearchParams {
  return new URLSearchParams(window.location.hash.split('?')[1] ?? '');
}
const pNum = (p: URLSearchParams, k: string, d: number) => {
  const v = p.get(k); const n = v == null ? NaN : parseFloat(v);
  return Number.isFinite(n) ? n : d;
};

function download(name: string, text: string, type: string) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

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

/** Visualises the region of (launch radius × speed-fraction) space that the
 *  current sliders sample from, within the full possible domain — with the
 *  circular and escape-velocity reference lines and a scatter of sample points
 *  coloured by launch direction. */
function LaunchSpace({ rMin, rMax, fMin, fMax, allowRetro }: {
  rMin: number; rMax: number; fMin: number; fMax: number; allowRetro: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current; const ctx = cv?.getContext('2d');
    if (!cv || !ctx) return;
    const W = cv.width, H = cv.height, pad = 26;
    const RD0 = 0.2, RD1 = 8, FD0 = 0.2, FD1 = 1.8;
    const X = (r: number) => pad + ((r - RD0) / (RD1 - RD0)) * (W - 2 * pad);
    const Y = (f: number) => H - pad - ((f - FD0) / (FD1 - FD0)) * (H - 2 * pad);

    ctx.fillStyle = '#0a0e16'; ctx.fillRect(0, 0, W, H);
    const yEsc = Y(Math.SQRT2), yCirc = Y(1);
    ctx.fillStyle = 'rgba(255,112,67,0.10)'; ctx.fillRect(pad, pad, W - 2 * pad, yEsc - pad);          // likely escape
    ctx.fillStyle = 'rgba(90,155,232,0.08)'; ctx.fillRect(pad, yCirc, W - 2 * pad, (H - pad) - yCirc); // likely bound/infall

    ctx.setLineDash([4, 3]); ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(230,193,90,0.8)'; ctx.beginPath(); ctx.moveTo(pad, yCirc); ctx.lineTo(W - pad, yCirc); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,112,67,0.8)'; ctx.beginPath(); ctx.moveTo(pad, yEsc); ctx.lineTo(W - pad, yEsc); ctx.stroke();
    ctx.setLineDash([]);

    // Selected sampling box.
    const bx0 = X(rMin), bx1 = X(rMax), by0 = Y(fMax), by1 = Y(fMin);
    ctx.fillStyle = 'rgba(102,240,255,0.12)'; ctx.fillRect(bx0, by0, bx1 - bx0, by1 - by0);
    ctx.strokeStyle = '#66f0ff'; ctx.lineWidth = 1.5; ctx.strokeRect(bx0, by0, bx1 - bx0, by1 - by0);

    // Scatter of representative samples (deterministic).
    let s = 0x1234abcd >>> 0;
    const rnd = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
    for (let i = 0; i < 150; i++) {
      const r = rMin + (rMax - rMin) * rnd();
      const f = fMin + (fMax - fMin) * rnd();
      const retro = allowRetro && rnd() < 0.5;
      ctx.fillStyle = retro ? 'rgba(255,95,162,0.85)' : 'rgba(102,240,255,0.9)';
      ctx.beginPath(); ctx.arc(X(r), Y(f), 1.5, 0, 7); ctx.fill();
    }

    ctx.fillStyle = '#8a96ad'; ctx.font = '10px ui-monospace, monospace';
    ctx.fillText('circular', W - pad - 48, yCirc - 3);
    ctx.fillText('escape √2', W - pad - 58, yEsc - 3);
    ctx.fillStyle = '#6f7f99';
    ctx.fillText('radius →', W - pad - 52, H - 8);
    ctx.save(); ctx.translate(11, pad + 70); ctx.rotate(-Math.PI / 2); ctx.fillText('speed × circular →', 0, 0); ctx.restore();
  }, [rMin, rMax, fMin, fMax, allowRetro]);
  return <canvas ref={ref} width={340} height={250}
    style={{ width: '100%', borderRadius: 6, display: 'block' }} />;
}

export default function TrinaryLab() {
  const [instrument, setInstrument] = useState<Instrument>(() => (labParams().get('inst') === 'census' ? 'census' : 'map'));

  // Initialise from a shareable URL config, if present.
  const urlRef = useRef<URLSearchParams | null>(null);
  if (!urlRef.current) urlRef.current = labParams();
  const U = urlRef.current;

  const [presetId, setPresetId] = useState(() => U.get('p') ?? SCENARIOS[0].id);
  const preset = getScenario(presetId);
  useAppHeader('Trinary Lab', `${preset.name} · ${instrument === 'map' ? 'destiny map' : 'census'}`);
  const [target, setTarget] = useState<TargetId>(() => (U.get('tg') as TargetId) ?? preset.launch.target);
  const [tMax, setTMax] = useState(() => pNum(U, 'tm', 180));
  const [rMin, setRMin] = useState(() => pNum(U, 'r0', 0.6));
  const [rMax, setRMax] = useState(() => pNum(U, 'r1', 4));
  const [fMin, setFMin] = useState(() => pNum(U, 'f0', 0.6));
  const [fMax, setFMax] = useState(() => pNum(U, 'f1', 1.25));
  const [allowRetro, setAllowRetro] = useState(() => U.get('rt') !== '0');
  const [habLo, setHabLo] = useState(() => pNum(U, 'hl', DEFAULT_CLASSIFY.habLo));
  const [habHi, setHabHi] = useState(() => pNum(U, 'hh', DEFAULT_CLASSIFY.habHi));
  const [targetN, setTargetN] = useState(() => pNum(U, 'n', 4000));
  const [baseSeed, setBaseSeed] = useState(() => pNum(U, 'sd', 1234567) >>> 0);
  const [massMul, setMassMul] = useState<number[]>(() => [pNum(U, 'm0', 1), pNum(U, 'm1', 1), pNum(U, 'm2', 1)]);
  const [starSoft, setStarSoft] = useState<number>(() => pNum(U, 'ss', preset.system.softening));
  const baseMasses = useMemo(() => getScenario(presetId).system.makeStars().map(s => s.mass), [presetId]);

  const [running, setRunning] = useState(false);
  const [agg, setAgg] = useState<AggSnapshot | null>(null);
  const [rate, setRate] = useState(0);
  const [engine, setEngine] = useState<Engine>(() => {
    const e = U.get('e') as Engine | null;
    if (e === 'gpu' && HAS_GPU) return 'gpu';
    if (e === 'cpu' || !HAS_WORKERS) return 'cpu';
    return 'workers';
  });
  const [copied, setCopied] = useState(false);
  const basinRef = useRef<BasinHandle>(null);

  const cfg: EnsembleConfig = useMemo(() => ({
    presetId, target, massMul, starSoft,
    classify: { ...DEFAULT_CLASSIFY, habLo, habHi },
    tMax, rMin, rMax, fMin, fMax, allowRetro, baseSeed,
  }), [presetId, target, massMul, starSoft, habLo, habHi, tMax, rMin, rMax, fMin, fMax, allowRetro, baseSeed]);

  // Keep the URL in sync so the current configuration is shareable/reproducible.
  useEffect(() => {
    const q = new URLSearchParams({
      p: presetId, tg: target, n: String(targetN), tm: String(tMax),
      r0: String(rMin), r1: String(rMax), f0: String(fMin), f1: String(fMax),
      rt: allowRetro ? '1' : '0', hl: String(habLo), hh: String(habHi),
      m0: String(massMul[0]), m1: String(massMul[1]), m2: String(massMul[2]), ss: String(starSoft),
      sd: String(baseSeed), e: engine, inst: instrument,
    });
    const base = (window.location.hash.split('?')[0] || '#/trinary-lab').replace(/^#/, '');
    window.history.replaceState(null, '', `#${base}?${q.toString()}`);
  }, [presetId, target, targetN, tMax, rMin, rMax, fMin, fMax, allowRetro, habLo, habHi, massMul, starSoft, baseSeed, engine, instrument]);

  const cfgRef = useRef(cfg); cfgRef.current = cfg;
  const targetNRef = useRef(targetN); targetNRef.current = targetN;
  const aggRef = useRef<Aggregator | null>(null);
  const runningRef = useRef(false);
  const rafRef = useRef(0);
  const tmRef = useRef(1);
  const poolRef = useRef<WorkerPool | null>(null);
  const gpuRef = useRef<GpuRunner | null>(null);
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

  const startGpu = async () => {
    try {
      if (!gpuRef.current) gpuRef.current = await GpuRunner.create();
    } catch {
      gpuRef.current = null;
      setEngine(HAS_WORKERS ? 'workers' : 'cpu');
      if (runningRef.current) (HAS_WORKERS ? startWorkers : startCpu)();
      return;
    }
    const cfgNow = cfgRef.current;
    const agg = aggRef.current!;
    while (runningRef.current && agg.count < targetNRef.current) {
      const startIdx = agg.count;
      const B = Math.min(2048, targetNRef.current - startIdx);
      const params = Array.from({ length: B }, (_, i) => sampleParams(cfgNow, startIdx + i, tmRef.current));
      let res;
      try {
        res = await gpuRef.current!.runBatch(cfgNow, params);
      } catch {
        gpuRef.current = null;
        setEngine('cpu');
        if (runningRef.current) startCpu();
        return;
      }
      if (!runningRef.current) break;
      ingestBatch(res);
    }
  };

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
    if (engineRef.current === 'gpu') { void startGpu(); }
    else if (engineRef.current === 'workers') startWorkers();
    else startCpu();
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

  const onPickPreset = (id: string) => {
    setPresetId(id); setTarget(getScenario(id).launch.target);
    setMassMul([1, 1, 1]); setStarSoft(getScenario(id).system.softening);
  };
  const setStarMass = (i: number, v: number) => setMassMul(prev => { const nx = [...prev]; nx[i] = v; return nx; });

  /** Census-this-box (from the Destiny Map's radius×speed plane): jump to the
   *  Census instrument and run the ensemble over the shared sampling box. */
  const runCensus = () => { setInstrument('census'); if (!runningRef.current) start(); };

  const copyLink = () => {
    navigator.clipboard?.writeText(window.location.href).then(() => {
      setCopied(true); window.setTimeout(() => setCopied(false), 1500);
    }).catch(() => { /* ignore */ });
  };
  const exportJSON = () => {
    if (!agg) return;
    download('trinary-ensemble.json', JSON.stringify({
      config: cfgRef.current, n: agg.n, counts: agg.counts,
      habMean: agg.habMean, habStderr: agg.habStderr, longMean: agg.longMean, longMax: agg.longMax,
      histHab: agg.histHab, histLong: agg.histLong, histEject: agg.histEject, records: agg.records,
    }, null, 2), 'application/json');
  };
  const exportCSV = () => {
    if (!agg) return;
    const head = ['rank', 'longestStableEra', 'habitableFraction', 'radius', 'speed', 'angleDeg', 'direction', 'outcome', 'seed'];
    const rows = agg.records.map((r, i) => [
      i + 1, r.longestHabitable.toFixed(3), r.habitableFraction.toFixed(3),
      r.radius.toFixed(3), r.speed.toFixed(3), r.angleDeg.toFixed(1),
      r.retro ? 'retro' : 'pro', r.outcome, r.seed,
    ]);
    download('trinary-records.csv', [head, ...rows].map(r => r.join(',')).join('\n'), 'text/csv');
  };

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
    ...(preset.system.hasBinary ? [{ value: 'binary' as TargetId, label: 'Inner binary' }] : []),
  ];

  const instTab = (i: Instrument): React.CSSProperties => ({
    appearance: 'none', border: 'none', cursor: 'pointer', padding: '8px 18px',
    font: '600 13px/1 system-ui, sans-serif', letterSpacing: 0.2,
    color: instrument === i ? '#06121f' : '#cfe0f5',
    background: instrument === i ? '#66f0ff' : 'transparent',
  });

  return (
    <>
      {/* Shared system setup lives in the app's native Settings drawer (the ⚙
          panel every app gets), so both instruments draw from one place and the
          page body holds only instrument-specific controls + visualisations. */}
      <ShellSettings>
        <Section title="System" icon="✸" defaultOpen>
          <Pills options={SCENARIOS.map(p => ({ value: p.id, label: p.name }))} value={presetId} onChange={onPickPreset} />
          <div style={{ font: '12px/1.5 system-ui', color: 'var(--cp-fg-dim, #93a2bd)', padding: '4px 2px' }}>{preset.blurb}</div>
          <Pills label="Orbit around" options={targetOptions} value={target} onChange={setTarget} />
        </Section>
        <Section title="Star masses & physics" icon="✷">
          <Slider label="Star 1 mass · gold" value={massMul[0]} min={0.1} max={4} step={0.05} onChange={(v) => setStarMass(0, v)} format={(v) => (baseMasses[0] * v).toFixed(2)} />
          <Slider label="Star 2 mass · orange" value={massMul[1]} min={0.1} max={4} step={0.05} onChange={(v) => setStarMass(1, v)} format={(v) => (baseMasses[1] * v).toFixed(2)} />
          <Slider label="Star 3 mass · blue" value={massMul[2]} min={0.1} max={4} step={0.05} onChange={(v) => setStarMass(2, v)} format={(v) => (baseMasses[2] * v).toFixed(2)} />
          <Slider label="Softening" value={starSoft} min={0.005} max={0.3} step={0.005} onChange={setStarSoft} format={(v) => v.toFixed(3)} />
          <button style={{ ...btn, padding: '5px 12px', fontSize: 12, marginTop: 4 }}
            onClick={() => { setMassMul([1, 1, 1]); setStarSoft(preset.system.softening); }}>⟲ Reset stars</button>
        </Section>
        <Section title="Simulation & climate" icon="⏱" defaultOpen>
          <Slider label="Time budget / world" value={tMax} min={60} max={400} step={20} onChange={setTMax} format={v => v.toFixed(0)} />
          <Slider label="Habitable floor (×ref)" value={habLo} min={0.1} max={1} step={0.05} onChange={setHabLo} format={v => v.toFixed(2)} />
          <Slider label="Habitable ceiling (×ref)" value={habHi} min={1} max={6} step={0.25} onChange={setHabHi} format={v => v.toFixed(2)} />
          <div style={{ font: '11px/1.5 system-ui', color: '#6f7f99', marginTop: 2 }}>
            How long each world is integrated, and the insolation band counted as habitable — used by <b style={{ color: '#9aa7bd' }}>both</b> instruments.
          </div>
        </Section>
      </ShellSettings>

      <div style={{
        position: 'absolute', inset: 0, overflow: 'auto', background: '#05060a',
        color: '#cfe0f5', font: '13px/1.5 system-ui, sans-serif', padding: '12px 14px 40px',
      }}>
      {/* Top bar: instrument selector + per-instrument actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <div style={{ display: 'inline-flex', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--cp-border, #2a3550)' }}>
          <button style={instTab('map')} onClick={() => setInstrument('map')}>▦ Destiny Map</button>
          <button style={instTab('census')} onClick={() => setInstrument('census')}>∑ Census</button>
        </div>
        <button style={btn} onClick={() => { window.location.hash = '#/trinary'; }}>← Single run</button>
        {instrument === 'census' && (
          <>
            <button style={{ ...btn, background: running ? 'rgba(255,212,0,0.18)' : 'rgba(70,217,138,0.18)' }}
              onClick={running ? pause : start}>{running ? '❚❚ Pause' : (n > 0 && n < targetN ? '▶ Resume' : '▶ Run census')}</button>
            <button style={btn} onClick={reset}>↺ Reset</button>
            <button style={btn} title="New random ensemble seed" onClick={() => setBaseSeed((Math.random() * 4294967296) >>> 0)}>🎲 Reseed</button>
          </>
        )}
        <div style={{ flex: 1 }} />
        <span style={{ font: '12px ui-monospace, monospace', color: '#6f7f99' }}>
          {rate > 0 ? `${rate.toFixed(0)} worlds/s` : ''}
        </span>
        <button style={btn} onClick={copyLink}>{copied ? '✓ Copied' : '🔗 Copy link'}</button>
        {instrument === 'census' && (
          <>
            <button style={btn} onClick={exportJSON} disabled={!agg}>⬇ JSON</button>
            <button style={btn} onClick={exportCSV} disabled={!agg}>⬇ CSV</button>
          </>
        )}
      </div>

      {/* ── Destiny Map instrument ─────────────────────────────────────── */}
      {instrument === 'map' && (
        <>
          <div style={{ ...panel, marginBottom: 12, font: '12px/1.6 system-ui', color: '#9aa7bd' }}>
            Pick a slice of launch space (<b style={{ color: '#cfe8ff' }}>Plane</b>) and a way to colour it. With the
            <b style={{ color: '#cfe8ff' }}> Exact</b> lens each pixel is one precise world — its boundaries stay fractal at
            every zoom. With the <b style={{ color: '#cfe8ff' }}>Statistical</b> lens each pixel is a mini-census of many
            worlds, painting the odds of a happy ending. <b style={{ color: '#cfe8ff' }}>Drag a box</b> to zoom; <b style={{ color: '#cfe8ff' }}>click</b> a
            point to open that world in the single-run Observatory (in a new tab, so your map stays put).
          </div>
          <BasinMap ref={basinRef} cfg={cfg} system={{
            box: { rMin, rMax, fMin, fMax },
            onBox: (b) => { setRMin(b.rMin); setRMax(b.rMax); setFMin(b.fMin); setFMax(b.fMax); },
            onRunCensus: runCensus,
          }} />
        </>
      )}

      {/* ── Census instrument ──────────────────────────────────────────── */}
      {instrument === 'census' && (
        <>
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

          <div style={{ ...panel, marginBottom: 12 }}>
            <h3 style={h3}>SAMPLING — the space of launches</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1.5fr) minmax(260px, 1fr)', gap: 18, alignItems: 'start' }}>
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0 18px' }}>
                  <Pills label="Engine" value={engine}
                    options={[
                      { value: 'cpu', label: 'CPU' },
                      ...(HAS_WORKERS ? [{ value: 'workers', label: `Workers ×${Math.min(8, Math.max(2, (navigator.hardwareConcurrency || 4) - 1))}` }] : []),
                      ...(HAS_GPU ? [{ value: 'gpu', label: 'GPU (exp)' }] : []),
                    ]}
                    onChange={(v) => setEngine(v as Engine)} />
                  {engine === 'gpu' && (
                    <div style={{ gridColumn: '1 / -1', font: '11px/1.5 system-ui', color: '#ffd27f' }}>
                      ⚠ Experimental WebGPU engine: simplified classifier (no “calm” axis, so Paradise% reads 0). Verify against CPU; falls back automatically on error.
                    </div>
                  )}
                  <Slider label="Runs (target N)" value={targetN} min={500} max={20000} step={500} onChange={setTargetN} format={v => v.toLocaleString()} />
                  <Slider label="Launch radius min" value={rMin} min={0.2} max={6} step={0.1} onChange={v => setRMin(Math.min(v, rMax))} format={v => v.toFixed(1)} />
                  <Slider label="Launch radius max" value={rMax} min={0.2} max={8} step={0.1} onChange={v => setRMax(Math.max(v, rMin))} format={v => v.toFixed(1)} />
                  <Slider label="Speed × circular min" value={fMin} min={0.2} max={1.5} step={0.05} onChange={v => setFMin(Math.min(v, fMax))} format={v => v.toFixed(2)} />
                  <Slider label="Speed × circular max" value={fMax} min={0.2} max={1.8} step={0.05} onChange={v => setFMax(Math.max(v, fMin))} format={v => v.toFixed(2)} />
                  <div style={{ gridColumn: '1 / -1' }}>
                    <Pills label="Launch direction" options={[{ value: 1, label: 'Pro + retro' }, { value: 0, label: 'Prograde only' }]}
                      value={allowRetro ? 1 : 0} onChange={v => setAllowRetro(v === 1)} />
                  </div>
                </div>
              </div>
              <div>
                <LaunchSpace rMin={rMin} rMax={rMax} fMin={fMin} fMax={fMax} allowRetro={allowRetro} />
                <div style={{ font: '11px/1.5 system-ui', color: '#6f7f99', marginTop: 6 }}>
                  Each dot is a candidate world: a launch radius and a speed (as a multiple of the local circular speed). The cyan box is what you’re sampling now — move the sliders to reshape it, or drag a box on the Destiny Map’s radius×speed plane. Below the amber line orbits tend to be bound; above the red √2 line they tend to escape.
                  <span style={{ color: '#9aa7bd' }}> Changing any setting clears the tally.</span>
                </div>
              </div>
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
                  {!agg?.records.length && <tr><td colSpan={7} style={{ color: '#6f7f99', padding: '8px 0' }}>Run the census to populate…</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
      </div>
    </>
  );
}
