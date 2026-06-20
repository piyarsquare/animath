# The Solid Worlds "screw bug" — what it was, why it happened, and how it was fixed

*Written 2026-06-20, when the bug was fixed. This is a deliberately slow,
self-contained account: it assumes you remember roughly what a manifold and a
group are, but nothing more recent than an undergraduate course you took a long
time ago. If you live and breathe algebraic topology, skip to
[The bug, precisely](#3-the-bug-precisely).*

---

## 0. The thirty-second version

Solid Worlds builds a **closed flat 3-manifold** by gluing the opposite faces of
a cube, and then computes two topological invariants to label it. One of the two
ways it computes those invariants — the **cube cell complex** in
[`lib/homology.ts`](lib/homology.ts) — was silently wrong on the worlds whose
gluing involves a **screw** (a glue-with-a-sideways-shift). Two of the eight
catalog worlds (the **second amphidicosm** and the famous **Hantzsche–Wendt**
manifold) therefore shipped flagged *experimental*. The fix repairs the cell
engine so all eight worlds are confirmed by **both** independent methods. There
were actually **two** distinct defects hiding under one symptom; most of this
document is about telling them apart.

---

## 1. The objects, for someone thirty years out

### 1.1 A flat 3-manifold from a glued cube

Take a solid cube. Now declare that when you walk out through the right face you
instantly reappear at the left face, out the top you reappear at the bottom, out
the front you reappear at the back. That rule — **glue each face to the face
across from it** — turns the cube into a space with no walls: a closed
(boundaryless) 3-dimensional world you can walk around inside forever. The
simplest such gluing (straight across, no twist) is the **3-torus**, the 3D
version of the wrap-around screen in *Asteroids*.

It is **flat** because the geometry inside is ordinary Euclidean geometry —
angles of a triangle sum to 180°, the cube's corners are honest right angles.
There are exactly **ten** closed flat 3-manifolds, classified by Bieberbach in
1911; they're nicknamed the **platycosms** (Conway). Eight of the ten can be
built from a cube (the other two need a hexagonal prism), and those eight are the
Solid Worlds catalog.

You get the *different* worlds by gluing with a **motion** other than a plain
slide:

- a **rotation** (glue the top to the bottom only after turning it 90° or 180°),
- a **mirror reflection** (glue with a flip — this makes the world
  *non-orientable*, like a 3D Klein bottle: walk a loop and you come back as your
  own mirror image), and
- a **screw**: a rotation-or-reflection **plus a sideways shift along the face**.
  Picture sliding a deck of cards as you glue — the top doesn't land squarely on
  the bottom, it lands *offset*. The screw is the troublemaker in this story.

### 1.2 The "deck group" Γ

Instead of thinking of one cube with glued faces, you can think of **infinitely
many copies of the cube tiling all of space** (ℝ³), where stepping across a glued
face takes you into the neighboring copy. The set of rigid motions of space that
map this infinite tiling to itself — "shift one cube right," "shift up and turn
90°," and all their combinations — forms a group, the **deck group** Γ. The
manifold *is* the quotient ℝ³/Γ: space, with two points considered "the same" if
some motion in Γ carries one to the other. Each catalog world is just a different
Γ. Almost everything below is really a statement about Γ.

A subtlety we'll need: Γ contains a sub-lattice **L** of pure translations (the
"shift by whole cubes" motions), and the rest of Γ is built from L plus the
**point group** H of rotations/reflections (forget the translation part of each
motion and you get a finite group H — for a cube world, things like "the identity
and a 180° turn"). A motion in Γ is *free of fixed points* exactly when it never
pins a point in place; the quotient is a genuine **manifold** (smooth, no sharp
cone-points) **iff every non-identity motion in Γ is fixed-point-free** — iff Γ
**acts freely**. (A rotation that *does* fix a line would leave a cone-edge
singularity; the quotient would be an **orbifold**, not a manifold.)

### 1.3 The two numbers we compute

To tell the worlds apart we compute two classical invariants.

- **The first homology group H₁.** Informally, H₁ records the **independent loops
  in the world that can't be shrunk to a point**, together with how loops can be
  "added," and — crucially — any loop that *isn't* shrinkable but becomes
  shrinkable when traversed *k* times (that shows up as a **torsion** summand
  ℤ/k). For the 3-torus, H₁ = ℤ³ (three independent unshrinkable directions, none
  torsion). For the Hantzsche–Wendt manifold, H₁ = ℤ/4 ⊕ ℤ/4 — *purely* torsion,
  no free ℤ at all, meaning **no direction is a simple repeat**; every loop, gone
  around four times, contracts. That finiteness is what makes Hantzsche–Wendt
  famous. Algebraically, H₁ is the **abelianization** of the fundamental group;
  for these worlds the fundamental group is Γ, so **H₁ = Γ made abelian**, written
  **Γᵃᵇ**.

- **The Euler characteristic χ.** The alternating count
  *χ = (vertices) − (edges) + (faces) − (solids)* of any cell decomposition. It's
  a topological invariant (you get the same number no matter how you chop the
  space into cells). A basic theorem: **every closed odd-dimensional manifold has
  χ = 0.** So for any of our 3-manifolds, χ *must* come out 0. That makes χ a
  cheap, ruthless sanity check: **if your computation says χ ≠ 0, your
  computation is broken** (or the thing you built isn't a closed manifold).

### 1.4 The "vertex link" — how a cell complex checks it's really a manifold

Chop the world into cells (here: little cubes). Pick a vertex. The **link** of
that vertex is the little sphere you'd see if you stood at the vertex and looked
around at all directions leading away from it — concretely, the surface formed by
the faces of the surrounding cells "just before" they reach the vertex. In a
genuine 3-manifold, every point looks locally like ordinary 3D space, so **every
vertex link must be an ordinary 2-sphere S²**. If some vertex's link comes out as
something else (two spheres touching, a torus, a pinched surface…), the cell
complex is *not* a manifold there. We test "is it an S²?" cheaply: a closed
surface is a sphere iff it's connected and has **Euler characteristic 2**
(V − E + F = 2 on the link). An octahedron — the natural link of a vertex in a
cubical grid — has 6 vertices, 12 edges, 8 faces: 6 − 12 + 8 = 2. ✓

> [!NOTE]
> The vertex-link test detects *broken gluings*, but it is **not** a reliable
> manifold-vs-orbifold detector — a rotational cone-point happens to have a link
> that is still topologically a sphere. The authoritative manifold certificate is
> the group-theoretic **free-action** test in
> [`lib/freeness.ts`](lib/freeness.ts). In this app the vertex-link test plays a
> narrower role: it's the cube cell complex's *internal* check that it assembled a
> closed manifold, used only as a cross-check of the trustworthy Γᵃᵇ answer.

### 1.5 Two engines, on purpose

Solid Worlds computes H₁ **two independent ways** and only claims a world
"verified" when they agree:

1. **Γᵃᵇ** ([`lib/freeness.ts`](lib/freeness.ts)) — pure group theory. Build Γ's
   generators and relations, abelianize, take the Smith normal form. No cubes, no
   cells. This is the *definition* of H₁, so it is the **authoritative** answer,
   and it is **screw-safe** (a screw is just another group element).

2. **The cube cell complex** ([`lib/homology.ts`](lib/homology.ts)) — chop the
   cube into an N×N×N grid, glue the boundary cells according to Γ, and read H₁,
   χ, and the vertex links off the resulting chain complex with integer linear
   algebra. This is the **cross-check** — and it's the engine that had the bug.

Two engines that agree is much stronger evidence than one engine you trust. The
bug meant engine #2 disagreed with engine #1 on the screw worlds, so those worlds
couldn't be marked dual-verified.

---

## 2. What "the screw" does to the cube complex

Engine #2 works in a cube subdivided into an N×N×N grid of little sub-cubes, and
identifies boundary cells that Γ glues together. For a **straight or pure-rotation
gluing**, the right face lands squarely on the left face: sub-cell *i* on the
right glues to sub-cell *i* on the left, cleanly.

A **screw** spoils that squareness. The catalog's screws are **perpendicular**:
the glue-shift is *sideways*, along the face, by **half a cube**. So when the −y
face is glued across to the +y face, its image is **slid half a period in z**.
Half of that image lands on the +y face as expected; the **other half slides off
the top edge and has to wrap around** through a *second* face-pairing (the
straight z-gluing) before it lands back inside the cube. The image of one face is
no longer one face on the opposite side — it **straddles the boundary** and must
be "reduced" back into the cube by composing two gluing motions.

That reduction step is where both bugs lived.

---

## 3. The bug, precisely

Instrumenting the engine on all eight worlds turned up **two independent
defects** that the earlier note had lumped together as "an orientation/vertex-link
error":

### Bug A — the gluing "bounce" (a wrong Euler characteristic)

**Symptom.** The second amphidicosm reported **χ = 1**, not 0. Since every closed
3-manifold has χ = 0, the complex it built was *not closed* — it had a leftover
boundary. Dumping the face-classes showed exactly **four boundary faces left
unglued** (each sitting alone in its own class instead of paired with a partner),
all of them in the screw region of the y-gluing.

**Root cause.** To glue the −y face, the engine applied the y-pairing motion and
then **reduced the (straddling) image back into the cube by a breadth-first
search** over the gluing motions, *returning the first in-cube cell it found*.
The catch: among the motions it tries is the **inverse of the very pairing it
just applied** — and applying that inverse simply **undoes the step**, landing
back on the **source face itself**, which is (trivially) already inside the cube.
The search tried that inverse (`inv_y`) *before* the motion that would have
wrapped the straddling image correctly (`inv_z`). So it "reduced" the image to its
own starting face and recorded `glue(face, face)` — a **no-op**. The face was
never glued to its true partner, and so it survived as a phantom boundary face. ✗

This is a genuine **algorithmic bug, independent of how finely you subdivide**: it
reproduced at N = 2 and N = 4 alike. (It also explains why the symptom was a
clean off-by-one in χ — exactly four dangling faces, each contributing a spurious
bit of boundary.)

> [!CAUTION]
> The trap is subtle because the "return the first in-cube representative you
> find" strategy is correct for a *plain* gluing — there, the image lands on the
> partner immediately and there's nothing to wrap. The screw is the first case
> where the image leaves the cube, and the moment it does, "first representative"
> can be the source you started from.

### Bug B — the vertex link is too coarse (a false manifold rejection)

**Symptom.** *Both* screw worlds (second amphidicosm **and** the Hantzsche–Wendt
didicosm) failed the vertex-link S² certificate at the default subdivision N = 2.
The link came out with the wrong Euler characteristic (5 instead of 2) and with
link-edges shared by *four* link-faces instead of two — a **pinched, non-spherical
link**. Notably, the didicosm failed this test *even though its H₁ and χ were
already correct* — so this defect is separate from Bug A.

**Root cause.** Coarseness. With the half-cube screw, an N = 2 grid is so coarse
that the link of a vertex **folds onto itself**: two different directions out of
the vertex get carried onto the *same* grid cell by the screw, gluing two corners
of the octahedral link into one and pinching the sphere. The underlying space is
a perfectly good manifold — its links *are* spheres — but the **triangulation is
too coarse to see it** (the screw offset is exactly half the grid step, the
worst possible alignment). **At N = 4 the link is a clean octahedral sphere and
the certificate passes** for both worlds. So Bug B is **not** a real topological
defect; it's a sampling artifact, fixed by refining the grid.

| | second amphidicosm | didicosm (Hantzsche–Wendt) |
|---|---|---|
| Bug A (unglued faces → χ = 1) | **yes** | no (χ was already 0) |
| Bug B (pinched link at N = 2) | yes | **yes** |

Two bugs, overlapping but distinct — which is why "fix the orientation sign" (the
original one-line guess) was never going to be the whole story.

---

## 4. The fixes

Both live in [`lib/homology.ts`](lib/homology.ts).

### Fix A — glue by the *whole orbit*, not the first match

Replace "apply the pairing, reduce to the first in-cube representative, glue" with
a symmetric rule: a cell is glued to **every** cell in its Γ-orbit that also lies
in the cube. The new `orbitInCube(cell)` breadth-first-searches the orbit (within
a one-cube margin — enough for any screw whose shift is ≤ one edge, which covers
every platycosm) and returns **all** in-cube members with their orientation signs;
the cell is then `union`-ed with each. Because it collects the *whole* in-cube
orbit instead of stopping at the first hit, the harmless "bounce back to source"
is just one member of the list and the **true partner is always included too**.
No more dangling faces; χ returns to 0. The orientation self-check ∂₂∘∂₁ = 0
(already in the engine) independently confirms the signs survived the rewrite.

### Fix B — subdivide screw worlds finely enough to see the sphere

`chooseN` now returns a **finer grid for screw worlds**: twice the minimal grid
that makes the offsets land on integer sub-edges. For the catalog's half-cube
screws that's N = 4 — empirically the first subdivision at which both screw
worlds' vertex links are honest spheres. Because **H₁ and χ are
subdivision-invariant** (a theorem — refining the cells can't change the
homology), this is a free move: it repairs the link triangulation without
touching any homology value.

### A guard, while we're here — the validity boundary

Hunting the bug surfaced a sharper statement of *when the cube method is even
allowed*. The method assumes **the cube is a single fundamental domain** — i.e.
each pairing's net translation along its own axis is exactly one cube edge. A
**fractional axial offset** (a shift component *along* the pairing's own axis, as
opposed to the catalog's purely *perpendicular* screws) would shrink that
translation below one edge, making the cube a **multi-fold cover** rather than a
fundamental domain; the cell counts would then over-count and χ would be
meaningless (a stress-test input produced χ = −48 this way). Every cube platycosm
uses only perpendicular screws, so the catalog is unaffected — but the engine now
**throws on a fractional axial offset** rather than silently returning a wrong
number, and the file header documents the boundary. The genuine (non-cube)
manifold certificate remains the free-action test in
[`lib/freeness.ts`](lib/freeness.ts); the cube complex is the cross-check **on its
home turf**, and now it says so out loud.

---

## 5. Result

All eight catalog worlds are now **dual-verified**: the cube cell complex agrees
with Γᵃᵇ on H₁, reports χ = 0, and certifies every vertex link as an S². The two
screw worlds — the second amphidicosm (H₁ = ℤ ⊕ ℤ/4) and the Hantzsche–Wendt
didicosm (H₁ = ℤ/4 ⊕ ℤ/4) — drop their *experimental* flag. The world picker's
status line now reads "cross-checked: the glued-cube cell complex agrees" for
every world.

Tests guarding all of this live in
[`__tests__/gab.test.ts`](__tests__/gab.test.ts) (catalog values, the
dual-verification gate) and
[`__tests__/solidSchema.test.ts`](__tests__/solidSchema.test.ts) (per-world H₁ /
χ / link, subdivision invariance, the second-amphidicosm "no leftover boundary"
regression, and the axial-offset rejection).

### Possible sources & where to go further

- **John H. Conway & Juan Pablo Rossetti, *Describing the Platycosms*** (2003,
  arXiv:[math/0311476](https://arxiv.org/abs/math/0311476)) — the naming and the
  invariant tables for all ten flat 3-manifolds; the reference Solid Worlds leans
  on for the catalog.
- **W. Hantzsche & H. Wendt** (1935) — the original construction of the
  orientable flat 3-manifold with finite first homology, the didicosm's namesake.
- **L. Bieberbach** (1911/1912) — the theorems that there are finitely many flat
  manifolds in each dimension and that their fundamental groups are exactly the
  torsion-free crystallographic groups; the structural backbone behind Γ, its
  translation lattice L, and the point group H.
- Any first course's treatment of **simplicial/cellular homology and the Smith
  normal form** (e.g. Hatcher, *Algebraic Topology*, §2.1–2.2) covers the
  boundary maps ∂₁, ∂₂ and how their Smith forms give the ranks and torsion this
  file computes.
