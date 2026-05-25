# Complex Particles

Visualises a complex map `z → f(z)` using domain colouring in four
dimensions. Each particle sits at the 4D point `(Re z, Im z, Re f(z),
Im f(z))` and is projected to 3D using perspective, stereographic, or
Hopf projection, plus optional drop-axis views. Particle colour
encodes either the input or the output complex number.

## Function

Pick any of the standard analytic functions from the dropdown, or
choose **powPQ** to enter integer `p` and `q` and visualise `z^(p/q)`.

## Branches

Multi-valued functions (`sqrt`, `ln`, `√(z(z-1)(z+1))`, and `z^(p/q)`
when `p/q` is non-integer) admit multiple branches. Increase **Branches**
to 2 or 3 to render several sheets simultaneously, set each sheet's
branch index, and choose whether to differentiate them by colour,
intensity, or particle shape.

## Controls

- **Camera** — projection mode, drop axis, motion (free or fixed),
  distance, and quarter-turn buttons for the six coordinate planes.
- **Colour** — domain vs range colouring, four colour styles (HSV,
  modulus bands, phase-only, dual-hue CVD), hue shift, saturation.
- **Particles** — size, opacity, intensity, sprite shape (sphere /
  hexagon / pyramid), texture (procedural checker / speckled / stone /
  metal, or HDR royal), and a light-background toggle.
- **Motion** — shimmer (time-varying brightness) and jitter (positional
  noise).
- **Detail** — particle count and axis line width.
