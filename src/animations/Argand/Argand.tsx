import React, { useEffect, useMemo, useRef, useState } from 'react';
import Workspace from '../../chrome/workspace/Workspace';
import type { ActionDef, LayoutDef, SectionDef, ViewDef } from '../../chrome/workspace/types';
import { Slider, Pills, Select, Checkbox, ComplexInput } from '../../components/ControlPanel';
import { usePersistentState, clearPersistedState } from '../../lib/usePersistentState';
import explainerText from './EXPLAINER.md?raw';
import ArgandPlane, {
  type Feed, type Handle, Z_COL, A1_COL, A0_COL, F_COL, FIX_COL,
} from './ArgandPlane';
import { buildCurve, CURVES, type CurveName } from './curves';
import {
  type Cx, type ArcLengthMap, cx, modulus, add, sub, scale,
  mulG, powRealG, affine, affineLoopAt, fixedPoint, arcLengthMap, formatRect, formatPolar,
} from './complexOps';

const STORAGE_KEY = 'argand';

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
 * split-complex numbers. Successor-in-progress to Plane Transform.
 */
export default function Argand() {
  const [z, setZ] = usePersistentState<Cx>(`${STORAGE_KEY}:z`, cx(1.5, 1));
  const [alpha1, setA1] = usePersistentState<Cx>(`${STORAGE_KEY}:a1`, cx(0.4, 0.8));
  const [alpha0, setA0] = usePersistentState<Cx>(`${STORAGE_KEY}:a0`, cx(1, 0));
  const [feed, setFeed] = usePersistentState<Feed>(`${STORAGE_KEY}:feed`, 'point');
  const [curveName, setCurveName] = usePersistentState<CurveName>(`${STORAGE_KEY}:curve`, 'flag');
  const [lockA1, setLockA1] = usePersistentState(`${STORAGE_KEY}:lockA1`, false);
  const [lockA0, setLockA0] = usePersistentState(`${STORAGE_KEY}:lockA0`, false);
  const [snapping, setSnapping] = usePersistentState(`${STORAGE_KEY}:snap`, true);
  const [gridOpacity, setGridOpacity] = usePersistentState(`${STORAGE_KEY}:gridOp`, 0.22);
  const [imageOpacity, setImageOpacity] = usePersistentState(`${STORAGE_KEY}:imgOp`, 0.5);
  const [showUnitCircle, setShowUnitCircle] = usePersistentState(`${STORAGE_KEY}:unit`, true);
  const [extent, setExtent] = usePersistentState(`${STORAGE_KEY}:extent`, 4);
  // Number system: p = j². p<0 complex, p=0 dual, p>0 split-complex.
  const [system, setSystem] = usePersistentState(`${STORAGE_KEY}:system`, -1);
  // Pen speed in math units / second (the same for every leg and feed).
  const [speed, setSpeed] = usePersistentState(`${STORAGE_KEY}:speed`, 2);
  const [viewFromFixed, setViewFromFixed] = usePersistentState(`${STORAGE_KEY}:vFix`, false);
  const [iterate, setIterate] = usePersistentState(`${STORAGE_KEY}:iter`, false);
  const [iterN, setIterN] = usePersistentState(`${STORAGE_KEY}:iterN`, 12);

  // Transient view state — never persisted.
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);

  const isPoint = feed === 'point';
  const isShape = feed === 'shape';
  const isGrid = feed === 'grid';
  const curve = useMemo(() => buildCurve(curveName), [curveName]);

  const fz = affine(z, alpha1, alpha0, system);
  const zStar = fixedPoint(alpha1, alpha0, system);

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
    return arcLengthMap(s => affineLoopAt(q, alpha1, alpha0, system, s), 144);
  }, [iterate, isPoint, iterN, zStar, isShape, isGrid, curve, z, alpha1, alpha0, system, extent]);

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

  // Three universal stops on the outgoing arc — the affine decomposition,
  // labeled per feed. (Play continues past f(z) back along the diagonal.)
  const stopLabels = isPoint
    ? ['z', 'α₁z', 'f(z)']
    : isShape
      ? ['Shape', 'Spun', 'Image']
      : ['Identity', 'Linear', 'Affine'];
  const stops = [{ label: stopLabels[0], t: 0 }, { label: stopLabels[1], t: 0.25 }, { label: stopLabels[2], t: 0.5 }];
  const atStop = (st: number): boolean => Math.abs(t - st) < 0.02;

  const subtitle = `f(z) = ${formatRect(fz)}   ·   ${systemName(system)}`;

  /* ---- the colored equation, shared by panel + readouts ---- */
  const Eqn = (
    <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 15, fontWeight: 700, marginTop: 2 }}>
      <span style={{ color: F_COL }}>f(z)</span> ={' '}
      <span style={{ color: A1_COL }}>α₁</span>·<span style={{ color: Z_COL }}>z</span> +{' '}
      <span style={{ color: A0_COL }}>α₀</span>
    </div>
  );

  /* ---- panels ---- */

  const functionNode = (
    <>
      {Eqn}
      <div style={{ marginTop: 8 }}>
        <ComplexInput label="α₁  (slope · spin & scale)" value={[alpha1.re, alpha1.im]} onChange={([re, im]) => setA1(cx(re, im))} />
        <Checkbox label="Lock α₁" checked={lockA1} onChange={setLockA1} />
      </div>
      <div style={{ marginTop: 8 }}>
        <ComplexInput label="α₀  (shift · intercept)" value={[alpha0.re, alpha0.im]} onChange={([re, im]) => setA0(cx(re, im))} />
        <Checkbox label="Lock α₀" checked={lockA0} onChange={setLockA0} />
      </div>
      <div style={{ marginTop: 8, fontSize: 12, fontFamily: 'var(--font-mono, monospace)', color: FIX_COL }}>
        fixed z* = {zStar ? formatRect(zStar) : '— (pure shift)'}
      </div>
      <Checkbox label="View from z* (recenter)" checked={viewFromFixed} onChange={setViewFromFixed} />
      <div style={{ fontSize: 11, color: 'var(--cp-fg-dim, #9b9ba3)', marginTop: 6 }}>
        Drag the <b style={{ color: A1_COL }}>α₁</b> (diamond) and <b style={{ color: A0_COL }}>α₀</b> (square) handles,
        or lock them to drag only <b style={{ color: Z_COL }}>z</b>. <b style={{ color: FIX_COL }}>z*</b> is where the map
        stands still: <code>f(z*) = z*</code> — viewed from there, <code>f</code> is a pure spiral.
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
      <Pills<Feed>
        label="Feed f"
        options={[{ value: 'point', label: 'Point' }, { value: 'shape', label: 'Shape' }, { value: 'grid', label: 'Grid' }]}
        value={feed}
        onChange={setFeed}
      />
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
            : <>Drag <b style={{ color: Z_COL }}>z</b> and watch <b style={{ color: F_COL }}>f(z)</b> = α₁·z + α₀.</>}
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
    { id: 'function', title: 'Function', arch: 'subject', node: functionNode, estHeight: 280 },
    { id: 'system', title: 'System', arch: 'domain', node: systemNode, estHeight: 170 },
    { id: 'input', title: 'Input', arch: 'subject', node: inputNode, estHeight: 180 },
    { id: 'plane', title: 'Plane', arch: 'domain', node: planeNode, estHeight: 180 },
    { id: 'scrub', title: 'Play', arch: 'playback', node: scrubNode, estHeight: 250 },
    { id: 'values', title: 'Values', arch: 'readout', node: valuesNode, estHeight: 220 },
    { id: 'detail', title: 'Detail', arch: 'quality', node: detailNode, estHeight: 90 },
  ];

  const onHandleChange = (which: Handle, q: Cx) => {
    if (which === 'z') setZ(q);
    else if (which === 'alpha1') setA1(q);
    else setA0(q);
  };

  // The number-system control lives as a floating pill pinned bottom-center of
  // the plot (just above the Play action pill) — a persistent home that, unlike
  // the top bar, never competes for space and survives fullscreen.
  const sysSnap = (label: string, val: number) => (
    <button
      onClick={() => setSystem(val)}
      style={{
        padding: '3px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600, cursor: 'pointer',
        border: '1px solid var(--border, #3a3a44)',
        background: Math.abs(system - val) < 0.001 ? 'var(--accent, #34d399)' : 'transparent',
        color: Math.abs(system - val) < 0.001 ? 'var(--accent-fg, #0c0c10)' : 'var(--fg, #e8e8ee)',
      }}
    >{label}</button>
  );
  const systemControl = (
    <div
      style={{
        position: 'absolute', left: '50%', bottom: 66, transform: 'translateX(-50%)',
        display: 'flex', alignItems: 'center', gap: 8, zIndex: 6,
        padding: '6px 12px', borderRadius: 999, whiteSpace: 'nowrap',
        background: 'var(--panel, rgba(18,18,24,0.92))', border: '1px solid var(--border, #3a3a44)',
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', boxShadow: 'var(--shadow)',
        fontFamily: 'var(--font-mono, monospace)',
      }}
      title={systemName(system)}
    >
      <span style={{ fontSize: 11, color: 'var(--dim, #9b9ba3)' }}>j²</span>
      <input type="range" min={-1} max={1} step={0.05} value={system}
        onChange={e => setSystem(parseFloat(e.target.value))}
        style={{ width: 96, accentColor: 'var(--accent, #34d399)' }} />
      {sysSnap('Complex', -1)}{sysSnap('Dual', 0)}{sysSnap('Split', 1)}
    </div>
  );

  const views: ViewDef[] = [
    {
      id: 'plane',
      title: 'Argand plane',
      defaultRect: { x: 320, y: 16, w: 660, h: 600 },
      hint: 'drag z · α₁ · α₀ · pinch or scroll to zoom · two-finger or shift-drag to pan · double-click to recenter',
      node: (
        <div style={{ position: 'absolute', inset: 0 }}>
          <ArgandPlane
            z={z} alpha1={alpha1} alpha0={alpha0} p={system}
            feed={feed} curve={curve} t={t} playing={playing}
            lockA1={lockA1} lockA0={lockA0}
            snapping={snapping} gridOpacity={gridOpacity} imageOpacity={imageOpacity} showUnitCircle={showUnitCircle}
            viewFromFixed={viewFromFixed} iterate={iterate} iterN={iterN}
            extent={extent}
            onChange={onHandleChange}
            onZoom={f => setExtent(e => Math.min(16, Math.max(1, e * f)))}
          />
          {systemControl}
        </div>
      ),
    },
  ];

  const layouts: LayoutDef[] = [
    {
      id: 'essentials', name: 'Essentials', sub: 'Function · Play · Values', icon: 'tune',
      open: { function: { x: 24, y: 18 }, scrub: { x: 24, y: 320 }, values: { x: 24, y: 580 } },
    },
  ];

  const actions: ActionDef[] = [
    {
      id: 'play', icon: playing ? 'pause' : 'play', label: playing ? 'Pause' : 'Play',
      onClick: togglePlay, active: playing, primary: true, sectionId: 'scrub',
    },
    {
      id: 'reset', icon: 'reset', label: 'To z',
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
      immersive
      modes={[{ id: 'point', label: 'Point' }, { id: 'shape', label: 'Shape' }, { id: 'grid', label: 'Grid' }]}
      activeMode={feed}
      onModeChange={id => setFeed(id as Feed)}
      layouts={layouts}
      defaultLayoutId="essentials"
      explainer={explainerText || null}
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
