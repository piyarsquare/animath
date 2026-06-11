---
kind: three-hats
session: 2026-06-10-S01
date: 2026-06-10
title: Maintainer review — Complex Particles app, engine, and shell
branch: claude/three-hats-particle-app-rill2c
slug: three-hats-particle-app-rill2c
status: completed
build: unknown
followup: medium
pr: null
app: complex-particles
---

# Maintainer review — Complex Particles app, engine, and shell

## Plan under review

<details><summary>Original request</summary>

> "I want you to start a session. focus is on the complex particle app. I want you to run the three hats skill on the complex particle app and report the results."

</details>

The subject is not a plan document but the **current state of the Complex
Particles app** as of `main` @ `1b7b606` (one commit after the PR #200 merge):
`src/animations/ComplexParticles/` (745-line component + 684-line shader
library + EXPLAINER/README), the shared engine `src/lib/particles/` (~1,760
lines across 11 files), the turnkey shell `src/components/ParticleViewerShell.tsx`
(705 lines), and the supporting libs (`lib/complexMath.ts`, `lib/viewpoint.ts`,
`lib/embedParams.ts`, `controls/QuarterTurnControls.tsx`, `config/defaults.ts`).

## Executive summary

This app is the flagship and it mostly deserves to be. The consolidation of the
three near-identical viewers into `lib/particles` + `ParticleViewerShell` paid
off exactly as hoped — PR #200 added a projection slider, 13 functions, four
render modes' worth of UI, and an embed route without the app folder sprawling
back into copies. The append-only disciplines (function indices, persisted
per-field keys, shared-file registration) are real and observed in the code,
not just in CLAUDE.md.

Three things genuinely concern me as the person who has to live with this code:

1. **The render loop leaks.** `startAnimationLoop` cannot be stopped, and
   `ComplexParticles.onMount` ignores the cleanup contract that `Canvas3D`
   explicitly documents and supports. Every visit to the route leaks a
   perpetual rAF loop; under `React.StrictMode` (which `index.tsx` enables) the
   dev server runs two loops from the first mount.
2. **The user-facing docs lie.** `EXPLAINER.md` — the "?" modal — still
   documents the *removed* "Hopf study view" button, "Collapse → Hopf" slider,
   and "Hopf fibers" overlay, and describes "Stereographic" as a current mode.
   PR #200 changed the UI and nobody re-read the explainer.
3. **The function dispatch lives in four places** (`complexMath.ts` twice, the
   ComplexParticles GLSL, the PlaneTransform GLSL) with nothing keeping them in
   lockstep, and the lockstep has *already failed once* (PlaneTransform
   silently rendered indices 19–22 as identity until #200 caught it). With no
   tests and `tsc` blind to GLSL strings, this is where the next silent bug
   ships from.

Everything else is the normal sediment of fast feature work: a half-retired
`ProjectionMode.Stereo`, a dead `viewTypes` export, a `0.08` literal that
duplicates `POLE_EPS`, an effect missing its dependency array, branch controls
shown for single-valued functions (where extra sheets actually *triple the
additive brightness*), and a "canonical, simplest consumer" that is no longer
simple. Itemized below with file/line references.

## 1 · What the consolidation bought us (history check)

The shape of the app matches its history and the history was good. The flow
described in CLAUDE.md is exactly what's in the code:

| Stage | Where | Lines |
|---|---|---|
| State + persistence | `src/lib/particles/useParticleState.ts` | 320 |
| Projection/turn/orbit controls | `src/lib/particles/useViewControls.ts` | 256 |
| React state → uniforms | `src/lib/particles/useUniformSync.ts` | 165 |
| Camera gestures | `src/lib/particles/useGestureRotation.ts` | 135 |
| Geometry factories | `createParticleGeometry.ts` / `createSheetGeometry.ts` | 280 / 297 |
| rAF loop | `createAnimationLoop.ts` | 177 |
| Panel/workspace assembly | `src/components/ParticleViewerShell.tsx` | 705 |
| The app itself | `ComplexParticles.tsx` + `shaders/index.ts` | 745 + 684 |

The boundary is mostly right: generic viewer state, controls, gestures, and
the loop live in the engine; everything Riemann-sheet-specific (the per-branch
material zoo, the four render modes' geometry orchestration, the quadratic/p–q
parameter plumbing) lives in the app. The shell owns the panel inventory and
the embed chrome. `PlaneTransform` consumes `complexMath.ts` and
`MULTIVALUED_INDICES` from the same source of truth. This is the structure I'd
defend.

The append-only discipline is observed where it matters:

- `functionNames` carries the load-bearing comment (`complexMath.ts:367-368`:
  "the numeric index is persisted (functionIndex)… add new functions at the
  END, never reorder") and the 13 new functions in #200 were in fact appended
  (indices 23–35).
- `functionCategories` (`complexMath.ts:433-441`) groups by index so category
  reorder never touches persisted selections — the right call.
- `usePersistentState`'s null-key trick (`lib/usePersistentState.ts:34-35`)
  keeps hook order stable while letting embeds opt out wholesale
  (`ComplexParticles.tsx:63,69`). The embed routes are ephemeral *by
  construction*, not by remembering to skip writes. Good design.

> [!NOTE]
> One claim in CLAUDE.md is now stale in the other direction: ComplexParticles
> is called "the canonical, **simplest** consumer — copy it when building a new
> particle viewer." At 745 lines orchestrating 5 materials × up to 12 branches
> across 4 render modes plus embed apply-once logic, it is canonical but no
> longer simple. See §7.

## 2 · The render loop never stops (top code-health finding)

`Canvas3D` documents and implements a cleanup contract
(`src/components/Canvas3D.tsx:13-18`): *"May optionally return a cleanup
function (e.g. to `cancelAnimationFrame` your render loop and dispose
geometries/textures); Canvas3D invokes it on unmount."* The teardown path
exists (`Canvas3D.tsx:73-80`).

Nobody uses it:

- `startAnimationLoop` (`src/lib/particles/createAnimationLoop.ts:32-177`)
  returns `void` and its `animate` closure calls
  `requestAnimationFrame(animate)` unconditionally (line 173). There is no
  handle, no flag, no way to stop it.
- `ComplexParticles.onMount` (`ComplexParticles.tsx:536-600`) returns nothing.
  No geometry, material, or texture disposal either — `rebuildBranchObjects`
  disposes materials on *rebuild* (line 388) but nothing runs on unmount.

Consequences, in order of operational severity:

1. **Per-visit leak.** Navigate gallery → app → gallery → app: each visit
   strands a rAF loop holding the scene, renderer, all materials, and the
   geometry buffers via closure. The loop keeps calling `renderer.render` on a
   disposed renderer and keeps invoking `onViewPointChangeRef` /
   `setOrientationMatrix` against an unmounted hook tree (throttled to 4 Hz by
   the #200 fix, but forever).
2. **StrictMode double-loop in dev.** `index.tsx:76` wraps the router in
   `React.StrictMode`; React 18 double-invokes effects in dev, so `onMount`
   runs twice and *two* loops run from the first mount. Any "dev feels slower
   than prod" reports trace partly here.
3. The embed route inherits the same leak inside host pages, where an iframe
   may live a long time alongside other content.

The fix is small and local: `startAnimationLoop` returns `() => cancelAnimationFrame(raf)`
(track the id, add a `stopped` flag); `onMount` returns a cleanup that calls it
and disposes `geometryRef`/`sheetGeomRef`/`tileGeomRef`/`netGeomRef`/materials/
textures. ~30 lines, no API ripple — the shell already forwards whatever
`onMount` returns (`ParticleViewerShell.tsx:38-42` types it `void | (() => void)`).

> [!WARNING]
> This is the kind of bug the project's only CI check (`npm run build`) can
> never catch. It has survived every session since the engine was extracted
> precisely because nothing exercises unmount.

## 3 · EXPLAINER.md and README.md describe a UI that no longer exists

PR #200 retired Stereo, unified the projections into the
Perspective ⇠ Torus ⇢ Sphere slider, and **removed** the Hopf fiber overlay
and the "Hopf study view" button (handoff, `docs/sessions/handoff/new-chrome/…`
lines 65-70). The app's own docs were not updated:

| Doc claim | Reality |
|---|---|
| `EXPLAINER.md:27-30` — "**Stereographic**" listed as a current projection mode | Retired; the slider has Perspective / Torus / Sphere stops (`ParticleViewerShell.tsx:271-282`) |
| `EXPLAINER.md:39-41` — "The **Hopf study view** button in the Camera panel does this in one tap" | Button removed in #200 |
| `EXPLAINER.md:49-50` — "The **Collapse → Hopf** slider scrubs between the two" | Replaced by the second leg of the projection slider; no separate control |
| `EXPLAINER.md:52-55` — "**Hopf fibers** toggle… **Fiber density** sets how many per donut" | Overlay removed in #200 |
| `EXPLAINER.md:79-96` — "Render mode — points or sheet… drawn two ways" | Four ways: Points / Sheet / Tiles / Net (`types.ts:105`); Tiles and Net are undocumented |
| `EXPLAINER.md:94` — "the linear … **Stereographic** projections" | Same staleness |
| `README.md:5-6` — "projected to 3D using perspective, stereographic, or Hopf" | Same |
| `README.md:26-27` — "**Camera** — projection mode, drop axis, … quarter-turn buttons" | Drop axis + turns live in the 4D Rotation panel; turns are *eighth* turns (45°, `QuarterTurnControls.tsx:46-47`) |

There is also an orphaned comment in the engine:
`useParticleState.ts:169` ("Hopf fiber-trace overlay (Torus view): toggle +
how many fibers per latitude") sits above `orientationMatrix` state — the
fiber-trace state it described was deleted.

This matters more than usual debt because the explainer **is** the product's
"?" modal — it's the first thing a confused user reads, and right now it sends
them hunting for three controls that don't exist. The fix is pure writing;
nothing blocks it.

## 4 · The four-way function dispatch has no lockstep guard

A function index must agree across:

1. `applyComplex` (CPU, `complexMath.ts:286-324`)
2. `applyComplexBranch` (CPU, `complexMath.ts:327-365`)
3. ComplexParticles GLSL `applyComplex` (`shaders/index.ts:230-268`)
4. PlaneTransform's own GLSL dispatch (its shaders import nothing from #3)

plus `functionNames`, `functionFormulas`, `functionCategories`, and
`MULTIVALUED_INDICES`. The known failure mode already happened: the #200
handoff records that PlaneTransform "silently rendered 19–22 as identity" —
exactly the drift this layout invites. With no tests, the only guard is the
GLSL `return z;` fallback, which makes a missed case *look like* the identity
function instead of erroring.

Two cheap mitigations, in preference order:

- **Generate the GLSL dispatch.** The shaders are template strings; the
  `if(t==N) return complexFoo(z…);` ladder can be emitted from one table
  (name, GLSL call, branch-aware?) shared between both apps' shader builders.
  One table, three dispatches derived from it; appending a function becomes a
  single edit. This is not speculative abstraction — it removes a
  demonstrated, recurring bug class.
- Failing that, a dev-only assertion that `functionNames.length` matches a
  `DISPATCH_COUNT` constant exported next to each GLSL ladder, so `npm run
  build`-adjacent smoke (or just loading the page in dev) screams on drift.

Related single-constant drift: the Torus pole softening is `POLE_EPS = 0.08`
in `viewpoint.ts:19` but a literal `0.08` (twice) in the shader
(`shaders/index.ts:283`), with only a comment binding them. Interpolate the
constant into the template string — it's already exported.

## 5 · Half-retired Stereo and other projection residue

The Stereo retirement was done the right way for persistence (keep the enum
value, map it forward) but left scattered remains:

| Item | Location | Verdict |
|---|---|---|
| `ProjectionMode.Stereo = 1` in the enum | `viewpoint.ts:5` | **Keep** — persisted `viewType` values and the `proj=stereo` embed alias (`embedParams.ts:46`) need it; both map it to Torus (`useParticleState.ts:149`, `useViewControls.ts:95`) |
| `project()` Stereo branch | `viewpoint.ts:72` | Keep or comment as legacy — harmless, but nothing reaches it from the UI |
| GLSL `mode==1` branch | `shaders/index.ts:272` | Same — dead from the UI, kept for uniform-value safety |
| `viewTypes` table | `types.ts:89-94` | **Dead export** — still lists Stereo as a UI option; nothing imports it except the barrel (`particles/index.ts:24`). Remove it or it will mislead the next viewer author into rebuilding a four-mode Pills control |

> [!CAUTION]
> **DropV is correct by coincidence.** Both projection implementations handle
> DropX/DropY/DropU explicitly and let DropV (`mode==6`) fall through to the
> default `(p.x, p.y, p.z)` — `viewpoint.ts:82-96` and `shaders/index.ts:274-286`.
> The default *happens* to be the v-dropping slice, so it works, but anyone
> appending a `ProjectionMode` after Torus and assuming the default is "no
> projection" will silently break DropV. Add the explicit `mode==6` case in
> both places; it's two lines.

## 6 · Per-branch object orchestration: working, heavy, and one real bug

`rebuildBranchObjects` (`ComplexParticles.tsx:376-423`) creates **5 ShaderMaterials
per branch** (points, sheet fill, sheet wire, tiles, net), each with the full
~35-uniform set from `makeUniforms`, up to `MAX_SHEETS = 12` branches → 60
materials, all torn down and rebuilt whenever `branchCount` changes
(`ComplexParticles.tsx:425-429`). All four render modes' geometries are built
eagerly at mount (`onMount` lines 553-558) and rebuilt on every domain-box
change regardless of which mode is visible (effects at lines 450-470 rebuild
sheet + wire + tile; 473-482 rebuild net). At `sheetResolution` 500 (the
slider max, `ParticleViewerShell.tsx:430`) that's a ~1.5M-vertex non-indexed
fill rebuild even while you're looking at Points.

I would *not* abstract this into the engine yet (see §7), but two concrete
items fall out:

1. **Bug: branch range applies to single-valued functions.** The branch
   controls are passed unconditionally (`domainExtras={branchControls}`,
   `ComplexParticles.tsx:737`), and `branchCount` drives object creation
   regardless of the selected function. For `exp` with branches 0…2 you draw
   **three identical point clouds with additive blending — 3× brightness** —
   and triple the draw cost, with no visual hint why. PlaneTransform already
   gates on `MULTIVALUED_INDICES.has(functionIndex)`
   (`PlaneTransform.tsx:270`); the set was exported "so the branch controls
   appear consistently" (`complexMath.ts:378-379`) and the canonical consumer
   ignores it. Fix: clamp effective `branchCount` to 1 for single-valued
   indices and hide/disable the controls — both UX consistency and a
   correctness fix for the additive-brightness artifact.
2. **Cheap perf guard:** gate the sheet/tile/net rebuild effects on
   `state.renderMode` (rebuild lazily when a mode is first shown). The
   geometry refs are already nullable; the effects already early-return on
   missing refs.

Smaller hygiene in the same file:

- `ComplexParticles.tsx:493-506` — the net-resolution resize-sync `useEffect`
  has **no dependency array**, so it unsubscribes/resubscribes a window
  listener on every render. Every sibling effect has deps; this one is an
  accident. Add `[]`.
- `makeUniforms`' texture fallback (`ComplexParticles.tsx:200`) constructs a
  fresh 1×1 `DataTexture` per material without `needsUpdate = true`; and the
  `loadParticleTextures` callback (lines 545-549) closes over the
  first-render `state.textureIndex`, so a texture switched before the async
  HDR load lands gets stomped back. Both are cosmetic races that self-heal on
  the next control change — note them, don't engineer around them.
- The embed apply-once effects (lines 606-650) depend on child-effect
  ordering (Canvas3D's `onMount` running before the parent's `[]` effects)
  and on *declaration order between themselves* (the projMix restore must
  precede the embed projection). It works, it's commented, and the #200
  self-reflection already flagged the sturdier "engine-ready callback"
  design. I'd hold that change until the next time someone adds an apply-once
  effect — at three and counting, the pattern is at its complexity budget.

## 7 · Scope and the "canonical consumer" question

CLAUDE.md tells new app authors: *"ComplexParticles is the canonical, simplest
consumer — copy it when building a new particle viewer."* That was true when
Roots and Multibranch existed as comparison points; today the canonical
consumer carries the Riemann-sheet material zoo, four render modes, and embed
plumbing. Someone copying it for a new 4D viewer will copy ~400 lines they
don't need.

The architecturally pure response is to lift `rebuildBranchObjects` + the
material factories into `lib/particles` as a "multi-sheet renderer" module. I
recommend **against** that for now: there is exactly one consumer, the code is
cohesive where it sits, and the engine's history shows extraction works best
*after* the second consumer exists (that is literally how `lib/particles` was
born). The cheap, honest fix is documentation: update the CLAUDE.md sentence
to say "canonical (not minimal)" and let `docs/BUILDING_AN_APP.md` point at
the shell's props (`functionPicker`, `variantExtras`, `domainExtras`) as the
real extension surface — which is genuinely small and clean
(`ParticleViewerShell.tsx:33-59`).

Also dormant: the `viewPoint` / `onViewPointChange` props
(`ComplexParticles.tsx:42-43`) — the linked-viewers API from the
consolidation era. Nothing in-tree passes them (`App.tsx` renders bare; the
embed path uses `embed=`). The sync effect (`useParticleState.ts:211-222`)
and per-frame `onViewPointChangeRef` notifications keep paying rent for an
unused feature. Keep the props (a future Correspondence-style linked pair is
plausible and the cost is low), but the per-frame `viewPointRef` cloning in
the rAF loop (`createAnimationLoop.ts:125`) allocates two quaternions per
frame for subscribers that don't exist — make the notification conditional on
`onViewPointChangeRef.current` being set and you delete ~120 allocations/sec
in the default path.

## 8 · Parallel-branch and operational posture

- **Shared-file footprint is conflict-safe.** The app's registration touches
  only the append-only files (`index.tsx` routes incl. the embed route,
  `apps.ts`, `chrome/catalog.ts`); its remaining shared edits are in
  `lib/complexMath.ts` and `lib/particles/`, where the append-only function
  rule keeps PlaneTransform branches mergeable. The discipline held through
  #200's 13-function append.
- **Persistence versioning is blunt but adequate.** `VERSION = 'v1'` global
  bump (`usePersistentState.ts:20`) nukes every app's settings at once; with
  per-field keys, *adding* state is free and that's what actually happens.
  The unstated rule is that **every persisted enum is append-only**
  (`ColorQuantity`, `SamplePattern`, `colormapNames`, `RenderMode` strings…)
  — only `functionNames` and the catalog carry the warning comment. Add the
  one-line comment to `particles/types.ts`; future-you will thank present-you.
- **Base-path hygiene is right**: the embed badge builds its link from
  `import.meta.env.BASE_URL` (`ParticleViewerShell.tsx:677`), textures load
  via `lib/textures.ts` per convention.
- **`config/defaults.ts` has stopped being the source of truth.** The classic
  sliders read ranges from `COMPLEX_PARTICLES_DEFAULTS.ranges`, but
  everything added since (sheet resolution 8–500, tile size, net rings/width,
  density) hard-codes ranges inline in the shell (e.g.
  `ParticleViewerShell.tsx:429-431, 453-458, 476-492`) and initials inline in
  `useParticleState.ts:88-115`. Pick one home next time the panel is touched;
  I'd fold the new ranges into `defaults.ts` since the import is already
  there (`const R = …ranges`, shell line 21).
- The orientation-matrix throttle (`createAnimationLoop.ts:160-170`) is the
  right kind of fix for this codebase: measured, local, commented with the
  failure it prevents (full chrome re-render at 60 fps on phones).

## Verdict

**Endorse.** The engine/shell/app split is the best-factored corner of the
repository and the PR #200 changes (projection slider, function library,
embeds, free orbit) landed without damaging it. The append-only and
persistence disciplines are followed in practice. I would ship new particle
viewers on this foundation without hesitation.

**Concerns**, prioritized, with concrete changes:

| # | Priority | Change | Where | Size |
|---|---|---|---|---|
| 1 | **High** | Make `startAnimationLoop` cancellable; return cleanup from `onMount` (cancel rAF, dispose geoms/materials/textures) | `createAnimationLoop.ts`, `ComplexParticles.tsx:536-600` | ~30 lines |
| 2 | **High** | Rewrite `EXPLAINER.md` (and touch `README.md`) to the shipped UI: projection slider, no Hopf-study/fiber controls, document Tiles + Net; delete the orphan comment at `useParticleState.ts:169` | app folder | prose only |
| 3 | **High** | Gate branch range on `MULTIVALUED_INDICES` (clamp `branchCount` to 1 for single-valued; hide the controls) — fixes the N× additive-brightness artifact and matches PlaneTransform | `ComplexParticles.tsx:705-737` | ~15 lines |
| 4 | **Medium** | Generate the GLSL `applyComplex` ladders from one shared table (or at minimum a dispatch-count assertion); interpolate `POLE_EPS` into the shader | `complexMath.ts`, both apps' `shaders/` | ~1 session |
| 5 | **Medium** | Explicit `DropV` cases in both `project()` implementations; remove or `@deprecated`-comment the dead `viewTypes` export | `viewpoint.ts:84`, `shaders/index.ts:277`, `types.ts:89` | ~10 lines |
| 6 | **Low** | Add `[]` to the resize-sync effect; gate sheet/tile/net rebuilds on `renderMode`; make the per-frame viewpoint notification conditional; fold the new slider ranges into `defaults.ts`; append-only comment on persisted enums | various, listed above | ~1 hour |
| 7 | **Low** | Update CLAUDE.md's "canonical, simplest consumer" wording; do **not** extract the multi-sheet orchestration into the engine until a second consumer exists | `CLAUDE.md` | prose only |

**What I would not do:** introduce a state store or context (the ref-based
React→rAF bridge is verbose but correct and debuggable); extract a
"multi-material manager" abstraction speculatively; sanitize `Readme.tsx`
under this app's banner (it's a repo-wide item already on the books); or
chase the embed apply-once effects into an engine-ready callback before the
next time that code is actually touched.

## Self-reflection

1. **What would you do with another session?** Implement findings 1–3 and 5
   (the leak, the docs, the branch gating, DropV) — they're small, isolated,
   and `npm run build` plus a manual route-cycle check verifies them. The
   dispatch-table generation (finding 4) deserves its own focused session with
   both apps' shaders open side by side.
2. **What would you change about what you produced?** I asserted the rAF leak
   from code reading (the loop provably has no cancellation path and `onMount`
   provably returns nothing) but did not run the app and watch the loop survive
   navigation in a profiler; a headless probe would make finding 1 bulletproof.
3. **What were you not asked that you think is important?** The slider max of
   `sheetResolution = 500` puts a ~1.5M-vertex non-indexed rebuild plus four
   `surfacePos` evaluations per fill vertex (the `cellStretch` corner samples)
   on the main thread — on the phones the #200 perf pass targeted, that
   single slider can undo the whole pass. Worth a cap-by-device or a debounce.
4. **What did we both overlook?** Whether `redistributeAdaptive`'s CPU
   `evalFn` and the GPU `applyComplex` agree for the branch-aware functions —
   the CPU path uses principal branches (`applyComplex`, not
   `applyComplexBranch`) while the shader offsets by `branchIndex`, so
   adaptive sampling density is computed for sheet 0 even when drawing sheets
   −2…2. Probably acceptable (density follows |f′|, which is branch-similar
   for these functions), but nobody decided it on purpose.
5. **What did you find difficult?** Distinguishing deliberate residue
   (Stereo's enum slot — justified by persistence) from accidental residue
   (the `viewTypes` table — just dead) required tracing every import; the
   barrel re-export in `particles/index.ts` makes dead exports look alive.
6. **What would have made this task easier?** Even one smoke test that mounts
   and unmounts each route would have surfaced finding 1 years earlier, and a
   generated dispatch table would delete finding 4's whole category. Both are
   on my recommended list.
7. **Follow-up value:** **MEDIUM** — the analysis is grounded in line-level
   reading and the priorities are actionable, but findings 1 and 4 deserve
   runtime confirmation (profiler trace; a dispatch-parity probe) before being
   treated as closed.
