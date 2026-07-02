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

- **|z| = r** — the level sets of each plane's magnitude `√|x² − p·y²|`:
  circles · vertical line pairs · hyperbolas. The bold curve is `|z| = 1`,
  each plane's version of "the unit circle."
- **αz + β** — `y = mx + b`, promoted to the plane. The grid turns, shears, or
  squeezes (then slides). Drag `α` and `β` on any plot; all three share them.
- **z²** — the same square, three ways.

**Feeds.** For the map expressions, feed them a **Point** (a draggable white `z`
— for `z²` it is literally the thing being squared — with its image `f(z)`, and
an **Iterate** slider that chains `f` and shows the same `z` spiraling in the
complex plane, shearing in the dual, and saddling in the split), a **Shape**
(circle · square · triangle), or a **Grid**. The **t** slider (and ▶ Play)
morphs source → image so you watch the transformation happen.

**The dial.** One `p` knob: the outer plots show `j² = −p` and `+p` while the
dual plane holds still between them; turn toward 0 and both worlds flatten
into it.

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
