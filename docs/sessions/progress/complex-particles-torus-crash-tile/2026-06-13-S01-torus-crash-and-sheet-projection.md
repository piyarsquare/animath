---
kind: progress
session: 2026-06-13-S01
date: 2026-06-13
title: Torus-switch mobile crash + sheet-count projection reset
branch: claude/complex-particles-torus-crash-tile
slug: complex-particles-torus-crash-tile
status: in-progress
build: passed
followup: high
pr: https://github.com/piyarsquare/animath/pull/216
app: complex-particles, engine
---

# Torus-switch mobile crash + sheet-count projection reset

## Session purpose

Two Complex Particles bugs reported from mobile:
1. With **exp · Drop X · XY spin · Tiles**, sliding the projection
   **Perspective → Torus** crashes the app (canvas goes black on Android Brave).
2. Changing the number of Riemann sheets silently resets the camera to the
   Perspective view; the current viewport should be preserved.

## Previous session

First tracked session on this branch (no `/start-session` was run; report
written mid-session at the user's request).

## Working notes

<!-- Newest entry first. -->

### 🟢 code · 17:35 — Preserve the projection across a sheet-count rebuild
**Why:** rebuilt materials reset the projection cross-fade, snapping to Perspective.

Changing the sheet range runs `rebuildBranchObjects`, which disposes and
recreates every per-branch material. Fresh materials start at `makeUniforms`'
projection defaults (`uProjMode = uProjTarget = projRef`, `uProjAlpha = 0`),
collapsing any active cross-fade. The render loop re-pushes **rotation** each
frame (orientation survived) but never the **projection**, so a Torus/Sphere/
mid-morph view snapped back to Perspective. Fix: snapshot `uProjMode/uProjTarget/
uProjAlpha` from the first old material before disposal and restore them onto the
rebuilt set. **Verified** headless: a sqrt Torus view stays Torus after 1 → 2
sheets. Commit `521c72c`.

### 🟢 code · 17:20 — Guard the tile face-normal against NaN (likely the real crash fix)
**Why:** Adreno (Android) faults the GPU on NaN shader output; desktop/SwiftShader don't.

User confirmed the crash is **WebGL context loss** (canvas black, chrome intact)
on **Android Brave**. In `tileVertexShader`, near a projection fold `cross(du, dv)
→ 0` and `normalize(0) = NaN`; the NaN reaches `gl_FragColor` via
`vFacing`/`vNormalView`. Replaced it with a guarded normal (screen-facing
fallback when the cross product vanishes). Commit `f910ca0`. Drop X never folds
(no division) — consistent with it being the only stable mode.

### 🟢 code · 17:06 — Stop continuous spins when the projection knob is touched
**Why:** user's stabilization idea — don't morph while a spin re-sweeps the singularity.

Wrapped the projection slider's `onChange` so it clears all running spins first
(`handleProjMix` already releases any drop axis). Commit `d4223b4`.

### 🟢 code · 15:40 — Floor the perspective projection denominator
**Why:** `exp`'s `Im(f)` sweeps through −3, the eye plane, sending `p.xyz/(3+p.w)` to ∞.

Soft-floored `|3 + p.w|` (sign-preserving) in the shader's mode-0 `project()` and
mirrored it in JS `viewpoint.ts` (axis cross); floored the legacy Stereo pole
too. Singular points now land far off-screen but finite. Non-singular pixels
unchanged. Commit `8601da1`. (Necessary but, per the user's later report, **not
sufficient** on its own — see the NaN guard above.)

### 🔵 finding · 15:30 — The crash is a real mobile-GPU fault, unreproducible headless
**Why:** software WebGL (SwiftShader) tolerates the degenerate geometry that crashes Adreno.

Drove the exact sequence headlessly (exp · Tiles · Drop X · XY spin · slider
0→1): no JS error, no context loss, bounded geometry. So the failure is
GPU-driver-specific. This is the central limitation of this session — every fix
is reasoned + headless-sanity-checked, but the actual crash can only be confirmed
on the user's phone via the Cloudflare PR preview.

### 🟣 decision · 14:45 — Diagnose before changing GPU-territory code
**Why:** a context-loss "fix" guessed blind is likely wrong; reproduce/understand first.

Traced the projection control path: `handleProjMix` releases Drop X and
reactivates Perspective as the cross-fade source — pinpointing the singular term
that distinguishes the crashing path from the stable Drop X state.

## Open questions / next steps

- **Unverified:** does the NaN-normal guard (`f910ca0`) actually stop the Android
  Brave context loss? Needs a real-device check on the rebuilt PR preview.
- If it still crashes: ask whether plain **Points** mode also crashes. Points-yes
  ⇒ NaN-in-fragment isn't the whole story (look at raw GPU load / the morph's
  double `project()` per `surfacePos`); Points-no ⇒ the tile fragment path is it.
- Consider sanitizing all shader outputs (clamp/finite-guard `gl_FragColor`) as a
  blanket Adreno safeguard if the targeted guard proves insufficient.

## Self-reflection

**Follow-up value:** HIGH

My first diagnosis (perspective singularity) was correct but **incomplete** — I
shipped it as "the fix" and made a PR before the user could confirm, then learned
it still crashed. The lesson: for GPU-context-loss bugs I cannot reproduce, frame
fixes as *hypotheses to verify on hardware*, not solutions, and front-load the
"what does the crash look like / which GPU" questions — the answer (Adreno + NaN
intolerance) reshaped the diagnosis entirely. High follow-up because the headline
crash fix remains **unconfirmed on a real device**.
