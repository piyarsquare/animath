# Complex Particles

Visualizes a complex map `z → f(z)` using domain coloring in four
dimensions. Each particle sits at the 4D point `(Re z, Im z, Re f(z),
Im f(z))` and is projected to 3D by the **projection slider** —
**Perspective ⇠ Torus ⇢ Sphere** (the Hopf view) — plus optional drop-axis
slices. Particle color encodes either the input or the output complex
number. The graph can be drawn as a point cloud, a continuous translucent
**sheet**, a fabric of oriented **tiles**, or a polar fiber **net** (see the
Render controls below).

## Function

Pick any of the standard analytic functions from the dropdown in the **top
bar** (always available) or in the Function panel, which also holds the
per-function parameters: integer `p`, `q` for `z^(p/q)`, and the complex
coefficients of the quadratic `a·z² + b·z + c`. Γ(z) is computed by the
Lanczos approximation with reflection, so its poles at `0, −1, −2, …` are
real.

## Branches (Riemann sheets)

Multivalued functions (`sqrt`, `ln`, `cbrt`, the inverse trig/hyperbolics,
`√(z(z-1)(z+1))`, and `z^(p/q)`) admit multiple branches. In the **Domain**
panel, set **Branch min** / **Branch max** to draw a contiguous range of
sheets at once. Finite families are capped at their period (`sqrt`: 2,
`cbrt`: 3, `z^(p/q)`: q) — beyond it the sheets repeat; **Tint sheets**
hue-offsets each sheet so they stay distinguishable. Single-valued functions
show no branch controls.

## Controls

- **Camera** — the projection slider, motion (free tumble or fixed), drag
  mode (orbit/pan), distance, and axis width. The drive-tier **4D Rotation**
  panel holds the eighth-turn buttons for the six coordinate planes, the
  continuous spins, drop-axis, and the live orientation matrix.
- **Color** — domain vs range coloring; which quantity drives hue and
  brightness; HSV styles (incl. a dual-hue CVD ramp) or sequential colormaps;
  hue shift, saturation.
- **Render** — one panel for how the graph is drawn: **Points** (count,
  size, sprite shape, texture), **Sheet** (filled/wireframe layers,
  resolution, adaptive dissolve), **Tiles** (resolution, tile size) or
  **Net** (circles/rays, thread width), plus the shared shading, external
  light, opacity, intensity, and light-background controls.
- **Domain** — units (×1/×π), sampling pattern, reciprocal and adaptive
  sampling, bounds, input/output coordinate charts, and the branch controls.
- **Motion** — shimmer (time-varying brightness) and jitter (positional
  noise), with a **Jitter mode**: *Scatter* (the default) perturbs the
  sampled domain point and re-evaluates f, so particles stay on the surface
  (a denser, irregular sampling of the same graph); *Fuzz* offsets the
  assembled 4-D point off the surface on all four axes (a soft cloud).
  Continuous surfaces (Sheet/Tiles/Net) ignore jitter so they stay registered
  with the axes.
- **System** — reset all saved settings to their defaults.
