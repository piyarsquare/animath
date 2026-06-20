import React, { useEffect, useState } from 'react';
import Workspace from '../../chrome/workspace/Workspace';
import type { ActionDef, LayoutDef, SectionDef, ViewDef, WorkspaceMode } from '../../chrome/workspace/types';
import { Slider, Checkbox, ComplexInput } from '../../components/ControlPanel';
import { usePersistentState, clearPersistedState } from '../../lib/usePersistentState';
import explainerText from './EXPLAINER.md?raw';
import ArgandPlane, { type Mode } from './ArgandPlane';
import { type Cx, cx, add, mul, formatRect, formatPolar } from './complexOps';

const STORAGE_KEY = 'argand';

const A_COL = '#38bdf8';
const B_COL = '#fb923c';
const R_COL = '#34d399';

/**
 * Argand — an entry-point app for complex numbers: drag two numbers on the
 * plane and watch how they add (tip-to-tail) and multiply (angles add, lengths
 * multiply). A scrub slider traces the honest path between the inputs and the
 * result; multiplication spirals, addition slides. The successor to Plane
 * Transform; this first chapter is the arithmetic foundation.
 */
export default function Argand() {
  const [a, setA] = usePersistentState<Cx>(`${STORAGE_KEY}:a`, cx(1.6, 0.6));
  const [b, setB] = usePersistentState<Cx>(`${STORAGE_KEY}:b`, cx(0, 1));
  const [mode, setMode] = usePersistentState<Mode>(`${STORAGE_KEY}:mode`, 'multiply');
  const [showSecondRoute, setShowSecondRoute] = usePersistentState(`${STORAGE_KEY}:second`, false);
  const [snapping, setSnapping] = usePersistentState(`${STORAGE_KEY}:snap`, true);
  const [showGrid, setShowGrid] = usePersistentState(`${STORAGE_KEY}:grid`, true);
  const [showUnitCircle, setShowUnitCircle] = usePersistentState(`${STORAGE_KEY}:unit`, true);
  const [extent, setExtent] = usePersistentState(`${STORAGE_KEY}:extent`, 4);
  const [speed, setSpeed] = usePersistentState(`${STORAGE_KEY}:speed`, 0.4);

  // Transient view state — never persisted.
  const [t, setT] = useState(1);
  const [playing, setPlaying] = useState(false);

  // Scrub clock: advance t while playing, looping 0→1. The SVG view is light
  // enough that a per-frame setState is fine here.
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setT(prev => {
        const nx = prev + dt * speed;
        return nx > 1 ? nx - 1 : nx;
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed]);

  const result = mode === 'multiply' ? mul(a, b) : add(a, b);
  const resultLabel = mode === 'multiply' ? 'a·b' : 'a+b';
  const subtitle = `${resultLabel} = ${formatRect(result)}`;

  /* ---- panels ---- */

  const numbersNode = (
    <>
      <ComplexInput label="a" value={[a.re, a.im]} onChange={([re, im]) => setA(cx(re, im))} />
      <ComplexInput label="b" value={[b.re, b.im]} onChange={([re, im]) => setB(cx(re, im))} />
      <div style={{ fontSize: 11, color: 'var(--cp-fg-dim, #9b9ba3)', marginTop: 4 }}>
        Or just drag the <b style={{ color: A_COL }}>a</b> and <b style={{ color: B_COL }}>b</b> handles on the plane.
      </div>
    </>
  );

  const scrubNode = (
    <>
      <Slider label="Scrub  (t: a → result)" value={t} min={0} max={1} step={0.001}
        onChange={v => { setPlaying(false); setT(v); }} format={v => v.toFixed(2)} />
      <button style={btn} onClick={() => setPlaying(p => !p)} aria-pressed={playing}>
        {playing ? '❚❚ Pause' : '▶ Play'}
      </button>
      <Slider label="Speed" value={speed} min={0.1} max={1.5} step={0.05}
        onChange={setSpeed} format={v => `${v.toFixed(2)}/s`} />
      <div style={{ fontSize: 11, color: 'var(--cp-fg-dim, #9b9ba3)', marginTop: 6 }}>
        {mode === 'multiply'
          ? 'Multiplication spirals: the angle of a swings by arg b while its length scales by |b|.'
          : 'Addition slides: a moves tip-to-tail along b.'}
      </div>
    </>
  );

  const combineNode = (
    <>
      <Checkbox
        label={mode === 'multiply' ? 'Show both orders (a·b = b·a)' : 'Show both orders (parallelogram)'}
        checked={showSecondRoute}
        onChange={setShowSecondRoute}
      />
      <Checkbox label="Snap to nice values (1, i, lattice, π/6…)" checked={snapping} onChange={setSnapping} />
    </>
  );

  const planeNode = (
    <>
      <Slider label="Extent (±)" value={extent} min={2} max={10} step={0.5}
        onChange={setExtent} format={v => v.toFixed(1)} />
      <Checkbox label="Grid" checked={showGrid} onChange={setShowGrid} />
      <Checkbox label="Unit circle" checked={showUnitCircle} onChange={setShowUnitCircle} />
    </>
  );

  const valuesNode = (
    <div style={{ display: 'grid', gap: 8 }}>
      {([['a', a, A_COL], ['b', b, B_COL], [resultLabel, result, R_COL]] as const).map(([lab, z, col]) => (
        <div key={lab} style={{ display: 'grid', gap: 1 }}>
          <div style={{ fontWeight: 700, color: col, fontFamily: 'var(--font-mono, monospace)' }}>
            {lab} = {formatRect(z)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--cp-fg-dim, #9b9ba3)', fontFamily: 'var(--font-mono, monospace)' }}>
            {formatPolar(z)}
          </div>
        </div>
      ))}
    </div>
  );

  const detailNode = (
    <button
      style={{ ...btn, fontWeight: 600 }}
      onClick={() => { clearPersistedState(STORAGE_KEY); window.location.reload(); }}
      title="Forget saved settings and restore the defaults"
    >
      Reset settings to defaults
    </button>
  );

  const sections: SectionDef[] = [
    { id: 'numbers', title: 'Numbers', arch: 'subject', node: numbersNode, estHeight: 180 },
    { id: 'plane', title: 'Plane', arch: 'domain', node: planeNode, estHeight: 170 },
    { id: 'combine', title: 'Combine', arch: 'drive', node: combineNode, estHeight: 140 },
    { id: 'scrub', title: 'Scrub', arch: 'playback', node: scrubNode, estHeight: 230 },
    { id: 'values', title: 'Values', arch: 'readout', node: valuesNode, estHeight: 200 },
    { id: 'detail', title: 'Detail', arch: 'quality', node: detailNode, estHeight: 90 },
  ];

  const views: ViewDef[] = [
    {
      id: 'plane',
      title: 'Argand plane',
      defaultRect: { x: 320, y: 16, w: 660, h: 600 },
      hint: 'drag a and b · scrub t to watch the path',
      node: (
        <ArgandPlane
          a={a} b={b} mode={mode} t={t}
          showSecondRoute={showSecondRoute}
          snapping={snapping}
          showGrid={showGrid}
          showUnitCircle={showUnitCircle}
          extent={extent}
          onChange={(which, z) => (which === 'a' ? setA(z) : setB(z))}
        />
      ),
    },
  ];

  const layouts: LayoutDef[] = [
    {
      id: 'essentials', name: 'Essentials', sub: 'Numbers · Scrub · Values', icon: 'tune',
      open: { numbers: { x: 24, y: 18 }, scrub: { x: 24, y: 220 }, values: { x: 24, y: 470 } },
    },
  ];

  const modes: WorkspaceMode[] = [
    { id: 'multiply', label: 'Multiply' },
    { id: 'add', label: 'Add' },
  ];

  const actions: ActionDef[] = [
    {
      id: 'play', icon: playing ? 'pause' : 'play', label: playing ? 'Pause' : 'Play',
      onClick: () => setPlaying(p => !p), active: playing, primary: true, sectionId: 'scrub',
    },
    {
      id: 'reset', icon: 'reset', label: 'To start',
      onClick: () => { setPlaying(false); setT(0); }, sectionId: 'scrub',
    },
  ];

  return (
    <Workspace
      appId="argand"
      title="Argand Plane"
      subtitle={subtitle}
      sections={sections}
      views={views}
      layouts={layouts}
      defaultLayoutId="essentials"
      explainer={explainerText || null}
      modes={modes}
      activeMode={mode}
      onModeChange={id => setMode(id as Mode)}
      actions={actions}
    />
  );
}

const btn: React.CSSProperties = {
  display: 'block', width: '100%', padding: '8px 10px', borderRadius: 6,
  border: '1px solid var(--cp-border, #3a3a44)', background: 'rgba(255,255,255,0.06)',
  color: 'var(--cp-fg, #e8e8ee)', cursor: 'pointer', fontSize: 13, marginTop: 6,
};
