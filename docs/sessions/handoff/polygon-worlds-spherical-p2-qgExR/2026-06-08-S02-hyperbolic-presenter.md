---
kind: handoff
session: 2026-06-08-S02
date: 2026-06-08
title: Polygon Worlds — P3 hyperbolic presenter (Poincaré disk) + n-gon mini-map
branch: claude/polygon-worlds-spherical-p2-qgExR
slug: polygon-worlds-spherical-p2-qgExR
status: completed
build: passed
followup: medium
pr: null
app: PolygonWorlds
---

# Polygon Worlds — P3 hyperbolic presenter (Poincaré disk) + n-gon mini-map

> [!IMPORTANT]
> **All three render phases are now done** (P1 Euclidean, P2 spherical, P3
> hyperbolic). Every closed-surface class — flat, spherical, hyperbolic — is walked
> through the one frozen Cayley–Klein kernel. What's left is **P4 (instruments +
> free edge-word entry)** and **P5 (κ/gluing morph)**, plus the polish noted below.
> Plan: [`docs/polygon-worlds-plan.md`](../../../polygon-worlds-plan.md).

## Summary

This session built the build plan's **P3 (Hyperbolic)** on the same branch as P2.
It added `presenters/hyperbolic.ts`, which walks the χ<0 worlds (genus-2 octagon,
3-cross-cap Dyck surface) at κ=−1 in the **Poincaré disk**: the player is a kernel
`Frame` on the hyperboloid, the scene re-centres on the player each frame, and the
Fuchsian deck tiling from `develop` is projected onto a flat glass disk floor and
flows past as you walk. It generalised the world model away from the square (the
`WorldSpec.edges`/`mode` fields are now optional; n-gon worlds are word-driven), and
added `polygonMap.ts` — the n-gon edge-diagram mini-map the plan called for. Build
green, battery 100/100, the flat/spherical worlds unregressed.

## What changed

- **Hyperbolic presenter** (`9e5f5ff`). `presenters/hyperbolic.ts`. Player =
  kernel `Frame` at κ=−1; view isometry `T = frame⁻¹` re-centres the player at the
  disk origin (facing +X). `project()` maps a cover point hyperboloid → Poincaré
  `(x,y)/(1+w)` → floor `(·)·DISK_R`. Tiles = `develop(real).elements`; their
  geodesic edges are sampled once in cover coords and re-projected each frame into a
  single `LineSegments`. A 16-cell decor pool is assigned to the nearest tiles each
  frame and scaled by the conformal factor **(1−r²)** (correct fixed hyperbolic
  size); per-tile **trees↔columns from `det(γ)<0`**. Footprints kept in cover
  coords and re-projected (re-centring makes baked world positions impossible).
- **Word-driven world model** (`9e5f5ff`). `worldSpec.ts`: `Cover` gains
  `'hyperbolic'`; `deriveGeometry` returns `negative`/`hyperbolic` for χ<0;
  `WorldSpec.edges`/`mode` are optional; `id` adds `genus2`/`crosscap3`; the two
  hyperbolic worlds join `WORLDS`. `coverModel.ts`: `kind` gains `'hyperbolic'`.
  Facade selects the third presenter.
- **N-gon mini-map** (`9e5f5ff`). `polygonMap.ts` draws the regular 2n-gon from the
  word (per-generator colours, direction arrows, the Poincaré-disk player marker).
  The host (`PolygonWorlds.tsx`) renders the square map when the world has `edges`,
  else the polygon map; the `Disk scale` slider replaces `Square size` for
  hyperbolic. Explainer gains a hyperbolic section + table rows.

## Key files

