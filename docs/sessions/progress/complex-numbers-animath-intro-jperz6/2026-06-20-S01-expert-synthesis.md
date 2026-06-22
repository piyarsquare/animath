---
kind: three-hats
session: 2026-06-20-S01
date: 2026-06-20
title: "Convergence — Plane Transform as the complex-numbers entry point (4-hat review)"
branch: claude/complex-numbers-animath-intro-jperz6
slug: complex-numbers-animath-intro-jperz6
status: complete
build: n/a
---

# Convergence Analysis — enriching Plane Transform into the complex-numbers entry point

A **four-hat** review (the standard three + a Game Designer added at Dan's request).
The four reports live beside this one:
[maintainer](2026-06-20-S01-expert-maintainer.md) ·
[consultant](2026-06-20-S01-expert-consultant.md) ·
[pedagogy](2026-06-20-S01-expert-pedagogy.md) ·
[game designer](2026-06-20-S01-expert-gamedesigner.md).

## Plan under review

<details><summary>Original request</summary>

Enrich the **Plane Transform** app (`src/animations/PlaneTransform/`) into *the*
entry-point instrument for complex numbers AND complex functions, used both as a
standalone app and sliced via URL-param embeds into explanatory guide pages. The
pedagogical arc: (1) a number is a point/arrow `x+iy`; (2) it's also a length & angle
`R·e^{iθ}`; (3) arithmetic is geometry — add/multiply two numbers; (4) shapes
transform too — add/multiply a *curve* by a complex constant; (5) a function does
this to every point at once (the current `z↦f(z)` two-pane view); (6) the climax —
the whole plane morphing from domain to image.

**Animation is the medium, not a mode.** Per Dan (verbatim): *"animate however is a
truth through everything. even addition multiplication will be animated -- this is
animath."* Every operation plays as motion: `a+b` tip-to-tail; `a·b` the
angle-adding / length-scaling sweep; `c·curve` the curve sweeping to its image; the
function is the grid/point-cloud sliding from z to f(z) via a `morphT∈[0,1]`
parameter lerping each point between input and f-output position. Plus: reference
scaffolding (unit circle, polar rings, radial rays, gridlines, axes); draggable
numbers with dual-form readouts; ported sampling patterns; chapters/modes
(Arithmetic / Transform) each an embeddable slice. The fourth hat (Game Designer)
focuses on "prod, jiggle, push" tactile learning, feedback, and engagement.

</details>

## 1 · Points of agreement (high confidence)

All four hats endorse the **direction**. Their objections are about *how*, not *whether*.

| # | Convergent finding | Hats | Confidence |
|---|---|---|---|
| A | The 6-step arc (point → polar → arithmetic → curve → function → plane-morph) is sound and *animath*-shaped. | all 4 | high |
| B | **The honest motion-path is the whole ballgame.** `a·b` must **spiral** (`a·bᵗ`: modulus `\|a\|·ρᵗ`, argument `arg a + t·φ`, simultaneously); `a+b` genuinely **is** the straight tip-to-tail slide. The contrast is itself the lesson. A straight chord for multiplication is *actively false* (with `b=−1` the tip walks through the origin). | consultant, pedagogy (maintainer concurs interpolant matters) | high |
| C | **The interpolant must be explicit per chapter** — affine `mix` for the plane climax, polar/spiral for arithmetic. There is no single "lerp uniform" that serves both. | consultant, pedagogy | high |
| D | **The whole-plane morph shader is nearly free**: the output pane already computes `f(z)`; add `mix(inputPos, fz, morphT)` + a clock. No particle engine, no second renderer. | maintainer, consultant, game | high |
| E | **Direct manipulation is non-negotiable.** `a`, `b`, `c`, and the curve must be **draggable on-canvas handles with continuous live coupling**, not `ComplexInput` panel fields + a play button. Curve-draw being hidden behind a panel toggle is a discoverability bug to *fix*, not inherit. | game (blocking), pedagogy, consultant | high |
| F | **Don't bloat the 818-line file.** Extract as it grows — `useMorphClock`, a draggable-handle subsystem, `arithmetic.ts`, a 2D scaffold module — copying the proven `lib/particles`+`ParticleViewerShell` headless split and the existing rAF→ref→uniform spin-clock (no per-frame `setState`). Promote to `lib/` only on a second consumer. | maintainer, consultant | high |
| G | **Chapters = top-bar mode pills / layouts, one route, one folder** — not new hash routes. Extend `PlaneEmbedConfig` **additively** so the two live guide embeds keep rendering. | maintainer, consultant | high |
| H | **Stay clear of the `!high` "plane/particles unification" backlog item.** Reconciling samplers/coordinate conventions across viewers is a separate engine chore; folding it in here breaks parallel-branch safety. | maintainer, consultant | high |
| I | **The "Net scaffold" doesn't port cleanly** — ComplexParticles' Net is screen-space Hopf machinery. Write a fresh flat-2D unit-circle/rings/rays scaffold (~30 lines); it's *easier* than porting. | maintainer (game/pedagogy assume scaffold exists) | med-high |
| J | **Honest disclosure** in the explainer: morph in-betweens are *visual blends, not conformal maps*; "circles→circles" is Möbius-specific (false for `z²`); we sample-then-interpolate; the branch cut is real; `r·e^{iθ}` not `exp(θi)`; name modulus/argument/domain/image. | pedagogy | high |

> [!IMPORTANT]
> The single loudest cross-hat signal: **animate everything, but make every motion
> trace a path the mathematics distinguishes.** "Animation is the medium" and
> "the path must be honest" are the same requirement viewed from the pedagogy and
> game-design sides. The spiral-vs-slide contrast is not a detail — it is the
> core teachable moment of the whole app.

## 2 · Points of tension (need a decision)

| Tension | Side A | Side B | Recommended resolution |
|---|---|---|---|
| **Plane-climax interpolant** | *Pedagogy:* prefer a conformal one-parameter family (`cᵗ·z`, `z^{(1−t)+ta}`, `e^{taz}`) so every frame is a genuine angle-preserving map — the honest climax. | *Consultant/Maintainer:* affine `mix(z,f(z),t)` is universal and ~5 lines; conformal families only exist for *some* f and `z²` folds through. | **Both, per-function.** Use the conformal family where it's cheap and exact (multiplication/linear `cᵗ·z` is trivial — and that's the hero anyway); fall back to affine `mix` **with an on-screen "visual blend" label** for general f. |
| **Autoplay** | *Game:* autoplay on load/idle = the self-demo; critical for zero-reading onboarding and embed slices. | *Pedagogy:* autoplay OFF, scrubbable — an instrument, not dazzle. | **Autoplay once on load/idle, then yield to the hand; always scrubbable.** Per-slice override via embed param. |
| **Arithmetic chapter substrate** | *Consultant:* arithmetic chapters should be **SVG/DOM, zero WebGL** (a few handles + vectors; saves a context on multi-iframe guide pages). | The app is WebGL-centric; mixing renderers adds a seam. | **SVG/DOM overlay for arithmetic** (handles, wedges, vectors, readouts), WebGL reserved for the grid/plane-morph chapters. Render-on-demand for the WebGL panes. |
| **Extraction timing** | *Consultant:* extract `lib/complexPlane` (clock + coordinate contract absorbing `polarViews.ts`) up front. | *Maintainer:* extract incrementally; don't over-abstract before a second consumer. | Extract **app-local hooks/modules now**; defer the `lib/`-level promotion until the morph clock or scaffold has a second consumer. |

