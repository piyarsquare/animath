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

## The projection slider (Camera panel)

One slider moves between three ways of flattening 4-D to 3-D —
**Perspective ⇠ Torus ⇢ Sphere** — with sticky stops at each:

- **Perspective** — a 4-D camera divide: `(x, y, u, v)` maps to
  `(x, y, u) / (3 + v)`. Points with larger `v` shrink toward the center,
  just as a 3-D camera makes distant things look smaller.
- **Torus** — first scale the 4-D point onto the unit 3-sphere (this keeps
  only the *shape* of `(z, f)`, discarding its overall size), then
  stereographically project from a pole. The image is a stack of **nested
  donuts** (Clifford tori) filling space: `arg z` walks around the hole,
  `arg f` around the tube, and `|z|/|f|` chooses which donut — `|z| > |f|`
  hugs the tight inner core circle, `|f| > |z|` swells to the big outer
  donuts, and the `|z| = |f|` surface is the central Clifford torus. The
  **Reference scaffold** toggle draws the faint donuts.
- **Sphere** — the **Hopf map** S³ → S², which places each particle on a
  sphere according to the **ratio z / f(z)**: *latitude* = `|z| / |f|`
  (equator where they're equal; one pole where the output vanishes, the
  other where the input does), and *longitude* = `arg(z) − arg(f)`. Each
  `(1,1)` fiber circle of the Torus view — the points that differ only by a
  common phase of input and output — collapses to a single point. So
  `f = c·z` collapses to one point, `f = z + c` covers the sphere once, and
  `eᶻ` wraps it infinitely. For this reading to hold, keep the 4-D
  orientation at identity — a 4-D rotation mixes input and output before the
  map. The viewer protects this for you: the auto-tumble **pauses** in the
  Torus/Sphere views (a 4-D turn would warp the picture rather than turn it),
  and the rotation panel switches to rigid Yaw/Pitch/Roll orbits. If you've
  turned the 4-D view earlier, use **Reset orientation** (4D Rotation panel).

**Positions between the stops are animations, not projections** — the view
linearly cross-fades each particle between its two images, so a half-way
picture is a morph to help your eye track points, not a mathematical map in
its own right. The 4-D axis cross belongs to the linear views and fades out
toward the Torus, where the scaffold takes over as the reference frame.

- **Drop axis** (4D Rotation panel) — the bluntest projection: just forget
  one of the four coordinates and keep the other three (an orthographic
  slice). Picking one returns the slider to Perspective so the two controls
  never fight.

## Sampling (Domain panel)

**Sampling** chooses how the domain points are laid out before `f` is applied:
**Grid** (the Cartesian default), **Polar**, **Rings**, **Spokes**, **Web**,
**Squares**, or **Random**. Beyond looking different, the layout changes which
structure is sampled evenly: **Polar** spreads points uniformly in `arg z`, which
keeps near-linear maps (`f ≈ b·z`) crisp in the Torus/Sphere views — where a
uniform Cartesian grid would leave one side of the fiber circle under-sampled.
**Adaptive density** resamples the grid to put more points where `|f′(z)|` is
large (it bypasses the pattern picker); **Sharpness** sets how aggressively.

## Render modes (Render panel)

The same 4-D graph can be drawn four ways:

- **Points** (the default) scatters one particle per sample — count, size,
  sprite shape and texture are in the same panel.
- **Sheet** stitches a regular grid into a single continuous **surface** — the
  actual 2-D graph of `f` — as a translucent fill (one flat color per
  rectangular cell, the average of its four corners) and/or a wireframe of the
  row/column edges. **Adaptive** dissolves the surface where the function has
  stretched a cell past the **Density** threshold, letting the point cloud
  show through — so dense regions read as a solid sheet, stretched ones as
  points.
- **Tiles** draws one small oriented quad per grid sample, stretched and
  sheared along the local deformation and capped at **Tile size** — dense
  regions form a solid fabric, stretched regions tear into a field of
  separate tiles.
- **Net** lays a polar lattice over the domain — **circles** of constant `|z|`
  and **rays** of constant `arg z`, drawn as fixed-pixel-width threads — and
  maps it through `f`, showing how the function carries the polar fibers.

