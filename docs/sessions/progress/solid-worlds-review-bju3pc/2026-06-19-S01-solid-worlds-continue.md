---
kind: progress
session: 2026-06-19-S01
date: 2026-06-19
title: Solid Worlds — review state & plan the next push
branch: claude/solid-worlds-review-bju3pc
slug: solid-worlds-review-bju3pc
status: in-progress
build: passing
followup: null
pr: null
app: solid-worlds
signals: needs-dan
next: Homology rework shipped (subdivided complex + BFS reduction + manifold certifier + Smith-loop fix; green). Next: a Pairing schema extension for half-edge *axial* screws (non-opposite-face gluings) to express the free Hantzsche–Wendt + amphidicosms, then add the genuine screw manifolds to the catalog.
---

# Solid Worlds — review state & plan the next push

## Session purpose

Continue work on **Solid Worlds** (`#/solid-worlds`, walk inside a closed flat
3-manifold; the 3D successor to Polygon Worlds). The name may want
reconsidering. First task: review where the last session left things and lay out
the next steps before touching code.

## Previous session

First tracked session on **this** branch (`claude/solid-worlds-review-bju3pc`).
The app's prior work lives under the sibling branch folder — latest handoff:
[`polygon-world-app-review-8dduma/2026-06-18-S01-solid-worlds-ux-lighting-offset.md`](../../handoff/polygon-world-app-review-8dduma/2026-06-18-S01-solid-worlds-ux-lighting-offset.md),
with the standing tiered plan at
[`…/2026-06-18-S01-solid-worlds-plan.md`](../polygon-world-app-review-8dduma/2026-06-18-S01-solid-worlds-plan.md).
That branch's Solid Worlds code is **already present on this branch** (engine,
4-world flat catalog, chiral HUD, computed H₁, `Pairing.offset` plumbing).

## Working notes

### 🟡 milestone · 21:33 — Homology rework implemented, validated, shipped (build/lint/test green)
**Why:** Dan: "please complete the plan." Executed the homology-rework plan.

`lib/homology.ts` rebuilt as the gluing-agnostic engine; full project is green
(`npm test` 40/40, `npm run lint` 0 errors / 60 baseline warnings, `npm run
build` passing), and the app renders headless.

What landed:
- **Subdivided cubical chain complex** (default N≥2) replacing the fixed
  8-vertex/12-edge/3-face complex. Cells keyed by `(axes, minCorner)`; ∂₁/∂₂
  built over class representatives; H₁ from `smith`, χ = nV−nE+nF−nC.
- **Breadth-first deck-group reduction** identifies boundary cells (greedy
  face-crossing was unreliable for screws — it mis-identified staggered faces).
- **Vertex-link = S² manifold certifier**, assembled around each vertex
  *instance in the cover* (the domain-local version was wrong once a screw
  scatters the cubes — it false-negatived the offset-3-torus).
- **Smith-normal-form infinite-loop fix**: the old `smith` kept a stale pivot
  when a reduction left a residue smaller than it (round→0), looping forever.
  Latent for the ±1 golden matrices; a screw's ∂₂ triggered it. Now re-selects
  the smallest pivot each round.
- `SolidAnalysis.isManifold` surfaced; the app HUD now reads "manifold ✓ / links
  = S²" (stronger than the old χ=0 check).

Validation (tests in `__tests__/solidSchema.test.ts`):
- Golden H₁ unchanged; **N=1 ↔ N=2 invariance** proven (new general path
  reproduces the old fixed-CW values exactly).
- All four catalog worlds certify as manifolds; the offset-3-torus certifies too.
- The **∂₂∘∂₁ = 0** self-check guards every run.

