---
kind: plan
session: 2026-06-19-S01
date: 2026-06-19
title: "Plan: Solid Worlds — gluing-agnostic H₁ (screw-valid homology rework)"
branch: claude/solid-worlds-review-bju3pc
slug: solid-worlds-review-bju3pc
status: proposed
build: passing
followup: null
pr: null
app: solid-worlds
next: Implement the N-subdivided cubical chain complex in lib/homology.ts (per-pairing lattice reduction + signed gluing), gate it with N=1↔N=2 regression and a Γᵃᵇ cross-check, add the vertex-link S² certifier, and exercise the screw path with a Hantzsche–Wendt test fixture (not added to the catalog this pass).
---

# Plan: Solid Worlds — gluing-agnostic H₁ (screw-valid homology rework)

## Context

`src/animations/SolidWorlds/lib/homology.ts` computes H₁ and χ of a flat closed
3-manifold (cube with opposite faces glued) from a cellular chain complex via
Smith normal form. It works for the four current worlds but **crashes on screw
gluings** — the perpendicular off-axis `Pairing.offset` needed for
Hantzsche–Wendt and the amphidicosms. That crash is the single wall blocking the
catalog from growing to the interesting flat worlds; the `offset` data path is
already plumbed through schema/engine/homology, but no world can use it.

**Why it breaks (root cause, confirmed):** the current method hard-codes one
fixed CW structure — 8 cube vertices, 12 edges, **3 opposite-face-pairs as the
2-cells**, 1 cube — and identifies boundary cells by applying `pairingMap` then
`vIndex`, which clamps each image coordinate to ±1 by sign. Hantzsche–Wendt is
three half-turns about perpendicular axes (holonomy ℤ/2×ℤ/2) made
**fixed-point-free by perpendicular half-edge screw offsets**. A screw *staggers*
the faces: the image of the −x face lands shifted within the +x plane, so it is
not the whole +x face of the base cube — the "opposite faces glue as whole
2-cells" assumption is genuinely false, and `vIndex`/`EDGE_INDEX.get(...)!`
return garbage / crash. The fix is a homology method that does not assume clean
opposite-face pairing.

**Intended outcome:** a correct, screw-valid H₁/χ engine that (a) reproduces the
four existing worlds *bit-identically*, (b) computes the right invariants for
screw worlds (HW = (ℤ/4)², χ=0), and (c) certifies manifold-ness via the
vertex-link = S² test — all proven by self-checks and a second independent
method, never by asserted values.

## Scope (decided with Dan, S01)

- **Rework only — no new user-facing worlds.** `worlds.ts` stays at the four
  current worlds. Hantzsche–Wendt is wired **only as a test fixture** (to exercise
  the screw path and hit the known target (ℤ/4)²); it is *not* added to the
  catalog. Catalog growth (HW + the amphidicosms) is a clean follow-up once the
  engine is trusted.
