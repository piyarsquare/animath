---
kind: progress
session: 2026-06-08-S02
date: 2026-06-08
title: Polygon Worlds P3 — hyperbolic presenter (Poincaré disk)
branch: claude/polygon-worlds-spherical-p2-qgExR
slug: polygon-worlds-spherical-p2-qgExR
status: completed
build: passed
followup: medium
pr: null
app: PolygonWorlds
---

# Polygon Worlds P3 — hyperbolic presenter (Poincaré disk)

## Session purpose

Continue the roadmap to **P3 (Hyperbolic)**: a Poincaré-disk presenter that renders
the χ<0 worlds (genus-2 octagon, 3-cross-cap) from the kernel via Fuchsian
`develop`, on the same `CoverModel` seam P1/P2 use; generalise the mini-map to the
n-gon edge diagram; keep build + 100-check battery green.

## Previous session

[S01 P2 spherical presenter](2026-06-08-S01-spherical-presenter.md) — ℝP² + sphere
ported onto the kernel, `sphericalCover` retired, ℝP² embedding inset shipped. P2
complete.

## Status & follow-ups

P3 ships a working hyperbolic first-person walk for genus-2 and the 3-cross-cap,
the n-gon mini-map, and the word-driven world model. Rough edges to revisit:

- **Decor near the camera** can look large in third person (you stand among the
  home-tile landmarks); a small keep-out radius or gentler near-scaling would
  polish it. Functional, not blocking.
- **1px tiling lines.** `LineBasicMaterial` width is clamped to 1px in WebGL, so
  the tiling is faint; tube/quad strips would make it pop (P4 polish).
- **Non-orientable mirror crossing.** The per-tile skin is correct (`det(γ)<0`),
  but the player frame itself never flips (det +1), so the "you turned into your
  mirror image" continuity across a glide edge is shown by the tiles, not the
  avatar. Worth a dedicated pass with the normal-flip work.
- **P4/P5** unchanged: instruments (each a battery assertion), free edge-word
  entry, κ/gluing morph; more embedding insets (Klein figure-8, genus-2).

## Working notes

<!-- Newest entry first. -->

### 🟡 milestone · 16:45 — P3 shipped: hyperbolic presenter + n-gon mini-map
**Why:** complete the three-phase render port — the χ<0 worlds were the last
geometry class still unbuilt.

`presenters/hyperbolic.ts` renders genus-2 + 3-cross-cap at κ=−1 in the **Poincaré
disk**. Player = kernel `Frame` on the hyperboloid; the scene **re-centres** on the
player each frame (`T = frame⁻¹`), every cover point mapped hyperboloid → Poincaré
`(x,y)/(1+w)` → a flat glass **disk floor**, so the Fuchsian tiling (from
`develop`) flows past a centred player facing +X. Geodesic polygon edges draw the
tiling to the horizon (boundary = ∞); a 16-cell decor pool tracks the nearest tiles
and scales by **(1−r²)** so landmarks shrink with hyperbolic distance; per-tile
**trees↔columns skin from `det(γ)<0`** (the Dyck surface shows mirror-reversed
numbers on glide tiles); footprints stored in cover coords, re-projected each frame.

Generalised the world model: `Cover` gains `'hyperbolic'`; `deriveGeometry` handles
χ<0; `WorldSpec.edges`/`mode` are now optional (n-gon worlds are word-driven); two
hyperbolic worlds added. New `polygonMap.ts` draws the n-gon edge diagram (regular
2n-gon from the word, per-generator colours + direction arrows, Poincaré marker);
the host chooses square vs n-gon map by whether the world carries `edges`. Walked
screenshots confirm the tiling flows, the trail lays down, and the mini-map marker
advances — stable, no drift. Build green; verify 100/100; flat/spherical worlds
unregressed. Committed `9e5f5ff`, pushed.

### 🔵 finding · 16:00 — Probed the kernel for the hyperbolic worlds
**Why:** ground the Poincaré presenter in `realize`/`develop`'s actual output and
confirm the tile budget before building.

`realize(parseWord(...))` at κ=−1 (isometric, `fuchsian` policy):
- **genus-2 `a b a⁻¹ b⁻¹ c d c⁻¹ d⁻¹`:** V=1, circumradius 2.449, 4 deck generators
  (all det +1, orientable). `develop` → **137 tiles in ~14ms**, max centre distance
  6.34, nearest neighbour 3.06 — within the `fuchsian` budget (h 6.5 / 800).
- **3-cross-cap `a a b b c c` (Dyck):** V=1, circumradius 1.763, 3 deck generators
  (all det −1, glides). `develop` → 307 tiles in ~10ms.

So the kernel is ready; P3 is a pure presenter + world-catalog + mini-map job.
</content>
