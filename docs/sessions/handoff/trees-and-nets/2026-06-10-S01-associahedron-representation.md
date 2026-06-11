---
kind: handoff
session: 2026-06-10-S01
date: 2026-06-10
title: Trees and Nets — local fibers explorer (associahedron × cube)
branch: claude/trees-and-nets
slug: trees-and-nets
status: in-progress
build: passing
followup: MEDIUM
pr: 211
app: trees-and-nets
---

# Trees and Nets — local fibers explorer (associahedron × cube)

> [!NOTE]
> App `#/trees-and-nets` (port of the classical core of the private `quantum-tree`).
> On **PR #211** (not merged). `npm run build` passes (`tsc && vite build`, ✓ ~6s
> at `571706a`). Long iterative session — the app was redesigned several times in
> response to feedback; this handoff describes the **current** state.

## Summary

Trees and Nets explores **one (tree, order) point at a time** and the two fibers
through it. A point = a triangulation of an n-gon (≙ an unrooted tree) plus a cyclic
order of its leaves. The two interior-edge moves are **flip** (new tree, same order
— a step in the **associahedron**) and **cross/twist** (new order, same tree — a step
in the **(n−3)-cube**). The app shows the tree/polygon/overlay as disk windows and
both fibers as embedded 3D graphs, all linked, with a neighborhood-radius control
and a dedicated gallery card. The **"Nets" half** (distance matrix → NeighborNet/NJ)
and **energies** are scoped but not built — see the build-out ramp.

## What changed (this session, in order)

1. **Geometry core** `lib/associahedron.ts` — triangulations, flip graph, **facets**
   (facet ↔ diagonal), and a **symmetric** realization: the **secondary polytope of
   the regular n-gon** (GKZ areas, Gram–Schmidt to R^{n-3}). Replaced Loday's
   asymmetric coords (n=6 edge-length CoV dropped 50%→14%; n=5 → a regular pentagon).
2. **Mosaic** `lib/mosaic.ts` — cyclic orders + the gluing graph of M̄₀,ₙ(ℝ)
   (contiguous-arc reversal). Verified n=5→12 tiles/30, n=6→60/270, n=7→360/2520.
3. **App** redesigned to the **two-fiber** model:
   - Disk views (`DiskView`): **Tree**, **Polygon**, **Overlay** windows. Flip morph
     uses a proper **triangle bijection** (no more "collapse").
   - **flip** (keep order) and **twist** (keep labeled tree, reverse the edge's arc,
     re-embed → new order + matching triangulation). Verified the order-fiber is a
     genuine **(n−3)-cube** (2^{n−3}, commuting twists).
   - Two embedded fibers (`Graph3D`): **associahedron** (trees | order) and
     **(n−3)-cube** (orders | tree), gliding current marker, neighborhood-radius fade.
4. **Cloudflare preview tab title** = branch name (`vite.config.ts` `branchTitle`).
5. **Gallery card** — a `treenet` preview (pentagon dual tree walking its flip-cycle).

## Key files

