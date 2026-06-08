/**
 * Polygon Worlds — the knob model.
 *
 * Everything in this app starts from ONE object: a square fundamental polygon
 * with two decorated faces (trees on one side, columns on the other). The only
 * knob is how the square's four edges are **identified** in pairs, and with what
 * orientation. That single choice:
 *
 *   1. names the topology (the edge word / gluing),
 *   2. *forces* the curvature — for the glued surface to be smooth the corner
 *      angles meeting at each vertex must sum to 2π, which a flat square can only
 *      satisfy when χ = 0; otherwise Gauss–Bonnet (∫K dA = 2πχ) pins a non-zero
 *      total curvature, and the world must live on the sphere.
 *
 * So the host never picks an "engine"; it picks a {@link WorldSpec} and the
 * geometry (flat plane cover vs sphere cover) falls out of {@link deriveGeometry}.
 *
 * Four gluings of the square → four worlds:
 *   torus   — opposite edges, both glued by translation        (χ=0, flat)
 *   klein   — opposite edges, one pair glued with a flip        (χ=0, flat)
 *   rp2     — opposite edges, both pairs glued with a flip      (χ=1, positive)
 *   sphere  — ADJACENT edges folded together (a "pillowcase")   (χ=2, positive)
 */

import { analyze, SchemaAnalysis } from './surfaceSchema';

export type EdgeName = 'top' | 'right' | 'bottom' | 'left';

/** Which gluing class an edge belongs to — the two edges sharing a class glue. */
export type GluingClass = 'a' | 'b';

/** +1 = glued by translation (orientation-preserving); −1 = glued with a flip
 *  (a mirror / glide-reflection, orientation-reversing). */
export type Orient = 1 | -1;

export interface EdgePairing {
  pair: GluingClass;
  orient: Orient;
}

/** Opposite-edge gluing (torus/Klein/ℝP²) vs adjacent-edge fold (sphere). */
export type GluingMode = 'opposite' | 'adjacent';

/** The universal cover the world is realised on — derived from χ. */
export type Cover = 'euclidean' | 'spherical';

export interface WorldSpec {
  id: 'torus' | 'klein' | 'rp2' | 'sphere';
  label: string;
  /** short descriptor for the app header */
  short: string;
  mode: GluingMode;
  /** The canonical edge word read around the square's boundary (top→right→bottom→
   *  left), in {a, a⁻¹, b, b⁻¹}. This is the *topological* source of truth: feeding
   *  it to {@link analyzeSchema} reproduces χ / orientability / curvature / name with
   *  no per-surface special case (the eventual geometry engine develops from it). The
   *  `edges`/`chi`/`orientable` fields below are the current cover's presentation of
   *  the same gluing. */
  word: string;
  /** The identification of each of the square's four edges. */
  edges: Record<EdgeName, EdgePairing>;
  /** Euler characteristic V−E+F after identification. A *topological invariant*;
   *  for these four square gluings it is a known constant (it is what forces the
   *  geometry below). Stored rather than recomputed because the four presets are
   *  fixed — the edges still drive every visible gluing + the cover's behaviour. */
  chi: number;
  /** Whether a consistent global orientation survives the gluing (torus, sphere)
   *  or not (Klein, ℝP²). Like χ, a fact about the chosen gluing. */
  orientable: boolean;
}

export interface DerivedGeometry {
  chi: number;
  curvature: 'flat' | 'positive';
  /** total curvature ∫K dA = 2πχ (Gauss–Bonnet). */
  totalCurvature: number;
  orientable: boolean;
  cover: Cover;
}

/** Geometry is forced by topology: χ=0 ⇒ a flat Euclidean-plane cover; χ>0 ⇒ a
 *  positively-curved sphere cover. (Negative χ — the hyperbolic worlds — is a
 *  future cover, out of scope here.) */
export function deriveGeometry(spec: WorldSpec): DerivedGeometry {
  return {
    chi: spec.chi,
    curvature: spec.chi === 0 ? 'flat' : 'positive',
    totalCurvature: 2 * Math.PI * spec.chi,
    orientable: spec.orientable,
    cover: spec.chi === 0 ? 'euclidean' : 'spherical',
  };
}

const tr = (pair: GluingClass): EdgePairing => ({ pair, orient: 1 });
const fl = (pair: GluingClass): EdgePairing => ({ pair, orient: -1 });

/** The four worlds — the only place the catalog of square gluings is enumerated. */
export const WORLDS: WorldSpec[] = [
  {
    id: 'torus', label: 'Torus', short: 'flat torus',
    mode: 'opposite', chi: 0, orientable: true,
    // a = left/right (translate), b = top/bottom (translate): a b a⁻¹ b⁻¹
    word: 'a b a⁻¹ b⁻¹',
    edges: { left: tr('a'), right: tr('a'), top: tr('b'), bottom: tr('b') },
  },
  {
    id: 'klein', label: 'Klein bottle', short: 'flat Klein bottle',
    mode: 'opposite', chi: 0, orientable: false,
    // a = left/right with one side flipped (glide), b = top/bottom translate: a b a⁻¹ b
    word: 'a b a⁻¹ b',
    edges: { left: tr('a'), right: fl('a'), top: tr('b'), bottom: tr('b') },
  },
  {
    id: 'rp2', label: 'Projective plane', short: 'projective plane (ℝP²)',
    mode: 'opposite', chi: 1, orientable: false,
    // both pairs flip (antipodal boundary identification): a b a b
    word: 'a b a b',
    edges: { left: fl('a'), right: fl('a'), top: fl('b'), bottom: fl('b') },
  },
  {
    id: 'sphere', label: 'Sphere', short: 'round sphere',
    mode: 'adjacent', chi: 2, orientable: true,
    // adjacent fold (pillowcase): top↔right are one seam (a), bottom↔left the other (b): a a⁻¹ b b⁻¹
    word: 'a a⁻¹ b b⁻¹',
    edges: { top: fl('a'), right: fl('a'), bottom: fl('b'), left: fl('b') },
  },
];

export const worldById = (id: string): WorldSpec =>
  WORLDS.find((w) => w.id === id) ?? WORLDS[0];

/** Live invariants for a world, derived from its edge {@link WorldSpec.word} via the
 *  verified base layer — *not* from the stored `chi`/`orientable`. This is the M0
 *  seam: the host reads topology from `analyzeSchema`, so when free edge-word entry
 *  arrives the same readout works with no extra wiring. */
export function analyzeWorld(spec: WorldSpec): SchemaAnalysis {
  return analyze(spec.word);
}
