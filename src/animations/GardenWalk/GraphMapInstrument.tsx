import React from 'react';
import ComplexParticles from '../ComplexParticles/ComplexParticles';
import PlaneTransform from '../PlaneTransform/PlaneTransform';
import { NumberInput, Pills } from '../../components/ControlPanel';
import { ProjectionMode } from '../../lib/viewpoint';
import { gardenExploreHref } from '../../lib/gardenHandoff';
import './graphMap.css';

export interface GraphMapInstrumentProps {
  point: [number, number];
  onPointChange: (point: [number, number]) => void;
  view: 'map' | 'graph';
  onViewChange: (view: 'map' | 'graph') => void;
}

const MAP_CONFIG = { fn: 'square', extent: 9, controls: false };
const GRAPH_CONFIG = {
  fn: 'square', extent: 2, count: 6000, controls: true,
  proj: ProjectionMode.DropV, motion: 'Fixed' as const, render: 'Points' as const,
};
const fmt = (n: number) => Number(n.toFixed(3)).toString();

export default function GraphMapInstrument({ point, onPointChange, view, onViewChange }: GraphMapInstrumentProps) {
  const [x, y] = point;
  const u = x * x - y * y;
  const v = 2 * x * y;
  const change = (index: 0 | 1, value: number) => {
    if (!Number.isFinite(value)) return;
    const next: [number, number] = [...point];
    next[index] = Math.max(-2, Math.min(2, value));
    onPointChange(next);
  };
  return <div className="garden-graph-map">
    <Pills label="Picture" value={view} options={[{ value: 'map', label: 'Plane map' }, { value: 'graph', label: '4D graph' }]}
      onChange={onViewChange} />
    <div className="garden-point-controls">
      <NumberInput label="Re z" value={x} min={-2} max={2} step={0.1} onChange={n => change(0, n)} />
      <NumberInput label="Im z" value={y} min={-2} max={2} step={0.1} onChange={n => change(1, n)} />
      <button type="button" onClick={() => onPointChange([1, 1])}>z = 1 + i</button>
      <button type="button" onClick={() => onPointChange([2, 1])}>z = 2 + i</button>
    </div>
    <div className="garden-pair-readout" aria-live="polite">
      <span>Input z = ({fmt(x)}, {fmt(y)})</span>
      <span>Output w = z² = ({fmt(u)}, {fmt(v)})</span>
      <span>Graph pair (Re z, Im z, Re w, Im w) = ({[x, y, u, v].map(fmt).join(', ')})</span>
    </div>
    <div className={`garden-instrument-viewport garden-instrument-${view}`}>
      {view === 'map'
        ? <PlaneTransform embed={MAP_CONFIG} selectedPoint={point} />
        : <ComplexParticles embed={GRAPH_CONFIG} selectedPoint={point} />}
    </div>
    <p className="garden-projection-note">{view === 'map'
      ? 'The left plane locates input z; the right plane locates output w. The white markers are the same pair.'
      : `DropV keeps Re z, Im z, Re w. Omitted coordinate: Im w = ${fmt(v)}. The white marker is the pair as one graph point. Drag to turn the 3D picture; its 4D rotation stays fixed.`}</p>
    <p className="garden-projection-note">This display samples a finite region. A point beyond a pane or camera is still represented by the numeric readout.</p>
    <a href={gardenExploreHref(view, point)}>Explore this instrument</a>
  </div>;
}
