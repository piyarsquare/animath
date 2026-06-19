/**
 * Solid Worlds — the schema layer (pure combinatorics, Three.js-free).
 *
 * The 3D heir of PolygonWorlds' `surfaceSchema.ts`. A closed 3-manifold is a
 * polyhedron with its faces glued in pairs; here the polyhedron is a cube and a
 * **face-pairing** glues each opposite-face pair (+axis ↔ −axis) by an isometry:
 * an orthogonal linear part `M` followed by a translation along that axis.
 *
 * Tier 1 owns only the flat (κ = 0) cube worlds, so the only invariant this
 * layer computes from first principles is **orientability** — the manifold is
 * orientable iff every pairing is orientation-preserving (det M = +1). The
 * richer invariants (vertex-link manifold test, H₁ via Smith normal form) are
 * Tier 2; until then H₁ and the manifold name are carried as **curated catalog
 * facts**, never claimed as a classification (per the plan's honesty rule).
 */

import { computeHomology } from './lib/homology';

export type Axis = 'x' | 'y' | 'z';
export const AXES: readonly Axis[] = ['x', 'y', 'z'];
export const axisIndex = (a: Axis): 0 | 1 | 2 => (a === 'x' ? 0 : a === 'y' ? 1 : 2);

/** Row-major 3×3 matrix: [m00,m01,m02, m10,m11,m12, m20,m21,m22]. */
export type M3 = readonly number[];

export const I3: M3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];

/** Reflection that negates one axis (a glide-reflection's linear part). */
export function reflect(axis: Axis): M3 {
  const i = axisIndex(axis);
  return [i === 0 ? -1 : 1, 0, 0, 0, i === 1 ? -1 : 1, 0, 0, 0, i === 2 ? -1 : 1];
}

/** Rotation by `deg` degrees about one axis (a turn-space's linear part). */
export function rot(axis: Axis, deg: number): M3 {
  const r = (deg * Math.PI) / 180, c = Math.round(Math.cos(r)), s = Math.round(Math.sin(r));
  if (axis === 'x') return [1, 0, 0, 0, c, -s, 0, s, c];
  if (axis === 'y') return [c, 0, s, 0, 1, 0, -s, 0, c];
  return [c, -s, 0, s, c, 0, 0, 0, 1];
}

export function transposeM3(m: M3): M3 {
  return [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];
}

export function traceM3(m: M3): number { return m[0] + m[4] + m[8]; }

/** The rotation angle (degrees) of a proper orthogonal matrix; 0 for the
 *  identity. Meaningless for improper matrices (det −1) — callers gate on det. */
export function rotationAngleDeg(m: M3): number {
  const t = Math.max(-1, Math.min(1, (traceM3(m) - 1) / 2));
  return (Math.acos(t) * 180) / Math.PI;
}

export function mulM3(a: M3, b: M3): M3 {
  const r = new Array(9).fill(0);
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++) {
      let s = 0;
      for (let k = 0; k < 3; k++) s += a[i * 3 + k] * b[k * 3 + j];
      r[i * 3 + j] = s;
    }
  return r;
}

export function detM3(m: M3): number {
  return (
    m[0] * (m[4] * m[8] - m[5] * m[7]) -
    m[1] * (m[3] * m[8] - m[5] * m[6]) +
    m[2] * (m[3] * m[7] - m[4] * m[6])
  );
}

/**
 * One face-pairing: the +`axis` face glued to the −`axis` face by linear part
 * `linear` (orthogonal, det ±1) then translation by the cube edge along +axis.
 *
 * `offset` adds an extra translation (in cube-edge units) *beyond* that full
 * step along the axis — the off-axis component that turns a plain rotation into
 * a **screw** (and lets the Hantzsche–Wendt half-turn screws be expressed).
 * Defaults to none.
 */
export interface Pairing {
  axis: Axis;
  linear: M3;
  offset?: readonly [number, number, number];
}

/** Sign of a pairing's linear part: +1 proper (translation/rotation), −1 a
 *  glide-reflection (orientation-reversing). */
export const pairingDet = (p: Pairing): 1 | -1 => (detM3(p.linear) < 0 ? -1 : 1);

export interface SolidWorldSpec {
  id: string;
  label: string;
  /** One-line monospace subtitle. */
  short: string;
  blurb: string;
  /** Exactly one pairing per axis. */
  pairings: Pairing[];
  /** Curated catalog facts (Tier 1 — stated, not derived). */
  manifold: string;
  h1: string;
}

export interface AxisAnalysis {
  axis: Axis;
  det: 1 | -1;
  kind: 'translation' | 'glide-reflection';
  /** True when crossing this pairing reverses orientation. */
  reversing: boolean;
}

export interface SolidAnalysis {
  orientable: boolean;
  perAxis: AxisAnalysis[];
  reversingAxes: Axis[];
  manifold: string;
  /** H₁ computed from the cellular chain complex (lib/homology.ts). */
  h1: string;
  /** Euler characteristic V − E + F − C; 0 for a closed 3-manifold. */
  euler: number;
  /** True when χ = 0 (a necessary manifold sanity check). */
  manifoldConsistent: boolean;
  /** True when every vertex link is a 2-sphere — the genuine manifold certificate
   *  (distinguishes a real manifold from a same-homology pseudomanifold). */
  isManifold: boolean;
  note: string;
}

export function analyzeSolid(w: SolidWorldSpec): SolidAnalysis {
  const perAxis: AxisAnalysis[] = AXES.map((axis) => {
    const p = w.pairings.find((q) => q.axis === axis)!;
    const det = pairingDet(p);
    return {
      axis,
      det,
      kind: det === 1 ? 'translation' : 'glide-reflection',
      reversing: det === -1,
    };
  });
  const reversingAxes = perAxis.filter((a) => a.reversing).map((a) => a.axis);
  const orientable = reversingAxes.length === 0;
  const hom = computeHomology(w);
  const note = orientable
    ? 'Every face pairing is a proper motion (det +1) — orientation survives every loop.'
    : `Crossing the ${reversingAxes.join('/')}-pairing reverses orientation (det −1): walk that loop once and you return mirror-reversed.`;
  return {
    orientable, perAxis, reversingAxes, manifold: w.manifold,
    h1: hom.h1, euler: hom.euler, manifoldConsistent: hom.euler === 0,
    isManifold: hom.manifold, note,
  };
}
