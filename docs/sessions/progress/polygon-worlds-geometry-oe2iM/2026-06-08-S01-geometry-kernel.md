---
kind: progress
session: 2026-06-08-S01
date: 2026-06-08
title: Polygon Worlds — geometry kernel (M0 + Phase 0)
branch: claude/polygon-worlds-geometry-oe2iM
slug: polygon-worlds-geometry-oe2iM
status: in-progress
build: unknown
followup: null
pr: https://github.com/piyarsquare/animath/pull/190
app: PolygonWorlds
---

# Polygon Worlds — geometry kernel (M0 + Phase 0)

## Session purpose

Execute the build plan's **§9 / M0 + Phase 0**: wire `analyzeSchema` into the host
(zero-risk; verified but unused) so worlds become edge words with a live
χ / orientability / curvature readout; then build the Three.js-free **Cayley–Klein
kernel** + `scripts/verify-geometry.ts` invariant battery (group axioms,
edge-pairing/deck closure, geodesic-closes-with-holonomy, angle-defect = κ·area),
plus `realize(word)` incl. the κ>0 chart and a measured ℍ² tile-growth/horizon-
culling budget. Freeze the kernel interface only once the battery is green. Do not
touch the ad-hoc covers until the new port is verified.

## Previous session

[2026-06-07-S01 — foundation done, full build plan ready](../polygon-worlds/2026-06-07-S01-expert-synthesis.md):
PR #190 ships four worlds via ad-hoc covers; `surfaceSchema.ts` base layer built &
table-verified; three-hats CONDITIONAL GO; complete plan in `docs/polygon-worlds-plan.md`.
No geometry-engine code yet. (Handoff lives under the `polygon-worlds` slug; this
session runs on the new `polygon-worlds-geometry-oe2iM` branch.)

## Working notes

<!-- Newest entry first. -->

### 🔵 finding · 00:00 — Branch is based on `main`; foundation is on `claude/polygon-worlds`
**Why:** the assigned dev branch (`claude/polygon-worlds-geometry-oe2iM`) was cut
from `main`, so it has none of the PolygonWorlds app, the plan, or `surfaceSchema.ts`
— all of which live on the unmerged `claude/polygon-worlds` (PR #190).

Read the four required context docs directly from `origin/claude/polygon-worlds`:
the foundation handoff, `docs/polygon-worlds-plan.md`, `surfaceSchema.ts`, and the
three-hats expert synthesis. Settled decisions confirmed understood (χ picks the
geometry; κ>0 polygon is a chart onto the round sphere, κ≤0 isometric domain; one
Cayley–Klein kernel with analytic κ→0; `DevelopPolicy` strategy; per-κ presenter;
skin-swap/flip from `det(deck)<0`; no big-bang). Prerequisite before any engine
code: bring the foundation onto this branch (`git merge origin/claude/polygon-worlds`).

## Plan for this session

(M0 + Phase 0, pending user confirmation of the merge-in approach.)

1. **Foundation merge** — `git merge origin/claude/polygon-worlds` so this branch
   builds on the verified base layer + working covers (currently absent here).
2. **M0** — wire `analyzeSchema` into the host: `WORLDS` → edge words; picker shows
   live χ / orientability / curvature / surface name. Rendering still via old covers.
   `npm run build` green; ship.
3. **Phase 0 kernel** — `PolygonWorlds/lib/`: `cayleyKlein.ts` (points (x,y,w),
   form diag(1,1,−κ), analytic κ→0), `geometry.ts` (Geometry interface + κ
   instances), `develop.ts` (DevelopPolicy: finite/lattice/Fuchsian), `realize.ts`
   (word → geometry/domain/deckGens, incl. κ>0 chart), `invariants.ts` (the battery).
4. **`scripts/verify-geometry.ts`** — invariant battery mirroring `verify-schemas.ts`:
   group axioms, edge-pairing/deck closure, geodesic-closes-with-holonomy,
   angle-defect = κ·area. Freeze kernel interface only once green.
5. **ℍ² budget** — measure tile-growth + horizon-culling cost.
6. Commit + push to `claude/polygon-worlds-geometry-oe2iM` throughout.

## Decisions & rationale

> [!IMPORTANT]
> Carried-in settled decisions (from the plan — not re-litigated): χ selects the
> model; realize every word (κ>0 = chart onto smooth round sphere, no cone points
> in the walk; κ≤0 = isometric fundamental domain); single Cayley–Klein kernel,
> analytic κ→0 (no `κ===0` branch); `DevelopPolicy` strategy; per-κ presenter seam;
> skin-swap + normal-flip driven by `det(deck)<0`; keep working covers until each
> port is screenshot-green.
