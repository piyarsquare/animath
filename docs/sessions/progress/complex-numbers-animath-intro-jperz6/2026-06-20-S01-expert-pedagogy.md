---
kind: three-hats
session: 2026-06-20-S01
date: 2026-06-20
title: "Math-Viz & Pedagogy hat — animating complex numbers in Plane Transform"
branch: claude/complex-numbers-animath-intro-jperz6
slug: complex-numbers-animath-intro-jperz6
status: completed
build: n/a
followup: medium
pr: null
app: plane-transform, docs
---

# Math-Viz & Pedagogy hat — animating complex numbers in Plane Transform

This is the math-educator lens on the proposal to grow **Plane Transform** into
the canonical entry-point instrument for complex numbers *and* complex
functions. I am the person who will stand in front of a class (or a motivated
self-learner) and use these embeds. My single test for every feature: **is the
picture TRUE?** Animation is wonderful right up to the moment it asserts a
geometry that isn't there. The proposal's core ambition — "animation is a truth
through everything" — is exactly right *if and only if* each animation traces a
path the mathematics actually distinguishes. Most of this review is about
making sure it does.

## Plan under review

<details>
<summary>Original request</summary>

Enrich the **Plane Transform** app into *the* entry-point instrument for complex
numbers AND complex functions, used standalone and sliced via URL-param embeds
into explanatory guide pages. Pedagogical arc, in order: (1) a number is a
point/arrow `x+iy`; (2) it's also length & angle `R·e^{iθ}`; (3) arithmetic is
geometry — add/multiply two numbers; (4) shapes transform too — add/multiply a
*curve* by a complex constant; (5) a function does this to every point at once
(the current `z↦f(z)` two-pane view); (6) the climax — the whole plane morphing
from domain to image.

**Animation is the medium, not a mode.** Per the user (verbatim): *"animate
however is a truth through everything. even addition multiplication will be
animated -- this is animath."* Every operation plays as motion: `a+b`
tip-to-tail; `a·b` the angle-adding/length-scaling sweep; `c·curve` the curve
sweeping to its image; the function is the grid/point-cloud sliding from z to
f(z) via a `morphT∈[0,1]` parameter lerping each point between input and
f-output position.

Concrete features: (1) reference scaffolding — unit circle, polar rings
(constant |z|), radial rays (constant arg z), gridlines, colored axes; (2)
draggable numbers a,b with animated, dual-form (x+iy and R·e^{iθ}) readouts of
a+b and a·b; (3) curve "+c"/"×c" by a draggable complex constant, animated; (4)
a playback timeline driving the morph; (5) ported sampling patterns
(Rings/Spokes/Web) so "circles map to circles" is watchable; (6)
polar/exponential readout. Likely structure: chapters/modes (Arithmetic /
Transform) sharing one plane + colors + scaffolding, each an embeddable slice.

</details>

## Executive summary

The arc is pedagogically sound and the "animate everything" stance is the right
spirit. But the headline risk is precisely the one the brief names: **a
straight-line tween for multiplication is a lie, and the straight-line `morphT`
lerp for the plane morph is a subtler lie.** The honest motion for `a·b` is a
**spiral** (log-spiral interpolation of modulus, simultaneous with linear
interpolation of argument); the honest default for the plane morph is a
**straight-line lerp clearly *labeled as a visual interpolation, not a path the
function takes*** — and the better climax is the **continuous conformal
homotopy** where one exists. Get the three or four animation paths right and
this becomes a genuinely excellent teaching tool. Get them wrong and it is
beautiful misinformation. The rest of my notes are about defaults, framing, and
the "which plane am I looking at" disambiguation (a real ambiguity, solvable).

## 1 · The pedagogical arc — order and defaults

The six-step arc is the right order. It is the classical Needham / Wessel–Argand
progression: point → polar → arithmetic-as-geometry → action on shapes → action
on every point → the map as a deformation. My only structural note is that steps
(3) and (4) should not be a hard wall: *addition* and *multiplication* of two
numbers (step 3) and *of a curve* (step 4) are the **same operation at two
scales**, and the app should make that continuity visible rather than gating it
behind separate chapters.

