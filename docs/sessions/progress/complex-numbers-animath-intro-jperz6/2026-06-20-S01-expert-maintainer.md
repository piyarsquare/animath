---
kind: three-hats
session: 2026-06-20-S01
date: 2026-06-20
title: "Framework Maintainer — Plane Transform as the complex-numbers intro instrument"
branch: claude/complex-numbers-animath-intro-jperz6
slug: complex-numbers-animath-intro-jperz6
status: completed
build: n/a
followup: medium
pr: null
app: plane-transform, chrome, docs
---

# Framework Maintainer — Plane Transform as the complex-numbers intro instrument

This is the **AppShell / Workspace steward's** hat on the proposal to grow Plane
Transform into the entry-point instrument for complex numbers *and* complex
functions, sliced via embeds into a guide series. I care about history, the
operational floor (`tsc && vite build`, static Pages, append-only shared files),
parallel-branch safety, and whether this sheds or piles on debt. The short of it:
**the pedagogical arc is right and most of it is buildable on what already exists
— but the proposal under-counts how much of "Plane Transform today" it has to
rewrite to get there, and it hand-waves a `morphT` lerp that the current
architecture cannot do without a real change.**

## Plan under review

<details>
<summary>Original request</summary>

Enrich the **Plane Transform** app (`src/animations/PlaneTransform/`) into *the* entry-point instrument for complex numbers AND complex functions, used both as a standalone app and sliced via URL-param embeds into a series of explanatory guide pages (`public/*-guide.html`). The pedagogical arc to support, in order: (1) a number is a point/arrow `x+iy`; (2) it's also a length & angle `R·e^{iθ}`; (3) arithmetic is geometry — add/multiply two numbers; (4) shapes transform too — add/multiply a *curve* by a complex constant; (5) a function does this to every point at once (the current `z↦f(z)` two-pane view); (6) the climax — the whole plane morphing from domain to image.

**Animation is the medium, not a mode.** Per the user (verbatim): *"animate however is a truth through everything. even addition multiplication will be animated -- this is animath."* So every operation plays as motion: `a+b` animates tip-to-tail; `a·b` animates the angle-adding / length-scaling sweep; `c·curve` animates the curve sweeping to its image; the function is the grid/point-cloud sliding from z to f(z) via a `morphT∈[0,1]` uniform that lerps each point between its input position and its f-output position.

Concrete feature set proposed:
1. **Reference scaffolding** ported from Complex Particles' Net mode + axes: a toggleable unit circle, polar rings (constant |z|), radial rays (constant arg z), gridlines, colored axes — so rotation vs scaling is visible.
2. **Draggable numbers with animated arithmetic:** place points a and b on the Argand plane, drag them; animate and read out a+b and a·b in both x+iy and R·e^{iθ} forms.
3. **Curve operations:** the app already has drawable + standard curves that map through f; add "+c" and "×c" by a (draggable) complex constant, animated.
4. **The plane morph:** a playback timeline (archetype `playback`) drives `morphT`; the two static panes can collapse into one moving deformation. Shader already places output points at f(z); add the lerp uniform.
5. **Sampling patterns** ported (Rings/Spokes/Web) so circles-map-to-circles is watchable.
6. **Polar/exponential readout** surfaced as the x+iy ↔ R·e^{iθ} bridge.

Likely structure: the app gains **modes/chapters** (e.g. Arithmetic / Transform) that share one plane, the color system, and the reference scaffolding, with animation woven through all. Each chapter is exposed as an embeddable slice via URL params for the guide pages. This also intersects the existing `!high` backlog item "plane/particles unification — one 'which plane am I looking at' convention across the viewers and their guides."

</details>

## What's actually in the box today

Grounding the proposal against the real file (`src/animations/PlaneTransform/PlaneTransform.tsx`, 818 lines) and its helpers, because the plan's "the app already has…" / "shader already places…" claims are mostly true but each carries an asterisk.

