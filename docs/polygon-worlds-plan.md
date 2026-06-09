# Polygon Worlds — complete build plan (soup to nuts)

> The implementation plan for the **Polygon Worlds** app: walk any closed surface
> in first person, built from one decorated fundamental polygon whose edge gluings
> decide the topology and whose curvature is forced by it. This compiles the base
> layer, the [three‑hats review](sessions/progress/polygon-worlds/2026-06-07-S01-expert-synthesis.md),
> and the realization decisions into one sequence. The broader vision/teaching
> roadmap lives in [topology-walk-surface-tour.md](topology-walk-surface-tour.md);
> this doc is the engineering plan.

## 0 · The one idea, and where we are

A closed surface is a **2n‑gon with its edges glued in pairs**. Reading the
boundary gives an **edge word** in `a, a⁻¹, b, …`. From the word alone we derive
the surface and the geometry it is *forced* to carry; then we walk it.

**Governing contract (already built + verified — `surfaceSchema.ts`):**

```
word → analyzeSchema(word) → { χ = V−E+F, orientable, curvature = sign χ,
                               vertex classes V, edge pairings, name }
```

- **χ picks the geometry. Edge count is presentation, not topology.** A hexagon
  with a `c c⁻¹` pair is still a torus; a 4‑gon `a a⁻¹ b b⁻¹` is a sphere.
- χ > 0 → **round sphere** (sphere, ℝP² — the *only* positive‑curvature closed
  surfaces); χ = 0 → **Euclidean plane** (torus, Klein); χ < 0 → **hyperbolic
  plane** (genus ≥ 2, ≥ 3 cross‑caps).

**Current state:** PR #190 ships torus / Klein / sphere / ℝP² via *ad‑hoc covers*
(`euclideanCover`, `sphericalCover` with a lon/lat hack) and a hardcoded `WORLDS`
list. This plan **retires all three** in favour of one word‑driven engine, while
keeping #190 working until each port is green.

## 1 · The realization decision (resolves the cone‑point objection)

The pedagogy review flagged that realizing a positive‑curvature word as a *regular
geodesic polygon with one tuned corner angle* is false for V > 1 (sphere V=3, ℝP²
V=2): it inserts hidden **cone points**. The resolution (confirmed):

> **We do not preserve the polygon's flat metric when it is positively curved.**
> The walked surface is the genuinely smooth constant‑curvature **model**; the
> polygon is a **chart** onto it. So there are no cone points in what you walk —
> the round sphere is intrinsically uniform; the polygon merely distorts as a chart.

Concretely, the polygon plays two different roles by sign of κ:

| κ | Model (the walked surface) | Polygon's role | Cover / deck group |
|---|---|---|---|
| 0 (flat) | Euclidean plane | **isometric** geodesic fundamental domain | infinite lattice / glide group |
| < 0 (hyperbolic) | hyperbolic plane | **isometric** geodesic fundamental domain | infinite Fuchsian group |
| > 0 (positive) | round sphere | **chart** (distances distort) | finite — trivial (sphere) or antipodal Z/2 (ℝP²) |

This lets us **realize every word** — 2‑gons, all 4‑gons *including* the ones that
become a sphere, and the 6‑gons that are secretly spheres/ℝP² — without lying about
curvature.