| File | Role |
|---|---|
| [`presenters/hyperbolic.ts`](https://github.com/piyarsquare/animath/blob/9e5f5ff/src/animations/PolygonWorlds/presenters/hyperbolic.ts) | P3: Poincaré-disk hyperbolic walk (re-centred frame, Fuchsian tiles, conformal decor). |
| [`polygonMap.ts`](https://github.com/piyarsquare/animath/blob/9e5f5ff/src/animations/PolygonWorlds/polygonMap.ts) | n-gon edge-diagram mini-map (word-driven). |
| [`worldSpec.ts`](https://github.com/piyarsquare/animath/blob/9e5f5ff/src/animations/PolygonWorlds/worldSpec.ts) | World catalog + `deriveGeometry`; now covers all three κ signs. |
| [`fundamentalSquareEngine.ts`](https://github.com/piyarsquare/animath/blob/9e5f5ff/src/animations/PolygonWorlds/fundamentalSquareEngine.ts) | Facade: euclidean / spherical / hyperbolic presenter by χ. |
| [`presenters/spherical.ts`](https://github.com/piyarsquare/animath/blob/9e5f5ff/src/animations/PolygonWorlds/presenters/spherical.ts) | P2 (reference for the kernel-`Frame` seam P3 reuses). |
| [`scripts/shoot-pw.mjs`](https://github.com/piyarsquare/animath/blob/9e5f5ff/scripts/shoot-pw.mjs) | Per-world screenshot driver (`genus2`, `crosscap3`, …). |

## Open / not done

1. **P4 — instruments + free edge-word entry.** Each instrument is an interactive
   form of a battery assertion (geodesic-return holonomy, triangle angle-sum, circle
   circumference, parallel-transport compass, hall-of-mirrors). Free edge-word entry
   now has a real payoff: the engine already realises *any* word, so a text field +
   live χ/curvature readout would let users build arbitrary surfaces. The presenter
   dispatch keys off `deriveGeometry`, so a custom word routes itself.
2. **P5 — κ/gluing morph** (stretch).
3. **Polish** (see the S02 progress "Status & follow-ups"): near-camera decor can
   look large; tiling lines are 1px (WebGL clamp); the non-orientable mirror
   *continuity* across a glide edge is carried by the tiles, not the avatar.
4. **More embedding insets** (Klein figure-8, genus-2) per plan §4.
5. **Sphere mini-map chart mismatch** (carried from P2): the sphere marker uses the
   hemisphere chart while its decor uses whole-sphere lon/lat.

## Context

- **Kernel still frozen + untouched.** P3 only consumes it; `npm run verify` stays
  100/100. The player-as-`Frame` seam (introduced in P2) is reused verbatim at κ=−1.
- **Why re-centring.** The hyperbolic plane has no faithful flat embedding and the
  Poincaré boundary is at infinity; keeping the player at the disk origin (apply
  `frame⁻¹`) is the only way to walk indefinitely without the player shrinking into
  the boundary. Consequence: footprints/edges must be stored in cover coords and
  re-projected each frame, not baked.
- **Budget.** `develop` gives 137 tiles (genus-2) / 307 (3-cross-cap) within the
  `fuchsian` horizon — a few ms; the per-frame work is ~15–26k cheap mat·vec
  projections. Fine on desktop; the maxTiles cap is the phone backstop.
- **Verification:** `npm run build` (CI), `npm run verify` (battery), `npm run
  preview` + `node scripts/shoot-pw.mjs <world> out.png`. Walked screenshots
  confirmed the tiling flows and the trail/marker track.
- **Branch:** still stacked on the P1/P2 foundation (`claude/polygon-worlds-geometry-oe2iM`
  / PR #190); a PR from here carries P1+P2+P3.

## Self-reflection

**What I'd do with another session.** P4: wire the first instruments (geodesic-return
holonomy and triangle angle-sum read straight off the kernel — they're already
battery assertions) and add the free edge-word text field, which the realize/develop
pipeline already supports end-to-end. Then polish the hyperbolic decor (near-camera
keep-out, thicker tiling lines).

**What I'd change about what I produced.** The hyperbolic decor placement reuses a
simple polar (u,v)→polygon chart and a fixed pool; it's recognisable but the
near-camera landmarks can look oversized in third person. A keep-out radius and a
slightly gentler near-scale would make it feel intentional. The 1px tiling lines
under-sell the iconic {8,8} tiling.

**What I was not asked that matters.** Whether the non-orientable hyperbolic worlds
should flip the *player's own* orientation across a glide edge (the avatar/trail),
not just the surrounding tiles. The current build shows the flip in the tiles
(`det<0` skin + reversed numbers) but the re-centred player frame stays det +1. A
faithful treatment ties into the planned normal-flip move.

**What we both overlooked.** The sphere mini-map chart mismatch from P2 is still
open; and there's now a second mini-map renderer (`polygonMap`) — at some point the
square map could be expressed as the 4-gon special case and the two unified.

**What was difficult.** Choosing the hyperbolic rendering model. A true first-person
hyperbolic projection is a big shader job; the re-centred Poincaré-disk-as-floor
keeps the existing first-person chrome (camera, MovePad, avatar, footprints, glass)
and still reads as a hyperbolic walk, which was the right scope trade.

**What would have made it easier.** The frozen kernel + the P2 presenter as a
template made the math trivial; most of the effort was the world-model generalisation
(square → n-gon) and the new mini-map, which the plan had already flagged.

**Follow-up value: MEDIUM** — the three render phases are complete and correct, but
P4 (instruments + free word entry) is where this becomes a teaching tool, and the
hyperbolic view has clear polish items.
