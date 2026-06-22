---
kind: app-guide
app: trees-and-nets
route: "#/trees-and-nets"
name: Trees and Nets
title: Trees and Nets — developer guide
status: active
build: passed
entry: src/animations/TreesAndNets/TreesAndNets.tsx
updated: 2026-06-22
signals: null
next: R1 — tiny tree/order glyphs inside the fiber nodes (the single biggest legibility win), then start the "Nets" half (NeighborNet/NJ from a distance matrix).
---

# Trees and Nets — developer guide

> See tree-space as a polytope: every triangulation of an n-gon is a tree, every
> flip an edge, and the whole associahedron a 3D (or 4D) shape colored by energy.

The living architecture + status doc for this app. Conventions:
[`GUIDE_STYLE.md`](GUIDE_STYLE.md). What this doc type is: [`README.md`](README.md).
The teaching/math ("what am I looking at") lives in
[`EXPLAINER.md`](../../src/animations/TreesAndNets/EXPLAINER.md), not here.

## Status

- **Route:** `#/trees-and-nets` (no redirects). Listed in the gallery.
- **Stability:** ✅ **active**, but **roughly half the intended app**. The tree-space
  explorer (the "Trees" half) is correct, build-green, and has a gallery card; the
  **"Nets" half** (distance matrix → NeighborNet / neighbor-joining) and **energies on
  the fibers** are scoped but not built. A **port of the classical core of the private
  `quantum-tree`**.
- **Entry:** `TreesAndNets.tsx` · 3 ts/tsx files, ~775 LOC (`TreesAndNets.tsx` +
  `lib/associahedron.ts` + `lib/mosaic.ts`).
- **Build/tests:** covered by `npm run build`; **no app-specific unit tests**. Math
  facts (Catalan vertex counts, the (n−3)-cube, the secondary-polytope symmetry, the
  mosaic tile/edge counts) were verified by in-session probes, not committed tests.

## Active / Resolved

The per-app control center — hand-maintained.

### Active

<!-- newest first; mirrors the "build-out ramp" in the trees-and-nets handoff -->
- [ ] **!med** R1 — polish local exploration: tidy the default `Fibers` layout
  (windows tuck under the rail / run off-screen), draw **mini tree/order glyphs inside
  the fiber nodes**, label edges by the interior edge they move, smooth the
  associahedron marker on a twist.
