import { describe, expect, it } from 'vitest';
import {
  type Planar, pt, ONE, ZERO,
  kindOf, add, sub, smul, mul, conj, norm, inv, div,
  exp, log, powReal, sqrt,
  unit, fromPolar, arg, argDefined, toPolar,
  affine, affineFixedPoint, polyEval, polyFixedPoints, criticalPoint, plane,
} from '../numberPlanes';

/* Test fixtures -------------------------------------------------------- */

// The three canonical classes (only the sign of p is meaningful).
const SPIN = -1, SHEAR = 0, BOOST = 1;
const CLASSES = [SPIN, SHEAR, BOOST];

// A deterministic spread of sample points (no Math.random — tests must be stable).
const SAMPLES: Planar[] = [
  pt(1, 0), pt(0, 1), pt(2, 3), pt(-1.5, 0.4), pt(3, -2),
  pt(0.5, 0.5), pt(2.2, 0.1), pt(-0.3, -1.1), pt(4, 1), pt(1, -0.25),
];

const close = (a: number, b: number, eps = 1e-6) => expect(Math.abs(a - b)).toBeLessThan(eps);
const closeP = (a: Planar, b: Planar, eps = 1e-6) => {
  expect(Math.abs(a.x - b.x)).toBeLessThan(eps);
  expect(Math.abs(a.y - b.y)).toBeLessThan(eps);
};

/* --------------------------------------------------------------------- */

describe('kindOf — only the sign of p = j² matters', () => {
  it('maps sign to class', () => {
    expect(kindOf(-1)).toBe('spin');
    expect(kindOf(-0.01)).toBe('spin');
    expect(kindOf(0)).toBe('shear');
    expect(kindOf(1)).toBe('boost');
    expect(kindOf(7)).toBe('boost');
  });
});

describe('vector-space part is class-independent', () => {
  it('add / sub / smul', () => {
    closeP(add(pt(1, 2), pt(3, -1)), pt(4, 1));
    closeP(sub(pt(1, 2), pt(3, -1)), pt(-2, 3));
    closeP(smul(pt(2, -3), 2.5), pt(5, -7.5));
  });
});

