import React, { useState } from 'react';
import FractalPane, { Complex, ViewBounds } from './FractalPane';
import Readme from '../../components/Readme';
import ToggleMenu from '../../components/ToggleMenu';
import readmeText from './README.md?raw';

export default function Correspondence() {
  const baseView: ViewBounds = { xMin: -2.5, xMax: 1.5, yMin: -1.5, yMax: 1.5 };
  const [mandelView, setMandelView] = useState<ViewBounds>(baseView);
  const [juliaView, setJuliaView] = useState<ViewBounds>({ xMin: -2, xMax: 2, yMin: -2, yMax: 2 });
  const [c, setC] = useState<Complex>({ real: 0, imag: 0 });

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh' }}>
      <div style={{ flex: 1, position: 'relative' }}>
        <FractalPane type="mandelbrot" view={mandelView} onViewChange={setMandelView} juliaC={c} onPickC={setC} />
        <div style={{ position: 'absolute', top: 10, left: 10, color: 'white' }}>
          c = {c.real.toFixed(3)} + {c.imag.toFixed(3)}i
        </div>
      </div>
      <div style={{ flex: 1 }}>
        <FractalPane type="julia" view={juliaView} onViewChange={setJuliaView} juliaC={c} />
      </div>
      <div style={{ position: 'absolute', bottom: 10, right: 10 }}>
        <ToggleMenu title="About">
          <Readme markdown={readmeText} />
        </ToggleMenu>
      </div>
    </div>
  );
}
