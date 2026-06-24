---
kind: handoff
session: 2026-06-20-S01
date: 2026-06-20
title: Solid Worlds — screw bug fixed (all 8 platycosms dual-verified) + −a2 naming confirmed
branch: claude/3d-manifold-worlds-imwmal
slug: 3d-manifold-worlds-imwmal
status: completed
build: passing
followup: null
pr: null
app: solid-worlds
signals:
next: Product call only — rename the app "Solid Worlds" → "Manifold Walk"? (Dan said leave it this session.) No engine work outstanding.
---

# Solid Worlds — screw bug fixed (all 8 platycosms dual-verified) + −a2 naming confirmed

## Summary

Fixed the long-standing cell-engine "screw bug" in Solid Worlds so all **8 catalog
platycosms are now dual-verified** — the cube cell complex (`lib/homology.ts`)
agrees with the authoritative Γᵃᵇ homology (`lib/freeness.ts`) on H₁, reports
χ = 0, and certifies every vertex link as an S². The two screw worlds (second
amphidicosm, Hantzsche–Wendt didicosm) drop their *experimental* flag. Also
confirmed against the literature that the **second amphidicosm (−a2) = ℤ ⊕ ℤ/4**.
Build + 53 vitest tests + lint all green. The remaining open item is a pure
product/naming call.

## What changed

The handoff before this called the defect "an orientation-sign / vertex-link
error." Instrumenting the engine showed it was actually **two independent bugs**:

- **Bug A — the gluing "bounce" (wrong χ).** The boundary identification glued a
  screwed face by applying the pairing and reducing the straddling image to the
  *first* in-cube cell a BFS found. That BFS tried the **inverse of the gluing
  generator first**, which just undoes the step and lands back on the **source
  face** — a no-op self-gluing that left four faces unglued (χ = 1 on the second
  amphidicosm). **Algorithmic, present at every subdivision.** Fixed by
  `orbitInCube`, which collects the **whole** in-cube deck orbit of a cell and
  unions with all members, so the true partner is always included.
- **Bug B — vertex link too coarse (false manifold rejection).** At the default
  N = 2 the half-cube screw folds the vertex link onto itself (link χ = 5, pinched).
  Pure **subdivision coarseness** — at N = 4 it's a clean sphere. `chooseN` now
  returns a finer grid (2·N₀ = 4) for screw worlds; H₁/χ are subdivision-invariant
  so values are untouched.
