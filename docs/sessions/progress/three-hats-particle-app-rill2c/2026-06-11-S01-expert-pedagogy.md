---
kind: three-hats
session: 2026-06-11-S01
date: 2026-06-11
title: Three hats · Expand Complex Particles or open a new app? · Pedagogy
branch: claude/three-hats-particle-app-rill2c
slug: three-hats-particle-app-rill2c
status: completed
build: passing
app: complex-particles
---

# Three hats · Expand Complex Particles or open a new app? · Pedagogy

## Plan under review

<details><summary>Original request</summary>

"Excellent points! Thank you! I would like to continue in this direction. Can you tell me, do the hats suggest that we expand complex functions or open a new application?"

**The direction being continued** (condensed from the session's design discussion;
three features for the complex-function particle viewer):

1. **Simultaneous render layers** — the Render pills (Points / Sheet / Tiles /
   Net) become independent toggles, so e.g. sheet + net or tiles + points draw
   together.
2. **Multi-function overlay** — draw f and g as two graphs over the same domain
   in the same 4D space, distinguished by per-function hue tint. Pedagogical
   hook: the two graph surfaces in 4D generically intersect in **isolated
   points** — exactly the solutions of f(z) = g(z) (2 + 2 = 4 → 0-dimensional
   intersection). Plus a morph slider (1−t)·f + t·g showing how zeros migrate as
   one function deforms into another.
3. **Pair mode** — plot (f(z), g(z)) on the four axes instead of (z, f(z)).
   When f is injective on the sampled domain this is exactly the graph of
   g∘f⁻¹; when f is not injective it is the **complete, branch-cut-free
   multivalued graph** — z acts as a uniformizer, all branches drawn at once,
   Domain coloring tracks the hidden parameter z, and sampling density on the
   image goes like 1/|f′| so folds pile up at critical points of f. Special
   case (f, z): the full multi-branch graph of f⁻¹ for the entire library for
   free. Identities become geometry: (cos z, sin z) lies on the quadric
   cos² + sin² = 1; (z², z³) is the cuspidal curve v² = u³.

**The question this leg adjudicates:** should this live as an expansion of the
existing Complex Particles app, or as a new app in the catalog — considering
hybrids (top-bar mode pills like Trinary's Observatory | Lab; a separate app on
the shared engine)? Recommend one concrete shape, from the learner's
perspective.

</details>

This is a follow-on to my 2026-06-10 review of the app's current state
([expert-pedagogy](2026-06-10-S01-expert-pedagogy.md)). Since that review, the
fix-it session landed essentially everything I asked for: true Lanczos Γ with
poles, branch-aware cbrt, branch gating with period caps, per-sheet hue tint,
an honest rewritten `EXPLAINER.md` with a Numerical honesty section, z² as the
landing function, Fixed motion and flat brightness defaults, π units, the
function picker promoted to the top bar, and the chart pickers removed at the
user's request. I reviewed the shipped files
(`src/animations/ComplexParticles/EXPLAINER.md`, `README.md`,
`ComplexParticles.tsx`, `ParticleViewerShell.tsx`) before writing this; the
current app is the baseline I reason from, not the one I criticized yesterday.

## Executive summary

