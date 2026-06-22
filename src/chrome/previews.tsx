import React, { useEffect, useMemo, useRef } from 'react';

/**
 * Lightweight, authentic preview animations for the gallery cards. One flavor
 * per app, each a sketch of what that app actually shows: a 4D-ish projected
 * point cloud, a warping colored plane, a palette-cycling Mandelbrot, the
 * Mandelbrot↔Julia correspondence, a twisting first-person corridor, three
 * stars with a doomed world, a Gale–Shapley proposal round, concurrent
 * sorting agents, a preference-matrix lattice walk, and a glued-polygon
 * torus walk. Each draws into a cheap 2D <canvas> sized to its parent —
 * deliberately NOT the real renderers, so a full gallery costs almost
 * nothing (decision recorded in docs/redesign/IN-PROGRESS.md).
 */
export type PreviewKind =
  | 'particles' | 'plane' | 'fractal' | 'julia' | 'corridor'
  | 'trinary' | 'marriage' | 'sorting' | 'matrix' | 'polygon' | 'treenet' | 'solid' | 'skellam';

type DrawFn = (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => void;

function useCanvas(draw: DrawFn, deps: React.DependencyList) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv || !cv.parentElement) return;
    const parent = cv.parentElement;
    let raf = 0;
    const t0 = performance.now();
    let running = true;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      const r = parent.getBoundingClientRect();
      cv.width = Math.max(1, Math.floor(r.width * dpr));
      cv.height = Math.max(1, Math.floor(r.height * dpr));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(parent);
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    // Paint one frame synchronously so cards are never blank on first render
    // (and screenshots capture content even with rAF throttled off-screen).
    try { draw(ctx, cv.width, cv.height, 0); } catch { /* ignore */ }
    let visible = true;
    const loop = (t: number) => {
      if (!running || !visible) { raf = 0; return; }
      // rAF timestamps can precede the t0 captured above (they are vsync
      // times) — clamp so draw never sees a negative t (JS % keeps sign).
      draw(ctx, cv.width, cv.height, Math.max(0, (t - t0) / 1000));
      raf = requestAnimationFrame(loop);
    };
    // Pause scrolled-away cards — ten always-running canvases jank the
    // gallery scroll on phones; the loop resumes when the card returns.
    const io = new IntersectionObserver(([entry]) => {
      visible = !!entry?.isIntersecting;
      if (visible && running && raf === 0) raf = requestAnimationFrame(loop);
    });
    io.observe(parent);
    raf = requestAnimationFrame(loop);
    return () => { running = false; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}

const canvasStyle: React.CSSProperties = { display: 'block', width: '100%', height: '100%' };

/** Deterministic PRNG so module-scope "simulations" are stable across loads. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let x = Math.imul(a ^ (a >>> 15), 1 | a);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---- Particles: a 4D f(z) cloud + the app's four colored axis lines ------- */
/* Mirrors the real viewer: the (z, f(z)) graph lives in 4D, colored by arg f,
   tumbling under a double rotation, with the x/y/u/v axis cross. f = e^z. */
function ParticlePreview({ light }: { light: boolean }) {
  const N = 800;
  const pts = useRef<Float32Array | null>(null); // packed [x, y, u, v, hue]
  if (!pts.current) {
    const arr = new Float32Array(N * 5);
    for (let i = 0; i < N; i++) {
      const x = (Math.random() * 2 - 1) * 1.6;
      const y = (Math.random() * 2 - 1) * 1.6;
      const ex = Math.exp(x * 0.9) * 0.45;
      const u = ex * Math.cos(y * 2.2), v = ex * Math.sin(y * 2.2);
      arr.set([x, y, u, v, Math.atan2(v, u) / (Math.PI * 2)], i * 5);
    }
    pts.current = arr;
  }
  const bg = light ? '#f4f3ef' : '#000';
  // axis hues match lib/particles AXIS_COLORS (x 0 · y .25 · u .5 · v .75)
  const AXES: Array<[number, number, number, number, number]> = [
    [1.5, 0, 0, 0, 0], [0, 1.5, 0, 0, 0.25], [0, 0, 1.5, 0, 0.5], [0, 0, 0, 1.5, 0.75],
  ];
  const ref = useCanvas((ctx, W, H, t) => {
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2;
    const scale = Math.min(W, H) * 0.30;
    // 4D double rotation: the xu and yv planes turn at different rates
    const a = t * 0.32, b = t * 0.21;
    const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);
    const proj = (x: number, y: number, u: number, v: number): [number, number, number] => {
      const x2 = x * ca + u * sa, u2 = u * ca - x * sa;
      const y2 = y * cb + v * sb, v2 = v * cb - y * sb;
      const persp = 2.6 / (2.6 + v2);                // divide by the 4th axis
      return [
        cx + (x2 + 0.32 * u2) * scale * persp,
        cy + (-y2 + 0.22 * u2) * scale * persp,
        persp,
      ];
    };
    ctx.globalCompositeOperation = light ? 'multiply' : 'lighter';
    // the axis cross — the viewer's signature 4-color frame
    ctx.lineWidth = Math.max(1, W * 0.0028);
    for (const [ax, ay, au, av, hh] of AXES) {
      const [x1, y1] = proj(-ax, -ay, -au, -av);
      const [x2, y2] = proj(ax, ay, au, av);
      ctx.strokeStyle = `hsla(${hh * 360},100%,${light ? 42 : 58}%,${light ? 0.65 : 0.8})`;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }
    const arr = pts.current!;
    for (let i = 0; i < N; i++) {
      const k = i * 5;
      const [sx, sy, persp] = proj(arr[k], arr[k + 1], arr[k + 2], arr[k + 3]);
      const hh = (arr[k + 4] + 1) % 1;
      const sat = light ? 70 : 95;
      const lum = light ? 46 : 42 + persp * 24;
      ctx.fillStyle = `hsla(${hh * 360},${sat}%,${lum}%,${light ? 0.55 : 0.85})`;
      const sz = 1.3 * persp + 0.4;
      ctx.fillRect(sx - sz, sy - sz, sz * 2, sz * 2);
    }
  }, [light]);
  return <canvas ref={ref} style={canvasStyle} />;
}

/* ---- Plane transform: domain and range as two sheets under f(z) = z² ------ */
/* Mirrors the app's two view windows: the z-plane grid on the left sheet, its
   image under f on the right, with a probe line and its image linking them. */
