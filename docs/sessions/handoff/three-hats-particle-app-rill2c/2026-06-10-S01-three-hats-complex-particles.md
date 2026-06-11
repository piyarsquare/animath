---
kind: handoff
session: 2026-06-10-S01
date: 2026-06-11
title: Complex Particles — three-hats review, fixes, defaults, and the multi-function plan
branch: claude/three-hats-particle-app-rill2c
slug: three-hats-particle-app-rill2c
status: completed
build: passing
followup: medium
pr: 205
app: complex-particles
---

# Complex Particles — three-hats review, fixes, defaults, and the multi-function plan

## Summary

A long, feedback-driven session on the Complex Particles app (route
`#/complex-particles`, engine `src/lib/particles/`, shell
`ParticleViewerShell`). It ran the `/three-hats` review on the app, then
**executed** the entire fix list it produced — a real render-loop leak, sheet
misregistration, branch-sheet gating, a true Lanczos Γ, a TS/GLSL dispatch
guard — plus a UI restructure (function picker in the top bar, Particles +
Surface merged into one Render panel, Detail emptied) and a second round of
defaults from the user (z² landing view, π units / ±2π extents, flat
brightness, Fixed motion, reciprocal sampling, charts removed, modifier-based
panning, tumble paused in the nonlinear views). It closed by running a
**second** three-hats review on a forward question — *expand the app or open a
new one for multi-function visualization* — and committing the unanimous
answer as a `kind: plan` report. **Everything is on PR #205, build green,
Cloudflare preview deploying clean.** The next session builds from the plan.

## What changed

**Fix-it work (commit `1cd4614`), each verified at runtime where possible:**

- **Render-loop lifecycle leak fixed.** `startAnimationLoop` now returns a
  stop function; `ComplexParticles.onMount` returns full teardown (loop,
  meshes, geometries, materials, axes, scaffold, textures). The new
  `scripts/probe-raf.mjs` measured **9 leaked engine rAF callbacks/sec on the
  gallery before, 0 after**. Sibling `Canvas3D` apps (Trinary, PolygonWorlds,
  TopologyWalk) were swept and already clean.
- **Sheet misregistration fixed.** Sheet/tile/net `seed` buffers fill 0.5
  (jitter-neutral) and the sheet shaders drop their jitter shift, so
  continuous surfaces stay registered with the axes and cloud.
- **Branch gating + sheet periods.** Branch controls show only for
  `MULTIVALUED_INDICES`; single-valued functions render exactly one set (no
  more N× additive brightness on `exp`). New `branchPeriod()` caps finite
  families (sqrt 2 · cbrt 3 · z^(p/q) q). New **Tint sheets** option hue-offsets
  simultaneous sheets.
- **Γ(z) is now real gamma** — Lanczos (g=7, 9 terms) + reflection in both
  GLSL ladders and `complexMath.ts`; poles at 0, −1, −2, … blow up. Verified
  numerically (Γ(½)=√π, Γ(5)=24, Γ(i), poles). **cbrt is branch-aware** in
  both viewers.
- **`checkGlslDispatch()`** throws in dev if any function index lacks a GLSL
  `if(t==N)` case (the PR-#200 PlaneTransform 19–22 silent-identity bug can't
  recur). Tween cancellation in `useViewControls` (projection/turn/orbit own
  one slot each). Explicit DropV; `POLE_EPS` injected into the shader; dead
  `viewTypes` export removed.
- **Docs**: EXPLAINER.md rewritten to the shipped UI with a Numerical-honesty
  section; README updated; `docs/EMBEDS.md` URL-compatibility contract.

**UI restructure (commit `1cd4614`):** new chrome `topExtra` slot
(TopBar + both workspaces) puts the **function dropdown in the top bar**;
**Particles + Surface merged into one Render panel**; **Detail emptied**
(count → Render, adaptive → Domain, axis width → Camera, orientation matrix →
4D Rotation), leaving a one-button **System** panel.