**Recommendation: expand Complex Particles — as a hybrid with top-bar mode
pills, not as panel accretion and not as a new app.** Concretely: two modes,
**Graph** (today's app, byte-for-byte the same first impression) and **Curves**
(pair mode, with its own axis semantics, title formula, and explainer chapter).
Feature 1 (independent render layers) is mode-independent polish; feature 2
(overlay + morph) lives **inside Graph mode** behind a single "Compare with g"
toggle; feature 3 (pair mode) **is** the Curves mode. A second gallery card
deep-linking into Curves mode is a phase-2 decision, after its explainer
narrative exists and has been play-tested — not before.

The deciding argument is conceptual, not organizational: **the graph of f is
already the curve (z, f(z)) = (id(z), f(z))**. Pair mode does not introduce a
second mental model next to the first — it *generalizes* the one the learner
already has, by freeing the first coordinate slot. "You have been looking at
the curve (z, f(z)) all along; now put anything you like in the first slot" is
the single strongest teaching move available here, and it only works if both
pictures live in the same room, sharing the same projections, the same
eighth-turn rotations, the same scaffold, and the same color language. A
separate app would make the learner re-derive that identification across a
gallery boundary; a buried checkbox would silently change what the axes mean.
A mode pill is exactly the right size: a chapter break, announced in the
chrome, with its own labels and its own page in the explainer.

## 1 · One mental model or two? The identity question, answered

The brief asks whether "the 4D graph of one function" and "an analytic curve in
ℂ² parametrized by z" are one mental model or two, and whether mixing them in
one app blurs both. The mathematics answers this more cleanly than taste can:

- **graph(f) = {(z, f(z))} is the analytic curve traced by the pair (id, f).**
  Pair mode with f = id, g = current function *is* the existing app, pixel for
  pixel. The generalization is strict containment, not a fork.
- Everything the learner has paid to acquire in Graph mode transfers without
  loss: the Perspective ⇠ Torus ⇢ Sphere slider still projects the same 4D
  point cloud; the six rotation planes still mix the four coordinates; the
  Clifford-torus scaffold still says "|first pair| vs |second pair|"; domain
  coloring still paints by a complex number's argument. **The expensive skills
  are the projections and rotations, not the function semantics** — and those
  are shared. Splitting into two apps splits the learner's investment across
  two explainers and two muscle memories for the sake of a distinction the
  math itself does not make.
- The app has *already* taught this lesson once, quietly: the established trick
  "swap input and output planes by a 4D turn to see f⁻¹" is precisely the
  statement that the graph is a symmetric curve in ℂ² that doesn't privilege
  either coordinate. Pair mode is that trick made first-class. (f, z) as a
  pair *is* the xu+yv double turn, generalized to every f, with no rotation
  gymnastics required.

So: **one mental model, presented in two registers** — the asymmetric register
(input → output, the graph) and the symmetric register (two outputs of a
hidden parameter, the curve). The registers genuinely differ in what the axes
*mean* and in what the learner should attend to, which is why they must not be
mixed silently — but they are the same object, which is why they must not be
separated by an app boundary. The mode pill is the device the framework
already owns for exactly this (Trinary's Observatory | Lab,
`TrinaryStars.tsx:1024-1026` / `lab/TrinaryLab.tsx:628-630`, including the
precedent of a second hash `#/trinary-lab` that opens the same app in the
other mode).

What would blur both models is the *other* hybrid: a "second function +
axis-assignment dropdown" added to the Domain or Function panel of the
existing app, where toggling it silently relabels four axes and invalidates
the explainer's central table (the x/y/u/v table at `EXPLAINER.md` §"A
function whose graph lives in 4D"). My previous review's complaint about inert
and false affordances applies with double force to an affordance that changes
the meaning of the entire scene from inside a collapsed panel.

## 2 · The learning arc — what each feature teaches, and in what order

The three features are not pedagogical peers; they form a staircase, and the
shape of the UI should match it.

**Feature 1 — simultaneous render layers — teaches nothing new and that is its
virtue.** Sheet + net together (the surface with its polar parameter lines) is
how every differential-geometry textbook draws a parametrized surface; tiles +
points shows the local linearization riding on the sample cloud. These
combinations make the *existing* lessons more legible. No new concepts, no new
panels — the four pills become four toggles in the same Render panel. This is
pure expansion and no hat should disagree. One learner-facing care: keep
exclusive-feeling defaults (turning on Sheet from Points should still read as
"switching", i.e. the previous layer turns off unless the user explicitly
multi-selects — or make them checkboxes so the multi-select affordance is
visible). Additive points over a normal-blended sheet already have a pinned
render order (`ComplexParticles.tsx:436-438`); layering Net and Tiles into
that order needs the same care or the composite will z-fight its own lesson.

**Feature 2 — overlay + morph — teaches "equations are intersections."** This
is the Graph-mode chapter's natural climax: f(z) = g(z) stops being algebra
and becomes the geometric coincidence of two surfaces. It belongs *inside*
Graph mode because its whole point depends on the asymmetric register — both
surfaces are graphs over the same z-plane, and the intersection's
z-coordinates are the solutions. A single **Compare with g** checkbox in the
Function panel (revealing a second picker and the morph slider) costs the
first-time learner nothing — unchecked, the app is unchanged — and gives the
teacher a one-click demonstration. Gate it exactly the way branch controls are
now gated (`domainExtras={isMultivalued ? … }`, `ComplexParticles.tsx:843`):
visible only when meaningful, no false affordances.

**Feature 3 — pair mode — teaches "every analytic identity is a surface," and
needs its own narrative.** Its lessons are genuinely new: the parameter
disappears from the picture and survives only as color; multivaluedness stops
being "sheets with cuts" and becomes a smooth curve that merely fails to be a
graph; branch points reveal themselves as folds where the sample density piles
up (the 1/|f′| pile-up at critical points of f — see §3.4 for the disclosure
this needs); identities become incidence statements ((cos z, sin z) lying on
the quadric u² + v² = 1 — where squaring means complex squaring of each
coordinate; (z², z³) tracing v² = u³ with its cusp at the origin, which I
verified: u = z², v = z³ ⇒ v² = z⁶ = u³, and the curve is singular exactly at
z = 0 where both derivatives vanish). And the marquee demo — (f(z), z) as the
complete, cut-free, all-branches graph of f⁻¹ for the entire function library
— directly upgrades the app's existing signature trick. This is a chapter, not
a checkbox: it deserves the mode pill, its own axis labels, its own formula in
the top bar, and its own section (eventually its own page) in the explainer.

The staircase, then: render layers enrich the lessons the learner already has →
overlay closes the Graph chapter (equations = intersections) → Curves opens
the next chapter (parametrized curves, uniformization, identities as
geometry). One app, one continuum, two registers — with the chrome marking the
register change.

## 3 · Honest-framing audit of the claims (the part I am paid to be skeptical about)

### 3.1 "Intersections = solutions" is true in 4D and misleading in 3D — it needs an honesty device

The claim as stated is correct: graph(f) ∩ graph(g) = {(z, w) : w = f(z) =
g(z)}, and in ℝ⁴ two generic 2-surfaces meet in dimension 2 + 2 − 4 = 0. At a
simple zero z₀ of f − g the tangent planes are the graphs of the ℂ-linear maps
ζ ↦ f′(z₀)ζ and ζ ↦ g′(z₀)ζ, which meet only at ζ = 0 when f′(z₀) ≠ g′(z₀) —
transverse, isolated, and (complex orientation) always positively counted, so
the intersection count *with multiplicity* is the zero count of f − g. The
math is sound.

**But the learner never sees ℝ⁴.** In the projected 3D scene, two 2-surfaces
generically intersect in **curves** (2 + 2 − 3 = 1). The screen will show the
two clouds threading through each other along whole arcs, of which only
isolated points are honest 4D coincidences; everything else is projection
accident. If the explainer says "the intersections are the solutions" without
this caveat, it will teach a falsehood the picture actively reinforces. Two
devices fix this, and I recommend both:

- **The color-agreement test (free, and beautiful).** At a true solution the
  two coinciding particles share the same z (Domain coloring: same hue) and
  the same f(z) = g(z) (Range coloring: same hue). At a projection-accident
  crossing, the meeting particles come from different z with different values,
  so their colors clash. *"Where the clouds cross with clashing colors, the
  projection is lying; where they meet in matching color, you have found a
  solution — color is your witness for the fourth dimension."* This works
  in both colorings, costs nothing, and turns the projection's defect into the
  lesson's punchline. It imposes one design constraint, taken up in §5: the
  channel that distinguishes f from g must **not** be hue, or the test breaks.
- **An optional solution-marker layer.** CPU-side, find the zeros of f − g on
  the sampled box (Newton from a coarse grid — the CPU ladder in
  `complexMath.ts` already evaluates every function) and draw small markers at
  (z₀, f(z₀)), projected like every other 4D point. Off by default; one
  checkbox beside "Compare with g". This makes the headline hook *findable*
  rather than merely true. Drop-axis slices (already in the app) are the
  manual version — worth one explainer sentence as the no-marker fallback.

Without at least the first device, I would oppose shipping the intersection
claim in learner-facing text at all: additive clouds crossing in curves will
bury the isolated honest points, and a motivated learner who hunts for "the
intersection points" and finds arcs instead will conclude the explainer is
wrong — trust spent exactly the way the stale pre-PR-#200 explainer spent it.

### 3.2 The morph slider is more honest than it looks — say so, and disclose its two traps

I want to defend the morph (1−t)f + tg *more strongly than the plan does*.
Unlike the projection slider's between-stop positions — which the explainer
now correctly calls "animations, not projections" — **every intermediate of
the function morph is a genuine analytic function**, with a real graph, real
zeros, real critical points. The convex path in function space is
mathematically first-class at every t. The explainer should draw exactly this
contrast: *the projection slider's midpoints are animations; the morph
slider's midpoints are theorems.* Zeros of h_t = (1−t)f + tg move
continuously, merge and split at the t where h_t acquires a multiple zero, and
their count in the box changes only when one crosses the boundary (argument
principle) — all of which is visible, true, and teachable.

Two traps need one sentence each:

- **Zeros escape through the boundary.** Morphing z² to z² + 4 inside a ±2π
  box: the pair of zeros of h_t = z² + 4t runs out along the imaginary axis
  and (for small boxes) exits. A learner watching "zeros migrate" must be told
  the box has edges; the count is conserved only on the Riemann sphere, not in
  the viewport.
- **The path can pass through degenerate functions.** Morphing f to −f gives
  h_½ ≡ 0 — the entire graph collapses into the z-plane and every point is a
  "zero." More generally h_t can have wildly larger or smaller zero sets than
  either endpoint. Harmless if disclosed, bewildering if not.

### 3.3 Pair-mode claims, checked

| Claim from the session | Check | Verdict |
|---|---|---|
| f injective on the domain ⇒ image is the graph of g∘f⁻¹ | (f(z), g(z)) = (w, g(f⁻¹(w))) for w ∈ f(domain) — immediate | ✅ correct, with the necessary caveat that it is the graph *over f(domain)*, not over a box: the domain panel's rectangle no longer bounds the picture |
| f non-injective ⇒ the complete multivalued graph, branch-cut-free | over w with n preimages z₁…zₙ, the fiber is {g(z₁)…g(zₙ)} — all branches of the multifunction g∘f⁻¹, drawn by a *continuous* parametrization, so no cut artifacts | ✅ — this is uniformization by z in the precise sense, and it is the feature's deepest selling point |
| (f, z) = full multi-branch graph of f⁻¹ | the case g = id of the previous row | ✅, and the right *first demo* for the mode |
| density on the image ∼ 1/|f′| | pushing a uniform z-density through w = f(z): area element scales by the Jacobian |f′|², so density ∼ 1/|f′|² in area (1/|f′| per linear dimension) — piles up where f′ → 0 | ✅ in substance (the exponent depends on the measure you quote; say "piles up at critical points" and stay safe) |
| (cos z, sin z) ⊂ {u² + v² = 1} | Pythagorean identity holds for complex z | ✅ — but the "quadric" is a complex curve in ℂ², a 2-surface in ℝ⁴, *not* the round circle/sphere the words may evoke; the explainer must spend a sentence on this or learners will look for a sphere |
| (z², z³) is the cusp v² = u³ | u³ = z⁶ = v² ✓; singular point at z = 0 | ✅ — and the cusp is a *fold of the parametrization* visible as the density pile-up, tying §3.4's disclosure to a marquee picture |

One more honest note the plan doesn't mention: **the Hopf/Torus readings
change meaning in pair mode, and for the better.** The Sphere stop currently
reads "latitude = |z|/|f|, longitude = arg z − arg f." In pair mode it becomes
latitude = |f|/|g|, longitude = arg f − arg g — that is, **the Hopf view of
(f, g) is the value distribution of the meromorphic function g/f on the
sphere**. (cos z, sin z) in the Sphere stop is a picture of tan z as a map to
the Riemann sphere — poles at one pole, zeros at the other. This is a gift,
but only if the explainer's Sphere section is rewritten per-mode; reusing the
Graph-mode text verbatim would be exactly the kind of stale-doc failure we
just finished paying down.

### 3.4 The parametrization-artifact disclosure (pair mode's "numerical honesty" entry)

In pair mode the cloud density is **not** a property of the curve — it is a
property of the chosen uniformizer z. The same curve parametrized differently
would shade differently. This needs a sentence in the (new, per-mode) honesty
section, in the same register as the existing pole-clamp disclosures: *"the
cloud's density shows how fast the parameter z moves along the curve — dense
where f and g change slowly, sparse where they race; it is a property of the
parametrization, not of the curve."* Then turn it into a feature: the pile-ups
*are* the critical points, and the adaptive-density machinery (which currently
weights by |f′| for the graph, `createParticleGeometry.ts`) could later offer
an "equalize along the curve" option weighting by ‖(f′, g′)‖ — a follow-up,
not a blocker.

### 3.5 Axis labels, formula, and the explainer table are load-bearing — not polish

The explainer's first table — x = Re z, y = Im z, u = Re f, v = Im f — is the
contract that makes every other lesson readable. In Curves mode that contract
changes to x = Re f, y = Im f, u = Re g, v = Im g, and **three surfaces must
change with it or the mode ships broken for learners**: (a) the 4D axis-tip
labels (`createAxes` and the scaffold labels); (b) the top-bar title/formula —
Graph mode's `f(z) = z²` becomes Curves mode's `(f, g) = (cos z, sin z)`
(the shell already pipes `functionName`/`functionFormula` per app, so this is
wiring, not architecture); (c) the explainer, which should become per-mode —
the framework's `modes` prop plus a swapped `explainer` string does this
today. The 4D Rotation panel's plane names (xy/xu/…) keep their letters and
change their *gloss*: "xu swaps the input's real axis with the output's"
becomes "xu swaps Re f with Re g." The orientation-matrix readout needs no
change. None of this is optional; an axis whose label lies is worse than no
label, and this concern is the strongest single argument *against* the
pure-expansion (checkbox) shape and *for* the mode pill, which gives all three
surfaces a natural switching point.

## 4 · Cognitive load — what the chrome can absorb

Current panel inventory (`ParticleViewerShell.tsx:589-598`): Function · Domain
· Camera · Color · Render · Motion · 4D Rotation · System — eight panels, plus
the top-bar function dropdown that just shipped. My previous review pushed
hard on gating, defaults, and false affordances, and the fix-it session
honored that (branch controls gated on `MULTIVALUED_INDICES`, chart pickers
removed, Fixed motion, z² landing). The proposal must not spend what was just
recovered:

- **Graph mode's first contact must be unchanged.** z², Fixed motion, flat
  brightness, one function picker, no second-function anything visible. The
  "Compare with g" checkbox is one line in the Function panel; everything else
  it implies (g picker, morph slider, marker toggle) appears only when checked.
  Net new cost to a first-time learner: zero.
- **Curves mode replaces rather than adds.** Entering Curves swaps the Function
  panel's content for two pickers ("First coordinate f" / "Second coordinate
  g" — with f defaulting to **z**, so the moment of entry shows *the same
  picture the learner just left*, now reframed; that continuity is the
  teaching move of §1 made literal). The Color panel's "Color by:
  Domain / Range" needs a Curves-mode gloss — Domain = the hidden parameter z
  (the right default, per the session's own design), Range = which coordinate?
  Adjudicate now: offer Parameter z / First (f) / Second (g) in Curves mode,
  and keep the existing two options in Graph mode. Branch controls: in Curves
  mode multivaluedness of the *displayed* object needs no sheets at all (the
  whole point); sheets remain meaningful only if f or g is itself multivalued
  — I would ship Curves v1 restricted to single-valued f and g (gray out the
  multivalued picker groups there) and lift the restriction later, rather than
  open the three-way color fight of §5 on day one.
- **No new panels.** Eight is already the ceiling. Everything above fits in
  existing panels' existing tiers (Compare → Function/subject; markers →
  Function; morph slider → Function, *not* Motion — it is a parameter of the
  subject, not of time).
