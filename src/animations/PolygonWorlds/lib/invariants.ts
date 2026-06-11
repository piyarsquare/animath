/**
 * Polygon Worlds — the geometry kernel's invariant battery.
 *
 * Because the only CI gate is `npm run build` (a type-check), these executable
 * assertions are the *real* correctness gate for the kernel: they pin the math to
 * facts that must hold in every constant-curvature geometry. Run via
 * `scripts/verify-geometry.ts` (mirrors `scripts/verify-schemas.ts`). The kernel
 * interface is frozen only once this battery is green.
 *
 * Each check returns a {@link Check}; the runner tallies failures. Checks sweep
 * κ ∈ {positive, flat, negative} so the unified model is proven across curvature,
 * not just in one regime.
 */

import {
  Mat3, Vec3, IDENTITY3, mul, applyMat, det3, inv3, transpose3,
  cosK, sinK, form, rotation, translateX, translateY, translateDir, REFLECT_X,
  distance, geodesicPoint, ORIGIN,
  makeFrame, framePos, stepForward, turn, isometry, angleAt,
} from './cayleyKlein';
import { parseWord } from '../surfaceSchema';
import { realize, Realization } from './realize';
import { develop } from './develop';

export interface Check { name: string; pass: boolean; detail: string }

const ok = (name: string, pass: boolean, detail = ''): Check => ({ name, pass, detail });
const approx = (a: number, b: number, eps = 1e-7) => Math.abs(a - b) <= eps;
const vapprox = (a: Vec3, b: Vec3, eps = 1e-7) => approx(a[0], b[0], eps) && approx(a[1], b[1], eps) && approx(a[2], b[2], eps);
const mapprox = (a: Mat3, b: Mat3, eps = 1e-7) => a.every((x, i) => approx(x, b[i], eps));

/** The Gκ form as a matrix, for the form-preservation test. */
const Gk = (k: number): Mat3 => [k, 0, 0, 0, k, 0, 0, 0, 1];

/** A reproducible LCG so the random-isometry checks are deterministic. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

/** A pseudo-random isometry at curvature κ (compose a few generators). */
function randomIsometry(k: number, rnd: () => number): Mat3 {
  let m = IDENTITY3;
  for (let i = 0; i < 4; i++) {
    m = mul(m, rotation((rnd() - 0.5) * 6));
    m = mul(m, translateX(k, (rnd() - 0.5) * 3));
    m = mul(m, translateY(k, (rnd() - 0.5) * 3));
    if (rnd() < 0.5) m = mul(m, REFLECT_X);
  }
  return m;
}

// ─────────────────────────────────────────────────────────────────────────────

/** The curvature-trig identities Cκ² + κ Sκ² = 1 and the derivative relations. */
function trigChecks(k: number): Check[] {
  const out: Check[] = [];
  let worstPyth = 0, worstDeriv = 0;
  const h = 1e-6;
  for (const t of [-2.3, -0.7, 0, 0.4, 1.1, 2.0]) {
    const c = cosK(k, t), s = sinK(k, t);
    worstPyth = Math.max(worstPyth, Math.abs(c * c + k * s * s - 1));
    // Cκ' = −κ Sκ ; Sκ' = Cκ  (central difference)
    const dC = (cosK(k, t + h) - cosK(k, t - h)) / (2 * h);
    const dS = (sinK(k, t + h) - sinK(k, t - h)) / (2 * h);
    worstDeriv = Math.max(worstDeriv, Math.abs(dC - (-k * s)), Math.abs(dS - c));
  }
  out.push(ok(`κ=${k}: Cκ²+κSκ²=1`, worstPyth < 1e-9, `max err ${worstPyth.toExponential(2)}`));
  out.push(ok(`κ=${k}: Cκ'=−κSκ, Sκ'=Cκ`, worstDeriv < 1e-4, `max err ${worstDeriv.toExponential(2)}`));
  return out;
}

/** Every generator must preserve the form: Mᵀ Gκ M = Gκ. */
function formPreservation(k: number): Check[] {
  const G = Gk(k);
  const gens: [string, Mat3][] = [
    ['rotation', rotation(0.9)],
    ['translateX', translateX(k, 1.3)],
    ['translateY', translateY(k, -0.8)],
    ['reflectX', REFLECT_X],
    ['translateDir', translateDir(k, 0.5, 1.1)],
  ];
  return gens.map(([name, m]) => {
    const lhs = mul(transpose3(m), mul(G, m));
    return ok(`κ=${k}: ${name} preserves Gκ`, mapprox(lhs, G, 1e-9));
  });
}

