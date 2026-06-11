---
kind: progress
session: 2026-06-10-S01
date: 2026-06-10
title: Trees and Nets — whole-associahedron representation
branch: claude/trees-and-nets
slug: trees-and-nets
status: in-progress
build: unknown
followup: null
pr: null
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
