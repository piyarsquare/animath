---
kind: progress
session: 2026-06-08-S04
date: 2026-06-08
title: Polygon Worlds — the "setting" (decor, labels, floor, lighting)
branch: claude/polygon-worlds-spherical-p2-qgExR
slug: polygon-worlds-spherical-p2-qgExR
status: completed
build: passed
followup: medium
pr: null
app: PolygonWorlds
---

# Polygon Worlds — the "setting"

## Session purpose

Make the scene legible and attractive now that the mechanics are done. Four
fronts: (1) redesign the crude tree/column meshes into two unmistakably distinct,
attractive kinds; (2) make the chiral number+arrow decal read clearly at distance
on both tree and column; (3) reconsider floor opacity default + the glass reveal;
(4) add fill/hemisphere lighting and per-world tuning (the sphere reads dark).

## Previous session

S03 ([handoff](../../handoff/polygon-worlds-spherical-p2-qgExR/2026-06-08-S03-two-sided-sheet.md)):
reworked the two-sided sheet model + fixed the hyperbolic fundamental-domain
walk. Mechanics correct across all three world classes; "the setting" is the
remaining, unstarted work. Build green, verify 100/100.

## Settled decisions (do not undo)

- One neutral floor colour; trees/columns carry the side, not colour.
- Markers OFF the gluing edges.
- Player frame stays orientation-preserving in hyperbolic (flip lives in `h` /
  det(h)) — never reduce it through a glide.
- Cayley–Klein kernel is FROZEN — keep `npm run verify` green.
- All decor materials stay `DoubleSide` (euclidean flip scales a cell by y=−1).

## Working notes

<!-- Newest entry first. -->

### 🟢 code · 09:35 — Footprints: on the character's side, mirrored in place on the flip face
**Why:** Correction to the previous entry — "same side as the character" meant the
same **side of the surface** (which face), not just the rendered top. A print laid
while on the mirror face must read mirror-reversed (like that face's decals), but
still stay with the character (not drop below the glass, not stay upright).

- **footprints.ts**: `append(pos, forward, up, mirror?)` — the new `mirror` flag
  negates the left/handedness in place (reverses the chiral F + cyan/magenta swap)
  WITHOUT moving the print off the `up` side. (Previously the only way to reverse a
  print was to flip its `up` normal, which also pushed it below the floor.)
- **hyperbolic.ts**: store each trail point's lay-time side (`det(h) < 0`); the trail
  is always appended on top (`UP`) with `mirror = that side`. Verified in crosscap3:
  the fresh print at the feet is on top with the character but the F is reversed and
  the colours swapped (you are on the mirror face).
- **euclidean.ts**: print on top (`y=0`, `UP`) with `mirror = playerFlipped` on a
  mirrored cell. Confirmed upright on a normal cell; same `append` mechanism as the
  verified hyperbolic path on a flipped one.
- spherical unchanged (the ℝP² antipodal twin already mirrors via its matrix).

Build green; verify 100/100 (kernel untouched).

### 🟢 code · 09:05 — Trail always stays on the character's side
**Why:** User: new trail points should always appear on the same side as the
character. My earlier change dropped flipped-side footprints BELOW the glass, away
from the character (who is always rendered on top), so they vanished under the solid
floor while you walked.

- **hyperbolic.ts**: reverted the per-point side tag; the trail is always appended
  with the `UP` normal (the player frame never flips, so the character is always on
  top — the trail rides with it). Verified in crosscap3: after crossing a glide the
  footprint at your feet is an upright F on top of the disk, while the glass
  look-through still shows the mirrored decor/towers below.
- **euclidean.ts**: same fix — footprints were laid at `y=−thickness` (below) on a
  mirrored cell, where the default *solid* floor hid them entirely; now always laid
  on top (`y=0`, `UP`) with the character. Removed the now-unused `DOWN`/`playerFlipped`.
- **spherical.ts** already lays the trail on the walked shell (the character's side);
  its ℝP² antipodal twin is a reflected identification copy, left as-is.

Build green; verify 100/100 (kernel untouched).

### 🟢 code · 22:20 — Vertex towers (inset n-gon) on both faces, every world
**Why:** User wants a tall "tower" just inside every polygon vertex, on both faces,
with the same tree/column split — i.e. inscribe a slightly smaller n-gon and put a
special marker at each of its vertices.

- **decor.ts**: new `makeTowerTop()` (a tall evergreen tree-tower) / `makeTowerBottom()`
  (a tall stone obelisk-tower), both gold-finialed to read as "special". Index-free
  (every vertex tower is identical); keeps the tree↔column split through the flip.
- Placement is per-cover in each presenter's native coordinate (the `(u,v)` chart
  can't reach the hyperbolic 2n-gon vertices, so there's no single shared layout):
  - **euclidean** (square 4-gon): towers at the 4 cell corners inset by 0.82; ride
    the per-cell `scale.y=−1` flip; added to the spawn-avoidance set.
  - **spherical** (square chart): towers at the 4 inset chart corners via `dirFor`,
    outer/inner like the markers, with the antipodal twin for ℝP².
  - **hyperbolic** (2n-gon): towers at `real.vertices` pulled 0.85 toward centre
    (`geodInterp(ORIGIN, V, …)`), one per tile, with the same above/below + glass +
    `det(h)` flip logic and conformal `(1−r²)` scale as the markers.
- Verified headless: genus-2 shows tall tree-towers with gold finials at the octagon
  vertices; rp2 a tree-tower at the seam + its mirrored column-tower; flat torus the
  four corner towers among the regular trees. Build green; verify 100/100.

### 🟢 code · 21:48 — Hyperbolic trail writes to the other side of the glass
**Why:** User: the footprint trail wasn't dropping to the far side of the glass on
the flipped side in hyperbolic (it did in flat/spherical).

`hyperbolic.ts` `rebuildTrail` always appended with the `UP` normal, so steps stayed
on top of the disk regardless of side. Now each trail point stores the side it was
laid on (`flipped = det(h) < 0`) when recorded, and `rebuildTrail` appends with
`DOWN` for flipped points — the footprint `append` puts the quad at `LIFT·normal`
(so `DOWN` ⇒ below the floor) and flips the chiral **F** (the `left` basis flips with
the normal). This mirrors the euclidean trail dropping under a mirrored cell.
Verified headless in crosscap3: after walking across a glide the footprint at the
player's feet renders with the reversed **F** below the glass (and the mirrored
look-through decor is visible beneath the floor). Orientable hyperbolic (genus-2)
keeps the trail on top (det(h) stays > 0). Build green; verify 100/100.