- [ ] **!med** R2 — the **"Nets" half** (the other half of the app's name): editable
  distance matrix → NeighborNet split weights → split-network render; neighbor-joining;
  Kalmanson / circular-decomposable detection. (NeighborNet/NJ live in `quantum-tree`'s
  `map.js`; the port source was shared in-session only and is gone.)
- [ ] **!low** R3 — energies on the fibers (needs R2): color the associahedron/cube by
  a metric-derived energy → landscape + optimum + a descend/search mode.
- [ ] **!low** R4 — higher-n rendering: n ≥ 7 fibers currently `embed()` only the first
  3 intrinsic coordinates (a faithful shadow at n ≤ 6, a projection above). Needs
  Schlegel or a better 4-cube+ projection.
- [ ] **!low (product)** Port hygiene: license/attribution for the `quantum-tree` port;
  cross-check the twist/gluing against Devadoss.

### Resolved

- [x] **2026-06-10** (`trees-and-nets`, PR #211) — Initial build: the geometry core
  (`lib/associahedron.ts`: triangulations, flip graph, facets, the symmetric
  **secondary-polytope** realization), the mosaic library (`lib/mosaic.ts`: cyclic
  orders + M̄₀,ₙ(ℝ) gluing graph), the **two-fiber** app (Tree / Polygon / Overlay disk
  views + associahedron and (n−3)-cube embedded graphs, flip/twist moves), and a
  `treenet` gallery preview. Pivoted away from an unreadable whole-space "Atlas" to the
  local two-fiber view per user feedback.
  [Handoff.](../sessions/handoff/trees-and-nets/2026-06-10-S01-associahedron-representation.md)

## What it does

A point is a **tree** plus a **cyclic order** of its leaves — equivalently a
**triangulation of a convex n-gon**. The app explores one point at a time and the two
fibers through it.

- **Leaves panel** (`subject`) — Leaf count `n` (5 / 6 / 7 / 8) as pills.
- **Move panel** (`drive`) — "Click an edge to…" Flip vs Cross. Each of the n−3
  interior edges gives two moves: **Flip** (new tree, same order — a step in the
  **associahedron**) or **Cross** (new order, same labeled tree — a step in the
  **(n−3)-cube**).
- **Where you are panel** (`readout`) — the current order, tree index, and the splits.
- **Display panel** (`view`) — Neighborhood radius (how far out the fibers are drawn),
  Show triangulation overlay, Auto-rotate fibers.
- **View windows** (5 of them, linked) — **Tree** (the unrooted tree, leaves in cyclic
  order), **Polygon + triangulation**, **Overlay** (both), the **Associahedron fiber**
  (all trees compatible with the current order), and the **(n−3)-cube fiber** (all
  orders compatible with the current tree). The default `Fibers` layout opens Tree +
  Overlay + both fibers (Polygon closed). Clicking a chord/branch in a disk view, or a
  node in either fiber, navigates.

## How the code works

**One component, two pure libraries.** `TreesAndNets.tsx` holds the state and all
rendering; `lib/` is rendering-free combinatorics.

**State.** The single source of truth is `(cur, order)` — `cur` indexes into the
associahedron's vertex list (which triangulation), `order` is the current cyclic order
of the leaves. A **flip** finds the adjacent associahedron vertex differing by one
diagonal and sets `cur`. A **twist/cross** keeps the *labeled tree* (a sorted set of
split keys) fixed, reverses the leaves on the edge's arc (`neighborOrder` from
`lib/mosaic.ts`), and finds the vertex whose tree under the new order matches — so it
changes both `cur` and `order`. `n` / `mode` / `radius` / display toggles persist via
`usePersistentState`; `order` / `cur` / `flash` reset on `n` change.

**The associahedron** (`lib/associahedron.ts`, `buildAssociahedron(n)`): enumerates the
Catalan(n−2) triangulations of the regular n-gon, builds the **flip graph**
(symmetric-difference-of-2 adjacency = the 1-skeleton), the **facets** (one per
diagonal), and the render coordinates. The coordinates are the **symmetric
secondary-polytope (GKZ)** realization on the regular n-gon — each coordinate is the
total area of a triangulation's triangles meeting a polygon vertex — reduced
isometrically to its intrinsic R^{n−3} by a Gram–Schmidt basis of the centered span.
This inherits the polygon's dihedral symmetry (unlike Loday's rooted coordinates, which
are kept only for reference).

**The fibers.** The associahedron fiber is the fixed polytope (current = `cur`). The
**(n−3)-cube fiber** is built on the fly: a BFS over the orders reachable from the
current one by twisting each interior edge's axis, keyed canonically — yielding 2^(n−3)
nodes with Hamming-1 edges (a genuine cube). `Graph3D` renders either fiber: nodes
pre-positioned (3D `embed` of the first three intrinsic coords), drag-to-rotate,
wheel-zoom, raycast-to-pick, a BFS distance fade from the current node out to the
neighborhood radius, and a gold marker that glides to the current node.

**The disk views** (`DiskView`) draw the polygon + triangulation and/or the dual tree
as SVG, with morphs: leaf labels slide on an order change, and triangle centroids morph
through a proper bijection on a flip (no collapse).

**The mosaic** (`lib/mosaic.ts`) holds the full M̄₀,ₙ(ℝ) tessellation machinery —
`enumerateOrders`, `buildMosaic`, a deterministic force-directed 3D layout, verified
tile/edge counts (n=5 → 12/30, n=6 → 60/270, n=7 → 360/2520). The app currently uses
only `neighborOrder` and `canonicalKey` from it; the whole-space mosaic render is
scoped (R5), not wired into a view yet.