- **Mode count stays at two.** I considered "Graph | Overlay | Curves" and
  reject it: Overlay is not a register change — the axes still mean (z, f) —
  so promoting it to a mode would dilute what the pill signifies. Modes mark
  changes in what the axes mean; toggles mark changes in what is drawn. That
  rule keeps the pill meaningful as the app grows.

## 5 · The color-channel adjudication (three jobs, one wheel)

The brief names the conflict precisely: per-sheet tint (shipped, default on)
uses hue for **sheet identity**; the overlay plan wants hue for **function
identity**; pair mode wants hue for **the hidden parameter z**. Three jobs,
one channel. Resolution, in the spirit of "hue belongs to the mathematics":

- **Pair mode: hue = z, uncontested.** That is the mode's stated design and its
  pedagogical core (the parameter survives only as color). With Curves v1
  restricted to single-valued f, g (§4), sheet tint never competes there.
- **Overlay: function identity must NOT take hue — feature 1 already solved
  this.** Here the three features click together in a way the plan itself
  doesn't note: with independent render layers, **f and g can be distinguished
  by *register* instead of color** — f as sheet + points, g as net, say (or
  per-function layer assignments, defaulting to something legible). That keeps
  hue meaning what it has always meant (the argument of z, or of the value),
  which is exactly what the color-agreement test of §3.1 requires — a
  per-function *hue* tint would make the colors of a true intersection clash
  by construction and destroy the one honest visual test we have. If a color
  channel is still wanted, offset **saturation or lightness** per function
  (the channels domain coloring uses least), not hue. I would treat this as a
  hard requirement on feature 2: *function identity rides on render layer
  and/or lightness; hue stays mathematical.*
