---
kind: progress
session: 2026-06-10-S01
date: 2026-06-10
title: Trees and Nets — whole-associahedron representation
branch: claude/trees-and-nets
slug: trees-and-nets
status: in-progress
build: passing
followup: MEDIUM
pr: 211
app: trees-and-nets
---

# Trees and Nets — whole-associahedron representation

## Session purpose

Begin the **Trees and Nets** build (port of the private `quantum-tree`, classical
scope only). Lead design goal from the user: **represent the entire associahedron**
(the polytope of trees, vertices = triangulations, edges = flips) — not just the
per-circular-order fibers the original app draws as flat flip graphs — in a way
that plays to animath's strengths (Three.js 3D, the 4D→3D projection slider,
draggable linked windows, energy-as-field).

## Previous session

Continues from the scoping handoff
([future-apps-scoping S01](../../handoff/future-apps-scoping/2026-06-10-S01-future-app-scoping.md),
PR #210) which locked this port's scope (circular orders, energy functions,
circular-decomposable metrics, trees, NeighborNet + NJ) and named it. New branch
`claude/trees-and-nets` from `main`. **Port source is in `/tmp` this session only**
(`/tmp/qt-unzip/quantum-tree-main/`).

## Working notes

<!-- Newest entry first. -->

### 🟡 milestone · 03:40 — Phases 1–2 done: the generic M̄₀,ₙ(ℝ) explorer
**Why:** "Continue to the end" — deliver the whole-moduli-space explorer.

**P1** `lib/mosaic.ts`: enumerate cyclic orders ((n−1)!/2 dihedral classes), gluing
graph by contiguous-arc reversal (facet ↔ diagonal), 3D force-directed layout, and
a `tileCount`/`FULL_TILE_LIMIT` switch to a local BFS neighborhood for big n.
Verified in /tmp: n=5 → 12 tiles/30 edges, n=6 → 60/270, n=7 → 360/2520 (degree
n(n−3)/2 exactly). **P2** added the **Atlas** view (the gluing graph of the whole
space; current tile gold, neighbors teal, click a node to jump) and **cross-facet
navigation** in the Tile (click a facet → reverse that arc → move to the neighbor
order; the Atlas highlight follows). New "Cyclic order" panel + reset. Subtitle
shows the tile count. Build green (16.5 kB); headless n=6 (full 60-tile Atlas) and
n=8 (2,520 tiles → local neighborhood, 5-D tile as wireframe) both render. The
Atlas is the scalable whole-space showpiece (P3, per the revised plan).

### 🟡 milestone · 03:00 — Phase 0 done: canonical solid associahedron
**Why:** Land the single tile correctly before assembling the moduli space.

Dropped PCA (deleted `lib/projection.ts`); the viewer now renders the canonical
**Loday coordinates** (`point`) directly. Added `facets` to `associahedron.ts`
(facet ↔ diagonal, the vertices containing it) and the viewer fills the **2-faces**
as ordered polygons (Newell normal + angular sort + fan), colored by type — teal
pentagons (K₃×K₅) and purple squares (K₄×K₄). Removed all energy code (terrain
window, directed flow, placeholder); one Tile window, neutral vertices, click to
read a tree. n≥7 falls back to a fixed canonical wireframe projection (not PCA).
Build green (10 kB); headless n=6 shows the recognizable solid (14 v, 21 e, 9
facets). Next: P1 `lib/mosaic.ts` (cyclic orders + gluing graph, verify counts).

### 🟣 decision · 02:35 — Plan: generic M̄₀,ₙ(ℝ) explorer; drop energies & walk
**Why:** User: content to finish the associahedron, eager to show the whole
M₀,ₙ, no energies, leave TopologyWalk out (may return). Asked why over ℝ + a plan.

**Why ℝ:** M₀,ₙ(ℂ) has real dim 2(n−3) and is *not* tiled by associahedra; the
associahedral tessellation is a real phenomenon — n real points on ℝℙ¹ (a circle),
cyclic order = the discrete invariant, each order's cell closes to an associahedron.
ℝ is both where the (circular-order) combinatorics live and the viewable dim (n−3).

**Plan (phased):**
- **P0** Finish the single tile *canonically*: drop PCA, render Loday `point`
  directly (true 3D at n≤6), render **solid faces** from the dissection lattice
  (facet ↔ diagonal → the 6 pentagons + 3 squares), and **remove energies**
  (terrain window, flow, placeholder).
