import { useState } from 'react';
import './PlaneCurveFloater.css';

export type StandardCurveName =
  | 'circle'
  | 'square'
  | 'horizontal'
  | 'vertical'
  | 'diagonal'
  | 'spiral'
  | 'lemniscate'
  | 'cross'
  | 'cardioid';

export const STANDARD_CURVES: { id: StandardCurveName; label: string }[] = [
  { id: 'circle',     label: 'Circle' },
  { id: 'square',     label: 'Square' },
  { id: 'horizontal', label: 'X-axis' },
  { id: 'vertical',   label: 'Y-axis' },
  { id: 'diagonal',   label: 'Diag' },
  { id: 'cross',      label: 'Cross' },
  { id: 'spiral',     label: 'Spiral' },
  { id: 'lemniscate', label: '∞' },
  { id: 'cardioid',   label: 'Heart' },
];

export interface PlaneCurveFloaterProps {
  drawMode: boolean;
  onToggleDraw: () => void;
  onStandardCurve: (id: StandardCurveName) => void;
  onClear: () => void;
  hasCurve: boolean;
}

/** Floating panel for the Plane Transform module. Drives the curve overlay
 *  on the input pane: pick a stock curve, toggle freehand drawing, or clear
 *  the current curve. Mirrors the look of QuarterTurnFloater. */
export default function PlaneCurveFloater({
  drawMode, onToggleDraw, onStandardCurve, onClear, hasCurve,
}: PlaneCurveFloaterProps) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <div className="pcf pcf-collapsed">
        <button
          className="pcf-toggle"
          onClick={() => setOpen(true)}
          aria-label="Show curve drawing panel"
          title="Curve"
        >✎</button>
      </div>
    );
  }

  return (
    <div className="pcf">
      <div className="pcf-header">
        <span className="pcf-title">Curve</span>
        <button
          className="pcf-close"
          onClick={() => setOpen(false)}
          aria-label="Hide curve panel"
        >×</button>
      </div>

      <div className="pcf-row">
        <button
          className={`pcf-draw-btn ${drawMode ? 'pcf-draw-btn-active' : ''}`}
          onClick={onToggleDraw}
          aria-pressed={drawMode}
        >
          {drawMode ? '● Drawing — tap to stop' : '✎ Draw on input'}
        </button>
      </div>

      <div className="pcf-row">
        <div className="pcf-label">Standard curves</div>
        <div className="pcf-curve-grid">
          {STANDARD_CURVES.map(c => (
            <button
              key={c.id}
              className="pcf-curve-btn"
              onClick={() => onStandardCurve(c.id)}
              title={c.id}
            >{c.label}</button>
          ))}
        </div>
      </div>

      <button
        className="pcf-clear"
        onClick={onClear}
        disabled={!hasCurve}
      >Clear</button>
    </div>
  );
}
