---
kind: progress
session: 2026-06-10-S01
date: 2026-06-10
title: Three-hats review of the Complex Particles app
branch: claude/three-hats-particle-app-rill2c
slug: three-hats-particle-app-rill2c
status: completed
build: passing
followup: null
pr: 205
app: complex-particles
---

# Three-hats review of the Complex Particles app

## Session purpose

Run the `/three-hats` expert review on the Complex Particles app (the app in
`src/animations/ComplexParticles/` plus its `lib/particles` engine and
`ParticleViewerShell`), and report the synthesized results.

## Previous session

First tracked session on this branch. For continuity, the most recent handoff
across branches is
[new-chrome 2026-06-10-S01](../../handoff/new-chrome/2026-06-10-S01-branch-rename-and-continuation.md)
(PR #200 merged: workspace chrome polish, complete complex-function set, embed
routes, and the unified Perspective ⇠ Torus ⇢ Sphere projection slider — all of
which directly shaped the Complex Particles viewer under review here).

## Working notes

<!-- Newest entry first. One ### per state transition. -->

### 🟣 decision · 2026-06-11 — Three-hats round 2: expand, don't fork (unanimous)
**Why:** User asked whether the multi-function direction (render layers ·
overlay · pair mode) should expand Complex Particles or open a new app; the
hats were re-convened on that question.

All three say **expand** — new-app loses on repo history (the
Roots/Multibranch consolidation), architecture (graph/overlay/pair differ by
one line: which two values fill the 4-vector; identity is already function 0),
and pedagogy (the projection/rotation/coloring skills are the shared
investment). The maintainer **revises his prior ruling**: the overlay is the
"second consumer," so the ~450-line `createSeriesObjects` extraction is now
agreed by both him and the consultant — extraction PR first,
behavior-identical, consumer next. Design revision adopted from pedagogy:
**function identity must not take hue** (the honest intersection test is
"clouds meet in matching color"); differentiate by layer/lightness. One open
presentation call for the user: Subject-tier "Axes" pills (2 of 3 hats) vs
top-bar Graph|Curves pills (pedagogy). Plan: 4 PRs — layers → extraction +
two-slot shader → overlay ("Compare with g") → pair mode (axis relabel,
single-valued v1). Reports:
[synthesis](2026-06-11-S01-expert-synthesis.md) ·
[maintainer](2026-06-11-S01-expert-maintainer.md) ·
[consultant](2026-06-11-S01-expert-consultant.md) ·
[pedagogy](2026-06-11-S01-expert-pedagogy.md).

### 🟢 code · 21:40 — Defaults round two, interaction polish, PR #205 watched
**Why:** User feedback batches: landing-view defaults, chart removal, a
nonlinear-view rotation guard, and modifier-based panning.

Landed (commits `bf73fab`, `4bdf187`; build green; new-default screenshots in
assets): Brightness defaults to **Uniform** (flat hue — Magnitude one pick
away); **axis width 2**; **Motion starts Fixed**; default function **z²**;
particle **size 0.3**; units **×π** with **±2π extents**; **reciprocal
sampling on**. The input/output **chart pickers are removed** from the Domain
panel (engine plumbing kept, state pinned Cartesian, explainer section
dropped). The **4D auto-tumble now pauses in Torus/Sphere** — a 4D rotation
before the nonlinear map warps the image rather than turning it (same
mechanism as drop-axis; ambient Yaw/Pitch/Roll still orbits rigidly).
Desktop panning is modifier-based — **right-drag, held Space, or Shift**
(Space ignored while a form control has focus; canvas context menu
suppressed); the Drag Orbit|Pan pill is phone-only now, replaced by a hint
line on desktop. PR **#205** opened by the user from the UI; session
subscribed to its activity (Cloudflare Pages preview is the only check; no
review threads yet).

### 🟡 milestone · 21:10 — Fix-it session complete: all review items + UI restructure landed
**Why:** User directed a fix-it session for synthesis items 1–5 plus the blind
spots and pedagogical errors, and added a UI request mid-session.

Everything verified and green (`npm run build`; dev-server load of both
viewers; runtime probes). Shipped:

- **Lifecycle leak fixed & runtime-verified** — `startAnimationLoop` now
  returns a stop function; `ComplexParticles.onMount` returns full teardown
  (loop, meshes, geometries, materials, axes, scaffold, textures). The new
  `scripts/probe-raf.mjs` measured **9 leaked engine rAF callbacks/s** on the
  gallery before the fix, **0 after**. Sibling sweep (blind spot): TrinaryStars
  / PolygonWorlds / TopologyWalk already clean up correctly — leak was
  engine-specific.
- **Sheet misregistration fixed** — sheet/tile/net `seed` buffers now fill 0.5
  (jitter-neutral); the sheet shaders drop their jitter shift outright, so
  continuous surfaces stay registered with axes and cloud
  (before/after: [pre](assets/2026-06-10-S01-sheet-offset-before.png) /
  [post](assets/2026-06-10-S01-sheet-offset-after.png)).
- **Branch gating + sheet periods** — branch controls show only for
  `MULTIVALUED_INDICES`; single-valued functions render exactly one set (no
  more N× additive brightness); new `branchPeriod()` caps finite families
  (sqrt 2 · cbrt 3 · z^(p/q) q) so duplicate sheets can't be drawn; UI states
  the period. New **Tint sheets** option (default on) hue-offsets sheets —
  evenly around the wheel for finite families
  ([sqrt, both sheets](assets/2026-06-10-S01-sqrt-sheets-ui.png)).
