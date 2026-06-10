---
kind: three-hats
session: 2026-06-10-S01
date: 2026-06-10
title: Architecture & Quality Consultant review — Complex Particles app
branch: claude/three-hats-particle-app-rill2c
slug: three-hats-particle-app-rill2c
status: completed
build: unknown
app: complex-particles
---

# Architecture & Quality Consultant review — Complex Particles app

## Plan under review

<details><summary>Original request</summary>

"I want you to start a session. focus is on the complex particle app. I want you to run the three hats skill on the complex particle app and report the results."

</details>

The subject is the **current state of the Complex Particles app**: the app component
(`src/animations/ComplexParticles/`), the shared engine (`src/lib/particles/`), the
turnkey shell (`src/components/ParticleViewerShell.tsx`), and the supporting libs
(`src/lib/complexMath.ts`, `src/lib/viewpoint.ts`, `src/math/quat4.ts`,
`src/lib/textures.ts`, `src/controls/QuarterTurnControls.tsx`, `src/config/defaults.ts`).
This is the architecture/quality leg of the three-hats review. Every claim below is
grounded in the code as it stands on this branch (post-PR #200: projection slider,
13 new functions, embed routes, free-orbit camera, 4 Hz orientation throttle).

## Executive summary

This is a **well-above-average hobby-scale graphics codebase** with one genuinely good
idea executed consistently: *React owns settings, refs own per-frame state, the GPU owns
the math*. The headless-hook decomposition (`useParticleState` → `useViewControls` →
`useUniformSync` → `startAnimationLoop`) is a recognizable and appropriate pattern, the
comments are unusually good, and the consolidation of three former viewers into one
engine + shell paid off — the app component is now mostly material/geometry plumbing
plus a function picker.

The headline problems are not stylistic. In priority order:

1. **A real resource-lifecycle bug**: `startAnimationLoop` has no cancellation, and
   `ComplexParticles.onMount` returns no cleanup — every visit to the app leaks an
   immortal rAF loop (and its scene/materials/geometries) that keeps rendering into a
   disposed renderer. The `Canvas3D` cleanup contract exists precisely for this and is
   not used.
2. **The render-mode subsystem outgrew its home**: five material factories, five
   mesh-list refs, and ~10 sync effects for Points/Sheet/Tiles/Net live in the *app*,
   while their geometry factories live in the *engine*. The "canonical simplest
   consumer" is now 745 lines; the next particle viewer cannot reuse Sheet/Tiles/Net
   without copying half of them.
3. **A six-way parallel function registry** (TS switch, GLSL if-chain, names array,
   formulas record, multivalued set, category lists) keyed by persisted numeric index —
   correct today, but each new function is a six-file shotgun edit with zero automated
   verification that the TS and GLSL twins agree.
4. **Zero tests where tests are nearly free**: `complexMath.ts`, `viewpoint.ts`,
   `quat4.ts`, `createParticleGeometry.ts`, and `embedParams.ts` are pure functions
   with obvious algebraic contracts. A half-day vitest harness would cover the riskiest
   seam in the codebase (TS/GLSL drift) at its CPU-testable half.

None of these threaten the product today; #1 is the only one a user can feel
(progressive jank after navigating gallery ↔ app repeatedly). But #2 and #3 are
exactly the kind of debt that makes the *next* feature slower, and this repo's history
(handoffs, parallel app branches) shows features keep coming.

## Pattern recognition: what this is, and what it resembles

