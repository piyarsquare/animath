# Topology Walk — the surface tour (design note)

> Status: living roadmap. The goal is to let a player **walk every closed
> surface in first person** and *feel* how its shape and geometry differ, all
> inside the one Topology Walk app. This note records the maths that organises the
> tour, the engine architecture it implies, what exists today, and the staged plan.

## 1. The one idea that organises everything

Every closed surface is a **polygon with its edges glued in pairs**. Two facts
then determine *which* surface you get and *what geometry* it must carry:

1. **Topology** comes from the gluing pattern (the edge word). The Euler
   characteristic
   $$\chi = V - E + F$$
   (vertices − edges + faces, after identification) is the invariant that names
   the surface.
2. **Geometry is forced by the corner angle budget.** For the glued surface to be
   *smooth* (no cone point) at a vertex, the polygon corners meeting there must sum
   to exactly $2\pi$. A flat (Euclidean) polygon can only satisfy this for $\chi=0$.
   Otherwise the surface is *forced* to curve, and **Gauss–Bonnet** pins the total
   curvature to a topological constant:
   $$\int_S K\,dA = 2\pi\chi.$$
   You can spread that curvature thin (a big sphere feels flat locally) but never
   remove it.

This sorts **all** closed surfaces into exactly three geometries:

| $\chi$ | Geometry | Curvature | Universal cover | Surfaces |
|---|---|---|---|---|
| $> 0$ | **Spherical** | positive | the sphere $S^2$ | sphere ($\chi=2$), $\mathbb{RP}^2$ ($\chi=1$) |
| $= 0$ | **Euclidean** | zero (flat) | the plane $\mathbb{R}^2$ | torus, Klein bottle |
| $< 0$ | **Hyperbolic** | negative | the hyperbolic plane $\mathbb{H}^2$ | genus $\ge 2$, non-orientable $N_k,\,k\ge3$ |

This is the **Uniformization Theorem**, and the polygon-walk is the most visceral
way to meet it.

## 2. The polygon ladder

More sides → more handles, but only the **$4g$-gon** closes into an orientable
genus-$g$ surface. The in-between polygons are still instructive:

| Polygon | "Standard" gluing | Surface | $\chi$ | Geometry |
|---|---|---|---|---|
| 2-gon (bigon) | $aa^{-1}$ / $aa$ | sphere / $\mathbb{RP}^2$ | 2 / 1 | spherical |
| **square** | $aba^{-1}b^{-1}$ | torus | 0 | flat |
| square | $abab^{-1}$ | Klein bottle | 0 | flat |
| square | $abab$ | $\mathbb{RP}^2$ | 1 | spherical |
| **hexagon** | opposite sides, translation | torus *(again!)* | 0 | flat |
| **octagon** | $aba^{-1}b^{-1}cdc^{-1}d^{-1}$ | genus-2 ("two-handle torus") | −2 | hyperbolic |
| $4g$-gon | standard $2g$-commutator word | orientable genus $g$ | $2-2g$ | hyperbolic ($g\ge2$) |
| $2k$-gon | $a_1a_1\cdots a_ka_k$ | non-orientable $N_k$ | $2-k$ | hyperbolic ($k\ge3$) |

Notes that matter for the app:

- **Hexagon is not a new topology** — opposite sides glued by translation give the
  *same* torus, just presented in a hexagonal fundamental domain (the hexagonal
  lattice). Its lesson is **the fundamental polygon is not unique**: one flat torus,
  many tilings. Cheap to add (reuses the Euclidean engine), purely visual.
- **The genuine two-handle torus is the octagon**, and it is **hyperbolic**: a
  regular hyperbolic octagon has $45^\circ$ corners, so eight of them fit around a
  vertex ($8\times45^\circ=360^\circ$). Its universal cover is $\mathbb{H}^2$ tiled
  by such octagons — HyperRogue territory.

### Classification (the destination)