function PlanePreview({ light }: { light: boolean }) {
  const bg = light ? '#f4f3ef' : '#000';
  const ref = useCanvas((ctx, W, H, t) => {
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    const LINES = 9, SAMPLES = 28, R = 1.15;
    // a sheet = a gently tilted card; (u, v) in math coords → screen
    const makeSheet = (cx: number, cy: number) => {
      const sx = W * 0.155, sy = H * 0.30, kx = W * 0.035, ky = -H * 0.045;
      return (u: number, v: number): [number, number] =>
        [cx + u * sx + v * kx, cy - v * sy + u * ky];
    };
    const domain = makeSheet(W * 0.26, H * 0.5);
    const range = makeSheet(W * 0.74, H * 0.52);
    const fz = (x: number, y: number): [number, number] => {
      // z² damped so the image sheet stays in frame
      const k = 1 / 1.35;
      return [(x * x - y * y) * k, 2 * x * y * k];
    };
    const clampPt = ([x, y]: [number, number]): [number, number] =>
      [Math.max(-1.9, Math.min(1.9, x)), Math.max(-1.9, Math.min(1.9, y))];
    ctx.globalCompositeOperation = light ? 'multiply' : 'lighter';
    ctx.lineWidth = Math.max(1, W * 0.002);
    const drawLine = (
      sheet: (u: number, v: number) => [number, number],
      pt: (k: number) => [number, number],
      map: boolean, hh: number, alpha: number, width?: number,
    ) => {
      ctx.strokeStyle = `hsla(${hh * 360},${light ? 65 : 90}%,${light ? 45 : 62}%,${alpha})`;
      if (width) ctx.lineWidth = width;
      ctx.beginPath();
      for (let k = 0; k <= SAMPLES; k++) {
        let [x, y] = pt(k / SAMPLES);
        if (map) [x, y] = clampPt(fz(x, y));
        const [px, py] = sheet(x, y);
        if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py);
      }
      ctx.stroke();
    };
    // the same grid on both sheets — left as-is, right through f
    for (const map of [false, true]) {
      const sheet = map ? range : domain;
      const a = light ? 0.55 : 0.7;
      for (let i = 0; i < LINES; i++) {
        const c = (i / (LINES - 1)) * 2 * R - R;
        drawLine(sheet, k => [c, k * 2 * R - R], map, 0.55 + (c / R) * 0.12, a);
        drawLine(sheet, k => [k * 2 * R - R, c], map, 0.05 + (c / R) * 0.12, a);
      }
    }
    // probe: a line sweeping the domain and its image sweeping the range
    const c = Math.sin(t * 0.6) * 0.85;
    const probeW = Math.max(1.6, W * 0.0045);
    drawLine(domain, k => [c, k * 2 * R - R], false, light ? 0.07 : 0.13, 0.95, probeW);
    drawLine(range, k => [c, k * 2 * R - R], true, light ? 0.07 : 0.13, 0.95, probeW);
    // sheet labels
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = light ? 'rgba(40,40,50,0.75)' : 'rgba(255,255,255,0.65)';
    ctx.font = `${Math.max(9, W * 0.032)}px ui-monospace, monospace`;
    const [zx, zy] = domain(-R, -R);
    const [fx, fy] = range(-R, -R);
    ctx.fillText('z', zx, Math.min(H - 4, zy + H * 0.08));
    ctx.fillText('f(z)', fx, Math.min(H - 4, fy + H * 0.08));
  }, [light]);
  return <canvas ref={ref} style={canvasStyle} />;
}

/* ---- Fractal: escape-time Mandelbrot with a slowly cycling palette -------- */
function FractalPreview({ light }: { light: boolean }) {
  const field = useRef<{ its: Int16Array; rw: number; rh: number } | null>(null);
  const off = useRef<HTMLCanvasElement | null>(null);
  const ref = useCanvas((ctx, W, H, t) => {
    const rw = 260, rh = Math.max(1, Math.round(260 * H / Math.max(1, W)));
    const maxIt = 90;
    if (!field.current || field.current.rw !== rw || field.current.rh !== rh) {
      // iteration counts computed once; only the coloring animates
      const its = new Int16Array(rw * rh);
      const cx0 = -0.6, cy0 = 0, span = 3.0 / 1.1;
      for (let py = 0; py < rh; py++) {
        for (let px = 0; px < rw; px++) {
          const x0 = cx0 + (px / rw - 0.5) * span;
          const yy0 = cy0 + (py / rh - 0.5) * span * (rh / rw);
          let x = 0, y = 0, it = 0;
          while (x * x + y * y <= 4 && it < maxIt) {
            const xt = x * x - y * y + x0;
            y = 2 * x * y + yy0; x = xt; it++;
          }
          its[px + py * rw] = it;
        }
      }
      field.current = { its, rw, rh };
      off.current = null;
    }
    if (!off.current) {
      const o = document.createElement('canvas');
      o.width = rw; o.height = rh;
      off.current = o;
    }
    const octx = off.current.getContext('2d')!;
    const img = octx.createImageData(rw, rh);
    // small palette LUT per frame, phase-shifted by time
    const phase = t * 0.045;
    const lut = new Uint8Array(256 * 3);
    for (let i = 0; i < 256; i++) {
      const m = ((i / 255) * 1.0 + phase) % 1;
      let r = 20 + m * 235, g = 10 + 150 * m * m, b = 60 + m * 90;
      if (light) { r = 245 - (245 - r) * 0.85; g = 245 - (245 - g) * 0.85; b = 245 - (245 - b) * 0.85; }
      lut[i * 3] = r; lut[i * 3 + 1] = g; lut[i * 3 + 2] = b;
    }
    const { its } = field.current;
    const inside = light ? 245 : 8;
    for (let i = 0; i < its.length; i++) {
      const k = i * 4, it = its[i];
      if (it >= maxIt) {
        img.data[k] = img.data[k + 1] = img.data[k + 2] = inside;
      } else {
        const j = Math.min(255, Math.round((it / maxIt) * 255)) * 3;
        img.data[k] = lut[j]; img.data[k + 1] = lut[j + 1]; img.data[k + 2] = lut[j + 2];
      }
      img.data[k + 3] = 255;
    }
    octx.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(off.current, 0, 0, W, H);
  }, [light]);
  return <canvas ref={ref} style={canvasStyle} />;
}