/** Group axioms: associativity, identity, inverse. */
function groupAxioms(k: number): Check[] {
  const rnd = rng(7);
  const A = randomIsometry(k, rnd), B = randomIsometry(k, rnd), C = randomIsometry(k, rnd);
  const assoc = mapprox(mul(mul(A, B), C), mul(A, mul(B, C)), 1e-7);
  const ident = mapprox(mul(A, IDENTITY3), A) && mapprox(mul(IDENTITY3, A), A);
  let worstInv = 0;
  for (let i = 0; i < 8; i++) {
    const M = randomIsometry(k, rnd);
    worstInv = Math.max(worstInv, ...mul(M, inv3(M)).map((x, j) => Math.abs(x - IDENTITY3[j])));
  }
  return [
    ok(`κ=${k}: associativity`, assoc),
    ok(`κ=${k}: identity`, ident),
    ok(`κ=${k}: M·M⁻¹ = I`, worstInv < 1e-7, `max err ${worstInv.toExponential(2)}`),
  ];
}

/** Geodesics: walking arc length s from O lands at distance s, on the shell. */
function geodesicChecks(k: number): Check[] {
  let worstDist = 0, worstShell = 0;
  for (const s of [0.3, 1.0, 2.5]) for (const th of [0, 1.2, -2.0]) {
    const p = geodesicPoint(k, th, s);
    worstDist = Math.max(worstDist, Math.abs(distance(k, ORIGIN, p) - s));
    worstShell = Math.max(worstShell, Math.abs(form(k, p, p) - 1));
    const f = stepForward(turn(makeFrame(k), th), s);
    worstDist = Math.max(worstDist, Math.abs(distance(k, ORIGIN, framePos(f)) - s));
  }
  return [
    ok(`κ=${k}: distance(O, step s) = s`, worstDist < 1e-7, `max err ${worstDist.toExponential(2)}`),
    ok(`κ=${k}: geodesic stays on shell`, worstShell < 1e-9, `max err ${worstShell.toExponential(2)}`),
  ];
}

/** Isometries preserve distance and map the shell to itself. */
function isometryPreservesDistance(k: number): Check[] {
  const rnd = rng(99);
  let worst = 0, worstShell = 0;
  const pts: Vec3[] = [ORIGIN, geodesicPoint(k, 0.4, 1.0), geodesicPoint(k, 2.1, 0.6), geodesicPoint(k, -1.0, 1.8)];
  for (let i = 0; i < 6; i++) {
    const M = randomIsometry(k, rnd);
    for (let a = 0; a < pts.length; a++) {
      const ip = applyMat(M, pts[a]);
      worstShell = Math.max(worstShell, Math.abs(form(k, ip, ip) - 1));
      for (let b = a + 1; b < pts.length; b++) {
        const d0 = distance(k, pts[a], pts[b]);
        const d1 = distance(k, ip, applyMat(M, pts[b]));
        worst = Math.max(worst, Math.abs(d0 - d1));
      }
    }
  }
  return [
    ok(`κ=${k}: isometry preserves distance`, worst < 1e-6, `max err ${worst.toExponential(2)}`),
    ok(`κ=${k}: isometry keeps shell`, worstShell < 1e-9, `max err ${worstShell.toExponential(2)}`),
  ];
}

/** Orientation: rotations/translations det +1; reflections det −1. */
function orientationChecks(k: number): Check[] {
  return [
    ok(`κ=${k}: det(rotation)=+1`, approx(det3(rotation(0.7)), 1)),
    ok(`κ=${k}: det(translateX)=+1`, approx(det3(translateX(k, 1.1)), 1)),
    ok(`κ=${k}: det(reflectX)=−1`, approx(det3(REFLECT_X), -1)),
    ok(`κ=${k}: det(glide)=−1`, approx(det3(mul(translateX(k, 0.9), REFLECT_X)), -1)),
  ];
}

/**
 * Gauss–Bonnet: the angle excess of a geodesic triangle equals κ·area.
 *
 * Independent check (not circular): the area comes from the *side lengths*
 * (½·a·b·sin γ, exact to leading order for a small triangle), the excess comes
 * from the kernel's *angle measurement*. For a small isoceles triangle the
 * relation excess = κ·area holds to O(size²), so we test a small one.
 */