- **Sheet tint (shipped) is unaffected** — it lives in Graph mode with one
  function, where it has the wheel to itself; in overlay-with-multivalued-f
  (a later phase), cap visible sheets or fall back to the same
  lightness-offset rule.

One wheel, one meaning per mode, and the meaning is always printed in the
Color panel. This is the section I most want the implementing session to take
verbatim.

## 6 · Gallery identity — does Curves deserve its own card?

The gallery is the learner's table of contents, and "Analytic Curves — every
identity is a surface" is honestly a different *entry in the table of
contents* from "Complex Particles — the 4D graph of f." The blurbs would not
overlap; the preview cards would not look alike (the cusp of (z², z³) is a
gorgeous card). So the temptation for a second card is real, and the framework
even has the mechanism: Trinary's `#/trinary-lab` hash opens the same app in
its other mode — a card pointing at `#/complex-particles-curves` would cost
one `apps.ts` + `catalog.ts` append and zero duplicated chrome.

But sequencing matters more than the card. A gallery card is a promise of a
self-contained narrative, and Curves mode will not have one until its
explainer chapter is written, its axis relabeling verified, its (cos, sin) and
(f, z) demos curated, and the parametrization disclosures of §3 in place. Ship
the mode first, behind the pill, reachable and linkable; **add the card in a
follow-up session once the mode has earned it** — the same discipline that
just rebuilt this app's documentation trust. A card pointing at a mode whose
explainer is a stub would repeat the stale-explainer failure in a new costume.
(When the card does come: keep ONE app folder, one appId, one engine — the
card is a deep link, not a fork.)

