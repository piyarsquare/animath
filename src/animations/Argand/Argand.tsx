import React, { useEffect, useMemo, useRef, useState } from 'react';
import Workspace from '../../chrome/workspace/Workspace';
import type { LayoutDef, SectionDef, ViewDef } from '../../chrome/workspace/types';
import { Slider, Pills, Select, Checkbox, ComplexInput } from '../../components/ControlPanel';
import { usePersistentState, clearPersistedState } from '../../lib/usePersistentState';
import './Argand.css';
import explainerText from './EXPLAINER.md?raw';
import ArgandPlane, {
  type Feed, type Handle, Z_COL, A1_COL, A0_COL, A2_COL, F_COL, FIX_COL,
} from './ArgandPlane';
import { buildCurve, CURVES, type CurveName } from './curves';
import { TOUR } from './tour';
import {
  type Cx, type ArcLengthMap, cx, modulus, add, sub, scale,
  mulG, powRealG, affineLoopAt, arcLengthMap, formatRect, formatPolar,
  polyEval, polyFixedPoints, polyTermLoopAt, polyRampAt,
} from './complexOps';

const STORAGE_KEY = 'argand';

/** Round a dragged coordinate to 2 decimals so coefficients stay tidy. */
const tidy = (n: number): number => {
  const r = Math.round(n * 100) / 100;
  return Object.is(r, -0) ? 0 : r;
};

// Floor on how long one full sweep may take, so short paths don't ping-pong
// frantically once the clock is paced by (small) arc length.
const MIN_SWEEP_SEC = 1;

/** Friendly name for the number system at parameter p = j². */
const systemName = (p: number): string =>
  p < -0.001 ? 'Complex (j² < 0)' : p > 0.001 ? 'Split-complex (j² > 0)' : 'Dual (j² = 0)';

/**
 * Argand — an entry-point app for complex numbers, reframed around the **affine
 * map** `f(z) = α₁·z + α₀` (the complex cousin of `y = m·x + b`): set the slope
 * `α₁` and shift `α₀`, feed the map a point, a shape, or the whole grid, and
 * watch the transformation. `f` decomposes into "spin/scale by α₁, then slide by
 * α₀", and the fixed point `z*` (where `f(z*) = z*`) is drawn throughout. A
 * System slider `p = j²` runs the same line through complex, dual, and
 * split-complex numbers. It is its own entry point into arithmetic on the plane —
 * not a replacement for Plane Transform or for the complex plane itself.
 */
