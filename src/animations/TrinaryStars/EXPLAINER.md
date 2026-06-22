# Trinary System

A lone planet, three suns, and a future no equation can predict.

## The three-body problem

Two bodies bound by gravity — a star and its planet, the Earth and the Moon —
trace **ellipses** you can write down in closed form. Newton solved that case
completely. Add a third gravitating body and everything changes. There is **no
general formula** for the future positions of three mutually attracting masses;
Poincaré proved in the 1890s that no such tidy solution exists. The system can
only be followed by stepping it forward, instant by instant.

Here three stars pull on each other, and a planet drifts in the
ever-shifting valley of their combined gravity. The stars dance; the planet is
flung, captured, slingshotted, sometimes ejected entirely.

## Why it's unpredictable

The deep reason isn't that the equations are hard to write — they're one line.
It's **sensitive dependence on initial conditions**, the fingerprint of
*deterministic chaos*. Two planets started a hair's breadth apart follow nearly
the same path… for a while. Then a close pass by a star **amplifies** the gap,
the next pass amplifies it again, and the tiny initial difference explodes.

> Turn up the **ghost planets** and give them a tiny **perturbation ε**. Watch
> the cloud stay together, then suddenly smear across the whole system. The
> moment it scatters is the moment the future became unknowable.

That smear grows roughly **exponentially** in time — the rate is called the
*Lyapunov exponent*. Exponential growth means precision is hopeless: to predict
twice as far ahead you'd need to know the start *exponentially* better. Round-off
in the last decimal place, a passing comet, the gravity of a distant galaxy —
any of them, magnified enough, rewrites the planet's fate. The **spread**
readout tracks this divergence live.

## The presets

- **Figure-Eight** — the stars trace one perfectly repeating loop (a rare
  *periodic* solution of the three-body problem). The stars are predictable, but
  the planet riding their field is **not**. Predictable forces, unpredictable
  outcome: chaos doesn't need randomness.
- **Pythagorean** — Burrau's famous problem. Stars of mass 3, 4, 5 fall from
  rest, whip through close encounters, and after a wild scramble **eject** one
  star while the other two pair off. A textbook chaotic scattering.
- **Binary + Star** — a hierarchical trio: a tight binary plus an outer star.
  More structured, but a planet wandering between the two scales still finds
  chaos.

## Where the planet starts

Use **Orbit around** to choose what the planet circles. Pick a single **star**
for a tight *S-type* orbit nestled well inside the stellar dance — a
"moon-like" world that looks stable until a close pass by another star tears it
loose. Pick the **barycenter** (or the **inner binary**) for a wide
*circumtrinary / circumbinary* orbit that wraps the whole system. **Start
radius** and **speed** are measured from that body; **Circular orbit speed**
sets the speed for a roughly circular orbit (√(M/r)), a good starting point for
bound, interesting paths. Or hit **Place planet by hand** and click–drag right
on the scene to set the launch point and velocity arrow yourself.

## What you're seeing

- **Bright spheres** are the three stars, full participants in the gravity —
  they pull on each other and on the planets.
- The **cyan planet** is the reference world. The **pink ghosts** start almost
  exactly where it does; their divergence *is* the unpredictability.
- **Trails** show recent history. The planets are *test masses* — they feel the
  stars but don't tug back — so every ghost samples the identical star field,
  isolating chaos from noise.
- Gravity is **softened** (each star acts as if it had a small radius), which
  keeps close passes finite and the simulation stable. Drag to orbit the camera,
  scroll to zoom.

## The real stakes

Many real stars come in twos and threes, and planets are found among them. A
world in such a system can have a genuinely **unpredictable climate** — its
distance from each sun, and so its seasons, never settle into a pattern you
could forecast far ahead. That predicament, lifted straight from this math, is
the premise of Liu Cixin's *The Three-Body Problem*.

## Possible sources & where to go further

Pointers for going deeper, not priority claims.

- **No closed-form solution** — that the general three-body problem has no tidy
  formula is **Henri Poincaré**'s work (around 1890, on the restricted three-body
  problem and the King Oscar prize); the deeper diagnosis is **sensitive
  dependence on initial conditions**, the foundation of *deterministic chaos*
  (Poincaré, later **Edward Lorenz**), measured by the **Lyapunov exponent**.
- **The Figure-Eight** orbit is a choreography found numerically by **Cris Moore**
  (1993) and proven to exist by **Alain Chenciner & Richard Montgomery** (2000);
  the **Moth** and the broader family of choreographies are from **Milovan Šuvakov
  & Veljko Dmitrašinović** (2013).
- **The Pythagorean problem** (three masses 3-4-5 released from rest) is **Burrau's
  problem** (Carl Burrau, 1913), famously integrated by **Szebehely & Peters**
  (1967) — the textbook chaotic-scattering case.
- **Test particles and softened gravity** — treating the planet as a massless
  particle in a given star field, and **Plummer softening** to keep close passes
  finite, are standard numerical-celestial-mechanics techniques; the integrator
  here is **velocity-Verlet / leapfrog**.
- **The cultural premise** — an unpredictable climate on a world in a multi-star
  system — is the premise of **Liu Cixin**'s *The Three-Body Problem*.
