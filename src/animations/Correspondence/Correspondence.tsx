import React, { useState } from 'react';
import FractalPane, { Complex, ViewBounds } from './FractalPane';

export default function Correspondence() {
  const baseView: ViewBounds = { xMin: -2.5, xMax: 1.5, yMin: -1.5, yMax: 1.5 };
  const [mandelView, setMandelView] = useState<ViewBounds>(baseView);
  const [juliaView, setJuliaView] = useState<ViewBounds>({ xMin: -2, xMax: 2, yMin: -2, yMax: 2 });
  const [c] = useState<Complex>({ real: -0.7, imag: 0.27015 });
  const [iter, setIter] = useState(100);
  const [paletteM, setPaletteM] = useState(0);
  const [offsetM, setOffsetM] = useState(0);
  const [paletteJ, setPaletteJ] = useState(0);
  const [offsetJ, setOffsetJ] = useState(0);

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
        <FractalPane type="mandelbrot" view={mandelView} onViewChange={setMandelView} juliaC={c} iter={iter} palette={paletteM} offset={offsetM} />
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
        <FractalPane type="julia" view={juliaView} onViewChange={setJuliaView} juliaC={c} iter={iter} palette={paletteJ} offset={offsetJ} />
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
