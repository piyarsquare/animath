# Number Plane

One expression, three arithmetics.

A plane becomes a number system once you say how to multiply. Demand the ordinary
rules (distribute, have a 1) and the whole choice collapses to a single number:
what `j²` equals — call it `p`. Three signs, three worlds:

- `p = −1` — **complex**: multiplying turns the plane (spin).
- `p = 0` — **dual**: it shears.
- `p = +1` — **split**: it squeezes.

The three plots render the **same expression** under each plane's own
multiplication:

- **α₁z + α₀** — `y = mx + b`, promoted to the plane. The grid turns, shears,
  or squeezes (then slides). Drag `α₁` and `α₀` on any plot; all three share them.
- **α₂z² + α₁z + α₀** — the quadratic: the `α₂` term bends the plane.

**Marks** can overlay the **level sets** `|z| = r` of each plane's magnitude
`√|x² − p·y²|` — circles · vertical line pairs · hyperbolas, with `|z| = 1`
bold: each plane's version of "the unit circle." The dashed **null set**
(`|z| = 0`) marks the numbers nothing multiplies back to `1`.

**Feeds.** For the map expressions, feed them a **Point** (a draggable white `z`
— for `z²` it is literally the thing being squared — with its image `f(z)`, and
an **Iterate** slider that chains `f` and shows the same `z` spiraling in the
complex plane, shearing in the dual, and saddling in the split), a **Shape**
(circle · square · triangle, draggable by its center handle), a **Grid**, or
**Rays** — the fan of lines through 0, each a copy of the real number line
`t·(a + bj)`, colored so you can track which blade lands where. Multiplication
shuffles the fan: at `p < 0` every blade turns (no fixed line); at `p = 0` one
blade holds; at `p > 0` the two rails hold and the rest crowd onto them — the
rails are absorbing lines (ideals), and a plane is a field exactly when its fan
has none. Set `α₀ = 0` to see the pure shuffle.
The **t** slider (and ▶ Play) morphs source → image — not by teleporting in a
straight line, but along the multiplication's **own flow** `z·αᵗ`: a spiral arc,
a shear, a boost (drawn dotted for the Point feed). Where that angle honestly
doesn't exist (the null set) the path falls back to a straight blend.

**Zoom & pan.** Mouse: scroll to zoom, drag empty space to pan. Touch: one
finger moves points; **two fingers pan and zoom** (so grabbing a point never
drags the plane). All three plots share one window so they stay comparable.
Double-click / double-tap (or ⟲ Reset view) to come home.

**The dial.** One `p` knob: the outer plots show `j² = −p` and `+p` while the
dual plane holds still between them; turn toward 0 and both worlds flatten
into it.

**The cone.** A second view slices the double cone `z² = x² + y²` (the norm
form one dimension up) with a knife `z = ax + c`. The section's quadratic part
is the norm form with **`p = a² − 1`** — the knife's tilt IS the dial: `a = 0`
circle, `a = 1` parabola (one escape route along the cone's lines), `a = √2`
hyperbola (two). High school's conic sections were choosing an arithmetic all
along.

**Align frame to rails.** A change-of-basis slider that realigns the boost
plot's frame onto its asymptotes — at 100% the hyperbolas sit square and its
multiplication is visibly two independent stretches (`ℝ×ℝ` undisguised). The
complex plane doesn't move: it has no real rails to align. That failure is
the heart of the story.

The dashed lines are the **null set**: numbers with `|z| = 0` that nothing
multiplies back to `1`. The complex plane has none (only the origin) — that is
what makes it a field, and the start of why it is special.

---

## Possible sources & where to go further

- **I. M. Yaglom, *Complex Numbers in Geometry*** and *A Simple Non-Euclidean
  Geometry and Its Physical Basis* — the classic treatment of complex, dual, and
  split-complex numbers as three parallel plane geometries; the closest prior art
  for this side-by-side trichotomy.
- **W. K. Clifford** introduced dual numbers (1873); the split-complex plane goes
  back to James Cockle's *tessarines* (1848). The names vary wildly across the
  literature (double, perplex, hyperbolic numbers).
- **Tristan Needham, *Visual Complex Analysis*** — the spirit of "see the
  multiplication" that this app borrows, applied to the `p = −1` column.
- The `p`-parameterized family is sometimes treated as the "generalized complex
  numbers"; see Harkin & Harkin, *Geometry of Generalized Complex Numbers*
  (Mathematics Magazine, 2004).
