# Ideas

A running backlog of feature ideas for animath. Append new ideas at the end;
don't reorder. These are unprioritized sketches, not commitments.

## Particle / 4D viewers

### Auto-spin ("spinners") for the quarter-turn / rotation buttons — ✅ implemented

Shipped in `QuarterTurnControls` (in the standard Actions panel): a spin toggle
under each ↻/↺ button starts/stops a continuous rotation in that plane and
direction, multiple compose, and a single global speed slider sets the rate.
Spin on/off is kept as transient view state (not persisted). Original sketch:

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

### Faithful (normalized) Hopf projection

The current `project` mode 2 / shader "Hopf" is a Hopf-*style* quadratic variant
`(2xv, 2yv, x²+v²−y²−u²)`, not the textbook map, so it doesn't match the clean
"ratio `z/f` on the Riemann sphere" interpretation. Replace (or add alongside) it
with the genuine Hopf map of the complex pair `(z₁, z₂) = (z, f)`:

  H = ( 2·Re(z·conj(f)), 2·Im(z·conj(f)), |z|² − |f|² ) / (|z|² + |f|²)

which lands every particle on the unit sphere S². Then the plot reads exactly:
**latitude = |z|/|f|** (equator where equal; poles where `f→0` / `z→0`),
**longitude = arg(z) − arg(f)**. Sanity checks for the guide/EXPLAINER:
`f = c·z` collapses to a single point (move it with `|c|`/`arg c`); `f = z + c`
and `f = z²` each cover the sphere once (Möbius); `exp` wraps it infinitely.
Consider keeping the old variant as a separate "Hopf (stylized)" option if its
look is liked.

### "Hopf study" mode: freeze the 4D orientation + in-app guide

The 4D spinner/rotation is applied *before* the Hopf map, which remixes input and
output coordinates and breaks the `z/f` reading. For learning Hopf we want a
static, identity-orientation view.

- A one-tap **"Hopf study"** preset (or an auto-hint when Hopf is selected) that
  sets Motion → Fixed and resets the 4D orientation to identity, so the
  latitude/longitude reading holds.
- Optionally suppress / disable the spinners (above) while in this mode, or warn
  that spinning invalidates the ratio interpretation.
- Ship a short **Hopf reading guide** in EXPLAINER.md (the ladder: `c·z` → a
  single point; `z+c`, `z²` → sphere once; `exp` → infinite wrap), plus the
  latitude/longitude legend. A faint sphere wireframe + pole/equator labels would
  help enormously.

### Clifford-torus ("un-collapsed Hopf") projection — IMPLEMENTED

Added as `ProjectionMode.Torus` (a new "Torus" view-type option). It's the Hopf
data with the fibers left intact: normalize `(z1,z2)=(z,f)` onto S³ and
stereographically project from the `(0,0,0,1)` pole, which simplifies to
`(X,Y,Z) = (x, y, u) / (|p| − v)`. `arg z` runs around the hole, `arg f` around
the tube, `|z|/|f|` selects the nested donut, overall scale is dropped. Each Hopf
fiber is a `(1,1)` curve on its donut — the points the Hopf sphere collapses.

Follow-ups:
- DONE — **Collapse → Hopf** slider (shown in the Camera section when the Torus
  view is active): scrubs `uProjAlpha` over a Torus→Hopf cross-fade so you watch
  the `(1,1)` fiber circles shrink to the points the Hopf map identifies.
- DONE — faint **Reference scaffold** (Clifford-torus donuts + unit Riemann
  sphere with equator/poles), toggled per view. See `createHopfScaffold.ts`.
- Open: pole/core-circle **labels** on the scaffold (currently unlabeled lines).
- Open: the stereographic pole (points with `z→0` and `f` near `+i|f|`) sends
  particles toward infinity; consider a soft clamp or an alternate projection
  pole if it's visually distracting for some functions.
