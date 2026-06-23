import { describe, it, expect } from 'vitest';
import { distance, nearestMarker, nearestMarkerDistance, Pt } from '../nearestMarker';

describe('distance', () => {
  it('measures 2D distance (z defaults to 0)', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });

  it('measures 3D distance', () => {
    expect(distance({ x: 0, y: 0, z: 0 }, { x: 2, y: 3, z: 6 })).toBe(7);
  });

  it('treats a missing z as 0 (planar) when mixing 2D and 3D', () => {
    expect(distance({ x: 0, y: 0 }, { x: 0, y: 0, z: 4 })).toBe(4);
  });

  it('is zero for coincident points', () => {
    expect(distance({ x: 1, y: -2, z: 3 }, { x: 1, y: -2, z: 3 })).toBe(0);
  });
});

describe('nearestMarker', () => {
  it('returns null when there are no markers', () => {
    expect(nearestMarker({ x: 0, y: 0 }, [])).toBeNull();
  });

  it('returns the single marker', () => {
    expect(nearestMarker({ x: 0, y: 0 }, [{ x: 3, y: 4 }])).toEqual({ index: 0, distance: 5 });
  });

  it('picks the nearest of several', () => {
    const markers: Pt[] = [
      { x: 10, y: 0 },
      { x: 2, y: 0 },
      { x: 5, y: 0 },
    ];
    expect(nearestMarker({ x: 0, y: 0 }, markers)).toEqual({ index: 1, distance: 2 });
  });

  it('works in 3D', () => {
    const markers: Pt[] = [
      { x: 0, y: 0, z: 9 },
      { x: 0, y: 0, z: 1 },
    ];
    expect(nearestMarker({ x: 0, y: 0, z: 0 }, markers)).toEqual({ index: 1, distance: 1 });
  });

  it('breaks ties toward the lowest index', () => {
    const markers: Pt[] = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
    ];
    expect(nearestMarker({ x: 0, y: 0 }, markers)?.index).toBe(0);
  });
});

describe('nearestMarkerDistance', () => {
  it('is Infinity when there are no markers', () => {
    expect(nearestMarkerDistance({ x: 0, y: 0 }, [])).toBe(Infinity);
  });

  it('returns the nearest distance', () => {
    expect(nearestMarkerDistance({ x: 0, y: 0 }, [{ x: 8, y: 0 }, { x: 3, y: 0 }])).toBe(3);
  });
});