| Step | Claim it must teach | Best DEFAULT view | Trap |
|---|---|---|---|
| 1 · `x+iy` | a number is a located arrow | Cartesian grid, one draggable arrow from origin, live `x+iy` readout | showing only a *dot* — the arrow-from-origin is what makes "+" make sense |
| 2 · `R·e^{iθ}` | same number, length & angle | **add the unit circle + one polar ring + one ray**; dual readout | hiding the Cartesian grid entirely — keep both, toggle emphasis |
| 3 · `a+b`, `a·b` | arithmetic IS geometry | start on **`a+b` tip-to-tail**; multiplication is step 3b | jumping straight to multiply before "+" lands |
| 4 · `c·curve`, `c+curve` | the operation acts on a whole shape | **circle** as the first curve (so "circle→circle" under `×c` is visible) | defaulting to a generic squiggle — pick a curve whose image is *recognizable* |
| 5 · `z↦f(z)` | every point at once | the **existing two-pane** view, default `f=z²` or `eᶻ` | a function whose image overruns the frame before you see structure |
| 6 · plane morph | the map as a deformation | **identity→f morph on a Cartesian grid**, paused at `morphT=0` | autoplaying the morph before the learner has read the static endpoints |

> [!IMPORTANT]
> **Decision I'd push for:** the default *landing* state of the standalone app
> should be **step 5** (the two-pane `z↦f(z)`), because that is what the app is
> today and what its name promises. Steps 1–4 and 6 are *embeddable slices*
> reached by URL params, sequenced inside the guide pages. Don't regress the
> standalone app's identity to "lesson 1 of N."

## 2 · The honest animation of `a·b` — it must be a spiral

This is the heart of the review. Multiplication by `b = ρ·e^{iφ}` is, by
*definition*, "rotate by `φ`, scale by `ρ`." The motion that shows this honestly
is the one where, at every intermediate frame, the moving tip has **interpolated
argument** and **interpolated modulus simultaneously** — which traces a
**logarithmic spiral**, not a straight chord.

The correct interpolation between `a` (the starting vector) and `a·b` (the
product) is the **one-parameter subgroup** through `b`:

```text
path(t) = a · b^t   for t ∈ [0,1],  where  b^t = ρ^t · e^{i·t·φ}
```

so modulus runs `|a|·ρ^t` (geometric, i.e. straight in log-radius) and argument
runs `arg a + t·φ` (linear in angle). That is the unique smooth path that makes
the *whole point* — angles add, lengths multiply — legible frame by frame.

| Candidate motion | What the learner infers | Verdict |
|---|---|---|
| **Straight chord** `lerp(a, a·b, t)` | "multiplication slides the point in a line" — **false**; the tip can even **pass near or through the origin** when `arg b ≈ π`, implying a sign flip that isn't happening | ❌ reject as the default; actively misleading |
| **Two-phase** (rotate fully, *then* scale) | angle and length are independent steps | ⚠️ acceptable as an *optional* "decompose" toggle, honest but not the natural motion |
| **Log-spiral** `a·b^t` | angles add *while* lengths multiply — the definition, animated | ✅ **the default** |

> [!CAUTION]
> **Gotcha — the chord through the origin.** With `a=1`, `b=-1` (so `arg b=π`),
> the straight-line tween walks the tip from `+1` through `0` to `-1`. A student
> watching that will reasonably conclude "multiplying by `-1` momentarily makes
> the number zero / undefined." The spiral `1·(-1)^t = e^{iπt}` instead sweeps
> the unit semicircle — never touching the origin — which is the truth. This one
> example alone justifies the spiral.

Implementation is cheap: you already interpolate; just interpolate in
`(log r, θ)` rather than `(x, y)`. Render a faint **arc of the swept path** plus
the two static reference arrows so the "angles add, lengths multiply"
decomposition is readable when paused. Show the **ρ^t** and **φ·t** values
ticking in the dual readout.

For `a+b` the honest motion is genuinely the **straight tip-to-tail slide** (the
translated copy of `b` walking onto the head of `a`) — addition *is* linear, so
here the chord is correct. Good: the contrast between "addition slides in a line"
and "multiplication spirals" is itself a teaching moment. Make the two motions
visibly different so the contrast lands.

## 3 · The plane morph — what homotopy, and how to frame it

The proposed `morphT` lerps each point linearly between `z` and `f(z)`:

```text
P(z, t) = (1−t)·z + t·f(z),   t ∈ [0, 1]
```

This is the standard "deform the grid" animation (3Blue1Brown / Wegert style)
and it is **fine — but only if framed honestly.** It is a *visual interpolation
between two pictures*, NOT a path the function "takes," and NOT (in general) a
sequence of conformal maps. Two specific honesty hazards:

1. **The straight-line lerp is not conformal at intermediate `t`.** `P(z,t)` is
   conformal only at `t=0` and (where `f` is) `t=1`; in between, grid squares
   can shear into non-right-angled cells. A learner told "complex maps preserve
   angles" and then shown angles *not* preserved mid-morph is being
   contradicted by the animation. The explainer **must** say: *the in-between
   frames are a blend of the two pictures, not themselves complex functions.*

2. **Fold-through / self-intersection.** For non-injective `f` (e.g. `z²`), the
   linear morph can make sheets pass through each other and points pile up; the
   color carries the "same color = same input" thread, but the geometry of the
   in-between is arbitrary. That's acceptable *if disclosed*, misleading if sold
   as "what the function is doing."

> [!IMPORTANT]
> **Decision — offer two morph paths, default to the honest-and-simple one.**
> - **Default: linear blend** `(1−t)z + t f(z)`, labeled *"visual blend of the
>   two planes."* Simple, robust, never undefined.
> - **Optional: continuous conformal homotopy** where `f` admits one — the
>   honest climax. For `f(z)=z^a` use `z^{(1−t)+t·a}` (a *family of conformal
>   maps*, every frame angle-preserving); for `f(z)=c·z` use `c^t·z` (the same
>   log-spiral as §2, now acting on the whole plane!); for `f(z)=e^{az}` use
>   `e^{t·a·z}`. When such a family exists, **prefer it** — every intermediate
>   frame is then a genuine complex map and conformality is preserved
>   throughout, which is the lesson.

The conformal-family path is the strongest single thing this app could add,
because it makes the plane morph *itself* honest rather than merely
well-labeled. It won't exist for every `f` in the catalog (no canonical
one-parameter conformal family through an arbitrary `sin`), so the linear blend
must remain the fallback — but expose the conformal one wherever it's available
and say which you're showing.

## 4 · `c·curve` and "circles map to circles"

Step 4 is where the spiral pays a second dividend: **`c·curve` is the §2 spiral
applied to every point of the curve at once.** Animate it as `curve · c^t` and
the whole shape *spirals* into its image — the circle sweeps out an annular
swept region, the square spirals into a tilted, scaled square. This is both
honest and gorgeous, and it explicitly connects step 3 (one number) to step 4
(a shape) to step 6 (the whole plane) as **one idea at three scales.**

The brief's "circles map to circles" (Rings/Spokes/Web sampling) is the right
hook for step 5 — but note the precise claim so the explainer doesn't overstate:

| Map | Sends circles centered at 0 to… | Sends *general* circles to… |
|---|---|---|
| `z ↦ c·z` (Möbius, affine) | circles centered at 0 | circles/lines |
| `z ↦ 1/z` | circles centered at 0 | circles **or lines** (lines = circles through ∞) |
| `z ↦ z²` | circles centered at 0 (radius `r²`) | **not** circles in general |
| `z ↦ eᶻ` | **rays/segments**, not circles; vertical lines → circles | — |

> [!WARNING]
> "Circles map to circles" is a **Möbius** theorem, not a general complex-map
> theorem. The honest, catchy version is: *circles **centered at the origin**
> map to circles centered at the origin under any `z↦z^n` or `z↦cz`* (because
> those only touch the modulus radially) — and the *general* circle-line
> preservation is special to Möbius maps `(az+b)/(cz+d)`. Word the sampling
> guide so a student doesn't walk away thinking `z²` preserves all circles.

## 5 · Semantic hygiene — naming as mathematicians think

The current app already gets most of this right (`z — domain`, `w = f(z) —
image`, hue = argument). Carrying that discipline into the new steps:

| Use | Not | Why |
|---|---|---|
| `R·e^{iθ}` | `exp(θi)`, `r∠θ` | the brief's own house style; `e^{iθ}` is the mathematician's notation |
| **modulus** / **argument** (`\|z\|`, `arg z`) | "magnitude/phase" alone | name both; *phase* is fine for the color, *argument* for the number |
| **domain** (input `z`) / **image** or **range** (output `w`) | "input plane / output plane" only | keep the words the app already uses |
| `z = x + iy` AND `z = R·e^{iθ}` shown together | one form at a time | the dual readout is the whole point of step 2 |
| the four axes: **Re(z), Im(z), Re(w), Im(w)** | "x, y, u, v" without legend | fine to abbreviate *if* the legend names them once |

> [!NOTE]
> **The `R` vs `r` capitalization.** The brief writes `R·e^{iθ}` (capital `R`)
> and elsewhere `arg z`, `|z|`. Pick one symbol for modulus and use it in the
> readout, the swept-arc label, and the explainer identically. I'd use lowercase
> `r = |z|` to match `r·e^{iθ}` in the existing EXPLAINER.md (line 44), and
> reserve capitals for nothing — consistency beats either choice.

