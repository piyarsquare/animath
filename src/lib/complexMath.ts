import * as THREE from 'three';

export function complexSqrt(z: THREE.Vector2): THREE.Vector2 {
  const r = Math.hypot(z.x, z.y);
  const t = Math.atan2(z.y, z.x);
  const sr = Math.sqrt(r);
  return new THREE.Vector2(sr * Math.cos(t * 0.5), sr * Math.sin(t * 0.5));
}

export function complexSquare(z: THREE.Vector2): THREE.Vector2 {
  return new THREE.Vector2(z.x * z.x - z.y * z.y, 2 * z.x * z.y);
}

export function complexLn(z: THREE.Vector2): THREE.Vector2 {
  const r = Math.hypot(z.x, z.y);
  const t = Math.atan2(z.y, z.x);
  return new THREE.Vector2(Math.log(r), t);
}

export function complexExp(z: THREE.Vector2): THREE.Vector2 {
  const ex = Math.exp(z.x);
  return new THREE.Vector2(ex * Math.cos(z.y), ex * Math.sin(z.y));
}

export function complexSin(z: THREE.Vector2): THREE.Vector2 {
  const iz = new THREE.Vector2(-z.y, z.x);
  const e1 = complexExp(iz);
  const e2 = complexExp(new THREE.Vector2(-iz.x, -iz.y));
  const diff = new THREE.Vector2(e1.x - e2.x, e1.y - e2.y);
  return new THREE.Vector2(diff.y * 0.5, -diff.x * 0.5);
}

export function complexCos(z: THREE.Vector2): THREE.Vector2 {
  const iz = new THREE.Vector2(-z.y, z.x);
  const e1 = complexExp(iz);
  const e2 = complexExp(new THREE.Vector2(-iz.x, -iz.y));
  const sum = new THREE.Vector2(e1.x + e2.x, e1.y + e2.y);
  return new THREE.Vector2(sum.x * 0.5, sum.y * 0.5);
}

export function complexTan(z: THREE.Vector2): THREE.Vector2 {
  const s = complexSin(z);
  const c = complexCos(z);
  let d = c.x * c.x + c.y * c.y;
  if (d < 1e-4) d = 1e-4;
  return new THREE.Vector2((s.x * c.x + s.y * c.y) / d, (s.y * c.x - s.x * c.y) / d);
}

export function complexInv(z: THREE.Vector2): THREE.Vector2 {
  let d = z.x * z.x + z.y * z.y;
  if (d < 1e-4) d = 1e-4;
  return new THREE.Vector2(z.x / d, -z.y / d);
}

export function complexCube(z: THREE.Vector2): THREE.Vector2 {
  return new THREE.Vector2(
    z.x * z.x * z.x - 3 * z.x * z.y * z.y,
    3 * z.x * z.x * z.y - z.y * z.y * z.y
  );
}

export function complexReciprocalCube(z: THREE.Vector2): THREE.Vector2 {
  let d = z.dot(z);
  if (d < 1e-6) d = 1e-6;
  const z3 = complexCube(z);
  d = d * d * d;
  return new THREE.Vector2(z3.x / d, -z3.y / d);
}

export function complexJoukowski(z: THREE.Vector2): THREE.Vector2 {
  const inv = complexInv(z);
  return new THREE.Vector2(0.5 * (z.x + inv.x), 0.5 * (z.y + inv.y));
}

export function complexRational22(z: THREE.Vector2): THREE.Vector2 {
  const num = new THREE.Vector2(z.x * z.x - z.y * z.y + 1, 2 * z.x * z.y);
  const den = new THREE.Vector2(z.x * z.x - z.y * z.y - 1, 2 * z.x * z.y);
  const invd = complexInv(den);
  return new THREE.Vector2(num.x * invd.x - num.y * invd.y, num.x * invd.y + num.y * invd.x);
}

export function complexEssentialExpInv(z: THREE.Vector2): THREE.Vector2 {
  let r2 = z.dot(z);
  if (r2 < 1e-6) r2 = 1e-6;
  const inv = new THREE.Vector2(z.x / r2, -z.y / r2);
  return complexExp(inv);
}

export function complexBranchSqrtPoly(z: THREE.Vector2): THREE.Vector2 {
  const a = new THREE.Vector2(z.x - 1, z.y);
  const b = new THREE.Vector2(z.x + 1, z.y);
  const p = new THREE.Vector2(z.x * a.x - z.y * a.y, z.x * a.y + z.y * a.x);
  const q = new THREE.Vector2(p.x * b.x - p.y * b.y, p.x * b.y + p.y * b.x);
  return complexSqrt(q);
}

