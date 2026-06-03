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