> [!IMPORTANT]
> **Honesty requirement (the review's legitimate core, kept):** for the positive
> cases the polygon→sphere map distorts distances, so the mini‑map polygon is a
> *chart*, not an isometric copy. Disclose it in the explainer, and make the
> intrinsic instruments (triangle angle‑sum, circle, compass) read the **true
> model metric**, never the square's. Realize the smooth model; never hide cone
> points.

## 2 · The kernel — `lib/surface/` (Three.js‑free, the math core)

One representation for all three geometries, so κ is a parameter, not a branch.

- **Cayley–Klein model.** Points `(x, y, w)` with bilinear form `Bκ = diag(1, 1, −κ)`.
  Isometries = matrices preserving `Bκ` (the `O(Bκ)` group, including
  orientation‑reversing elements). Geodesics, `exp`/`log`, distance — all written
  with an **analytic κ → 0 series** (no `κ === 0` special branch).
- **API sketch:**
  ```ts
  interface Geometry {                 // one instance, parameterised by κ
    frame(pos, fwd): Frame;            // point + orthonormal tangent basis
    geodesicStep(frame, dist): Frame;  // walk a geodesic
    regularPolygon(n): { verts: Pt[]; cornerAngle: number };
    isometryFromEdgePairing(poly, pairing): Isometry;  // a deck generator
  }
  interface Isometry { apply(p); compose(g); inverse(); det(): ±1; }
  ```
- **`DevelopPolicy`** (strategy off the geometry — the consultant's key fix, since
  "develop the neighbours" is *not* one operation): enumerate the deck elements /
  tiles to draw around the player out to a horizon. Finite for the sphere, lattice
  for Euclidean, **Fuchsian BFS with horizon‑culling** for hyperbolic.
- **`realize(word)`** → `{ geometry, domain, deckGenerators, V, chart? }` — ties
  `analyzeSchema` to the model: isometric domain for κ ≤ 0, chart for κ > 0.
- **Invariant battery — `verify-geometry.ts`** (the honesty mechanism, since CI is
  build‑only; mirrors `verify-schemas.ts`). Executable assertions:
  group axioms, edge‑pairing/deck‑relation closure, a geodesic loop returns with
  the **holonomy** the topology predicts, **angle defect = κ · area** (Gauss–Bonnet),
  deck‑element round‑trip. **These assertions *are* Euler's instruments** — the
  battery doubles as their headless prototype.

> [!NOTE]
> Keep the kernel inside `PolygonWorlds/` (or `lib/surface/` consumed only here)
> until a second app needs it — don't pre‑share with TopologyWalk (maintainer).

## 3 · The presentation layer (a per‑κ seam — healthy, like `ParticleViewerShell`)

The kernel is geometry; rendering is a thin presenter per model. Shared facade +
per‑κ presenter is the same split the repo already uses (`lib/particles` vs
`ParticleViewerShell`).

- **The decorated two‑sided sheet**, authored in polygon‑(u, v): **trees** on the
  +normal face, **columns** on the −normal face; numbered, distinctly‑hued, with a
  **chiral decal** as the canonical orientation cue. (Shape‑based skin = CVD‑robust.)
- **`SurfacePresenter` per geometry:**
  - *Euclidean* — tile the plane around the player (generalises the current
    `euclideanCover` to any flat word + n‑gon).
  - *Spherical* — map the decorated polygon onto the round sphere (chart); inner
    shell = the other face seen through the glass; antipodal twin for ℝP².
  - *Hyperbolic* — render the developed tiles in the Poincaré disk.
- **Shared player facade:** avatar, chiral footprint trail, camera, lights, glass
  surface + mirrored "other side", the frame loop, the **mini‑map**, and the
  **normal‑flip** ("dive through the floor"). The trees↔columns **skin swap** and
  the flip's orientation handling **fall out of `det(deckElement) < 0`** from the
  kernel — not per‑presenter hacks.
- **Mini‑map = the n‑gon edge diagram**: the regular 2n‑gon with the identification
  arrows from `EdgePairing` + the player marker (chart‑distortion disclosed for κ>0).

## 4 · Exploration & discovery tools

- **Edge‑word picker:** the complexity ladder (2‑gon … 8‑gon) **and** free
  edge‑word entry (any valid word), with a live χ / orientability / curvature /
  surface‑name readout straight from `analyzeSchema`. Persist/share the word
  (`usePersistentState` + URL hash).
- **Euler's intrinsic instruments** (each the interactive form of a battery
  assertion; all engine‑agnostic across κ): walk‑a‑geodesic‑and‑return (holonomy:
  same / rotated / mirror‑flipped), drop‑a‑trail (orientability via mirror‑reversed
  return), triangle angle‑sum, circle circumference vs radius, parallel‑transport
  **compass** (must use the develop isometries), **hall‑of‑mirrors** (the
  universal‑cover tiling *is* the deck group — "hold a generator of π₁ in your hand").
- **Normal‑flip** to the inner shell / other side, one shared move.
- **Extrinsic embedding inset** (procedural meshes, not asset imports — bundle):
  cross‑cap / Roman / Boy for ℝP², figure‑8 Klein, genus‑2. The thesis is "**same
  walk, wildly different shape**" — so **ship it with the first non‑orientable
  surface, not at the end.**

