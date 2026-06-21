# Argand Plane

A complex number is a **point in the plane**. Write it as `a = x + iy` (across by
`x`, up by `y`), or by its **length and angle**, `a = r · e^{iθ}` — the same point,
two descriptions. This app lets you **grab two numbers** and watch what arithmetic
*does* to them.

## What you're looking at

- Drag the <b>a</b> (cyan) and <b>b</b> (orange) handles anywhere on the plane.
- The **Values** panel shows each number both ways — rectangular `x + iy` and polar
  `r · e^{iθ}`.
- The green vector is the **result**, `a·b` or `a+b`.

## Add vs. Multiply (the two modes)

- **Add** — `a + b` is **tip-to-tail**: slide `a` along `b` (or `b` along `a` — same
  destination, which is the parallelogram you see). Scrubbing **t** slides smoothly
  from `a` to `a+b`.
- **Multiply** — `a · b` **adds the angles and multiplies the lengths**:
  `r_a r_b · e^{i(θ_a + θ_b)}`. Scrubbing **t** doesn't cut a straight line — it
  **spirals**, swinging `a` through the angle of `b` while its length scales by `|b|`.
  Try `b = i`: multiplying is a quarter-turn. Try `b = −1`: a half-turn.

> The straight-line "shortcut" would be a lie for multiplication — with `b = −1` it
> would drag the point through the origin. The spiral is the honest path.

## Shapes transform too (Number → Curve)

Switch **Transform a** to **Curve**: now `a` *places* a whole shape (a flag, circle,
square or segment) and `b` is the constant you combine it with. **Multiply** spins and
scales the entire figure about the origin — the asymmetric flag makes the rotation (and
its handedness) obvious; **Add** slides the whole shape by `b`. It's the same per-point
spiral/slide as for a single number, applied to every point of the curve at once — the
bridge from "one number" to "a function acts on the whole plane."

The faint **arcs** are each point's honest path to its image — a spiral for **multiply**,
a straight slide for **add** — so the whole journey is visible standing still. **Press
Play** (or scrub) to sweep the entire shape along those arcs from original to image.

## The whole plane moves (Curve → Plane)

Switch **Transform a** to **Plane**: now the entire integer grid is the subject. Drag
`b` and the whole grid morphs by the map `z ↦ z·b` (or `z + b`). The faint grid left
behind is the **identity** — the plane before the map — so you can see exactly what
moved. Your number `a` rides along as a labeled probe, tying this back to the first
chapter: *what multiply-by-`b` does to `a` is the same thing it does to every point at
once.*

Because multiply and add are **linear**, straight grid lines stay straight: **multiply**
is a single rotation-and-scaling (a *similarity*) of the whole plane about the origin,
and **add** is a rigid translation. This is the bridge to a *function* deforming the
plane — when the map stops being linear, those grid lines start to curve (the next
tool's territory).

## Multiplication as repeated addition (the Repeat view)

In ordinary arithmetic `a·n` is `a + a + ⋯ + a`. Switch **View** to **Repeat** and drag
`b` to a whole **`m + nj`**: the product is built as a staircase — **`m` copies of
`a`** laid tip-to-tail, then **`n` copies of `j·a`** (the number `a` turned by the
system's unit). It lands *exactly* on `a·(m+nj)`. So complex multiplication really is
repeated addition — you just let the thing you add **turn** as you go.

## Two notions of "the middle" (the Mean view)

Switch **View** to **Mean**. Between `a` and `b` there are two honest midpoints:

- the **arithmetic mean** `(a+b)/2` — the middle of the straight chord (the *addition*
  path), and
- the **geometric mean** `√(ab)` — the middle of the spiral arc (the *multiplication*
  path).

They are different points, and the picture shows why: addition interpolates by equal
*differences*, multiplication by equal *ratios*. (Turn on **harmonic mean** for a third.)

## Three number systems (the System panel)

Slide **Number system** `p = j²` from **Complex** (`p<0`) through **Dual** (`p=0`) to
**Split-complex** (`p>0`). Only the *sign* matters; the same multiply-by-`b` becomes:

- a **rotation** about the origin (complex — orbits are circles),
- a **shear** (dual — the degenerate knife-edge; orbits are lines), or
- a **boost** along a hyperbola (split-complex — as in relativity's rapidity).

The dashed **unit curve** is the level set `x² − p·y² = 1` (circle / two lines /
hyperbola), and in the split case the red lines are the **null cone**, where
multiplication degenerates. Every view above — Number, Curve, Plane, Repeat, Mean —
re-renders in the chosen system, so you can watch the *same* operation in three
geometries.

## Commutativity

Turn on **Show both orders**. In Multiply you get two spirals — `a` rotated-and-scaled
by `b`, and `b` rotated-and-scaled by `a` — landing on the **same** point: `a·b = b·a`,
something you can *see*. In Add it's the parallelogram.

## Tips

- **Snap to nice values** pulls a handle onto the lattice (`1`, `i`, `1+i`, …), the
  unit circle, and angles that are multiples of π/6 — so landing exactly on `i` is a
  click, not a pixel-hunt.
- **Stops** jump straight to the meaningful waypoints — `a` and the result for two
  numbers, **Shape / Image** for a curve, **a / b** for means. Press **Play** to animate
  between them, or drag the **Fine scrub** slider by hand; animation is optional, every
  state is reachable from a stop.
- **Speed** is the *pen* speed (math units per second), so a tight multiply spiral and a
  short add slide move at the same pace instead of finishing in the same wall-clock time
  — the picture, not the parameter, sets the tempo.

## Possible sources & where to go further

- The plane picture of complex numbers is the **Argand diagram** (Jean-Robert Argand,
  1806; also Caspar Wessel, 1799) — worth reading on for the history of "why is there
  a plane here at all."
- The "multiplication adds angles" fact is **de Moivre's theorem** / Euler's formula
  `e^{iθ} = cos θ + i sin θ`; any complex-analysis text (e.g. Needham, *Visual Complex
  Analysis*) develops the spiral picture far further.
- 3Blue1Brown's "What is Euler's formula" and "Imaginary numbers are real" video
  series are close visual analogues to this app's intent.
- This tool extends the same idea from two numbers to **whole curves** to the **entire
  coordinate plane** (the Plane chapter); the next step is a *nonlinear* function, where
  the grid lines finally bend — the territory of the Plane Transform tool.
- The **dual** and **split-complex** numbers, and the `p = j²` trichotomy, are
  **I. M. Yaglom**'s territory (*Complex Numbers in Geometry*; *A Simple Non-Euclidean
  Geometry and Its Physical Basis*) — the elliptic / parabolic / hyperbolic
  **Cayley–Klein** geometries. Split-complex numbers are the algebra of **Lorentz boosts
  and rapidity** in 1+1 relativity; **dual numbers** underlie **automatic differentiation**
  and screw theory. All are good next steps for the reader.
