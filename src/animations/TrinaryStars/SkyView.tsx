import { useEffect, useRef } from 'react';

export interface SkyData {
  t: number;
  px: number; py: number;
  stars: { x: number; y: number; L: number }[];
  Sref: number;
  /** Reference planet has fallen into a star — the surface (and its sky) is gone. */
  dead?: boolean;
}

/** Duration of the "swallowed by a star" white-out before the view holds dark. */
const EXPLODE_MS = 1100;

const STAR_TINT = ['#ffe7b0', '#ff9a6a', '#bcd4ff'];

/** Temperature tint of the sky from the insolation ratio S / S_ref. */
function skyTint(ratio: number): [number, number, number] {
  if (ratio < 0.25) return [8, 10, 24];      // frozen
  if (ratio < 0.7) return [24, 48, 96];       // cold
  if (ratio < 1.8) return [60, 110, 190];     // temperate
  if (ratio < 4) return [210, 120, 60];       // hot
  return [240, 200, 170];                     // inferno
}
function tempLabel(ratio: number): string {
  if (ratio < 0.25) return 'FROZEN';
  if (ratio < 0.7) return 'COLD';
  if (ratio < 1.8) return 'TEMPERATE';
  if (ratio < 4) return 'SCORCHING';
  return 'INFERNO';
}

/** First-person sky from the planet's surface: the suns wheel overhead as the
 *  planet spins (day/night), their noon height drifts with axial tilt over the
 *  orbit (irregular seasons), and the sky's color tracks the climate. */