- **P1** `lib/mosaic.ts`: enumerate cyclic orders ((n−1)!/2) + gluing graph (tiles
  adjacent iff one is the other with a **contiguous arc reversed**; facets =
  n(n−3)/2). Verify n=5 → 12 nodes/30 edges (χ = 15−30+12 = −3, non-orientable);
  n=6 → 60/270. Cross-check rule vs Devadoss mosaic operad.
- **P2** Atlas view (gluing graph, **any n**) + cross-facet navigation (click a
  facet → animate to the neighbor tile). = the generic explorer.
- **P3** whole-space "showpiece" **scaled to all n**: the gluing-graph Atlas is the
  universal whole-M̄₀,ₙ object (any n); n≤6 can also inflate tiles + glue a
  geometric patch; the n=5 12-pentagon surface emerges as the closed special case
  (non-orientable → immersion/fundamental-domain when shown literally).
- **P4 (later)** n=6 local 3-manifold patch; n≥7 single-tile Schlegel.

Out for now: energies, TopologyWalk engine. Each phase: build + headless shot +
assert the combinatorial counts.

### 🔵 finding · 02:10 — The "bundle of associahedra" = the real moduli space M̄₀,ₙ(ℝ)
**Why:** User asked whether the structure bundling associahedra over all cyclic
orders has a name and can be visualized.

It is the **real Deligne–Mumford moduli space $\overline{M}_{0,n}(\mathbb{R})$**:
a smooth compact $(n-3)$-manifold **tessellated by $(n-1)!/2$ associahedra**
$K_{n-1}$, one per cyclic ordering, glued along facets (Devadoss, *mosaic operad*,
1999 — already in `paper/references/`). Not a fiber bundle (the cyclic-order index
is discrete); the gluing across a facet = a degeneration linking adjacent orders.
Visualizable:
- **n=5** → a closed surface of **12 pentagons** ($K_4$ each); $V{-}E{+}F = 15-30+12
  = -3$ ⇒ odd χ ⇒ **non-orientable**, the connected sum of 5 ℝP². Renderable — and
  a natural fit for the **TopologyWalk / PolygonWorlds** walk-a-surface engine
  ("walk tree-space"; crossing an edge = a flip / order change).
- **n=6** → a 3-manifold tiled by **60** 3-D associahedra.
- any n → the **gluing graph** (nodes = cyclic orders, edges = shared facets).
Design implication: a mode escalation — tree ⊂ associahedron (one order) ⊂
$\overline{M}_{0,n}(\mathbb{R})$ (all orders). The n=5 12-pentagon surface is a
strong flagship for the "entire structure" view.

### 🟣 decision · 01:40 — Drop PCA; use canonical Loday coordinates
**Why:** User: "the PC are not useful... keep the same structure as the regular
formulation of the associahedron." PCA re-orients axes by data variance, so the
n=6 solid no longer reads as *the* associahedron and PC axes are meaningless.

Established (and explained to the user) the regular formulation: vertices =
triangulations; edges = flips (the simple-polytope graph determines the whole
combinatorics, Blind–Mani/Kalai); faces = the dissection lattice, facets ↔ single
diagonals with the product law (a diagonal splitting the n-gon into a (p+1)- and
(q+1)-gon gives facet Kₚ×K_q). Hexagon checked: 14 verts, 21 edges, 9 facets = the
9 diagonals = 6 pentagons (K₃×K₅) + 3 squares (K₄×K₄). Loday's coordinate map is
canonical and already computed (`point` via the fixed Helmert basis). **Plan:**
remove PCA from the viewer and render `point` directly — for n≤6 this is the true
3D associahedron. Open question put to the user: how to view n≥7 (4D/5D/6D) while
keeping the structure — Schlegel diagram (through a facet) vs the genuine 4D→3D
projection (n=7) vs a fixed canonical linear projection vs staying combinatorial.

### 🟢 code · 01:00 — General mD→3D projection, zoom, directed energy edges
**Why:** User flagged the 4D-specific transform won't scale (n=8 → 5D, n=9 → 6D)
and asked for zoom + steerable projection + directed energy edges.

