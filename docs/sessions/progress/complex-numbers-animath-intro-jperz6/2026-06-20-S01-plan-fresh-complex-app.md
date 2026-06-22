---
kind: plan
session: 2026-06-20-S01
date: 2026-06-20
title: "Plan — a fresh complex-numbers entry-point app (successor to Plane Transform)"
branch: claude/complex-numbers-animath-intro-jperz6
slug: complex-numbers-animath-intro-jperz6
status: proposed
build: n/a
app: general, plane-transform, complex-particles, docs
signals: needs-dan
next: Build Phase 1 — the live multiplication/addition overlay (the hero slice).
---

# Plan — a fresh complex-numbers entry-point app

A new, self-contained app that teaches complex numbers and complex functions as
**interactive transformations of the plane** — explored by **dragging**, by a
**parameter slider**, and, *where motion teaches*, by **animation**. Built clean
around the four-hat review ([synthesis](2026-06-20-S01-expert-synthesis.md)). It
**supersedes Plane Transform**, which soft-retires once the new app covers its job
(the PolygonWorlds → TopologyWalk / StableMatching → StableMarriage pattern).

> [!NOTE]
> **Decisions locked (this session):** (1) Fresh successor app, not in-place
> enrichment. (2) Complex Particles is reframed by **positioning only** (catalog blurb
> + guide wording) — **no code/engine changes** to it on this branch.

> [!IMPORTANT]
> **Animation is one major mode of exploration, not a mandate.** Earlier framing
> ("animate everything") overstated it. The primary substrate is **direct
> manipulation + a parameter slider** (the user likes the slider); **animation is an
> optional lens** you can turn on where it illuminates — most of all the multiplication
> spiral. Plane deformations are perfectly good as **static, draggable, slider-scrubbed
> pictures**; they need not auto-animate.

## Why a fresh app (not enrich Plane Transform)

- **Parallel-branch safe:** a new self-contained folder; the only shared edits
  (`src/index.tsx`, `src/apps.ts`, `src/chrome/catalog.ts`, `README.md`) are
  append-only. We never touch the shared `lib/particles` engine or Plane Transform.
- **Resolves the `!high` "plane/particles unification" item by clarifying roles**, not
  merging engines: **new app = the 2D, animated, direct-manipulation entry point**
  (owns "numbers + functions as a transformation of the plane"); **Complex Particles =
  the 4D / Riemann-surface deep end**; **Plane Transform = the retired middle**.
- **Clean slate for the two load-bearing findings** — "animation is the medium" and
  "direct manipulation is non-negotiable" become foundational, not retrofitted onto a
  static two-WebGL-pane + curve-FSM architecture (the maintainer's "don't recreate the
  mega-component" worry).

## What we salvage from Plane Transform (fresh ≠ from zero)

| Asset | File | Reuse |
|---|---|---|
| GPU shader running `f(z)` | `PlaneTransform/shaders/` | Base for the morph shader (+ `mix(inputPos, fz, morphT)`) |
| Cartesian ↔ log-polar coord math | `PlaneTransform/polarViews.ts` | The single coordinate contract |
| Standard + drawn curves | `PlaneTransform/standardCurves.ts` | Curve chapter |
| Embed-param infra | `lib/embedParams.ts` (`PlaneEmbedConfig`) | New app gets its own additive embed config |
| Two-pane split | the `panes:` ViewDef | One optional "Transform" chapter |
| Complex fn tables | `lib/complexMath.ts` | Shared, unchanged |

## App identity (provisional — easy to change before ship)

- **Working name:** *Argand* · route `#/argand` · folder `src/animations/Argand/`.
  Alternatives to consider: *Complex Plane*, *Plane Play*, *Twist & Scale*.
- One route, one folder. **Chapters are top-bar mode pills / layouts**, not new routes.

## Chapters (the pedagogical arc as modes)

Each chapter is explored by **direct manipulation and a parameter slider**; **animation
is an optional lens** (a slider can be scrubbed by hand *or* played). The "path" column
is the trajectory a value traces *when* you scrub/animate it — and that path must be
honest whether it's dragged or played.

| Chapter | Idea | Substrate | Path (when scrubbed/animated) |
|---|---|---|---|
| **Number** | `x+iy` is a point/arrow; also `r·e^{iθ}` | SVG/DOM | drag → live polar/Cartesian readout |
| **Add** | `a+b` is tip-to-tail | SVG/DOM | **straight slide** (genuinely affine) |
| **Multiply** | `a·b`: angles add, lengths multiply; **and `a·b = b·a`** | SVG/DOM | **spiral** `a·bᵗ` (modulus `\|a\|·ρᵗ`, arg `arg a + t·φ`) |
| **Curve** | shapes transform too | SVG overlay + WebGL plane | `c·curve` spiral / `c+curve` slide |
| **Transform** | a function does it to every point (two panes) | WebGL ×2 | the existing `z ↦ f(z)` map (static or slider-scrubbed) |
| **Morph** | the whole plane flows to its image | WebGL | per-function (see below); **slider-driven, animation optional** |

> [!IMPORTANT]
> **The spiral-vs-slide contrast is the core lesson, not a detail.** A straight chord
> for multiplication is *actively false* (`b=−1` walks the tip through the origin).
> Every chapter declares its interpolant explicitly — and it holds under a dragged
> slider just as under a played one.

### Commutativity in the Multiply chapter

`a·b = b·a` is a free, vivid payoff of the geometric picture: **rotate-and-scale by `a`
then by `b`** lands at the same point as **by `b` then by `a`**. Show it as a toggle /
side-by-side: two composition orders (two scrubbable spirals applied in sequence) whose
endpoints coincide — the same rectangle's diagonal either way. Makes "the order doesn't
matter" something you *see*, not assert.

## Honest interpolation (the Morph chapter)

- **Where a conformal one-parameter family is cheap and exact, use it** so every frame
  is a true angle-preserving map: multiplication/linear `cᵗ·z` (trivial — and it's the
  hero), and similar families where they exist.
- **Otherwise, affine `mix(z, f(z), t)`** with an on-screen **"visual blend (not the
  function in between)"** label, plus a faint **ghost identity grid** underneath — the
  in-app answer to "which plane am I looking at."