| Pattern | Where it appears | Assessment |
|---|---|---|
| **Headless UI hooks** (state hook + behavior hooks + presentational shell) | `useParticleState` / `useViewControls` / `useGestureRotation` + `ParticleViewerShell` | Right pattern; the seams are real (PlaneTransform reuses the libs). But the state hook is monolithic — see below. |
| **Hand-rolled react-three-fiber-lite** | `Canvas3D` + `useUniformSync` + `createAnimationLoop` | Defensible NIH. R3F's reconciler is a poor fit for a 60 fps uniform-push architecture with one scene and shader-only materials; the hand-rolled bridge is ~250 lines total and avoids a large dependency. I would *not* migrate. |
| **Latest-ref mirror** (state → ref for rAF consumers) | `useParticleState.ts:197–208`, `ParticleViewerShell.tsx:83–90` | Standard and correctly applied; proliferation is a smell of the missing "engine object" (below). |
| **Command pattern** | `QuarterTurnControls` items → `controls.turn/orbitTurn/rotateBy` | Clean. The ambient (Yaw/Pitch/Roll) vs 4D-plane mode switch at `ParticleViewerShell.tsx:74–75` is a nice example of context-sensitive command rebinding. |
| **Append-only enum registry** | `complexMath.ts:369–388` (`functionNames`, `POW_PQ_INDEX`…) | The append-only discipline (persisted indices) is documented and observed. The structure itself is the liability — see §5.4. |
| **Single-source GLSL library + per-mode `main()`** | `shaders/index.ts` `vsCommon` (lines 7–408) | Genuinely good: the five render modes share `surfacePos`/`calcColor`/`applyComplex`, so projection morphs and coloring stay in lockstep across Points/Sheet/Tiles/Net by construction. |

