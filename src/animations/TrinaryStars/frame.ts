/** Reference-frame math for the Observatory: pure view transforms over the
 *  star positions (no physics). Extracted from TrinaryStars.tsx so the
 *  rotating-frame geometry — where subtle sign errors would silently bend
 *  every co-rotating orbit — is unit-testable. */

import type { Star } from '@/lib/nbody';

/** Anchor point (in sim coords) for a reference-frame selector: a star, a pair's
 *  center of mass, or the system barycenter. */
export function frameAnchor(stars: Star[], key: string): { x: number; y: number } {
  const com = (idx: number[]) => {
    let M = 0, x = 0, y = 0;
    for (const i of idx) { const s = stars[i]; M += s.mass; x += s.mass * s.x; y += s.mass * s.y; }
    return { x: x / M, y: y / M };
  };
  switch (key) {
    case 's0': return { x: stars[0].x, y: stars[0].y };
    case 's1': return { x: stars[1].x, y: stars[1].y };
    case 's2': return { x: stars[2].x, y: stars[2].y };
    case 'c01': return com([0, 1]);
    case 'c02': return com([0, 2]);
    case 'c12': return com([1, 2]);
    default: return com([0, 1, 2]); // barycenter
  }
}

/** A pure view transform: put `center` at the origin, and (unless align='none')
 *  rotate so the direction to `align` lies on +x. Physics is unchanged. */
export function frameTransform(stars: Star[], center: string, align: string): (x: number, y: number) => { x: number; y: number } {
  const C = frameAnchor(stars, center);
  let c = 1, s = 0;
  if (align !== 'none') {
    const A = frameAnchor(stars, align);
    const ang = Math.atan2(A.y - C.y, A.x - C.x);
    c = Math.cos(ang); s = Math.sin(ang);
  }
  return (x, y) => { const dx = x - C.x, dy = y - C.y; return { x: dx * c + dy * s, y: -dx * s + dy * c }; };
}
