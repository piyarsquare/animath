---
kind: three-hats
session: 2026-06-20-S01
date: 2026-06-20
title: "Architecture & Quality Consultant — animating Plane Transform into the complex-numbers intro instrument"
branch: claude/complex-numbers-animath-intro-jperz6
slug: complex-numbers-animath-intro-jperz6
status: complete
build: n/a
followup: medium
pr: null
app: plane-transform
---

# Architecture & Quality Consultant — animating Plane Transform into the complex-numbers intro instrument

I am reviewing this as an external front-end systems / quality consultant: no
attachment to the current `PlaneTransform.tsx`, judging the proposal on its
merits. My lenses are pattern fit, where the module boundaries belong,
six-month maintainability, and the GPU/rAF/bundle footprint of "animate
everything." I read `PlaneTransform.tsx`, `ParticleViewerShell.tsx`, the
`lib/particles` engine (`createAnimationLoop`, `useParticleState`,
`useUniformSync`), the PlaneTransform shaders, and `polarViews.ts` for context.

## Plan under review

<details>
<summary>Original request</summary>

Enrich the **Plane Transform** app (`src/animations/PlaneTransform/`) into *the*
entry-point instrument for complex numbers AND complex functions, used both
standalone and sliced via URL-param embeds into explanatory guide pages
(`public/*-guide.html`). Pedagogical arc, in order: (1) a number is a
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
f(z) via a `morphT∈[0,1]` uniform that lerps each point between its input
position and its f-output position.

Concrete features: (1) reference scaffolding (unit circle, polar rings, radial
rays, gridlines, colored axes) ported from Complex Particles' Net mode + axes;
(2) draggable numbers a,b with animated, dual-form (x+iy and R·e^{iθ}) readouts
of a+b and a·b; (3) curve "+c"/"×c" by a draggable complex constant, animated;
(4) a playback timeline driving `morphT` (the current shader already places
output points at f(z)); (5) ported sampling patterns (Rings/Spokes/Web); (6)
polar/exponential readout. Likely structure: the app gains chapters/modes
(Arithmetic / Transform) sharing one plane + color system + scaffolding with
animation throughout, each exposed as an embeddable slice via URL params.
Intersects the `!high` backlog item "plane/particles unification."

</details>

## Executive summary

The pedagogical arc is sound and the "animation is the medium" framing is the
right north star for this project. But as written the proposal is **three
distinct subsystems wearing one app's name**, and the failure mode is conflation:
a continuous 4D-style morph clock, a direct-manipulation handle layer (SVG
drag → math, the genuinely hard part), and a chapter/mode router are each
non-trivial and each wants a *different* architecture. The current
`PlaneTransform.tsx` is already a single 818-line file holding two imperative
WebGL panes, a curve-capture pointer state machine, and an embed branch; bolting
all six chapters and an animation clock onto it in place produces a file no one
can follow in six months.

My recommendation: **endorse the vision, restructure the build.** Extract a small
headless engine (`lib/complexPlane`) that owns the morph clock and the
math↔pixel coordinate contract — the one piece that is genuinely shared and
genuinely hard to get right — keep chapters as sibling React components that
*compose* that engine rather than a mode enum inside one mega-component, and make
`morphT` the only animated uniform the GPU path needs. The arithmetic chapters
(`a+b`, `a·b`) are SVG/DOM, not WebGL, and should not pull the point-cloud engine
in at all. Do **not** treat this as the "plane/particles unification" backlog
item — that's a tempting but separate, larger refactor that this work should
stay clear of.

## 1 · Pattern fit — what known shapes apply

The proposal bundles four problems. Each maps to a known pattern; the risk is
solving them with one undifferentiated blob.

| Sub-problem | Right pattern | Wrong-but-tempting |
|---|---|---|
| Domain→image plane morph | **Single lerp uniform** `morphT`, GPU-side `mix(z, f(z), t)` | A second copy of the `lib/particles` rAF/quaternion machinery |
| Shared animation clock | **Headless tween/clock** driving a ref, React reads via uniform sync | `setState` per frame (re-renders chrome at 60fps — the codebase already hit this; see `createAnimationLoop.ts:174`) |
| Draggable a, b, c handles | **Interaction layer over canvas**: pointer-capture → `mathFromClip` → state | Reusing the freehand `InputPane` pointer FSM, which already juggles draw + pinch |
| Chapters / modes | **Composition** — sibling components sharing a headless engine via props | A `chapter` enum + giant conditional JSX inside `PlaneTransform.tsx` |

