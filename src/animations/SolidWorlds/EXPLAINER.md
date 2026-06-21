## What am I looking at?

A **closed 3-manifold** — a whole universe you can walk, from the inside. The
fundamental domain is a **cube**, and the *one knob* is **how its faces glue in
pairs**, exactly the Polygon Worlds idea one dimension up: there a closed surface
was a polygon with its edges glued; here a closed 3-manifold is a polyhedron with
its **faces** glued.

Walk out through any wall and you re-enter through the partnered wall, transformed
by that gluing. So a single cubic room **repeats forever** in all directions — look
through a face and you see the next copy, and the next, receding away.

### The one thing that's different from 2D

In Polygon Worlds, the Euler characteristic χ chose the geometry. **In 3D that's
gone** — every closed 3-manifold has χ = 0, so χ says nothing. (Geometry is forced
*locally* instead, by the angles around each glued edge; the curved worlds that
needs are a later chapter — these worlds are all flat.) What names a world here is
its **first homology** H₁, computed from the gluing and shown in the World panel.

What survives, and becomes the star, is **orientation** — and the worlds sort into
a telling ladder of what a loop can do to you:

- **3-Torus.** All three face pairs glued by straight translations. Walk any
  loop and you come back exactly as you left. Orientable.
- **Half-turn & Quarter-turn spaces.** The top and bottom glue with a **rotation**
  (180° / 90°), so walking the up-down loop brings the world back **spun**. But a
  spin is *cosmetic*: you can always turn your own body to match it. The readout
  says **ROTATED**, never mirrored — orientation is preserved (you can still tell
  left from right).
- **Klein × Circle** (an *amphicosm*). One face pair is glued with a **flip** (a
  glide-reflection); the other two straight. Walk the **x-loop once** and the whole
  world — the room, the sign, and **your own footprints** — comes back
  **mirror-reversed**. Walk it twice and you're restored. Walk the y- or z-loop and
  nothing flips.

- **The fuller catalog** (*amphicosms*, *amphidicosms*, and the **Hantzsche–Wendt**
  manifold). Beyond the headline worlds, the cube can be glued into most of the
  **ten flat 3-manifolds** (the *platycosms*) — every one except the two that need
  a hexagonal prism. The non-orientable amphi-worlds add mirror loops; the
  orientable **Hantzsche–Wendt** world (two perpendicular half-turn screws) is the
  rare one with **finite first homology** (H₁ = ℤ/4 ⊕ ℤ/4) — no direction is a
  simple repeat. Each world's invariants are computed from its gluing: **H₁ from
  the deck group's abelianization**, and a **free-action test** decides whether the
  quotient is a genuine manifold rather than a cone-point orbifold.

That contrast is the lesson: a **rotation you can undo** by reorienting; a
**reflection you cannot**. Only the second is a real, un-fixable property of the
loop — and even *which way* the mirror looks flipped is a matter of how you're
standing. The handedness readout draws the line: *original* · *rotated N°* ·
*mirrored*.

### Read it off your own footprints (and the sign)

Your trail stamps an **F** with an arrow, cyan on its left, magenta on its right.
In a surface you could only see it reversed by stepping to the *other side of the
sheet* — but a 3-manifold has **no other side** (you're not on a surface, you're
*inside* a space). So there is no normal to absorb the flip: it lands on **you**.
After the x-loop, your old prints read backwards and **no turning of your head puts
them right** — that is the difference between a mirror image and a rotation. The
solid two-sided **FRONT / BACK** sign tells the same story: walk the mirror loop
and its front face — still the front — comes back with its letters flipped
left-for-right (its solid core keeps either side's letters from bleeding through
to the other, so the only reversal you see is the real one).

The **handedness** readout names it: *original* or *mirrored*. The honest subtlety
is that **the flip has no location** — it's the loop's property (a global
holonomy), not any one doorway's. The per-step determinant reads +1 the whole way:
nothing *local* ever happened. You didn't flip *somewhere*; you came back mirrored.

### Two ways to furnish the room (Decor)

The **View** panel has a **Decor** switch. *Diagnostic* is the proof-of-the-math
scene: neutral landmark props and the FRONT/BACK sign, sized so a copy and its
mirror are obvious. *Rooms* instead furnishes the fundamental cube as a
**recognizable room** — a rug, a desk with a lamp, a fireplace, a framed picture,
a chandelier, a WELCOME sign — inside **walls that are solid but faintly
translucent** (a hint of the surrounding copies glows through), where the
connections between rooms happen at **archways**: each wall has one archway, the
floor and ceiling a hole, all placed **off-center**. The room is built once and tiled across
the cover, so each opening on a far wall is your near opening carried through that
pairing's gluing. Off-center is the point: a gluing fixes the center of the face
it acts through, so a centered opening would hide the very turn or mirror you want
to see — placed off-center, the archway visibly jumps to a new corner (turn
worlds) or flips side (glide worlds), and in worlds whose gluing tips vertical to
horizontal the ceiling hole lands where a wall arch was (the chandelier ends up on
a wall). Solid walls also stage the surprise: you don't see how the next room is
arranged until you step through the arch — and it isn't how you thought. That
mismatch *is* the shape of the space. (Keep **Cover depth** low for the quiet
single room; raise it for the deep hall of copies.)

### Possible sources & where to go further

This world was reasoned out from the glued-polyhedron picture, but it sits among
well-trodden ideas — pointers if you want to go deeper (paths to follow, not
priority claims):

- **Jeff Weeks, *Curved Spaces*** — a flight simulator for multiconnected
  universes (the 3-torus, lens spaces, the Poincaré dodecahedral space); the
  closest ancestor of this app.
- **Jeff Weeks, *The Shape of Space*** — the canonical book on closed 3-manifolds
  as glued polyhedra, orientability, and the "there is no outside" point of view;
  its *Torus Games* is the 2D sibling that Polygon Worlds descends from.
- **J.H. Conway & J.P. Rossetti, *Describing the Platycosms*** (and *Hearing the
  Platycosms*) — the naming and classification of the ten closed flat 3-manifolds
  used here (torocosm, dicosm, tetracosm, the amphi-worlds, the Hantzsche–Wendt
  *didicosm*); the source to check the per-world first-homology values against.
- **Hantzsche & Wendt (1935)** — the original construction of the orientable flat
  manifold with finite first homology, the catalog's headline screw world.
- **"Not Knot"** (Geometry Center) and **Segerman & Hart's non-Euclidean VR** —
  the curved-space (hyperbolic / spherical) renderings this app's later chapters
  aim toward.
- For the *feel* (impossible, repeating architecture) rather than the math:
  *Manifold Garden*, *Antichamber*, and the shifting spaces of *Control* — scripted
  rather than genuine quotients, but the same uncanny pull.