## 3 · Blind spots (none fully addressed)

- **Phone / touch.** The finger **occludes** the handle it's dragging; drag handles + a
  scrubber on a small screen are unsolved by every hat. Needs an offset-handle or
  "drag anywhere, handle follows" model.
- **Continuous-animation perf at scale.** Density goes to 900² ≈ **810k points**;
  animating `morphT` every frame on that is untested. Needs a motion-time LOD/cap.
- **Keyboard / AT accessibility.** Draggable handles need a non-pointer path — which
  argues for **keeping** the numeric `ComplexInput` fields as a demoted-but-present
  fallback, not deleting them.
- **Delivery sequencing.** No hat sequenced the build into shippable increments or
  named the MVP first slice (see §4).
- **Embed-context budget.** Guide pages already embed multiple live iframes; adding
  always-on animation clocks compounds the WebGL-context risk — render-on-demand is
  required, not optional.

## 4 · Recommended action — a phased build

> [!TIP]
> Lead with the **hero**, not the foundation. The live multiplication loop is the
> highest-leverage, lowest-risk, most-novel piece, and it validates the entire
> "animate everything honestly" thesis before any shader work.

1. **Phase 1 — the hero (live multiplication).** SVG/DOM overlay on the plane:
   draggable `a` and `b`; while you drag `b`, `a·b` **spirals every frame** along
   `a·bᵗ`, the angle wedge fills, dual readout shows both `x+iy` and `r·e^{iθ}`.
   Autoplay-once self-demo. Zero new WebGL. *This is the MVP slice and the first
   guide figure.* (Addition is the same overlay with the straight-slide path — ship
   it alongside to make the contrast.)
