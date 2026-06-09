---
kind: progress
session: 2026-06-08-S03
date: 2026-06-08
title: Strict two-sided sheet for the flat + spherical worlds
branch: claude/polygon-worlds-spherical-p2-qgExR
slug: polygon-worlds-spherical-p2-qgExR
status: completed
build: passed
followup: medium
pr: null
app: PolygonWorlds
---

# Strict two-sided sheet for the flat + spherical worlds

> [!NOTE]
> **Decisions evolved during the session** (see the newest working notes): the user
> later **dropped the per-side tile colour** (trees vs columns + warm/cool light now
> carry the side), **removed on-edge boundary markers** (they read as confused
> half-tree/half-column at a gluing edge — kept off the edge instead), made the floor
> **opaque by default** (no show-through while walking), and the hyperbolic worlds
> were fixed to **keep the player in the fundamental domain** (no walk-off; glide
> crossings flip you to the other side). The "seven constraints" list below records
> the original asks; the working notes record where each landed.

## Session purpose

Before returning to the hyperbolic issues, make the **flat and spherical** worlds
render correctly under seven strict constraints the user issued about the plane and
the arrangement of objects, and prove we can hold to them.

## The seven constraints + how each is met

1. **Different colour top vs bottom tile (blue/brown).** The sheet is two-tone: in
   the flat world a per-cell glass slab with **top = blue, bottom = brown**; on the
   sphere a **blue outer / brown inner** shell.
2. **Precise symmetric placement, stated rule.** *Each landmark i has fixed
   fundamental-domain coordinates (uᵢ, vᵢ). It appears as **tree i** on the top
   (blue) face and **column i** on the bottom (brown) face at the identical (uᵢ, vᵢ),
   each grown away from the sheet.* A non-orientable gluing **flips the whole sheet**
   (`scale.y = −1` per flipped cell; the antipodal Z/2 deck on ℝP²), so the
   trees↔columns swap is a literal sheet flip — verified on the Klein bottle (blue
   cells with trees, brown flipped cells with the columns standing up).
3. **Markers throughout + on the boundary.** `generateProps` now emits three kinds:
   **interior** (count + layout), **boundary** (4 corners + 4 edge midpoints, so you
   watch them glue), and **center**.
4. **Special centre beacon, top/bottom distinguishable.** A distinct spire at
   (0.5, 0.5): **gold + orb on top, magenta + cube on bottom**.
5. **No penetration.** Trees grow outward, columns grow inward, separated by the
   sheet thickness; the sphere inner shell sits at a clear radial gap — fixing the
   old "columns inside trees" overlap.
6. **Footsteps on the other side read as below the floor.** In the flat world the
   trail is laid below the slab (with a downward normal) whenever the player is on a
   flipped (mirror) cell.
7. **Camera distance control.** New "Camera distance" slider, plumbed through
   `setCameraDistance` on the engine/cover interfaces.

## Working notes

<!-- Newest entry first. -->

### 🟡 milestone · 19:30 — Hyperbolic: player kept in the fundamental domain, flips sides on glide crossings
**Why:** the user reported the 3-cross-cap "moves the player incorrectly" — walking
ran off the developed tiling, and crossing a glide edge never flipped you to the
other side (columns never became trees), only teleporting you back on the same side.

Reworked `presenters/hyperbolic.ts` to mirror the euclidean cover (commit `585ea61`).
The player frame is only moved by `stepForward`/`turn`/`stepHeading`, so it stays
**orientation-preserving — controls never invert**. A separate deck element **`h`**
tracks the player's tile (greedy walk on the deck Cayley graph toward them); tiles
render through **`Mtiles = frame⁻¹·h`**, so the developed tiles always surround the
player (no walk-off). Crossing a glide makes **`det(h) < 0`**, which flips the skin
of *every* tile (`det(h)·det(tile) < 0`) and mirror-reverses the decals — you
genuinely flip to the other side — while your frame stays put. Trail renders through
`frame⁻¹`; the mini-map representative is `h⁻¹·player` with the side from `det(h)`.
Added clear spawn (no starting on the centre beacon), camera-distance control, and
an opaque hyperbolic floor. Verified by walking far (stays surrounded) on genus-2 +
3-cross-cap. Build green; verify 100/100.

