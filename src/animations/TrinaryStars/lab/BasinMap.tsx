import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Slider, Pills } from '../../../components/ControlPanel';
import {
  basinContext, computeBasinPixel, basinPlanetAt, OUTCOME_RGB, OUTCOME_CODE,
  type BasinConfig, type BasinMode, type Domain,
} from './basin';
import { BasinPool } from './basinPool';
import type { EnsembleConfig } from './rng';

export interface SamplingBox { rMin: number; rMax: number; fMin: number; fMax: number }
export interface BasinSystem {
  target: string; onTarget: (t: string) => void; targetOptions: { value: string; label: string }[];
  massMul: number[]; onMass: (i: number, v: number) => void; baseMasses: number[];
  starSoft: number; onStarSoft: (v: number) => void; onReset: () => void;
  /** The ensemble's radius × speed sampling box — shared with the radspeed plane. */
  box: SamplingBox; onBox: (b: SamplingBox) => void; onRunCensus: () => void;
}

const HAS_WORKERS = typeof Worker !== 'undefined';

const DEFAULT_DOMAIN: Record<BasinMode, Domain> = {
  pos: { a0: -4, a1: 4, b0: -4, b1: 4 },
  radspeed: { a0: 0.3, a1: 5, b0: 0.3, b1: 1.5 },
  anglespeed: { a0: 0, a1: 360, b0: 0.3, b1: 1.5 },
};
const AXIS_LABELS: Record<BasinMode, [string, string]> = {
  pos: ['start x', 'start y'], radspeed: ['radius', 'speed × circular'], anglespeed: ['angle (°)', 'speed × circular'],
};

interface DimResult { D: number; alpha: number; boundary: number; pts: [number, number][] }

function DimPlot({ dim }: { dim: DimResult }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current; const ctx = cv?.getContext('2d'); if (!cv || !ctx) return;
    const W = cv.width, H = cv.height, pad = 6;
    ctx.fillStyle = '#0a0e16'; ctx.fillRect(0, 0, W, H);
    const xs = dim.pts.map(p => p[0]), ys = dim.pts.map(p => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const X = (x: number) => pad + (W - 2 * pad) * (x1 === x0 ? 0.5 : (x - x0) / (x1 - x0));
    const Y = (y: number) => H - pad - (H - 2 * pad) * (y1 === y0 ? 0.5 : (y - y0) / (y1 - y0));
    // fitted line
    ctx.strokeStyle = 'rgba(255,212,0,0.6)'; ctx.beginPath(); ctx.moveTo(X(x0), Y(y0)); ctx.lineTo(X(x1), Y(y1)); ctx.stroke();
    ctx.fillStyle = '#66f0ff';
    for (const [x, y] of dim.pts) { ctx.beginPath(); ctx.arc(X(x), Y(y), 2.5, 0, 7); ctx.fill(); }
  }, [dim]);
  return <canvas ref={ref} width={150} height={70} style={{ width: 150, height: 70, borderRadius: 4, display: 'block' }} />;
}

export interface BasinHandle { render: () => void; setPlane: (m: BasinMode) => void; }

