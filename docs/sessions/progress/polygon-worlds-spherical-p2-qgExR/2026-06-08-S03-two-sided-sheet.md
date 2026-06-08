---
kind: progress
session: 2026-06-08-S03
date: 2026-06-08
title: Strict two-sided sheet for the flat + spherical worlds
branch: claude/polygon-worlds-spherical-p2-qgExR
slug: polygon-worlds-spherical-p2-qgExR
status: in-progress
build: passed
followup: medium
pr: null
app: PolygonWorlds
---

# Strict two-sided sheet for the flat + spherical worlds

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

- **Flat worlds (torus, Klein): solid.** All seven constraints visibly met; the
  Klein sheet-flip reads clearly (blue/trees ↔ brown/columns across the glide edge).
- **Sphere/ℝP²: clean now**, but two things to revisit:
  - The **equirectangular sphere chart is singular at the poles**, so boundary
    markers (the v=0/1 rows) collapse onto the poles — a faithful chart artifact, but
    it clumps trees there. Decide: accept-and-disclose, or distribute by area.
  - The planet reads a little **dark**; consider brightening the outer shell.
- **Footstep "below floor when flipped"** is implemented but only spot-checked
  statically; worth a walked screenshot crossing a glide edge.
- **Hyperbolic** only updated to the new decor API (compiles); its full rework
  (per the user, "we are having some issues with the hyperbolic space") is the next
  task once flat + spherical are signed off.
</content>