**Defaults round 2 (commits `bf73fab`, `4bdf187`):** Brightness → Uniform
(flat); axis width 5 → 2; Motion → Fixed; default function → **z²**; size →
0.3; units **×π** with **±2π** extents; **reciprocal sampling on**;
input/output **chart pickers removed** (engine plumbing kept, state pinned
Cartesian). **4D auto-tumble now pauses in Torus/Sphere** (a 4D rotation
before the nonlinear map warps the image; ambient Yaw/Pitch/Roll still
orbits). **Desktop panning by modifier** — right-drag, held Space, or Shift
(Space ignored while a form control is focused; context menu suppressed); the
Drag Orbit|Pan pill is phone-only now.

**Two three-hats reviews + the plan (commits `01b3844`, `5c42292`):** the
first review audited the app (4 expert files, 2026-06-10); the second
adjudicated *expand vs new app* for multi-function viz (4 files, 2026-06-11).
Both unanimous-ish. The decision and a detailed **4-PR plan** are committed as
a new **`kind: plan`** report — a convention this session established
(surfaced by the control center; see `REPORT_STYLE.md`, `build-sessions.mjs`
`kindRank`, CLAUDE.md).

## Key files

| File | Role |
|---|---|
| [`src/lib/particles/createAnimationLoop.ts`](https://github.com/piyarsquare/animath/blob/5c42292fe44f67ebc9e5b8e6e769e95dc14e3e27/src/lib/particles/createAnimationLoop.ts) | loop returns a stop fn; tumble pauses in Torus/Sphere via `viewTypeRef` |
| [`src/animations/ComplexParticles/ComplexParticles.tsx`](https://github.com/piyarsquare/animath/blob/5c42292fe44f67ebc9e5b8e6e769e95dc14e3e27/src/animations/ComplexParticles/ComplexParticles.tsx) | full onMount teardown; per-branch orchestration (extraction target for the plan); branch gating + tint; top-bar picker |
| [`src/lib/complexMath.ts`](https://github.com/piyarsquare/animath/blob/5c42292fe44f67ebc9e5b8e6e769e95dc14e3e27/src/lib/complexMath.ts) | Lanczos Γ, branch-aware cbrt, `branchPeriod()`, `checkGlslDispatch()`, `MULTIVALUED_INDICES` |
| [`src/components/ParticleViewerShell.tsx`](https://github.com/piyarsquare/animath/blob/5c42292fe44f67ebc9e5b8e6e769e95dc14e3e27/src/components/ParticleViewerShell.tsx) | merged Render panel; System panel; `topExtra`; desktop pan hint vs phone pill |
| [`src/lib/particles/useGestureRotation.ts`](https://github.com/piyarsquare/animath/blob/5c42292fe44f67ebc9e5b8e6e769e95dc14e3e27/src/lib/particles/useGestureRotation.ts) | right-drag / Space / Shift panning; context-menu suppression |
| [`src/animations/ComplexParticles/shaders/index.ts`](https://github.com/piyarsquare/animath/blob/5c42292fe44f67ebc9e5b8e6e769e95dc14e3e27/src/animations/ComplexParticles/shaders/index.ts) | `surfacePos` builds `p4 = vec4(zP, fP)` — the two-slot generalization point for the plan |
| [`docs/sessions/progress/three-hats-particle-app-rill2c/2026-06-11-S01-plan-multi-function.md`](https://github.com/piyarsquare/animath/blob/5c42292fe44f67ebc9e5b8e6e769e95dc14e3e27/docs/sessions/progress/three-hats-particle-app-rill2c/2026-06-11-S01-plan-multi-function.md) | **the next-step plan** — 4 PRs, constraints, budgets, open decisions |
| [`scripts/probe-raf.mjs`](https://github.com/piyarsquare/animath/blob/5c42292fe44f67ebc9e5b8e6e769e95dc14e3e27/scripts/probe-raf.mjs) | headless rAF-leak counter; `shoot.mjs` gained `SEED_LS` |

## Open / not done

- **PR #205 is open (draft), green, up to date.** Session is subscribed to its
  activity. Only check is the Cloudflare Pages preview (no GitHub Actions CI on
  PRs — Pages deploy fires on push to `main`). No review threads yet.
- **The plan is the next step.** PRs 1 (render layers) and 2 (extraction +
  two-slot shader, behavior-identical) can start immediately. PRs 3 (overlay)
  and 4 (pair mode) are blocked on **two user decisions** (recorded in the
  plan's "Open decisions" callout):
  1. the second-space feature's **name** (Pair / Curves / Axes);
  2. **mode-switch placement** — Function-panel pills (maintainer + consultant
     default) vs top-bar `Graph | Curves` pills (pedagogy).
- **Carried-forward, deferred deliberately**: a cyclic CVD-safe *phase*
  palette; keyboard / reduced-motion accessibility; the consultant's vitest
  harness (awaits a repo-policy decision on adding a test runner).
- A real-device phone pass on the new panel layout + Space/right-drag panning
  was not done (verified headlessly only).

## Context

> [!IMPORTANT]
> **The multi-function decision is settled: expand Complex Particles, no new
> app.** All three hats (both reviews) agree. Pair mode `(f(z), g(z))`
> *contains* today's app as the special case `(identity, f)`, and identity is
> already `functionNames[0]`. A sibling app would re-fragment the code the
> repo's biggest cleanup consolidated. The maintainer **revised his earlier
> "no extraction before a second consumer" ruling on the record** — the
> overlay IS that consumer, so the `lib/particles` object-orchestration
> extraction (plan PR 2) is now endorsed, conditioned on a behavior-identical,
> screenshot-verified PR.

> [!CAUTION]
> **Hue must never encode function identity** (pedagogy veto, adopted into the
> plan's binding constraints). Color stays a function of z on every graph, so
> overlaid clouds "meet in matching color" at solutions of f=g. Distinguish f
> from g by render layer and/or lightness, not hue. The per-sheet tint keeps
> its current meaning (sheet identity within one function).

> [!NOTE]
> Saved settings override defaults, so the new defaults (z², Fixed, flat
> brightness, π units) only appear after **System → Reset settings** or in a
> fresh profile. The branch preview
> (`https://claude-three-hats-particle-a.animath.pages.dev`) is a fresh
> profile, so it shows them.

- `kind: plan` reports are the new convention for app-specific forward plans:
  `status: proposed` until executed (then flip status, fill `pr`). The control
  center reads branch tips, so plans surface only once committed.
- Render-layer combinations are **not** "near-free" (the maintainer's warning,
  now in the plan): the blending/depth/renderOrder matrix must be defined
  before the panel UI — tiles write depth, net is currently unpinned.

## Self-reflection

1. **What would you do with another session?** Execute plan PR 1 (render
   layers) and PR 2 (the behavior-identical extraction + two-slot shader) —
   both unblocked, and PR 2 de-risks everything after it. Get the name +
   placement decisions before touching PR 3/4 UI.
2. **What would you change about what you produced?** The session ran very
   long and mixed three distinct phases (review, fixes, planning) under one
   progress report and one handoff filename; splitting the fix-it work and the
   planning into separate sessions would have made each handoff cleaner.
3. **What were you not asked that you think is important?** Whether the repo
   should adopt a test runner — it keeps surfacing (dispatch drift, the Γ
   change, the coming fan-out) and is now a recurring tax that a half-day
   vitest harness would end.
4. **What did we both overlook?** A real-device phone pass. The Render-panel
   merge and the Space/right-drag panning were verified headlessly; touch and
   the on-screen-keyboard interaction with hold-Space are unverified.
5. **What did you find difficult?** Keeping the per-branch material
   orchestration correct while gating it — the same code that the plan now
   wants extracted is genuinely tangled, which is itself the argument for PR 2.
6. **What would have made this task easier?** The `scripts/probe-raf.mjs` and
   `SEED_LS` harness, had they existed at the start; they were built mid-session
   and immediately paid off. They are committed now.
7. **Follow-up value:** **MEDIUM** — the shipped work is complete and verified;
   the follow-up is new feature work (the 4-PR plan), gated on two small user
   decisions, not on anything unfinished or uncertain here.