> [!IMPORTANT]
> **Key finding — the free Hantzsche–Wendt is *not* expressible in the current
> schema** (this corrects the prior session's "cyclic −1 offsets" assumption).
> A broad search (4228 consistent specs) confirmed: three coordinate half-turns
> with perpendicular half-edge screws give the HW *homology* H₁ = (ℤ/4)², but the
> action keeps fixed points, so the quotient is a **pseudomanifold** — the
> certifier correctly rejects it (`isManifold=false`). The genuine free HW needs
> **half-edge *axial* screws**, where a face glues to the cube's *mid-plane*, not
> its opposite face — i.e. a `Pairing` schema extension (non-opposite-face
> gluings), a real follow-up, not part of this rework. The HW pseudomanifold is
> kept as a **test fixture**: it exercises the screw + BFS + Smith-fix path *and*
> the certifier's manifold-vs-pseudomanifold discrimination in one case.

> [!NOTE]
> The engine *does* find genuine new screw manifolds within the schema (e.g.
> H₁ = ℤ⊕ℤ/2⊕ℤ/4, certified). None added to the catalog this pass (per scope).

### 🟡 milestone · 20:18 — Homology-rework plan written (`…-homology-rework-plan.md`)
**Why:** Dan: "develop a plan for the homology rework." Researched the failure,
designed the method (Explore ×3 + a Plan agent), settled scope with Dan.

Plan: replace the fixed 8/12/3 CW complex with an **N-subdivided cubical chain
complex** (N=2) + per-pairing lattice reduction; reuse the existing integer
`smith()` SNF; gate correctness with three independent guards (∂∂=0, N=1↔N=2
golden invariance, and a Γᵃᵇ cross-check implemented in-test). Root cause
confirmed: screw offsets *stagger* the faces so "opposite faces glue as whole
2-cells" is false → `vIndex`/`EDGE_INDEX` crash.

Scope decided with Dan:
- **Rework only — no new catalog worlds** this pass. Hantzsche–Wendt is wired as
  a **test fixture** to exercise the screw path (target (ℤ/4)²), not added to
  `worlds.ts`.
- **Include the vertex-link = S² manifold certifier** (reuse PolygonWorlds'
  `surfaceSchema.ts`).

Plan: [`2026-06-19-S01-homology-rework-plan.md`](2026-06-19-S01-homology-rework-plan.md)
(`kind: plan`, `status: proposed`).

### 🔵 finding · 20:01 — Reviewed handoff + plan; state confirmed on-branch
**Why:** Orientation before any work, per /start-session.

State as inherited (all shipped, build/lint/test green per the handoff, verified
headless):

- **Tier 1 complete + most of Tier 2.** `src/animations/SolidWorlds/` has the
  developing-map cover engine (`coverEngine.ts`), a 4-world flat catalog
  (`worlds.ts`: 3-torus, half-turn, quarter-turn, amphicosm), the chirality HUD
  (original · rotated · mirrored), and **computed** H₁ via Smith normal form
  (`lib/homology.ts`).
- **Last session's headline fixes** were experiential: holonomy-symmetric
  lighting (lights replicated over the point-group orbit so floor/sky match where
  faces are identified), full cover in every mode, "show seams" toggle, corner
  markers + face labels, furniture/room scale decoupling, fog.
- **`Pairing.offset` is plumbed but unused.** The screw (off-axis) translation
  needed for Hantzsche–Wendt is wired through schema/engine/homology, but **no
  catalog world uses it yet** — because `computeHomology` *crashes* on a screw
  gluing (perpendicular offset staggers the faces, breaking the sign-fold vertex
  identification and the fixed `EDGE_INDEX` lookup).

The gating next step (last session's recommendation): rework `homology.ts` to a
method agnostic to the gluing's combinatorial niceness — either a **2× cube
subdivision** (gluings become cellular, existing Smith-form code applies) or
**abelianizing the Bieberbach group** (H₁ = Γᵃᵇ) — then add Hantzsche–Wendt + the
amphidicosms with computed/cross-checked invariants, plus the still-missing
**vertex-link = S² manifold certifier** and a **3D walk-the-loop chirality
harness**.

Open question flagged for Dan: the per-cell "Floor plane" toggle is now
independent of any "ground" concept and may want relabeling/reconciling.

### 🟣 decision · 20:01 — Holding for Dan's direction
**Why:** /start-session ends at orientation; the user asked for a state review +
next-steps read before choosing what to build.

Awaiting direction on which thread to pull: (a) the homology rework → screw
worlds, (b) the manifold certifier + chirality harness, (c) experiential/UX
polish, or (d) the naming question.

## Where we are (summary for Dan)

**Built and shipped:** a walkable, first-person flat 3-manifold explorer with 4
worlds, symmetry-correct lighting, a working chirality HUD, and homology computed
(not curated) for everything currently in the catalog. It's a real, correct Tier-1
app with most of Tier 2 done.

**The one wall:** the catalog can't grow to the *interesting* flat worlds
(Hantzsche–Wendt, the amphidicosms) until `homology.ts` stops assuming clean
opposite-face pairing. The `offset` data path is already there; only the invariant
computation blocks it.

**Bigger forks still ahead** (the plan's Tiers 2–4): the manifold certifier
(reuse Polygon Worlds' `surfaceSchema.ts` on each vertex link), a headless 3D
chirality test, then the genuinely new graphics work — the curved (S³/H³) renderer
that unlocks lens spaces, the Poincaré sphere, Seifert–Weber.

**Naming:** "Solid Worlds" pairs with "Polygon Worlds" (domain shape → app name).
Alternatives noted in the plan: *Manifold Walk* (pairs with *Topology Walk*),
*Space Worlds*. Open for revisiting this session.