The overall shape — *serializable settings in React, frame state in refs, math on the
GPU, one rAF loop* — is the same architecture mature WebGL apps converge on
(e.g. shadertoy-style param UIs, deck.gl's prop→uniform diffing). The team arrived at
it honestly and documented it (`CLAUDE.md` "Three.js / particle (4D) viewers").

## Architecture map and boundary assessment

Data flow (the part a newcomer must reconstruct):

```
usePersistentState (localStorage) ─┐
                                   ▼
useParticleState ── ~60 settings + 15 refs ──► returned as one flat object
        │                                            │
        │  state→ref mirror effects                  │
        ▼                                            ▼
createAnimationLoop (rAF)                  useUniformSync (≈25 effects)
  reads refs, composes quats,                writes materialsRef uniforms
  writes uRotL/uRotR + time,                 + camera position
  4 Hz orientationMatrix push ──► React      ▲
        ▲                                    │
useViewControls ── transient rAF tweens ─────┘ (writes uniforms directly)
useGestureRotation ── pointer events ──► setCamQuat/setPan*/setCameraZ
ComplexParticles ── materials/geometry factories, branch objects, embed
ParticleViewerShell ── panels (SectionDef[]), spins, Workspace assembly
```

| Layer | File(s) | Verdict on the boundary |
|---|---|---|
| Engine state | `lib/particles/useParticleState.ts` (320 ln) | **Wrong granularity** — one hook owns domain sampling, render-mode params, color, camera, projection, and the Three.js refs. See §5.1. |
| Engine behavior | `useViewControls.ts`, `useGestureRotation.ts`, `createAnimationLoop.ts` | **Right place.** Controls write uniforms directly (bypassing React) — correct for 60 fps, and consistently done. |
| Engine factories | `createParticleGeometry.ts`, `createSheetGeometry.ts`, `createHopfScaffold.ts`, `createAxes.ts` | **Right place**, but only half the render-mode subsystem lives here (geometry, not materials/visibility). |
| Shell | `components/ParticleViewerShell.tsx` (705 ln) | **Right place, slightly overweight**: nine panels + spin engine + embed branch in one file. Tolerable; the panels are presentational. |
| App | `animations/ComplexParticles/ComplexParticles.tsx` (745 ln) | **Overweight for its billing.** CLAUDE.md calls it "the canonical, simplest consumer — copy it when building a new particle viewer." Copying it means copying 5 material factories, 8 refs, and ~14 effects. |
| Math | `lib/complexMath.ts`, `lib/viewpoint.ts`, `math/quat4.ts` | **Right place, pure, untested.** |

> [!IMPORTANT]
> **The one boundary I would move:** the render-mode subsystem (material factories +
> per-branch object lifecycle + visibility rules, `ComplexParticles.tsx:227–423`)
> belongs in `lib/particles` next to the geometry factories it pairs with. The app
> should contribute only what is app-specific: the function dispatch uniforms
> (`functionType`, `exponentP/Q`, `uQuad*`, `branchIndex`) and the branch count.

## Structural findings

### 5.1 `useParticleState` is a god object — but a *benign* one, with one real cost

`useParticleState` returns ~75 keys (60 state/setter pairs + 15 refs) as a flat object
(`useParticleState.ts:224–317`), and `ParticleState = ReturnType<typeof useParticleState>`
is the engine's de-facto interface. Classic god-object indicators are present: every
concern (sampling, sheet, net, color, camera, projection) in one namespace; consumers
take the whole object.

The mitigating facts: it is *state-only* (no behavior), it is instantiated once per
viewer, and the flat shape makes `state.setExtentX` trivially greppable. I would not
break it apart for purity's sake.

The **real cost** is render granularity: because all 60 settings live in one component's
hooks, *every slider tick re-renders the entire app component, the shell, and the
workspace chrome* (ComplexParticles → ParticleViewerShell → Workspace and its windows).
The 4 Hz orientation throttle (`createAnimationLoop.ts:160–170`) fixed the *continuous*
re-render under auto-tumble — good fix, right level — but a user dragging Opacity still
pays a full-tree render per pointermove. On desktop this is invisible; the handoff's own
mobile findings suggest it is not free on phones.

**Recommendation (cheap, targeted):** group the returned object into a few stable
sub-objects (`state.domain`, `state.sheet`, `state.color`, `state.cameraState`, `state.refs`)
*without* changing storage — or, even cheaper, memoize the heavy panel nodes in
`ParticleViewerShell` on the slices they read. Do this only if phone profiling shows
slider drags hurting; otherwise record it as a known property.

### 5.2 Triple bookkeeping: state → ref → uniform

A single logical value (e.g. the projection) exists in up to four places: persisted
`viewType`/`projMix`, transient `proj`, `projRef`, and the `uProjMode/uProjTarget/uProjAlpha`
uniforms. `handleProjMix` (`useViewControls.ts:109–128`) must write five of them in the
right order, and `handleDropAxis` and `handleViewType` each re-implement overlapping
subsets. The invariant ("slider and drop axis never fight; most recent intent wins") is
enforced by convention across three functions, and the seeding logic appears again at
restore time (`useParticleState.ts:146–163`) *and* once more in the app's
re-apply-after-mount effect (`ComplexParticles.tsx:606–609`).

This is the most likely site of the next regression. It is also a known pattern with a
known cure: a single `applyProjection({mix, dropAxis})` reducer that derives *all* five
representations from two inputs, called from every entry point (slider, pills, drop,
restore, embed). The behavior wouldn't change; the invariant would live in one place.

### 5.3 Render modes: half-migrated into the engine

The geometry factories for Sheet/Tiles/Net live in `lib/particles/createSheetGeometry.ts`,
but their materials, uniforms, blending rules, render-order pinning, visibility matrix
(`applyRenderVisibility`, `ComplexParticles.tsx:361–371`), and the per-branch object
lifecycle (`rebuildBranchObjects`, lines 376–423) live in the app. Cross-cutting
conventions are encoded as `userData` string tags (`m.userData.sheet`,
`userData.sheetWire`, `userData.net`) that a *different* file (`useUniformSync.ts:93–99`)
must know to check before flipping blending — a stringly-typed contract spanning the
app/engine boundary.

Similarly, ~8 effects in the app exist only to push render-mode uniforms
(`uDensity`, `uCellSize`, `uShade`, `uMaxTile`, `uLineWidth`, `uResolution`,
`uDomainBox`, `uWarpR`) guarded by `if (m.uniforms.X)` existence checks — the optional-
uniform pattern works but means the uniform contract is only discoverable by reading
both the factory and the GLSL.

**Recommendation:** promote a `createBranchObjects(scene, opts)` module to
`lib/particles` that owns materials + meshes + visibility + disposal for all render
modes, taking the app-specific uniforms as a parameter object. This converts the
"canonical consumer" from 745 lines to an estimated ~300 and makes a second
sheet-capable viewer realistic. The GLSL is already shared-ready (`vsCommon`).

### 5.4 The six-way function registry

Adding one complex function currently touches:

1. `complexMath.ts` — the TS implementation;
2. `applyComplex` TS switch (`complexMath.ts:286–324`) *and* `applyComplexBranch` (327–365);
3. the GLSL implementation + `applyComplex` if-chain (`shaders/index.ts:230–268`);
4. `functionNames` (append-only, persisted index);
5. `functionFormulas`;
6. `MULTIVALUED_INDICES` and `functionCategories`.

Plus PlaneTransform's GLSL twin (the handoff notes it silently rendered indices 19–22 as
identity until this session — i.e. **this drift has already happened once**). The holes
in the TS switch (18, 22 fall through to `default: return z`) are intentional
(parameterized functions handled by the caller, `ComplexParticles.tsx:134–138`) but
undocumented at the switch itself.