const BasinMap = forwardRef<BasinHandle, { cfg: EnsembleConfig; system?: BasinSystem }>(function BasinMap({ cfg, system }, ref) {
  const [mode, setMode] = useState<BasinMode>('pos');
  const [res, setRes] = useState(128);
  const [samples, setSamples] = useState(1);
  const [domain, setDomain] = useState<Domain>(DEFAULT_DOMAIN.pos);
  const [posRule, setPosRule] = useState<'rest' | 'tangential'>('tangential');
  const [posSpeedFrac, setPosSpeedFrac] = useState(0.9);
  const [fixedAngle, setFixedAngle] = useState(0);
  const [fixedRadius, setFixedRadius] = useState(2);
  const [fixedRetro, setFixedRetro] = useState(false);
  const [engine, setEngine] = useState<'workers' | 'cpu'>(HAS_WORKERS ? 'workers' : 'cpu');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [hover, setHover] = useState('');
  const [dim, setDim] = useState<DimResult | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const rafRef = useRef(0);
  const runIdRef = useRef(0);
  const poolRef = useRef<BasinPool | null>(null);
  const outGridRef = useRef<Uint8Array>(new Uint8Array(0));
  const tGridRef = useRef<Float32Array>(new Float32Array(0));

  const cfgRef = useRef(cfg); cfgRef.current = cfg;
  const boxRef = useRef(system?.box); boxRef.current = system?.box;
  const st = { mode, domain, res, samples, posRule, posSpeedFrac, fixedAngle, fixedRadius, fixedRetro, engine };
  const stateRef = useRef(st); stateRef.current = st;

  // In the radius×speed plane the map shares the ensemble's sampling box, so
  // zooming the map re-aims the census (and vice-versa).
  const effDomain: Domain = (mode === 'radspeed' && system?.box)
    ? { a0: system.box.rMin, a1: system.box.rMax, b0: system.box.fMin, b1: system.box.fMax }
    : domain;
  const currentBc = (): BasinConfig => ({
    mode, domain: effDomain, res, samples, posRule, posSpeedFrac, fixedAngle, fixedRadius, fixedRetro,
  });
  const goObservatory = (i: number, j: number) => {
    const d = effDomain;
    const ax = d.a0 + (d.a1 - d.a0) * ((i + 0.5) / res);
    const by = d.b1 - (d.b1 - d.b0) * ((j + 0.5) / res);
    const planet = basinPlanetAt(cfg, currentBc(), ax, by);
    const q = new URLSearchParams({
      p: cfg.presetId, tg: cfg.target,
      m0: String(cfg.massMul[0]), m1: String(cfg.massMul[1]), m2: String(cfg.massMul[2]), ss: String(cfg.starSoft),
      px: planet.x.toFixed(5), py: planet.y.toFixed(5), vx: planet.vx.toFixed(5), vy: planet.vy.toFixed(5),
    });
    window.location.hash = `#/trinary?${q.toString()}`;
  };

  const measureDimension = () => {
    const N = stateRef.current.res;
    const out = outGridRef.current;
    if (out.length !== N * N) return;
    const sizes: number[] = [];
    for (let s = 1; s <= Math.min(32, N >> 2); s *= 2) sizes.push(s);
    const pts: [number, number][] = [];
    for (const s of sizes) {
      let boxes = 0;
      for (let by = 0; by < N; by += s) for (let bx = 0; bx < N; bx += s) {
        let first = -1, mixed = false;
        for (let j = by; j < Math.min(by + s, N) && !mixed; j++) {
          for (let i = bx; i < Math.min(bx + s, N); i++) {
            const o = out[j * N + i];
            if (first < 0) first = o; else if (o !== first) { mixed = true; break; }
          }
        }
        if (mixed) boxes++;
      }
      if (boxes > 0) pts.push([Math.log(1 / s), Math.log(boxes)]);
    }
    const nn = pts.length;
    let sx = 0, sy = 0, sxx = 0, sxy = 0;
    for (const [x, y] of pts) { sx += x; sy += y; sxx += x * x; sxy += x * y; }
    const D = nn > 1 ? (nn * sxy - sx * sy) / (nn * sxx - sx * sx) : 0;
    let bd = 0, pr = 0;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const c = out[j * N + i];
      if (i + 1 < N) { pr++; if (out[j * N + i + 1] !== c) bd++; }
      if (j + 1 < N) { pr++; if (out[(j + 1) * N + i] !== c) bd++; }
    }
    setDim({ D, alpha: 2 - D, boundary: pr ? bd / pr : 0, pts });
  };

  const stop = () => { runIdRef.current++; cancelAnimationFrame(rafRef.current); poolRef.current?.dispose(); poolRef.current = null; setBusy(false); };

  const render = () => {
    cancelAnimationFrame(rafRef.current);
    poolRef.current?.dispose(); poolRef.current = null;
    const runId = ++runIdRef.current;
    const cfgNow = cfgRef.current;
    const s = stateRef.current;
    const N = s.res;
    const dom = (s.mode === 'radspeed' && boxRef.current)
      ? { a0: boxRef.current.rMin, a1: boxRef.current.rMax, b0: boxRef.current.fMin, b1: boxRef.current.fMax }
      : s.domain;
    const bc: BasinConfig = {
      mode: s.mode, domain: dom, res: N, samples: s.samples,
      posRule: s.posRule, posSpeedFrac: s.posSpeedFrac, fixedAngle: s.fixedAngle, fixedRadius: s.fixedRadius, fixedRetro: s.fixedRetro,
    };
    const cv = canvasRef.current!; cv.width = N; cv.height = N;
    const ctx = cv.getContext('2d')!;
    const img = ctx.createImageData(N, N);
    const outGrid = new Uint8Array(N * N); const tGrid = new Float32Array(N * N);
    outGridRef.current = outGrid; tGridRef.current = tGrid;
    setDim(null); setBusy(true); setProgress(0);
    let painted = 0; const total = N * N;

    const paint = (start: number, rgb: Uint8Array, out: Uint8Array, tt: Float32Array, cnt: number) => {
      for (let k = 0; k < cnt; k++) {
        const p = start + k, o = p * 4;
        img.data[o] = rgb[k * 3]; img.data[o + 1] = rgb[k * 3 + 1]; img.data[o + 2] = rgb[k * 3 + 2]; img.data[o + 3] = 255;
        outGrid[p] = out[k]; tGrid[p] = tt[k];
      }
      painted += cnt;
    };

    if (s.engine === 'workers' && HAS_WORKERS) {
      try {
        const size = Math.min(8, Math.max(2, (navigator.hardwareConcurrency || 4) - 1));
        const pool = new BasinPool(size,
          (b) => { if (runId !== runIdRef.current) return; paint(b.start, b.rgb, b.out, b.t, b.count); ctx.putImageData(img, 0, 0); setProgress(painted / total); },
          () => { if (runId !== runIdRef.current) return; ctx.putImageData(img, 0, 0); setBusy(false); measureDimension(); });
        poolRef.current = pool;
        pool.run(cfgNow, bc);
        return;
      } catch { /* fall through to CPU */ }
    }
    // CPU progressive
    const bctx = basinContext(cfgNow, bc);
    let p = 0;
    const chunk = () => {
      if (runId !== runIdRef.current) return;
      const t0 = performance.now();
      while (p < total && performance.now() - t0 < 24) {
        const px = computeBasinPixel(bctx, p);
        const o = p * 4;
        img.data[o] = px.r; img.data[o + 1] = px.g; img.data[o + 2] = px.b; img.data[o + 3] = 255;
        outGrid[p] = px.out; tGrid[p] = px.t; p++;
      }
      ctx.putImageData(img, 0, 0); setProgress(p / total);
      if (p < total) rafRef.current = requestAnimationFrame(chunk);
      else { setBusy(false); measureDimension(); }
    };
    rafRef.current = requestAnimationFrame(chunk);
  };

  // The radspeed plane derives its domain from the shared census box, so only
  // reset the internal domain for the other planes.
  useEffect(() => { if (mode !== 'radspeed') setDomain(DEFAULT_DOMAIN[mode]); /* eslint-disable-next-line */ }, [mode]);
  useEffect(() => () => { cancelAnimationFrame(rafRef.current); poolRef.current?.dispose(); }, []);

  const switchMode = (m: BasinMode) => { stop(); setMode(m); };

  // Imperative handle so the lab's Simple-mode experiment buttons can drive it.
  useImperativeHandle(ref, () => ({
    render,
    setPlane: (m: BasinMode) => { stop(); setMode(m); setDomain(DEFAULT_DOMAIN[m]); window.setTimeout(() => render(), 60); },
  }), []);

  // --- Drag-to-zoom ---
  const onDown = (e: React.PointerEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    dragRef.current = { x0: e.clientX - r.left, y0: e.clientY - r.top, x1: e.clientX - r.left, y1: e.clientY - r.top };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const i = Math.min(res - 1, Math.max(0, Math.floor(((e.clientX - r.left) / r.width) * res)));
    const j = Math.min(res - 1, Math.max(0, Math.floor(((e.clientY - r.top) / r.height) * res)));
    if (tGridRef.current.length) {
      const ax = effDomain.a0 + (effDomain.a1 - effDomain.a0) * ((i + 0.5) / res);
      const by = effDomain.b1 - (effDomain.b1 - effDomain.b0) * ((j + 0.5) / res);
      const [la, lb] = AXIS_LABELS[mode];
      setHover(`${la}=${ax.toFixed(2)} · ${lb}=${by.toFixed(2)} → ${OUTCOME_CODE[outGridRef.current[j * res + i]]} @ t=${tGridRef.current[j * res + i].toFixed(0)} · click to open in single run`);
    }
    if (dragRef.current) {
      dragRef.current.x1 = e.clientX - r.left; dragRef.current.y1 = e.clientY - r.top;
      const d = dragRef.current, ov = overlayRef.current;
      if (ov) {
        ov.style.display = 'block';
        ov.style.left = `${Math.min(d.x0, d.x1)}px`; ov.style.top = `${Math.min(d.y0, d.y1)}px`;
        ov.style.width = `${Math.abs(d.x1 - d.x0)}px`; ov.style.height = `${Math.abs(d.y1 - d.y0)}px`;
      }
    }
  };
  const onUp = (e: React.PointerEvent) => {
    const d = dragRef.current; dragRef.current = null;
    if (overlayRef.current) overlayRef.current.style.display = 'none';
    if (!d) return;
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const dx = Math.abs(d.x1 - d.x0), dy = Math.abs(d.y1 - d.y0);
    if (dx < 6 && dy < 6) { // a click → open that exact world in the Observatory
      const i = Math.min(res - 1, Math.max(0, Math.floor((d.x0 / r.width) * res)));
      const j = Math.min(res - 1, Math.max(0, Math.floor((d.y0 / r.height) * res)));
      goObservatory(i, j);
      return;
    }
    if (dx < 6 || dy < 6) return; // degenerate selection
    const nx0 = Math.min(d.x0, d.x1) / r.width, nx1 = Math.max(d.x0, d.x1) / r.width;
    const ny0 = Math.min(d.y0, d.y1) / r.height, ny1 = Math.max(d.y0, d.y1) / r.height;
    const nd: Domain = {
      a0: effDomain.a0 + (effDomain.a1 - effDomain.a0) * nx0, a1: effDomain.a0 + (effDomain.a1 - effDomain.a0) * nx1,
      b0: effDomain.b1 - (effDomain.b1 - effDomain.b0) * ny1, b1: effDomain.b1 - (effDomain.b1 - effDomain.b0) * ny0,
    };
    if (mode === 'radspeed' && system?.onBox) system.onBox({ rMin: nd.a0, rMax: nd.a1, fMin: nd.b0, fMax: nd.b1 });
    else setDomain(nd);
    setTimeout(render, mode === 'radspeed' ? 40 : 0);
  };

  const panel: React.CSSProperties = { background: 'rgba(12,16,24,0.6)', border: '1px solid rgba(120,150,200,0.18)', borderRadius: 10, padding: 12 };
  const h3: React.CSSProperties = { margin: '0 0 8px', font: '600 12px/1.2 ui-monospace, monospace', color: '#9ec7ff', letterSpacing: 0.4 };
  const btn: React.CSSProperties = { padding: '6px 14px', borderRadius: 6, border: '1px solid var(--cp-border, #2a3550)', background: 'rgba(255,255,255,0.06)', color: '#e8edf6', cursor: 'pointer', fontSize: 13 };

  return (
    <div style={{ ...panel, marginBottom: 12 }}>
      <h3 style={h3}>BASIN MAP — fractal portrait of fates</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 18, alignItems: 'start' }}>
        {/* Controls */}
        <div>
          {system && (
            <div style={{ marginBottom: 8 }}>
              {mode !== 'pos' && <Pills label="Orbit around" options={system.targetOptions} value={system.target} onChange={system.onTarget} />}
              <Slider label="Star 1 mass · gold" value={system.massMul[0]} min={0.1} max={4} step={0.05} onChange={(v) => system.onMass(0, v)} format={(v) => (system.baseMasses[0] * v).toFixed(2)} />
              <Slider label="Star 2 mass · orange" value={system.massMul[1]} min={0.1} max={4} step={0.05} onChange={(v) => system.onMass(1, v)} format={(v) => (system.baseMasses[1] * v).toFixed(2)} />
              <Slider label="Star 3 mass · blue" value={system.massMul[2]} min={0.1} max={4} step={0.05} onChange={(v) => system.onMass(2, v)} format={(v) => (system.baseMasses[2] * v).toFixed(2)} />
              <Slider label="Softening" value={system.starSoft} min={0.005} max={0.3} step={0.005} onChange={system.onStarSoft} format={(v) => v.toFixed(3)} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button style={{ ...btn, padding: '5px 12px', fontSize: 12 }} onClick={system.onReset}>⟲ Reset stars</button>
                <span style={{ font: '11px system-ui', color: '#6f7f99' }}>then Render to apply</span>
              </div>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', margin: '10px 0' }} />
            </div>
          )}
          <Pills label="Plane" value={mode} options={[
            { value: 'pos', label: 'Start position' }, { value: 'radspeed', label: 'Radius × speed' }, { value: 'anglespeed', label: 'Angle × speed' },
          ]} onChange={(v) => switchMode(v as BasinMode)} />
          {mode === 'pos' && (
            <>
              <Pills label="Launch from each point" value={posRule}
                options={[{ value: 'tangential', label: 'Tangential' }, { value: 'rest', label: 'At rest' }]}
                onChange={(v) => setPosRule(v as 'rest' | 'tangential')} />
              {posRule === 'tangential' &&
                <Slider label="Speed × circular" value={posSpeedFrac} min={0.2} max={1.6} step={0.05} onChange={setPosSpeedFrac} format={v => v.toFixed(2)} />}
            </>
          )}
          {mode === 'radspeed' && <Slider label="Fixed angle (°)" value={fixedAngle} min={0} max={360} step={5} onChange={setFixedAngle} format={v => `${v}`} />}
          {mode === 'anglespeed' && <Slider label="Fixed radius" value={fixedRadius} min={0.3} max={6} step={0.1} onChange={setFixedRadius} format={v => v.toFixed(1)} />}
          {mode !== 'pos' && <Pills label="Direction" value={fixedRetro ? 1 : 0} options={[{ value: 0, label: 'Prograde' }, { value: 1, label: 'Retrograde' }]} onChange={(v) => setFixedRetro(v === 1)} />}
          <Pills label="Resolution" value={res} options={[96, 128, 192, 256].map(r => ({ value: r, label: `${r}²` }))} onChange={setRes} />
          <Pills label="Samples / pixel" value={samples} options={[{ value: 1, label: '1 (crisp)' }, { value: 2, label: '4 (smooth)' }, { value: 3, label: '9' }]} onChange={setSamples} />
          {HAS_WORKERS && <Pills label="Engine" value={engine} options={[{ value: 'workers', label: `Workers ×${Math.min(8, Math.max(2, (navigator.hardwareConcurrency || 4) - 1))}` }, { value: 'cpu', label: 'CPU' }]} onChange={(v) => setEngine(v as 'workers' | 'cpu')} />}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button style={{ ...btn, background: busy ? 'rgba(255,212,0,0.18)' : 'rgba(70,217,138,0.18)' }} onClick={busy ? stop : render}>{busy ? '❚❚ Stop' : '▦ Render map'}</button>
            <button style={btn} onClick={() => {
              if (mode === 'radspeed' && system?.onBox) {
                const d = DEFAULT_DOMAIN.radspeed;
                system.onBox({ rMin: d.a0, rMax: d.a1, fMin: d.b0, fMax: d.b1 });
              } else setDomain(DEFAULT_DOMAIN[mode]);
              setTimeout(render, 40);
            }}>⤢ Reset zoom</button>
            {mode === 'radspeed' && system?.onRunCensus && (
              <button style={btn} title="Run the ensemble on this radius × speed box" onClick={system.onRunCensus}>∑ Census this box</button>
            )}
          </div>
          {busy && <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)', marginTop: 8 }}><div style={{ height: '100%', width: `${progress * 100}%`, background: '#46d98a', borderRadius: 3 }} /></div>}

          {dim && (
            <div style={{ display: 'flex', gap: 12, marginTop: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <DimPlot dim={dim} />
              <div style={{ font: '12px/1.5 ui-monospace, monospace' }}>
                <div>boundary dimension&nbsp;<b style={{ color: '#ffd27f' }}>D ≈ {dim.D.toFixed(3)}</b></div>
                <div>uncertainty exponent&nbsp;<b style={{ color: '#66f0ff' }}>α ≈ {dim.alpha.toFixed(3)}</b></div>
                <div style={{ color: '#9aa7bd' }}>boundary pixels {(dim.boundary * 100).toFixed(0)}%</div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 12px', marginTop: 10, font: '11px ui-monospace, monospace' }}>
            {OUTCOME_CODE.filter(o => o !== 'blowup').map(o => (
              <span key={o} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: `rgb(${OUTCOME_RGB[o].join(',')})` }} />{o}
              </span>
            ))}
          </div>
          <div style={{ font: '11px/1.5 system-ui', color: '#6f7f99', marginTop: 8 }}>
            One pixel = one exact starting condition, integrated to its fate. Hue = outcome, brightness = how long it lasted. Drag a box to zoom — the boundaries stay intricate at every scale: that filigree is the three-body problem’s fractal final-state sensitivity. D is the box-counting dimension of the boundary (1 = smooth, →2 = space-filling); α = 2−D is the uncertainty exponent (smaller = more unpredictable: 10× better precision only sharpens the forecast by 10^α).
          </div>
        </div>

        {/* Map */}
        <div style={{ maxWidth: 460, width: '100%' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <canvas ref={canvasRef} width={res} height={res}
              style={{ width: '100%', aspectRatio: '1', borderRadius: 6, display: 'block', cursor: 'crosshair', imageRendering: samples === 1 ? 'pixelated' : 'auto', touchAction: 'none', background: '#0a0e16' }}
              onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={() => setHover('')} />
            <div ref={overlayRef} style={{ position: 'absolute', display: 'none', border: '1px solid #66f0ff', background: 'rgba(102,240,255,0.12)', pointerEvents: 'none' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', font: '10px ui-monospace, monospace', color: '#6f7f99', marginTop: 3 }}>
            <span>{AXIS_LABELS[mode][0]} {effDomain.a0.toFixed(2)}…{effDomain.a1.toFixed(2)}</span>
            <span>{AXIS_LABELS[mode][1]} {effDomain.b0.toFixed(2)}…{effDomain.b1.toFixed(2)}</span>
          </div>
          <div style={{ font: '11px ui-monospace, monospace', color: '#9aa7bd', marginTop: 4, minHeight: 16 }}>{hover || 'Hover the map to inspect a starting condition.'}</div>
        </div>
      </div>
    </div>
  );
});

export default BasinMap;
