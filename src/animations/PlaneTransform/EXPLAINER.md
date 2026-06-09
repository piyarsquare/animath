# Plane Transform

Shows a complex function **f : ℂ → ℂ** as a *transformation of the plane*.
The input pane is a colored grid of points `z = x + iy`; the output pane
shows where each point lands, `w = f(z)`.

## Reading the two panes

- **Same color = same point.** A patch of color in the input pane tells you
  *which* input it is; find that color in the output pane to see where `f`
  sent it.
- **Conformal maps** (like `z²`, `eᶻ`, `1/z`) preserve angles: grid lines
  that cross at right angles in the input still cross at right angles in the
  output, even where the map stretches and bends them.

## Color

Hue is the **argument** of `z` (its angle around the origin); brightness and
the tile pattern encode magnitude. Because the color rides along with each
point, you can watch how `f` rotates, stretches, folds, or tears the plane.

## Polar grid and the log-polar plane

Two **View** toggles change how the plane is drawn:

- **Grid: Polar** samples the input on concentric (log-spaced) circles and
  radial spokes instead of a square mesh — so you watch circles `|z| = r` and
  rays `arg z = θ` get bent into their image curves.
- **Plane: Log-polar** *unrolls* the plane: each point is plotted at
  `(arg, log|·|)` — angle across, log-radius up. Here multiplication by a
  constant becomes a translation, `zⁿ` becomes a linear shear, and `ln` flattens
  the strip into a square. The branch cut sits on the left/right edges.

Combine them — *Polar grid + Log-polar plane* turns the input into a clean
square lattice, which makes the shears and translations easy to read.

## Multi-valued functions and the branch index

Some functions don't have a single answer. **√z**, **ln z**, and
**z^(p/q)** are *multi-valued*: every nonzero `z` has two square roots and
infinitely many logarithms.

The culprit is the **argument**. Write `z = r · e^{iθ}`; the angle `θ` is only
defined up to adding multiples of `2π`. For `√z = √r · e^{iθ/2}`, replacing
`θ` by `θ + 2π` flips the sign of the root. For `ln z = ln r + iθ`, it shifts
the imaginary part by `2π`.

To get a single-valued function we pick a **branch** — a consistent choice of
`θ`. The **branch index** `k` offsets that choice:

| Function | Effect of branch `k` |
|---|---|
| √z | adds **k·π** to the angle → `k = 0` and `k = 1` are the two roots |
| ln z | adds **k·2π** to Im(ln z) → each `k` is a different sheet |
| z^(p/q) | selects which of the `q` distinct roots you see |

The **branch cut** is the line (here, the negative real axis) where the
chosen angle jumps by `2π`; you'll see a color discontinuity along it.
Stepping the branch index walks you onto the next *sheet* of the function's
Riemann surface — the multi-story surface on which the function finally
becomes single-valued.
