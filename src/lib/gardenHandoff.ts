import { functionNames } from './complexMath';

export type GardenPoint = [number, number];
export interface GardenContext { point: GardenPoint }
let returnNotice: { changedFunction: boolean } | null = null;

/** Strict, bounded input coordinates for a guided example, never executable URL data. */
export function decodeGardenContext(hash: string): GardenContext | null {
  const params = new URLSearchParams(hash.split('?')[1] ?? '');
  if (params.get('garden') !== 'graph') return null;
  const values = (params.get('point') ?? '').split(',');
  if (values.length !== 2 || values.some(v => v.trim() === '')) return null;
  const point = values.map(Number);
  if (!point.every(v => Number.isFinite(v) && Math.abs(v) <= 100)) return null;
  return { point: point as GardenPoint };
}

export function encodeGardenContext(context: GardenContext | null): string {
  return context ? `&garden=graph&point=${context.point.join(',')}` : '';
}

export function gardenExploreHref(view: 'map' | 'graph', point: GardenPoint): string {
  return `#/${view === 'map' ? 'plane-transform' : 'complex-particles'}?fn=square${encodeGardenContext({ point })}`;
}

export function noteGardenFunction(functionIndex: number): void {
  returnNotice = { changedFunction: functionNames[functionIndex] !== 'square' };
}

export function returnToGarden(functionIndex: number): void {
  noteGardenFunction(functionIndex);
  window.location.hash = '/garden?stop=graph';
}

/** One-shot, same-visit notice. A browser reload starts a fresh garden. */
export function consumeGardenReturn(): { changedFunction: boolean } | null {
  const notice = returnNotice;
  returnNotice = null;
  return notice;
}
