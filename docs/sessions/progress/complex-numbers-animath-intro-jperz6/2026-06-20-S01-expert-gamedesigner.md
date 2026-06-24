---
kind: three-hats
session: 2026-06-20-S01
date: 2026-06-20
title: "Game Designer review — Plane Transform as the complex-numbers intro instrument"
branch: claude/complex-numbers-animath-intro-jperz6
slug: complex-numbers-animath-intro-jperz6
status: completed
build: n/a
followup: medium
pr: null
app: plane-transform
---

# Game Designer review — Plane Transform as the complex-numbers intro instrument

I am wearing one hat: the **interaction & experience designer** — the "prod, jiggle,
push" lens. I do not care here whether the homology is right or whether the registry
edits are append-only; I care whether grabbing a complex number and shoving it around
*teaches your hand the math before your head catches up*. Everything below is judged
against one question: **does the system respond, continuously and legibly, to a hand
that is just messing with it?**

## Plan under review

<details>
<summary>Original request</summary>

Enrich the **Plane Transform** app (`src/animations/PlaneTransform/`) into *the*
entry-point instrument for complex numbers AND complex functions, used standalone and
sliced via URL-param embeds into explanatory guide pages. Pedagogical arc, in order:
(1) a number is a point/arrow `x+iy`; (2) it's also length & angle `R·e^{iθ}`; (3)
arithmetic is geometry — add/multiply two numbers; (4) shapes transform too — add/multiply
a *curve* by a complex constant; (5) a function does this to every point at once (the
current two-pane `z↦f(z)` view); (6) the climax — the whole plane morphing from domain to
image.

**Animation is the medium, not a mode.** Per the user (verbatim): *"animate however is a
truth through everything. even addition multiplication will be animated -- this is
animath."* Every operation plays as motion: `a+b` tip-to-tail; `a·b` the angle-adding/length-scaling
spiral; `c·curve` the curve sweeping to its image; the function is the grid sliding from z
to f(z) via a morph parameter.

Concrete features: (1) reference scaffolding — unit circle, polar rings, radial rays,
gridlines, axes; (2) draggable numbers a,b with animated dual-form (x+iy and R·e^{iθ})
readouts of a+b and a·b; (3) curve "+c"/"×c" by a draggable complex constant, animated;
(4) a playback timeline driving the plane morph; (5) sampling patterns (Rings/Spokes/Web);
(6) polar/exponential readout. Likely structure: chapters/modes (Arithmetic / Transform)
sharing one plane + colors + scaffolding, each an embeddable slice. The existing app
already supports pointer-drag curve-drawing and pinch/wheel zoom, so a direct-manipulation
interaction layer exists to build on.

</details>

## Executive summary

This is the right ambition and, crucially, the right *theory of learning*: the hand leads.
The phrase "even addition will be animated" is the whole design in one line, and I endorse
it without reservation. But the plan as written still smells faintly of "visualization
with controls bolted on." The biggest risk is not the feature list — it is the **default
state of the canvas**. If a learner lands and sees two static colored squares with a panel
of sliders, the entire thesis is dead on arrival, because the first message is "read the
controls," not "grab something." My review is mostly about converting the listed features
into a **continuous live-drag loop**, naming the **snapping targets and juice** that make a
dragged complex number feel alive, fixing the **discoverability failure** the current app
already has (draw-mode hidden behind a panel toggle), and protecting the **first ten
seconds** with a self-demo.

## 1 · The non-negotiable: the canvas must be the primary input surface

Right now (read the code) the *only* direct manipulation on the canvas is freehand curve
drawing, and it is gated behind `drawMode` — a toggle living in a panel. Numbers `a`, `b`,
the constant `c`, the quadratic coefficients — all of them are edited through `ComplexInput`
/ `NumberInput` *form fields in a side panel*. That is the exact failure mode the user is
warning against. A complex number you type is a number you read; a complex number you
**grab and fling** is a number you understand.

> [!IMPORTANT]
> **Decision I want made up front:** every quantity in the pedagogical arc that the lesson
> is *about* (`a`, `b`, `c`, and the curve) gets a **draggable on-canvas handle** as its
> primary control. The panel field becomes the *secondary*, precise-entry mirror — kept in
> two-way sync — not the only way in. If a learner can drag it, the panel input is a
> convenience, not the interface.

