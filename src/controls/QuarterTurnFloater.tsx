import { useEffect, useRef, useState } from 'react';
import { planes, Plane } from '@/math/constants';
import './QuarterTurnFloater.css';

export interface QuarterTurnFloaterProps {
  /** Tap callback — animated 90° turn. */
  onTurn: (p: Plane, dir: 1 | -1) => void;
  /** Optional continuous-rotation callback driven by the floater's rAF loop. */
  onRotateBy?: (p: Plane, theta: number) => void;
  onReset?: () => void;
}

const HOLD_THRESHOLD_MS = 220;     // how long before tap becomes hold
const HOLD_RATE_RAD_PER_S = 1.5;   // ~86°/sec while holding

/**
 * Floating cluster of unit-rotation buttons for the six 4D planes. Tap a
 * button for an animated 90° quarter turn. Press and hold to rotate
 * continuously in that plane (∼86°/sec). Includes a Reset orientation row.
 * Starts collapsed; tap the ↻ chip to expand.
 */
export default function QuarterTurnFloater({ onTurn, onRotateBy, onReset }: QuarterTurnFloaterProps) {
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
          <Row key={p} plane={p} onTurn={onTurn} onRotateBy={onRotateBy} />
        ))}
      </div>
      {onReset && (
        <div className="qtb-row-reset">
          <button className="qtb-reset" onClick={onReset}>Reset orientation</button>
        </div>
      )}
    </div>
  );
}

function Row({
  plane, onTurn, onRotateBy,
}: {
  plane: Plane;
  onTurn: (p: Plane, d: 1 | -1) => void;
  onRotateBy?: (p: Plane, theta: number) => void;
}) {
  return (
    <>
      <div className="qtb-label" style={{ alignSelf: 'center' }}>{plane}</div>
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
    if (!wasHeld) onTurn(plane, direction); // simple tap → animated quarter turn
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
