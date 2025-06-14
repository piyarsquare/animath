import React, { useCallback, useEffect, useRef, useState } from 'react';
import ToggleMenu from '../../components/ToggleMenu';
import Readme from '../../components/Readme';
import readmeText from './README.md?raw';

/** Interactive 2D fractal viewer inspired by the old Fractint program. */
export default function Fractals2D() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>();

  const iterationsRef = useRef<Float32Array>();
  const imageRef = useRef<ImageData>();
  const pathRef = useRef<{ x: number; y: number }[] | null>(null);

  const [view, setView] = useState({
    xMin: -2.5,
    xMax: 1.5,
    yMin: -1.5,
    yMax: 1.5
  });
  const [type, setType] = useState<'mandelbrot' | 'julia'>('mandelbrot');
  const [juliaC, setJuliaC] = useState({ real: -0.7, imag: 0.27015 });
  const [iter, setIter] = useState(100);
  const [palette, setPalette] = useState(0);
  const [offset, setOffset] = useState(0);
  const [animating, setAnimating] = useState(false);

  // Adjust view ranges to match canvas aspect ratio so pixel scale is uniform
  const normalizeView = useCallback((v: typeof view, canvas?: HTMLCanvasElement) => {
    const c = canvas || canvasRef.current;
    if (!c) return v;
    const aspect = c.width / c.height;
    const xRange = v.xMax - v.xMin;
    const yRange = v.yMax - v.yMin;
    const viewAspect = xRange / yRange;
    if (Math.abs(viewAspect - aspect) < 1e-9) return v;
    const cx = (v.xMin + v.xMax) / 2;
    const cy = (v.yMin + v.yMax) / 2;
    if (viewAspect > aspect) {
      const newY = xRange / aspect;
      return { xMin: v.xMin, xMax: v.xMax, yMin: cy - newY / 2, yMax: cy + newY / 2 };
    } else {
      const newX = yRange * aspect;
      return { xMin: cx - newX / 2, xMax: cx + newX / 2, yMin: v.yMin, yMax: v.yMax };
    }
  }, []);

  const FORMULAS: Record<'mandelbrot' | 'julia', string> = {
    mandelbrot: 'z_{n+1} = z_n^2 + c',
    julia: 'z_{n+1} = z_n^2 + c'
  };

  const generatePalette = useCallback((scheme: number, off: number) => {
    const out = [] as { r: number; g: number; b: number }[];
    for (let i = 0; i < 256; i++) {
      const t = (i + off) % 256;
      let r = 0, g = 0, b = 0;
      switch (scheme) {
        case 0:
          r = Math.sin(0.024 * t + 0) * 127 + 128;
          g = Math.sin(0.024 * t + 2) * 127 + 128;
          b = Math.sin(0.024 * t + 4) * 127 + 128;
          break;
        case 1:
          r = Math.min(255, t * 3);
          g = Math.max(0, Math.min(255, t * 3 - 255));
          b = Math.max(0, t * 3 - 510);
          break;
        case 2:
          r = 0;
          g = t / 2;
          b = t;
          break;
        case 3:
          r = g = b = t;
          break;
      }
      out.push({ r: Math.floor(r), g: Math.floor(g), b: Math.floor(b) });
    }
    return out;
  }, []);

  const mandelbrot = useCallback((cx: number, cy: number, max: number) => {
    let x = 0, y = 0, i = 0;
    while (x * x + y * y <= 4 && i < max) {
      const xt = x * x - y * y + cx;
      y = 2 * x * y + cy;
      x = xt;
      i++;
    }
    if (i === max) return 0;
    return i + 1 - Math.log(Math.log(Math.hypot(x, y))) / Math.log(2);
  }, []);

  const julia = useCallback((zx: number, zy: number, cx: number, cy: number, max: number) => {
    let x = zx, y = zy, i = 0;
    while (x * x + y * y <= 4 && i < max) {
      const xt = x * x - y * y + cx;
      y = 2 * x * y + cy;
      x = xt;
      i++;
    }
    if (i === max) return 0;
    return i + 1 - Math.log(Math.log(Math.hypot(x, y))) / Math.log(2);
  }, []);


  const renderFractal = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageRef.current || !iterationsRef.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pal = generatePalette(palette, offset);
    for (let i = 0; i < iterationsRef.current.length; i++) {
      const v = iterationsRef.current[i];
      const c = pal[v === 0 ? 0 : Math.floor((v * 10) % 255)];
      const di = i * 4;
      imageRef.current.data[di] = c.r;
      imageRef.current.data[di + 1] = c.g;
      imageRef.current.data[di + 2] = c.b;
      imageRef.current.data[di + 3] = 255;
    }
    ctx.putImageData(imageRef.current, 0, 0);
    drawPath(ctx);
  }, [generatePalette, palette, offset, drawPath]);

  const computeFractal = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const width = canvas.width;
    const height = canvas.height;
    const scale = (view.xMax - view.xMin) / width;
    iterationsRef.current = new Float32Array(width * height);
    imageRef.current = ctx.createImageData(width, height);
    for (let py = 0; py < height; py++) {
      const fy = view.yMin + py * scale;
      for (let px = 0; px < width; px++) {
        const fx = view.xMin + px * scale;
        const idx = py * width + px;
        iterationsRef.current[idx] =
          type === 'mandelbrot'
            ? mandelbrot(fx, fy, iter)
            : julia(fx, fy, juliaC.real, juliaC.imag, iter);
      }
    }
  }, [view, iter, type, juliaC, mandelbrot, julia]);

  const startRender = useCallback(() => {
    computeFractal();
    renderFractal();
  }, [computeFractal, renderFractal]);

  const screenToFractal = useCallback((sx: number, sy: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const x = sx - rect.left;
    const y = sy - rect.top;
    const scale = (view.xMax - view.xMin) / canvas.width;
    return {
      x: view.xMin + x * scale,
      y: view.yMin + y * scale
    };
  }, [view]);

  const fractalToScreen = useCallback((fx: number, fy: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const scale = canvas.width / (view.xMax - view.xMin);
    return {
      x: (fx - view.xMin) * scale,
      y: (fy - view.yMin) * scale
    };
  }, [view]);

  function drawPath(ctx: CanvasRenderingContext2D) {
    if (!pathRef.current || pathRef.current.length < 2) return;
    ctx.lineWidth = 2;
    for (let i = 0; i < pathRef.current.length - 1; i++) {
      const start = fractalToScreen(pathRef.current[i].x, pathRef.current[i].y);
      const end = fractalToScreen(pathRef.current[i + 1].x, pathRef.current[i + 1].y);
      const hue = (i / (pathRef.current.length - 1)) * 360;
      ctx.strokeStyle = `hsl(${hue},100%,50%)`;
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    }
  }

  const handleSelect = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const start = screenToFractal(e.clientX, e.clientY);
      const pts: { x: number; y: number }[] = [];
      if (type === 'mandelbrot') {
        let zx = start.x,
          zy = start.y;
        for (let i = 0; i < iter && zx * zx + zy * zy <= 4; i++) {
          pts.push({ x: zx, y: zy });
          const xt = zx * zx - zy * zy + start.x;
          zy = 2 * zx * zy + start.y;
          zx = xt;
        }
        pts.push({ x: zx, y: zy });
      } else {
        let zx = start.x,
          zy = start.y;
        for (let i = 0; i < iter && zx * zx + zy * zy <= 4; i++) {
          pts.push({ x: zx, y: zy });
          const xt = zx * zx - zy * zy + juliaC.real;
          zy = 2 * zx * zy + juliaC.imag;
          zx = xt;
        }
        pts.push({ x: zx, y: zy });
      }
      pathRef.current = pts;
      const canvas = canvasRef.current;
      if (!canvas || !imageRef.current) return;
      const ctx = canvas.getContext('2d');
      if (ctx) drawPath(ctx);
    },
    [screenToFractal, iter, type, juliaC, drawPath]
  );

  const zoom = useCallback((factor: number, cx?: number, cy?: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const center = cx !== undefined && cy !== undefined ? screenToFractal(cx, cy) : {
      x: (view.xMin + view.xMax) / 2,
      y: (view.yMin + view.yMax) / 2
    };
    const xr = (view.xMax - view.xMin) * factor;
    const yr = (view.yMax - view.yMin) * factor;
    const newView = {
      xMin: center.x - xr / 2,
      xMax: center.x + xr / 2,
      yMin: center.y - yr / 2,
      yMax: center.y + yr / 2
    };
    setView(normalizeView(newView, canvas));
  }, [view, screenToFractal, normalizeView]);

  const pan = useCallback((dx: number, dy: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setView(v => {
      const scale = (v.xMax - v.xMin) / canvas.width;
      const newView = {
        xMin: v.xMin - dx * scale,
        xMax: v.xMax - dx * scale,
        yMin: v.yMin - dy * scale,
        yMax: v.yMax - dy * scale
      };
      return normalizeView(newView, canvas);
    });
  }, [normalizeView]);


  const reset = useCallback(() => {
    const canvas = canvasRef.current ?? undefined;
    const base = { xMin: -2.5, xMax: 1.5, yMin: -1.5, yMax: 1.5 };
    setView(normalizeView(base, canvas));
    setIter(100);
  }, [normalizeView]);

  const animate = useCallback(() => {
    setOffset(o => (o + 1) % 256);
    animRef.current = requestAnimationFrame(animate);
  }, []);

  // Ensure canvas resolution matches its displayed size so pixels remain square
  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = parent.getBoundingClientRect();
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    setView(v => normalizeView(v, canvas));
    startRender();
  }, [startRender, normalizeView]);

  useEffect(() => {
    startRender();
  }, [startRender]);

  useEffect(() => {
    startRender();
  }, [view, iter, type, juliaC, startRender]);

  useEffect(() => {
    if (!imageRef.current) return;
    renderFractal();
  }, [palette, offset, renderFractal]);

  useEffect(() => {
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  useEffect(() => {
    if (animating) {
      animRef.current = requestAnimationFrame(animate);
    } else if (animRef.current) {
      cancelAnimationFrame(animRef.current);
    }
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [animating, animate]);

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <canvas
        ref={canvasRef}
        width={1}
        height={1}
        onClick={handleSelect}
        style={{ width: '100%', height: '100%', display: 'block', background: 'black' }}
      />
      <div style={{ position: 'absolute', top: 10, left: 10, color: 'white' }}>
        <label>
          Function:
          <select value={type} onChange={e => setType(e.target.value as any)}>
            <option value="mandelbrot">Mandelbrot</option>
            <option value="julia">Julia</option>
          </select>
        </label>
      </div>
      <div
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          color: 'white',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 4
        }}
      >
        <div style={{ fontSize: '1.2em' }}>{type === 'mandelbrot' ? 'Mandelbrot' : 'Julia'}</div>
        <div>{FORMULAS[type]}</div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <button onClick={() => pan(0, -50)}>Up</button>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => pan(-50, 0)}>Left</button>
            <button onClick={() => pan(50, 0)}>Right</button>
          </div>
          <button onClick={() => pan(0, 50)}>Down</button>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => zoom(0.9)}>Zoom In</button>
          <button onClick={() => zoom(1.1)}>Zoom Out</button>
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: 10, left: 10 }}>
        <ToggleMenu title="Menu">
          <div style={{ color: 'white', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label>
              Palette:
              <select value={palette} onChange={e => setPalette(parseInt(e.target.value, 10))}>
                <option value={0}>Rainbow</option>
                <option value={1}>Fire</option>
                <option value={2}>Ocean</option>
                <option value={3}>Gray</option>
              </select>
            </label>
            <label>
              Iter:
              <input
                type="number"
                value={iter}
                min={50}
                max={500}
                onChange={e => setIter(parseInt(e.target.value, 10))}
                style={{ width: 60 }}
              />
            </label>
            <button onClick={() => setAnimating(a => !a)}>{animating ? 'Stop' : 'Cycle'}</button>
            <button onClick={reset}>Reset</button>
            {type === 'julia' && (
              <>
                <label>
                  C real:
                  <input
                    type="number"
                    step={0.01}
                    value={juliaC.real}
                    onChange={e => setJuliaC({ ...juliaC, real: parseFloat(e.target.value) })}
                    style={{ width: 70 }}
                  />
                </label>
                <label>
                  C imag:
                  <input
                    type="number"
                    step={0.01}
                    value={juliaC.imag}
                    onChange={e => setJuliaC({ ...juliaC, imag: parseFloat(e.target.value) })}
                    style={{ width: 70 }}
                  />
                </label>
              </>
            )}
          </div>
        </ToggleMenu>
      </div>
      <div style={{ position: 'absolute', bottom: 10, right: 10 }}>
        <ToggleMenu title="About">
          <Readme markdown={readmeText} />
        </ToggleMenu>
      </div>
    </div>
  );
}