Replaced the first-3-coords slice with `lib/projection.ts`: **PCA** (Jacobi
eigendecomposition) of the intrinsic R^{n-3} polytope coords, with a steerable
linear projection — the **Projection** panel picks which principal components map
to screen X/Y/Z (dimension-agnostic "alter the projection"). Added a **zoom**
slider + wheel (live via a ref, no remount), an **auto-rotate** toggle, and
**directed energy edges** (`marks`): each flip is an arrow pointing downhill
(toward lower energy), length/color ∝ |ΔE| — sinks = local optima. Extended leaf
count to **4–9**. Fixed a latent double-canvas bug by remounting `AssocView` via
React key on structural changes (Canvas3D re-runs onMount without removing the old
canvas). Build green (12.58 kB). Headless capture at **n=8 (5D, 132 trees, 330
flips)** confirms the PCA projection + arrows render and scale.

> [!NOTE]
> Same PCA path renders n=9 (6D, 429 verts) — no bespoke 4D machinery. Per-vertex
> meshes are fine to ~429; switch vertices to InstancedMesh if n grows further.
> Still placeholder energy — the distance-matrix → circular-order energy pipeline
> is the next piece and is what makes the downhill flow meaningful.

### 🟡 milestone · 00:05 — Working associahedron viewer renders (n-general)
**Why:** Deliver the polytope viewer first (user's chosen first slice), built so it
doesn't depend on the specific value of n; energy shown as both linked windows.

Built `TreesAndNets.tsx`: a `<Workspace>` app with two Three.js view windows —
**Associahedron** (faithful Loday polytope) and **Energy terrain** (vertices
displaced radially by energy) — sharing one `AssocView` (orbit + wheel-zoom +
gentle autospin + click-to-pick a vertex; linked selection highlights both). Panels:
leaf-count `4–7` (subject), tree-space stats (readout), energy note (color).
Energy is a labeled **placeholder** (total internal-split span) until the
distance-metric pipeline lands. Registered route/apps/catalog; added EXPLAINER and
the CLAUDE.md/README rows. `npm run build` green (own 8.84 kB chunk); headless
screenshot confirms the 14-vertex n=6 polytope + terrain render correctly.

> [!NOTE]
> `positionsFor` takes the first 3 intrinsic coords, so **n=7 (4D) is a flat
> orthographic slice for now** — the real home is the `lib/particles` projection
> slider (Perspective/Torus/Sphere). Next big piece is the **distance-matrix →
> circular-order energy** pipeline to replace the placeholder.

### 🟢 code · 23:58 — Geometry core: `lib/associahedron.ts` (verified, builds)
**Why:** Prove the representation is real and computable before any rendering.

Prototyped in `/tmp` then shipped `src/animations/TreesAndNets/lib/associahedron.ts`:
enumerate triangulations of the n-gon, build the flip graph, compute **Loday
coordinates**, and project them through a **Helmert orthonormal basis** of the
sum-zero hyperplane to get intrinsic R^{n-3} polytope coordinates (3D for n=6, 4D
for n=7 → feeds the projection viewer). Verified: Catalan(n-2) vertices
(5/14/42 for n=5/6/7), **(n-3)-regular** flip graph, distinct Loday points on a
single hyperplane (sum = C(n-1,2) = 6/10/15). `npm run build` passes (✓ 4.72s).

### 🔵 finding · 23:44 — The fiber IS an associahedron; that's the representation key
**Why:** Grounding the design in the existing code and the math before building.

The original app draws, for a fixed circular order, the **tree-fiber** = the set of
compatible binary trees with flips as edges (`orderFiberSvg`, with a
walk/settle/anneal already implemented). Mathematically: fix a circular order of
`n` leaves on an `n`-gon; the compatible unrooted binary trees ⇔ **triangulations
of the n-gon**, and flips = diagonal flips. That set with flips = the **1-skeleton
of the associahedron `K_{n-1}`** (dimension `n−3`):
`n=5 → 2D (pentagon, 5 verts)`, `n=6 → 3D (14 verts)`, `n=7 → 4D (42 verts)`.
So the user's "entire associahedron" = render the actual **polytope** (not a flat
graph), and 6 leaves → a Three.js 3D polytope, 7 leaves → the **4D→3D projection
slider** already in `lib/particles`. Energy per tree → color/height ⇒ the
associahedron becomes a literal **energy landscape over tree-space**; the existing
anneal walk becomes a walk on the polytope (ties to the glassy-landscape theme and
the quantum-search open question).
