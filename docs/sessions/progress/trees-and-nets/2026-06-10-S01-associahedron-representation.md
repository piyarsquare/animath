---
kind: progress
session: 2026-06-10-S01
date: 2026-06-10
title: Trees and Nets — whole-associahedron representation
branch: claude/trees-and-nets
slug: trees-and-nets
status: completed
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

## Build-out ramp (roadmap for the rest of Trees and Nets)

Where the app goes from here, in dependency order. Current state = local exploration
of a (tree, order) point with its two fibers (associahedron × (n−3)-cube), the disk
views, navigation, and a gallery card.

- **R1 — Polish the local exploration** *(small, immediate)*: tidy the default
  `Fibers` layout (panels off the rail, cube window on-screen); draw a **mini glyph
  inside each fiber node** (a tree in associahedron nodes, a circular order in cube
  nodes) so nodes show *what* they are; label the cube axes / associahedron edges by
  the interior edge they move; smooth the associahedron marker on a twist (it jumps
  to the re-embedded vertex today).
- **R2 — The "Nets" half** *(major; the other half of the name)*: an editable n×n
  **distance matrix** (+ presets); **NeighborNet** circular split weights → the
  **split network** render; **neighbor-joining** as the tree case; **Kalmanson /
  circular-decomposable** detection + a "tree-like vs net-like" readout. Grounds the
  abstract tree-space in data (a metric picks a preferred tree/order).
- **R3 — Energies on the fibers** *(needs R2)*: a per-tree circular-order energy
  (path sums) and per-order energy from the metric; **color the associahedron and
  cube by energy** → the landscape + the optimum; a "descend"/search mode (ties to
  the GAS/glassy-landscape theme in FUTURE_APPS).
- **R4 — Higher-n rendering**: associahedron fiber for n≥7 (4D+) via a **Schlegel**
  diagram or the `lib/particles` 4D→3D projection slider; cube fiber for n≥7
  (4-cube+) via a better projection / hypercube net (the current first-3 embed is a
  shadow).
- **R5 — The whole moduli space, legibly** *(optional)*: revisit the global gluing
  now the local picture is clear — the n=5 **12-pentagon surface** M̄₀,₅(ℝ) as a
  showpiece, and/or a better-laid-out gluing graph (the earlier Atlas was a hairball;
  `lib/mosaic.ts` already has the data).
- **R6 — Research / port hygiene** *(open)*: the quantum-search question (search the
  associahedron/cube by interference — the classical substrate is now in place);
  cross-check the twist/gluing rules vs Devadoss's mosaic operad; licensing /
  attribution for the quantum-tree port + crediting the working paper.

Cross-cutting: each phase ends with `npm run build` + a headless screenshot and
asserts the combinatorial invariants (Catalan trees, 2^(n−3) cube, facet counts).

## Working notes

<!-- Newest entry first. -->

### 🟢 code · 13:40 — Dedicated gallery card (treenet preview)
**Why:** User wanted a better gallery card than the reused corridor preview.

Added a `treenet` PreviewKind: a pentagon's dual tree walking its flip-cycle (the
changed branch glides, leaves in gold), in `chrome/previews.tsx`; pointed
`catalog.ts` at it. Self-contained (inline triangulation enumerator), light/dark
aware. Build green; gallery screenshot confirms the card.

### 🟢 code · 13:35 — Two embedded fibers + multi-window; fix flip collapse & twist
**Why:** User: all windows (keep every version); tree/polygon/overlay as separate
views; show BOTH local fibers like quantum-tree (associahedron + hypercube),
embedded in space with a neighborhood size; flip morph had a "collapse".

Verified the order-fiber is a true **(n−3)-cube** (`/tmp/cube_probe.mjs`: orbit
2^(n−3), degree n−3, twists commute) — which also revealed my earlier "cross" was
wrong (it changed the tree). Rebuilt the app:
- **Disk views** (`DiskView` with flags) → three windows: **Tree** (dual tree +
  circular order), **Polygon** (+ triangulation), **Overlay** (both). Fixed the flip
  morph with a proper **bijection** old→new triangles (no more collapse).
