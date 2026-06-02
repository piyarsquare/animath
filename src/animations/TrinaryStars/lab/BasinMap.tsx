import React, { useEffect, useRef, useState } from 'react';
import { Slider, Pills } from '../../../components/ControlPanel';
import { getPreset, buildStars, launchPlanet, orbitFrame } from '../presets';
import { runPlanet } from './runner';
import type { Planet, Star } from '../physics';
import type { Outcome } from '../analysis/types';
import type { EnsembleConfig } from './rng';

const DEG = Math.PI / 180;
type Mode = 'pos' | 'radspeed' | 'anglespeed';
interface Domain { a0: number; a1: number; b0: number; b1: number; }

const OUTCOME_RGB: Record<Outcome, [number, number, number]> = {
  happy: [70, 217, 138], survived: [120, 170, 255], 'planet-ejected': [120, 95, 232],
  'planet-destroyed': [255, 110, 60], blowup: [80, 80, 80],
};
const OUTCOME_CODE: Outcome[] = ['happy', 'survived', 'planet-ejected', 'planet-destroyed', 'blowup'];

const DEFAULT_DOMAIN: Record<Mode, Domain> = {
  pos: { a0: -4, a1: 4, b0: -4, b1: 4 },
  radspeed: { a0: 0.3, a1: 5, b0: 0.3, b1: 1.5 },
  anglespeed: { a0: 0, a1: 360, b0: 0.3, b1: 1.5 },
};
const AXIS_LABELS: Record<Mode, [string, string]> = {
  pos: ['start x', 'start y'], radspeed: ['radius', 'speed × circular'], anglespeed: ['angle (°)', 'speed × circular'],
};

