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
- **Precision** (Viewport panel) — **Standard** is fast 32-bit float and
  pixelates somewhere past ~10⁵× zoom; **Extended** carries ~twice the digits
  (df64 emulated double precision) for deep zoom, at some speed cost. The
  blockiness at deep zoom is the *computer* running out of numbers, not the
  fractal running out of detail — see **Deep zoom, and the limits of
  computation** below for why, and why the fix is legitimate.
- **Click the fractal** to trace an **orbit**: the path
  `z₀ → z₁ → z₂ → …` for the point you clicked.

## Possible sources & where to go further

Pointers for going deeper, not priority claims.

- **The families** — the **Mandelbrot set** is named for and popularized by
  **Benoît Mandelbrot** (late 1970s–80s); the **Julia / Fatou** theory of
  iteration is **Gaston Julia** and **Pierre Fatou** (around 1918). The
  **Tricorn** ("mandelbar," the conjugate map `z̄² + c`) was studied by
  **Crowe, Hasson, Rippon & Strain-Clark** and by **Milnor**; the **Burning Ship**
  (absolute-value variant) was introduced by **Michael Michelitsch & Otto Rössler**
  (early 1990s).
- **Smooth (continuous) escape-time coloring** via the `log|z|` renormalized
  iteration count is a well-known technique often credited to **Linas Vepstas** and
  to the **Fractint** community; it removes the visible iteration bands.
- **Higher powers `zᵏ + c`** giving `(k−1)`-fold symmetry are the
  *multibrot* sets, a standard generalization.
- **To go further:** Peitgen, Jürgens & Saupe, *Chaos and Fractals*, and Milnor's
  *Dynamics in One Complex Variable* are the standard references; the linked
  **Mandelbrot ↔ Julia** app here shows the parameter-space correspondence directly.