describe('multiplication specializes to ordinary complex at p = −1', () => {
  it('mul(a,b,−1) equals (a.x+a.y i)(b.x+b.y i)', () => {
    for (const a of SAMPLES) for (const b of SAMPLES) {
      const expected = pt(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
      closeP(mul(a, b, SPIN), expected);
    }
  });
  it('i² = −1 in Spin, ε² = 0 in Shear, j² = +1 in Boost', () => {
    closeP(mul(pt(0, 1), pt(0, 1), SPIN), pt(-1, 0));
    closeP(mul(pt(0, 1), pt(0, 1), SHEAR), pt(0, 0));
    closeP(mul(pt(0, 1), pt(0, 1), BOOST), pt(1, 0));
  });
});

describe('algebra laws hold in every class', () => {
  for (const p of CLASSES) {
    it(`commutative · associative · distributive · identity (p=${p})`, () => {
      for (const a of SAMPLES) {
        closeP(mul(a, ONE, p), a);                                  // identity
        closeP(mul(ONE, a, p), a);
        for (const b of SAMPLES) {
          closeP(mul(a, b, p), mul(b, a, p));                       // commutative
          for (const c of SAMPLES.slice(0, 4)) {
            closeP(mul(mul(a, b, p), c, p), mul(a, mul(b, c, p), p)); // associative
            closeP(mul(a, add(b, c), p), add(mul(a, b, p), mul(a, c, p))); // distributive
          }
        }
      }
    });
  }
});

describe('the norm N(z)=x²−p·y² is multiplicative (the unifying invariant)', () => {
  for (const p of CLASSES) {
    it(`N(z·w) = N(z)·N(w) (p=${p})`, () => {
      for (const a of SAMPLES) for (const b of SAMPLES) {
        close(norm(mul(a, b, p), p), norm(a, p) * norm(b, p), 1e-6);
      }
    });
    it(`z·conj(z) has x-part N(z), y-part 0 (p=${p})`, () => {
      for (const a of SAMPLES) {
        const prod = mul(a, conj(a), p);
        close(prod.x, norm(a, p));
        close(prod.y, 0);
      }
    });
  }
});

describe('inverse and division', () => {
  for (const p of CLASSES) {
    it(`z · z⁻¹ = 1 off the null set; null on it (p=${p})`, () => {
      for (const a of SAMPLES) {
        const ai = inv(a, p);
        if (Math.abs(norm(a, p)) < 1e-9) {
          expect(ai).toBeNull();
        } else {
          closeP(mul(a, ai as Planar, p), ONE);
          const q = div(a, a, p);
          closeP(q as Planar, ONE);
        }
      }
    });
  }
  it('Boost null cone (1,1) has no inverse', () => {
    expect(inv(pt(1, 1), BOOST)).toBeNull();
    expect(inv(pt(1, -1), BOOST)).toBeNull();
  });
});

describe('exp / log are inverse on the legal domain', () => {
  for (const p of CLASSES) {
    it(`log(exp(u+vj)) = u+vj for small v (p=${p})`, () => {
      for (const u of [-0.5, 0, 0.7]) for (const v of [-0.4, 0, 0.3]) {
        const z = exp(u, v, p);
        const L = log(z, p);
        expect(L).not.toBeNull();
        close((L as { u: number; v: number }).u, u, 1e-6);
        close((L as { u: number; v: number }).v, v, 1e-6);
      }
    });
    it(`exp(0,0)=1 (p=${p})`, () => closeP(exp(0, 0, p), ONE));
  }
  it('exp(0,θ) rides the unit curve (N=1) in every class', () => {
    for (const p of CLASSES) for (const th of [-0.6, 0.2, 1.1]) {
      close(norm(exp(0, th, p), p), 1, 1e-6);
    }
  });
  it('log is null on the null set / wrong sheet', () => {
    expect(log(pt(1, 1), BOOST)).toBeNull();   // null cone
    expect(log(pt(0.5, 1), BOOST)).toBeNull(); // past the cone
    expect(log(pt(-2, 0.3), SHEAR)).toBeNull(); // dual needs x>0
    expect(log(ZERO, SPIN)).toBeNull();         // origin
  });
});

describe('real powers', () => {
  for (const p of CLASSES) {
    it(`b⁰=1, b¹=b, b²=b·b on the legal domain (p=${p})`, () => {
      for (const b of SAMPLES) {
        if (!argDefined(b, p)) continue;             // skip where the spiral falls back
        closeP(powReal(b, p, 0), ONE, 1e-6);
        closeP(powReal(b, p, 1), b, 1e-6);
        closeP(powReal(b, p, 2), mul(b, b, p), 1e-6);
      }
    });
  }
  it('sqrt(z)² = z in Spin', () => {
    for (const z of SAMPLES) {
      const r = sqrt(z, SPIN);
      closeP(mul(r, r, SPIN), z, 1e-6);
    }
  });
});

describe('polar form: z = ρ·e^{jθ} round-trips on the legal domain', () => {
  for (const p of CLASSES) {
    it(`fromPolar(toPolar(z)) = z where the angle exists (p=${p})`, () => {
      for (const z of SAMPLES) {
        const polar = toPolar(z, p);
        if (polar === null) { expect(argDefined(z, p)).toBe(false); continue; }
        closeP(fromPolar(polar.rho, polar.theta, p), z, 1e-6);
      }
    });
  }
  it('unit(θ) is the circle / line / hyperbola point', () => {
    closeP(unit(0, 'spin'), ONE);
    close(norm(unit(0.9, 'spin'), SPIN), 1);          // on the circle
    close(norm(unit(0.9, 'boost'), BOOST), 1);        // on the hyperbola
    closeP(unit(0.5, 'shear'), pt(1, 0.5));           // on the line x=1
  });
});

describe('multiplication adds the angle θ (the spin/shear/boost law)', () => {
  for (const p of CLASSES) {
    it(`arg(z·w) = arg(z)+arg(w) on the legal domain (p=${p})`, () => {
      for (const z of SAMPLES) for (const w of SAMPLES) {
        const az = arg(z, p), aw = arg(w, p), azw = arg(mul(z, w, p), p);
        if (az === null || aw === null || azw === null) continue;
        // Spin angle wraps mod 2π; Shear/Boost angles add exactly.
        let diff = az + aw - azw;
        if (p < 0) diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        close(diff, 0, 1e-6);
      }
    });
  }
  it('Boost rapidity is additive and unbounded (a real boost composition)', () => {
    const a = fromPolar(1, 0.4, BOOST), b = fromPolar(1, 0.9, BOOST);
    close(arg(mul(a, b, BOOST), BOOST) as number, 1.3, 1e-6);
  });
});

describe('argDefined marks exactly the honest domain', () => {
  it('Spin: everywhere but the origin', () => {
    expect(argDefined(pt(0, 0), SPIN)).toBe(false);
    expect(argDefined(pt(-2, 0), SPIN)).toBe(true);
  });
  it('Shear: x>0 only (the degenerate line x=0 has no slope-angle)', () => {
    expect(argDefined(pt(0, 5), SHEAR)).toBe(false);
    expect(argDefined(pt(2, 5), SHEAR)).toBe(true);
  });
  it('Boost: the principal future cone x>|y| only', () => {
    expect(argDefined(pt(3, 1), BOOST)).toBe(true);
    expect(argDefined(pt(1, 1), BOOST)).toBe(false);   // on the null cone
    expect(argDefined(pt(1, 2), BOOST)).toBe(false);   // outside the cone
    expect(argDefined(pt(-3, 0), BOOST)).toBe(false);  // past cone
  });
});

describe('lines: f(z)=α₁z+α₀ and its fixed point', () => {
  for (const p of CLASSES) {
    it(`f(z*) = z* where z* exists (p=${p})`, () => {
      const a1 = pt(0.4, 0.3), a0 = pt(1, -0.5);
      const zStar = affineFixedPoint(a1, a0, p);
      expect(zStar).not.toBeNull();
      closeP(affine(zStar as Planar, a1, a0, p), zStar as Planar, 1e-6);
    });
  }
  it('the fixed point escapes (null) as α₁ → 1 — a pure shift has none', () => {
    expect(affineFixedPoint(ONE, pt(2, 1), SPIN)).toBeNull();
    expect(affineFixedPoint(pt(1, 0), pt(0, 3), BOOST)).toBeNull();
  });
});

describe('polynomials', () => {
  it('polyEval matches the written-out quadratic in Spin', () => {
    const c = [pt(1, -1), pt(0.5, 2), pt(-0.3, 0.4)]; // α₀,α₁,α₂
    const z = pt(1.2, -0.7);
    const z2 = mul(z, z, SPIN);
    const manual = add(add(c[0], mul(c[1], z, SPIN)), mul(c[2], z2, SPIN));
    closeP(polyEval(c, z, SPIN), manual, 1e-9);
  });
  it('degree-2 fixed points satisfy f(z*)=z* in Spin (exact case)', () => {
    const c = [pt(0.6, 0.2), pt(0.1, -0.4), pt(0.5, 0.3)];
    const roots = polyFixedPoints(c, SPIN);
    expect(roots.length).toBe(2);
    for (const r of roots) closeP(polyEval(c, r, SPIN), r, 1e-6);
  });
  it('critical point is where the derivative 2α₂z+α₁ vanishes', () => {
    const c = [pt(1, 0), pt(0.4, -0.2), pt(0.5, 0.3)];
    const zc = criticalPoint(c, SPIN) as Planar;
    const deriv = add(mul(smul(c[2], 2), zc, SPIN), c[1]); // f'(zc)
    closeP(deriv, ZERO, 1e-6);
  });
});

describe('plane(p) strategy object mirrors the free functions', () => {
  for (const p of CLASSES) {
    it(`bound ops agree with free ops (p=${p})`, () => {
      const P = plane(p);
      expect(P.kind).toBe(kindOf(p));
      for (const a of SAMPLES.slice(0, 5)) for (const b of SAMPLES.slice(0, 5)) {
        closeP(P.mul(a, b), mul(a, b, p));
      }
      close(P.norm(SAMPLES[2]), norm(SAMPLES[2], p));
    });
  }
});