- **Orientable:** sphere, then genus $g=1,2,3,\dots$ (add handles).
- **Non-orientable:** "**sphere with $k$ cross-caps**": $N_1=\mathbb{RP}^2$,
  $N_2=$ Klein bottle ($=\mathbb{RP}^2\#\mathbb{RP}^2$), $N_3=$ Dyck's surface, …
- Every closed surface is exactly one of these. The tour is complete once a walker
  can visit each geometry and a representative or two of each list.

## 3. Intrinsic vs. extrinsic (why "walk" ≠ "see the shape")

A subtle but design-critical point, sharpest for $\mathbb{RP}^2$:

- **Intrinsically**, the cross-cap, Steiner's Roman surface, and Boy's surface are
  the *identical* surface — $\mathbb{RP}^2$ with the round metric. **Walked in first
  person they feel exactly the same** (= walking the antipodal sphere).
- Their differences — pinch points vs. smooth, where the self-intersection runs,
  the triple point — are **purely extrinsic** (how the surface sits in 3-D). You
  only perceive them by *looking at the embedding from outside*.
- $\mathbb{RP}^2$ (and the Klein bottle) **cannot be embedded** in $\mathbb{R}^3$ at
  all; the best you get is an **immersion** that passes through itself:
  - **cross-cap** — simplest, two singular pinch points;
  - **Roman (Steiner) surface** — tetrahedral symmetry, pinch points + double lines;
  - **Boy's surface** — a *smooth* immersion (no pinch points), 3-fold symmetry, one
    triple point.

**Design consequence:** the walk gives the *intrinsic* experience; a small **3-D
embedding inset** (corner view of the chosen immersion with a "you are here"
marker) gives the *extrinsic* one. Switching the embedding while the walk feels
unchanged — *same walk, wildly different shape* — **is the lesson**. The same idea
serves the Klein bottle (figure-8 / classic immersions) and the curved torus.

## 4. Engine architecture

One app, one player layer (look/move/avatar/trail/mini-map), **three walk engines**
keyed by geometry, plus extrinsic insets:

| Engine | Geometry | Surfaces | Status |
|---|---|---|---|
| `flatEngine` | Euclidean | flat torus, Klein bottle (+ hexagonal torus) | ✅ shipped |
| `sphericalEngine` | Spherical | sphere, $\mathbb{RP}^2$ | ✅ shipped (walk core) |
| `hyperbolicEngine` | Hyperbolic | genus-2 (octagon), genus-3, $N_k$ | ⬜ planned |
| embedding insets | — | cross-cap / Roman / Boy; Klein immersions | ⬜ planned |

Shared mechanics worth noting:

- **Flat** slides an infinite tiled plane (the universal cover) under a fixed
  player; deck transforms are translations + glide-reflections.
- **Spherical** keeps the planet fixed and walks the camera around it by rotating
  the tangent frame along great circles; $\mathbb{RP}^2$ adds an antipodal
  (orientation-reversing) copy so the trail returns mirror-reversed.
- **Hyperbolic** will walk the Poincaré (or Beltrami–Klein) disk, tiling
  $\mathbb{H}^2$ with the fundamental $4g$-gon; the deck group is a Fuchsian group.
  This is the hardest piece and the natural finale.

## 5. Status & staged roadmap

- [x] Flat torus + Klein bottle (universal-cover tiling, columns↔trees skins).
- [x] Footprint model: one print per step on the side you walk; crosses to the
      underside / antipode mirror-reversed across an orientation flip.
- [x] Fundamental-domain **mini-map** (square + identified edges + player marker).
- [x] **Spherical engine**: walk the sphere and $\mathbb{RP}^2$ (antipodal).
- [ ] **Embedding inset**: cross-cap → Roman → Boy's surface, with the player's
      position dotted on the immersion. *(The headline "compare the three".)*
- [ ] **Hexagonal flat torus**: hexagonal fundamental domain + lattice + hex
      mini-map. *(Quick win; fundamental-domain non-uniqueness.)*
- [ ] **Hyperbolic engine**: genus-2 octagon walk in $\mathbb{H}^2$.
- [ ] Fill out the classification: higher genus, Dyck's surface, a "planet size"
      slider on the sphere to dial local-flatness, Klein-bottle immersion inset.

## 6. Open questions

- **Embedding inset rendering:** separate React/2-D canvas (like the current
  mini-map) vs. a second WebGL viewport with scissor (like the corridor mini-map)?
  The latter gives a real rotatable 3-D object and a live position marker.
- **Hyperbolic projection:** Poincaré disk (conformal, angles look right, lengths
  distort) vs. Beltrami–Klein (geodesics are straight chords). Likely Poincaré for
  beauty, with first-person rendered via the upper-half-space/disk isometries.
- **How far to push the classification** before it stops teaching and starts
  repeating — probably: sphere, $\mathbb{RP}^2$, torus, Klein, genus-2, and one
  higher non-orientable ($N_3$).