> [!CAUTION]
> **Earlier `reduceToHome` attempt was wrong and was lost in a git reset.** Reducing
> the *player frame* through a glide (det<0) element reflects the frame → inverts the
> controls and snaps the view. The correct design reduces a *separate* tracker `h`,
> never the player frame. (During this fix the local branch had drifted off the
> pushed history; recovered by `git reset --hard origin/...` — which held all the
> flat/spherical work — then re-applying only `hyperbolic.ts`. Branch is linear again.)

### 🟣 decision · 19:00 — Drop the per-side tile colour
**Why:** user: "get rid of the tile colour. We have trees and columns." The two-tone
floor (and its show-through) caused more trouble than it solved.

Both faces of the sheet are now **one neutral colour** in the flat and spherical
worlds (`542a344`). The two sides are told apart by **trees vs columns** (and the
warm-above / cool-below lighting), not floor colour. `euclidean` uses a single floor
material; `spherical` a single neutral double-sided shell. Melding trees+columns into
one cue is explicitly left for later.

### 🟢 code · 18:30 — Opaque floor (no show-through), warm/cool lighting, markers off the edges
**Why:** user — the floor colour "should not show through when walking on the other
side"; and on-edge markers read as "confused" half-tree/half-column objects.

(`99d1161`) The glass floor goes **fully opaque at the default opacity** (the side you
walk never shows through; the Glass slider can still be lowered to peek at the
underside). Added **two-tone lighting** — a **warm** directional light from above and
a **cool** one from below — so the side you're on reads warm and the underside cool
(the user's own suggestion). Landmarks are kept **off the domain edges** (removed the
on-edge boundary markers; interior markers stay clear of the boundary).

### 🟢 code · 17:40 — Two-sided sheet shipped for flat + spherical; clear spawn fixes the "giant tree"
**Why:** the user's seven constraints + the regression they implied.

Reworked `decor.ts` to expose `makeTop`/`makeBottom` and a 3-kind landmark set
(interior / boundary / center) with a distinct centre beacon. `euclidean.ts` now
builds **per-cell two-tone glass slabs** (top blue / bottom brown) with the literal
**sheet flip** for non-orientable cells; `spherical.ts` uses a **blue-outer /
brown-inner shell** with back-to-back markers (column inner shell at a clear gap →
no penetration). Added the **camera-distance** control and **side-aware footprints**
(below the floor on the flipped side). Build green; verify 100/100.

> [!IMPORTANT]
> **Default floor opacity raised to 0.85.** At the old 0.35 the transparent blue top
> didn't occlude, so the brown underside bled through from above and read as a muddy
> tan plane. Now the top reads as a solid blue floor; lowering the Glass slider
> reveals the brown underside + columns + below-floor footprints.

### 🔵 finding · 17:20 — The "tan ramp" was a tree at the spawn point (not a render bug)
**Why:** a large tan plane filled the lower-right of every flat-world third-person
shot; root-causing it consumed most of the session.

Bisected it out: not the slab faces (recolouring them red/green/blue left the plane
tan), not the character (hiding it left the plane), not the bottom decor — it
vanished only when the **top decor** was hidden. It was a **tree's foliage cone
planted exactly where the player spawns**, looming over the third-person camera —
the same root cause as the sphere/ℝP² "giant tree": a landmark sitting on the spawn
point (ℝP²'s centre beacon is at the hemisphere pole = the identity start).

**Fix:** both presenters now **spawn the player at the (u,v) farthest from every
landmark**, so it never starts inside a tree or on the beacon.

## Status & open items

All three world classes now render and walk correctly with the revised "setting":
one neutral floor, trees-vs-columns as the side cue, warm/cool lighting, opaque
floor by default, markers off the edges, clear spawns, camera-distance control.

- **Flat (torus, Klein): solid** — the Klein sheet-flip reads clearly (trees ↔
  columns standing up across the glide edge) on one neutral floor.
- **Spherical (sphere, ℝP²): clean** — neutral two-sided shell, back-to-back markers
  (no penetration), clear spawn. *Still open:* the equirectangular **sphere chart is
  singular at the poles**, so v=0/1 markers clump there (a faithful chart artifact —
  decide accept-and-disclose vs distribute-by-area); the planet reads a little dark.
- **Hyperbolic (genus-2, 3-cross-cap): fixed** — player kept in the fundamental
  domain (no walk-off), glide crossings flip you to the other side, controls intact.
- **Footstep "below floor when flipped"** (flat) is implemented but only spot-checked
  statically.
- **Next session: the "setting"** — trees/columns design, landmarks + labels, floor
  opacity, and additional light sources. See the S03 handoff.