> [!NOTE]
> The codebase **already demonstrates the winning pattern** twice. `lib/particles`
> is a headless engine (`useParticleState` + `useViewControls` +
> `useUniformSync`) consumed by a thin shell (`ParticleViewerShell`). And the
> spin clock in `ParticleViewerShell.tsx:98-120` is exactly the "headless rAF
> loop writing through a ref, gated by an `anySpin` flag" shape this proposal
> needs for `morphT`. Copy that shape; do not invent a new one.

### The morph is cheaper than it looks

The output pane's vertex shader *already* computes `f(z)` (`shaders/index.ts:188`).
A domain→image morph is one added uniform and one `mix`:

```glsl
uniform float morphT;          // 0 = identity (domain), 1 = f(z) (image)
vec2 fz  = applyComplex(inputPos, functionType);
vec2 pos = mix(inputPos, fz, morphT);   // straight-line lerp in z-space
```

This is the single most important architectural observation: **the climax
feature (#6) is ~5 lines of shader plus a clock.** It does not need the particle
engine, a second renderer, or per-point CPU work. The straight-line lerp is
pedagogically honest *enough* for the intro (a point slides from `z` to `f(z)`),
though see §5 for where "honest path" bites.

> [!CAUTION]
> **Gotcha — the lerp is not the homotopy the user may imagine.** `mix(z, f(z), t)`
> moves every point along a straight segment. For `f(z)=z²` that is *not* "the
> angle doubling continuously" — a point at angle θ does not sweep through
> intermediate angles, it cuts the chord. For the `a·b` arithmetic chapter the
> user explicitly wants the *angle-adding / length-scaling sweep*, which is a
> **polar** interpolation (`R^(1+t)`, `θ·(1+t)` style), a different curve. The
> two animations are mathematically distinct; the design must decide per-chapter
> which path is "the truth," and the shared engine must expose **both an affine
> and a polar interpolant**, not silently pick one.

## 2 · Where the boundaries belong

The proposal's "likely structure: the app gains chapters/modes sharing one plane
+ color system + scaffolding" is the right instinct stated at the wrong altitude.
"Modes inside one component" is how `PlaneTransform.tsx` would grow a 1500-line
body. Here is the boundary I'd draw.

### Proposed module layout

```
src/lib/complexPlane/              # NEW headless engine (the genuinely shared part)
  ├── types.ts                     # MorphPath = 'affine' | 'polar'; PlaneCoord helpers
  ├── coords.ts                    # math↔NDC↔pixel — the ONE coordinate contract
  │                                #   (absorbs polarViews.ts clipFromMath/mathFromClip)
  ├── useMorphClock.ts             # headless rAF: play/pause/scrub a morphT ref
  │                                #   (mirrors ParticleViewerShell spin-clock shape)
  └── scaffold.ts                  # unit circle / rings / rays / axes as flat geometry
                                   #   (data only; renderer-agnostic)

src/animations/PlaneTransform/
  ├── PlaneTransform.tsx           # router: picks chapter from prop/URL, owns shared state
  ├── chapters/
  │   ├── ArithmeticChapter.tsx    # a+b, a·b — SVG/DOM, draggable handles, NO WebGL
  │   ├── CurveChapter.tsx         # c·curve / c+curve — SVG curve + handle
  │   └── TransformChapter.tsx     # the current two-pane z↦f(z) + the morph
  ├── handles.tsx                  # DraggableComplex: pointer-capture → coords → onChange
  ├── shaders/                     # gains the morphT mix
  └── polarViews.ts                # → folded into lib/complexPlane/coords.ts (with shader-sync note kept)
```

> [!IMPORTANT]
> **Decision — only `coords.ts` and `useMorphClock.ts` are truly "library."**
> The scaffold and handles *could* live in `lib/`, but they have one consumer
> today. Per CLAUDE.md's stated preference ("polarViews… can be lifted into
> lib/particles wholesale **if it proves useful**"), promote to `lib/` only the
> pieces with a second proven consumer. The coordinate math earns it immediately
> because the SVG overlay and the shader **must** agree (the existing in-file
> comment at `polarViews.ts:8` already warns they're hand-mirrored); centralizing
> that contract removes a real, current footgun.

### Why arithmetic chapters must not touch WebGL

`a+b` tip-to-tail and `a·b` angle-add are **two arrows and a parallelogram** —
a handful of SVG lines and a text readout. Rendering them through the
900×900-capable point-cloud engine would be using a freight elevator to carry a
letter. They share the *coordinate system* and the *clock* with the transform
chapter, nothing else. Keeping them as SVG/DOM (the project already does
SVG overlays well — `CurveSvg` in `PlaneTransform.tsx:626`) keeps two of the six
chapters off the GPU entirely, which matters enormously for the guide pages (§4).

## 3 · How chapters compose without a global store

The codebase forbids a global store (CLAUDE.md: "local `useState`/`useRef` only;
the workspace owns only window/layout state"). Chapters compose fine without one:

1. `PlaneTransform.tsx` holds the **shared** state with `usePersistentState`:
   `viewExtent`, `planeMode`, color settings, and the active chapter.
2. It instantiates `useMorphClock()` **once** and threads `{ morphT (ref),
   play, pause, scrub }` down as props. One clock, one rAF, regardless of chapter.
3. Each chapter component owns its *local* state (chapter `a+b` owns `a`, `b`;
   `TransformChapter` owns `curve`, `functionIndex`). This is exactly how the app
   already separates persisted settings from transient `curve`/`drawMode`
   (`PlaneTransform.tsx:84`).
4. The chapter is selected by a `chapter` prop (URL param in embeds, a top-bar
   **mode pill** in the standalone app — the project's blessed mechanism;
   Trinary and the Layouts pattern both do "modes as pills/layouts").

> [!NOTE]
> Chapters-as-**modes** (top-bar pills, `modes`/`activeMode`/`onModeChange` in
> `WorkspaceProps`) is more idiomatic here than chapters-as-**layouts**. Layouts
> reshuffle the *same* panels/views; chapters swap the *view's content and which
> panels are relevant*. Modes are the existing vocabulary for "different verb,
> same instrument" (Trinary Observatory/Lab). Use modes; reserve layouts for
> arrangement within a chapter.

### The morph data flow (one diagram in prose)

```
useMorphClock()  ──ref──►  morphTRef.current        (rAF writes, never setState)
        │
        ├─► TransformChapter:  useEffect syncs morphTRef → material.uniforms.morphT  (per-frame, in the SAME rAF tick — see §5 ordering)
        │
        └─► ArithmeticChapter: reads morphTRef in its own rAF to place SVG arrows
                                (or, simpler: a CSS/SVG <animate> when no GPU is involved)
```

The non-negotiable rule, which `createAnimationLoop.ts:174` learned the hard way:
**the clock writes a ref and pushes to uniforms inside the render tick; React
state changes at most a few times a second** (e.g. the dual-form readout text,
throttled like the orientation matrix is). A `setMorphT` on every frame would
re-render the whole workspace chrome at 60fps.

## 4 · Performance & footprint

This is where I am most concerned, because the proposal multiplies three costs
(panes × chapters × guide-page iframes) and the guide pages "embed multiple
iframes at once."

| Cost axis | Current | Under the proposal | Mitigation |
|---|---|---|---|
| WebGL contexts | 2 per app instance | Still 2 for Transform; **0** for Arithmetic/Curve if SVG | Keep arithmetic chapters off WebGL |
| rAF loops | 1 (always on, renders both panes) | 1 morph clock + 1 render loop | **Gate the render loop**: it currently renders every frame unconditionally (`PlaneTransform.tsx:188`) even when nothing moves |
| Point count | up to 900×900 = 810k/pane | unchanged | Lower the *default* density for embeds; 240² is already the default — fine |
| Bundle (code-split) | one lazy chunk | +chapters +engine | Keep `lib/complexPlane` small & dependency-free; chapters tree-shake per import |

> [!WARNING]
> **The render loop is already always-on and unconditional.** Today
> `PlaneTransform.tsx`'s `tick` calls `renderer.render` on both panes every frame
> forever, even on a static picture. That's tolerable for one foreground app; it
> is **not** tolerable when a guide page mounts four iframes, each a static plane,
> each burning a 60fps render loop. Adding a morph clock makes this worse unless
> the work is gated. The morph clock should **drive render-on-demand**: render
> only while `morphT` is animating or a control changed (a dirty flag). This is a
> latent footprint bug the proposal should *fix*, not inherit. On mobile,
> four always-on WebGL loops will thermal-throttle and drain battery fast.

> [!CAUTION]
> **Gotcha — WebGL context limits.** Browsers cap live WebGL contexts (~8–16).
> A guide page with several two-pane Transform embeds *plus* the page's own demos
> can exhaust them, after which contexts are silently dropped and panes go black.
> Arithmetic/Curve chapters being SVG sidesteps this for the chapters that need
> the most embedding (they're the intro). For Transform embeds, consider a
> "click-to-activate" poster frame so a guide page with five embeds doesn't open
> ten contexts on load.

### Mobile / draggable handles

Direct manipulation on a phone competes with pan/pinch/scroll. The existing
`InputPane` already shows the tax: it hand-rolls a pointer FSM juggling draw,
pinch-zoom, and pointer-capture (`PlaneTransform.tsx:682-728`). Adding draggable
`a`/`b`/`c` handles into *that* component would entangle a fourth gesture.
Hence `handles.tsx` as a **separate** `DraggableComplex` layer with its own
pointer-capture, hit-testing a small target, and `touch-action: none` only on the
handle — not the whole pane. Keep gestures separable, as the project's
look-vs-navigate convention insists.

## 5 · Verification, seams & failure modes

Only `npm run build` + manual checks exist. The seams most likely to break, and
where to put the asserts/manual-check anchors:

| Seam | Failure mode | Guard |
|---|---|---|
| Shader `mix` ↔ SVG handle positions | Morph on GPU, handles in DOM — they drift if coordinate math diverges | **Single `coords.ts`** used by both; the existing `checkGlslDispatch` lockstep guard is the model — add a parallel note/assert that the morph map matches |
| `morphT` ref vs uniform push ordering | Uniform read **before** the frame's clock write → 1-frame lag, visible jitter | Push morphT inside the same rAF body, *before* `renderer.render`, like `createAnimationLoop.ts:119` |
| Affine vs polar interpolant | Wrong "truth" for the chapter (see §1 callout) | Make `MorphPath` explicit per chapter; never default silently |
| Log-polar plane + morph | `mix` in z-space, but plane displayed in log-polar → the *path* unrolls weirdly; near-zero `f(z)` (poles) sends a point to ∞ mid-morph | Clamp as the shader already does (`length(pos) > 1e3`); decide whether morph interpolates in z or in display space |
| Handle drag through log-polar | `mathFromClip` inverse is correct but a handle at r≈0 is singular | Hit-test/clamp `r` to `MIN_R`; reuse the existing floor |
| Guide-page URL params | New chapter/path params silently ignored by old embed parser | Extend `lib/embedParams.ts` with a closed vocabulary + ignore-unknown (the param-validation discipline already there) |

> [!IMPORTANT]
> **Decision — the "honest a·b path" is a math contract, not a UI nicety.**
> Whether `a·b` animates as a straight chord or as the angle-adding spiral
> determines whether the instrument *teaches the right thing*. This must be
> nailed down in the design doc before code, because it dictates the engine's
> interpolant API. My recommendation: arithmetic chapters use the **polar
> (spiral) path** (it *is* the lesson — multiplication adds angles); the
> whole-plane Transform climax uses the **affine path** (every point slides to
> its image; the spiral would be visual chaos for 810k points). Two paths, chosen
> per chapter, both first-class in the engine.

## 6 · Maintainability — the six-month test

Can a newcomer follow it? Today `PlaneTransform.tsx` is already at the edge: 818
lines, two imperative renderers, an embed branch, and sub-components at the
bottom. The proposal **doubles** the surface. The deciding question is whether the
complexity is *factored* or *piled*.

- **Piled** (a `chapter` enum + conditionals in one file): unmaintainable within
  two sessions. Each chapter's state, panels, and JSX interleave; the embed
  branch forks six ways.
- **Factored** (chapters as sibling files, one headless engine): a newcomer reads
  `lib/complexPlane/` to learn the clock + coordinate contract, then any single
  chapter file in isolation. This is *exactly* the `lib/particles` +
  `ParticleViewerShell` + per-app consumer story that already works in this repo.

The factored version is more files but each is small and single-purpose. Given
the project's explicit "self-contained folder per app, append-only shared files,
parallel branches" philosophy, more-but-smaller is the grain of the codebase.

> [!NOTE]
> **Scope discipline — do not conflate with "plane/particles unification."** The
> proposal notes it "intersects the `!high` backlog item." It does, but that item
> is about merging the 3D particle viewer and the 2D plane viewer onto one engine
> — a large, risky refactor touching `ComplexParticles`. This work should
> deliberately stay *adjacent*: build `lib/complexPlane` as the 2D plane's clean
> home, designed so a *future* unification can subsume it, but **do not** attempt
> the merge here. Conflating the two turns a shippable intro instrument into an
> open-ended engine rewrite. Ship the intro; leave a clean seam.

## Verdict

**Endorse with structural changes.** The pedagogical arc and "animation as
medium" are right and worth building. The concerns are architectural, not
directional.

**Changes I'd require before coding:**

1. **Extract a headless `lib/complexPlane`** owning (a) the `morphT` clock
   (mirror the `ParticleViewerShell` spin-clock: rAF → ref → uniform, gated by an
   active flag, never per-frame `setState`) and (b) the **single** math↔NDC↔pixel
   coordinate contract (absorb `polarViews.ts`), so the GPU morph and the SVG
   handles cannot drift.
2. **Chapters as sibling components composing that engine**, selected by a
   top-bar **mode** (not a layout, not an in-file enum). Arithmetic and Curve
   chapters are **SVG/DOM — no WebGL** — keeping the most-embedded chapters off
   the GPU and the context budget.
3. **Make the interpolant explicit:** affine path for the whole-plane Transform
   climax, polar/spiral path for `a·b` arithmetic. This is a math contract;
   decide it in the design, expose both in the engine.
4. **Fix the always-on render loop** (render-on-demand / dirty flag) *as part of*
   adding the clock — otherwise guide pages with multiple iframes regress badly
   on mobile and risk exhausting WebGL contexts. Consider click-to-activate
   posters for Transform embeds.
5. **Keep clear of the plane/particles unification.** Build the clean 2D home;
   leave the merge as a future seam.

**Changes I'd recommend but not block on:** promote `scaffold.ts`/`handles.tsx`
to `lib/` only once a second consumer appears; add a build-time lockstep guard
for the morph map analogous to the existing `checkGlslDispatch`.

If those five land, this is a strong, idiomatic addition that makes the rest of
the complex-function suite legible. If they don't, the most likely outcome is a
1500-line `PlaneTransform.tsx` that animates beautifully and is unmaintainable.

## Self-reflection

1. **What would you do with another session?** Read `lib/embedParams.ts` and the
   existing `*-guide.html` pages in full to specify the exact URL-param vocabulary
   for chapters/paths, and sketch the `useMorphClock` + `coords.ts` interfaces
   concretely (signatures, not prose). I'd also measure the *actual* idle cost of
   the current always-on render loop to size the render-on-demand claim.
2. **What would you change about what you produced?** I asserted the always-on
   render loop is a real mobile/iframe problem from reading the code, not from
   profiling; I'd want to confirm the magnitude before calling it a required fix
   vs. a recommendation.
3. **What were you not asked that you think is important?** Accessibility and
   reduced-motion: an "animate everything" instrument needs a
   `prefers-reduced-motion` story and keyboard-operable handles, neither in the
   proposal. And a single shared scrub timeline across panes vs. per-chapter
   clocks — I assumed one clock; the design should confirm.
4. **What did we both overlook?** The straight-line lerp ≠ the "angle-adding"
   animation the user describes for multiplication. This is the kind of
   plausible-but-wrong default that ships and then teaches the wrong intuition.
   I flagged it (§1, §5) but it deserves explicit owner sign-off.
5. **What did you find difficult?** Judging the WebGL-context and idle-render
   footprint without running the guide pages; my numbers are reasoned, not
   measured.
6. **What would have made this task easier?** A look at one existing multi-embed
   guide page rendered, and any prior notes on the "plane/particles unification"
   backlog item to gauge how much overlap is intended.
7. **Follow-up value:** MEDIUM — the architecture recommendation is sound and
   actionable, but the interpolant-path decision and the render-loop footprint
   claim need an owner's confirmation before they're load-bearing for the build.
