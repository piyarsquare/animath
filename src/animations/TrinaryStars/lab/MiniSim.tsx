import { useEffect, useRef } from 'react';
import { step, getPreset, buildStars, launchPlanet, orbitFrame, type SimState } from '@/lib/nbody';
import type { EnsembleConfig } from './rng';

const STAR_COLORS = ['#ffd27f', '#ff7043', '#9ec7ff'];
const HALF_EXTENT = 8;

/** A small, fast, decorative sim that cycles through randomly-sampled worlds —
 *  the live screens while the ensemble tallies headless. Flashes an outcome
 *  colour as each world resolves, then launches the next. */
export default function MiniSim({ cfg, running, size = 200, steps = 140 }: {
  cfg: EnsembleConfig; running: boolean; size?: number; steps?: number;
}) {
  const SIZE = size;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cfgRef = useRef(cfg); cfgRef.current = cfg;
  const runRef = useRef(running); runRef.current = running;

  useEffect(() => {
    const cv = canvasRef.current;
    const ctx = cv?.getContext('2d');
    if (!cv || !ctx) return;

    let raf = 0;
    let sim: SimState | null = null;
    let trail: [number, number][] = [];
    let flash: string | null = null;
    let flashUntil = 0;

    const toPx = (x: number, y: number): [number, number] =>
      [SIZE / 2 + (x / HALF_EXTENT) * (SIZE * 0.46), SIZE / 2 - (y / HALF_EXTENT) * (SIZE * 0.46)];

    function reseed() {
      const c = cfgRef.current;
      const preset = getPreset(c.presetId);
      const stars = buildStars(preset, c.massMul);
      const f = orbitFrame(stars, c.target);
      const radius = c.rMin + (c.rMax - c.rMin) * Math.random();
      const fr = c.fMin + (c.fMax - c.fMin) * Math.random();
      const v = fr * Math.sqrt(f.mass / Math.max(0.05, radius));
      const ang = Math.random() * Math.PI * 2;
      const retro = c.allowRetro && Math.random() < 0.5;
      const planet = launchPlanet(stars, c.target, radius, v, ang, retro);
      sim = { stars, planets: [planet], t: 0, dtBase: preset.dt, G: 1, starSoft: c.starSoft, planetSoft: 0.05 };
      trail = [];
    }
    reseed();

    const frame = () => {
      raf = requestAnimationFrame(frame);
      const c = cfgRef.current;
      const preset = getPreset(c.presetId);

      if (runRef.current && sim) {
        for (let i = 0; i < steps; i++) step(sim, preset.dt);
        const p = sim.planets[0];
        trail.push([p.x, p.y]);
        if (trail.length > 64) trail.shift();

        let dmin = Infinity;
        for (const s of sim.stars) dmin = Math.min(dmin, Math.hypot(s.x - p.x, s.y - p.y));
        const dcom = Math.hypot(p.x, p.y);
        const starEjected = sim.stars.some(s => Math.hypot(s.x, s.y) > 12);

        if (!Number.isFinite(p.x)) { reseed(); }
        else if (dmin < 0.08) { flash = '#ff7043'; flashUntil = performance.now() + 450; reseed(); }
        else if (dcom > 16) { flash = '#5a9be8'; flashUntil = performance.now() + 450; reseed(); }
        else if (sim.t > c.tMax) { flash = starEjected ? '#46d98a' : '#9aa7bd'; flashUntil = performance.now() + 450; reseed(); }
      }

      ctx.fillStyle = '#05060a';
      ctx.fillRect(0, 0, SIZE, SIZE);
      if (sim) {
        ctx.strokeStyle = 'rgba(102,240,255,0.55)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        trail.forEach(([x, y], i) => { const [px, py] = toPx(x, y); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
        ctx.stroke();

        const p = sim.planets[0];
        const [px, py] = toPx(p.x, p.y);
        ctx.fillStyle = '#66f0ff';
        ctx.beginPath(); ctx.arc(px, py, 2.6, 0, 7); ctx.fill();

        sim.stars.forEach((s, i) => {
          const [sx, sy] = toPx(s.x, s.y);
          ctx.fillStyle = STAR_COLORS[i] ?? '#fff';
          ctx.beginPath(); ctx.arc(sx, sy, Math.max(2, 2.6 * Math.cbrt(s.mass)), 0, 7); ctx.fill();
        });
      }
      if (flash && performance.now() < flashUntil) {
        ctx.strokeStyle = flash;
        ctx.lineWidth = 4;
        ctx.strokeRect(2, 2, SIZE - 4, SIZE - 4);
      }
    };
    frame();
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={canvasRef} width={SIZE} height={SIZE}
    style={{ width: SIZE, height: SIZE, borderRadius: 8, display: 'block', background: '#05060a' }} />;
}
