---
id: CN
title: It was a cone all along
kind: knob
glance: Slice one cone; the tilt of the knife is the dial.
links:
  leans-on: [DV, WH]
  opens: [QD, CK]
figures:
  - id: cone-slice
    app: number-plane
    href: ../../#/number-plane
    note: "The cone" view — tilt the knife, read off p = a² − 1
---
## note

The double cone `z² = x² + y²` is straight-sided — made of lines through its tip.
Slice it with a plane `z = ax + c`. The section can only run to infinity along the
cone's lines, so count the lines parallel to your knife:

- 0 → the curve closes: **ellipse**
- 1 → one escape route: **parabola**
- 2 → two: **hyperbola**

Plug the plane into the cone and collect terms: the section satisfies
`y² − (a²−1)x² − 2acx = c²` — the norm form with **`p = a² − 1`**. The knife's
tilt IS the dial: `a = 0` gives the circle (`p = −1`), `a = 1` the parabola
(`p = 0`), `a = √2` the hyperbola (`p = +1`).

Slice through the tip (`c = 0`): a point · one line · a crossing pair — the null
sets. Escape directions = rails = asymptotes. One cone, all planes.

## full

A **cone**, in the modern sense, is any set made of rays through the origin.
The zero set of a homogeneous form automatically qualifies (`Q(λv) = λ²Q(v)`);
the school cone is the null set of the 3-variable norm form `z² − x² − y²` —
the light cone of 2+1 Minkowski space. Restricting that one form to the plane
`z = ax + c` inherits the 2-variable form `N_p` with `p = a² − 1`, so every
number plane is a flat shadow of one object upstairs. The 2-D null sets (the
rails) are cones in the same official sense. Projectively: ellipse, parabola,
hyperbola differ only in how they meet the line at infinity (0 · 1 · 2 points),
and those intersection points are the rails. [[CK]]
