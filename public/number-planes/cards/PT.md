---
id: PT
title: Turn the dial, watch one value
kind: knob
glance: Fix z, vary p — the value traces a curve. A tame one.
links:
  leans-on: [PL, DV]
  opens: [DU, FD]
figures:
  - id: p-trace
    status: proposed
    note: "overlay: draw the comet f_p(z) for p in [-2,2] through the f(z) marker — the three plots become visible samples of one curve"
---
## note

Fix a point `z` and an expression; let `p` run from −∞ to ∞. The value `f_p(z)`
traces a curve in the plane.

It is a surprisingly tame one. `p` enters a product once, linearly, and **only in
the real coordinate**: `z·w = (xa + p·yb, xb + ya)`. Every plane in the family
agrees on the `j`-part of a product. So for `α₁z + α₀` — even for the quadratic —
the trace is a **horizontal straight line**, walked at constant speed.

Check it in the app: the three `f(z)` dots are always collinear, level, and evenly
spaced. Turn the dial: the spacing grows, the height never moves.

## full

Powers bend the trace slowly: `zⁿ` has coordinates of degree `⌊n/2⌋` in `p` — each
pair of `j`'s costs one `p`. Always a polynomial curve.

Division adds one pole: `1/z` blows up where `x² = p·y²`, i.e. at the single value
`p* = x²/y²` — every point off the real axis has one plane in the family where it
dies (the moving null cone sweeps through it exactly once). Points on the real
axis never die: the reals are stretchable in every plane. [[FD]]

And the tangent to the trace at `p = 0` is the first-order response of the value
to switching the arithmetic on — which is precisely what the dual numbers
formalize. Differentiated at its own middle point, the family of planes speaks
dual. [[DU]]
