---
kind: progress
session: 2026-06-09-S05
date: 2026-06-09
title: Polygon Worlds — footsteps + markers two-sided-sheet polish
branch: claude/polygon-worlds-spherical-p2-qgExR
slug: polygon-worlds-spherical-p2-qgExR
status: in-progress
build: unknown
followup: null
pr: null
app: PolygonWorlds
---

# Polygon Worlds — footsteps + markers two-sided-sheet polish

## Session purpose

Finish ironing out the "two sides" of the fundamental polygon: resolve the
outstanding problems with the **footsteps** and the **markers** (exact list to be
enumerated by the user), cross-checked against the S04 handoff's "Open / not done"
section.

## Previous session

S04 ("the setting") completed the decor/towers/lighting/glass/zoom/trail work; build
green, verify 100/100, kernel FROZEN. Pending: two-sided-sheet polish on footsteps
(absolute-vs-relative mirror; visibility through glass) and markers (sphere
pole-clumping; tower labelling; badge legibility). See
[2026-06-09-S04-the-setting handoff](../../handoff/polygon-worlds-spherical-p2-qgExR/2026-06-09-S04-the-setting.md).

## Working notes

### 🟢 code · 01:55 — Unified glass spec + clear-but-present default opacity
**Why:** the opacity slider felt different per world (euclidean/spherical used
`{showUnderBelow:0.8, solidAt:0.82}`, hyperbolic `{showUnderBelow:0.95}`) and every
world started fully solid (`useState(1)`), so you couldn't see the floor was glass.

- Added a single shared `POLYGON_GLASS = { showUnderBelow: 0.9, solidAt: 0.95 }` in
  `glassSurface.ts`; all three presenters now import it instead of carrying their own
  `const GLASS`. The slider now behaves identically in every world.
- Lowered the host default `floorOpacity` from `1` → `0.45` (clear-but-present), and
  aligned each presenter's internal initial to `0.45` (was 0.85 / 0.85 / 1) to avoid a
  one-frame opaque flash before the host re-pushes on mount.
- Eyeballed torus / sphere / genus2: torus shows the underside columns through the
  floor; genus2's glass disk shows the look-through; sphere reads via its bright grid
  (the dark fill is the see-through — its faintness is the carried big-shell lighting
  issue, not opacity). Build green, verify 100/100.

### 🟣 decision · 01:40 — Switched onto the polygon-worlds branch; oriented
**Why:** the fresh clone was checked out on the harness-default branch
`claude/nice-allen-mafdfy`, which has no Polygon Worlds work. The task explicitly
targets `claude/polygon-worlds-spherical-p2-qgExR`.

Fetched and checked out `claude/polygon-worlds-spherical-p2-qgExR` from origin (it
existed remotely but not locally). Read the S04 handoff in full — camera/tiling per
world, decor styling, and the open footstep/marker issue list. Waiting on the user's
exact issue list before touching code.
