import { useState, useRef, useEffect } from 'react';
import FractalPane, { Complex, ViewBounds } from './FractalPane';
import Workspace from '../../chrome/workspace/Workspace';
import type { ActionDef, LayoutDef, SectionDef, ViewDef } from '../../chrome/workspace/types';
import { Slider, Select, NumberInput } from '../../components/ControlPanel';
import { Kicker } from '../../chrome/readouts';
import readmeText from './README.md?raw';
import explainerText from './EXPLAINER.md?raw';
import { PALETTE_OPTIONS, PALETTE_THEME, resolvePalette } from '../../lib/colormaps';
import { useThemeId } from '../../chrome/skins';

export default function Correspondence() {
  const baseView: ViewBounds = { xMin: -2.5, xMax: 1.5, yMin: -1.5, yMax: 1.5 };
  const [mandelView, setMandelView] = useState<ViewBounds>(baseView);
  const [juliaView, setJuliaView] = useState<ViewBounds>({ xMin: -2, xMax: 2, yMin: -2, yMax: 2 });
  const [c, setC] = useState<Complex>({ real: -0.7, imag: 0.27015 });
  const [iter, setIter] = useState(100);
  const themeId = useThemeId();
  const [paletteM, setPaletteM] = useState(PALETTE_THEME);
  const [offsetM, setOffsetM] = useState(0);
  const [paletteJ, setPaletteJ] = useState(PALETTE_THEME);
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

  // Tap-to-pick is always armed (CHROME-REVIEW PR D, user decision a): tap is
  // already gesture-disambiguated from drag/pinch in useViewportGestures, so
  // the old Seed-panel arm button was a gate in front of the app's primary
  // gesture — the obvious move (tap the Mandelbrot) now just works.
  const handlePick = (nc: Complex) => setC(nc);

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

  // Jump to a normalized position (0..1) along the path. Used by the Path
  // panel's Progress scrubber; grabbing it while playing pauses so the user
  // stays in control.
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

  /* ---- archetype panels (PARAM-MAP §4) ---- */

  const palettesNode = (
    <>
      <Kicker>Mandelbrot</Kicker>
      <Select label="Palette"
        options={PALETTE_OPTIONS}
        value={paletteM} onChange={setPaletteM} />
      <Slider label="Offset" value={offsetM}
        min={0} max={255} step={1}
        onChange={(v) => setOffsetM(Math.round(v))} format={v => String(v)} />
      <Kicker>Julia</Kicker>
      <Select label="Palette"
        options={PALETTE_OPTIONS}
        value={paletteJ} onChange={setPaletteJ} />
      <Slider label="Offset" value={offsetJ}
        min={0} max={255} step={1}
        onChange={(v) => setOffsetJ(Math.round(v))} format={v => String(v)} />
    </>
  );

  const seedNode = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <NumberInput label="c real" value={c.real} step={0.001}
            onChange={v => setC(prev => ({ ...prev, real: v }))} />
        </div>
        <div style={{ flex: 1 }}>
          <NumberInput label="c imag" value={c.imag} step={0.001}
            onChange={v => setC(prev => ({ ...prev, imag: v }))} />
        </div>
      </div>
      <div className="am-hint">
        Tap the Mandelbrot to choose c — drag pans, pinch / wheel zooms.
      </div>
    </div>
  );

  // Transport (Draw c-path · Play/Pause · Clear path) lives once, in the
  // always-on action strip (`actions` below) — never duplicated here. This
  // panel keeps only the *parameters*: the playback Speed and the Progress
  // scrubber (which pauses a running playback via seek() so the user stays in
  // control).
  const pathNode = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <Slider label="Speed" value={speed}
        min={0.005} max={0.5} step={0.005}
        onChange={setSpeed} format={v => v.toFixed(3)} />
      <div style={path.length < 2 ? { opacity: 0.45, pointerEvents: 'none' } : undefined}>
        <Slider label="Progress" value={progress}
          min={0} max={1} step={0.001}
          onChange={seek} format={v => `${Math.round(v * 100)}%`} />
      </div>
    </div>
  );

  const iterationNode = (
    <Slider label="Max iterations" value={iter}
      min={10} max={1000} step={10}
      onChange={(v) => setIter(Math.max(1, Math.round(v)))}
      format={v => String(v)} />
  );

  const sections: SectionDef[] = [
    { id: 'palettes', title: 'Palettes', arch: 'color', node: palettesNode, estHeight: 330 },
    { id: 'seed', title: 'Seed', arch: 'drive', node: seedNode, estHeight: 230 },
    { id: 'path', title: 'Path', arch: 'playback', node: pathNode, estHeight: 360 },
    { id: 'iteration', title: 'Iteration', arch: 'quality', node: iterationNode, estHeight: 110 },
  ];

  const views: ViewDef[] = [
    {
      id: 'mandel',
      title: 'Mandelbrot — pick c',
      defaultRect: { x: 360, y: 16, w: 356, h: 356 },
      hint: 'tap to choose c — the Julia set follows',
      node: (
        <div style={{ position: 'absolute', inset: 0 }}>
          <FractalPane
            type="mandelbrot"
            view={mandelView}
            onViewChange={setMandelView}
            juliaC={c}
            iter={iter}
            palette={resolvePalette(paletteM, themeId)}
            offset={offsetM}
            markC={c}
            onPickC={handlePick}
            drawing={drawingPath}
            path={path}
            onPathChange={handlePathChange}
          />
        </div>
      ),
    },
    {
      id: 'julia',
      title: 'Julia(c)',
      defaultRect: { x: 728, y: 16, w: 356, h: 356 },
      node: (
        <div style={{ position: 'absolute', inset: 0 }}>
          <FractalPane
            type="julia"
            view={juliaView}
            onViewChange={setJuliaView}
            juliaC={c}
            iter={iter}
            palette={resolvePalette(paletteJ, themeId)}
            offset={offsetJ}
          />
        </div>
      ),
    },
  ];

  const layouts: LayoutDef[] = [
    {
      id: 'explore', name: 'Explore', sub: 'Seed · two views', icon: 'tune',
      open: { seed: { x: 84, y: 18 } },
    },
    {
      id: 'animate', name: 'Animate', sub: 'Path playback', icon: 'play',
      open: { path: { x: 84, y: 18 } },
    },
  ];

  // The "?" modal carries both the short explainer and the full About readme,
  // so nothing from the old drawer's About section is lost.
  const help = [explainerText, readmeText].filter(Boolean).join('\n\n---\n\n');

  /* Always-on action strip — the primary path transport, projected from the
     Path (playback) panel. Play/Pause is one toggle that also serves as Resume
     when a scrubbed playback is paused; Clear fully resets the path. The rich
     params (Speed, Progress) stay in the panel. */
  const advancing = playing && !paused;          // the orbit is actively stepping
  const actions: ActionDef[] = [
    {
      id: 'draw',
      icon: 'pin',
      label: 'Draw path',
      active: drawingPath,
      sectionId: 'path',
      onClick: () => setDrawingPath(p => !p),
    },
    {
      id: 'play',
      icon: advancing ? 'pause' : 'play',
      label: advancing ? 'Pause' : 'Play',
      primary: true,
      active: advancing,
      sectionId: 'path',
      disabled: path.length < 2,
      onClick: () => { if (!playingRef.current) playPath(); else setPaused(p => !p); },
    },
    {
      id: 'clear',
      icon: 'reset',
      label: 'Clear path',
      sectionId: 'path',
      disabled: path.length === 0,
      onClick: () => { stopPath(); setPath([]); progressRef.current = 0; setProgress(0); },
    },
  ];

  return (
    <Workspace
      appId="correspondence"
      title="Mandelbrot ↔ Julia"
      subtitle={`c = ${c.real.toFixed(3)} ${c.imag >= 0 ? '+' : '-'} ${Math.abs(c.imag).toFixed(3)}i`}
      sections={sections}
      views={views}
      layouts={layouts}
      defaultLayoutId="explore"
      explainer={help || null}
      actions={actions}
    />
  );
}