- Disclose in the explainer: blend ≠ conformal; "circles→circles" is Möbius-specific
  (false for `z²`); we sample-then-interpolate; the branch cut is real; `r·e^{iθ}` not
  `exp(θi)`; name modulus/argument/domain/image.

## Interaction & feel (the Game-Designer requirements)

- **Direct manipulation is the spine:** `a`, `b`, `c`, and the curve are **draggable
  on-canvas handles with continuous live coupling** — drag `b`, and `a·b` spirals
  *every frame* with the angle wedge filling. Not panel fields + a play button.
  (Keep numeric inputs as a **demoted** a11y/keyboard fallback, not the primary path.)
- **Slider-first, animation optional:** the morph/spiral parameter is a **slider you
  scrub by hand**; a small **play** button animates that same slider when motion helps.
  Animation is never the only way to see a state, and nothing *requires* a clip to
  play. (Optional one-time self-demo on idle — off by default; per-slice embed param.)
- **Soft snapping:** Gaussian lattice, the unit circle, and nice angles (π/4, π/6) — so
  `i` is reachable and "land `a·b` on `i`" is a satisfying click, not a pixel-hunt.
- **Juice kit (restrained):** snap-pop, hover-swell, drag-trail, chase-lag — all
  decaying to stillness, always pointing *at* the math.
- **Dual readout** everywhere: `x+iy` **and** `r·e^{iθ}`.

## Architecture (the Maintainer/Consultant requirements)

- **Copy the proven patterns:** the headless-engine / thin-view split of
  `lib/particles` + `ParticleViewerShell`; the spin-clock's `rAF → ref → uniform`
  loop (`ParticleViewerShell.tsx`) — **no per-frame `setState`**, clock gated off when
  idle.
- **Extract app-local hooks/modules as it grows:** `useMorphClock`, `useDragHandles`,
  `arithmetic.ts` (spiral/slide paths), a fresh **2D** `scaffold.ts` (unit circle /
  rings / rays / axes — ~30 lines, *not* ported from the Net mode's screen-space Hopf
  machinery). Promote to `lib/` only on a second consumer.
- **Render-on-demand** for WebGL chapters; **arithmetic chapters are SVG/DOM (zero
  WebGL)** so multi-iframe guide pages don't exhaust WebGL contexts.
- **Additive embed config** so existing guides keep rendering; repoint
  `#/embed/plane-transform` → the new embed route only at the retirement step.

## Phased build (lead with the hero)

1. **Phase 1 — Hero: live Multiply (+ Add).** SVG/DOM overlay: draggable `a`, `b`;
   `a·b` with angle wedge and a **scrubbable `t` slider** (the spiral path), optional
   **play**; straight slide for `a+b`; **commutativity toggle** (`a·b = b·a`); dual
   readout; basic snapping. Zero new WebGL. **This is the MVP and the first guide
   figure.**
2. **Phase 2 — Curve ×c / +c.** Reuse the spiral/slide on drawn/standard curves;
   curve-draw is a first-class affordance (not a hidden toggle).
3. **Phase 3 — Morph climax.** `morphT` clock + `mix(inputPos, fz, t)` in the salvaged
   shader; conformal-where-cheap / affine+label; ghost identity grid; scrubbable.
4. **Phase 4 — Scaffolding & full juice.** 2D unit circle / rings / rays / axes
   toggles; full snapping; the juice kit; optional (no-score) challenges.
5. **Phase 5 — Chapters + embeds + retirement + guide.** Mode pills; additive embed
   params; soft-retire Plane Transform (drop gallery card, keep route, repoint guide
   embeds, reframe Complex Particles blurb); author the intro guide page.

## Open decisions (recommended defaults; Dan can override)

1. **Interpolant investment** → *conformal where cheap, affine+label otherwise.* (Rec.)
2. **Animation role** → *slider-first; play is optional; no autoplay by default.* (Rec.,
   per the correction.)
3. **MVP first slice** → *the live Multiply chapter (lead with the hero).* (Rec.)
4. **App name/route** → provisional *Argand* / `#/argand`. (Rec.; rename freely.)

## Risks & blind spots to watch

- **Phone/touch:** the finger occludes the dragged handle — needs an offset-handle or
  "drag anywhere, handle follows" model. Unsolved by any hat.
- **Motion perf at scale:** animating up to ~810k points every frame is untested — cap
  density or LOD during motion.
- **Third-plane-shower risk:** keep the 2D-entry ↔ 4D-deep-end role split crisp so the
  new app doesn't re-create the very ambiguity it retires.