The vertices are the same 4-D points as the cloud, so the **Perspective**
projection can still evert the sheet where it stretches past the camera divide
(`3 + v` crossing zero) — the **Drop-axis** slices show it as a single,
non-folding surface. It's the clearest way to see folds, branch sheets, and how
the surface drapes through each projection.

## Branches and Riemann sheets (Domain panel)

Multivalued functions (`√z`, `∛z`, `ln z`, `z^(p/q)`, `√(z(z−1)(z+1))`, the
inverse trig/hyperbolic family) show **Branch min/max** controls: the viewer
draws one copy of the graph per sheet in that range. Two kinds of family:

- **Finite**: `√z` has 2 distinct sheets, `∛z` has 3, `z^(p/q)` has `q` — the
  controls cap the range there, because further branches repeat sheets you
  already see.
- **Infinite**: `ln z` and the inverse trig/hyperbolics climb forever — each
  branch shifts the image (by `2πi` for `ln`).

**Tint sheets** offsets each sheet's hue (evenly around the color wheel for a
finite family) so simultaneous sheets are distinguishable even in Domain
coloring, where they would otherwise be colored identically — turn it off to
see the honest, untinted coloring. One disclosure: for the inverse
trig/hyperbolic functions the branch is carried by their **logarithm only**
(the `±2πk` family); the second family of branches (from the inner square
root, e.g. `π − arcsin z + 2πk`) is not drawn, so these sheets are a true but
*incomplete* set and won't glue into the full Riemann surface.

## 4-D rotations (the eighth-turn controls)

In 3-D you rotate *around an axis*; in 4-D you rotate *in a plane*. There are
six coordinate planes — **xy, xu, xv, yu, yv, uv** — and a turn in, say, the
**xu** plane swaps the input's real axis with the output's real axis, mixing
domain and range. Each ↻/↺ tap is an **eighth turn** (45°); the small toggle
under each button runs a **continuous spin** in that plane (several compose —
e.g. xy + uv is an isoclinic double rotation), and the matrix at the panel's
foot is the live orientation readout: the projected images of the four basis
vectors.

These turns use **quaternions**: a 4-D rotation is `p ↦ a · p · b̄` for two
unit quaternions `a` (left) and `b` (right). Picking them independently
reaches every 4-D rotation. Rotating *before* projecting is what lets you
view the 4-D shape from new angles.

In the nonlinear **Torus/Sphere** views a 4-D rotation before the map deforms
the image, so there the same panel offers **Yaw / Pitch / Roll** instead —
rigid orbits of the 3-D camera; the six 4-D planes return in the linear views.

## Color (domain coloring)

By default, color encodes a complex number's **argument** (its angle) as hue,
at flat full brightness. Switch **Color by** between *Domain* (color by the
input `z`) and *Range* (color by the output `f(z)`) to see how the function
rearranges the plane.

The **Quantity** and **Brightness** pickers choose *which* scalar of that number
drives each channel, independently: **Phase** (the classic angle→hue),
**Magnitude** (so you can literally color — or shade — by `|z|` / `|f|`), or the
**Real** / **Imag** part. Brightness defaults to **Uniform (flat)** — every
particle at full value, so color reads as pure hue; set it to *Magnitude* for
classic domain coloring, where `|·|` shades the value.
Sequential colormaps (Viridis, Magma, …) replace the wheel with a perceptual
ramp — better for reading magnitude as height, and safer for color-vision
deficiency than the hue wheel. The **Dual-hue CVD** style is a CVD-friendly
blue→yellow ramp; being a ramp on a cyclic quantity, it has one seam where the
phase wraps.

## Numerical honesty

What you see is floating-point arithmetic on a GPU, with a few guards at
exactly the places a complex-analysis eye goes first:

- **Poles are clamped, not infinite**: divisions floor their denominator
  (at `10⁻⁴`–`10⁻⁶`), and any output with `|f| > 10³` is pulled back to that
  radius — so the spike at a pole of `1/z` or `tan z` has a finite height by
  construction.
- The **Torus** view's stereographic pole is soft-floored the same way, so
  points near the projection pole bend to a bounded radius instead of flying
  off screen.
- **Γ(z)** is computed by the Lanczos approximation (with the reflection
  formula, so its poles at `0, −1, −2, …` are real) — accurate to a few parts
  in 10⁶ in the GPU's 32-bit floats, which is far below what the eye can see
  here.
- Positions **between the projection-slider stops** are linear cross-fades
  (animations), not projections.
