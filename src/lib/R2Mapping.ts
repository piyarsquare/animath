export type Vec2 = { x: number; y: number };

export type MappingFunction = (p: Vec2) => Vec2;

/**
 * Generic R^2 -> R^2 mapping.
 * The class simply stores a mapping function and exposes a `map` method.
 */
export class R2Mapping {
  func: MappingFunction;
  constructor(func: MappingFunction = (p) => ({ ...p })) {
    this.func = func;
  }
  map(p: Vec2): Vec2 {
    return this.func(p);
  }
}

// A small library of common mappings
export const R2Functions = {
  /** Identity mapping */
  identity: (p: Vec2): Vec2 => ({ x: p.x, y: p.y }),

  /** Treat (x,y) as complex number and return its square */
  complexSquare: (p: Vec2): Vec2 => ({ x: p.x * p.x - p.y * p.y, y: 2 * p.x * p.y }),

  /** Square root in the complex plane (principal branch) */
  complexSqrt: (p: Vec2): Vec2 => {
    const r = Math.hypot(p.x, p.y);
    const theta = Math.atan2(p.y, p.x) * 0.5;
    const sr = Math.sqrt(r);
    return { x: sr * Math.cos(theta), y: sr * Math.sin(theta) };
  },

  /** Swirling deformation depending on radius */
  swirl: (p: Vec2): Vec2 => {
    const r = Math.hypot(p.x, p.y);
    const angle = r;
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return { x: p.x * c - p.y * s, y: p.x * s + p.y * c };
  },

  /** Natural logarithm of the complex number */
  complexLn: (p: Vec2): Vec2 => {
    const r = Math.hypot(p.x, p.y);
    const theta = Math.atan2(p.y, p.x);
    return { x: Math.log(r), y: theta };
  },

  /** Exponential of the complex number */
  complexExp: (p: Vec2): Vec2 => {
    const expX = Math.exp(p.x);
    return { x: expX * Math.cos(p.y), y: expX * Math.sin(p.y) };
  },

  /** Sine of the complex number */
  complexSin: (p: Vec2): Vec2 => {
    const iz = { x: -p.y, y: p.x };
    const negIz = { x: p.y, y: -p.x };
    const ePos = R2Functions.complexExp(iz);
    const eNeg = R2Functions.complexExp(negIz);
    return {
      x: (ePos.y - eNeg.y) * 0.5,
      y: (eNeg.x - ePos.x) * 0.5
    };
  },

  /** Cosine of the complex number */
  complexCos: (p: Vec2): Vec2 => {
    const iz = { x: -p.y, y: p.x };
    const negIz = { x: p.y, y: -p.x };
    const ePos = R2Functions.complexExp(iz);
    const eNeg = R2Functions.complexExp(negIz);
    return {
      x: (ePos.x + eNeg.x) * 0.5,
      y: (ePos.y + eNeg.y) * 0.5
    };
  },

  /** Tangent of the complex number */
  complexTan: (p: Vec2): Vec2 => {
    const sin = R2Functions.complexSin(p);
    const cos = R2Functions.complexCos(p);
    const denom = cos.x * cos.x + cos.y * cos.y;
    if (denom < 1e-4) return { x: 10, y: 10 };
    return {
      x: (sin.x * cos.x + sin.y * cos.y) / denom,
      y: (sin.y * cos.x - sin.x * cos.y) / denom
    };
  },

  /** Inverse of the complex number */
  complexInverse: (p: Vec2): Vec2 => {
    const denom = p.x * p.x + p.y * p.y;
    if (denom < 1e-4) return { x: 10, y: 10 };
    return { x: p.x / denom, y: -p.y / denom };
  }
};