## 6 · The "which plane am I looking at?" problem

This is the real ambiguity flagged in the backlog, and it sharpens as we add
steps where there is sometimes *one* plane (a number sitting in ℂ, steps 1–3)
and sometimes *two* (domain vs image, step 5) and sometimes *one plane being
deformed* (step 6). A learner who can't instantly answer "is this the bare plane,
or a plane mid-transformation?" is lost.

Disambiguation that I'd actually trust in a classroom:

1. **Persistent corner label on every canvas** naming its role: `z-plane
   (domain)`, `w-plane (image)`, or — during a morph — `z → w  (t = 0.42)`. The
   app already labels the two panes; extend the convention to the single-plane
   and morphing states, and **put `t` in the label while morphing** so "this is
   an in-between, not a real plane" is unmissable.
2. **A faint "identity ghost" grid** under the morph: the undeformed `z`-grid
   stays as a pale reference so the deformation is read *against* the bare plane.
   This is the cleanest answer to "which one is the untransformed plane" — it's
   literally drawn underneath.
3. **Color does double duty but say so.** Hue=argument *of the input* is the
   thread that ties domain to image. State once, prominently, "color is glued to
   the input point and rides along" — then the learner uses color, not position,
   to answer "where did this go."
4. **Don't reuse the same frame chrome for one-plane and two-plane states.** Step
   1's single arrow-plane should look visually distinct (e.g. no split, centered)
   from the step-5 split, so the mode is legible before reading any label.

> [!TIP]
> The single most effective disambiguator is #2 — the ghost identity grid. In my
> experience teaching this, students stop asking "which plane is this" the moment
> the original grid is visible *behind* the deformed one.

## 7 · Color legibility & accessibility

Phase→hue (domain coloring) is the right scheme and is already in place. Two
classroom-tested cautions:

- **CVD (red–green).** A pure HSV phase wheel puts red at `0` and cyan at `π`,
  which is mostly fine, but red/green confusion can blur `arg ≈ ±2π/3`. Prefer a
  **perceptually-uniform cyclic map** (e.g. a CIELab-based cyclic palette / the
  "CET-C" family) over raw HSV. At minimum, *don't* rely on hue alone to read
  sign — the existing isolines/tiles (`colorMode: Tiles/Grid`) carry magnitude
  and should stay available, since they give a non-color channel.
- **The branch cut as a color discontinuity** (EXPLAINER §branch) is a *feature*
  to point at, not a bug to hide — keep it, and name it in the guide.
- For the arithmetic steps, the two draggable numbers `a, b` and their results
  `a+b`, `a·b` should be **distinguished by shape/label, not only color** (e.g.
  solid arrow vs dashed, "a"/"b"/"a·b" tags), so the figure survives grayscale
  printing and projector washout.

## 8 · Does animating multiplication *help*, or just dazzle?

Honest answer: **it helps, but only with the spiral and only with a pause/scrub.**
A multiplication that just plays once and stops is dazzle. A multiplication where
the learner can (a) drag `b` and watch the product update live, (b) scrub
`t∈[0,1]` by hand to *stop* mid-spiral and read "right now the angle is
`arg a + t·φ`, the length is `|a|·ρ^t`", and (c) see the swept arc persist — that
is genuine understanding. So the **playback timeline (feature 4) is not optional
polish; it is what converts the animation from spectacle into instrument.**
Scrubbable, reversible, with the numeric readout slaved to `t`. Autoplay should
be off by default at every step (let the static endpoints land first), with a
"play" affordance — the brief's instinct to make animation the medium is right,
but *learner-driven* scrubbing beats autoplay for teaching.

## 9 · What the explainer/guide MUST disclose

A short honesty checklist for the prose (these are the claims that, unstated,
turn a true picture into a misleading one):

- [ ] The `a·b` motion is the **spiral `a·b^t`** — *the* honest path; the chord
      would falsely pass through the origin.
- [ ] The plane morph's intermediate frames are a **visual blend, not complex
      maps** (linear morph) — OR, when the conformal family is used, say *every
      frame here IS a complex map*. Never silent about which.