- **Bonus guard.** A stress input revealed the engine silently mis-counts (χ = −48)
  on a **fractional axial offset** (offset along the pairing's own axis), which
  makes the cube a non-fundamental-domain. It now **throws** instead. The catalog
  uses only perpendicular screws, so it's unaffected.
- **−a2 confirmation.** The two amphidicosms (β₁ = 1, holonomy ℤ₂², Bieberbach
  B₃/B₄) are uniquely pinned by homology in the literature: H₁(B₃) = ℤ ⊕ (ℤ/2)²
  and H₁(B₄) = ℤ ⊕ ℤ/4. So −a2 (= second amphidicosm = B₄) = **ℤ ⊕ ℤ/4** is the
  genuine name↔invariant pairing, matching both in-app computations.

Two commits this session: `84d2c12` (the fix + docs/tests) and `2b96fd7` (the
−a2 confirmation + backlog/comment updates).

## Key files

| File | Role |
|---|---|
| [`lib/homology.ts:163`](https://github.com/piyarsquare/animath/blob/2b96fd719e9a33143ad58e32436b01d817ca3088/src/animations/SolidWorlds/lib/homology.ts#L163) | `buildGens` — now throws on a fractional axial offset (validity guard) |
| [`lib/homology.ts:268`](https://github.com/piyarsquare/animath/blob/2b96fd719e9a33143ad58e32436b01d817ca3088/src/animations/SolidWorlds/lib/homology.ts#L268) | `orbitInCube` — Fix A: collect the whole in-cube deck orbit (no bounce) |
| [`lib/homology.ts:183`](https://github.com/piyarsquare/animath/blob/2b96fd719e9a33143ad58e32436b01d817ca3088/src/animations/SolidWorlds/lib/homology.ts#L183) | `chooseN` — Fix B: finer subdivision (2·N₀) for screw worlds |
| [`SCREW_BUG.md`](https://github.com/piyarsquare/animath/blob/2b96fd719e9a33143ad58e32436b01d817ca3088/src/animations/SolidWorlds/SCREW_BUG.md) | The full deep + accessible write-up of both bugs (the requested doc) |
| [`solidSchema.ts:138`](https://github.com/piyarsquare/animath/blob/2b96fd719e9a33143ad58e32436b01d817ca3088/src/animations/SolidWorlds/solidSchema.ts#L138) | `analyzeSolid` — `verified` gate (H₁ = Γᵃᵇ ∧ χ = 0 ∧ cell.manifold) |
| [`worlds.ts:68`](https://github.com/piyarsquare/animath/blob/2b96fd719e9a33143ad58e32436b01d817ca3088/src/animations/SolidWorlds/worlds.ts#L68) | Screw-worlds comment — records the −a2 = ℤ⊕ℤ/4 literature provenance |
| [`__tests__/gab.test.ts:34`](https://github.com/piyarsquare/animath/blob/2b96fd719e9a33143ad58e32436b01d817ca3088/src/animations/SolidWorlds/__tests__/gab.test.ts#L34) | Catalog tests — screw worlds now dual-verified; gate regression |
| [`__tests__/solidSchema.test.ts:90`](https://github.com/piyarsquare/animath/blob/2b96fd719e9a33143ad58e32436b01d817ca3088/src/animations/SolidWorlds/__tests__/solidSchema.test.ts#L90) | Cell-engine tests broadened to all 8 + boundary-closure + axial-offset reject |

## Open / not done

- **App naming** ("Solid Worlds" vs *Manifold Walk*) — **Dan said leave it this
  session.** Logged in `TODO.md` as a product call, no action needed unless
  revisited.
- **No engine work outstanding for Solid Worlds.** Both backlog items (screw fix,
  −a2 confirmation) are checked off in `TODO.md`.
- **This branch is unmerged** (`pr: null`). If it should land on `main`, follow the
  CLAUDE.md PR-finalization flow (`git fetch && git merge origin/main`, keep every
  app's append-only entries, re-run `npm run build`). Only shared file touched is
  `CLAUDE.md` (one SolidWorlds line) + `docs/sessions/**` + `TODO.md`.

## Context

> [!NOTE]
> **Two engines, on purpose.** Solid Worlds computes H₁ two independent ways and
> only marks a world `verified` when they agree: **Γᵃᵇ** (`lib/freeness.ts`, the
> authoritative group-theoretic answer) and the **cube cell complex**
> (`lib/homology.ts`, the cross-check that had the bug). The vertex-link S² test in
> the cell engine is *not* a reliable manifold-vs-orbifold detector (a cone point's
> link is still a sphere) — `isFreeAction` is. The link test's job here is narrower:
> confirm the glued cube assembled into a closed manifold without a broken gluing.

> [!CAUTION]
> The cube cell complex is only valid when **the cube is one fundamental domain**
> (each pairing's net axial translation = one full edge). Every cube platycosm uses
> *perpendicular* screws, which keep that true. A *fractional axial* offset breaks
> it (the cube becomes a multi-fold cover; χ goes meaningless — a test input gave
> χ = −48). The engine now throws on that case rather than lie.

> [!WARNING]
> **−a2 confirmation has an honesty caveat.** The primary PDFs (arXiv math/0311476
> Table 6, nLab, Wikipedia, ResearchGate) all returned **HTTP 403** to the fetch
> tool this session (network policy). The confirmation rests on WebSearch summaries
> quoting the literature's homology values + the two in-app computations agreeing.
> Strong, but not a direct read of Conway–Rossetti's Table 6. A less-restricted
> network could close that last gap.

## Self-reflection

1. **What would you do with another session?** Nothing engine-side for Solid
   Worlds — it's complete and dual-verified. The only loose thread is reading
   Conway–Rossetti Table 6 directly (blocked by the network this session) to turn
   the −a2 confirmation from "literature values quoted via search + matching
   computation" into a primary-source citation. Optionally, visually confirm a
   screw world's HUD now reads "cross-checked" by driving the walker (the default
   route loads the 3-torus; the screw worlds are selected via the World picker,
   which persists in localStorage — there's no URL param to preselect one).
2. **What would you change about what you produced?** The `verified` flag still
   leans on the cell engine's vertex-link cert, which I established is *not* a
   genuine manifold detector (it can't see cone points) — it only catches broken
   gluings. That's honest and documented, but a truly independent second homology
   (e.g. a CW complex built straight from the free-action orbit) would be a
   stronger cross-check than the cube complex. Not worth it now that both agree.
3. **What were you not asked that you think is important?** Whether the
   experimental worlds should have been *visually* marked in the world picker while
   they were experimental — moot now that none are. And the app-naming question,
   which Dan explicitly deferred.
4. **What did we both overlook?** Initially, that the "one bug" was two. The χ = 1
   (gluing) and the failed link cert (coarseness) had different root causes and
   different fixes; chasing them as a single "orientation-sign error" would have
   stalled. The instrumentation (cell counts + per-vertex link χ + face-class
   sizes) is what separated them.
5. **What did you find difficult?** Telling Bug A from Bug B, and resisting the
   prior note's framing. The `hw-pseudo` stress test was a trap: its old comment
   claimed the spec was non-free (it's free per the corrected oracle) and expected
   χ = 0 (its axial offsets make the cube a non-fundamental domain, so χ is
   genuinely undefined for the cube method) — untangling that took care.
6. **What would have made this task easier?** A headless way to drive the walker to
   a chosen world/pose for visual checks, and an un-firewalled network to read the
   primary platycosm tables directly. Both are environment limitations, not code.
7. **Follow-up value:** LOW — the catalog is correct and dual-verified by two
   independent methods with green build/tests/lint; the only residue is upgrading
   the −a2 citation to a primary source and a deferred naming decision.
