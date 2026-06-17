---
kind: progress
session: 2026-06-17-S01
date: 2026-06-17
title: Quaternion exploration app — scoping
branch: claude/quaternion-exploration-app-ig4jmy
slug: quaternion-exploration-app-ig4jmy
status: in-progress
build: unknown
followup: null
pr: null
app: quaternions
signals: needs-dan
next: Scope what the quaternion app should teach/show, then design panels + views
---

# Quaternion exploration app — scoping

## Session purpose

Develop a new application or animation that explores **quaternion numbers**.

## Previous session

First tracked session on this branch (`claude/quaternion-exploration-app-ig4jmy`).
The most recent handoff across the repo is
[Polygon Worlds — tighten and enrich](../topology-world-review-m9p5as/2026-06-14-S01-tighten-and-enrich.md)
(`status: completed`), which is unrelated to this new quaternion topic — noted
here only so nothing is lost. Several other app branches (trees-and-nets PR #211,
complex-particles three-hats PR #205) remain in flight but are likewise unrelated.

## Working notes

<!-- Newest entry first. -->

### 🟣 decision · 16:00 — Refined the skill (de-lead + audience/contrarian), opening a PR for review
**Why:** Dan reviewed the AskUserQuestion options: lens-set = "audience/contrarian mix"
(de-lead the prompts AND add new vantages); next step = "rerun, but review current
outputs first — open a PR."

Applied to `/explore-concept`:
- **Quarantine the candidate visuals.** The foundation's "standard visual
  representations" now go in a `## Prior-art visualizations (quarantined …)` section;
  generative lenses (1–5, 9–10) get the *facts* but must form their own picture first
  and treat that section as prior art to differentiate from — fixing the convergence-
  as-artifact problem.
- **Two new lenses → ten total:** **The Audience** (a naive first-contact learner —
  the misconceptions people *actually* arrive with) and **The Contrarian** (red team —
  resist the obvious app, propose a genuinely different fork so the synthesis chooses
  rather than rationalizes).

Updated CLAUDE.md to ten lenses. **Not re-running yet** — opening a PR so Dan can read
the eight current lens reports + the concept plan first; the de-led re-run follows his
review.

### 🟡 milestone · 15:40 — Phase 3 synthesis written (concept plan)
**Why:** All eight lenses returned; converge into ranked candidates + a draft build plan.

`2026-06-17-S01-concept-plan.md` (`kind: plan`, `status: proposed`). The eight lenses
converged hard on one spine: **lead with a visible failure** (gimbal lock / failed
triplets), **on-ramp from ℂ-multiplication = plane rotation**, **core verb = the
two-sided sandwich q v q⁻¹ as conjugation**, and **the "two clocks" scene** (object
turning at θ beside q on a stereographic S³ at θ/2) — which defuses four of the five
worst pitfalls in one frame. S³ projection **already ships** in `viewpoint.ts`.

**Recommendation:** one chaptered app — **"The Two Clocks" quaternion rotation
studio** (custom `Canvas3D` + `<Workspace>`, split `panes` object↔S³, chapters as
layouts) that *absorbs* the failed-triplet forge (cold open) and the orientation-
docking game (play chapter) rather than splitting into separate apps. Build the
S/S–M spine first; spike two unknowns (two `Canvas3D` in one pane; mid-sandwich
legibility).

> [!IMPORTANT]
> Self-reflection flags the convergence may be partly an **artifact**: my lens
> prompts pre-loaded each agent with the foundation's leading visuals (S³, half-angle,
> belt trick), so they partly agreed because they were told the same answers. The top
> skill refinement: give lenses the *facts* but not the *candidate pictures*. To
> discuss with Dan along with the lens-set design.

### 🟢 code · 15:05 — Phase 2: eight lens agents dispatched in parallel
**Why:** Produce a full draft to critique (Dan wants to assess on real outputs and
then refine the skill + lens set).

Foundation research landed (high quality, well-cited; committed). Key decision-relevant
findings: (1) the **"impossible 3D" theorem** (Frobenius/Hurwitz — ℝ³ provably can't be
a division algebra) makes Hamilton's wasted decade a *forced* failure → strong hook;
(2) **stereographic projection of S³** is the field's gold-standard visual (eater.net /
3Blue1Brown), and it **already exists in `viewpoint.ts`**; (3) the **half-angle θ/2 and
the double cover are the same phenomenon** (the two-sided sandwich q v q⁻¹), defusable
with one interaction; (4) the **720° belt/plate trick** is the most visceral hook;
(5) **gimbal lock** is the cleanest "why bother."

Launched eight lens agents (originator, foundations, in-the-wild, new-light, geometer,
builder, educator, game-designer), each reading the foundation and writing its own
`kind: lens` report. Synthesis follows once all return.

> [!NOTE]
> Dan flagged that his original concept list was illustrative, not a careful
> orthogonal/exhaustive set — he expected augmentation + back-and-forth. Plan: let this
> run produce a full draft, then critique the **outputs** (and the lens set itself) and
> refine the skill before committing to a build.