## 5 · Verification discipline

- **`npm run build`** (tsc) — the only CI gate.
- **`verify-geometry.ts`** invariant battery — the real correctness gate; run it
  like `verify-schemas.ts`. Freeze the kernel interface only once it's green.
- **Headless software‑WebGL screenshots** (`npm run shoot` + puppeteer) per surface
  per phase — the in‑app eyeball.
- **Keep the old covers until the new port's screenshots match**, then retire.

## 6 · Phasing — mergeable milestones, no big‑bang

| Phase | Deliverable | Gate |
|---|---|---|
| **M0 · bank** | Merge PR #190. Wire the host to `analyzeSchema`: `WORLDS` become words; the picker shows live invariants. Rendering still via the old covers. | build green; ships immediately, zero engine risk |
| **Phase 0 · spike** | The Cayley–Klein kernel + `DevelopPolicy` + `realize()` (incl. κ>0 chart + V handling) + `verify-geometry.ts`; measure ℍ² tile‑growth + horizon‑culling budget. Three.js‑free, no app render yet. | **battery green** → freeze the interface |
| **P1 · Euclidean** | `EuclideanPresenter` on the kernel; port torus/Klein; generalise to *any* flat word + the hexagonal torus; retire `euclideanCover`. | screenshots match #190; build green |
| **P2 · Spherical** | `SphericalPresenter` as the round‑sphere chart; realize **all** positive words (2‑gon, 4‑gon sphere/ℝP², 6‑gon degenerate) — fixes the sphere/ℝP² bugs at the root; retire `sphericalCover`. **Ship the embedding inset here** (first non‑orientable). | screenshots; build green |
| **P3 · Hyperbolic** | `HyperbolicPresenter` (Poincaré disk) + Fuchsian develop with horizon‑culling; octagon genus‑2, 3‑/4‑cross‑cap. The finale. | perf budget met; build green |
| **P4 · Instruments** | Full instrument suite (on the battery), free edge‑word entry, more insets. | per‑instrument battery check |
| **P5 · Morph (stretch)** | Animate κ + the gluing to morph world→world. | — |

## 7 · Risks & de‑risking

- **ℍ² exponential tiling on a phone in rAF** → horizon‑culling budget *measured in
  Phase 0*; cap tile count; LOD distant tiles.
- **κ → 0 numerical stability** → analytic series in the kernel; battery checks near κ=0.
- **Orientation‑reversing (glide) isometries** → full `O(Bκ)` type; `det < 0` drives
  skin swap + flip; battery checks closure.
- **Bundle size** → procedural inset meshes; keep `React.lazy` code‑split.
- **Build‑only CI** → the battery + screenshots are the real checks.
- **Scope creep** → every phase ships something; keep old covers until green.

## 8 · Module map

```
src/animations/PolygonWorlds/
  surfaceSchema.ts        ✓ built — word → invariants + edge pairings
  lib/ (or kernel/)       Three.js-free math core:
    cayleyKlein.ts          points/isometries/geodesics, analytic κ→0
    geometry.ts             the Geometry interface + κ instances
    develop.ts              DevelopPolicy (finite / lattice / Fuchsian)
    realize.ts              word → { geometry, domain|chart, deckGens }
    invariants.ts           the battery
  decor.ts                ✓ two-sided sheet (generalise to n-gon u,v)
  presenters/
    euclidean.ts  spherical.ts  hyperbolic.ts
  engine.ts               shared facade (avatar/trail/glass/flip/loop)
  polygonMap.ts           n-gon edge-diagram mini-map (from squareMap)
  instruments/            Euler's instruments + embedding insets
  PolygonWorlds.tsx        host: word picker, readouts, instrument UI
scripts/verify-geometry.ts  the battery runner (cf. verify-schemas.ts)
```

## 9 · The immediate next step

**M0 + the start of Phase 0:** wire `analyzeSchema` into the host (the cheap,
zero‑risk win — it's verified but currently unused), turning the world list into
edge words with a live χ/curvature readout, then begin the Cayley–Klein kernel +
`verify-geometry.ts` battery behind it. Nothing renders differently yet; the
foundation just becomes word‑driven and the kernel gets proven before any cover is
touched.