### 🟢 code · 21:24 — Hyperbolic glass look-through + wheel/pinch zoom
**Why:** User: the glass "look down at the opposite side of the domain" worked in
flat + spherical but not in negative curvature; and wanted wheel/pinch to move the
camera in/out.

- **Hyperbolic glass (`hyperbolic.ts`).** Each tile only ever drew the side you
  stand on, so lowering the glass revealed nothing. `placeDecor` now treats the two
  per-tile groups as **above** (the side you walk, grows +y) and **below** (the other
  face, the *same* landmark mirrored to −y via `scale.y = −sc`), with the below group
  shown only when the glass clears (`underVisible = glassState(...).showUnder`, set in
  `applyGlass`). Looking down through the cleared floor now shows the opposite side —
  matching flat/spherical. Verified headless: crosscap3 shows the mirrored
  trees/columns + magenta beacon hanging below the floor; flat torus unchanged.
- **Wheel/pinch zoom (`PolygonWorlds.tsx`).** A `zoomBy(factor)` clamps + drives the
  existing `camDistance` (so the slider stays in sync). Wheel = native non-passive
  listener (preventDefault the page scroll); two-finger **pinch** tracked via a
  pointer map (spread = closer, pinch = farther), suppressing look-drag while two
  fingers are down. Verified headless: wheel out 3.2→5.2, wheel in →2.0 (clamped).

Build green; verify still 100/100 (kernel untouched).

### 🟡 milestone · 20:58 — Setting v1 done: build + verify green, all six worlds shot
**Why:** Decor redesign + lighting landed and verified end-to-end.

