---
kind: three-hats
session: 2026-06-07-S01
date: 2026-06-07
title: Polygon Worlds plan — Architecture & Quality consultant review
branch: claude/polygon-worlds
slug: polygon-worlds
status: in-progress
build: unknown
followup: null
pr: null
---

# Polygon Worlds plan — Architecture & Quality consultant review

## What I reviewed

The plan proposes collapsing the current ad-hoc `euclideanCover` / `sphericalCover` pair (plus a hardcoded `WORLDS` table and a lon/lat sphere hack) into *one* develop-via-edge-isometries engine: a `Geometry` interface keyed by curvature κ with one implementation per sign, a deck group Γ generated from edge pairings, and a presentation layer painted on the developed universal cover. The verified base layer (`surfaceSchema.ts`: edge word → χ, orientability, curvature, `EdgePairing[]`) is sound and is the right foundation — it already does the topology with zero per-surface special cases, and it hands the geometry layer exactly the `{gen, edges:[i,j], reversed}` data the isometry builder needs.

The existing `CoverModel` seam (one facade in `fundamentalSquareEngine.ts` + two cover impls behind a narrow interface) is the relevant prior art. The plan *generalizes* that seam, and the central question is whether the generalization holds or whether the interface leaks.

> [!NOTE]
> **Stance** The direction is right and the base layer earns trust. But the plan as written conflates two abstractions that should stay separate — a *geometry/isometry kernel* and a *tiling/develop policy* — and it underestimates three seams (κ→0 numerics, ℍ² tile explosion, and the presentation-per-κ split). My recommendation is to **commit the geometry kernel interface only after two proof-of-concept spikes**, and to treat "develop neighbours" as a strategy object, not a method on `Geometry`.

## Pattern recognition — what this resembles