### 🟢 code · 14:45 — Ran `/explore-concept quaternions` — Phase 1 (foundation)
**Why:** Begin the divergent scoping pass for the quaternion app.

Added Educator + Game Designer lenses to the skill first (Dan's request) — now eight
lenses. Kicked off the skill. Phase 1: delegated the cited foundation research to a
dedicated research agent (deep-research style, writing
`2026-06-17-S01-concept-foundation.md` directly) and ran the codebase prior-art scan
in parallel.

**Prior-art scan (for the Builder lens + synthesis):** the framework already has
deep quaternion/4D machinery to reuse —
- `src/lib/viewpoint.ts` — `quatMul`, `quatConj`, `quatRotate4D` (p ↦ a·p·conj(b)),
  `makeUnitQuat(angle, axis)`, and `project()` with Perspective / Stereo / **Hopf**
  (faithful Hopf map to S²) / **Torus** (Clifford-torus stereographic) / Drop modes.
  The Hopf fibration is *already implemented and shipping* in Complex Particles.
- `src/math/quat4.ts` — `quarterQuat(plane, θ)` left/right unit-quaternion builder.
- `src/controls/QuarterTurnControls` — the 4D-rotation panel (eighth-turns, spins,
  isoclinic doubles); context-switches to Yaw/Pitch/Roll in nonlinear projections.
- `ParticleViewerShell` + `src/lib/particles` — turnkey 4D particle viewer (but it is
  function-graph oriented: domain sampling, colormaps, render modes; a *rotation*
  app would use a different subject, so likely a **custom Three.js app** on `Canvas3D`
  + `<Workspace>`, not the shell).
- `<Workspace>` supports `immersive` (single view fills the stage) and an `actions`
  strip (≤5 verbs) — good for a focused rotation toy. `ViewDef.panes` gives a split
  view (e.g. object ↔ S³ map side-by-side).
- Closed archetype vocabulary: `subject·domain · view·color·marks·motion ·
  drive·playback · lab·readout · quality`.

### 🔵 finding · 14:50 — Codebase prior-art scanned; foundation research dispatched
**Why:** The Builder lens and synthesis need an accurate picture of what's reusable.

See the prior-art block above. Key takeaway: the **Hopf fibration and S³ machinery
already exist** (`viewpoint.ts`), so a quaternion app that leans on them is cheaper
than it looks; a unit-quaternion **rotation visualizer** would be a new custom
`Canvas3D` app. Awaiting the foundation research file before dispatching the eight
lens agents.

### 🟢 code · 14:30 — Authored the `/explore-concept` skill
**Why:** Dan wants a reusable method for scoping *any* new concept before building,
not a one-off for quaternions.

Created `.claude/skills/explore-concept/SKILL.md`. It runs a divergent gathering
phase that feeds the build pipeline: **explore-concept → /three-hats → BUILDING_AN_APP**.
Structure (modeled on `/three-hats`):

- **Phase 1 — Foundation:** invoke the `deep-research` skill for a cited base
  covering history/originator, genetic origin, natural/applied appearances, standard
  visual representations, and learner pitfalls (Dan chose "full deep-research first").
  Plus a codebase prior-art scan.
- **Phase 2 — Six parallel lens agents:** Originator (first-person, in the
  mathematician's voice — Dan's persona idea), Foundations (emerges from simpler
  ideas), In the Wild (natural phenomena/applications), New Light (reframing a known
  concept), Geometer (visual essence + learner traps), Builder (animath framework
  fit). Each writes a `kind: lens` report.
- **Phase 3 — Synthesis:** a `kind: plan` report with 2–4 candidate app concepts
  scored on framework-fit × pedagogical-payoff × visual-appeal, a recommendation, and
  a draft build plan (Dan chose "concepts + a draft build plan").

Registered it in `CLAUDE.md` (now "Four Claude Code skills").

### 🟣 decision · 14:15 — Build the method (a skill) before the instance
**Why:** Dan asked for a reusable concept-exploration skill first, with two design
choices settled via AskUserQuestion: gathering depth = **full deep-research first**;
deliverable = **candidate concepts + a draft build plan**.

Agreed the lens set should include the four Dan named (history/originator persona,
emergence from simpler ideas, natural phenomena, reframing a known concept) plus two
animath-essential filters (geometric essence + framework fit).

### 🟡 milestone · 14:00 — Session started, branch oriented
**Why:** Kick off a new app build on a fresh branch.

New branch with no prior reports. Focus is a brand-new app exploring quaternions
(likely a Three.js / particle-style viewer given the framework's strengths with
4D rotation — `math/quat4.ts`, `controls/QuarterTurnControls`, and the
`lib/particles` engine already deal with quaternion-driven 4D rotation, so there
is meaningful prior art to draw on). Awaiting Dan's direction on the concept
before any design or implementation.
