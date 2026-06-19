// Pure quaternion/double-cover math for The Belt — no Three.js, no React, so it
// can be unit-tested directly (the highest-leverage confidence lever given CI is
// only `npm run build`). The block's rotation angle θ (which may exceed 360° —
// it is an *accumulated* turn, the single source of truth) drives everything.

export interface BeltReadout {
  /** Block rotation in degrees — the accumulated turn (0…720+, can be negative). */
  turnDeg: number;
  /** The half-angle θ/2 in degrees — the rate the unit quaternion advances. */
  halfDeg: number;
  /** Scalar part of the unit quaternion: w = cos(θ/2). Ticks to −1 at 360°. */
  w: number;
  /** Which sheet of the double cover the representative sits on (sign of w near
   *  the poles): +1 in [0,360) mod 720, −1 in [360,720) mod 720. */
  sign: 1 | -1;
  /** True when the quaternion is home (w ≈ +1, i.e. θ ≡ 0 mod 720°). */
  atHome: boolean;
  /** True at the antipode (w ≈ −1, i.e. θ ≡ 360 mod 720°) — the −q sheet. */
  atAntipode: boolean;
  /** Number of full block turns, signed. */
  turns: number;
}

const DEG = Math.PI / 180;
const EPS = 1e-3;

/** Read every derived quantity from the accumulated block angle (in degrees). */
export function beltReadout(turnDeg: number): BeltReadout {
  const halfRad = (turnDeg * DEG) / 2;
  const w = Math.cos(halfRad);
  // Sign of the representative = sign of cos(θ/2); resolve the ±90° boundary by
  // folding θ into [0,720): [0,360)→+, [360,720)→−.
  const folded = ((turnDeg % 720) + 720) % 720;
  const sign: 1 | -1 = folded < 360 ? 1 : -1;
  return {
    turnDeg,
    halfDeg: turnDeg / 2,
    w,
    sign,
    atHome: w > 1 - EPS,
    atAntipode: w < -1 + EPS,
    turns: turnDeg / 360,
  };
}

/** Format the scalar for the at-a-glance readout (mono font): "w = −1.000". */
export function formatW(w: number): string {
  // Avoid "-0.000": clamp tiny magnitudes to +0.
  const v = Math.abs(w) < 5e-4 ? 0 : w;
  const s = v.toFixed(3);
  return s.startsWith('-') ? s.replace('-', '−') : s; // U+2212 minus
}
