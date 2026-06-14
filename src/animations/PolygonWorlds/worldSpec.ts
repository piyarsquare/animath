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
export type Cover = 'euclidean' | 'spherical' | 'hyperbolic';

export interface WorldSpec {
  id: 'torus' | 'klein' | 'rp2' | 'sphere' | 'genus2' | 'crosscap3' | 'torus6' | 'klein6' | 'rp2hex' | 'rp2oct';
  label: string;
  /** short descriptor for the app header */
  short: string;
  mode?: GluingMode;
  /** The canonical edge word read around the polygon's boundary, in
   *  {a, a⁻¹, b, b⁻¹, …}. This is the *topological* source of truth: feeding it to
   *  {@link analyzeSchema} reproduces χ / orientability / curvature / name with no
   *  per-surface special case (the geometry engine develops from it via
   *  `realize`). The `edges`/`chi`/`orientable` fields below are the square worlds'
   *  presentation of the same gluing; n-gon worlds omit `edges` and the mini-map
   *  derives its diagram from the word. */
  word: string;
  /** The identification of each of the square's four edges — square worlds only. */
  edges?: Record<EdgeName, EdgePairing>;
  /** Euler characteristic V−E+F after identification. A *topological invariant*;
   *  for these fixed presets it is a known constant (it is what forces the geometry
   *  below). Stored rather than recomputed because the presets are fixed — the word
   *  still drives every visible gluing + the cover's behaviour. */
  chi: number;
  /** Whether a consistent global orientation survives the gluing. Like χ, a fact
   *  about the chosen gluing. */
  orientable: boolean;
}

export interface DerivedGeometry {
  chi: number;
  curvature: 'flat' | 'positive' | 'negative';
  /** total curvature ∫K dA = 2πχ (Gauss–Bonnet). */
  totalCurvature: number;
  orientable: boolean;
  cover: Cover;
}

/** Geometry is forced by topology: χ=0 ⇒ a flat Euclidean-plane cover; χ>0 ⇒ a
 *  positively-curved sphere cover; χ<0 ⇒ a hyperbolic-plane cover (Poincaré disk). */
export function deriveGeometry(spec: WorldSpec): DerivedGeometry {
  return {
    chi: spec.chi,
    curvature: spec.chi === 0 ? 'flat' : spec.chi > 0 ? 'positive' : 'negative',
    totalCurvature: 2 * Math.PI * spec.chi,
    orientable: spec.orientable,
    cover: spec.chi === 0 ? 'euclidean' : spec.chi > 0 ? 'spherical' : 'hyperbolic',
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
    // a = left/right glued with a flip (glide), b = top/bottom translate: a b a b⁻¹
    // (the glide is on `a` so the rendered flip + mini-map agree on the left/right pair)
    word: 'a b a b⁻¹',
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
  {
    // An octagon, not a square — no `edges`/`mode`; the word is the source of truth
    // and the mini-map derives its n-gon diagram from it.
    id: 'genus2', label: 'Double torus', short: 'genus-2 (hyperbolic)',
    chi: -2, orientable: true,
    word: 'a b a⁻¹ b⁻¹ c d c⁻¹ d⁻¹',
  },
  {
    // A hexagon glued as three cross-caps (Dyck's surface). Non-orientable; the
    // deck generators are glide reflections (det < 0 ⇒ trees↔columns per tile).
    id: 'crosscap3', label: 'Three cross-caps', short: 'Dyck surface (hyperbolic)',
    chi: -1, orientable: false,
    word: 'a a b b c c',
  },
  {
    // The HEXAGONAL torus: opposite edges glued by translation. Same topology as
    // the square torus, different presentation — a regular flat hexagon whose
    // corner classes are two sets of three 120° corners (3·120° = 360°: smooth,
    // no cone points), tiling the plane as a honeycomb.
    id: 'torus6', label: 'Hexagonal torus', short: 'flat torus (hexagon)',
    chi: 0, orientable: true,
    word: 'a b c a⁻¹ b⁻¹ c⁻¹',
  },
  {
    // The HEXAGONAL Klein bottle: same topology as the square Klein bottle from a
    // regular flat hexagon (corner classes 3+3 ⇒ smooth). Two of the pairings are
    // glides (det<0), so crossing them lands you on the other face, hexagonally.
    id: 'klein6', label: 'Hexagonal Klein bottle', short: 'flat Klein bottle (hexagon)',
    chi: 0, orientable: false,
    word: 'a a b c c b⁻¹',
  },
  {
    // The HEXAGONAL projective plane: same topology as the square ℝP² (`a b a b`),
    // realized from a regular spherical hexagon. Its three antipodal edge pairs
    // (`a b c a b c`) give corner classes all of size 2 (V=3), so cos R = cot(π/6)·
    // cot(π/2) = 0 ⇒ R = π/2: a *smooth* upper hemisphere whose boundary is the
    // equator and whose Z/2 deck is the antipodal map −Id, exactly like the square.
    id: 'rp2hex', label: 'Hexagonal projective plane', short: 'projective plane (hexagon)',
    chi: 1, orientable: false,
    word: 'a b c a b c',
  },
  {
    // The OCTAGONAL projective plane: `a b c d a b c d`, four antipodal pairs,
    // corner classes all size 2 (V=4) ⇒ R = π/2, the same smooth hemisphere +
    // antipodal deck as the square/hex ℝP², from a regular spherical octagon.
    id: 'rp2oct', label: 'Octagonal projective plane', short: 'projective plane (octagon)',
    chi: 1, orientable: false,
    word: 'a b c d a b c d',
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
