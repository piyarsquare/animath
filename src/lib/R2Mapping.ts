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
  }
};
