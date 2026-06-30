---
id: CX
title: The complex plane (p = −1)
kind: space
glance: Multiply = turn. The plane that spins.
links:
  leans-on: [PL, DV]
  contrasts: [L2, DU, SP]
  used-for: [analysis]
  opens: [analysis, matrices]
figures:
  - id: tri-multiply
    widget: plane-op
    op: multiply
    show: [-1, 0, 1]        # the SAME two numbers, multiplied under each p
    caption: one product, three planes — watch the complex case turn
---
## note

Set `j² = −1`. Now multiplying by a fixed number **turns** the plane — and scales
it. No direction is left pointing where it started, so there are no real rails. ([[WH]])

It's the one plane that's a **field**: every nonzero number is stretchable, so you
can always divide. ([[FD]]) It's also the only place `√−1` can live.

This is the plane your analytic functions ride on. [[analysis]]

## full

With `j² = −1`, `(a+bj)(c+dj) = (ac − bd) + (ad + bc)j` — rotation-and-scale: in
polar form moduli multiply and angles add. The norm `a² + b²` is positive-definite,
so the only non-invertible element is `0`; that is exactly what makes it a field.

Equivalently, "multiply by `a+bj`" is the matrix `[[a, −b], [b, a]]`, a scaled
rotation. Its eigenvalues `a ± bj` are not real, which is the same fact as "no real
rail." [[matrices]]
