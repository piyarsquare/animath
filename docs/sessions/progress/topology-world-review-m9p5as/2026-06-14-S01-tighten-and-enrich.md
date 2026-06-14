---
kind: progress
session: 2026-06-14-S01
date: 2026-06-14
title: Tighten the app and enrich the visuals
branch: claude/topology-world-review-m9p5as
slug: topology-world-review-m9p5as
status: in-progress
build: unknown
followup: null
pr: null
app: topology-walk
---

# Tighten the app and enrich the visuals

## Session purpose

Topology Walk is the target. This is an exercise in **tightening the
application and providing a richer visual experience**. Begin by reviewing the
current status of the app and any outstanding requests or TODOs, then take
direction from the user.

## Previous session

First tracked session on this branch. The most relevant prior handoff is
[klein-bottle-fix · S01](../../handoff/klein-bottle-fix/2026-06-05-S01-klein-bottle-fix.md)
(status: in-progress, followup: HIGH) — it grew the app into a multi-family
closed-surface walker but shipped its chirality/handedness logic
**logically complete, visually unverified** because no headless WebGL existed
at the time.

## Working notes

<!-- Newest entry first. -->

### 🔵 finding · 02:32 — Reviewed current status and outstanding work
**Why:** The session opens with a status review before taking direction.

**What exists (shipped).** Topology Walk (`#/topology-walk`; `#/mobius` and
`#/wrap-world` redirect here) is a first-person closed-surface walker with three
engine families:
- **Corridor** (`corridorEngine.ts`) — twisting (Möbius / double / triple) and
  knotted (trefoil) tubes you walk *through*.
- **Flat** (`flatEngine.ts`) — Euclidean torus + Klein bottle you walk *across*;
  universal-cover tiling, trees↔columns cover skins, glass floor + mirrored
  underside world, square mini-map, F-arrow footprint trail.
- **Spherical** (`sphericalEngine.ts`) — sphere + ℝP² (antipodal), great-circle
  walk, ℝP² inner shell.

Supporting modules since the klein handoff: `otherSide.ts`, `squareMap.ts`,
`glassSurface.ts` — the shared "mirror to the glued other side" + square
mini-map factoring that the klein handoff flagged as the unification debt
appears to have landed.

Shipped in commits #174 (Möbius → surface walker + flat torus/Klein), #186
(legible Klein flip + spherical), #200 (workspace chrome redesign), #212 (debt
pass).

**Outstanding (from `docs/topology-walk-surface-tour.md` §6 roadmap):**
- ⬜ **Normal-flip — "dive through the floor"** (instrument zero): Euler
  somersault to the opposite face, eased roll. Prereq for orientation
  experiments.
- ⬜ **Euler's instruments**: intrinsic probes (straight-line return,
  mirror-reversed trail, triangle angle-sum, circle radius↔circumference,
  compass holonomy, hall-of-mirrors). Suggested start: hall-of-mirrors (nearly
  free in the flat engine).
- ⬜ **Embedding inset**: cross-cap → Roman → Boy's surface with player position
  dotted — "the headline compare-the-three."
- ⬜ **Hexagonal flat torus** (quick win).
- ⬜ **Hyperbolic engine**: genus-2 octagon walk in ℍ² (the hard finale).

**Open questions (roadmap §7):** embedding-inset rendering (2D canvas vs WebGL
scissor viewport); hyperbolic projection (Poincaré vs Beltrami–Klein); how far
to push the classification.

> [!IMPORTANT]
> **Headless WebGL is now available.** The session-start hook installed a
> headless GL runtime (`node scripts/shoot.mjs '#/topology-walk' shot.png`).
> This directly unblocks the **HIGH-priority visual-verification debt** from the
> klein-bottle-fix handoff — the walk feel, the trees↔columns flip across the
> red edge, the underside reading at 35%, and the ℝP²/antipodal trail reversal
> were all shipped on hand-traced confidence and have never been seen rendered.

### 🟣 decision · 02:31 — Session focus: tighten + enrich visuals
**Why:** User set the target (Topology World) and the goal (tightening +
richer visual experience), then said to continue.
