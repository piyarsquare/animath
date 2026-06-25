import React, { useState, useEffect, useRef } from 'react';
import Canvas3D from './Canvas3D';
import { Scheme } from '../chrome/Scheme';
import { Slider, Pills, Select, Checkbox, RangeSlider } from './ControlPanel';
import { usePhone } from '../chrome/usePhone';
import Workspace from '../chrome/workspace/Workspace';
import type { LayoutDef, SectionDef, ViewDef } from '../chrome/workspace/types';
import QuarterTurnControls from '../controls/QuarterTurnControls';
import type { TurnItem, AxisLetter } from '../controls/QuarterTurnControls';
import { COMPLEX_PARTICLES_DEFAULTS } from '../config/defaults';
import { planes, Plane } from '../math/constants';
import { clearPersistedState } from '../lib/usePersistentState';
import {
  ColorStyle, ColorBy, ColorQuantity, colormapNames,
  SamplePattern, samplePatternNames, JitterMode, AXIS_COLORS,
  shapeNames, textureNames, motionModes, renderModes,
  useGestureRotation,
} from '../lib/particles';
import type { ParticleState, ViewAxis } from '../lib/particles';
import type { useViewControls } from '../lib/particles';
import { ProjectionMode } from '../lib/viewpoint';

const R = COMPLEX_PARTICLES_DEFAULTS.ranges;

/** Format an orientation-matrix entry to a fixed width so the monospace columns
 *  don't reflow as signs flip: a leading non-breaking space stands in for the
 *  minus on non-negative values, so every cell is the same length. (Also folds
 *  "-0.00" down to "0.00".) */
function fmtMatrixCell(v: number): string {
  let s = v.toFixed(2);
  if (s === '-0.00') s = '0.00';
  return s.startsWith('-') ? s : ` ${s}`;
}

export interface ParticleViewerShellProps {
  /** Workspace/persistence id (e.g. 'complex-particles'). */
  appId: string;
  state: ParticleState;
  controls: ReturnType<typeof useViewControls>;
  onMount: (ctx: {
    scene: import('three').Scene;
    camera: import('three').PerspectiveCamera;
    renderer: import('three').WebGLRenderer;
  }) => void | (() => void);
  functionName: string;
  functionFormula: string;
  functionPicker: React.ReactNode;
  /** Always-available top-bar control (e.g. a compact function dropdown), so
   *  switching functions never requires opening a panel. */
  topExtra?: React.ReactNode;
  /** Extra controls appended to the Function panel (e.g. per-function params). */
  variantExtras?: React.ReactNode;
  /** Extra controls appended to the Domain panel (e.g. the branch range). */
  domainExtras?: React.ReactNode;
  readme: string;
  /** Markdown explainer for the top-bar "?" popup (shown above the readme). */
  explainer?: string;
  /** localStorage namespace whose saved settings the "Reset settings" action
   *  clears. Omit on ephemeral viewers to hide the button. */
  settingsStorageKey?: string;
  /** Chrome-less applet mode (#/embed/…, docs/EMBEDS.md): render only the
   *  view with a corner badge — no workspace, no panels, no top bar. */
  embed?: { caption?: string; controls: boolean; buttons?: import('../lib/embedParams').EmbedButton[] };
}