| Quantity | Primary control (canvas) | Secondary (panel) | Why drag-first |
|---|---|---|---|
| `a`, `b` | draggable arrow tips on the plane | dual-form readout, type-to-set | the spiral of `a·b` must be *felt* by moving `b` |
| constant `c` (curve +c / ×c) | draggable handle | `ComplexInput` mirror | "what does ×(1+i) do to a square" is a wrist motion |
| quadratic `a,b,c` | draggable handles (later chapter) | existing `ComplexInput`s | already partly there |
| curve | freehand draw (exists) — but un-gate it | standard-curve buttons (exist) | drawing is the one good drag we already have |

## 2 · The live-drag loop for multiplication (the heart of it)

The plan says `a·b` plays as "the angle-adding/length-scaling spiral." Good — but a *played
clip* is not the lesson. The lesson is the **continuous** version: while my finger is down
on `b` and dragging, `a·b` updates *every frame*, and the spiral arc from `b` to `a·b`
redraws live. The rule "angles add, lengths multiply" is not narrated — it is **discovered
by the hand**, because as I sweep `b` around a circle of fixed radius, `a·b` sweeps around a
circle of `|a|×` that radius, always `arg(a)` ahead. That is the aha, and it only lands if
it is *live under the finger*, not a button-triggered animation.

Concretely, every frame of a drag should show:

- **The two operands** as arrows from the origin (`a` one hue, `b` another).
- **The result** `a·b` as a third arrow.
- **A live spiral/arc** connecting `b` to `a·b` — an arc of angle `arg(a)` swept at growing
  radius, so the "rotate by arg(a), scale by |a|" action is one drawn gesture.
- **The angle annotation**: a small wedge at the origin showing `θ_a + θ_b = θ_{ab}` with
  the two input angles stacking visibly into the output angle.
- **A unit-circle reference** so "did the length grow or shrink?" is read against `|·|=1`.

> [!TIP]
> The *played* animation (the spiral sweeping out) is the **release** behavior and the
> **self-demo** behavior — it's what happens when nobody is dragging. The moment a finger
> goes down, the clip yields to the live coupling. Same visual vocabulary, two drivers
> (autoplay vs. hand). That duality is how you honor "animation is the medium" without
> making it an inert play-button toy.

## 3 · Snapping: where the "alive" feeling actually comes from

This is the single highest-leverage juice investment and it is *missing from the plan*.
A dragged handle that snaps to meaningful targets feels magnetic and *teaches the targets
exist*. Without snapping, you can never reliably land on `i`, and "make `a·b` land on `i`"
(a challenge the plan flirts with) becomes a frustrating pixel-hunt.

| Snap target | Why it matters pedagogically | Feedback when snapped |
|---|---|---|
| **Gaussian integer lattice** (`m+ni`) | makes `1`, `i`, `1+i`, `-1` reachable and nameable | handle clicks to grid dot; readout bolds to exact `m+ni` |
| **Unit circle** (`|z|=1`) | the home of "pure rotation"; `e^{iθ}` lives here | radius ring brightens; readout shows `R=1.00` |
| **Nice angles** π/6, π/4, π/3, π/2 | angle-addition is legible at clean angles | a tick on the angle wedge lights; `θ` snaps to `30°/45°/…` |
| **Real / imaginary axes** | `±1`, `±i`, "purely real/imaginary" | axis line brightens under the handle |
| **The other operand / its conjugate** | reach `b = ā`, `b = 1/a` for "what gives a real product?" | a faint guide line connects them |

Implementation is cheap: snapping is a post-process on the pointer→math conversion (you
already have `mathFromClip`). Use a **screen-space radius** (~10px) so snap strength is
zoom-independent, and make it **soft** — pull toward the target with a small dead-zone, not
a hard lock — so a learner can sit *just off* `i` deliberately. A held modifier (or a "free"
toggle) disables snapping for continuous exploration. Snapping should be felt, not fought.

## 4 · Juice — the visual substitutes for haptics/audio

