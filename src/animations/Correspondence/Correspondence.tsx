import React, { useState, useRef, useEffect } from 'react';
import FractalPane, { Complex, ViewBounds } from './FractalPane';
import { useResponsive } from '../../styles/responsive';
import { ShellSettings, ShellActions, useAppHeader } from '../../components/AppShell';
import { Section, Slider, Select } from '../../components/ControlPanel';
import Readme from '../../components/Readme';
import PlaybackFloater from './PlaybackFloater';
import readmeText from './README.md?raw';

export default function Correspondence() {
  const { isMobile } = useResponsive();
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
  const [progress, setProgress] = useState(0); // 0..1 position along the c-path
  const [playing, setPlaying] = useState(false);
  const playingRef = useRef(false);

  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { playingRef.current = playing; }, [playing]);
  useEffect(() => { pausedRef.current = paused; }, [paused]);

  const handlePick = (nc: Complex) => {
    if (!selecting) return;
    setC(nc);
    setSelecting(false);
  };

  const handlePathChange = (pts: Complex[]) => {
    setPath(pts);
    progressRef.current = 0;
    setProgress(0);
  };

  const playPath = () => {
    if (path.length < 2) return;
    cancelAnimationFrame(animRef.current!);
    // Resume from the current scrubbed position if we're partway through,
    // otherwise start from the top.
    if (progressRef.current >= path.length - 1) progressRef.current = 0;
    setProgress(progressRef.current / (path.length - 1));
    setPaused(false);
    setPlaying(true);

    const step = () => {
      if (!playingRef.current) return;
      if (!pausedRef.current) {
        const idx = Math.min(Math.floor(progressRef.current), path.length - 2);
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
          progressRef.current = path.length - 1;
          setProgress(1);
          setPlaying(false);
          return;
        }
        setProgress(progressRef.current / (path.length - 1));
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

  // Jump to a normalized position (0..1) along the path. Used by the floater's
  // side scrubber; grabbing it while playing pauses so the user stays in control.
  const seek = (t01: number) => {
    if (path.length < 2) return;
    const maxPos = path.length - 1;
    const pos = Math.max(0, Math.min(maxPos, t01 * maxPos));
    progressRef.current = pos;
    setProgress(pos / maxPos);
    if (playingRef.current) setPaused(true);
    const idx = Math.min(Math.floor(pos), maxPos - 1);
    const t = pos - idx;
    const p0 = path[idx];
    const p1 = path[idx + 1];
    setC({
      real: p0.real * (1 - t) + p1.real * t,
      imag: p0.imag * (1 - t) + p1.imag * t,
    });
  };

  useAppHeader('Mandelbrot ↔ Julia', `c = ${c.real.toFixed(3)} ${c.imag >= 0 ? '+' : '-'} ${Math.abs(c.imag).toFixed(3)}i`);

  // The action controls live in two places at once: the drawer's Actions tab
  // and the on-screen PlaybackFloater. Defining them once keeps both in sync.
  // Speed lives here (an action) rather than in Settings.
  const playbackControls = (
    <>
      <ActionButton
        label={selecting ? 'Tap Mandelbrot to pick…' : 'Pick Julia c by tap'}
        active={selecting}
        onClick={() => setSelecting(true)}
      />
      <ActionButton
        label={drawingPath ? 'Finish drawing path' : 'Draw c-path'}
        active={drawingPath}
        onClick={() => setDrawingPath(p => !p)}
      />
      <ActionButton
        label="Clear path"
        disabled={path.length === 0}
        onClick={() => { stopPath(); setPath([]); progressRef.current = 0; setProgress(0); }}
      />
      <ActionButton
        label={playing ? 'Stop playback' : 'Play path'}
        primary
        disabled={path.length < 2}
        onClick={playing ? stopPath : playPath}
      />
      {playing && (
        <ActionButton
          label={paused ? 'Resume' : 'Pause'}
          onClick={() => setPaused(p => !p)}
        />
      )}
      <Slider label="Speed" value={speed}
        min={0.005} max={0.5} step={0.005}
        onChange={setSpeed} format={v => v.toFixed(3)} />
    </>
  );

  return (
    <>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        background: '#0c0c10',
      }}>
        <div style={{ flex: 1, position: 'relative', minHeight: 0, borderRight: isMobile ? 'none' : '1px solid #1e293b', borderBottom: isMobile ? '1px solid #1e293b' : 'none' }}>
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
          <div style={{ position: 'absolute', top: 6, left: '50%', transform: 'translateX(-50%)', color: '#fff', textShadow: '1px 1px 2px black', fontWeight: 700, fontSize: 14 }}>
            Mandelbrot
          </div>
        </div>
        <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
          <FractalPane
            type="julia"
            view={juliaView}
            onViewChange={setJuliaView}
            juliaC={c}
            iter={iter}
            palette={paletteJ}
            offset={offsetJ}
          />
          <div style={{ position: 'absolute', top: 6, left: '50%', transform: 'translateX(-50%)', color: '#fff', textShadow: '1px 1px 2px black', fontWeight: 700, fontSize: 14 }}>
            Julia
          </div>
        </div>
      </div>

      <PlaybackFloater
        title="Playback"
        progress={progress}
        onScrub={seek}
        scrubDisabled={path.length < 2}
      >
        {playbackControls}
      </PlaybackFloater>

      <ShellSettings>
        <Section title="Iterations" icon="↻" defaultOpen>
          <Slider label="Max iterations" value={iter}
            min={10} max={1000} step={10}
            onChange={(v) => setIter(Math.max(1, Math.round(v)))}
            format={v => String(v)} />
        </Section>

        <Section title="Mandelbrot palette" icon="◐" defaultOpen>
          <Select label="Palette"
            options={[
              { value: 0, label: 'Rainbow' },
              { value: 1, label: 'Fire' },
              { value: 2, label: 'Ocean' },
              { value: 3, label: 'Gray' },
            ]}
            value={paletteM} onChange={setPaletteM} />
          <Slider label="Offset" value={offsetM}
            min={0} max={255} step={1}
            onChange={(v) => setOffsetM(Math.round(v))} format={v => String(v)} />
        </Section>

        <Section title="Julia palette" icon="◑">
          <Select label="Palette"
            options={[
              { value: 0, label: 'Rainbow' },
              { value: 1, label: 'Fire' },
              { value: 2, label: 'Ocean' },
              { value: 3, label: 'Gray' },
            ]}
            value={paletteJ} onChange={setPaletteJ} />
          <Slider label="Offset" value={offsetJ}
            min={0} max={255} step={1}
            onChange={(v) => setOffsetJ(Math.round(v))} format={v => String(v)} />
        </Section>

        <Section title="Julia point" icon="·">
          <div style={{ display: 'flex', gap: 8 }}>
            <label className="cp-row" style={{ flex: 1 }}>
              <div className="cp-row-label"><span>c real</span></div>
              <input type="number" step="any" value={c.real}
                onChange={e => setC({ ...c, real: parseFloat(e.target.value) || 0 })} />
            </label>
            <label className="cp-row" style={{ flex: 1 }}>
              <div className="cp-row-label"><span>c imag</span></div>
              <input type="number" step="any" value={c.imag}
                onChange={e => setC({ ...c, imag: parseFloat(e.target.value) || 0 })} />
            </label>
          </div>
        </Section>

        <Section title="About" icon="ⓘ">
          <Readme markdown={readmeText} />
          <div style={{ fontSize: 11, color: 'var(--cp-fg-dim)', marginTop: 8 }}>
            Drag panes to pan · pinch / wheel to zoom · tap "Pick Julia" then tap the Mandelbrot to choose c.
          </div>
        </Section>
      </ShellSettings>

      <ShellActions>
        <div className="cp-section-body">
          {playbackControls}
        </div>
      </ShellActions>
    </>
  );
}

function ActionButton({ label, onClick, active, primary, disabled }: {
  label: string; onClick: () => void;
  active?: boolean; primary?: boolean; disabled?: boolean;
}) {
  const style: React.CSSProperties = {
    padding: '12px 16px', borderRadius: 6,
    border: active ? '1px solid var(--cp-accent)' : '1px solid var(--cp-border)',
    background: primary && !disabled ? '#10b981'
      : active ? 'rgba(255, 212, 0, 0.18)'
      : 'rgba(255,255,255,0.06)',
    color: primary && !disabled ? '#fff' : 'var(--cp-fg)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: 14, opacity: disabled ? 0.5 : 1, fontWeight: primary ? 700 : 500,
    textAlign: 'left',
  };
  return <button style={style} onClick={onClick} disabled={disabled}>{label}</button>;
}
