import { ReactNode } from 'react';
import { Slider } from '@/components/ControlPanel';
import './QuarterTurnControls.css';

export type AxisLetter = 'X' | 'Y' | 'U' | 'V';
export type DropAxis = 'None' | 'DropX' | 'DropY' | 'DropU' | 'DropV';

/** One row of the control grid: a rotation in some plane (4D) or about some
 *  ambient view axis (Hopf/Torus). `id` keys the turn/spin callbacks. */
export interface TurnItem {
  id: string;
  /** Cell label (e.g. axis-colored "XY", or "Yaw"). */
  label: ReactNode;
  /** Accessible descriptions of the ↻ and ↺ directions. */
  cwLabel: string;
  ccwLabel: string;
}

export interface QuarterTurnControlsProps {
  /** Rows to show — the six 4D planes, or the three ambient view axes. */
  items: TurnItem[];
  /** Single eighth turn (45°) for the given row and direction. */
  onTurn: (id: string, dir: 1 | -1) => void;
  /** Map of `${id}:${dir}` → whether a continuous spin is running there. */
  spins: Record<string, boolean>;
  /** Toggle the continuous spin for a row/direction on or off. */
  onToggleSpin: (id: string, dir: 1 | -1) => void;
  /** Stop every running spin at once. */
  onStopAllSpins: () => void;
  /** Global spin speed (rad/s), shared by every active spinner. */
  spinSpeed: number;
  onSpinSpeedChange: (v: number) => void;
  onReset?: () => void;
  /** Optional per-axis color for the drop-axis buttons. */
  getAxisColor?: (axis: AxisLetter) => string;
  /** Currently-selected drop axis (or 'None'). When provided, a drop-axis
   *  button row appears under the grid. */
  dropAxis?: DropAxis;
  onDropAxisChange?: (d: DropAxis) => void;
}

/**
 * The rotation controls for particle viewers, rendered inside the standard
 * Actions panel (so the draggable ActionFloater and the drawer's Actions tab
 * both carry them). Each row is four equal buttons: `[spin ↻] [↻] [↺] [spin ↺]`.
 * A tap on a center ↻/↺ button is a single eighth turn; the flanking spin
 * toggles start/stop a *continuous* rotation. The rows are either the six 4D
 * planes (linear projections) or the three ambient view axes — Yaw/Pitch/Roll —
 * when a Hopf/Torus projection is active, where 4D turns would deform the image.
 */
export default function QuarterTurnControls({
  items, onTurn, spins, onToggleSpin, onStopAllSpins, spinSpeed, onSpinSpeedChange,
  onReset, getAxisColor, dropAxis, onDropAxisChange,
}: QuarterTurnControlsProps) {
  const anySpin = Object.values(spins).some(Boolean);

  return (
    <div className="qtc">
      <div className="qtc-grid">
        <div />
        <div className="qtc-hdr">spin</div>
        <div className="qtc-hdr">↻</div>
        <div className="qtc-hdr">↺</div>
        <div className="qtc-hdr">spin</div>
        {items.map(item => (
          <div key={item.id} style={{ display: 'contents' }}>
            <div className="qtc-label">{item.label}</div>
            <SpinToggle id={item.id} dir={1} arrow="↻" desc={item.cwLabel} on={!!spins[`${item.id}:1`]} onToggleSpin={onToggleSpin} />
            <TurnButton id={item.id} dir={1} arrow="↻" desc={item.cwLabel} onTurn={onTurn} />
            <TurnButton id={item.id} dir={-1} arrow="↺" desc={item.ccwLabel} onTurn={onTurn} />
            <SpinToggle id={item.id} dir={-1} arrow="↺" desc={item.ccwLabel} on={!!spins[`${item.id}:-1`]} onToggleSpin={onToggleSpin} />
          </div>
        ))}
      </div>

      <Slider
        label="Spin speed"
        value={spinSpeed}
        min={0.1} max={3} step={0.1}
        onChange={onSpinSpeedChange}
        format={v => `${v.toFixed(1)} rad/s`}
      />
      {anySpin && (
        <button className="qtc-stop" onClick={onStopAllSpins}>Stop all spins</button>
      )}

      {dropAxis !== undefined && onDropAxisChange && (
        <div>
          <div className="qtc-label" style={{ marginBottom: 4 }}>Drop axis</div>
          <div className="qtc-drop-buttons">
            {(['X', 'Y', 'U', 'V'] as const).map(letter => {
              const key: DropAxis = `Drop${letter}`;
              const active = dropAxis === key;
              return (
                <button
                  key={letter}
                  className={`qtc-drop-btn ${active ? 'qtc-drop-btn-active' : ''}`}
                  onClick={() => onDropAxisChange(active ? 'None' : key)}
                  aria-pressed={active}
                  aria-label={active ? `Drop ${letter} (active — tap to clear)` : `Drop ${letter}`}
                  style={getAxisColor && !active ? { color: getAxisColor(letter) } : undefined}
                >{letter}</button>
              );
            })}
          </div>
        </div>
      )}

      {onReset && (
        <button className="qtc-reset" onClick={onReset}>Reset orientation</button>
      )}
    </div>
  );
}

function TurnButton({
  id, dir, arrow, desc, onTurn,
}: {
  id: string;
  dir: 1 | -1;
  arrow: string;
  desc: string;
  onTurn: (id: string, d: 1 | -1) => void;
}) {
  return (
    <button
      className="qtc-btn"
      onClick={() => onTurn(id, dir)}
      aria-label={`${desc} — eighth turn`}
      title={`${desc} — eighth turn (45°)`}
    >{arrow}</button>
  );
}

function SpinToggle({
  id, dir, arrow, desc, on, onToggleSpin,
}: {
  id: string;
  dir: 1 | -1;
  arrow: string;
  desc: string;
  on: boolean;
  onToggleSpin: (id: string, d: 1 | -1) => void;
}) {
  return (
    <button
      className={`qtc-spin ${on ? 'qtc-spin-on' : ''}`}
      onClick={() => onToggleSpin(id, dir)}
      aria-pressed={on}
      aria-label={`${on ? 'Stop' : 'Start'} continuous ${desc}`}
      title={`${on ? 'Stop' : 'Start'} spinning — ${desc}`}
    >{arrow}</button>
  );
}
