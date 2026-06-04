import { planes, Plane } from '@/math/constants';
import { Slider } from '@/components/ControlPanel';
import './QuarterTurnControls.css';

export type AxisLetter = 'X' | 'Y' | 'U' | 'V';
export type DropAxis = 'None' | 'DropX' | 'DropY' | 'DropU' | 'DropV';

export interface QuarterTurnControlsProps {
  /** Single eighth turn (45°) in the given plane and direction. */
  onTurn: (p: Plane, dir: 1 | -1) => void;
  /** Map of `${plane}:${dir}` → whether a continuous spin is running there. */
  spins: Record<string, boolean>;
  /** Toggle the continuous spin for a plane/direction on or off. */
  onToggleSpin: (p: Plane, dir: 1 | -1) => void;
  /** Stop every running spin at once. */
  onStopAllSpins: () => void;
  /** Global spin speed (rad/s), shared by every active spinner. */
  spinSpeed: number;
  onSpinSpeedChange: (v: number) => void;
  onReset?: () => void;
  /** Optional per-axis colour, e.g. `axis => 'hsl(...)`. When provided, plane
   *  labels and drop-axis buttons render each letter in its axis colour. */
  getAxisColor?: (axis: AxisLetter) => string;
  /** Currently-selected drop axis (or 'None'). When provided, a drop-axis
   *  button row appears under the quarter-turn grid. */
  dropAxis?: DropAxis;
  onDropAxisChange?: (d: DropAxis) => void;
}

/**
 * The 4D rotation controls for particle viewers, rendered inside the standard
 * Actions panel (so the draggable ActionFloater and the drawer's Actions tab
 * both carry them). A tap on a ↻/↺ button is a single eighth turn; the small
 * toggle under each button starts/stops a *continuous* spin in that plane and
 * direction. Multiple spins compose (e.g. xy + uv → an isoclinic double
 * rotation), and a single speed slider sets the rate for all of them.
 */
export default function QuarterTurnControls({
  onTurn, spins, onToggleSpin, onStopAllSpins, spinSpeed, onSpinSpeedChange,
  onReset, getAxisColor, dropAxis, onDropAxisChange,
}: QuarterTurnControlsProps) {
  const anySpin = Object.values(spins).some(Boolean);

  return (
    <div className="qtc">
      <div className="qtc-grid">
        <div />
        <div className="qtc-label">↻</div>
        <div className="qtc-label">↺</div>
        {planes.map(p => (
          <Row
            key={p}
            plane={p}
            onTurn={onTurn}
            spins={spins}
            onToggleSpin={onToggleSpin}
            getAxisColor={getAxisColor}
          />
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

function Row({
  plane, onTurn, spins, onToggleSpin, getAxisColor,
}: {
  plane: Plane;
  onTurn: (p: Plane, d: 1 | -1) => void;
  spins: Record<string, boolean>;
  onToggleSpin: (p: Plane, d: 1 | -1) => void;
  getAxisColor?: (axis: AxisLetter) => string;
}) {
  const [a, b] = [plane[0] as AxisLetter, plane[1] as AxisLetter];
  return (
    <>
      <div className="qtc-label qtc-plane" style={{ alignSelf: 'center' }}>
        <span style={getAxisColor ? { color: getAxisColor(a) } : undefined}>{a}</span>
        <span style={getAxisColor ? { color: getAxisColor(b) } : undefined}>{b}</span>
      </div>
      <TurnCell plane={plane} dir={1} arrow="↻" onTurn={onTurn} on={!!spins[`${plane}:1`]} onToggleSpin={onToggleSpin} />
      <TurnCell plane={plane} dir={-1} arrow="↺" onTurn={onTurn} on={!!spins[`${plane}:-1`]} onToggleSpin={onToggleSpin} />
    </>
  );
}

function TurnCell({
  plane, dir, arrow, onTurn, on, onToggleSpin,
}: {
  plane: Plane;
  dir: 1 | -1;
  arrow: string;
  onTurn: (p: Plane, d: 1 | -1) => void;
  on: boolean;
  onToggleSpin: (p: Plane, d: 1 | -1) => void;
}) {
  const sense = dir === 1 ? 'clockwise' : 'counter-clockwise';
  return (
    <div className="qtc-cell">
      <button
        className="qtc-btn"
        onClick={() => onTurn(plane, dir)}
        aria-label={`${plane} ${sense} eighth turn`}
        title={`${plane} ${sense} — eighth turn (45°)`}
      >{arrow}</button>
      <button
        className={`qtc-spin ${on ? 'qtc-spin-on' : ''}`}
        onClick={() => onToggleSpin(plane, dir)}
        aria-pressed={on}
        aria-label={`${on ? 'Stop' : 'Start'} continuous ${sense} spin in ${plane}`}
        title={`${on ? 'Stop' : 'Start'} spinning ${plane} ${arrow}`}
      >{arrow}</button>
    </div>
  );
}
