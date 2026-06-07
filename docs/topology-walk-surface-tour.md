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

## 4. Euler — telling the world from inside

The mini-map and the embedding inset are **god's-eye cheats**: they show the
surface from outside. **Euler** (our walker) is an *intrinsic* being — he only ever
has his own first-person view. The richest part of the app is the set of things
Euler can *do* to deduce which world he is in without ever leaving it. The
classification of §1–2 is the answer key; these are the experiments.

### 4.1 The normal-flip — "dive through the floor"

Before Euler can run the orientation experiments he needs to deliberately reach the
**other side of the floor**: to invert his own normal (up-vector) and keep walking.
The **glass floor** already lets him *see* the underside; the flip lets him *go*
there.

- **The move:** Euler somersaults through the surface — an eased ~1 s barrel-roll /
  dive about his forward axis, camera rolling 180° as the floor sweeps past the near
  plane and the world re-renders from below. The glass floor ramps transparent
  through the dive and re-solidifies underfoot; the footprint trail stays continuous
  across the flip. (Smooth-and-interesting is the requirement, so favour an
  ease-in-out roll over a hard cut.)
- **Flat torus (orientable):** the two faces are *extrinsically* distinct — the top
  sheet vs the mirrored `under` world. Euler stays flipped until he flips back; both
  faces are the *same* torus intrinsically, but in ℝ³ they are two surfaces.
- **Klein bottle / ℝP² (non-orientable):** the punchline. Euler reaches the other
  side **two ways** — flip through the floor *deliberately*, or just **walk across a
  gluing edge**, which flips him *automatically* (the orientation reversal already
  modelled by mirror-reversed footprints). Flip through, walk an orientation-
  reversing loop, and he returns on the **starting** side: there was only ever one
  side. That is the visceral proof of one-sidedness — and it is why the flip is
  *instrument zero*, the control that makes the orientation experiments tangible.
- **Sphere / ℝP² (spherical engine):** "the other side" is the **inner shell** (the
  existing radial-mirror surface); the flip dives Euler from the outer skin to the
  inside of the planet.

### 4.2 Euler's instruments

Each probe is something Euler *does*; the observation pins down the topology or the
local geometry. All are engine-agnostic (flat / spherical / hyperbolic), so they
compose with the shared player layer:

| Euler's experiment | What he observes | What it diagnoses |
|---|---|---|
| **Walk straight, keep going** (follow a geodesic) | Do you return? after how far? facing the same way, rotated, or *mirror-flipped*? | Closedness + the holonomy of that loop → torus vs Klein (flip) vs sphere (always returns) |
| **Drop breadcrumbs / leave a trail** | Does the path cross itself? Does it come back **mirror-reversed**? | Orientability — the signature "your trail returns left-handed" |
| **Walk a triangle, sum the angles** | Excess over 180° | Local curvature sign: >180° spherical, =180° flat, <180° hyperbolic (Gauss–Bonnet, felt) |
| **Pace a circle: radius vs circumference** | Is $C < 2\pi r$, $= 2\pi r$, or $> 2\pi r$? | The same three geometries, the metric way |
| **Carry a "compass" around a loop** (parallel transport) | Does "north" come back rotated? flipped? | Holonomy = curvature enclosed; a flip = crossed an orientation-reversing path |
| **Look into the distance / shine a light** | The **hall of mirrors**: how many copies of yourself, in what lattice? | The universal cover — the arrangement of self-images *is* the gluing pattern |

The dual of §3: the embedding inset shows *"same walk, wildly different shape"* from
outside; the instruments show *"same god's-eye square, but the inside feels
different"* — torus vs Klein vs ℝP² told apart **without** the cheat view. The
hall-of-mirrors probe is partly free in the flat engine already (it tiles the
universal cover under the player), so it is the cheapest one to ship first.

## 5. Engine architecture

One app, one player layer (look/move/**normal-flip** (§4.1)/avatar/trail/mini-map),
**three walk engines**
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

## 6. Status & staged roadmap

- [x] Flat torus + Klein bottle (universal-cover tiling, columns↔trees skins).
- [x] Footprint model: one print per step on the side you walk; crosses to the
      underside / antipode mirror-reversed across an orientation flip.
- [x] Fundamental-domain **mini-map** (square + identified edges + player marker).
- [x] **Spherical engine**: walk the sphere and $\mathbb{RP}^2$ (antipodal).
- [ ] **Normal-flip — "dive through the floor"** (§4.1): Euler somersaults to the
      opposite face, up-vector inverted — deliberate access to the other side (one
      side on Klein/ℝP², two faces on the torus, inner shell on the sphere). Smooth
      eased roll. *(Instrument zero — prereq for the orientation experiments.)*
- [ ] **Euler's instruments** (§4.2): intrinsic probes — straight-line return,
      mirror-reversed trail, triangle angle-sum, circle radius↔circumference,
      compass holonomy, hall-of-mirrors. *(Tell the world from inside; start with
      hall-of-mirrors — nearly free in the flat engine.)*
- [ ] **Embedding inset**: cross-cap → Roman → Boy's surface, with the player's
      position dotted on the immersion. *(The headline "compare the three".)*
- [ ] **Hexagonal flat torus**: hexagonal fundamental domain + lattice + hex
      mini-map. *(Quick win; fundamental-domain non-uniqueness.)*
- [ ] **Hyperbolic engine**: genus-2 octagon walk in $\mathbb{H}^2$.
- [ ] Fill out the classification: higher genus, Dyck's surface, a "planet size"
      slider on the sphere to dial local-flatness, Klein-bottle immersion inset.

## 7. Open questions

- **Embedding inset rendering:** separate React/2-D canvas (like the current
  mini-map) vs. a second WebGL viewport with scissor (like the corridor mini-map)?
  The latter gives a real rotatable 3-D object and a live position marker.
- **Hyperbolic projection:** Poincaré disk (conformal, angles look right, lengths
  distort) vs. Beltrami–Klein (geodesics are straight chords). Likely Poincaré for
  beauty, with first-person rendered via the upper-half-space/disk isometries.
- **How far to push the classification** before it stops teaching and starts
  repeating — probably: sphere, $\mathbb{RP}^2$, torus, Klein, genus-2, and one
  higher non-orientable ($N_3$).
