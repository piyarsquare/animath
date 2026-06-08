---
kind: handoff
session: 2026-06-08-S01
date: 2026-06-08
title: Polygon Worlds — geometry kernel built + verified, Euclidean ported
branch: claude/polygon-worlds-geometry-oe2iM
slug: polygon-worlds-geometry-oe2iM
status: completed
build: passed
followup: high
pr: https://github.com/piyarsquare/animath/pull/190
app: PolygonWorlds
---

# Polygon Worlds — geometry kernel built + verified, Euclidean ported

> [!IMPORTANT]
> **Next session starts at P2 (Spherical).** The kernel is built, frozen, and
> verified (100-check battery); the Euclidean worlds now render through it and the
> ad-hoc `euclideanCover` is gone. Remaining: port the positive (P2) and negative
> (P3) worlds onto the kernel, then retire `sphericalCover`. Plan:
> [`docs/polygon-worlds-plan.md`](../../../polygon-worlds-plan.md).

## Summary

This session executed the build plan's **M0 + Phase 0 + P1** on a new branch
(`claude/polygon-worlds-geometry-oe2iM`, rebased onto the foundation
`claude/polygon-worlds` / PR #190). It built the Three.js-free **Cayley–Klein
geometry kernel** (one constant-curvature model for all κ, analytic κ→0), an
executable **100-invariant battery** that proves it (group axioms, geodesics,
Gauss–Bonnet, deck closure), `realize(word)` + a `DevelopPolicy`, and then ported
the **flat worlds (torus/Klein) to render from the kernel** — screenshot-verified
against PR #190 — retiring the ad-hoc `euclideanCover`. The kernel interface is
frozen. The spherical worlds still use the old `sphericalCover` (P2's job).

## What changed

- **M0 — host reads topology from `analyzeSchema`** (`fa5a776`). Each `WorldSpec`
  carries its canonical edge word; the Settings drawer shows live χ / orientability
  / curvature / surface name from the verified base layer, not the stored cover
  invariants. `verify-schemas` now also asserts each world word reproduces its
  stored invariants.
- **Phase 0 kernel** (`099b011`) — `lib/cayleyKlein.ts`: points on the shell
  `⟨P,P⟩=1` with form `diag(κ,κ,1)`; **κ = Gaussian curvature** (κ>0 sphere, 0 flat,
  κ<0 hyperbolic); curvature-trig `Cκ/Sκ` (entire in κ, no `κ===0` branch);
  isometries as **matrix exponentials** of the generators (so `det=±1` = orientation,
  compose = matrix multiply); `Frame` = group element (parallel transport / holonomy
  for free); `distance`, `geodesicPoint`, `originTo`, `angleAt`.
- **Phase 0 realize + develop + battery** (`f953eb6`) — `lib/realize.ts`: edge
  pairings → regular geodesic polygon (via `Cκ(R)=cot(π/m)·cot(α)`, one formula all
  signs) + side-pairing deck generators (tail→tail, reflection for glides → det<0);
  **isometric** when vertex classes have equal corner counts, **chart** onto the
  round sphere otherwise (sphere V=3) — the realization decision derived from the
  V-structure. `lib/develop.ts`: `DevelopPolicy` (finite/lattice/Fuchsian) BFS with
  horizon culling + cap. `scripts/verify-geometry.ts`: **100 checks green**.
- **P1 — Euclidean presenter** (`6752ec4`) — `presenters/euclidean.ts` renders
  torus/Klein from `realize`/`develop`: tiling = the deck lattice, the trees↔columns
  flip = `det(deck)<0`. Screenshot-verified (torus pixel-identical, Klein matching).
  `euclideanCover.ts` retired.

## Key files

| File | Role |
|---|---|
| [`lib/cayleyKlein.ts`](https://github.com/piyarsquare/animath/blob/eceb959/src/animations/PolygonWorlds/lib/cayleyKlein.ts) | The frozen geometry kernel (unified κ model). |
| [`lib/realize.ts`](https://github.com/piyarsquare/animath/blob/eceb959/src/animations/PolygonWorlds/lib/realize.ts) | word → polygon + deck generators; isometric-vs-chart from V-structure. |
| [`lib/develop.ts`](https://github.com/piyarsquare/animath/blob/eceb959/src/animations/PolygonWorlds/lib/develop.ts) | `DevelopPolicy` tile enumeration (finite/lattice/Fuchsian) + horizon budget. |
| [`lib/invariants.ts`](https://github.com/piyarsquare/animath/blob/eceb959/src/animations/PolygonWorlds/lib/invariants.ts) | The 100-check battery (`npm run verify:geometry`). |
| [`presenters/euclidean.ts`](https://github.com/piyarsquare/animath/blob/eceb959/src/animations/PolygonWorlds/presenters/euclidean.ts) | P1: flat worlds rendered on the kernel (copy this for P2/P3). |
| [`sphericalCover.ts`](https://github.com/piyarsquare/animath/blob/eceb959/src/animations/PolygonWorlds/sphericalCover.ts) | The cover P2 retires (sphere/ℝP²). |

## Open / not done

1. **P2 — Spherical presenter.** Port the positive words onto the kernel:
   **ℝP²** realizes as a *smooth* hemisphere square (V=2, equal counts → isometric,
   `realize` already returns the right polygon + Z/2 deck), while the **sphere**
   `a a⁻¹ b b⁻¹` is a **chart** (V=3, `realize` returns `chart:true`) onto the round
   sphere — distances distort, disclose it; instruments must read the true model
   metric. Build `presenters/spherical.ts` (model `framePos`/`frameForward` map to
   the sphere surface), retire `sphericalCover`. **Ship the extrinsic embedding inset
   here** (first non-orientable surface) per the plan.
2. **P3 — Hyperbolic presenter.** Poincaré-disk render + Fuchsian develop within the
   measured budget (Fuchsian defaults already set: horizon 6.5 / maxTiles 800).
3. **P4 — Instruments + free edge-word entry** (each instrument is an interactive
   battery assertion). **P5 — κ/gluing morph** (stretch).
4. **Mini-map for non-square / curved polygons.** `squareMap.ts` is square-specific;
   generalising it to the n-gon edge diagram is pending (P2/P4).

## Context

- **Convention:** κ = Gaussian curvature with ambient form `diag(κ,κ,1)`. The plan's
  sketch said both this and `diag(1,1,−κ)` (opposite sign); the kernel header
  documents the choice. Don't "fix" it to match the sketch — the table (χ→curvature)
  is the load-bearing convention.
- **The naive "boundary-word relator = identity" is the WRONG deck-closure test** —
  a grid search proved the geometrically correct (fixed-point-free, correctly-tiling)
  side-pairings don't satisfy that exact word (they satisfy a conjugated relation),
  while the construction that did satisfy it produced degenerate involutions. The
  battery uses the convention-independent invariants instead: **angle-sum = 2π per
  vertex class** + **fixed-point-free generators**. Keep it that way.
- **Verification:** `npm run build` (only CI), `npm run verify` (schemas + 100
  geometry invariants), and headless screenshots (`npm run preview` + a puppeteer
  driver that opens the menu and sets the world `<select>`). Freeze-the-interface
  discipline: the battery gates the kernel.
- **No big-bang held:** each port keeps the old cover until its screenshots match,
  then retires it. `euclideanCover` is gone; `sphericalCover` remains until P2 is
  green.
- **Branch:** rebased linearly onto `origin/claude/polygon-worlds`; a PR from this
  branch would include #190's work unless #190 merges to main first (plan's M0).

## Self-reflection

**What I'd do with another session.** P2: copy `presenters/euclidean.ts` into a
spherical presenter, render the ℝP² smooth hemisphere first (cleanest positive case),
then the sphere chart with honest distortion disclosure + true-metric instruments,
and retire `sphericalCover`.

**What I'd change about what I produced.** The Euclidean presenter still walks the
player in flat world coordinates rather than as a kernel `Frame`; that's fine for κ=0
but P2/P3 will need the player to be a kernel frame integrated by `stepForward`, so a
small refactor of the player-state seam would pay off before P2.

**What I was not asked that matters.** Whether to generalise the mini-map to the
n-gon edge diagram now (it's square-only). It will block the non-square hyperbolic
worlds in P3; worth doing in P2.

**What we both overlooked.** The Klein flip axis vs the mini-map: the first port
flipped the wrong axis until I aligned the edge word. Any future word change near the
presenters should re-check the rendered flip against the mini-map arrows.

**What was difficult.** Pinning the side-pairing construction: the algebraically
"obvious" relator test was misleading, and only a grid search over construction
choices (scored on *both* relator closure *and* fixed-point-free tiling) revealed
that the right invariant is angle-sum=2π, not the boundary-word product.

**What would have made it easier.** Having the invariant battery before writing
`realize` (which I did) — it caught the polygon-formula bug (`cot·cot`, not `1/sin`)
and the side-pairing direction immediately. Worth keeping that discipline for P2/P3.

**Follow-up value: HIGH** — the kernel is the foundation for two more rendering
phases; it's frozen and verified, so P2/P3 can build straight on it, but they are
substantial and unbuilt.
