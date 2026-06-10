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
pr: null
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
