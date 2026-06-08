/**
 * Polygon Worlds — realize: edge word → a concrete geometric fundamental polygon.
 *
 * This ties the verified base layer ({@link analyzeSchema}: word → χ, vertex
 * classes, edge pairings) to the geometry kernel. From a word we produce:
 *   • the curvature κ (its *sign* is forced by χ; magnitude is a presentation
 *     choice — we use the unit models κ ∈ {+1, 0, −1}),
 *   • a regular geodesic fundamental polygon (its vertices on the κ-shell),
 *   • the side-pairing isometries (the deck generators) built from the pairings,
 *   • whether the polygon is an *isometric* fundamental domain or a *chart*.
 *
 * ## When is it isometric vs a chart?
 *
 * A regular polygon glues up *smoothly* (no cone points) exactly when every
 * vertex class receives the same number of corners — then each class can be given
 * total angle 2π by a single corner angle 2π·V/edges, and we solve the
 * circumradius so the regular polygon has that angle. This covers torus, Klein,
 * the cross-cap surfaces, genus-g (all V=1) and, on the sphere, ℝP² (`abab`,
 * V=2 with equal counts → a genuine smooth spherical square).
 *
 * When the vertex classes have *unequal* counts — the sphere `a a⁻¹ b b⁻¹` has
 * V=3 corners {2,1,1} — no regular polygon closes smoothly. For κ>0 we then treat
 * the polygon as a **chart** onto the genuinely smooth round sphere (distances
 * distort, disclosed by the presenter; the walk has no cone points because the
 * walked surface is the round sphere, not the flattened polygon). This is the
 * realization decision from the plan, derived here from the V-structure rather
 * than hard-coded per surface.
 */

import { EdgeWord, analyzeSchema, SchemaAnalysis } from '../surfaceSchema';
import {
  Vec3, Mat3, Isometry, isometry,
  geodesicPoint, originTo, rotation, mul, inv3, applyMat, REFLECT_X,
} from './cayleyKlein';

export type DevelopKind = 'finite' | 'lattice' | 'fuchsian';

export interface Realization {
  word: EdgeWord;
  analysis: SchemaAnalysis;
  /** Gaussian curvature: +1 / 0 / −1 (sign forced by χ). */
  kappa: number;
  /** Circumradius of the regular fundamental polygon on the κ-shell. */
  circumradius: number;
  /** Edge/corner count m = 2n. */
  edges: number;
  /** The m = 2n polygon vertices, in boundary order. */
  vertices: Vec3[];
  /** Side-pairing isometry per generator index: maps the generator's first
   *  occurrence edge onto its second. det < 0 ⇔ an orientation-reversing
   *  (glide/flip) pairing — the signal that drives the skin swap + normal flip. */
  deckGenerators: Isometry[];
  /** true ⇒ the polygon is a chart onto a smooth model (κ>0, unequal vertex
   *  classes); false ⇒ an isometric fundamental domain. */
  chart: boolean;
  /** Which tiling strategy the develop layer should use. */
  policy: DevelopKind;
}

/** An isometry mapping the basepoint O onto `P`, carrying +x along the geodesic
 *  P→Q. So its frame sits at P pointing at Q. */
function frameAlongEdge(kappa: number, P: Vec3, Q: Vec3): Mat3 {
  const g0 = originTo(kappa, P);
  const local = applyMat(inv3(g0), Q);
  const alpha = Math.atan2(local[1], local[0]);
  return mul(g0, rotation(alpha));
}

/** Corner-class sizes after the gluing (union–find on the polygon's corners),
 *  using the same tail/head convention as the base layer. */
function cornerClassSizes(word: EdgeWord): number[] {
  const m = word.length;
  const parent = Array.from({ length: m }, (_, i) => i);
  const find = (x: number): number => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
  const union = (a: number, b: number) => { parent[find(a)] = find(b); };
  const tail = (e: number) => (word[e].inv ? (e + 1) % m : e);
  const head = (e: number) => (word[e].inv ? e : (e + 1) % m);
  const byGen = new Map<number, number[]>();
  for (let e = 0; e < m; e++) { const a = byGen.get(word[e].gen) ?? []; a.push(e); byGen.set(word[e].gen, a); }
  for (const [, [i, j]] of byGen) { union(tail(i), tail(j)); union(head(i), head(j)); }
  const sizes = new Map<number, number>();
  for (let c = 0; c < m; c++) { const r = find(c); sizes.set(r, (sizes.get(r) ?? 0) + 1); }
  return [...sizes.values()];
}