/* ---- Correspondence: Mandelbrot map + the Julia set of a moving c --------- */
function JuliaPreview({ light }: { light: boolean }) {
  const mandel = useRef<HTMLCanvasElement | null>(null);
  const jul = useRef<HTMLCanvasElement | null>(null);
  const MX = -0.6, MSPAN = 3.0; // mandel pane: re ∈ [-2.1, 0.9]
  const ref = useCanvas((ctx, W, H, t) => {
    const split = Math.round(W * 0.42);
    const maxIt = 60;
    if (!mandel.current) {
      const rw = 110, rh = Math.max(1, Math.round(110 * H / Math.max(1, split)));
      const o = document.createElement('canvas');
      o.width = rw; o.height = rh;
      const octx = o.getContext('2d')!;
      const img = octx.createImageData(rw, rh);
      for (let py = 0; py < rh; py++) {
        for (let px = 0; px < rw; px++) {
          const x0 = MX + (px / rw - 0.5) * MSPAN;
          const y0 = (py / rh - 0.5) * MSPAN * (rh / rw);
          let x = 0, y = 0, it = 0;
          while (x * x + y * y <= 4 && it < maxIt) {
            const xt = x * x - y * y + x0;
            y = 2 * x * y + y0; x = xt; it++;
          }
          const k = (px + py * rw) * 4;
          if (it >= maxIt) {
            img.data[k] = img.data[k + 1] = img.data[k + 2] = light ? 230 : 14;
          } else {
            const m = it / maxIt;
            const v = light ? 235 - m * 160 : 25 + m * 120;
            img.data[k] = v; img.data[k + 1] = v + (light ? -10 : 18); img.data[k + 2] = light ? v : v + 50;
          }
          img.data[k + 3] = 255;
        }
      }
      octx.putImageData(img, 0, 0);
      mandel.current = o;
    }
    // c walks a circle that skims the cardioid — classic morphing Julia sets
    const th = t * 0.22;
    const cr = 0.7885 * Math.cos(th), ci = 0.7885 * Math.sin(th);
    {
      const rw = 132, rh = Math.max(1, Math.round(132 * H / Math.max(1, W - split)));
      if (!jul.current || jul.current.width !== rw || jul.current.height !== rh) {
        const o = document.createElement('canvas');
        o.width = rw; o.height = rh;
        jul.current = o;
      }
      const octx = jul.current.getContext('2d')!;
      const img = octx.createImageData(rw, rh);
      const span = 3.4, jIt = 34;
      for (let py = 0; py < rh; py++) {
        for (let px = 0; px < rw; px++) {
          let x = (px / rw - 0.5) * span;
          let y = (py / rh - 0.5) * span * (rh / rw);
          let it = 0;
          while (x * x + y * y <= 4 && it < jIt) {
            const xt = x * x - y * y + cr;
            y = 2 * x * y + ci; x = xt; it++;
          }
          const k = (px + py * rw) * 4;
          if (it >= jIt) {
            img.data[k] = light ? 180 : 255; img.data[k + 1] = light ? 120 : 200; img.data[k + 2] = light ? 30 : 80;
          } else {
            const m = it / jIt;
            const v = light ? 244 - m * 130 : m * 110;
            img.data[k] = v * (light ? 1 : 0.4); img.data[k + 1] = v * (light ? 0.98 : 0.7); img.data[k + 2] = light ? v * 0.92 : v + 40;
          }
          img.data[k + 3] = 255;
        }
      }
      octx.putImageData(img, 0, 0);
    }
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(mandel.current, 0, 0, split, H);
    ctx.drawImage(jul.current, split, 0, W - split, H);
    // divider + the marker for c on the Mandelbrot pane
    ctx.fillStyle = light ? 'rgba(60,60,60,0.5)' : 'rgba(255,255,255,0.25)';
    ctx.fillRect(split - 1, 0, 2, H);
    const mpx = ((cr - MX) / MSPAN + 0.5) * split;
    const mpy = ((ci / (MSPAN * (H / Math.max(1, split)))) + 0.5) * H;
    ctx.strokeStyle = light ? '#b67d10' : '#ffd400';
    ctx.lineWidth = Math.max(1, W * 0.004);
    ctx.beginPath(); ctx.arc(mpx, mpy, Math.max(3, W * 0.012), 0, 7); ctx.stroke();
    ctx.fillStyle = light ? '#b67d10' : '#ffd400';
    ctx.beginPath(); ctx.arc(mpx, mpy, Math.max(1.5, W * 0.004), 0, 7); ctx.fill();
  }, [light]);
  return <canvas ref={ref} style={canvasStyle} />;
}

/* ---- Topology walk: first-person flight down a twisting corridor ---------- */
function CorridorPreview({ light }: { light: boolean }) {
  const bg = light ? '#f4f3ef' : '#04060c';
  const ref = useCanvas((ctx, W, H, t) => {
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    const s = t * 1.3;
    const f = s - Math.floor(s);
    const cx = W / 2 + Math.sin(s * 0.45) * W * 0.02;
    const cy = H / 2 + Math.cos(s * 0.33) * H * 0.02;
    const S = Math.min(W, H) * 1.05;
    const RINGS = 15;
    let prev: [number, number][] | null = null;
    ctx.lineCap = 'round';
    for (let i = RINGS; i >= 0; i--) {
      const Z = i + 1 - f;                       // ring depth in front of the camera
      const id = Math.floor(s) + i + 1;          // world-fixed ring identity
      const twist = id * 0.22;                   // corridor twist accumulates with distance
      const proj = S / (Z * 0.85 + 0.35);
      const corners: [number, number][] = [];
      for (let j = 0; j < 4; j++) {
        const a = twist + j * (Math.PI / 2) + Math.PI / 4;
        corners.push([cx + Math.cos(a) * proj, cy + Math.sin(a) * proj]);
      }
      const fade = Math.min(1, 1.8 / Z);
      ctx.lineWidth = Math.max(1, (W * 0.0035) * fade);
      ctx.strokeStyle = light
        ? `rgba(40,44,66,${0.65 * fade})`
        : `rgba(120,225,255,${0.75 * fade})`;
      ctx.beginPath();
      for (let j = 0; j <= 4; j++) {
        const [x, y] = corners[j % 4];
        if (j) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      }
      ctx.stroke();
      if (prev) {
        ctx.strokeStyle = light
          ? `rgba(40,44,66,${0.3 * fade})`
          : `rgba(120,225,255,${0.35 * fade})`;
        ctx.beginPath();
        for (let j = 0; j < 4; j++) {
          ctx.moveTo(corners[j][0], corners[j][1]);
          ctx.lineTo(prev[j][0], prev[j][1]);
        }
        ctx.stroke();
      }
      prev = corners;
    }
  }, [light]);
  return <canvas ref={ref} style={canvasStyle} />;
}