| Plan piece | Known pattern | Fit |
| --- | --- | --- |
| `Geometry` keyed by κ, one impl each | Strategy / policy object behind a facade (exactly today's `CoverModel`) | Good |
| Deck group Γ = ⟨edge-pairing isometries⟩ | Free-group generators + word reduction; an *orbit/transform registry* | Good |
| Develop neighbours for rendering | Spatial culling + instancing (an ECS-ish "visible tiles" system) | Leaks — see below |
| Presentation on develop model (decor/glass/skins) | Headless core + presentation seam — the repo's own `lib/particles` vs `ParticleViewerShell` split | Needs an explicit seam |
| One pipeline, κ as a parameter | Unified representation (projective/Cayley–Klein model) | Achievable — with caveats |

The healthiest analogy is the repo's existing `lib/particles` engine + `ParticleViewerShell`: a headless math/geometry core that knows nothing about scene chrome, and a presentation shell that knows nothing about the 4D math. The plan should aim for the same split here: **a `lib/surface` geometry kernel** (κ-parameterised isometries, geodesics, deck group, develop) and a **presentation shell** (decor, glass, inner-shell, normal-flip, trail, mini-map). The plan bundles them; calling that out now is the single highest-leverage structural correction.

## Does the `Geometry` abstraction genuinely unify κ?

### Yes for the isometry kernel — with one representation

A single representation *does* cover all three signs cleanly: the **Cayley–Klein / projective model**. Work in ℝ³ with coordinates (x,y,w) and bilinear form `diag(1,1,−κ)` (κ∈{−1,0,+1} after normalisation). Then:

- Isometries are 3×3 matrices preserving that form — O(3) for κ=+1, the Euclidean group E(2) (as a degenerate O(2,1) contraction) for κ=0, and O(2,1) / SL(2,ℝ) for κ=−1.
- Points are rays; the surface is the κ-sphere `x²+y²−κw²=1` (the plane w=1 in the flat limit, the hyperboloid for κ=−1, the actual sphere for κ=+1).
- Geodesic step, compose, inverse, and "regular 2n-gon vertex + corner angle" are *one* formula each in (κ, sin, cos→sinh/cosh) — the trig literally unifies via `cos(√κ·d)` / `sin(√κ·d)/√κ` with the κ→0 limit giving the Euclidean straight-line case.

> [!IMPORTANT]
> **Decision I'd push for** Adopt the unified (x,y,w)+diag(1,1,−κ) representation for the kernel. Do **not** ship three separate point/isometry types (Poincaré complex Möbius for ℍ², O(3) matrices for S², ℝ² affine for E²) — that is the interface leak the plan must avoid, and three representations would force three copies of every instrument (holonomy, parallel transport, angle-sum). One matrix type, one `geodesicStep`, parameterised by κ.

> [!CAUTION]
> **Gotcha** The κ→0 limit is the numerically dangerous seam. `sin(√κ·d)/√κ` is a removable singularity but a naive implementation divides 0/0. The kernel must use the analytic continuation (series for small |κ|·d², i.e. `1 − (κd²)/6 + …`) rather than branching on `κ===0`. If the team branches instead, the "one pipeline" claim is cosmetic — there are really three code paths wearing a shared signature. **This is spike #1.**

### No for "develop neighbours" — that is three different operations

This is the plan's biggest honest weakness, and the prose ("develop neighbors for rendering") papers over it. The three covers tile *structurally* differently:

| κ | Tiling structure | Develop strategy |
| --- | --- | --- |
| 0 (E²) | Crystallographic lattice (ℤ² of translations / glides) | Round player to integer cell, render fixed (2K+1)² block — *exactly today's `euclideanCover`* |
| + (S²) | **Finite** tiling — the deck group is finite (order 1 for the sphere word, 2 for ℝP²). The "universal cover" is the sphere itself; there are no infinite neighbours | Render the whole compact cover once; no culling, no growth. A degenerate case the others don't share |
| − (ℍ²) | **Infinite Fuchsian** tiling, exponential tile count vs. radius. Deck group is non-abelian, free-ish | BFS the Cayley graph of Γ out to a hyperbolic-distance cutoff, frustum + distance cull aggressively |

These are not one operation with three parameters; they are three policies that happen to share a return type ("the set of (deck element, developed copy) pairs near the player"). The right shape is:

```
// kernel — pure math, no Three.js, no rendering policy
interface Geometry {
  readonly kappa: -1 | 0 | 1;
  // a unified isometry: 3x3 on (x,y,w), form diag(1,1,-kappa)
  identity(): Isom; compose(a: Isom, b: Isom): Isom; inverse(a: Isom): Isom;
  geodesicStep(frame: Frame, dist: number): Frame;   // one formula, kappa-param
  isometryFromEdgePair(poly: Polygon, p: EdgePairing): Isom;  // glide falls out
  regularPolygon(sides: number, cornerAngle: number): Polygon; // solves for size
  toScene(p: Point): THREE.Vector3;   // model -> render space
}

// SEPARATE policy — strategy object, NOT a method on Geometry
interface DevelopPolicy {
  // returns deck elements whose tile is "near" the player, with cull budget
  neighbours(player: Frame, gamma: DeckGroup, budget: number): Isom[];
}
// euclideanLattice / finiteOrbit / fuchsianBFS implement DevelopPolicy
```

Keeping `neighbours()` off `Geometry` is what stops the interface from leaking. The sphere's finite orbit and ℍ²'s exponential BFS are genuinely different algorithms with different performance contracts; pretending they are the same method invites a `switch (this.kappa)` inside the "unified" engine — the exact ad-hoc-ness the plan is trying to retire, just relocated.

## Orientation-reversing isometries — does the skin swap "fall out of Γ"?

This is real, not hand-waving — *if* the kernel represents isometries as full O(form) elements (allowing det = −1), not just the orientation-preserving SO/SL component. The current code already proves the principle in two places: `euclideanCover`'s `S.makeScale(1,1,−1)` on odd Klein columns, and `sphericalCover`'s `antipode.scale.set(−1,−1,−1)` for ℝP². Both are glide/point-reflection deck elements applied by hand.

Under the unified kernel the swap becomes a clean invariant: **track sign(det) of the accumulated deck element** applied to reach a copy; `det = −1` ⟺ that copy wears the opposite skin (columns↔trees) and the chiral decal/footprint reads mirrored. Because Γ is generated by the `EdgePairing`s and `surfaceSchema` already computes `reversed` per pairing, the orientation-reversing generators are exactly the reversed pairings. So the swap genuinely *falls out*: it is `det(deckElement) < 0`, computed once, consumed uniformly by the presentation layer. The normal-flip ("dive through the floor") is then literally *compose with a fixed orientation-reversing isometry of the tangent frame* — one shared move across all κ, as the plan claims.

> [!NOTE]
> **Verify this** The claim hinges on glide-reflections composing correctly in the matrix representation (a Klein-bottle `a`-generator is a glide, not a pure reflection). Spike it: build the Klein deck group from the matrices and confirm `a²` is a pure translation (det +1) while `a` is det −1. If that round-trips, the whole orientation story is sound for free.

## Is presentation expressible uniformly, or does it need a per-κ seam?

It needs a seam — and that is *fine*, the same way `ParticleViewerShell` sitting atop `lib/particles` is fine. The decor layout in unit-square (u,v) *is* uniform: `decor.ts` already authors landmarks in [0,1]² and every cover charts that square its own way. But the *mounting* of decor differs irreducibly per κ:

- **E²:** place at `(u−½)·side` in the tile's local frame, slab floor underfoot.
- **S²:** place on a radial direction, `quaternion.setFromUnitVectors` to stand the prop up; inner shell hangs at `R·0.997`.
- **ℍ²:** place at a Poincaré-disk point, prop "up" is the disk normal-frame, glass is the disk floor — and there is no single global "down".

The clean factoring: the kernel exposes `toScene(point)` + `frameAt(point)` (position + tangent basis in render space), and the presentation shell consumes *only* those. Then decor placement, glass, inner-shell, footprints, and normal-flip are written *once* against `{position, up, forward}` — the same `PlayerPose` contract the current facade already uses. The per-κ part shrinks to "give me a scene-space frame for a model point," which is exactly where it belongs. This is the right seam and the plan should name it explicitly rather than implying presentation is fully κ-free (it isn't) or fully κ-specific (it needn't be).

> [!IMPORTANT]
> **Decision** Mirror the `lib/particles` precedent: put the kernel under `src/lib/surface/` (κ-isometries, deck group, develop policies, instrument math — all Three.js-free and unit-testable), keep the presentation shell in `src/animations/PolygonWorlds/`. The Three.js-free boundary is what makes the kernel verifiable under a build-only CI (see below).

## Performance & footprint

- **ℍ² tile explosion is the headline risk.** Tile count grows like `e^(c·R)` in hyperbolic radius; a naive develop to "K rings" can hit thousands of octagons. Mandatory: (1) BFS Γ's Cayley graph with a **hyperbolic-distance cutoff** (not graph-depth), (2) frustum cull before instantiating, (3) a hard tile budget with LOD fade at the cutoff so the horizon doesn't pop. The Poincaré disk helps — distant tiles shrink toward the boundary, so a modest visual radius already covers the view. Budget the worst case (octagon, looking down a long corridor) in the spike, not after committing.
- **Instancing.** Today each cover builds N decor `Group`s per copy (see `euclideanCover`'s `(2K+1)²` cells × props). For ℍ² that is untenable; the develop layer should emit per-copy *transforms* and the presentation layer should use `InstancedMesh` keyed by prop, applying the deck matrix (with its det-sign skin choice) per instance. This also keeps draw calls flat across κ.
- **Bundle.** The app is already `React.lazy`-routed, so the kernel ships only with this route. Keep the kernel dependency-light (no new libs — the matrix math is <200 lines); don't pull in a generic linear-algebra package for three 3×3 operations.
- **rAF.** Develop should run on a *change budget*, not every frame: re-BFS only when the player crosses into a new fundamental cell, cache the neighbour set otherwise. The flat cover already does the moral equivalent (`I0 = round(px/side)`); generalise that "did the cell change?" gate.

## Verification & contracts

With only `npm run build` + manual checks, confidence has to come from *cheap in-code invariant assertions* at the kernel boundary (the kernel being Three.js-free is what makes this possible). Concrete checks I'd require:

| Invariant | Check | Catches |
| --- | --- | --- |
| Deck round-trip | `compose(g, inverse(g)) ≈ identity` for every generator and a few words; isometries preserve the form (`Mᵀ·diag·M ≈ diag`) | Bad matrix construction, wrong κ sign |
| Geodesic closes | Walk a known holonomy loop (square torus: `a b a⁻¹ b⁻¹` returns to start, same heading; Klein: returns mirror-flipped) | Geodesic step / deck composition errors |
| Angle defect = κ·area | Walk a triangle, sum exterior angle excess, compare to `κ·area` (Gauss–Bonnet). Equals 0 at κ=0, >0 sphere, <0 ℍ² | Wrong curvature wiring — the app's whole pedagogy |
| Polygon closes | Regular 2n-gon with the solved corner angle: vertices returned to start; corner-angle·(valence) = 2π (smooth gluing) | κ-solve / corner-angle bug (Euclid square 90°, ℍ² octagon 45°) |
| det-sign ⟺ skin | Every reversed `EdgePairing` generator has det −1; orientable words yield an all-det-+1 group | The columns↔trees swap silently breaking |
| κ→0 continuity | `geodesicStep` at κ = ±1e-7 matches the Euclidean result to tolerance | The 0/0 limit branch — the #1 hidden bug |

Package these as a `kernel.selfcheck.ts` that runs a console-asserted battery in dev (gated on `import.meta.env.DEV`), since there is no test runner. It is not unit tests, but it is executable contracts the build can carry and a human can eyeball in one glance. Cheap insurance for a math-heavy kernel where a sign error is invisible until someone walks a triangle.

## Phasing — mostly right, one reorder

The plan's P1 Euclidean-general → P2 Spherical → P3 Hyperbolic → P4 instruments is a sensible risk-ascending order. Two adjustments:

- **Insert a Phase 0 spike before committing the interface.** Two throwaway spikes, no rendering: *(a)* the unified (x,y,w)+κ isometry kernel passing the round-trip + κ→0 + Gauss–Bonnet checks above for all three κ; *(b)* a hyperbolic-octagon develop BFS printing tile counts at a few cutoffs to size the performance budget. These two answer the only questions that could force an interface redesign. Cost: a session. Value: avoids re-cutting the seam after three phases of code depend on it.
- **The sphere is a degenerate case, not a midpoint.** Because S²'s deck group is finite, P2 exercises almost none of the develop/Fuchsian machinery — it is closer to "port the existing sphere cover onto the new frame contract" than a test of the general engine. Treat P2 as a *regression port* (prove the new kernel reproduces today's sphere/ℝP² behaviour) and let **P3 hyperbolic be the real validation** of the develop policy. Don't let a smooth P2 create false confidence going into P3.
- Hexagon-torus (mentioned in the tour doc) is a free win that exercises "fundamental domain ≠ unique" with the *existing* Euclidean develop — slot it into P1 as a cheap correctness check that the develop policy is lattice-agnostic (n-gon edge count flows through), before ℍ² makes n-gons load-bearing.

## Risks I'd track

- HIGH κ→0 numerical limit implemented as a branch rather than an analytic series — silently makes "one pipeline" three pipelines.
- HIGH "Develop neighbours" treated as one method — leaks the lattice/finite/Fuchsian distinction back into the kernel.
- MEDIUM ℍ² tile budget unbounded — frame drops or boundary pop without a distance-cutoff BFS + instancing.
- MEDIUM Presentation seam left implicit — decor/glass/flip re-implemented per κ instead of once against `PlayerPose`.
- MEDIUM Retiring the working euclidean/spherical covers before the new engine reproduces them — keep them until P2's regression port passes; the `CoverModel` facade lets both coexist.
- LOW Free-entry edge-word UI producing invalid/exotic words — `surfaceSchema.analyzeSchema` already reports `valid`/`reason`; gate realization on it.

## Verdict

**Endorse the direction; gate the interface on two spikes; correct one structural conflation.**

- The "develop via edge-isometries, κ enters only through the metric" thesis is architecturally correct and genuinely unifies the *isometry kernel* across κ∈{0,+,−} and n-gons 2…8 — *provided* the kernel uses a single (x,y,w)+diag(1,1,−κ) representation with an analytic κ→0 limit, not three model- specific isometry types.
- The unification does **not** extend to "develop neighbours": the finite (S²), lattice (E²), and infinite-Fuchsian (ℍ²) tilings are three strategies. Model them as a `DevelopPolicy` strategy object *off* the `Geometry` interface. This is the one change that keeps the interface from leaking.
- The orientation-reversing skin swap and the normal-flip *do* fall out of Γ cleanly via `det(deckElement) < 0` — not hand-waving, given a full O(form) isometry type.
- Presentation needs a per-κ seam, and that seam is healthy — the same headless- core + shell split as `lib/particles`/`ParticleViewerShell`. Name it: kernel exposes `toScene`/`frameAt`, shell consumes only `PlayerPose`. Put the kernel in `src/lib/surface/`, Three.js-free, so it is verifiable under build-only CI via an executable invariant battery (round-trip, geodesic-closes, angle-defect = κ·area).
- Phasing: add Phase 0 (kernel + ℍ²-tile-count spikes) before committing the interface; treat P2 sphere as a regression port; let P3 hyperbolic be the true validation.

> [!IMPORTANT]
> **Bottom line** This is a good plan one refactor-of-the-spec away from a great one. Split `Geometry` (kernel) from `DevelopPolicy` (tiling) and from the presentation shell, prove the kernel with a Phase-0 spike battery, and the square→octagon / flat→sphere→hyperbolic generalization is real rather than aspirational. Do not retire the existing covers until the regression port is green.

## Self-reflection

1. **What would you do with another session?** Actually write the two Phase-0 spikes — a ~150-line (x,y,w)+κ isometry kernel with the invariant battery, and a hyperbolic-octagon develop BFS that prints tile counts at several distance cutoffs — to turn my "should hold" into "does hold / here are the real numbers."
2. **What would you change about what you produced?** I asserted the Cayley–Klein unification and the κ→0 series without running them; a spike would let me give exact corner-angle / tile-count figures instead of citing the textbook values (45° octagon, etc.).
3. **What were you not asked that you think is important?** The migration/coexistence path. The plan says "retire the ad-hoc covers"; I'd want an explicit rule that the old `CoverModel` impls stay until the new kernel passes a regression port, so a half-finished hyperbolic engine never regresses the shipped torus/sphere walk.
4. **What did we both overlook?** The *character/avatar and footprint trail* under hyperbolic motion — the trail (`footprints.ts`) and stride animation assume a globally consistent up-vector; on the Poincaré disk "up" is position-dependent and the trail must be re-developed per visible tile, not stored as fixed world points. That is a presentation-layer wrinkle neither the plan nor my review fully costed.
5. **What did you find difficult?** Judging the ℍ² performance budget without measurement — "exponential" is qualitatively clear but the actual playable cutoff (how many octagons before frame drops on a mid-range device) is unknowable from reading code.
6. **What would have made this task easier?** An existing spike or even a back-of-envelope tile-count estimate in the plan, and a stated target device / frame budget for the app.
7. **Follow-up value:** MEDIUM — the architectural conclusions are sound, but the two Phase-0 spikes would convert design judgement into measured fact and de-risk the interface commitment.