- **Correct moves**: `flip` (change tree, keep order) and `twist` (keep labeled
  tree, reverse the edge's arc, re-embed → new order + matching triangulation).
- **Two embedded fibers** (`Graph3D`): the **associahedron** (trees | order, teal)
  and the **(n−3)-cube** (orders | tree, orange), each with a gliding current
  marker and a **neighborhood-radius** slider (color fades with graph distance).
  Click a node to navigate. Dropped the disorienting radial "local map".
- A built-in **Fibers** layout opens tree + overlay + both fibers.

Build green (17.5 kB); n=5 shows the pentagon associahedron + the 2-cube of orders.

### 🟢 code · 13:05 — Local viewpoint map (flip vs cross) + gluing; drop rotation/3D
**Why:** User: rotation isn't privileged (downgrade it); tree as its own panel;
clicking an edge has two readings — flip the edge (assoc move) or flip the order
((n−3)-cube move); and the local map should reveal where the two neighbor-sets glue.

Probed the math first (`/tmp/local_probe.mjs`): each point has **n−3** flip-moves
and n−3 cross-moves; at every point **exactly one cross is a "twist"** (order changes,
labeled tree unchanged) and **exactly one cross coincides with a flip** (assoc ↔ cube
glue). (The order-orbit is bigger than a strict cube globally — local degree n−3.)
Rebuilt the app: removed the rotate buttons and the big 3D associahedron; **Tree** is
its own SVG panel (dual tree, smooth flip morph + label-slide on cross, twist edges
tinted purple); added a **Local map** SVG — center + flip targets (teal) + cross
targets (orange), coincident targets merge (gold-halo = **glued**), twists drawn as
purple loops; click a node to navigate. Flip/Cross mode = the two edge-click
readings. Build green (13.8 kB); n=5 shows 1 glued node + 1 twist as predicted.

### 🟢 code · 12:45 — Branch name in the Cloudflare preview tab title
**Why:** User: each Cloudflare build gets a new URL; the tab always said "animath",
making multi-thread work hard to tell apart.

Added a `branchTitle` Vite plugin (`vite.config.ts`) that reads Cloudflare's
build-time `CF_PAGES_BRANCH` and rewrites `<title>` to `"<branch> · animath"`
(slashes→dashes, matching the `*.pages.dev` subdomain). Verified across builds:
preview branch → `claude-trees-and-nets · animath`; `main` and local → `animath`.
Documented in `docs/PREVIEW_DEPLOYS.md`. (Shared file `vite.config.ts` touched —
additive plugin only.)

### 🟢 code · 12:30 — Draw the actual (dual) tree + smooth morphs
**Why:** User: "I want to see the actual tree" + "animations should be smooth."

The Tree view now draws the **dual tree** (internal node per triangle, branches
between adjacent triangles, n leaves on the boundary labeled by the order), with the
triangulation faint behind it (toggle "Show triangulation"). You click an **internal
branch** to Flip/Cross. **Smooth transitions:** on a flip the internal nodes glide
from the nearest old node to their new positions (eased rAF morph, ~420ms); leaf
labels tween around the circle on a cross; and the Landscape gained a gold
"you-are-here" **marker that glides** to the current tree (lerp per frame) instead of
snapping. Build green (14.3 kB). Renders; flip/cross/order all animate.

### 🟢 code · 12:15 — Fiber-crossing: Flip (tree) vs Cross (order), animated
**Why:** User wanted to navigate tree *and* order and "watch the tree/order change
naturally" — the two-fibers-connect move.

Added a **Flip / Cross** mode toggle. Clicking a chord either **flips** it (change
the tree shape, same order — dot moves on the landscape, changed chord flashes) or
**crosses** it (reverse the leaves on that chord's arc via `neighborOrder` → step
into the neighbor cyclic-order fiber). On a cyclic-order change the **leaf labels
animate around the circle** (shortest-angular-path tween, ~480ms) so you watch the
order reverse. "Rotate" also animates. So flips walk trees within a fiber; crossings
walk between fibers. Build green (12.3 kB); renders. This realizes the "two fibers
connect" + "watch the tree/order change" asks on the small, legible local view.

### 🟣 decision · 12:05 — Pivot to a legible flip-navigation view (drop the Atlas)
**Why:** User: the whole-space Atlas is too hard to navigate / "can't see where you
are"; start smaller, show how two fibers connect, "navigate from one tree/order to
another and watch the tree change naturally as you navigate the landscape."

Replaced the Atlas-heavy app with a **two-window, tree-centric** design (default
n=5): a **Tree** view (SVG) drawing the current triangulation in the polygon (leaves
labeled by the cyclic order) where **clicking a chord flips it** → step to a
neighboring tree, with the changed diagonal flashing; and a **Landscape** view (the
associahedron, symmetric secondary-polytope) with the current tree gold and one-flip
neighbors teal, click-a-node-to-walk. The two are linked (flip ↔ position). "Rotate"
turns the cyclic order. This makes "where you are / what's happening" obvious. Build
green (11.4 kB). **Still to do:** crossing between *order* fibers (arc reversal) so
you can walk fiber→fiber — the "two fibers connect" piece — and a smoother flip
animation. The whole-space Atlas (mosaic.ts) is retained in the lib but no longer
the main UI.

### 🟢 code · 03:55 — Symmetric realization (secondary polytope), diagnosed projection
**Why:** User: the tile isn't symmetric + projection issues; asked how objects
compose. Diagnosed and fixed (a).

Walked the composition pipeline (triangulations → coordinates → isometric reduce →
truncate-to-3 → draw) and located both issues: **asymmetry = Loday's rooted
realization** (measured flip-edge length CoV: Loday n=5 35% / n=6 50%; the secondary
polytope of the regular n-gon gives n=5 0% (regular pentagon) / n=6 14% — the
residual is the genuine two edge-orbits). **Projection**: n=6 `point` is exactly 3D
(faithful — the asymmetry was all Loday); n≥7 truncates coords (real shadow, needs
Schlegel). **Fixed (a):** replaced Loday→Helmert with `secondaryPoints()` in
`associahedron.ts` — GKZ area vectors on the regular n-gon, reduced isometrically
to R^{n-3} by Gram–Schmidt of the centered span (keeps `loday` as reference). n≤6
tiles now render symmetric; build green; n=6 screenshot confirms. **(b)** Schlegel
for n≥7 tiles is the queued next step.

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
