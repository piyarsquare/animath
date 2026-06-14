---
kind: handoff
session: 2026-06-14-S01
date: 2026-06-14
title: Polygon Worlds — embedding inset for every world, richer shading, phone fix; ℝP² seam parked
branch: claude/topology-world-review-m9p5as
slug: topology-world-review-m9p5as
status: completed
build: passed
followup: medium
pr: null
app: polygon-worlds
---

# Polygon Worlds — embedding inset for every world, richer shading, phone fix; ℝP² seam parked

## Summary

A long single session on **Polygon Worlds** (`#/polygon-worlds`) aimed at tightening
the app and enriching the visuals. Three things shipped and stuck: the extrinsic
**embedding inset now exists for every world** (was ℝP²-only) with a live character
bead; the scene got **richer shading** (filmic tone mapping + an image-based gradient
environment, a sky dome, a shinier shell); and the **phone layout was fixed** so the
walk pad and overlays are reachable. One thing was attempted four times and **fully
reverted**: the ℝP² "inside/outside reverses at the seam" behavior (roadmap item C) —
the user rejected every model, so the spherical presenter is back to its original
sphere and C is **parked pending a concrete reference**. Build passes, lint clean
(0 errors, 60 baseline warnings).

## What changed

**Kept (shipped):**

1. **Embedding inset for all 8 worlds** — generalized the old ℝP²-only Roman-surface
   inset into a per-world registry (`immersions.ts`): torus → donut, Klein → figure-8
   bottle, ℝP² → Roman surface, sphere, genus-2 → double torus, Dyck → schematic. Each
   shows a **live character bead** (spherical worlds ride the true direction; flat
   worlds the exact chart `(u,v)`; the two hyperbolic worlds an honest approximation
   from the Poincaré-disk chart). The engine exposes `getPose()` for the spherical
   marker. *(Fixed reference markers — pole + corners — were added then removed at the
   user's request; the inset shows only the character bead.)*
2. **Richer scene shading** — ACES filmic tone mapping + a prefiltered **gradient
   environment** (`makeGradientEnv`, a cheap PMREM studio sky) set as
   `scene.environment` in the shared engine, so every world's materials catch IBL fill
   + soft specular (visible on the torus's glass floor). Spherical adds a graded **sky
   dome** + a metallic/reflective shell. The inset renderer got tone mapping +
   hemisphere/rim lights.
3. **Phone layout fix** — below 740px the workspace is full-bleed with a floating
   bottom dock that buried the MovePad's lower buttons and the inset. Now phone-aware
   via `usePhone()`: MovePad lifts above the dock (`bottom:100`), inset → top-left,
   mini-map → top-right (below the bar, shrunk to ~112px). Verified at 390×844.

**Reverted (roadmap C, the ℝP² seam):** four attempts to make crossing the seam
reverse inside/outside — (a) camera somersault onto the inner face, (b) a smooth
reflection-through-the-tangent-plane eversion, (c) the same but driven by latitude
(not a timed event), (d) a fixed per-vertex everted surface (convex north → flat seam
→ concave brim). The user rejected each ("character walking upside down", "the entire
world flattens", "this is not working") and asked to revert. `spherical.ts` and the
ℝP² EXPLAINER section were restored to their pre-C state (commit `02dda65`).

## Key files

| File | Role |
|---|---|
| [`instruments/immersions.ts:187`](https://github.com/piyarsquare/animath/blob/6af72a9/src/animations/PolygonWorlds/instruments/immersions.ts#L187) | Per-world immersion registry: `build()` mesh + `at(u,v)` chart map + live `marker`. Hyperbolic `genus2At`/`dyckAt` are approximations. |
| [`instruments/embeddingInset.tsx:100`](https://github.com/piyarsquare/animath/blob/6af72a9/src/animations/PolygonWorlds/instruments/embeddingInset.tsx#L100) | The inset's own WebGL renderer; phone-aware position/size; renders only the character bead now. |
| [`PolygonWorlds.tsx:55`](https://github.com/piyarsquare/animath/blob/6af72a9/src/animations/PolygonWorlds/PolygonWorlds.tsx#L55) | `usePhone()`; passes `phone` to `MovePad` (L429) and `SquareMiniMap` (L503) for the mobile layout. |
| [`fundamentalSquareEngine.ts:77`](https://github.com/piyarsquare/animath/blob/6af72a9/src/animations/PolygonWorlds/fundamentalSquareEngine.ts#L77) | Shared shading: tone mapping + `scene.environment` from `makeGradientEnv` (L144). Affects all three covers. |
| [`presenters/spherical.ts:110`](https://github.com/piyarsquare/animath/blob/6af72a9/src/animations/PolygonWorlds/presenters/spherical.ts#L110) | Sky dome (`skyDome`, L69) + reflective shell. **Otherwise restored to the original sphere — the seam-eversion code was reverted.** |
| [`docs/sessions/progress/topology-world-review-m9p5as/2026-06-14-S01-tighten-and-enrich.md`](https://github.com/piyarsquare/animath/blob/6af72a9/docs/sessions/progress/topology-world-review-m9p5as/2026-06-14-S01-tighten-and-enrich.md) | Full timeline incl. all four reverted seam attempts (kept for context). |

## Open / not done

- **Roadmap C — ℝP² inside/outside reversal at the seam — PARKED.** Four geometric
  models were all rejected. **Do not re-attempt blind.** The user's words point at
  "local curvature flattens and then reverses" / "folds upward around the character"
  with the character staying upright and *not* the whole world flattening — but the
  exact intended rendering never converged. The unblocker is a **concrete reference**
  (sketch, video, or a named existing visualization) before writing any code.
- **Bloom / glow effects** — deferred; the bright elements (gold beacon, seam,
  markers) would pop with a bloom pass, but it needs an `EffectComposer` wired into
  the engine's render path (currently `deps.renderer.render` in `frame()`), with
  resize handling — a larger, riskier change in this multi-window workspace.
- **Hyperbolic inset markers** (genus-2, Dyck) are approximations from the disk chart
  (`genus2At`/`dyckAt`); a more faithful map would be a nice-to-have.

## Context

- **No edits to the append-only shared files** (`index.tsx`, `apps.ts`, `README.md`,
  `CLAUDE.md`) — all work is inside `src/animations/PolygonWorlds/`, so a
  `merge origin/main` before any PR should be clean. Polygon Worlds was already a
  registered route.
- **Headless verification** is available this session: `scripts/shoot.mjs` drives a
  SwiftShader headless Chrome. Drive the app by setting the **Gluing** `<select>`,
  press-holding the MovePad buttons (`aria-label="fwd"/"left"/"right"`), and reading
  the `?polydebug` bridge `window.__poly.map()` (chart `u,v,flipped`). `npm run preview`
  serves `dist/` at `:4173`; rebuild after changes or the preview serves stale.
- **The seam saga is the cautionary tale of this session:** I guessed at the target
  behavior four times instead of pinning it down first. The one AskUserQuestion I did
  ("world everts around you") still didn't capture it. Next time, get a reference
  before coding geometry the user can picture but I can't.

## Self-reflection

1. **What would you do with another session?** Get a concrete reference for roadmap C
   (sketch/video) and only then attempt it; otherwise leave it parked and do the bloom
   pass + more faithful hyperbolic inset markers, which are well-defined.
2. **What would you change about what you produced?** I spent four full attempt-revert
   cycles on the seam. After the second rejection I should have stopped coding and
   insisted on a reference or a tighter spec rather than producing a third and fourth
   geometric model on guesswork.
3. **What were you not asked that you think is important?** Whether the richer shading
   should extend to the *other* apps (the env/tone-mapping is shared-engine, so it
   already lifts torus/Klein/hyperbolic, but the sky dome is spherical-only) — and
   whether bloom is wanted now.
4. **What did we both overlook?** That "inside and outside reverse at the seam" is
   under-specified geometrically — it sounds concrete but admits many renderings, and
   we never grounded it in a shared picture before I built four of them.
5. **What did you find difficult?** Translating the user's intuitive description of
   the seam ("folds upward around the character", "local curvature reverses") into a
   surface I could render — every model satisfied some phrases and violated others.
6. **What would have made this task easier?** A reference image/video for the seam
   behavior up front, and a habit of stopping after the second miss to re-spec instead
   of iterating on guesses.
7. **Follow-up value:** MEDIUM — the shipped work (inset-for-every-world, shading,
   phone fix) is complete and verified; the open items (parked C, bloom, faithful
   hyperbolic markers) are well-scoped additions, and C specifically must not be
   re-attempted without a reference.