**Recommendation:** a single table `FUNCTIONS: Array<{name, formula, multivalued,
category, ts(z, branch, params), glslCall: string}>` from which `functionNames`,
`functionFormulas`, `MULTIVALUED_INDICES`, `functionCategories`, and *both* dispatchers
(TS switch → table lookup; GLSL if-chain → generated from `glslCall` strings at module
load) are derived. The GLSL bodies stay hand-written; only the *dispatch* is generated.
This collapses six append sites to one and makes "the index is the contract" structural
rather than disciplinary.

### 5.5 The shell's spin engine and the loop population

There are up to **four concurrent rAF loops** in normal use: the main render loop, the
shell's spin loop (`ParticleViewerShell.tsx:93–115`), `animateTo`'s projection tween and
`applyQuarterTurn`'s slerp tween (`useViewControls.ts:25–46, 168–197`), plus the embed
spin loop. They communicate through shared refs, which mostly works, but:

> [!WARNING]
> **Tween races are possible.** `applyQuarterTurn` captures `startL/startR` at click
> time and runs a 1 s slerp with no cancellation token. Two quick clicks spawn two
> loops both writing `rotLRef`/uniforms each frame; frames alternate between the two
> trajectories until the first finishes (last-writer-wins per frame). Same for
> `animateTo` (two projection changes inside 1 s). Users *will* double-tap the
> eighth-turn buttons. Fix is a module-level "current tween" handle that each new tween
> cancels — ~10 lines.

## Correctness findings (bugs and traps)

| # | Severity | Finding | Location |
|---|---|---|---|
| B1 | **High** | `startAnimationLoop` never stops: `animate` reschedules unconditionally and returns no handle; `ComplexParticles.onMount` returns no cleanup, despite `Canvas3D` documenting and invoking one (`Canvas3D.tsx:13–18, 73–80`). Every gallery → app → gallery round trip leaks a rAF loop rendering a dead scene into a disposed renderer, plus all geometries (a 500² sheet fill is ~1.5 M vertices) and up to 60 ShaderMaterials. | `createAnimationLoop.ts:51–176`, `ComplexParticles.tsx:536–600` |
| B2 | Medium | The net-resolution sync effect has **no dependency array**, so it unsubscribes/resubscribes `window.resize` on every render; worse, it listens to `window` resize while the canvas actually resizes via `ResizeObserver` (view-window drag, fullscreen toggle) — `uResolution` goes stale and the Net mode's "constant pixel width" ribbons silently get the wrong thickness until the OS window resizes. | `ComplexParticles.tsx:493–506` vs `Canvas3D.tsx:66–71` |
| B3 | Medium | Tween races (see §5.5): no cancellation in `applyQuarterTurn` / `animateTo`. | `useViewControls.ts:25–46, 168–197` |
| B4 | Low | In GLSL `project()`, `DropV` (mode 6) is handled by the **default** fall-through (`return vec3(p.x,p.y,p.z)` happens to be the drop-v projection). Any future mode appended to the enum (value 8+) will silently render as Drop V instead of failing loudly. Same structure in `viewpoint.ts:96`. One comment, or an explicit `if(mode==6)`, removes the trap. | `shaders/index.ts:270–287`, `viewpoint.ts:70–97` |
| B5 | Low | The `viewPoint`/`onViewPointChange` prop pair is vestigial — nothing in the tree passes them (`App.tsx` renders `<ComplexParticles />` bare; the Roots/Multibranch linked-viewer use case was absorbed). Meanwhile the rAF loop allocates `{L: Lq.clone(), R: Rq.clone()}` and invokes the (undefined) callback check **every frame** (`createAnimationLoop.ts:125–126`). Dead API + per-frame garbage for no consumer. | `ComplexParticles.tsx:42–43`, `useParticleState.ts:210–222` |
| B6 | Low | The adaptive CPU sampler evaluates the **principal branch only** (`applyComplex`, not `applyComplexBranch`) while the shader draws sheets `branchMin..branchMax` — adaptive density is wrong for non-principal sheets of multivalued functions. Probably acceptable visually; worth a comment so it reads as a decision, not an oversight. | `ComplexParticles.tsx:132–139` |