| File | Role |
|---|---|
| [`lib/associahedron.ts`](https://github.com/piyarsquare/animath/blob/571706a/src/animations/TreesAndNets/lib/associahedron.ts) | Triangulations, flips, facets, **symmetric secondary-polytope** coords |
| [`lib/mosaic.ts`](https://github.com/piyarsquare/animath/blob/571706a/src/animations/TreesAndNets/lib/mosaic.ts) | Cyclic orders + gluing graph (M̄₀,ₙ(ℝ)) |
| [`TreesAndNets.tsx`](https://github.com/piyarsquare/animath/blob/571706a/src/animations/TreesAndNets/TreesAndNets.tsx) | App: DiskView, Graph3D fibers, flip/twist, layout |
| [`chrome/previews.tsx`](https://github.com/piyarsquare/animath/blob/571706a/src/chrome/previews.tsx) | `treenet` gallery card |
| [`vite.config.ts`](https://github.com/piyarsquare/animath/blob/571706a/vite.config.ts) | Branch name in Cloudflare preview tab title |
| [`docs/FUTURE_APPS.md`](https://github.com/piyarsquare/animath/blob/571706a/docs/FUTURE_APPS.md) | §6 scopes the port (the "Nets" half) |

## Build-out ramp (the rest of the project)

In dependency order (full version in the progress report):

- **R1 — Polish local exploration** *(small)*: tidy the default `Fibers` layout
  (panels under the rail, cube window off-screen); **mini glyphs inside fiber nodes**
  (a tree per associahedron node, an order per cube node); label edges by the
  interior edge they move; smooth the associahedron marker on a twist.
- **R2 — The "Nets" half** *(major)*: editable distance matrix → **NeighborNet**
  split weights → split-network render; **neighbor-joining**; **Kalmanson** /
  circular-decomposable detection. Grounds tree-space in data.
- **R3 — Energies on the fibers** *(needs R2)*: color the associahedron/cube by a
  metric-derived energy → the landscape + optimum; a descend/search mode.
- **R4 — Higher-n rendering**: n≥7 associahedron via **Schlegel** (or the particle
  4D→3D slider); a better cube projection for 4-cube+.
- **R5 — Whole moduli space, legibly** *(optional)*: the n=5 12-pentagon surface
  M̄₀,₅(ℝ) showpiece and/or a cleaner gluing graph (`lib/mosaic.ts` has the data).
- **R6 — Research / port hygiene**: the quantum-search question; cross-check the
  twist/gluing vs Devadoss; license/attribution for the port + crediting the paper.

## Open / not done

- **Default layout is rough** — windows tuck under the rail / run off-screen (R1).
  Everything is draggable; the built-in `Fibers` layout needs tidier rects.
- **Twist re-roots the other fiber** — a flip changes which cube you're in; a twist
  changes which associahedron. The associahedron marker *jumps* (then glides) on a
  twist because cur changes to the re-embedded vertex. Expected, but smooth it (R1).
- **n≥7 fibers are shadows** — both fibers `embed()` the first 3 intrinsic coords
  (not PCA). Faithful at n≤6; n≥7 needs Schlegel / better projection (R4).
- **The "Nets" half and energies are not started** (R2/R3) — the app is currently
  the *tree-space* explorer only.
- **PR #211 open**, not merged.

## Context

- The port source (`quantum-tree` zip, GAS `.py`) was shared **in-session only**
  (`/tmp/…`) and is gone when the container is reclaimed; nothing private is
  committed. Re-share to continue R2 (NeighborNet/NJ are in `quantum-tree`'s `map.js`).
- Math facts verified by probes this session: secondary polytope is symmetric;
  the order-fiber is a true (n−3)-cube (commuting twists); local gluing has exactly
  one "twist" and one flip/cross coincidence per point (under the *old* cross — note
  the current `twist` is the correct, tree-preserving move).
- The app pivoted away from a whole-space **Atlas** (it was an unreadable hairball)
  to the **local two-fiber** view, per repeated user feedback ("I find the local map
  disorienting", "start smaller", "see both fibers like quantum-tree").

## Self-reflection

1. **What would you do with another session?** R1 (tiny tree/order glyphs in the
   fiber nodes — the single biggest legibility win) and then start **R2, the "Nets"
   half** (NeighborNet/NJ from a distance matrix), which is the other half of the
   app's name and the remaining FUTURE_APPS scope.
2. **What would you change about what you produced?** Fewer full rewrites — I
   changed the central metaphor several times (associahedron tile → whole-space
   Atlas → flip-navigation → local gluing map → two fibers). Some of that was
   unavoidable (the user was discovering what they wanted), but I twice built the
   "wrong cross" before verifying the cube; verifying first would have saved a pass.
3. **What were you not asked that you think is important?** Whether to merge PR #211
   incrementally (it's a large, evolving branch) and the license/attribution for the
   port before any of this ships publicly.
4. **What did we both overlook?** Nothing blocking. The default-layout polish kept
   getting deferred; it's the first thing a fresh viewer sees, so R1 matters.
5. **What did you find difficult?** Getting the *order* moves right: the naive
   "reverse an arc" changes the labeled tree (wrong); the correct twist keeps the
   tree and re-embeds it. Probing the (n−3)-cube is what untangled it.
6. **What would have made this task easier?** A shared TS helper for "labeled tree =
   set of splits" and the flip/twist moves (I reimplemented split logic in the app,
   the fibers, and the preview). Factoring `lib/moves.ts` would de-duplicate and let
   R2/R3 build on it.
7. **Follow-up value:** MEDIUM — the tree-space explorer is correct, build-green, and
   has a card, but it's roughly half the intended app (the "Nets"/metric half and
   energies remain), the default layout needs polish, and n≥7 rendering is a shadow.