## Key files

| File | Role |
|---|---|
| [`TreesAndNets.tsx`](../../src/animations/TreesAndNets/TreesAndNets.tsx) | The app: state `(cur, order)`, flip/twist, `DiskView` (SVG), `Graph3D` fibers, panels, layout |
| [`lib/associahedron.ts`](../../src/animations/TreesAndNets/lib/associahedron.ts) | Triangulations, flip graph, facets, **symmetric secondary-polytope** coordinates (+ Loday for reference) |
| [`lib/mosaic.ts`](../../src/animations/TreesAndNets/lib/mosaic.ts) | Cyclic orders + M̄₀,ₙ(ℝ) gluing graph + force layout (app uses `neighborOrder`/`canonicalKey`; full mosaic not yet rendered) |
| [`EXPLAINER.md`](../../src/animations/TreesAndNets/EXPLAINER.md) | The **?** modal text |

## Invariants & gotchas

> [!CAUTION]
> **Gotcha — the "Cross" move must preserve the labeled tree.** The naive "reverse an
> arc" changes the labeled tree (wrong). The correct twist keeps the tree (the sorted
> set of split keys) and re-embeds it under the new order, then finds the matching
> triangulation. This was the hardest part of the build; verify against the (n−3)-cube
> (commuting twists, 2^(n−3) orders) if you touch it.

- **A point is `(cur, order)`, not just `cur`.** `cur` is which triangulation; `order`
  is the leaf labeling. A flip changes `cur` only; a cross changes both. Keep the two
  in sync — `leafTree(diagonals, order, n)` is the join key between the fibers.
- **Render coordinates are the *symmetric* realization.** Use the secondary-polytope
  `point`, not Loday's rooted `loday` (kept only for reference) — the symmetry is what
  makes the n=5 fiber a regular pentagon and the n=6 fiber read cleanly.
- **n ≥ 7 fibers are honest shadows.** `embed()` takes the first 3 intrinsic
  coordinates, not a PCA/Schlegel projection — faithful at n ≤ 6, a projection above.
  Don't present them as exact at higher n.
- **The (n−3)-cube fiber is rebuilt per (tree, n).** Keyed `q-${treeKey}-${n}` so the
  `Graph3D` remounts when the tree changes; the associahedron fiber is keyed `a-${n}`.
- **Split logic is reimplemented in three places** (the app, the fibers, the preview).
  A shared `lib/moves.ts` ("labeled tree = set of splits" + flip/twist) was flagged as
  the right de-duplication and the foundation for R2/R3 — factor it before building the
  "Nets" half.

## Testing & verification

- `npm run build` — the CI gate.
- Headless screenshot: `node scripts/shoot.mjs '#/trees-and-nets' shot.png`.
- By eye / by hand: flipping the same edge twice returns to the start; the (n−3)-cube
  fiber has 2^(n−3) nodes (1 at n=4, 2 at n=5, 4 at n=6, 8 at n=7); the associahedron
  fiber has Catalan(n−2) nodes (5 at n=5, 14 at n=6, 42 at n=7); clicking a fiber node
  glides the marker and updates every other window.

## History & sources

- **Built/iterated by:** the [`trees-and-nets`](../sessions/handoff/trees-and-nets/2026-06-10-S01-associahedron-representation.md)
  branch (PR #211); scoped earlier in `future-apps-scoping`. All under
  [`docs/sessions/`](../sessions/).
- **Possible sources:** the [`EXPLAINER.md`](../../src/animations/TreesAndNets/EXPLAINER.md)
  does **not** yet carry a "Possible sources & where to go further" block (a gap worth
  filling per the attribution policy). The work draws on Loday's associahedron
  realization, the GKZ secondary polytope, Devadoss's mosaic operad for M̄₀,ₙ(ℝ), and
  the private `quantum-tree` it ports.