- **Include the vertex-link = S² manifold certifier in this pass** (reuse
  PolygonWorlds' `surfaceSchema.ts` machinery).

## Approach

**N-subdivided cubical cellular homology with per-pairing lattice reduction.**

Replace the fixed 8/12/3 CW complex with the cubical complex of the cube
subdivided into an N×N×N grid (N = smallest integer making every `offset[k]*N`
integral; **N=2** suffices for half-edge screws and for the whole current
catalog). Build the integer boundary maps ∂₁, ∂₂, ∂₃ on this complex; identify
boundary cells under the three face-pairings; read H₁ and χ off Smith normal
forms. The existing integer `smith()`, `gcd`, `SignedUF`, `UF`, `formatH1`,
`superscript`, `Homology` interface, `applyM3`, and `pairingMap` are **reused
verbatim**; only the hard-coded enumeration (`vCoord`/`vIndex`/`EDGES`/
`EDGE_INDEX`/`faceCycle`) and the body of `computeHomology` are replaced.

### 1. Cell enumeration & indexing (integer grid)

Work in integer grid coordinates: cube `[−1,1]³` → grid `[0,N]³`, one step =
`EDGE_LEN/N` world units. A `Grid` helper gives dense contiguous ids per
dimension, each cell encoded as `(axes ⊆ {0,1,2}, minCorner ∈ ℤ³)`:

- 0-cells: vertices, `(N+1)³`; 1-cells: edges, axes={d}; 2-cells: squares,
  axes={d,e}; 3-cells: unit cubes, `N³`.
- **Canonical orientation** from increasing axis order. Interior boundary signs
  (edge `+head −tail`; square 4-cycle from `d∧e`; cube 6-faces with the fixed
  cubical `(−1)^d` signs) are world-independent and tabulated once — the only
  place orientation can go wrong is the gluing (step 3).

### 2. Boundary-cell reduction (the lattice step, simplified)

We only identify cells **on the cube boundary**. A boundary cell lies on one face
`±axis`; its image under `g_axis` is reduced back into the base cube by:
**apply `g_p` (signed-permutation linear part + integer translation, all exact
in grid units) → undo the one axial step along `axis` → snap the perpendicular
coordinates into `0..N` (mod the axis-aligned `Nℤ` sublattice)**. For half-edge
screws the staggered image (`N/2` shift) already lands inside the base cube's
opposite face, so it resolves to an *existing* sub-cell with a valid id — which
is precisely why subdivision cures the crash.

> [!NOTE]
> The full Bieberbach lattice reduction (compute an L-basis from
> `g_a^{ord(M_a)}` and commutators, reduce via Hermite normal form) is the
> general reference path. We implement the simple per-pairing reduction as the
> production path and the full L-reduction **as a test-only cross-check** that
> must agree on every boundary cell. If a future world needs it (offset > ½, or
> denominator 3), fall back to L-reduction.

### 3. Signed gluing → ∂₁, ∂₂, ∂₃

Plain `UF` for vertices; `SignedUF` for edges and squares (gluings can reverse
orientation). For each boundary cell C on a `−axis` face, under each applicable
pairing: compute the reduced image C′, recompute its canonical id from its
min-corner, and the **orientation sign `rel` = determinant of M's signed-
permutation block restricted to the cell's spanning axes** (±1 for an edge; the
2×2 sub-determinant for a square). `signedUF.union(id(C), id(C′), rel)`. Cells on
face intersections are unioned under *every* applicable pairing → transitive
closure gives the correct quotient even for nonabelian/ℤ²₂ holonomy. Assemble ∂
over class representatives exactly as the current code does, now on the
subdivided complex. Cubes are never glued (`N³` classes).

### 4. H₁, torsion, χ

- `rank H₁ = nE − rank(smith ∂₁) − rank(smith ∂₂)`; `torsion = invariant factors
  > 1 of ∂₂`. This is the current formula with `nE` now the subdivided
  edge-class count — it generalizes verbatim (the old code is the N=1 case).
- **χ = nV − nE + nF − nC** (an honest fix: the literal `− 1` only held because
  there was exactly one 3-cell; with subdivision there are `nC`). Closed
  3-manifold ⇒ χ=0 for any valid CW structure, so every world (incl. golden ones
  at N=2) must still give 0. `analyzeSolid` keeps `manifoldConsistent = euler===0`.

### 5. Vertex-link = S² manifold certifier (this pass)

With the full subdivided complex built, assemble each vertex-class's link from
the incident cells (cube corners → link triangles/quads, squares → link edges,
identified across the gluing as the 2-cells were). Certify each link is S²:
**connected, χ(link)=2, and every link-edge in exactly two link-triangles**
(pseudomanifold + Euler ⇒ S²). Reuse the surface-Euler / edge-incidence
machinery in `PolygonWorlds/surfaceSchema.ts`. Expose a `cellsIncidentTo(vertex
Class)` accessor from the rework so the certifier reads clean incidence data.
Surface the result on `SolidAnalysis` (e.g. `manifold: boolean` /
`linkReport`) and include a deliberate **non-manifold negative test** (a scheme
whose vertex link is a torus) asserting rejection.

### 6. Correctness gates (two independent methods + self-checks)

- **∂∂ = 0** over ℤ (∂₁∘∂₂ = 0 and ∂₂∘∂₃ = 0) asserted before SNF — a complete,
  world-agnostic check that the sign logic is right.
- **N=1 ↔ N=2 agreement** for the four golden worlds — subdivision invariance is
  a theorem, so this is the strongest regression that the new general path
  reproduces the old hard-coded one.
- **Cellular-H₁ === Γᵃᵇ** — implement the purely-algebraic abelianization of the
  Bieberbach group (relators from the point-group/lattice, `smith` on the relator
  matrix) **in the test file** as a fully independent verifier. Two-method
  agreement is the honesty bar before trusting any computed value.
