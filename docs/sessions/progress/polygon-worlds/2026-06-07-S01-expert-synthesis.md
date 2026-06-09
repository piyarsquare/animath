---
kind: three-hats
session: 2026-06-07-S01
date: 2026-06-07
title: Polygon Worlds geometry plan — three-hats convergence
branch: claude/polygon-worlds
slug: polygon-worlds
status: completed
build: unknown
followup: high
pr: null
app: PolygonWorlds
---

# Polygon Worlds geometry plan — three-hats convergence

## Plan under review

<details>
<summary>Original request (verbatim)</summary>

**PLAN — Polygon Worlds: the full geometry + skins + exploration layer**, built on
the now-verified `surfaceSchema.ts` base (edge word → χ, orientability, curvature,
classification, edge pairings; validated against the classification tables
2-gon…8-gon). Scope of THIS plan: everything that builds ON the base layer, up to
at least the 8-gon, with advanced two-sided skins and tools for
exploration/discovery. Confirmed direction: "develop via edge-isometries" — realize
the polygon in the curvature-κ model, edge pairings become isometries (the deck
group Γ), walk geodesics, develop the universal cover around the player; curvature
enters ONLY via the metric + corner angles.

**GOAL:** one coherent engine where Euclid, sphere, and hyperbolic are the SAME
pipeline at different κ, and the square…octagon are the same pipeline at different
edge counts. No per-surface special cases (the current ad-hoc euclideanCover /
sphericalCover, the lon/lat sphere hack, and the hardcoded WORLDS presets all
retire).

**PROPOSED ARCHITECTURE:**

1. `Geometry` interface keyed by κ (one impl each): **Euclidean** (κ=0; ℝ²
   isometries — translations, rotations, glide-reflections; straight geodesics),
   **Spherical** (κ>0; S²⊂ℝ³; O(3); great circles — sphere, ℝP² and any χ>0 schema),
   **Hyperbolic** (κ<0; ℍ² Poincaré/Beltrami–Klein disk; Möbius/SL(2,ℝ); arcs —
   genus-2 octagon, 3-/4-cross-cap, χ<0). Each provides: point+tangent-frame type;
   `geodesicStep(frame, dist)`; `isometryFromEdgePair(polygon, pairing)`;
   `compose/inverse`; `develop`; and the regular polygon's vertex placement + corner
   angle.
2. **Polygon realization:** a regular geodesic 2n-gon whose corner angle =
   2π / (vertices-per-class) so the glued surface is smooth (Gauss–Bonnet consistent
   with χ). κ is chosen/solved so a regular 2n-gon with that angle exists (Euclidean
   square = 90°; spherical square angle > the Euclidean value; hyperbolic octagon =
   45°). The "stretch the sheet to fit the polygon".
3. **Deck group** Γ = ⟨edge-pairing isometries⟩. Walk: integrate the player's
   geodesic; when leaving the fundamental polygon, multiply by the deck element to
   wrap back in (keep the player in the fundamental domain), and develop the
   neighbouring copies for rendering ("project the infinite tile outward").
4. **Presentation re-expressed on the develop model:** the two-sided sheet (trees on
   one normal, columns on the opposite), authored in polygon-(u,v); a generalized
   glass surface + mirrored "other side" / inner shell; per-copy decor placed by
   developing the fundamental polygon's decor through Γ; the chiral footprint trail;
   the normal-flip ("dive through the floor") as one shared player move. Skins must
   work for orientable AND non-orientable cases and across κ (the trees↔columns swap
   on a non-orientable loop falls out of Γ, not a hack).
5. **Mini-map IS the edge diagram,** generalized from the square to the n-gon
   (regular 2n-gon with the `EdgePairing` identification arrows + the player marker).
6. **Tools for exploration & discovery:** edge-word picker (complexity ladder +
   free edge-word entry, live χ/orientability/curvature); Euler's intrinsic
   instruments (geodesic-return holonomy, mirror-reversed trail, triangle angle-sum,
   circle circumference vs radius, parallel-transport compass, hall-of-mirrors);
   normal-flip; optional extrinsic embedding inset (cross-cap/Roman/Boy for ℝP²;
   figure-8 Klein; genus-2) — "same walk, wildly different shape".
7. **Phasing:** P1 Euclidean general → P2 Spherical general (fix the lon/lat + ℝP²
   bugs from the actual gluing) → P3 Hyperbolic (octagon genus-2, Poincaré, Fuchsian)
   → P4 instruments + insets + free edge-word entry; the world-to-world morph
   (curvature+gluing animation) as a later stretch.

