# Wrap-World

A first-person walk on a **flat closed surface**: the **torus** or the **Klein
bottle**. Both are *intrinsically flat* — locally they're just an ordinary
plane — so walking feels completely normal: nothing reorients, nothing flips
under your feet, you never hit a wall or get teleported.

## How a finite world has no edges

The world is a single square tile — the **fundamental domain** — with its edges
**glued**. Rather than show you a seam, the view tiles that one tile seamlessly
in every direction (the *universal cover*), so you simply keep walking into more
world. Walk far enough in a straight line and you arrive back where you started,
having passed the **same numbered pillars** again.

## Torus vs Klein bottle

- **Torus:** both pairs of edges glue **straight** (like Asteroids / Pac-Man).
  Every repeated copy of a pillar looks identical.
- **Klein bottle:** one pair of edges (the **red** ones) glues with a **flip**.
  So every other column of the world is **mirror-reversed** — the pillar
  numbers and their ▶ arrows come back **backwards**. You discover this only by
  travelling and reading a familiar landmark, never by anything strange
  happening locally. That mirror-gluing is what makes the Klein bottle
  **non-orientable**: there's no consistent global "handedness".

## Reading it

You leave **oriented footprints** — little arrows pointing the way you walked,
with a **cyan left half** and a **magenta right half** (and a gold underside).
Because they live on the surface they reappear in every copy of the world:
identical on the torus, but **mirror-reversed** across the red gluing on the
Klein bottle, where the cyan and magenta halves **swap sides**. That colour swap
is the orientation flip, made visible. The boundary squares show the tiling —
**red edges flip, blue edges glue straight.**