export default function Argand() {
  const [z, setZ] = usePersistentState<Cx>(`${STORAGE_KEY}:z`, cx(1.5, 1));
  const [alpha1, setA1] = usePersistentState<Cx>(`${STORAGE_KEY}:a1`, cx(0.4, 0.8));
  const [alpha0, setA0] = usePersistentState<Cx>(`${STORAGE_KEY}:a0`, cx(1, 0));
  const [alpha2, setA2] = usePersistentState<Cx>(`${STORAGE_KEY}:a2`, cx(0.3, -0.2));
  const [degree, setDegree] = usePersistentState(`${STORAGE_KEY}:deg`, 1);
  const [lockA2, setLockA2] = usePersistentState(`${STORAGE_KEY}:lockA2`, false);
  const [feed, setFeed] = usePersistentState<Feed>(`${STORAGE_KEY}:feed`, 'point');
  const [curveName, setCurveName] = usePersistentState<CurveName>(`${STORAGE_KEY}:curve`, 'flag');
  const [lockA1, setLockA1] = usePersistentState(`${STORAGE_KEY}:lockA1`, false);
  const [lockA0, setLockA0] = usePersistentState(`${STORAGE_KEY}:lockA0`, false);
  const [snapping, setSnapping] = usePersistentState(`${STORAGE_KEY}:snap`, true);
  const [gridOpacity, setGridOpacity] = usePersistentState(`${STORAGE_KEY}:gridOp`, 0.22);
  const [imageOpacity, setImageOpacity] = usePersistentState(`${STORAGE_KEY}:imgOp`, 0.5);
  const [gridType, setGridType] = usePersistentState<'cartesian' | 'polar'>(`${STORAGE_KEY}:gridType`, 'cartesian');
  const [gridStep, setGridStep] = usePersistentState(`${STORAGE_KEY}:gridStep`, 1);
  const [gridColor, setGridColor] = usePersistentState(`${STORAGE_KEY}:gridColor`, false);
  const [showUnitCircle, setShowUnitCircle] = usePersistentState(`${STORAGE_KEY}:unit`, true);
  const [extent, setExtent] = usePersistentState(`${STORAGE_KEY}:extent`, 4);
  // Number system: p = j². p<0 complex, p=0 dual, p>0 split-complex.
  const [system, setSystem] = usePersistentState(`${STORAGE_KEY}:system`, -1);
  // Pen speed in math units / second (the same for every leg and feed).
  const [speed, setSpeed] = usePersistentState(`${STORAGE_KEY}:speed`, 2);
  const [viewFromFixed, setViewFromFixed] = usePersistentState(`${STORAGE_KEY}:vFix`, false);
  const [iterate, setIterate] = usePersistentState(`${STORAGE_KEY}:iter`, false);
  const [iterN, setIterN] = usePersistentState(`${STORAGE_KEY}:iterN`, 12);
  // Whether the first-visit walkthrough has been offered yet (persisted).
  const [seenTour, setSeenTour] = usePersistentState(`${STORAGE_KEY}:seenTour`, false);

  // Transient view state — never persisted.
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  // Walkthrough: current step index, or null when not touring.
  const [tourStep, setTourStep] = useState<number | null>(null);
  // The j² morph has its own Play: ping-pong p between −1 and +1.
  const [sysPlaying, setSysPlaying] = useState(false);
  const sysDir = useRef(1);
  useEffect(() => {
    if (!sysPlaying) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setSystem(v => {
        let n = v + sysDir.current * dt * 0.4;
        if (n >= 1) { n = 1; sysDir.current = -1; }
        else if (n <= -1) { n = -1; sysDir.current = 1; }
        return n;
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sysPlaying, setSystem]);

  const isPoint = feed === 'point';
  const isShape = feed === 'shape';
  const isGrid = feed === 'grid';
  const curve = useMemo(() => buildCurve(curveName), [curveName]);

  const quad = degree >= 2;
  const coeffs = useMemo(() => (quad ? [alpha0, alpha1, alpha2] : [alpha0, alpha1]), [quad, alpha0, alpha1, alpha2]);
  const fz = polyEval(coeffs, z, system);
  const zStars = polyFixedPoints(coeffs, system);
  const zStar = zStars[0] ?? null;

  // Pace Play by the arc length of the representative input's *whole loop* (out
  // by the two legs, back along the diagonal), so the pen moves at constant
  // geometric speed all the way around.
  const lut: ArcLengthMap = useMemo(() => {
    // Iteration: pace along the orbit spiral z* + α₁^(s·N)·(z−z*).
    if (iterate && isPoint) {
      return arcLengthMap(s => {
        const u = s * iterN;
        return zStar ? add(zStar, mulG(powRealG(alpha1, system, u), sub(z, zStar), system)) : add(z, scale(alpha0, u));
      }, 160);
    }
    let q = z;
    if (isShape) {
      q = curve[0] ? add(curve[0], z) : z;
      for (const pt of curve) { const c = add(pt, z); if (modulus(c) > modulus(q)) q = c; }
    } else if (isGrid) {
      q = cx(extent, extent);
    }
    // Quadratic: Point traces the Horner chain; Shape/Grid morph the α₂ term in
    // and out (triangle), so both are paced by their own path.
    if (quad) {
      if (isPoint) return arcLengthMap(s => polyTermLoopAt(coeffs, z, system, s), 180);
      return arcLengthMap(s => polyRampAt(coeffs, q, system, s < 0.5 ? s * 2 : 2 - 2 * s), 160);
    }
    return arcLengthMap(s => affineLoopAt(q, alpha1, alpha0, system, s), 144);
  }, [iterate, isPoint, iterN, zStar, isShape, isGrid, curve, z, alpha1, alpha0, system, extent, quad, coeffs]);

  const lutRef = useRef(lut);
  lutRef.current = lut;
  const arcRef = useRef(0);

  // Play clock — integrate distance at `speed` u/s and wrap once around the
  // closed loop (z→f(z) by the legs, back by the diagonal). Wrapping is seamless
  // because the loop returns to z. Short loops are slowed to MIN_SWEEP_SEC.
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const L = lutRef.current.length;
      const v = L > 1e-6 ? Math.min(speed, L / (2 * MIN_SWEEP_SEC)) : 0;
      let arc = arcRef.current + dt * v;
      if (L > 1e-6) while (arc >= L) arc -= L;          // wrap, don't bounce
      arcRef.current = arc;
      setT(lutRef.current.sAt(arc));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed]);

  const togglePlay = () => setPlaying(pl => {
    if (!pl) arcRef.current = lutRef.current.arcAt(t);
    return !pl;
  });

  const goToStop = (st: number) => { setPlaying(false); setT(st); };

  /* ---- guided walkthrough (steps in tour.ts) ---- */
  const applyStep = (i: number) => {
    const s = TOUR[i].state;
    if (s.feed !== undefined) setFeed(s.feed);
    if (s.degree !== undefined) setDegree(s.degree);
    if (s.z) setZ(s.z);
    if (s.alpha1) setA1(s.alpha1);
    if (s.alpha0) setA0(s.alpha0);
    if (s.alpha2) setA2(s.alpha2);
    if (s.system !== undefined) setSystem(s.system);
    if (s.viewFromFixed !== undefined) setViewFromFixed(s.viewFromFixed);
    if (s.iterate !== undefined) setIterate(s.iterate);
    if (s.extent !== undefined) setExtent(s.extent);
    if (s.gridType !== undefined) setGridType(s.gridType);
    if (s.gridColor !== undefined) setGridColor(s.gridColor);
    if (s.showUnitCircle !== undefined) setShowUnitCircle(s.showUnitCircle);
    setPlaying(false);
    setSysPlaying(false);
  };
  const startTour = () => { setSeenTour(true); setTourStep(0); applyStep(0); };
  const exitTour = () => setTourStep(null);
  const goStep = (n: number) => {
    if (n < 0) return;
    if (n >= TOUR.length) { exitTour(); return; }
    setTourStep(n);
    applyStep(n);
  };

  // Stops mark the meaningful waypoints, labeled per feed and degree.
  const stopLabels = isPoint
    ? ['z', 'α₁z', 'f(z)']
    : isShape
      ? ['Shape', 'Spun', 'Image']
      : ['Identity', 'Linear', 'Affine'];
  const stops = quad
    ? (isPoint
        ? [{ label: 'α₂z²', t: 1 / 6 }, { label: '+α₁z', t: 2 / 6 }, { label: 'f(z)', t: 3 / 6 }]
        : [{ label: 'Linear', t: 0 }, { label: 'Quad', t: 0.5 }, { label: 'Linear', t: 1 }])
    : [{ label: stopLabels[0], t: 0 }, { label: stopLabels[1], t: 0.25 }, { label: stopLabels[2], t: 0.5 }];
  const atStop = (st: number): boolean => Math.abs(t - st) < 0.02;

  const subtitle = `f(z) = ${formatRect(fz)}   ·   ${systemName(system)}`;

  /* ---- the colored equation, shared by panel + readouts ---- */
  const Eqn = (
    <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 15, fontWeight: 700, marginTop: 2 }}>
      <span style={{ color: F_COL }}>f(z)</span> ={' '}
      {quad && <><span style={{ color: A2_COL }}>α₂</span>·<span style={{ color: Z_COL }}>z²</span> + </>}
      <span style={{ color: A1_COL }}>α₁</span>·<span style={{ color: Z_COL }}>z</span> +{' '}
      <span style={{ color: A0_COL }}>α₀</span>
    </div>
  );

  /* ---- panels ---- */

  const functionNode = (
    <>
      <Pills<number>
        label="Degree"
        options={[{ value: 1, label: 'Linear' }, { value: 2, label: 'Quadratic' }]}
        value={degree}
        onChange={setDegree}
      />
      {Eqn}
      {quad && (
        <div style={{ marginTop: 8 }}>
          <ComplexInput label="α₂  (quadratic term)" value={[alpha2.re, alpha2.im]} onChange={([re, im]) => setA2(cx(re, im))} />
          <Checkbox label="Lock α₂" checked={lockA2} onChange={setLockA2} />
        </div>
      )}
      <div style={{ marginTop: 8 }}>
        <ComplexInput label="α₁  (slope · spin & scale)" value={[alpha1.re, alpha1.im]} onChange={([re, im]) => setA1(cx(re, im))} />
        <Checkbox label="Lock α₁" checked={lockA1} onChange={setLockA1} />
      </div>
      <div style={{ marginTop: 8 }}>
        <ComplexInput label="α₀  (shift · intercept)" value={[alpha0.re, alpha0.im]} onChange={([re, im]) => setA0(cx(re, im))} />
        <Checkbox label="Lock α₀" checked={lockA0} onChange={setLockA0} />
      </div>
      <div style={{ marginTop: 8, fontSize: 12, fontFamily: 'var(--font-mono, monospace)', color: FIX_COL }}>
        {zStars.length === 0
          ? 'fixed z* = — (pure shift)'
          : zStars.map((zs, i) => <div key={i}>fixed z*{zStars.length > 1 ? i + 1 : ''} = {formatRect(zs)}</div>)}
      </div>
      <Checkbox label="View from z* (recenter)" checked={viewFromFixed} onChange={setViewFromFixed} />
      <div style={{ fontSize: 11, color: 'var(--cp-fg-dim, #9b9ba3)', marginTop: 6 }}>
        Drag the colored handles on the plane, or lock a coefficient to drag only{' '}
        <b style={{ color: Z_COL }}>z</b>. <b style={{ color: FIX_COL }}>z*</b> is the point f leaves put.
      </div>
    </>
  );

  const systemNode = (
    <>
      <Slider label="Number system  (p = j²)" value={system} min={-1} max={1} step={0.05}
        onChange={setSystem} format={() => systemName(system)}
        stops={[{ value: -1, label: 'Complex' }, { value: 0, label: 'Dual' }, { value: 1, label: 'Split' }]} />
      <div style={{ fontSize: 11, color: 'var(--cp-fg-dim, #9b9ba3)', marginTop: 4 }}>
        Multiply-by-α₁ is a <b>rotation</b> (complex), a <b>shear</b> (dual), or a <b>boost</b> (split-complex). The
        dashed unit curve is <code>x² − p·y² = 1</code>; the red lines (split) are the null cone where multiplication
        degenerates.
      </div>
    </>
  );

  const inputNode = (
    <>
      {isShape && (
        <Select<CurveName>
          label="Shape"
          options={CURVES.map(c => ({ value: c.id, label: c.label }))}
          value={curveName}
          onChange={setCurveName}
        />
      )}
      <ComplexInput label={isShape ? 'z  (anchor)' : isGrid ? 'z  (probe)' : 'z  (input)'} value={[z.re, z.im]} onChange={([re, im]) => setZ(cx(re, im))} />
      <div style={{ fontSize: 11, color: 'var(--cp-fg-dim, #9b9ba3)', marginTop: 4 }}>
        {isShape
          ? <>Drag <b style={{ color: Z_COL }}>z</b> to place the shape; <b style={{ color: F_COL }}>f</b> spins, scales and shifts the whole figure.</>
          : isGrid
            ? <>The whole grid maps by <b style={{ color: F_COL }}>f</b>; <b style={{ color: Z_COL }}>z</b> is one point watched riding along.</>
            : <>Drag <b style={{ color: Z_COL }}>z</b> and watch <b style={{ color: F_COL }}>f(z)</b>.</>}
        {' '}Switch Point / Shape / Grid in the top bar.
      </div>
    </>
  );

  const scrubNode = (
    <>
      <div style={{ fontSize: 11, color: 'var(--cp-fg-dim, #9b9ba3)', marginBottom: 5 }}>Jump to a stop</div>
      <div style={{ display: 'flex', gap: 6 }}>
        {stops.map(s => (
          <button key={s.label} onClick={() => goToStop(s.t)} aria-pressed={atStop(s.t)}
            style={{ ...stopBtn, ...(atStop(s.t) ? stopBtnActive : null) }}>
            {s.label}
          </button>
        ))}
      </div>
      <button style={btn} onClick={togglePlay} aria-pressed={playing}>
        {playing ? '❚❚ Pause' : '▶ Play'}
      </button>
      <Slider label="Speed  (pen, units/sec)" value={speed} min={0.5} max={6} step={0.25}
        onChange={setSpeed} format={v => `${v.toFixed(2)} u/s`} />
      <Slider label="Fine scrub  (around the loop)" value={t} min={0} max={1} step={0.001}
        onChange={v => { setPlaying(false); setT(v); }} format={v => v.toFixed(2)} />
      <div style={{ fontSize: 11, color: 'var(--cp-fg-dim, #9b9ba3)', marginTop: 6 }}>
        Out by the two legs — first <b style={{ color: A1_COL }}>×α₁</b> (spin & scale), then
        <b style={{ color: A0_COL }}> +α₀</b> (shift) — to <b style={{ color: F_COL }}>f(z)</b>; then back along the
        <b style={{ color: '#2dd4bf' }}> diagonal</b>, spinning and shifting at once. A closed loop.
      </div>
      {isPoint && (
        <div style={{ marginTop: 10, borderTop: '1px solid var(--cp-border, #3a3a44)', paddingTop: 8 }}>
          <Checkbox label="Iterate  z → f(z) → f(f(z)) → …" checked={iterate} onChange={setIterate} />
          {iterate && (
            <>
              <Slider label="Steps" value={iterN} min={1} max={40} step={1} onChange={v => setIterN(Math.round(v))} format={v => `${Math.round(v)}`} />
              <div style={{ fontSize: 11, color: 'var(--cp-fg-dim, #9b9ba3)', marginTop: 4 }}>
                The orbit spirals <b>into</b> <b style={{ color: FIX_COL }}>z*</b> when <code>|α₁| &lt; 1</code>, <b>out</b> when
                <code> &gt; 1</code>, and circles it forever when <code>|α₁| = 1</code>. Play traces it.
              </div>
            </>
          )}
        </div>
      )}
    </>
  );

  const planeNode = (
    <>
      <Slider label="Extent (±)" value={extent} min={1} max={16} step={0.5}
        onChange={setExtent} format={v => v.toFixed(1)} />
      <Pills<'cartesian' | 'polar'>
        label="Grid"
        options={[{ value: 'cartesian', label: 'Cartesian' }, { value: 'polar', label: 'Polar' }]}
        value={gridType}
        onChange={setGridType}
      />
      <Slider label="Grid size" value={gridStep} min={0.25} max={5} step={0.25}
        onChange={setGridStep} format={v => v.toFixed(2)} />
      <Checkbox label="Color grid by angle (domain coloring)" checked={gridColor} onChange={setGridColor} />
      <Slider label="Grid brightness" value={gridOpacity} min={0} max={0.6} step={0.02}
        onChange={setGridOpacity} format={v => v === 0 ? 'off' : v.toFixed(2)} />
      <Slider label="Image grid brightness" value={imageOpacity} min={0.1} max={1} step={0.05}
        onChange={setImageOpacity} format={v => v.toFixed(2)} />
      <Checkbox label="Unit curve" checked={showUnitCircle} onChange={setShowUnitCircle} />
      <Checkbox label="Snap to nice values (1, i, lattice, π/6…)" checked={snapping} onChange={setSnapping} />
    </>
  );

  const valueRows: Array<[string, Cx, string]> = [
    ['z', z, Z_COL], ['α₁', alpha1, A1_COL], ['α₀', alpha0, A0_COL], ['f(z)', fz, F_COL],
    ...(zStar ? [['z*', zStar, FIX_COL] as [string, Cx, string]] : []),
  ];

  const valuesNode = (
    <div style={{ display: 'grid', gap: 8 }}>
      {valueRows.map(([lab, q, col]) => (
        <div key={lab} style={{ display: 'grid', gap: 1 }}>
          <div style={{ fontWeight: 700, color: col, fontFamily: 'var(--font-mono, monospace)' }}>
            {lab} = {formatRect(q)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--cp-fg-dim, #9b9ba3)', fontFamily: 'var(--font-mono, monospace)' }}>
            {formatPolar(q)}
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
    { id: 'function', title: 'Function', arch: 'subject', node: functionNode, estHeight: 360 },
    { id: 'system', title: 'Number plane', arch: 'domain', node: systemNode, estHeight: 170 },
    { id: 'input', title: 'Input', arch: 'subject', node: inputNode, estHeight: 130 },
    { id: 'plane', title: 'Plane', arch: 'domain', node: planeNode, estHeight: 300 },
    { id: 'scrub', title: 'Play', arch: 'playback', node: scrubNode, estHeight: 280 },
    { id: 'values', title: 'Values', arch: 'readout', node: valuesNode, estHeight: 220 },
    { id: 'detail', title: 'Detail', arch: 'quality', node: detailNode, estHeight: 90 },
  ];

  const onHandleChange = (which: Handle, q: Cx) => {
    // Tidy the dragged value to 2 decimals so coefficients never read as long
    // floats (1.5333…); snapping still lands exact lattice/nice values.
    const r = cx(tidy(q.re), tidy(q.im));
    if (which === 'z') setZ(r);
    else if (which === 'alpha1') setA1(r);
    else if (which === 'alpha2') setA2(r);
    else setA0(r);
  };

  // A self-contained control HUD pinned to the bottom of the plot. Because it
  // lives INSIDE the view node it survives fullscreen (where the chrome's top bar
  // and action strip are gone) and never overlaps them. It carries the feed
  // switcher (Shape reveals its presets), and a scrubber + Play for BOTH the
  // path parameter t and the number-system morph j².
  const pill = (active: boolean): React.CSSProperties => ({
    padding: '4px 9px', borderRadius: 999, fontSize: 11, fontWeight: 600, cursor: 'pointer',
    border: '1px solid var(--border, #3a3a44)', whiteSpace: 'nowrap',
    background: active ? 'var(--accent, #34d399)' : 'rgba(255,255,255,0.04)',
    color: active ? 'var(--accent-fg, #0c0c10)' : 'var(--fg, #e8e8ee)',
  });
  const iconBtn: React.CSSProperties = {
    flex: '0 0 auto', width: 30, height: 26, borderRadius: 7, cursor: 'pointer',
    border: '1px solid var(--border, #3a3a44)', background: 'rgba(255,255,255,0.06)',
    color: 'var(--fg, #e8e8ee)', fontSize: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  };
  const hudLabel: React.CSSProperties = { width: 18, fontSize: 11, color: 'var(--dim, #9b9ba3)', flex: '0 0 auto' };
  const hudRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' };
  const controlHud = (
    <div
      className="argand-hud"
      style={{
        display: 'flex', flexDirection: 'column', gap: 7, width: 'min(94%, 540px)',
        padding: '9px 11px', borderRadius: 16,
        background: 'var(--panel, rgba(18,18,24,0.92))', border: '1px solid var(--border, #3a3a44)',
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', boxShadow: 'var(--shadow)',
        fontFamily: 'var(--font-mono, monospace)',
      }}
    >
      {/* feed switcher — pressing Shape reveals its presets */}
      <div style={hudRow}>
        {(['point', 'shape', 'grid'] as Feed[]).map(fd => (
          <button key={fd} style={pill(feed === fd)} onClick={() => setFeed(fd)}>
            {fd[0].toUpperCase() + fd.slice(1)}
          </button>
        ))}
        {isShape && <div style={{ width: 1, height: 18, background: 'var(--border, #3a3a44)', margin: '0 2px' }} />}
        {isShape && CURVES.map(c => (
          <button key={c.id} style={pill(curveName === c.id)} onClick={() => setCurveName(c.id)}>{c.label}</button>
        ))}
        <button style={{ ...pill(tourStep !== null), marginLeft: 'auto' }} onClick={startTour} title="Replay the walkthrough">↻ Tour</button>
      </div>
      {/* path parameter t */}
      <div style={hudRow}>
        <span style={hudLabel}>t</span>
        <input type="range" min={0} max={1} step={0.001} value={t}
          onChange={e => { setPlaying(false); setT(parseFloat(e.target.value)); }}
          style={{ flex: 1, minWidth: 90, accentColor: 'var(--accent, #34d399)' }} />
        <button style={iconBtn} onClick={togglePlay} aria-pressed={playing} title={playing ? 'Pause' : 'Play'}>{playing ? '❚❚' : '▶'}</button>
        <button style={iconBtn} onClick={() => { setPlaying(false); setT(0); }} title="To z">↺</button>
      </div>
      {/* number system j² (morphs complex ↔ split) */}
      <div style={hudRow} title={systemName(system)}>
        <span style={hudLabel}>j²</span>
        <input type="range" min={-1} max={1} step={0.02} value={system}
          onChange={e => { setSysPlaying(false); setSystem(parseFloat(e.target.value)); }}
          style={{ flex: 1, minWidth: 90, accentColor: 'var(--accent, #34d399)' }} />
        <button style={iconBtn} onClick={() => setSysPlaying(s => !s)} aria-pressed={sysPlaying} title={sysPlaying ? 'Pause morph' : 'Play morph'}>{sysPlaying ? '❚❚' : '▶'}</button>
        {([['Cx', -1], ['Du', 0], ['Sp', 1]] as [string, number][]).map(([l, v]) => (
          <button key={l} style={pill(Math.abs(system - v) < 0.02)} onClick={() => { setSysPlaying(false); setSystem(v); }}>{l}</button>
        ))}
      </div>
    </div>
  );

  /* ---- walkthrough overlays (first-visit intro + step caption) ---- */
  const tourBtn = (primary: boolean): React.CSSProperties => ({
    padding: '6px 12px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
    border: '1px solid var(--border, #3a3a44)',
    background: primary ? 'var(--accent, #34d399)' : 'rgba(255,255,255,0.06)',
    color: primary ? 'var(--accent-fg, #0c0c10)' : 'var(--fg, #e8e8ee)',
  });
  const card: React.CSSProperties = {
    position: 'absolute', zIndex: 8, width: 'min(92%, 460px)', padding: '12px 14px', borderRadius: 14,
    background: 'var(--panel, rgba(18,18,24,0.94))', border: '1px solid var(--border, #3a3a44)',
    backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', boxShadow: 'var(--shadow)',
  };
  const tourOverlay = (
    <>
      {!seenTour && tourStep === null && (
        <div style={{ ...card, top: '20%', left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>New here?</div>
          <div style={{ fontSize: 13, color: 'var(--dim, #9b9ba3)', marginBottom: 12 }}>
            Take the quick walkthrough — from a number line to the whole plane in about a minute.
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button style={tourBtn(true)} onClick={startTour}>Start tour</button>
            <button style={tourBtn(false)} onClick={() => setSeenTour(true)}>Explore freely</button>
          </div>
        </div>
      )}
      {tourStep !== null && (
        <div style={{ ...card, top: 14, left: '50%', transform: 'translateX(-50%)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontWeight: 700, fontSize: 14, flex: 1 }}>{TOUR[tourStep].title}</div>
            <button style={iconBtn} onClick={exitTour} title="Exit walkthrough">✕</button>
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--dim, #9b9ba3)', margin: '6px 0 10px', lineHeight: 1.45 }}>
            {TOUR[tourStep].body}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button style={{ ...tourBtn(false), opacity: tourStep === 0 ? 0.4 : 1 }} disabled={tourStep === 0} onClick={() => goStep(tourStep - 1)}>‹ Back</button>
            <div style={{ flex: 1, textAlign: 'center', fontSize: 11, color: 'var(--dim, #9b9ba3)' }}>{tourStep + 1} / {TOUR.length}</div>
            <button style={tourBtn(true)} onClick={() => goStep(tourStep + 1)}>{tourStep === TOUR.length - 1 ? 'Done' : 'Next ›'}</button>
          </div>
        </div>
      )}
    </>
  );

  const views: ViewDef[] = [
    {
      id: 'plane',
      title: 'Argand plane',
      defaultRect: { x: 320, y: 16, w: 660, h: 600 },
      hint: tourStep !== null ? undefined : 'drag z · α₁ · α₀ · pinch or scroll to zoom · two-finger or shift-drag to pan · double-click to recenter',
      node: (
        <div style={{ position: 'absolute', inset: 0 }}>
          <ArgandPlane
            z={z} alpha1={alpha1} alpha0={alpha0} alpha2={alpha2} degree={degree} p={system}
            feed={feed} curve={curve} t={t} playing={playing}
            lockA1={lockA1} lockA0={lockA0} lockA2={lockA2}
            snapping={snapping} gridOpacity={gridOpacity} imageOpacity={imageOpacity} showUnitCircle={showUnitCircle}
            gridType={gridType} gridStep={gridStep} gridColor={gridColor}
            viewFromFixed={viewFromFixed} iterate={iterate} iterN={iterN}
            extent={extent}
            onChange={onHandleChange}
            onZoom={f => setExtent(e => Math.min(16, Math.max(1, e * f)))}
          />
          {/* on-screen equation (top-right, clear of the left panels; persists in
              fullscreen where the panels are gone) */}
          <div style={{
            position: 'absolute', right: 12, top: 12, zIndex: 6, pointerEvents: 'none', textAlign: 'right',
            padding: '5px 10px', borderRadius: 10, fontFamily: 'var(--font-mono, monospace)',
            background: 'var(--panel, rgba(18,18,24,0.82))', border: '1px solid var(--border, #3a3a44)',
            backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
          }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>
              <span style={{ color: F_COL }}>f(z)</span> ={' '}
              {quad && <><span style={{ color: A2_COL }}>α₂</span>·z² + </>}
              <span style={{ color: A1_COL }}>α₁</span>·z + <span style={{ color: A0_COL }}>α₀</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--dim, #9b9ba3)', marginTop: 1 }}>
              {quad && <><span style={{ color: A2_COL }}>{formatRect(alpha2)}</span> · z² + </>}
              <span style={{ color: A1_COL }}>{formatRect(alpha1)}</span> · z + <span style={{ color: A0_COL }}>{formatRect(alpha0)}</span>
            </div>
          </div>
          {controlHud}
          {tourOverlay}
        </div>
      ),
    },
  ];

  const layouts: LayoutDef[] = [
    {
      id: 'essentials', name: 'Essentials', sub: 'Function · Play · Values', icon: 'tune',
      open: { function: { x: 24, y: 16 }, scrub: { x: 24, y: 404 }, values: { x: 24, y: 712 } },
    },
  ];

  return (
    <Workspace
      appId="argand"
      title="Argand Plane"
      subtitle={subtitle}
      sections={sections}
      views={views}
      immersive
      modes={[{ id: 'point', label: 'Point' }, { id: 'shape', label: 'Shape' }, { id: 'grid', label: 'Grid' }]}
      activeMode={feed}
      onModeChange={id => setFeed(id as Feed)}
      layouts={layouts}
      defaultLayoutId="essentials"
      explainer={explainerText || null}
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
