---
kind: progress
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

## Session purpose

Continuation on the Complex Particles branch. Two threads:
1. Smooth the mobile-crash perspective fix from S01 — the sign-preserving floor
   on `|3 + p.w|` had a discontinuity at the eye plane.
2. Add a **Domain region** control so the user can restrict the sampled plane.
   This grew into a full polar feature (radius band · quadrants · inside/outside
   filter · region tint), then was **trimmed back to just the radius band** at
   the user's request.

## Previous session

[2026-06-13-S01](2026-06-13-S01-torus-crash-and-sheet-projection.md): fixed the
Torus-switch mobile context-loss crash (NaN tile normal + perspective floor) and
preserved the projection across a sheet-count rebuild. Headline crash fix still
awaiting real-device confirmation.

## Working notes

<!-- Newest entry first. -->

### 🟢 code · ~02:05 — Trim the domain region down to the radius band
**Why:** user decided the quadrants / filter / tint were more than the feature needed.

Removed the **Quadrants** chips (+ swatches), the **Unit circle** inside/outside
filter, and the entire **Region tint** control (both the divergent log-`|z|`
inside/outside shade and the per-quadrant hue tags). The Domain panel keeps only
the polar **Radius `|z|`** band. Dropped the `uRegionQuad` / `uSideFilter` /
`uTintSides` / `uTintQuad` uniforms and the `divergentTint` / `quadrantTint` GLSL
helpers; `regionMask` is now just the radial band test. Build + lint clean;
headless render confirms no shader error. Commit `a73f870`.

### 🟢 code · earlier — Region tint to mark structure
**Why:** make the unit circle and the four quadrants legible in the masked plane.

Added a **Region tint** pill (Off · Quadrants · In/out · Both): a per-quadrant
hue multiplier and a divergent log-`|z|` shade neutral at `|z|=1`, applied in all
four render modes. **Superseded by the trim above.** Commit `8ee9cc6`.

### 🟢 code · earlier — Polar domain-region controls
**Why:** let the user carve the sampled plane (annulus / quadrants / unit-circle side).

Added the `regionMask` shader gate (radius band ∩ quadrants ∩ inside/outside),
fed by `uRegionRadius` / `uRegionQuad` / `uSideFilter`, multiplied into each
render mode's alpha — live masking with no geometry rebuild. The radius band is
the only part that survived the later trim. Commit `34f0e79`.

### 🟢 code · earlier — Make the perspective singularity floor continuous
**Why:** S01's sign-preserving floor still flipped sign across the eye plane (a jump).

Reworked the mode-0 `project()` denominator floor (shader + `viewpoint.ts`) so
`|3 + p.w|` is floored without the sign flip — singular points now slide off to a
finite far field continuously instead of snapping between +∞-ish and −∞-ish sides.
Commit `86e6eff`.

## Open questions / next steps

- The **S01 headline crash fix remains unconfirmed on a real Android device** —
  that is the branch's one live risk (see the S01 report). This session's work is
  orthogonal (a new feature + a continuity refinement) and builds/renders clean.
- Domain region is now intentionally minimal (radius band only). If the quadrant /
  filter / tint ideas are wanted later, they live in git history at `8ee9cc6`.

## Self-reflection

1. **What would you do with another session?** Get the PR preview in front of the
   user's Android device to finally close the S01 crash question — it's the only
   unverified thing on the branch.
2. **What would you change about what you produced?** I built the full
   quadrant/filter/tint feature before checking how much the user actually wanted;
   it shipped in two commits and was then removed in one. A quick "how far should
   this go?" up front would have saved the round trip.
3. **What were you not asked that you think is important?** Whether the radius band
   should also gate the **Polar** sampling rings/spokes density — right now it's a
   pure render mask, independent of how the plane is sampled.
4. **What did we both overlook?** Nothing material; the trim left no dead uniforms
   or unused imports (verified by lint).
5. **What did you find difficult?** Nothing notable — the shader had clean seams
   for both adding and removing the mask.
6. **What would have made this task easier?** Scoping the region feature up front.
7. **Follow-up value:** LOW — the shipped change (radius band) is complete and
   verified; the only HIGH item belongs to S01 (real-device crash check), tracked
   there.
