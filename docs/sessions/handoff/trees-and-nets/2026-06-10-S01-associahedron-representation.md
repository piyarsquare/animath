---
kind: handoff
session: 2026-06-10-S01
date: 2026-06-10
title: Trees and Nets — a generic M̄₀,ₙ(ℝ) explorer
branch: claude/trees-and-nets
slug: trees-and-nets
status: in-progress
build: passing
followup: MEDIUM
pr: 211
app: trees-and-nets
---

# Trees and Nets — a generic M̄₀,ₙ(ℝ) explorer

> [!NOTE]
> New app `#/trees-and-nets`, first build (port of the private `quantum-tree`,
> classical scope only). Not merged, no PR yet. `npm run build` passes
> (`tsc && vite build`, ✓ ~6.4s at `c1a7de1`); own chunk ~16.5 kB.

## Summary

Built a working **explorer for the real moduli space $\overline{M}_{0,n}(\mathbb{R})$**,
the space that tessellates into associahedra. Each cyclic order of n leaves gives an
**associahedron tile** (vertices = trees/triangulations, edges = flips, faces =
dissections); gluing all $(n-1)!/2$ tiles along facets gives the moduli space. The
app shows a **Tile** window (the canonical associahedron) and an **Atlas** window
(the whole gluing graph), with cross-facet navigation between tiles. Works for
**n = 4…9**. Energies and the topology-walk engine were deliberately left out.

## What changed

- **`lib/associahedron.ts`** — n-general geometry: enumerate triangulations, flip
  graph, **Loday coordinates** (canonical), projected to intrinsic R^{n-3} via a
  fixed Helmert basis, plus **facets** (facet ↔ diagonal = the product Kₚ×K_q).
