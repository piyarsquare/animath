import React, { useState, useEffect, useRef } from 'react';
import Canvas3D from './Canvas3D';
import Readme from './Readme';
import { Section, Slider, Pills, Select, Checkbox, RangeSlider } from './ControlPanel';
import { ShellSettings, ShellActions, useAppHeader, useAppExplainer } from './AppShell';
import QuarterTurnControls from '../controls/QuarterTurnControls';
import type { TurnItem, AxisLetter } from '../controls/QuarterTurnControls';
import { COMPLEX_PARTICLES_DEFAULTS } from '../config/defaults';
import { useResponsive } from '../styles/responsive';
import { planes, Plane } from '../math/constants';
import { clearPersistedState } from '../lib/usePersistentState';
import {
  ColorStyle, ColourBy, ColourQuantity, CoordMode, coordModeNames, JitterMode, AXIS_COLORS,
  shapeNames, textureNames, viewTypes, motionModes,
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
  return s.startsWith('-') ? s : ` ${s}`;
}

export interface ParticleViewerShellProps {
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
  /** Extra controls appended to the Function section (e.g. per-function params). */
  variantExtras?: React.ReactNode;
  /** Extra controls appended to the Domain section (e.g. the branch range). */
  domainExtras?: React.ReactNode;
  readme: string;
  /** Markdown explainer for the top-bar "?" help popup. */
  explainer?: string;
  /** localStorage namespace whose saved settings the "Reset settings" action
   *  clears. Omit on ephemeral viewers to hide the button. */
  settingsStorageKey?: string;
}