- [ ] "Circles → circles" is **Möbius-specific** (or "centered-at-0 circles
      under `z^n`/`cz`"), not universal.
- [ ] **Log-polar unrolling** plots `(arg, log|·|)` — the *display* is unrolled,
      the *number* is unchanged (already well-stated in the current EXPLAINER).
- [ ] We **sample** points; the rendered surface is interpolation between
      samples (matters at high warp / near poles).
- [ ] Color is **glued to the input** and the **branch cut** is a real
      discontinuity, not a rendering seam.
- [ ] Multi-valued functions show **one branch**; the branch index walks sheets
      (already covered — keep it).

## 10 · Smaller notes

- **Default function for the morph climax:** `z²` is the canonical first morph
  (folding, doubling angles — and it has the honest conformal family `z^{1+t}`).
  But `eᶻ` is the more *surprising* one (horizontal lines → rays, vertical lines
  → circles) and also has a conformal family. Offer both as guide slices; default
  the *standalone* app to `z²` for familiarity.
- **The "Spiral" standard curve** already exists in `standardCurves.ts` — but
  note the naming collision: a *spiral curve* (a shape you draw) vs the *spiral
  motion* of multiplication. Disambiguate in UI copy ("spiral path" for the
  motion).
- **Drag precision for `a, b`:** snap to a faint integer/half-integer lattice
  (with a modifier to release) so a learner can set `a=1, b=i` exactly and watch
  the clean 90° rotation — the cleanest possible first multiplication.
- **`i·i = −1` as the hero example.** The single most valuable scripted moment:
  `b=i`, drag `a` around, watch every product be the input rotated 90°; then
  `a=i` too and land on `−1`. Consider a one-tap preset.
- **Reduced-motion.** Honor `prefers-reduced-motion`: collapse animations to the
  scrubber's static endpoints + swept-arc, no autoplay. Accessibility and honesty
  align here.

## Verdict

**Endorse, with mathematical conditions.** The arc, the "animate everything"
philosophy, the scaffolding, the dual readouts, and the embed-slicing are all
right, and the existing two-pane core is a strong foundation. I am endorsing the
*direction* enthusiastically.

The endorsement is **conditional on three non-negotiable correctness items**,
each cheap to implement:

1. **`a·b` (and `c·curve`) animate as the spiral `·b^t`, never a straight chord.**
   The chord is actively false (origin-crossing). This is the headline.
2. **The plane morph defaults to the linear blend *explicitly labeled a visual
   interpolation*, and offers the continuous conformal family `z^{(1−t)+t·a}`
   etc. wherever `f` admits one** — preferring the conformal family as the
   honest climax.
3. **The explainer discloses §9's checklist** — above all that "circles→circles"
   is Möbius-specific and that morph in-betweens are blends, not maps.

Two **strong recommendations** (not gates): the **ghost identity grid** as the
answer to "which plane am I looking at," and the **scrubbable timeline** as the
thing that turns animation from dazzle into instrument. With those, this is the
best complex-numbers on-ramp I've seen proposed for this toolkit.

## Self-reflection

1. **What would you do with another session?** Prototype the spiral interpolation
   and the conformal-family morph for the three or four functions that admit one
   (`z^a`, `cz`, `eᶻ`) and verify visually that intermediate frames stay
   conformal — claims about honesty are only as good as the actual render.
2. **What would you change about what you produced?** I asserted which catalog
   functions have a clean one-parameter conformal family from reasoning, not from
   reading the shader/`complexMath.ts` exhaustively; a pass over the full function
   list to mark "has honest homotopy / blend-only" would harden §3.
3. **What were you not asked that you think is important?** The phone/embed
   constraint: scrubbable timelines and ghost grids must survive a 300px-tall
   iframe and touch. The honest-animation requirements interact with the small
   embed viewport in ways I only gestured at.
4. **What did we both overlook?** Performance of `b^t` and `z^{(1−t)+t a}`
   evaluated per-point per-frame at the current 240×240+ point densities — the
   spiral/conformal paths need `pow`/`exp` of complex args in the vertex shader;
   that's feasible but not free, and branch-cut handling inside the homotopy
   could flicker.
5. **What did you find difficult?** Drawing the line between "honest with a
   disclosure" (linear morph) and "dishonest, reject" (multiplication chord). The
   distinction is real — addition IS linear, multiplication is NOT — but it
   required being precise about *which* operation the motion is claiming.
6. **What would have made this task easier?** A list of exactly which functions
   the guide series intends to feature in the arithmetic→morph steps; my fidelity
   table is general but a fixed shortlist would let me certify each path.
7. **Follow-up value:** MEDIUM — the conclusions are correct and the three gates
   are firm, but the conformal-family claims per-function and the shader-cost
   reality need a prototype-and-verify pass before they're built on.
</content>
</invoke>