export default function SkyView({ dataRef, dayLen, tilt }: {
  dataRef: React.MutableRefObject<SkyData | null>;
  dayLen: number; tilt: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dayLenRef = useRef(dayLen); dayLenRef.current = dayLen;
  const tiltRef = useRef(tilt); tiltRef.current = tilt;
  // Timestamp the planet's destruction so the white-out can be timed; cleared
  // when the planet is alive again (e.g. after a replay/reset).
  const deadAtRef = useRef<number | null>(null);

  useEffect(() => {
    const cv = canvasRef.current; const ctx = cv?.getContext('2d');
    if (!cv || !ctx) return;
    let raf = 0;

    const frame = () => {
      raf = requestAnimationFrame(frame);
      const W = cv.clientWidth, H = cv.clientHeight;
      if (cv.width !== W) cv.width = W;
      if (cv.height !== H) cv.height = H;
      const horizon = H * 0.72;

      const d = dataRef.current;
      ctx.clearRect(0, 0, W, H);
      if (!d) return;

      // Destruction: a star has swallowed the planet. Detonate (a blinding
      // white-out that flares orange and expands) then hold the view dark —
      // there is no longer a surface to stand on.
      if (d.dead) {
        if (deadAtRef.current === null) deadAtRef.current = performance.now();
        const p = (performance.now() - deadAtRef.current) / EXPLODE_MS;
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (p < 1) {
          const up = p < 0.12 ? p / 0.12 : Math.max(0, 1 - (p - 0.12) / 0.88);
          const cx = W / 2, cy = horizon, rad = (0.15 + 1.5 * p) * Math.hypot(W, H);
          const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
          g.addColorStop(0, `rgba(255,255,250,${up})`);
          g.addColorStop(0.3, `rgba(255,206,130,${up * 0.95})`);
          g.addColorStop(0.7, `rgba(255,110,50,${up * 0.6})`);
          g.addColorStop(1, 'rgba(40,10,0,0)');
          ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
          if (p < 0.18) { ctx.fillStyle = `rgba(255,255,255,${(0.18 - p) / 0.18 * 0.9})`; ctx.fillRect(0, 0, W, H); }
        } else {
          ctx.textAlign = 'center';
          ctx.font = 'bold 15px ui-monospace, monospace';
          ctx.fillStyle = 'rgba(255,96,64,0.9)';
          ctx.fillText('PLANET DESTROYED', W / 2, H * 0.46);
          ctx.font = '11px ui-monospace, monospace';
          ctx.fillStyle = 'rgba(207,224,245,0.5)';
          ctx.fillText('a star swallowed your world — the sky is gone', W / 2, H * 0.46 + 20);
          ctx.textAlign = 'start';
        }
        return;
      }
      deadAtRef.current = null;

      // Per-sun apparent geometry.
      const heading = (2 * Math.PI * d.t) / Math.max(0.05, dayLenRef.current);
      const orbAngle = Math.atan2(d.py, d.px);
      const seasonAmp = 0.35 * Math.min(1, tiltRef.current / 0.6);
      const peak = 0.62 + seasonAmp * Math.sin(orbAngle);
      let S = 0, daylight = 0;
      const suns = d.stars.map((s, i) => {
        const dx = s.x - d.px, dy = s.y - d.py;
        const dist2 = dx * dx + dy * dy + 0.04;
        const flux = s.L / dist2;
        S += flux;
        let h = Math.atan2(dy, dx) - heading;
        h = Math.atan2(Math.sin(h), Math.cos(h)); // wrap to [-π,π]
        const up = Math.abs(h) < Math.PI / 2;
        if (up) daylight += flux * Math.cos(h);
        return { h, up, flux, tint: STAR_TINT[i] ?? '#fff' };
      });
      const ratio = S / (d.Sref || 1e-6);

      // Sky gradient — brightness from daylight, hue from temperature.
      const [tr, tg, tb] = skyTint(ratio);
      const day = Math.min(1, daylight / (d.Sref || 1e-6) * 1.1);
      const grad = ctx.createLinearGradient(0, 0, 0, horizon);
      const mix = (c: number) => Math.round(4 + (c - 4) * (0.12 + 0.88 * day));
      grad.addColorStop(0, `rgb(${mix(tr) * 0.5 | 0},${mix(tg) * 0.5 | 0},${mix(tb) * 0.6 | 0})`);
      grad.addColorStop(1, `rgb(${mix(tr)},${mix(tg)},${mix(tb)})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, horizon);

      // Faint background stars at night.
      if (day < 0.4) {
        ctx.fillStyle = `rgba(255,255,255,${0.5 * (0.4 - day)})`;
        for (let k = 0; k < 60; k++) {
          const sx = (Math.sin(k * 12.9898) * 43758.5) % 1;
          const sy = (Math.sin(k * 78.233) * 12543.7) % 1;
          ctx.fillRect(Math.abs(sx) * W, Math.abs(sy) * horizon, 1, 1);
        }
      }

      // Ground.
      ctx.fillStyle = '#0a0c12';
      ctx.fillRect(0, horizon, W, H - horizon);
      ctx.strokeStyle = 'rgba(140,160,200,0.35)';
      ctx.beginPath(); ctx.moveTo(0, horizon); ctx.lineTo(W, horizon); ctx.stroke();

      // Suns (back-to-front by altitude so higher ones overlay).
      for (const s of suns.filter(s => s.up).sort((a, b) => Math.cos(b.h) - Math.cos(a.h))) {
        const x = W / 2 + (s.h / (Math.PI / 2)) * (W * 0.46);
        const alt = Math.cos(s.h) * peak;
        const y = horizon - alt * horizon;
        const rad = Math.max(6, Math.min(70, 12 * Math.sqrt(s.flux)));
        const g = ctx.createRadialGradient(x, y, 0, x, y, rad * 2.4);
        g.addColorStop(0, s.tint);
        g.addColorStop(0.4, s.tint + 'cc');
        g.addColorStop(1, s.tint + '00');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, rad * 2.4, 0, 7); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(x, y, rad, 0, 7); ctx.fill();
      }

      // Readout.
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(0, 0, W, 24);
      ctx.font = '13px ui-monospace, monospace';
      ctx.fillStyle = '#cfe0f5';
      ctx.fillText(`${tempLabel(ratio)}  ·  ${suns.filter(s => s.up).length} sun(s) up  ·  insolation ${ratio.toFixed(2)}× home`, 10, 16);
    };
    frame();
    return () => cancelAnimationFrame(raf);
  }, [dataRef]);

  return (
    // Sized relative to the hosting Orbit view window (was 36vh full-screen).
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '36%', pointerEvents: 'none' }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
      <div style={{
        position: 'absolute', bottom: 6, right: 10, font: '11px system-ui', color: 'rgba(207,224,245,0.7)',
      }}>view from the planet’s surface · drag-free</div>
    </div>
  );
}