B1 deserves emphasis: the *infrastructure for the fix already exists* (Canvas3D's
cleanup contract, the comment block at `Canvas3D.tsx:12–17` even names
`cancelAnimationFrame` and disposal as the intended use). The fix is mechanical:
`startAnimationLoop` returns `() => cancelAnimationFrame(raf)`; `onMount` returns a
cleanup that calls it and disposes geometries/materials/textures/scaffold.

## Performance & footprint

**What's already right.** Per-route `React.lazy` code-splitting; DPR capped at 2
(`Canvas3D.tsx:47`); the 4 Hz orientation-matrix throttle
(`createAnimationLoop.ts:160–170`) — a correct diagnosis of React-in-the-render-loop;
function evaluation on the GPU so particle count is decoupled from CPU; debounced
localStorage writes (`usePersistentState.ts:38–49`); `MAX_SHEETS = 12` capping the
draw-call count; THREE's program cache keeping 60 materials at 5 compiled programs.

**Remaining costs, in descending order of likely impact:**

1. **Sheet-fill vertex cost is quadratic in user-facing sliders.** The fill vertex
   shader runs `cellStretch` (4× `surfacePos`) + 4× `cornerColor` ≈ **9 full complex-
   function evaluations per vertex**, on a non-indexed grid of 6 vertices/cell
   (`shaders/index.ts:502–539`). At the slider max (Resolution 500², `ParticleViewerShell.tsx:429–431`)
   that is 250 k cells × 6 verts × ~9 evals ≈ **13.5 M function evaluations per frame per
   sheet** — × 12 sheets if the branch range is maxed, and `gamma` costs ln+exp+mul each.
   Desktop GPUs absorb this; phones will not. Cheap mitigations: cap resolution lower on
   `usePhone`, or hoist the four corner colors into per-cell vertex attributes rebuilt on
   the (already CPU-side) geometry rebuild — colors don't depend on rotation, only on
   function/domain/color settings, so they're rebuild-time, not frame-time, data. (The
   `cellStretch` part must stay in-shader; it depends on the live projection.)
2. **`preserveDrawingBuffer: true`** (`Canvas3D.tsx:42`) disables the swap-chain fast
   path on tiled mobile GPUs for the benefit of screenshots. If screenshots matter,
   capture via `renderer.render(); toDataURL()` in the same task instead, and drop the flag.
3. **Per-frame allocation churn** in the rAF loop: each frame allocates ~6 quaternion
   clones, a `ViewPoint` object, and ~12 `Vector4`/`Vector3` per axis/orientation
   `project()`/`quatRotate4D` call (`viewpoint.ts:26–43` allocates per multiply). On the
   order of 100 small objects/frame — minor GC pressure, relevant on phones. Scratch
   objects would fix it; do it opportunistically, not urgently.
4. **Bundle**: the build warns of a >500 kB minified chunk — that is three.js, shared by
   all 3D routes. Acceptable for this product; `manualChunks` splitting three into its
   own cacheable chunk would help repeat visits, not first paint.
5. **Full-tree re-render per slider tick** — see §5.1.

## Verification & contracts

The only check is `npm run build` (tsc + vite). For *this* app the type system is doing
real work (uniform typos in TS are caught; the `ParticleState` inferred type keeps shell
and app honest), but the highest-risk contracts are exactly the ones types cannot see:

| Seam | Risk | Cheapest test |
|---|---|---|
| TS ↔ GLSL function twins | **Already drifted once** (PlaneTransform 19–22, per the new-chrome handoff) | Golden-value vitest on the TS side: each `functionNames` index → known z/f pairs (Mathematica/mpmath values inline). Catches TS drift directly; catches GLSL drift indirectly when paired with #2. |
| GLSL dispatch completeness | New function added to TS but not a shader | A build-time assertion: parse `shaders/index.ts` source for `if(t==N)` coverage of `0..functionNames.length-1` (minus documented holes). 20 lines, runs in CI as a unit test — no GPU needed. |
| `quarterQuat` / `quatRotate4D` | A sign error here scrambles all six turn buttons | Property tests: rotation preserves 4-norm; `quarterQuat('XY',θ)` moves only x/y and fixes u/v; composing 8 eighth-turns = identity. Pure math, trivial to write. |
| `project()` (TS) vs GLSL `project()` | Axis cross / orientation matrix disagree with the particles | Sample-point parity table for the TS side; the constants (`3+w`, `POLE_EPS=0.08`) are duplicated in GLSL (`shaders/index.ts:283` hard-codes `0.08` rather than interpolating `POLE_EPS`) — at minimum, generate the GLSL constant from the TS export. |
| `fillPattern` | Off-by-one leaves NaN/(0,0) tail points | Assert exactly `count` points in-bounds per pattern. |
| `embedParams` codec | Garbled URLs must degrade, not crash | Round-trip + fuzz ("ignore garbage") tests; the module is pure and dependency-light. |
| `redistributeAdaptive` | Weight collapse / singularity capture | Already has a fallback branch (`createParticleGeometry.ts:252–259`) that is *only* reachable in edge cases — i.e. untested code on the failure path. |

> [!NOTE]
> Adding vitest does not violate the "only CI check is build" convention — it extends
> it. A `npm test` script + ~6 spec files over the pure modules is a half-day, requires
> no DOM or WebGL mocking, and directly addresses the failure mode this codebase has
> already exhibited (silent TS/GLSL divergence).

