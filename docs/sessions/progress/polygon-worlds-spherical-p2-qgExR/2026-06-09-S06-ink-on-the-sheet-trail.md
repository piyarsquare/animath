---
kind: progress
session: 2026-06-09-S06
date: 2026-06-09
title: Polygon Worlds — the trail rebuilt as "ink on the sheet"
branch: claude/polygon-worlds-spherical-p2-qgExR
slug: polygon-worlds-spherical-p2-qgExR
status: completed
build: passed
followup: null
pr: null
app: PolygonWorlds
---

# Polygon Worlds — the trail rebuilt as "ink on the sheet"

## Session purpose

Redesign the path / direction-arrow from first principles, per the S05 reset:
answer the desired-outcomes questionnaire first, get sign-off on a design, then
implement ONE coherent mechanism. The old `footprints.ts` + per-presenter
`trail`/`covTrail` code was not to be reused.

## Previous session

[S05 handoff](../../handoff/polygon-worlds-spherical-p2-qgExR/2026-06-09-S05-trail-and-path-reset.md)
— the footprint trail was scrapped: it conflated a breadcrumb path, a live
heading arrow, and a non-orientability cue into one chiral glyph with per-print
mirror flags.

## The questionnaire answers (the design contract)

1. **Purpose:** path history + live heading + orientation cue — all three, but
   separated mechanically.
2. **Confinement:** the trail **tiles across the visible neighbour cells**
   (periodic copies, seamless).
3. **Edge crossing:** seamless.
4. **Non-orientability cue:** *"the trail is visible through the floor in
   reverse orientation. we do not 'return mirror reversed.' we are on the other
   side of the sheet."* — the load-bearing reframe.
5. **Arrow form:** footprint trail.
6. **Consistency:** identical mechanism strongly preferred.
7. **Camera:** both first- and third-person.
8. **Glyph:** no opinion (kept the chiral F + cyan/magenta).
9. **Correct =** seeing the whole trail as one continuous followable path; old
   prints on the far side of the polygon read in reverse orientation; upside-down
   footprints visible through the floor on a non-orientable return.

## The approved design

**One mechanism: ink on the sheet** (`inkTrail.ts`). The trail is stored ONCE,
in the world's canonical coordinates, with **no mirror flags and no per-side
rebuilds**. Every appearance — neighbour-cell copies, the ℝP² antipodal twin,
the reversed read through the glass — comes from rendering that one buffer
through the *same genuine transforms that place the decor*. A det<0 transform
really mirrors what it maps, so "old ink reads backwards from the other side"
is geometry, not a flag. A quad is written from an explicit frame
(pos, fwd, left, normal); the frame's *handedness* is the print's chirality, and
its vector lengths set the decal size (hyperbolic copies shrink conformally).

The three jobs, separated: **history** = the frozen stamps; **live heading** =
the newest stamp is live (rewritten under the player every frame, slightly
larger, freezes into history each ~1.6 walked units); **orientation cue** = pure
geometry, exactly the user's "other side of the sheet" framing.

Per world (same mechanism, different cover — the boundary `coverModel.ts`
already declares):

- **Euclidean** — stamps pulled back through the home cell's current matrix into
  sheet coordinates (in-plane pos + heading + face); every cell draws a mesh
  instance of the shared buffer through its own `translate·scaleY(±1)` matrix.
  Crossing a glide edge changes only which transform the home cell renders
  through — no geometry is ever rebuilt.
- **Spherical/ℝP²** — stamps in world coords on the shell; main mesh + one twin
  instance per det<0 deck element (the S05-approved reference, minus flags).
- **Hyperbolic** — stamps as cover-coordinate frame *triples* (position + a
  geodesic step ahead + one to the player's projected left), folded with the
  player, re-projected each frame through the nearest-N tile transforms
  (`Mtiles·γ`, the decor's own list) — copies in every visible tile; det<0
  images come out mirrored and under-floor automatically.

## Working notes

### 🟡 milestone · 21:10 — verified end to end; old footprint code deleted
**Why:** the build, the strict chirality probe, and the visual Klein walk all pass.

`npm run build` ✓. `scripts/trail-chirality.mjs` (re-scoped): torus/klein/
crosscap3/rp2 all read **cyan@+axis on both faces** — the head print renders
right-handed under the player everywhere. Headless Klein walk across the glide
edge: the pre-crossing prints show **through the glass, dimmed, F reversed,
cyan/magenta swapped**, while the fresh trail reads correct; a neighbour-cell
copy of the trail is visible tiling across the seam. `footprints.ts` deleted.

### 🔵 finding · 20:55 — the Poincaré projection is orientation-REVERSING
**Why:** the first strict-probe run read `cyan@−axis` on crosscap3 — consistent
on both faces, but mirrored under the player.

The kernel frame is (forward +x, **left +y**), and the disk projection maps
cover (x,y) → world (X,Z); under the fixed camera (forward +X, up +Y ⇒
camera-right = +Z) that carries the cover's left onto the screen's right.
Stamping is a world-space act — the stamp must be pulled back through the WHOLE
render transform, projection included — so the hyperbolic "left point" is
recorded at kernel heading **−π/2**. The chirality test was upgraded from
sign-consistency to **requiring the positive sign**: mere consistency would have
masked exactly this class of bug.

### 🟣 decision · 20:30 — design sign-off
**Why:** the questionnaire pinned what is being demonstrated; the user approved
the ink-on-the-sheet mechanism + live head stamp + per-cover renderers.

### 🟣 decision · 20:15 — questionnaire answered
**Why:** the S05 reset required agreeing the desired outcome before any code.
Answers recorded above; the "we are on the other side of the sheet" phrasing is
the design's organizing principle.

## Current state

Build passes; chirality test passes strictly on all four worlds; EXPLAINER
updated to the new framing. The old `footprints.ts` is gone. Unchanged: geometry
kernel, camera, tiling, decor, fold-back. Pre-existing and untouched: the
third-person camera backing into decor / headlamp blow-out (S05's separate bug).
