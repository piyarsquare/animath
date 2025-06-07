import { planes, Plane } from '@/math/constants';

export default function QuarterTurnBar({ onTurn }: { onTurn: (p: Plane, dir: 1 | -1) => void }) {
  return (
    <div className="quarter-bar" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {planes.map(p => (
        <div key={p} style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => onTurn(p, 1)}>{p}&#x21bb;</button>
          <button onClick={() => onTurn(p, -1)}>{p}&#x21ba;</button>
        </div>
      ))}
    </div>
  );
}
