import { Quaternion as Q } from 'three';

/* plane is 'XY' .. 'UV'; θ positive = +90° */
export function quarterQuat(plane: string, θ: number) {
  const s = Math.sin(θ/2), c = Math.cos(θ/2);
  switch(plane){
    case 'XY': return {L: new Q(c,0,0, s),  R: new Q(c,0,0, s)};
    case 'XU': return {L: new Q(c,0, s,0),  R: new Q(c,0,-s,0)};
    case 'XV': return {L: new Q(c, s,0,0),  R: new Q(c,-s,0,0)};
    case 'YU': return {L: new Q(c,0, s,0),  R: new Q(c,0, s,0)};
    case 'YV': return {L: new Q(c, s,0,0),  R: new Q(c, s,0,0)};
    case 'UV': return {L: new Q(c,0,0, s),  R: new Q(c,0,0,-s)};
  }
  throw new Error('bad plane');
}
