import { useEffect, useRef, useState } from 'react';
import { planes, Plane } from '@/math/constants';
import './QuarterTurnFloater.css';

export type AxisLetter = 'X' | 'Y' | 'U' | 'V';
export type DropAxis = 'None' | 'DropX' | 'DropY' | 'DropU' | 'DropV';

export interface QuarterTurnFloaterProps {
  /** Tap callback — animated 90° turn. */
  onTurn: (p: Plane, dir: 1 | -1) => void;
  /** Optional continuous-rotation callback driven by the floater's rAF loop. */
  onRotateBy?: (p: Plane, theta: number) => void;
  onReset?: () => void;
  /** Optional per-axis colour, e.g. `axis => 'hsl(...)`. When provided, plane
   *  labels render each letter in its axis colour. */
  getAxisColor?: (axis: AxisLetter) => string;
  /** Currently-selected drop axis (or 'None'). When provided, a Drop-axis
   *  button row appears under the quarter-turn grid. */
  dropAxis?: DropAxis;
  /** Setter for the drop-axis selection. */
  onDropAxisChange?: (d: DropAxis) => void;
}

const HOLD_THRESHOLD_MS = 220;     // how long before tap becomes hold
const HOLD_RATE_RAD_PER_S = 1.5;   // ~86°/sec while holding

/**
 * Floating cluster of unit-rotation buttons for the six 4D planes, plus an
 * optional drop-axis row. Tap a quarter-turn button for an animated 90° turn,
 * press-and-hold to rotate continuously. Starts collapsed; tap ↻ to expand.
 */
export default function QuarterTurnFloater({
  onTurn, onRotateBy, onReset, getAxisColor, dropAxis, onDropAxisChange,
}: QuarterTurnFloaterProps) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <div className="qtb qtb-collapsed">
        <button
          className="qtb-toggle"
          onClick={() => setOpen(true)}
          aria-label="Show quarter-turn rotations"
          title="Quarter turns"
        >↻</button>
      </div>
    );
  }

  return (
    <div className="qtb">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="qtb-label" style={{ flex: 1, textAlign: 'left' }}>4D turns</span>
        <button
          className="qtb-toggle"
          style={{ width: 24, height: 24, fontSize: 14 }}
          onClick={() => setOpen(false)}
          aria-label="Hide quarter-turn rotations"
        >×</button>
      </div>
      <div className="qtb-grid">
        <div />
        <div className="qtb-label">↻</div>
        <div className="qtb-label">↺</div>
        {planes.map(p => (
          <Row key={p} plane={p} onTurn={onTurn} onRotateBy={onRotateBy} getAxisColor={getAxisColor} />
        ))}
      </div>

      {dropAxis !== undefined && onDropAxisChange && (
        <div className="qtb-row-drop">
          <div className="qtb-label" style={{ marginBottom: 4 }}>Drop axis</div>
          {/* Four toggle buttons instead of five (None implied by the absence
              of an active button). Tap an inactive axis to drop it; tap the
              active one to clear back to None. Keeps the row the same width
              as the quarter-turn grid above, so the floater stays narrow. */}
          <div className="qtb-drop-buttons">
            {(['X', 'Y', 'U', 'V'] as const).map(letter => {
              const key: DropAxis = `Drop${letter}`;
              const active = dropAxis === key;
              return (
                <button
                  key={letter}
                  className={`qtb-drop-btn ${active ? 'qtb-drop-btn-active' : ''}`}
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
        <div className="qtb-row-reset">
          <button className="qtb-reset" onClick={onReset}>Reset</button>
        </div>
      )}
    </div>
  );
}

function Row({
  plane, onTurn, onRotateBy, getAxisColor,
}: {
  plane: Plane;
  onTurn: (p: Plane, d: 1 | -1) => void;
  onRotateBy?: (p: Plane, theta: number) => void;
  getAxisColor?: (axis: AxisLetter) => string;
}) {
  const [a, b] = [plane[0] as AxisLetter, plane[1] as AxisLetter];
  return (
    <>
      <div className="qtb-label qtb-plane" style={{ alignSelf: 'center' }}>
        <span style={getAxisColor ? { color: getAxisColor(a) } : undefined}>{a}</span>
        <span style={getAxisColor ? { color: getAxisColor(b) } : undefined}>{b}</span>
      </div>
      <HoldButton plane={plane} direction={1} onTurn={onTurn} onRotateBy={onRotateBy} label="↻" />
      <HoldButton plane={plane} direction={-1} onTurn={onTurn} onRotateBy={onRotateBy} label="↺" />
    </>
  );
}

function HoldButton({
  plane, direction, onTurn, onRotateBy, label,
}: {
  plane: Plane;
  direction: 1 | -1;
  onTurn: (p: Plane, d: 1 | -1) => void;
  onRotateBy?: (p: Plane, theta: number) => void;
  label: string;
}) {
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heldRef = useRef(false);

  const startHold = () => {
    heldRef.current = true;
    lastTimeRef.current = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.1, (now - lastTimeRef.current) / 1000);
      lastTimeRef.current = now;
      onRotateBy?.(plane, direction * HOLD_RATE_RAD_PER_S * dt);
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
  };

  const stop = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    const wasHeld = heldRef.current;
    heldRef.current = false;
    return wasHeld;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    holdTimerRef.current = setTimeout(() => {
      holdTimerRef.current = null;
      if (onRotateBy) startHold();
    }, HOLD_THRESHOLD_MS);
  };

  const onPointerUp = () => {
    const wasHeld = stop();
    if (!wasHeld) onTurn(plane, direction);
  };

  const onPointerCancel = () => { stop(); };

  useEffect(() => () => { stop(); }, []);

  return (
    <button
      className="qtb-btn"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onPointerLeave={(e) => { if (e.buttons === 0) stop(); }}
      aria-label={`${plane} ${direction === 1 ? 'clockwise' : 'counter-clockwise'} (hold to rotate continuously)`}
    >{label}</button>
  );
}