`npm run build` green; `npm run verify` **100/100** (kernel untouched). Shot all six
worlds (torus klein rp2 sphere genus2 crosscap3) headless. Highlights:
- **Klein bottle** is the money shot: flipped cells now show **stone columns + the
  magenta beacon**, unflipped cells show **green trees + the gold beacon**, and the
  number badges read clearly on both with the **mirror-reversal visible across the
  gluing** — trees↔columns are now unmistakably two kinds (organic vs built).
- **Sphere/ℝP²** are visibly brighter: the warm headlamp pool + hemisphere fill lift
  the near surface that previously read dark.
- **Hyperbolic** (genus2, crosscap3): decor reads at the conformal shrink; trees,
  columns, and the gold beacon all legible toward the player.
- Only console noise is a pre-existing 404 (favicon/resource), no JS errors.

**Floor opacity:** left the default solid (the shots confirm it reads as a proper
floor and the glass slider still reveals the underside) — matches the settled feel.

### 🟢 code · 20:54 — Lighting: hemisphere fill + camera headlamp + per-cover profile
**Why:** Sphere read dark under a single distant key; nearby decor needed lift in
all worlds without flattening the warm-above/cool-below two-sided cue.

`fundamentalSquareEngine.ts`: kept the warm/cool directional key (the side cue),
added a `HemisphereLight` (warm sky / cool ground — same axis, reinforces the cue)
and a warm `PointLight` **headlamp** pinned to the camera each frame (decay 1.4, so
it only lifts the immediate surroundings). A `lightingProfile(cover)` scales fill +
key + lamp per geometry: **spherical** gets the strongest fill + headlamp, hyperbolic
a touch more, euclidean baseline.

### 🟢 code · 20:50 — Decor redesign in decor.ts (trees, columns, badge, beacon)
**Why:** Crude cylinder+cone tree and plain-cylinder column read as the same family
and the 128px decal was faint at distance.

- **Tree** → tapered trunk + **3-tier conical canopy** (green-tinted by the prop
  hue): organic, fuller silhouette.
- **Column** → **plinth + fluted stone shaft (hue-tinted limestone) + capital +
  abacus**: unmistakably architectural. Shape family alone separates the two kinds
  (CVD-robust, per the plan).
- **Badge** → 256px high-contrast rounded **plaque** (dark backing, bright hued rim,
  hue-tinted number + arrow), mounted as a **3-direction outward-facing ring** (every
  120°) at a consistent height on *both* kinds. Every copy faces outward so the glyph
  reads correct from any side when unflipped, and **all mirror together under the
  flip** — the chiral cue stays intact (NOT billboarded, by design).
- **Centre beacon** → stepped pedestal + taller faceted spire + glowing orb/cube
  finial; gold (top) vs magenta (bottom).
- Public API unchanged (`makeTop`/`makeBottom`/`props`/`generateProps`); every decor
  material stays `DoubleSide` (the euclidean flip scales a cell by y=−1).

### 🟣 decision · 20:42 — Orient + scope the setting work
**Why:** Branch `claude/polygon-worlds-spherical-p2-qgExR` was on the remote only;
the local default branch (`sweet-curie`) had none of the work. Checked it out and
read the S03 handoff, the plan's presentation-layer section, and all three
presenters + `decor.ts` + `fundamentalSquareEngine.ts` + `character.ts`.

Key facts that constrain the design:
- `decor.ts` is the single shared source: `makeTop(i)` (tree / gold spire),
  `makeBottom(i)` (column / magenta spire), consumed by all three presenters.
- Scale reference: player ~1.7 tall; current tree ~4.7 tall, column ~3.2,
  centre spire ~5. Decor is 2–3× player height.
- All three presenters call `makeTop`/`makeBottom` per prop and plant them
  back-to-back on the two faces; hyperbolic also scales them by the conformal
  factor (1−r²), so meshes must look right at small scale too.
- Lighting lives in the facade (`fundamentalSquareEngine.ts`): ambient 0.4 +
  warm dir 0.9 (above) + cool dir 0.6 (below). Same for every world.

Planned order: (1) decor mesh redesign in `decor.ts` (trees + columns + decal),
verifying `DoubleSide` everywhere; (2) lighting in the facade + per-world tuning;
(3) floor opacity defaults; build + verify + screenshot each world after each step.