- **Γ(z) is now the real gamma** — Lanczos (g=7, 9 terms) + reflection in
  both GLSL ladders and `complexMath.ts`; poles at 0, −1, −2, … actually blow
  up. CPU implementation verified against Γ(1), Γ(0.5), Γ(5), Γ(−0.5),
  Γ(−1.5), Γ(i) and pole magnitudes — all exact.
- **cbrt is branch-aware** ((θ+2πk)/3, added to `MULTIVALUED_INDICES`) in
  both viewers — the "Roots (multivalued)" category label is now true.
- **Dispatch lockstep guard** — `checkGlslDispatch()` throws in dev if any
  function index lacks a GLSL `if(t==N)` case; wired into both shader
  modules (the PlaneTransform 19–22 silent-identity failure can't recur
  silently).
- **Tween cancellation** — projection/4D-turn/orbit tweens own a single slot
  each (`finish`/`abort`); rapid taps compose instead of fighting; the
  slider and drop-axis abort stale tweens; Reset aborts rotation tweens.
- **Small correctness items** — explicit DropV in both `project()`
  implementations; `POLE_EPS` interpolated into the shader (no duplicated
  0.08 literal); dead `viewTypes` export removed; orphan comment removed;
  the dep-less resize effect now a `[]`-effect with a ResizeObserver on the
  canvas (Net-mode `uResolution` tracks window resizes, not just `resize`
  events).
- **EXPLAINER.md rewritten against the shipped UI** — projection slider with
  honest morphs-are-animations framing, no Hopf-study/fiber/Collapse relics,
  conformality claim dropped, all four render modes documented, branch/sheet
  section with the ln-only inverse-trig disclosure, log-polar seam note, CVD
  notes, and a closing **Numerical honesty** section (pole clamps, the 10³
  cap, the soft-floored torus pole, Lanczos accuracy). README.md updated to
  match. `docs/EMBEDS.md` gains the **URL compatibility contract** (blind
  spot 4). CLAUDE.md's "canonical, simplest consumer" claim corrected.
- **UI restructure (user request)** — new chrome `topExtra` slot (TopBar +
  both workspaces, backward-compatible): the **function dropdown now lives in
  the top bar**, always available; **Particles + Surface merged into one
  Render panel** (mode pills lead; shared shading/light/opacity/intensity
  stated once); **Detail emptied** — particle count → Render, adaptive
  sampling → Domain, axis width → Camera, orientation matrix → 4D Rotation;
  what remains is a one-button **System** panel (Reset settings).
- **Tooling** — `scripts/probe-raf.mjs` committed; `scripts/shoot.mjs` gains
  `SEED_LS` (seed persisted settings before boot) so non-default states can
  be screenshotted without UI scripting.

Open items (not errors, deliberately deferred): default Motion stays
Quaternion (taste call — flipping the flagship's first impression needs the
user's nod); a CVD-safe *cyclic* phase palette (the Dual-hue ramp + colormaps
+ explainer disclosure cover the gap for now); accessibility beyond color
(keyboard/reduced-motion — blind spot 3) is real but a separate work item;
the consultant's vitest harness awaits a repo-policy decision.

### 🟡 milestone · 19:20 — Synthesis written; review complete
**Why:** All three expert agents returned; convergence analysis distills them.

All three endorse the app — no rewrite called for. Independent convergence on
four findings: (1) a real rAF/resource leak (`startAnimationLoop` has no
cancellation, `onMount` returns no cleanup); (2) `EXPLAINER.md` documents the
removed pre-PR-#200 UI; (3) branch sheets render for single-valued functions
(N× brightness/draw cost — PlaneTransform gates this, ComplexParticles
doesn't); (4) the TS/GLSL function dispatch has no lockstep guard and drifted
once already. Pedagogy also found a concrete one-line defect: sheet/tile/net
`seed = 0` + default `jitter = 0.1` translates every surface by (−0.1, −0.1)
off the point cloud. One genuine tension: extract the render-mode subsystem
into the engine now (consultant) vs only at the second consumer (maintainer)
— resolved as "extract when the next particle viewer starts." Synthesis:
[expert-synthesis](2026-06-10-S01-expert-synthesis.md); full reports:
[maintainer](2026-06-10-S01-expert-maintainer.md) ·
[consultant](2026-06-10-S01-expert-consultant.md) ·
[pedagogy](2026-06-10-S01-expert-pedagogy.md). Consultant ran
`npm run build`: passing.

### 🟢 code · 19:00 — Three expert agents returned; reports committed
**Why:** The parallel three-hats dispatch completed (maintainer · consultant
· pedagogy), each writing its full 300–600-line analysis beside this report.

### 🟡 milestone · 18:45 — Session opened; three-hats dispatch prepared
**Why:** User asked to start a session focused on the Complex Particles app and
run the three-hats review on it.

Resolved branch slug `three-hats-particle-app-rill2c` (new branch, no prior
handoff). Read the latest cross-branch handoff (new-chrome, PR #200) for
context: the particle viewer recently gained the projection slider
(Stereo retired), 13 new functions, embed routes, and a free-orbit camera.
Next: launch the three expert agents (maintainer · consultant · pedagogy) in
parallel; outputs land beside this report as
`2026-06-10-S01-expert-{maintainer,consultant,pedagogy,synthesis}.md`.
