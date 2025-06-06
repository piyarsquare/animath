import { planes, Plane } from '@/math/constants';

export default function QuarterTurnBar({ onTurn }: { onTurn: (p: Plane) => void }){
  return (
    <div className="quarter-bar">
      {planes.map(p => (
        <button key={p} onClick={() => onTurn(p)}>{p}</button>
      ))}
    </div>
  );
}