There is no real haptics or audio in a static web app, so every "satisfying response" must
be **visual or motion**. The plan mentions trails and easing in passing; here is the
concrete kit, all achievable in WebGL points / SVG overlay / CSS:

- **Snap pop:** on engaging a snap target, a 1-frame scale-overshoot of the handle (1.0 → 1.25
  → 1.0 over ~120ms, ease-out) + a brief ring ping at the target. This is the "click" you
  can't hear, rendered.
- **Handle hover affordance:** the tip swells and brightens on hover; cursor becomes `grab`
  / `grabbing`. (The current app only sets `crosshair` in draw mode — extend the vocabulary.)
- **Drag trail / ghost:** while dragging `b`, leave a fading comet trail of recent positions
  and a faint ghost of `a·b`'s recent path, so the *relationship* between the two motions is
  visible as a shape, not just two moving dots.
- **Spring release:** when a drag ends near (but not on) a snap target, let the handle ease
  into it with a tiny spring (overshoot + settle) rather than teleporting. Anticipation/
  follow-through is what makes it feel physical.
- **The result "chases":** `a·b` shouldn't be rigidly glued frame-perfect to `b`; a ~60–90ms
  critically-damped follow makes it feel like the output is *being pulled along* by the
  input — the causality is felt. (Keep this optional/short; too much lag breaks the live
  coupling. This is seasoning, not the meal.)
- **Angle-wedge fill:** the `θ_a + θ_b` wedge sweeps/fills as you turn, like a clock hand
  drawing the angle, so addition of angles is *animated even in the readout*.

> [!CAUTION]
> **Gotcha — juice has a budget and a tipping point.** This is a contemplative math toy, not
> a slot machine. Trails that never fade, bouncy springs on every value, particle bursts —
> they cross from "alive" into "distracting" and actively obscure the math. Rule of thumb:
> juice should **decay to stillness** within ~300ms of input stopping, and motion should
> always point *at the math* (the angle, the radius, the path), never just decorate. When in
> doubt, less.

## 5 · Discoverability & affordances

The current draw-mode-behind-a-toggle is a real discoverability failure and the plan should
explicitly fix it, not inherit it.