/* ---- Trinary: three stars + a doomed orbiting world ----------------------- */
function TrinaryPreview({ light }: { light: boolean }) {
  const trail = useRef<[number, number][]>([]);
  const bg = light ? '#f4f3ef' : '#04040a';
  const ref = useCanvas((ctx, W, H, t) => {
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.22;
    const stars = [0, 1, 2].map(i => {
      const a = t * 0.25 + i * (Math.PI * 2 / 3);
      return { x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R, c: ['#ffd400', '#ff7a59', '#5ad1ff'][i] };
    });
    // planet position: chaotic-ish lissajous influenced by time
    const pa = t * 0.9, pr = R * (1.5 + 0.5 * Math.sin(t * 0.5));
    const px = cx + Math.cos(pa * 1.3) * pr * 0.6;
    const py = cy + Math.sin(pa) * pr * 0.45;
    trail.current.push([px, py]);
    if (trail.current.length > 220) trail.current.shift();
    ctx.lineWidth = Math.max(1, W * 0.0016);
    ctx.beginPath();
    trail.current.forEach((p, i) => { if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); });
    ctx.strokeStyle = light ? 'rgba(80,80,90,0.5)' : 'rgba(160,200,255,0.55)';
    ctx.stroke();
    stars.forEach(s => {
      const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, R * 0.5);
      g.addColorStop(0, s.c); g.addColorStop(1, 'transparent');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s.x, s.y, R * 0.5, 0, 7); ctx.fill();
      ctx.fillStyle = s.c; ctx.beginPath(); ctx.arc(s.x, s.y, Math.max(2, W * 0.006), 0, 7); ctx.fill();
    });
    ctx.fillStyle = light ? '#222' : '#fff';
    ctx.beginPath(); ctx.arc(px, py, Math.max(1.5, W * 0.004), 0, 7); ctx.fill();
  }, [light]);
  return <canvas ref={ref} style={canvasStyle} />;
}

/* ---- Stable marriage: an animated Gale–Shapley proposal round ------------- */
const GS = (() => {
  const n = 5, rnd = mulberry32(20260610);
  const shuffle = () => {
    const a = [0, 1, 2, 3, 4];
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };
  const prefP = Array.from({ length: n }, shuffle);
  const rankR = Array.from({ length: n }, () => {
    const order = shuffle(), rank = new Array(n).fill(0);
    order.forEach((p, i) => { rank[p] = i; });
    return rank;
  });
  const match = new Array<number>(n).fill(-1); // reviewer → proposer
  const next = new Array(n).fill(0);
  const free = [0, 1, 2, 3, 4];
  const events: { p: number; r: number; kind: 'accept' | 'bump' | 'reject'; m: number[] }[] = [];
  while (free.length) {
    const p = free.shift()!;
    const r = prefP[p][next[p]++];
    if (match[r] === -1) {
      match[r] = p;
      events.push({ p, r, kind: 'accept', m: match.slice() });
    } else if (rankR[r][p] < rankR[r][match[r]]) {
      free.push(match[r]);
      match[r] = p;
      events.push({ p, r, kind: 'bump', m: match.slice() });
    } else {
      free.unshift(p);
      events.push({ p, r, kind: 'reject', m: match.slice() });
    }
  }
  return { n, events };
})();

function MarriagePreview({ light }: { light: boolean }) {
  const bg = light ? '#f4f3ef' : '#05060d';
  const ref = useCanvas((ctx, W, H, t) => {
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    const { n, events } = GS;
    const STEP = 0.85, HOLD = 2.2;
    const total = events.length * STEP + HOLD;
    const tt = t % total;
    const idx = Math.min(Math.floor(tt / STEP), events.length - 1);
    const inHold = tt >= events.length * STEP;
    const lx = W * 0.16, rx = W * 0.84;
    const yAt = (i: number) => H * (0.16 + (i / (n - 1)) * 0.68);
    const gold = light ? '#b67d10' : '#ffd400';
    const cyan = light ? '#1d8a78' : '#5ad1ff';
    // committed matching = state after the previous event (final during hold)
    const m = inHold ? events[events.length - 1].m : (idx > 0 ? events[idx - 1].m : new Array(n).fill(-1));
    ctx.lineWidth = Math.max(1.2, W * 0.004);
    for (let r = 0; r < n; r++) {
      if (m[r] === -1) continue;
      ctx.strokeStyle = light ? 'rgba(182,125,16,0.75)' : 'rgba(255,212,0,0.7)';
      ctx.beginPath(); ctx.moveTo(lx, yAt(m[r])); ctx.lineTo(rx, yAt(r)); ctx.stroke();
    }
    // the live proposal: line grows, then flashes its verdict
    if (!inHold) {
      const e = events[idx];
      const prog = (tt - idx * STEP) / STEP;
      const grow = Math.min(1, prog / 0.4);
      const x2 = lx + (rx - lx) * grow, y2 = yAt(e.p) + (yAt(e.r) - yAt(e.p)) * grow;
      const verdict = prog > 0.55;
      ctx.strokeStyle = !verdict
        ? (light ? 'rgba(60,60,70,0.8)' : 'rgba(255,255,255,0.8)')
        : e.kind === 'reject'
          ? `rgba(235,80,80,${1 - (prog - 0.55) / 0.45})`
          : (light ? 'rgba(29,138,120,0.95)' : 'rgba(90,209,255,0.95)');
      ctx.beginPath(); ctx.moveTo(lx, yAt(e.p)); ctx.lineTo(x2, y2); ctx.stroke();
    }
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = gold;
      ctx.beginPath(); ctx.arc(lx, yAt(i), Math.max(3, W * 0.013), 0, 7); ctx.fill();
      ctx.fillStyle = cyan;
      ctx.beginPath(); ctx.arc(rx, yAt(i), Math.max(3, W * 0.013), 0, 7); ctx.fill();
    }
  }, [light]);
  return <canvas ref={ref} style={canvasStyle} />;
}

/* ---- Agentic sorting: agents racing to sort a bipolar bar array ----------- */
/* Mirrors the app's Array view: bars rise above / hang below a center axis,
   candy-colored by value band, while agent dots crawl the axis swapping. */
