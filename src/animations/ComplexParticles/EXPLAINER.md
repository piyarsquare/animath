# Complex Particles

This view draws a complex function **f : ℂ → ℂ** as a cloud of particles.

## A function whose graph lives in 4D

A real function `y = g(x)` has a 2-D graph: one axis for the input, one for
the output. A **complex** function needs *two* axes for its input
`z = x + iy` and *two* for its output `w = f(z) = u + iv`, so its natural
graph lives in **four dimensions**:

| Axis | Meaning |
|---|---|
| **x** | Re z — real part of the input |
| **y** | Im z — imaginary part of the input |
| **u** | Re f(z) — real part of the output |
| **v** | Im f(z) — imaginary part of the output |

Every particle sits at the 4-D point **(x, y, u, v)**. We can't look at 4-D
directly, so the view *projects* it down into the 3-D scene on screen.

## Projection modes

- **Perspective** — a 4-D camera divide: `(x, y, u, v)` maps to
  `(x, y, u) / (3 + v)`. Points with larger `v` shrink toward the center,
  just as a 3-D camera makes distant things look smaller.
- **Stereographic** — first place every point on the unit 3-sphere (scale it
  to length 1), then project from the pole: `(x, y, u) / (1 − v)`. It's the
  4-D analogue of flattening a globe into a map, and it's *conformal* —
  small shapes keep their form.
- **Hopf** — the **Hopf fibration** S³ → S², which places each particle on a
  sphere according to the **ratio `z / f(z)`**. Read the sphere as:
  *latitude* = `|z| / |f|` (equator where they're equal; one pole where the
  output vanishes, the other where the input does), and *longitude* =
  `arg(z) − arg(f)`. A whole circle of points (input and output rotated by a
  common phase — a *Hopf fiber*) collapses to a single point. So `f = c·z`
  collapses to one point, `f = z + c` covers the sphere once, and `eᶻ` wraps it
  infinitely. (For this reading to hold, keep the 4-D orientation fixed — a
  spin mixes input and output before the map.)
- **Torus** — the same Hopf data with the fibers left *intact*: a stack of
  nested donuts (Clifford tori) filling space. `arg z` walks around the hole,
  `arg f` around the tube, and `|z|/|f|` chooses which donut. Each Hopf fiber
  becomes a `(1,1)` circle winding around its donut — exactly the points that
  the **Hopf** view squashes together.
- **Drop axis** — the bluntest projection: just forget one of the four
  coordinates and keep the other three (an orthographic slice).

## 4-D rotations (the quarter-turn controls)

In 3-D you rotate *around an axis*; in 4-D you rotate *in a plane*. There are
six coordinate planes — **xy, xu, xv, yu, yv, uv** — and a quarter-turn in,
say, the **xu** plane swaps the input's real axis with the output's real
axis, mixing domain and range.

These turns use **quaternions**: a 4-D rotation is `p ↦ a · p · b̄` for two
unit quaternions `a` (left) and `b` (right). Picking them independently
reaches every 4-D rotation. Rotating *before* projecting is what lets you
view the 4-D shape from new angles.

## Color (domain coloring)

Color encodes a complex number's **argument** (its angle) as hue and its
**magnitude** as brightness. Switch **Color by** between *Domain* (color by
the input `z`) and *Range* (color by the output `f(z)`) to see how the
function rearranges the plane.
