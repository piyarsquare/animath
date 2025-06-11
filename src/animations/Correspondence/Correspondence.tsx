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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh' }}>
      <div style={{ position: 'absolute', top: 10, right: 10, color: 'white', zIndex: 1 }}>
        <label>
          Iter:
          <input type="number" value={iter} min={1} max={1000} onChange={e => setIter(parseInt(e.target.value, 10))} style={{ width: 60 }} />
        </label>
      </div>
      <div style={{ flex: 1, position: 'relative' }}>
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
      </div>
      <div style={{ flex: 1, position: 'relative' }}>
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
      </div>
    </div>
  );
}
