import React, { useCallback, useEffect, useRef, useState } from 'react';

/** Interactive 2D fractal viewer inspired by the old Fractint program. */
export default function Fractals2D() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>();

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
  const [isDragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [animating, setAnimating] = useState(false);

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

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const width = canvas.width;
    const height = canvas.height;
    const img = ctx.createImageData(width, height);
    const pal = generatePalette(palette, offset);
    const xScale = (view.xMax - view.xMin) / width;
    const yScale = (view.yMax - view.yMin) / height;
    for (let py = 0; py < height; py++) {
      for (let px = 0; px < width; px++) {
        const x0 = view.xMin + px * xScale;
        const y0 = view.yMin + py * yScale;
        const v =
          type === 'mandelbrot'
            ? mandelbrot(x0, y0, iter)
            : julia(x0, y0, juliaC.real, juliaC.imag, iter);
        const idx = (py * width + px) * 4;
        const c = pal[v === 0 ? 0 : Math.floor((v * 10) % 255)];
        img.data[idx] = c.r;
        img.data[idx + 1] = c.g;
        img.data[idx + 2] = c.b;
        img.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }, [generatePalette, mandelbrot, julia, view, iter, palette, offset, type, juliaC]);

  const screenToFractal = useCallback((sx: number, sy: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const x = sx - rect.left;
    const y = sy - rect.top;
    return {
      x: view.xMin + (x / canvas.width) * (view.xMax - view.xMin),
      y: view.yMin + (y / canvas.height) * (view.yMax - view.yMin)
    };
  }, [view]);

  const zoom = useCallback((factor: number, cx?: number, cy?: number) => {
    const center = cx !== undefined && cy !== undefined ? screenToFractal(cx, cy) : {
      x: (view.xMin + view.xMax) / 2,
      y: (view.yMin + view.yMax) / 2
    };
    const xr = (view.xMax - view.xMin) * factor;
    const yr = (view.yMax - view.yMin) * factor;
    setView({
      xMin: center.x - xr / 2,
      xMax: center.x + xr / 2,
      yMin: center.y - yr / 2,
      yMax: center.y + yr / 2
    });
  }, [view, screenToFractal]);

  const pan = useCallback((dx: number, dy: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const xr = view.xMax - view.xMin;
    const yr = view.yMax - view.yMin;
    setView(v => ({
      xMin: v.xMin - (dx / canvas.width) * xr,
      xMax: v.xMax - (dx / canvas.width) * xr,
      yMin: v.yMin - (dy / canvas.height) * yr,
      yMax: v.yMax - (dy / canvas.height) * yr
    }));
  }, [view]);

  const handleDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    setDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    pan(e.clientX - dragStart.x, e.clientY - dragStart.y);
    setDragStart({ x: e.clientX, y: e.clientY });
  }, [isDragging, dragStart, pan]);

  const stopDrag = useCallback(() => setDragging(false), []);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    zoom(e.deltaY > 0 ? 1.1 : 0.9, e.clientX, e.clientY);
  }, [zoom]);

  const reset = useCallback(() => {
    setView({ xMin: -2.5, xMax: 1.5, yMin: -1.5, yMax: 1.5 });
    setIter(100);
  }, []);

  const animate = useCallback(() => {
    setOffset(o => (o + 1) % 256);
    animRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    render();
  }, [render]);

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
    <div style={{ padding: 8 }}>
      <div style={{ marginBottom: 8 }}>
        <label style={{ marginRight: 8 }}>
          Fractal:
          <select value={type} onChange={e => setType(e.target.value as any)} style={{ marginLeft: 4 }}>
            <option value="mandelbrot">Mandelbrot</option>
            <option value="julia">Julia</option>
          </select>
        </label>
        <label style={{ marginRight: 8 }}>
          Palette:
          <select value={palette} onChange={e => setPalette(parseInt(e.target.value, 10))} style={{ marginLeft: 4 }}>
            <option value={0}>Rainbow</option>
            <option value={1}>Fire</option>
            <option value={2}>Ocean</option>
            <option value={3}>Gray</option>
          </select>
        </label>
        <label style={{ marginRight: 8 }}>
          Iter:
          <input type="number" value={iter} min={50} max={500} onChange={e => setIter(parseInt(e.target.value, 10))} style={{ width: 60, marginLeft: 4 }} />
        </label>
        <button onClick={() => setAnimating(a => !a)} style={{ marginRight: 4 }}>
          {animating ? 'Stop' : 'Cycle'}
        </button>
        <button onClick={reset}>Reset</button>
      </div>
      {type === 'julia' && (
        <div style={{ marginBottom: 8 }}>
          <label style={{ marginRight: 8 }}>
            C real:
            <input type="number" step={0.01} value={juliaC.real} onChange={e => setJuliaC({ ...juliaC, real: parseFloat(e.target.value) })} style={{ width: 70, marginLeft: 4 }} />
          </label>
          <label>
            C imag:
            <input type="number" step={0.01} value={juliaC.imag} onChange={e => setJuliaC({ ...juliaC, imag: parseFloat(e.target.value) })} style={{ width: 70, marginLeft: 4 }} />
          </label>
        </div>
      )}
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        onMouseDown={handleDown}
        onMouseMove={handleMove}
        onMouseUp={stopDrag}
        onMouseLeave={stopDrag}
        onWheel={handleWheel}
        style={{ width: '100%', height: '100%', cursor: 'move', background: 'black' }}
      />
    </div>
  );
}