## 7 · Why not a new app — and what would change my mind

Steel-manning the new-app option: a fresh "Analytic Curves" app could start
with a clean explainer, no Graph-mode baggage, its own defaults, and would
force the consultant's long-wanted engine extraction (`createBranchObjects`
etc.) by being the second consumer. From the learner's side, though, it fails
on the three points that matter most:

1. **It severs the identification** graph = (id, f) that is the whole lesson
   (§1). The learner meets "curves in ℂ²" as a new topic instead of as the
   liberation of a picture they already own.
2. **It duplicates the expensive learning** — projection slider, eighth turns,
   scaffold, Hopf reading — behind a second card, second explainer, second set
   of persisted settings, with no shared muscle memory.
3. **It would still need pair mode's special case to *be* the existing app**
   to teach the continuity — at which point the new app contains the old one
   and the split is exposed as organizational, not conceptual.

What would change my mind: if Curves mode grows its own *instruments* —
defining equations of the image curve, intersection-with-quadric overlays,
genus/degree readouts, a library of named curves — then it will have outgrown
"a register of the particle viewer" and become a lab in its own right, and
*that* is the moment to fork it into a sibling app on the (by then extracted)
engine, exactly as Trinary's Lab carries its own instruments. The mode pill is
not a ceiling; it is the right roof for what is on the table today.