function SortingPreview({ light }: { light: boolean }) {
  const N = 34;
  const sim = useRef<{ arr: number[]; agents: number[]; last: number; doneAt: number } | null>(null);
  const rnd = useRef(mulberry32(99));
  const shuffled = () => {
    const a = Array.from({ length: N }, (_, i) => -1 + (2 * i) / (N - 1));
    for (let i = N - 1; i > 0; i--) { const j = Math.floor(rnd.current() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };
  if (!sim.current) sim.current = { arr: shuffled(), agents: [2, 11, 20, 29], last: 0, doneAt: -1 };
  const bg = light ? '#f4f3ef' : '#05060d';
  const pal = light
    ? ['#b3457a', '#7a4fbf', '#1d7a9e', '#b06a10', '#1d8a5e']
    : ['#ff5aa6', '#b78cff', '#5ad1ff', '#ffb04d', '#3de8b0'];
  const ref = useCanvas((ctx, W, H, t) => {
    const s = sim.current!;
    const sorted = s.arr.every((v, i) => i === 0 || s.arr[i - 1] <= v);
    if (sorted && s.doneAt < 0) s.doneAt = t;
    if (sorted && s.doneAt >= 0 && t - s.doneAt > 1.6) {
      s.arr = shuffled(); s.agents = [2, 11, 20, 29]; s.doneAt = -1;
    }
    // concurrent agents, each bubbling at its own cursor on the axis
    if (!sorted && t - s.last > 0.06) {
      s.last = t;
      s.agents = s.agents.map(i => {
        if (s.arr[i] > s.arr[i + 1]) [s.arr[i], s.arr[i + 1]] = [s.arr[i + 1], s.arr[i]];
        const ni = i + 1;
        return ni >= N - 1 ? 0 : ni;
      });
    }
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    const mid = H * 0.5, m = W * 0.05, bw = (W - 2 * m) / N, amp = H * 0.38;
    for (let i = 0; i < N; i++) {
      const v = s.arr[i];
      const bh = Math.max(2, Math.abs(v) * amp);
      const y = v >= 0 ? mid - bh : mid;
      ctx.fillStyle = pal[Math.min(pal.length - 1, Math.floor(((v + 1) / 2) * pal.length))];
      ctx.fillRect(m + i * bw + bw * 0.2, y, bw * 0.6, bh);
    }
    // center axis + agent dots crawling it
    ctx.fillStyle = light ? 'rgba(60,60,70,0.35)' : 'rgba(255,255,255,0.22)';
    ctx.fillRect(m * 0.6, mid - 0.5, W - m * 1.2, 1);
    s.agents.forEach(i => {
      const x = m + i * bw + bw * 0.5;
      const r = Math.max(2.4, W * 0.0085);
      ctx.fillStyle = light ? '#222' : '#fff';
      ctx.beginPath(); ctx.arc(x, mid, r, 0, 7); ctx.fill();
      ctx.strokeStyle = light ? 'rgba(34,34,34,0.35)' : 'rgba(255,255,255,0.35)';
      ctx.lineWidth = Math.max(1, W * 0.003);
      ctx.beginPath(); ctx.arc(x, mid, r * 2, 0, 7); ctx.stroke();
    });
  }, [light]);
  return <canvas ref={ref} style={canvasStyle} />;
}

/* ---- Stable matching lab: preference heatmap + a matching walking the lattice */
const LATTICE = (() => {
  const n = 7, rnd = mulberry32(424242);
  const heat = Array.from({ length: n }, () => Array.from({ length: n }, () => rnd()));
  const perms: number[][] = [];
  let p = Array.from({ length: n }, (_, i) => i);
  for (let k = 0; k < 5; k++) {
    p = p.slice();
    // rotate a few entries — adjacent matchings in the lattice differ locally
    const i = Math.floor(rnd() * n), j = (i + 1 + Math.floor(rnd() * (n - 1))) % n;
    [p[i], p[j]] = [p[j], p[i]];
    perms.push(p);
  }
  return { n, heat, perms };
})();

function MatrixPreview({ light }: { light: boolean }) {
  const bg = light ? '#f4f3ef' : '#05060d';
  const ref = useCanvas((ctx, W, H, t) => {
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    const { n, heat, perms } = LATTICE;
    const cell = Math.min(W * 0.8 / n, H * 0.8 / n);
    const ox = (W - cell * n) / 2, oy = (H - cell * n) / 2;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const v = heat[i][j];
        const shimmer = 0.06 * Math.sin(t * 1.2 + i * 0.9 + j * 1.3);
        const a = Math.max(0, Math.min(1, v + shimmer));
        ctx.fillStyle = light
          ? `hsla(${35 + a * 10},${50 + a * 30}%,${88 - a * 45}%,1)`
          : `hsla(${230 - a * 200},75%,${14 + a * 42}%,1)`;
        ctx.fillRect(ox + j * cell + 1, oy + i * cell + 1, cell - 2, cell - 2);
      }
    }
    // the current matching = one cell per row; it steps through lattice neighbors
    const PERIOD = 1.7;
    const k = Math.floor(t / PERIOD) % perms.length;
    const k2 = (k + 1) % perms.length;
    const f = (t % PERIOD) / PERIOD;
    const ease = f < 0.3 ? f / 0.3 : 1; // slide early, rest late
    ctx.strokeStyle = light ? '#b67d10' : '#ffd400';
    ctx.lineWidth = Math.max(1.4, W * 0.005);
    for (let i = 0; i < n; i++) {
      const j = perms[k][i] + (perms[k2][i] - perms[k][i]) * ease;
      const x = ox + j * cell, y = oy + i * cell;
      ctx.strokeRect(x + cell * 0.18, y + cell * 0.18, cell * 0.64, cell * 0.64);
    }
  }, [light]);
  return <canvas ref={ref} style={canvasStyle} />;
}

/* ---- Polygon worlds: first-person walk on the torus + glued-square minimap - */
/* Mirrors the app's layout: the main view walks the tiled universal cover
   (landmarks repeat every tile — that IS the gluing), with the fundamental
   square and its edge-identification arrows inset like the app's minimap. */
