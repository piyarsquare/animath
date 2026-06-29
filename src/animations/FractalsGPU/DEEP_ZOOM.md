# Deep zoom, and the limits of computation

Zoom into the Mandelbrot set far enough and the picture stops getting sharper.
The smooth filaments dissolve into flat, blocky rectangles — not because the
fractal runs out of detail (it never does), but because the **computer** runs
out of numbers. This is a note on *why* that wall exists, what the **Precision**
switch does about it, and why the fix is mathematically honest rather than a
cosmetic trick.

## A computer has only finitely many numbers

The fractal lives in the continuous plane ℂ. Between any two complex numbers
there are infinitely many more, to infinitely many decimal places. A computer
has nothing of the sort. It stores a number in a fixed number of bits, so it can
only represent a **finite** set of values — a fine but discrete grid. Every other
real number gets **rounded** to the nearest one on the grid.

The GPU here works in **IEEE 754 single precision** (`float32`): 32 bits split
into a sign, an 8-bit exponent, and a **24-bit significand** (mantissa). The
exponent lets a float range from about 10⁻³⁸ to 10³⁸, but the *24 bits of
mantissa* are the part that matters for zooming. They give roughly

> **24 bits ≈ 7 decimal significant digits.**

So a `float32` near the value 1.0 can only distinguish steps of about
`2⁻²³ ≈ 1.2 × 10⁻⁷`. Numbers closer together than that round to the *same*
float. This smallest distinguishable relative step is called **machine epsilon**.

It is worth saying plainly because it is the whole story: **the computer cannot
store most of the points you are trying to look at.** It can only store the
nearest grid point, and past a certain zoom the grid is coarser than a pixel.

## Why zooming hits a wall

Each pixel corresponds to a complex number `c`. To draw it we iterate

> `z ↦ zᵏ + c`

and watch whether `z` escapes. The trouble is in `c`. Near an interesting place
the coordinate might be `c ≈ −0.743643887`. When the view is only `1e-7` wide,
two **neighboring pixels** differ in `c` by less than `1.2 × 10⁻⁷` — and
`float32` rounds them to *the same number*. A whole block of pixels then iterates
the identical orbit and gets the identical color. That is the blockiness:
adjacent pixels have become numerically indistinguishable.

It gets worse inside the loop. Computing `z² + c` repeatedly **adds a large
number to a small one** and subtracts nearby quantities. When you add `c` (known
to only 7 digits) to `z²`, the low-order bits of the sum — exactly the bits that
carry the fine structure — fall off the bottom of the mantissa and are lost
forever. This is **catastrophic cancellation**: the answer is dominated by
rounding error long before the iteration finishes.

For the initial 4-unit-wide view, the wall arrives somewhere around
**10⁵–10⁶× zoom**. That is the **Standard** precision limit, and no number of
iterations or pixels fixes it — the arithmetic itself has run out of digits.

## The fix: carry the error you would have thrown away

The **Extended** precision setting switches the shader to a technique variously
called **double-single**, **double-float**, or **df64**. The idea is simple and,
crucially, *exact*:

> Represent one high-precision number as the **unevaluated sum of two ordinary
> floats**, `value = hi + lo`, where `hi` is the normal rounded value and `lo`
> is precisely the rounding error `hi` left behind.

The single 32-bit float that Standard precision keeps is the `hi`. The piece it
discards — the part that *causes* the wall — is captured in `lo` and carried
along. Two 24-bit mantissas stitched together behave like a ~**48-bit** mantissa:
about **14 significant digits** instead of 7.

### Why this is legit, not a hack

The reason you can trust it is that the two building blocks are **error-free
transformations** — provable identities, not approximations:

- **Two-Sum.** For any two floats `a` and `b`, there is a short, branch-free
  sequence of ordinary `+` and `−` operations that produces *both* the rounded
  sum `s = fl(a + b)` **and** the exact error `e`, such that

  > `a + b = s + e`  **exactly**, with no rounding lost.

  The rounding error of a floating-point sum is *itself* a representable float,
  and Two-Sum recovers it. (This is **Knuth's** result; **Dekker's** variant
  does it in fewer operations when the magnitudes are ordered.)

- **Two-Product.** Likewise, a product `a × b` can be split so that
  `a × b = p + e` exactly, where `p = fl(a × b)` and `e` is again an exact float.
  Without a fused multiply–add we get `e` via **Dekker's splitting trick**:
  break each 24-bit float into two 12-bit halves (the magic constant `4097 =
  2¹² + 1` in the shader) so the partial products multiply *without* any
  rounding, then reassemble. The high and low halves multiply exactly because
  12 + 12 = 24 bits fit in the mantissa with room to spare.