function gaussBonnetSmall(k: number): Check {
  const L = 0.08, gamma = Math.PI / 3; // two sides L at 60° at A=O
  const A = ORIGIN;
  const B = geodesicPoint(k, 0, L);
  const C = geodesicPoint(k, gamma, L);
  const angA = angleAt(k, A, B, C);
  const angB = angleAt(k, B, A, C);
  const angC = angleAt(k, C, A, B);
  const excess = angA + angB + angC - Math.PI;
  const areaFlat = 0.5 * L * L * Math.sin(gamma);
  const predicted = k * areaFlat;
  // tolerance: the O(size²) correction scales the leading term
  const tol = Math.max(1e-9, Math.abs(predicted) * 0.02 + L * L * L * L);
  return ok(
    `κ=${k}: excess = κ·area (small triangle)`,
    Math.abs(excess - predicted) < tol,
    `excess ${excess.toExponential(3)} vs κ·area ${predicted.toExponential(3)}`,
  );
}

/**
 * Exact large-scale anchors that pin the *curvature scale* (not just the sign):
 *  • κ>0: a spherical octant has three right angles (excess = π/2) and closes.
 *  • κ=0: a right-angled square closes with zero holonomy.
 *  • κ<0: a geodesic triangle has negative excess.
 */
function gaussBonnetAnchors(): Check[] {
  const out: Check[] = [];

  // Spherical octant at κ>0: walk a quarter great circle, turn 90°, ×3.
  {
    const k = 0.5;
    const quarter = (Math.PI / 2) / Math.sqrt(k); // distance of a 90° great-circle arc
    let f = makeFrame(k);
    for (let i = 0; i < 3; i++) { f = stepForward(f, quarter); f = turn(f, Math.PI / 2); }
    const closed = vapprox(framePos(f), ORIGIN, 1e-6);
    // the three corners are each π/2 by construction → excess = π/2 = κ·area
    const A = ORIGIN, B = geodesicPoint(k, 0, quarter), C = geodesicPoint(k, Math.PI / 2, quarter);
    const excess = angleAt(k, A, B, C) + angleAt(k, B, A, C) + angleAt(k, C, A, B) - Math.PI;
    out.push(ok('κ=0.5: spherical octant closes', closed));
    out.push(ok('κ=0.5: octant excess = π/2', approx(excess, Math.PI / 2, 1e-6), `excess ${excess.toFixed(6)}`));
  }

  // Flat square closes with zero holonomy.
  {
    const k = 0;
    let f = makeFrame(k);
    const g0 = f.g;
    for (let i = 0; i < 4; i++) { f = stepForward(f, 1.7); f = turn(f, Math.PI / 2); }
    out.push(ok('κ=0: flat square closes', vapprox(framePos(f), ORIGIN, 1e-9)));
    out.push(ok('κ=0: flat square zero holonomy', mapprox(f.g, g0, 1e-9)));
  }

  // Hyperbolic triangle has negative excess.
  {
    const k = -0.5;
    const A = ORIGIN, B = geodesicPoint(k, 0, 1.5), C = geodesicPoint(k, 1.0, 1.5);
    const excess = angleAt(k, A, B, C) + angleAt(k, B, A, C) + angleAt(k, C, A, B) - Math.PI;
    out.push(ok('κ=−0.5: hyperbolic triangle excess < 0', excess < -1e-3, `excess ${excess.toFixed(6)}`));
  }

  return out;
}

