import React from 'react';
import { returnToGarden, type GardenContext } from '../lib/gardenHandoff';

export default function GardenReturn({ context, functionIndex }: { context: GardenContext | null; functionIndex: number }) {
  if (!context) return null;
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 12 }}>
    <span>Garden input z = ({context.point.join(', ')})</span>
    <button type="button" onClick={() => returnToGarden(functionIndex)}>Return to garden</button>
  </span>;
}
