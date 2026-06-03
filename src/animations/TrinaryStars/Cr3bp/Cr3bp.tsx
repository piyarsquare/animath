import React, { useEffect, useRef, useState } from 'react';
import { Slider, Pills } from '../../../components/ControlPanel';
import { useAppHeader, useAppExplainer } from '../../../components/AppShell';
import { usePersistentState } from '../../../lib/usePersistentState';
import { omega, rk4, jacobi, lagrangePoints, type State } from './cr3bp';
import explainer from './EXPLAINER.md?raw';

const EXT = 1.7;                 // half-extent of the co-rotating view
const VX_EXT = 2.5;              // half-extent of ẋ on the Poincaré axis
const GROUP_COLORS = ['#66f0ff', '#46d98a', '#ffd27f', '#ff5fa2', '#c08cff', '#9ec7ff', '#ff7043'];
const MAX_PTS = 600;             // section points kept per trajectory

interface Group { color: string; pts: [number, number][]; }

export default function Cr3bp() {
  useAppHeader('Restricted 3-Body', 'co-rotating frame · Lagrange · Poincaré');
  useAppExplainer(explainer);

  const [mu, setMu] = usePersistentState('cr3bp:mu', 0.1);
  const [C, setC] = usePersistentState('cr3bp:C', 3.05);
  const [speed, setSpeed] = usePersistentState('cr3bp:speed', 30);
  const [showHill, setShowHill] = usePersistentState('cr3bp:hill', true);
  const [showLag, setShowLag] = usePersistentState('cr3bp:lag', true);
  const [running, setRunning] = useState(true);
  const [info, setInfo] = useState('Click the left view (or the Poincaré plane) to launch a trajectory of the chosen Jacobi energy.');

  const viewRef = useRef<HTMLCanvasElement>(null);
  const sectRef = useRef<HTMLCanvasElement>(null);
  const refs = useRef({ mu, C, speed, showHill, showLag, running });
  refs.current = { mu, C, speed, showHill, showLag, running };

  const particle = useRef<State | null>(null);
  const trail = useRef<[number, number][]>([]);
  const groups = useRef<Group[]>([]);
  const groupIdx = useRef(0);
  const prev = useRef<State | null>(null);

  const clearAll = () => { particle.current = null; trail.current = []; groups.current = []; groupIdx.current = 0; prev.current = null; };

  // Launch a trajectory; v perpendicular (vx=0) unless vx0 is given (section
  // seeding). cOverride sets the Jacobi energy to a specific value (e.g. L4).
  const launch = (x: number, y: number, vx0?: number, cOverride?: number) => {
    const m = refs.current.mu;
    const c = cOverride ?? refs.current.C;
    if (cOverride != null) setC(cOverride);
    const vx = vx0 ?? 0;
    const v2 = 2 * omega(x, y, m) - c - vx * vx;
    if (v2 < 0) { setInfo('That point is inside the forbidden (grey) region for this Jacobi energy — pick a brighter spot.'); return; }
    particle.current = { x, y, vx, vy: Math.sqrt(v2) };
    prev.current = { ...particle.current };
    trail.current = [];
    groups.current.push({ color: GROUP_COLORS[groupIdx.current % GROUP_COLORS.length], pts: [] });
    groupIdx.current++;
    setInfo(`Launched · C = ${jacobi(particle.current, m).toFixed(3)} · ${groups.current.length} trajectories plotted`);
  };

  useEffect(() => {
    const view = viewRef.current, sect = sectRef.current;
    const vc = view?.getContext('2d'), sc = sect?.getContext('2d');
    if (!view || !sect || !vc || !sc) return;
    let raf = 0;

    const toView = (x: number, y: number, W: number, H: number): [number, number] =>
      [W * (x + EXT) / (2 * EXT), H * (EXT - y) / (2 * EXT)];
    const toSect = (x: number, vx: number, W: number, H: number): [number, number] =>
      [W * (x + EXT) / (2 * EXT), H * (VX_EXT - vx) / (2 * VX_EXT)];

    const frame = () => {
      raf = requestAnimationFrame(frame);
      const { mu, C, speed, showHill, showLag, running } = refs.current;
      const W = view.clientWidth, H = view.clientHeight;
      if (view.width !== W) view.width = W; if (view.height !== H) view.height = H;
      const SW = sect.clientWidth, SH = sect.clientHeight;
      if (sect.width !== SW) sect.width = SW; if (sect.height !== SH) sect.height = SH;

      // Integrate the active particle.
      if (running && particle.current) {
        for (let k = 0; k < speed; k++) {
          const p0 = prev.current!;
          const p1 = rk4(p0, 0.004, mu);
          // Section crossing: y=0 upward (vy>0).
          if (p0.y < 0 && p1.y >= 0 && p1.vy > 0) {
            const f = -p0.y / (p1.y - p0.y);
            const xc = p0.x + (p1.x - p0.x) * f, vxc = p0.vx + (p1.vx - p0.vx) * f;
            const g = groups.current[groups.current.length - 1];
            g.pts.push([xc, vxc]);
            if (g.pts.length > MAX_PTS) g.pts.shift();
          }
          prev.current = p1;
          particle.current = p1;
          trail.current.push([p1.x, p1.y]);
          if (trail.current.length > 1400) trail.current.shift();
          if (Math.hypot(p1.x, p1.y) > 5) { particle.current = null; break; }
        }
      }

      // --- Co-rotating view ---
      vc.fillStyle = '#05060a'; vc.fillRect(0, 0, W, H);
      if (showHill) {
        const Ng = 100, cw = W / Ng, ch = H / Ng;
        vc.fillStyle = 'rgba(120,140,180,0.16)';
        for (let gy = 0; gy < Ng; gy++) for (let gx = 0; gx < Ng; gx++) {
          const x = -EXT + (2 * EXT) * (gx + 0.5) / Ng;
          const y = EXT - (2 * EXT) * (gy + 0.5) / Ng;
          if (2 * omega(x, y, mu) < C) vc.fillRect(gx * cw, gy * ch, cw + 1, ch + 1);
        }
      }
      // Primaries.
      for (const [px, mass, col] of [[-mu, 1 - mu, '#ffd27f'], [1 - mu, mu, '#9ec7ff']] as [number, number, string][]) {
        const [sx, sy] = toView(px, 0, W, H);
        vc.fillStyle = col;
        vc.beginPath(); vc.arc(sx, sy, Math.max(3, 9 * Math.cbrt(mass)), 0, 7); vc.fill();
      }
      // Lagrange points.
      if (showLag) {
        vc.font = '11px ui-monospace, monospace';
        for (const L of lagrangePoints(mu)) {
          const [lx, ly] = toView(L.x, L.y, W, H);
          vc.strokeStyle = '#8ad0ff'; vc.fillStyle = '#8ad0ff';
          vc.beginPath(); vc.arc(lx, ly, 2.5, 0, 7); vc.fill();
          vc.fillStyle = 'rgba(170,200,240,0.9)';
          vc.fillText(L.name, lx + 5, ly - 4);
        }
      }
      // Trail + particle.
      if (trail.current.length > 1) {
        vc.strokeStyle = 'rgba(102,240,255,0.6)'; vc.lineWidth = 1;
        vc.beginPath();
        trail.current.forEach(([x, y], i) => { const [sx, sy] = toView(x, y, W, H); i ? vc.lineTo(sx, sy) : vc.moveTo(sx, sy); });
        vc.stroke();
      }
      if (particle.current) {
        const [sx, sy] = toView(particle.current.x, particle.current.y, W, H);
        vc.fillStyle = '#fff'; vc.beginPath(); vc.arc(sx, sy, 3, 0, 7); vc.fill();
      }

      // --- Poincaré section ---
      sc.fillStyle = '#0a0e16'; sc.fillRect(0, 0, SW, SH);
      sc.strokeStyle = 'rgba(140,160,200,0.25)';
      const [ax0] = toSect(0, 0, SW, SH); const [, ay0] = toSect(0, 0, SW, SH);
      sc.beginPath(); sc.moveTo(ax0, 0); sc.lineTo(ax0, SH); sc.moveTo(0, ay0); sc.lineTo(SW, ay0); sc.stroke();
      for (const g of groups.current) {
        sc.fillStyle = g.color;
        for (const [x, vx] of g.pts) { const [sx, sy] = toSect(x, vx, SW, SH); sc.fillRect(sx - 0.75, sy - 0.75, 1.5, 1.5); }
      }
      sc.fillStyle = '#6f7f99'; sc.font = '10px ui-monospace, monospace';
      sc.fillText('x →', SW - 24, ay0 - 4);
      sc.fillText('ẋ ↑', ax0 + 4, 12);
    };
    frame();
    return () => cancelAnimationFrame(raf);
  }, []);

  const onViewClick = (e: React.MouseEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = -EXT + (2 * EXT) * (e.clientX - r.left) / r.width;
    const y = EXT - (2 * EXT) * (e.clientY - r.top) / r.height;
    launch(x, y);
  };
  const onSectClick = (e: React.MouseEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = -EXT + (2 * EXT) * (e.clientX - r.left) / r.width;
    const vx = VX_EXT - (2 * VX_EXT) * (e.clientY - r.top) / r.height;
    launch(x, 0, vx);
  };

  const panel: React.CSSProperties = { background: 'rgba(12,16,24,0.6)', border: '1px solid rgba(120,150,200,0.18)', borderRadius: 10, padding: 12 };
  const h3: React.CSSProperties = { margin: '0 0 8px', font: '600 12px/1.2 ui-monospace, monospace', color: '#9ec7ff', letterSpacing: 0.4 };
  const btn: React.CSSProperties = { padding: '7px 14px', borderRadius: 6, border: '1px solid var(--cp-border, #2a3550)', background: 'rgba(255,255,255,0.06)', color: '#e8edf6', cursor: 'pointer', fontSize: 13 };

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'auto', background: '#05060a', color: '#cfe0f5', font: '13px/1.5 system-ui, sans-serif', padding: '12px 14px 40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <button style={btn} onClick={() => { window.location.hash = '#/trinary'; }}>← Trinary system</button>
        <button style={{ ...btn, background: running ? 'rgba(255,212,0,0.18)' : 'rgba(70,217,138,0.18)' }} onClick={() => setRunning(r => !r)}>{running ? '❚❚ Pause' : '▶ Play'}</button>
        <button style={btn} onClick={() => { clearAll(); setInfo('Cleared.'); }}>↺ Clear</button>
        <button style={btn} onClick={() => { const m = refs.current.mu; const L = lagrangePoints(m).find(l => l.name === 'L4')!; const x = L.x + 0.03, y = L.y; launch(x, y, 0, 2 * omega(x, y, m)); }}>◇ Launch near L4</button>
        <span style={{ flex: 1 }} />
        <span style={{ font: '12px ui-monospace, monospace', color: '#6f7f99' }}>μ = {mu.toFixed(3)} · C = {C.toFixed(2)}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 12 }}>
        <div style={panel}>
          <h3 style={h3}>CO-ROTATING FRAME — Lagrange points &amp; Hill region</h3>
          <canvas ref={viewRef} onClick={onViewClick}
            style={{ width: '100%', aspectRatio: '1', borderRadius: 6, display: 'block', cursor: 'crosshair', background: '#05060a' }} />
          <div style={{ font: '11px ui-monospace, monospace', color: '#9aa7bd', marginTop: 4 }}>{info}</div>
        </div>

        <div style={panel}>
          <h3 style={h3}>POINCARÉ SECTION — (x, ẋ) at y=0, ẏ&gt;0</h3>
          <canvas ref={sectRef} onClick={onSectClick}
            style={{ width: '100%', aspectRatio: '1', borderRadius: 6, display: 'block', cursor: 'crosshair', background: '#0a0e16' }} />
          <div style={{ font: '11px/1.5 system-ui', color: '#6f7f99', marginTop: 4 }}>
            Each launched orbit drops a dot here every time it crosses y=0 going up. Regular orbits trace closed curves (KAM tori); chaotic ones scatter into a fuzzy sea. Click here to seed a trajectory directly on the section.
          </div>
        </div>

        <div style={panel}>
          <h3 style={h3}>CONTROLS</h3>
          <Slider label="Mass ratio μ" value={mu} min={0.005} max={0.5} step={0.005} onChange={(v) => { setMu(v); clearAll(); }} format={v => v.toFixed(3)} />
          <Slider label="Jacobi energy C" value={C} min={2.8} max={3.8} step={0.01} onChange={setC} format={v => v.toFixed(2)} />
          <Slider label="Speed" value={speed} min={5} max={120} step={5} onChange={setSpeed} format={v => `${v}`} />
          <Pills label="Hill region" value={showHill ? 1 : 0} options={[{ value: 1, label: 'Show' }, { value: 0, label: 'Hide' }]} onChange={v => setShowHill(v === 1)} />
          <Pills label="Lagrange points" value={showLag ? 1 : 0} options={[{ value: 1, label: 'Show' }, { value: 0, label: 'Hide' }]} onChange={v => setShowLag(v === 1)} />
          <div style={{ font: '11px/1.5 system-ui', color: '#6f7f99', marginTop: 6 }}>
            Two stars (gold = heavier) sit fixed in the rotating frame. The grey region is forbidden at this Jacobi energy C — the planet can never enter it. L4/L5 are stable only for μ &lt; 0.0385; above that they’re unstable (try μ = 0.02 to park a Trojan).
          </div>
        </div>
      </div>
    </div>
  );
}
