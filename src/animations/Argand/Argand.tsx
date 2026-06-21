import React, { useEffect, useMemo, useRef, useState } from 'react';
import Workspace from '../../chrome/workspace/Workspace';
import type { ActionDef, LayoutDef, SectionDef, ViewDef, WorkspaceMode } from '../../chrome/workspace/types';
import { Slider, Pills, Select, Checkbox, ComplexInput } from '../../components/ControlPanel';
import { usePersistentState, clearPersistedState } from '../../lib/usePersistentState';
import explainerText from './EXPLAINER.md?raw';
import ArgandPlane, { type Mode, type Subject } from './ArgandPlane';
import { buildCurve, CURVES, type CurveName } from './curves';
import {
  type Cx, type ArcLengthMap, cx, add, mul, modulus,
  mulPath, addPath, arcLengthMap, formatRect, formatPolar,
} from './complexOps';

const STORAGE_KEY = 'argand';

const A_COL = '#38bdf8';
const B_COL = '#fb923c';
const R_COL = '#34d399';

/**
 * Argand — an entry-point app for complex numbers: drag two numbers on the
 * plane and watch how they add (tip-to-tail) and multiply (angles add, lengths
 * multiply). Labeled **stops** mark the meaningful waypoints and Play animates
 * between them at constant *geometric* speed (paced by path length, so a spiral
 * and a slide feel like the same pen, not two different scales). The successor to
 * Plane Transform; this first chapter is the arithmetic foundation.
 */