**REVIEW REQUEST:** does the single `Geometry`/develop abstraction genuinely unify
κ∈{0,+,−} and n-gons 2…8 without per-case hacks? Where will it strain (κ→0 limit +
Minkowski signature for hyperbolic; orientation-reversing isometries; regular-polygon
angle solving; fundamental-domain vs unbounded develop; ℍ² tile-count perf)? Is the
skin/glass/inner-shell/normal-flip presentation uniform across κ or per-κ? Are the
tools well-founded and the phasing right? Flag anything to cut, resequence, or spike
first.

</details>

Synthesis of three independent reviews of the plan to build the full
**develop‑via‑edge‑isometries** geometry layer (square → octagon, κ ∈ {0, +, −})
on top of the verified `surfaceSchema.ts` base. Full reviews:

- [Framework Maintainer](./2026-06-07-S01-expert-maintainer.md)
- [Architecture & Quality Consultant](./2026-06-07-S01-expert-consultant.md)
- [Math‑Viz & Pedagogy](./2026-06-07-S01-expert-pedagogy.md)

## Executive summary

All three **endorse the direction** — one κ‑keyed engine, edge pairings as deck
isometries, develop the universal cover — as the *good* kind of consolidation
(uniformization made literal), descending from a base layer that already proved an
edge‑word‑driven, table‑verified, special‑case‑free abstraction is buildable. But
the green light is **conditional on two corrections and one discipline**:

> [!IMPORTANT]
> 1. **The polygon realizer in the plan is mathematically wrong** (pedagogy). "Realize every word as a *regular* 2n‑gon with one tuned corner angle" holds only when all corners glue to a single vertex class (V = 1) — true for torus/Klein/cross‑cap/genus‑g, **false** for exactly the cases the user flagged: ℝP² `abab` (V = 2), sphere `aa⁻¹bb⁻¹` (V = 3), the bigons. There the recipe silently inserts **cone points** while claiming smooth constant curvature — corrupting the intrinsic experience and making the triangle/compass instruments give wrong answers.
> 2. **A verification spike is a Phase‑0 gating deliverable, not Phase‑4** (maintainer + consultant). With build‑only CI, an executable invariant battery (group axioms, edge‑pairing closure, holonomy, angle‑defect = κ·area) is the *only* thing keeping a general engine honest — and it doubles as the headless prototype of Euler's instruments.
> 3. **No big‑bang.** Bank PR #190's four working worlds; build the engine on a follow‑on, keep the old covers until the port is green, retire them one at a time.

## 1 · Points of agreement (high confidence)