## Verdict

**Hybrid expansion — one app, two top-bar modes: Graph | Curves.** Do not open
a new application now; do not bolt pair mode into a panel of the existing one.

**Endorse:**

- Feature 1 (independent render layers) as unconditional Render-panel polish —
  it also supplies the function-identity channel that feature 2 needs (§5).
- Feature 2 (overlay + morph) inside Graph mode behind a single gated
  "Compare with g" toggle; the morph slider framed honestly as *more*
  mathematical than the projection morphs (every intermediate is a real
  analytic function).
- Feature 3 (pair mode) as the Curves mode, entered by pill, with f defaulting
  to z so entry is continuous with what the learner just saw; (f, z) — the
  complete cut-free inverse — as its first demo, (cos z, sin z) and (z², z³)
  as its set pieces.
- A second gallery card deep-linking to Curves mode as **phase 2**, only after
  its explainer chapter exists.

**Concerns (what I would block on):**

1. **The intersection claim must ship with its honesty devices** — the
   color-agreement test in the explainer at minimum, the solution-marker layer
   ideally. Projected 3D intersections are curves; only color or markers make
   the true isolated solutions findable (§3.1).
2. **Function identity must not take the hue channel** — render-layer and/or
   lightness differentiation, never a per-function hue tint, or the one honest
   intersection test breaks by construction (§5).
