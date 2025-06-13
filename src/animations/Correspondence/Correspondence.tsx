import React, { useState, useRef, useEffect } from 'react';
import FractalPane, { Complex, ViewBounds } from './FractalPane';

export default function Correspondence() {
  const baseView: ViewBounds = { xMin: -2.5, xMax: 1.5, yMin: -1.5, yMax: 1.5 };
  const [mandelView, setMandelView] = useState<ViewBounds>(baseView);
  const [juliaView, setJuliaView] = useState<ViewBounds>({ xMin: -2, xMax: 2, yMin: -2, yMax: 2 });
  const [c, setC] = useState<Complex>({ real: -0.7, imag: 0.27015 });
  const [selecting, setSelecting] = useState(false);
  const [iter, setIter] = useState(100);
  const [paletteM, setPaletteM] = useState(0);
  const [offsetM, setOffsetM] = useState(0);
  const [paletteJ, setPaletteJ] = useState(0);
  const [offsetJ, setOffsetJ] = useState(0);
  const [path, setPath] = useState<Complex[]>([]);
  const [drawingPath, setDrawingPath] = useState(false);
  const [speed, setSpeed] = useState(0.02);
  const speedRef = useRef(speed);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const animRef = useRef<number>();
  const progressRef = useRef(0);
  const [playing, setPlaying] = useState(false);
  const playingRef = useRef(false);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const zoom = (factor: number, setView: React.Dispatch<React.SetStateAction<ViewBounds>>) => {
    setView(v => {
      const cx = (v.xMin + v.xMax) / 2;
      const cy = (v.yMin + v.yMax) / 2;
      const xr = (v.xMax - v.xMin) * factor;
      const yr = (v.yMax - v.yMin) * factor;
      return { xMin: cx - xr / 2, xMax: cx + xr / 2, yMin: cy - yr / 2, yMax: cy + yr / 2 };
    });
  };

  const pan = (dx: number, dy: number, setView: React.Dispatch<React.SetStateAction<ViewBounds>>) => {
    setView(v => {
      const sx = (v.xMax - v.xMin) * 0.1 * dx;
      const sy = (v.yMax - v.yMin) * 0.1 * dy;
      return { xMin: v.xMin + sx, xMax: v.xMax + sx, yMin: v.yMin + sy, yMax: v.yMax + sy };
    });
  };

  const handlePick = (nc: Complex) => {
    if (!selecting) return;
    setC(nc);
    setSelecting(false);
  };

  const handlePathChange = (pts: Complex[]) => {
    setPath(pts);
  };

  const playPath = () => {
    if (path.length < 2) return;
    cancelAnimationFrame(animRef.current!);
    progressRef.current = 0;
    setPaused(false);
    setPlaying(true);

    const step = () => {
      if (!playingRef.current) return;
      if (!pausedRef.current) {
        const idx = Math.floor(progressRef.current);
        const t = progressRef.current - idx;
        const p0 = path[idx];
        const p1 = path[idx + 1];
        const nc = {
          real: p0.real * (1 - t) + p1.real * t,
          imag: p0.imag * (1 - t) + p1.imag * t,
        };
        setC(nc);
        progressRef.current += speedRef.current;
        if (progressRef.current >= path.length - 1) {
          setC(path[path.length - 1]);
          setPlaying(false);
          return;
        }
      }
      animRef.current = requestAnimationFrame(step);
    };
    animRef.current = requestAnimationFrame(step);
  };

  const stopPath = () => {
    setPlaying(false);
    setPaused(false);
    cancelAnimationFrame(animRef.current!);
  };


  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        width: '100vw',
        height: '100vh',
        boxSizing: 'border-box',
        padding: 20,
        position: 'relative'
      }}
    >
      <div style={{ position: 'absolute', top: 10, right: 10, color: 'white', zIndex: 1 }}>
        <label>
          Iter:
          <input type="number" value={iter} min={1} max={1000} onChange={e => setIter(parseInt(e.target.value, 10))} style={{ width: 60 }} />
        </label>
      </div>
      <div
        style={{
          flex: 1,
          position: 'relative',
          border: '1px solid white',
          boxSizing: 'border-box'
        }}
      >
        <FractalPane
          type="mandelbrot"
          view={mandelView}
          onViewChange={setMandelView}
          juliaC={c}
          iter={iter}
          palette={paletteM}
          offset={offsetM}
          markC={c}
          onPickC={handlePick}
          drawing={drawingPath}
          path={path}
          onPathChange={handlePathChange}
        />
        <div
          style={{ position: 'absolute', top: 4, left: '50%', transform: 'translateX(-50%)', color: 'white' }}
        >
          Mandelbrot
        </div>
        <div style={{ position: 'absolute', top: 10, left: 10, color: 'white' }}>
          <label>
            Palette:
            <select value={paletteM} onChange={e => setPaletteM(parseInt(e.target.value, 10))}>
              <option value={0}>Rainbow</option>
              <option value={1}>Fire</option>
              <option value={2}>Ocean</option>
              <option value={3}>Gray</option>
            </select>
          </label>
          <input type="range" min={0} max={255} value={offsetM} onChange={e => setOffsetM(parseInt(e.target.value, 10))} />
        </div>
        <div
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            gap: 4
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <button onClick={() => pan(0, -1, setMandelView)}>Up</button>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => pan(-1, 0, setMandelView)}>Left</button>
              <button onClick={() => pan(1, 0, setMandelView)}>Right</button>
            </div>
            <button onClick={() => pan(0, 1, setMandelView)}>Down</button>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => zoom(0.9, setMandelView)}>Zoom In</button>
            <button onClick={() => zoom(1.1, setMandelView)}>Zoom Out</button>
          </div>
          <button onClick={() => setSelecting(true)}>Select Julia point</button>
          <button onClick={() => setDrawingPath(p => !p)}>
            {drawingPath ? 'Finish Path' : 'Draw Path'}
          </button>
          <button onClick={() => setPath([])}>Clear Path</button>
          <button onClick={playing ? stopPath : playPath} disabled={path.length < 2}>
            {playing ? 'Stop' : 'Play'}
          </button>
          {playing && (
            <button onClick={() => setPaused(p => !p)}>
              {paused ? 'Resume' : 'Pause'}
            </button>
          )}
          <label>
            Speed:
            <input
              type="range"
              min={0.005}
              max={0.5}
              step={0.005}
              value={speed}
              onChange={e => setSpeed(parseFloat(e.target.value))}
            />
          </label>
        </div>
      </div>
      <div
        style={{
          flex: 1,
          position: 'relative',
          border: '1px solid white',
          boxSizing: 'border-box'
        }}
      >
        <FractalPane
          type="julia"
          view={juliaView}
          onViewChange={setJuliaView}
          juliaC={c}
          iter={iter}
          palette={paletteJ}
          offset={offsetJ}
        />
        <div
          style={{ position: 'absolute', top: 4, left: '50%', transform: 'translateX(-50%)', color: 'white' }}
        >
          {`Julia (c = ${c.real.toFixed(3)} ${c.imag >= 0 ? '+' : '-'} ${Math.abs(c.imag).toFixed(3)}i)`}
        </div>
        <div style={{ position: 'absolute', top: 10, left: 10, color: 'white' }}>
          <label>
            Palette:
            <select value={paletteJ} onChange={e => setPaletteJ(parseInt(e.target.value, 10))}>
              <option value={0}>Rainbow</option>
              <option value={1}>Fire</option>
              <option value={2}>Ocean</option>
              <option value={3}>Gray</option>
            </select>
          </label>
          <input type="range" min={0} max={255} value={offsetJ} onChange={e => setOffsetJ(parseInt(e.target.value, 10))} />
        </div>
        <div
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            gap: 4
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <button onClick={() => pan(0, -1, setJuliaView)}>Up</button>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => pan(-1, 0, setJuliaView)}>Left</button>
              <button onClick={() => pan(1, 0, setJuliaView)}>Right</button>
            </div>
            <button onClick={() => pan(0, 1, setJuliaView)}>Down</button>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => zoom(0.9, setJuliaView)}>Zoom In</button>
            <button onClick={() => zoom(1.1, setJuliaView)}>Zoom Out</button>
          </div>
        </div>
      </div>
    </div>
  );
}