export default function ParticleViewerShell({
  appId, state, controls, onMount,
  functionName, functionFormula, functionPicker, topExtra, variantExtras, domainExtras, readme, explainer,
  settingsStorageKey, embed,
}: ParticleViewerShellProps) {
  const gestures = useGestureRotation(state);
  const phone = usePhone();

  // Hopf/Torus projections are nonlinear in the 4D coordinates, so a 4D plane
  // rotation before the map deforms the image. In those modes the turn/spin
  // controls instead orbit the ambient 3D view (Yaw/Pitch/Roll of the camera),
  // which stays rigid; the six 4D planes return in the linear projections.
  // A drop axis overrides viewType with a linear Drop projection, so only treat
  // the view as Hopf/Torus when no drop axis is active.
  const ambient = state.dropAxis === 'None'
    && (state.viewType === ProjectionMode.Hopf || state.viewType === ProjectionMode.Torus);

  // Continuous "spinners": each `${id}:${dir}` key that is on feeds a constant
  // angular increment every frame — into controls.rotateBy (4D) or
  // controls.orbitBy (ambient view). Multiple active spins compose. This is
  // transient view state, so it lives here (not in persisted ParticleState).
  const [spins, setSpins] = useState<Record<string, boolean>>({});
  const [spinSpeed, setSpinSpeed] = useState(1.2); // rad/s
  const spinsRef = useRef(spins);
  const speedRef = useRef(spinSpeed);
  const ambientRef = useRef(ambient);
  const controlsRef = useRef(controls);
  spinsRef.current = spins;
  speedRef.current = spinSpeed;
  ambientRef.current = ambient;
  controlsRef.current = controls;
  const anySpin = Object.values(spins).some(Boolean);

  useEffect(() => {
    if (!anySpin) return;
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const active = spinsRef.current;
      const c = controlsRef.current;
      for (const key in active) {
        if (!active[key]) continue;
        const sep = key.indexOf(':');
        const id = key.slice(0, sep);
        const dir = Number(key.slice(sep + 1));
        const delta = dir * speedRef.current * dt;
        if (ambientRef.current) c.orbitBy(id as ViewAxis, delta);
        else c.rotateBy(id as Plane, delta);
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [anySpin]);

  // Switching between the 4D-plane and ambient-view controls clears any running
  // spin so a spin of the wrong kind can't linger without a visible toggle.
  useEffect(() => { setSpins({}); }, [ambient]);

  const toggleSpin = (id: string, dir: 1 | -1) => {
    const key = `${id}:${dir}`;
    // Activating a spin switches Motion to Fixed so the continuous rotation
    // shows directly, rather than stacking on top of the Quaternion auto-tumble.
    if (!spins[key] && state.viewMotion !== 'Fixed') controls.handleMotion('Fixed');
    setSpins(s => ({ ...s, [key]: !s[key] }));
  };

  // Touching the projection knob stabilizes the view first: stop every running
  // spin so the morph isn't fighting a per-frame 4D rotation (which sweeps a
  // steep function's projection singularity across the grid frame after frame —
  // the worst case for the GPU). handleProjMix already releases any drop axis.
  const handleProjMix = (v: number) => {
    if (anySpin) setSpins({});
    controls.handleProjMix(v);
  };

  const handleTurn = (id: string, dir: 1 | -1) => {
    if (ambient) controls.orbitTurn(id as ViewAxis, dir);
    else controls.turn(id as Plane, dir);
  };

  // Toggling the ± lock seeds the other representation so the view doesn't jump:
  // unlocking copies the symmetric extents into min/max; re-locking collapses the
  // (possibly off-center) window back to a symmetric half-width.
  const onBoundsLockChange = (locked: boolean) => {
    if (locked) {
      state.setExtentX((state.xMax - state.xMin) / 2);
      state.setExtentY((state.yMax - state.yMin) / 2);
    } else {
      state.setXMin(-state.extentX);
      state.setXMax(state.extentX);
      state.setYMin(-state.extentY);
      state.setYMax(state.extentY);
    }
    state.setBoundsLock(locked);
  };

  const axisColor = (letter: AxisLetter) => {
    const key = letter.toLowerCase() as 'x' | 'y' | 'u' | 'v';
    return `hsl(${((AXIS_COLORS[key] + state.hueShift) % 1) * 360},100%,60%)`;
  };

  const turnItems: TurnItem[] = ambient
    ? [
        { id: 'Yaw', label: 'Yaw', cwLabel: 'yaw right (orbit view)', ccwLabel: 'yaw left (orbit view)' },
        { id: 'Pitch', label: 'Pitch', cwLabel: 'pitch up (orbit view)', ccwLabel: 'pitch down (orbit view)' },
        { id: 'Roll', label: 'Roll', cwLabel: 'roll clockwise (orbit view)', ccwLabel: 'roll counter-clockwise (orbit view)' },
      ]
    : planes.map(p => {
        const [a, b] = [p[0] as AxisLetter, p[1] as AxisLetter];
        return {
          id: p,
          label: (
            <span className="qtc-plane">
              <span style={{ color: axisColor(a) }}>{a}</span>
              <span style={{ color: axisColor(b) }}>{b}</span>
            </span>
          ),
          cwLabel: `${p} clockwise`,
          ccwLabel: `${p} counter-clockwise`,
        };
      });

  /* ---- archetype panels (DESIGN-SPEC §3; rows unchanged from the old drawer) ---- */

  const functionNode = (
    <>
      {functionPicker}
      {variantExtras}
    </>
  );

  const domainNode = (
    <>
      <Pills
        label="Units"
        options={[
          { value: 1, label: '×1' },
          { value: Math.PI, label: '×π' },
        ]}
        value={state.axisScale}
        onChange={state.setAxisScale}
      />
      <Select
        label="Sampling"
        options={samplePatternNames.map((name, i) => ({ value: i as SamplePattern, label: name }))}
        value={state.samplePattern}
        onChange={state.setSamplePattern}
      />
      <Checkbox
        label="Reciprocal sampling (inside ↔ outside |z|=1)"
        checked={state.reciprocal}
        onChange={state.setReciprocal}
      />
      {/* Adaptive density redistributes the samples by |f′(z)| — a sampling
          choice, so it lives here with the rest of the domain sampling. */}
      <Checkbox
        label="Adaptive density (sample where stretched)"
        checked={state.adaptive}
        onChange={state.setAdaptive}
      />
      {state.adaptive && (
        <Slider label="Sharpness (α)" value={state.adaptiveAlpha}
          min={R.adaptiveAlpha.min} max={R.adaptiveAlpha.max} step={R.adaptiveAlpha.step}
          onChange={state.setAdaptiveAlpha} format={v => v.toFixed(1)} />
      )}
      <Checkbox
        label="± symmetric bounds"
        checked={state.boundsLock}
        onChange={onBoundsLockChange}
      />
      {state.boundsLock ? (
        <>
          <Slider label="X extent (±)" value={state.extentX}
            min={R.extent.min} max={R.extent.max} step={R.extent.step}
            onChange={state.setExtentX}
            format={v => state.axisScale === 1 ? v.toFixed(1) : `${v.toFixed(1)}π`} />
          <Slider label="Y extent (±)" value={state.extentY}
            min={R.extent.min} max={R.extent.max} step={R.extent.step}
            onChange={state.setExtentY}
            format={v => state.axisScale === 1 ? v.toFixed(1) : `${v.toFixed(1)}π`} />
        </>
      ) : (
        <>
          <RangeSlider
            label="X range"
            min={-R.extent.max} max={R.extent.max} step={R.extent.step}
            valueMin={state.xMin} valueMax={state.xMax}
            onChange={(lo, hi) => { state.setXMin(lo); state.setXMax(hi); }}
            format={v => state.axisScale === 1 ? v.toFixed(1) : `${v.toFixed(1)}π`}
          />
          <RangeSlider
            label="Y range"
            min={-R.extent.max} max={R.extent.max} step={R.extent.step}
            valueMin={state.yMin} valueMax={state.yMax}
            onChange={(lo, hi) => { state.setYMin(lo); state.setYMax(hi); }}
            format={v => state.axisScale === 1 ? v.toFixed(1) : `${v.toFixed(1)}π`}
          />
        </>
      )}
      {domainExtras}
    </>
  );

  // The projection slider's value readout: name the detents, narrate the morphs.
  const fmtProjMix = (v: number) =>
    v <= 0.02 ? 'Perspective'
      : Math.abs(v - 1) <= 0.02 ? 'Torus'
        : v >= 1.98 ? 'Sphere'
          : v < 1 ? `→ Torus ${Math.round(v * 100)}%`
            : `→ Sphere ${Math.round((v - 1) * 100)}%`;

  const cameraNode = (
    <>
      {/* One slider, three worlds: Perspective ⇠ Torus ⇢ Sphere (the Hopf
          view). The stops are sticky and labeled; fractional positions are
          live GPU morphs, and the 4D axis cross fades out toward the torus,
          where the scaffold becomes the reference frame. */}
      <Slider
        label="Projection"
        value={state.projMix}
        min={0} max={2} step={0.01}
        onChange={handleProjMix}
        format={fmtProjMix}
        stops={[
          { value: 0, label: 'Perspective' },
          { value: 1, label: 'Torus' },
          { value: 2, label: 'Sphere' },
        ]}
      />
      {(state.viewType === ProjectionMode.Torus || state.viewType === ProjectionMode.Hopf) && (
        <Checkbox
          label="Reference scaffold"
          checked={state.showScaffold}
          onChange={state.setShowScaffold}
        />
      )}
      <Pills
        label="Motion"
        options={motionModes.map(m => ({ value: m, label: m }))}
        value={state.viewMotion}
        onChange={controls.handleMotion}
      />
      {/* How a drag tumbles the camera. Turntable (default) is the bounded
          orbit — up stays up, elevation clamps at the poles — so the scene is
          easy to recenter by hand; Free is the unbounded trackball that tumbles
          past the poles and can roll. */}
      <Pills
        label="Orbit"
        options={[
          { value: 'turntable', label: 'Turntable' },
          { value: 'free', label: 'Free' },
        ]}
        value={state.orbitMode}
        onChange={state.setOrbitMode}
      />
      {/* Desktop pans with modifiers (right-drag, held Space, Shift), so the
          drag-mode toggle only exists on phone, where one-finger drag must
          choose (two-finger drag always pans there). */}
      {phone ? (
        <Pills
          label="Drag"
          options={[
            { value: 'orbit', label: 'Orbit' },
            { value: 'pan', label: 'Pan' },
          ]}
          value={state.dragMode}
          onChange={state.setDragMode}
        />
      ) : (
        <div style={{ fontSize: 11, color: 'var(--cp-fg-dim, #9b9ba3)', margin: '2px 0 4px' }}>
          Drag orbits · right-drag, Space+drag or Shift+drag pans · wheel zooms
        </div>
      )}
      <Slider
        label="Distance"
        value={state.cameraZ}
        min={R.cameraZ.min} max={R.cameraZ.max} step={R.cameraZ.step}
        onChange={state.setCameraZ}
        format={v => v.toFixed(1)}
      />
      <Slider label="Axis width" value={state.axisWidth}
        min={R.axisWidth.min} max={R.axisWidth.max} step={R.axisWidth.step}
        onChange={state.setAxisWidth} format={v => v.toFixed(1)} />
    </>
  );

  const colorNode = (
    <>
      <Pills
        label="Color by"
        options={[
          { value: ColorBy.Domain, label: 'Domain' },
          { value: ColorBy.Range, label: 'Range' },
        ]}
        value={state.colorBy}
        onChange={state.setColorBy}
      />
      <Select
        label="Colormap"
        options={colormapNames.map((name, i) => ({ value: i, label: name }))}
        value={state.colormap}
        onChange={state.setColormap}
      />
      {/* Which quantity the color represents — drives the colormap axis, or
          the hue of the HSV Phase wheel. */}
      <Select
        label="Quantity"
        options={[
          { value: ColorQuantity.Phase, label: 'Phase (arg)' },
          { value: ColorQuantity.Modulus, label: 'Magnitude (|·|)' },
          { value: ColorQuantity.Real, label: 'Real part' },
          { value: ColorQuantity.Imag, label: 'Imag part' },
        ]}
        value={state.colorQuantity}
        onChange={state.setColorQuantity}
      />
      <Select
        label="Brightness"
        options={[
          { value: ColorQuantity.Modulus, label: 'Magnitude (|·|)' },
          { value: ColorQuantity.Uniform, label: 'Uniform (flat)' },
          { value: ColorQuantity.Phase, label: 'Phase (arg)' },
          { value: ColorQuantity.Real, label: 'Real part' },
          { value: ColorQuantity.Imag, label: 'Imag part' },
        ]}
        value={state.brightnessQuantity}
        onChange={state.setBrightnessQuantity}
      />
      {/* Style + Hue shift only affect the HSV Phase wheel; sequential
          colormaps show their Repeat (log bands) control instead. */}
      {state.colormap === 0 ? (
        <>
          <Pills
            label="Style"
            options={Object.keys(ColorStyle)
              .filter(k => isNaN(Number(k)))
              .map(k => ({ value: ColorStyle[k as keyof typeof ColorStyle], label: k }))}
            value={state.colorStyle}
            onChange={state.setColorStyle}
          />
          <Slider label="Hue shift" value={state.hueShift}
            min={R.hueShift.min} max={R.hueShift.max} step={R.hueShift.step}
            onChange={state.setHueShift} format={v => v.toFixed(2)} />
        </>
      ) : (
        <Slider label="Repeat (log bands)" value={state.colorRepeat}
          min={0} max={4} step={0.05}
          onChange={state.setColorRepeat}
          format={v => v === 0 ? 'off' : v.toFixed(2)} />
      )}
      <Slider label="Saturation" value={state.saturation}
        min={R.saturation.min} max={R.saturation.max} step={R.saturation.step}
        onChange={state.setSaturation} format={v => v.toFixed(2)} />
    </>
  );

  // One merged Render panel: how the sampled graph is drawn. The mode pills
  // lead; mode-specific rows follow; the controls every mode shares (opacity,
  // intensity, background) close the panel — stated once, not per mode.
  const isPoints = state.renderMode === 'Points';
  const isSheet = state.renderMode === 'Sheet';
  const isTiles = state.renderMode === 'Tiles';
  const isNet = state.renderMode === 'Net';

  const renderNode = (
    <>
      <Pills
        label="Render"
        options={renderModes.map(m => ({ value: m, label: m }))}
        value={state.renderMode}
        onChange={state.setRenderMode}
      />
      {isPoints && (
        <>
          <Slider label="Particle count" value={state.particleCount}
            min={R.particleCount.min} max={R.particleCount.max} step={R.particleCount.step}
            onChange={state.setParticleCount} format={v => `${(v / 1000).toFixed(0)}k`} />
          <Slider label="Size" value={state.size}
            min={R.size.min} max={R.size.max} step={R.size.step}
            onChange={state.setSize} format={v => v.toFixed(1)} />
          <Select label="Shape"
            options={shapeNames.map((s, i) => ({ value: i, label: s }))}
            value={state.shapeIndex} onChange={state.setShapeIndex} />
          <Select label="Texture"
            options={textureNames.map((t, i) => ({ value: i, label: t }))}
            value={state.textureIndex} onChange={state.setTextureIndex} />
        </>
      )}
      {isSheet && (
        <>
          <Checkbox label="Filled sheet"
            checked={state.sheetFill} onChange={state.setSheetFill} />
          <Checkbox label="Wireframe"
            checked={state.sheetWire} onChange={state.setSheetWire} />
        </>
      )}
      {(isSheet || isTiles) && (
        <Slider label="Resolution" value={state.sheetResolution}
          min={8} max={500} step={1}
          onChange={state.setSheetResolution} format={v => `${v}²`} />
      )}
      {isTiles && (
        <Slider label="Tile size" value={state.tileSize}
          min={0.02} max={2} step={0.01}
          onChange={state.setTileSize} format={v => v.toFixed(2)} />
      )}
      {isSheet && (
        <>
          <Checkbox label="Adaptive (points where stretched)"
            checked={state.sheetAdaptive} onChange={state.setSheetAdaptive} />
          {state.sheetAdaptive && (
            <Slider label="Density" value={state.sheetDensity}
              min={0.05} max={3} step={0.05}
              onChange={state.setSheetDensity} format={v => v.toFixed(2)} />
          )}
        </>
      )}
      {isNet && (
        <>
          <Checkbox label="Circles (constant |z|)"
            checked={state.netCircles} onChange={state.setNetCircles} />
          {state.netCircles && (
            <Slider label="Circles" value={state.netRings}
              min={1} max={250} step={1}
              onChange={state.setNetRings} format={v => `${v}`} />
          )}
          <Checkbox label="Rays (constant arg z)"
            checked={state.netRays} onChange={state.setNetRays} />
          {state.netRays && (
            <Slider label="Rays" value={state.netSpokes}
              min={2} max={96} step={1}
              onChange={state.setNetSpokes} format={v => `${v}`} />
          )}
          <Slider label="Width" value={state.netWidth}
            min={0.5} max={16} step={0.5}
            onChange={state.setNetWidth} format={v => `${v.toFixed(1)}px`} />
          <Slider label="Resolution" value={state.netResolution}
            min={16} max={400} step={1}
            onChange={state.setNetResolution} format={v => `${v}`} />
        </>
      )}
      {(isSheet || isTiles) && (
        <>
          <Slider label="Shading" value={state.sheetShade}
            min={0} max={1} step={0.01}
            onChange={state.setSheetShade} format={v => v.toFixed(2)} />
          <Checkbox label="External light (inside/outside)"
            checked={state.lighting} onChange={state.setLighting} />
          {state.lighting && (
            <Slider label="Light" value={state.lightStrength}
              min={0} max={1} step={0.01}
              onChange={state.setLightStrength} format={v => v.toFixed(2)} />
          )}
        </>
      )}
      <Slider label="Opacity" value={state.opacity}
        min={R.opacity.min} max={R.opacity.max} step={R.opacity.step}
        onChange={state.setOpacity} format={v => v.toFixed(2)} />
      <Slider label="Intensity" value={state.intensity}
        min={R.intensity.min} max={R.intensity.max} step={R.intensity.step}
        onChange={state.setIntensity} format={v => v.toFixed(2)} />
      <Checkbox label="Light background"
        checked={state.objectMode} onChange={state.setObjectMode} />
    </>
  );

  const motionNode = (
    <>
      <Slider label="Shimmer" value={state.shimmer}
        min={R.shimmer.min} max={R.shimmer.max} step={R.shimmer.step}
        onChange={state.setShimmer} format={v => v.toFixed(2)} />
      <Slider label="Jitter" value={state.jitter}
        min={R.jitter.min} max={R.jitter.max} step={R.jitter.step}
        onChange={state.setJitter} format={v => v.toFixed(3)} />
      <Pills
        label="Jitter mode"
        options={[
          { value: JitterMode.Scatter, label: 'Scatter' },
          { value: JitterMode.Fuzz, label: 'Fuzz' },
        ]}
        value={state.jitterMode}
        onChange={state.setJitterMode}
      />
    </>
  );

  const rotateNode = (
    <>
      <QuarterTurnControls
        items={turnItems}
        onTurn={handleTurn}
        spins={spins}
        onToggleSpin={toggleSpin}
        onStopAllSpins={() => setSpins({})}
        spinSpeed={spinSpeed}
        onSpinSpeedChange={setSpinSpeed}
        onReset={controls.snapToStandardView}
        getAxisColor={axisColor}
        dropAxis={state.dropAxis}
        onDropAxisChange={controls.handleDropAxis}
      />
      {/* Live orientation readout — the projected images of the four basis
          vectors. It belongs beside the controls that change it. */}
      <table className="cp-orient-matrix">
        <thead>
          <tr>
            {(['x', 'y', 'v', 'u'] as const).map(k => (
              <th
                key={k}
                style={{ color: `hsl(${((AXIS_COLORS[k] + state.hueShift) % 1) * 360},100%,55%)` }}
              >{k}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {state.orientationMatrix.map((row, i) => (
            <tr key={i}>
              {row.map((v, j) => <td key={j}>{fmtMatrixCell(v)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );

  // What used to be the Detail panel: particle count moved to Render, the
  // adaptive sampling to Domain, axis width to Camera and the orientation
  // matrix to 4D Rotation — leaving only the system escape hatch.
  const systemNode = settingsStorageKey ? (
    <button
      className="qtc-reset"
      style={{ marginTop: 4 }}
      onClick={() => {
        if (!window.confirm('Reset all settings to their defaults? This clears your saved settings and reloads the page.')) return;
        clearPersistedState(settingsStorageKey);
        window.location.reload();
      }}
      title="Forget saved settings and restore the defaults"
    >
      Reset settings to defaults
    </button>
  ) : null;

  const sections: SectionDef[] = [
    { id: 'function', title: 'Function', arch: 'subject', node: functionNode, estHeight: 200 },
    { id: 'domain', title: 'Domain', arch: 'domain', node: domainNode, estHeight: 540 },
    { id: 'camera', title: 'Camera', arch: 'view', node: cameraNode, estHeight: 340 },
    { id: 'color', title: 'Color', arch: 'color', node: colorNode, estHeight: 380 },
    { id: 'render', title: 'Render', arch: 'marks', node: renderNode, estHeight: 400 },
    { id: 'motion', title: 'Motion', arch: 'motion', node: motionNode, estHeight: 210 },
    { id: 'rotate', title: '4D Rotation', arch: 'drive', node: rotateNode, estHeight: 470 },
    ...(systemNode
      ? [{ id: 'system', title: 'System', arch: 'quality' as const, node: systemNode, estHeight: 90 }]
      : []),
  ];

  const views: ViewDef[] = [
    {
      id: 'plot',
      title: 'f(z) · particle cloud',
      defaultRect: { x: 372, y: 16, w: 712, h: 628 },
      hint: 'drag to orbit · two fingers or Shift-drag to pan · scroll to zoom',
      node: (
        // The particle cloud is an additive-glow stage → force dark (theming v2):
        // its clear color resolves the theme's dark --viz-bg; the domain rainbow
        // (the hue colormap) is kept.
        <Scheme mode="dark" style={{ position: 'absolute', inset: 0 }}>
          <div style={{ position: 'absolute', inset: 0, touchAction: 'none' }} {...gestures}>
            <Canvas3D onMount={onMount} />
          </div>
        </Scheme>
      ),
    },
  ];

  // Task-shaped "postures" (decomposition plan, 2026-06-16): each layout is one
  // job, not a panel dump. The default lands calm — one quiet posture with the
  // plot left clear — and the full cockpit stays one click away in the other
  // postures and the auto-appended Everything layout ("hide, keep power").
  //
  // Second panels sit in the canonical second column (x:356 = WS_RAIL + one
  // PANEL_W column), never out at the right edge: a panel there stays onstage
  // down to a ~624px stage, i.e. across the whole desktop range (narrower than
  // that re-chromes to phone at 740px), so no posture can push a control
  // off-stage on tablet-width desktops.
  const layouts: LayoutDef[] = [
    {
      // The calm default: only Color opens (Domain/Range), parked in the left
      // gutter; the plot is left completely clear and the auto-tumble does the
      // 4D work. The cockpit (4D rig, render variety, projection morph) is one
      // posture away — nothing is removed, only tucked behind a click.
      id: 'single', name: 'Single Function', sub: 'One graph, seen plainly', icon: 'fx',
      open: { color: { x: 84, y: 18 } },
    },
    {
      // The four ways to draw the same graph: Points · Sheet · Tiles · Net.
      id: 'represent', name: 'Representations', sub: 'Points · Sheet · Tiles · Net', icon: 'layers',
      open: { render: { x: 84, y: 18 }, color: { x: 356, y: 18 } },
    },
    {
      // The six 4D plane-turns are the star here — the only posture that opens
      // the 4D Rotation rig over the plot on purpose.
      id: 'basis', name: 'Change of Basis', sub: 'The six 4D plane-turns', icon: 'rotate',
      open: { camera: { x: 84, y: 18 }, rotate: { x: 356, y: 18 } },
    },
    {
      // The projection slider (Perspective → Torus → Sphere) is the whole show;
      // keep the plot clear so the fiber collapse is legible.
      id: 'hopf', name: 'Hopf & Projection', sub: 'Perspective → Torus → Sphere', icon: 'orbit',
      open: { camera: { x: 84, y: 18 } },
    },
    {
      // The mapping z → f(z): Net + Motion watch the domain net sweep into the
      // image (Domain coloring carries each point's identity across). The Phase-2
      // three-hats review found a domain|image split *here* would duplicate the
      // Plane Transform app, so the linked plane map lives there — one click away
      // via the top-bar "↗ plane map" handoff. Named "z → f(z)", not "Rays":
      // "rays" already means polar spokes (Net mode, Plane Transform). Id stays
      // 'rays' to keep saved layouts stable.
      id: 'rays', name: 'z → f(z)', sub: 'Watch the domain net sweep to its image', icon: 'waves',
      open: { render: { x: 84, y: 18 }, motion: { x: 356, y: 18 } },
    },
  ];

  // The "?" modal carries both the short explainer and the full About readme,
  // so nothing from the old drawer's About section is lost.
  const help = [explainer, readme].filter(Boolean).join('\n\n---\n\n');

  // Embed mode: the same engine, none of the chrome. The badge links back to
  // the full workspace so an applet is always one tap from the real app.
  if (embed) {
    // Overlay buttons (buttons= param): drop-axis projections are static
    // reads, Rotate returns to the full 4D view with the quaternion tumble.
    const embedButton = (b: import('../lib/embedParams').EmbedButton) => {
      if (b === 'rotate') {
        return {
          label: 'Rotate',
          on: state.dropAxis === 'None' && state.viewMotion === 'Quaternion',
          onClick: () => { controls.handleDropAxis('None'); controls.handleMotion('Quaternion'); },
        };
      }
      const axis = b.slice(-1).toUpperCase();
      const drop = `Drop${axis}` as typeof state.dropAxis;
      return {
        label: `Drop ${axis}`,
        on: state.dropAxis === drop,
        onClick: () => { controls.handleDropAxis(drop); controls.handleMotion('Fixed'); },
      };
    };
    return (
      <div className="am-embed">
        <div className="am-embed-view">
          <Scheme mode="dark" style={{ position: 'absolute', inset: 0 }}>
            <div
              style={{ position: 'absolute', inset: 0, touchAction: 'none' }}
              {...(embed.controls ? gestures : {})}
            >
              <Canvas3D onMount={onMount} />
            </div>
          </Scheme>
          {embed.buttons && embed.buttons.length > 0 && (
            <div className="am-embed-buttons">
              {embed.buttons.map(b => {
                const { label, on, onClick } = embedButton(b);
                return (
                  <button key={b} className={`am-embed-btn ${on ? 'am-on' : ''}`} onClick={onClick}>
                    {label}
                  </button>
                );
              })}
            </div>
          )}
          <a
            className="am-embed-badge"
            href={`${import.meta.env.BASE_URL}#/${appId}`}
            target="_blank"
            rel="noreferrer"
            title="Open in animath"
          >
            animath ⧉
          </a>
        </div>
        {embed.caption && <div className="am-embed-caption">{embed.caption}</div>}
      </div>
    );
  }

  return (
    <Workspace
      appId={appId}
      title={functionName}
      subtitle={functionFormula}
      sections={sections}
      views={views}
      layouts={layouts}
      defaultLayoutId="single"
      explainer={help || null}
      titlePanel="function"
      topExtra={topExtra}
      layoutCaptions
    />
  );
}

export { ProjectionMode };
