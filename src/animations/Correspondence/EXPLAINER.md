# Mandelbrot ↔ Julia

Two fractals from one rule, **`z ↦ z² + c`**, shown side by side. The left
pane is the **Mandelbrot set**; the right is the **Julia set** for the
currently selected `c`.

## The two questions

- **Mandelbrot (left):** fix `z₀ = 0`, vary `c`. A point `c` is in the set if
  the orbit `0 → c → c² + c → …` stays bounded.
- **Julia (right):** fix `c`, vary the starting point `z₀`. The Julia set is
  the boundary between starting points that stay bounded and those that
  escape.

## Why they correspond

The Mandelbrot set is a **map of every Julia set at once**. Reading a `c` off
the left pane and dropping it into the right is exactly the relationship:

- Pick `c` **inside** the Mandelbrot set → the Julia set is **connected**
  (a single piece).
- Pick `c` **outside** → the Julia set shatters into a **dust** of
  disconnected points (a Cantor set).

This is the *Fundamental Dichotomy*: a Julia set is connected **exactly when**
its `c` lies in the Mandelbrot set.

Even the local *shape* matches. Near a point on the Mandelbrot boundary, the
Mandelbrot set and the matching Julia set look almost identical (a theorem of
Tan Lei, at so-called Misiurewicz points). Choosing `c` right on the boundary
gives the most intricate Julia sets.

## Controls

Tap anywhere on the Mandelbrot to choose `c`. Or draw a
**c-path** and play it back: the Julia set morphs continuously as `c` traces
your curve. The scrubber on the side of the playback panel seeks along the
path.
