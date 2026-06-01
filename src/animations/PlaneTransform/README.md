# Plane transform

Visualises a complex function `f : ℂ → ℂ` as a transformation of the
plane: the left (or top) pane shows a colored grid of input points
`z = x + iy`; the right (or bottom) pane shows the same colored points
at their output positions `w = f(z)`. The colors are carried with each
point, so you can trace how regions of the input map across the
output.

## Coloring modes

* **Smooth** — hue ramps with `arg(z)`; lightness ramps in log-radius
  bands. Gives concentric "rainbow rings".
* **Tiles** — discrete polar tiles (12 sectors × log-radius rings)
  with alternating lightness. Easier to count sectors.
* **Grid only** — bright rays at every `π/6` and bright rings at
  integer multiples of `e^0.5`; rest is dark. Reads as a polar grid.

## Tips

* The **Density** slider controls how many points per side are sampled
  (200×200 = 40K points). Higher density = smoother coverage, slower
  rebuild.
* The **Extent (±)** slider controls how much of `ℂ` is visible — the
  visible square is `[-extent, +extent] × [-extent, +extent]`.
* For multi-valued functions (`sqrt`, `ln`, `√(z(z-1)(z+1))`, `z^(p/q)`),
  use the **Branch index** selector to step through the sheets.

## Why two panes?

This visualisation is the classical "domain coloring" diagram from
textbooks like Needham's *Visual Complex Analysis* and Wegert's
*Visual Complex Functions*. The 4D-embedded view in
[Complex Particles](#/) shows the function's graph; this view shows
its action — which regions stretch, fold, and meet at branch points.
