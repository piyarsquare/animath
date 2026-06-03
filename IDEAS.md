# Ideas

A running backlog of feature ideas for animath. Append new ideas at the end;
don't reorder. These are unprioritized sketches, not commitments.

## Particle / 4D viewers

### Auto-spin ("spinners") for the quarter-turn / rotation buttons

Add a way to make a 4D rotation run *continuously* so the projection spins
smoothly along that axis of rotation, instead of only stepping 90° per tap or
turning while held.

- For each rotation plane (the QuarterTurnFloater clusters — `xy`, `xu`, `xv`,
  `yu`, `yv`, `uv`), add an extra **spinner toggle** button next to the existing
  quarter-turn button. Toggling it on starts a continuous rotation in that plane;
  toggling off stops it.
- Add a **speed slider** (signed, so it can spin either direction; 0 = stopped).
  Decide whether speed is global (one slider for whichever spinners are active)
  or per-plane (a slider per spinner). Start with a single global speed slider for
  simplicity; revisit per-axis speed if needed.
- Multiple spinners active at once should compose (e.g. an `xy` + `uv` spin gives
  the classic double/isoclinic rotation — a natural, very watchable motion).
- Hook into the existing animation loop (`lib/particles/createAnimationLoop.ts`)
  which already composes quaternions per frame; the spinner just feeds a constant
  angular increment per frame into the same path the "hold to rotate" gesture uses.
- Persist spinner on/off + speed via `useParticleState` storage like the other
  settings (but treat the live orientation as transient view state, per the
  persistence conventions in CLAUDE.md).
- Nice-to-have: a master "stop all spins" control, and respect reduced-motion
  preferences.

### Polar coordinate toggles for input and/or output

Let the input domain and the output be plotted in **polar** instead of Cartesian,
independently, each with an optional **log-radius** sub-toggle.

- **Output polar:** after computing `w = (u, v)`, feed `(|w|, arg w)` into the
  4-vector instead of `(u, v)` (mind the `arg` seam at ±π — offer an optional
  phase-unwrap). This "unrolls" rotational structure: for `exp` the trumpet/
  helicoid flatten into exponential walls/ramps, and in *log-polar* output `exp`
  becomes the identity (the flat input plane) — its natural chart.
- **Input polar:** sample the domain on an `(r, α)` grid (`z = r·e^{iα}`) instead
  of the Cartesian `(x, z)` grid. This is the natural chart for powers/roots/log:
  `zⁿ` becomes a linear shear in log-polar, so √z / ∛z Riemann sheets flatten into
  evenly-spaced tilted planes.
- Pairs naturally with the spinner idea and with the channel-mapping idea below.

### Unified channel-mapping control (axes + color from any source/coordinate)

Generalize the hardwired plotting into one control surface. Today the 4-vector is
fixed as `(Re z, Im z, Re f, Im f)` and color is `arg`→hue + `|·|`→value, chosen
from input (`Domain`) or output (`Range`) via `ColourBy`. Instead, expose an
explicit **assignment matrix**: for each *visual channel* — the 3 spatial axes,
**color**, and optionally **point size / texture / opacity** — pick:

  1. a **source**: input `z` or output `f` (later maybe the 4th/dropped coord,
     or a derived quantity like `|f'|`);
  2. a **coordinate**: Cartesian component (Re / Im) or polar component
     (modulus / argument), with an optional **log** modifier.

This subsumes the current drop-axis modes (a "drop" is just leaving a coordinate
unassigned), the polar toggles above, and the `ColourBy` switch — all as special
cases of one matrix. Provide sensible presets (the current default, "domain
coloring", "modulus surface", etc.) so the matrix isn't overwhelming. Guard
against degenerate/duplicate assignments (e.g. two axes bound to the same
coordinate) with a gentle warning rather than a hard block — sometimes the
collapse is instructive.