export default function ParticleViewerShell({
  state, controls, onMount,
  functionName, functionFormula, functionPicker, variantExtras, domainExtras, readme, explainer,
  settingsStorageKey,
}: ParticleViewerShellProps) {
  const { isMobile, isTablet } = useResponsive();
  const compact = isMobile || isTablet;
  const gestures = useGestureRotation(state);

  useAppHeader(functionName, functionFormula);
  useAppExplainer(explainer ?? null);

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
  // transient view state, so it lives here (not in persisted ParticleState),
  // and above <ShellActions> so the drawer + floater copies stay in sync.
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

  const handleTurn = (id: string, dir: 1 | -1) => {
    if (ambient) controls.orbitTurn(id as ViewAxis, dir);
    else controls.turn(id as Plane, dir);
  };

  // "Hopf study": the one-tap preset for reading the Hopf sphere. The 4D
  // spinner/rotation is applied *before* the Hopf map, which remixes input and
  // output and breaks the z/f reading, so this forces the Hopf projection,
  // freezes the motion, stops any spins, and snaps the 4D orientation back to
  // identity — leaving latitude = |z|/|f| and longitude = arg(z) − arg(f) intact.
  const enterHopfStudy = () => {
    controls.handleViewType(ProjectionMode.Hopf);
    controls.handleMotion('Fixed');
    setSpins({});
    controls.snapToStandardView();
  };

  // Toggling the ± lock seeds the other representation so the view doesn't jump:
  // unlocking copies the symmetric extents into min/max; re-locking collapses the
  // (possibly off-centre) window back to a symmetric half-width.
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

  return (
    <>
      <div
        style={{ position: 'absolute', inset: 0, touchAction: 'none' }}
        {...gestures}
      >
        <Canvas3D onMount={onMount} />
      </div>

      <ShellSettings>
        <Section title="Function" icon="ƒ" defaultOpen>
          {functionPicker}
          {variantExtras}
        </Section>

        <Section title="Domain" icon="▦">
          <Pills
            label="Units"
            options={[
              { value: 1, label: '×1' },
              { value: Math.PI, label: '×π' },
            ]}
            value={state.axisScale}
            onChange={state.setAxisScale}
          />
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
          <Select
            label="Input chart"
            options={coordModeNames.map((name, i) => ({ value: i as CoordMode, label: name }))}
            value={state.inputCoord}
            onChange={state.setInputCoord}
          />
          <Select
            label="Output chart"
            options={coordModeNames.map((name, i) => ({ value: i as CoordMode, label: name }))}
            value={state.outputCoord}
            onChange={state.setOutputCoord}
          />
          {domainExtras}
        </Section>

        <Section title="Camera" icon="◐" defaultOpen>
          <Pills
            label="Projection"
            options={viewTypes.map(([name, code]) => ({ value: code, label: name }))}
            value={state.viewType}
            onChange={controls.handleViewType}
          />
          {state.viewType === ProjectionMode.Torus && (
            <Slider
              label="Collapse → Hopf"
              value={state.fiberCollapse}
              min={0} max={1} step={0.01}
              onChange={controls.handleFiberCollapse}
              format={v => v === 0 ? 'torus' : v === 1 ? 'sphere' : v.toFixed(2)}
            />
          )}
          {state.viewType === ProjectionMode.Torus && (
            <Pills
              label="Radius scale"
              options={[
                { value: 0, label: 'Linear' },
                { value: 1, label: 'Log' },
              ]}
              value={state.logRadius ? 1 : 0}
              onChange={v => state.setLogRadius(v === 1)}
            />
          )}
          {(state.viewType === ProjectionMode.Torus || state.viewType === ProjectionMode.Hopf) && (
            <Checkbox
              label="Reference scaffold"
              checked={state.showScaffold}
              onChange={state.setShowScaffold}
            />
          )}
          {state.viewType === ProjectionMode.Torus && (
            <Checkbox
              label="Hopf fibers"
              checked={state.showFibers}
              onChange={state.setShowFibers}
            />
          )}
          {state.viewType === ProjectionMode.Torus && state.showFibers && (
            <Slider
              label="Fiber density"
              value={state.fiberDensity}
              min={4} max={36} step={1}
              onChange={state.setFiberDensity}
              format={v => `${v}/ring`}
            />
          )}
          {(state.viewType === ProjectionMode.Torus || state.viewType === ProjectionMode.Hopf) && (
            <button
              className="qtc-reset"
              style={{ marginTop: 4 }}
              onClick={enterHopfStudy}
              title="Switch to Hopf, freeze the motion, and reset the 4D orientation so latitude = |z|/|f| and longitude = arg(z) − arg(f) read cleanly"
            >
              Hopf study view
            </button>
          )}
          <Pills
            label="Motion"
            options={motionModes.map(m => ({ value: m, label: m }))}
            value={state.viewMotion}
            onChange={controls.handleMotion}
          />
          <Slider
            label="Distance"
            value={state.cameraZ}
            min={R.cameraZ.min} max={R.cameraZ.max} step={R.cameraZ.step}
            onChange={state.setCameraZ}
            format={v => v.toFixed(1)}
          />
          {!compact && (
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
          )}
        </Section>

        <Section title="Color" icon="◑">
          <Pills
            label="Color by"
            options={[
              { value: ColourBy.Domain, label: 'Domain' },
              { value: ColourBy.Range, label: 'Range' },
            ]}
            value={state.colourBy}
            onChange={state.setColourBy}
          />
          <Select
            label="Hue"
            options={[
              { value: ColourQuantity.Phase, label: 'Phase (arg)' },
              { value: ColourQuantity.Modulus, label: 'Magnitude (|·|)' },
              { value: ColourQuantity.Real, label: 'Real part' },
              { value: ColourQuantity.Imag, label: 'Imag part' },
            ]}
            value={state.colourQuantity}
            onChange={state.setColourQuantity}
          />
          <Select
            label="Brightness"
            options={[
              { value: ColourQuantity.Modulus, label: 'Magnitude (|·|)' },
              { value: ColourQuantity.Uniform, label: 'Uniform (flat)' },
              { value: ColourQuantity.Phase, label: 'Phase (arg)' },
              { value: ColourQuantity.Real, label: 'Real part' },
              { value: ColourQuantity.Imag, label: 'Imag part' },
            ]}
            value={state.brightnessQuantity}
            onChange={state.setBrightnessQuantity}
          />
          <Pills
            label="Style"
            options={Object.keys(ColorStyle)
              .filter(k => isNaN(Number(k)))
              .map(k => ({ value: ColorStyle[k as keyof typeof ColorStyle], label: k }))}
            value={state.colourStyle}
            onChange={state.setColourStyle}
          />
          <Slider label="Hue shift" value={state.hueShift}
            min={R.hueShift.min} max={R.hueShift.max} step={R.hueShift.step}
            onChange={state.setHueShift} format={v => v.toFixed(2)} />
          <Slider label="Saturation" value={state.saturation}
            min={R.saturation.min} max={R.saturation.max} step={R.saturation.step}
            onChange={state.setSaturation} format={v => v.toFixed(2)} />
        </Section>

        <Section title="Particles" icon="✦">
          <Slider label="Size" value={state.size}
            min={R.size.min} max={R.size.max} step={R.size.step}
            onChange={state.setSize} format={v => v.toFixed(1)} />
          <Slider label="Opacity" value={state.opacity}
            min={R.opacity.min} max={R.opacity.max} step={R.opacity.step}
            onChange={state.setOpacity} format={v => v.toFixed(2)} />
          <Slider label="Intensity" value={state.intensity}
            min={R.intensity.min} max={R.intensity.max} step={R.intensity.step}
            onChange={state.setIntensity} format={v => v.toFixed(2)} />
          <Select label="Shape"
            options={shapeNames.map((s, i) => ({ value: i, label: s }))}
            value={state.shapeIndex} onChange={state.setShapeIndex} />
          <Select label="Texture"
            options={textureNames.map((t, i) => ({ value: i, label: t }))}
            value={state.textureIndex} onChange={state.setTextureIndex} />
          <Checkbox label="Light background"
            checked={state.objectMode} onChange={state.setObjectMode} />
        </Section>

        <Section title="Motion" icon="〜">
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
        </Section>

        <Section title="Detail" icon="⚙">
          <Slider label="Particle count" value={state.particleCount}
            min={R.particleCount.min} max={R.particleCount.max} step={R.particleCount.step}
            onChange={state.setParticleCount} format={v => `${(v / 1000).toFixed(0)}k`} />
          <Checkbox label="Adaptive density"
            checked={state.adaptive} onChange={state.setAdaptive} />
          {state.adaptive && (
            <Slider label="Sharpness (α)" value={state.adaptiveAlpha}
              min={R.adaptiveAlpha.min} max={R.adaptiveAlpha.max} step={R.adaptiveAlpha.step}
              onChange={state.setAdaptiveAlpha} format={v => v.toFixed(1)} />
          )}
          <Slider label="Axis width" value={state.axisWidth}
            min={R.axisWidth.min} max={R.axisWidth.max} step={R.axisWidth.step}
            onChange={state.setAxisWidth} format={v => v.toFixed(1)} />
        </Section>

        <Section title="About" icon="ⓘ">
          <Readme markdown={readme} />
        </Section>
      </ShellSettings>

      <ShellActions>
        <div className="cp-section-body">
          {state.viewType === ProjectionMode.Torus && (
            <>
              <Slider
                label="Collapse → Hopf"
                value={state.fiberCollapse}
                min={0} max={1} step={0.01}
                onChange={controls.handleFiberCollapse}
                format={v => v === 0 ? 'torus' : v === 1 ? 'sphere' : v.toFixed(2)}
              />
              <Pills
                label="Radius scale"
                options={[
                  { value: 0, label: 'Linear' },
                  { value: 1, label: 'Log' },
                ]}
                value={state.logRadius ? 1 : 0}
                onChange={v => state.setLogRadius(v === 1)}
              />
            </>
          )}

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

          {settingsStorageKey && (
            <button
              className="qtc-reset"
              style={{ marginTop: 8 }}
              onClick={() => {
                if (!window.confirm('Reset all settings to their defaults? This clears your saved settings and reloads the page.')) return;
                clearPersistedState(settingsStorageKey);
                window.location.reload();
              }}
              title="Forget saved settings and restore the defaults"
            >
              Reset settings to defaults
            </button>
          )}
        </div>
      </ShellActions>
    </>
  );
}

export { ProjectionMode };