Because each step is exact, nothing is approximated and no error silently
accumulates from the *representation* itself. `dfAdd` and `dfMul` in the shader
add and multiply these `(hi, lo)` pairs while continuously folding the freshly
generated rounding error back into `lo`. The result is genuine extra precision,
derived entirely from the standard floating-point model — the same idea behind
**Kahan summation** and the exact arithmetic used in robust computational
geometry. It is mathematics, not a fudge.

The cost is honest too: every extended add or multiply is a dozen-odd float
operations instead of one, so the iteration runs roughly **5–10× slower**. That
is why Standard is the default and Extended is a deliberate choice — you turn it
on when the zoom readout tells you the wall is near.

## Extended has a wall too — just a much deeper one

Doubling the digits does **not** make zoom infinite. It moves the wall:

| Precision | Mantissa | ≈ digits | Smallest view width | ≈ max zoom |
|---|---|---:|---|---:|
| **Standard** (`float32`) | 24 bits | 7 | ~10⁻⁷ | ~10⁵–10⁶× |
| **Extended** (df64) | ~48 bits | 14 | ~10⁻¹⁴ | ~10¹²–10¹³× |

That is roughly a **ten-million-fold** deeper dive — but still finite. df64
inherits `float32`'s exponent range, and stacking two floats can't be repeated
forever (a "quad-float" of four `float32`s exists, at steep cost). The deeper
truth from the first section stands: a fixed bit budget is a finite grid, and any
finite grid has a finest spacing. You can make the grid finer; you cannot make it
continuous.

To go *arbitrarily* deep, fractal explorers stop adding digits to every pixel and
change strategy entirely:

- **Perturbation theory.** Compute one **reference orbit** at very high precision
  on the CPU, then iterate only the tiny *difference* of each pixel from that
  reference using ordinary floats. The differences stay small, so cheap
  arithmetic suffices — with **glitch detection** (Pauldelbrot's criterion) to
  catch where the approximation breaks and re-seed it. This is how zooms to
  10¹⁰⁰× and beyond are rendered.
- **Arbitrary-precision arithmetic.** Software big-decimal libraries with
  hundreds of digits, far slower, used for the reference orbit itself.

This viewer stops at the df64 wall: a large, real gain that stays entirely on the
GPU in real time, and a clean illustration of the boundary every numerical
program lives inside.

## What to do at the keyboard

- Zoom freely in **Standard**; it is fast and identical to before.
- When the **Viewport** panel's zoom readout passes about `10⁵×` and the image
  turns blocky, flip **Precision → Extended**. The blocks resolve back into
  filaments and you can keep going for many more orders of magnitude.
- When Extended *also* blocks up (deep in the 10¹²–10¹³× range), you have reached
  the limit of two stacked floats — the genuine edge of what this representation
  can compute.

### Iterations matter as much as precision

Precision decides whether two nearby points get *different* coordinates;
**iterations** decide whether the escape-time computation runs long enough to
*tell them apart*. Escape times climb steeply with depth — a point that needs 80
steps to escape near the surface may need 2000 in a deep valley. With too few
iterations, every deep point hits the cap and is painted as solid interior, so a
deep view looks like a flat blank no matter how much precision you have. (This is
why extended precision can look like it "does nothing" at depth — the bottleneck
is the iteration budget, not the arithmetic.) The **Iteration** panel's
**Auto-raise with zoom** does this for you, scaling the cap up as you dive;
turn it off to set the count by hand.

## Possible sources & where to go further

Pointers for going deeper, not priority claims.

- **IEEE 754** (the floating-point standard, 1985; revised 2008/2019) defines
  `float32`, rounding, and machine epsilon. **William Kahan**, its principal
  architect, also gave us **Kahan (compensated) summation** — the same
  carry-the-error idea applied to long sums.
- **Error-free transformations.** **Donald Knuth** (*The Art of Computer
  Programming*, Vol. 2) gives Two-Sum; **T. J. Dekker** ("A floating-point
  technique for extending the available precision," *Numerische Mathematik*,
  1971) gives the splitting and the fast two-sum. **Jonathan Shewchuk's**
  adaptive-precision arithmetic (1997) is the classic application to robust
  geometry.
- **df64 on the GPU.** **Andrew Thall**, "Extended-Precision Floating-Point
  Numbers for GPU Computation" (2006), is the standard reference for the
  double-single shader arithmetic used here; the technique is folklore in the
  real-time fractal community (Fractint, and later GPU viewers).
- **Going deeper than df64.** The **perturbation + series-approximation** method
  for extreme Mandelbrot zooms is due to **K. I. Martin** ("SuperFractalThing");
  **Pauldelbrot's** glitch-detection criterion (fractalforums.com) makes it
  robust. **Arbitrary-precision** arithmetic underlies the reference orbits.
- **The mathematics of the limit.** *What Every Computer Scientist Should Know
  About Floating-Point Arithmetic* (**David Goldberg**, 1991) is the standard
  primer on representation, rounding, and cancellation.
</content>
</invoke>