export default function Argand() {
  const [a, setA] = usePersistentState<Cx>(`${STORAGE_KEY}:a`, cx(1.6, 0.6));
  const [b, setB] = usePersistentState<Cx>(`${STORAGE_KEY}:b`, cx(0, 1));
  const [mode, setMode] = usePersistentState<Mode>(`${STORAGE_KEY}:mode`, 'multiply');
  const [subject, setSubject] = usePersistentState<Subject>(`${STORAGE_KEY}:subject`, 'number');
  const [curveName, setCurveName] = usePersistentState<CurveName>(`${STORAGE_KEY}:curve`, 'flag');
  const [showSecondRoute, setShowSecondRoute] = usePersistentState(`${STORAGE_KEY}:second`, false);
  const [snapping, setSnapping] = usePersistentState(`${STORAGE_KEY}:snap`, true);
  const [showGrid, setShowGrid] = usePersistentState(`${STORAGE_KEY}:grid`, true);
  const [showUnitCircle, setShowUnitCircle] = usePersistentState(`${STORAGE_KEY}:unit`, true);
  const [extent, setExtent] = usePersistentState(`${STORAGE_KEY}:extent`, 4);
  // Speed is now in **math units / second** (geometric speed of the pen), so it
  // reads the same for a tight multiply spiral and a short add slide.
  const [speed, setSpeed] = usePersistentState(`${STORAGE_KEY}:speed`, 2);

  // Transient view state — never persisted.
  const [t, setT] = useState(1);
  const [playing, setPlaying] = useState(false);
  const dirRef = useRef(1);

  const isCurve = subject === 'curve';
  const isPlane = subject === 'plane';
  const curve = useMemo(() => buildCurve(curveName), [curveName]);

  // The path Play paces by — the primary mover (number) or a representative
  // shape point's unified loop (curve). We arc-length-reparameterize it so the
  // clock can advance at constant *geometric* speed instead of constant param
  // speed; that is what makes add and multiply feel like the same pen.
  const lut: ArcLengthMap = useMemo(() => {
    if (isPlane) {
      // Pace by a far grid corner — the part of the plane that sweeps farthest —
      // so the whole-plane morph runs at the same pen speed as the other chapters.
      const corner = cx(extent, extent);
      return mode === 'multiply'
        ? arcLengthMap(s => mulPath(corner, b, s))
        : arcLengthMap(s => addPath(corner, b, s));
    }
    if (isCurve) {
      // Pace by the placed point that travels farthest (largest |q|), so the
      // whole figure stays comfortably in view.
      let q = curve[0] ? add(curve[0], a) : a;
      for (const p of curve) {
        const cand = add(p, a);
        if (modulus(cand) > modulus(q)) q = cand;
      }
      return mode === 'multiply'
        ? arcLengthMap(s => mulPath(q, b, s))
        : arcLengthMap(s => addPath(q, b, s));
    }
    return mode === 'multiply'
      ? arcLengthMap(s => mulPath(a, b, s))
      : arcLengthMap(s => addPath(a, b, s));
  }, [isPlane, isCurve, curve, a, b, mode, extent]);

  // Read the latest map from the rAF loop without re-subscribing each frame.
  const lutRef = useRef(lut);
  lutRef.current = lut;
  const arcRef = useRef(0);

  // Play clock: integrate distance traveled (arc) at `speed` units/sec, ping-
  // ponging 0↔length, and map back to the native param t. The return leg
  // retraces the path backward (for multiply, the operation run in reverse) so
  // there is no jump-cut on the loop. The SVG is light enough for per-frame
  // setState.
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const L = lutRef.current.length;
      let arc = arcRef.current + dirRef.current * dt * speed;
      if (arc >= L) { arc = L; dirRef.current = -1; }
      else if (arc <= 0) { arc = 0; dirRef.current = 1; }
      arcRef.current = arc;
      setT(lutRef.current.sAt(arc));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed]);

  // Sync the arc accumulator from the current t and head away from any endpoint.
  const togglePlay = () => setPlaying(p => {
    if (!p) {
      const L = lutRef.current.length;
      arcRef.current = lutRef.current.arcAt(t);
      dirRef.current = arcRef.current >= L - 1e-6 ? -1 : arcRef.current <= 1e-6 ? 1 : dirRef.current;
    }
    return !p;
  });

  // Jump to a labeled stop (and stop playing); Play then resumes from here.
  const goToStop = (st: number) => {
    setPlaying(false);
    dirRef.current = st >= 0.999 ? -1 : 1;
    setT(st);
  };

  const result = mode === 'multiply' ? mul(a, b) : add(a, b);
  const resultLabel = mode === 'multiply' ? 'a·b' : 'a+b';
  const op = mode === 'multiply' ? '×' : '+';
  const subtitle = isPlane
    ? `z ↦ z ${op} b,  b = ${formatRect(b)}`
    : isCurve
      ? `shape ${op} b,  b = ${formatRect(b)}`
      : `${resultLabel} = ${formatRect(result)}`;

  // The meaningful waypoints of the current path — each one a two-ended sweep
  // (original → image), so two stops everywhere.
  const stops: Array<{ label: string; t: number; also?: number }> = isPlane
    ? [{ label: 'Identity', t: 0 }, { label: 'Mapped', t: 1 }]
    : isCurve
      ? [{ label: 'Shape', t: 0 }, { label: 'Image', t: 1 }]
      : [{ label: 'a', t: 0 }, { label: resultLabel, t: 1 }];
  const atStop = (s: { t: number; also?: number }): boolean =>
    Math.abs(t - s.t) < 0.02 || (s.also !== undefined && Math.abs(t - s.also) < 0.02);

  /* ---- panels ---- */

  const numbersNode = (
    <>
      <Pills<Subject>
        label="Transform a"
        options={[
          { value: 'number', label: 'Number' },
          { value: 'curve', label: 'Curve' },
          { value: 'plane', label: 'Plane' },
        ]}
        value={subject}
        onChange={setSubject}
      />
      {isCurve && (
        <Select<CurveName>
          label="Shape"
          options={CURVES.map(c => ({ value: c.id, label: c.label }))}
          value={curveName}
          onChange={setCurveName}
        />
      )}
      <ComplexInput label={isPlane ? 'a (probe)' : isCurve ? 'a (place)' : 'a'} value={[a.re, a.im]} onChange={([re, im]) => setA(cx(re, im))} />
      <ComplexInput label={isPlane ? 'b (the map)' : isCurve ? 'b (× or +)' : 'b'} value={[b.re, b.im]} onChange={([re, im]) => setB(cx(re, im))} />
      <div style={{ fontSize: 11, color: 'var(--cp-fg-dim, #9b9ba3)', marginTop: 4 }}>
        {isPlane
          ? <>Drag <b style={{ color: B_COL }}>b</b> to set the map <code>z ↦ z {op} b</code>; <b style={{ color: A_COL }}>a</b> is one number watched riding along.</>
          : isCurve
            ? <>Drag <b style={{ color: A_COL }}>a</b> to place the shape, <b style={{ color: B_COL }}>b</b> to set the constant.</>
            : <>Or just drag the <b style={{ color: A_COL }}>a</b> and <b style={{ color: B_COL }}>b</b> handles on the plane.</>}
      </div>
    </>
  );

  const scrubNode = (
    <>
      <div style={{ fontSize: 11, color: 'var(--cp-fg-dim, #9b9ba3)', marginBottom: 5 }}>
        {isCurve ? 'Jump to a stop' : 'Endpoints'}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {stops.map(s => (
          <button key={s.label} onClick={() => goToStop(s.t)} aria-pressed={atStop(s)}
            style={{ ...stopBtn, ...(atStop(s) ? stopBtnActive : null) }}>
            {s.label}
          </button>
        ))}
      </div>
      <button style={btn} onClick={togglePlay} aria-pressed={playing}>
        {playing ? '❚❚ Pause' : '▶ Play'}
      </button>
      <Slider label="Speed  (pen, units/sec)" value={speed} min={0.5} max={6} step={0.25}
        onChange={setSpeed} format={v => `${v.toFixed(2)} u/s`} />
      <Slider label={isCurve ? 'Fine scrub  (shape → image)' : 'Fine scrub  (a → result)'}
        value={t} min={0} max={1} step={0.001}
        onChange={v => { setPlaying(false); setT(v); }} format={v => v.toFixed(2)} />
      <div style={{ fontSize: 11, color: 'var(--cp-fg-dim, #9b9ba3)', marginTop: 6 }}>
        {isPlane
          ? mode === 'multiply'
            ? 'The whole grid rotates and scales by b about the origin — multiply is one similarity of the plane. The faint grid is the identity it came from.'
            : 'The whole grid slides rigidly by b — addition is a translation of the plane.'
          : isCurve
            ? 'The arcs are each point’s path to its image (spirals for ×, slides for +). Play sweeps the shape along them.'
            : mode === 'multiply'
              ? 'Multiplication spirals: angle swings by arg b, length scales by |b| — paced by arc length so it matches Add.'
              : 'Addition slides: a moves tip-to-tail along b.'}
      </div>
    </>
  );

  const combineNode = (
    <>
      {!isCurve && !isPlane && (
        <Checkbox
          label={mode === 'multiply' ? 'Show both orders (a·b = b·a)' : 'Show both orders (parallelogram)'}
          checked={showSecondRoute}
          onChange={setShowSecondRoute}
        />
      )}
      <Checkbox label="Snap to nice values (1, i, lattice, π/6…)" checked={snapping} onChange={setSnapping} />
    </>
  );

  const planeNode = (
    <>
      <Slider label="Extent (±)" value={extent} min={1} max={16} step={0.5}
        onChange={setExtent} format={v => v.toFixed(1)} />
      <Checkbox label="Grid" checked={showGrid} onChange={setShowGrid} />
      <Checkbox label="Unit circle" checked={showUnitCircle} onChange={setShowUnitCircle} />
    </>
  );

  const valueRows: Array<[string, Cx, string]> = isCurve
    ? [['a (place)', a, A_COL], ['b', b, B_COL]]
    : [['a', a, A_COL], ['b', b, B_COL], [resultLabel, result, R_COL]];

  const valuesNode = (
    <div style={{ display: 'grid', gap: 8 }}>
      {valueRows.map(([lab, z, col]) => (
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
    { id: 'scrub', title: 'Play', arch: 'playback', node: scrubNode, estHeight: 290 },
    { id: 'values', title: 'Values', arch: 'readout', node: valuesNode, estHeight: 200 },
    { id: 'detail', title: 'Detail', arch: 'quality', node: detailNode, estHeight: 90 },
  ];

  const views: ViewDef[] = [
    {
      id: 'plane',
      title: 'Argand plane',
      defaultRect: { x: 320, y: 16, w: 660, h: 600 },
      hint: 'drag a and b · pinch or scroll to zoom · two-finger or shift-drag to pan · double-click to recenter',
      node: (
        <ArgandPlane
          a={a} b={b} mode={mode} t={t} playing={playing}
          subject={subject} curve={curve}
          showSecondRoute={showSecondRoute}
          snapping={snapping}
          showGrid={showGrid}
          showUnitCircle={showUnitCircle}
          extent={extent}
          onChange={(which, z) => (which === 'a' ? setA(z) : setB(z))}
          onZoom={f => setExtent(e => Math.min(16, Math.max(1, e * f)))}
        />
      ),
    },
  ];

  const layouts: LayoutDef[] = [
    {
      id: 'essentials', name: 'Essentials', sub: 'Numbers · Play · Values', icon: 'tune',
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
      onClick: togglePlay, active: playing, primary: true, sectionId: 'scrub',
    },
    {
      id: 'reset', icon: 'reset', label: 'To start',
      onClick: () => { setPlaying(false); dirRef.current = 1; setT(0); }, sectionId: 'scrub',
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

const stopBtn: React.CSSProperties = {
  flex: 1, padding: '7px 6px', borderRadius: 6,
  border: '1px solid var(--cp-border, #3a3a44)', background: 'rgba(255,255,255,0.04)',
  color: 'var(--cp-fg, #e8e8ee)', cursor: 'pointer', fontSize: 12.5, fontWeight: 600,
  fontFamily: 'var(--font-mono, monospace)',
};

const stopBtnActive: React.CSSProperties = {
  background: 'var(--cp-accent, #34d399)', borderColor: 'var(--cp-accent, #34d399)',
  color: '#0c0c10',
};
