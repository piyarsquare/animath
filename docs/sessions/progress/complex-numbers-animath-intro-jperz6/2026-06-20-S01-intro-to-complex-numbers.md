---
kind: progress
session: 2026-06-20-S01
date: 2026-06-20
title: Introduction to complex numbers — explanatory page (scoping)
branch: claude/complex-numbers-animath-intro-jperz6
slug: complex-numbers-animath-intro-jperz6
status: in-progress
build: unknown
followup: null
pr: null
app: docs, complex-particles, general
signals: needs-dan
next: Decide the deliverable shape — new guide page reusing PlaneTransform vs. a small new Argand applet — before building.
---

# Introduction to complex numbers — explanatory page (scoping)

## Session purpose

Continue the goal of building **explanatory pages that use animath slices** to show
ideas. Specifically: an **introduction to complex numbers** that carries the basic
intuitions from `x + iy` to `R·exp(iθ)`, and shows the effect of **scalar
multiplication by z** (rotation + scaling). Open questions from Dan: is this a new
app? Can we explore it with what we already have? Is the complex-plane app adequate?

## Previous session

First tracked session on this branch. The directly-relevant prior work is the
**complex guide series** from `claude/complex-particles-guide-tdlhk0`
([handoff](../../handoff/complex-particles-guide-tdlhk0/2026-06-14-S01-math-code-guide.md)):
eight cross-linked `public/*-guide.html` pages that embed live viewers via
`#/embed/...` iframes — the established pattern for "explanatory pages that use
animath slices." That session ended flagging a `!high` backlog item directly on this
topic: **plane/particles unification** ("which plane am I looking at" across viewers
+ guides).

## Working notes

<!-- Newest entry first. -->

### 🟣 decision · 19:00 — Corrections: animation is *a* mode, not a mandate; add commutativity
**Why:** Dan corrected my overstatement. Animation is "one of the major modes of
exploration," **not** "everything must animate." He likes the **slider** and the
multiplication; plane deformations need not auto-animate.

Locked the fork: **fresh successor app** + **Complex Particles positioning-only**.
Wrote the [plan](2026-06-20-S01-plan-fresh-complex-app.md), then revised it for the
animation correction: primary substrate is **direct manipulation + a parameter
slider**; **animation is an optional lens** (a play button on the same slider), no
autoplay by default; plane deformations are fine as static/draggable/scrubbed
pictures. Also added **commutativity** (`a·b = b·a`, shown as two composition orders
landing on the same point) to the Multiply chapter. The four hat reports stand as the
review snapshot; their *substantive* findings (honest spiral-vs-slide path, direct
manipulation) survive the correction — if anything it strengthens slider/drag over
canned animation.

### 🟣 decision · 18:45 — Pivot under consideration: fresh successor app, not in-place enrichment
**Why:** Dan questioned whether this must live in Plane Transform, and proposed a
**third side-along app** that could let us *retire* Plane Transform after switching.

My read: this is likely the **cleaner** path, and it's the project's own established
pattern (PolygonWorlds superseded TopologyWalk; StableMatching rebuilt + retired
StableMarriage — soft retirement: drop the gallery card, keep the route, repoint
guides, delete later). Crucially it is **parallel-branch safe** where the in-place
"unification" is not: a new app is a self-contained folder touching only append-only
shared files, so we never merge engines or churn Plane Transform.

Re *why the hats fenced off the `!high` plane/particles-unification item*: that item
is "two viewers both show 'a plane' (ComplexParticles linear/drop-axis = bare x,y;
Plane Transform = z↦f(z)) — pick one mental model + which viewer owns which job." The
*in-place* resolution means reconciling coordinate/sampler conventions across the
shared `lib/particles` engine + both app folders = shared-code churn + scope balloon.
The hats said avoid **that**. A fresh successor app **resolves the same item a
different way** — by *clarifying roles* (new app = 2D animated pedagogical entry
point; ComplexParticles = 4D/Riemann deep end; Plane Transform = the retired middle)
rather than merging engines. So "don't litigate in place" and "build a clean
successor" are compatible, not contradictory.

Salvage from Plane Transform (fresh ≠ from zero): the GPU shader that runs f,
`polarViews.ts` coord math, `standardCurves.ts`, the embed-param infra, the two-pane
split as one optional chapter. Costs: two guide pages embed
`#/embed/plane-transform` (repoint on switch); mild risk of a *third* plane-shower if
roles aren't kept crisp. **Awaiting Dan's call on approach + name.**

### 🟡 milestone · 18:30 — Four-hat review complete + synthesized
**Why:** All four lenses returned; convergence is strong enough to plan against.

