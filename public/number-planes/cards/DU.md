---
id: DU
title: The dual plane (p = 0)
kind: space
type: space
subject: dual
glance: Multiply = shear. ε² = 0.
links:
  leans-on: [PL, DV]
  contrasts: [CX, SP]
  used-for: [autodiff]
  opens: [autodiff]
figures:
  - id: dual-shear
    widget: plane-op
    op: multiply
    p: 0
---
## note

Set `j² = 0` (write it `ε`). Multiplying **shears** the plane — one direction holds,
everything slides along it.

The slide carries a derivative for free. That's where automatic differentiation
lives. [[autodiff]]

## full

`(a + bε)(c + dε) = ac + (ad + bc)ε` — the `ε`-part is the product rule, exactly.
`ε` is nilpotent, so the whole `ε`-axis is non-invertible: not a field. One rail (a
single real eigenvalue, repeated). [[autodiff]]
