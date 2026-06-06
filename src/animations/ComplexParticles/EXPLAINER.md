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
  spin mixes input and output before the map. The **Hopf study view** button in
  the Camera panel does this in one tap: it forces Hopf, freezes the motion,
  stops any spins, and resets the orientation to identity.)
- **Torus** — the same Hopf data with the fibers left *intact*: a stack of
  nested donuts (Clifford tori) filling space. `arg z` walks around the hole,
  `arg f` around the tube, and `|z|/|f|` chooses which donut — a large ratio
  (`|z| > |f|`) hugs the tight inner core circle, while `|f| > |z|` swells to the
  big outer donuts. The `|z| = |f|` surface is the central Clifford torus. Each
  Hopf fiber
  becomes a `(1,1)` circle winding around its donut — exactly the points that
  the **Hopf** view squashes together. The **Collapse → Hopf** slider scrubs
  between the two so you can watch those fiber circles shrink to points, and the
  **Reference scaffold** toggle draws the faint donuts / sphere they live on. The
  **Hopf fibers** toggle overlays the iconic interlocking circles themselves —
  the common-phase orbits `θ ↦ e^{iθ}·(z, f)` — sampled directly on the base
  sphere (not the function graph), each linking every other, coloured by base
  point. **Fiber density** sets how many per donut.
- **Drop axis** — the bluntest projection: just forget one of the four
  coordinates and keep the other three (an orthographic slice).

## Coordinate charts (Domain panel)

The **Input chart** and **Output chart** pickers replot the input `z` and the
output `f` in **Polar** `(|·|, arg)` or **Log-polar** `(log|·|, arg)` before the
4-D point is assembled (color still uses the raw Cartesian values). These are the
natural charts for several families: in **log-polar output**, `eᶻ` becomes the
identity (`log|eᶻ| = Re z`, `arg eᶻ = Im z`), so its trumpet flattens to a plane;
with **both** in log-polar, `zⁿ` and the roots `√z`/`∛z` become *linear shears*,
so their Riemann sheets flatten into evenly-spaced tilted planes.

## Sampling pattern (Domain panel)

**Sampling** chooses how the domain points are laid out before `f` is applied:
**Grid** (the Cartesian default), **Polar**, **Rings**, **Spokes**, **Web**,
**Squares**, or **Random**. Beyond looking different, the layout changes which
structure is sampled evenly: **Polar** spreads points uniformly in `arg z`, which
keeps near-linear maps (`f ≈ b·z`) crisp in the Hopf/Torus view — where a uniform
Cartesian grid would leave one side of the fiber circle under-sampled. (Sampling
is bypassed while **Adaptive density** is on.)

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

By default, color encodes a complex number's **argument** (its angle) as hue and
its **magnitude** as brightness. Switch **Color by** between *Domain* (color by
the input `z`) and *Range* (color by the output `f(z)`) to see how the
function rearranges the plane.

The **Hue** and **Brightness** pickers choose *which* scalar of that number
drives each channel, independently: **Phase** (the classic angle→hue),
**Magnitude** (so you can literally color — or shade — by `|z|` / `|f|`), or the
**Real** / **Imag** part. Brightness also offers **Uniform (flat)** — every
particle at full value, so color reads as pure hue with no magnitude shading. The
defaults reproduce classic domain coloring (hue = phase, brightness = magnitude);
set hue = Magnitude and brightness = Phase to swap them, or drive both from the
real part, etc. (Brightness applies to the
**HSV** and **Dual-hue** styles; the **Modulus bands** and **Phase only** styles
fix their own brightness by design.)
