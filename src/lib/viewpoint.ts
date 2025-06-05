import * as THREE from 'three';

export enum ProjectionMode {
  Perspective = 0,
  Stereo      = 1,
  Hopf        = 2,
  DropX       = 3,
  DropY,
  DropU,
  DropV
}

export type Axis4D = 'xy' | 'xu' | 'xv' | 'yu' | 'yv' | 'uv';

export function norm(q: THREE.Vector4){
  const l = Math.hypot(q.x,q.y,q.z,q.w) || 1;
  q.divideScalar(l);
}

export function quatMul(a: THREE.Vector4, b: THREE.Vector4): THREE.Vector4{
  return new THREE.Vector4(
    a.w*b.x + a.x*b.w + a.y*b.z - a.z*b.y,
    a.w*b.y - a.x*b.z + a.y*b.w + a.z*b.x,
    a.w*b.z + a.x*b.y - a.y*b.x + a.z*b.w,
    a.w*b.w - a.x*b.x - a.y*b.y - a.z*b.z
  );
}

export function quatConj(q: THREE.Vector4): THREE.Vector4{
  return new THREE.Vector4(-q.x,-q.y,-q.z,q.w);
}

export function quatRotate4D(p: THREE.Vector4, a: THREE.Vector4, b: THREE.Vector4): THREE.Vector4{
  const q = new THREE.Vector4(p.x,p.y,p.z,p.w);
  const r = quatMul(quatMul(a,q), quatConj(b));
  return new THREE.Vector4(r.x,r.y,r.z,r.w);
}

export function makeUnitQuat(angle: number, axis: Axis4D): {L: THREE.Vector4, R: THREE.Vector4}{
  const h = angle*0.5;
  const s = Math.sin(h); const c = Math.cos(h);
  switch(axis){
    case 'xy': {
      const q = new THREE.Vector4(0,0,s,c); return {L:q.clone(), R:q.clone()};
    }
    case 'xu': {
      const q = new THREE.Vector4(0,s,0,c); return {L:q.clone(), R:q.clone()};
    }
    case 'yu': {
      const q = new THREE.Vector4(s,0,0,c); return {L:q.clone(), R:q.clone()};
    }
    case 'xv': {
      const q = new THREE.Vector4(s,0,0,c); return {L:q.clone(), R:new THREE.Vector4(-s,0,0,c)};
    }
    case 'yv': {
      const q = new THREE.Vector4(0,s,0,c); return {L:q.clone(), R:new THREE.Vector4(0,-s,0,c)};
    }
    case 'uv': {
      const q = new THREE.Vector4(0,0,s,c); return {L:q.clone(), R:new THREE.Vector4(0,0,-s,c)};
    }
  }
}

export function project(p: THREE.Vector4, mode: ProjectionMode): THREE.Vector3{
  if(mode===ProjectionMode.Perspective) return new THREE.Vector3(p.x,p.y,p.z).multiplyScalar(1/(3+p.w));
  if(mode===ProjectionMode.Stereo){ const n=p.clone().normalize(); return new THREE.Vector3(n.x,n.y,n.z).multiplyScalar(1/(1-n.w)); }
  if(mode===ProjectionMode.Hopf){ const xy=new THREE.Vector2(p.x,p.y); const w=p.w; const z=p.z; return new THREE.Vector3(2*xy.x*w,2*xy.y*w, w*w+p.x*p.x-xy.y*xy.y - z*z); }
  if(mode===ProjectionMode.DropX) return new THREE.Vector3(p.y,p.z,p.w);
  if(mode===ProjectionMode.DropY) return new THREE.Vector3(p.x,p.z,p.w);
  if(mode===ProjectionMode.DropU) return new THREE.Vector3(p.x,p.y,p.w);
  return new THREE.Vector3(p.x,p.y,p.z);
}
