# Argand Plane

A complex number is a **point in the plane**. Write it as `a = x + iy` (across by
`x`, up by `y`), or by its **length and angle**, `a = r · e^{iθ}` — the same point,
two descriptions. This app lets you **grab two numbers** and watch what arithmetic
*does* to them.

## What you're looking at

- Drag the <b>a</b> (cyan) and <b>b</b> (orange) handles anywhere on the plane.
- The **Values** panel shows each number both ways — rectangular `x + iy` and polar
  `r · e^{iθ}`.
- The green vector is the **result**, `a·b` or `a+b`.

## Add vs. Multiply (the two modes)

- **Add** — `a + b` is **tip-to-tail**: slide `a` along `b` (or `b` along `a` — same
  destination, which is the parallelogram you see). Scrubbing **t** slides smoothly
  from `a` to `a+b`.
- **Multiply** — `a · b` **adds the angles and multiplies the lengths**:
  `r_a r_b · e^{i(θ_a + θ_b)}`. Scrubbing **t** doesn't cut a straight line — it
  **spirals**, swinging `a` through the angle of `b` while its length scales by `|b|`.
  Try `b = i`: multiplying is a quarter-turn. Try `b = −1`: a half-turn.

> The straight-line "shortcut" would be a lie for multiplication — with `b = −1` it
> would drag the point through the origin. The spiral is the honest path.

## Commutativity

Turn on **Show both orders**. In Multiply you get two spirals — `a` rotated-and-scaled
by `b`, and `b` rotated-and-scaled by `a` — landing on the **same** point: `a·b = b·a`,
something you can *see*. In Add it's the parallelogram.

## Tips

- **Snap to nice values** pulls a handle onto the lattice (`1`, `i`, `1+i`, …), the
  unit circle, and angles that are multiples of π/6 — so landing exactly on `i` is a
  click, not a pixel-hunt.
- **Scrub** by hand, or press **Play** to animate the path. Animation is optional —
  every state is visible by dragging the slider.

## Possible sources & where to go further

- The plane picture of complex numbers is the **Argand diagram** (Jean-Robert Argand,
  1806; also Caspar Wessel, 1799) — worth reading on for the history of "why is there
  a plane here at all."
- The "multiplication adds angles" fact is **de Moivre's theorem** / Euler's formula
  `e^{iθ} = cos θ + i sin θ`; any complex-analysis text (e.g. Needham, *Visual Complex
  Analysis*) develops the spiral picture far further.
- 3Blue1Brown's "What is Euler's formula" and "Imaginary numbers are real" video
  series are close visual analogues to this app's intent.
- Next chapters of this tool extend the same idea from two numbers to **whole curves**
  and then to a **function deforming the entire plane**.
