## What am I looking at?

One **decorated square** — the *fundamental polygon* — with two faces: **trees**
on one side, **columns** on the other. Every closed surface is a polygon with its
edges glued in pairs, and the *single knob* here is **how the square's edges glue**.

That one choice does two things at once:

- it **names the topology** (the gluing pattern), and
- it **forces the curvature** — for the glued surface to be smooth, the corner
  angles must add up, which a flat square can only manage when its Euler
  characteristic χ = 0; otherwise Gauss–Bonnet (∫K dA = 2πχ) demands the world
  curve onto a sphere.

So four gluings of the **same square** give four worlds:

| Gluing | World | χ | Shape |
|---|---|---|---|
| opposite edges, both straight | **torus** | 0 | flat |
| opposite edges, one flipped | **Klein bottle** | 0 | flat |
| opposite edges, both flipped | **projective plane** | 1 | curved |
| adjacent edges folded | **sphere** | 2 | curved |

Walk it in first person. The **mini-map** is always the fundamental square, its
edges marked with the identification arrows. On a **non-orientable** world (Klein,
ℝP²), crossing a flipped edge swaps every landmark **trees ↔ columns** and your
footprints come back **mirror-reversed** — the one-sidedness made visible.

### The curved worlds are genuinely round

The flat worlds (torus, Klein) really are isometric: the square you see *is* the
surface you walk. The curved worlds are subtler, and the difference is honest:

- **Projective plane (ℝP²).** The square folds onto the **upper hemisphere** of a
  genuinely round sphere — *isometrically*, with no hidden corners. Its lower
  hemisphere is the same square seen through the **antipodal** identification
  `x ∼ −x`, so the trees there wear columns and your trail returns mirror-reversed.
  Walk over the bright **seam** (the equator) and the mini-map flags the *mirror side*.
  The bottom-left inset shows ℝP² **immersed in 3-space** (the Steiner *Roman
  surface*) — the same surface you walk, wildly reshaped; your marker rides it, and
  because the immersion identifies antipodes, near-side and mirror-side land on the
  *same* point.
- **Sphere.** The square here is a **chart**, not an isometric copy: it is *stretched*
  over the whole round sphere (the way a flat map distorts the globe), so distances
  on the mini-map square are not the distances you walk. The world you actually move
  through is the smooth round sphere — there are **no cone points**, no creases. Any
  intrinsic measurement (how far, what angle) reads the true round-sphere metric,
  never the flattened square.

In both, **χ forces the curvature**: ∫K dA = 2πχ, so a positive χ *must* round up
onto a sphere — a flat square simply cannot close those corners.
