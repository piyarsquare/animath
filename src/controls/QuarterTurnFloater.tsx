import { useState } from 'react';
import { planes, Plane } from '@/math/constants';
import './QuarterTurnFloater.css';

export interface QuarterTurnFloaterProps {
  onTurn: (p: Plane, dir: 1 | -1) => void;
  onReset?: () => void;
}

/**
 * A small floating cluster of unit-rotation buttons (six 4D planes × two
 * directions, plus optional reset). Collapses to a single icon by default so
 * it stays out of the way; tap to expand. Placed bottom-left of the canvas.
 */
export default function QuarterTurnFloater({ onTurn, onReset }: QuarterTurnFloaterProps) {
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
          <Row key={p} plane={p} onTurn={onTurn} />
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

function Row({ plane, onTurn }: { plane: Plane; onTurn: (p: Plane, d: 1 | -1) => void }) {
  return (
    <>
      <div className="qtb-label" style={{ alignSelf: 'center' }}>{plane}</div>
      <button className="qtb-btn" onClick={() => onTurn(plane, 1)} aria-label={`${plane} clockwise`}>↻</button>
      <button className="qtb-btn" onClick={() => onTurn(plane, -1)} aria-label={`${plane} counter-clockwise`}>↺</button>
    </>
  );
}
