import React, { useState, useRef, useEffect } from 'react';
import FractalPane, { Complex, ViewBounds } from './FractalPane';
import { useResponsive, getResponsiveLayoutStyle, getResponsiveControlsStyle, getResponsiveButtonStyle, getResponsiveInputStyle } from '../../styles/responsive';

export default function Correspondence() {
  const { isMobile, isTablet, screenSize } = useResponsive();
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
    <div style={{...getResponsiveLayoutStyle('split', isMobile)}}>
      
      {/* Global Controls - Mobile Friendly */}
      <div 
        style={{ 
          ...getResponsiveControlsStyle(isMobile),
          position: 'absolute', 
          top: '10px', 
          right: '10px', 
          zIndex: 20,
          fontSize: isMobile ? '12px' : '14px'
        }}
      >
        <label>
          Iterations:
          <input 
            type="number" 
            value={iter} 
            min={1} 
            max={1000} 
            onChange={e => setIter(parseInt(e.target.value, 10))} 
            style={{ ...getResponsiveInputStyle(isMobile), width: isMobile ? '50px' : '60px' }} 
          />
        </label>
      </div>

      {/* Mandelbrot Pane */}
      <div
        style={{
          flex: 1,
          position: 'relative',
          border: '1px solid white',
          boxSizing: 'border-box',
          minHeight: isMobile ? '40vh' : '50vh',
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
          style={{ 
            position: 'absolute', 
            top: '4px', 
            left: '50%', 
            transform: 'translateX(-50%)', 
            color: 'white',
            fontSize: isMobile ? '14px' : '16px',
            fontWeight: 'bold',
            textShadow: '1px 1px 2px black'
          }}
        >
          Mandelbrot
        </div>
        
        {/* Mandelbrot Controls */}
        <div 
          style={{
            ...getResponsiveControlsStyle(isMobile),
            position: 'absolute',
            top: '10px',
            left: '10px',
            fontSize: isMobile ? '12px' : '14px'
          }}
        >
          <label>
            Palette:
            <select 
              value={paletteM} 
              onChange={e => setPaletteM(parseInt(e.target.value, 10))}
              style={{ ...getResponsiveInputStyle(isMobile), marginLeft: '4px' }}
            >
              <option value={0}>Rainbow</option>
              <option value={1}>Fire</option>
              <option value={2}>Ocean</option>
              <option value={3}>Gray</option>
            </select>
          </label>
          <input 
            type="range" 
            min={0} 
            max={255} 
            value={offsetM} 
            onChange={e => setOffsetM(parseInt(e.target.value, 10))}
            style={{ width: '100%', marginTop: '4px' }}
          />
        </div>
        
        {/* Navigation and Action Controls */}
        <div
          style={{
            ...getResponsiveControlsStyle(isMobile),
            position: 'absolute',
            top: '10px',
            right: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: isMobile ? 4 : 6,
            fontSize: isMobile ? '11px' : '12px'
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: isMobile ? 2 : 4 }}>
            <button 
              onClick={() => pan(0, -1, setMandelView)}
              style={{ ...getResponsiveButtonStyle(isMobile), fontSize: isMobile ? '10px' : '12px' }}
            >
              Up
            </button>
            <div style={{ display: 'flex', gap: isMobile ? 2 : 4 }}>
              <button 
                onClick={() => pan(-1, 0, setMandelView)}
                style={{ ...getResponsiveButtonStyle(isMobile), fontSize: isMobile ? '10px' : '12px' }}
              >
                Left
              </button>
              <button 
                onClick={() => pan(1, 0, setMandelView)}
                style={{ ...getResponsiveButtonStyle(isMobile), fontSize: isMobile ? '10px' : '12px' }}
              >
                Right
              </button>
            </div>
            <button 
              onClick={() => pan(0, 1, setMandelView)}
              style={{ ...getResponsiveButtonStyle(isMobile), fontSize: isMobile ? '10px' : '12px' }}
            >
              Down
            </button>
          </div>
          
          <div style={{ display: 'flex', gap: isMobile ? 2 : 4 }}>
            <button 
              onClick={() => zoom(0.9, setMandelView)}
              style={{ ...getResponsiveButtonStyle(isMobile), fontSize: isMobile ? '10px' : '12px' }}
            >
              Zoom In
            </button>
            <button 
              onClick={() => zoom(1.1, setMandelView)}
              style={{ ...getResponsiveButtonStyle(isMobile), fontSize: isMobile ? '10px' : '12px' }}
            >
              Zoom Out
            </button>
          </div>
          
          <button 
            onClick={() => setSelecting(true)}
            style={{ ...getResponsiveButtonStyle(isMobile), backgroundColor: selecting ? '#ffd400' : undefined }}
          >
            {isMobile ? 'Pick Julia' : 'Select Julia point'}
          </button>
          
          <button 
            onClick={() => setDrawingPath(p => !p)}
            style={{ ...getResponsiveButtonStyle(isMobile), backgroundColor: drawingPath ? '#ffd400' : undefined }}
          >
            {drawingPath ? 'Finish Path' : (isMobile ? 'Draw Path' : 'Draw Path')}
          </button>
          
          <button 
            onClick={() => setPath([])}
            style={getResponsiveButtonStyle(isMobile)}
          >
            Clear Path
          </button>
          
          <button 
            onClick={playing ? stopPath : playPath} 
            disabled={path.length < 2}
            style={{ 
              ...getResponsiveButtonStyle(isMobile),
              backgroundColor: playing ? '#ff4444' : '#44ff44',
              opacity: path.length < 2 ? 0.5 : 1
            }}
          >
            {playing ? 'Stop' : 'Play'}
          </button>
          
          {playing && (
            <button 
              onClick={() => setPaused(p => !p)}
              style={{ ...getResponsiveButtonStyle(isMobile), backgroundColor: paused ? '#ffaa44' : '#44aaff' }}
            >
              {paused ? 'Resume' : 'Pause'}
            </button>
          )}
          
          <label style={{ fontSize: isMobile ? '10px' : '12px' }}>
            Speed:
            <input
              type="range"
              min={0.005}
              max={0.5}
              step={0.005}
              value={speed}
              onChange={e => setSpeed(parseFloat(e.target.value))}
              style={{ width: '100%' }}
            />
          </label>
        </div>
      </div>

      {/* Julia Set Pane */}
      <div
        style={{
          flex: 1,
          position: 'relative',
          border: '1px solid white',
          boxSizing: 'border-box',
          minHeight: isMobile ? '40vh' : '50vh',
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
          style={{ 
            position: 'absolute', 
            top: '4px', 
            left: '50%', 
            transform: 'translateX(-50%)', 
            color: 'white',
            fontSize: isMobile ? '12px' : '14px',
            fontWeight: 'bold',
            textShadow: '1px 1px 2px black',
            textAlign: 'center',
            maxWidth: '90%'
          }}
        >
          {isMobile 
            ? `Julia (${c.real.toFixed(2)} ${c.imag >= 0 ? '+' : '-'} ${Math.abs(c.imag).toFixed(2)}i)`
            : `Julia (c = ${c.real.toFixed(3)} ${c.imag >= 0 ? '+' : '-'} ${Math.abs(c.imag).toFixed(3)}i)`
          }
        </div>
        
        {/* Julia Controls */}
        <div 
          style={{
            ...getResponsiveControlsStyle(isMobile),
            position: 'absolute',
            top: '10px',
            left: '10px',
            fontSize: isMobile ? '12px' : '14px'
          }}
        >
          <label>
            Palette:
            <select 
              value={paletteJ} 
              onChange={e => setPaletteJ(parseInt(e.target.value, 10))}
              style={{ ...getResponsiveInputStyle(isMobile), marginLeft: '4px' }}
            >
              <option value={0}>Rainbow</option>
              <option value={1}>Fire</option>
              <option value={2}>Ocean</option>
              <option value={3}>Gray</option>
            </select>
          </label>
          <input 
            type="range" 
            min={0} 
            max={255} 
            value={offsetJ} 
            onChange={e => setOffsetJ(parseInt(e.target.value, 10))}
            style={{ width: '100%', marginTop: '4px' }}
          />
        </div>
        
        {/* Julia Navigation */}
        <div
          style={{
            ...getResponsiveControlsStyle(isMobile),
            position: 'absolute',
            top: '10px',
            right: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: isMobile ? 4 : 6
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: isMobile ? 2 : 4 }}>
            <button 
              onClick={() => pan(0, -1, setJuliaView)}
              style={{ ...getResponsiveButtonStyle(isMobile), fontSize: isMobile ? '10px' : '12px' }}
            >
              Up
            </button>
            <div style={{ display: 'flex', gap: isMobile ? 2 : 4 }}>
              <button 
                onClick={() => pan(-1, 0, setJuliaView)}
                style={{ ...getResponsiveButtonStyle(isMobile), fontSize: isMobile ? '10px' : '12px' }}
              >
                Left
              </button>
              <button 
                onClick={() => pan(1, 0, setJuliaView)}
                style={{ ...getResponsiveButtonStyle(isMobile), fontSize: isMobile ? '10px' : '12px' }}
              >
                Right
              </button>
            </div>
            <button 
              onClick={() => pan(0, 1, setJuliaView)}
              style={{ ...getResponsiveButtonStyle(isMobile), fontSize: isMobile ? '10px' : '12px' }}
            >
              Down
            </button>
          </div>
          
          <div style={{ display: 'flex', gap: isMobile ? 2 : 4 }}>
            <button 
              onClick={() => zoom(0.9, setJuliaView)}
              style={{ ...getResponsiveButtonStyle(isMobile), fontSize: isMobile ? '10px' : '12px' }}
            >
              Zoom In
            </button>
            <button 
              onClick={() => zoom(1.1, setJuliaView)}
              style={{ ...getResponsiveButtonStyle(isMobile), fontSize: isMobile ? '10px' : '12px' }}
            >
              Zoom Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