/** Realize an edge word as a concrete geometric fundamental polygon + deck group.
 *  `baseAngle` rotates the polygon for presentation only (the invariants are
 *  rotation-equivariant); the default gives a flat-bottomed polygon, which makes
 *  the square axis-aligned. */
export function realize(word: EdgeWord, opts: { baseAngle?: number } = {}): Realization {
  const analysis = analyzeSchema(word);
  if (!analysis.valid) throw new Error(`realize: invalid edge word — ${analysis.reason}`);

  const m = analysis.edges;
  const V = analysis.V;
  const baseAngle = opts.baseAngle ?? (-Math.PI / 2 + Math.PI / m);
  const sizes = cornerClassSizes(word);
  const equalCounts = sizes.every((s) => s === sizes[0]);

  // κ sign forced by χ; choose unit models. Circumradius from the smooth-gluing
  // corner-angle condition (corner angle 2α = 2π·V/m) where it can be met.
  let kappa: number;
  let circumradius: number;
  let chart = false;
  let policy: DevelopKind;

  if (analysis.curvature === 'flat') {
    kappa = 0;
    circumradius = 1; // any radius works; a regular Euclidean m-gon closes for χ=0
    policy = 'lattice';
  } else {
    // Regular geodesic polygon condition (right triangle centre–vertex–edge-mid):
    //   Cκ(R) = cot(π/m)·cot(α),  α = half interior angle = π·V/m.
    // At κ=0 this is the Euclidean identity; it is the same formula for both signs.
    const alpha = (Math.PI * V) / m;
    const ratio = (1 / Math.tan(Math.PI / m)) * (1 / Math.tan(alpha));
    if (analysis.curvature === 'negative') {
      kappa = -1;
      circumradius = Math.acosh(ratio);          // cosh(R) = cot(π/m)·cot α
      policy = 'fuchsian';
    } else {
      kappa = 1;
      policy = 'finite';
      if (equalCounts && ratio >= -1 && ratio <= 1) {
        circumradius = Math.acos(ratio);         // cos(R) = cot(π/m)·cot α — smooth (e.g. ℝP² hemisphere)
      } else {
        chart = true;                            // unequal classes ⇒ chart onto the round sphere
        circumradius = Math.PI / 2;              // hemisphere-ish default; presenter discloses distortion
      }
    }
  }

  // Regular polygon vertices on the κ-shell.
  const vertices: Vec3[] = [];
  for (let k = 0; k < m; k++) {
    vertices.push(geodesicPoint(kappa, baseAngle + (2 * Math.PI * k) / m, circumradius));
  }

  // Side-pairing isometries from the edge pairings. The deck generator for letter
  // x is the transformation g_x that maps the polygon to the neighbour glued
  // across the x edge — equivalently it carries the x⁻¹-labelled edge onto the
  // x-labelled edge, matching the generator's arrow (tail→tail). With this
  // direction the boundary word, read with a → g_x and a⁻¹ → g_x⁻¹, multiplies to
  // the identity (the surface relation) for a single-vertex fundamental polygon.
  const inv = (e: number) => word[e].inv;
  const tailV = (e: number) => (inv(e) ? vertices[(e + 1) % m] : vertices[e]);
  const headV = (e: number) => (inv(e) ? vertices[e] : vertices[(e + 1) % m]);
  const deckGenerators: Isometry[] = [];
  for (const p of analysis.pairings) {
    const [e0, e1] = p.edges;
    // target = the x edge (letter forward); source = the x⁻¹ edge. For a
    // non-orientable (same-sign) pairing there is no x/x⁻¹ split, so fall back to
    // a fixed order and insert a reflection (orientation-reversing glide).
    const target = inv(e0) ? e1 : e0;
    const source = inv(e0) ? e0 : e1;
    const Ft = frameAlongEdge(kappa, tailV(target), headV(target));
    const Fs = frameAlongEdge(kappa, tailV(source), headV(source));
    // Map the source (x⁻¹) edge onto the target (x) edge, matching the generator
    // arrow tail→tail. A reversed (same-sign) pairing is orientation-reversing →
    // insert a reflection across the edge axis (a glide). This yields the genuine
    // fixed-point-free side-pairings (translations / hyperbolic isometries / glides)
    // that tile the cover — verified by angle-sum = 2π and no-fixed-point checks.
    const core = p.reversed ? mul(Ft, mul(REFLECT_X, inv3(Fs))) : mul(Ft, inv3(Fs));
    deckGenerators[p.gen] = isometry(kappa, core);
  }

  return { word, analysis, kappa, circumradius, vertices, edges: m, deckGenerators, chart, policy };
}
