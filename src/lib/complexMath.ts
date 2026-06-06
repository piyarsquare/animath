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

/** Principal cube root: r^(1/3) at angle/3. (Vertex shader's complexCbrt.) */
export function complexCubeRoot(z: THREE.Vector2): THREE.Vector2 {
  const r = Math.hypot(z.x, z.y);
  const t = Math.atan2(z.y, z.x);
  const rr = Math.cbrt(r);
  return new THREE.Vector2(rr * Math.cos(t / 3), rr * Math.sin(t / 3));
}

/** Möbius transform (z - 1) / (z + 1). */
export function complexZMinus1OverZPlus1(z: THREE.Vector2): THREE.Vector2 {
  const num = new THREE.Vector2(z.x - 1, z.y);
  const denInv = complexInv(new THREE.Vector2(z.x + 1, z.y));
  return new THREE.Vector2(
    num.x * denInv.x - num.y * denInv.y,
    num.x * denInv.y + num.y * denInv.x,
  );
}

/** Gamma function via the Stirling-like approximation used in the vertex
 *  shader: Γ(z) ≈ exp((z − 1/2) · ln z − z + (1/2) ln 2π). Same accuracy
 *  envelope as the GPU path. */
export function complexGamma(z: THREE.Vector2): THREE.Vector2 {
  const halfVec = new THREE.Vector2(0.5, 0);
  const logZ = complexLn(z);
  const zMinusHalf = new THREE.Vector2(z.x - halfVec.x, z.y - halfVec.y);
  // (z − 1/2) · log z, in complex multiplication.
  const prod = new THREE.Vector2(
    zMinusHalf.x * logZ.x - zMinusHalf.y * logZ.y,
    zMinusHalf.x * logZ.y + zMinusHalf.y * logZ.x,
  );
  const t = new THREE.Vector2(
    prod.x - z.x + 0.5 * Math.log(2 * Math.PI),
    prod.y - z.y,
  );
  return complexExp(t);
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

/** Cotangent cos(z)/sin(z) (single-valued, poles where sin z = 0). */
export function complexCot(z: THREE.Vector2): THREE.Vector2 {
  const s = complexSin(z);
  const c = complexCos(z);
  let d = s.x * s.x + s.y * s.y;
  if (d < 1e-4) d = 1e-4;
  return new THREE.Vector2((c.x * s.x + c.y * s.y) / d, (c.y * s.x - c.x * s.y) / d);
}

/** 1 − z², the radicand shared by the inverse-trig functions. */
function oneMinusSquare(z: THREE.Vector2): THREE.Vector2 {
  return new THREE.Vector2(1 - (z.x * z.x - z.y * z.y), -(2 * z.x * z.y));
}

/** Multivalued arcsin: −i·ln(iz + √(1−z²)). The ln carries the branch (the
 *  ±2π·k sheets); the inner sqrt stays principal. */
export function complexArcsin(z: THREE.Vector2, branch = 0): THREE.Vector2 {
  const s = complexSqrt(oneMinusSquare(z));
  const iz = new THREE.Vector2(-z.y, z.x);
  const w = new THREE.Vector2(iz.x + s.x, iz.y + s.y);
  const lnw = complexLnBranch(w, branch);
  return new THREE.Vector2(lnw.y, -lnw.x); // −i · ln w
}

/** Multivalued arccos: −i·ln(z + i√(1−z²)), branch on the ln (the ±2π·k sheets). */
export function complexArccos(z: THREE.Vector2, branch = 0): THREE.Vector2 {
  const s = complexSqrt(oneMinusSquare(z));
  const is = new THREE.Vector2(-s.y, s.x); // i · sqrt
  const w = new THREE.Vector2(z.x + is.x, z.y + is.y);
  const lnw = complexLnBranch(w, branch);
  return new THREE.Vector2(lnw.y, -lnw.x); // −i · ln w
}

/** Apply one of the named complex functions by index. Mirrors the shader's
 *  applyComplex dispatch — cases 0..17 cover the named functions; case 18
 *  (powPQ) needs the p/q parameters and is handled by complexPowRational
 *  directly. */
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
    case 15: return complexGamma(z);
    case 16: return complexCubeRoot(z);
    case 17: return complexZMinus1OverZPlus1(z);
    case 19: return complexCot(z);
    case 20: return complexArcsin(z);
    case 21: return complexArccos(z);
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
    case 15: return complexGamma(z);
    case 16: return complexCubeRoot(z);
    case 17: return complexZMinus1OverZPlus1(z);
    case 19: return complexCot(z);
    case 20: return complexArcsin(z, branch);
    case 21: return complexArccos(z, branch);
    default: return z.clone();
  }
}

// Append-only: the numeric index is persisted (functionIndex) and drives the
// shader's applyComplex switch, so add new functions at the END, never reorder.
export const functionNames = [
  'linear', 'sqrt', 'square', 'ln', 'exp', 'sin', 'cos', 'tan', 'inverse',
  'cube', 'reciprocalCube', 'joukowski', 'rational22', 'essentialExpInv',
  'branchSqrtPoly', 'gamma', 'cubeRoot', 'zMinus1OverZPlus1', 'powPQ',
  'cot', 'arcsin', 'arccos'
];

/** Index of the z^(p/q) rational-power function in {@link functionNames}. */
export const POW_PQ_INDEX = 18;

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
  zMinus1OverZPlus1: '(z-1)/(z+1)',
  powPQ: 'z^(p/q)',
  cot: 'cos(z)/sin(z)',
  arcsin: 'arcsin(z)',
  arccos: 'arccos(z)'
};

/** Function picker grouping: each category lists member indices into
 *  {@link functionNames}. Presentation only \u2014 values stay the numeric indices,
 *  so reordering categories never affects persisted selections. Covers every
 *  index exactly once; append new functions to the appropriate category. */
export const functionCategories: { label: string; members: number[] }[] = [
  { label: 'Polynomial & rational', members: [0, 2, 9, 8, 10, 12] },
  { label: 'Roots & log (multivalued)', members: [1, 16, 18, 3, 14] },
  { label: 'Trig & inverse-trig', members: [5, 6, 7, 19, 20, 21] },
  { label: 'Exp & essential', members: [4, 13] },
  { label: 'Special', members: [15, 11, 17] }
];
