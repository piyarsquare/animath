import { useEffect, useRef } from 'react';
import { step, getScenario, buildStars, launchPlanet, orbitFrame, type SimState } from '@/lib/nbody';
import type { EnsembleConfig } from './rng';
import { useThemeId } from '../../../chrome/skins';
import { outcomeHex } from './themeColors';

const HALF_EXTENT = 8;

interface MiniPalette {
  bg: string; stars: [string, string, string]; planet: string; trail: string;
  flash: { destroyed: string; ejected: string; happy: string; survived: string };
}
const MINI_FALLBACK: MiniPalette = {
  bg: '#05060a', stars: ['#5fa8ff', '#ffce47', '#ff6f9c'], planet: '#eef1f7', trail: '#5fe3cd',
  flash: { destroyed: '#ff7043', ejected: '#5a9be8', happy: '#46d98a', survived: '#9aa7bd' },
};
function buildMiniPalette(el: Element, themeId: string): MiniPalette {
  const cs = getComputedStyle(el);
  const t = (n: string, f: string) => cs.getPropertyValue(n).trim() || f;
  const dim = t('--dim', '#9aa7bd');
  return {
    bg: t('--viz-bg', MINI_FALLBACK.bg),
    stars: [t('--data-1', MINI_FALLBACK.stars[0]), t('--data-4', MINI_FALLBACK.stars[1]), t('--data-6', MINI_FALLBACK.stars[2])],
    planet: t('--fg', MINI_FALLBACK.planet),
    trail: t('--accent-2', MINI_FALLBACK.trail),
    flash: {
      destroyed: outcomeHex(themeId, 'planet-destroyed', dim),
      ejected: outcomeHex(themeId, 'planet-ejected', dim),
      happy: outcomeHex(themeId, 'happy', dim),
      survived: outcomeHex(themeId, 'survived', dim),
    },
  };
}

/** A small, fast, decorative sim that cycles through randomly-sampled worlds —
 *  the live screens while the ensemble tallies headless. Flashes an outcome
 *  color as each world resolves, then launches the next. */
export default function MiniSim({ cfg, running, size = 200, steps = 140 }: {
  cfg: EnsembleConfig; running: boolean; size?: number; steps?: number;
}) {
  const SIZE = size;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cfgRef = useRef(cfg); cfgRef.current = cfg;
  const runRef = useRef(running); runRef.current = running;
  // Theme palette read live (theming v2): stars → spread --data, planet → --fg,
  // outcome flashes → the divergent fate colors. Updated on a skin switch.
  const themeId = useThemeId();
  const palRef = useRef<MiniPalette>(MINI_FALLBACK);
  useEffect(() => {
    if (canvasRef.current) palRef.current = buildMiniPalette(canvasRef.current, themeId);
  }, [themeId]);

  useEffect(() => {
    const cv = canvasRef.current;
    const ctx = cv?.getContext('2d');
    if (!cv || !ctx) return;
    palRef.current = buildMiniPalette(cv, themeId);

    let raf = 0;
    let sim: SimState | null = null;
    let trail: [number, number][] = [];
    let flash: string | null = null;
    let flashUntil = 0;

    const toPx = (x: number, y: number): [number, number] =>
      [SIZE / 2 + (x / HALF_EXTENT) * (SIZE * 0.46), SIZE / 2 - (y / HALF_EXTENT) * (SIZE * 0.46)];

    function reseed() {
      const c = cfgRef.current;
      const preset = getScenario(c.presetId);
      const stars = buildStars(preset, c.massMul);
      const f = orbitFrame(stars, c.target);
      const radius = c.rMin + (c.rMax - c.rMin) * Math.random();
      const fr = c.fMin + (c.fMax - c.fMin) * Math.random();
      const v = fr * Math.sqrt(f.mass / Math.max(0.05, radius));
      const ang = Math.random() * Math.PI * 2;
      const retro = c.allowRetro && Math.random() < 0.5;
      const planet = launchPlanet(stars, c.target, radius, v, ang, retro);
      sim = { stars, planets: [planet], t: 0, dtBase: preset.system.dt, G: 1, starSoft: c.starSoft, planetSoft: 0.05 };
      trail = [];
    }
    reseed();

    const frame = () => {
      raf = requestAnimationFrame(frame);
      const c = cfgRef.current;
      const preset = getScenario(c.presetId);
      const pal = palRef.current;

      if (runRef.current && sim) {
        for (let i = 0; i < steps; i++) step(sim, preset.system.dt);
        const p = sim.planets[0];
        trail.push([p.x, p.y]);
        if (trail.length > 64) trail.shift();

        let dmin = Infinity;
        for (const s of sim.stars) dmin = Math.min(dmin, Math.hypot(s.x - p.x, s.y - p.y));
        const dcom = Math.hypot(p.x, p.y);
        const starEjected = sim.stars.some(s => Math.hypot(s.x, s.y) > 12);

        if (!Number.isFinite(p.x)) { reseed(); }
        else if (dmin < 0.08) { flash = pal.flash.destroyed; flashUntil = performance.now() + 450; reseed(); }
        else if (dcom > 16) { flash = pal.flash.ejected; flashUntil = performance.now() + 450; reseed(); }
        else if (sim.t > c.tMax) { flash = starEjected ? pal.flash.happy : pal.flash.survived; flashUntil = performance.now() + 450; reseed(); }
      }

      ctx.fillStyle = pal.bg;
      ctx.fillRect(0, 0, SIZE, SIZE);
      if (sim) {
        ctx.strokeStyle = pal.trail;
        ctx.globalAlpha = 0.55;
        ctx.lineWidth = 1;
        ctx.beginPath();
        trail.forEach(([x, y], i) => { const [px, py] = toPx(x, y); if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); });
        ctx.stroke();
        ctx.globalAlpha = 1;

        const p = sim.planets[0];
        const [px, py] = toPx(p.x, p.y);
        ctx.fillStyle = pal.planet;
        ctx.beginPath(); ctx.arc(px, py, 2.6, 0, 7); ctx.fill();

        sim.stars.forEach((s, i) => {
          const [sx, sy] = toPx(s.x, s.y);
          ctx.fillStyle = pal.stars[i] ?? pal.planet;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <canvas ref={canvasRef} width={SIZE} height={SIZE}
    style={{ width: SIZE, height: SIZE, borderRadius: 8, display: 'block', background: 'var(--viz-bg)' }} />;
}