export function complexPowRational(z: THREE.Vector2, p: number, q: number): THREE.Vector2 {
  const r = Math.hypot(z.x, z.y);
  const t = Math.atan2(z.y, z.x);
  const mag = Math.pow(r, p / q);
  const ang = t * p / q;
  return new THREE.Vector2(mag * Math.cos(ang), mag * Math.sin(ang));
}

/** Branch-aware sqrt: adds branch * PI to the angle before taking the root. */
export function complexSqrtBranch(z: THREE.Vector2, branch: number): THREE.Vector2 {
  const r = Math.hypot(z.x, z.y);
  const t = Math.atan2(z.y, z.x) + branch * Math.PI;
  const sr = Math.sqrt(r);
  return new THREE.Vector2(sr * Math.cos(t * 0.5), sr * Math.sin(t * 0.5));
}

/** Branch-aware ln: adds branch * 2*PI to the imaginary part. */
export function complexLnBranch(z: THREE.Vector2, branch: number): THREE.Vector2 {
  const r = Math.hypot(z.x, z.y);
  const t = Math.atan2(z.y, z.x) + branch * 2 * Math.PI;
  return new THREE.Vector2(Math.log(r), t);
}

/** Branch-aware sqrt(z(z-1)(z+1)). */
export function complexBranchSqrtPolyBranch(z: THREE.Vector2, branch: number): THREE.Vector2 {
  const a = new THREE.Vector2(z.x - 1, z.y);
  const b = new THREE.Vector2(z.x + 1, z.y);
  const p = new THREE.Vector2(z.x * a.x - z.y * a.y, z.x * a.y + z.y * a.x);
  const q = new THREE.Vector2(p.x * b.x - p.y * b.y, p.x * b.y + p.y * b.x);
  return complexSqrtBranch(q, branch);
}

/** Apply one of the named complex functions by index. */
export function applyComplex(z: THREE.Vector2, t: number): THREE.Vector2 {
  switch (t) {
    case 0: return z.clone();
    case 1: return complexSqrt(z);
    case 2: return complexSquare(z);
    case 3: return complexLn(z);
    case 4: return complexExp(z);
    case 5: return complexSin(z);
    case 6: return complexCos(z);
    case 7: return complexTan(z);
    case 8: return complexInv(z);
    case 9: return complexCube(z);
    case 10: return complexReciprocalCube(z);
    case 11: return complexJoukowski(z);
    case 12: return complexRational22(z);
    case 13: return complexEssentialExpInv(z);
    case 14: return complexBranchSqrtPoly(z);
    default: return z.clone();
  }
}

/** Apply one of the named complex functions by index, with branch awareness. */
export function applyComplexBranch(z: THREE.Vector2, t: number, branch: number): THREE.Vector2 {
  switch (t) {
    case 0: return z.clone();
    case 1: return complexSqrtBranch(z, branch);
    case 2: return complexSquare(z);
    case 3: return complexLnBranch(z, branch);
    case 4: return complexExp(z);
    case 5: return complexSin(z);
    case 6: return complexCos(z);
    case 7: return complexTan(z);
    case 8: return complexInv(z);
    case 9: return complexCube(z);
    case 10: return complexReciprocalCube(z);
    case 11: return complexJoukowski(z);
    case 12: return complexRational22(z);
    case 13: return complexEssentialExpInv(z);
    case 14: return complexBranchSqrtPolyBranch(z, branch);
    default: return z.clone();
  }
}

export const functionNames = [
  'linear', 'sqrt', 'square', 'ln', 'exp', 'sin', 'cos', 'tan', 'inverse',
  'cube', 'reciprocalCube', 'joukowski', 'rational22', 'essentialExpInv',
  'branchSqrtPoly', 'gamma', 'cubeRoot', 'zMinus1OverZPlus1'
];

export const functionFormulas: Record<string, string> = {
  linear: 'z',
  sqrt: '\u221Az',
  square: 'z\u00B2',
  ln: 'ln(z)',
  exp: 'e^z',
  sin: 'sin(z)',
  cos: 'cos(z)',
  tan: 'tan(z)',
  inverse: '1/z',
  cube: 'z\u00B3',
  reciprocalCube: '1/z\u00B3',
  joukowski: '0.5*(z + 1/z)',
  rational22: '(z\u00B2 + 1)/(z\u00B2 - 1)',
  essentialExpInv: 'e^{1/z}',
  branchSqrtPoly: '\u221A(z(z-1)(z+1))',
  gamma: '\u0393(z)',
  cubeRoot: '\u221Bz',
  zMinus1OverZPlus1: '(z-1)/(z+1)'
};
