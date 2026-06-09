/* viz.jsx — lightweight but authentic mock visualizations that sit behind the
   redesigned chrome. Three flavours mirroring real animath apps:
     - "particles": a 4D-ish projected point cloud (Complex Particles)
     - "fractal":   an escape-time Mandelbrot/Julia (Fractals)
     - "trinary":   three stars + a chaotic orbiting world (Trinary System)
   Each draws into a <canvas> sized to its parent. Kept deliberately cheap
   (modest point counts, shared cadence) so several can run on one canvas. */

const { useRef, useEffect } = React;

function useCanvas(draw, deps) {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const parent = cv.parentElement;
    let raf = 0, t0 = performance.now(), running = true;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    function resize() {
      const r = parent.getBoundingClientRect();
      cv.width = Math.max(1, Math.floor(r.width * dpr));
      cv.height = Math.max(1, Math.floor(r.height * dpr));
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(parent);
    const ctx = cv.getContext('2d');
    // Paint one frame synchronously so the viz is never blank on first render
    // (and so static screenshots / PDF export capture content even if rAF is
    // throttled for an off-screen / backgrounded frame).
    try { draw(ctx, cv.width, cv.height, 0, dpr); } catch (e) {}
    const loop = (t) => {
      if (!running) return;
      draw(ctx, cv.width, cv.height, (t - t0) / 1000, dpr);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { running = false; cancelAnimationFrame(raf); ro.disconnect(); };
  }, deps || []);
  return ref;
}

/* ---- Particles: rotating complex-function point cloud --------------------- */
function ParticleViz({ theme, hue = 0.0, dense = false }) {
  const N = dense ? 1300 : 850;
  const pts = useRef(null);
  if (!pts.current) {
    const arr = [];
    for (let i = 0; i < N; i++) {
      // sample a disc in the (x,y) domain, map through a swirl to fake f(z)
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * 1.7;
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      arr.push({ x, y, a, r });
    }
    pts.current = arr;
  }
  const bg = theme === 'light' ? '#f4f3ef' : (theme === 'neon' ? '#05060e' : '#000');
  const ref = useCanvas((ctx, W, H, t) => {
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2;
    const scale = Math.min(W, H) * 0.26;
    const rot = t * 0.18;
    ctx.globalCompositeOperation = theme === 'light' ? 'multiply' : 'lighter';
    const arr = pts.current;
    for (let i = 0; i < arr.length; i++) {
      const p = arr[i];
      // pseudo f(z) = swirl + radial lift, projected from "4D" with a tumble
      const ang = p.a + rot + p.r * 0.9;
      const lift = Math.sin(p.r * 2.2 - t * 0.6);
      const px = Math.cos(ang) * p.r;
      const py = Math.sin(ang) * p.r;
      const depth = 0.62 + 0.38 * Math.cos(p.a * 2 + rot * 1.3);
      const sx = cx + px * scale * depth;
      const sy = cy + py * scale * depth - lift * scale * 0.12;
      const hh = ((p.a / (Math.PI * 2)) + hue + t * 0.02) % 1;
      const sat = theme === 'light' ? 70 : 95;
      const lum = theme === 'light' ? 48 : (45 + depth * 22);
      ctx.fillStyle = `hsla(${hh * 360},${sat}%,${lum}%,${theme === 'light' ? 0.55 : 0.85})`;
      const sz = (dense ? 1.1 : 1.5) * depth + 0.4;
      ctx.fillRect(sx - sz, sy - sz, sz * 2, sz * 2);
    }
  }, [theme, hue, dense]);
  return <canvas ref={ref} style={{ display: 'block', width: '100%', height: '100%' }} />;
}

/* ---- Fractal: escape-time Mandelbrot ------------------------------------- */
function FractalViz({ theme, palette = 'fire', cx0 = -0.6, cy0 = 0, zoom = 1.1 }) {
  const off = useRef(null);
  const ref = useCanvas((ctx, W, H, t) => {
    const rw = 260, rh = Math.round(260 * H / Math.max(1, W));
    if (!off.current || off.current.width !== rw || off.current.height !== rh) {
      const o = document.createElement('canvas');
      o.width = rw; o.height = rh;
      const octx = o.getContext('2d');
      const img = octx.createImageData(rw, rh);
      const maxIt = 90;
      const span = 3.0 / zoom;
      for (let py = 0; py < rh; py++) {
        for (let px = 0; px < rw; px++) {
          const x0 = cx0 + (px / rw - 0.5) * span;
          const y0 = cy0 + (py / rh - 0.5) * span * (rh / rw) * (rw / rh) * (rh / rw === 0 ? 1 : 1);
          const yy0 = cy0 + (py / rh - 0.5) * span * (rh / rw);
          let x = 0, y = 0, it = 0;
          while (x * x + y * y <= 4 && it < maxIt) {
            const xt = x * x - y * y + x0;
            y = 2 * x * y + yy0; x = xt; it++;
          }
          const k = (px + py * rw) * 4;
          if (it >= maxIt) { img.data[k] = img.data[k+1] = img.data[k+2] = theme === 'light' ? 245 : 8; img.data[k+3] = 255; }
          else {
            const m = it / maxIt;
            let r, g, b;
            if (palette === 'ice') { r = 30 + m*60; g = 120 + m*120; b = 180 + m*70; }
            else if (palette === 'mono') { r = g = b = 40 + m*200; }
            else { r = 20 + m*235; g = 10 + m*150*m; b = 60 + m*90; } // fire
            img.data[k] = r; img.data[k+1] = g; img.data[k+2] = b; img.data[k+3] = 255;
          }
        }
      }
      octx.putImageData(img, 0, 0);
      off.current = o;
    }
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(off.current, 0, 0, W, H);
  }, [theme, palette, cx0, cy0, zoom]);
  return <canvas ref={ref} style={{ display: 'block', width: '100%', height: '100%' }} />;
}

/* ---- Trinary: three stars + a doomed orbiting world ---------------------- */
function TrinaryViz({ theme }) {
  const trail = useRef([]);
  const bg = theme === 'light' ? '#f4f3ef' : (theme === 'neon' ? '#05060e' : '#04040a');
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
    trail.current.forEach((p, i) => { i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); });
    ctx.strokeStyle = theme === 'light' ? 'rgba(80,80,90,0.5)' : 'rgba(160,200,255,0.55)';
    ctx.stroke();
    stars.forEach(s => {
      const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, R * 0.5);
      g.addColorStop(0, s.c); g.addColorStop(1, 'transparent');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s.x, s.y, R * 0.5, 0, 7); ctx.fill();
      ctx.fillStyle = s.c; ctx.beginPath(); ctx.arc(s.x, s.y, Math.max(2, W*0.006), 0, 7); ctx.fill();
    });
    ctx.fillStyle = theme === 'light' ? '#222' : '#fff';
    ctx.beginPath(); ctx.arc(px, py, Math.max(1.5, W*0.004), 0, 7); ctx.fill();
  }, [theme]);
  return <canvas ref={ref} style={{ display: 'block', width: '100%', height: '100%' }} />;
}

function MockViz({ kind = 'particles', ...rest }) {
  if (kind === 'fractal') return <FractalViz {...rest} />;
  if (kind === 'trinary') return <TrinaryViz {...rest} />;
  return <ParticleViz {...rest} />;
}

Object.assign(window, { MockViz, ParticleViz, FractalViz, TrinaryViz });