/** Sanity: the Isometry wrapper agrees with the raw matrix ops. */
function wrapperChecks(k: number): Check[] {
  const a = isometry(k, translateX(k, 0.7));
  const b = isometry(k, rotation(0.9));
  const composed = a.compose(b); // a ∘ b
  const p = geodesicPoint(k, 0.3, 1.0);
  const direct = applyMat(a.m, applyMat(b.m, p));
  return [
    ok(`κ=${k}: Isometry.compose = a∘b`, vapprox(composed.apply(p), direct)),
    ok(`κ=${k}: Isometry.inverse`, vapprox(a.compose(a.inverse()).apply(p), p)),
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// Deck-group / realization checks: tie the kernel back to surfaceSchema's edge
// pairings via realize(), the seam the whole engine develops from.
// ─────────────────────────────────────────────────────────────────────────────

/** Corner-class id per corner (union–find on the polygon's corners). */
function cornerClasses(word: { gen: number; inv: boolean }[]): number[] {
  const m = word.length;
  const parent = Array.from({ length: m }, (_, i) => i);
  const find = (x: number): number => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
  const union = (a: number, b: number) => { parent[find(a)] = find(b); };
  const tail = (e: number) => (word[e].inv ? (e + 1) % m : e);
  const head = (e: number) => (word[e].inv ? e : (e + 1) % m);
  const byGen = new Map<number, number[]>();
  for (let e = 0; e < m; e++) { const a = byGen.get(word[e].gen) ?? []; a.push(e); byGen.set(word[e].gen, a); }
  for (const [, [i, j]] of byGen) { union(tail(i), tail(j)); union(head(i), head(j)); }
  return word.map((_, k) => find(k));
}

/** Is a deck generator fixed-point-free on the interior (no cone point)?
 *  Orientation-preserving: free ⇔ translation/hyperbolic/parabolic ⇔ trace ≥ 3
 *  (an elliptic rotation has trace < 3 and fixes an interior point). For both
 *  κ=0 and κ<0 a translation has trace exactly 3. Orientation-reversing: a glide
 *  is free, a pure reflection fixes its axis — distinguished by g² ≠ I. */
function isFixedPointFree(M: Mat3, _kappa: number): boolean {
  if (det3(M) > 0) return M[0] + M[4] + M[8] >= 3 - 1e-6;
  const M2 = mul(M, M);
  return !M2.every((x, i) => approx(x, IDENTITY3[i], 1e-6));
}

/** All the closure facts for one realized word. */
function deckChecks(wordStr: string): Check[] {
  const out: Check[] = [];
  let real: Realization;
  try {
    real = realize(parseWord(wordStr));
  } catch (e) {
    return [ok(`realize "${wordStr}"`, false, String(e))];
  }
  const { word, vertices: V, deckGenerators: deck, kappa, analysis } = real;
  const m = word.length;
  const tag = `"${wordStr}" (${analysis.name}${real.chart ? ', chart' : ''}, κ=${kappa})`;

  // 1 · Deck closure = smooth gluing: the polygon's corner angles sum to 2π on
  //     EVERY vertex class (Poincaré's condition; a deviation is a cone point).
  //     The chart cases (κ>0, unequal classes) deliberately do not — skip them.
  if (!real.chart) {
    const classOf = cornerClasses(word);
    const angleOfCorner = (k: number) => angleAt(kappa, V[k], V[(k - 1 + m) % m], V[(k + 1) % m]);
    const sums = new Map<number, number>();
    for (let k = 0; k < m; k++) sums.set(classOf[k], (sums.get(classOf[k]) ?? 0) + angleOfCorner(k));
    let worstAngle = 0;
    for (const s of sums.values()) worstAngle = Math.max(worstAngle, Math.abs(s - 2 * Math.PI));
    out.push(ok(`vertex angle-sum = 2π  ${tag}`, worstAngle < 1e-6, `worst |Σ−2π| ${worstAngle.toExponential(2)}`));
  }

  // 2 · Each generator carries its source (x⁻¹) edge onto its target (x) edge
  //     (tail→tail), so adjacent tiles share that edge exactly.
  const inv = (e: number) => word[e].inv;
  const tailV = (e: number) => (inv(e) ? V[(e + 1) % m] : V[e]);
  const headV = (e: number) => (inv(e) ? V[e] : V[(e + 1) % m]);
  let worstEdge = 0;
  for (const p of analysis.pairings) {
    const [e0, e1] = p.edges;
    const target = inv(e0) ? e1 : e0;
    const source = inv(e0) ? e0 : e1;
    const g = deck[p.gen];
    const dt = sub(applyMat(g.m, tailV(source)), tailV(target));
    const dh = sub(applyMat(g.m, headV(source)), headV(target));
    worstEdge = Math.max(worstEdge, norm(dt), norm(dh));
  }
  out.push(ok(`deck gens glue edges  ${tag}`, worstEdge < 1e-6, `max err ${worstEdge.toExponential(2)}`));

  // 3 · No cone points (κ≤0 isometric): every deck generator is fixed-point-free
  //     on the interior — i.e. not an elliptic rotation. (Elliptic ⇔ a real
  //     eigenvector that is an interior shell point with eigenvalue 1.)
  if (!real.chart && kappa <= 0) {
    const free = analysis.pairings.every((p) => isFixedPointFree(deck[p.gen].m, kappa));
    out.push(ok(`deck gens fixed-point-free (no cone pts)  ${tag}`, free));
  }

  // 3 · Orientability ⇔ every side-pairing is orientation-preserving (det > 0).
  const dets = analysis.pairings.map((p) => det3(deck[p.gen].m));
  const allPreserving = dets.every((d) => d > 0);
  out.push(ok(`orientability ⇔ det signs  ${tag}`, allPreserving === analysis.orientable,
    `orientable=${analysis.orientable}, dets=[${dets.map((d) => d.toFixed(2)).join(', ')}]`));

  // 4 · Side-pairings are genuine isometries (preserve Gκ).
  const G: Mat3 = [kappa, 0, 0, 0, kappa, 0, 0, 0, 1];
  let worstForm = 0;
  for (const p of analysis.pairings) {
    const M = deck[p.gen].m;
    const lhs = mul(transpose3(M), mul(G, M));
    worstForm = Math.max(worstForm, ...lhs.map((x, i) => Math.abs(x - G[i])));
  }
  out.push(ok(`deck gens preserve Gκ  ${tag}`, worstForm < 1e-6, `max err ${worstForm.toExponential(2)}`));

  return out;
}

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const norm = (a: Vec3) => Math.hypot(a[0], a[1], a[2]);

/** Develop sanity: the home tile is present, tiles are distinct, horizon respected. */
function developChecks(): Check[] {
  const out: Check[] = [];
  // Euclidean torus lattice
  {
    const r = realize(parseWord('a b a⁻¹ b⁻¹'));
    const d = develop(r, { horizon: 12, maxTiles: 200 });
    const home = d.centers.some((c) => Math.hypot(c[0], c[1]) < 1e-9);
    const allInHorizon = d.centers.every((c) => distance(r.kappa, ORIGIN, c) <= 12 + 1e-9);
    out.push(ok('develop torus: home tile present', home));
    out.push(ok('develop torus: tiles within horizon', allInHorizon, `${d.elements.length} tiles`));
  }
  // Hyperbolic genus-2 grows but stays capped + horizon-culled
  {
    const r = realize(parseWord('a b a⁻¹ b⁻¹ c d c⁻¹ d⁻¹'));
    const d = develop(r, { horizon: 6.0, maxTiles: 2000 });
    const allInHorizon = d.centers.every((c) => distance(r.kappa, ORIGIN, c) <= 6.0 + 1e-6);
    out.push(ok('develop genus-2: horizon respected', allInHorizon, `${d.elements.length} tiles, visited ${d.visited}`));
    out.push(ok('develop genus-2: more than home tile', d.elements.length > 1));
    // the cap really caps
    const capped = develop(r, { horizon: 12, maxTiles: 300 });
    out.push(ok('develop genus-2: maxTiles cap honoured', capped.elements.length <= 300 && capped.truncated));
  }
  return out;
}

/** Run the whole battery across the three curvature regimes. */
export function runBattery(): Check[] {
  const out: Check[] = [];
  const kappas = [0.5, 0, -0.5];
  for (const k of kappas) {
    out.push(...trigChecks(k));
    out.push(...formPreservation(k));
    out.push(...groupAxioms(k));
    out.push(...geodesicChecks(k));
    out.push(...isometryPreservesDistance(k));
    out.push(...orientationChecks(k));
    out.push(gaussBonnetSmall(k));
    out.push(...wrapperChecks(k));
  }
  out.push(...gaussBonnetAnchors());

  // Deck-group closure across the ladder (one word per surface family).
  const ladder = [
    'a a⁻¹ b b⁻¹',                 // sphere (chart)
    'a b a b',                     // ℝP² (smooth spherical square)
    'a b a⁻¹ b⁻¹',                 // torus
    'a b a⁻¹ b',                   // Klein bottle
    'a a b b c c',                 // 3 cross-caps
    'a b a⁻¹ b⁻¹ c d c⁻¹ d⁻¹',     // genus-2
  ];
  for (const w of ladder) out.push(...deckChecks(w));
  out.push(...developChecks());
  return out;
}
