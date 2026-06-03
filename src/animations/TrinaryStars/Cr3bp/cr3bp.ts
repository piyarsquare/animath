/** Circular restricted three-body problem (CR3BP) in the co-rotating frame.
 *  Two primaries of mass (1-μ) at (-μ,0) and μ at (1-μ,0) sit fixed; a massless
 *  test particle moves under their gravity plus the centrifugal and Coriolis
 *  terms. Units: G=1, total mass=1, separation=1, angular velocity ω=1. */

export interface State { x: number; y: number; vx: number; vy: number; }
export interface LPoint { name: string; x: number; y: number; }

/** Effective potential Ω = ½(x²+y²) + (1-μ)/r1 + μ/r2. */
export function omega(x: number, y: number, mu: number): number {
  const r1 = Math.hypot(x + mu, y);
  const r2 = Math.hypot(x - 1 + mu, y);
  return 0.5 * (x * x + y * y) + (1 - mu) / r1 + mu / r2;
}

/** Acceleration in the rotating frame (includes Coriolis 2ω×v). */
function accel(s: State, mu: number): { ax: number; ay: number } {
  const dx1 = s.x + mu, dx2 = s.x - 1 + mu;
  const r1 = Math.hypot(dx1, s.y), r2 = Math.hypot(dx2, s.y);
  const r13 = r1 * r1 * r1, r23 = r2 * r2 * r2;
  const Ox = s.x - (1 - mu) * dx1 / r13 - mu * dx2 / r23;
  const Oy = s.y - (1 - mu) * s.y / r13 - mu * s.y / r23;
  return { ax: 2 * s.vy + Ox, ay: -2 * s.vx + Oy };
}

/** One RK4 step (the Coriolis term makes leapfrog awkward; RK4 is plenty for a
 *  single test particle). */
export function rk4(s: State, dt: number, mu: number): State {
  const f = (st: State): State => { const a = accel(st, mu); return { x: st.vx, y: st.vy, vx: a.ax, vy: a.ay }; };
  const add = (a: State, b: State, h: number): State => ({ x: a.x + b.x * h, y: a.y + b.y * h, vx: a.vx + b.vx * h, vy: a.vy + b.vy * h });
  const k1 = f(s);
  const k2 = f(add(s, k1, dt / 2));
  const k3 = f(add(s, k2, dt / 2));
  const k4 = f(add(s, k3, dt));
  return {
    x: s.x + dt / 6 * (k1.x + 2 * k2.x + 2 * k3.x + k4.x),
    y: s.y + dt / 6 * (k1.y + 2 * k2.y + 2 * k3.y + k4.y),
    vx: s.vx + dt / 6 * (k1.vx + 2 * k2.vx + 2 * k3.vx + k4.vx),
    vy: s.vy + dt / 6 * (k1.vy + 2 * k2.vy + 2 * k3.vy + k4.vy),
  };
}

/** Jacobi constant C = 2Ω - v² (conserved). Zero-velocity curves are 2Ω = C;
 *  the particle is confined to where 2Ω ≥ C. */
export function jacobi(s: State, mu: number): number {
  return 2 * omega(s.x, s.y, mu) - (s.vx * s.vx + s.vy * s.vy);
}

/** The five Lagrange points: L4/L5 exact at the equilateral apexes, L1–L3 found
 *  by bisecting ∂Ω/∂x = 0 along the x-axis. */
export function lagrangePoints(mu: number): LPoint[] {
  const gx = (x: number) => {
    const d1 = x + mu, d2 = x - 1 + mu;
    return x - (1 - mu) * d1 / Math.abs(d1) ** 3 - mu * d2 / Math.abs(d2) ** 3;
  };
  const solve = (lo: number, hi: number): number => {
    let a = lo, b = hi, fa = gx(a);
    for (let k = 0; k < 80; k++) {
      const m = (a + b) / 2, fm = gx(m);
      if (fa * fm <= 0) b = m; else { a = m; fa = fm; }
    }
    return (a + b) / 2;
  };
  return [
    { name: 'L1', x: solve(-mu + 1e-4, 1 - mu - 1e-4), y: 0 },
    { name: 'L2', x: solve(1 - mu + 1e-4, 2), y: 0 },
    { name: 'L3', x: solve(-2, -mu - 1e-4), y: 0 },
    { name: 'L4', x: 0.5 - mu, y: Math.sqrt(3) / 2 },
    { name: 'L5', x: 0.5 - mu, y: -Math.sqrt(3) / 2 },
  ];
}