Reports written under this folder (`-expert-{maintainer,consultant,pedagogy,
gamedesigner,synthesis}.md`). Headline convergence: **animate everything, but every
motion must trace a path the math distinguishes** — `a·b` *spirals* (`a·bᵗ`), `a+b`
*slides*; the interpolant is per-chapter. The whole-plane morph is ~5 lines of shader
(`mix(inputPos, fz, morphT)`); direct-manipulation draggable handles with live
coupling are non-negotiable (Game hat's one blocking change); don't bloat the
818-line file (extract hooks; copy `lib/particles`/spin-clock patterns); chapters =
mode pills, not new routes; stay clear of the `!high` plane/particles-unification
backlog. Recommended build leads with the **hero** (live multiplication overlay,
zero new WebGL) as the MVP, then curve ops, then the morph climax, then
scaffolding/juice, then chapters+guide. Three decisions await Dan (interpolant
investment · autoplay default · MVP-first-slice). See
[synthesis](2026-06-20-S01-expert-synthesis.md).

### 🟣 decision · 18:05 — Animation is the medium, not a mode; commission a 4-hat review
**Why:** Dan confirmed the read and corrected one thing: **animation is a truth
through *everything*** — even addition and multiplication are animated (this is
*ani*math). So "Animate" is not a third mode beside Arithmetic/Transform; motion is
the substrate of every operation. Reframes the progression as *what* is being
animated (a sum → a product → a curve under ×c → the whole plane under f), not
*whether* it animates.

Requested review: the standard **three hats** (framework maintainer · architecture
consultant · math-viz & pedagogy) **plus a fourth — Game Designer**: experiences
that engage mind and senses, feedback modes, the "prod, jiggle, push" tactile-learning
loop. Running all four in parallel, then synthesizing.

### 🟣 decision · 17:58 — Scope shifted: enrich Plane Transform into the complex-numbers *entry point*
**Why:** Dan redirected from "write a guide page" to "enrich the **app** so it can
host these ideas," with the guide following. The deliverable is now app code, not
just HTML.

Dan's concrete asks for Plane Transform:
1. Port the **grid / circle / domain** features from Complex Particles (sampling
   patterns, rings/spokes, reference marks like the unit circle).
2. **Add two numbers by dragging** their locations on the Argand plane (a+b).
3. **Add or multiply a *curve*** by a complex number (z+c, c·z on a drawn shape).
4. Build toward an **animation that morphs a chart of (x,y) into (u,v)** — the
   function shown as a continuous deformation of the plane.

The throughline: make Plane Transform *the* entry point for complex numbers **and**
complex functions, so the explanatory pages can slice it at any rung.

Read the full current `PlaneTransform.tsx` (818 lines): two-pane split view, shared
point cloud, vertex shader runs f on the output pane; already has Cartesian/polar
grid, log-polar plane, **drawable curves that map through f**, standard curves, and
embed mode with URL params. Good bones for all four asks.

### 🔵 finding · 17:55 — Complex Particles feature inventory (for porting)
**Why:** Need to know exactly which domain/grid/circle features exist to port, vs.
build fresh.

Explore agent surveyed `lib/particles` + `ComplexParticles`. Portable into Plane
Transform: 7 **sampling patterns** (Grid/Polar/Rings/Spokes/Web/Squares/Random),
**radius-band masking** (|z| min/max), reciprocal (log|z|) sampling, **colored axis
cross**, and the **Net** mode's polar fiber net (constant-|z| circles + constant-arg
rays with toggles) — the closest thing to a "unit circle / rings" reference. Plane
Transform currently has only Cartesian/polar grid + 3 color modes; the rich
colormaps, ColorBy Domain/Range, shapes, projections, and 4D rotation are Complex
Particles' deep end and mostly *not* wanted in the entry-point app.

### 🔵 finding · 17:47 — Orientation: the pieces already exist
**Why:** Before proposing a build, mapped what's already available against the ask.

What's on hand that bears on an intro-to-complex-numbers page:

- **Guide pattern** — `public/guides.html` indexes eight explanatory HTML pages
  (functions Pt1/2, projections Pt1/2, rendering, color, sampling, plane-transform).
  These are static pages embedding `#/embed/complex-particles` and
  `#/embed/plane-transform` iframes. This is exactly "explanatory pages that use
  animath slices." A new intro page would slot in here.
- **Plane Transform** (`#/plane-transform`, embeddable) — shows `f : ℂ → ℂ` as a
  transformation of the colored plane (input/output panes). **Multiplication by a
  constant `c·z` is `fn=linear`** — the canonical "scalar transformation by z"
  picture (rotate by arg c, scale by |c|). Its **log-polar** view turns
  multiplication into a *shift*, which is the `x+iy → R·exp(iθ)` bridge.
- **Complex Particles** (`#/complex-particles`, embeddable) — the 4D function
  viewer; the functions guide already uses `fn=linear&proj=dropv` for a "bare plane."
- **No dedicated Argand / arithmetic applet** — there is no simple interactive
  "here are two complex numbers, drag them, watch `a+b` and `a·b`" widget. That is
  the one piece the existing apps don't directly give.

Open product question (the `!high` backlog item) is squarely in scope: a clean
"which plane am I looking at" story is what an intro page must nail.

### 🟣 decision · 17:47 — Session started; scoping before building
**Why:** Dan's ask is partly a design question (new app vs. reuse), so the first
step is to agree on the deliverable shape, not to start coding.

Created this progress report. Next: present the orientation + options and let Dan
choose the deliverable shape.

## Candidate shapes (for discussion)

1. **New guide page, reusing existing viewers** — `public/complex-intro-guide.html`
   in the guide series. Walks `x+iy` → polar → `R·exp(iθ)`, then embeds Plane
   Transform `fn=linear` (and its log-polar view) to show scalar multiplication as
   rotate-and-scale. *Lowest cost; matches the established pattern.*
2. **New small applet + guide page** — a lightweight interactive Argand widget
   (drag `a` and `b`; see `a+b`, `a·b`, polar readout) embedded into the page,
   because the "multiply two numbers, watch the angles add" beat isn't covered by
   any existing viewer. *Medium cost; fills the one real gap.*
3. **Extend Plane Transform / Complex Particles** — add an intro-friendly mode
   rather than a new app. *Risks bloating a viewer; probably not preferred.*

This is a `needs-dan` decision.