| Proposal claim | Reality in the code | Asterisk |
|---|---|---|
| "shader already places output points at f(z)" | True. `transform==1` runs `applyComplex` in the vertex shader (`shaders/index.ts:188`); the output pane is mounted with `transform:1` (`PlaneTransform.tsx:185`). | But the two panes are **separate renderers** with **separate materials** (`PlaneTransform.tsx:184-185`, `inputPane`/`outputPane` refs). A single morphing plane is a **third** rendering mode, not a tweak. |
| "two static panes can collapse into one moving deformation" | The panes are `panes:` of one split ViewDef (`PlaneTransform.tsx:448-487`). | Split panes are a **fixed equal split** with **two independent WebGL contexts**. "Collapse into one" means a new single-canvas path, parallel to the existing two-pane path, both kept for the guides. |
| "already has drawable + standard curves that map through f" | True and clean. `standardCurves.ts` (9 curves) + freehand capture in `InputPane` + `outputCurve` mapping on CPU (`PlaneTransform.tsx:248-263`). | The curve maps through f on the **CPU** (`complexMath` functions), the cloud maps on the **GPU** (`shaders`). Two code paths already kept in lockstep (note in `polarViews.ts:8`). Adding `+c`/`×c` means a **third** consumer of the same "keep CPU and GPU in sync" discipline. |
| "Reference scaffolding ported from Complex Particles' Net mode" | Net mode exists (`ComplexParticles.tsx:143`) but is a **screen-space polar fiber net for the 3D Hopf/torus views** (`createNetGeometry`, `HopfScaffold`). | It is **not portable** to a flat 2D Argand plane as-is. The unit circle / rings / rays the plan wants are ~30 lines of fresh SVG-or-line-geometry, **easier to write than to port**. Don't oversell the reuse. |
| "Sampling patterns ported (Rings/Spokes/Web)" | Plane Transform already has its own `gridMode: 'cartesian' \| 'polar'` sampler (`polarViews.ts:32`). ComplexParticles has `SamplePattern` (grid/polar/rings/spokes/web/squares/random) in `lib/particles/types.ts`. | Two **different** sampler vocabularies. "Porting" really means **reconciling two enums** — which is exactly the `!high` "which plane am I looking at" backlog item (`docs/sessions/TODO.md:28`). Good to do, but it's engine work, not a Plane Transform feature. |
| "polar/exponential readout as the x+iy ↔ R·e^{iθ} bridge" | No readout panel exists; the app has no Analyze tier at all. | New panel, fine — `arch: 'readout'`, shared primitives from `chrome/readouts.tsx`. Cheap. |

> [!IMPORTANT]
> **Decision the plan needs to make explicit:** the existing app is a *two-pane
> side-by-side* instrument and the new climax is a *single morphing plane*. These
> are two rendering topologies. The plan says "collapse," implying free; in the
> code it's a second render path. Budget for both existing and new, because the
> guides (`complex-plane-transform-guide.html:141,203`) embed the **two-pane**
> view and must keep working.

## The `morphT` lerp is the load-bearing lie

The plan's item 4 says "Shader already places output points at f(z); add the lerp
uniform." This is the one place the proposal assumes the codebase is cleaner than
it is.

What the shader does today (`shaders/index.ts:186-204`):

```glsl
vec2 pos = transform == 1 ? applyComplex(inputPos, functionType) : inputPos;
ndc = pos / viewExtent;          // (Cartesian branch)
```

`pos` is **either** `z` **or** `f(z)` — a binary `transform` int per material. To
morph you want `mix(z, f(z), morphT)`. That's a real change, and three things make
it more than "add a uniform":

1. **Color follows position, but pedagogically must not.** The fragment shader
   colors each point by `vSourcePos` = the *input* `inputPos` (`shaders/index.ts:187,259`),
   so a point keeps its z-color through the morph. Good — that's the whole point
   (you watch where your color goes). This already works *because* color is keyed
   to the input. So the morph is genuinely cheap on the **color** axis. Credit where due.