3. **Axis labels, top-bar formula, and the explainer must switch with the
   mode** — a live x/y/u/v table that says Re f/Im f/Re g/Im g, a formula that
   reads (f, g) = (…, …), and a per-mode explainer; an axis whose label lies is
   worse than none (§3.5).
4. **Graph mode's just-shipped first impression is untouchable** — z², Fixed
   motion, flat brightness, zero new visible controls until "Compare" is
   checked (§4).

**What I would change in the plan, prioritized:**

| # | Change | Why |
|---|---|---|
| 1 | Replace "per-function hue tint" (feature 2 as stated) with layer/lightness differentiation | preserves hue = mathematics; enables the color-agreement test |
| 2 | Add the explainer caveat "3D crossings are curves; matching color marks the true solutions" + optional zero markers of f − g | makes the headline hook findable and true |
| 3 | Ship Curves v1 with single-valued f, g only; default f = z on entry | avoids the three-way color conflict on day one; makes mode entry continuous |
| 4 | Per-mode explainer text + axis-tip relabeling + formula format as part of the same PR as the pill, not a follow-up | doc drift is this app's one previously demonstrated failure mode |
| 5 | Morph slider: disclose boundary escape and degenerate midpoints (f → −f passes through 0); place it in the Function panel | honest framing; it is a subject parameter, not motion |
| 6 | Restate the Sphere/Torus reading for Curves mode (Hopf view of (f, g) = value distribution of g/f) | turns a doc obligation into a new lesson |
| 7 | Add the parametrization-density disclosure to the (per-mode) Numerical honesty section | the cloud density is a property of z, not of the curve |

## Self-reflection

1. **What would you do with another session?** Prototype the color-agreement
   test empirically: overlay z² and z² + 1 (no solutions in a small box) vs z²
   and 2z − 1 (double root at z = 1, a tangency!) and screenshot whether
   matching-hue meetings are actually discernible in additive blending at
   default opacity — §3.1's centerpiece is argued from theory, not pixels. The
   tangency case (f′ = g′ at the solution) is also the stress test for the
   marker layer.
2. **What would you change about what you produced?** §3.3's table compresses
   the injectivity caveat ("graph over f(domain), not over a box") that has UI
   consequences I didn't develop — the Domain panel's bounds box stops bounding
   the picture in Curves mode, and a learner may hunt for the edge of a sheet
   that now lives wherever f sent it. That deserved its own subsection.
3. **What were you not asked that you think is important?** The embed surface:
   the modes/hash design should reserve URL params for `mode=` and the second
   function now, even if embeds ship later — published embed URLs freeze
   semantics, and retrofitting mode addressing is exactly the compatibility
   trap `docs/EMBEDS.md`'s new contract warns about.
4. **What did we both overlook?** Performance as pedagogy, again: overlay
   doubles the draw cost and Curves mode invites dense functions (tan, Γ) in
   *both* slots; the existing per-sheet material multiplication (5 materials ×
   branches) now potentially × 2 functions. A frame-rate cliff will be read by
   a learner as "this math is heavy," and nobody has budgeted it.
5. **What did you find difficult?** Holding the line between "one mental model"
   (true, and the basis of the verdict) and "one register" (false — the axes
   change meaning). The mode-pill recommendation is precisely the resolution
   of that tension, but earlier drafts kept collapsing it toward pure
   expansion; the axis-label argument (§3.5) is what stabilized the verdict.
6. **What would have made this task easier?** A one-page statement of what the
   *other* two hats are likely to weigh (engine extraction trigger, route/
   catalog mechanics) — I adjudicated from the learner's chair as asked, but
   the mode-vs-app question has a maintainer half (T1 from the last synthesis:
   "extract when the next particle viewer starts") whose interaction with my
   recommendation (a mode is *not* a second consumer) the synthesis will have
   to resolve.
7. **Follow-up value:** **MEDIUM** — the recommendation is firm and grounded in
   the shipped code and docs, but two of its load-bearing claims (intersection
   findability under additive blending; legibility of layer-based function
   differentiation) are theoretical and cheap to verify with the existing
   screenshot harness before implementation begins.
