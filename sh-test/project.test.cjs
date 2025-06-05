const assert = require('assert');

function project(p, mode){
  if(mode===0) return [p[0]/(3+p[3]), p[1]/(3+p[3]), p[2]/(3+p[3])];
  if(mode===1){
    const l=Math.hypot(...p); const n=p.map(v=>v/l); return [n[0]/(1-n[3]),n[1]/(1-n[3]),n[2]/(1-n[3])];
  }
  if(mode===2){ const w=p[3]; return [2*p[0]*w,2*p[1]*w,w*w+p[0]*p[0]-p[1]*p[1]-p[2]*p[2]]; }
  if(mode===3) return [p[1],p[2],p[3]];
  if(mode===4) return [p[0],p[2],p[3]];
  if(mode===5) return [p[0],p[1],p[3]];
  return [p[0],p[1],p[2]];
}

const out = project([1,2,3,4],3);
assert.deepStrictEqual(out,[2,3,4]);
console.log('project DropX OK');
