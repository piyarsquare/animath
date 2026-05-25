import React from 'react';
import Canvas3D from './Canvas3D';
import Readme from './Readme';
import { ControlPanel, Section, Slider, Pills, Select, Checkbox } from './ControlPanel';
import { COMPLEX_PARTICLES_DEFAULTS } from '../config/defaults';
import { useResponsive } from '../styles/responsive';
import { planes } from '../math/constants';
import {
  ColorStyle, ColourBy, AXIS_COLORS,
  shapeNames, textureNames, viewTypes, motionModes, dropModes,
  useGestureRotation,
} from '../lib/particles';
import type { ParticleState } from '../lib/particles';
import type { useViewControls } from '../lib/particles';
import { ProjectionMode } from '../lib/viewpoint';

const R = COMPLEX_PARTICLES_DEFAULTS.ranges;

export interface ParticleViewerShellProps {
  state: ParticleState;
  controls: ReturnType<typeof useViewControls>;
  onMount: (ctx: {
    scene: import('three').Scene;
    camera: import('three').PerspectiveCamera;
    renderer: import('three').WebGLRenderer;
  }) => void;
  /** Variant-specific label, e.g. "exp" or "z^(1/2)". */
  functionName: string;
  /** Variant-specific formula, rendered in accent color. */
  functionFormula: string;
  /** Variant-specific picker UI (dropdown / p,q / etc.) rendered inside Function section. */
  functionPicker: React.ReactNode;
  /** Optional extra controls (e.g. multibranch branch count/indices/style). */
  variantExtras?: React.ReactNode;
  /** README markdown to render inside the About section. */
  readme: string;
}

export default function ParticleViewerShell({
  state, controls, onMount,
  functionName, functionFormula, functionPicker, variantExtras, readme,
}: ParticleViewerShellProps) {
  const { isMobile, isTablet } = useResponsive();
  const compact = isMobile || isTablet;
  const gestures = useGestureRotation(state);

  const peek = (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
        <span className="cp-peek-name">{functionName}</span>
        <span className="cp-peek-formula">{functionFormula}</span>
      </div>
    </>
  );

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden' }}>
      <div
        style={{ position: 'absolute', inset: 0, touchAction: 'none' }}
        {...gestures}
      >
        <Canvas3D onMount={onMount} />
      </div>

      <ControlPanel peekContent={peek}>
        <Section title="Function" icon="ƒ" defaultOpen>
          <div className="cp-function-title">{functionName}</div>
          <div className="cp-function-formula">{functionFormula}</div>
          {functionPicker}
          {variantExtras}
        </Section>

        <Section title="Camera" icon="◐" defaultOpen>
          <Pills
            label="Projection"
            options={viewTypes.map(([name, code]) => ({ value: code, label: name }))}
            value={state.viewType}
            onChange={controls.handleViewType}
          />
          <Pills
            label="Drop axis"
            options={dropModes.map(d => ({ value: d, label: d.replace('Drop', '') }))}
            value={state.dropAxis}
            onChange={controls.handleDropAxis}
          />
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
          <div className="cp-quarter">
            <div className="cp-quarter-label">4D turn</div>
            <div />
            <div />
            {planes.map(p => (
              <React.Fragment key={p}>
                <div className="cp-quarter-label" style={{ alignSelf: 'center' }}>{p}</div>
                <button onClick={() => controls.turn(p, 1)}>↻</button>
                <button onClick={() => controls.turn(p, -1)}>↺</button>
              </React.Fragment>
            ))}
          </div>
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
                    {row.map((v, j) => <td key={j}>{v.toFixed(2)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        <Section title="Colour" icon="◑">
          <Pills
            label="Colour by"
            options={[
              { value: ColourBy.Domain, label: 'Domain' },
              { value: ColourBy.Range, label: 'Range' },
            ]}
            value={state.colourBy}
            onChange={state.setColourBy}
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
        </Section>

        <Section title="Detail" icon="⚙">
          <Slider label="Particle count" value={state.particleCount}
            min={R.particleCount.min} max={R.particleCount.max} step={R.particleCount.step}
            onChange={state.setParticleCount} format={v => `${(v / 1000).toFixed(0)}k`} />
          <Slider label="Axis width" value={state.axisWidth}
            min={R.axisWidth.min} max={R.axisWidth.max} step={R.axisWidth.step}
            onChange={state.setAxisWidth} format={v => v.toFixed(1)} />
        </Section>

        <Section title="About" icon="ⓘ">
          <Readme markdown={readme} />
        </Section>
      </ControlPanel>
    </div>
  );
}

/** Re-export so variants can build their function pickers using a single import. */
export { ProjectionMode };
