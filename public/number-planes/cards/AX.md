---
id: AX
title: Why we fix addition
kind: line
glance: We hold addition still — on purpose.
links:
  leans-on: [L1]
  opens: [tropical]
---
## note

We hold addition still on purpose. Two reasons:

- the points should *be* the plane — they combine like arrows. That's vector addition.
- we want to subtract: every move undoable.

Change either and you've left. [[tropical]] leaves — its "add" is `min`, which has no undo.

## full

A ring fixes the roles. `+` is an abelian group — commutative, every element
invertible, so subtraction exists. `×` is layered on by distributivity and need
*not* be invertible (`0` has no reciprocal). The two operations aren't
interchangeable: `+` is the rigid base, `×` the free choice. That asymmetry is why
we pin `+` and vary `×`.

Still, fixing `+` is a choice, resting on two demands: (i) the carrier is the plane
as an ℝ-vector space, so `+` is vector addition; (ii) `+` is a group, so you can
subtract. Drop (ii) and a consistent arithmetic survives with a non-invertible `+`
— a *semiring*. [[tropical]] (`min`, `+`) is exactly that, and it reassigns which
operation plays the un-undoable role.