The hardest-to-test layer (uniform sync, effect ordering, the embed apply-once effects
that depend on child-effect-before-parent-effect ordering — flagged in the prior
session's own self-reflection) would benefit more from the structural fixes in §5.2/§5.3
than from tests: fewer places where ordering matters beats testing the ordering.

## Maintainability: the six-month-newcomer test

**Pass, with caveats.** The data flow is reconstructible because the comments are
genuinely explanatory (e.g. the world-frame quaternion composition note at
`useViewControls.ts:172–176`, the renderOrder rationale at `ComplexParticles.tsx:406–411`,
the throttle rationale at `createAnimationLoop.ts:160–164`). CLAUDE.md's engine
description matches reality — rare and valuable.

Where a newcomer will stumble:

- **Hidden effect-ordering dependencies**: the projMix re-apply effect must run before
  the embed effect (`ComplexParticles.tsx:606–631`); `onMount` must run before both;
  all three rely on React's child-before-parent effect order. Commented, but a
  convention, not a contract.
- **The `userData` tag protocol** between app material factories and
  `useUniformSync`'s blending toggle (§5.3).
- **`ProjectionMode` enum archaeology**: `Stereo` is retired-but-persisted, `Torus` was
  appended after the Drop modes so the slider's 0/1/2 maps to enum values 0/7/2, and
  DropV works by default-case accident (B4). One paragraph atop `viewpoint.ts` would
  save the next person an hour.

## Verdict

**Endorse:**

- The four-layer headless-engine architecture and its ref-bridge to the rAF loop — this
  is the right pattern, well executed, and `PlaneTransform`/embeds prove the reuse seams
  are real.
- The shared `vsCommon` GLSL library keeping five render modes in lockstep.
- Hand-rolling the Three bridge instead of adopting react-three-fiber.
- The 4 Hz orientation throttle, the DPR cap, `MAX_SHEETS`, and the persistence design
  (`usePersistentState` null-key opt-out powering ephemeral embeds is elegant).
- The comment culture and the append-only registry discipline.

**Concerns:**

- A real lifecycle leak (B1) sitting next to the unused cleanup contract built for it.
- The render-mode subsystem straddling the app/engine boundary, making the "copy the
  canonical consumer" guidance copy 450 lines of plumbing.
- Projection state quadruple-bookkeeping enforced by convention across three handlers.
- Six-way function registry with a demonstrated history of silent drift and no
  automated parity check.
- Zero tests over pure math that is one sign error away from scrambling the UX.

**Prioritized changes:**

| P | Change | Size | Pays for itself when |
|---|---|---|---|
| 1 | Make `startAnimationLoop` return a stop function; return full cleanup (cancel rAF, dispose geometries/materials/textures/scaffold) from `onMount` (B1); fix the dep-less resize effect and drive `uResolution` from a ResizeObserver (B2) | ~1 h | Immediately — every navigation |
| 2 | Add vitest + specs for `complexMath` (golden values), `quat4`/`viewpoint` (properties), `fillPattern` (count), `embedParams` (round-trip), GLSL dispatch-coverage assertion | ~half day | The next function/projection addition |
| 3 | Tween cancellation handles in `useViewControls` (B3) | ~30 min | The first double-tap bug report |
| 4 | Extract `createBranchObjects` (materials + visibility + disposal, all render modes) into `lib/particles`; app passes function-specific uniforms only (§5.3) | ~1 day | The next particle viewer, and every future render mode |
| 5 | Single `applyProjection` reducer unifying slider/pills/drop/restore/embed (§5.2) | ~half day | The next projection feature |
| 6 | Table-driven function registry with generated dispatches (§5.4) | ~1 day | Function #36 |
| 7 | Phone-only: cap sheet resolution, drop `preserveDrawingBuffer`, hoist corner colors to rebuild-time attributes (§ Performance 1–2) | ~1 day | The next mobile perf complaint |

Items 1–3 I would do unconditionally. Items 4–6 I would schedule before the next
significant particle-viewer feature, not after. Item 7 awaits profiling on hardware —
the prior session's own handoff notes the phone pass was headless.

## Self-reflection

1. **What would you do with another session?** Implement P1–P3 (they are small,
   verifiable, and the review already contains the designs), then profile the sheet
   shader on a real phone to confirm or kill the §Performance-1 claim — it is the one
   load-bearing performance assertion I derived from arithmetic rather than measurement.
2. **What would you change about what you produced?** I sized the refactors (P4–P6) in
   calendar terms from experience, not from this repo's actual change velocity; the
   estimates would be sturdier had I measured a comparable past extraction (e.g. the
   original viewer consolidation) from git history.
3. **What were you not asked that you think is important?** The XSS note in CLAUDE.md
   (`Readme.tsx` + `marked`, unsanitized) intersects this app: embed routes accept a
   URL-controlled `caption` — I checked it renders as a React text child (safe), but
   the moment captions or explainers accept markdown from URLs, that known debt becomes
   a vulnerability. Worth a one-line guard rule in docs/EMBEDS.md.
4. **What did we both overlook?** Whether `Workspace`'s collapsed-view "hidden, never
   unmounted" guarantee actually prevents B1 from firing in *intra-app* use (it does —
   the leak needs route changes), and whether any other app using `Canvas3D`
   (PlaneTransform, TopologyWalk, PolygonWorlds) has the same missing-cleanup pattern.
   A repo-wide grep for `startAnimationLoop`-style loops without cancellation would
   take ten minutes and may multiply B1's importance.
5. **What did you find difficult?** Judging the god-object question honestly: the flat
   75-key hook violates every textbook heuristic yet causes few practical problems
   here; resisting the consultant's reflex to prescribe decomposition for its own sake
   took deliberate effort, and I landed on "group keys, only if profiling says so."
6. **What would have made this task easier?** A dependency-cruiser graph or even a
   one-page uniform inventory (which uniform, declared where, written by whom) — I
   reconstructed the uniform contract by reading the GLSL and three TS files side by
   side; that artifact would also fix the §5.3 discoverability problem for everyone.
7. **Follow-up value:** **MEDIUM** — the analysis is complete and grounded, but two
   claims (mobile sheet-shader cost; other apps sharing the B1 leak pattern) are
   arithmetic/extrapolation that a short measurement session would convert into
   certainty, and the P1 fixes are designed but not applied.
