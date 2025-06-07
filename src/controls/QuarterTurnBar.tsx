import { planes, Plane } from '@/math/constants';

export default function QuarterTurnBar({ onTurn }: { onTurn: (p: Plane) => void }) {
  return (
    <div className="quarter-bar" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {planes.map(p => (
        <button key={p} onClick={() => onTurn(p)}>{p}</button>
      ))}
    </div>
  );
}