| Affordance problem | Fix |
|---|---|
| Draw mode hidden in a panel | Make the canvas **drawable by default** in the relevant chapter; or surface draw as an always-visible on-canvas action chip, not a panel toggle. The `actions` strip (the framework's always-on verb strip, ≤5 buttons) is exactly for this. |
| Handles don't look grabbable | Render `a`/`b`/`c` tips as filled, slightly-glowing dots with hover-swell; a one-time pulsing "try me" halo on the primary handle on first load. |
| No hint of "two-finger pans, drag rotates" split | The plan inherits the particle-viewer convention; surface a tiny, dismissible legend the first time, and use the existing `hint` field on the view (it already reads "scroll to zoom…"). |
| Polar vs Cartesian readout buried | The dual-form readout (`x+iy` **and** `R·e^{iθ}`) should be **on or beside the handle**, updating live as you drag — that side-by-side is half the lesson ("same number, two costumes"). |

> [!NOTE]
> The single best affordance is a handle that **moves on its own before you touch it**
> (the self-demo, §6). Nothing says "grab me" like something already gently in motion that
> you instinctively want to catch.

## 6 · The first ten seconds (self-demo)

A novice must stumble into the first aha with **zero reading**. So the canvas must not load
static. Proposal: on load (and whenever idle for ~4s), the app **plays its own thesis** —
`b` drifts slowly around a circle while `a·b` spirals in lock-step, the angle wedge filling
and emptying. It is demonstrating the lesson *to* you. The instant a pointer touches the
canvas, autoplay yields and the same handle is now under your finger — you've seamlessly
gone from watching to driving. This is the "demo itself in motion on load" the brief asks
for, and it doubles as the always-on "animation is the medium" face of the app.

For embeds, autoplay-on-load is even more important: a guide-page slice has no chrome, no
instructions — the motion *is* the instruction. Make the autoplay loop a URL-param
(`autoplay=1`, `chapter=multiply`) so each embedded slice opens already demonstrating its
one idea.

## 7 · Chapters as embeddable slices — scaffolding without caging

The Arithmetic / Transform chapter split is good and maps cleanly to the framework's
**modes** (top-bar pills) and **layouts**. Each chapter is a focused single-idea slice:
"+", "×", "+c on a curve", "×c on a curve", "f(z) on the whole plane." My interaction notes:

- **Shared plane, shared scaffolding, swapped handles.** Don't rebuild the canvas per
  chapter; keep one plane + colors + unit-circle/rings, and let the chapter decide which
  handles and which live-coupling are active. Continuity *is* the lesson — "it's the same
  plane, we're just doing more to it."
- **Training wheels that come off.** Early chapters: snapping ON, scaffolding ON (unit
  circle, lattice dots, angle wedge), reduced clutter (just `a`, `b`). Later chapters: let
  the learner toggle scaffolding off, turn snapping off, raise sampling density. The
  progression from guided to free is itself the curriculum. Never *lock* the free
  exploration away — a "show me everything" escape hatch should always exist (the framework's
  Everything layout is the desktop version of this).
- **Each embed slice = one verb, one handle, autoplaying.** The embed shouldn't expose the
  full panel zoo; URL-params pick the chapter and pre-pose the operands so the slice opens
  already mid-aha.

## 8 · Failure-free exploration, reset, reversibility

The "prod, jiggle, push" loop only works if you can **never get stuck in a bad state** and
can always undo a poke.

| Need | Mechanism |
|---|---|
| Always recoverable | A prominent, always-visible **Reset handles** action (restores the chapter's "try me" default pose) — *separate* from the existing "Reset settings to defaults" (which nukes persistence/reloads — too heavy for a quick "oops"). |
| Undo a drag | At minimum, double-click a handle to return it to its last snap target or to `1`/`i`. Full undo stack is nice-to-have, not essential for a toy. |
| Productive "breaking" | Let them drag `a` to `0` and *see* `a·b` collapse to the origin (the annihilator), drag `|a|` huge and see the image fly off-screen (with a gentle auto-reframe or an "off-screen ↗" indicator so it's legible, not just gone). Breaking it should *teach*, not dead-end. |
| Reframe | Existing wheel/pinch zoom is good; add a "fit" / "recenter" so a learner who zoomed into the void can get home in one tap. |

## 9 · Curiosity & reward — challenges without a points-grind

The plan rightly worries about not turning a contemplative toy into a points-grind. The
right reward here is **the satisfaction of landing it**, not a score. Light, optional,
opt-in target moments:

- **"Land `a·b` on `i`."** With snapping, this is reachable and the *click* of landing on `i`
  (snap pop + the readout resolving to a clean `i`) is its own reward. No points, no timer.
- **"Make the product real."** (drag `b` until `a·b` sits on the real axis — discovers
  `arg b = −arg a`, i.e. conjugate-ish relationships).
- **"Turn the square into a diamond"** (×c on a curve, find the `c` that rotates 45°).

These are *prompts*, surfaced as a dismissible toast or an optional "challenges" chip — never
a mandatory gate, never a leaderboard. A learner who ignores them entirely and just fiddles
is the *primary* use case; challenges are a curiosity nudge for when free play stalls.

> [!TIP]
> The deepest reward loop in a toy like this is **"I wonder what happens if…"** answered
> *instantly*. Protect latency above all: if dragging `b` ever stutters or the product lags
> perceptibly, the whole "the hand teaches" thesis breaks. Budget the juice so the live
> coupling stays at 60fps even at high sampling density (decouple the cheap handle/arrow
> overlay from the expensive point-cloud morph; the SVG/overlay layer must never wait on the
> WebGL grid).

## 10 · Specific notes against the current code

- The two panes share **one point cloud** and an `OrthographicCamera` per pane — good, the
  morph (§ climax) can be a single uniform `t` lerping `position` between `inputPos` and
  `f(inputPos)` in the vertex shader; that's the cleanest possible "plane slides from z to
  f(z)" and it's almost free given the existing shader. Make `t` the **timeline** the plan
  wants, and *also* drivable by a scrub-drag on the canvas.
- `CurveSvg` already overlays SVG on the canvas — that overlay is exactly where the **draggable
  handles, arrows, angle wedges, and live readouts** should live. You have the inscribed-square
  math (`useInscribedSquare`, `clipFromMath`/`mathFromClip`) to place them precisely. The
  interaction substrate the brief mentions genuinely exists; the work is *adding handles to
  it*, not building from zero.
- `toMath` / `mathFromClip` is your snapping insertion point — snap in math-space after the
  inverse map, using a screen-space tolerance derived from `box.size` and `viewExtent`.
- The pointer handlers already juggle pinch vs. draw via a pointer map — extend that
  state machine with a "grabbed handle" mode (hit-test handles first on pointer-down; fall
  through to pan/draw). Keep the early-return-on-form-control discipline the framework
  requires.

## Verdict

**Endorse, with one blocking change and a clear priority order.**

- **Endorse:** the pedagogical arc, "animation is the medium," chapters-as-embeds, and
  building on the existing pane/SVG/gesture substrate. This is a genuinely strong design and
  the right toy to be *the* complex-numbers front door.
- **Blocking change (must-have for the thesis to hold):** the quantities the lesson is
  *about* (`a`, `b`, `c`, curve) must be **draggable on-canvas handles with a continuous
  live-coupling**, not panel fields with a play button. Without this, it's a visualization,
  not a "prod, jiggle, push" instrument. This is non-negotiable for me.
- **High priority (the "alive" feeling):** soft snapping to lattice/unit-circle/nice-angles,
  plus the minimal juice kit (snap pop, hover-swell, drag trail, angle-wedge fill). These are
  cheap and they are *most* of the difference between dead and alive.
- **High priority (zero-reading onboarding):** autoplay self-demo on load/idle that yields to
  the hand on touch; doubles as the embed face.
- **Medium priority:** always-visible "Reset handles," double-click-home, fit/recenter.
- **Lower priority / guard against:** challenge prompts (keep optional, no score), and the
  full juice budget (decay-to-stillness, point *at* the math, protect 60fps latency above all
  ornament).

Ordering matters: **draggable handles + live coupling first, snapping + juice second,
self-demo third.** Ship those three and the rest is polish on an already-alive toy. Skip the
first one and no amount of polish saves it.

## Self-reflection

1. **What would you do with another session?** Prototype the single most load-bearing
   interaction — drag `b`, watch `a·b` spiral live with a soft snap to `i` — as a throwaway
   spike, and *feel* it. My whole review rests on the claim that the live drag is the lesson;
   I'd want to verify the latency budget (overlay vs. WebGL morph) actually holds at high
   sampling density before committing to it as a thesis.
2. **What would you change about what you produced?** I leaned heavily on the multiplication
   loop and under-specified the **curve ×c** and **whole-plane morph** chapters' interaction
   feel — those are later in the arc but deserve the same "what's under the finger" treatment.
   I also asserted juice timings (120ms pop, 300ms decay, 60–90ms chase) from feel, not from
   testing.
3. **What were you not asked that you think is important?** Accessibility of a drag-first
   instrument: keyboard-drivable handles (arrow keys to nudge, with snapping) and reduced-
   motion respect for the autoplay/juice. A toy that *only* works with a pointer excludes
   people, and `prefers-reduced-motion` should dim the trails/springs.
4. **What did we both overlook?** Phone. The framework re-chromes below 740px and the plan/
   brief barely touch how drag-a-handle, two-finger-pan, pinch-zoom, and snapping coexist on
   a touch screen where the finger *occludes the handle it's dragging* — that's a real,
   different design problem (offset handles, magnifier loupe) the desktop notes don't solve.
5. **What did you find difficult?** Staying in my one lane. The juice/latency notes brush
   against architecture (overlay/WebGL decoupling) and pedagogy (which snap targets teach
   what); I flagged where but tried not to adjudicate the other hats' calls.
6. **What would have made this task easier?** Seeing the planned shader morph and any
   existing handle/arrow drawing code (there is none yet), and knowing the target sampling
   density for the climax so I could reason about the real latency budget rather than asserting it.
7. **Follow-up value:** MEDIUM — the design direction is sound and the priority order is the
   actionable core, but the load-bearing latency claim and the phone/touch interaction model
   are untested assumptions a spike should validate before implementation commits to them.
