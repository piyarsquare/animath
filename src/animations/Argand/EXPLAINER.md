# Argand Plane

A complex number is a **point in the plane**: `z = x + iy` (across by `x`, up by `y`),
or by **length and angle**, `z = r · e^{iθ}` — the same point, two descriptions. This
app is about the simplest interesting *function* of such a number:

> **`f(z) = α₁·z + α₀`** — multiply by the **slope** `α₁`, then add the **shift** `α₀`.

It's the complex cousin of the straight line `y = m·x + b`. Set the two coefficients,
choose what to **feed** the function, and watch what it does.

## The two coefficients (colored everywhere)

The handles and the equation share colors, so the picture reads like the formula:

- <b>z</b> (cyan) — the **input** you feed in.
- <b>α₁</b> (orange diamond) — the **slope**: its length scales, its angle turns.
- <b>α₀</b> (violet square) — the **shift**: a straight translation.
- <b>f(z)</b> (green) — the **output**.
- <b>z\*</b> (gold) — the **fixed point**, where the map stands still (below).

Drag any handle. **Lock** `α₁` or `α₀` (in the Function panel) to pin a coefficient so
you can drag only `z` without nudging the map.

## Two honest legs

`f` is "multiply, then add," so the motion is too. **Play** (or scrub) and the input
travels in two legs, with three **stops**:

1. **z** → **α₁z**: the **×α₁** leg — a spiral (length scales by `|α₁|`, angle turns by
   `arg α₁`). It never cuts a straight chord; that would be a lie.
2. **α₁z** → **f(z)**: the **+α₀** leg — a straight slide by `α₀`.

The pen moves at constant speed across both legs, so the picture sets the tempo.

## The fixed point z\*

Every non-trivial line has one point it leaves exactly where it is: `f(z*) = z*`, which
solves to **`z* = α₀ / (1 − α₁)`** — the complex echo of where `y = mx + b` crosses
`y = x`. It's drawn in gold in every view. When `α₁ → 1` the map is a pure shift and the
fixed point flies off to infinity (shown as “—”).

**View from z\*** recenters the plane on it — and the map's disguise drops: about `z*`,
`f` is *nothing but* a spiral-similarity (a pure `×α₁`), because `f(z) − z* = α₁·(z − z*)`.

**Iterate** (Point feed) draws the orbit `z → f(z) → f²(z) → …`. Since
`fⁿ(z) − z* = α₁ⁿ·(z − z*)`, the iterates lie on a logarithmic spiral about `z*`: it
spirals **in** when `|α₁| < 1` (an attractor), **out** when `|α₁| > 1`, and circles
forever when `|α₁| = 1`. This is fixed-point dynamics in miniature — the same engine
that, with a `z²` term, makes the Mandelbrot set.

## Feed the function a point, a shape, or the grid

- **Point** — one `z` and its image `f(z)`, with the two-leg path.
- **Shape** — `z` *anchors* a whole figure (flag, circle, square, segment); `f` spins,
  scales and shifts the entire shape. The faint arcs are each vertex's path.
- **Grid** — the **whole coordinate plane** maps. Because `f` is linear, straight grid
  lines stay straight: the grid rotates-scales-and-shifts as one rigid (similarity)
  motion, over the faint **identity** grid it came from. (When `f` later becomes
  *non-linear*, those lines will bend — the runway to quadratics and beyond.)

## Quadratics (Degree → 2)

Switch **Degree** to **Quadratic** and a third coefficient appears:
**`f(z) = α₂·z² + α₁·z + α₀`**. Now the map is *non-linear*, and three things change:

- **The grid bends.** Straight lines map to curves (the Grid feed shows it best) — the
  moment a "line" becomes a genuine deformation of the plane.
- **Two fixed points.** `f(z) = z` is now quadratic, so there are **two** gold `z*`'s
  (or a repeated one), plus a **critical point** `z = −α₁/2α₂` (the slate ⊕) where the
  map folds two inputs onto one.
- **The Point feed shows f(z) as a sum of its terms.** The forward path lays them down
  tip-to-tail, highest degree first — **α₂z²**, then **α₁z**, then **α₀** (each one-sixth
  of the loop) — arriving at `f(z)`; the return half collapses all three *at once* along
  the diagonal. So a polynomial value is just a chain of vector contributions, one per
  term.

Iterating a quadratic (the **Iterate** toggle) is genuine non-linear dynamics — the orbit
can converge, cycle, or escape. That is exactly the engine behind the Mandelbrot/Julia
fractals.

## Three number systems (top bar)

Slide **`p = j²`** in the **top bar** (or tap **Complex / Dual / Split**) from **Complex**
(`p<0`) through **Dual** (`p=0`) to **Split-complex** (`p>0`). Only the *sign* matters,
and the same multiply-by-`α₁` becomes:

- a **rotation** about the origin (complex — orbits are circles),
- a **shear** (dual — the degenerate knife-edge; orbits are lines), or
- a **boost** along a hyperbola (split-complex — relativity's rapidity).

The dashed **unit curve** is the level set `x² − p·y² = 1` (circle / two lines /
hyperbola); in the split case the red lines are the **null cone**, where multiplication
degenerates. Every feed re-renders in the chosen system.

## Tips

- The **Plane** panel switches the grid between **Cartesian** and **Polar** (circles +
  rays), sets its **size**, and can **color it by angle** — domain coloring like the
  Complex Particles charts, so you watch the colors flow as `f` deforms the plane.
- **Snap to nice values** pulls a handle onto the lattice (`1`, `i`, `1+i`, …), the unit
  curve, and angles that are multiples of π/6.
- Pinch / scroll to **zoom**, two-finger or shift-drag to **pan**, double-click to
  recenter.

## Possible sources & where to go further

- The plane picture is the **Argand diagram** (Jean-Robert Argand, 1806; also Caspar
  Wessel, 1799). "Multiplication adds angles" is **de Moivre** / Euler's formula
  `e^{iθ} = cos θ + i sin θ`; Needham's *Visual Complex Analysis* develops the spiral and
  the affine/Möbius maps far further.
- The fixed point of an affine map, and iterating `z → f(z)` toward it, is the gateway to
  **complex dynamics** (the territory of the Fractals apps here).
- The **dual** and **split-complex** numbers, and the `p = j²` trichotomy, are
  **I. M. Yaglom**'s territory (*Complex Numbers in Geometry*; *A Simple Non-Euclidean
  Geometry and Its Physical Basis*) — the elliptic / parabolic / hyperbolic
  **Cayley–Klein** geometries. Split-complex numbers are the algebra of **Lorentz boosts
  and rapidity**; **dual numbers** underlie **automatic differentiation** and screw theory.
- Next chapters extend `f` from a line to **quadratics and general polynomials**, where
  the grid lines finally bend.