- **`lib/mosaic.ts`** — the tessellation: enumerate cyclic orders (dihedral
  classes), build the **gluing graph** (tiles adjacent iff one is the other with a
  **contiguous arc reversed** — the arc cut off by a facet's diagonal), a 3D
  force-directed layout, and a local-neighborhood fallback above
  `FULL_TILE_LIMIT = 400` tiles. Verified counts: n=5 → 12 tiles/30 edges, n=6 →
  60/270, n=7 → 360/2520 (degree n(n−3)/2).
- **`TreesAndNets.tsx`** — `<Workspace>` with two Three.js windows:
  - **Tile**: canonical solid for n≤6 (filled 2-faces colored by type — teal
    pentagons K₃×K₅, purple squares K₄×K₄); fixed-projection wireframe for n≥7.
    Orbit / zoom / autospin; click a **vertex** to read its tree, click a **facet**
    to cross into the neighbor order.
  - **Atlas**: the gluing graph (current tile gold, neighbors teal); click a node
    to jump. Full graph for n≤7, local neighborhood for n≥8.
- Panels: Leaves (n), Cyclic order (+ reset), View (zoom/spin), Tree space (stats).
- Design pivots this session (recorded in the progress report): **dropped PCA**
  for canonical Loday coordinates (PCA reoriented axes by variance and destroyed the
  recognizable associahedron); **removed energies**; identified the global object as
  $\overline{M}_{0,n}(\mathbb{R})$ (Devadoss mosaic operad).

## Key files

| File | Role |
|---|---|
| [`lib/associahedron.ts`](https://github.com/piyarsquare/animath/blob/c1a7de1/src/animations/TreesAndNets/lib/associahedron.ts) | Triangulations, flips, Loday coords, facets (one tile's geometry) |
| [`lib/mosaic.ts`](https://github.com/piyarsquare/animath/blob/c1a7de1/src/animations/TreesAndNets/lib/mosaic.ts) | Cyclic orders + gluing graph + layout (the whole moduli space) |
| [`TreesAndNets.tsx`](https://github.com/piyarsquare/animath/blob/c1a7de1/src/animations/TreesAndNets/TreesAndNets.tsx) | App: Tile view, Atlas view, cross-facet navigation |
| [`EXPLAINER.md`](https://github.com/piyarsquare/animath/blob/c1a7de1/src/animations/TreesAndNets/EXPLAINER.md) | The "?" text |
| [`docs/FUTURE_APPS.md`](https://github.com/piyarsquare/animath/blob/c1a7de1/docs/FUTURE_APPS.md) | §6 scopes this port (PR #210, separate branch) |

## Open / not done

- **n=7 single tile is a fixed-projection wireframe** (first 3 canonical coords, not
  PCA). The honest 4-D rendering is a **Schlegel diagram** (through a facet) or the
  particle engine's 4-D→3-D projection slider — deferred (plan's Phase 4).
- **No literal n=5 surface.** The 12-pentagon $\overline{M}_{0,5}(\mathbb{R})$
  surface (non-orientable) was *not* built; the Atlas graph is the scalable
  whole-space view instead (the user asked the showpiece to scale to n>5). A literal
  immersed surface remains a possible flourish.
- **Tile looks static across navigation** — all tiles are congruent associahedra, so
  crossing a facet only changes the labels + the Atlas highlight, not the tile's
  shape. Consider a small "cross the facet" animation or showing the crossed facet.
- **Energies / the "Nets" half** (editable distance matrix, NeighborNet/NJ,
  circular-decomposable metrics) are scoped in FUTURE_APPS §6 but not started.
- **No PR opened** for this branch.

## Context

- The two ports' source is **session-scoped** (`/tmp/qt-unzip/quantum-tree-main/`,
  and the GAS uploads) — gone when the container is reclaimed. Nothing from the
  private repos is committed; re-share if needed.
- Earlier in this same container: PR #206 (agent-invokable skills, merged) and
  PR #210 (the FUTURE_APPS.md scoping doc, on branch `claude/future-apps-scoping`).
  This branch forked from `main`.
- Gluing rule (verify against Devadoss when extending): a facet = one diagonal =
  a contiguous arc S; the two tiles across it differ by reversing S. Counts check
  out, but the precise operad gluing is worth confirming for the "Nets" work.
- `positionsFor` truncates to the first 3 canonical coordinates for n≥7 — fine as a
  stable shadow, but it is not the polytope (Schlegel is the fix).

## Self-reflection

1. **What would you do with another session?** Build the n=7 tile **Schlegel
   diagram** (the one place the current render is a shadow rather than the real
   thing), and start the **"Nets" half** — an editable distance matrix → circular
   split weights (NeighborNet) → NJ — which is the other half of the app's name and
   of the FUTURE_APPS scope.
2. **What would you change about what you produced?** Navigation feedback in the
   Tile is weak (congruent tiles ⇒ only labels change); a facet-crossing animation
   would make "moving through the moduli space" legible. And the Atlas force-layout
   is generic; a structure-aware layout (by symmetry/orbit) would read better.
3. **What were you not asked that you think is important?** Whether to open a PR for
   this branch, and the license/attribution for porting the private `quantum-tree`
   material before this ships publicly.
4. **What did we both overlook?** Nothing blocking. The gluing rule was verified by
   counts (12/30, 60/270, 360/2520) but not cross-checked line-by-line against
   Devadoss's mosaic operad — fine for the explorer, worth confirming before the
   Nets/metric work leans on it.
5. **What did you find difficult?** Keeping faithful to the *canonical* structure
   while staying renderable across dimensions — resolving that PCA was wrong, that
   n≤6 is genuinely solvable (Loday), and that n≥7's honest answer is Schlegel /
   combinatorial, not a data-driven shadow.
6. **What would have made this task easier?** A 3-D convex-hull / Schlegel helper in
   the repo (there's none); face extraction was done from the dissection lattice
   instead, which works to 3-D but not for projecting 4-D tiles.
7. **Follow-up value:** MEDIUM — the explorer is correct, complete, and build-green
   for its scope, but two clearly-scoped pieces remain (n≥7 Schlegel tile; the Nets
   half), plus the open PR/licensing question.