function PolygonPreview({ light }: { light: boolean }) {
  const cam = useRef({ x: 0.3, z: 0, pt: 0 });
  const ref = useCanvas((ctx, W, H, t) => {
    const c = cam.current;
    const dt = Math.min(0.05, Math.max(0, t - c.pt));
    c.pt = t;
    c.x += 0.1 * dt; c.z += 0.5 * dt;   // stroll forward with a slow drift
    const gold = light ? '#b67d10' : '#ffd400';
    const cyan = light ? '#1d8a78' : '#5ad1ff';
    const pink = light ? '#b3457a' : '#ff5aa6';
    const horizon = H * 0.4, f = W * 0.42, camH = 0.34;
    // sky + ground
    ctx.fillStyle = light ? '#eef0f2' : '#04060c';
    ctx.fillRect(0, 0, W, horizon);
    ctx.fillStyle = light ? '#e4dfd2' : '#0a0e1c';
    ctx.fillRect(0, horizon, W, H - horizon);
    const frac = (v: number) => ((v % 1) + 1) % 1;
    // tile grid on the ground: cross lines recede, long lines converge
    ctx.lineWidth = Math.max(1, W * 0.002);
    for (let k = 0; k < 12; k++) {
      const wz = k + 1 - frac(c.z);
      if (wz < 0.2) continue;
      const y = horizon + (camH / wz) * f;
      if (y > H) continue;
      const a = Math.min(0.5, 1.3 / (wz * wz + 1));
      ctx.strokeStyle = light ? `rgba(80,85,105,${a})` : `rgba(110,150,210,${a})`;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    for (let k = -7; k <= 7; k++) {
      const wx = k - frac(c.x);
      const x1 = W / 2 + (wx / 0.3) * f, y1 = horizon + (camH / 0.3) * f;
      const x2 = W / 2 + (wx / 12) * f, y2 = horizon + (camH / 12) * f;
      ctx.strokeStyle = light ? 'rgba(80,85,105,0.22)' : 'rgba(110,150,210,0.22)';
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }
    // landmarks at fixed intra-tile spots, repeated every tile = the gluing
    const marks: { wx: number; wz: number; kind: number }[] = [];
    for (let j = 0; j < 9; j++) {
      for (let i = -3; i <= 3; i++) {
        for (const [ox, oz, kind] of [[0.28, 0.62, 0], [0.74, 0.18, 1], [0.52, 0.9, 2]] as const) {
          const wx = i + ox - frac(c.x), wz = j + oz - frac(c.z);
          if (wz > 0.25 && wz < 9) marks.push({ wx, wz, kind });
        }
      }
    }
    marks.sort((a, b) => b.wz - a.wz);
    for (const mk of marks) {
      const gx = W / 2 + (mk.wx / mk.wz) * f;
      const gy = horizon + (camH / mk.wz) * f;
      if (gx < -W * 0.1 || gx > W * 1.1 || gy > H * 1.05) continue;
      const hgt = (mk.kind === 0 ? 0.5 : mk.kind === 1 ? 0.34 : 0.22) / mk.wz * f;
      const ww = Math.max(1.2, (mk.kind === 0 ? 0.035 : 0.06) / mk.wz * f);
      const fade = Math.min(1, 2.2 / mk.wz);
      if (mk.kind === 0) {        // gold obelisk
        ctx.fillStyle = gold; ctx.globalAlpha = fade;
        ctx.fillRect(gx - ww / 2, gy - hgt, ww, hgt);
        ctx.beginPath(); ctx.arc(gx, gy - hgt, ww * 0.9, 0, 7); ctx.fill();
      } else if (mk.kind === 1) { // teal tree-cone
        ctx.fillStyle = cyan; ctx.globalAlpha = fade;
        ctx.beginPath();
        ctx.moveTo(gx, gy - hgt); ctx.lineTo(gx - ww, gy); ctx.lineTo(gx + ww, gy);
        ctx.closePath(); ctx.fill();
      } else {                    // pink stone
        ctx.fillStyle = pink; ctx.globalAlpha = fade * 0.9;
        ctx.beginPath(); ctx.arc(gx, gy - hgt * 0.4, Math.max(1.2, ww * 0.8), 0, 7); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    // the walker avatar, third-person like the app
    const ax = W / 2, ay = H * 0.8, ar = Math.max(3, W * 0.013);
    ctx.fillStyle = gold;
    ctx.beginPath(); ctx.ellipse(ax, ay, ar * 0.7, ar * 1.4, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(ax, ay - ar * 1.9, ar * 0.55, 0, 7); ctx.fill();
    // minimap inset: the fundamental square with glued-edge arrows
    const ms = Math.min(W, H) * 0.32, mx = W - ms - W * 0.03, my = H * 0.06;
    ctx.fillStyle = light ? 'rgba(244,243,239,0.85)' : 'rgba(5,6,13,0.78)';
    ctx.fillRect(mx, my, ms, ms);
    ctx.lineWidth = Math.max(1.4, W * 0.0045);
    ctx.strokeStyle = gold;
    ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx, my + ms); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(mx + ms, my); ctx.lineTo(mx + ms, my + ms); ctx.stroke();
    ctx.strokeStyle = cyan;
    ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx + ms, my); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(mx, my + ms); ctx.lineTo(mx + ms, my + ms); ctx.stroke();
    const arrow = (x: number, y: number, ang: number, col: string) => {
      const s = Math.max(3, W * 0.011);
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(ang) * s, y + Math.sin(ang) * s);
      ctx.lineTo(x + Math.cos(ang + 2.5) * s, y + Math.sin(ang + 2.5) * s);
      ctx.lineTo(x + Math.cos(ang - 2.5) * s, y + Math.sin(ang - 2.5) * s);
      ctx.closePath(); ctx.fill();
    };
    arrow(mx, my + ms / 2, -Math.PI / 2, gold);       // left edge ↑
    arrow(mx + ms, my + ms / 2, -Math.PI / 2, gold);  // right edge ↑ (same way = torus)
    arrow(mx + ms / 2, my, 0, cyan);                  // top edge →
    arrow(mx + ms / 2, my + ms, 0, cyan);             // bottom edge →
    ctx.fillStyle = light ? '#222' : '#fff';
    ctx.beginPath();
    ctx.arc(mx + frac(c.x) * ms, my + (1 - frac(c.z)) * ms, Math.max(2, W * 0.006), 0, 7);
    ctx.fill();
  }, [light]);
  return <canvas ref={ref} style={canvasStyle} />;
}

// --- Trees and Nets: a pentagon's dual tree walking its flip-cycle ---
function tnTriangulations(n: number): number[][][] {
  const rec = (B: number[]): number[][][] => {
    if (B.length < 3) return [[]];
    const a = B[0], b = B[B.length - 1], out: number[][][] = [];
    for (let k = 1; k < B.length - 1; k++)
      for (const tl of rec(B.slice(0, k + 1)))
        for (const tr of rec(B.slice(k)))
          out.push([[a, B[k], b], ...tl, ...tr]);
    return out;
  };
  return rec(Array.from({ length: n }, (_, i) => i));
}
function tnDiags(tris: number[][], n: number): Set<string> {
  const s = new Set<string>();
  for (const [x, y, z] of tris)
    for (const [a, b] of [[x, y], [y, z], [x, z]] as [number, number][]) {
      const lo = Math.min(a, b), hi = Math.max(a, b);
      if (!(hi - lo === 1 || (lo === 0 && hi === n - 1))) s.add(`${lo},${hi}`);
    }
  return s;
}

function TreeNetPreview({ light }: { light: boolean }) {
  const cyc = useMemo(() => {
    const n = 5;
    const tris = tnTriangulations(n);
    const ds = tris.map((t) => tnDiags(t, n));
    const adj: number[][] = tris.map(() => []);
    for (let i = 0; i < tris.length; i++)
      for (let j = i + 1; j < tris.length; j++) {
        let sd = 0;
        for (const d of ds[i]) if (!ds[j].has(d)) sd++;
        for (const d of ds[j]) if (!ds[i].has(d)) sd++;
        if (sd === 2) { adj[i].push(j); adj[j].push(i); }
      }
    const order: number[] = [0]; const seen = new Set([0]);
    while (order.length < tris.length) {
      const nx = adj[order[order.length - 1]].find((x) => !seen.has(x));
      if (nx === undefined) break; order.push(nx); seen.add(nx);
    }
    return { n, tris: order.map((i) => tris[i]) };
  }, []);

  const ref = useCanvas((ctx, W, H, t) => {
    const { n, tris } = cyc;
    const gold = light ? '#b67d10' : '#ffd400';
    const teal = light ? '#1d8a78' : '#5ad1ff';
    const fg = light ? 'rgba(60,65,80,' : 'rgba(200,210,230,';
    ctx.fillStyle = light ? '#eef0f2' : '#0a0e1c';
    ctx.fillRect(0, 0, W, H);
    const cx = W / 2, cy = H * 0.52, R = Math.min(W, H) * 0.34;
    const vA = (k: number) => -Math.PI / 2 + (2 * Math.PI * k) / n;
    const eA = (k: number) => -Math.PI / 2 + (2 * Math.PI * (k + 0.5)) / n;
    const PX = (k: number) => cx + R * Math.cos(vA(k));
    const PY = (k: number) => cy + R * Math.sin(vA(k));
    const ease = (x: number) => x * x * (3 - 2 * x);
    const has = (tr: number[], x: number) => tr.includes(x);
    const ctr = (tr: number[]) => [(PX(tr[0]) + PX(tr[1]) + PX(tr[2])) / 3, (PY(tr[0]) + PY(tr[1]) + PY(tr[2])) / 3] as [number, number];

    const period = 1.6;
    const seg = Math.floor(t / period) % tris.length;
    const lt = ease((t % period) / period);
    const A = tris[seg], B = tris[(seg + 1) % tris.length];
    const usedA = new Array(A.length).fill(false);
    const nodeB = B.map((bt) => {
      const to = ctr(bt);
      let mi = A.findIndex((at, k) => !usedA[k] && at.every((x) => has(bt, x)));
      if (mi < 0) { // nearest unused
        let bd = Infinity; A.forEach((at, k) => { if (usedA[k]) return; const q = ctr(at); const dd = (to[0] - q[0]) ** 2 + (to[1] - q[1]) ** 2; if (dd < bd) { bd = dd; mi = k; } });
      }
      const from = mi >= 0 ? (usedA[mi] = true, ctr(A[mi])) : to;
      return [from[0] + (to[0] - from[0]) * lt, from[1] + (to[1] - from[1]) * lt] as [number, number];
    });

    ctx.strokeStyle = `${fg}0.18)`; ctx.lineWidth = Math.max(1, W * 0.004);
    ctx.beginPath(); for (let k = 0; k < n; k++) { if (k === 0) ctx.moveTo(PX(k), PY(k)); else ctx.lineTo(PX(k), PY(k)); } ctx.closePath(); ctx.stroke();

    ctx.lineWidth = Math.max(1.5, W * 0.006); ctx.strokeStyle = `${fg}0.6)`;
    for (let k = 0; k < n; k++) {
      const ti = B.findIndex((bt) => has(bt, k) && has(bt, (k + 1) % n)); if (ti < 0) continue;
      ctx.beginPath(); ctx.moveTo(nodeB[ti][0], nodeB[ti][1]); ctx.lineTo(cx + R * 0.96 * Math.cos(eA(k)), cy + R * 0.96 * Math.sin(eA(k))); ctx.stroke();
    }
    ctx.strokeStyle = teal; ctx.lineWidth = Math.max(2, W * 0.009);
    for (const key of tnDiags(B, n)) {
      const [a, b] = key.split(',').map(Number); const ts: number[] = [];
      B.forEach((bt, i) => { if (has(bt, a) && has(bt, b)) ts.push(i); });
      if (ts.length === 2) { ctx.beginPath(); ctx.moveTo(nodeB[ts[0]][0], nodeB[ts[0]][1]); ctx.lineTo(nodeB[ts[1]][0], nodeB[ts[1]][1]); ctx.stroke(); }
    }
    ctx.fillStyle = light ? '#eef0f2' : '#0a0e1c'; ctx.strokeStyle = `${fg}0.9)`; ctx.lineWidth = Math.max(1, W * 0.004);
    for (const p of nodeB) { ctx.beginPath(); ctx.arc(p[0], p[1], Math.max(2.5, W * 0.012), 0, 7); ctx.fill(); ctx.stroke(); }
    ctx.fillStyle = gold;
    for (let k = 0; k < n; k++) { ctx.beginPath(); ctx.arc(cx + R * 0.96 * Math.cos(eA(k)), cy + R * 0.96 * Math.sin(eA(k)), Math.max(2.5, W * 0.013), 0, 7); ctx.fill(); }
  }, [light]);
  return <canvas ref={ref} style={canvasStyle} />;
}

function SolidPreview({ light }: { light: boolean }) {
  const ref = useCanvas((ctx, W, H, t) => {
    ctx.fillStyle = light ? '#eef0f2' : '#070a14';
    ctx.fillRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2, s = Math.min(W, H) * 0.2;
    const ay = t * 0.5, ax = 0.5;
    const ca = Math.cos(ay), sa = Math.sin(ay), cp = Math.cos(ax), sp = Math.sin(ax);
    // project a 3D point with a slow turntable + fixed tilt
    const proj = (x: number, y: number, z: number): [number, number] => {
      const X = x * ca + z * sa, Z0 = -x * sa + z * ca;
      const Y = y * cp - Z0 * sp;
      const Z = y * sp + Z0 * cp;
      const f = 3.2 / (3.2 + Z * 0.18);
      return [cx + X * s * f, cy + Y * s * f];
    };
    const corners: [number, number, number][] = [
      [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
      [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1],
    ];
    const edges = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
    const accent = light ? '#1d6fb8' : '#5ad1ff';
    // a 3×1×1 strip of cubes — one room repeating along x
    for (let c = -1; c <= 1; c++) {
      const fade = c === 0 ? 1 : 0.4;
      ctx.strokeStyle = c === 0 ? accent : (light ? `rgba(80,90,110,${fade})` : `rgba(150,180,220,${fade})`);
      ctx.lineWidth = Math.max(1, W * (c === 0 ? 0.006 : 0.003));
      for (const [a, b] of edges) {
        const p = proj(corners[a][0] + c * 2.05, corners[a][1], corners[a][2]);
        const q = proj(corners[b][0] + c * 2.05, corners[b][1], corners[b][2]);
        ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
      }
    }
    // a small chiral "F" pair: upright in the center cube, mirrored in the next —
    // the orientation-reversal hint
    const drawF = (px: number, py: number, mir: number, col: string) => {
      const u = Math.max(2.4, W * 0.012);
      ctx.strokeStyle = col; ctx.lineWidth = Math.max(1.5, W * 0.007); ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(px, py - 1.5 * u); ctx.lineTo(px, py + 1.5 * u);
      ctx.moveTo(px, py - 1.5 * u); ctx.lineTo(px + mir * 1.4 * u, py - 1.5 * u);
      ctx.moveTo(px, py); ctx.lineTo(px + mir * u, py);
      ctx.stroke();
    };
    const c0 = proj(0, 0, 0); drawF(c0[0], c0[1], 1, accent);
    const c1 = proj(2.05, 0, 0); drawF(c1[0], c1[1], -1, light ? '#b3457a' : '#ff5aa6');
  }, [light]);
  return <canvas ref={ref} style={canvasStyle} />;
}

/* ---- Counting the Ways: the (gains,lost) lattice + the Skellam it builds ---- */
/* Mirrors the app: a diagonal sweeps the joint-Poisson grid (gains − lost = k)
   while the Skellam distribution below fills in bar by bar, bottom to top. */
const SKELLAM = (() => {
  const G = 8;                      // grid cells 0..G on each axis
  const mu1 = 3.4, mu2 = 2.0;       // tuned so the joint blob sits inside the grid
  const logf = [0, 0];
  for (let i = 2; i <= G + 1; i++) logf[i] = logf[i - 1] + Math.log(i);
  const pois = (mu: number, k: number) => Math.exp(-mu + k * Math.log(mu) - logf[k]);
  const pX = Array.from({ length: G + 1 }, (_, x) => pois(mu1, x));
  const pY = Array.from({ length: G + 1 }, (_, y) => pois(mu2, y));
  const jmax = Math.max(...pX) * Math.max(...pY);
  const K = G;                      // Skellam support shown: k ∈ [−K, K]
  const sk: number[] = [];
  for (let k = -K; k <= K; k++) {
    let s = 0;
    for (let y = 0; y <= G; y++) { const x = k + y; if (x >= 0 && x <= G) s += pX[x] * pY[y]; }
    sk.push(s);
  }
  const skmax = Math.max(...sk);
  return { G, K, pX, pY, jmax, sk, skmax };
})();

function SkellamPreview({ light }: { light: boolean }) {
  const bg = light ? '#f4f3ef' : '#05060d';
  const gold = light ? '#b67d10' : '#ffd400';
  const teal = light ? '#1d8a78' : '#5ad1ff';
  const ref = useCanvas((ctx, W, H, t) => {
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    const { G, K, pX, pY, jmax, sk, skmax } = SKELLAM;
    const gs = Math.min(W * 0.72, H * 0.6);
    const cell = gs / (G + 1);
    const gx0 = (W - gs) / 2, gy0 = H * 0.05;
    // sweep k from −K to +K, then hold briefly, then loop
    const period = 6.5;
    const tt = t % period;
    const sweepK = Math.round(-K + Math.min(1, tt / (period * 0.82)) * 2 * K);

    // joint-Poisson grid, with the active diagonal (gains − lost = sweepK) lit
    for (let y = 0; y <= G; y++) for (let x = 0; x <= G; x++) {
      const op = (pX[x] * pY[y]) / jmax;
      const onDiag = x - y === sweepK;
      const px = gx0 + x * cell, py = gy0 + y * cell;
      ctx.fillStyle = gold;
      ctx.globalAlpha = onDiag ? Math.max(0.5, op) : op * 0.8;
      ctx.fillRect(px + cell * 0.07, py + cell * 0.07, cell * 0.86, cell * 0.86);
      if (onDiag) {
        ctx.globalAlpha = 1;
        ctx.strokeStyle = teal; ctx.lineWidth = Math.max(1, W * 0.004);
        ctx.strokeRect(px + cell * 0.07, py + cell * 0.07, cell * 0.86, cell * 0.86);
      }
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = light ? 'rgba(60,60,70,0.16)' : 'rgba(150,180,220,0.16)';
    ctx.lineWidth = 1;
    ctx.strokeRect(gx0, gy0, gs, gs);

    // the Skellam distribution below — bars fill bottom-to-top as the sweep passes
    const bx0 = W * 0.07, bw = (W - 2 * bx0) / sk.length;
    const baseY = H * 0.95, barsH = H * 0.27;
    for (let i = 0; i < sk.length; i++) {
      const kk = i - K, h = (sk[i] / skmax) * barsH, filled = kk <= sweepK;
      ctx.fillStyle = kk === sweepK ? teal : gold;
      ctx.globalAlpha = filled ? (kk === sweepK ? 1 : 0.85) : 0.13;
      ctx.fillRect(bx0 + i * bw + bw * 0.13, baseY - h, bw * 0.74, h);
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = light ? 'rgba(60,60,70,0.3)' : 'rgba(150,180,220,0.22)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(bx0, baseY + 0.5); ctx.lineTo(W - bx0, baseY + 0.5); ctx.stroke();
  }, [light]);
  return <canvas ref={ref} style={canvasStyle} />;
}

export function Preview({ kind, skin }: { kind: PreviewKind; skin: string; hue?: number }) {
  const light = skin === 'light';
  switch (kind) {
    case 'plane': return <PlanePreview light={light} />;
    case 'fractal': return <FractalPreview light={light} />;
    case 'julia': return <JuliaPreview light={light} />;
    case 'corridor': return <CorridorPreview light={light} />;
    case 'trinary': return <TrinaryPreview light={light} />;
    case 'marriage': return <MarriagePreview light={light} />;
    case 'sorting': return <SortingPreview light={light} />;
    case 'matrix': return <MatrixPreview light={light} />;
    case 'polygon': return <PolygonPreview light={light} />;
    case 'treenet': return <TreeNetPreview light={light} />;
    case 'solid': return <SolidPreview light={light} />;
    case 'skellam': return <SkellamPreview light={light} />;
    default: return <ParticlePreview light={light} />;
  }
}