export default function BasinMap({ cfg }: { cfg: EnsembleConfig }) {
  const [mode, setMode] = useState<Mode>('pos');
  const [res, setRes] = useState(128);
  const [samples, setSamples] = useState(1); // S → S² subsamples (neighborhood averaging)
  const [domain, setDomain] = useState<Domain>(DEFAULT_DOMAIN.pos);
  const [posRule, setPosRule] = useState<'rest' | 'tangential'>('tangential');
  const [posSpeedFrac, setPosSpeedFrac] = useState(0.9);
  const [fixedAngle, setFixedAngle] = useState(0);
  const [fixedRadius, setFixedRadius] = useState(2);
  const [fixedRetro, setFixedRetro] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [hover, setHover] = useState<string>('');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);
  const runIdRef = useRef(0);
  const outGridRef = useRef<Uint8Array>(new Uint8Array(0));
  const tGridRef = useRef<Float32Array>(new Float32Array(0));

  const cfgRef = useRef(cfg); cfgRef.current = cfg;
  const stateRef = useRef({ mode, domain, res, samples, posRule, posSpeedFrac, fixedAngle, fixedRadius, fixedRetro });
  stateRef.current = { mode, domain, res, samples, posRule, posSpeedFrac, fixedAngle, fixedRadius, fixedRetro };

  const makePlanet = (stars: Star[], ax: number, by: number, st: typeof stateRef.current, targetMass: number, Mtot: number): Planet => {
    if (st.mode === 'pos') {
      if (st.posRule === 'rest') return { x: ax, y: by, vx: 0, vy: 0, ax: 0, ay: 0 };
      const r = Math.hypot(ax, by) || 1e-6;
      const v = st.posSpeedFrac * Math.sqrt(Mtot / r);
      return { x: ax, y: by, vx: v * (-by / r), vy: v * (ax / r), ax: 0, ay: 0 };
    }
    if (st.mode === 'radspeed') {
      const v = by * Math.sqrt(targetMass / Math.max(0.05, ax));
      return launchPlanet(stars, cfgRef.current.target, ax, v, st.fixedAngle * DEG, st.fixedRetro);
    }
    const v = by * Math.sqrt(targetMass / Math.max(0.05, st.fixedRadius));
    return launchPlanet(stars, cfgRef.current.target, st.fixedRadius, v, ax * DEG, st.fixedRetro);
  };

  const render = () => {
    cancelAnimationFrame(rafRef.current);
    const runId = ++runIdRef.current;
    const cfgNow = cfgRef.current;
    const st = { ...stateRef.current };
    const N = st.res;
    const S = st.samples;
    const preset = getPreset(cfgNow.presetId);
    const refStars = buildStars(preset, cfgNow.massMul);
    const targetMass = orbitFrame(refStars, cfgNow.target).mass;
    const Mtot = refStars.reduce((m, s) => m + s.mass, 0);
    const { a0, a1, b0, b1 } = st.domain;

    const cv = canvasRef.current!;
    cv.width = N; cv.height = N;
    const ctx = cv.getContext('2d')!;
    const img = ctx.createImageData(N, N);
    const outGrid = new Uint8Array(N * N);
    const tGrid = new Float32Array(N * N);
    outGridRef.current = outGrid; tGridRef.current = tGrid;

    setBusy(true);
    let p = 0;
    const total = N * N;

    const chunk = () => {
      if (runId !== runIdRef.current) return;
      const t0 = performance.now();
      while (p < total && performance.now() - t0 < 24) {
        const i = p % N, j = Math.floor(p / N);
        let cr = 0, cg = 0, cb = 0;
        let centerOut = 0, centerT = 0;
        const sub = S * S;
        for (let sj = 0; sj < S; sj++) for (let si = 0; si < S; si++) {
          const fx = (i + (si + 0.5) / S) / N;
          const fy = (j + (sj + 0.5) / S) / N;
          const ax = a0 + (a1 - a0) * fx;
          const by = b1 - (b1 - b0) * fy; // top row = b1
          const stars = buildStars(preset, cfgNow.massMul);
          const r = runPlanet(cfgNow, stars, makePlanet(stars, ax, by, st, targetMass, Mtot));
          const base = OUTCOME_RGB[r.outcome];
          const tb = 0.28 + 0.72 * Math.min(1, r.tSim / cfgNow.tMax);
          cr += base[0] * tb; cg += base[1] * tb; cb += base[2] * tb;
          if (si === 0 && sj === 0) { centerOut = OUTCOME_CODE.indexOf(r.outcome); centerT = r.tSim; }
        }
        const o = p * 4;
        img.data[o] = cr / sub; img.data[o + 1] = cg / sub; img.data[o + 2] = cb / sub; img.data[o + 3] = 255;
        outGrid[p] = centerOut; tGrid[p] = centerT;
        p++;
      }
      ctx.putImageData(img, 0, 0);
      setProgress(p / total);
      if (p < total) { rafRef.current = requestAnimationFrame(chunk); }
      else setBusy(false);
    };
    rafRef.current = requestAnimationFrame(chunk);
  };

  const stop = () => { runIdRef.current++; cancelAnimationFrame(rafRef.current); setBusy(false); };

  // Reset the domain (and clear) whenever the mapped plane or the system changes.
  useEffect(() => { setDomain(DEFAULT_DOMAIN[mode]); /* eslint-disable-next-line */ }, [mode]);
  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const switchMode = (m: Mode) => { stop(); setMode(m); };

  // --- Drag-to-zoom ---
  const onDown = (e: React.PointerEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    dragRef.current = { x0: e.clientX - rect.left, y0: e.clientY - rect.top, x1: e.clientX - rect.left, y1: e.clientY - rect.top };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const i = Math.min(res - 1, Math.max(0, Math.floor(((e.clientX - rect.left) / rect.width) * res)));
    const j = Math.min(res - 1, Math.max(0, Math.floor(((e.clientY - rect.top) / rect.height) * res)));
    const out = outGridRef.current[j * res + i];
    const tt = tGridRef.current[j * res + i];
    const { a0, a1, b0, b1 } = domain;
    const ax = a0 + (a1 - a0) * ((i + 0.5) / res);
    const by = b1 - (b1 - b0) * ((j + 0.5) / res);
    const [la, lb] = AXIS_LABELS[mode];
    if (tGridRef.current.length) setHover(`${la}=${ax.toFixed(2)} · ${lb}=${by.toFixed(2)} → ${OUTCOME_CODE[out]} @ t=${tt.toFixed(0)}`);

    if (dragRef.current) {
      dragRef.current.x1 = e.clientX - rect.left; dragRef.current.y1 = e.clientY - rect.top;
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
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    if (Math.abs(d.x1 - d.x0) < 6 || Math.abs(d.y1 - d.y0) < 6) return; // treat as click
    const nx0 = Math.min(d.x0, d.x1) / rect.width, nx1 = Math.max(d.x0, d.x1) / rect.width;
    const ny0 = Math.min(d.y0, d.y1) / rect.height, ny1 = Math.max(d.y0, d.y1) / rect.height;
    const { a0, a1, b0, b1 } = domain;
    setDomain({
      a0: a0 + (a1 - a0) * nx0, a1: a0 + (a1 - a0) * nx1,
      b0: b1 - (b1 - b0) * ny1, b1: b1 - (b1 - b0) * ny0,
    });
    setTimeout(render, 0); // recompute the zoomed region
  };

  const panel: React.CSSProperties = {
    background: 'rgba(12,16,24,0.6)', border: '1px solid rgba(120,150,200,0.18)', borderRadius: 10, padding: 12,
  };
  const h3: React.CSSProperties = { margin: '0 0 8px', font: '600 12px/1.2 ui-monospace, monospace', color: '#9ec7ff', letterSpacing: 0.4 };
  const btn: React.CSSProperties = {
    padding: '6px 14px', borderRadius: 6, border: '1px solid var(--cp-border, #2a3550)',
    background: 'rgba(255,255,255,0.06)', color: '#e8edf6', cursor: 'pointer', fontSize: 13,
  };

  return (
    <div style={{ ...panel, marginBottom: 12 }}>
      <h3 style={h3}>BASIN MAP — fractal portrait of fates</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 1fr) minmax(260px, 360px)', gap: 18, alignItems: 'start' }}>
        {/* Controls */}
        <div>
          <Pills label="Plane" value={mode} options={[
            { value: 'pos', label: 'Start position' }, { value: 'radspeed', label: 'Radius × speed' }, { value: 'anglespeed', label: 'Angle × speed' },
          ]} onChange={(v) => switchMode(v as Mode)} />
          {mode === 'pos' && (
            <>
              <Pills label="Launch from each point" value={posRule}
                options={[{ value: 'tangential', label: 'Tangential' }, { value: 'rest', label: 'At rest' }]}
                onChange={(v) => setPosRule(v as 'rest' | 'tangential')} />
              {posRule === 'tangential' &&
                <Slider label="Speed × circular" value={posSpeedFrac} min={0.2} max={1.6} step={0.05} onChange={setPosSpeedFrac} format={v => v.toFixed(2)} />}
            </>
          )}
          {mode === 'radspeed' &&
            <Slider label="Fixed angle (°)" value={fixedAngle} min={0} max={360} step={5} onChange={setFixedAngle} format={v => `${v}`} />}
          {mode === 'anglespeed' &&
            <Slider label="Fixed radius" value={fixedRadius} min={0.3} max={6} step={0.1} onChange={setFixedRadius} format={v => v.toFixed(1)} />}
          {mode !== 'pos' &&
            <Pills label="Direction" value={fixedRetro ? 1 : 0}
              options={[{ value: 0, label: 'Prograde' }, { value: 1, label: 'Retrograde' }]} onChange={(v) => setFixedRetro(v === 1)} />}
          <Pills label="Resolution" value={res} options={[96, 128, 192, 256].map(r => ({ value: r, label: `${r}²` }))} onChange={setRes} />
          <Pills label="Samples / pixel" value={samples}
            options={[{ value: 1, label: '1 (crisp)' }, { value: 2, label: '4 (smooth)' }, { value: 3, label: '9 (smoother)' }]}
            onChange={setSamples} />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button style={{ ...btn, background: busy ? 'rgba(255,212,0,0.18)' : 'rgba(70,217,138,0.18)' }}
              onClick={busy ? stop : render}>{busy ? '❚❚ Stop' : '▦ Render map'}</button>
            <button style={btn} onClick={() => { setDomain(DEFAULT_DOMAIN[mode]); setTimeout(render, 0); }}>⤢ Reset zoom</button>
          </div>
          {busy && (
            <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)', marginTop: 8 }}>
              <div style={{ height: '100%', width: `${progress * 100}%`, background: '#46d98a', borderRadius: 3 }} />
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
            One pixel = one exact starting condition (no averaging at 1×), integrated to its fate. Hue = outcome, brightness = how long it lasted. Drag a box on the map to zoom in — the boundaries stay intricate at every scale: that filigree is the three-body problem’s fractal final-state sensitivity. Higher resolution / samples are slower.
          </div>
        </div>

        {/* Map */}
        <div>
          <div style={{ position: 'relative', width: '100%' }}>
            <canvas ref={canvasRef} width={res} height={res}
              style={{ width: '100%', aspectRatio: '1', borderRadius: 6, display: 'block', cursor: 'crosshair', imageRendering: samples === 1 ? 'pixelated' : 'auto', touchAction: 'none', background: '#0a0e16' }}
              onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={() => setHover('')} />
            <div ref={overlayRef} style={{ position: 'absolute', display: 'none', border: '1px solid #66f0ff', background: 'rgba(102,240,255,0.12)', pointerEvents: 'none' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', font: '10px ui-monospace, monospace', color: '#6f7f99', marginTop: 3 }}>
            <span>{AXIS_LABELS[mode][0]} {domain.a0.toFixed(2)}…{domain.a1.toFixed(2)}</span>
            <span>{AXIS_LABELS[mode][1]} {domain.b0.toFixed(2)}…{domain.b1.toFixed(2)}</span>
          </div>
          <div style={{ font: '11px ui-monospace, monospace', color: '#9aa7bd', marginTop: 4, minHeight: 16 }}>{hover || 'Hover the map to inspect a starting condition.'}</div>
        </div>
      </div>
    </div>
  );
}
