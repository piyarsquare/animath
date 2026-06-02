# Fractals

These are **escape-time fractals**. Pick a complex number `c` and a starting
value `z`, then iterate

> `z ↦ zᵏ + c`

over and over. Either the values stay bounded forever, or they blow up
("escape" to infinity). The boundary between those two fates is a fractal.

## Mandelbrot vs Julia

- **Mandelbrot set** — fix the start at `z₀ = 0` and ask *which `c` stay
  bounded*. Every pixel is a different `c`; the dark region is the set.
- **Julia set** — fix `c` and ask *which starting points `z₀` stay bounded*.
  Every pixel is a different `z₀`. Each `c` has its own Julia set.
- **Burning Ship / Tricorn** — the same rule with a twist: the Burning Ship
  takes absolute values of the real and imaginary parts before squaring; the
  Tricorn (the "mandelbar") conjugates `z` each step.

## Escape time and color

A point counts as escaped once `|z|` passes an **escape radius**. The number
of steps it took is the **escape time**, and that count drives the color.
Smooth coloring blends between whole-number counts using `log|z|`, so the
bands don't look stepped. The interior — points that never escape within the
iteration cap — is drawn solid.

## The knobs

- **Power `k`** — the exponent in `zᵏ + c`. `k = 2` is the classic
  Mandelbrot; higher powers give `(k − 1)`-fold symmetry.
- **Iterations** — how long we test each point before giving up. More
  iterations resolve finer filaments but cost more time.
- **Coloring mode** — escape velocity, limit magnitude, or a blend of both.
- **Click the fractal** to trace an **orbit**: the path
  `z₀ → z₁ → z₂ → …` for the point you clicked.