2. **Phase 2 — curve ×c / +c.** Reuse the same spiral/slide path applied to the
   existing drawn/standard curve; promote curve-draw out of the hidden panel toggle.
3. **Phase 3 — the plane-morph climax.** `morphT` clock + `mix(inputPos, fz, t)` in
   the output shader; conformal family where f admits one, affine+label otherwise;
   faint **ghost identity grid** underneath (the clean answer to "which plane am I
   looking at"); scrubbable timeline.
4. **Phase 4 — scaffolding & juice.** Fresh 2D unit circle / rings / rays / axes
   (toggleable); **soft snapping** to the Gaussian lattice, unit circle, and nice
   angles (π/4, π/6) so `i` is reachable and "land `a·b` on `i`" is a click; a
   restrained juice kit (snap pop, hover-swell, drag trail) that always decays to
   stillness. Sampling patterns (Rings/Spokes/Web) if still wanted.
5. **Phase 5 — chapters + embeds + guide.** Wire chapters as top-bar mode pills,
   extend `PlaneEmbedConfig` additively, then author the intro guide page slicing
   each chapter.

### Decisions for Dan (before Phase 3)

1. **Interpolant investment** — confirm "conformal where cheap, affine+label
   otherwise." (Recommended.)
2. **Autoplay default** — "on-load-once then yield, always scrubbable." (Recommended.)
3. **MVP = the live multiplication chapter first** — confirm leading with the hero
   rather than the scaffolding. (Recommended.)

## Self-reflection

1. **What would you do with another session?** Prototype Phase 1 (the live
   multiplication overlay) to ground-truth the two claims the hats left as
   assumptions: that the spiral reads clearly during a real drag, and that an
   SVG/DOM overlay stays glued to the WebGL plane under zoom/log-polar without jitter.
2. **What would you change about what you produced?** The four hats overlap heavily
   on "don't bloat the file / copy the proven patterns"; I could have given the
   maintainer and consultant more *distinct* prompts to reduce echo. The pedagogy and
   game hats were the ones that produced genuinely new constraints.
3. **What were you not asked that's important?** The phone/touch interaction model —
   it's a blind spot across all four and it's where this kind of direct-manipulation
   app usually dies.
4. **What did we both overlook?** A concrete WebGL-context budget for the guide
   pages: "render-on-demand" was asserted but nobody counted contexts against a real
   multi-iframe page.
5. **What did you find difficult?** Adjudicating the interpolant tension without a
   prototype — the conformal-family-per-function claim is elegant but its build cost
   is unknown until tried.
6. **What would have made this easier?** A 20-line spike of the spiral drag before
   the review, so the hats critiqued a moving thing rather than a description.
7. **Follow-up value:** MEDIUM — direction is firm and convergent; the open items are
   three of Dan's decisions and two claims a small prototype would settle.
