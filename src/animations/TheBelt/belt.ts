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

// --- The untwist homotopy ---------------------------------------------------
//
// The belt's twist is a PATH of unit quaternions q(s) along its length s∈[0,1],
// from the fixed clamp q(0)=1 to the block q(1). Untwisting the belt — without
// turning the block back — is a *null-homotopy* of that path that keeps BOTH
// endpoints pinned (the clamp at 1, the block wherever its turn left it).
//
//   • A 720° turn lands the block at q(1)=+1, so the path is a closed loop on
//     S³. S³ is simply connected, so the loop contracts to the flat belt — it
//     CAN be untwisted.
//   • A 360° turn strands the block at q(1)=−1 (the antipode — the SAME 3D
//     rotation, the other sheet). No pinned homotopy to the flat path exists,
//     because the flat path ends at +1 and this one is nailed to −1. That
//     impossibility IS the belt's refusal.
//
// This is an honest demonstration of π₁(SO(3)) = ℤ/2, not a proof.

/** A bare unit quaternion (x,y,z,w) — the belt runs along +Y, so a pure twist
 *  is a rotation about the Y axis. Kept Three-free for testing. */
export interface Quat { x: number; y: number; z: number; w: number }

const IDENTITY: Quat = { x: 0, y: 0, z: 0, w: 1 };

function normalize(q: Quat): Quat {
  const n = Math.hypot(q.x, q.y, q.z, q.w);
  if (n < 1e-9) return { ...IDENTITY };
  return { x: q.x / n, y: q.y / n, z: q.z / n, w: q.w / n };
}

/** Frame of the *pure twist* at belt parameter s for a block turn of `turnRad`
 *  (radians). Rotation about Y by the accumulated angle θ·s. */
export function twistFrame(s: number, turnRad: number): Quat {
  const a = (turnRad * s) / 2; // quaternion half-angle
  return { x: 0, y: Math.sin(a), z: 0, w: Math.cos(a) };
}

/** Can the belt be shed by looping it around (an even number of half-turns,
 *  i.e. the block back at +1)? True for 0°, 720°, 1440°, … */
export function isContractible(turnDeg: number): boolean {
  const turns = Math.round(turnDeg / 360);
  return turns % 2 === 0;
}

/** The homotopy frame at belt parameter s and homotopy time t∈[0,1].
 *
 *  **Valid only for a contractible turn** (an even number of half-turns, block
 *  back at +1) — that is the success animation. t=0 reproduces the pure twist;
 *  t=1 reaches the flat belt (identity at every s). Endpoints are pinned for all
 *  t: s=0 stays at 1, and s=1 stays at the block's home frame +1. (For a
 *  non-contractible turn there is no such homotopy — the block is stranded at
 *  −1 — which is why the refusal only strains the body and never completes.)
 *
 *  The contraction is a straight blend from the twisted frame toward identity,
 *  with a transverse Z nudge (`bow`) that lifts the belt's body out of its
 *  plane so it can route *around* the q=−1 antipode it would otherwise pass
 *  through at the midpoint — the geometric content of "loop it over the top."
 *  The nudge vanishes at both ends (sin πs) and at t=0,1, so the endpoints and
 *  the start/end states are exact. */
export function untwistFrame(s: number, t: number, turnRad: number, bow = 2.6): Quat {
  const a = (turnRad * s) / 2;
  const baseW = Math.cos(a);
  const baseY = Math.sin(a);
  const u = 1 - t;
  return normalize({
    x: 0,
    y: u * baseY,
    z: t * u * Math.sin(Math.PI * s) * bow,
    w: u * baseW + t * 1,
  });
}