- **The develop / universal‑cover / deck‑group model is the right engine *and* the right pedagogy.** Walking the hall of mirrors literally renders the Γ‑orbit — "hold a generator of π₁ in your hand." (all three)
- **The base layer (`surfaceSchema.ts`) is excellent** and is the correct seam to build on. The cheapest first win is wiring the host to `analyzeSchema` — it's verified but currently unused by the app. (maintainer)
- **P1 (flat torus + Klein) already ships a real lesson** and is the safe MVP. (maintainer + pedagogy)
- **Verification must come early.** The invariant battery / `verify-geometry.ts` is P1‑gating, not P4; retiring the covers reduces debt *only if* the spike lands before any cover is deleted. (maintainer + consultant; pedagogy's fidelity gate is checked by the same battery)
- **The skin‑swap and normal‑flip genuinely fall out of Γ** via `det(deckElement) < 0` given a full O(form) isometry type — real, not hand‑waving. The shape‑based trees/columns skin is CVD‑robust; the **chiral decal** (not the skin) stays the canonical orientation cue. (consultant + pedagogy)

## 2 · Points of tension (reconcile before building)

### 2a · "Regular polygon, one angle" vs vertex‑class reality
The plan's realizer must change. Corner angles must sum to 2π **per vertex class**
(from the base layer's union‑find V), not be a single regular value. This is *not*
in conflict with the consultant's "unify the kernel" — the **isometry/geodesic
kernel** unifies cleanly; the **polygon‑realization** step is genuinely
word‑dependent and must respect V. The resolution doubles as the fix for the
user's own complaints:

> [!WARNING]
> The χ > 0 cases are **not** "the square engine at κ > 0." The sphere is the
> **adjacent‑edge fold** of a stretched square (a lune/pillow), and ℝP² is the
> **antipodal S²** — both realized from the actual gluing, with a `V = 1`
> realizability gate and an honest fallback for the degenerate words. (This is
> exactly the "sphere needs adjacent, not parallel" and "ℝP² is totally wrong"
> the user already flagged.)

### 2b · One representation vs three (resolved: one)
Consultant: use **one** Cayley‑Klein representation — points `(x, y, w)` with form
`diag(1, 1, −κ)`, isometries the O(form) group, and an **analytic κ → 0 series**
rather than a `κ === 0` branch. Three model‑specific isometry types would be the
interface leak. The plan's "one impl per κ" framing should become "one kernel,
κ a parameter."

### 2c · "Develop neighbours" is not one operation (resolved: strategy object)
S² is finite, E² is a lattice, ℍ² is infinite‑Fuchsian (exponential). Put tiling
behind a `DevelopPolicy` strategy off the `Geometry` interface — the single change
that stops it leaking.

### 2d · Where the kernel lives
Consultant favours `src/lib/surface/` (Three.js‑free, shareable); maintainer warns
against lifting to `lib/` to share with TopologyWalk until both ship. **Resolve:**
keep the Three.js‑free kernel + battery inside `PolygonWorlds/` (or `lib/surface/`
consumed only by PolygonWorlds) now; promote to shared `lib/` only once a second
consumer is real.

### 2e · Presentation seam
A per‑κ presentation seam is **healthy**, not a smell — the same headless‑core +
shell split the repo already uses (`lib/particles` vs `ParticleViewerShell`).
Don't force one uniform presentation across κ.

## 3 · Blind spots (none addressed)

- **The Phase‑2 morph.** The Cayley‑Klein κ‑parameter makes a *curvature* morph
  natural (animate κ), but a *gluing* change crosses χ (topology) — none reconciled
  how the morph rides the new kernel.
- **Concrete perf budget.** ℍ² exponential tiling and rAF‑on‑phone were both
  flagged, but no tile‑count / FPS target or horizon‑culling budget was set —
  the maintainer makes this a required pre‑P3 spike.
- **Shareable state.** Free edge‑word entry implies a shareable/persistent word
  (URL or `usePersistentState`); unaddressed.
- **Inset bundle cost.** Embedding meshes (cross‑cap/Roman/Boy/figure‑8/genus‑2)
  should be **procedural**, not asset imports, to protect the code‑split bundle.

## Verdict

**CONDITIONAL GO.** Green‑light the vision, the base layer, and P1. Then:

1. **Bank PR #190** (four working worlds) and wire the host to `analyzeSchema`.
2. **Phase 0 spike (gates the interface):** the Cayley‑Klein `(x,y,w)` kernel with
   analytic κ → 0; an executable invariant battery; the `V = 1` realizability gate
   feeding the polygon realizer with an honest fallback; a measured ℍ² tile‑growth
   + horizon‑culling budget. Three.js‑free, in `PolygonWorlds/` (or `lib/surface/`).
3. **P1 Euclidean** port behind the kernel + `DevelopPolicy`; keep `euclideanCover`
   until the port is green, then retire it.
4. **P2 Spherical** via the corrected **adjacent‑fold / antipodal‑S²** realization
   — fixing the user's flagged sphere/ℝP² bugs at the root.
5. **Ship the extrinsic embedding inset *with the first non‑orientable surface*
   (Klein)**, not in P4 — it's the app's thesis ("same walk, wildly different
   shape"), not a garnish.
6. **P3 Hyperbolic** octagon only after the perf spike; the instruments piggyback
   on the verification battery (they are the same assertions, made interactive).

> [!NOTE]
> The single highest‑leverage corrective: the **`V = 1` realizability gate**. It
> is the root fix for the cone‑point fidelity bug, the sphere‑adjacency bug, and
> the ℝP² bug simultaneously, and it falls directly out of the base layer the
> session already verified.

## Self-reflection

**What I'd do with another session:** write the Phase‑0 spike — the Cayley‑Klein
kernel + invariant battery + the `V = 1` gate — since all three reviews converge on
it being the thing that converts design judgement into measured fact and unblocks
every later phase.

**What I'd change about this review:** I scoped the plan as "regular polygon per
word," which the pedagogy hat correctly demolished. A 20‑minute check of the base
layer's `V` against the headline words *before* writing the plan would have caught
the cone‑point flaw myself.

**What we both overlooked:** a concrete performance budget (tiles, FPS, mobile) —
flagged qualitatively by two hats but never quantified; it should be a spike
deliverable, not a hope.

**Follow‑up value:** HIGH — the review found a real mathematical flaw in the
realizer and a clear, low‑risk build sequence; acting on the `V = 1` gate + the
Phase‑0 spike is the difference between a correct engine and a pretty‑but‑false one.
