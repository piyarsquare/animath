## What am I looking at?

A **decorated polygon** — the *fundamental polygon* — with two faces: **trees**
on one side, **columns** on the other. Every closed surface is a polygon with its
edges glued in pairs, and the *single knob* here is **how the edges glue**.

That one choice does two things at once:

- it **names the topology** (the gluing pattern), and
- it **forces the curvature** — for the glued surface to be smooth, the corner
  angles must add up, which a flat polygon can only manage when its Euler
  characteristic χ = 0; otherwise Gauss–Bonnet (∫K dA = 2πχ) demands the world
  curve — onto a **sphere** when χ > 0, into the **hyperbolic plane** when χ < 0.

So different gluings give different worlds:

| Gluing | World | χ | Shape |
|---|---|---|---|
| square, opposite edges, both straight | **torus** | 0 | flat |
| square, opposite edges, one flipped | **Klein bottle** | 0 | flat |
| square, opposite edges, both flipped | **projective plane** | 1 | spherical |
| square, adjacent edges folded | **sphere** | 2 | spherical |
| octagon `aba⁻¹b⁻¹cdc⁻¹d⁻¹` | **double torus** (genus 2) | −2 | hyperbolic |
| hexagon `aabbcc` | **three cross-caps** (Dyck) | −1 | hyperbolic |

Walk it in first person. The **mini-map** is always the fundamental square, its
edges marked with the identification arrows. Your footprints are **ink on the
sheet**: each print points along your walk, and the trail tiles seamlessly
across the gluing. On a **non-orientable** world (Klein, ℝP²), crossing a
flipped edge carries you to the **other side of the sheet**: every landmark
swaps **trees ↔ columns**, and your old footprints now show **through the glass
floor, mirror-reversed** — you never become mirrored; you are simply looking at
the back of your own ink.

### Through the glass: backwards, or just upside-down?

Don't take the decor's word for it — **plant your own sign** (the Sign panel):
a glass plaque with *your* text, a different ink on each face — amber on the
front, cyan on the back. Walk around it; each ink reads straight from its own
side and ghosts through the other side reversed. Then cross a flipped edge and
find the sign again: it hangs from the other face now, and you read its inks
through the floor.

Any flat sign read from its back is **mirror-reversed** — try it on the torus:
the Roman numerals under the glass read backwards, and nothing topological has
happened. *Which* axis looks flipped depends on how you got underneath (pitch
over: left–right; walk around: top–bottom — the two readings differ by a
half-turn), but the reversal itself is unavoidable. Turning a plaque over is a
**rotation** of space whose shadow on the sheet is a **reflection** — that one
fact is the whole Klein-bottle gluing. And glass never mirrors *things*: a
column behind the floor is just a column; only ink read from behind reverses.
The topology enters exactly here: on the torus your own footprints can never
end up behind the glass — on the Klein bottle, ℝP², and the cross-cap worlds,
they must. Meeting your own backwards footprints under the floor is the
certificate that your world is non-orientable.

### The curved worlds are genuinely round

The flat worlds (torus, Klein) really are isometric: the square you see *is* the
surface you walk. The curved worlds are subtler, and the difference is honest:

- **Projective plane (ℝP²).** The square folds onto the **upper hemisphere** of a
  genuinely round sphere — *isometrically*, with no hidden corners. Its lower
  hemisphere is the same square seen through the **antipodal** identification
  `x ∼ −x`, so the trees there wear columns and the trail's antipodal image is
  its mirror twin — on the **other face**, hanging under the glass.
  Walk over the bright **seam** (the equator) and the mini-map flags the *other face*.
  The bottom-left inset shows ℝP² **immersed in 3-space** (the Steiner *Roman
  surface*) — the same surface you walk, wildly reshaped; your marker rides it, and
  because the immersion identifies antipodes, both faces land on the
  *same* point.
- **Sphere.** The square here is a **chart**, not an isometric copy: it is *stretched*
  over the whole round sphere (the way a flat map distorts the globe), so distances
  on the mini-map square are not the distances you walk. The world you actually move
  through is the smooth round sphere — there are **no cone points**, no creases. Any
  intrinsic measurement (how far, what angle) reads the true round-sphere metric,
  never the flattened square.

In both, **χ forces the curvature**: ∫K dA = 2πχ, so a positive χ *must* round up
onto a sphere — a flat square simply cannot close those corners.

### The hyperbolic worlds (χ < 0)

A double torus or a multi-cross-cap surface has χ < 0, so by Gauss–Bonnet it must
carry **negative** curvature: it lives on the **hyperbolic plane**, drawn here in
the **Poincaré disk**. You stand at the center and the whole tiling flows past as
you walk — the glowing boundary circle is *infinitely far away*, so no matter how
far you go you never reach it, and landmarks shrink as they recede (that shrinking
*is* the negative curvature: there is exponentially more room out there than a flat
plane has). Each tile is one more copy of the fundamental polygon; the mini-map
shows that polygon with its edge identifications. On the non-orientable cross-cap
worlds the glide tiles wear the **other face's** skin — columns and Roman plates,
upright; the reversed numbers are underneath, through the glass.
