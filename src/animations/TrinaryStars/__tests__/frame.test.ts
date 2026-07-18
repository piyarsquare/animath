import { describe, it, expect } from 'vitest';
import { frameAnchor, frameTransform } from '../frame';
import type { Star } from '@/lib/nbody';

function star(x: number, y: number, mass: number): Star {
  return { x, y, vx: 0, vy: 0, ax: 0, ay: 0, mass };
}

const STARS = [star(2, 0, 1), star(-1, 1, 2), star(0, -3, 3)];

describe('frameAnchor', () => {
  it('star anchors return the star positions', () => {
    expect(frameAnchor(STARS, 's0')).toEqual({ x: 2, y: 0 });
    expect(frameAnchor(STARS, 's2')).toEqual({ x: 0, y: -3 });
  });

  it('pair anchors are mass-weighted centers', () => {
    // c01: masses 1 & 2 → ((2·1 + -1·2)/3, (0·1 + 1·2)/3) = (0, 2/3)
    const c = frameAnchor(STARS, 'c01');
    expect(c.x).toBeCloseTo(0, 12);
    expect(c.y).toBeCloseTo(2 / 3, 12);
  });

  it('the default anchor is the full barycenter', () => {
    const b = frameAnchor(STARS, 'bary');
    const M = 6;
    expect(b.x).toBeCloseTo((2 * 1 - 1 * 2 + 0 * 3) / M, 12);
    expect(b.y).toBeCloseTo((0 * 1 + 1 * 2 - 3 * 3) / M, 12);
  });
});

describe('frameTransform', () => {
  it('maps the center to the origin', () => {
    const tf = frameTransform(STARS, 's1', 'none');
    const o = tf(STARS[1].x, STARS[1].y);
    expect(o.x).toBeCloseTo(0, 12);
    expect(o.y).toBeCloseTo(0, 12);
  });

  it('with align, puts the align anchor on the +x axis', () => {
    const tf = frameTransform(STARS, 's0', 's1');
    const a = tf(STARS[1].x, STARS[1].y);
    expect(a.y).toBeCloseTo(0, 12);
    expect(a.x).toBeGreaterThan(0);
    expect(a.x).toBeCloseTo(Math.hypot(STARS[1].x - STARS[0].x, STARS[1].y - STARS[0].y), 12);
  });

  it('is an isometry: distances between any two points are preserved', () => {
    const tf = frameTransform(STARS, 'c12', 's0');
    const pts: [number, number][] = [[0, 0], [1, 2], [-3, 4], [5, -1]];
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const a = tf(...pts[i]), b = tf(...pts[j]);
        const before = Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]);
        const after = Math.hypot(a.x - b.x, a.y - b.y);
        expect(after).toBeCloseTo(before, 12);
      }
    }
  });

  it('preserves orientation (no accidental mirror)', () => {
    const tf = frameTransform(STARS, 'bary', 's2');
    // Signed area of a CCW triangle must stay positive through the transform.
    const tri: [number, number][] = [[0, 0], [1, 0], [0, 1]];
    const [A, B, C] = tri.map(p => tf(...p));
    const cross = (B.x - A.x) * (C.y - A.y) - (B.y - A.y) * (C.x - A.x);
    expect(cross).toBeGreaterThan(0);
  });

  it("align='none' is a pure translation", () => {
    const tf = frameTransform(STARS, 's2', 'none');
    const p = tf(7, 11);
    expect(p.x).toBeCloseTo(7 - STARS[2].x, 12);
    expect(p.y).toBeCloseTo(11 - STARS[2].y, 12);
  });
});