2. **But `planeMode==1` (log-polar) unrolls position non-linearly** (`shaders/index.ts:191-196`).
   Lerping in math space then unrolling ≠ lerping the unrolled coordinates. The
   morph has to pick a space and the log-polar plot will animate oddly. Decide:
   **morph is Cartesian-only**, or accept a non-obvious sweep in the unrolled view.
3. **`viewExtent` clamping of "giants"** (`length(pos) > 1e3`) happens post-`f`.
   During a morph, a point heading toward a pole (e.g. `1/z` near 0) sweeps through
   huge magnitudes mid-animation. The clamp will make it streak to the edge and
   snap. Tractable, but it's a frame-by-frame artifact the plan doesn't mention.

> [!WARNING]
> "Add the lerp uniform" is a ~1-line *shader* change but a real *correctness*
> exercise across the log-polar plot, the giant-clamp, and the SVG curve overlay
> (`CurveSvg`/`clipFromMath`, which would also need a `morphT` to stay registered
> with the cloud). Scope it as "the morph feature," not "a uniform."

## Draggable numbers: a genuinely new subsystem, not a port

Item 2 (drag a, b; animate a+b, a·b) is the least-supported piece. Today the app
has **freehand curve capture** in `InputPane` (`PlaneTransform.tsx:682-728`) but no
concept of **named, persistent, draggable point handles** with hit-testing, nor an
animation clock, nor a readout. This is the chapter that most resembles "a new
small app living inside Plane Transform." It is also the most pedagogically
valuable and the most embed-friendly (a guide page wants exactly "drag b, watch
a·b rotate"). I endorse building it, but the maintainer's flag:

- It needs an **animation clock** (a `morphT`-like `t∈[0,1]` driven by a `playback`
  archetype panel). The app currently has **no rAF-driven state** — the loop only
  re-renders static scenes (`PlaneTransform.tsx:188-210`). Introducing a play/pause
  timeline is the single biggest structural addition. Do it **once**, shared by
  arithmetic-sweep, curve-sweep, and plane-morph, or you'll grow three clocks.
- Drag handles + readout are DOM/SVG overlay work (the app already overlays SVG for
  curves, `CurveSvg` at `:626`), so the pattern exists. Reuse `useInscribedSquare`
  (`:596`) for the pixel↔math mapping — it's already the right primitive.

## Scope creep: this file is 818 lines and the plan ~3×'s it

The maintainer's central worry. One file currently does: state, two renderers, an
rAF loop, curve capture, SVG overlay, embed mode, and panel wiring. The plan adds:
chapters/modes, a draggable-point subsystem, an animation timeline, a single-pane
morph renderer, curve arithmetic, reference scaffolding, and a readout. Left in
one file, `PlaneTransform.tsx` becomes the new worst file in the repo.

> [!CAUTION]
> **Gotcha — don't repeat the pre-consolidation history.** The repo's defining debt
> story (CLAUDE.md "Known Issues") is that *three near-identical complex viewers*
> were consolidated into `lib/particles` + `ParticleViewerShell`. Ballooning one
> mega-component re-creates the *opposite* failure mode: one file no one dares
> touch. Extract **as you grow**, not after.

Where to draw the lines (and where **not** to over-abstract):

| Piece | Where it goes | Why |
|---|---|---|
| Complex arithmetic for arrows (a+b, a·b, polar form) | **stays app-side**, small `arithmetic.ts` in the app folder | It's display math, not engine math; `lib/complexMath.ts` already owns the function table. Don't bloat the shared lib for two operations. |
| Animation clock / `morphT` timeline | **app-side hook** `useMorphClock.ts` first | Promote to `lib/` **only if** a second app needs it. The bar for `lib/` is "two real consumers" — that's the lesson of `lib/particles`. One app ≠ a library. |
| Reference scaffolding (unit circle, rings, rays, axes) | **app-side** `scaffold.tsx` (SVG) | It's 2D and flat; the 3D Net scaffold is not the right ancestor. Keep it local. |
| Draggable point handles + readout | **app-side** sub-components | Mirror the existing `InputPane`/`CurveSvg` split. |
| Sampler vocabulary reconciliation | **`lib/` / engine**, *separate branch* | This is the `!high` backlog item. It touches ComplexParticles too. **Do not** smuggle it into this branch. |

> [!IMPORTANT]
> **Decision — the chapters are layouts/modes, not routes.** The plan says
> "modes/chapters (Arithmetic / Transform)." Implement them as **top-bar mode
> pills** (`modes` / `activeMode` / `onModeChange` on `<Workspace>`, the same
> mechanism Trinary uses for Observatory/Lab) and/or **layouts** (`LayoutDef`),
> **not** new hash routes. One app, one route (`#/plane-transform`), one folder.
> This keeps parallel-branch safety intact and the gallery uncluttered.

## Operational reality check

| Concern | Verdict |
|---|---|
| CI floor (`tsc && vite build`) | Everything proposed is client-side TS/GLSL — no new build risk. A `playback` rAF loop must `cancelAnimationFrame` on unmount (the current loop does, `:213`); a leaked loop won't fail CI but will burn battery. Watch it. |
| Static Pages / `base:'/animath/'` | No new assets needed (scaffolding is procedural). If any texture/image is added, route it through `import.meta.env.BASE_URL` (the embed badge already does, `:543`). |
| Embed compatibility | **The existing `PlaneEmbedConfig` (`embedParams.ts`) and the two live guides assume the two-pane layout.** Any new chapter must extend `PlaneEmbedConfig` **additively** (`mode=arithmetic`, `a=…`, `b=…`, `morph=…`), defaulting to today's two-pane behavior so `complex-plane-transform-guide.html` doesn't break. The parser already ignores unknown params gracefully — good foundation. |
| Persistence | `usePersistentState` is keyed per field with `ek()` returning `null` in embed mode (`:63`). New settings follow that pattern; **do not** persist transient animation `t` or drag positions mid-gesture (CLAUDE.md: persist settings, not transient view state). Draggable a/b *are* arguably settings — persist them, but the playhead is not. |

## Parallel-branch safety

This is the part the plan gets right by construction: Plane Transform is a
self-contained folder. As long as the work stays inside
`src/animations/PlaneTransform/` and the only shared-file touches are **append-only**
(a row in the Routing table, `README.md` line — and *no* new `apps.ts`/`index.tsx`
entry, because it's the same route), this branch is conflict-free against the
other in-flight app branches.

> [!CAUTION]
> The one tripwire: the `!high` "plane/particles unification" backlog item is
> tagged `[complex-particles]` and edits **shared engine + ComplexParticles**. If
> this branch reaches into `lib/particles` to "reconcile samplers," it stops being
> a self-contained app branch and starts conflicting with ComplexParticles work.
> **Keep the unification out of this branch.** Build Plane Transform's own
> scaffolding/sampler locally; file the unification as the separate engine chore
> it already is.

## Debt ledger: does this shed or add?

| Adds debt | Sheds debt | Net |
|---|---|---|
| A bigger component (mitigated by the extraction plan above) | Gives Plane Transform a real `playback` tier it lacks | Neutral-to-positive **if** extracted as it grows |
| A third "keep CPU and GPU in sync" consumer (curve arithmetic) | The morph reuses the existing color-keyed-to-input design (no new color path) | Slightly negative; document the lockstep like `polarViews.ts:8` does |
| New embed params to maintain | Makes the guide series first-class (the project clearly invests in guides — 8 `*-guide.html` already) | Positive — this is strategic for the docs goal |

## Verdict

**Endorse the arc and ~80% of the features; push back on the framing of effort and
on two scope boundaries.**

What I endorse outright:
- The 6-step pedagogical arc is exactly right and animath-shaped. "Animate
  everything" is well-served by **one shared animation clock** — build that first,
  it's the spine.
- The plane **morph** is the climax and is genuinely cheap on the *color* axis
  because color is already keyed to `vSourcePos`/input. Good design already there.
- **Draggable arithmetic** is the highest-leverage new chapter and the most
  embed-friendly. Build it.
- Chapters as **mode pills / layouts**, one route, one folder. Embed params extended
  **additively**.

What concerns me (in priority order):
1. **"Add the lerp uniform" undercounts the morph.** It's a correctness exercise
   across log-polar, the giant-clamp, and the SVG overlay registration — not a
   one-liner. Scope it honestly.
2. **The 818-line file will ~3×.** Commit to extracting (`useMorphClock`, `scaffold`,
   draggable subsystem, `arithmetic.ts`) **as you build**, app-side, with `lib/`
   promotion gated on a *second* consumer. Don't recreate the mega-component the
   repo just finished killing.
3. **"Port the Net scaffold / samplers"** oversells reuse. The 3D Net scaffold is
   screen-space Hopf machinery, not a flat-plane unit circle — write fresh 2D. The
   sampler reconciliation **is** the `!high` engine backlog item; **keep it out of
   this app branch** to preserve parallel-branch safety.

What I'd change:
- Re-sequence the build: **(a) shared animation clock + `playback` panel → (b)
  draggable arithmetic chapter (most value, exercises the clock) → (c) reference
  scaffolding (cheap, 2D) → (d) curve arithmetic → (e) plane morph (hardest; do it
  last when the clock is proven) → (f) polar readout.** Sampler unification is a
  *separate* branch, not step (g).
- Make the two-pane → one-pane morph an **explicit second render path**, not a
  "collapse," and verify the live guides keep rendering before merge.
- Extend `PlaneEmbedConfig` additively with a `mode=` default that reproduces
  today's two-pane embed byte-for-byte.

Build: n/a (design review, no code changed).

## Self-reflection

1. **What would you do with another session?** Trace the SVG curve overlay
   (`CurveSvg`/`clipFromMath`) through a hypothetical `morphT` to confirm the
   overlay can stay registered with the GPU cloud mid-morph — I asserted it needs a
   `morphT` too but didn't prove the math composes cleanly with the log-polar branch.
2. **What would you change about what you produced?** I leaned on the rendering and
   framework axis (my hat) and under-weighed *pedagogical sequencing* of the
   animations themselves — whether "everything animates" risks motion overload for a
   beginner. That's the other two hats' job, but I could have flagged the tension
   more sharply.
3. **What were you not asked that you think is important?** Mobile/phone behavior.
   Draggable point handles and a playback scrubber on a ≤740px stacked view card are
   a real UX question (the app already special-cases `usePhone()` to remount
   renderers, `:138`). The plan is silent on phone.
4. **What did we both overlook?** Performance: the morph runs at `density²` points
   (up to 900² ≈ 810k) every rAF frame across a feature that currently re-renders
   only on state change. A continuously animating 800k-point cloud is a different
   perf profile than the static viewer — worth a frame-budget check before committing.
5. **What did you find difficult?** Separating "already exists" from "exists but in
   a non-portable form" — the Net scaffold and the two sampler vocabularies both
   *sound* reusable and aren't, which took reading the actual geometry builders to
   confirm.
6. **What would have made this task easier?** A one-paragraph statement from the
   plan's author of the *minimum shippable* chapter, so I could review the spine
   rather than the full vision.
7. **Follow-up value:** MEDIUM — the architectural conclusions (extract-as-you-grow,
   keep sampler-unification out of this branch, morph-is-a-render-path) are sound and
   actionable, but the morph correctness details (log-polar lerp, giant-clamp streak,
   overlay registration) and the phone/perf gaps want a focused verification pass
   before code is written.