- **HW fixture**: oracle-search a small parametrized family of half-turn screw
  offsets (each `±½` cyclically) at N=2; select the combination giving exactly
  **(ℤ/4)², χ=0, orientable, fixed-point-free**, and lock it into the *test
  fixture* (not `worlds.ts`). The literature value (ℤ/4)² is the acceptance
  oracle; offsets are derived by search, never fabricated.

## Files to touch

| File | Change |
|---|---|
| `src/animations/SolidWorlds/lib/homology.ts` | The rework. Keep `smith`/`gcd`/`SignedUF`/`UF`/`formatH1`/`superscript`/`Homology`/`applyM3`/`pairingMap`. Replace `vCoord`/`vIndex`/`EDGES`/`EDGE_INDEX`/`faceCycle` + the `computeHomology` body. Add: `Grid` indexer, N-selection, per-pairing reduction, signed `rel` from the M block, ∂₁/∂₂/∂₃ builders, `∂∂=0` assertion, generalized χ, `cellsIncidentTo` accessor, and the vertex-link S² certifier (or a sibling `lib/manifoldCheck.ts` reusing `surfaceSchema.ts`). |
| `src/animations/SolidWorlds/solidSchema.ts` | Surface the certifier result on `SolidAnalysis` (e.g. `manifold`/`linkReport`); `analyzeSolid` calls it. No `Pairing` change (`offset` already exists). |
| `src/animations/SolidWorlds/__tests__/solidSchema.test.ts` | Add: N=1↔N=2 agreement (golden), `∂∂=0` smoke, Γᵃᵇ===cellular verifier, HW screw fixture → (ℤ/4)²+χ=0+orientable, a non-manifold negative test, χ=0 for all. Existing golden rows unchanged. |
| `src/animations/PolygonWorlds/surfaceSchema.ts` | Read-only reuse for the link certifier (no edits expected). |
| `src/animations/SolidWorlds/worlds.ts` | **Unchanged this pass** (no new catalog worlds, per scope). |

## Implementation sequence

1. `Grid` indexer + interior ∂₁/∂₂/∂₃ + `∂∂=0` self-check; validate on the
   3-torus (straight identification, no orientation traps).
2. Per-pairing reduction + signed gluing; re-run the four golden worlds at **N=1
   and N=2** — both must reproduce ℤ³, ℤ⊕(ℤ/2)², ℤ⊕ℤ/2, ℤ²⊕ℤ/2 and χ=0.
3. Γᵃᵇ verifier in tests; confirm agreement on the four golden worlds.
4. HW screw fixture: oracle-search offsets → (ℤ/4)²; lock into the test fixture.
5. Vertex-link S² certifier + the non-manifold negative test; surface on
   `SolidAnalysis`.
6. Lint/build/test green.

## Verification

- `npm test` (vitest) — the acceptance harness for this pure-math change:
  golden regressions, N-invariance, ∂∂=0, Γᵃᵇ agreement, HW=(ℤ/4)², the
  manifold certifier + its negative test.
- `npm run lint` (0 new warnings) and `npm run build` (tsc typecheck) green.
- No app run needed (no rendering touched); the engine is Three.js-free.

## Risks & mitigations

- **Orientation sign errors** — the top risk. Mitigated by `∂∂=0` (self-checking
  signs), N=1↔N=2 invariance, and Γᵃᵇ agreement: three independent guards.
- **Lattice reduction subtlety** — simple per-pairing path cross-checked against
  full L-HNF reduction in tests; they must agree on every boundary cell.
- **Transitive multi-face identification** — handled by unioning under all
  applicable pairings; exercised by the HW fixture (triple-identified edges).
- **N selection** — computed from offset denominators with an assertion that
  every `offset[k]*N` is integral (throw, never silently truncate).
- **Certifier scope creep** — kept bounded by reusing `surfaceSchema.ts` and a
  single `cellsIncidentTo` accessor; one negative test guards it.
- **Performance** — N=2 cube is 27 vertices / 54 edges / 36 squares / 8 cubes;
  SNF is trivial. No concern.

## Out of scope / follow-ups

- Adding HW + the four amphidicosms to the **catalog** (`worlds.ts`) with
  computed-and-cross-checked H₁ — the immediate next session once the engine
  ships (the HW fixture and Γᵃᵇ verifier make this low-risk).
- Third/sixth-turn spaces (need a hexagonal-prism domain, not a cube — a
  separate schema extension).
- The 3D walk-the-loop chirality harness (still the flagged Tier-2 test gap).
- Curved (S³/H³) render — Tier 3, unrelated to this rework.
