# Complex Particles

Visualizes a complex map `z → f(z)` using domain coloring in four
dimensions. Each particle sits at the 4D point `(Re z, Im z, Re f(z),
Im f(z))` and is projected to 3D using perspective, stereographic, or
Hopf projection, plus optional drop-axis views. Particle color
encodes either the input or the output complex number. The graph can be
drawn as a point cloud or as a single continuous translucent **sheet**
(see the Surface controls below).

## Function

Pick any of the standard analytic functions from the dropdown, or
choose **powPQ** to enter integer `p` and `q` and visualize `z^(p/q)`.

## Branches (Riemann sheets)

Multi-valued functions (`sqrt`, `ln`, `cbrt`, `arcsin`, `arccos`,
`√(z(z-1)(z+1))`, and `z^(p/q)` when `p/q` is non-integer) admit multiple
branches. In the **Domain** panel, set the **Branch min** / **Branch max**
sheet indices to draw a contiguous range of sheets at once (e.g. `0…2`, or a
symmetric `-1…1`); single-valued functions ignore it.

## Controls

- **Camera** — projection mode, drop axis, motion (free or fixed),
  distance, and quarter-turn buttons for the six coordinate planes.
- **Color** — domain vs range coloring, four color styles (HSV,
  modulus bands, phase-only, dual-hue CVD), hue shift, saturation.
- **Particles** — size, opacity, intensity, sprite shape (sphere /
  hexagon / pyramid), texture (procedural checker / speckled / stone /
  metal, or HDR royal), and a light-background toggle.
- **Surface** — render the graph as a point cloud (**Points**, the default)
  or as a single continuous **Sheet**: a translucent triangle surface over a
  regular grid, with toggleable **filled** and **wireframe** layers, a grid
  **resolution**, and a **shading** amount for depth cues. Sheet mode uses its
  own grid (independent of the sampling pattern and particle count).
- **Motion** — shimmer (time-varying brightness) and jitter (positional
  noise), with a **Jitter mode**: *Scatter* (the default) perturbs the
  sampled domain point and re-evaluates f, so particles stay on the surface
  (a denser, irregular sampling of the same graph); *Fuzz* offsets the
  assembled 4-D point off the surface on all four axes (a soft cloud).
- **Detail** — particle count and axis line width.
