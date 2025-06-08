import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import ToggleMenu from '../../components/ToggleMenu';

/** Interactive 2D fractal viewer inspired by the old Fractint program. */
export default function Fractals2D() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>();
  const pixelRef = useRef<Uint8ClampedArray>();
  const imageRef = useRef<ImageData>();
  const dirtyRef = useRef(true);

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


  const FORMULAS: Record<'mandelbrot' | 'julia', string> = {
    mandelbrot: 'z_{n+1} = z_n^2 + c',
    julia: 'z_{n+1} = z_n^2 + c'
  };

  const generatePalette = useCallback((scheme: number, off: number) => {
    const out = new Uint8ClampedArray(256 * 3);
    for (let i = 0; i < 256; i++) {
      const t = (i + off) & 255;
      let r = 0,
        g = 0,
        b = 0;
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
      const idx = i * 3;
      out[idx] = r as number;
      out[idx + 1] = g as number;
      out[idx + 2] = b as number;
    }
    return out;
  }, []);

  const paletteData = useMemo(
    () => generatePalette(palette, offset),
    [generatePalette, palette, offset]
  );


  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !pixelRef.current || !imageRef.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const data = pixelRef.current;
    const pal = paletteData;

    const xScale = (view.xMax - view.xMin) / width;
    const yScale = (view.yMax - view.yMin) / height;

    const maxIter = iter;
    const log2 = Math.log(2);
    const invLog2 = 1 / log2;

    const useMandelbrot = type === 'mandelbrot';
    const cRe = juliaC.real;
    const cIm = juliaC.imag;

    let idx = 0;
    for (let py = 0; py < height; py++) {
      const y0 = view.yMin + py * yScale;
      for (let px = 0; px < width; px++) {
        const x0 = view.xMin + px * xScale;

        let x = useMandelbrot ? 0 : x0;
        let y = useMandelbrot ? 0 : y0;
        const cx = useMandelbrot ? x0 : cRe;
        const cy = useMandelbrot ? y0 : cIm;

        let iterCount = 0;
        let x2 = x * x;
        let y2 = y * y;
        while (x2 + y2 <= 4 && iterCount < maxIter) {
          y = 2 * x * y + cy;
          x = x2 - y2 + cx;
          x2 = x * x;
          y2 = y * y;
          iterCount++;
        }

        let colorIdx = 0;
        if (iterCount !== maxIter) {
          const logZn = Math.log(x2 + y2) / 2;
          const smooth = iterCount + 1 - Math.log(logZn) * invLog2;
          colorIdx = Math.floor((smooth * 10) % 255);
        }

        const p = colorIdx * 3;
        data[idx] = pal[p];
        data[idx + 1] = pal[p + 1];
        data[idx + 2] = pal[p + 2];
        data[idx + 3] = 255;
        idx += 4;
      }
    }

    if (dirtyRef.current) {
      ctx.putImageData(imageRef.current, 0, 0);
      dirtyRef.current = false;
    }
  }, [paletteData, view, iter, type, juliaC]);

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


  const reset = useCallback(() => {
    setView({ xMin: -2.5, xMax: 1.5, yMin: -1.5, yMax: 1.5 });
    setIter(100);
  }, []);

  const animate = useCallback(() => {
    setOffset(o => (o + 1) % 256);
    dirtyRef.current = true;
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
    pixelRef.current = new Uint8ClampedArray(canvas.width * canvas.height * 4);
    imageRef.current = new ImageData(pixelRef.current, canvas.width, canvas.height);
    dirtyRef.current = true;
    render();
  }, [render]);

  useEffect(() => {
    dirtyRef.current = true;
    render();
  }, [render]);

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
    </div>
  );
}
