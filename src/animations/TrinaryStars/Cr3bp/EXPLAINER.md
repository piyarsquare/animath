# Restricted Three-Body Problem

The chaotic trinary has no fixed structure — but freeze the problem to its most
famous *solvable-looking* case and a hidden architecture appears: the
**circular restricted three-body problem (CR3BP)**.

## The setup

Two stars (the *primaries*) orbit their common centre on a perfect circle. A
third body — a planet, moon, or spacecraft — is so light it doesn't disturb
them. Now ride along in the **co-rotating frame**, the frame that turns with the
binary. The two stars freeze in place; in exchange, the planet feels two extra
forces — the outward **centrifugal** push and the sideways **Coriolis** deflection.

## Lagrange points

In this frame there are five places where gravity and centrifugal force exactly
cancel — the planet could sit there forever. **L1, L2, L3** lie on the line
through the stars; **L4 and L5** form equilateral triangles with them, 60° ahead
and behind. L4/L5 are genuinely **stable** when one star is much heavier than the
other (mass ratio μ < 0.0385) — which is why Jupiter shepherds thousands of
*Trojan* asteroids at its L4 and L5. Above that ratio they become unstable.

## Hill regions (zero-velocity curves)

The planet conserves one quantity, the **Jacobi constant** `C = 2Ω − v²`. Since
speed² can't be negative, the planet is **forbidden** from any region where
`2Ω < C`. Those grey zones — bounded by *zero-velocity curves* — are walls the
planet can never cross. Raise C and the walls close in, trapping the planet near
one star; lower C and gateways open at the Lagrange points, letting it wander.

## Poincaré section

How do you see order vs chaos in a 4-dimensional motion? **Stroboscopically.**
Mark a dot every time the planet crosses the line y=0 heading up, plotting its
position x against its velocity ẋ. A **regular** orbit returns to the same loop
over and over, tracing a smooth closed curve (a slice of a *KAM torus*). A
**chaotic** orbit never repeats, scattering its dots into a fuzzy sea. One
picture, and the divide between predictable and unpredictable is laid bare.

## Try it

Click the left view to drop a planet (it's launched with exactly the Jacobi
energy C you chose). Watch it trace tadpole, horseshoe, or wild chaotic paths,
and watch the section fill in. Lower μ to 0.02 and launch near L4 to park a
stable Trojan; raise C to wall the planet in; click directly on the section to
seed orbits of the same energy and map the border between tori and chaos.
