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

### 🔴 blocker → 🟢 code · 22:30 — glide crossing was not smooth; fold over-reflected
**Why:** user report: "transport across the Klein boundary is not smooth", and
"the numbers come back reversed is part of the problem".

Two errors from the previous round, both fixed:

1. **The fold double-applied the reflection.** Toggling `flipAcc` re-renders
   every cell with its flip toggled, and for the alternating glide pattern
   (…,A,B,A,B,…) that global toggle IS the scene shifted by one glide step — so
   the matching player fold is the PURE translation (the original code).
   Reflecting the player's position/heading on top of that applied the glide's
   mirror twice ⇒ a visible teleport to the mirrored z at each crossing. The
   fold is reverted to pure translation + parity toggle; the glide's reflection
   lives only in the flipped cells' transform and the pull-backs through it —
   the chart (where the classic 1−v re-entry shows; the old `sz0` "hack" was
   actually correct chart math, now restored generalized) and the ink stamps.
   Verified by pixel-diffing consecutive frames across a crossing: the crossing
   pair (22.5 mean diff) sits inside the ordinary walking-pair range (6.9–28.5).

2. **Bottom-face decor was authored with a baked `scale.y = −1` mirror** (a
   cheap "grow down"). Under the old sheet flip the two mirrors cancelled; under
   the rigid transparency-flip the baked mirror SHOWED — mirror-written plaques
   on the face you walk. Bottom decor is now turned over rigidly (π about the
   glide axis); rigid + rigid composes to a translation, so on a flipped cell
   the columns and Roman plates come up reading exactly upright. The rule is
   now uniform for decor and ink alike: backwards text only ever appears
   THROUGH the glass.

### 🟢 code · 21:45 — feedback round: true glide deck; pinned head arrow removed
**Why:** user feedback on the Klein walk: (1) "there is always an arrow on my
feet" — the live head stamp; (2) the under-floor arrows were NOT reversed.

(1) The live head stamp is gone in all three presenters — prints now only
freeze every ~1.6 walked units (the freshest print is the heading cue).
(2) was the real find: the euclidean glide cell rendered as `scaleY(−1)`,
which swaps the sheet's faces but **silently drops the glide's in-plane
reflection** (the kernel's det<0 generator has it; the presenter discarded
it) — so under-floor images kept their in-plane orientation and the fold
contradicted the minimap's own gluing arrows (`chart()` even faked the mirror
map-side). The flipped cell transform is now the **π-rotation about the glide
axis** — flipping the transparency over: face swap + genuine in-plane mirror
in one *proper* rotation. The fold applies the genuine inverse glide
(translate + reflect: the classic square-diagram re-entry, exit at v return
at 1−v, now actually happens; the chart() hack is removed), the heading and
camera reflect with `flipAcc` so controls feel identical on both faces, and
stamps pull back through the full transform (bottom-face ink is mirror-handed
in sheet coords). Side effect, intended: corner plaques on flipped cells now
genuinely mirror — matching the hyperbolic mirror tiles. Verified: strict
chirality test passes all four worlds; the Klein walk screenshot shows the
under-glass reversed F.

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

### 🟢 code · 23:20 — hyperbolic trail made canonical; serif Roman numerals
**Why:** user report: paths disappear/reappear incorrectly in the χ<0 worlds;
plus a request for serifed Roman numerals.

Root cause of the vanishing trail: hyperbolic stamps were stored in
player-relative cover coordinates and Dinv-carried through every fold, so old
stamps' representatives receded unboundedly (coordinates grow like
cosh(distance)) — and since images are only drawn through the ~16 near-identity
tile transforms, a receded stamp's quotient images became unreachable: the
trail silently vanished even where the quotient path re-entered the player's
neighbourhood (borderline tiles swapping in/out of the nearest-16 produced the
re-appearing). Fix: stamps are now pulled back into the FUNDAMENTAL DOMAIN
through h⁻¹ at lay time (mirror-handed when det(h)<0) — the exact recipe the
flat presenter uses for sheet coordinates. Canonical representatives never
leave the domain, every visible tile draws the whole quotient trail, folds no
longer touch the ink, and the coordinates stay bounded. Verified: long
crosscap3 walk keeps the full trail visible across tiles; chirality suite
still passes all four worlds.

Roman corner numerals now set in Georgia/Times (serif) — the serifs separate
the strokes so I/II/III read at a glance.
