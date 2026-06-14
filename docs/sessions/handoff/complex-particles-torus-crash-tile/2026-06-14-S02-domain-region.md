---
kind: handoff
session: 2026-06-14-S02
date: 2026-06-14
title: Continuous perspective floor + a polar domain-region band
branch: claude/complex-particles-torus-crash-tile
slug: complex-particles-torus-crash-tile
status: completed
build: passed
followup: low
pr: https://github.com/piyarsquare/animath/pull/216
app: complex-particles
---

# Continuous perspective floor + a polar domain-region band

## Summary

Branch `claude/complex-particles-torus-crash-tile` (PR #216) carries two arcs.
**S01** fixed a mobile context-loss crash when switching to the Torus projection
(NaN-guarded tile normal + a floored perspective denominator) and preserved the
projection across a sheet-count rebuild. **S02 (this session)** smoothed that
perspective floor to be continuous, then added a **Domain region** control to
Complex Particles. The region feature briefly included quadrants, an
inside/outside-the-unit-circle filter, and a region tint, but was trimmed back to
**just a polar Radius `|z|` band** at the user's request. Build and lint are
clean; the viewer renders headless with no shader error.

## What changed

- **Continuous perspective floor** (`86e6eff`): the S01 fix floored `|3 + p.w|`
  with a sign flip across the eye plane; reworked so singular points slide off to
  a finite far field continuously. Mirrored in shader `project()` and JS
  `viewpoint.ts`.
- **Domain region — final state** (`a73f870`): the Domain panel gains one control,
  a **Radius `|z|`** `RangeSlider` (top thumb = ∞ = no upper limit). Implemented
  as a shader gate `regionMask(z)` that returns 0 outside the band, multiplied
  into every render mode's alpha — live, no geometry rebuild. Driven by a single
  `uRegionRadius` vec2 uniform synced from `radiusRange` state.
- **Removed before merge** (added in `34f0e79`/`8ee9cc6`, removed in `a73f870`):
  the quadrant chips, the inside/outside filter, and the region tint, plus their
  `uRegionQuad` / `uSideFilter` / `uTintSides` / `uTintQuad` uniforms and the
  `divergentTint` / `quadrantTint` GLSL helpers. The pre-existing **Polar**
  sampling mode was never touched.

## Key files

| File | Role |
|---|---|
| [`src/animations/ComplexParticles/shaders/index.ts`](https://github.com/piyarsquare/animath/blob/a73f870/src/animations/ComplexParticles/shaders/index.ts) | `regionMask` gate + `uRegionRadius`; the floored mode-0 `project()` |
| [`src/animations/ComplexParticles/ComplexParticles.tsx`](https://github.com/piyarsquare/animath/blob/a73f870/src/animations/ComplexParticles/ComplexParticles.tsx) | `radiusRange` state, the Radius `|z|` RangeSlider, uniform sync effect |
| [`src/lib/viewpoint.ts`](https://github.com/piyarsquare/animath/blob/a73f870/src/lib/viewpoint.ts) | JS mirror of the continuous perspective floor (axis cross) |
| [`src/animations/ComplexParticles/EXPLAINER.md`](https://github.com/piyarsquare/animath/blob/a73f870/src/animations/ComplexParticles/EXPLAINER.md) | "Domain region" section trimmed to the radius band |

## Open / not done

- **S01 crash fix is still unconfirmed on a real Android device.** That is the
  branch's only live risk. The fix is reasoned + headless-sanity-checked but the
  Adreno context loss cannot be reproduced in SwiftShader — recommended next step
  is to put the PR #216 Cloudflare preview in front of the user's phone running
  the exact repro (exp · Tiles · Drop X · XY spin · slide Perspective → Torus). See
  the [S01 report](../../progress/complex-particles-torus-crash-tile/2026-06-13-S01-torus-crash-and-sheet-projection.md).
- Domain region is intentionally minimal (radius band only). The quadrant / filter
  / tint variants are recoverable from git at `8ee9cc6` if ever wanted.

## Context

- The branch the task harness named (`claude/mobile-fullscreen-panel-height-*`) is
  not the one checked out; all work has been on and pushed to
  `claude/complex-particles-torus-crash-tile`, which is PR #216. Continue there.
- The radius band is a *render* mask, independent of the **Polar** sampling mode
  (which changes how points are placed). They compose but don't interact.

## Self-reflection

1. **What would you do with another session?** Drive the PR #216 preview on the
   user's Android device to close the S01 crash question — the one unverified item.
2. **What would you change about what you produced?** I built the full
   quadrant/filter/tint feature before confirming scope, then removed it a commit
   later. A scope check up front would have avoided the churn.
3. **What were you not asked that you think is important?** Whether the radius band
   should also drive Polar sampling density, not just mask the render.
4. **What did we both overlook?** Nothing material; the trim left no dead uniforms
   or unused imports (lint clean).
5. **What did you find difficult?** Nothing notable — clean shader seams.
6. **What would have made this task easier?** Scoping the region feature up front.
7. **Follow-up value:** LOW — the shipped radius-band change is complete and
   verified; the only HIGH item (S01 real-device crash check) is tracked in S01.
